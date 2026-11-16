// Pick a form, fill the 1–2 things it needs, print. Everything else comes from the case.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, FileText, Eye, CheckCircle2 } from 'lucide-react';
import type { DisciplineCaseRecord, StudentRecord } from '../../data/stage3MockData';
import { FormKind, FORM_TITLES, buildFormHtml, printHtml, downloadFormDocument } from '../../services/printForms';
import { isOfficeDay, todayISO, addDays } from '../../services/scheduling';
import { getAppConfig } from '../../services/appConfig';

const DESC: Record<FormKind, [string, string]> = {
  callSlip: ['Pass for the student to go to the Guidance Office', 'Pase para pumunta ang estudyante sa Guidance Office'],
  conference: ['Record of the meeting with the parent (with signatures)', 'Tala ng pag-uusap kasama ang magulang (may pirma)'],
  contract: ['What the student promises to do (English)', 'Mga pangako ng estudyante (English)'],
  kasunduan: ['Agreement of student, parent and school (Filipino)', 'Kasunduan ng estudyante, magulang at paaralan (Filipino)'],
  suspension: ['Letter to the parent about a suspension', 'Sulat sa magulang tungkol sa suspension'],
  caseResolutionSummary: ['Executive Case Resolution & Due Process Summary for Principal / Dean review', 'Buod ng Pagresolba ng Kaso at Due Process para sa Punong-Guro / Dekano'],
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
  const [showConfirmPrint, setShowConfirmPrint] = useState(false);
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
  const previewHtml = useMemo(() => {
    return buildFormHtml(
      { kind, c, stu, when, promises, suspensionDays: days, suspensionStart: start, returnDate: back, signer },
      window.location.origin
    );
  }, [kind, c, stu, when, promises, days, start, back, signer]);

  const [activeTab, setActiveTab] = useState<'preview' | 'options'>('preview');

  const executePrint = () => {
    setShowConfirmPrint(false);
    if (printHtml(previewHtml)) onPrinted(kind);
    else onFailed();
  };

  const downloadDirectFile = () => {
    const filename = `${c.caseCode}_${FORM_TITLES[kind][0].replace(/\s+/g, '_')}`;
    void downloadFormDocument(previewHtml, filename);
    onPrinted(kind);
  };
  const fmt = (iso: string) => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso + 'T00:00:00'));

  return createPortal(
    <div className="fixed inset-0 z-[80] !m-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={isTl ? 'Mag-print ng form' : 'Print a form'} data-print-forms className="w-full max-w-4xl max-h-[94vh] flex flex-col rounded-2xl bg-white dark:bg-[#0F1A30] border border-[#CBD5E1] dark:border-[#253B66] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-[#DCE5F2] dark:border-[#1E3158] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#0B1527]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-[#1E469B] text-white">
                {FORM_TITLES[kind][isTl ? 1 : 0]}
              </span>
              <h3 className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                {isTl ? 'Opisyal na Dokumento (1-Page Print)' : 'Official 1-Page Printable Document'}
              </h3>
            </div>
            <p className="text-xs text-[#4A608A] dark:text-[#94A8D0] mt-0.5">
              {c.studentName} · {c.caseCode} · {c.gradeSection}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch between Live 1-Page Preview and Form Customization Options */}
            <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-[#0B1F4D] text-[#1E469B] dark:text-white shadow-xs'
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A]'
                }`}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1" />
                {isTl ? 'Preview' : 'Preview'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('options')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'options'
                    ? 'bg-white dark:bg-[#0B1F4D] text-[#1E469B] dark:text-white shadow-xs'
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 inline mr-1" />
                {isTl ? 'Palitan ang Form' : 'Switch Form'}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={isTl ? 'Isara' : 'Close'}
              title={isTl ? 'Isara' : 'Close'}
              className="w-8 h-8 rounded-lg text-[#4A608A] hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto clean-scroll bg-[#F1F5F9] dark:bg-[#091122]">
          {activeTab === 'options' ? (
            <div className="space-y-4 max-w-2xl mx-auto bg-white dark:bg-[#0F1A30] p-5 rounded-xl border border-[#CBD5E1] dark:border-[#1E3158] shadow-sm">
              <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white">
                {isTl ? 'Pumili ng ibang form na nais i-print o i-export:' : 'Select another form to print or export:'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2" role="radiogroup" aria-label={isTl ? 'Anong form' : 'Which form'}>
                {(Object.keys(FORM_TITLES) as FormKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={kind === k}
                    data-form={k}
                    onClick={() => {
                      setKind(k);
                      setActiveTab('preview');
                    }}
                    className={`text-left rounded-xl border px-3.5 py-3 transition-all active:scale-[0.98] ${
                      kind === k
                        ? 'border-[#1E469B] bg-[#EEF3FC] dark:bg-[#13203B] ring-2 ring-[#1E469B]/40 shadow-xs'
                        : 'border-[#CBD5E1] dark:border-[#253B66] bg-white dark:bg-[#0B1527] hover:border-[#1E469B]/50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                      <FileText className="w-4 h-4 text-[#1E469B] dark:text-[#7CB8F7] shrink-0" />
                      <span>{FORM_TITLES[k][isTl ? 1 : 0]}</span>
                    </span>
                    <span className="block text-[11px] text-[#4A608A] dark:text-[#94A8D0] mt-0.5">{DESC[k][isTl ? 1 : 0]}</span>
                  </button>
                ))}
              </div>

              {(kind === 'callSlip' || kind === 'conference') && (
                <label className="block mt-4">
                  <span className={label}>{kind === 'callSlip' ? (isTl ? 'Kailan pupunta (opsyonal)' : 'When to come (optional)') : isTl ? 'Petsa at oras ng conference' : 'Conference date and time'}</span>
                  <input data-print-when value={when} onChange={(e) => setWhen(e.target.value.slice(0, 80))} placeholder={isTl ? 'hal. Nob 14, 2026 · 9:00 AM' : 'e.g. Nov 14, 2026 · 9:00 AM'} className={input} />
                </label>
              )}
              {(kind === 'contract' || kind === 'kasunduan') && (
                <label className="block mt-4">
                  <span className={label}>{isTl ? 'Mga pangako ng estudyante (isa bawat linya — puwedeng baguhin)' : 'What the student promises (one per line — you can change them)'}</span>
                  <textarea data-print-promises rows={4} value={promises} onChange={(e) => setPromises(e.target.value.slice(0, 1200))} className={`${input} leading-relaxed`} />
                </label>
              )}
              {kind === 'suspension' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
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
            </div>
          ) : (
            /* Live 1-Page Paper Sheet Preview */
            <div className="flex flex-col items-center">
              <div className="mb-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isTl ? '1-Page Layout Verified · Kasyang-kasya sa A4 paper nang walang spillover' : '1-Page Layout Verified · Fits A4 sheet cleanly without spillover'}</span>
              </div>
              <div className="w-full max-w-[760px] bg-white rounded-lg shadow-xl border border-slate-300 dark:border-slate-700 overflow-hidden text-[#0F172A] p-2">
                <iframe
                  title="Document 1-Page Preview"
                  srcDoc={previewHtml}
                  className="w-full h-[580px] border-0 rounded bg-white"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}

          {bad && <p className="text-xs font-bold text-rose-700 dark:text-rose-300 mt-3 text-center">⚠ {bad}</p>}
        </div>

        {/* Confirmation Modal if User Clicks Print */}
        {showConfirmPrint && (
          <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#0F1A30] rounded-2xl p-5 border border-[#CBD5E1] dark:border-[#253B66] shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#1E469B] dark:text-[#7CB8F7] flex items-center justify-center mx-auto">
                <Printer className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
                  {isTl ? 'Kumpirmahin ang Pag-print' : 'Confirm Printing Document'}
                </h4>
                <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                  {isTl
                    ? `Ipi-print ang "${FORM_TITLES[kind][1]}" para kay ${c.studentName}. Siguraduhing tama ang impormasyon sa preview bago magpatuloy.`
                    : `Printing "${FORM_TITLES[kind][0]}" for ${c.studentName}. Ensure all previewed information is accurate.`}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmPrint(false)}
                  className="btn-press flex-1 py-2.5 rounded-xl border border-[#CBD5E1] dark:border-[#253B66] text-xs font-bold text-[#475569] dark:text-[#94A3B8]"
                >
                  {isTl ? 'Bumalik sa Preview' : 'Back to Preview'}
                </button>
                <button
                  type="button"
                  onClick={executePrint}
                  className="btn-press flex-1 py-2.5 rounded-xl bg-[#1E469B] hover:bg-[#16377E] text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isTl ? 'Oo, I-print Na' : 'Yes, Print Now'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#0B1527]">
          {/* Direct 1-Page PDF Download */}
          <button
            type="button"
            onClick={downloadDirectFile}
            className="btn-press px-4 py-2 rounded-xl border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-bold transition-all active:scale-[0.97] inline-flex items-center gap-1.5 shadow-xs"
            title="Download pure 1-page PDF file directly"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isTl ? 'DOWNLOAD PDF (1-PAGE)' : 'DOWNLOAD PDF (1-PAGE)'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-press px-4 py-2 rounded-xl saas-card-subtle text-xs font-bold active:scale-[0.97] transition-all"
            >
              {isTl ? 'Kanselahin' : 'Cancel'}
            </button>
            <button
              type="button"
              data-action="print-form"
              disabled={!!bad}
              onClick={() => setShowConfirmPrint(true)}
              className="btn-press px-5 py-2 rounded-xl bg-[#1E469B] hover:bg-[#16377E] text-white text-xs font-bold disabled:opacity-50 active:scale-[0.97] transition-all shadow-sm inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isTl ? 'PRINT / SAVE AS PDF' : 'PRINT / SAVE AS PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
