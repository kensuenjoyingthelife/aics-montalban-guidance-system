// The office's own settings (features flowchart page 17), loaded once and shared by every screen.
// Defaults = how the app worked before Settings existed, so nothing changes until the office edits them.
import { useSyncExternalStore } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DB_WRITE_FAILED, DB_WRITE_OK, actorHeader } from './supabaseClient';
import { OFFENSE_HANDBOOK_RULES, type OffenseHandbookRule, type HandbookClassification } from '../data/stage3MockData';
import { configureSchedule } from './scheduling';

export interface OfficeHours {
  days: string[]; // Mon..Sun keys
  start: string; // "08:00"
  end: string; // "16:00"
  lunchStart: string;
  lunchEnd: string;
  slotMinutes: number;
}
export interface CaseRules {
  escalateAfterMinors: number; // minors in a row that count as Serious (manuscript: 2)
  overdueDays: number; // open longer than this = overdue
  pendingSanctionDays: number; // a sanction waiting for the parent longer than this = alert
}
export interface SecuritySettings {
  autoSignOutMinutes: number;
  pinMaxTries: number;
  pinLockMinutes: number;
}
export interface SmsTemplates {
  notice: string;
  reminder: string;
  reschedule: string;
}
export interface ClosedDay {
  id: number;
  day: string;
  reason: string;
}
export interface PersonSchedule {
  id: number;
  role: string;
  name: string;
  days: string[];
  start: string;
  end: string;
  note: string;
}
export interface StaffAccount {
  id: number;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
}
/** Settings › Student fields: what "Add student" asks for */
export type CoreField = 'studentNumber' | 'fullName' | 'grade' | 'section' | 'parentName' | 'parentPhone' | 'parentEmail' | 'parentRelationship';
export interface CustomField {
  key: string; // stable id saved inside students.extra
  labelEn: string;
  labelTl: string;
  type: 'text' | 'number' | 'date' | 'choice';
  options: string[]; // for "choice"
  required: boolean;
  active: boolean;
}
export interface StudentFields {
  labels: Partial<Record<CoreField, { en: string; tl: string }>>;
  showEmail: boolean;
  showRelationship: boolean;
  custom: CustomField[];
}
export const CORE_FIELD_WORDS: Record<CoreField, [string, string]> = {
  studentNumber: ['Student no. / LRN', 'Student no. / LRN'],
  fullName: ['Full name', 'Buong pangalan'],
  grade: ['Grade', 'Grade'],
  section: ['Section', 'Section'],
  parentName: ['Parent / guardian name', 'Pangalan ng magulang / guardian'],
  parentPhone: ['Parent mobile (for SMS)', 'Mobile ng magulang (para sa SMS)'],
  parentEmail: ['Parent email', 'Email ng magulang'],
  parentRelationship: ['Relationship', 'Relasyon sa estudyante'],
};
/** the label the office chose, or the default */
export const fieldLabel = (f: StudentFields, k: CoreField, tl: boolean): string => {
  const c = f.labels?.[k];
  const v = c ? (tl ? c.tl : c.en) : '';
  return v && v.trim() ? v : CORE_FIELD_WORDS[k][tl ? 1 : 0];
};

export interface OffenseRow extends OffenseHandbookRule {
  id: number;
  active: boolean;
  sortOrder: number;
}

export interface AppConfig {
  loaded: boolean;
  officeHours: OfficeHours;
  caseRules: CaseRules;
  security: SecuritySettings;
  smsTemplates: SmsTemplates;
  retention: { idImageDays: number };
  counselorDays: string[];
  closedDays: ClosedDay[];
  people: PersonSchedule[];
  offenses: OffenseRow[]; // all, including removed
  staff: StaffAccount[];
  pin: { salt: string; hash: string } | null;
  studentFields: StudentFields;
}

