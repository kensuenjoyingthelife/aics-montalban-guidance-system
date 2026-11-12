// Pick a form, fill the 1–2 things it needs, print. Everything else comes from the case.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DisciplineCaseRecord, StudentRecord } from '../../data/stage3MockData';
import { FormKind, FORM_TITLES, buildFormHtml, printHtml } from '../../services/printForms';
import { isOfficeDay, todayISO, addDays } from '../../services/scheduling';

const DESC: Record<FormKind, [string, string]> = {
  callSlip: ['Pass for the student to go to the Guidance Office', 'Pase para pumunta ang estudyante sa Guidance Office'],
  conference: ['Record of the meeting with the parent (with signatures)', 'Tala ng pag-uusap kasama ang magulang (may pirma)'],
  contract: ['What the student promises to do (English)', 'Mga pangako ng estudyante (English)'],
  kasunduan: ['Agreement of student, parent and school (Filipino)', 'Kasunduan ng estudyante, magulang at paaralan (Filipino)'],
  suspension: ['Letter to the parent about a suspension', 'Sulat sa magulang tungkol sa suspension'],
};
const DEFAULT_PROMISES = 'Follow the school rules and the Student Handbook.\nRespect my teachers, classmates and school staff.\nReport to the Guidance Office when called.';
const DEFAULT_PROMISES_TL = 'Susundin ang mga patakaran ng paaralan at ng Student Handbook.\nIgagalang ang mga guro, kaklase at kawani ng paaralan.\nPupunta sa Guidance Office kapag tinawag.';

/** the school day after `days` school days starting at `start` (skips weekends and closed days) */
export function returnDateAfter(start: string, days: number): string {
  let d = start;
  let left = Math.max(1, days);
  while (left > 0) {
    if (isOfficeDay(d)) left--;
    d = addDays(d, 1);
  }
  while (!isOfficeDay(d)) d = addDays(d, 1);
  return d;
}

