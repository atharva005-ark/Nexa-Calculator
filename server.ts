import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { AI_SOLVER_ENABLED } from './src/config/features.ts';
import {
  ExchangeRateError,
  fetchUpstreamExchangeRates,
  normalizeCurrencyCode,
} from './src/lib/currency/exchangeRateService.ts';
import {
  AdminAuthError,
  verifyAdminBearerToken,
  type VerifiedAdminIdentity,
} from './src/lib/admin/adminAuth.ts';
import { fetchGA4Analytics, getGA4ConfigStatus } from './src/lib/analytics/ga4Server.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

// Ensure malformed JSON request bodies return structured JSON instead of HTML error pages
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && typeof err === 'object' && 'type' in err && (err as { type?: string }).type === 'entity.parse.failed') {
    if (req.path.startsWith('/api/')) {
      return res.status(400).json({ error: 'Invalid JSON request payload.', code: 'INVALID_JSON' });
    }
  }
  return next(err);
});

// Cached live currency rates (15 minute TTL to avoid redundant upstream requests)
const currencyCache = new Map<
  string,
  {
    base: string;
    rates: Record<string, number>;
    timestamp: string;
    provider: string;
    fetchedAt: number;
  }
>();
const CURRENCY_CACHE_TTL_MS = 15 * 60 * 1000;

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'NEXA Calculator' });
});

interface AdminAuthedRequest extends express.Request {
  adminUser?: VerifiedAdminIdentity;
}

async function requireAdmin(
  req: AdminAuthedRequest,
  res: express.Response,
  next: express.NextFunction
) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    req.adminUser = await verifyAdminBearerToken(req.headers.authorization);
    return next();
  } catch (err) {
    const status = err instanceof AdminAuthError ? err.status : 401;
    const code = err instanceof AdminAuthError ? err.code : 'ADMIN_AUTH_FAILED';
    const message =
      err instanceof AdminAuthError ? err.message : 'Administrator authentication required.';
    return res.status(status).json({
      authenticated: false,
      success: false,
      error: message,
      code,
    });
  }
}

app.get('/api/admin/session', requireAdmin, (req: AdminAuthedRequest, res) => {
  const ga4 = getGA4ConfigStatus();
  return res.json({
    authenticated: true,
    admin: req.adminUser,
    ga4Configured: ga4.configured,
  });
});

app.get('/api/admin/analytics', requireAdmin, async (_req: AdminAuthedRequest, res) => {
  const analytics = await fetchGA4Analytics();
  return res.json(analytics);
});

app.get('/api/currency', async (req, res) => {
  const baseRaw = typeof req.query.base === 'string' ? req.query.base : 'USD';
  const base = normalizeCurrencyCode(baseRaw);
  const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';

  const cached = currencyCache.get(base);
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CURRENCY_CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({
      base: cached.base,
      rates: cached.rates,
      timestamp: cached.timestamp,
      provider: cached.provider,
      isLive: true,
    });
  }

  try {
    const liveData = await fetchUpstreamExchangeRates(base, {
      timeoutMs: 7000,
      forceRefresh,
    });
    currencyCache.set(base, {
      base: liveData.base,
      rates: liveData.rates,
      timestamp: liveData.timestamp,
      provider: liveData.provider,
      fetchedAt: Date.now(),
    });
    res.setHeader('Cache-Control', forceRefresh ? 'no-store' : 'public, max-age=300');
    return res.json(liveData);
  } catch (err) {
    const isRateLimited = err instanceof ExchangeRateError && err.code === 'RATE_LIMITED';
    const message =
      err instanceof ExchangeRateError
        ? err.message
        : 'Live exchange rate service is currently unreachable. Cached historical rates will be used if available.';
    const code = err instanceof ExchangeRateError ? err.code : 'CURRENCY_UPSTREAM_UNAVAILABLE';

    res.setHeader('Cache-Control', 'no-store');
    return res.status(isRateLimited ? 429 : 503).json({
      success: false,
      error: message,
      code,
    });
  }
});