export const DEFAULTS: AppConfig = {
  loaded: false,
  officeHours: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '08:00', end: '16:00', lunchStart: '11:45', lunchEnd: '13:00', slotMinutes: 45 },
  caseRules: { escalateAfterMinors: 2, overdueDays: 14, pendingSanctionDays: 3 },
  security: { autoSignOutMinutes: 15, pinMaxTries: 5, pinLockMinutes: 5 },
  smsTemplates: {
    notice: 'AICS Guidance Office: Magandang araw po. Inaanyayahan po kayo sa pag-uusap tungkol kay {student} sa {when}. Salamat po.',
    reminder: 'AICS Guidance Office: Paalala po, bukas {when} ang ating pag-uusap tungkol kay {student}. Salamat po.',
    reschedule: 'AICS Guidance Office: Inilipat po sa {when} ang ating pag-uusap tungkol kay {student}. Salamat po.',
  },
  retention: { idImageDays: 30 },
  counselorDays: ['Tue', 'Thu'],
  closedDays: [],
  people: [],
  offenses: OFFENSE_HANDBOOK_RULES.map((r, i) => ({ ...r, id: -1 - i, active: true, sortOrder: i + 1 })),
  staff: [],
  pin: null,
  studentFields: { labels: {}, showEmail: true, showRelationship: true, custom: [] },
};

// ---------- tiny store ----------
let state: AppConfig = DEFAULTS;
const listeners = new Set<() => void>();
const set = (patch: Partial<AppConfig>) => {
  state = { ...state, ...patch };
  if (patch.officeHours || patch.closedDays) configureSchedule(state.officeHours, state.closedDays.map((d) => d.day));
  listeners.forEach((l) => l());
};
export const getAppConfig = () => state;
export function useAppConfig(): AppConfig {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state
  );
}
/** the active handbook rules, in the office's order */
export const activeOffenses = (c: AppConfig = state): OffenseRow[] => c.offenses.filter((o) => o.active).sort((a, b) => a.sortOrder - b.sortOrder);

// ---------- network ----------
const headers = (ret = false): HeadersInit => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  ...actorHeader(),
  ...(ret ? { Prefer: 'return=representation' } : {}),
});
function report(res: Response | null, what: string): boolean {
  const ok = !!res && res.ok;
  try {
    window.dispatchEvent(new CustomEvent(ok ? DB_WRITE_OK : DB_WRITE_FAILED, { detail: { what, status: res?.status ?? 0 } }));
  } catch {
    /* no window */
  }
  return ok;
}
async function getJson<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers() });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}
const s = (v: unknown) => (v == null ? '' : String(v));
const toOffense = (r: Record<string, unknown>): OffenseRow => {
  const cls = (s(r.classification) || (s(r.category) === 'Minor' ? 'Minor' : 'Serious')) as HandbookClassification;
  return {
    id: Number(r.id),
    policyCode: s(r.policy_code),
    titleEn: s(r.title_en),
    titleTl: s(r.title_tl) || s(r.title_en),
    classification: cls,
    dbCategory: cls === 'Minor' ? 'Minor' : 'Major',
    sanction1stEn: s(r.sanction_1st),
    sanction1stTl: s(r.sanction_1st_tl) || s(r.sanction_1st),
    sanction2ndEn: s(r.sanction_2nd),
    sanction2ndTl: s(r.sanction_2nd_tl) || s(r.sanction_2nd),
    sanction3rdEn: s(r.sanction_3rd),
    sanction3rdTl: s(r.sanction_3rd_tl) || s(r.sanction_3rd),
    active: r.is_active !== false,
    sortOrder: Number(r.sort_order ?? 0),
  };
};

