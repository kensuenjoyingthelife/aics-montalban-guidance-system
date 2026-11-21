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
  // privacy: the code is NOT in the subject or the inbox preview (phones show those on the lock screen)
  const subject = isTl ? 'AICS Guidance: ang iyong sign-in code' : 'AICS Guidance: your sign-in code';
  const masked = String(recipientEmail || '').slice(0, 4) + '****';
  const preview = isTl ? 'Buksan para makita ang 6-character code. Mag-e-expire sa loob ng 5 minuto.' : 'Open to see your 6-character code. It expires in 5 minutes.';
  const text = isTl
    ? `AICS Montalban Guidance Office\n\nAng iyong sign-in code: ${code}\n\nPara sa ${masked}. Mag-e-expire sa loob ng 5 minuto at isang beses lang magagamit.\nHuwag ibigay ang code na ito kahit kanino, kahit sa staff.\n\nKung hindi ikaw ang nag-sign in, huwag pansinin ang email na ito.`
    : `AICS Montalban Guidance Office\n\nYour sign-in code: ${code}\n\nFor ${masked}. It expires in 5 minutes and works once.\nNever share this code with anyone, not even staff.\n\nIf you did not try to sign in, ignore this email.`;
  const chars = String(code).split('').map((ch) => `<td class="dg" style="width:44px;height:56px;border-radius:12px;background:#F2F2F7;text-align:center;vertical-align:middle;font:700 28px -apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Arial,sans-serif;color:#1D1D1F;">${ch}</td><td style="width:8px;"></td>`).join('');
  const html = `<!DOCTYPE html>
<html lang="${isTl ? 'fil' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${subject}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    .bg { background:#000000 !important; }
    .card { background:#1C1C1E !important; border-color:#38383A !important; }
    .ink { color:#F5F5F7 !important; }
    .soft { color:#A1A1A6 !important; }
    .dg { background:#2C2C2E !important; color:#FFFFFF !important; }
    .line { border-color:#38383A !important; }
  }
  [data-ogsc] .bg { background:#000000 !important; }
  [data-ogsc] .card { background:#1C1C1E !important; }
  [data-ogsc] .ink { color:#F5F5F7 !important; }
  [data-ogsc] .soft { color:#A1A1A6 !important; }
  [data-ogsc] .dg { background:#2C2C2E !important; color:#FFFFFF !important; }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:#F2F2F7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preview}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:#F2F2F7;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card" style="max-width:440px;background:#FFFFFF;border:1px solid #E5E5EA;border-radius:22px;">
  <tr><td style="padding:32px 28px 8px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Arial,sans-serif;">
    <div style="width:56px;height:56px;margin:0 auto;border-radius:16px;background:#007AFF;color:#FFFFFF;font:800 16px/56px -apple-system,Segoe UI,Arial,sans-serif;letter-spacing:.04em;">AICS</div>
    <p class="soft" style="margin:18px 0 4px;font-size:13px;font-weight:600;letter-spacing:.02em;color:#6E6E73;">AICS MONTALBAN · GUIDANCE OFFICE</p>
    <h1 class="ink" style="margin:0;font-size:24px;line-height:1.25;font-weight:700;color:#1D1D1F;">${isTl ? 'Ang iyong sign-in code' : 'Your sign-in code'}</h1>
    <p class="soft" style="margin:10px 0 0;font-size:15px;line-height:1.45;color:#6E6E73;">${isTl ? `Para sa ${masked}. Ilagay ito sa Guidance desktop app.` : `For ${masked}. Type it into the Guidance desktop app.`}</p>
  </td></tr>
  <tr><td align="center" style="padding:22px 20px 6px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>${chars}</tr></table>
  </td></tr>
  <tr><td style="padding:14px 28px 26px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Arial,sans-serif;">
    <p class="soft" style="margin:0;font-size:14px;color:#6E6E73;">${isTl ? 'Mag-e-expire sa loob ng <b>5 minuto</b> · isang beses lang magagamit' : 'Expires in <b>5 minutes</b> · works once'}</p>
  </td></tr>
  <tr><td class="line" style="border-top:1px solid #E5E5EA;padding:18px 28px 26px;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Arial,sans-serif;">
    <p class="ink" style="margin:0 0 6px;font-size:14px;font-weight:600;color:#1D1D1F;">${isTl ? 'Huwag ibigay ang code na ito kahit kanino.' : 'Never share this code with anyone.'}</p>
    <p class="soft" style="margin:0;font-size:13px;line-height:1.5;color:#6E6E73;">${isTl ? 'Hindi ito hihingin ng staff o ng school. Kung hindi ikaw ang nag-sign in, huwag pansinin ang email na ito.' : 'The school and staff will never ask for it. If you did not try to sign in, you can ignore this email.'}</p>
  </td></tr>
  </table>
  <p class="soft" style="margin:16px 0 0;font:12px -apple-system,Segoe UI,Arial,sans-serif;color:#8E8E93;">Asian Institute of Computer Studies · Montalban · RA 10173</p>
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
