// Audit Trail (features flowchart page 16) — read only. The database writes these rows by itself
// (trigger on every office table); the app can only read them, never change or delete them.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';

export type AuditAction = 'insert' | 'update' | 'delete';
export interface AuditEntry {
  id: number;
  table: string;
  rowKey: string;
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  at: string;
  actor: string;
}
export interface AuditQuery {
  table?: string; // '' = all
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD (inclusive)
  search?: string; // student no., case code, name…
  page: number; // 0-based
  pageSize: number;
}

const headers = (): Record<string, string> => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Prefer: 'count=exact',
});

/** One page of history, newest first, with the total count (filters run in the database). */
export async function fetchAuditPage(q: AuditQuery): Promise<{ rows: AuditEntry[]; total: number } | null> {
  const params = new URLSearchParams({ select: '*', order: 'id.desc', limit: String(q.pageSize), offset: String(q.page * q.pageSize) });
  const extra: string[] = [];
  if (q.table) extra.push(`table_name=eq.${encodeURIComponent(q.table)}`);
  if (q.from) extra.push(`changed_at=gte.${encodeURIComponent(new Date(q.from + 'T00:00:00').toISOString())}`);
  if (q.to) {
    const end = new Date(q.to + 'T00:00:00');
    end.setDate(end.getDate() + 1);
    extra.push(`changed_at=lt.${encodeURIComponent(end.toISOString())}`);
  }
  const term = (q.search || '').trim().replace(/[*,()]/g, ' ').trim();
  if (term) {
    // key, or any name inside the old/new values
    const t = encodeURIComponent(`*${term}*`);
    extra.push(`or=(row_key.ilike.${t},after->>student_name.ilike.${t},before->>student_name.ilike.${t},after->>full_name.ilike.${t},before->>full_name.ilike.${t})`);
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_changes?${params.toString()}${extra.length ? '&' + extra.join('&') : ''}`, { headers: headers() });
    if (!res.ok) return null;
    const total = Number((res.headers.get('content-range') || '*/0').split('/')[1]) || 0;
    const rows = ((await res.json()) as Record<string, unknown>[]).map((r) => ({
      id: Number(r.id),
      table: String(r.table_name ?? ''),
      rowKey: String(r.row_key ?? ''),
      action: String(r.action ?? 'update') as AuditAction,
      before: (r.before as Record<string, unknown>) ?? null,
      after: (r.after as Record<string, unknown>) ?? null,
      at: String(r.changed_at ?? ''),
      actor: String(r.actor ?? ''),
    }));
    return { rows, total };
  } catch {
    return null;
  }
}

// ---------- plain words for the screen ----------
export const TABLE_WORDS: Record<string, [string, string]> = {
  students: ['Student', 'Estudyante'],
  discipline_cases: ['Case', 'Kaso'],
  parent_appointments: ['Conference', 'Conference'],
  follow_up_tasks: ['Follow-up', 'Follow-up'],
  student_concerns: ['Concern', 'Concern'],
  portal_accounts: ['Student account', 'Account ng estudyante'],
  counselor_referrals: ['Counselor list', 'Listahan ng counselor'],
  app_settings: ['Setting', 'Setting'],
  confiscated_ids: ['ID hold', 'ID hold'],
  contact_logs: ['Call / contact', 'Tawag / contact'],
  shs_sections: ['Section', 'Section'],
};

const FIELD_WORDS: Record<string, [string, string]> = {
  full_name: ['Name', 'Pangalan'],
  student_name: ['Student', 'Estudyante'],
  student_number: ['Student no.', 'Student no.'],
  grade_section: ['Grade & section', 'Grade at section'],
  section_code: ['Section', 'Section'],
  parent_name: ['Parent', 'Magulang'],
  parent_phone: ['Parent mobile', 'Mobile ng magulang'],
  parent_email: ['Parent email', 'Email ng magulang'],
  parent_relationship: ['Relationship', 'Relasyon'],
  minor_offense_count: ['Minor offenses', 'Minor na offense'],
  major_offense_count: ['Serious offenses', 'Serious na offense'],
  prior_offenses_en: ['Offense history', 'History ng offense'],
  parent_pref_days: ['Parent best days', 'Pinakamagandang araw ng magulang'],
  parent_pref_time: ['Parent best time', 'Pinakamagandang oras ng magulang'],
  status: ['Status', 'Status'],
  severity: ['Level', 'Antas'],
  offense_title_en: ['Offense', 'Offense'],
  reported_by: ['Reported by', 'Nag-report'],
  incident_date: ['Incident date', 'Petsa ng insidente'],
  notes: ['Notes', 'Tala'],
  step: ['Step', 'Hakbang'],
  explanation: ['Explanation', 'Paliwanag'],
  decision: ['Decision', 'Desisyon'],
  sanction: ['Sanction', 'Sanction'],
  appointment_date: ['Date', 'Petsa'],
  time_slot: ['Time', 'Oras'],
  no_show_reason: ['Reason', 'Dahilan'],
  notice_received: ['Parent knows', 'Alam ng magulang'],
  rescheduled_from: ['Moved from', 'Inilipat mula'],
  attempts_count: ['Tries', 'Subok'],
  resolved: ['Done', 'Tapos'],
  category: ['Type', 'Uri'],
  concern_type: ['Type', 'Uri'],
  reject_reason: ['Reason given', 'Ibinigay na dahilan'],
  linked_case_code: ['Linked case', 'Naka-link na kaso'],
  chat_status: ['Chat', 'Chat'],
  scheduled_date: ['Counselor date', 'Petsa sa counselor'],
  removed_reason: ['Reason', 'Dahilan'],
  manual_reason: ['Reason', 'Dahilan'],
  value: ['Value', 'Halaga'],
  reason: ['Reason', 'Dahilan'],
  method: ['How', 'Paano'],
  result: ['Result', 'Resulta'],
  note: ['Note', 'Tala'],
  deactivated_reason: ['Reason', 'Dahilan'],
};
/** never shown: technical or duplicated fields */
const HIDDEN = new Set([
  'id', 'created_at', 'updated_at', 'initials', 'prior_offenses_tl', 'offense_title_tl', 'summary_tl', 'summary_en',
  'clearance_status', 'is_practice', 'account_id', 'seen_at', 'decided_at', 'closed_at', 'reviewed_at', 'chat_closed_at',
  'deactivated_at', 'reminder_sent_at', 'student_called_at', 'parent_notified_at', 'total_students', 'cleared_students',
  'clearance_percent', 'open_cases_count', 'watch_count', 'tone',
]);

export const fieldWord = (k: string, tl: boolean) => (FIELD_WORDS[k] ? FIELD_WORDS[k][tl ? 1 : 0] : k.replace(/_/g, ' '));
export function showValue(v: unknown, tl: boolean): string {
  if (v === null || v === undefined || v === '') return tl ? '(wala)' : '(empty)';
  if (typeof v === 'boolean') return v ? (tl ? 'Oo' : 'Yes') : tl ? 'Hindi' : 'No';
  if (Array.isArray(v)) return v.join(', ') || (tl ? '(wala)' : '(empty)');
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(v + 'T00:00:00');
    if (!Number.isNaN(d.getTime())) return new Intl.DateTimeFormat(tl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  }
  return String(v);
}

/** Only the fields that changed (update), or the main fields (insert / delete). */
export function changedFields(e: AuditEntry): { key: string; before?: unknown; after?: unknown }[] {
  if (e.action === 'update' && e.before && e.after) {
    return Object.keys(e.after)
      .filter((k) => !HIDDEN.has(k) && JSON.stringify(e.before![k]) !== JSON.stringify(e.after![k]))
      .map((k) => ({ key: k, before: e.before![k], after: e.after![k] }));
  }
  const row = (e.after ?? e.before) || {};
  return Object.keys(row)
    .filter((k) => !HIDDEN.has(k) && row[k] !== null && row[k] !== '' && row[k] !== false)
    .slice(0, 8)
    .map((k) => (e.action === 'insert' ? { key: k, after: row[k] } : { key: k, before: row[k] }));
}

const SETTING_WORDS: Record<string, [string, string]> = {
  counselor_days: ['Counselor days', 'Araw ng counselor'],
};
/** the row's key in plain words (setting names, not code names) */
export function keyWord(e: AuditEntry, tl: boolean): string {
  if (e.table === 'app_settings' && SETTING_WORDS[e.rowKey]) return SETTING_WORDS[e.rowKey][tl ? 1 : 0];
  if (e.table === 'portal_accounts' || e.table === 'contact_logs') return '';
  return e.rowKey;
}

/** "Mateo R. Villanueva" or the key, for the title of a row */
export function whoOf(e: AuditEntry): string {
  const r = (e.after ?? e.before) || {};
  return String(r.student_name || r.full_name || r.parent_name || '') || '';
}
