import { postMail, smsApiAvailable } from './mailApi';
// One honest way to message parents (flowchart pages 5–7).
// - SMS always in Filipino, never the offense (manuscript).
// - Never says "sent" unless the SMS service / Gmail really accepted it.
// - Every attempt is written to the SMS log with its real status.
import { insertSmsGmailLogInDb } from './supabaseClient';
import { parseISO } from './scheduling';
import { toSmsSafe } from './smsText';
import { getAppConfig, fillTemplate } from './appConfig';

export type Channel = 'sms' | 'gmail' | 'both';
export type MessageKind = 'notice' | 'reminder' | 'reschedule';

const MONTHS_TL = ['Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo', 'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre'];
const DAYS_TL = ['Linggo', 'Lunes', 'Martes', 'Miyerkules', 'Huwebes', 'Biyernes', 'Sabado'];

/** "Biyernes, Nobyembre 14" */
export function dateTl(iso: string): string {
  const d = parseISO(iso);
  return `${DAYS_TL[d.getDay()]}, ${MONTHS_TL[d.getMonth()]} ${d.getDate()}`;
}
/** first part of "09:30 AM – 10:15 AM" */
export const startTime = (timeSlot: string) => timeSlot.split('–')[0].trim();

const DAY_SHORT = ['Lin', 'Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab'];
const MON_SHORT = ['Ene', 'Peb', 'Mar', 'Abr', 'May', 'Hun', 'Hul', 'Ago', 'Set', 'Okt', 'Nob', 'Dis'];
/** "Biy Nob 14, 9:00 AM" — short so the whole SMS fits in 160 letters */
export function whenShort(iso: string, timeSlot: string): string {
  const d = parseISO(iso);
  return `${DAY_SHORT[d.getDay()]} ${MON_SHORT[d.getMonth()]} ${d.getDate()}, ${startTime(timeSlot).replace(/^0/, '')}`;
}

/** Filipino SMS — date and time only (place = the Guidance Office). No offense, no case details. Aim: 1 SMS. */
export function buildConferenceSms(p: {
  kind: MessageKind;
  parentName: string;
  studentName: string;
  date: string;
  timeSlot: string;
}): string {
  const when = whenShort(p.date, p.timeSlot);
  // the words come from Settings › SMS templates ({student} and {when} are filled in)
  const t = getAppConfig().smsTemplates;
  return fillTemplate(p.kind === 'reminder' ? t.reminder : p.kind === 'reschedule' ? t.reschedule : t.notice, p.studentName, when);
}

/** Words that must never reach a parent (offense details) */
const SENSITIVE = /offense|violation|kaso|case|tardiness|cutting|vape|vaping|bully|fight|away|disrespect|uniform|haircut|suspension|sanction|major|minor|serious|grave/i;
export const findSensitiveWords = (msg: string): string[] =>
  [...new Set((msg.match(new RegExp(SENSITIVE.source, 'gi')) || []).map((w) => w.toLowerCase()))];

export interface SendResult {
  sms?: { ok: boolean; code: string; error?: string };
  email?: { ok: boolean; error?: string };
  /** true when at least one channel really accepted the message */
  anyDelivered: boolean;
  /** true when SMS was wanted but did not go out → a "Call parent" task is needed */
  smsFailed: boolean;
  /** plain sentence for the screen */
  summaryEn: string;
  summaryTl: string;
}

let smsConfiguredCache: boolean | null = null;
export async function isSmsConfigured(): Promise<boolean> {
  if (smsConfiguredCache !== null) return smsConfiguredCache;
  try {
    if (!smsApiAvailable) return (smsConfiguredCache = false);
    const r = await fetch('/api/sms-status');
    smsConfiguredCache = Boolean((await r.json())?.configured);
  } catch {
    smsConfiguredCache = false;
  }
  return smsConfiguredCache;
}

export async function sendParentMessage(p: {
  channel: Channel;
  phone: string;
  email: string;
  message: string;
  kind: MessageKind;
  parentName: string;
  studentName: string;
  gradeSection: string;
  caseCode?: string;
  appointmentCode?: string;
  scheduleText?: string;
}): Promise<SendResult> {
  const wantSms = p.channel !== 'gmail';
  const wantEmail = p.channel !== 'sms' && !!p.email;
  const result: SendResult = { anyDelivered: false, smsFailed: false, summaryEn: '', summaryTl: '' };

  if (wantSms && !smsApiAvailable) {
    result.sms = { ok: false, code: 'not_configured', error: 'SMS is not set up yet.' };
  } else if (wantSms) {
    try {
      const r = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: p.phone, message: toSmsSafe(p.message) }),
      });
      const d = await r.json();
      result.sms = { ok: !!d?.ok, code: String(d?.code || (r.ok ? 'sent' : 'server')), error: d?.error };
    } catch (e) {
      result.sms = { ok: false, code: 'network', error: e instanceof Error ? e.message : 'Network error' };
    }
  }
  if (wantEmail) {
    try {
      const d = await postMail('parent-notice', {
        email: p.email,
        parentName: p.parentName,
        studentName: p.studentName,
        gradeSection: p.gradeSection,
        scheduleText: p.scheduleText || '',
        message: p.message,
        locale: 'tl',
      });
      result.email = { ok: !!d?.ok, error: d?.error };
    } catch (e) {
      result.email = { ok: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  }

  result.anyDelivered = !!(result.sms?.ok || result.email?.ok);
  result.smsFailed = wantSms && !result.sms?.ok;

  const smsWord = (tl: boolean) =>
    !wantSms
      ? ''
      : result.sms?.ok
      ? tl ? 'Naipadala ang SMS' : 'SMS sent'
      : result.sms?.code === 'not_configured'
      ? tl ? 'Hindi naipadala ang SMS (wala pang SMS service)' : 'SMS not sent (no SMS service set up yet)'
      : result.sms?.code === 'bad_number'
      ? tl ? 'Hindi naipadala ang SMS (mali ang number)' : 'SMS not sent (wrong number)'
      : tl ? 'Hindi naipadala ang SMS' : 'SMS failed';
  const emailWord = (tl: boolean) =>
    !wantEmail ? '' : result.email?.ok ? (tl ? 'naipadala ang email' : 'email sent') : tl ? 'hindi naipadala ang email' : 'email failed';
  result.summaryEn = [smsWord(false), emailWord(false)].filter(Boolean).join(' · ');
  result.summaryTl = [smsWord(true), emailWord(true)].filter(Boolean).join(' · ');

  // honest log: one row per channel tried
  const base = {
    studentName: p.studentName,
    gradeSection: p.gradeSection,
    parentName: p.parentName,
    message: p.message,
    kind: p.kind,
    caseCode: p.caseCode,
    appointmentCode: p.appointmentCode,
  };
  if (wantSms)
    void insertSmsGmailLogInDb({
      ...base,
      phone: p.phone,
      email: '',
      channel: 'sms',
      deliveryStatus: result.sms?.ok ? 'Sent' : result.sms?.code === 'not_configured' ? 'Not sent' : 'Failed',
      error: result.sms?.ok ? undefined : result.sms?.error,
    });
  if (wantEmail)
    void insertSmsGmailLogInDb({
      ...base,
      phone: '',
      email: p.email,
      channel: 'gmail',
      deliveryStatus: result.email?.ok ? 'Sent' : 'Failed',
      error: result.email?.ok ? undefined : result.email?.error,
    });
  return result;
}
