// SMS to parents. Providers (first one set up wins):
//   ANDROID_SMS_USER, ANDROID_SMS_PASS, ANDROID_SMS_URL (optional)  — Android phone + SIM via the
//     "SMS Gateway for Android" app (sms-gate.app). Default URL = its Cloud server.
// Then PhilSMS (primary, https://app.philsms.com), Semaphore (backup).
// Keys live ONLY in .env on the server side:
//   PHILSMS_API_TOKEN, PHILSMS_SENDER_ID      (primary)
//   SEMAPHORE_API_KEY, SEMAPHORE_SENDER_NAME  (backup, optional)
// Without a key it NEVER pretends to send: it answers { ok:false, code:'not_configured' }.
import fs from 'node:fs';
import path from 'node:path';

function readEnv() {
  const cfg = {
    andUser: process.env.ANDROID_SMS_USER || '',
    andPass: process.env.ANDROID_SMS_PASS || '',
    andUrl: process.env.ANDROID_SMS_URL || '',
    philToken: process.env.PHILSMS_API_TOKEN || '',
    philSender: process.env.PHILSMS_SENDER_ID || '',
    semKey: process.env.SEMAPHORE_API_KEY || '',
    semSender: process.env.SEMAPHORE_SENDER_NAME || '',
    dailyLimit: Number(process.env.SMS_DAILY_LIMIT || 150),
  };
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const key = t.slice(0, t.indexOf('=')).trim();
      const val = t.slice(t.indexOf('=') + 1).trim();
      if (!val) continue;
      if (key === 'ANDROID_SMS_USER') cfg.andUser = val;
      if (key === 'ANDROID_SMS_PASS') cfg.andPass = val;
      if (key === 'ANDROID_SMS_URL') cfg.andUrl = val;
      if (key === 'PHILSMS_API_TOKEN') cfg.philToken = val;
      if (key === 'PHILSMS_SENDER_ID') cfg.philSender = val;
      if (key === 'SEMAPHORE_API_KEY') cfg.semKey = val;
      if (key === 'SEMAPHORE_SENDER_NAME') cfg.semSender = val;
      if (key === 'SMS_DAILY_LIMIT') cfg.dailyLimit = Number(val) || cfg.dailyLimit;
    }
  }
  return cfg;
}

/** 0917-123-4567 / +63 917 123 4567 → 09171234567 (or '' when it is not a PH mobile number) */
export function normalizePhMobile(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('63') && d.length === 12) d = '0' + d.slice(2);
  if (d.length === 10 && d.startsWith('9')) d = '0' + d;
  return /^09\d{9}$/.test(d) ? d : '';
}

// ---- keep messages in the cheap GSM alphabet (160 per SMS instead of 70) ----
const GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = '^{}\\[~]|€';
export function toGsmText(msg) {
  return String(msg || '')
    .replace(/[·•]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/ /g, ' ');
}
export function smsInfo(msg) {
  const text = toGsmText(msg);
  const unicode = [...text].some((c) => !GSM.includes(c) && !GSM_EXT.includes(c));
  const len = unicode ? [...text].length : [...text].reduce((n, c) => n + (GSM_EXT.includes(c) ? 2 : 1), 0);
  const single = unicode ? 70 : 160, part = unicode ? 67 : 153;
  return { text, unicode, length: len, parts: len <= single ? 1 : Math.ceil(len / part) };
}

// ---- simple daily cap (protects the credits from a bug or misuse) ----
let day = '', sentToday = 0;
function underDailyLimit(limit) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; sentToday = 0; }
  return sentToday < limit;
}

const hasAndroid = (c) => Boolean(c.andUser && c.andPass);

