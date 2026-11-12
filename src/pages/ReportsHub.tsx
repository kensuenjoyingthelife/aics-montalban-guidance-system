// Reports and Statistics — features flowchart page 14.
// Offense statistics · Recidivism · Monthly report (automatic) · Case summaries & handover notes.
// Every number is counted from the real records; empty periods say "no data" instead of fake numbers.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { soundFX } from '../services/soundEngine';
import type { ToastNextAction } from './DashboardPage';
import type { DisciplineCaseRecord } from '../data/stage3MockData';
import type { ParentAppointmentItem, FollowUpTaskItem } from '../data/dashboardMockData';
import {
  PeriodKind,
  GroupKind,
  periodRange,
  shiftRef,
  offenseStats,
  trend,
  recidivism,
  monthlyReport,
  levelOf,
  schoolYearLabel,
  OVERDUE_DAYS,
  caseStatusWord,
  periodSeries,
  changeOf,
  Direction,
  attendanceWord,
  CountRow,
} from '../services/reportStats';
import { fetchHandoverNotes, fetchHandoverCounts, addHandoverNote, HandoverNote } from '../services/handoverDb';
import { todayISO } from '../services/scheduling';
import { LineChart, GroupedBars, Legend } from '../components/ui/Charts';
import { useAppConfig } from '../services/appConfig';

const C_NEW = '#E11D48';
const C_SOLVED = '#059669';
const C_ATT = '#2563EB';
const C_MISS = '#F59E0B';

type Tab = 'overview' | 'stats' | 'repeat' | 'monthly' | 'handover';
interface Props {
  cases: DisciplineCaseRecord[];
  appointments: ParentAppointmentItem[];
  followUps: FollowUpTaskItem[];
  staffEmail: string;
  onTriggerToast: (msg: string, undo?: () => void, next?: ToastNextAction) => void;
  onOpenCase?: (caseCode: string) => void;
}

