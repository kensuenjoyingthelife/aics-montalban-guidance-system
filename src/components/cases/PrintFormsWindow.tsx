// Pick a form, fill the 1–2 things it needs, print. Everything else comes from the case.
import React, { useEffect, useMemo, useState } from 'react';
import { DateField } from '../ui/DateField';
import { createPortal } from 'react-dom';
import { Printer, Download, FileText, Eye, CheckCircle2 } from 'lucide-react';
import type { DisciplineCaseRecord, StudentRecord } from '../../data/stage3MockData';
import { FormKind, FORM_TITLES, buildFormHtml, printHtml, downloadFormDocument, defaultSignersFor, type SignRow } from '../../services/printForms';
import { Plus, X as XIcon } from 'lucide-react';
import { isOfficeDay, todayISO, addDays } from '../../services/scheduling';
import { getAppConfig, saveConfig } from '../../services/appConfig';

const DESC: Record<FormKind, [string, string]> = {
  callSlip: ['Pass for the student to go to the Guidance Office', 'Pase para pumunta ang estudyante sa Guidance Office'],
  studentStatement: ['Blank sheet for the student to write their side', 'Blankong papel para isulat ng estudyante ang kanyang panig'],
  witnessStatement: ['For the reporter or a witness (confidential, office only)', 'Para sa nag-ulat o testigo (confidential, office lang)'],
  parentLetter: ['Formal summons letter, no offense details (for the last summons)', 'Pormal na sulat ng patawag, walang detalye ng offense (sa huling patawag)'],
  conference: ['Record of the meeting with the parent (with signatures)', 'Tala ng pag-uusap kasama ang magulang (may pirma)'],
  contract: ['What the student promises to do (English)', 'Mga pangako ng estudyante (English)'],
  kasunduan: ['Agreement of student, parent and school (Filipino)', 'Kasunduan ng estudyante, magulang at paaralan (Filipino)'],
  suspension: ['Letter to the parent about a suspension', 'Sulat sa magulang tungkol sa suspension'],
  caseResolutionSummary: ['Summary of the case and its due process steps', 'Buod ng kaso at ng mga hakbang ng due process'],
  closedNotice: ['Tells the parent the matter is finished (no details)', 'Ipinaaalam sa magulang na tapos na ang usapin (walang detalye)'],
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
  // who signs: starts from the form + Settings › Signatories; add, edit or remove (max 6, 3 per row)
  const sigCfg = getAppConfig().signatories;
  const [rows, setRows] = useState<SignRow[]>([]);
  const [sigMsg, setSigMsg] = useState('');
  useEffect(() => {
    setRows(defaultSignersFor({ kind, c, stu, signer }));
    setSigMsg('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);
  const SUGGEST: SignRow[] = [
    { name: '', title: isTl ? 'Class Adviser' : 'Class Adviser' },
    { name: sigCfg?.principal || '', title: sigCfg?.principalTitle || 'School Principal' },
    { name: sigCfg?.guidanceCounselor || '', title: sigCfg?.guidanceCounselorTitle || 'Guidance Counselor' },
    { name: '', title: isTl ? 'Discipline Officer' : 'Discipline Officer' },
  ];
  const setRow = (i: number, patch: Partial<SignRow>) => { setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x))); setSigMsg(''); };
  const guidanceIdx = rows.findIndex((r) => r.name === (signer || sigCfg?.guidanceAssociate));
  const gRow = rows[guidanceIdx >= 0 ? guidanceIdx : 0];
  const sigChanged = !!gRow && (gRow.name.trim() !== (sigCfg?.guidanceAssociate || '') || gRow.title.trim() !== (sigCfg?.guidanceAssociateTitle || ''));
  const saveSigDefault = async () => {
    const g = rows[guidanceIdx >= 0 ? guidanceIdx : 0];
    if (!g) return;
    const ok = await saveConfig('signatories', { ...(sigCfg || {}), guidanceAssociate: g.name.trim(), guidanceAssociateTitle: g.title.trim() } as any);
    setSigMsg(ok ? (isTl ? 'Na-save. Ito na ang lalabas sa lahat ng form.' : 'Saved. All forms will use this now.') : isTl ? 'Hindi na-save. I-check ang internet.' : 'Not saved. Check the internet.');
  };
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
  const input = 'w-full h-10 px-3 rounded-xl border border-[#DDE3EC] dark:border-white/10 bg-white dark:bg-[#0A1526] text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#1E469B]';
  const label = 'block text-[12px] font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1';
  const previewHtml = useMemo(() => {
    return buildFormHtml(
      { kind, c, stu, when, promises, suspensionDays: days, suspensionStart: start, returnDate: back, signer, signRows: rows },
      window.location.origin
    );
  }, [kind, c, stu, when, promises, days, start, back, signer, rows]);

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
    <div className="fixed inset-0 z-[80] !m-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={isTl ? 'Mag-print ng form' : 'Print a form'} data-print-forms className="w-full max-w-4xl max-h-[94vh] flex flex-col rounded-[24px] bg-white dark:bg-[#0F1B2E] border border-black/[0.06] dark:border-white/10 shadow-[0_24px_80px_rgb(15_23_42/0.28)] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3 bg-white dark:bg-[#0F1B2E]">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-6 px-2.5 rounded-full inline-flex items-center text-[11px] font-semibold bg-gradient-to-r from-[#1E469B]/12 to-sky-500/12 text-[#1E469B] dark:text-[#7CB8F7]">
                {FORM_TITLES[kind][isTl ? 1 : 0]}
              </span>
              <h3 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {isTl ? 'Silipin bago i-print' : 'Check before printing'}
              </h3>
            </div>
            <p className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
              {c.studentName} · {c.caseCode} · {c.gradeSection}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch between Live 1-Page Preview and Form Customization Options */}
            <div className="seg-track p-0.5 inline-flex">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3.5 py-1.5 text-[12px] inline-flex items-center ${activeTab === 'preview' ? 'seg-on' : 'seg-off'}`}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1" />
                {isTl ? 'Preview' : 'Preview'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('options')}
                className={`px-3.5 py-1.5 text-[12px] inline-flex items-center ${activeTab === 'options' ? 'seg-on' : 'seg-off'}`}
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
              className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-white/[0.08] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.14] text-[#6E6E73] dark:text-[#A1A1A6] flex items-center justify-center text-[13px]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto clean-scroll bg-[#F5F5F7] dark:bg-[#0A1526]">
          {activeTab === 'options' ? (
            <div className="space-y-4 max-w-2xl mx-auto bg-white dark:bg-[#0F1B2E] p-5 rounded-2xl border border-[#DDE3EC] dark:border-white/10">
              <p className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {isTl ? 'Anong form ang ipi-print?' : 'Which form do you want to print?'}
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
                    className={`text-left rounded-2xl border px-3.5 py-3 transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] ${
                      kind === k
                        ? 'border-[#1E469B] bg-[#1E469B]/[0.06] dark:bg-[#7CB8F7]/10 dark:border-[#7CB8F7]'
                        : 'border-[#DDE3EC] dark:border-white/10 bg-white dark:bg-[#0F1B2E] hover:border-[#1E469B] hover:bg-[#1E469B]/[0.03]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      <FileText className="w-4 h-4 text-[#1E469B] dark:text-[#7CB8F7] shrink-0" />
                      <span>{FORM_TITLES[k][isTl ? 1 : 0]}</span>
                    </span>
                    <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">{DESC[k][isTl ? 1 : 0]}</span>
                  </button>
                ))}
              </div>

              {(kind === 'callSlip' || kind === 'conference' || kind === 'parentLetter') && (
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
                    <DateField value={start} onChange={setStart} isTl={isTl} ariaLabel={isTl ? 'Simula' : 'Start'} />
                  </label>
                  <div>
                    <span className={label}>{isTl ? 'Babalik sa klase' : 'Back in class'}</span>
                    <p className="px-3 py-2 rounded-xl bg-[#F5F5F7] dark:bg-white/[0.06] text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]" data-print-return>
                      {back ? fmt(back) : '—'}
                    </p>
                  </div>
                </div>
              )}
              {kind === 'suspension' && <p className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Hindi binibilang ang Sabado, Linggo at mga araw na walang pasok sa Settings.' : 'Weekends and closed days from Settings are skipped.'}</p>}
            </div>
          ) : (
            /* Live 1-Page Paper Sheet Preview */
            <div className="flex flex-col items-center">
              {/* who signs this form: edit here, it updates the preview right away */}
              <div className="w-full max-w-[760px] mb-3 rounded-2xl bg-white dark:bg-[#0F1B2E] border border-[#DDE3EC] dark:border-white/10 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Pipirma sa form' : 'Who signs this form'}</span>
                  <span className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Pwedeng palitan. Makikita agad sa preview.' : 'You can change it. The preview updates right away.'}</span>
                </div>
                <ul className="space-y-2">
                  {rows.map((r, i) => (
                    <li key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <input data-sig-name={i} value={r.name} onChange={(e) => setRow(i, { name: e.target.value.slice(0, 80) })} placeholder={isTl ? 'Pangalan (o iwang blangko)' : 'Name (or leave blank)'} aria-label={isTl ? 'Pangalan' : 'Name'} className={input} />
                      <input data-sig-title={i} value={r.title} onChange={(e) => setRow(i, { title: e.target.value.slice(0, 80) })} placeholder={isTl ? 'Posisyon' : 'Position'} aria-label={isTl ? 'Posisyon' : 'Position'} className={input} />
                      <button type="button" onClick={() => { setRows((x) => x.filter((_, j) => j !== i)); setSigMsg(''); }} title={isTl ? 'Alisin ang pipirma' : 'Remove signer'} aria-label={isTl ? 'Alisin' : 'Remove'} className="w-9 h-9 rounded-full flex items-center justify-center text-[#6E6E73] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                        <XIcon className="w-4 h-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                {rows.length < 6 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6] mr-1">{isTl ? 'Magdagdag:' : 'Add:'}</span>
                    {SUGGEST.map((s) => (
                      <button key={s.title} type="button" onClick={() => { setRows((x) => [...x, s].slice(0, 6)); setSigMsg(''); }} className="h-8 px-3 rounded-full text-[12px] font-medium text-[#1E469B] dark:text-[#7CB8F7] bg-[#1E469B]/[0.08] dark:bg-white/[0.08] hover:bg-[#1E469B]/[0.14] inline-flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" aria-hidden />
                        {s.title}
                      </button>
                    ))}
                    <button type="button" onClick={() => { setRows((x) => [...x, { name: '', title: '' }].slice(0, 6)); setSigMsg(''); }} className="h-8 px-3 rounded-full text-[12px] font-medium text-[#1E469B] dark:text-[#7CB8F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] inline-flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" aria-hidden />
                      {isTl ? 'Iba pa' : 'Other'}
                    </button>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Hanggang 6 na pipirma lang (3 bawat hanay).' : 'Up to 6 signers (3 per row).'}</p>
                )}
                {(sigChanged || sigMsg) && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">
                      {sigMsg || (isTl ? 'Para sa print na ito lang, maliban kung gawing default.' : 'For this print only, unless you make it the default.')}
                    </span>
                    {sigChanged && !sigMsg && (
                      <button type="button" onClick={() => void saveSigDefault()} className="h-9 px-4 rounded-full text-[13px] font-medium text-[#1E469B] dark:text-[#7CB8F7] bg-[#1E469B]/[0.08] dark:bg-white/[0.08] hover:bg-[#1E469B]/[0.14]">
                        {isTl ? 'Gawing default sa lahat ng form' : 'Make this the default for all forms'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="mb-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" aria-hidden />
                <span>{isTl ? 'Ganito ang lalabas sa A4 na papel' : 'This is how it prints on A4 paper'}</span>
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
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md ring-card p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl tile-grad tile-blue text-white flex items-center justify-center mx-auto">
                <Printer className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {isTl ? 'I-print na?' : 'Print now?'}
                </h4>
                <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">
                  {isTl
                    ? `Ipi-print ang "${FORM_TITLES[kind][1]}" para kay ${c.studentName}. Siguraduhing tama ang impormasyon sa preview bago magpatuloy.`
                    : `Printing "${FORM_TITLES[kind][0]}" for ${c.studentName}. Ensure all previewed information is accurate.`}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmPrint(false)}
                  className="flex-1 h-10 rounded-full text-[13px] font-medium text-[#1E469B] dark:text-[#7CB8F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                >
                  {isTl ? 'Bumalik' : 'Go back'}
                </button>
                <button
                  type="button"
                  onClick={executePrint}
                  className="btn-lit flex-1 h-10 text-[13px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isTl ? 'Oo, i-print' : 'Yes, print'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 bg-white/90 dark:bg-[#0F1B2E]/90 backdrop-blur">
          {/* Direct 1-Page PDF Download */}
          <button
            type="button"
            onClick={downloadDirectFile}
            className="h-10 px-4 rounded-full text-[13px] font-medium text-[#1E469B] dark:text-[#7CB8F7] bg-[#1E469B]/[0.08] dark:bg-white/[0.08] hover:bg-[#1E469B]/[0.14] active:scale-[0.97] transition-[background-color,transform] inline-flex items-center gap-1.5"
            title={isTl ? 'I-save bilang PDF file' : 'Save as a PDF file'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isTl ? 'I-download ang PDF' : 'Download PDF'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-full text-[13px] font-medium text-[#1E469B] dark:text-[#7CB8F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              {isTl ? 'Isara' : 'Close'}
            </button>
            <button
              type="button"
              data-action="print-form"
              disabled={!!bad}
              onClick={() => setShowConfirmPrint(true)}
              className="btn-lit h-10 px-5 text-[13px] font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>{isTl ? 'I-print' : 'Print'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
