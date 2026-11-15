// The dynamic progressive due process case flow:
// For 1st Minor: 5 steps: Reported → Student Called → Explanation → Decision → Closed
// For Major / 2nd Minor / Serious: 8 steps: Reported → Student Called → Explanation → Schedule Conference → Parent Conference Attendance → Decision → Follow-Up → Closed
import React, { useMemo, useState } from 'react';
import {
  CASE_STEPS,
  MINOR_CASE_STEPS,
  MAJOR_CASE_STEPS,
  type CaseStep,
  type DisciplineCaseRecord,
} from '../../data/stage3MockData';

export type FlowAction =
  | { kind: 'call' }
  | { kind: 'explanation'; text: string }
  | { kind: 'schedule_conference'; targetDate?: string }
  | { kind: 'conference_outcome'; how: string; conferenceStatus: 'Attended' | 'No-Show' }
  | { kind: 'notified'; how: string; conferenceStatus?: 'Attended' | 'No-Show' }
  | { kind: 'decision'; decision: string; sanction: string }
  | { kind: 'followup' }
  | { kind: 'close'; counselingNotes?: string };

export function isMinorCase(c: DisciplineCaseRecord): boolean {
  const sev = (c.severity || '').toLowerCase();
  return (
    sev.includes('minor') &&
    !sev.includes('2nd') &&
    !sev.includes('consecutive') &&
    !sev.includes('escalat') &&
    !sev.includes('serious') &&
    !sev.includes('major') &&
    !sev.includes('grave')
  );
}

const STEP_TL: Record<CaseStep, string> = {
  Reported: 'Na-report',
  'Student Called': 'Tinawag ang estudyante',
  Explanation: 'Paliwanag',
  'Schedule Conference': 'Patawag sa Magulang',
  'Parent Conference Attendance': 'Pagharap ng Magulang',
  'Parent Notified': 'Alam ng magulang',
  Decision: 'Desisyon',
  'Follow-Up': 'Follow-up',
  Closed: 'Sarado',
};

const HOW: [string, string][] = [
  ['Conference attended (In-Person)', 'Personal na Pagharap sa Opisina'],
  ['Online / Phone Conference', 'Online o Tawag sa Telepono'],
  ['Parent Summons via SMS & Notice', 'SMS at Pormal na Sulat'],
  ['Written Communication Slip', 'Opisyal na Communication Slip'],
  ['Email Notice', 'Email Notice'],
];

