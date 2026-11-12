// The 7-step case flow (features flowchart page 3):
// Reported → Student Called → Explanation → Parent Notified → Decision → Follow-Up → Closed.
// One "next step" with one main button (Golden Rule 1). The sanction waits until the parent is notified.
import React, { useMemo, useState } from 'react';
import { CASE_STEPS, type CaseStep, type DisciplineCaseRecord } from '../../data/stage3MockData';

export type FlowAction =
  | { kind: 'call' }
  | { kind: 'explanation'; text: string }
  | { kind: 'notified'; how: string }
  | { kind: 'decision'; decision: string; sanction: string }
  | { kind: 'followup' }
  | { kind: 'close' };

const STEP_TL: Record<CaseStep, string> = {
  Reported: 'Na-report',
  'Student Called': 'Tinawag ang estudyante',
  Explanation: 'Paliwanag',
  'Parent Notified': 'Alam ng magulang',
  Decision: 'Desisyon',
  'Follow-Up': 'Follow-up',
  Closed: 'Sarado',
};
const HOW: [string, string][] = [
  ['Conference attended', 'Dumalo sa conference'],
  ['Phone call', 'Tawag sa telepono'],
  ['SMS', 'SMS'],
  ['Letter', 'Sulat'],
  ['Email', 'Email'],
];

/** which steps are done, from the saved fields (not only the step word) */
export function flowState(c: DisciplineCaseRecord) {
  const order = (s?: string) => (s ? CASE_STEPS.indexOf(s as CaseStep) : 0);
  const at = order(c.step);
  const closed = c.status === 'Resolved';
  const done: Record<CaseStep, boolean> = {
    Reported: true,
    'Student Called': !!c.studentCalledAt || at >= 1 || closed,
    Explanation: !!(c.explanation && c.explanation.trim()) || at >= 2 || closed,
    'Parent Notified': !!c.parentNotifiedAt || closed,
    Decision: !!c.decidedAt || closed,
    'Follow-Up': at >= 5 || closed,
    Closed: closed,
  };
  const next = CASE_STEPS.find((s) => !done[s]) ?? null;
  return { done, next };
}

const fmt = (iso?: string | null, tl = false) =>
  iso ? new Intl.DateTimeFormat(tl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)) : '';

