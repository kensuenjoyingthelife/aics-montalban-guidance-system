// Concerns (page 11) + Concern Chats (page 12) — database access.
// Honest: every write reports success/failure (sync chip + error banner).
import { SUPABASE_URL, SUPABASE_ANON_KEY, DB_WRITE_FAILED, DB_WRITE_OK, actorHeader } from './supabaseClient';

export type ConcernStatus = 'Pending' | 'Approved' | 'Rejected' | string;
export type ChatStatus = 'None' | 'Open' | 'Closed';

export interface ConcernItem {
  id: number;
  code: string;
  studentName: string;
  gradeSection: string;
  studentNumber: string;
  accountId: number | null;
  submittedBy: string;
  type: string;
  summary: string;
  whatHappened: string;
  when: string;
  where: string;
  who: string;
  witnesses: string;
  confidential: boolean;
  urgent: boolean;
  truthful: boolean;
  status: ConcernStatus;
  rejectReason: string;
  reviewedAt: string;
  linkedCaseCode: string;
  chatStatus: ChatStatus;
  chatClosedAt: string;
  createdAt: string;
  practice: boolean;
}
export interface ConcernMessage {
  id: number;
  concernId: number;
  sender: 'office' | 'student';
  body: string;
  createdAt: string;
}
export interface PortalAccount {
  id: number;
  studentNumber: string;
  fullName: string;
  email: string;
  status: string;
  deactivatedReason: string;
  practice: boolean;
}

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
const s = (v: unknown) => (v == null ? '' : String(v));

const toConcern = (r: Record<string, unknown>): ConcernItem => ({
  id: Number(r.id),
  code: s(r.referral_code),
  studentName: s(r.student_name),
  gradeSection: s(r.grade_section),
  studentNumber: s(r.student_number),
  accountId: r.account_id == null ? null : Number(r.account_id),
  submittedBy: s(r.submitted_by),
  type: s(r.concern_type) || s(r.category),
  summary: s(r.summary_en),
  whatHappened: s(r.what_happened) || s(r.summary_en),
  when: s(r.happened_when),
  where: s(r.happened_where),
  who: s(r.who_involved),
  witnesses: s(r.witnesses),
  confidential: !!r.is_confidential,
  urgent: !!r.is_urgent,
  truthful: !!r.truthful,
  status: s(r.status) || 'Pending',
  rejectReason: s(r.reject_reason),
  reviewedAt: s(r.reviewed_at),
  linkedCaseCode: s(r.linked_case_code),
  chatStatus: (s(r.chat_status) || 'None') as ChatStatus,
  chatClosedAt: s(r.chat_closed_at),
  createdAt: s(r.created_at),
  practice: !!r.is_practice,
});
const toMsg = (r: Record<string, unknown>): ConcernMessage => ({
  id: Number(r.id),
  concernId: Number(r.concern_id),
  sender: s(r.sender) === 'student' ? 'student' : 'office',
  body: s(r.body),
  createdAt: s(r.created_at),
});

/** Every concern, fetched 1000 at a time (the server returns at most 1000 per request). */
export async function fetchConcerns(): Promise<ConcernItem[] | null> {
  const BATCH = 1000;
  const out: ConcernItem[] = [];
  try {
    for (let from = 0; from < 100000; from += BATCH) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/student_concerns?select=*&order=id.desc&offset=${from}&limit=${BATCH}`, {
        headers: headers(),
      });
      if (!res.ok) return null;
      const rows = (await res.json()) as Record<string, unknown>[];
      for (const r of rows) out.push(toConcern(r));
      if (rows.length !== BATCH) break;
    }
    return out;
  } catch {
    return null;
  }
}

export async function updateConcern(id: number, patch: Record<string, unknown>, what = 'updateConcern'): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/student_concerns?id=eq.${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(patch),
    });
    return report(res, what);
  } catch {
    return report(null, what);
  }
}

export async function fetchMessages(concernId: number): Promise<ConcernMessage[] | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/concern_messages?select=*&concern_id=eq.${concernId}&order=id.desc&limit=1000`,
      { headers: headers() }
    );
    if (!res.ok) return null;
    // newest 1000 (a chat this long is rare); shown oldest → newest
    return ((await res.json()) as Record<string, unknown>[]).map(toMsg).reverse();
  } catch {
    return null;
  }
}

