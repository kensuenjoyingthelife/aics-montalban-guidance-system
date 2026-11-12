// Student Statement Station (manuscript: "a locked screen of the desktop application, opened by a staff
// member for one case, where a student types his or her own written statement; it shows only the statement
// form and closes after submission").
// - Covers the whole app; the rest of the app is made inert (no Tab, no clicks behind it).
// - Blocks Esc, refresh, print, back and dev keys; in Tauri it goes full screen and the window cannot be closed.
// - Only the staff PIN unlocks it (to leave early, or after the student is done).
// - The student sees only their own name and grade — never the offense, other students or any record.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { checkPin } from '../../services/appConfig';

export interface StationStatement {
  text: string;
}

const inTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const MIN_WHAT = 20;

/** The text saved on the case (plain labels so it prints well on every form). */
export function composeStatement(f: { what: string; when: string; where: string; who: string }): string {
  const parts = [`What happened: ${f.what.trim()}`];
  if (f.when.trim()) parts.push(`When: ${f.when.trim()}`);
  if (f.where.trim()) parts.push(`Where: ${f.where.trim()}`);
  if (f.who.trim()) parts.push(`Who was involved / saw it: ${f.who.trim()}`);
  parts.push('(Typed by the student at the Statement Station and marked as true by the student.)');
  return parts.join('\n');
}

