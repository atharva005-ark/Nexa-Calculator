import React, { useMemo } from 'react';
import katex from 'katex';

function normalizeToKatex(raw: string): string {
  let expr = raw.trim();
  if (expr.startsWith('$$') && expr.endsWith('$$') && expr.length > 4) {
    expr = expr.slice(2, -2).trim();
  } else if (expr.startsWith('$') && expr.endsWith('$') && expr.length > 2) {
    expr = expr.slice(1, -1).trim();
  }
  return expr
    .replace(/π/g, '\\pi ')
    .replace(/θ/g, '\\theta ')
    .replace(/±/g, '\\pm ')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≠/g, '\\neq ')
    .replace(/→/g, '\\to ')
    .replace(/∞/g, '\\infty ')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/√([0-9a-zA-Z]+)/g, '\\sqrt{$1}');
}

interface MathBlockProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

export const MathBlock: React.FC<MathBlockProps> = ({
  math,
  displayMode = false,
  className = '',
}) => {
  const html = useMemo(() => {
    const normalized = normalizeToKatex(math);
    if (!normalized) return '';
    try {
      return katex.renderToString(normalized, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch {
      return '';
    }
  }, [math, displayMode]);

  if (!html) {
    return <span className={`font-mono ${className}`}>{math}</span>;
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Safely renders natural language prose containing inline $...$ or block $$...$$ KaTeX delimiters.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  const segments = useMemo(() => {
    const parts: Array<{ type: 'text' | 'inline' | 'block'; value: string }> = [];
    const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
      }
      const token = match[0];
      if (token.startsWith('$$')) {
        parts.push({ type: 'block', value: token.slice(2, -2) });
      } else {
        parts.push({ type: 'inline', value: token.slice(1, -1) });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ type: 'text', value: text.slice(lastIndex) });
    }
    return parts;
  }, [text]);

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <React.Fragment key={idx}>{seg.value}</React.Fragment>;
        }
        return (
          <MathBlock
            key={idx}
            math={seg.value}
            displayMode={seg.type === 'block'}
            className={seg.type === 'block' ? 'block my-1.5' : 'inline-block align-middle mx-0.5'}
          />
        );
      })}
    </span>
  );
};