function parseGeminiError(err: unknown): {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
} {
  const raw = err instanceof Error ? err.message : String(err || 'Unexpected AI solver error');
  const lower = raw.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
    return {
      status: 408,
      code: 'TIMEOUT',
      message: 'The AI Math Solver took too long to respond. Please try a shorter question or try again.',
      retryable: true,
    };
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('resource_exhausted') || lower.includes('rate')) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      message: 'Gemini API rate limit or quota exceeded. Please wait a moment and try again.',
      retryable: true,
    };
  }
  if (
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('permission_denied')
  ) {
    return {
      status: 401,
      code: 'API_KEY_INVALID',
      message: 'Gemini API key is invalid or unauthorized. Please check GEMINI_API_KEY in Settings > Secrets.',
      retryable: false,
    };
  }
  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand') || lower.includes('overloaded')) {
    return {
      status: 500,
      code: 'SERVICE_UNAVAILABLE',
      message: 'The Gemini AI service is temporarily experiencing high demand. Please try again in a few moments.',
      retryable: true,
    };
  }
  if (lower.includes('fetch failed') || lower.includes('enotfound') || lower.includes('econnrefused') || lower.includes('network')) {
    return {
      status: 500,
      code: 'UPSTREAM_NETWORK_ERROR',
      message: 'Unable to reach the Gemini AI service due to a network issue. Please try again.',
      retryable: true,
    };
  }
  return {
    status: 500,
    code: 'AI_SOLVER_ERROR',
    message: 'AI Math Solver encountered an unexpected error while processing your question. Please try again.',
    retryable: false,
  };
}

function extractCleanJsonText(rawText: string): string {
  let text = rawText.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return text;
}

