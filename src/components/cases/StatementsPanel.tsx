// Statements of the reporter, the affected student and witnesses (office only).
// Taken separately, BEFORE the reported student is called; never shown to students or parents.
// Saved statements cannot be edited or deleted (they are evidence).
import React, { useEffect, useState } from 'react';
import { Lock, Plus, Printer } from 'lucide-react';
import { fetchCaseStatements, insertCaseStatement, type CaseStatement } from '../../services/supabaseClient';
import { fetchConcernForCase, type ConcernItem } from '../../services/concernsDb';

/** the report text without the app's [TAGS] and photo links */
const cleanReport = (t: string) =>
  (t || '')
    .replace(/\[EVIDENCE_PHOTO_\d+\]:\s*\S+/gi, '')
    .replace(/\[(SALAYSAY|WHAT HAPPENED)[^\]]*\]:?/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const ROLES: { k: CaseStatement['role']; en: string; tl: string }[] = [
  { k: 'reporter', en: 'Reported it', tl: 'Nag-ulat' },
  { k: 'affected', en: 'Affected student', tl: 'Naapektuhan' },
  { k: 'witness', en: 'Witness', tl: 'Testigo' },
];

export const StatementsPanel: React.FC<{
  caseCode: string;
  incidentCode?: string | null;
  isTl: boolean;
  onPrintBlank?: () => void;
  onSaved?: (msg: string) => void;
}> = ({ caseCode, incidentCode, isTl, onPrintBlank, onSaved }) => {
  const [list, setList] = useState<CaseStatement[] | null | 'loading'>('loading');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<CaseStatement['role']>('witness');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => setList(await fetchCaseStatements(caseCode, incidentCode));
  // a case made from a student report: that report IS the reporter's statement (no need to type it again)
  const [report, setReport] = useState<ConcernItem | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchConcernForCase(caseCode).then((r) => alive && setReport(r));
    return () => {
      alive = false;
    };
  }, [caseCode]);
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseCode, incidentCode]);

  const save = async () => {
    if (name.trim().length < 2 || text.trim().length < 10) return;
    setSaving(true);
    setErr('');
    const ok = await insertCaseStatement({ caseCode, incidentCode: incidentCode || null, personName: name.trim(), role, statement: text.trim() });
    setSaving(false);
    if (!ok) {
      setErr(isTl ? 'Hindi na-save. I-check ang internet, tapos subukan ulit.' : 'Not saved. Check the internet, then try again.');
      return;
    }
    setAdding(false);
    setName('');
    setText('');
    void load();
    onSaved?.(isTl ? 'Na-save ang salaysay.' : 'Statement saved.');
  };

  const roleWord = (r: CaseStatement['role']) => {
    const x = ROLES.find((y) => y.k === r);
    return x ? (isTl ? x.tl : x.en) : r;
  };
  const input =
    'w-full rounded-xl border border-[#E5E5EA] dark:border-white/10 bg-white dark:bg-[#1C1C1E] px-3 text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#007AFF]';

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-1.5 text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">
        <Lock className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />
        {isTl
          ? 'Office lang. Hindi ito makikita ng inireklamo o ng ibang magulang. Hindi na mababago kapag na-save.'
          : 'Office only. Never shown to the reported student or other parents. Cannot be changed once saved.'}
      </p>

      {report && (
        <div data-reporter-from-report className="rounded-xl border border-[#007AFF]/25 bg-[#007AFF]/[0.05] dark:bg-[#0A84FF]/10 p-3 space-y-1.5">
          <p className="flex flex-wrap items-center gap-x-2 text-[12px] font-semibold text-[#007AFF] dark:text-[#409CFF]">
            <Lock className="w-3.5 h-3.5" aria-hidden />
            {isTl ? 'Salaysay ng nag-ulat · mula sa student report' : "Reporter's statement · from the student report"} {report.code}
          </p>
          <p className="text-[14px] font-semibold text-[#1D1D1F] dark:text-white">
            {report.studentName} <span className="font-normal text-[#6E6E73] dark:text-[#A1A1A6]">· {report.gradeSection} · {new Date(report.createdAt).toLocaleDateString(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </p>
          <p className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-pre-wrap leading-relaxed">{cleanReport(report.whatHappened) || '—'}</p>
          {(report.when || report.where || report.witnesses) && (
            <p className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">
              {[report.when && `${isTl ? 'Kailan' : 'When'}: ${report.when}`, report.where && `${isTl ? 'Saan' : 'Where'}: ${report.where}`, report.witnesses && `${isTl ? 'Saksi' : 'Witnesses'}: ${report.witnesses}`].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}

      {list === 'loading' ? (
        <p className="text-[13px] text-[#8E8E93]">{isTl ? 'Kinukuha…' : 'Loading…'}</p>
      ) : list === null ? (
        <p className="text-[13px] text-rose-700 dark:text-rose-300">{isTl ? 'Hindi makuha ang mga salaysay. I-check ang internet.' : 'Could not load statements. Check the internet.'}</p>
      ) : list.length === 0 && !adding ? (
        <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">
          {report
            ? isTl ? 'Nasa report na ang salaysay ng nag-ulat. Idagdag ang ibang saksi kung mayroon (hindi sapilitan).' : "The reporter's side is in the report above. Add other witnesses if there are any (optional)."
            : isTl ? 'Wala pang salaysay. Kunin muna ang panig ng nag-ulat at mga saksi bago ipatawag ang inireklamo (hindi sapilitan).' : 'No statements yet. Take the reporter’s and witnesses’ side first, before calling the reported student (optional).'}
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id} className="rounded-xl border border-[#E5E5EA] dark:border-white/10 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{s.personName}</span>
                <span className="h-5 px-2 rounded-full inline-flex items-center bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/15 dark:text-[#409CFF] font-medium">{roleWord(s.role)}</span>
                {s.caseCode !== caseCode && <span className="text-[#8E8E93]">{isTl ? 'parehong insidente' : 'same incident'}</span>}
                <span className="ml-auto text-[#8E8E93]">{new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(s.createdAt))}</span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-pre-wrap">{s.statement}</p>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-xl border border-[#007AFF]/40 p-3 space-y-2.5">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={isTl ? 'Sino siya' : 'Who is this'}>
            {ROLES.map((r) => (
              <button
                key={r.k}
                type="button"
                role="radio"
                aria-checked={role === r.k}
                onClick={() => setRole(r.k)}
                className={`h-8 px-3 rounded-full text-[12px] transition-[background-color,transform] active:scale-[0.97] ${
                  role === r.k ? 'btn-lit font-semibold' : 'bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#007AFF]'
                }`}
              >
                {isTl ? r.tl : r.en}
              </button>
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 120))} placeholder={isTl ? 'Pangalan (kailangan, walang anonymous)' : 'Name (required, no anonymous)'} className={`${input} h-10`} />
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 3000))} rows={4} placeholder={isTl ? 'Ano ang nakita o naranasan niya, sa sarili niyang salita…' : 'What they saw or went through, in their own words…'} className={`${input} py-2 leading-relaxed`} />
          {err && <p className="text-[12px] text-rose-700 dark:text-rose-300">{err}</p>}
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="h-9 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
              {isTl ? 'Huwag na' : 'Cancel'}
            </button>
            <button type="button" disabled={saving || name.trim().length < 2 || text.trim().length < 10} onClick={() => void save()} className="btn-lit h-9 px-5 text-[13px] font-semibold disabled:opacity-40">
              {saving ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? 'I-save ang salaysay' : 'Save statement'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => setAdding(true)} className="h-9 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] bg-[#007AFF]/[0.08] dark:bg-white/[0.08] hover:bg-[#007AFF]/[0.14] inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" aria-hidden />
            {isTl ? 'Magdagdag ng salaysay' : 'Add a statement'}
          </button>
          {onPrintBlank && (
            <button type="button" onClick={onPrintBlank} className="h-9 px-3 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] inline-flex items-center gap-1.5">
              <Printer className="w-4 h-4" aria-hidden />
              {isTl ? 'Papel para sulat-kamay' : 'Handwritten form'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