const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap';
const card = 'rounded-2xl saas-card';
const sub = 'text-xs text-[#4A608A] dark:text-[#94A8D0]';
const h2 = 'text-base font-extrabold text-[#0B1F4D] dark:text-white';
const LEVEL_TL: Record<string, string> = { Minor: 'Minor', 'Less serious': 'Less serious', Serious: 'Serious', Grave: 'Grave' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

const Bars: React.FC<{ rows: CountRow[]; isTl: boolean; empty: string; limit?: number }> = ({ rows, isTl, empty, limit = 10 }) => {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <p className={`${sub} py-4`}>{empty}</p>;
  return (
    <div className="space-y-2.5">
      {rows.slice(0, limit).map((r) => (
        <div key={r.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-[#0B1F4D] dark:text-white min-w-0 break-words">{isTl && r.labelTl ? r.labelTl : isTl ? LEVEL_TL[r.label] ?? r.label : r.label}</span>
            <span className="font-mono font-bold text-[#1E469B] dark:text-[#7CB8F7] whitespace-nowrap">
              {r.count} · {r.pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#E4ECFC] dark:bg-[#192D58] overflow-hidden">
            <div className="h-full rounded-full bg-[#1E469B] dark:bg-[#4E92DF]" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
      {rows.length > limit && <p className={sub}>{isTl ? `+${rows.length - limit} pa` : `+${rows.length - limit} more`}</p>}
    </div>
  );
};

/** "▲ 2 (+25%) vs last month" — the arrow shows the direction, the color (outside) shows good or bad */
function arrowText(dir: Direction, diff: number, pct: number | null, suf: string, unit: 'month' | 'week', tl: boolean): string {
  const vs = unit === 'month' ? (tl ? 'kumpara noong nakaraang buwan' : 'vs last month') : tl ? 'kumpara noong nakaraang linggo' : 'vs last week';
  if (dir === 'none') return tl ? 'Walang maikukumpara' : 'Nothing to compare yet';
  if (dir === 'same') return `= ${tl ? 'Walang pagbabago' : 'No change'} ${vs}`;
  const arrow = dir === 'up' ? '▲' : '▼';
  return `${arrow} ${diff > 0 ? '+' : ''}${diff}${suf}${pct !== null ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''} ${vs}`;
}
/** one plain sentence: are cases going up or down? */
function trendSentence(now: number, before: number | null, solved: number, unit: 'month' | 'week', tl: boolean): string {
  const p = unit === 'month' ? (tl ? 'buwan' : 'month') : tl ? 'linggo' : 'week';
  if (before === null) return '';
  if (now > before) return tl ? `⚠ Tumaas ang bagong kaso ngayong ${p}: ${now} mula ${before}. ${solved} ang naayos.` : `⚠ New cases went UP this ${p}: ${now}, up from ${before}. ${solved} solved.`;
  if (now < before) return tl ? `✓ Bumaba ang bagong kaso ngayong ${p}: ${now} mula ${before}. ${solved} ang naayos.` : `✓ New cases went DOWN this ${p}: ${now}, down from ${before}. ${solved} solved.`;
  return tl ? `Pareho ang bilang ng bagong kaso ngayong ${p} (${now}). ${solved} ang naayos.` : `Same number of new cases this ${p} (${now}). ${solved} solved.`;
}

const ReportsHub: React.FC<Props> = ({ cases, appointments, followUps, staffEmail, onTriggerToast, onOpenCase }) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';
  const today = todayISO();
  // "overdue" = open longer than Settings › Offenses › overdue days
  const OVERDUE = useAppConfig().caseRules.overdueDays || OVERDUE_DAYS;
  const [tab, setTab] = useState<Tab>('overview');

  // ---------- overview: up or down compared with the period before ----------
  const [unit, setUnit] = useState<'month' | 'week'>('month');
  const series = useMemo(() => periodSeries(cases, appointments, unit, unit === 'month' ? 6 : 8, new Date()), [cases, appointments, unit]);
  const cur = series[series.length - 1];
  const prev = series[series.length - 2];
  const openNow = useMemo(() => cases.filter((c) => c.status !== 'Resolved').length, [cases]);

  // ---------- statistics ----------
  const [kind, setKind] = useState<PeriodKind>('month');
  const [ref, setRef] = useState<Date>(new Date());
  const [group, setGroup] = useState<GroupKind>('type');
  const [from, to] = useMemo(() => periodRange(kind, ref), [kind, ref]);
  const stats = useMemo(() => offenseStats(cases, from, to, group), [cases, from, to, group]);
  const bars = useMemo(() => trend(cases, kind, from, to), [cases, kind, from, to]);
  const isCurrent = to >= today && from <= today;
  const periodLabel = useMemo(() => {
    const f = new Date(from + 'T00:00:00');
    if (kind === 'sy') return `${isTl ? 'School year' : 'School year'} ${schoolYearLabel(f)}`;
    if (kind === 'month') return new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'long', year: 'numeric' }).format(f);
    const t = new Date(to + 'T00:00:00');
    const fmt = new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric' });
    return `${fmt.format(f)} – ${fmt.format(t)}`;
  }, [from, to, kind, isTl]);

  // ---------- recidivism ----------
  const rec = useMemo(() => recidivism(cases), [cases]);

  // ---------- monthly ----------
  const [month, setMonth] = useState(today.slice(0, 7));
  const report = useMemo(() => monthlyReport(cases, appointments, month, today, OVERDUE), [cases, appointments, month, today]);
  const monthName = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
  }, [month, isTl]);

  const reportRows = (): string[][] => [
    ['Item', 'Value'],
    ['Month', monthName],
    ['New cases', String(report.newCases)],
    ...report.byLevel.map((r) => [`Level: ${r.label}`, `${r.count} (${r.pct}%)`]),
    ...report.byType.map((r) => [`Type: ${r.label}`, `${r.count} (${r.pct}%)`]),
    ['Parent conferences held', String(report.conferencesHeld)],
    ['Parents attended', String(report.attended)],
    ['Parents did not attend', String(report.didNotAttend)],
    ['Parent attendance rate', report.attendanceRate === null ? 'No conferences' : `${report.attendanceRate}%`],
    ...report.noShowReasons.map((r) => [`Did not attend reason: ${r.label}`, String(r.count)]),
    [`Overdue cases (open more than ${OVERDUE} days)`, String(report.overdue.length)],
    ...report.overdue.map((c) => [`Overdue: ${c.caseCode}`, `${c.studentName} · ${c.offenseTitleEn} · since ${c.incidentDate.slice(0, 10)}`]),
    ['Cases closed', String(report.closed)],
    ['Average days to close', report.avgDaysToClose === null ? 'No closed cases' : String(report.avgDaysToClose)],
  ];
  const downloadCsv = () => {
    const csv = reportRows()
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AICS-Guidance-Monthly-Report-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onTriggerToast(isTl ? '✓ Na-download ang monthly report (CSV). Mabubuksan ito sa Excel.' : '✓ Monthly report downloaded (CSV). It opens in Excel.');
  };
  const printReport = () => {
    // a hidden page made only of the report, so the sidebar and buttons are never printed (works in Tauri too)
    const rows = reportRows()
      .slice(1)
      .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Monthly Report ${esc(month)}</title>
      <style>body{font-family:Arial,sans-serif;margin:32px;color:#0B1F4D}h1{font-size:18px;margin:0}p{margin:4px 0 16px;font-size:12px;color:#4A608A}
      table{width:100%;border-collapse:collapse;font-size:12px}td{border:1px solid #CBD5E1;padding:6px 8px;vertical-align:top}td:first-child{width:45%;font-weight:bold}</style></head>
      <body><h1>AICS Montalban — Guidance Office Monthly Report</h1><p>${esc(monthName)} · printed ${esc(new Date().toLocaleString('en-US'))}</p>
      <table>${rows}</table></body></html>`;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc || !frame.contentWindow) {
      frame.remove();
      onTriggerToast(isTl ? '⚠️ Hindi mabuksan ang print. Gamitin muna ang "I-download (Excel)".' : '⚠️ Could not open print. Use "Download (Excel)" for now.');
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1500);
    }, 200);
  };

  // ---------- handover ----------
  const [hq, setHq] = useState('');
  const [hLimit, setHLimit] = useState(50);
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState<HandoverNote[] | null>(null);
  const [noteCounts, setNoteCounts] = useState<Map<string, number>>(new Map());
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (tab === 'handover') void fetchHandoverCounts().then(setNoteCounts);
  }, [tab]);
  // sorted once (open first, oldest first) with a lowercase search text; typing only filters
  const sortedCases = useMemo(
    () =>
      cases
        .map((c) => ({ c, text: `${c.caseCode} ${c.studentName} ${c.studentNumber}`.toLowerCase() }))
        .sort((a, b) => Number(a.c.status === 'Resolved') - Number(b.c.status === 'Resolved') || a.c.incidentDate.localeCompare(b.c.incidentDate)),
    [cases]
  );
  const caseList = useMemo(() => {
    const q = hq.trim().toLowerCase();
    return (q ? sortedCases.filter((x) => x.text.includes(q)) : sortedCases).map((x) => x.c);
  }, [sortedCases, hq]);
  useEffect(() => setHLimit(50), [hq]);
  const sel = useMemo(() => cases.find((c) => c.caseCode === selected) ?? null, [cases, selected]);
  const loadNotes = useCallback(async (code: string) => {
    setNotes(null);
    const n = await fetchHandoverNotes(code);
    setNotes(n ?? []);
    if (!n) onTriggerToast(isTl ? '⚠️ Hindi makuha ang mga tala. I-check ang internet.' : '⚠️ Could not load the notes. Check the internet.');
  }, [isTl, onTriggerToast]);
  useEffect(() => {
    if (selected) void loadNotes(selected);
  }, [selected, loadNotes]);
  const caseApts = useMemo(
    () => (sel ? appointments.filter((a) => a.caseId === sel.caseCode).sort((a, b) => (a.date || '').localeCompare(b.date || '')) : []),
    [sel, appointments]
  );
  const caseTasks = useMemo(() => (sel ? followUps.filter((t) => t.caseId === sel.caseCode && !t.resolved) : []), [sel, followUps]);
  const saveNote = async () => {
    if (!sel) return;
    const text = draft.trim();
    if (text.length < 3) return;
    setSaving(true);
    const n = await addHandoverNote(sel.caseCode, text, staffEmail);
    setSaving(false);
    if (!n) {
      onTriggerToast(isTl ? '⚠️ Hindi na-save ang tala. I-check ang internet, tapos subukan ulit.' : '⚠️ Note not saved. Check the internet, then try again.');
      return;
    }
    setDraft('');
    setNotes((l) => [n, ...(l ?? [])]);
    setNoteCounts((m) => new Map(m).set(sel.caseCode, (m.get(sel.caseCode) ?? 0) + 1));
    soundFX.playSuccessCheck();
    onTriggerToast(isTl ? '✓ Na-save ang handover note. Makikita ito ng susunod na staff.' : '✓ Handover note saved. The next staff member will see it.');
  };
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }), [isTl]);
  const dt = (s: string) => (s ? dateFmt.format(new Date(s.length === 10 ? s + 'T00:00:00' : s)) : '—');
  const daysOpen = (c: DisciplineCaseRecord) => Math.max(0, Math.round((new Date(today + 'T00:00:00').getTime() - new Date(c.incidentDate.slice(0, 10) + 'T00:00:00').getTime()) / 86400000));

  const tabs: [Tab, string, string][] = [
    ['overview', isTl ? 'Overview' : 'Overview', isTl ? 'Tumataas ba o bumababa ang mga kaso? Naaayos ba?' : 'Are cases going up or down? Are they being solved?'],
    ['stats', isTl ? 'Offense statistics' : 'Offense statistics', isTl ? 'Bilang at porsyento ayon sa uri, antas o grade' : 'Counts and percentages by type, level or grade'],
    ['repeat', isTl ? `Umulit · ${rec.repeaters}` : `Repeat offenders · ${rec.repeaters}`, isTl ? 'Umulit ng parehong offense pagkatapos ng sanction' : 'Repeated the same offense after a sanction'],
    ['monthly', isTl ? 'Monthly report' : 'Monthly report', isTl ? 'Automatic na buod bawat buwan' : 'Automatic summary for each month'],
    ['handover', isTl ? 'Buod at handover notes' : 'Case summary & handover', isTl ? 'Para maituloy ng ibang staff ang kaso' : 'So another staff member can continue a case'],
  ];

  return (
    <main className="p-5 lg:p-6 max-w-[1440px] w-full mx-auto space-y-4 flex-1">
      <div className="shrink-0 min-h-[54px] flex flex-wrap items-center gap-3 border-b border-[#DCE5F2] dark:border-[#1E3158] pb-2">
        <div className="inline-flex flex-wrap p-1 rounded-xl saas-card-subtle gap-1" role="tablist">
          {tabs.map(([id, label, tip]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              title={tip}
              data-report-tab={id}
              onClick={() => {
                soundFX.playToggleSwitch(true);
                setTab(id);
              }}
              className={`px-4 py-2 rounded-lg text-xs sm:text-[13px] font-bold whitespace-nowrap transition-colors ${
                tab === id ? 'bg-[#1E469B] text-white shadow-sm' : 'text-[#4A608A] dark:text-[#94A8D0] hover:text-[#0B1F4D] dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= OVERVIEW ================= */}
      {tab === 'overview' && cur && (
        <>
          <div className={`${card} p-4 flex flex-wrap items-center justify-between gap-3`}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-1 rounded-xl saas-card-subtle gap-1">
                {(['month', 'week'] as const).map((u) => (
                  <button key={u} type="button" data-unit={u} onClick={() => setUnit(u)} className={`${btn} ${unit === u ? 'bg-[#1E469B] text-white' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}>
                    {u === 'month' ? (isTl ? 'Bawat buwan (6 buwan)' : 'By month (6 months)') : isTl ? 'Bawat linggo (8 linggo)' : 'By week (8 weeks)'}
                  </button>
                ))}
              </div>
            </div>
            <Legend
              items={[
                { color: '#059669', label: isTl ? '▲▼ berde = gumaganda' : '▲▼ green = getting better', shape: 'dot' },
                { color: '#E11D48', label: isTl ? '▲▼ pula = lumalala' : '▲▼ red = getting worse', shape: 'dot' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3" data-kpis>
            {(
              [
                ['new', isTl ? 'Bagong kaso' : 'New cases', cur.newCases, prev?.newCases ?? null, 'bad-up', ''],
                ['solved', isTl ? 'Naayos na kaso' : 'Cases solved', cur.solved, prev?.solved ?? null, 'good-up', ''],
                ['att', isTl ? 'Dumalo ang magulang' : 'Parent attendance', cur.attendanceRate, prev?.attendanceRate ?? null, 'good-up', '%'],
                ['days', isTl ? 'Araw bago maisara' : 'Days to close', cur.avgDaysToClose, prev?.avgDaysToClose ?? null, 'good-down', ''],
              ] as [string, string, number | null, number | null, 'bad-up' | 'good-up' | 'good-down', string][]
            ).map(([id, title, v, pv, kindOf, suf]) => {
              const ch = changeOf(v, pv);
              const good = ch.dir === 'same' || ch.dir === 'none' ? null : (kindOf === 'bad-up' ? ch.dir === 'down' : kindOf === 'good-up' ? ch.dir === 'up' : ch.dir === 'down');
              return (
                <div key={id} className={`${card} p-4`} data-kpi={id}>
                  <p className={sub}>{title}</p>
                  <p className="text-3xl font-extrabold text-[#0B1F4D] dark:text-white mt-1">{v === null ? '—' : `${v}${suf}`}</p>
                  <p className={`text-xs font-extrabold mt-1 ${good === null ? 'text-[#4A608A] dark:text-[#94A8D0]' : good ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`} data-change={ch.dir}>
                    {arrowText(ch.dir, ch.diff, ch.pct, suf, unit, isTl)}
                  </p>
                </div>
              );
            })}
            <div className={`${card} p-4 col-span-2 xl:col-span-1`} data-kpi="open">
              <p className={sub}>{isTl ? 'Bukas pa ngayon' : 'Still open now'}</p>
              <p className="text-3xl font-extrabold text-[#0B1F4D] dark:text-white mt-1">{openNow}</p>
              <p className={sub}>{isTl ? 'lahat ng kasong hindi pa tapos' : 'all cases not done yet'}</p>
            </div>
          </div>
          <p className="text-sm font-bold text-[#0B1F4D] dark:text-white" data-summary>
            {trendSentence(cur.newCases, prev?.newCases ?? null, cur.solved, unit, isTl)}
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section className={`${card} p-5 space-y-2`}>
              <h2 className={h2}>{isTl ? 'Bagong kaso vs naayos' : 'New cases vs cases solved'}</h2>
              <p className={sub}>{isTl ? 'Kapag mas mataas ang berde kaysa pula, naaayos ang mga kaso nang mas mabilis kaysa dumarating.' : 'When green is above red, cases are being solved faster than new ones come in.'}</p>
              <LineChart
                ariaLabel={isTl ? 'Bagong kaso at naayos na kaso' : 'New cases and solved cases'}
                labels={series.map((p) => p.label)}
                series={[
                  { name: isTl ? 'Bagong kaso' : 'New cases', color: C_NEW, values: series.map((p) => p.newCases) },
                  { name: isTl ? 'Naayos' : 'Solved', color: C_SOLVED, values: series.map((p) => p.solved), area: true },
                ]}
              />
              <Legend items={[{ color: C_NEW, label: isTl ? 'Bagong kaso' : 'New cases' }, { color: C_SOLVED, label: isTl ? 'Naayos na kaso' : 'Cases solved' }]} />
            </section>
            <section className={`${card} p-5 space-y-2`}>
              <h2 className={h2}>{isTl ? 'Dumalo ba ang mga magulang?' : 'Did parents attend?'}</h2>
              <p className={sub}>{isTl ? 'Bilang ng dumalo at hindi dumalo sa conference.' : 'Conferences parents attended and did not attend.'}</p>
              <GroupedBars
                ariaLabel={isTl ? 'Dumalo at hindi dumalo' : 'Attended and did not attend'}
                labels={series.map((p) => p.label)}
                series={[
                  { name: isTl ? 'Dumalo' : 'Attended', color: C_ATT, values: series.map((p) => p.attended) },
                  { name: isTl ? 'Hindi dumalo' : 'Did not attend', color: C_MISS, values: series.map((p) => p.missed) },
                ]}
              />
              <Legend items={[{ color: C_ATT, label: isTl ? 'Dumalo' : 'Attended', shape: 'box' }, { color: C_MISS, label: isTl ? 'Hindi dumalo' : 'Did not attend', shape: 'box' }]} />
            </section>
            <section className={`${card} p-5 space-y-2`}>
              <h2 className={h2}>{isTl ? 'Porsyento ng dumalong magulang' : 'Parent attendance rate'}</h2>
              <p className={sub}>{isTl ? 'Walang tuldok kapag walang conference sa panahong iyon.' : 'No dot when there was no conference in that period.'}</p>
              <LineChart
                ariaLabel={isTl ? 'Porsyento ng dumalo' : 'Attendance rate'}
                labels={series.map((p) => p.label)}
                series={[{ name: isTl ? 'Dumalo' : 'Attendance', color: C_ATT, values: series.map((p) => p.attendanceRate), area: true }]}
                suffix="%"
                max={100}
              />
              {series.every((p) => p.attendanceRate === null) && (
                <p className="text-xs font-bold text-[#4A608A] dark:text-[#94A8D0]">{isTl ? 'Wala pang conference sa mga panahong ito.' : 'No conferences in these periods yet.'}</p>
              )}
              <Legend items={[{ color: C_ATT, label: isTl ? '% ng dumalo sa lahat ng conference' : '% attended of all conferences' }]} />
            </section>
            <section className={`${card} p-5 space-y-2`}>
              <h2 className={h2}>{isTl ? 'Gaano kabilis naisasara ang kaso' : 'How fast cases are closed'}</h2>
              <p className={sub}>{isTl ? `Average na araw mula insidente hanggang maisara. Mas mababa = mas mabilis. Target: ${OVERDUE} araw pababa.` : `Average days from incident to closed. Lower = faster. Target: ${OVERDUE} days or less.`}</p>
              <LineChart
                ariaLabel={isTl ? 'Araw bago maisara' : 'Days to close'}
                labels={series.map((p) => p.label)}
                series={[
                  { name: isTl ? 'Araw bago maisara' : 'Days to close', color: C_SOLVED, values: series.map((p) => p.avgDaysToClose) },
                  { name: isTl ? 'Target' : 'Target', color: '#94A3B8', values: series.map(() => OVERDUE), dashed: true },
                ]}
              />
              {series.every((p) => p.avgDaysToClose === null) && (
                <p className="text-xs font-bold text-[#4A608A] dark:text-[#94A8D0]" data-empty-note>
                  {isTl ? 'Wala pang naisarang kaso sa mga panahong ito, kaya target lang ang nakikita.' : 'No case was closed in these periods yet, so only the target line shows.'}
                </p>
              )}
              <Legend items={[{ color: C_SOLVED, label: isTl ? 'Average na araw' : 'Average days' }, { color: '#94A3B8', label: isTl ? `Target (${OVERDUE} araw)` : `Target (${OVERDUE} days)`, shape: 'dash' }]} />
            </section>
          </div>
        </>
      )}

      {/* ================= STATISTICS ================= */}
      {tab === 'stats' && (
        <>
          <div className={`${card} p-4 flex flex-wrap items-center justify-between gap-3`}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-1 rounded-xl saas-card-subtle gap-1">
                {(['week', 'month', 'sy'] as PeriodKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    data-period={k}
                    onClick={() => {
                      setKind(k);
                      setRef(new Date());
                    }}
                    className={`${btn} ${kind === k ? 'bg-[#1E469B] text-white' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}
                  >
                    {k === 'week' ? (isTl ? 'Linggo' : 'Week') : k === 'month' ? (isTl ? 'Buwan' : 'Month') : 'School year'}
                  </button>
                ))}
              </div>
              <button type="button" aria-label={isTl ? 'Nakaraan' : 'Previous'} title={isTl ? 'Nakaraan' : 'Previous'} data-period-step="-1" onClick={() => setRef((r) => shiftRef(kind, r, -1))} className={`${btn} saas-card-subtle`}>
                ←
              </button>
              <span className="text-sm font-extrabold text-[#0B1F4D] dark:text-white min-w-[150px] text-center" data-period-label>
                {periodLabel}
              </span>
              <button type="button" aria-label={isTl ? 'Susunod' : 'Next'} title={isTl ? 'Susunod' : 'Next'} data-period-step="1" disabled={isCurrent} onClick={() => setRef((r) => shiftRef(kind, r, 1))} className={`${btn} saas-card-subtle disabled:opacity-40`}>
                →
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className={sub}>{isTl ? 'Ayon sa' : 'By'}</span>
              <div className="inline-flex p-1 rounded-xl saas-card-subtle gap-1">
                {(['type', 'level', 'grade'] as GroupKind[]).map((g) => (
                  <button key={g} type="button" data-group={g} onClick={() => setGroup(g)} className={`${btn} ${group === g ? 'bg-[#1E469B] text-white' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}>
                    {g === 'type' ? (isTl ? 'Uri' : 'Type') : g === 'level' ? (isTl ? 'Antas' : 'Level') : 'Grade'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <section className={`${card} p-5 lg:col-span-3 space-y-3`}>
              <div>
                <h2 className={h2} data-stats-total>
                  {isTl ? `${stats.total} offense` : `${stats.total} offense${stats.total === 1 ? '' : 's'}`} · {periodLabel}
                </h2>
                <p className={sub}>{isTl ? 'Bilang at porsyento ng kabuuan · pinakamarami sa itaas' : 'Count and share of the total · most first'}</p>
              </div>
              <Bars rows={stats.rows} isTl={isTl} empty={isTl ? 'Walang naitalang offense sa panahong ito.' : 'No offenses were recorded in this period.'} />
              <Legend items={[{ color: '#1E469B', label: isTl ? 'Haba ng bar = bilang · % = bahagi ng lahat ng offense' : 'Bar length = count · % = share of all offenses', shape: 'box' }]} />
            </section>
            <section className={`${card} p-5 lg:col-span-2 space-y-3`}>
              <div>
                <h2 className={h2}>{isTl ? 'Takbo ng mga kaso' : 'Cases over time'}</h2>
                <p className={sub}>{kind === 'sy' ? (isTl ? 'Bawat buwan' : 'Per month') : kind === 'month' ? (isTl ? 'Bawat linggo' : 'Per week') : isTl ? 'Bawat araw' : 'Per day'}</p>
                <Legend items={[{ color: '#1E469B', label: isTl ? 'Bagong kaso (ayon sa petsa ng insidente)' : 'New cases (by incident date)', shape: 'box' }]} />
              </div>
              <div className="h-[180px] flex items-end gap-1.5" data-trend>
                {bars.map((b, i) => {
                  const max = Math.max(1, ...bars.map((x) => x.count));
                  return (
                    <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 h-full" title={`${b.label}: ${b.count}`}>
                      <span className="text-[10px] font-mono font-bold text-[#1E469B] dark:text-[#7CB8F7]">{b.count}</span>
                      <div className="w-full rounded-t-md bg-[#1E469B] dark:bg-[#4E92DF]" style={{ height: `${(b.count / max) * 130}px`, minHeight: b.count ? 4 : 1, opacity: b.count ? 1 : 0.25 }} />
                      <span className="text-[10px] text-[#4A608A] dark:text-[#94A8D0] truncate w-full text-center">{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}

      {/* ================= RECIDIVISM ================= */}
      {tab === 'repeat' && (
        <section className={`${card} overflow-hidden`}>
          <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={h2}>{isTl ? 'Mga umulit ng parehong offense pagkatapos ng sanction' : 'Students who repeated the same offense after a sanction'}</h2>
              <p className={sub}>
                {isTl
                  ? 'Kasama lang kapag ang naunang kaso ay may sanction na ("May sanction" o "Tapos na").'
                  : 'Only counted when the earlier case already had a sanction ("Serving sanction" or "Done").'}
              </p>
            </div>
            <div className="text-right" data-recid-rate>
              <p className="text-2xl font-extrabold text-[#0B1F4D] dark:text-white">{rec.sanctionedStudents ? `${rec.rate}%` : '—'}</p>
              <p className={sub}>
                {rec.sanctionedStudents
                  ? isTl
                    ? `${rec.repeaters} sa ${rec.sanctionedStudents} estudyanteng na-sanction`
                    : `${rec.repeaters} of ${rec.sanctionedStudents} sanctioned students`
                  : isTl
                  ? 'Wala pang na-sanction'
                  : 'Nobody sanctioned yet'}
              </p>
            </div>
          </div>
          <div className="p-4 space-y-2 bg-[#F4F7FC] dark:bg-[#0B1527]">
            {rec.rows.length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-emerald-700 dark:text-emerald-400">
                ✓ {isTl ? 'Walang umulit ng parehong offense pagkatapos ng sanction.' : 'No one repeated the same offense after a sanction.'}
              </p>
            )}
            {rec.rows.slice(0, 100).map((r) => (
              <div key={r.studentNumber + r.offense} data-repeat-row={r.studentNumber} className="rounded-xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                    {r.studentName} <span className={sub}>· {r.gradeSection}</span>
                  </p>
                  <p className={sub}>
                    {isTl ? r.offenseTl || r.offense : r.offense} · {isTl ? `${r.times}x lahat` : `${r.times} times in total`} · {isTl ? 'huli' : 'last'} {dt(r.lastDate)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {[r.firstCase, r.lastCase].map((code, i) =>
                    onOpenCase ? (
                      <button key={code} type="button" onClick={() => onOpenCase(code)} className={`${btn} saas-card-subtle`} title={i === 0 ? (isTl ? 'Ang kasong may sanction' : 'The case with the sanction') : isTl ? 'Ang pag-ulit' : 'The repeat'}>
                        {i === 0 ? (isTl ? 'Unang kaso' : 'First') : isTl ? 'Inulit' : 'Repeat'}: {code}
                      </button>
                    ) : null
                  )}
                </div>
              </div>
            ))}
            {rec.rows.length > 100 && <p className={sub}>{isTl ? `+${rec.rows.length - 100} pa` : `+${rec.rows.length - 100} more`}</p>}
          </div>
        </section>
      )}

      {/* ================= MONTHLY REPORT ================= */}
      {tab === 'monthly' && (
        <>
          <div className={`${card} p-4 flex flex-wrap items-center justify-between gap-3`}>
            <label className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Buwan' : 'Month'}</span>
              <input
                type="month"
                data-month
                value={month}
                max={today.slice(0, 7)}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white"
              />
            </label>
            <div className="flex gap-2">
              <button type="button" data-action="print-report" onClick={printReport} className={`${btn} px-4 py-2 bg-[#1E469B] text-white`}>
                🖨 {isTl ? 'I-print' : 'Print'}
              </button>
              <button type="button" data-action="csv-report" onClick={downloadCsv} className={`${btn} px-4 py-2 saas-card-subtle`}>
                ⬇ {isTl ? 'I-download (Excel)' : 'Download (Excel)'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" data-monthly>
            {[
              [isTl ? 'Bagong kaso' : 'New cases', String(report.newCases), isTl ? `naitala ngayong ${monthName}` : `reported in ${monthName}`],
              [
                isTl ? 'Dumalo ang magulang' : 'Parent attendance',
                report.attendanceRate === null ? '—' : `${report.attendanceRate}%`,
                report.attendanceRate === null ? (isTl ? 'walang conference' : 'no conferences') : isTl ? `${report.attended} sa ${report.conferencesHeld} conference` : `${report.attended} of ${report.conferencesHeld} conferences`,
              ],
              [isTl ? 'Overdue na kaso' : 'Overdue cases', String(report.overdue.length), isTl ? `bukas pa nang higit ${OVERDUE} araw` : `open more than ${OVERDUE} days`],
              [
                isTl ? 'Araw bago maisara' : 'Days to close',
                report.avgDaysToClose === null ? '—' : String(report.avgDaysToClose),
                report.avgDaysToClose === null
                  ? isTl ? 'walang naisarang kaso' : 'no case closed'
                  : report.closed === 1
                  ? isTl ? '1 kasong naisara' : '1 case closed'
                  : isTl ? `average ng ${report.closed} naisara (${report.fastestDays}–${report.slowestDays} araw)` : `average of ${report.closed} closed (${report.fastestDays}–${report.slowestDays} days)`,
              ],
            ].map(([t, v, s]) => (
              <div key={t} className={`${card} p-5`}>
                <p className={sub}>{t}</p>
                <p className="text-3xl font-extrabold text-[#0B1F4D] dark:text-white mt-1">{v}</p>
                <p className={sub}>{s}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className={`${card} p-5 space-y-3`}>
              <h2 className={h2}>{isTl ? 'Offense ayon sa antas' : 'Offenses by level'}</h2>
              <Bars rows={report.byLevel} isTl={isTl} empty={isTl ? 'Walang offense ngayong buwan.' : 'No offenses this month.'} />
            </section>
            <section className={`${card} p-5 space-y-3`}>
              <h2 className={h2}>{isTl ? 'Dahilan ng hindi pagdalo' : 'Reasons parents did not attend'}</h2>
              <Bars rows={report.noShowReasons} isTl={isTl} empty={isTl ? 'Walang hindi dumalo ngayong buwan.' : 'No missed conferences this month.'} />
            </section>
            <section className={`${card} p-5 space-y-3`}>
              <h2 className={h2}>{isTl ? `Overdue (higit ${OVERDUE} araw)` : `Overdue (over ${OVERDUE} days)`}</h2>
              {report.overdue.length === 0 ? (
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">✓ {isTl ? 'Walang overdue.' : 'Nothing overdue.'}</p>
              ) : (
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                  {report.overdue.slice(0, 50).map((c) => (
                    <button key={c.caseCode} type="button" onClick={() => onOpenCase?.(c.caseCode)} className="w-full text-left rounded-lg px-3 py-2 saas-card-subtle hover:border-[#1E469B]">
                      <span className="block text-xs font-extrabold text-[#0B1F4D] dark:text-white">
                        {c.caseCode} · {c.studentName}
                      </span>
                      <span className={sub}>{isTl ? `${daysOpen(c)} araw nang bukas` : `open ${daysOpen(c)} days`}</span>
                    </button>
                  ))}
                  {report.overdue.length > 50 && <p className={sub}>+{report.overdue.length - 50}</p>}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {/* ================= HANDOVER ================= */}
      {tab === 'handover' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr] gap-4 items-start">
          <section className={`${card} overflow-hidden`}>
            <div className="p-3 border-b border-[#DCE5F2] dark:border-[#1E3158]">
              <input
                data-handover-search
                value={hq}
                onChange={(e) => setHq(e.target.value.slice(0, 60))}
                placeholder={isTl ? 'Hanapin ang kaso o estudyante' : 'Find a case or student'}
                className="w-full px-3 py-2 rounded-xl border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white"
              />
            </div>
            <div className="max-h-[calc(100vh-260px)] min-h-[260px] overflow-y-auto p-2 space-y-1.5 bg-[#F4F7FC] dark:bg-[#0B1527]">
              {caseList.length === 0 && <p className={`${sub} p-6 text-center`}>{isTl ? 'Walang tugmang kaso.' : 'No matching case.'}</p>}
              {caseList.slice(0, hLimit).map((c) => (
                <button
                  key={c.caseCode}
                  type="button"
                  data-handover-case={c.caseCode}
                  onClick={() => setSelected(c.caseCode)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 border ${selected === c.caseCode ? 'bg-white dark:bg-[#13203B] border-[#1E469B] dark:border-[#7CB8F7]' : 'bg-white dark:bg-[#0F1A30] border-[#D3DDEE] dark:border-[#253B66]'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-[#0B1F4D] dark:text-white truncate">{c.studentName}</span>
                    {(noteCounts.get(c.caseCode) ?? 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200 whitespace-nowrap" title={isTl ? 'Bilang ng handover note' : 'Number of handover notes'}>
                        📝 {noteCounts.get(c.caseCode)}
                      </span>
                    )}
                  </span>
                  <span className={sub}>
                    {c.caseCode} · {caseStatusWord(c.status, isTl)}
                  </span>
                </button>
              ))}
              {caseList.length > hLimit && (
                <button type="button" onClick={() => setHLimit((n) => n + 50)} className={`${btn} w-full saas-card-subtle`}>
                  {isTl ? `Ipakita pa (${caseList.length - hLimit} pa)` : `Show more (${caseList.length - hLimit} more)`}
                </button>
              )}
            </div>
          </section>
          <section className={`${card} overflow-hidden`}>
            {!sel ? (
              <div className="p-10 text-center">
                <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Pumili ng kaso sa kaliwa.' : 'Pick a case on the left.'}</p>
                <p className={sub}>{isTl ? 'Makikita rito ang buod at ang mga tala para maituloy ito ng ibang staff.' : 'You will see its summary and notes so another staff member can continue it.'}</p>
              </div>
            ) : (
              <div data-handover-summary={sel.caseCode}>
                <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className={h2}>
                      {sel.studentName} <span className={sub}>· {sel.gradeSection}</span>
                    </h2>
                    <p className={sub}>
                      {sel.caseCode} · {isTl ? sel.offenseTitleTl || sel.offenseTitleEn : sel.offenseTitleEn}
                    </p>
                  </div>
                  {onOpenCase && (
                    <button type="button" onClick={() => onOpenCase(sel.caseCode)} className={`${btn} saas-card-subtle`}>
                      {isTl ? 'Buksan sa Mga Kaso' : 'Open in Cases'}
                    </button>
                  )}
                </div>
                <dl className="px-6 py-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  {[
                    [isTl ? 'Status' : 'Status', `${caseStatusWord(sel.status, isTl)}${sel.status === 'Resolved' && sel.closedAt ? ` · ${dt(sel.closedAt)}` : ''}`],
                    [isTl ? 'Antas' : 'Level', levelOf(sel.severity)],
                    [isTl ? 'Petsa ng insidente' : 'Incident date', `${dt(sel.incidentDate)}${sel.status !== 'Resolved' ? ` · ${isTl ? `${daysOpen(sel)} araw` : `${daysOpen(sel)} days`}` : ''}`],
                    [isTl ? 'Nag-report' : 'Reported by', sel.reportedBy || '—'],
                    [
                      isTl ? 'Mga conference' : 'Conferences',
                      caseApts.length === 0
                        ? isTl ? 'Wala pa' : 'None yet'
                        : `${caseApts.length} · ${isTl ? 'huli' : 'last'}: ${attendanceWord(caseApts[caseApts.length - 1].status, isTl)} (${dt(caseApts[caseApts.length - 1].date || '')})`,
                    ],
                    [isTl ? 'Bukas na follow-up' : 'Open follow-ups', caseTasks.length ? String(caseTasks.length) : isTl ? 'Wala' : 'None'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[#4A608A] dark:text-[#94A8D0]">{k}</dt>
                      <dd className="text-[#0B1F4D] dark:text-white break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="px-6 py-4 border-t border-[#DCE5F2] dark:border-[#1E3158] space-y-3">
                  <h3 className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Handover notes' : 'Handover notes'}</h3>
                  <div className="space-y-2">
                    <textarea
                      data-handover-note
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
                      rows={3}
                      placeholder={isTl ? 'hal. Tinawagan ang nanay, babalik siya sa Biyernes. Hintayin ang sagot ng tatay.' : 'e.g. Called the mother, she will come on Friday. The father will reply soon.'}
                      className="w-full px-3 py-2 rounded-xl border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white leading-relaxed"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={sub}>{isTl ? 'Para sa susunod na staff · hindi counseling notes · hindi na mae-edit kapag na-save' : 'For the next staff member · not counseling notes · cannot be edited once saved'}</p>
                      <button type="button" data-action="save-note" disabled={draft.trim().length < 3 || saving} onClick={() => void saveNote()} className={`${btn} px-4 py-2 bg-[#1E469B] text-white disabled:opacity-50`}>
                        {saving ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? 'I-save ang tala' : 'Save note'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2" data-handover-notes>
                    {notes === null && <p className={sub}>{isTl ? 'Kinukuha…' : 'Loading…'}</p>}
                    {notes?.length === 0 && <p className={sub}>{isTl ? 'Wala pang tala para sa kasong ito.' : 'No notes for this case yet.'}</p>}
                    {notes?.map((n) => (
                      <div key={n.id} className="rounded-xl saas-card-subtle px-3 py-2">
                        <p className="text-sm text-[#0B1F4D] dark:text-white whitespace-pre-wrap break-words">{n.note}</p>
                        <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0] mt-1">
                          {dt(n.at)} · {n.author || 'Guidance Office'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
};

export default ReportsHub;