export const StatementStation: React.FC<{
  studentName: string;
  gradeSection: string;
  isTl: boolean;
  /** save the statement; resolves true when saved */
  onSubmit: (s: StationStatement) => Promise<boolean>;
  /** staff unlocked the station (PIN was right) */
  onClose: () => void;
}> = ({ studentName, gradeSection, isTl, onSubmit, onClose }) => {
  const [what, setWhat] = useState('');
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [who, setWho] = useState('');
  const [truthful, setTruthful] = useState(false);
  const [phase, setPhase] = useState<'write' | 'saving' | 'done'>('write');
  const [error, setError] = useState('');
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState('');
  const [wrongTries, setWrongTries] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const firstField = useRef<HTMLTextAreaElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);
  const t = (en: string, tl: string) => (isTl ? tl : en);

  // lock: inert app, blocked keys, full screen + no closing in Tauri
  useEffect(() => {
    // everything on the page except the station becomes inert (also popups that live outside #root)
    const made: Element[] = [];
    Array.from(document.body.children).forEach((el) => {
      if (el.hasAttribute('data-statement-station') || el.hasAttribute('inert')) return;
      el.setAttribute('inert', '');
      made.push(el);
    });
    const blockKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const blocked =
        k === 'escape' ||
        k === 'f5' ||
        k === 'f11' ||
        k === 'f12' ||
        k === 'browserback' ||
        (e.altKey && (k === 'arrowleft' || k === 'arrowright' || k === 'home')) ||
        (ctrl && ['r', 'w', 'p', 'n', 't', 'o', 's', 'f', 'g', 'j', 'u', 'l', '+', '-', '=', '0'].includes(k)) ||
        (ctrl && e.shiftKey && ['i', 'j', 'c', 'r'].includes(k));
      if (blocked) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const blockMenu = (e: MouseEvent) => e.preventDefault();
    const blockLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('keydown', blockKey, true);
    window.addEventListener('contextmenu', blockMenu, true);
    window.addEventListener('beforeunload', blockLeave);
    let unlistenClose: (() => void) | undefined;
    let cancelled = false;
    if (inTauri()) {
      void import('@tauri-apps/api/window')
        .then(async ({ getCurrentWindow }) => {
          const w = getCurrentWindow();
          await w.setFullscreen(true).catch(() => undefined);
          const un = await w.onCloseRequested((ev) => ev.preventDefault());
          if (cancelled) un();
          else unlistenClose = un;
        })
        .catch(() => undefined);
    }
    setTimeout(() => firstField.current?.focus(), 50);
    return () => {
      cancelled = true;
      made.forEach((el) => el.removeAttribute('inert'));
      window.removeEventListener('keydown', blockKey, true);
      window.removeEventListener('contextmenu', blockMenu, true);
      window.removeEventListener('beforeunload', blockLeave);
      unlistenClose?.();
      if (inTauri()) {
        void import('@tauri-apps/api/window')
          .then(({ getCurrentWindow }) => getCurrentWindow().setFullscreen(false))
          .catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (unlockOpen) setTimeout(() => pinRef.current?.focus(), 30);
  }, [unlockOpen]);

  const whatLen = what.trim().length;
  const canSend = whatLen >= MIN_WHAT && truthful && phase === 'write';

  const submit = async () => {
    if (!canSend) return;
    setPhase('saving');
    setError('');
    const ok = await onSubmit({ text: composeStatement({ what, when, where, who }) });
    if (ok) setPhase('done');
    else {
      setPhase('write');
      setError(t('Your statement was not saved. Please tell the Guidance staff (the internet may be off). Your writing is still here.', 'Hindi na-save ang statement mo. Pakisabi sa Guidance staff (baka walang internet). Nandito pa rin ang isinulat mo.'));
    }
  };

  const tryUnlock = async () => {
    const wait = Math.ceil((waitUntil - Date.now()) / 1000);
    if (wait > 0) return setPinErr(t(`Too many wrong tries. Wait ${wait} seconds.`, `Sobrang daming maling subok. Maghintay ng ${wait} segundo.`));
    if (!/^\d{6}$/.test(pin)) return setPinErr(t('Enter the 6-digit staff PIN.', 'Ilagay ang 6-digit na PIN ng staff.'));
    if (await checkPin(pin)) return onClose();
    const tries = wrongTries + 1;
    setWrongTries(tries);
    setPin('');
    if (tries % 5 === 0) {
      setWaitUntil(Date.now() + 60000);
      setPinErr(t('5 wrong tries. The PIN is locked for 1 minute.', '5 maling subok. Naka-lock ang PIN nang 1 minuto.'));
    } else setPinErr(t('Wrong PIN. Only the Guidance staff can unlock this screen.', 'Mali ang PIN. Ang Guidance staff lang ang makakapag-unlock nito.'));
  };

  const label = 'block text-sm font-extrabold text-[#0B1F4D] dark:text-white mb-1';
  const hint = 'text-xs text-[#4A608A] dark:text-[#94A8D0]';
  const field = 'w-full px-3 py-2.5 rounded-xl border border-[#C9D6EC] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-[15px] text-[#0B1F4D] dark:text-white focus:outline-none focus:ring-4 focus:ring-[#1E469B]/25';

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t('Student Statement Station', 'Student Statement Station')} data-statement-station className="fixed inset-0 z-[10000] bg-[#EEF3FC] dark:bg-[#070F1F] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-3">
        <div className="w-full max-w-[760px] rounded-3xl bg-white dark:bg-[#0F1D38] border border-[#D3DDEE] dark:border-[#1E3158] shadow-2xl">
          <header className="px-7 pt-5 pb-3 border-b border-[#DCE5F2] dark:border-[#1E3158] flex items-center gap-3">
            <img src="/aics-logo.jpg" alt="" className="w-11 h-11 rounded-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#4A608A] dark:text-[#94A8D0]">AICS Montalban · Guidance Office</p>
              <h1 className="text-xl font-extrabold text-[#0B1F4D] dark:text-white">{t('My Written Statement', 'Ang Aking Salaysay')}</h1>
            </div>
          </header>

          {phase !== 'done' ? (
            <div className="px-7 py-4 space-y-3">
              <p className="text-sm text-[#0B1F4D] dark:text-white">
                <b>{studentName}</b> · {gradeSection}
                <br />
                <span className={hint}>{t('Write in your own words, in English or Filipino. Take your time. Only the Guidance Office will read this.', 'Isulat sa sarili mong salita, sa Ingles o Filipino. Huwag magmadali. Ang Guidance Office lang ang makakabasa nito.')}</span>
              </p>
              <label className="block">
                <span className={label}>1. {t('What happened?', 'Ano ang nangyari?')} <span className="text-red-600">*</span></span>
                <textarea ref={firstField} data-station-what value={what} onChange={(e) => setWhat(e.target.value.slice(0, 2000))} rows={5} className={`${field} leading-relaxed`} placeholder={t('Tell what happened from the start…', 'Ikuwento ang nangyari mula sa simula…')} />
                <span className={hint}>{whatLen < MIN_WHAT ? t(`Write at least ${MIN_WHAT} letters (${whatLen} so far).`, `Sumulat ng kahit ${MIN_WHAT} letra (${whatLen} pa lang).`) : `${what.length}/2000`}</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>2. {t('When did it happen?', 'Kailan ito nangyari?')}</span>
                  <input data-station-when value={when} onChange={(e) => setWhen(e.target.value.slice(0, 120))} className={field} placeholder={t('e.g. Monday, lunch break', 'hal. Lunes, lunch break')} />
                </label>
                <label className="block">
                  <span className={label}>3. {t('Where did it happen?', 'Saan ito nangyari?')}</span>
                  <input data-station-where value={where} onChange={(e) => setWhere(e.target.value.slice(0, 120))} className={field} placeholder={t('e.g. 2nd floor hallway', 'hal. hallway sa 2nd floor')} />
                </label>
              </div>
              <label className="block">
                <span className={label}>4. {t('Who was involved or saw it?', 'Sino ang kasama o nakakita?')}</span>
                <input data-station-who value={who} onChange={(e) => setWho(e.target.value.slice(0, 300))} className={field} placeholder={t('Names, if you know them (optional)', 'Mga pangalan, kung alam mo (hindi required)')} />
              </label>
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[#F4F7FC] dark:bg-[#0B1527] border border-[#D3DDEE] dark:border-[#253B66] cursor-pointer">
                <input type="checkbox" data-station-true checked={truthful} onChange={(e) => setTruthful(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#1E469B]" />
                <span className="text-sm text-[#0B1F4D] dark:text-white">{t('I declare that everything I wrote is true, to the best of my knowledge.', 'Pinapatunayan ko na totoo ang lahat ng isinulat ko, sa abot ng aking kaalaman.')}</span>
              </label>
              {error && (
                <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-xl">
                  ⚠️ {error}
                </p>
              )}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button type="button" data-station-staff onClick={() => setUnlockOpen(true)} className="text-xs font-bold text-[#4A608A] dark:text-[#94A8D0] underline underline-offset-2">
                  {t('Staff: stop without saving', 'Staff: ihinto nang hindi sine-save')}
                </button>
                <button type="button" data-station-submit disabled={!canSend} onClick={() => void submit()} className="px-6 py-3 rounded-xl bg-[#1E469B] text-white text-sm font-extrabold whitespace-nowrap disabled:opacity-50">
                  {phase === 'saving' ? t('Saving…', 'Sine-save…') : t('Submit my statement', 'Ipasa ang aking salaysay')}
                </button>
              </div>
              {!canSend && phase === 'write' && (
                <p className={`${hint} text-right`} data-station-why>
                  {whatLen < MIN_WHAT ? t('To submit: answer question 1.', 'Para maipasa: sagutin ang tanong 1.') : t('To submit: tick the box that your statement is true.', 'Para maipasa: i-check ang kahon na totoo ang salaysay mo.')}
                </p>
              )}
            </div>
          ) : (
            <div className="px-7 py-10 text-center space-y-3" data-station-done>
              <p className="text-5xl" aria-hidden>✅</p>
              <h2 className="text-xl font-extrabold text-[#0B1F4D] dark:text-white">{t('Thank you. Your statement was sent to the Guidance Office.', 'Salamat. Naipadala na ang salaysay mo sa Guidance Office.')}</h2>
              <p className="text-sm text-[#4A608A] dark:text-[#94A8D0]">{t('Please give the computer back to the Guidance staff.', 'Pakibalik ang computer sa Guidance staff.')}</p>
              <button type="button" data-station-staff onClick={() => setUnlockOpen(true)} className="mt-2 px-5 py-2.5 rounded-xl border border-[#C9D6EC] dark:border-[#253B66] text-sm font-bold text-[#1E469B] dark:text-[#7CB8F7]">
                🔒 {t('Staff: unlock', 'Staff: i-unlock')}
              </button>
            </div>
          )}
        </div>
        <p className="mt-3 text-[11px] text-[#4A608A] dark:text-[#94A8D0]">🔒 {t('This screen is locked. Only the Guidance staff can close it.', 'Naka-lock ang screen na ito. Ang Guidance staff lang ang makakapagsara nito.')}</p>
      </div>

      {unlockOpen && (
        <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center px-4" data-station-unlock>
          <div className="w-full max-w-[360px] rounded-2xl bg-white dark:bg-[#0F1D38] p-6 space-y-3 shadow-2xl">
            <h2 className="text-lg font-extrabold text-[#0B1F4D] dark:text-white">{t('Staff PIN', 'PIN ng staff')}</h2>
            <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
              {phase === 'done'
                ? t('Enter the 6-digit app PIN to go back to the case.', 'Ilagay ang 6-digit na PIN ng app para bumalik sa kaso.')
                : t('Enter the 6-digit app PIN to stop. What the student wrote will not be saved.', 'Ilagay ang 6-digit na PIN ng app para ihinto. Hindi mase-save ang isinulat ng estudyante.')}
            </p>
            <input
              ref={pinRef}
              data-station-pin
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                setPinErr('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && void tryUnlock()}
              className={`${field} tracking-[0.5em] text-center text-lg`}
              aria-label={t('Staff PIN', 'PIN ng staff')}
            />
            {pinErr && <p role="alert" className="text-xs font-bold text-red-700 dark:text-red-300">{pinErr}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setUnlockOpen(false); setPin(''); setPinErr(''); }} className="px-4 py-2 rounded-lg text-xs font-bold border border-[#C9D6EC] dark:border-[#253B66] text-[#4A608A] dark:text-[#94A8D0]">
                {t('Back', 'Bumalik')}
              </button>
              <button type="button" data-station-unlock-go onClick={() => void tryUnlock()} className="px-4 py-2 rounded-lg text-xs font-bold bg-[#1E469B] text-white">
                {t('Unlock', 'I-unlock')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};
