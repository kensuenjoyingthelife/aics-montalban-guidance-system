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

// SMS only works through the dev server for now (SMS is the last stage).
export const smsApiAvailable = import.meta.env.DEV;
