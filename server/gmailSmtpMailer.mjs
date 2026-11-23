import tls from 'node:tls';
import fs from 'node:fs';
import path from 'node:path';

export function loadEnvConfig() {
  const envPath = path.join(process.cwd(), '.env');
  const config = {
    user: process.env.GMAIL_SMTP_USER || 'aicsmontalbansafeguard@gmail.com',
    pass: (process.env.GMAIL_SMTP_APP_PASSWORD || '').replace(/\s+/g, ''),
    senderName: process.env.GMAIL_SENDER_NAME || 'AICS Montalban Guidance Office',
  };

  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key === 'GMAIL_SMTP_USER' && val) config.user = val;
      if (key === 'GMAIL_SMTP_APP_PASSWORD' && val) config.pass = val.replace(/\s+/g, '');
      if (key === 'GMAIL_SENDER_NAME' && val) config.senderName = val;
    }
  }
  return config;
}

/**
 * Zero-dependency TLS SMTP client for smtp.gmail.com:465
 */
export function sendGmailSmtp({ to, subject, html, text }) {
  const { user, pass, senderName } = loadEnvConfig();

  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: 'smtp.gmail.com',
        port: 465,
        servername: 'smtp.gmail.com',
        rejectUnauthorized: false,
      },
      () => {
        // Connected over TLS
      }
    );

    socket.setEncoding('utf8');
    socket.setTimeout(15000);

    let buffer = '';
    let step = 0;

    const sendLine = (cmd) => {
      socket.write(cmd + '\r\n');
    };

    const buildMimeMessage = () => {
      const boundary = '----=_AICS_Guidance_Boundary_' + Date.now().toString(36);
      const dateHeader = new Date().toUTCString();
      const msgId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@aics-montalban.local>`;

      return [
        `From: "${senderName}" <${user}>`,
        `To: <${to}>`,
        `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
        `Date: ${dateHeader}`,
        `Message-ID: ${msgId}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 8bit',
        '',
        text,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 8bit',
        '',
        html,
        '',
        `--${boundary}--`,
        '',
        '.',
      ].join('\r\n');
    };

    const handleResponse = (code, fullResponse) => {
      if (code >= 400) {
        socket.end();
        return reject(new Error(`SMTP Error (${code}): ${fullResponse.trim()}`));
      }

      if (step === 0 && code === 220) {
        step = 1;
        sendLine('EHLO aics-montalban.local');
      } else if (step === 1 && code === 250) {
        step = 2;
        sendLine('AUTH LOGIN');
      } else if (step === 2 && code === 334) {
        step = 3;
        sendLine(Buffer.from(user, 'utf8').toString('base64'));
      } else if (step === 3 && code === 334) {
        step = 4;
        sendLine(Buffer.from(pass, 'utf8').toString('base64'));
      } else if (step === 4 && code === 235) {
        step = 5;
        sendLine(`MAIL FROM:<${user}>`);
      } else if (step === 5 && code === 250) {
        step = 6;
        sendLine(`RCPT TO:<${to}>`);
      } else if (step === 6 && code === 250) {
        step = 7;
        sendLine('DATA');
      } else if (step === 7 && code === 354) {
        step = 8;
        sendLine(buildMimeMessage());
      } else if (step === 8 && code === 250) {
        step = 9;
        sendLine('QUIT');
        socket.end();
        resolve({
          ok: true,
          sender: user,
          recipient: to,
          response: fullResponse.trim(),
        });
      }
    };

    socket.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      let multiLineAcc = '';
      for (const line of lines) {
        multiLineAcc += line + '\n';
        // SMTP final line of a response has a space at index 3 (e.g., "250 OK"), whereas continuation has "-" ("250-PIPELINING")
        if (/^\d{3} /.test(line) || /^\d{3}$/.test(line)) {
          const code = parseInt(line.slice(0, 3), 10);
          const completeMsg = multiLineAcc;
          multiLineAcc = '';
          handleResponse(code, completeMsg);
        }
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Gmail SMTP connection timed out after 15 seconds.'));
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

export function buildAicsOtpEmailTemplate({ code, recipientEmail, locale = 'en' }) {
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

export function buildAicsParentNoticeEmailTemplate({
  parentName,
  studentName,
  gradeSection,
  scheduleText,
  customMessage,
  locale = 'en',
}) {
  const isTl = locale === 'tl';
  const cleanParent = parentName && parentName.trim() ? parentName.trim() : 'Parent / Guardian';
  const subject = `[AICS Montalban Guidance] Official Parent-Guidance Conference Notice — ${studentName}`;

  const text = `ASIAN INSTITUTE OF COMPUTER STUDIES (AICS) - MONTALBAN
Guidance & Counseling Office · Student Discipline & Restorative Tracking

OFFICIAL PARENT-GUIDANCE CONFERENCE NOTICE

Dear ${cleanParent},

${customMessage}

STUDENT DETAILS:
- Student: ${studentName} (${gradeSection})
- Schedule & Venue: ${scheduleText || 'AICS Montalban Guidance Office, 2nd Floor'}

CONFIDENTIALITY NOTICE:
In compliance with Republic Act No. 10173 (Data Privacy Act of 2012) and DepEd Child Protection Policy, specific case details are strictly discussed in person inside the Guidance Office.

Official Guidance System of AICS Montalban · Est. 1996 · RA 10173 Protected`;

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
    .body-bg { background-color: #0A0F1D !important; }
    .card-surface { background-color: #121A2E !important; border-color: rgba(255,255,255,0.12) !important; box-shadow: 0 20px 48px rgba(0,0,0,0.6) !important; }
    .text-main { color: #FFFFFF !important; }
    .text-muted { color: #94A3B8 !important; }
    .detail-card { background-color: #0B1120 !important; border-color: #1E293B !important; }
    .message-box { background-color: #0F172A !important; border-left-color: #38BDF8 !important; color: #F1F5F9 !important; }
    .footer-bg { background-color: #0B1120 !important; border-color: #1E293B !important; }
  }
</style>
</head>
<body class="body-bg" style="margin:0;padding:36px 12px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-surface" style="max-width:560px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:24px;overflow:hidden;box-shadow:0 16px 40px rgba(11,31,77,0.08);">
    
    <!-- Institutional Navy Executive Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#071530 0%,#0B1F4D 55%,#17387A 100%);padding:36px 36px 28px 36px;text-align:center;color:#FFFFFF;">
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#0284C7 0%,#0052CC 100%);color:#FFFFFF;font:800 16px/58px -apple-system,sans-serif;letter-spacing:1px;box-shadow:0 6px 20px rgba(0,0,0,0.3);border:2px solid rgba(255,255,255,0.85);">
              AICS
            </td>
          </tr>
        </table>
        <div style="margin:16px 0 6px 0;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#7DD3FC;">
          ASIAN INSTITUTE OF COMPUTER STUDIES · MONTALBAN
        </div>
        <h1 style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.02em;line-height:1.25;">
          Official Parent-Guidance Conference Notice
        </h1>
        <p style="margin:6px 0 0 0;font-size:12.5px;color:#BAE6FD;font-weight:500;">
          Guidance &amp; Counseling Office · Senior High School Discipline Department
        </p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding:32px 36px;">
        <p class="text-main" style="margin:0 0 16px 0;font-size:15px;font-weight:700;color:#0F172A;">
          Dear ${cleanParent},
        </p>

        <!-- Official Guidance Statement Box -->
        <div class="message-box" style="background-color:#F8FAFC;border-left:4px solid #0284C7;border-radius:14px;padding:18px 20px;margin:0 0 24px 0;font-size:14px;line-height:1.65;color:#1E293B;white-space:pre-line;">
          ${customMessage}
        </div>

        <!-- 2026 Linear-style Structured Metadata Bento Card -->
        <div class="detail-card" style="background-color:#F0F7FF;border:1px solid #BAE6FD;border-radius:18px;padding:20px;margin:0 0 22px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-bottom:12px;">
                <span style="font-size:10.5px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#0369A1;display:block;">
                  STUDENT NAME &amp; STRAND
                </span>
                <span class="text-main" style="font-size:14.5px;font-weight:800;color:#0F172A;display:block;margin-top:2px;">
                  ${studentName} <span style="font-weight:600;color:#0284C7;">(${gradeSection})</span>
                </span>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid rgba(2,132,199,0.18);padding-top:12px;">
                <span style="font-size:10.5px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#0369A1;display:block;">
                  SCHEDULE &amp; VENUE
                </span>
                <span class="text-main" style="font-size:14.5px;font-weight:800;color:#0F172A;display:block;margin-top:2px;">
                  ${scheduleText || 'AICS Montalban Guidance Office'}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Confidentiality Safeguard -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="top" style="width:20px;padding-right:10px;font-size:15px;">
              🔒
            </td>
            <td>
              <p class="text-muted" style="margin:0;font-size:12px;line-height:1.55;color:#64748B;">
                <strong>Confidential Notice:</strong> Pursuant to Republic Act No. 10173 (Data Privacy Act of 2012) and the DepEd Child Protection Policy, specific allegations and case merits are handled confidentially and discussed solely in person at the Guidance Office.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Institutional Footer -->
    <tr>
      <td class="footer-bg" style="background-color:#F8FAFC;padding:18px 36px;border-top:1px solid #E2E8F0;text-align:center;">
        <p style="margin:0;font-size:11.5px;font-weight:600;color:#64748B;">
          Asian Institute of Computer Studies · Montalban Campus
        </p>
        <p style="margin:4px 0 0 0;font-size:11px;color:#94A3B8;">
          Est. 1996 · Official Guidance &amp; Discipline Management System · Protected under RA 10173
        </p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
