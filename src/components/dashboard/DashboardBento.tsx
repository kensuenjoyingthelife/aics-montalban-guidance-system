// Dashboard hero + KPI widgets as a 2026 bento grid (AGENTS.md §2, §3).
// Every number comes from real data passed in; every tile opens the list behind it (Golden Rule 5).
import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, FolderOpen, PhoneCall, FileText, CalendarCheck, ChevronRight, Check, Users } from 'lucide-react';
import type { DisciplineCaseRecord } from '../../data/stage3MockData';

type Props = {
  isTl: boolean;
  cases: DisciplineCaseRecord[];
  studentCount: number;
  confToday: number;
  confDoneToday: number;
  callsPending: number;
  callsDone: number;
  overdue: number;
  waiting: number;
  /** sanctions whose end date is today or already passed */
  sanctionsEnding: number;
  onSanctionsEnding?: () => void;
  onOverdue: () => void;
  onWaiting: () => void;
  offensesThisMonth: number;
  attendance: { ratePercent: number | null; attended: number; scheduled: number };
  onNewCase: () => void;
  onStudents: () => void;
  onOpenCases: () => void;
  onStats: () => void;
  onConferences: () => void;
  onCalls: () => void;
  /** today's next scheduled conference, if any */
  nextUp?: { time: string; text: string } | null;
};

/** Philippine time, updates once a minute on the minute (cheap: no per-second re-render) */
const LiveClock: React.FC<{ isTl: boolean }> = ({ isTl }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t: number;
    const tick = () => {
      setNow(new Date());
      t = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    t = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    return () => window.clearTimeout(t);
  }, []);
  const loc = isTl ? 'fil-PH' : 'en-US';
  const date = now.toLocaleDateString(loc, { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
  return (
    <p className="text-[13px] font-medium text-white/70 flex items-center gap-2" title={isTl ? 'Oras sa Pilipinas' : 'Philippine time'}>
      <span>{date}</span>
      <span className="w-1 h-1 rounded-full bg-white/40" aria-hidden />
      <time className="tabular-nums text-white font-semibold">{time}</time>
      <span className="text-white/50 text-[11px]">PHT</span>
    </p>
  );
};

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** smooth SVG path through points (simple cardinal-ish curve) */
function sparkPath(values: number[], w: number, h: number) {
  const max = Math.max(1, ...values);
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 4 - (v / max) * (h - 10)] as const);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return { line: d, area: `${d} L ${w} ${h} L 0 ${h} Z`, last: pts[pts.length - 1] };
}

const Ring: React.FC<{ pct: number; size: number; stroke: number; track: string; color: string; children?: React.ReactNode }> = ({
  pct, size, stroke, track, color, children,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, pct)))}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.23,1,0.32,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