async function sendViaAndroid(cfg, number, info) {
  const base = (cfg.andUrl || 'https://api.sms-gate.app/3rdparty/v1').replace(/\/+$/, '');
  const auth = 'Basic ' + Buffer.from(`${cfg.andUser}:${cfg.andPass}`).toString('base64');
  const post = (body) => fetch(`${base}/message`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const phoneNumbers = ['+63' + number.slice(1)];
  let res = await post({ textMessage: { text: info.text }, phoneNumbers });
  if (res.status === 400) res = await post({ message: info.text, phoneNumbers }); // older app versions
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch { data = { message: raw.slice(0, 200) }; }
  if (res.ok && data?.state !== 'Failed') {
    // accepted by the phone; the phone sends it with its own SIM
    return { ok: true, code: 'sent', provider: 'Android phone', status: String(data?.state || 'Sent'), gatewayId: data?.id ? String(data.id) : undefined, parts: info.parts };
  }
  const why = res.status === 401 ? 'wrong username/password in the app' : data?.message || 'HTTP ' + res.status;
  return { ok: false, code: res.status === 401 ? 'auth' : 'gateway_error', provider: 'Android phone', error: `Android phone: ${why}` };
}

export function smsConfigured() {
  const c = readEnv();
  return Boolean(hasAndroid(c) || c.philToken || c.semKey);
}
export function smsProvider() {
  const c = readEnv();
  return hasAndroid(c) ? 'Android phone' : c.philToken ? 'PhilSMS' : c.semKey ? 'Semaphore' : null;
}

async function sendViaPhilSms(cfg, number, info) {
  const res = await fetch('https://app.philsms.com/api/v3/sms/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.philToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: '63' + number.slice(1), // 09171234567 → 639171234567
      sender_id: cfg.philSender || 'PhilSMS',
      type: info.unicode ? 'unicode' : 'plain',
      message: info.text,
    }),
  });
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch { data = { status: 'error', message: raw.slice(0, 200) }; }
  if (res.ok && data?.status === 'success') {
    return { ok: true, code: 'sent', provider: 'PhilSMS', status: 'Sent', gatewayId: data?.data?.uid ? String(data.data.uid) : undefined, parts: info.parts };
  }
  return { ok: false, code: res.status === 401 || res.status === 403 ? 'auth' : 'gateway_error', provider: 'PhilSMS', error: `PhilSMS: ${data?.message || 'HTTP ' + res.status}` };
}

async function sendViaSemaphore(cfg, number, info) {
  const form = new URLSearchParams({ apikey: cfg.semKey, number, message: info.text });
  if (cfg.semSender) form.set('sendername', cfg.semSender);
  const res = await fetch('https://api.semaphore.co/api/v4/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(),
  });
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch { data = raw; }
  if (!res.ok) return { ok: false, code: 'gateway_error', provider: 'Semaphore', error: `Semaphore: ${raw.slice(0, 200)}` };
  const first = Array.isArray(data) ? data[0] : data;
  return { ok: true, code: 'sent', provider: 'Semaphore', status: String(first?.status || 'Sent'), gatewayId: first?.message_id ? String(first.message_id) : undefined, parts: info.parts };
}

export async function sendSms({ to, message }) {
  const number = normalizePhMobile(to);
  if (!number) return { ok: false, code: 'bad_number', error: 'Invalid mobile number (must be 09 + 9 digits).' };
  if (!message || !String(message).trim()) return { ok: false, code: 'empty', error: 'Empty message.' };
  const cfg = readEnv();
  if (!hasAndroid(cfg) && !cfg.philToken && !cfg.semKey) {
    return { ok: false, code: 'not_configured', error: 'No SMS service is set up yet (PHILSMS_API_TOKEN missing).' };
  }
  if (!underDailyLimit(cfg.dailyLimit)) {
    return { ok: false, code: 'daily_limit', error: `Daily SMS limit reached (${cfg.dailyLimit}). Try again tomorrow or raise SMS_DAILY_LIMIT.` };
  }
  const info = smsInfo(message);
  try {
    let r = hasAndroid(cfg) ? await sendViaAndroid(cfg, number, info) : cfg.philToken ? await sendViaPhilSms(cfg, number, info) : await sendViaSemaphore(cfg, number, info);
    // backup provider when the primary fails for a non-number reason
    if (!r.ok && !hasAndroid(cfg) && cfg.philToken && cfg.semKey) r = await sendViaSemaphore(cfg, number, info);
    if (r.ok) sentToday++;
    return r;
  } catch (err) {
    return { ok: false, code: 'network', error: err instanceof Error ? err.message : 'Network error' };
  }
}