/** which steps are done, from the saved fields */
export function flowState(c: DisciplineCaseRecord) {
  const isMinor = isMinorCase(c);
  const activeSteps = isMinor ? MINOR_CASE_STEPS : MAJOR_CASE_STEPS;
  const closed = c.status === 'Resolved';

  const hasConferenceScheduled =
    !!c.conferenceScheduledAt ||
    c.status === 'Conference Scheduled' ||
    !!c.parentNotifiedAt ||
    !!c.parentConferenceStatus;

  const hasConferenceAttendance =
    !!c.parentConferenceStatus && c.parentConferenceStatus !== 'Pending';

  const hasFollowUpDone =
    c.step === 'Follow-Up' ||
    c.status === 'Sanction In Progress' ||
    c.sanctionStatus === 'Active' ||
    c.sanctionStatus === 'Done' ||
    closed;

  const done: Record<CaseStep, boolean> = {
    Reported: true,
    'Student Called': !!c.studentCalledAt || closed,
    Explanation: !!(c.explanation && c.explanation.trim()) || closed,
    'Schedule Conference': hasConferenceScheduled || closed,
    'Parent Conference Attendance': hasConferenceAttendance || closed,
    'Parent Notified': !!c.parentNotifiedAt || closed,
    Decision: !!c.decidedAt || closed,
    'Follow-Up': hasFollowUpDone,
    Closed: closed,
  };

  const next = activeSteps.find((s) => !done[s]) ?? null;
  return { done, next, activeSteps, isMinor };
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
  const { done, next, activeSteps, isMinor } = useMemo(() => flowState(c), [c]);

  const [text, setText] = useState(c.explanation ?? '');
  const [how, setHow] = useState(c.parentNotifiedHow || 'Conference attended (In-Person)');
  const [parentStatus, setParentStatus] = useState<'Attended' | 'No-Show'>(c.parentConferenceStatus === 'No-Show' ? 'No-Show' : 'Attended');
  const [conferenceTargetDate, setConferenceTargetDate] = useState(c.conferenceTargetDate || '');
  const [counselingNotes, setCounselingNotes] = useState(c.counselingNotes ?? '');
  const [decision, setDecision] = useState(c.decision ?? '');
  const [sanction, setSanction] = useState(c.sanction || suggestedSanction);
  const [inspectStep, setInspectStep] = useState<CaseStep | null>(null);

  const dates: Partial<Record<CaseStep, string>> = {
    Reported: c.createdAt || c.incidentDate,
    'Student Called': c.studentCalledAt ?? '',
    'Schedule Conference': c.conferenceScheduledAt || c.parentNotifiedAt || '',
    'Parent Conference Attendance': c.parentNotifiedAt ?? '',
    'Parent Notified': c.parentNotifiedAt ?? '',
    Decision: c.decidedAt ?? '',
    Closed: c.closedAt ?? '',
  };

  const btn = 'px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap disabled:opacity-50 transition-all';
  const primary = `${btn} bg-[#1E469B] text-white hover:bg-[#16377c] active:scale-[0.97]`;
  const input = 'w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white';

  const stepIndex = next ? activeSteps.indexOf(next) + 1 : activeSteps.length;
  const totalSteps = activeSteps.length;

  return (
    <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] space-y-3" data-case-flow>
      {/* Stepper Grid (Adaptive 5 or 8 steps) */}
      <ol
        className={`grid gap-1 ${isMinor ? 'grid-cols-5' : 'grid-cols-8'}`}
        aria-label={isTl ? 'Mga hakbang ng kaso' : 'Case steps'}
      >
        {activeSteps.map((s, i) => {
          const isDone = done[s];
          const isNext = s === next;
          return (
            <li
              key={s}
              className="flex flex-col items-center text-center min-w-0 cursor-pointer group"
              data-step={s}
              data-done={isDone ? '1' : '0'}
              onClick={() => isDone && setInspectStep((prev) => (prev === s ? null : s))}
              title={isDone ? (isTl ? 'I-click para suriin ang nakaraang tala' : 'Click to inspect previous step record') : undefined}
            >
              <div className="flex items-center w-full">
                <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : isDone ? 'bg-emerald-500' : 'bg-[#D3DDEE] dark:bg-[#253B66]'}`} />
                <span
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold transition-all group-hover:scale-105 active:scale-[0.97] ${
                    inspectStep === s
                      ? 'bg-sky-600 text-white ring-4 ring-sky-400/30'
                      : isDone
                      ? 'bg-emerald-500 text-white'
                      : isNext
                      ? 'bg-[#1E469B] text-white ring-4 ring-[#1E469B]/20'
                      : 'bg-[#E4ECFC] dark:bg-[#192D58] text-[#4A608A]'
                  }`}
                  aria-current={isNext ? 'step' : undefined}
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <span className={`h-0.5 flex-1 ${i === activeSteps.length - 1 ? 'opacity-0' : done[activeSteps[i + 1]] ? 'bg-emerald-500' : 'bg-[#D3DDEE] dark:bg-[#253B66]'}`} />
              </div>
              <span className={`mt-1 text-[10px] leading-tight font-bold ${inspectStep === s ? 'text-sky-600 dark:text-sky-400 underline' : isNext ? 'text-[#1E469B] dark:text-[#7CB8F7]' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}>
                {isTl ? STEP_TL[s] : s}
              </span>
              {isDone && dates[s] ? <span className="text-[9.5px] text-[#687FA8] dark:text-[#89A7DF]">{fmt(dates[s], isTl)}</span> : null}
            </li>
          );
        })}
      </ol>

      {/* Previous Step Inspector Box */}
      {inspectStep && (
        <div className="rounded-xl bg-sky-50/70 dark:bg-[#0A162D] border border-sky-200 dark:border-sky-900/50 p-4 space-y-2 shadow-xs transition-all">
          <div className="flex items-center justify-between border-b border-sky-200 dark:border-sky-900/40 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7]">
                {isTl ? `Sinusuring Nakaraang Hakbang: ${STEP_TL[inspectStep]}` : `Inspecting Step: ${inspectStep}`}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {isTl ? 'Naitala Na' : 'Completed'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setInspectStep(null)}
              className="text-[11px] font-bold text-[#4A608A] hover:text-[#0B1F4D] dark:text-[#94A8D0] dark:hover:text-white"
            >
              ✕ {isTl ? 'Isara' : 'Close review'}
            </button>
          </div>

          <div className="text-xs space-y-2 text-[#0F172A] dark:text-white">
            {inspectStep === 'Reported' && (
              <p>
                <span className="font-bold">{isTl ? 'Petsa ng Ulat:' : 'Reported Date:'}</span> {fmt(dates.Reported, isTl)} · {c.reportedBy}
              </p>
            )}
            {inspectStep === 'Student Called' && (
              <p>
                <span className="font-bold">{isTl ? 'Natawag sa Opisina:' : 'Student Summoned:'}</span> {fmt(dates['Student Called'], isTl)} (Guidance Office)
              </p>
            )}
            {inspectStep === 'Explanation' && (
              <div className="space-y-1">
                <span className="font-bold block">{isTl ? 'Paliwanag / Salaysay ng Estudyante:' : 'Student Official Statement:'}</span>
                <p className="p-2.5 rounded-lg bg-white dark:bg-[#0B1527] border border-slate-200 dark:border-slate-800 leading-relaxed italic">
                  "{c.explanation || (isTl ? 'Walang nakasulat na paliwanag.' : 'No statement provided.')}"
                </p>
              </div>
            )}
            {inspectStep === 'Schedule Conference' && (
              <div className="space-y-1">
                <p>
                  <span className="font-bold">{isTl ? 'Petsa ng Patawag:' : 'Conference Summons Issued:'}</span> {fmt(dates['Schedule Conference'], isTl)}
                </p>
                {c.conferenceTargetDate && (
                  <p>
                    <span className="font-bold">{isTl ? 'Itinakdang Araw ng Conference:' : 'Target Conference Date:'}</span> {c.conferenceTargetDate}
                  </p>
                )}
              </div>
            )}
            {(inspectStep === 'Parent Conference Attendance' || inspectStep === 'Parent Notified') && (
              <div className="space-y-1">
                <p>
                  <span className="font-bold">{isTl ? 'Petsa ng Conference / Pagdinig:' : 'Conference Hearing Date:'}</span> {fmt(dates['Parent Conference Attendance'] || dates['Parent Notified'], isTl)}
                </p>
                <p>
                  <span className="font-bold">{isTl ? 'Paraan:' : 'Method:'}</span> {c.parentNotifiedHow || 'In-Person Hearing'} · <span className="font-semibold text-emerald-700 dark:text-emerald-300">{c.parentConferenceStatus || 'Attended'}</span>
                </p>
              </div>
            )}
            {inspectStep === 'Decision' && (
              <div className="space-y-1">
                <p>
                  <span className="font-bold">{isTl ? 'Opisyal na Hatol:' : 'Ruling / Decision:'}</span> {c.decision || 'N/A'}
                </p>
                <p>
                  <span className="font-bold">{isTl ? 'Ipinataw na Sanction:' : 'Sanction:'}</span> {c.sanction || 'N/A'}
                </p>
              </div>
            )}
            {inspectStep === 'Follow-Up' && (
              <p>
                <span className="font-bold">{isTl ? 'Katayuan ng Sanction:' : 'Sanction Progress:'}</span> {c.sanctionStatus || 'Serving'}
              </p>
            )}
            {inspectStep === 'Closed' && (
              <div className="space-y-1">
                <p>
                  <span className="font-bold">{isTl ? 'Petsa ng Pagsara:' : 'Closed At:'}</span> {fmt(dates.Closed, isTl)}
                </p>
                {c.counselingNotes && (
                  <p className="p-2.5 rounded-lg bg-white dark:bg-[#0B1527] border border-slate-200 dark:border-slate-800 leading-relaxed italic">
                    "{c.counselingNotes}"
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sanction status badge */}
      {c.sanction && (
        <p className={`text-xs font-bold px-3 py-2 rounded-xl ${c.sanctionStatus === 'Pending parent notice' ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200' : c.sanctionStatus === 'Done' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-[#EEF3FC] text-[#1E469B] dark:bg-[#13203B] dark:text-[#7CB8F7]'}`} data-sanction-status>
          {isTl ? 'Sanction' : 'Sanction'}: {c.sanction} ·{' '}
          {c.sanctionStatus === 'Pending parent notice'
            ? isTl ? '⏳ Naghihintay — magsisimula matapos ang conference ng magulang' : '⏳ Waiting — starts after parent conference'
            : c.sanctionStatus === 'Done'
            ? isTl ? '✓ Tapos na' : '✓ Done'
            : isTl ? 'Ginagawa na' : 'In progress'}
        </p>
      )}

      {/* Current Active Action Card */}
      {next && (
        <div className="rounded-xl bg-white dark:bg-[#0B1527] border border-[#CBD5E1] dark:border-[#1E2E4E] p-4 space-y-3 shadow-xs" data-next-step={next}>
          <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#1E2E4E] pb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7]">
              {isTl ? 'Kasalukuyang Hakbang (Current Action)' : 'Current Action Required'}
            </span>
            <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-extrabold bg-[#F1F5F9] dark:bg-[#13203B] text-[#475569] dark:text-[#94A3B8] border border-[#CBD5E1] dark:border-[#334155]">
              STEP {stepIndex} OF {totalSteps}
            </span>
          </div>

          {next === 'Student Called' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                {isTl ? 'I-record ang pagdating ng estudyante sa Guidance Office.' : 'Record that the student was summoned to the Guidance Office.'}
              </p>
              <button type="button" data-flow="call" disabled={busy} onClick={() => onAction({ kind: 'call' })} className={primary}>
                {isTl ? 'Natawag na sa Opisina' : 'Mark as Called'}
              </button>
            </div>
          )}

          {next === 'Explanation' && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {isTl ? 'Salaysay ng Pagpapaliwanag ng Naisumbong (Student’s Explanation):' : 'Official Written Explanation of the Student:'}
                </p>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  {isTl ? 'I-type ang sinabi ng estudyante, o ipa-type nang direkta sa kanya gamit ang Statement Station.' : 'Type what the student explained, or let them type it personally via Statement Station.'}
                </p>
              </div>

              <textarea 
                data-flow-text 
                value={text} 
                onChange={(e) => setText(e.target.value.slice(0, 2000))} 
                rows={3} 
                className={`${input} rounded-lg leading-relaxed font-normal text-xs`} 
                placeholder={isTl ? 'hal. Na-late po ako dahil nag-aberya ang sinakyang jeep sa San Jose…' : 'e.g. I was late due to heavy traffic along San Jose…'} 
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F1F5F9] dark:border-[#1E2E4E]">
                <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  {text.trim().length < 10 
                    ? (isTl ? 'Kailangan ng kahit 10 letra.' : 'At least 10 characters required.') 
                    : `${text.trim().length} / 2000 letters`}
                </span>
                <div className="flex items-center gap-2">
                  {onOpenStation && (
                    <button 
                      type="button" 
                      data-flow="station" 
                      disabled={busy} 
                      onClick={onOpenStation} 
                      title={isTl ? 'Bubukas ang naka-lock na screen kung saan ang estudyante mismo ang magta-type.' : 'Opens a locked screen for student direct typing.'} 
                      className={`${btn} rounded-[6px] border border-[#CBD5E1] dark:border-[#253B66] text-[#1E469B] dark:text-[#7CB8F7] hover:bg-[#F8FAFC]`}
                    >
                      {isTl ? 'Ipa-type sa Estudyante' : 'Let Student Type'}
                    </button>
                  )}
                  <button 
                    type="button" 
                    data-flow="explanation" 
                    disabled={busy || text.trim().length < 10} 
                    onClick={() => onAction({ kind: 'explanation', text: text.trim() })} 
                    className={`${primary} rounded-[6px]`}
                  >
                    {isTl ? 'I-save ang Paliwanag' : 'Save Explanation'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Major Offense Step 4: Schedule Conference (Parent Summons) */}
          {next === 'Schedule Conference' && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {isTl ? 'Hakbang 4: Mag-isyu ng Pormal na Patawag sa Magulang (Parent Conference Notice)' : 'Step 4: Issue Formal Parent Summons & Schedule Conference'}
                </p>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  {isTl
                    ? 'Dahil ito ay Serious / Major / Escalated case, kailangang ipatawag ang magulang para sa isang pormal na conference hearing bago magpataw ng desisyon.'
                    : 'Due process requires summoning the parent for an official conference hearing before rendering a sanction decision.'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-2">
                <label className="block">
                  <span className="block text-[11px] font-extrabold text-amber-900 dark:text-amber-300 mb-1">
                    {isTl ? 'Itinakdang Araw at Oras ng Conference (Hal. Bukas 10:00 AM):' : 'Proposed Conference Date & Time (e.g. Tomorrow 10:00 AM):'}
                  </span>
                  <input
                    type="text"
                    value={conferenceTargetDate}
                    onChange={(e) => setConferenceTargetDate(e.target.value)}
                    placeholder={isTl ? 'hal. Bukas, Nov 16 · 10:00 AM' : 'e.g. Tomorrow, Nov 16 · 10:00 AM'}
                    className={input}
                  />
                </label>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] dark:border-[#1E2E4E] flex-wrap gap-2">
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  {isTl ? 'Maitatala ito sa kalendaryo at activity log ng Guidance.' : 'This marks the conference as officially summoned in records.'}
                </p>
                <button
                  type="button"
                  data-flow="schedule-conference"
                  disabled={busy}
                  onClick={() => onAction({ kind: 'schedule_conference', targetDate: conferenceTargetDate.trim() })}
                  className={primary}
                >
                  {isTl ? '✓ Itala: Na-isyu ang Patawag sa Magulang' : '✓ Mark Summons Issued & Conference Set'}
                </button>
              </div>
            </div>
          )}

          {/* Major Offense Step 5: Conference Attendance Hearing (Attended vs No-Show / Reschedule) */}
          {(next === 'Parent Conference Attendance' || next === 'Parent Notified') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {isTl ? 'Hakbang 5: Resulta ng Pagharap ng Magulang (Conference Hearing Outcome)' : 'Step 5: Parent Conference Hearing Outcome'}
                </p>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/30">
                  {isTl ? 'Pagpapatotoo ng Attendance' : 'Attendance Verification'}
                </span>
              </div>

              {/* Attendance Choice */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#13203B] border border-slate-200 dark:border-white/10 space-y-2">
                <span className="text-[11px] font-extrabold uppercase text-[#4A608A] dark:text-[#94A8D0] block">
                  {isTl ? 'Dumalo ba ang Magulang sa Itinakdang Oras?' : 'Did the Parent Attend the Conference?'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setParentStatus('Attended')}
                    className={`p-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      parentStatus === 'Attended'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-[#0B1527] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>✓</span>
                    <span>{isTl ? 'Dumalo ang Magulang' : 'Parent Attended'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setParentStatus('No-Show')}
                    className={`p-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      parentStatus === 'No-Show'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-[#0B1527] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>⚠️</span>
                    <span>{isTl ? 'Hindi Sumipot (No-Show)' : 'Did Not Show Up'}</span>
                  </button>
                </div>
                {parentStatus === 'No-Show' ? (
                  <p className="text-[10.5px] text-amber-700 dark:text-amber-300 font-semibold leading-tight pt-1">
                    {isTl
                      ? 'Mananatiling nakabinbin ang kaso. Mag-iisyu ng 2nd summons o i-reschedule bago makapag-desisyon.'
                      : 'Case remains pending conference. Issue a 2nd summons or reschedule before deciding sanction.'}
                  </p>
                ) : (
                  <p className="text-[10.5px] text-emerald-700 dark:text-emerald-300 font-semibold leading-tight pt-1">
                    {isTl
                      ? 'Nakaharap ang magulang. Maaari nang dumiretso sa pagpataw ng pormal na desisyon.'
                      : 'Parent attended the hearing. Case is cleared to proceed to formal sanction decision.'}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0] block">
                  {isTl ? 'Paraan ng Komunikasyon / Pagdinig:' : 'Hearing / Communication Method:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {HOW.map(([en, tl]) => (
                    <button 
                      key={en} 
                      type="button" 
                      data-how={en} 
                      aria-pressed={how === en} 
                      onClick={() => setHow(en)} 
                      className={`px-3 py-1.5 rounded-[6px] text-xs font-bold border transition-colors ${
                        how === en 
                          ? 'bg-[#1E469B] text-white border-[#1E469B]' 
                          : 'border-[#CBD5E1] dark:border-[#253B66] bg-[#F8FAFC] dark:bg-[#0B1527] text-[#475569] dark:text-[#94A3B8] hover:border-[#1E469B]'
                      }`}
                    >
                      {isTl ? tl : en}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] dark:border-[#1E2E4E] flex-wrap gap-2">
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  {isTl
                    ? 'I-save ang tala ng attendance upang ma-unlock ang Step ng Desisyon.'
                    : 'Save attendance outcome to advance to the Decision step.'}
                </p>
                <button
                  type="button"
                  data-flow="conference-outcome"
                  disabled={busy || !how}
                  onClick={() => onAction({ kind: 'conference_outcome', how, conferenceStatus: parentStatus })}
                  className={`${primary} rounded-[6px]`}
                >
                  {parentStatus === 'No-Show'
                    ? (isTl ? '⚠️ I-save: No-Show (Pending Reschedule)' : '⚠️ Save: No-Show (Pending Reschedule)')
                    : (isTl ? '✓ I-save: Dumalo ang Magulang' : '✓ Save: Parent Attended Conference')}
                </button>
              </div>
            </div>
          )}

          {next === 'Decision' && (
            <div className="space-y-3" data-decision-box>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {isTl ? 'Kinalabasan ng Pagdinig at Desisyon (Case Findings & Resolution)' : 'Case Resolution & Hearing Findings'}
                </p>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-400/30">
                  {isTl ? `Hakbang ${stepIndex}: Pormal na Hatol` : `Step ${stepIndex}: Official Ruling`}
                </span>
              </div>

              {/* 1-Click Quick Decision Chips */}
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#4A608A] dark:text-[#94A8D0] block">
                  {isTl ? 'Mabilisang Pagpili (Quick Resolution Presets):' : 'Quick Resolution Presets:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    {
                      labelEn: 'Confirmed Violation (Guilty)',
                      labelTl: 'Napatunayang Lumabag sa Polisiya',
                      descEn: isMinor
                        ? `Confirmed minor infraction of ${c.offenseTitleEn}. Issued official verbal reminder and guidance counseling.`
                        : `Found responsible for ${c.offenseTitleEn} after conference with student and parent.`,
                      descTl: isMinor
                        ? `Napatunayang may paglabag sa ${c.offenseTitleTl}. Nabigyan ng paalala at guidance counseling.`
                        : `Napatunayang may pananagutan sa ${c.offenseTitleTl} matapos dinggin ang panig kasama ang magulang.`
                    },
                    {
                      labelEn: 'Amicable Settlement (Reconciled)',
                      labelTl: 'Nagkasundo / Amicable Settlement',
                      descEn: 'Parties reached mutual understanding and signed an amicable agreement with restitution.',
                      descTl: 'Nagkasundo ang magkabilang panig at pumirma ng kasunduan ng pagbabati at paumanhin.'
                    },
                    {
                      labelEn: 'First Warning with Undertaking',
                      labelTl: 'Unang Babala at Kasunduan',
                      descEn: 'First offense with remorse: issued official warning and signed behavioral pledge.',
                      descTl: 'Unang paglabag na may pagsisisi: binigyan ng pormal na babala at lumagda sa behavioral pledge.'
                    },
                    {
                      labelEn: 'Exonerated / Misunderstanding',
                      labelTl: 'Naipaliwanag / Walang Pananagutan',
                      descEn: 'Case clarified as misunderstanding; student acted in defense or cleared of wrongdoing.',
                      descTl: 'Naipaliwanag na walang malisyosong intensyon o napagkamalan lamang; abswelto ang estudyante.'
                    }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDecision(isTl ? preset.descTl : preset.descEn)}
                      className={`text-left p-2 rounded-lg border text-xs transition-all active:scale-[0.98] ${
                        decision === (isTl ? preset.descTl : preset.descEn)
                          ? 'border-[#1E469B] bg-sky-50 dark:bg-sky-950/40 text-[#1E469B] dark:text-[#7CB8F7] font-bold shadow-xs'
                          : 'border-slate-200 dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <div className="font-bold text-[11.5px] leading-snug">
                        {isTl ? preset.labelTl : preset.labelEn}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="block text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0] mb-1">
                  {isTl ? 'Opisyal na Hatol / Desisyon (Ruling)' : 'Official Decision / Ruling'}
                </span>
                <input
                  data-flow-decision
                  value={decision}
                  onChange={(e) => setDecision(e.target.value.slice(0, 300))}
                  placeholder={
                    isTl
                      ? isMinor
                        ? `hal. Napatunayang lumabag sa ${c.offenseTitleTl}; binigyan ng pormal na pangaral at babala.`
                        : `hal. Napatunayang lumabag sa ${c.offenseTitleTl} matapos ang pagdinig kasama ang magulang.`
                      : isMinor
                      ? `e.g. Confirmed minor infraction of ${c.offenseTitleEn}; issued official reminder.`
                      : `e.g. Confirmed violation of ${c.offenseTitleEn} after conference with student and parent.`
                  }
                  className={input}
                />
              </label>

              <label className="block">
                <span className="block text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0] mb-1">
                  {isTl ? 'Sanction / Disciplinary Action (Mula sa Handbook — puwedeng baguhin)' : 'Sanction / Disciplinary Action (Handbook Standard — editable)'}
                </span>
                <input
                  data-flow-sanction
                  value={sanction}
                  onChange={(e) => setSanction(e.target.value.slice(0, 300))}
                  className={input}
                />
              </label>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  data-flow="decision"
                  disabled={busy || decision.trim().length < 3 || sanction.trim().length < 3}
                  onClick={() => onAction({ kind: 'decision', decision: decision.trim(), sanction: sanction.trim() })}
                  className={`${primary} active:scale-[0.97]`}
                >
                  {isTl ? '✓ I-save ang Desisyon' : '✓ Save Decision & Sanction'}
                </button>
              </div>
            </div>
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
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {isTl ? 'Intervention & Counseling Anecdotal Notes (Bago Isara ang Kaso):' : 'Counseling Anecdotal & Behavioral Notes (Before Closure):'}
                </p>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  {isTl
                    ? 'Itala ang naging pagbabago sa asal ng estudyante, kasunduan sa guidance, at patunay na natapos ang sanction.'
                    : 'Record student behavioral progress, counseling agreements, and verified sanction completion.'}
                </p>
              </div>
              <textarea
                value={counselingNotes}
                onChange={(e) => setCounselingNotes(e.target.value.slice(0, 1500))}
                rows={2}
                className={`${input} rounded-lg text-xs leading-relaxed`}
                placeholder={isTl ? 'hal. Nakausap si Mark; nagpakita ng pagsisisi, nangakong hindi na magdadala ng vape, at maayos na nag-community service nang 3 araw sa library.' : 'e.g. Student showed remorse, signed behavioral pledge, and completed 3 days campus service.'}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9] dark:border-[#1E2E4E]">
                <span className="text-[10.5px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  {counselingNotes.trim().length < 5
                    ? (isTl ? 'Maglagay ng maikling tala ng counseling bago isara.' : 'Enter brief counseling notes before closing.')
                    : (isTl ? '✓ Handa nang isara nang opisyal' : '✓ Ready for formal case resolution')}
                </span>
                <button
                  type="button"
                  data-flow="close"
                  disabled={busy}
                  onClick={() => onAction({ kind: 'close', counselingNotes: counselingNotes.trim() })}
                  className={`${btn} bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-[0.97]`}
                >
                  {isTl ? '✓ Pormal na Isara ang Kaso (Resolved)' : '✓ Officially Close Case (Resolved)'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Structured Student's Official Explanation Card (Clean & Formatted) */}
      {c.explanation && done.Explanation && (
        <div className="rounded-xl border border-[#CBD5E1] dark:border-[#1E2E4E] bg-white dark:bg-[#0C1527] overflow-hidden shadow-xs mt-3">
          <div className="px-4 py-2 bg-[#F8FAFC] dark:bg-[#0E1A33] border-b border-[#E2E8F0] dark:border-[#1E2E4E] flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7]">
              {isTl ? 'Opisyal na Paliwanag ng Naisumbong (Student’s Explanation)' : 'Student Respondent’s Official Explanation'}
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {isTl ? 'Naitala sa Due Process' : 'Verified & Recorded'}
            </span>
          </div>

          <div className="p-3.5 space-y-2 text-xs">
            <div className="space-y-0.5">
              <span className="block text-[11px] font-black uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7]">
                {isTl ? 'PANGALAN NG ESTUDYANTE' : 'STUDENT NAME'}
              </span>
              <p className="text-[12.5px] font-bold text-[#0F172A] dark:text-white">
                {c.studentName} {c.studentNumber ? `· ID #${c.studentNumber}` : ''} ({c.gradeSection})
              </p>
            </div>

            <div className="space-y-0.5 pt-1.5 border-t border-[#F1F5F9] dark:border-[#1E2E4E]">
              <span className="block text-[11px] font-black uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7]">
                {isTl ? 'SALAYSAY / PALIWANAG' : 'STATEMENT / EXPLANATION'}
              </span>
              <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0A1224] border border-[#E2E8F0] dark:border-[#1E2E4E] text-[12.5px] leading-relaxed text-[#0F172A] dark:text-slate-100 whitespace-pre-line font-medium">
                {c.explanation}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
