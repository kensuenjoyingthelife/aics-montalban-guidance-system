// Sending to a parent: loading, then the result (SMS + Gmail) with the right record.
// If the SMS did not go out (sender name still waiting for telco approval), staff can text from their own phone (QR).
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareText, Mail, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { makeQr } from '../../services/qrCode';
import { SMS_FALLBACK_EVENT, SMS_SEND_START_EVENT, type SmsFallbackDetail } from '../../services/parentComms';
import { ScanningScene } from '../ui/ScanningScene';
import { insertSmsGmailLogInDb } from '../../services/supabaseClient';

// Sender name request at PhilSMS (from the PhilSMS "Sender ID" page). Update when it is approved.
export const SENDER_ID = 'AICS-MNTLBN';
export const SENDER_REQUESTED_ON = '2026-11-15';
const DAYS_MIN = 10, DAYS_MAX = 15;
const SENDING_MIN_MS = 1000;

/** working days (Mon–Fri) after `fromIso` up to today */
function workDaysSince(fromIso: string, today = new Date()): number {
  const d = new Date(fromIso + 'T00:00:00');
  let n = 0;
  for (d.setDate(d.getDate() + 1); d <= today; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  return n;
}
function addWorkDays(fromIso: string, n: number): Date {
  const d = new Date(fromIso + 'T00:00:00');
  while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n--; }
  return d;
}