export const CaseFlowPanel: React.FC<{
  c: DisciplineCaseRecord;
  isTl: boolean;
  busy: boolean;
  suggestedSanction: string;
  onAction: (a: FlowAction) => void;
  /** open the locked Student Statement Station for this case */
  onOpenStation?: () => void;
}> = ({ c, isTl, busy, suggestedSanction, onAction, onOpenStation }) => {
  const { done, next } = useMemo(() => flowState(c), [c]);
  const [text, setText] = useState(c.explanation ?? '');
  const [how, setHow] = useState('');
  const [decision, setDecision] = useState(c.decision ?? '');
  const [sanction, setSanction] = useState(c.sanction || suggestedSanction);
  const dates: Partial<Record<CaseStep, string>> = {
    Reported: c.createdAt || c.incidentDate,
    'Student Called': c.studentCalledAt ?? '',
    'Parent Notified': c.parentNotifiedAt ?? '',
    Decision: c.decidedAt ?? '',
    Closed: c.closedAt ?? '',
  };
  const canDecideEarly = done.Explanation && !done.Decision && !done['Parent Notified'];
  const btn = 'px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap disabled:opacity-50';
  const primary = `${btn} bg-[#1E469B] text-white`;
  const input = 'w-full px-3 py-2 rounded-xl border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white';

  return (
    <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] space-y-3" data-case-flow>
      {/* stepper */}
      <ol className="grid grid-cols-7 gap-1" aria-label={isTl ? 'Mga hakbang ng kaso' : 'Case steps'}>
        {CASE_STEPS.map((s, i) => {
          const isDone = done[s];
          const isNext = s === next;
          return (
            <li key={s} className="flex flex-col items-center text-center min-w-0" data-step={s} data-done={isDone ? '1' : '0'}>
              <div className="flex items-center w-full">
                <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : isDone ? 'bg-emerald-500' : 'bg-[#D3DDEE] dark:bg-[#253B66]'}`} />
                <span
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                    isDone ? 'bg-emerald-500 text-white' : isNext ? 'bg-[#1E469B] text-white ring-4 ring-[#1E469B]/20' : 'bg-[#E4ECFC] dark:bg-[#192D58] text-[#4A608A]'
                  }`}
                  aria-current={isNext ? 'step' : undefined}
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <span className={`h-0.5 flex-1 ${i === CASE_STEPS.length - 1 ? 'opacity-0' : done[CASE_STEPS[i + 1]] ? 'bg-emerald-500' : 'bg-[#D3DDEE] dark:bg-[#253B66]'}`} />
              </div>
              <span className={`mt-1 text-[10px] leading-tight font-bold ${isNext ? 'text-[#1E469B] dark:text-[#7CB8F7]' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}>{isTl ? STEP_TL[s] : s}</span>
              {isDone && dates[s] ? <span className="text-[9.5px] text-[#687FA8] dark:text-[#89A7DF]">{fmt(dates[s], isTl)}</span> : null}
            </li>
          );
        })}
      </ol>

      {/* sanction status */}
      {c.sanction && (
        <p className={`text-xs font-bold px-3 py-2 rounded-xl ${c.sanctionStatus === 'Pending parent notice' ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200' : c.sanctionStatus === 'Done' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-[#EEF3FC] text-[#1E469B] dark:bg-[#13203B] dark:text-[#7CB8F7]'}`} data-sanction-status>
          {isTl ? 'Sanction' : 'Sanction'}: {c.sanction} ·{' '}
          {c.sanctionStatus === 'Pending parent notice'
            ? isTl ? '⏳ Naghihintay — magsisimula kapag alam na ng magulang' : '⏳ Waiting — starts once the parent is notified'
            : c.sanctionStatus === 'Done'
            ? isTl ? '✓ Tapos na' : '✓ Done'
            : isTl ? 'Ginagawa na' : 'In progress'}
        </p>
      )}

      {/* the one next step */}
      {next && (
        <div className="rounded-xl bg-[#F4F7FC] dark:bg-[#0B1527] border border-[#D3DDEE] dark:border-[#253B66] p-3 space-y-2" data-next-step={next}>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#4A608A] dark:text-[#94A8D0]">{isTl ? 'Susunod na gagawin' : 'Next step'}</p>
          {next === 'Student Called' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[#0B1F4D] dark:text-white">{isTl ? 'Tawagin ang estudyante sa Guidance Office.' : 'Call the student to the Guidance Office.'}</p>
              <button type="button" data-flow="call" disabled={busy} onClick={() => onAction({ kind: 'call' })} className={primary}>
                {isTl ? '✓ Natawag na ang estudyante' : '✓ Student was called'}
              </button>
            </div>
          )}
          {next === 'Explanation' && (
            <div className="space-y-2">
              <p className="text-sm text-[#0B1F4D] dark:text-white">{isTl ? 'Isulat ang paliwanag ng estudyante (sa sarili niyang salita).' : 'Write the student’s explanation (in their own words).'}</p>
              <textarea data-flow-text value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={3} className={`${input} leading-relaxed`} placeholder={isTl ? 'hal. Na-late po ako dahil walang masakyan…' : 'e.g. I was late because there was no ride…'} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">{text.trim().length < 10 ? (isTl ? 'Kahit 10 letra.' : 'At least 10 letters.') : `${text.trim().length}/2000`}</span>
                <span className="flex items-center gap-2">
                {onOpenStation && (
                  <button type="button" data-flow="station" disabled={busy} onClick={onOpenStation} title={isTl ? 'Bubukas ang naka-lock na screen kung saan ang estudyante mismo ang magta-type. PIN ng staff ang kailangan para makalabas.' : 'Opens a locked screen where the student types it. The staff PIN is needed to leave it.'} className={`${btn} border border-[#C9D6EC] dark:border-[#253B66] text-[#1E469B] dark:text-[#7CB8F7]`}>
                    🖥 {isTl ? 'Ipa-type sa estudyante' : 'Let the student type it'}
                  </button>
                )}
                <button type="button" data-flow="explanation" disabled={busy || text.trim().length < 10} onClick={() => onAction({ kind: 'explanation', text: text.trim() })} className={primary}>
                  {isTl ? 'I-save ang paliwanag' : 'Save the explanation'}
                </button>
                </span>
              </div>
            </div>
          )}
          {next === 'Parent Notified' && (
            <div className="space-y-2">
              <p className="text-sm text-[#0B1F4D] dark:text-white">{isTl ? 'Paano nalaman ng magulang ang tungkol sa kaso?' : 'How did the parent learn about the case?'}</p>
              <div className="flex flex-wrap gap-1.5">
                {HOW.map(([en, tl]) => (
                  <button key={en} type="button" data-how={en} aria-pressed={how === en} onClick={() => setHow(en)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${how === en ? 'bg-[#1E469B] text-white border-[#1E469B]' : 'border-[#D3DDEE] dark:border-[#253B66] text-[#4A608A] dark:text-[#94A8D0]'}`}>
                    {isTl ? tl : en}
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="button" data-flow="notified" disabled={busy || !how} onClick={() => onAction({ kind: 'notified', how })} className={primary}>
                  {isTl ? '✓ Alam na ng magulang' : '✓ Parent notified'}
                </button>
              </div>
            </div>
          )}
          {(next === 'Decision' || (canDecideEarly && next === 'Parent Notified')) && (
            <details open={next === 'Decision'} className="space-y-2" data-decision-box>
              {next !== 'Decision' && (
                <summary className="text-xs font-bold text-[#1E469B] dark:text-[#7CB8F7] cursor-pointer">
                  {isTl ? 'O itala na ang desisyon (maghihintay ang sanction hanggang malaman ng magulang)' : 'Or record the decision now (the sanction waits until the parent is notified)'}
                </summary>
              )}
              <label className="block">
                <span className="block text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0] mb-1">{isTl ? 'Desisyon' : 'Decision'}</span>
                <input data-flow-decision value={decision} onChange={(e) => setDecision(e.target.value.slice(0, 300))} placeholder={isTl ? 'hal. Napatunayang late nang 3 beses' : 'e.g. Found late 3 times'} className={input} />
              </label>
              <label className="block">
                <span className="block text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0] mb-1">{isTl ? 'Sanction (mula sa handbook — puwedeng baguhin)' : 'Sanction (from the handbook — you can change it)'}</span>
                <input data-flow-sanction value={sanction} onChange={(e) => setSanction(e.target.value.slice(0, 300))} className={input} />
              </label>
              <div className="flex justify-end">
                <button type="button" data-flow="decision" disabled={busy || decision.trim().length < 3 || sanction.trim().length < 3} onClick={() => onAction({ kind: 'decision', decision: decision.trim(), sanction: sanction.trim() })} className={primary}>
                  {isTl ? 'I-save ang desisyon' : 'Save the decision'}
                </button>
              </div>
            </details>
          )}
          {next === 'Follow-Up' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[#0B1F4D] dark:text-white">{isTl ? 'Sinimulan na ba ng estudyante ang sanction?' : 'Has the student started the sanction?'}</p>
              <button type="button" data-flow="followup" disabled={busy || c.sanctionStatus === 'Pending parent notice'} onClick={() => onAction({ kind: 'followup' })} className={primary} title={c.sanctionStatus === 'Pending parent notice' ? (isTl ? 'Hintayin munang malaman ng magulang' : 'Wait until the parent is notified') : undefined}>
                {isTl ? '✓ Nagsimula na' : '✓ Started'}
              </button>
            </div>
          )}
          {next === 'Closed' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[#0B1F4D] dark:text-white">{isTl ? 'Tapos na ba ang sanction at follow-up?' : 'Is the sanction and follow-up finished?'}</p>
              <button type="button" data-flow="close" disabled={busy} onClick={() => onAction({ kind: 'close' })} className={`${btn} bg-emerald-600 text-white`}>
                {isTl ? '✓ Isara ang kaso' : '✓ Close the case'}
              </button>
            </div>
          )}
        </div>
      )}
      {c.explanation && done.Explanation && (
        <details className="text-xs">
          <summary className="font-bold text-[#4A608A] dark:text-[#94A8D0] cursor-pointer">{isTl ? 'Paliwanag ng estudyante' : 'Student’s explanation'}</summary>
          <p className="mt-1 whitespace-pre-wrap text-[#0B1F4D] dark:text-white">{c.explanation}</p>
        </details>
      )}
    </div>
  );
};