export const PrintFormsWindow: React.FC<{
  c: DisciplineCaseRecord;
  stu?: StudentRecord;
  isTl: boolean;
  conferenceWhen?: string;
  signer?: string;
  initial?: FormKind;
  onClose: () => void;
  onPrinted: (kind: FormKind) => void;
  onFailed: () => void;
}> = ({ c, stu, isTl, conferenceWhen, signer, initial, onClose, onPrinted, onFailed }) => {
  const [kind, setKind] = useState<FormKind>(initial ?? 'callSlip');
  const [when, setWhen] = useState(conferenceWhen ?? '');
  const [promises, setPromises] = useState('');
  const [days, setDays] = useState(3);
  const [start, setStart] = useState(() => {
    let d = addDays(todayISO(), 1);
    while (!isOfficeDay(d)) d = addDays(d, 1);
    return d;
  });
  useEffect(() => {
    setPromises(kind === 'kasunduan' ? DEFAULT_PROMISES_TL : DEFAULT_PROMISES);
  }, [kind]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const back = useMemo(() => (start ? returnDateAfter(start, days) : ''), [start, days]);
  const bad =
    kind === 'suspension' && !(days >= 1 && days <= 30)
      ? isTl ? 'Ang suspension ay 1 hanggang 30 araw.' : 'Suspension must be 1 to 30 days.'
      : kind === 'suspension' && !isOfficeDay(start)
      ? isTl ? 'Pumili ng araw na may pasok para sa simula.' : 'Pick a school day to start.'
      : (kind === 'contract' || kind === 'kasunduan') && !promises.trim()
      ? isTl ? 'Ilagay kahit isang pangako.' : 'Enter at least one promise.'
      : '';
  const input = 'w-full px-3 py-2 rounded-xl border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white';
  const label = 'block text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0] mb-1';
  const print = () => {
    const html = buildFormHtml(
      { kind, c, stu, when, promises, suspensionDays: days, suspensionStart: start, returnDate: back, signer },
      window.location.origin
    );
    if (printHtml(html)) onPrinted(kind);
    else onFailed();
  };
  const fmt = (iso: string) => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso + 'T00:00:00'));

  return createPortal(
    <div className="fixed inset-0 z-[80] !m-0 bg-black/50 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={isTl ? 'Mag-print ng form' : 'Print a form'} data-print-forms className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] shadow-2xl">
        <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Mag-print ng form' : 'Print a form'}</h3>
            <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
              {c.studentName} · {c.caseCode} · {isTl ? 'kusang napupunan mula sa kaso' : 'filled in from the case'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={isTl ? 'Isara' : 'Close'} title={isTl ? 'Isara' : 'Close'} className="w-8 h-8 rounded-lg text-[#4A608A] hover:bg-slate-100 dark:hover:bg-slate-800">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2" role="radiogroup" aria-label={isTl ? 'Anong form' : 'Which form'}>
            {(Object.keys(FORM_TITLES) as FormKind[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                data-form={k}
                onClick={() => setKind(k)}
                className={`text-left rounded-xl border px-3 py-2.5 ${kind === k ? 'border-[#1E469B] bg-[#EEF3FC] dark:bg-[#13203B] ring-1 ring-[#1E469B]/40' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}
              >
                <span className="block text-sm font-extrabold text-[#0B1F4D] dark:text-white">🖨 {FORM_TITLES[k][isTl ? 1 : 0]}</span>
                <span className="block text-[11px] text-[#4A608A] dark:text-[#94A8D0]">{DESC[k][isTl ? 1 : 0]}</span>
              </button>
            ))}
          </div>
          {(kind === 'callSlip' || kind === 'conference') && (
            <label className="block">
              <span className={label}>{kind === 'callSlip' ? (isTl ? 'Kailan pupunta (opsyonal)' : 'When to come (optional)') : isTl ? 'Petsa at oras ng conference' : 'Conference date and time'}</span>
              <input data-print-when value={when} onChange={(e) => setWhen(e.target.value.slice(0, 80))} placeholder={isTl ? 'hal. Nob 14, 2026 · 9:00 AM' : 'e.g. Nov 14, 2026 · 9:00 AM'} className={input} />
            </label>
          )}
          {(kind === 'contract' || kind === 'kasunduan') && (
            <label className="block">
              <span className={label}>{isTl ? 'Mga pangako ng estudyante (isa bawat linya — puwedeng baguhin)' : 'What the student promises (one per line — you can change them)'}</span>
              <textarea data-print-promises rows={4} value={promises} onChange={(e) => setPromises(e.target.value.slice(0, 1200))} className={`${input} leading-relaxed`} />
            </label>
          )}
          {kind === 'suspension' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label>
                <span className={label}>{isTl ? 'Ilang araw (may pasok)' : 'School days'}</span>
                <input type="number" min={1} max={30} data-print-days value={days} onChange={(e) => setDays(Number(e.target.value))} className={input} />
              </label>
              <label>
                <span className={label}>{isTl ? 'Simula' : 'Starts'}</span>
                <input type="date" data-print-start value={start} onChange={(e) => setStart(e.target.value)} className={input} />
              </label>
              <div>
                <span className={label}>{isTl ? 'Babalik sa klase' : 'Back in class'}</span>
                <p className="px-3 py-2 rounded-xl saas-card-subtle text-sm font-extrabold text-[#0B1F4D] dark:text-white" data-print-return>
                  {back ? fmt(back) : '—'}
                </p>
              </div>
            </div>
          )}
          {kind === 'suspension' && <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">{isTl ? 'Hindi binibilang ang Sabado, Linggo at mga araw na walang pasok sa Settings.' : 'Weekends and closed days from Settings are skipped.'}</p>}
          {bad && <p className="text-xs font-bold text-rose-700 dark:text-rose-300">⚠ {bad}</p>}
        </div>
        <div className="px-6 py-4 border-t border-[#DCE5F2] dark:border-[#1E3158] flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg saas-card-subtle text-xs font-bold">
            {isTl ? 'Kanselahin' : 'Cancel'}
          </button>
          <button type="button" data-action="print-form" disabled={!!bad} onClick={print} className="px-5 py-2.5 rounded-lg bg-[#1E469B] text-white text-xs font-bold disabled:opacity-50">
            🖨 {isTl ? `I-print ang ${FORM_TITLES[kind][1]}` : `Print ${FORM_TITLES[kind][0]}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
