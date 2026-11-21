// Small, dependency-free charts (SVG) that work the same in the browser and in Tauri.
// Apple-style: smooth lines with a soft gradient wash, rounded bars, hairline grid,
// a hover crosshair + tooltip on every chart, the last value labelled at the line end.
// Every chart with 2+ series has a legend (identity is never color alone).
import React, { useId, useMemo, useRef, useState } from 'react';

export interface LegendItem {
  color: string;
  label: string;
  /** line = solid line, dash = dashed line, box = filled square, dot = small circle */
  shape?: 'line' | 'dash' | 'box' | 'dot';
}
export const Legend: React.FC<{ items: LegendItem[]; className?: string }> = ({ items, className = '' }) => (
  <ul className={`flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] font-medium text-[#6E6E73] dark:text-[#A1A1A6] ${className}`} data-legend>
    {items.map((it) => (
      <li key={it.label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
        {it.shape === 'box' || it.shape === 'dot' ? (
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: it.color }} />
        ) : (
          <svg width="18" height="8" aria-hidden="true">
            <line x1="1" y1="4" x2="17" y2="4" stroke={it.color} strokeWidth="2" strokeLinecap="round" strokeDasharray={it.shape === 'dash' ? '3 3' : undefined} />
          </svg>
        )}
        {it.label}
      </li>
    ))}
  </ul>
);

const GRID = 'stroke-[#E5E5EA] dark:stroke-[#2C2C2E]';
const AXIS = 'fill-[#8E8E93]';
const fmt = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-US');

