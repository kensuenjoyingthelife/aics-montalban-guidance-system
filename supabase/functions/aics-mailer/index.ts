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
  const subject = isTl
    ? `[AICS Montalban Guidance] ${code} ang iyong 6-Character Sign-In Code`
    : `[AICS Montalban Guidance] ${code} is your 6-Character Sign-In Code`;

  const text = isTl
    ? `AICS MONTALBAN GUIDANCE OFFICE SYSTEM\n\nAng iyong 6-character sign-in verification code ay: ${code}\n\nMae-expire ang code na ito sa loob ng 5 minuto. Huwag ibahagi ang code na ito kahit kanino.`
    : `AICS MONTALBAN GUIDANCE OFFICE SYSTEM\n\nYour 6-character sign-in verification code is: ${code}\n\nThis code expires in 5 minutes. Never share this code with anyone.`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body style="margin:0;padding:24px;background-color:#F4F7FC;font-family:'Segoe UI',Inter,Arial,sans-serif;color:#0B1F4D;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #CFD9F2;box-shadow:0 12px 32px rgba(11,31,77,0.10);">
    <div style="background:linear-gradient(135deg,#0B1F4D 0%,#1E469B 60%,#2557BE 100%);padding:24px 28px;text-align:center;color:#FFFFFF;">
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#7CB8F7;text-transform:uppercase;">
        ASIAN INSTITUTE OF COMPUTER STUDIES · MONTALBAN
      </div>
      <h1 style="margin:8px 0 4px;font-size:20px;font-weight:800;color:#FFFFFF;">
        Guidance Office Security Gate
      </h1>
      <p style="margin:0;font-size:12px;color:#E4ECFC;">
        Montalban Town Center, E. Rodriguez Highway, Rodriguez, Rizal
      </p>
    </div>

    <div style="padding:28px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#0B1F4D;">
        ${isTl ? 'Kumusta Guidance Staff,' : 'Hello Guidance Staff,'}
      </p>
      <p style="margin:0 0 20px;font-size:13.5px;line-height:1.6;color:#3B5284;">
        ${
          isTl
            ? `May humiling ng sign-in code para sa <strong>${recipientEmail}</strong> sa AICS Montalban Guidance Office Management System. Gamitin ang 6-character verification code sa ibaba:`
            : `A sign-in verification code was requested for <strong>${recipientEmail}</strong> on the AICS Montalban Guidance Office Management System. Enter the 6-character code below:`
        }
      </p>

      <div style="background:#F4F7FC;border:2px dashed #4E92DF;border-radius:16px;padding:20px;text-align:center;margin:0 0 20px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#3B5284;margin-bottom:8px;">
          ${isTl ? '6-CHARACTER VERIFICATION CODE' : '6-CHARACTER VERIFICATION CODE'}
        </div>
        <div style="font-family:'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:10px;color:#1E469B;">
          ${code}
        </div>
      </div>

      <p style="margin:0 0 8px;font-size:12px;color:#687FA8;text-align:center;">
        ⏱ ${
          isTl
            ? 'Valid sa loob ng <strong>5 minuto</strong> · Single-use code · Hanggang 5 subok lang'
            : 'Valid for <strong>5 minutes</strong> · Single-use code · Maximum 5 attempts'
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method Not Allowed' }, 405);
  const user = Deno.env.get('GMAIL_SMTP_USER') || '';
  const pass = (Deno.env.get('GMAIL_SMTP_APP_PASSWORD') || '').replace(/\s+/g, '');
  const senderName = Deno.env.get('GMAIL_SENDER_NAME') || 'AICS Montalban Guidance Office';
  if (!user || !pass) return json({ ok: false, error: 'Email is not set up on the server.' }, 500);
  let p: Record<string, unknown>;
  try { p = await req.json(); } catch { return json({ ok: false, error: 'Bad request' }, 400); }
  const email = String(p.email || '').trim().toLowerCase();
  const locale = p.locale === 'tl' ? 'tl' : 'en';
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'Missing valid email.' }, 400);
  let tpl: { subject: string; html: string; text: string };
  if (p.type === 'otp') {
    const code = String(p.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return json({ ok: false, error: 'Missing valid 6-character code.' }, 400);
    tpl = buildAicsOtpEmailTemplate({ code, recipientEmail: email, locale });
  } else if (p.type === 'parent-notice') {
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
    const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
    await t.sendMail({ from: `"${senderName}" <${user}>`, to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Send failed' }, 502);
  }
});
