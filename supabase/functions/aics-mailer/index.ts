// AICS Guidance — cloud mailer (used by the installed desktop app; the dev server uses server/gmailSmtpMailer.mjs).
// POST { type: 'otp', email, code, locale }  or  { type: 'parent-notice', email, parentName, studentName, gradeSection, scheduleText, message, locale }
import nodemailer from 'npm:nodemailer@6.9.16';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @ts-nocheck templates copied from server/gmailSmtpMailer.mjs
function buildAicsOtpEmailTemplate({ code, recipientEmail, locale = 'en' }) {
  const isTl = locale === 'tl';
  const subject = 'AICS Guidance: Verification Code ' + String(code || '').trim().toUpperCase();
  const cleanCode = String(code || '').trim().toUpperCase();
  const masked = String(recipientEmail || '').slice(0, 4) + '****';
  const preview = `Your single-use sign-in code is ${cleanCode}. Valid for 5 minutes.`;
  const text = `ASIAN INSTITUTE OF COMPUTER STUDIES — MONTALBAN\nGuidance & Counseling Department\n\nYour Verification Code: ${cleanCode}\nAccount: ${masked}\nValid for 5 minutes (single-use token).\n\nDo not share this code. Guidance administrators will never ask for your authentication code.\nIf you did not initiate this request, you can safely disregard this email.\n\nData Privacy Act of 2012 (RA 10173) Protected`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${subject}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  @media (prefers-color-scheme: dark) {
    .body-bg { background-color: #070D18 !important; }
    .card-surface { background-color: #0F172A !important; border-color: rgba(255,255,255,0.12) !important; box-shadow: 0 20px 48px rgba(0,0,0,0.7) !important; }
    .text-title { color: #FFFFFF !important; }
    .text-sub { color: #94A3B8 !important; }
    .code-surface { background-color: #050B14 !important; border-color: #1E293B !important; }
    .code-digits { color: #38BDF8 !important; }
    .badge-bg { background-color: rgba(14,165,233,0.12) !important; border-color: rgba(14,165,233,0.3) !important; color: #38BDF8 !important; }
    .meta-card { background-color: #09101F !important; border-color: rgba(255,255,255,0.08) !important; }
    .divider { border-color: rgba(255,255,255,0.08) !important; }
  }
</style>
</head>
<body class="body-bg" style="margin:0;padding:40px 16px;background-color:#F4F6F9;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preview}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center">
  
  <!-- Outer Card Frame -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-surface" style="max-width:460px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:24px;overflow:hidden;box-shadow:0 14px 40px rgba(15,23,42,0.08);">
    
    <!-- Top Accent Bar (AICS Institutional Blue & Cyan Gradient) -->
    <tr>
      <td style="height:5px;background:linear-gradient(90deg,#0284C7 0%,#2563EB 50%,#0F172A 100%);"></td>
    </tr>

    <!-- Institutional Brand & Header -->
    <tr>
      <td style="padding:32px 32px 16px 32px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px auto;">
          <tr>
            <td align="center" style="width:48px;height:48px;border-radius:14px;background:#0F172A;border:1px solid rgba(255,255,255,0.15);box-shadow:0 6px 16px rgba(15,23,42,0.18);">
              <!-- Crisp High-Density Emblem Text -->
              <span style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-weight:900;font-size:14px;letter-spacing:1px;color:#38BDF8;">AICS</span>
            </td>
          </tr>
        </table>
        
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 8px auto;">
          <tr>
            <td style="padding:3px 10px;background-color:#F1F5F9;border-radius:6px;font-size:10.5px;font-weight:700;letter-spacing:0.08em;color:#475569;text-transform:uppercase;">
              Guidance Office Authentication
            </td>
          </tr>
        </table>

        <h1 class="text-title" style="margin:0 0 6px 0;font-size:23px;font-weight:800;color:#0F172A;letter-spacing:-0.03em;line-height:1.2;">
          Your Verification Code
        </h1>
        <p class="text-sub" style="margin:0;font-size:13.5px;color:#64748B;line-height:1.5;">
          Sign-in requested for <strong style="color:#0F172A;font-weight:600;">${masked}</strong>
        </p>
      </td>
    </tr>

    <!-- 2026 Bento Code Surface (Copy-Paste Ready & Clean) -->
    <tr>
      <td style="padding:10px 32px 20px 32px;">
        <div class="code-surface" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:18px;padding:22px 16px;text-align:center;box-shadow:inset 0 2px 4px rgba(15,23,42,0.02);">
          <div class="code-digits" style="font-family:'SF Mono','JetBrains Mono','Courier New',monospace;font-size:36px;font-weight:800;letter-spacing:0.28em;color:#0F172A;line-height:1;user-select:all;-webkit-user-select:all;padding-left:0.28em;">
            ${cleanCode}
          </div>
        </div>

        <!-- Single-Click / Tap Helper Microcopy (Clean Vector-Style Tag, Zero Emoji) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
          <tr>
            <td align="center">
              <span style="font-size:11.5px;font-weight:600;color:#64748B;">
                Double-click or tap to select and copy all 6 characters
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Token Meta Tag (Single-use & Validity) -->
    <tr>
      <td align="center" style="padding:0 32px 24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
          <tr>
            <td class="badge-bg" style="padding:6px 14px;background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:9999px;font-size:11.5px;font-weight:700;color:#15803D;">
              Valid for 5 minutes · Single-use token
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Security Advisory & Safeguard Bento Box -->
    <tr>
      <td class="divider" style="border-top:1px solid #F1F5F9;padding:20px 32px 26px 32px;background-color:#FAFAFB;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="meta-card" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:14px 16px;">
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
                <tr>
                  <td style="font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#0F172A;">
                    Security Notice
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;line-height:1.55;color:#64748B;">
                Never share this code with anyone. AICS Guidance staff and administrators will never ask for your verification code. If you did not make this request, you can safely disregard this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>

  <!-- Official DepEd / AICS Institutional Footer -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;margin-top:20px;text-align:center;">
    <tr>
      <td style="font-size:11.5px;line-height:1.6;color:#94A3B8;font-weight:500;">
        Asian Institute of Computer Studies · Montalban Campus<br />
        Guidance Office Automated Dispatch System<br />
        Protected under RA 10173 (Data Privacy Act of 2012)
      </td>
    </tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
  return { subject, text, html };
}

function buildAicsParentNoticeEmailTemplate({
  parentName,
  studentName,
  gradeSection,
  scheduleText,
  customMessage,
  locale = 'en',
}) {
  const isTl = locale === 'tl';
  const subject = isTl
    ? `[AICS Montalban Guidance] Imbitasyon sa Parent Conference para kay ${studentName}`
    : `[AICS Montalban Guidance] Parent Conference Notice for ${studentName}`;

  const text = `${customMessage}\n\n---\nAICS Montalban Guidance & Counseling Office\nMontalban Town Center, E. Rodriguez Highway, Rodriguez, Rizal\nData Privacy Act (RA 10173) Compliant Notice`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body style="margin:0;padding:24px;background-color:#F4F7FC;font-family:'Segoe UI',Inter,Arial,sans-serif;color:#0B1F4D;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #CFD9F2;box-shadow:0 12px 32px rgba(11,31,77,0.10);">
    <div style="background:linear-gradient(135deg,#0B1F4D 0%,#1E469B 60%,#2557BE 100%);padding:24px 28px;text-align:center;color:#FFFFFF;">
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#7CB8F7;text-transform:uppercase;">
        ASIAN INSTITUTE OF COMPUTER STUDIES · MONTALBAN
      </div>
      <h1 style="margin:8px 0 4px;font-size:20px;font-weight:800;color:#FFFFFF;">
        ${isTl ? 'Abiso sa Parent-Guidance Conference' : 'Official Parent-Guidance Conference Notice'}
      </h1>
      <p style="margin:0;font-size:12px;color:#E4ECFC;">
        Guidance &amp; Counseling Office · Montalban Campus
      </p>
    </div>

    <div style="padding:28px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#0B1F4D;">
        ${isTl ? `Mahal na ${parentName || 'Magulang / Guardian'},` : `Dear ${parentName || 'Parent / Guardian'},`}
      </p>
      <div style="background:#F4F7FC;border-left:4px solid #1E469B;border-radius:12px;padding:16px;margin:0 0 18px;font-size:13.5px;line-height:1.65;color:#0B1F4D;white-space:pre-line;">
        ${customMessage}
      </div>

      <div style="background:#EEF4FF;border:1px solid #CFD9F2;border-radius:14px;padding:14px 16px;margin:0 0 18px;font-size:12.5px;color:#1E469B;">
        <div><strong>${isTl ? 'Pangalan ng Estudyante:' : 'Student Name:'}</strong> ${studentName} (${gradeSection})</div>
        <div style="margin-top:4px;"><strong>${isTl ? 'Iskedyul at Lugar:' : 'Schedule & Venue:'}</strong> ${scheduleText || 'AICS Montalban Guidance Office'}</div>
      </div>

      <p style="margin:0;font-size:11.5px;color:#687FA8;line-height:1.5;">
        🔒 ${
          isTl
            ? 'Alinsunod sa Data Privacy Act of 2012 (RA 10173), ang partikular na detalye ng usapin ay tatalakayin nang pribado sa loob ng Guidance Office.'
            : 'In compliance with the Data Privacy Act of 2012 (RA 10173), specific case details are discussed strictly in person at the Guidance Office.'
        }
      </p>
    </div>

    <div style="background:#F4F7FC;padding:14px 24px;border-top:1px solid #E4ECFC;text-align:center;font-size:11px;color:#687FA8;">
      Official Guidance System of AICS Montalban · Est. 1996 · Data Privacy Act (RA 10173) Protected
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

// ---------------------------------------------------------------- server-side helpers (service role)
const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const sb = (path: string, init: RequestInit = {}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
const enc = encodeURIComponent;

/** Only send to people in our records (parents, staff, student accounts). Stops anyone using
 *  the public key to spam strangers or spend the school's SMS credit. */
async function knownEmail(email: string): Promise<boolean> {
  const e = enc(email);
  const checks = await Promise.all([
    sb(`students?select=student_number&parent_email=ilike.${e}&limit=1`),
    sb(`guidance_staff?select=id&email=ilike.${e}&limit=1`),
    sb(`portal_accounts?select=id&email=ilike.${e}&limit=1`),
  ]);
  for (const r of checks) if (r.ok && ((await r.json()) as unknown[]).length) return true;
  return false;
}
const phDigits = (s: string) => {
  const d = String(s || '').replace(/\D/g, '');
  if (/^09\d{9}$/.test(d)) return d;
  if (/^639\d{9}$/.test(d)) return '0' + d.slice(2);
  return '';
};
async function knownParentPhone(local09: string): Promise<boolean> {
  // stored numbers may have dashes/spaces, so compare on the last 10 digits
  const tail = local09.slice(1);
  const r = await sb(`students?select=parent_phone&parent_phone=ilike.*${tail.slice(0, 3)}*${tail.slice(-4)}*&limit=50`);
  if (!r.ok) return false;
  const rows = (await r.json()) as { parent_phone: string }[];
  return rows.some((x) => phDigits(x.parent_phone) === local09);
}

const MAX_SMS_PER_DAY = Number(Deno.env.get('SMS_DAILY_LIMIT') || 200);
async function smsSentToday(): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const r = await sb(`sms_gmail_logs?select=id&channel=eq.sms&delivery_status=eq.Sent&created_at=gte.${enc(since.toISOString())}`, {
    headers: { Prefer: 'count=exact', Range: '0-0' },
  });
  const range = r.headers.get('content-range') || '';
  return Number(range.split('/')[1] || 0) || 0;
}

async function sendPhilSms(to09: string, message: string) {
  const token = Deno.env.get('PHILSMS_API_TOKEN') || '';
  if (!token) return { ok: false, code: 'not_configured', error: 'No SMS service is set up yet.' };
  const res = await fetch('https://dashboard.philsms.com/api/v3/sms/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: '63' + to09.slice(1),
      sender_id: Deno.env.get('PHILSMS_SENDER_ID') || 'AICS-MNTLBN',
      type: /[^\x00-\x7F]/.test(message) ? 'unicode' : 'plain',
      message,
    }),
  });
  const raw = await res.text();
  let d: Record<string, unknown> = {};
  try { d = JSON.parse(raw); } catch { d = { message: raw.slice(0, 200) }; }
  if (res.ok && d?.status === 'success') return { ok: true, code: 'sent' };
  return { ok: false, code: res.status === 401 || res.status === 403 ? 'auth' : 'gateway_error', error: `PhilSMS: ${d?.message || 'HTTP ' + res.status}` };
}

// ---------------------------------------------------------------- staff login + gateway (Security Part B)
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const OTP_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newOtp = () => [...crypto.getRandomValues(new Uint8Array(6))].map((b) => OTP_ABC[b % OTP_ABC.length]).join('');
async function setting<T>(key: string): Promise<T | null> {
  const r = await sb(`app_settings?select=value&key=eq.${enc(key)}&limit=1`);
  if (!r.ok) return null;
  const rows = (await r.json()) as { value: T }[];
  return rows[0]?.value ?? null;
}
async function security() {
  const s = (await setting<{ pinMaxTries?: number; pinLockMinutes?: number; autoSignOutMinutes?: number }>('security')) || {};
  return { tries: s.pinMaxTries || 5, lockMin: s.pinLockMinutes || 5, idleMin: s.autoSignOutMinutes || 15 };
}
async function loginState(k: string) {
  const r = await sb(`staff_login_state?select=*&k=eq.${enc(k)}&limit=1`);
  const row = r.ok ? ((await r.json()) as Record<string, unknown>[])[0] : undefined;
  return (row || { k, fails: 0, locked_until: null, otp_hash: null, otp_expires_at: null, otp_tries: 0 }) as {
    k: string; fails: number; locked_until: string | null; otp_hash: string | null; otp_expires_at: string | null; otp_tries: number;
  };
}
const saveState = (k: string, patch: Record<string, unknown>) =>
  sb('staff_login_state', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ k, ...patch }) });
/** PIN check with lockout. Returns '' when OK, else an error code. */
async function checkOfficePin(pin: string): Promise<string> {
  const sec = await security();
  const st = await loginState('pin');
  if (st.locked_until && new Date(st.locked_until) > new Date()) return 'locked';
  const rec = await setting<{ salt: string; hash: string }>('app_pin');
  const ok = rec ? (await sha256(rec.salt + pin)) === rec.hash : pin === '123456';
  if (ok) { await saveState('pin', { fails: 0, locked_until: null }); return ''; }
  const fails = (st.fails || 0) + 1;
  const lock = fails >= sec.tries;
  await saveState('pin', { fails: lock ? 0 : fails, locked_until: lock ? new Date(Date.now() + sec.lockMin * 60000).toISOString() : null });
  return lock ? 'locked' : 'wrong_pin';
}
async function staffEmailOk(email: string) {
  const r = await sb(`guidance_staff?select=id&is_active=eq.true&email=ilike.${enc(email)}&limit=1`);
  return r.ok && ((await r.json()) as unknown[]).length > 0;
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method Not Allowed' }, 405);
  let p: Record<string, unknown>;
  try { p = await req.json(); } catch { return json({ ok: false, error: 'Bad request' }, 400); }
  const locale = p.locale === 'tl' ? 'tl' : 'en';

  // ---- student portal: Cloudflare Turnstile check on the SERVER (siteverify). The secret never leaves Supabase.
  if (p.type === 'turnstile') {
    const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
    if (!secret) return json({ ok: false, error: 'not-set-up' });
    const token = String(p.token || '');
    if (!token || token.length > 2048) return json({ ok: false, error: 'missing-token' });
    const ip = req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set('remoteip', ip);
    try {
      const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
      const d = (await r.json()) as { success?: boolean; 'error-codes'?: string[] };
      return json(d.success ? { ok: true } : { ok: false, error: (d['error-codes'] || ['failed']).join(',') });
    } catch {
      return json({ ok: false, error: 'cloudflare-unreachable' });
    }
  }

  // ---- student portal Sign In (Phase 2): Cloudflare check + login in ONE server call.
  // Only this function (service role) may run portal_login; the public key cannot call it directly anymore.
  if (p.type === 'portal-login') {
    const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
    const url = Deno.env.get('SUPABASE_URL');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!secret || !url || !service) return json({ ok: false, error: 'offline' });
    const token = String(p.token || '');
    const num = String(p.number || '').trim().slice(0, 32);
    const hash = String(p.hash || '').slice(0, 256);
    if (!token || token.length > 2048) return json({ ok: false, error: 'not_human' });
    if (!num || !hash) return json({ ok: false, error: 'wrong_password' });
    const ip = req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set('remoteip', ip);
    try {
      const v = (await (await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })).json()) as { success?: boolean };
      if (!v.success) return json({ ok: false, error: 'not_human' });
    } catch {
      return json({ ok: false, error: 'offline' });
    }
    const login = async (n: string) => {
      const r = await fetch(`${url}/rest/v1/rpc/portal_login`, {
        method: 'POST',
        headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_number: n, p_hash: hash }),
      });
      return r.ok ? ((await r.json()) as Record<string, unknown>) : null;
    };
    let out = await login(num);
    // the login box shows 23-0001; older accounts were saved without the dash
    if (out && !out.ok && (out.error === 'no_account' || out.error === 'wrong_password') && num.includes('-')) out = await login(num.replace(/-/g, ''));
    return json(out ?? { ok: false, error: 'offline' });
  }

  // ---- student portal: change password (current password checked in the database). Service role only.
  if (p.type === 'portal-change-password') {
    const url = Deno.env.get('SUPABASE_URL');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !service) return json({ ok: false, error: 'offline' });
    const num = String(p.number || '').trim().slice(0, 32);
    const oldHash = String(p.oldHash || '').slice(0, 256);
    const newHash = String(p.newHash || '').slice(0, 256);
    if (!num || !oldHash || !newHash) return json({ ok: false, error: 'wrong_password' });
    const call = async (n: string) => {
      const r = await fetch(`${url}/rest/v1/rpc/portal_change_password`, {
        method: 'POST',
        headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_number: n, p_old_hash: oldHash, p_new_hash: newHash }),
      });
      return r.ok ? ((await r.json()) as Record<string, unknown>) : null;
    };
    let out = await call(num);
    if (out && !out.ok && out.error === 'no_account' && num.includes('-')) out = await call(num.replace(/-/g, ''));
    return json(out ?? { ok: false, error: 'offline' });
  }

  // ---- staff: PIN only (first screen). Lockout is kept on the server.
  if (p.type === 'staff-pin') {
    const err = await checkOfficePin(String(p.pin || ''));
    return json(err ? { ok: false, error: err } : { ok: true });
  }
  // ---- SMS (installed app). Same honest codes as the dev server.
  if (p.type === 'sms-status') {
    return json({ configured: Boolean(Deno.env.get('PHILSMS_API_TOKEN')), provider: Deno.env.get('PHILSMS_API_TOKEN') ? 'PhilSMS' : null });
  }
  if (p.type === 'sms') {
    const to = phDigits(String(p.to || ''));
    const message = String(p.message || '').trim().slice(0, 480);
    if (!to) return json({ ok: false, code: 'bad_number', error: 'Invalid mobile number (must be 09 + 9 digits).' });
    if (!message) return json({ ok: false, code: 'empty', error: 'Empty message.' });
    if (!(await knownParentPhone(to))) return json({ ok: false, code: 'unknown_number', error: 'This number is not a parent number in the records.' });
    if ((await smsSentToday()) >= MAX_SMS_PER_DAY) return json({ ok: false, code: 'daily_limit', error: `Daily SMS limit reached (${MAX_SMS_PER_DAY}).` });
    try { return json(await sendPhilSms(to, message)); } catch (e) { return json({ ok: false, code: 'network', error: e instanceof Error ? e.message : 'Network error' }); }
  }

  const user = Deno.env.get('GMAIL_SMTP_USER') || '';
  const pass = (Deno.env.get('GMAIL_SMTP_APP_PASSWORD') || '').replace(/\s+/g, '');
  const senderName = Deno.env.get('GMAIL_SENDER_NAME') || 'AICS Montalban Guidance Office';
  if (!user || !pass) return json({ ok: false, error: 'Email is not set up on the server.' }, 500);
  const transport = () => nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });

  // ---- staff: PIN + email → the server makes the 6-character code and emails it (never made in the app)
  if (p.type === 'staff-start') {
    const email = String(p.email || '').trim().toLowerCase();
    const err = await checkOfficePin(String(p.pin || ''));
    if (err) return json({ ok: false, error: err });
    if (!EMAIL_RE.test(email) || !(await staffEmailOk(email))) return json({ ok: false, error: 'not_staff' });
    const code = newOtp();
    await saveState(email, { otp_hash: await sha256(code), otp_expires_at: new Date(Date.now() + 5 * 60000).toISOString(), otp_tries: 0 });
    const tpl = buildAicsOtpEmailTemplate({ code, recipientEmail: email, locale });
    try {
      await transport().sendMail({ from: `"${senderName}" <${user}>`, to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
    } catch (e) {
      return json({ ok: false, error: 'send_failed', detail: e instanceof Error ? e.message : '' }, 502);
    }
    return json({ ok: true, expiresInSec: 300 });
  }
  // ---- staff: check the code → session token (idle sign-out from Settings, 12 h at most)
  if (p.type === 'staff-verify') {
    const email = String(p.email || '').trim().toLowerCase();
    const code = String(p.code || '').trim().toUpperCase();
    const st = await loginState(email);
    if (!st.otp_hash || !st.otp_expires_at || new Date(st.otp_expires_at) < new Date()) return json({ ok: false, error: 'expired' });
    if ((st.otp_tries || 0) >= 5) return json({ ok: false, error: 'too_many' });
    if ((await sha256(code)) !== st.otp_hash) {
      await saveState(email, { otp_tries: (st.otp_tries || 0) + 1 });
      return json({ ok: false, error: 'wrong_code', triesLeft: 4 - (st.otp_tries || 0) });
    }
    await saveState(email, { otp_hash: null, otp_expires_at: null, otp_tries: 0 }); // one use only
    // Supabase Auth: make sure the staff user exists, then hand the app a one-time sign-in token
    const admin = (path: string, body: unknown) =>
      fetch(`${SB_URL}/auth/v1/admin/${path}`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    await admin('users', { email, email_confirm: true }); // 422 when it already exists: fine
    const gl = await admin('generate_link', { type: 'magiclink', email });
    const link = gl.ok ? ((await gl.json()) as { hashed_token?: string; properties?: { hashed_token?: string } }) : {};
    const tokenHash = link.properties?.hashed_token || link.hashed_token || '';
    if (!tokenHash) return json({ ok: false, error: 'auth_failed' }, 502);
    const sr = await sb(`guidance_staff?select=email,full_name,role,department,badge_code&email=ilike.${enc(email)}&limit=1`);
    const staff = sr.ok ? ((await sr.json()) as Record<string, string>[])[0] : undefined;
    return json({ ok: true, tokenHash, staff });
  }

  // ---- Forgot password (student portal): the code is made + saved + emailed here, never in the browser
  if (p.type === 'portal-reset') {
    const id = String(p.identifier || '').trim();
    if (!id) return json({ ok: false, error: 'no_account' }, 400);
    const q = id.includes('@') ? `email=ilike.${enc(id)}` : `student_number=eq.${enc(id)}`;
    const r = await sb(`portal_accounts?select=id,email,status&${q}&limit=1`);
    const acc = r.ok ? ((await r.json()) as { id: number; email: string | null; status: string }[])[0] : undefined;
    if (!acc) return json({ ok: false, error: 'no_account' });
    if (!acc.email) return json({ ok: false, error: 'no_email' });
    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    const saved = await sb(`portal_accounts?id=eq.${acc.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ otp_code: code, otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() }),
    });
    if (!saved.ok) return json({ ok: false, error: 'save_failed' }, 500);
    const tpl = buildAicsOtpEmailTemplate({ code, recipientEmail: acc.email, locale });
    try {
      await transport().sendMail({ from: `"${senderName}" <${user}>`, to: acc.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
    } catch (e) {
      return json({ ok: false, error: e instanceof Error ? e.message : 'Send failed' }, 502);
    }
    const [n, d] = acc.email.split('@');
    const masked = n.length > 2 ? `${n[0]}***${n[n.length - 1]}@${d}` : `${n[0]}***@${d}`;
    return json({ ok: true, emailMasked: masked });
  }

  const email = String(p.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'Missing valid email.' }, 400);
  if (!(await knownEmail(email))) return json({ ok: false, error: 'This email is not in the records.' }, 403);
  let tpl: { subject: string; html: string; text: string };
  if (p.type === 'parent-notice') {
    const message = String(p.message || '').trim().slice(0, 2000);
    if (!message) return json({ ok: false, error: 'Missing message text.' }, 400);
    tpl = buildAicsParentNoticeEmailTemplate({
      parentName: String(p.parentName || '').trim(),
      studentName: String(p.studentName || '').trim(),
      gradeSection: String(p.gradeSection || '').trim(),
      scheduleText: String(p.scheduleText || '').trim(),
      customMessage: message,
      locale,
    });
  } else return json({ ok: false, error: 'Unknown type' }, 400);
  try {
    await transport().sendMail({ from: `"${senderName}" <${user}>`, to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Send failed' }, 502);
  }
});
