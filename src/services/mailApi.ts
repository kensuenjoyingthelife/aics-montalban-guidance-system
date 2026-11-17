// Email sending: the dev server (vite.config.ts /api/*) while developing,
// the Supabase cloud function "aics-mailer" in the installed app.
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aics-mailer`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export async function postMail(
  type: 'otp' | 'parent-notice',
  body: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; status: number }> {
  const devPath = type === 'otp' ? '/api/send-otp' : '/api/send-parent-notice';
  const r = import.meta.env.DEV
    ? await fetch(devPath, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    : await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
        body: JSON.stringify({ type, ...body }),
      });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok && d?.ok !== false, error: d?.error, status: r.status };
}

// SMS: the dev server while developing, the aics-mailer cloud function in the installed app.
export const smsApiAvailable = true;

/** Forgot password: the cloud function makes, saves and emails the code (always the cloud, even in dev,
 *  because it needs the server key). Returns only a masked email, never the code. */
export async function postPortalReset(
  identifier: string,
  locale: 'tl' | 'en',
): Promise<{ ok: boolean; error?: string; emailMasked?: string }> {
  try {
    const r = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
      body: JSON.stringify({ type: 'portal-reset', identifier, locale }),
    });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok && d?.ok === true, error: d?.error, emailMasked: d?.emailMasked };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** send one SMS (dev server locally, cloud function in the installed app) */
export async function postSms(to: string, message: string): Promise<{ ok: boolean; code: string; error?: string }> {
  try {
    const r = import.meta.env.DEV
      ? await fetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, message }) })
      : await fetch(FN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
          body: JSON.stringify({ type: 'sms', to, message }),
        });
    const d = await r.json().catch(() => ({}));
    return { ok: !!d?.ok, code: String(d?.code || (r.ok ? 'sent' : 'server')), error: d?.error };
  } catch (e) {
    return { ok: false, code: 'network', error: e instanceof Error ? e.message : 'Network error' };
  }
}

/** is an SMS provider set up? (never pretend) */
export async function getSmsStatus(): Promise<boolean> {
  try {
    const r = import.meta.env.DEV
      ? await fetch('/api/sms-status')
      : await fetch(FN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
          body: JSON.stringify({ type: 'sms-status' }),
        });
    return Boolean((await r.json())?.configured);
  } catch {
    return false;
  }
}
