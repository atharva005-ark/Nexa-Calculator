import React, { useEffect, useMemo, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import {
  BookmarkPlus,
  Box,
  Download,
  Eye,
  EyeOff,
  LineChart,
  Plus,
  RotateCcw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { compileFunctionOfX, compileFunctionOfXY } from '../../lib/math/calculatorEngine';
import { numericalDerivative, numericalIntegrate } from '../../lib/math/symbolicEngine';
import { deleteSavedGraph, getSavedGraphs, saveGraph } from '../../lib/storage/indexedDb';
import { useCalculator } from '../../context/CalculatorContext';
import type { GraphFunctionItem, SavedGraph } from '../../types/calculator';

const PALETTE = ['#3B82F6', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

const SURFACE_PRESETS = [
  { label: 'Ripple', expr: 'sin(sqrt(x^2 + y^2))' },
  { label: 'Saddle', expr: '(x^2 - y^2) / 10' },
  { label: 'Wave Grid', expr: 'cos(x) * sin(y)' },
  { label: 'Gaussian', expr: '3 * exp(-(x^2 + y^2) / 8)' },
];

function findRoots(fn: (x: number) => number, xMin: number, xMax: number): Array<{ x: number; y: number }> {
  const roots: Array<{ x: number; y: number }> = [];
  const steps = 400;
  const dx = (xMax - xMin) / steps;

  for (let i = 0; i < steps; i++) {
    const a = xMin + i * dx;
    const b = a + dx;
    const fa = fn(a);
    const fb = fn(b);
    if (!Number.isFinite(fa) || !Number.isFinite(fb)) continue;

    if (Math.abs(fa) < 1e-6) {
      if (!roots.some((r) => Math.abs(r.x - a) < 1e-3)) {
        roots.push({ x: Number(a.toFixed(4)), y: 0 });
      }
    } else if (fa * fb < 0 && Math.abs(fa - fb) < 50) {
      let lo = a;
      let hi = b;
      let flo = fa;
      for (let iter = 0; iter < 24; iter++) {
        const mid = (lo + hi) / 2;
        const fmid = fn(mid);
        if (!Number.isFinite(fmid)) break;
        if (Math.abs(fmid) < 1e-8) {
          lo = mid;
          hi = mid;
          break;
        }
        if (flo * fmid <= 0) {
          hi = mid;
        } else {
          lo = mid;
          flo = fmid;
        }
      }
      const rootX = (lo + hi) / 2;
      if (Math.abs(fn(rootX)) < 1e-2 && !roots.some((r) => Math.abs(r.x - rootX) < 1e-3)) {
        roots.push({ x: Number(rootX.toFixed(4)), y: 0 });
      }
    }
  }
  return roots.slice(0, 12);
}

function findIntersections(
  fnA: (x: number) => number,
  fnB: (x: number) => number,
  xMin: number,
  xMax: number
): Array<{ x: number; y: number }> {
  const diff = (x: number) => fnA(x) - fnB(x);
  const zeros = findRoots(diff, xMin, xMax);
  return zeros
    .map((z) => ({ x: z.x, y: Number(fnA(z.x).toFixed(4)) }))
    .filter((pt) => Number.isFinite(pt.y));
}

export const GraphingView: React.FC = () => {
  const { settings } = useCalculator();
  const plotRef = useRef<HTMLDivElement>(null);

  const [graphMode, setGraphMode] = useState<'2d' | '3d'>('2d');

  // 2D State
  const [functions, setFunctions] = useState<GraphFunctionItem[]>([
    {
      id: 'fn-1',
      expression: 'x^2 - 4',
      color: '#3B82F6',
      visible: true,
      showDerivative: false,
      lineStyle: 'solid',
      lineWidth: 2.5,
    },
    {
      id: 'fn-2',
      expression: '2*x + 1',
      color: '#06B6D4',
      visible: true,
      showDerivative: false,
      lineStyle: 'solid',
      lineWidth: 2.5,
    },
    {
      id: 'fn-3',
      expression: 'sin(x)',
      color: '#8B5CF6',
      visible: false,
      showDerivative: false,
      lineStyle: 'dash',
      lineWidth: 2.5,
    },
  ]);
  const [xRange, setXRange] = useState<[number, number]>([-10, 10]);
  const [yRange, setYRange] = useState<[number, number]>([-10, 10]);
  const [showGrid, setShowGrid] = useState(true);
  const [showRoots, setShowRoots] = useState(true);
  const [showIntersections, setShowIntersections] = useState(true);
  const [graphName, setGraphName] = useState('');
  const [savedGraphs, setSavedGraphs] = useState<SavedGraph[]>([]);

  // Definite Integral & Function Comparison State (2D)
  const [integralEnabled, setIntegralEnabled] = useState(true);
  const [integralFnId, setIntegralFnId] = useState('fn-1');
  const [integralBounds, setIntegralBounds] = useState<[number, number]>([-2, 2]);
  const [inspectX, setInspectX] = useState<number>(1);

  // 3D Surface State
  const [surfaceExpr, setSurfaceExpr] = useState('sin(sqrt(x^2 + y^2))');
  const [surfaceXRange, setSurfaceXRange] = useState<[number, number]>([-6, 6]);
  const [surfaceYRange, setSurfaceYRange] = useState<[number, number]>([-6, 6]);
  const [surfaceGrid, setSurfaceGrid] = useState<number>(40);
  const [surfaceColorscale, setSurfaceColorscale] = useState<'Viridis' | 'Cividis' | 'Portland' | 'Electric'>('Viridis');

  useEffect(() => {
    void getSavedGraphs().then(setSavedGraphs);
  }, []);

  const validXRange = useMemo<[number, number]>(() => {
    const min = Number.isFinite(xRange[0]) ? xRange[0] : -10;
    const max = Number.isFinite(xRange[1]) && xRange[1] > min ? xRange[1] : min + 20;
    return [min, max];
  }, [xRange]);

  const validYRange = useMemo<[number, number]>(() => {
    const min = Number.isFinite(yRange[0]) ? yRange[0] : -10;
    const max = Number.isFinite(yRange[1]) && yRange[1] > min ? yRange[1] : min + 20;
    return [min, max];
  }, [yRange]);

  const syntaxStatusMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const f of functions) {
      map[f.id] = !f.expression.trim() || compileFunctionOfX(f.expression) !== null;
    }
    return map;
  }, [functions]);

  const surfaceValid = useMemo(
    () => !surfaceExpr.trim() || compileFunctionOfXY(surfaceExpr) !== null,
    [surfaceExpr]
  );

  const analysis = useMemo(() => {
    const compiled = functions
      .filter((f) => f.visible && f.expression.trim())
      .map((f) => ({ item: f, fn: compileFunctionOfX(f.expression) }))
      .filter((entry): entry is { item: GraphFunctionItem; fn: (x: number) => number } => entry.fn !== null);

    const allRoots: Array<{ label: string; x: number; y: number; color: string }> = [];
    for (const c of compiled) {
      const r = findRoots(c.fn, validXRange[0], validXRange[1]);
      for (const pt of r) {
        allRoots.push({ label: c.item.expression, x: pt.x, y: pt.y, color: c.item.color });
      }
    }

    const allIntersections: Array<{ pair: string; x: number; y: number }> = [];
    for (let i = 0; i < compiled.length; i++) {
      for (let j = i + 1; j < compiled.length; j++) {
        const pts = findIntersections(compiled[i].fn, compiled[j].fn, validXRange[0], validXRange[1]);
        for (const pt of pts) {
          allIntersections.push({
            pair: `${compiled[i].item.expression} ∩ ${compiled[j].item.expression}`,
            x: pt.x,
            y: pt.y,
          });
        }
      }
    }

    // Integral computation
    let integralValue: number | null = null;
    let integralTarget: { item: GraphFunctionItem; fn: (x: number) => number } | undefined;
    if (integralEnabled) {
      integralTarget = compiled.find((c) => c.item.id === integralFnId) ?? compiled[0];
      if (integralTarget && Number.isFinite(integralBounds[0]) && Number.isFinite(integralBounds[1])) {
        const a = integralBounds[0];
        const b = integralBounds[1];
        if (a !== b) {
          try {
            const val = numericalIntegrate(integralTarget.item.expression, Math.min(a, b), Math.max(a, b), 400);
            if (Number.isFinite(val)) {
              integralValue = a <= b ? val : -val;
            }
          } catch {
            integralValue = null;
          }
        } else {
          integralValue = 0;
        }
      }
    }

    // Function comparison at inspectX
    const comparisonRows = compiled.map(({ item, fn }) => {
      const fx = Number.isFinite(inspectX) ? fn(inspectX) : NaN;
      let dfx = NaN;
      if (Number.isFinite(inspectX)) {
        try {
          dfx = numericalDerivative(item.expression, inspectX, 1);
        } catch {
          dfx = NaN;
        }
      }
      return {
        id: item.id,
        expression: item.expression,
        color: item.color,
        fx: Number.isFinite(fx) ? fx : null,
        dfx: Number.isFinite(dfx) ? dfx : null,
      };
    });

    return { compiled, allRoots, allIntersections, integralValue, integralTarget, comparisonRows };
  }, [functions, inspectX, integralBounds, integralEnabled, integralFnId, validXRange]);

  // Render 2D or 3D Plotly Graph
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;

    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark =
      settings.theme === 'dark' || (settings.theme === 'auto' && prefersDark);

    const isCompactViewport = typeof window !== 'undefined' && window.innerWidth < 640;

    if (graphMode === '3d') {
      const fnXY = compileFunctionOfXY(surfaceExpr);
      const xMin = Number.isFinite(surfaceXRange[0]) ? surfaceXRange[0] : -6;
      const xMax = Number.isFinite(surfaceXRange[1]) && surfaceXRange[1] > xMin ? surfaceXRange[1] : xMin + 12;
      const yMin = Number.isFinite(surfaceYRange[0]) ? surfaceYRange[0] : -6;
      const yMax = Number.isFinite(surfaceYRange[1]) && surfaceYRange[1] > yMin ? surfaceYRange[1] : yMin + 12;
      const n = Math.max(20, Math.min(60, surfaceGrid));

      const xs = Array.from({ length: n }, (_, i) => xMin + (i * (xMax - xMin)) / (n - 1));
      const ys = Array.from({ length: n }, (_, j) => yMin + (j * (yMax - yMin)) / (n - 1));
      const zs: Array<Array<number | null>> = ys.map((y) =>
        xs.map((x) => {
          if (!fnXY) return null;
          const v = fnXY(x, y);
          return Number.isFinite(v) ? v : null;
        })
      );

      const traces3d: Parameters<typeof Plotly.react>[1] = fnXY
        ? [
            {
              type: 'surface',
              x: xs,
              y: ys,
              z: zs,
              colorscale: surfaceColorscale,
              contours: {
                z: { show: true, usecolormap: true, highlightcolor: '#ffffff', project: { z: true } },
              },
              hovertemplate: 'x: %{x:.3f}<br>y: %{y:.3f}<br>z: %{z:.3f}<extra></extra>',
            } as Parameters<typeof Plotly.react>[1][number],
          ]
        : [];

      const layout3d: Parameters<typeof Plotly.react>[2] = {
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        font: {
          family: 'JetBrains Mono, monospace',
          color: isDark ? '#CBD5E1' : '#334155',
          size: isCompactViewport ? 10 : 11,
        },
        margin: isCompactViewport ? { t: 10, r: 8, b: 10, l: 8 } : { t: 16, r: 16, b: 16, l: 16 },
        scene: {
          bgcolor: isDark ? '#080C15' : '#F8FAFC',
          xaxis: { title: { text: 'x' }, gridcolor: isDark ? '#1E293B' : '#CBD5E1' },
          yaxis: { title: { text: 'y' }, gridcolor: isDark ? '#1E293B' : '#CBD5E1' },
          zaxis: { title: { text: 'z' }, gridcolor: isDark ? '#1E293B' : '#CBD5E1' },
        },
      };

      void Plotly.react(el, traces3d, layout3d, {
        responsive: true,
        displaylogo: false,
      });
      return;
    }

    // 2D Mode
    const sampleCount = 600;
    const step = (validXRange[1] - validXRange[0]) / sampleCount;
    const xs = Array.from({ length: sampleCount + 1 }, (_, i) => validXRange[0] + i * step);
    const ySpan = validYRange[1] - validYRange[0];

    const traces: Parameters<typeof Plotly.react>[1] = [];

    // Shaded Definite Integral Area under curve
    if (integralEnabled && analysis.integralTarget) {
      const a = Math.min(integralBounds[0], integralBounds[1]);
      const b = Math.max(integralBounds[0], integralBounds[1]);
      if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
        const iSteps = 120;
        const ix = Array.from({ length: iSteps + 1 }, (_, i) => a + (i * (b - a)) / iSteps);
        const iy = ix.map((x) => {
          const val = analysis.integralTarget!.fn(x);
          return Number.isFinite(val) ? val : 0;
        });
        traces.push({
          x: ix,
          y: iy,
          type: 'scatter',
          mode: 'lines',
          fill: 'tozeroy',
          fillcolor: 'rgba(6, 182, 212, 0.18)',
          line: { color: 'rgba(6, 182, 212, 0.5)', width: 1 },
          name: `∫[${a}, ${b}] (${analysis.integralTarget.item.expression}) dx`,
          hoverinfo: 'skip',
        });
      }
    }

    for (const { item, fn } of analysis.compiled) {
      const ys = xs.map((x) => {
        const val = fn(x);
        if (!Number.isFinite(val) || Math.abs(val) > ySpan * 8) {
          return null as unknown as number;
        }
        return val;
      });

      traces.push({
        x: xs,
        y: ys,
        type: 'scatter',
        mode: 'lines',
        name: `y = ${item.expression}`,
        line: {
          color: item.color,
          width: item.lineWidth,
          dash: item.lineStyle === 'solid' ? undefined : item.lineStyle,
        },
        hovertemplate: `y = ${item.expression}<br>x: %{x:.4f}<br>y: %{y:.4f}<extra></extra>`,
      });

      if (item.showDerivative) {
        const h = 1e-4;
        const dys = xs.map((x) => {
          const dVal =
            (-fn(x + 2 * h) + 8 * fn(x + h) - 8 * fn(x - h) + fn(x - 2 * h)) / (12 * h);
          if (!Number.isFinite(dVal) || Math.abs(dVal) > ySpan * 8) {
            return null as unknown as number;
          }
          return dVal;
        });
        traces.push({
          x: xs,
          y: dys,
          type: 'scatter',
          mode: 'lines',
          name: `d/dx (${item.expression})`,
          line: {
            color: item.color,
            width: Math.max(1.5, item.lineWidth - 0.5),
            dash: 'dot',
          },
          hovertemplate: `f'(x) for ${item.expression}<br>x: %{x:.4f}<br>f'(x): %{y:.4f}<extra></extra>`,
        });
      }
    }

    if (showRoots && analysis.allRoots.length > 0) {
      traces.push({
        x: analysis.allRoots.map((r) => r.x),
        y: analysis.allRoots.map((r) => r.y),
        type: 'scatter',
        mode: 'markers',
        name: 'Roots (y = 0)',
        marker: { color: '#10B981', size: 9, symbol: 'circle' },
        hovertemplate: 'Root<br>x: %{x:.4f}<br>y: 0<extra></extra>',
      });
    }

    if (showIntersections && analysis.allIntersections.length > 0) {
      traces.push({
        x: analysis.allIntersections.map((pt) => pt.x),
        y: analysis.allIntersections.map((pt) => pt.y),
        type: 'scatter',
        mode: 'markers',
        name: 'Intersections',
        marker: { color: '#F59E0B', size: 10, symbol: 'diamond' },
        hovertemplate: 'Intersection<br>x: %{x:.4f}<br>y: %{y:.4f}<extra></extra>',
      });
    }

    const layout: Parameters<typeof Plotly.react>[2] = {
      autosize: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: isDark ? '#080C15' : '#F8FAFC',
      font: {
        family: 'JetBrains Mono, monospace',
        color: isDark ? '#CBD5E1' : '#334155',
        size: isCompactViewport ? 10 : 11,
      },
      margin: isCompactViewport
        ? { t: 18, r: 10, b: 84, l: 38 }
        : { t: 20, r: 16, b: 64, l: 44 },
      xaxis: {
        range: validXRange,
        showgrid: showGrid,
        gridcolor: isDark ? '#1E293B' : '#E2E8F0',
        zeroline: true,
        zerolinecolor: isDark ? '#475569' : '#94A3B8',
        zerolinewidth: 1.5,
      },
      yaxis: {
        range: validYRange,
        showgrid: showGrid,
        gridcolor: isDark ? '#1E293B' : '#E2E8F0',
        zeroline: true,
        zerolinecolor: isDark ? '#475569' : '#94A3B8',
        zerolinewidth: 1.5,
      },
      legend: isCompactViewport
        ? { orientation: 'h', y: -0.26, x: 0, font: { size: 10 } }
        : { orientation: 'h', y: -0.22, x: 0 },
      dragmode: 'pan',
      hovermode: 'closest',
    };

    void Plotly.react(el, traces, layout, {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    });
  }, [
    analysis,
    graphMode,
    integralBounds,
    integralEnabled,
    settings.theme,
    showGrid,
    showIntersections,
    showRoots,
    surfaceColorscale,
    surfaceExpr,
    surfaceGrid,
    surfaceXRange,
    surfaceYRange,
    validXRange,
    validYRange,
  ]);

  useEffect(() => {
    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (plotRef.current) {
          Plotly.Plots?.resize(plotRef.current);
        }
      });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const addFunction = () => {
    const color = PALETTE[functions.length % PALETTE.length];
    setFunctions((prev) => [
      ...prev,
      {
        id: `fn-${Date.now()}`,
        expression: 'cos(x)',
        color,
        visible: true,
        showDerivative: false,
        lineStyle: 'solid',
        lineWidth: 2.5,
      },
    ]);
  };

  const handleZoom = (factor: number) => {
    const xMid = (xRange[0] + xRange[1]) / 2;
    const xHalf = ((xRange[1] - xRange[0]) / 2) * factor;
    const yMid = (yRange[0] + yRange[1]) / 2;
    const yHalf = ((yRange[1] - yRange[0]) / 2) * factor;
    setXRange([Number((xMid - xHalf).toFixed(3)), Number((xMid + xHalf).toFixed(3))]);
    setYRange([Number((yMid - yHalf).toFixed(3)), Number((yMid + yHalf).toFixed(3))]);
  };

  const handleSaveGraph = async () => {
    const name = graphName.trim() || functions.map((f) => f.expression).join(', ').slice(0, 32);
    const entry: SavedGraph = {
      id: `graph-${Date.now()}`,
      name,
      functions,
      xRange,
      yRange,
      createdAt: Date.now(),
    };
    await saveGraph(entry);
    setSavedGraphs(await getSavedGraphs());
    setGraphName('');
  };

  const handleExportPng = async () => {
    if (!plotRef.current) return;
    const url = await Plotly.toImage(plotRef.current, { format: 'png', width: 1200, height: 750 });
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexa-${graphMode}-graph.png`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            2D & 3D Graphing Lab
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Plot multiple 2D curves, derivatives, definite integrals, roots, intersections, and interactive 3D surfaces
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 2D / 3D Switch */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setGraphMode('2d')}
              className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                graphMode === '2d'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>2D Curves</span>
            </button>
            <button
              type="button"
              onClick={() => setGraphMode('3d')}
              className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                graphMode === '3d'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Surface</span>
            </button>
          </div>

          {graphMode === '2d' && (
            <>
              <button
                type="button"
                onClick={() => handleZoom(0.65)}
                className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C101B] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
                <span>Zoom In</span>
              </button>
              <button
                type="button"
                onClick={() => handleZoom(1.5)}
                className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C101B] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
                <span>Zoom Out</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setXRange([-10, 10]);
                  setYRange([-10, 10]);
                }}
                className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C101B] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportPng}
            className="min-h-[38px] px-3 rounded-xl nexa-gradient-bg text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export PNG</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Controls */}
        <div className="xl:col-span-4 min-w-0 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 space-y-4">
          {graphMode === '3d' ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  3D Surface Function z = f(x, y)
                </h2>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">z=</span>
                  <input
                    type="text"
                    value={surfaceExpr}
                    onChange={(e) => setSurfaceExpr(e.target.value)}
                    placeholder="e.g. sin(sqrt(x^2 + y^2))"
                    className={`flex-1 min-w-0 bg-slate-50 dark:bg-slate-950 border rounded-xl px-3 py-2 font-mono text-xs text-slate-900 dark:text-white ${
                      surfaceValid
                        ? 'border-slate-200 dark:border-slate-800'
                        : 'border-rose-500/70'
                    }`}
                  />
                </div>
                {!surfaceValid && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">
                    Invalid 3D syntax — use x and y variables (e.g. cos(x) * sin(y)).
                  </p>
                )}
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 mb-1.5">Surface Presets</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {SURFACE_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setSurfaceExpr(p.expr)}
                      className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-left hover:border-cyan-500/60 cursor-pointer"
                    >
                      <div className="font-medium text-slate-800 dark:text-slate-200">{p.label}</div>
                      <div className="font-mono text-[10px] text-slate-500 truncate">{p.expr}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-slate-500 block mb-1">X Domain</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      value={surfaceXRange[0]}
                      onChange={(e) => setSurfaceXRange([Number(e.target.value), surfaceXRange[1]])}
                      className="w-full min-w-0 min-h-[36px] rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono"
                    />
                    <input
                      type="number"
                      value={surfaceXRange[1]}
                      onChange={(e) => setSurfaceXRange([surfaceXRange[0], Number(e.target.value)])}
                      className="w-full min-w-0 min-h-[36px] rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Y Domain</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      value={surfaceYRange[0]}
                      onChange={(e) => setSurfaceYRange([Number(e.target.value), surfaceYRange[1]])}
                      className="w-full min-w-0 min-h-[36px] rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono"
                    />
                    <input
                      type="number"
                      value={surfaceYRange[1]}
                      onChange={(e) => setSurfaceYRange([surfaceYRange[0], Number(e.target.value)])}
                      className="w-full min-w-0 min-h-[36px] rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="text-slate-500 block mb-1">Resolution ({surfaceGrid}×{surfaceGrid})</label>
                  <input
                    type="range"
                    min={20}
                    max={60}
                    step={5}
                    value={surfaceGrid}
                    onChange={(e) => setSurfaceGrid(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Colorscale</label>
                  <select
                    value={surfaceColorscale}
                    onChange={(e) =>
                      setSurfaceColorscale(e.target.value as 'Viridis' | 'Cividis' | 'Portland' | 'Electric')
                    }
                    className="w-full min-h-[36px] rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs"
                  >
                    <option value="Viridis">Viridis</option>
                    <option value="Cividis">Cividis</option>
                    <option value="Portland">Portland</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Functions y = f(x)</h2>
                <button
                  type="button"
                  onClick={addFunction}
                  className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg nexa-accent-solid-bg text-white text-xs font-medium shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Curve</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {functions.map((fnItem) => (
                  <div
                    key={fnItem.id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-2"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <input
                        type="color"
                        value={fnItem.color}
                        aria-label="Curve color"
                        onChange={(e) =>
                          setFunctions((prev) =>
                            prev.map((p) => (p.id === fnItem.id ? { ...p, color: e.target.value } : p))
                          )
                        }
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
                      />
                      <span className="font-mono text-xs text-slate-500 shrink-0">y=</span>
                      <input
                        type="text"
                        value={fnItem.expression}
                        onChange={(e) =>
                          setFunctions((prev) =>
                            prev.map((p) => (p.id === fnItem.id ? { ...p, expression: e.target.value } : p))
                          )
                        }
                        placeholder="e.g. x^2, sin(x)"
                        className={`flex-1 min-w-0 min-h-[36px] bg-white dark:bg-slate-950 border rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white ${
                          syntaxStatusMap[fnItem.id]
                            ? 'border-slate-200 dark:border-slate-800'
                            : 'border-rose-500/70 focus:outline-none focus:ring-1 focus:ring-rose-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFunctions((prev) =>
                            prev.map((p) => (p.id === fnItem.id ? { ...p, visible: !p.visible } : p))
                          )
                        }
                        aria-label="Toggle visibility"
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0 cursor-pointer"
                      >
                        {fnItem.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFunctions((prev) => prev.filter((p) => p.id !== fnItem.id))}
                        aria-label="Remove function"
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {!syntaxStatusMap[fnItem.id] && (
                      <p className="text-[11px] text-rose-500 font-medium">
                        Invalid expression syntax — use x as variable (e.g. x^2, sin(x)).
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <select
                        value={fnItem.lineStyle}
                        onChange={(e) =>
                          setFunctions((prev) =>
                            prev.map((p) =>
                              p.id === fnItem.id
                                ? { ...p, lineStyle: e.target.value as GraphFunctionItem['lineStyle'] }
                                : p
                            )
                          )
                        }
                        className="min-h-[36px] rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <option value="solid">Solid</option>
                        <option value="dash">Dashed</option>
                        <option value="dot">Dotted</option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          setFunctions((prev) =>
                            prev.map((p) =>
                              p.id === fnItem.id ? { ...p, showDerivative: !p.showDerivative } : p
                            )
                          )
                        }
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg border font-mono text-[11px] cursor-pointer transition ${
                          fnItem.showDerivative
                            ? 'border-cyan-500/60 bg-cyan-500/15 nexa-accent-text font-semibold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        f&apos;(x)
                      </button>

                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.5"
                        value={fnItem.lineWidth}
                        onChange={(e) =>
                          setFunctions((prev) =>
                            prev.map((p) =>
                              p.id === fnItem.id ? { ...p, lineWidth: Number(e.target.value) } : p
                            )
                          )
                        }
                        className="w-16 ml-auto"
                        aria-label="Line width"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Definite Integral Panel */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={integralEnabled}
                      onChange={(e) => setIntegralEnabled(e.target.checked)}
                    />
                    <span>Definite Integral ∫[a, b] f(x) dx</span>
                  </label>
                </div>

                {integralEnabled && (
                  <div className="space-y-2 bg-slate-50/70 dark:bg-slate-900/50 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800">
                    <select
                      value={integralFnId}
                      onChange={(e) => setIntegralFnId(e.target.value)}
                      className="w-full min-w-0 min-h-[36px] rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 font-mono text-xs"
                    >
                      {functions
                        .filter((f) => f.visible)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            y = {f.expression}
                          </option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        step="any"
                        value={integralBounds[0]}
                        onChange={(e) => setIntegralBounds([Number(e.target.value), integralBounds[1]])}
                        placeholder="Lower a"
                        className="w-full min-w-0 min-h-[36px] rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono"
                      />
                      <input
                        type="number"
                        step="any"
                        value={integralBounds[1]}
                        onChange={(e) => setIntegralBounds([integralBounds[0], Number(e.target.value)])}
                        placeholder="Upper b"
                        className="w-full min-w-0 min-h-[36px] rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-slate-500">Area Value:</span>
                      <span className="font-mono font-bold nexa-accent-text tabular-nums">
                        {analysis.integralValue !== null ? analysis.integralValue.toFixed(6) : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Options & Bounds */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-500 block mb-1">X Min / Max</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={xRange[0]}
                        onChange={(e) => setXRange([Number(e.target.value), xRange[1]])}
                        className="w-full min-w-0 min-h-[36px] rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono"
                      />
                      <input
                        type="number"
                        value={xRange[1]}
                        onChange={(e) => setXRange([xRange[0], Number(e.target.value)])}
                        className="w-full min-w-0 min-h-[36px] rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Y Min / Max</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={yRange[0]}
                        onChange={(e) => setYRange([Number(e.target.value), yRange[1]])}
                        className="w-full min-w-0 min-h-[36px] rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono"
                      />
                      <input
                        type="number"
                        value={yRange[1]}
                        onChange={(e) => setYRange([yRange[0], Number(e.target.value)])}
                        className="w-full min-w-0 min-h-[36px] rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                    <span>Grid</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={showRoots} onChange={(e) => setShowRoots(e.target.checked)} />
                    <span>Detect Roots</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showIntersections}
                      onChange={(e) => setShowIntersections(e.target.checked)}
                    />
                    <span>Intersections</span>
                  </label>
                </div>
              </div>

              {/* Save Graph */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={graphName}
                  onChange={(e) => setGraphName(e.target.value)}
                  placeholder="Graph preset name..."
                  className="flex-1 min-w-0 min-h-[38px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleSaveGraph}
                  className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium shrink-0 cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>

              {savedGraphs.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-medium text-slate-500">Saved Graphs</div>
                  {savedGraphs.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-xs gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFunctions(g.functions);
                          setXRange(g.xRange);
                          setYRange(g.yRange);
                        }}
                        className="min-h-[36px] text-left nexa-accent-text hover:underline truncate cursor-pointer"
                      >
                        {g.name}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteSavedGraph(g.id);
                          setSavedGraphs(await getSavedGraphs());
                        }}
                        aria-label={`Delete ${g.name}`}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Plot Canvas + Detected Features & Function Comparison */}
        <div className="xl:col-span-8 min-w-0 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-2 sm:p-3 overflow-hidden min-w-0">
            <div ref={plotRef} className="w-full h-[320px] sm:h-[460px] lg:h-[500px]" />
          </div>

          {graphMode === '2d' && (
            <>
              {/* Function Comparison Table at Inspect X */}
              {analysis.comparisonRows.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Function Comparison & Slope Inspector
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <label htmlFor="inspect-x" className="font-mono text-slate-500">
                        x₀ =
                      </label>
                      <input
                        id="inspect-x"
                        type="number"
                        step="0.5"
                        value={inspectX}
                        onChange={(e) => setInspectX(Number(e.target.value))}
                        className="w-24 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left font-mono">
                      <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-1.5 pr-3">Curve</th>
                          <th className="py-1.5 pr-3 text-right">f(x₀)</th>
                          <th className="py-1.5 text-right">f&apos;(x₀)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                        {analysis.comparisonRows.map((row) => (
                          <tr key={row.id}>
                            <td className="py-1.5 pr-3 flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: row.color }}
                              />
                              <span className="truncate max-w-[110px] sm:max-w-[180px] text-slate-800 dark:text-slate-200">
                                {row.expression}
                              </span>
                            </td>
                            <td className="py-1.5 pr-3 text-right tabular-nums text-slate-900 dark:text-white font-semibold">
                              {row.fx !== null ? row.fx.toFixed(5) : 'Undef'}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                              {row.dfx !== null ? row.dfx.toFixed(5) : 'Undef'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Detected Roots (y = 0)
                  </h3>
                  {analysis.allRoots.length === 0 ? (
                    <p className="text-xs text-slate-500">No real roots detected in visible X range.</p>
                  ) : (
                    <div className="space-y-1 font-mono text-xs">
                      {analysis.allRoots.map((r, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-slate-600 dark:text-slate-300 truncate">{r.label}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                            ({r.x}, 0)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Detected Intersections
                  </h3>
                  {analysis.allIntersections.length === 0 ? (
                    <p className="text-xs text-slate-500">No curve intersections detected in visible X range.</p>
                  ) : (
                    <div className="space-y-1 font-mono text-xs">
                      {analysis.allIntersections.map((pt, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-slate-600 dark:text-slate-300 truncate">{pt.pair}</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                            ({pt.x}, {pt.y})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