const Qr: React.FC<{ text: string; size: number }> = ({ text, size }) => {
  const grid = useMemo(() => { try { return makeQr(text); } catch { return null; } }, [text]);
  if (!grid) return null;
  const q = 2, n = grid.length + q * 2;
  let d = '';
  grid.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x + q},${y + q}h1v1h-1z`; }));
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label="QR code" className="rounded-lg bg-white">
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
};

type Choice = 'sent' | 'not' | null;

/** QR text for "send SMS". SMSTO: is what almost every phone scanner turns into a "Send SMS" button.
 *  Some scanners cut the message at every ":" so, in the QR only, "6:00" becomes "6.00" and "Office:" becomes "Office -". */
const qrSms = (phone: string, text: string) => `SMSTO:${phone}:${text.replace(/(\d):(\d)/g, '$1.$2').replace(/:/g, ' -')}`;

/**
 * One clear flow for every message the staff sends to a parent:
 *   1. "Sending to parent…" (loading, right away)
 *   2. Result: SMS card + Gmail card, each with the right record choice.
 *      If the SMS did not go out (sender name not approved yet), it first explains why
 *      and offers the QR to text from the staff's own phone.
 */
export const SmsFallbackHost: React.FC<{
  onToast: (msg: string) => void;
  onTextedByPhone?: (d: SmsFallbackDetail) => void;
  /** true while "Sending…" or a result is on screen (other pop-ups wait) */
  onActiveChange?: (active: boolean) => void;
}> = ({ onToast, onTextedByPhone, onActiveChange }) => {
  useLanguage();
  const isTl = false; // always English (read by staff and the panel)
  const [pending, setPending] = useState<string[]>([]); // sends still running
  const [queue, setQueue] = useState<SmsFallbackDetail[]>([]);
  const [step, setStep] = useState<'why' | 'send'>('send');
  const [sms, setSms] = useState<Choice>(null);
  const [mail, setMail] = useState<Choice>(null);
  const [copied, setCopied] = useState(false);
  const cur = queue[0];
  const active = pending.length > 0 || !!cur;

  useEffect(() => {
    const started = new Map<string, number>();
    const onStart = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      started.set(id, Date.now());
      setPending((p) => [...p, id]);
      // never leave the loading stuck if the send crashes before it reports back
      window.setTimeout(() => setPending((p) => p.filter((x) => x !== id)), 30000);
    };
    const onResult = (e: Event) => {
      const d = (e as CustomEvent<SmsFallbackDetail>).detail;
      // keep the loading at least ~1 s so it never flashes
      const wait = Math.max(0, SENDING_MIN_MS - (Date.now() - (started.get(d.id) ?? 0)));
      window.setTimeout(() => {
        started.delete(d.id);
        setPending((p) => p.filter((x) => x !== d.id));
        setQueue((q) => (q.some((x) => x.phone === d.phone && x.smsText === d.smsText) ? q : [...q, d]));
      }, wait);
    };
    window.addEventListener(SMS_SEND_START_EVENT, onStart);
    window.addEventListener(SMS_FALLBACK_EVENT, onResult);
    return () => {
      window.removeEventListener(SMS_SEND_START_EVENT, onStart);
      window.removeEventListener(SMS_FALLBACK_EVENT, onResult);
    };
  }, []);
  useEffect(() => onActiveChange?.(active), [active, onActiveChange]);
  useEffect(() => {
    if (!cur) return;
    const needsPhone = cur.smsOk === false && cur.smsCode !== 'bad_number';
    setStep(needsPhone ? 'why' : 'send');
    setSms(cur.smsOk === true ? 'sent' : null);
    setCopied(false);
    setMail(cur.emailOk === null ? null : cur.emailOk ? 'sent' : 'not');
  }, [cur]);

  if (!active) return null;

  // ---------- 1. loading ----------
  if (!cur)
    return createPortal(
      <div className="fixed inset-0 z-[130] bg-black/35 backdrop-blur-md flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Sending to parent" data-sms-sending>
        <div role="status" aria-live="polite" className="w-full max-w-[420px] rounded-3xl bg-white dark:bg-[#1C1C1E] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-6 text-center space-y-3">
          <ScanningScene className="w-full h-40" title="Sending to parent" />
          <p className="text-base font-bold text-[#1D1D1F] dark:text-white">Sending to parent…</p>
          <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">SMS and Gmail. This takes a few seconds.</p>
          <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/10 overflow-hidden">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-[#007AFF] to-[#4E92DF] origin-left sending-bar" />
          </div>
        </div>
      </div>,
      document.body,
    );

  const smsSentBySystem = cur.smsOk === true;
  const badNumber = cur.smsOk === false && cur.smsCode === 'bad_number';
  const done = workDaysSince(SENDER_REQUESTED_ON);
  const leftMin = Math.max(0, DAYS_MIN - done), leftMax = Math.max(0, DAYS_MAX - done);
  const fmt = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(d);
  const fmtShort = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
  const requested = fmt(new Date(SENDER_REQUESTED_ON + 'T00:00:00'));
  const eta = `${fmtShort(addWorkDays(SENDER_REQUESTED_ON, DAYS_MIN))} – ${fmtShort(addWorkDays(SENDER_REQUESTED_ON, DAYS_MAX))}`;
  const waitLine =
    leftMax === 0
      ? `It is past ${DAYS_MAX} working days. Please follow up with PhilSMS.`
      : leftMin === 0
      ? `It can be approved any day now (up to ${leftMax} more working days).`
      : `About ${leftMin}–${leftMax} more working days (around ${eta}).`;

  const next = () => setQueue((q) => q.slice(1));
  const skip = () => next(); // closes quietly; the failed SMS stays in Parents › messages
  const needSmsChoice = cur.smsOk === false && !badNumber;
  const save = () => {
    if (needSmsChoice && sms === 'sent') {
      void insertSmsGmailLogInDb({
        studentName: cur.studentName, gradeSection: cur.gradeSection, parentName: cur.parentName,
        phone: cur.phone, email: '', channel: 'sms-phone', message: cur.smsText, deliveryStatus: 'Sent',
        kind: cur.kind, caseCode: cur.caseCode, appointmentCode: cur.appointmentCode,
      });
      onTextedByPhone?.(cur);
    }
    const smsDone = smsSentBySystem || sms === 'sent';
    const reached = smsDone || mail === 'sent';
    const parts = [
      smsSentBySystem ? 'SMS sent.' : sms === 'sent' ? 'Texted from your own phone.' : cur.smsOk === null ? '' : 'No SMS.',
      mail === 'sent' ? 'Gmail sent.' : cur.emailOk === null ? '' : 'No Gmail.',
      reached ? 'Next: wait for a reply, or call if there is none.' : 'Next: call the parent from Parents.',
    ].filter(Boolean);
    onToast(parts.join(' '));
    next();
  };

  const opt = (on: boolean) =>
    `w-full text-left px-3 py-2 rounded-xl border text-[13px] leading-snug flex items-start gap-2 ${on ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#1D1D1F] dark:text-white' : 'border-black/10 dark:border-white/15 text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'}`;
  const dot = (on: boolean) => <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${on ? 'border-[#007AFF] bg-[#007AFF] shadow-[inset_0_0_0_2px_#fff] dark:shadow-[inset_0_0_0_2px_#1C1C1E]' : 'border-[#AEAEB2]'}`} />;
  const status = (ok: boolean, okText: string, badText: string) => (
    <p className={`mt-1 text-[13px] font-semibold flex items-center gap-1.5 ${ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
      {ok ? <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> : <XCircle className="w-4 h-4" aria-hidden="true" />}
      {ok ? okText : badText}
    </p>
  );
  const textBox = (text: string) => (
    <p className="mt-2 flex-1 overflow-y-auto rounded-xl bg-black/[0.03] dark:bg-white/[0.05] p-2 text-[12px] text-[#3A3A3C] dark:text-[#D1D1D6] whitespace-pre-wrap leading-snug">{text}</p>
  );
  const allGood = (cur.smsOk !== false) && (cur.emailOk !== false);

  return createPortal(
    <div className="fixed inset-0 z-[130] bg-black/35 backdrop-blur-md flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="smsfb-title" data-sms-fallback>
      <div className="w-full max-w-[680px] max-h-[calc(100vh-32px)] overflow-y-auto rounded-3xl bg-white dark:bg-[#1C1C1E] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-6">
        {step === 'why' ? (
          <div className="space-y-4" data-step="why">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-amber-700 dark:text-amber-300" aria-hidden="true" /></span>
              <div>
                <h2 id="smsfb-title" className="text-lg font-bold text-[#1D1D1F] dark:text-white">The SMS was not sent yet</h2>
                <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">To {cur.parentName} · {cur.phone}{cur.emailOk ? ' · Gmail was sent' : ''}</p>
              </div>
            </div>
            <p className="text-sm text-[#3A3A3C] dark:text-[#D1D1D6] leading-relaxed">
              Globe, Smart and DITO have not approved the sender name <b>{SENDER_ID}</b> yet. Every SMS provider needs this to stop text scams.
            </p>
            <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-4 py-3 text-sm text-[#1D1D1F] dark:text-white">
              <p>{`Requested: ${requested} · ${DAYS_MIN}–${DAYS_MAX} working days`}</p>
              <p className="font-semibold mt-0.5" data-wait>{waitLine}</p>
            </div>
            <p className="text-sm font-semibold text-[#1D1D1F] dark:text-white">Text the parent from your own phone for now?</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={skip} className="px-4 py-2 rounded-full text-sm font-semibold text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-black/[0.05] dark:hover:bg-white/10">Not now</button>
              <button type="button" onClick={() => setStep('send')} autoFocus className="px-5 py-2 rounded-full text-sm font-semibold bg-[#007AFF] text-white hover:bg-[#0066D6]">Continue with my phone</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4" data-step="send">
            <div>
              <h2 id="smsfb-title" className="text-lg font-bold text-[#1D1D1F] dark:text-white">
                {needSmsChoice ? 'Text from your own phone' : allGood ? 'Message sent to parent' : 'Some messages did not go out'}
              </h2>
              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                {needSmsChoice ? 'Then pick below what happened so the record is right.' : `To ${cur.parentName}. Check the record below, then tap Done.`}
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              {/* LEFT: SMS (3 × 3 in) */}
              <div className="w-[3in] flex flex-col gap-2">
                <div className={`w-[3in] h-[3in] rounded-2xl border border-black/10 dark:border-white/15 p-3 flex flex-col ${needSmsChoice ? 'items-center text-center' : ''}`} data-card="sms">
                  <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-1.5"><MessageSquareText className="w-4 h-4 text-[#007AFF]" aria-hidden="true" /> SMS</p>
                  {needSmsChoice ? (
                    <>
                      <div className="my-1.5"><Qr text={qrSms(cur.phone, cur.smsText)} size={196} /></div>
                      <p className="text-[12px] text-[#3A3A3C] dark:text-[#D1D1D6] leading-snug">Scan with your phone camera, then tap Send.</p>
                      <button type="button" onClick={() => { void navigator.clipboard?.writeText(cur.smsText).then(() => setCopied(true)).catch(() => {}); }} className="mt-auto text-[11px] font-semibold text-[#007AFF] dark:text-[#0A84FF] hover:underline" data-copy-sms>
                        {copied ? 'Message copied' : `Not opening? Copy the message · ${cur.phone}`}
                      </button>
                    </>
                  ) : cur.smsOk === null ? (
                    <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] m-auto text-center">No SMS was sent (Gmail only was chosen).</p>
                  ) : badNumber ? (
                    <>
                      {status(false, '', 'Not sent: wrong mobile number')}
                      <p className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{cur.phone || 'No number'}</p>
                      <p className="mt-2 text-[12px] text-[#3A3A3C] dark:text-[#D1D1D6]">Fix the parent's number in the student record (09 + 9 digits), then send again.</p>
                    </>
                  ) : (
                    <>
                      {status(true, 'Sent by SMS', '')}
                      <p className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">To {cur.phone}</p>
                      {textBox(cur.smsText)}
                    </>
                  )}
                </div>
                {needSmsChoice && (
                  <>
                    <button type="button" onClick={() => setSms('sent')} className={opt(sms === 'sent')} data-sms-choice="sent">{dot(sms === 'sent')}I scanned it and sent it from my own number</button>
                    <button type="button" onClick={() => setSms('not')} className={opt(sms === 'not')} data-sms-choice="not">{dot(sms === 'not')}I did not send it</button>
                  </>
                )}
                {smsSentBySystem && <p className={opt(true) + ' cursor-default'} data-sms-record>{dot(true)}Record: SMS sent by the system</p>}
              </div>
              {/* RIGHT: Gmail (3 × 3 in) */}
              <div className="w-[3in] flex flex-col gap-2">
                <div className="w-[3in] h-[3in] rounded-2xl border border-black/10 dark:border-white/15 p-3 flex flex-col" data-card="gmail">
                  <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-1.5"><Mail className="w-4 h-4 text-[#007AFF]" aria-hidden="true" /> Gmail</p>
                  {cur.emailOk === null ? (
                    <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] m-auto text-center">No Gmail was sent (the parent has no email, or SMS only was chosen).</p>
                  ) : (
                    <>
                      {status(cur.emailOk, 'Sent to Gmail', 'Gmail did not go out')}
                      <p className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6] truncate" title={cur.email}>To {cur.email}</p>
                      {textBox(cur.message)}
                    </>
                  )}
                </div>
                {cur.emailOk !== null && <p className={opt(true) + ' cursor-default'} data-mail-record>{dot(true)}{cur.emailOk ? 'Record: Gmail sent' : 'Record: Gmail not sent'}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              {needSmsChoice ? (
                <button type="button" onClick={() => setStep('why')} className="px-4 py-2 rounded-full text-sm font-semibold text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-black/[0.05] dark:hover:bg-white/10">Back</button>
              ) : <span />}
              <div className="flex items-center gap-3">
                {needSmsChoice && sms === null && <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">First pick if the SMS was sent.</span>}
                <button type="button" disabled={needSmsChoice && sms === null} onClick={save} autoFocus={!needSmsChoice} className="px-5 py-2 rounded-full text-sm font-semibold bg-[#007AFF] text-white hover:bg-[#0066D6] disabled:opacity-40" data-save>
                  {needSmsChoice ? 'Save' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
