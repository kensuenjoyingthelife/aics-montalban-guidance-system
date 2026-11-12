// Reports and Statistics (features flowchart page 14) — pure functions over the real case and
// conference records. No made-up numbers: every figure is counted from the data passed in.
import type { DisciplineCaseRecord } from '../data/stage3MockData';
import type { ParentAppointmentItem } from '../data/dashboardMockData';
import { isGrave, isSerious } from './referralRules';

export type PeriodKind = 'week' | 'month' | 'sy';
export type GroupKind = 'type' | 'level' | 'grade';
export const OVERDUE_DAYS = 14; // manuscript: cases used to take about 2 weeks

const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const day = (s: string) => (s || '').slice(0, 10);
const toDate = (s: string) => new Date(day(s) + 'T00:00:00');
const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);

/** School year starts in June (DepEd). */
export function schoolYearStart(ref: Date): Date {
  return new Date(ref.getMonth() >= 5 ? ref.getFullYear() : ref.getFullYear() - 1, 5, 1);
}
export const schoolYearLabel = (ref: Date) => {
  const s = schoolYearStart(ref).getFullYear();
  return `${s}–${s + 1}`;
};

/** [from, to] inclusive, as YYYY-MM-DD */
export function periodRange(kind: PeriodKind, ref: Date): [string, string] {
  if (kind === 'week') {
    const d = new Date(ref);
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dow);
    const e = new Date(d);
    e.setDate(d.getDate() + 6);
    return [iso(d), iso(e)];
  }
  if (kind === 'month') return [iso(new Date(ref.getFullYear(), ref.getMonth(), 1)), iso(new Date(ref.getFullYear(), ref.getMonth() + 1, 0))];
  const s = schoolYearStart(ref);
  return [iso(s), iso(new Date(s.getFullYear() + 1, 4, 31))];
}
/** move the period back (-1) or forward (+1) */
export function shiftRef(kind: PeriodKind, ref: Date, step: number): Date {
  const d = new Date(ref);
  if (kind === 'week') d.setDate(d.getDate() + 7 * step);
  else if (kind === 'month') d.setMonth(d.getMonth() + step, 1);
  else d.setFullYear(d.getFullYear() + step);
  return d;
}

export type Level = 'Minor' | 'Less serious' | 'Serious' | 'Grave';
export function levelOf(severity: string): Level {
  if (isGrave(severity)) return 'Grave';
  if (/less serious/i.test(severity)) return 'Less serious';
  if (isSerious(severity)) return 'Serious';
  return 'Minor';
}
export const gradeOf = (gs: string) => (gs.match(/Grade\s*(1[12])/i)?.[0].replace(/\s+/, ' ') ?? 'No grade');

