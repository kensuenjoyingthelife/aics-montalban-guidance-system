// Card with the animated trend chart: Day / Week / Month, a "Play" button, a plain sentence,
// and a clearly marked "Try with sample data" switch so the office can see how it moves.
import React, { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { TrendChart, Legend } from '../ui/Charts';
import { buildTrend, movingAverage, trendSentence, sampleDates, AVG_WINDOW, type TrendUnit } from '../../services/trendData';

export const TrendCard: React.FC<{
  title: string;
  subtitle: string;
  aDates: string[];
  bDates: string[];
  aName: string;
  bName: string;
  aColor: string;
  bColor: string;
  words: { aUp: string; aDown: string; aSame: string; b: string };
  isTl: boolean;
  sampleSeed?: number;
  children?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, aDates, bDates, aName, bName, aColor, bColor, words, isTl, sampleSeed = 7, children, className = '' }) => {
  const [unit, setUnit] = useState<TrendUnit>('day');
  const [play, setPlay] = useState(1);
  const [sample, setSample] = useState(false);
  const demo = useMemo(() => (sample ? sampleDates(92, sampleSeed) : null), [sample, sampleSeed]);
  const w = AVG_WINDOW[unit];
  // build w-1 older buckets too, so the average line starts with a full window (no fake jump at the left edge)
  const all = useMemo(() => buildTrend(demo ? demo.a : aDates, demo ? demo.b : bDates, unit, isTl, new Date(), w - 1), [demo, aDates, bDates, unit, isTl, w]);
  const pts = useMemo(() => all.slice(w - 1), [all, w]);
  const avgA = useMemo(() => movingAverage(all.map((p) => p.a), w).slice(w - 1), [all, w]);
  const avgB = useMemo(() => movingAverage(all.map((p) => p.b), w).slice(w - 1), [all, w]);
  const empty = pts.every((p) => p.a === 0 && p.b === 0);
  const avgWord = unit === 'day' ? (isTl ? '7-araw na average' : '7-day average') : unit === 'week' ? (isTl ? '4-linggong average' : '4-week average') : isTl ? '3-buwang average' : '3-month average';
  const replay = () => setPlay((k) => k + 1);
  const units: [TrendUnit, string][] = [['day', isTl ? 'Araw' : 'Day'], ['week', isTl ? 'Linggo' : 'Week'], ['month', isTl ? 'Buwan' : 'Month']];
  return (
    <section className={`rounded-2xl saas-card p-5 space-y-3 ${className}`} data-trend-card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-[#1D1D1F] dark:text-white flex items-center gap-2">
            {title}
            {sample && <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" data-sample-chip>{isTl ? 'SAMPLE LANG' : 'SAMPLE DATA'}</span>}
          </h2>
          <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div role="tablist" aria-label={isTl ? 'Ipakita ayon sa' : 'Show by'} className="inline-flex p-0.5 rounded-full bg-black/[0.05] dark:bg-white/10">
            {units.map(([u, label]) => (
              <button key={u} role="tab" aria-selected={unit === u} onClick={() => { setUnit(u); replay(); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${unit === u ? 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white shadow-sm' : 'text-[#6E6E73] dark:text-[#A1A1A6]'}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={replay} title={isTl ? 'I-play ulit ang galaw ng chart' : 'Play the chart again'}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF] hover:bg-[#007AFF]/10">
            <Play className="w-3.5 h-3.5" aria-hidden="true" /> {isTl ? 'I-play' : 'Play'}
          </button>
        </div>
      </div>
      {empty ? (
        <p className="text-sm text-[#6E6E73] dark:text-[#A1A1A6] py-8 text-center">
          {isTl ? 'Wala pang datos dito. Pindutin ang "Subukan gamit ang sample" sa ibaba para makita kung paano ito gumagalaw.' : 'No data here yet. Turn on "Try with sample data" below to see how it moves.'}
        </p>
      ) : (
        <div onClick={replay} className="cursor-pointer" title={isTl ? 'I-click para i-play ulit' : 'Click to play again'}>
          <TrendChart
            ariaLabel={`${title}: ${aName}, ${avgWord}`}
            labels={pts.map((p) => p.label)}
            titles={pts.map((p) => p.title)}
            bars={{ name: aName, color: aColor, values: pts.map((p) => p.a) }}
            lines={[
              { name: `${aName} · ${avgWord}`, color: aColor, values: avgA },
              { name: `${bName} · ${avgWord}`, color: bColor, values: avgB, dashed: true },
            ]}
            playKey={play}
          />
        </div>
      )}
      <Legend items={[
        { color: aColor, label: `${aName} (${isTl ? 'bar' : 'bars'})`, shape: 'box' },
        { color: aColor, label: `${aName} · ${avgWord}` },
        { color: bColor, label: `${bName} · ${avgWord}`, shape: 'dash' },
      ]} />
      {!empty && <p className="text-sm font-semibold text-[#1D1D1F] dark:text-white" data-trend-sentence>{trendSentence(pts, unit, words, isTl)}</p>}
      {!sample && children}
      <label className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#A1A1A6] cursor-pointer w-fit">
        <input type="checkbox" checked={sample} onChange={(e) => { setSample(e.target.checked); replay(); }} className="accent-[#007AFF]" data-sample-toggle />
        {isTl ? 'Subukan gamit ang sample (3 buwan) — hindi totoong datos' : 'Try with sample data (3 months) — not real records'}
      </label>
    </section>
  );
};
