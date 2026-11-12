// Handover notes (features flowchart page 14: "Case summaries and handover notes — so another staff
// member can continue a case"). Kept forever: the app can add and read, never change or delete.
import { SUPABASE_URL, SUPABASE_ANON_KEY, DB_WRITE_FAILED, DB_WRITE_OK, actorHeader } from './supabaseClient';

export interface HandoverNote {
  id: number;
  caseCode: string;
  note: string;
  author: string;
  at: string;
}
const headers = (ret = false): HeadersInit => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  ...actorHeader(),
  ...(ret ? { Prefer: 'return=representation' } : {}),
});
const toNote = (r: Record<string, unknown>): HandoverNote => ({
  id: Number(r.id),
  caseCode: String(r.case_code ?? ''),
  note: String(r.note ?? ''),
  author: String(r.author ?? ''),
  at: String(r.created_at ?? ''),
});

export async function fetchHandoverNotes(caseCode: string): Promise<HandoverNote[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/case_handover_notes?select=*&case_code=eq.${encodeURIComponent(caseCode)}&order=id.desc&limit=200`, {
      headers: headers(),
    });
    if (!res.ok) return null;
    return ((await res.json()) as Record<string, unknown>[]).map(toNote);
  } catch {
    return null;
  }
}

/** how many notes each case has (for the "has notes" mark in the case list) */
export async function fetchHandoverCounts(): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  try {
    for (let from = 0; from < 200000; from += 1000) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/case_handover_notes?select=case_code&order=id.asc&offset=${from}&limit=1000`, { headers: headers() });
      if (!res.ok) return out;
      const rows = (await res.json()) as { case_code: string }[];
      for (const r of rows) out.set(r.case_code, (out.get(r.case_code) ?? 0) + 1);
      if (rows.length !== 1000) break; // last page (or the server sent everything)
    }
  } catch {
    /* empty */
  }
  return out;
}

export async function addHandoverNote(caseCode: string, note: string, author: string): Promise<HandoverNote | null> {
  const ok = (res: Response | null) => {
    try {
      window.dispatchEvent(new CustomEvent(res && res.ok ? DB_WRITE_OK : DB_WRITE_FAILED, { detail: { what: 'addHandoverNote', status: res?.status ?? 0 } }));
    } catch {
      /* no window */
    }
    return !!res && res.ok;
  };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/case_handover_notes`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ case_code: caseCode, note, author: author || null }),
    });
    if (!ok(res)) return null;
    return toNote(((await res.json()) as Record<string, unknown>[])[0]);
  } catch {
    ok(null);
    return null;
  }
}