/** Loads every setting. Missing pieces keep their defaults (the app still works offline). */
export async function loadAppConfig(): Promise<boolean> {
  const [rows, closed, people, offenses, staff] = await Promise.all([
    getJson<{ key: string; value: unknown }[]>('app_settings?select=key,value'),
    getJson<Record<string, unknown>[]>('school_closed_days?select=*&order=day.asc&limit=1000'),
    getJson<Record<string, unknown>[]>('people_schedules?select=*&order=id.asc&limit=500'),
    getJson<Record<string, unknown>[]>('offense_policies?select=*&order=sort_order.asc,id.asc&limit=1000'),
    getJson<Record<string, unknown>[]>('guidance_staff?select=*&order=id.asc&limit=200'),
  ]);
  const kv = new Map((rows ?? []).map((r) => [r.key, r.value as Record<string, unknown>]));
  const merge = <T,>(def: T, v: unknown): T => (v && typeof v === 'object' && !Array.isArray(v) ? { ...def, ...(v as object) } : def);
  set({
    loaded: !!rows,
    officeHours: merge(DEFAULTS.officeHours, kv.get('office_hours')),
    caseRules: merge(DEFAULTS.caseRules, kv.get('case_rules')),
    security: merge(DEFAULTS.security, kv.get('security')),
    smsTemplates: merge(DEFAULTS.smsTemplates, kv.get('sms_templates')),
    retention: merge(DEFAULTS.retention, kv.get('retention')),
    counselorDays: Array.isArray(kv.get('counselor_days')) ? (kv.get('counselor_days') as unknown as string[]) : DEFAULTS.counselorDays,
    pin: (kv.get('app_pin') as { salt: string; hash: string } | undefined) ?? null,
    studentFields: merge(DEFAULTS.studentFields, kv.get('student_fields')),
    closedDays: (closed ?? []).map((r) => ({ id: Number(r.id), day: s(r.day).slice(0, 10), reason: s(r.reason) })),
    people: (people ?? []).map((r) => ({ id: Number(r.id), role: s(r.role), name: s(r.name), days: (r.days as string[]) ?? [], start: s(r.start_time), end: s(r.end_time), note: s(r.note) })),
    offenses: offenses && offenses.length ? offenses.map(toOffense) : DEFAULTS.offenses,
    staff: (staff ?? []).map((r) => ({ id: Number(r.id), email: s(r.email), fullName: s(r.full_name), role: s(r.role), active: r.is_active !== false })),
  });
  return !!rows;
}

/** Save one settings key (JSON). Updates the screen only when the database said OK. */
export async function saveConfig(key: 'office_hours' | 'case_rules' | 'security' | 'sms_templates' | 'retention' | 'counselor_days' | 'app_pin' | 'student_fields', value: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`, {
      method: 'POST',
      headers: { ...(headers() as Record<string, string>), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    });
    if (!report(res, 'saveConfig')) return false;
  } catch {
    return report(null, 'saveConfig');
  }
  const map: Record<string, keyof AppConfig> = {
    office_hours: 'officeHours',
    case_rules: 'caseRules',
    security: 'security',
    sms_templates: 'smsTemplates',
    retention: 'retention',
    counselor_days: 'counselorDays',
    app_pin: 'pin',
    student_fields: 'studentFields',
  };
  set({ [map[key]]: value } as Partial<AppConfig>);
  return true;
}

/** Generic row writes for the list tables. Returns the saved row (or true for delete), null on failure. */
export async function writeRow(
  table: 'school_closed_days' | 'people_schedules' | 'offense_policies' | 'guidance_staff',
  method: 'POST' | 'PATCH' | 'DELETE',
  body: Record<string, unknown> | null,
  id?: number
): Promise<Record<string, unknown> | true | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${id != null ? `?id=eq.${id}` : ''}`, {
      method,
      headers: headers(method !== 'DELETE'),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!report(res, `${method} ${table}`)) return null;
    if (method === 'DELETE') return true;
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows[0] ?? true;
  } catch {
    report(null, `${method} ${table}`);
    return null;
  }
}
/** after a list write, reload just the lists (cheap) so every screen sees the change */
export async function refreshLists(): Promise<void> {
  await loadAppConfig();
}

// ---------- PIN ----------
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** true when the 6-digit PIN matches the saved hash (falls back to the old default if not loaded) */
export async function checkPin(pin: string): Promise<boolean> {
  const p = state.pin;
  if (!p) return pin === '123456';
  return (await sha256Hex(p.salt + pin)) === p.hash;
}
export async function makePinRecord(pin: string): Promise<{ salt: string; hash: string }> {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const salt = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { salt, hash: await sha256Hex(salt + pin) };
}
/** fill {student} and {when} */
export const fillTemplate = (tpl: string, student: string, when: string) => tpl.replace(/\{student\}/g, student).replace(/\{when\}/g, when);
