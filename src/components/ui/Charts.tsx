// Small, dependency-free charts (SVG) that work the same in the browser and in Tauri.
// Every chart has a legend (what each color means) and each point has a tooltip with its value.
import React from 'react';

export interface LegendItem {
  color: string;
  label: string;
  /** line = solid line, dash = dashed line, box = filled square, dot = small circle */
  shape?: 'line' | 'dash' | 'box' | 'dot';
}
export const Legend: React.FC<{ items: LegendItem[]; className?: string }> = ({ items, className = '' }) => (
  <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-[#4A608A] dark:text-[#94A8D0] ${className}`} data-legend>
    {items.map((it) => (
      <li key={it.label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
        {it.shape === 'box' ? (
          <span className="inline-block w-3 h-3 rounded-[3px] border border-black/10 dark:border-white/10" style={{ background: it.color }} />
        ) : it.shape === 'dot' ? (
          <span className="inline-block w-2.5 h-2.5 rounded-[3px] border border-black/10 dark:border-white/10" style={{ background: it.color }} />
        ) : (
          <svg width="18" height="8" aria-hidden="true">
            <line x1="1" y1="4" x2="17" y2="4" stroke={it.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={it.shape === 'dash' ? '3 3' : undefined} />
          </svg>
        )}
        {it.label}
      </li>
    ))}
  </ul>
);

export interface LineSeries {
  name: string;
  color: string;
  values: (number | null)[];
  dashed?: boolean;
  /** fill the area under the line */
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
}> = ({ labels, series, height = 200, suffix = '', max, ariaLabel }) => {
  const W = 600;
  const H = height;
  const padL = 46;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const top = max ?? Math.max(1, ...all);
  const niceTop = max ?? (top <= 5 ? 5 : Math.ceil(top / 5) * 5);
  const x = (i: number) => padL + (labels.length <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (labels.length - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / niceTop);
  const ticks = [0, niceTop / 2, niceTop].map((t) => Math.round(t * 10) / 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel} data-chart>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="stroke-[#E4ECFC] dark:stroke-[#1E3158]" strokeWidth="1" />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end" className="fill-[#687FA8] dark:fill-[#89A7DF]" fontSize="11">
            {t}
            {suffix}
          </text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={l + i} x={x(i)} y={H - 6} textAnchor="middle" className="fill-[#687FA8] dark:fill-[#89A7DF]" fontSize="11">
          {l}
        </text>
      ))}
      {series.map((s) => {
        // split into runs without gaps
        const runs: { i: number; v: number }[][] = [];
        let cur: { i: number; v: number }[] = [];
        s.values.forEach((v, i) => {
          if (v === null) {
            if (cur.length) runs.push(cur);
            cur = [];
          } else cur.push({ i, v });
        });
        if (cur.length) runs.push(cur);
        return (
          <g key={s.name}>
            {runs.map((run, k) => {
              const d = run.map((p, j) => `${j ? 'L' : 'M'}${x(p.i)},${y(p.v)}`).join(' ');
              return (
                <g key={k}>
                  {s.area && run.length > 1 && (
                    <path d={`${d} L${x(run[run.length - 1].i)},${y(0)} L${x(run[0].i)},${y(0)} Z`} fill={s.color} opacity="0.12" />
                  )}
                  <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '5 4' : undefined} />
                </g>
              );
            })}
            {s.values.map((v, i) =>
              v === null ? null : (
                <circle key={i} cx={x(i)} cy={y(v)} r="4" fill={s.color} className="stroke-white dark:stroke-[#0F1A30]" strokeWidth="1.5">
                  <title>{`${s.name} · ${labels[i]}: ${v}${suffix}`}</title>
                </circle>
              )
            )}
          </g>
        );
      })}
    </svg>
  );
};

/** Side-by-side bars per label (e.g. Attended vs Did not attend). */
export const GroupedBars: React.FC<{
  labels: string[];
  series: { name: string; color: string; values: number[] }[];
  height?: number;
  ariaLabel: string;
}> = ({ labels, series, height = 200, ariaLabel }) => {
  const W = 600;
  const H = height;
  const padL = 46;
  const padB = 26;
  const padT = 14;
  const top = Math.max(1, ...series.flatMap((s) => s.values));
  const niceTop = top <= 5 ? 5 : Math.ceil(top / 5) * 5;
  const slot = (W - padL - 8) / Math.max(1, labels.length);
  const bw = Math.min(22, (slot - 10) / series.length);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / niceTop);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel} data-chart>
      {[0, niceTop / 2, niceTop].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} className="stroke-[#E4ECFC] dark:stroke-[#1E3158]" strokeWidth="1" />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end" className="fill-[#687FA8] dark:fill-[#89A7DF]" fontSize="11">
            {Math.round(t * 10) / 10}
          </text>
        </g>
      ))}
      {labels.map((l, i) => {
        const cx = padL + slot * i + slot / 2;
        const start = cx - (bw * series.length) / 2;
        return (
          <g key={l + i}>
            {series.map((s, k) => (
              <rect key={s.name} x={start + k * bw} y={y(s.values[i])} width={bw - 2} height={Math.max(0, y(0) - y(s.values[i]))} rx="3" fill={s.color}>
                <title>{`${s.name} · ${l}: ${s.values[i]}`}</title>
              </rect>
            ))}
            <text x={cx} y={H - 6} textAnchor="middle" className="fill-[#687FA8] dark:fill-[#89A7DF]" fontSize="11">
              {l}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
