// Who belongs in the Counselor Referral Queue, and in what order (features flowchart page 10).
// "Severe or repeated cases, ordered by priority." Pure functions — no React, no network.
import type { DisciplineCaseRecord } from '../data/stage3MockData';
import type { ParentAppointmentItem } from '../data/dashboardMockData';

export type ReferralStatus = 'Waiting' | 'Scheduled' | 'Seen' | 'Removed';

export interface ReferralRow {
  id: number;
  studentNumber: string;
  studentName: string;
  status: ReferralStatus;
  scheduledDate: string;
  seenAt: string;
  addedManually: boolean;
  manualReason: string;
  removedReason: string;
  createdAt: string;
  updatedAt: string;
}

export type ReasonKey = 'grave' | 'serious' | 'escalated' | 'repeat' | 'missed' | 'manual';
export interface Reason {
  key: ReasonKey;
  en: string;
  tl: string;
}

export interface QueueItem {
  studentNumber: string;
  studentName: string;
  gradeSection: string;
  /** cases that are not closed yet */
  openCases: DisciplineCaseRecord[];
  totalCases: number;
  missedConferences: number;
  reasons: Reason[];
  score: number;
  /** days since the oldest open case */
  waitingDays: number;
  status: ReferralStatus;
  /** the latest saved row for this student (undefined = never acted on) */
  row?: ReferralRow;
}

const CLOSED = new Set(['Resolved', 'Closed']);
export const isGrave = (sev: string) => /grave/i.test(sev);
export const isEscalated = (sev: string) => /consecutive|→\s*serious|escalat/i.test(sev);
/** Serious, Major or escalated — but not "Less Serious" */
export const isSerious = (sev: string) =>
  isEscalated(sev) || (/(serious|major)/i.test(sev) && !/less serious/i.test(sev) && !/next is major/i.test(sev));

const daysBetween = (fromISO: string, to: Date) => {
  const d = new Date(fromISO.slice(0, 10) + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? 0 : Math.max(0, Math.floor((to.getTime() - d.getTime()) / 86400000));
};

/** marks a row that was created and then undone — it counts as if it never existed */
export const UNDONE = '__undone__';

/** Latest row per student (undone rows are ignored) */
export function latestRows(rows: ReferralRow[]): Map<string, ReferralRow> {
  const m = new Map<string, ReferralRow>();
  for (const r of rows) {
    if (r.status === 'Removed' && r.removedReason === UNDONE) continue;
    const cur = m.get(r.studentNumber);
    if (!cur || r.id > cur.id) m.set(r.studentNumber, r);
  }
  return m;
}

export function buildQueue(
  cases: DisciplineCaseRecord[],
  appointments: ParentAppointmentItem[],
  rows: ReferralRow[],
  now: Date = new Date()
): QueueItem[] {
  const byStudent = new Map<string, DisciplineCaseRecord[]>();
  for (const c of cases) {
    const list = byStudent.get(c.studentNumber);
    if (list) list.push(c);
    else byStudent.set(c.studentNumber, [c]);
  }
  const missedByCase = new Map<string, number>();
  for (const a of appointments) if (a.status === 'Did Not Attend') missedByCase.set(a.caseId, (missedByCase.get(a.caseId) ?? 0) + 1);
  const latest = latestRows(rows);

  const out: QueueItem[] = [];
  const seen = new Set<string>();
  for (const [studentNumber, all] of byStudent) {
    seen.add(studentNumber);
    const open = all.filter((c) => !CLOSED.has(c.status));
    const row = latest.get(studentNumber);
    const manualActive = !!row && row.addedManually && (row.status === 'Waiting' || row.status === 'Scheduled');
    if (open.length === 0 && !manualActive) continue;

    const reasons: Reason[] = [];
    let score = 0;
    if (open.some((c) => isGrave(c.severity))) {
      reasons.push({ key: 'grave', en: 'Grave offense', tl: 'Grave na offense' });
      score += 100;
    } else if (open.some((c) => isEscalated(c.severity))) {
      reasons.push({ key: 'escalated', en: 'Minor offenses in a row → Serious', tl: 'Sunod-sunod na minor → Serious' });
      score += 70;
    } else if (open.some((c) => isSerious(c.severity))) {
      reasons.push({ key: 'serious', en: 'Serious offense', tl: 'Serious na offense' });
      score += 70;
    }
    if (all.length >= 2) {
      reasons.push({ key: 'repeat', en: `Repeated: ${all.length} cases in total`, tl: `Paulit-ulit: ${all.length} kaso lahat` });
      score += 10 * Math.min(all.length - 1, 5);
    }
    const missed = all.reduce((n, c) => n + (missedByCase.get(c.caseCode) ?? 0), 0);
    if (missed >= 2) {
      reasons.push({ key: 'missed', en: `Parent missed ${missed} conferences`, tl: `${missed}x hindi dumalo ang magulang` });
      score += 20;
    }
    if (manualActive) {
      reasons.push({ key: 'manual', en: `Added by the office${row!.manualReason ? `: ${row!.manualReason}` : ''}`, tl: `Idinagdag ng office${row!.manualReason ? `: ${row!.manualReason}` : ''}` });
      score += 15;
    }
    if (reasons.length === 0) continue; // not severe, not repeated → not for the counselor

    const oldest = open.length ? open.reduce((a, c) => (c.incidentDate < a ? c.incidentDate : a), open[0].incidentDate) : '';
    const waitingDays = oldest ? daysBetween(oldest, now) : 0;
    score += Math.min(waitingDays, 20);

    // status: a finished/removed referral comes back only when a NEW case was reported after it
    let status: ReferralStatus = 'Waiting';
    if (row) {
      if (row.status === 'Waiting' || row.status === 'Scheduled') status = row.status;
      else {
        const doneDay = (row.updatedAt || row.createdAt).slice(0, 10);
        const newer = open.some((c) => c.incidentDate.slice(0, 10) > doneDay);
        status = newer ? 'Waiting' : row.status;
      }
    }
    const first = all[0];
    out.push({
      studentNumber,
      studentName: first.studentName,
      gradeSection: first.gradeSection,
      openCases: open,
      totalCases: all.length,
      missedConferences: missed,
      reasons,
      score,
      waitingDays,
      status,
      row,
    });
  }

  // manual referrals for students without any case
  for (const [studentNumber, row] of latest) {
    if (seen.has(studentNumber) || !row.addedManually || (row.status !== 'Waiting' && row.status !== 'Scheduled')) continue;
    out.push({
      studentNumber,
      studentName: row.studentName,
      gradeSection: '',
      openCases: [],
      totalCases: 0,
      missedConferences: 0,
      reasons: [{ key: 'manual', en: `Added by the office${row.manualReason ? `: ${row.manualReason}` : ''}`, tl: `Idinagdag ng office${row.manualReason ? `: ${row.manualReason}` : ''}` }],
      score: 15,
      waitingDays: daysBetween(row.createdAt, now),
      status: row.status,
      row,
    });
  }

  return out.sort((a, b) => b.score - a.score || b.waitingDays - a.waitingDays || a.studentName.localeCompare(b.studentName));
}

/** Next counselor day on or after `fromISO` (days like ['Tue','Thu']) */
export function nextCounselorDays(fromISO: string, days: string[], count = 6): string[] {
  const keys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const out: string[] = [];
  if (!days.length) return out;
  const d = new Date(fromISO + 'T00:00:00');
  for (let i = 0; i < 60 && out.length < count; i++) {
    const k = keys[d.getDay()];
    if (days.includes(k)) out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}
