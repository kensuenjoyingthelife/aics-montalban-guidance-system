// Staff sign-in with Supabase Auth (security #1, 2026-11-17).
// PIN and the 6-character email code are checked on the SERVER (aics-mailer Edge Function).
// After a correct code the server gives a one-time token; we trade it for a Supabase Auth session here.
// Every request to the database then carries the staff access token, and RLS lets only staff in.
// No extra library: plain fetch to /auth/v1 (same as the rest of the app).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';

const FN = `${SUPABASE_URL}/functions/v1/aics-mailer`;
const KEY = 'aics_staff_auth_v1';
type Session = { access: string; refresh: string; expiresAt: number; email: string };

let session: Session | null = (() => {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
})();
const save = (s: Session | null) => {
  session = s;
  try {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* memory only */
  }
};

const anonHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
async function call(type: string, body: Record<string, unknown>): Promise<Record<string, any>> {
  try {
    const r = await origFetch(FN, { method: 'POST', headers: anonHeaders, body: JSON.stringify({ type, ...body }) });
    return await r.json().catch(() => ({ ok: false, error: 'network' }));
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** first screen: is the office PIN right? ('' = yes; else 'wrong_pin' | 'locked' | 'network') */
export async function checkPinOnServer(pin: string): Promise<string> {
  const d = await call('staff-pin', { pin });
  return d.ok ? '' : String(d.error || 'network');
}
/** PIN + staff email → the server emails a 6-character code */
export async function startStaffLogin(pin: string, email: string, locale: string): Promise<{ ok: boolean; error?: string }> {
  const d = await call('staff-start', { pin, email, locale });
  return { ok: !!d.ok, error: d.error };
}
/** check the code → Supabase Auth session for this staff member */
export async function verifyStaffCode(
  email: string,
  code: string
): Promise<{ ok: boolean; error?: string; triesLeft?: number; staff?: Record<string, string> }> {
  const d = await call('staff-verify', { email, code });
  if (!d.ok || !d.tokenHash) return { ok: false, error: d.error || 'network', triesLeft: d.triesLeft };
  const r = await origFetch(`${SUPABASE_URL}/auth/v1/verify`, { method: 'POST', headers: anonHeaders, body: JSON.stringify({ type: 'magiclink', token_hash: d.tokenHash }) });
  const s = await r.json().catch(() => ({}));
  if (!r.ok || !s.access_token) return { ok: false, error: 'auth_failed' };
  save({ access: s.access_token, refresh: s.refresh_token, expiresAt: Date.now() + (Number(s.expires_in) || 3600) * 1000, email });
  return { ok: true, staff: d.staff };
}

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  if (!session?.refresh) return false;
  refreshing ??= (async () => {
    try {
      const r = await origFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: anonHeaders, body: JSON.stringify({ refresh_token: session!.refresh }) });
      const s = await r.json().catch(() => ({}));
      if (!r.ok || !s.access_token) return false;
      save({ access: s.access_token, refresh: s.refresh_token, expiresAt: Date.now() + (Number(s.expires_in) || 3600) * 1000, email: session!.email });
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

export const hasStaffSession = () => !!session;
export async function signOutStaff(): Promise<void> {
  const s = session;
  save(null);
  if (s) {
    try {
      await origFetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access}` } });
    } catch {
      /* the token still expires by itself */
    }
  }
}

// ------------------------------------------------------------ every database request carries the staff token
const origFetch: typeof fetch = typeof window !== 'undefined' ? window.fetch.bind(window) : fetch;
export function installStaffAuthFetch(): void {
  if (typeof window === 'undefined' || (window as any).__aicsAuthFetch) return;
  (window as any).__aicsAuthFetch = true;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isDb = url.startsWith(`${SUPABASE_URL}/rest/v1/`) || url.startsWith(`${SUPABASE_URL}/storage/v1/`);
    if (!isDb || !session) return origFetch(input, init);
    if (session.expiresAt - Date.now() < 60_000) await refresh();
    const send = () => {
      const h = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      h.set('Authorization', `Bearer ${session!.access}`);
      if (!h.has('apikey')) h.set('apikey', SUPABASE_ANON_KEY);
      return origFetch(input, { ...init, headers: h });
    };
    let res = await send();
    if (res.status === 401 && (await refresh())) res = await send();
    if (res.status === 401) {
      save(null);
      window.dispatchEvent(new CustomEvent('aics-session-expired'));
    }
    return res;
  };
}