/** smooth path through points (monotone cubic: never overshoots below 0 or above the peak) */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0].x},${pts[0].y}` : '';
  const n = pts.length;
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1].x - pts[i].x; m[i] = (pts[i + 1].y - pts[i].y) / dx[i]; }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

const niceMax = (top: number) => {
  if (top <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(top)));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * step >= top) return k * step;
  return 10 * step;
};

/** shared hover tooltip (HTML, so it never gets clipped by the SVG) */
const Tip: React.FC<{ leftPct: number; title: string; rows: { color: string; name: string; value: string }[] }> = ({ leftPct, title, rows }) => (
  <div
    role="status"
    className="pointer-events-none absolute top-1 z-10 min-w-[132px] rounded-xl bg-white/95 dark:bg-[#2C2C2E]/95 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/5 dark:ring-white/10 px-3 py-2"
    style={{ left: `${Math.min(Math.max(leftPct, 12), 88)}%`, transform: 'translateX(-50%)' }}
  >
    <p className="text-[11px] font-semibold text-[#8E8E93]">{title}</p>
    {rows.map((r) => (
      <p key={r.name} className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#1D1D1F] dark:text-white whitespace-nowrap">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
        <span className="text-[#6E6E73] dark:text-[#A1A1A6]">{r.name}</span>
        <span className="ml-auto pl-3 font-semibold tabular-nums">{r.value}</span>
      </p>
    ))}
  </div>
);

export interface LineSeries {
  name: string;
  color: string;
  values: (number | null)[];
  dashed?: boolean;
  /** soft gradient wash under the line */
  area?: boolean;
}
/** Line chart; null = no data (the line has a gap there). */
export const LineChart: React.FC<{
  labels: string[];
  series: LineSeries[];
  height?: number;
  suffix?: string;
  max?: number;
  ariaLabel: string;
}> = ({ labels, series, height = 210, suffix = '', max, ariaLabel }) => {
  const uid = useId().replace(/:/g, '');
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = height, padL = suffix ? 44 : 34, padR = 34, padT = 16, padB = 26;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const top = max ?? niceMax(Math.max(1, ...all));
  const x = (i: number) => padL + (labels.length <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (labels.length - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const ticks = [0, top / 2, top];
  const onMove = (e: React.MouseEvent) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r || !labels.length) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const step = labels.length <= 1 ? 1 : (W - padL - padR) / (labels.length - 1);
    setHover(Math.max(0, Math.min(labels.length - 1, Math.round((px - padL) / step))));
  };
  return (
    <div ref={wrap} className="relative select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel} data-chart>
        <defs>
          {series.map((s, k) => (
            <linearGradient key={k} id={`g${uid}${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className={GRID} strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className={AXIS} fontSize="11">{fmt(t)}{suffix}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l + i} x={x(i)} y={H - 6} textAnchor="middle" className={AXIS} fontSize="11" fontWeight={hover === i ? 600 : 400}>{l}</text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={y(0)} className="stroke-[#C7C7CC] dark:stroke-[#48484A]" strokeWidth="1" />}
        {series.map((s, k) => {
          const runs: { i: number; v: number }[][] = [];
          let cur: { i: number; v: number }[] = [];
          s.values.forEach((v, i) => { if (v === null) { if (cur.length) runs.push(cur); cur = []; } else cur.push({ i, v }); });
          if (cur.length) runs.push(cur);
          const last = [...s.values].map((v, i) => ({ v, i })).reverse().find((p) => p.v !== null);
          return (
            <g key={s.name}>
              {runs.map((run, j) => {
                const pts = run.map((p) => ({ x: x(p.i), y: y(p.v) }));
                const d = smoothPath(pts);
                return (
                  <g key={j}>
                    {s.area && run.length > 1 && <path d={`${d} L${pts[pts.length - 1].x},${y(0)} L${pts[0].x},${y(0)} Z`} fill={`url(#g${uid}${k})`} />}
                    <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '5 4' : undefined} />
                    {run.length === 1 && <circle cx={pts[0].x} cy={pts[0].y} r="4" fill={s.color} />}
                  </g>
                );
              })}
              {/* end dot + direct value label (the story is the latest period) */}
              {last && last.v !== null && hover === null && (
                <g>
                  <circle cx={x(last.i)} cy={y(last.v)} r="4.5" fill={s.color} className="stroke-white dark:stroke-[#1C1C1E]" strokeWidth="2" />
                  <text x={x(last.i) + 8} y={y(last.v) + 4} className="fill-[#1D1D1F] dark:fill-white" fontSize="12" fontWeight="600">{fmt(last.v)}{suffix}</text>
                </g>
              )}
              {hover !== null && s.values[hover] !== null && s.values[hover] !== undefined && (
                <circle cx={x(hover)} cy={y(s.values[hover] as number)} r="5" fill={s.color} className="stroke-white dark:stroke-[#1C1C1E]" strokeWidth="2" />
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <Tip
          leftPct={(x(hover) / W) * 100}
          title={labels[hover]}
          rows={series.map((s) => ({ color: s.color, name: s.name, value: s.values[hover] === null || s.values[hover] === undefined ? '—' : `${fmt(s.values[hover] as number)}${suffix}` }))}
        />
      )}
    </div>
  );
};

/** Side-by-side bars per label (e.g. Attended vs Did not attend). 4px rounded tops, 2px gap, hover tooltip. */
export const GroupedBars: React.FC<{
  labels: string[];
  series: { name: string; color: string; values: number[] }[];
  height?: number;
  ariaLabel: string;
}> = ({ labels, series, height = 210, ariaLabel }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = height, padL = 34, padR = 10, padB = 26, padT = 16;
  const top = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const slot = (W - padL - padR) / Math.max(1, labels.length);
  const bw = Math.min(20, (slot - 14) / series.length);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const bar = (bx: number, v: number, w: number) => {
    const y0 = y(0), y1 = y(v), r = Math.min(4, w / 2, Math.max(0, y0 - y1));
    if (y0 - y1 <= 0) return '';
    return `M${bx},${y0} L${bx},${y1 + r} Q${bx},${y1} ${bx + r},${y1} L${bx + w - r},${y1} Q${bx + w},${y1} ${bx + w},${y1 + r} L${bx + w},${y0} Z`;
  };
  const totals = useMemo(() => labels.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0)), [labels, series]);
  return (
    <div ref={wrap} className="relative select-none" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel} data-chart>
        {[0, top / 2, top].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className={GRID} strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className={AXIS} fontSize="11">{fmt(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => {
          const cx = padL + slot * i + slot / 2;
          const start = cx - (bw * series.length) / 2;
          return (
            <g key={l + i} onMouseEnter={() => setHover(i)}>
              <rect x={padL + slot * i} y={padT} width={slot} height={H - padT - padB} fill="transparent" />
              {hover === i && <rect x={padL + slot * i + 4} y={padT} width={slot - 8} height={y(0) - padT} rx="8" className="fill-black/[0.03] dark:fill-white/[0.05]" />}
              {series.map((s, k) => (
                <path key={s.name} d={bar(start + k * bw, s.values[i] || 0, bw - 2)} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.45} />
              ))}
              <text x={cx} y={H - 6} textAnchor="middle" className={AXIS} fontSize="11" fontWeight={hover === i ? 600 : 400}>{l}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && totals[hover] >= 0 && (
        <Tip
          leftPct={((padL + slot * hover + slot / 2) / W) * 100}
          title={labels[hover]}
          rows={series.map((s) => ({ color: s.color, name: s.name, value: fmt(s.values[hover] || 0) }))}
        />
      )}
    </div>
  );
};

/** Tiny trend line for a stat tile ("heartbeat"): de-emphasized line, the latest point in the accent. */
export const Sparkline: React.FC<{ values: (number | null)[]; color: string; ariaLabel: string }> = ({ values, color, ariaLabel }) => {
  const uid = useId().replace(/:/g, '');
  const W = 120, H = 34, pad = 4;
  const nums = values.map((v) => (v === null ? null : v));
  const real = nums.filter((v): v is number => v !== null);
  if (real.length < 2) return <div className="h-[34px]" aria-hidden="true" />;
  const lo = Math.min(...real), hi = Math.max(...real), span = hi - lo || 1;
  const pts = nums.map((v, i) => (v === null ? null : { x: pad + (i * (W - pad * 2)) / (nums.length - 1), y: H - pad - ((v - lo) / span) * (H - pad * 2) })).filter((p): p is { x: number; y: number } => !!p);
  const d = smoothPath(pts);
  const end = pts[pts.length - 1];
  return (
    <div className="relative">
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[34px]" role="img" aria-label={ariaLabel} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${end.x},${H} L${pts[0].x},${H} Z`} fill={`url(#s${uid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
    <span aria-hidden="true" className="absolute w-[7px] h-[7px] rounded-full ring-2 ring-white dark:ring-[#1C1C1E]" style={{ background: color, left: `calc(${(end.x / W) * 100}% - 3.5px)`, top: `calc(${(end.y / H) * 100}% - 3.5px)` }} />
    </div>
  );
};

/**
 * Animated trend chart: one bar per day/week/month + a smooth "average" line over it
 * (like a stock chart, but plain). Bars grow up and the lines draw in from left to right
 * every time `playKey` changes (click / Day-Week-Month). Transform-only animation, so no lag;
 * turned off for "reduce motion" users.
 */
export const TrendChart: React.FC<{
  labels: string[];
  titles: string[];
  bars: { name: string; color: string; values: number[] };
  lines: { name: string; color: string; values: number[]; dashed?: boolean }[];
  playKey: number;
  ariaLabel: string;
  height?: number;
}> = ({ labels, titles, bars, lines, playKey, ariaLabel, height = 230 }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, padL = 34, padR = 16, padT = 14, padB = 26;
  const n = labels.length;
  const top = niceMax(Math.max(1, ...bars.values, ...lines.flatMap((l) => l.values)));
  const band = (W - padL - padR) / Math.max(1, n);
  const x = (i: number) => padL + band * i + band / 2;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const bw = Math.max(3, Math.min(26, band * 0.62));
  const every = n > 16 ? Math.ceil(n / 8) : 1; // thin out the bottom labels when there are many days
  const onMove = (e: React.MouseEvent) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r || !n) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.floor((px - padL) / band))));
  };
  const barPath = (i: number, v: number) => {
    if (v <= 0) return '';
    const x0 = x(i) - bw / 2, y0 = y(v), yb = y(0), rr = Math.min(4, bw / 2, yb - y0);
    return `M${x0},${yb} V${y0 + rr} Q${x0},${y0} ${x0 + rr},${y0} H${x0 + bw - rr} Q${x0 + bw},${y0} ${x0 + bw},${y0 + rr} V${yb} Z`;
  };
  return (
    <div ref={wrap} className="relative select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <style>{`
        @keyframes aicsBarUp { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        @keyframes aicsDraw { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        .aics-tc-bar { transform-box: fill-box; transform-origin: 50% 100%; animation: aicsBarUp .55s cubic-bezier(.2,.8,.2,1) both }
        .aics-tc-reveal { transform-box: view-box; transform-origin: ${padL}px 0; animation: aicsDraw 1.1s cubic-bezier(.4,0,.2,1) .15s both }
        @media (prefers-reduced-motion: reduce) { .aics-tc-bar, .aics-tc-reveal { animation: none } }
        html.lite .aics-tc-bar, html.lite .aics-tc-reveal { animation: none }
      `}</style>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel} data-chart="trend">
        <defs>
          <clipPath id={`tc-clip-${playKey}`}>
            <rect className="aics-tc-reveal" x={padL} y="0" width={W - padL - padR} height={H} />
          </clipPath>
        </defs>
        {[0, top / 2, top].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className={GRID} strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className={AXIS} fontSize="11">{fmt(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % every === 0 || i === n - 1) && (n - 1 - i >= every || i === n - 1) ? (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className={AXIS} fontSize="11" fontWeight={hover === i ? 600 : 400}>{l}</text>
        ) : null)}
        {hover !== null && <rect x={x(hover) - band / 2} y={padT} width={band} height={y(0) - padT} className="fill-black/[0.04] dark:fill-white/[0.06]" rx="4" />}
        <g key={`b${playKey}`}>
          {bars.values.map((v, i) => (
            <path key={i} d={barPath(i, v)} fill={bars.color} opacity={hover === null || hover === i ? 0.42 : 0.2}
              className="aics-tc-bar" style={{ animationDelay: `${Math.min(i * (450 / Math.max(1, n)), 450)}ms` }} />
          ))}
        </g>
        <g key={`l${playKey}`} clipPath={`url(#tc-clip-${playKey})`}>
          {lines.map((l) => (
            <path key={l.name} d={smoothPath(l.values.map((v, i) => ({ x: x(i), y: y(v) })))} fill="none" stroke={l.color}
              strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={l.dashed ? '5 4' : undefined} />
          ))}
        </g>
        {hover !== null && lines.map((l) => (
          <circle key={l.name} cx={x(hover)} cy={y(l.values[hover] ?? 0)} r="4.5" fill={l.color} className="stroke-white dark:stroke-[#1C1C1E]" strokeWidth="2" />
        ))}
      </svg>
      {hover !== null && (
        <Tip
          leftPct={(x(hover) / W) * 100}
          title={titles[hover] ?? labels[hover]}
          rows={[
            { color: bars.color, name: bars.name, value: fmt(bars.values[hover] ?? 0) },
            ...lines.map((l) => ({ color: l.color, name: l.name, value: fmt(l.values[hover] ?? 0) })),
          ]}
        />
      )}
    </div>
  );
};
