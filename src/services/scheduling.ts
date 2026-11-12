// Smart Scheduling for parent conferences (flowchart page 5).
// Office days Mon–Fri, 45-minute slots from 8:00 AM to 4:00 PM, no lunch slot,
// never two conferences at the same time, parent's preferred days/time first.
import type { ParentAppointmentItem } from '../data/dashboardMockData';
import { localISODate } from '../data/dashboardMockData';

// These follow Settings › Office days & hours (configureSchedule). Defaults = the old fixed values.
export let SLOT_MINUTES = 45;
/** start times in minutes after midnight */
export let SLOT_STARTS: number[] = [8 * 60, 8 * 60 + 45, 9 * 60 + 30, 10 * 60 + 15, 11 * 60, 13 * 60, 13 * 60 + 45, 14 * 60 + 30, 15 * 60 + 15];
export const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export let OFFICE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
let CLOSED_DAYS = new Set<string>();

const toMin = (hhmm: string, fallback: number) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback;
};
/** Build the conference time slots from the office hours (no slot overlaps lunch, last slot ends by closing). */
export function buildSlots(o: { start: string; end: string; lunchStart: string; lunchEnd: string; slotMinutes: number }): number[] {
  const len = Math.max(15, Math.min(180, Number(o.slotMinutes) || 45));
  const start = toMin(o.start, 480);
  const end = toMin(o.end, 960);
  const ls = toMin(o.lunchStart, -1);
  const le = toMin(o.lunchEnd, -1);
  const out: number[] = [];
  for (let t = start; t + len <= end && out.length < 48; ) {
    if (ls >= 0 && le > ls && t < le && t + len > ls) {
      t = le; // jump over lunch
      continue;
    }
    out.push(t);
    t += len;
  }
  return out;
}
export function configureSchedule(
  o: { days: string[]; start: string; end: string; lunchStart: string; lunchEnd: string; slotMinutes: number },
  closedDays: string[]
) {
  const slots = buildSlots(o);
  if (slots.length) {
    SLOT_STARTS = slots;
    SLOT_MINUTES = Math.max(15, Math.min(180, Number(o.slotMinutes) || 45));
  }
  if (Array.isArray(o.days) && o.days.length) OFFICE_DAYS = o.days.slice();
  CLOSED_DAYS = new Set(closedDays);
}

const pad = (n: number) => String(n).padStart(2, '0');
export const fmtClock = (min: number): string => {
  const h = Math.floor(min / 60), m = min % 60;
  const h12 = ((h + 11) % 12) + 1;
  return `${pad(h12)}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
};
/** "09:30 AM – 10:15 AM" (same format the app already stores) */
export const slotLabel = (start: number): string => `${fmtClock(start)} – ${fmtClock(start + SLOT_MINUTES)}`;

/** Start minute of a stored time slot ("09:30 AM – 10:15 AM"); walk-ins and unknown text sort last */
export function slotStart(timeSlot: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(timeSlot.trim());
  if (!m) return 24 * 60;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
}

export const parseISO = (iso: string): Date => new Date(iso + 'T00:00:00');
export const addDays = (iso: string, n: number): string => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return localISODate(d);
};
export const dayKey = (iso: string): string => DAY_KEYS[parseISO(iso).getDay()];
export const isOfficeDay = (iso: string): boolean => OFFICE_DAYS.includes(dayKey(iso)) && !CLOSED_DAYS.has(iso);
/** a school-closed day from Settings (holiday / no classes) */
export const isClosedDay = (iso: string): boolean => CLOSED_DAYS.has(iso);
export const todayISO = (): string => localISODate();

/** Conferences that still hold a time slot (cancelled/rescheduled ones free it) */
const holdsSlot = (a: ParentAppointmentItem) => a.status === 'Scheduled' || a.status === 'Attended';

export function isTaken(appointments: ParentAppointmentItem[], date: string, start: number, ignoreId?: string): boolean {
  return appointments.some((a) => a.id !== ignoreId && a.date === date && holdsSlot(a) && slotStart(a.timeSlot) === start);
}

export interface SlotSuggestion {
  date: string;
  start: number;
  label: string;
  preferred: boolean;
}

/**
 * Free slots from `fromISO` for `days` office days. Preferred days/time come first,
 * then the earliest. Past times today are skipped.
 */
export function suggestSlots(
  appointments: ParentAppointmentItem[],
  opts: { fromISO?: string; days?: number; prefDays?: string; prefTime?: string; ignoreId?: string; limit?: number } = {}
): SlotSuggestion[] {
  const from = opts.fromISO ?? todayISO();
  const pref = (opts.prefDays || '').split(',').map((s) => s.trim()).filter(Boolean);
  const prefTime = (opts.prefTime || '').toUpperCase();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const out: SlotSuggestion[] = [];
  let date = from, officeDaysSeen = 0, guard = 0;
  while (officeDaysSeen < (opts.days ?? 10) && guard++ < 40) {
    if (isOfficeDay(date)) {
      officeDaysSeen++;
      for (const start of SLOT_STARTS) {
        if (date === todayISO() && start <= nowMin + 30) continue; // at least 30 min from now
        if (isTaken(appointments, date, start, opts.ignoreId)) continue;
        const dayOk = pref.length === 0 || pref.includes(dayKey(date));
        const timeOk = !prefTime || (prefTime === 'AM' ? start < 12 * 60 : start >= 12 * 60);
        out.push({ date, start, label: slotLabel(start), preferred: pref.length > 0 || !!prefTime ? dayOk && timeOk : false });
      }
    }
    date = addDays(date, 1);
  }
  const sorted = out.sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.date.localeCompare(b.date) || a.start - b.start);
  return sorted.slice(0, opts.limit ?? 6);
}

/** Free slots on one day (for the manual time picker) */
export function freeSlotsOn(appointments: ParentAppointmentItem[], date: string, ignoreId?: string): number[] {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return SLOT_STARTS.filter(
    (s) => !(date === todayISO() && s <= nowMin + 30) && !isTaken(appointments, date, s, ignoreId)
  );
}

/** Sort conferences by day then time */
export const byDateTime = (a: ParentAppointmentItem, b: ParentAppointmentItem) =>
  a.date.localeCompare(b.date) || slotStart(a.timeSlot) - slotStart(b.timeSlot);
