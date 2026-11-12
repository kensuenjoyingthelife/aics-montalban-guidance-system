// Case evidence (photos / PDFs) — PRIVATE storage. Files are opened only with short-lived signed links.
import { SUPABASE_URL, SUPABASE_ANON_KEY, DB_WRITE_FAILED, DB_WRITE_OK, actorHeader } from './supabaseClient';

export const EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = 'case-evidence';

export interface Evidence {
  id: number;
  caseCode: string;
  path: string;
  fileName: string;
  mime: string;
  size: number;
  note: string;
  uploadedBy: string;
  hidden: boolean;
  at: string;
}
const auth = (): Record<string, string> => ({ apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, ...actorHeader() });
function report(ok: boolean, what: string): boolean {
  try {
    window.dispatchEvent(new CustomEvent(ok ? DB_WRITE_OK : DB_WRITE_FAILED, { detail: { what } }));
  } catch {
    /* no window */
  }
  return ok;
}
const toEv = (r: Record<string, unknown>): Evidence => ({
  id: Number(r.id),
  caseCode: String(r.case_code ?? ''),
  path: String(r.path ?? ''),
  fileName: String(r.file_name ?? ''),
  mime: String(r.mime ?? ''),
  size: Number(r.size_bytes ?? 0),
  note: String(r.note ?? ''),
  uploadedBy: String(r.uploaded_by ?? ''),
  hidden: !!r.hidden,
  at: String(r.created_at ?? ''),
});

/** plain words for what is wrong with a file, or '' when it is fine */
export function checkEvidenceFile(f: File, tl: boolean): string {
  if (!EVIDENCE_TYPES.includes(f.type)) return tl ? 'Larawan (JPG, PNG) o PDF lang ang puwede.' : 'Only photos (JPG, PNG) or PDF files.';
  if (f.size > EVIDENCE_MAX_BYTES) return tl ? `Masyadong malaki (${(f.size / 1048576).toFixed(1)} MB). Hanggang 10 MB lang.` : `Too big (${(f.size / 1048576).toFixed(1)} MB). Up to 10 MB only.`;
  if (f.size === 0) return tl ? 'Walang laman ang file.' : 'The file is empty.';
  return '';
}

export async function fetchEvidence(caseCode: string): Promise<Evidence[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/case_evidence?select=*&case_code=eq.${encodeURIComponent(caseCode)}&order=id.desc&limit=200`, { headers: auth() });
    if (!res.ok) return null;
    return ((await res.json()) as Record<string, unknown>[]).map(toEv);
  } catch {
    return null;
  }
}

/** upload the file, then record it. Returns the saved row, or a plain error. */
export async function uploadEvidence(caseCode: string, file: File, note: string, by: string): Promise<{ row?: Evidence; error?: string }> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80) || 'file';
  const path = `${caseCode}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  try {
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': file.type, 'x-upsert': 'false' },
      body: file,
    });
    if (!up.ok) {
      report(false, 'uploadEvidence');
      return { error: `upload ${up.status}` };
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/case_evidence`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ case_code: caseCode, path, file_name: file.name.slice(0, 160), mime: file.type, size_bytes: file.size, note: note.trim() || null, uploaded_by: by || null }),
    });
    if (!report(res.ok, 'recordEvidence')) return { error: `record ${res.status}` };
    return { row: toEv(((await res.json()) as Record<string, unknown>[])[0]) };
  } catch (e) {
    report(false, 'uploadEvidence');
    return { error: e instanceof Error ? e.message : 'network' };
  }
}

/** a link that works for 2 minutes only (the bucket is private) */
export async function signedEvidenceUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${encodeURI(path)}`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 120 }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const rel = j.signedURL || j.signedUrl;
    return rel ? `${SUPABASE_URL}/storage/v1${rel.startsWith('/') ? '' : '/'}${rel}` : null;
  } catch {
    return null;
  }
}

/** hide / show (the file is kept for the record) */
export async function setEvidenceHidden(id: number, hidden: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/case_evidence?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden }),
    });
    return report(res.ok, 'hideEvidence');
  } catch {
    return report(false, 'hideEvidence');
  }
}