export interface CountRow {
  label: string;
  labelTl?: string;
  count: number;
  pct: number;
}
const toRows = (m: Map<string, { n: number; tl?: string }>, total: number): CountRow[] =>
  [...m.entries()]
    .map(([label, v]) => ({ label, labelTl: v.tl, count: v.n, pct: total ? Math.round((v.n / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

export const inRange = (c: DisciplineCaseRecord, from: string, to: string) => {
  const d = day(c.incidentDate);
  return d >= from && d <= to;
};

/** Offense statistics: counts and percentages by type, level or grade for one period. */
export function offenseStats(cases: DisciplineCaseRecord[], from: string, to: string, group: GroupKind) {
  const list = cases.filter((c) => inRange(c, from, to));
  const m = new Map<string, { n: number; tl?: string }>();
  for (const c of list) {
    const key = group === 'type' ? c.offenseTitleEn || 'Not set' : group === 'level' ? levelOf(c.severity) : gradeOf(c.gradeSection);
    const cur = m.get(key) ?? { n: 0, tl: group === 'type' ? c.offenseTitleTl || undefined : undefined };
    cur.n++;
    m.set(key, cur);
  }
  return { total: list.length, rows: toRows(m, list.length) };
}

/** Cases per week (inside a month/week) or per month (inside a school year), for the bar chart. */
export function trend(cases: DisciplineCaseRecord[], kind: PeriodKind, from: string, to: string): { label: string; count: number }[] {
  const list = cases.filter((c) => day(c.incidentDate) >= from && day(c.incidentDate) <= to);
  if (kind === 'sy') {
    const out: { label: string; count: number }[] = [];
    const s = toDate(from);
    for (let i = 0; i < 12; i++) {
      const m = new Date(s.getFullYear(), s.getMonth() + i, 1);
      const key = `${m.getFullYear()}-${pad(m.getMonth() + 1)}`;
      out.push({ label: m.toLocaleString('en-US', { month: 'short' }), count: list.filter((c) => day(c.incidentDate).slice(0, 7) === key).length });
    }
    return out;
  }
  if (kind === 'week') {
    const out: { label: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = toDate(from);
      d.setDate(d.getDate() + i);
      out.push({ label: d.toLocaleString('en-US', { weekday: 'short' }), count: list.filter((c) => day(c.incidentDate) === iso(d)).length });
    }
    return out;
  }
  // month → weeks of the month
  const out: { label: string; count: number }[] = [];
  const start = toDate(from);
  const end = toDate(to);
  for (let w = 0; w < 6; w++) {
    const a = new Date(start);
    a.setDate(1 + w * 7);
    if (a > end) break;
    const b = new Date(a);
    b.setDate(a.getDate() + 6);
    const bEnd = b > end ? end : b;
    out.push({ label: `Wk ${w + 1}`, count: list.filter((c) => day(c.incidentDate) >= iso(a) && day(c.incidentDate) <= iso(bEnd)).length });
  }
  return out;
}

/** A case counts as "sanctioned" once a decision is in progress or done. */
const SANCTIONED = new Set(['Sanction In Progress', 'Resolved']);
export interface RepeatRow {
  studentNumber: string;
  studentName: string;
  gradeSection: string;
  offense: string;
  offenseTl: string;
  times: number;
  firstCase: string;
  lastCase: string;
  lastDate: string;
}
/** Recidivism: students who did the SAME offense again after an earlier case of it was sanctioned. */
export function recidivism(cases: DisciplineCaseRecord[]) {
  const byKey = new Map<string, DisciplineCaseRecord[]>();
  for (const c of cases) {
    const k = `${c.studentNumber}||${(c.offenseTitleEn || '').trim().toLowerCase()}`;
    const l = byKey.get(k);
    if (l) l.push(c);
    else byKey.set(k, [c]);
  }
  const rows: RepeatRow[] = [];
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => day(a.incidentDate).localeCompare(day(b.incidentDate)) || a.caseCode.localeCompare(b.caseCode));
    const firstSanctioned = list.findIndex((c) => SANCTIONED.has(c.status) || !!c.sanction);
    if (firstSanctioned < 0) continue;
    const after = list.slice(firstSanctioned + 1).filter((c) => day(c.incidentDate) >= day(list[firstSanctioned].incidentDate));
    if (!after.length) continue;
    const last = after[after.length - 1];
    rows.push({
      studentNumber: last.studentNumber,
      studentName: last.studentName,
      gradeSection: last.gradeSection,
      offense: last.offenseTitleEn,
      offenseTl: last.offenseTitleTl,
      times: list.length,
      firstCase: list[firstSanctioned].caseCode,
      lastCase: last.caseCode,
      lastDate: day(last.incidentDate),
    });
  }
  rows.sort((a, b) => b.times - a.times || b.lastDate.localeCompare(a.lastDate));
  const sanctionedStudents = new Set(cases.filter((c) => SANCTIONED.has(c.status) || !!c.sanction).map((c) => c.studentNumber));
  const repeaters = new Set(rows.map((r) => r.studentNumber));
  return {
    rows,
    sanctionedStudents: sanctionedStudents.size,
    repeaters: repeaters.size,
    rate: sanctionedStudents.size ? Math.round((repeaters.size / sanctionedStudents.size) * 1000) / 10 : 0,
  };
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  newCases: number;
  byLevel: CountRow[];
  byType: CountRow[];
  conferencesHeld: number;
  attended: number;
  didNotAttend: number;
  attendanceRate: number | null;
  noShowReasons: CountRow[];
  overdue: DisciplineCaseRecord[];
  closed: number;
  avgDaysToClose: number | null;
  fastestDays: number | null;
  slowestDays: number | null;
}
/** Automatic monthly report: offenses, parent attendance, reasons, overdue cases, time to close. */
export function monthlyReport(cases: DisciplineCaseRecord[], apts: ParentAppointmentItem[], month: string, todayISO: string, overdueDays: number = OVERDUE_DAYS): MonthlyReport {
  const [y, m] = month.split('-').map(Number);
  const from = iso(new Date(y, m - 1, 1));
  const to = iso(new Date(y, m, 0));
  const inMonth = cases.filter((c) => inRange(c, from, to));
  const lv = offenseStats(cases, from, to, 'level');
  const ty = offenseStats(cases, from, to, 'type');

  const monthApts = apts.filter((a) => a.date && a.date >= from && a.date <= to && a.status !== 'Rescheduled');
  const attended = monthApts.filter((a) => a.status === 'Attended').length;
  const missed = monthApts.filter((a) => a.status === 'Did Not Attend');
  const reasons = new Map<string, { n: number }>();
  for (const a of missed) {
    const r = (a.noShowReason || 'No reason given').trim();
    reasons.set(r, { n: (reasons.get(r)?.n ?? 0) + 1 });
  }

  // overdue = reported this month, still open after OVERDUE_DAYS (as of today)
  const overdue = inMonth
    .filter((c) => c.status !== 'Resolved' && daysBetween(day(c.incidentDate), todayISO) > overdueDays)
    .sort((a, b) => day(a.incidentDate).localeCompare(day(b.incidentDate)));

  // time to close = cases CLOSED this month: incident day → closed day
  const closedThisMonth = cases.filter((c) => c.status === 'Resolved' && c.closedAt && day(c.closedAt) >= from && day(c.closedAt) <= to);
  const durations = closedThisMonth.map((c) => Math.max(0, daysBetween(day(c.incidentDate), day(c.closedAt!))));
  return {
    month,
    newCases: inMonth.length,
    byLevel: lv.rows,
    byType: ty.rows.slice(0, 5),
    conferencesHeld: attended + missed.length,
    attended,
    didNotAttend: missed.length,
    attendanceRate: attended + missed.length ? Math.round((attended / (attended + missed.length)) * 100) : null,
    noShowReasons: toRows(reasons, missed.length),
    overdue,
    closed: closedThisMonth.length,
    avgDaysToClose: durations.length ? Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10 : null,
    fastestDays: durations.length ? Math.min(...durations) : null,
    slowestDays: durations.length ? Math.max(...durations) : null,
  };
}

/** The same plain words as the Cases board (Golden Rule 3: one word per thing). */
export const caseStatusWord = (st: string, tl: boolean): string =>
  ((tl
    ? { Open: 'Bago', 'Under Review': 'Sinusuri', 'Conference Scheduled': 'Kailangan ng conference', 'Sanction In Progress': 'May sanction', Resolved: 'Tapos na' }
    : { Open: 'New', 'Under Review': 'Reviewing', 'Conference Scheduled': 'Needs conference', 'Sanction In Progress': 'Serving sanction', Resolved: 'Done' }) as Record<string, string>)[st] ?? st;
export const attendanceWord = (st: string, tl: boolean): string =>
  ((tl
    ? { Attended: 'Dumalo', 'Did Not Attend': 'Hindi dumalo', Scheduled: 'Naka-schedule', Rescheduled: 'Inilipat' }
    : { Attended: 'Attended', 'Did Not Attend': 'Did not attend', Scheduled: 'Scheduled', Rescheduled: 'Moved' }) as Record<string, string>)[st] ?? st;

// ---------------------------------------------------------------------------
// Overview: the same numbers for several periods in a row, so the office sees if things go up or down.
export interface PeriodPoint {
  label: string;
  from: string;
  to: string;
  newCases: number;
  solved: number; // cases closed in the period
  attended: number;
  missed: number;
  attendanceRate: number | null;
  avgDaysToClose: number | null;
}
export function periodSeries(
  cases: DisciplineCaseRecord[],
  apts: ParentAppointmentItem[],
  unit: 'month' | 'week',
  count: number,
  ref: Date
): PeriodPoint[] {
  const out: PeriodPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const r = shiftRef(unit, ref, -i);
    const [from, to] = periodRange(unit, r);
    const fromD = toDate(from);
    const label =
      unit === 'month'
        ? fromD.toLocaleString('en-US', { month: 'short' })
        : `${fromD.toLocaleString('en-US', { month: 'short' })} ${fromD.getDate()}`;
    const newCases = cases.filter((c) => inRange(c, from, to)).length;
    const closed = cases.filter((c) => c.status === 'Resolved' && c.closedAt && day(c.closedAt) >= from && day(c.closedAt) <= to);
    const ap = apts.filter((a) => a.date && a.date >= from && a.date <= to);
    const attended = ap.filter((a) => a.status === 'Attended').length;
    const missed = ap.filter((a) => a.status === 'Did Not Attend').length;
    const durs = closed.map((c) => Math.max(0, daysBetween(day(c.incidentDate), day(c.closedAt!))));
    out.push({
      label,
      from,
      to,
      newCases,
      solved: closed.length,
      attended,
      missed,
      attendanceRate: attended + missed ? Math.round((attended / (attended + missed)) * 100) : null,
      avgDaysToClose: durs.length ? Math.round((durs.reduce((s, d) => s + d, 0) / durs.length) * 10) / 10 : null,
    });
  }
  return out;
}

export type Direction = 'up' | 'down' | 'same' | 'none';
/** change from the previous period; "none" when there is nothing to compare */
export function changeOf(curr: number | null, prev: number | null): { dir: Direction; diff: number; pct: number | null } {
  if (curr === null || prev === null) return { dir: 'none', diff: 0, pct: null };
  const diff = Math.round((curr - prev) * 10) / 10;
  return {
    dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
    diff,
    pct: prev === 0 ? null : Math.round((diff / prev) * 100),
  };
}