export const DashboardBento: React.FC<Props> = (p) => {
  const { isTl } = p;
  const reduce = useReducedMotion() || (typeof document !== 'undefined' && document.documentElement.classList.contains('lite'));

  // last 14 days of new cases (by incident day)
  const daily = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of p.cases) counts.set(c.incidentDate, (counts.get(c.incidentDate) ?? 0) + 1);
    const out: number[] = [];
    const d = new Date();
    d.setDate(d.getDate() - 13);
    for (let i = 0; i < 14; i++) {
      out.push(counts.get(dayKey(d)) ?? 0);
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [p.cases]);

  // last 6 months of offenses
  const monthly = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { y: m.getFullYear(), m: m.getMonth(), label: m.toLocaleDateString(isTl ? 'fil-PH' : 'en-US', { month: 'short' }), n: 0 };
    });
    for (const c of p.cases) {
      const t = new Date(`${c.incidentDate}T00:00:00`);
      const hit = months.find((x) => x.y === t.getFullYear() && x.m === t.getMonth());
      if (hit) hit.n++;
    }
    return months;
  }, [p.cases, isTl]);

  const openCount = p.cases.filter((c) => c.status !== 'Resolved').length;
  const spark = sparkPath(daily, 200, 56);
  const monthMax = Math.max(1, ...monthly.map((m) => m.n));
  const todayTotal = p.confToday + p.callsPending + p.confDoneToday;
  const todayDone = p.confDoneToday;
  const h = new Date().getHours();
  const greet = isTl
    ? h < 12 ? 'Magandang umaga' : h < 18 ? 'Magandang hapon' : 'Magandang gabi'
    : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const todayLine =
    p.confToday === 0 && p.callsPending === 0
      ? isTl ? 'Wala kang gagawin ngayon. Ayos!' : "You're all clear for today."
      : isTl
      ? `${p.confToday} conference at ${p.callsPending} tatawagan ngayon`
      : `${p.confToday} conference${p.confToday === 1 ? '' : 's'} and ${p.callsPending} call${p.callsPending === 1 ? '' : 's'} today`;

  const tile = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.32, delay: 0.04 * i, ease: [0.23, 1, 0.32, 1] as const },
        };

  const widget =
    'bento-tile group relative text-left rounded-[22px] p-5 flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.985]';
  const label = 'text-[13px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]';
  const big = 'text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]';
  const chip = (cls: string, icon: React.ReactNode) => (
    <span className={`w-8 h-8 rounded-full flex items-center justify-center ${cls}`}>{icon}</span>
  );

  return (
    <section className="shrink-0 grid grid-cols-2 xl:grid-cols-4 xl:grid-rows-[repeat(2,minmax(150px,auto))] gap-4" aria-label={isTl ? 'Buod ngayong araw' : 'Today at a glance'}>
      {/* HERO: brand mesh gradient, greeting, today's progress ring, primary action */}
      <motion.div {...tile(0)} className="bento-hero col-span-2 xl:row-span-2 relative rounded-[26px] p-7 overflow-hidden text-white flex flex-col justify-between min-h-[240px]">
        <div aria-hidden className="bento-hero-glow" />
        <div className="relative flex items-start justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <LiveClock isTl={isTl} />
            <h2 className="text-[38px] leading-[1.05] font-semibold tracking-[-0.03em]">{greet}</h2>
            <p className="text-[15px] text-white/80 max-w-[30ch]">{todayLine}</p>
            {p.nextUp && (
              <button
                type="button"
                onClick={p.onConferences}
                className="mt-1 inline-flex items-center gap-2 h-8 pl-1 pr-3 rounded-full bg-white/[0.1] ring-1 ring-inset ring-white/15 hover:bg-white/[0.16] text-[13px] transition-colors max-w-full"
              >
                <span className="px-2 py-0.5 rounded-full bg-[#F2CE70] text-[#0B1F4D] text-[11px] font-semibold shrink-0">
                  {isTl ? 'Susunod' : 'Next'} · {p.nextUp.time}
                </span>
                <span className="truncate text-white/90">{p.nextUp.text}</span>
              </button>
            )}
          </div>
          <button type="button" onClick={p.onConferences} title={isTl ? 'Tingnan ang gagawin ngayon' : "See today's to-do"} className="shrink-0 rounded-full active:scale-[0.97] transition-transform">
            <Ring pct={todayTotal === 0 ? 1 : todayDone / todayTotal} size={104} stroke={9} track="rgb(255 255 255 / 0.14)" color="#F2CE70">
              <div className="text-center leading-tight">
                {todayTotal === 0 ? (
                  <Check className="w-8 h-8 mx-auto text-[#F2CE70]" strokeWidth={2.5} aria-hidden />
                ) : (
                  <>
                    <span className="block text-[24px] font-semibold tabular-nums">{todayDone}/{todayTotal}</span>
                    <span className="block text-[11px] text-white/70">{isTl ? 'tapos' : 'done'}</span>
                  </>
                )}
              </div>
            </Ring>
          </button>
        </div>
        {/* Needs attention (Golden Rule 4), frosted glass rows inside the hero */}
        <div className="relative mt-5 rounded-2xl bg-white/[0.08] ring-1 ring-inset ring-white/15 backdrop-blur-md divide-y divide-white/10">
          {[
            { n: p.overdue, en: 'Overdue cases', tl: 'Overdue na kaso', go: p.onOverdue, dot: '#FB923C' },
            { n: p.waiting, en: 'Sanctions waiting for parent notice', tl: 'Sanction na hindi pa alam ng magulang', go: p.onWaiting, dot: '#F2CE70' },
            { n: p.callsPending, en: 'Parents to call', tl: 'Tatawagang magulang', go: p.onCalls, dot: '#FB7185' },
            { n: p.sanctionsEnding, en: 'Sanctions ending by the next school day', tl: 'Matatapos na ang sanction (sa susunod na pasok)', go: p.onSanctionsEnding ?? p.onOpenCases, dot: '#34D399' },
          ].map((r) => (
            <button key={r.en} type="button" onClick={r.go} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.06] first:rounded-t-2xl last:rounded-b-2xl transition-colors">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.n > 0 ? r.dot : 'rgb(255 255 255 / 0.3)' }} />
              <span className="flex-1 text-[13px] text-white/85 truncate">{isTl ? r.tl : r.en}</span>
              <span className={`text-[15px] font-semibold tabular-nums ${r.n > 0 ? 'text-white' : 'text-white/45'}`}>{r.n}</span>
              <ChevronRight className="w-4 h-4 text-white/40" aria-hidden />
            </button>
          ))}
        </div>
        <div className="relative flex flex-wrap items-center gap-2.5 pt-5">
          <button
            type="button"
            onClick={p.onNewCase}
            className="h-11 px-5 rounded-full bg-white text-[#0B1F4D] text-[14px] font-semibold inline-flex items-center gap-1.5 shadow-[0_6px_20px_-6px_rgb(0_0_0/0.4)] hover:bg-[#F5F5F7] active:scale-[0.97] transition-[background-color,transform] duration-150"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden />
            {isTl ? 'Bagong Kaso' : 'New Case'}
          </button>
          <button
            type="button"
            onClick={p.onStudents}
            className="h-11 px-5 rounded-full bg-white/12 hover:bg-white/20 backdrop-blur-md text-white text-[14px] font-medium inline-flex items-center gap-1.5 ring-1 ring-inset ring-white/20 active:scale-[0.97] transition-[background-color,transform] duration-150"
          >
            <Users className="w-4 h-4" aria-hidden />
            {isTl ? `Mga Estudyante · ${p.studentCount}` : `Students · ${p.studentCount}`}
          </button>
        </div>
      </motion.div>

      {/* OPEN CASES + 14-day sparkline */}
      <motion.button {...tile(1)} type="button" onClick={p.onOpenCases} title={isTl ? 'Buksan ang mga bukas na kaso' : 'Open the list of open cases'} className={widget}>
        <div className="flex items-center justify-between">
          <span className={label}>{isTl ? 'Bukas na kaso' : 'Open cases'}</span>
          {chip('bg-[#1E469B]/10 text-[#1E469B] dark:bg-[#7CB8F7]/15 dark:text-[#7CB8F7]', <FolderOpen className="w-4 h-4" aria-hidden />)}
        </div>
        <div className="flex items-end justify-between gap-3 mt-2">
          <span className={big}>{openCount}</span>
          {p.overdue > 0 && (
            <span className="mb-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF1E6] text-[#C2410C] dark:bg-[#C2410C]/20 dark:text-[#FDBA74]">
              {p.overdue} overdue
            </span>
          )}
        </div>
        <svg viewBox="0 0 200 56" preserveAspectRatio="none" className="w-full h-12 mt-auto pt-2" aria-hidden>
          <defs>
            <linearGradient id="bento-spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={spark.area} fill="url(#bento-spark)" />
          <path d={spark.line} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle cx={spark.last[0]} cy={spark.last[1]} r="3" fill="#3B82F6" />
        </svg>
        <span className="text-[11px] text-[#8E8E93]">{isTl ? 'Bagong kaso, huling 14 araw' : 'New cases, last 14 days'}</span>
      </motion.button>

      {/* PARENTS TO CALL */}
      <motion.button {...tile(2)} type="button" onClick={p.onCalls} title={isTl ? 'Tingnan ang mga tatawagan' : 'See parents to call'} className={widget}>
        <div className="flex items-center justify-between">
          <span className={label}>{isTl ? 'Tatawagan' : 'Parents to call'}</span>
          {chip('bg-[#E11D48]/10 text-[#E11D48] dark:bg-[#FB7185]/15 dark:text-[#FB7185]', <PhoneCall className="w-4 h-4" aria-hidden />)}
        </div>
        <span className={`${big} mt-2`}>{p.callsPending}</span>
        <div className="mt-auto pt-3">
          {p.callsPending === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#059669] dark:text-[#34D399]">
              <span className="w-5 h-5 rounded-full bg-[#059669]/12 dark:bg-[#34D399]/15 flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3} aria-hidden /></span>
              {isTl ? 'Tapos lahat' : 'All caught up'}
            </span>
          ) : (
            <span className="text-[13px] font-medium text-[#E11D48] dark:text-[#FB7185]">{isTl ? 'Naghihintay ng tawag' : 'Waiting for a call'}</span>
          )}
          <span className="block text-[11px] text-[#8E8E93] mt-1">{isTl ? `${p.callsDone} natapos na` : `${p.callsDone} done so far`}</span>
        </div>
      </motion.button>

      {/* THIS MONTH + 6-month bars */}
      <motion.button {...tile(3)} type="button" onClick={p.onStats} title={isTl ? 'Tingnan ang statistics' : 'See the statistics'} className={widget}>
        <div className="flex items-center justify-between">
          <span className={label}>{isTl ? 'Ngayong buwan' : 'This month'}</span>
          {chip('bg-[#D97706]/10 text-[#D97706] dark:bg-[#FBBF24]/15 dark:text-[#FBBF24]', <FileText className="w-4 h-4" aria-hidden />)}
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className={big}>{p.offensesThisMonth}</span>
          <span className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'offense' : `offense${p.offensesThisMonth === 1 ? '' : 's'}`}</span>
        </div>
        <div className="mt-auto pt-3 flex items-end gap-1.5 h-14" aria-hidden>
          {monthly.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-[5px] ${i === monthly.length - 1 ? 'bg-gradient-to-t from-[#D97706] to-[#FBBF24]' : 'bg-[#E8E8ED] dark:bg-white/10'}`}
                style={{ height: `${Math.max(4, (m.n / monthMax) * 36)}px` }}
              />
              <span className="text-[9.5px] text-[#8E8E93] leading-none">{m.label}</span>
            </div>
          ))}
        </div>
      </motion.button>

      {/* PARENT ATTENDANCE ring */}
      <motion.button {...tile(4)} type="button" onClick={p.onConferences} title={isTl ? 'Tingnan ang mga conference' : 'See the conferences'} className={widget}>
        <div className="flex items-center justify-between">
          <span className={label}>{isTl ? 'Pagdalo ngayong araw' : 'Attendance today'}</span>
          {chip('bg-[#059669]/10 text-[#059669] dark:bg-[#34D399]/15 dark:text-[#34D399]', <CalendarCheck className="w-4 h-4" aria-hidden />)}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <Ring pct={(p.attendance.ratePercent ?? 0) / 100} size={72} stroke={8} track="rgb(142 142 147 / 0.18)" color="#10B981">
            <span className="text-[15px] font-semibold tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
              {p.attendance.ratePercent === null ? '0%' : `${p.attendance.ratePercent}%`}
            </span>
          </Ring>
          <div className="min-w-0">
            <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              {p.attendance.ratePercent === null
                ? isTl ? 'Wala pang conference' : 'No conferences yet'
                : isTl ? `${p.attendance.attended} sa ${p.attendance.scheduled} dumalo` : `${p.attendance.attended} of ${p.attendance.scheduled} came`}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[12px] text-[#8E8E93] mt-0.5">
              {isTl ? 'Tingnan' : 'View'} <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </motion.button>
    </section>
  );
};
