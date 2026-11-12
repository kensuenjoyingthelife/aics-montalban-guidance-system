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
