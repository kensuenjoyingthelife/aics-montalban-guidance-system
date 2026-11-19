// Before the parent summons (Step 4): make sure the office can actually reach the parent.
// 1) Mobile number is REQUIRED and must be 09 + 9 more digits (11 in all). No way around it: no number = no SMS.
// 2) Gmail is optional: ask once. "No record" is remembered for this student; "Yes" saves it to the student's record.
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Mail } from 'lucide-react';

const digits = (s: string) => (s || '').replace(/\D/g, '');
/** plain words for what is wrong with the number (empty = OK) */
export function phoneProblem(raw: string, tl: boolean): string {
  const d = digits(raw);
  if (!raw.trim()) return tl ? 'Wala pang numero.' : 'No number yet.';
  if (/[^\d\s-]/.test(raw)) return tl ? 'Numero lang ang ilagay (0–9).' : 'Use numbers only (0–9).';
  if (!d.startsWith('09')) return tl ? 'Dapat magsimula sa 09.' : 'It must start with 09.';
  if (d.length < 11) return tl ? `Kulang ng ${11 - d.length} digit (dapat 11).` : `${11 - d.length} digit(s) missing (needs 11).`;
  if (d.length > 11) return tl ? `Sobra ng ${d.length - 11} digit (dapat 11).` : `${d.length - 11} digit(s) too many (needs 11).`;
  return '';
}
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
const NO_EMAIL_KEY = 'aics_no_parent_email_v1';
const noEmailList = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(NO_EMAIL_KEY) || '[]');
  } catch {
    return [];
  }
};

export const ParentContactGate: React.FC<{
  studentNumber: string;
  studentName: string;
  parentName?: string;
  phone: string;
  email: string;
  isTl: boolean;
  onSave: (phone: string, email: string) => Promise<boolean>;
}> = ({ studentNumber, studentName, parentName, phone, email, isTl, onSave }) => {
  const [noEmail, setNoEmail] = useState<boolean>(() => noEmailList().includes(studentNumber));
  const needPhone = !!phoneProblem(phone, isTl);
  const askEmail = !email.trim() && !noEmail;
  const [ph, setPh] = useState(phone);
  const [em, setEm] = useState('');
  const [emailMode, setEmailMode] = useState<'ask' | 'input'>('ask');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const phErr = useMemo(() => phoneProblem(ph, isTl), [ph, isTl]);

  if (!needPhone && !askEmail) return null;

  const save = async (withEmail: string) => {
    setSaving(true);
    setErr('');
    const ok = await onSave(digits(ph).replace(/^(\d{4})(\d{3})(\d{4})$/, '$1-$2-$3'), withEmail);
    setSaving(false);
    if (!ok) setErr(isTl ? 'Hindi na-save. I-check ang internet, tapos subukan ulit.' : 'Not saved. Check the internet, then try again.');
    return ok;
  };
  const markNoEmail = () => {
    try {
      localStorage.setItem(NO_EMAIL_KEY, JSON.stringify([...new Set([...noEmailList(), studentNumber])]));
    } catch {
      /* still hidden for this session */
    }
    setNoEmail(true);
  };
  const input =
    'w-full h-11 px-3.5 rounded-xl border bg-white dark:bg-[#1C1C1E] text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none';

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="pcg-title" className="w-full max-w-md ring-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className={`w-11 h-11 rounded-2xl tile-grad ${needPhone ? 'tile-rose' : 'tile-blue'} text-white flex items-center justify-center shrink-0`}>
            {needPhone ? <Phone className="w-5 h-5" aria-hidden /> : <Mail className="w-5 h-5" aria-hidden />}
          </span>
          <div>
            <h3 id="pcg-title" className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {needPhone
                ? isTl ? 'Kailangan ang numero ng magulang' : 'The parent’s mobile number is needed'
                : isTl ? 'Alam mo ba ang Gmail ng magulang?' : 'Do you know the parent’s Gmail?'}
            </h3>
            <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
              {parentName ? `${parentName} · ` : ''}
              {studentName}
            </p>
          </div>
        </div>

        {needPhone ? (
          <>
            <p className="text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
              {isTl
                ? 'Hindi maipapadala ang patawag kung walang tamang numero. Mase-save ito sa record ng estudyante.'
                : 'The summons cannot be sent without a correct number. It is saved to the student’s record.'}
            </p>
            <label className="block space-y-1">
              <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Mobile number ng magulang' : 'Parent mobile number'}</span>
              <input
                autoFocus
                inputMode="numeric"
                value={ph}
                onChange={(e) => setPh(e.target.value.slice(0, 16))}
                placeholder="09XX-XXX-XXXX"
                className={`${input} tabular-nums ${phErr ? 'border-rose-400 focus:border-rose-500' : 'border-emerald-400 focus:border-emerald-500'}`}
              />
              <span className={`block text-[12px] ${phErr ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {phErr || (isTl ? 'Tama ang numero.' : 'The number looks right.')}
              </span>
            </label>
          </>
        ) : emailMode === 'ask' ? (
          <p className="text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
            {isTl
              ? 'Opsyonal ito. Kung meron, makakatanggap din ang magulang ng email bukod sa SMS.'
              : 'This is optional. If you have it, the parent also gets an email besides the SMS.'}
          </p>
        ) : (
          <label className="block space-y-1">
            <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Gmail</span>
            <input
              autoFocus
              type="email"
              value={em}
              onChange={(e) => setEm(e.target.value.slice(0, 120))}
              placeholder="pangalan@gmail.com"
              className={`${input} ${em && !emailOk(em) ? 'border-rose-400' : 'border-[#E5E5EA] dark:border-white/10 focus:border-[#007AFF]'}`}
            />
            {em && !emailOk(em) && <span className="block text-[12px] text-rose-700 dark:text-rose-300">{isTl ? 'Hindi tama ang ayos ng email (hal. pangalan@gmail.com).' : 'Not a valid email (e.g. name@gmail.com).'}</span>}
          </label>
        )}

        {err && <p className="text-[12px] text-rose-700 dark:text-rose-300">{err}</p>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {needPhone ? (
            <button type="button" disabled={!!phErr || saving} onClick={() => void save(email)} className="btn-lit h-10 px-5 text-[13px] font-semibold disabled:opacity-40">
              {saving ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? 'I-save at ituloy' : 'Save and continue'}
            </button>
          ) : emailMode === 'ask' ? (
            <>
              <button type="button" onClick={markNoEmail} className="h-10 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                {isTl ? 'Walang record' : 'No record'}
              </button>
              <button type="button" onClick={() => setEmailMode('input')} className="btn-lit h-10 px-5 text-[13px] font-semibold">
                {isTl ? 'Oo, ilalagay ko' : 'Yes, I’ll enter it'}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEmailMode('ask')} className="h-10 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                {isTl ? 'Bumalik' : 'Back'}
              </button>
              <button type="button" disabled={!emailOk(em) || saving} onClick={() => void save(em.trim())} className="btn-lit h-10 px-5 text-[13px] font-semibold disabled:opacity-40">
                {saving ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? 'I-save ang Gmail' : 'Save Gmail'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