/** only the messages newer than afterId (the live check — light even for long chats) */
export async function fetchMessagesAfter(concernId: number, afterId: number): Promise<ConcernMessage[] | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/concern_messages?select=*&concern_id=eq.${concernId}&id=gt.${afterId}&order=id.asc&limit=200`,
      { headers: headers() }
    );
    if (!res.ok) return null;
    return ((await res.json()) as Record<string, unknown>[]).map(toMsg);
  } catch {
    return null;
  }
}

/** last message per concern (for the "new reply" dot) */
export async function fetchLastMessages(): Promise<Map<number, ConcernMessage>> {
  const out = new Map<number, ConcernMessage>();
  try {
    // one row per chat (database view), 1000 chats per request
    for (let from = 0; from < 100000; from += 1000) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/concern_last_messages?select=*&order=concern_id.asc&offset=${from}&limit=1000`, {
        headers: headers(),
      });
      if (!res.ok) return out;
      const rows = (await res.json()) as Record<string, unknown>[];
      for (const r of rows) out.set(Number(r.concern_id), toMsg(r));
      if (rows.length !== 1000) break; // last page (or the server sent everything)
    }
  } catch {
    /* empty */
  }
  return out;
}

export async function sendMessage(concernId: number, sender: 'office' | 'student', body: string): Promise<ConcernMessage | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/concern_messages`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ concern_id: concernId, sender, body }),
    });
    if (!report(res, 'sendConcernMessage')) return null;
    return toMsg(((await res.json()) as Record<string, unknown>[])[0]);
  } catch {
    report(null, 'sendConcernMessage');
    return null;
  }
}

export async function fetchAccounts(): Promise<PortalAccount[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/portal_accounts?select=*&order=id.desc&limit=1000`, { headers: headers() });
    if (!res.ok) return null;
    return ((await res.json()) as Record<string, unknown>[]).map((r) => ({
      id: Number(r.id),
      studentNumber: s(r.student_number),
      fullName: s(r.full_name),
      email: s(r.email),
      status: s(r.status) || 'Active',
      deactivatedReason: s(r.deactivated_reason),
      practice: !!r.is_practice,
    }));
  } catch {
    return null;
  }
}

export async function setAccountStatus(id: number, active: boolean, reason = ''): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/portal_accounts?id=eq.${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(
        active
          ? { status: 'Active', deactivated_reason: null, deactivated_at: null }
          : { status: 'Deactivated', deactivated_reason: reason || null, deactivated_at: new Date().toISOString() }
      ),
    });
    return report(res, 'setAccountStatus');
  } catch {
    return report(null, 'setAccountStatus');
  }
}

/** DEV only: a practice account + concern so the page can be tried before the student portal exists */
export async function insertPracticeConcern(p: {
  studentName: string;
  gradeSection: string;
  studentNumber: string;
  urgent: boolean;
  confidential: boolean;
  type: string;
  what: string;
}): Promise<boolean> {
  try {
    const acc = await fetch(`${SUPABASE_URL}/rest/v1/portal_accounts`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ student_number: p.studentNumber || null, full_name: p.studentName, is_practice: true }),
    });
    if (!report(acc, 'insertPracticeAccount')) return false;
    const accountId = Number(((await acc.json()) as Record<string, unknown>[])[0]?.id);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/student_concerns`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        referral_code: `CON-${Date.now().toString(36).toUpperCase()}`,
        student_name: p.studentName,
        grade_section: p.gradeSection,
        student_number: p.studentNumber || null,
        account_id: accountId,
        submitted_by: 'Student portal (practice)',
        category: p.type,
        concern_type: p.type,
        urgency: p.urgent ? 'Urgent' : 'Normal',
        summary_en: p.what.slice(0, 160),
        summary_tl: p.what.slice(0, 160),
        what_happened: p.what,
        happened_when: 'Kanina, recess',
        happened_where: 'Canteen',
        who_involved: 'Mga kaklase',
        witnesses: '',
        is_urgent: p.urgent,
        is_confidential: p.confidential,
        truthful: true,
        status: 'Pending',
        is_practice: true,
      }),
    });
    return report(res, 'insertPracticeConcern');
  } catch {
    return report(null, 'insertPracticeConcern');
  }
}