app.post('/api/ai-solver', async (req, res) => {
  if (!AI_SOLVER_ENABLED) {
    return res.status(200).json({
      success: false,
      disabled: true,
      code: 'AI_SOLVER_COMING_SOON',
      message: 'AI Math Solver is coming soon.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(500).json({
      success: false,
      error:
        'Gemini API key is not configured on the server. Add GEMINI_API_KEY in AI Studio Settings > Secrets (or in .env for local runs) and restart the server.',
      code: 'API_KEY_MISSING',
    });
  }

  const { question, mode = 'solve', history = [] } = req.body as {
    question?: string;
    mode?: 'solve' | 'explain' | 'practice' | 'formula';
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  };

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a mathematical question or expression.',
      code: 'EMPTY_QUESTION',
    });
  }

  if (question.length > 2500) {
    return res.status(400).json({
      error: 'Question must be under 2,500 characters.',
      code: 'QUESTION_TOO_LONG',
    });
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const modeInstructions: Record<string, string> = {
    solve:
      'Solve the problem rigorously step by step across algebra, calculus, trigonometry, geometry, polynomials, linear/quadratic equations, or word problems. Show the original equation, step-by-step transformations, exact and decimal final answer, explicit substitution/check verification, alternative solving methods, and 2 related practice problems.',
    explain:
      'Explain the mathematical concept, theorem, or geometric/calculus principle thoroughly with intuitive reasoning, a worked step-by-step example, verification, alternative viewpoints, and practice exercises.',
    practice:
      'Generate well-structured practice problems with progressive difficulty based on the user topic/question, along with a complete worked step-by-step solution and verification for the primary example.',
    formula:
      'Break down the mathematical formula: define every variable and unit, show how to rearrange or derive it step by step, verify with a worked numerical example, and list related formulas.',
  };

  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.text === 'string' &&
            m.text.trim().length > 0
        )
        .slice(-6)
    : [];

  const historyContext =
    safeHistory.length > 0
      ? `Previous conversation context:\n${safeHistory
          .map((m) => `${m.role === 'user' ? 'User' : 'Tutor'}: ${m.text.slice(0, 600)}`)
          .join('\n')}\n\n`
      : '';

  const requestConfig = {
    systemInstruction:
      'You are an expert mathematics educator and symbolic problem solver inside NEXA Calculator. ' +
      (modeInstructions[mode] || modeInstructions.solve) +
      ' Format pure math fields (originalEquation, steps[].expression, finalAnswer, verification.checkExpression, verification.result) as clean, valid LaTeX strings WITHOUT surrounding $$ delimiters (e.g., "\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", "x = 5", "\\int_0^1 x^2 \\, dx = \\frac{1}{3}"). ' +
      'In prose fields (conceptSummary, steps[].explanation, alternativeMethods[].summary, practiceQuestions[].question/hint/answer), write clear English and wrap inline math expressions in single $...$ delimiters so KaTeX can render them cleanly.',
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        originalEquation: {
          type: Type.STRING,
          description: 'Clean LaTeX representation of the original equation, expression, or core mathematical statement.',
        },
        topic: {
          type: Type.STRING,
          description: 'Mathematical domain (e.g. Quadratic Equations, Differential Calculus, Trigonometry, Geometry, Word Problem).',
        },
        method: {
          type: Type.STRING,
          description: 'Primary mathematical method or theorem applied.',
        },
        conceptSummary: {
          type: Type.STRING,
          description: 'Brief 1-3 sentence explanation of the underlying mathematical concept (use $...$ for inline math).',
        },
        steps: {
          type: Type.ARRAY,
          description: 'Ordered step-by-step derivation and calculation.',
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              expression: {
                type: Type.STRING,
                description: 'Valid LaTeX math expression for this step without outer $$ delimiters.',
              },
              explanation: {
                type: Type.STRING,
                description: 'Concise pedagogical explanation of this step (use $...$ for inline math).',
              },
            },
            required: ['stepNumber', 'title', 'expression', 'explanation'],
          },
        },
        finalAnswer: {
          type: Type.STRING,
          description: 'Clear final answer in valid LaTeX without outer $$ delimiters.',
        },
        verification: {
          type: Type.OBJECT,
          description: 'Verification check confirming the final answer satisfies the original problem or boundary conditions.',
          properties: {
            method: { type: Type.STRING },
            checkExpression: { type: Type.STRING },
            result: { type: Type.STRING },
            isVerified: { type: Type.BOOLEAN },
          },
          required: ['method', 'checkExpression', 'result', 'isVerified'],
        },
        alternativeMethods: {
          type: Type.ARRAY,
          description: 'Alternative ways to solve or verify the problem.',
          items: {
            type: Type.OBJECT,
            properties: {
              method: { type: Type.STRING },
              summary: { type: Type.STRING },
            },
            required: ['method', 'summary'],
          },
        },
        practiceQuestions: {
          type: Type.ARRAY,
          description: '2-3 practice problems for the user to try.',
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              hint: { type: Type.STRING },
              answer: { type: Type.STRING },
            },
            required: ['question', 'hint', 'answer'],
          },
        },
      },
      required: [
        'originalEquation',
        'topic',
        'method',
        'conceptSummary',
        'steps',
        'finalAnswer',
        'verification',
        'alternativeMethods',
        'practiceQuestions',
      ],
    },
  };

  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'] as const;
  let lastError: unknown = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const perModelTimeoutMs = 20000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('Gemini API request timed out')), perModelTimeoutMs);

    try {
      const response = await ai.models.generateContent({
        model,
        contents: `${historyContext}Mode: ${mode}\nCurrent Request: ${question.trim()}`,
        config: {
          ...requestConfig,
          // Minimize latency for interactive calculator solving
          thinkingConfig: {
            thinkingLevel: model === 'gemini-4-hydrogen' ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL,
          },
          abortSignal: controller.signal,
        },
      });
      clearTimeout(timer);

      const rawText = extractCleanJsonText(response.text ?? '');
      if (!rawText) {
        if (i < modelsToTry.length - 1) {
          console.warn(`[AI Solver] ${model} returned empty text, trying fallback model...`);
          continue;
        }
        return res.status(500).json({
          success: false,
          error: 'The AI model returned an empty response. Please try again.',
          code: 'EMPTY_RESPONSE',
        });
      }

      try {
        const parsed = JSON.parse(rawText) as Record<string, unknown>;
        return res.json({
          success: true,
          answer:
            typeof parsed.conceptSummary === 'string' && parsed.conceptSummary.trim()
              ? parsed.conceptSummary
              : typeof parsed.finalAnswer === 'string'
                ? parsed.finalAnswer
                : '',
          ...parsed,
        });
      } catch {
        if (i < modelsToTry.length - 1) {
          console.warn(`[AI Solver] ${model} returned non-JSON text, trying fallback model...`);
          continue;
        }
        return res.status(500).json({
          success: false,
          error: 'The AI response could not be parsed as valid structured JSON. Please retry your question.',
          code: 'INVALID_AI_JSON',
        });
      }
    } catch (err: unknown) {
      clearTimeout(timer);
      lastError = err;
      const info = parseGeminiError(err);
      // Fall back to secondary free-tier model on transient 503, timeout, upstream network, or per-model 429 quota
      if (info.retryable && i < modelsToTry.length - 1) {
        console.warn(`[AI Solver] ${model} failed (${info.code}), trying fallback model...`);
        continue;
      }
      console.error('[AI Solver Error]:', err instanceof Error ? err.message : err);
      return res.status(info.status).json({ success: false, error: info.message, code: info.code });
    }
  }

  const fallbackInfo = parseGeminiError(lastError);
  return res.status(fallbackInfo.status).json({
    success: false,
    error: fallbackInfo.message,
    code: fallbackInfo.code,
  });
});

// Guarantee all unknown /api/* routes return structured JSON rather than SPA index.html
app.use('/api/*', (_req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.', code: 'API_NOT_FOUND' });
});

// Guarantee unhandled /api/* middleware/route errors return structured JSON rather than HTML
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api/')) {
    console.error('[API Unhandled Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while processing API request.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
  return next(err);
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`NEXA Calculator server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
