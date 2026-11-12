// Counselor Referral Queue + app settings — database access. Every write reports success/failure.
import { SUPABASE_URL, SUPABASE_ANON_KEY, DB_WRITE_FAILED, DB_WRITE_OK, actorHeader } from './supabaseClient';
import type { ReferralRow, ReferralStatus } from './referralRules';

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
const toRow = (r: Record<string, unknown>): ReferralRow => ({
  id: Number(r.id),
  studentNumber: s(r.student_number),
  studentName: s(r.student_name),
  status: (s(r.status) || 'Waiting') as ReferralStatus,
  scheduledDate: s(r.scheduled_date),
  seenAt: s(r.seen_at),
  addedManually: !!r.added_manually,
  manualReason: s(r.manual_reason),
  removedReason: s(r.removed_reason),
  createdAt: s(r.created_at),
  updatedAt: s(r.updated_at),
});

/** every referral row, 1000 per request */
export async function fetchReferrals(): Promise<ReferralRow[] | null> {
  const out: ReferralRow[] = [];
  try {
    for (let from = 0; from < 200000; from += 1000) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/counselor_referrals?select=*&order=id.asc&offset=${from}&limit=1000`, { headers: headers() });
      if (!res.ok) return null;
      const rows = (await res.json()) as Record<string, unknown>[];
      for (const r of rows) out.push(toRow(r));
      if (rows.length !== 1000) break; // last page (or the server sent everything)
    }
    return out;
  } catch {
    return null;
  }
}

/** new row (a new referral cycle) — returns the saved row */
export async function insertReferral(p: {
  studentNumber: string;
  studentName: string;
  status: ReferralStatus;
  scheduledDate?: string | null;
  addedManually?: boolean;
  manualReason?: string;
  removedReason?: string;
}): Promise<ReferralRow | null> {
  try {
    const now = new Date().toISOString();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/counselor_referrals`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({
        student_number: p.studentNumber,
        student_name: p.studentName,
        status: p.status,
        scheduled_date: p.scheduledDate || null,
        seen_at: p.status === 'Seen' ? now : null,
        added_manually: !!p.addedManually,
        manual_reason: p.manualReason || null,
        removed_reason: p.removedReason || null,
      }),
    });
    if (!report(res, 'insertReferral')) return null;
    return toRow(((await res.json()) as Record<string, unknown>[])[0]);
  } catch {
    report(null, 'insertReferral');
    return null;
  }
}

export async function updateReferral(
  id: number,
  p: { status: ReferralStatus; scheduledDate?: string | null; removedReason?: string | null; seen?: boolean }
): Promise<ReferralRow | null> {
  try {
    const now = new Date().toISOString();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/counselor_referrals?id=eq.${id}`, {
      method: 'PATCH',
      headers: headers(true),
      body: JSON.stringify({
        status: p.status,
        ...(p.scheduledDate !== undefined ? { scheduled_date: p.scheduledDate || null } : {}),
        ...(p.removedReason !== undefined ? { removed_reason: p.removedReason || null } : {}),
        seen_at: p.seen ? now : null,
        updated_at: now,
      }),
    });
    if (!report(res, 'updateReferral')) return null;
    return toRow(((await res.json()) as Record<string, unknown>[])[0]);
  } catch {
    report(null, 'updateReferral');
    return null;
  }
}

export async function fetchSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?select=value&key=eq.${encodeURIComponent(key)}`, { headers: headers() });
    if (!res.ok) return fallback;
    const rows = (await res.json()) as { value: T }[];
    return rows[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function saveSetting(key: string, value: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    });
    return report(res, 'saveSetting');
  } catch {
    return report(null, 'saveSetting');
  }
}
