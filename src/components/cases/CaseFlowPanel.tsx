// The dynamic progressive due process case flow:
// For 1st Minor: 5 steps: Reported → Student Called → Explanation → Decision → Closed
// For Major / 2nd Minor / Serious: 8 steps: Reported → Student Called → Explanation → Schedule Conference → Parent Conference Attendance → Decision → Follow-Up → Closed
import React, { useMemo, useState, useEffect } from 'react';
import { Calendar, Phone, Check, AlertTriangle, Printer, Clock, RotateCcw, ShieldCheck, FileText, Mail } from 'lucide-react';
import type { ParentAppointmentItem } from '../../data/dashboardMockData';
import {
  CASE_STEPS,
  MINOR_CASE_STEPS,
  MAJOR_CASE_STEPS,
  type CaseStep,
  type DisciplineCaseRecord,
  type StudentRecord,
} from '../../data/stage3MockData';
import { suggestSlots, freeSlotsOn, slotLabel, todayISO, addDays, isOfficeDay, parseISO } from '../../services/scheduling';
import { findSensitiveWords, type Channel } from '../../services/parentComms';
import { smsInfo } from '../../services/smsText';
import { useAppConfig } from '../../services/appConfig';

export type FlowAction =
  | { kind: 'call' }
  | { kind: 'explanation'; text: string }
  | {
      kind: 'schedule_conference';
      targetDate?: string;
      inlineSchedule?: {
        date: string;
        timeSlot: string;
        sendNow: boolean;
        channel: Channel;
        message: string;
        rescheduleFromId?: string;
      };
    }
  | { kind: 'conference_outcome'; how: string; conferenceStatus: 'Attended' | 'No-Show'; notes?: string }
  | { kind: 'notified'; how: string; conferenceStatus?: 'Attended' | 'No-Show' }
  | { kind: 'decision'; decision: string; sanction: string }
  | { kind: 'followup'; sanctionDone?: boolean }
  | { kind: 'close'; counselingNotes?: string };

export function isMinorCase(c: DisciplineCaseRecord): boolean {
  const sev = (c.severity || '').toLowerCase();
  // If it's explicitly 1st minor offense and not escalated / serious, it's a 5-step minor flow.
  // 2nd minor and up, consecutive, escalated, major, serious, grave offenses strictly REQUIRE parent conference (8 steps).
  if (sev.includes('1st minor') && !sev.includes('serious') && !sev.includes('escalat') && !sev.includes('2nd') && !sev.includes('major')) {
    return true;
  }
  return (
    sev.includes('minor') &&
    !sev.includes('2nd') &&
    !sev.includes('3rd') &&
    !sev.includes('4th') &&
    !sev.includes('consecutive') &&
    !sev.includes('escalat') &&
    !sev.includes('serious') &&
    !sev.includes('major') &&
    !sev.includes('grave') &&
    !sev.includes('conference')
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
  const isNoShowLoop = c.parentConferenceStatus === 'No-Show' && c.status === 'Pending Reschedule';

  const hasConferenceScheduled =
    !isNoShowLoop &&
    (!!c.conferenceScheduledAt ||
      c.status === 'Conference Scheduled' ||
      !!c.parentNotifiedAt ||
      (!!c.parentConferenceStatus && c.parentConferenceStatus === 'Attended'));

  const hasConferenceAttendance =
    !isNoShowLoop &&
    !!c.parentConferenceStatus &&
    c.parentConferenceStatus === 'Attended';

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
    'Parent Notified': (!isNoShowLoop && !!c.parentNotifiedAt) || closed,
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
  student?: StudentRecord;
  isTl: boolean;
  busy: boolean;
  suggestedSanction: string;
  onAction: (a: FlowAction) => void;
  /** open the locked Student Statement Station for this case */
  onOpenStation?: () => void;
  /** print official call slip / summons form */
  onOpenPrint?: (initialKind?: import('../../services/printForms').FormKind) => void;
  /** all appointments in the system to check if this case already has a live scheduled conference */
  appointments?: ParentAppointmentItem[];
  /** open the real Parent Conference scheduling modal in ParentsHub */
  onScheduleConference?: (caseCode: string) => void;
}> = ({ c, student, isTl, busy, suggestedSanction, onAction, onOpenStation, onOpenPrint, appointments = [] }) => {
  const { done, next, activeSteps, isMinor } = useMemo(() => flowState(c), [c]);
  const cfg = useAppConfig();

  // Find live scheduled appointment for this case
  const liveAppointment = useMemo(() => {
    return appointments.find(
      (a) => a.caseId.toLowerCase() === c.caseCode.toLowerCase() && a.status !== 'Rescheduled' && a.status !== 'Did Not Attend'
    );
  }, [appointments, c.caseCode]);

  const officeSummary = useMemo(() => {
    const days = (cfg.officeHours?.days ?? ['Mon', 'Tue', 'Wed', 'Thu']).join('–');
    const start = cfg.officeHours?.start ?? '08:00';
    const end = cfg.officeHours?.end ?? '17:00';
    return {
      fullEn: `${days}, ${start} to ${end}`,
      fullTl: `${days}, ${start} hanggang ${end}`,
    };
  }, [cfg.officeHours]);

  // Inline Step 4 Conference Scheduler State
  const isReschedule = c.parentConferenceStatus === 'No-Show';

  const [changeScheduleMode, setChangeScheduleMode] = useState<boolean>(isReschedule);

  // Automatically ensure reschedule mode opens directly whenever case transitions to No-Show
  useEffect(() => {
    if (isReschedule) {
      setChangeScheduleMode(true);
    }
  }, [isReschedule]);
  const suggestions = useMemo(
    () =>
      suggestSlots(appointments, {
        fromISO: addDays(todayISO(), 1),
        prefDays: student?.parentPrefDays,
        prefTime: student?.parentPrefTime,
        limit: 6,
      }),
    [appointments, student?.parentPrefDays, student?.parentPrefTime]
  );
  const [schedDate, setSchedDate] = useState<string>(suggestions[0]?.date ?? addDays(todayISO(), 1));
  const [schedStart, setSchedStart] = useState<number | null>(suggestions[0]?.start ?? null);
  const [schedChannel, setSchedChannel] = useState<Channel>(student?.parentEmail ? 'both' : 'sms');
  const [schedSendNow, setSchedSendNow] = useState<boolean>(true);
  const [schedMsgLang, setSchedMsgLang] = useState<'taglish' | 'english'>('taglish');
  const [schedMsgEdited, setSchedMsgEdited] = useState<boolean>(false);

  const freeSlots = useMemo(() => freeSlotsOn(appointments, schedDate), [appointments, schedDate]);

  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    [isTl]
  );
  const dayTitle = (iso: string) => {
    const t = todayISO();
    const tmw = addDays(t, 1);
    if (iso === t) return isTl ? 'Ngayong araw' : 'Today';
    if (iso === tmw) return isTl ? 'Bukas' : 'Tomorrow';
    const d = parseISO(iso);
    return isNaN(d.getTime()) ? iso : dayFmt.format(d);
  };

  const buildInlineMsg = (d: string, s: number | null, lang: 'taglish' | 'english') => {
    if (s === null) return '';
    const when = `${dayTitle(d)}, ${slotLabel(s)}`;
    if (lang === 'english') {
      if (isReschedule) {
        return `AICS Guidance Office: Good day. The parent conference regarding ${c.studentName} has been rescheduled to ${when}. Our office is open Mon-Thu 8AM-5PM. Thank you.`;
      }
      return `AICS Guidance Office: Good day. You are requested to attend a parent conference regarding ${c.studentName} on ${when} at the Guidance Office. Thank you.`;
    }
    if (isReschedule) {
      return `AICS Guidance: Magandang araw po. Inilipat po sa ${when} ang Parent Conference para kay ${c.studentName}. Bukas kami Lunes-Huwebes 8AM-5PM. Salamat po.`;
    }
    return `AICS Guidance: Magandang araw po. Inaanyayahan po kayo sa Parent Conference para kay ${c.studentName} sa ${when} sa Guidance Office. Salamat po.`;
  };

  const [schedMessage, setSchedMessage] = useState<string>(() => buildInlineMsg(schedDate, schedStart, 'taglish'));
  useEffect(() => {
    if (!schedMsgEdited) {
      setSchedMessage(buildInlineMsg(schedDate, schedStart, schedMsgLang));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedDate, schedStart, schedMsgLang]);

  const sensitiveWords = useMemo(() => findSensitiveWords(schedMessage), [schedMessage]);
  const schedDateBad = !isOfficeDay(schedDate) || schedDate < todayISO();
  const canSaveInlineSched =
    !schedDateBad &&
    schedStart !== null &&
    freeSlots.includes(schedStart) &&
    !busy &&
    (!schedSendNow || (schedMessage.trim().length > 5 && sensitiveWords.length === 0));

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
        <p className={`text-xs font-semibold px-3 py-2 rounded-xl border ${c.sanctionStatus === 'Pending parent notice' ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200' : c.sanctionStatus === 'Done' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' : 'bg-[#EEF3FC] border-[#CBD5E1] text-[#1E469B] dark:bg-[#13203B] dark:border-[#223555] dark:text-[#7CB8F7]'}`} data-sanction-status>
          {isTl ? 'Sanction' : 'Sanction'}: <span className="font-bold">{c.sanction}</span> ·{' '}
          {c.sanctionStatus === 'Pending parent notice'
            ? isTl ? 'Naghihintay — magsisimula matapos ang conference ng magulang' : 'Waiting — starts after parent conference'
            : c.sanctionStatus === 'Done'
            ? isTl ? 'Tapos na' : 'Completed'
            : isTl ? 'Ginagawa na' : 'In progress'}
        </p>
      )}

      {/* Current Active Action Card */}
      {next && (
        <div className="rounded-xl bg-white dark:bg-[#0B1527] border border-[#CBD5E1] dark:border-[#1E2E4E] p-4 space-y-3 shadow-xs" data-next-step={next}>
          <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#1E2E4E] pb-2">
            <span className="text-xs font-bold text-[#1E469B] dark:text-[#7CB8F7]">
              {isTl ? 'Kasalukuyang hakbang' : 'Current step'}
            </span>
            <span className="px-2 py-0.5 rounded-[6px] text-xs font-semibold bg-[#F1F5F9] dark:bg-[#13203B] text-[#475569] dark:text-[#94A3B8] border border-[#CBD5E1] dark:border-[#334155]">
              {isTl ? `Hakbang ${stepIndex} ng ${totalSteps}` : `Step ${stepIndex} of ${totalSteps}`}
            </span>
          </div>

          {next === 'Student Called' && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {isTl ? 'Pagpapatawag sa estudyante' : 'Summon student to Guidance'}
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A8D0] mt-0.5">
                  {isTl
                    ? 'Mag-print ng opisyal na Call Slip para sa adviser o tawagan nang direkta.'
                    : 'Print an official Call Slip for the classroom adviser or coordinate directly.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                {onOpenPrint && (
                  <button
                    type="button"
                    onClick={() => onOpenPrint('callSlip')}
                    className={`${btn} rounded-lg border border-[#CBD5E1] dark:border-[#253B66] text-[#1E469B] dark:text-[#7CB8F7] hover:bg-[#F8FAFC] dark:hover:bg-[#13203B] flex items-center gap-1.5`}
                  >
                    <span>{isTl ? 'Mag-print ng Call Slip' : 'Print Call Slip'}</span>
                  </button>
                )}
                <button
                  type="button"
                  data-flow="call"
                  disabled={busy}
                  onClick={() => onAction({ kind: 'call' })}
                  className={`${primary} rounded-lg`}
                >
                  {isTl ? 'Nakarating na sa opisina' : 'Mark student summoned'}
                </button>
              </div>
            </div>
          )}

          {next === 'Explanation' && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {isTl ? 'Salaysay ng estudyante' : 'Student official explanation'}
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  {isTl ? 'I-type ang sinabi ng estudyante, o ipa-type nang direkta sa Statement Station.' : 'Type what the student explained, or let them type it via Statement Station.'}
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

          {/* Major Offense Step 4: Schedule Conference (Embedded Inline Scheduler) */}
          {next === 'Schedule Conference' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                    {isTl ? 'Patawag at iskedyul sa magulang' : 'Parent summons & conference scheduling'}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A8D0] mt-0.5">
                    {isTl
                      ? 'Pumili ng bakanteng araw at oras at ipadala ang abiso nang hindi umaalis sa kasong ito.'
                      : 'Pick a free date and time slot and send the parent summons directly inside this case.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(c.summonsCount || 0) > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-400/40">
                      {isTl ? `Ika-${(c.summonsCount || 0) + 1} patawag` : `Summons #${(c.summonsCount || 0) + 1}`}
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/15 text-[#1E469B] dark:text-[#7CB8F7] border border-blue-400/30">
                    {isTl ? 'Kailangan ang magulang' : 'Parent summons required'}
                  </span>
                </div>
              </div>

              {/* Show previous No-Show notice if rescheduled */}
              {c.parentConferenceStatus === 'No-Show' && (
                <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 flex items-start gap-2.5">
                  <RotateCcw className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-950 dark:text-rose-200">
                    <p className="font-bold">
                      {isTl
                        ? `Hindi sumipot (No-Show) ang magulang sa nakaraang Summons #${c.summonsCount || 1}.`
                        : `Parent was a No-Show on previous Summons #${c.summonsCount || 1}.`}
                    </p>
                    <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                      {isTl
                        ? 'Pumili ng bagong petsa at oras sa ibaba para sa susunod na patawag (Re-summons) bago mag-desisyon.'
                        : 'Select a new date and time below to issue the next summons before rendering a decision.'}
                    </p>
                  </div>
                </div>
              )}

              {/* If an active appointment already exists and user hasn't clicked "Change date", but not in No-Show reschedule */}
              {liveAppointment && !changeScheduleMode && !isReschedule ? (
                <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      {isTl ? 'May naka-schedule nang conference' : 'Active conference scheduled'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChangeScheduleMode(true)}
                        className="text-xs font-semibold text-[#1E469B] dark:text-[#7CB8F7] hover:underline"
                      >
                        {isTl ? 'Palitan ang araw/oras' : 'Change date/time'}
                      </button>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
                        {liveAppointment.status}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#64748B] dark:text-[#94A8D0] block text-xs font-semibold">{isTl ? 'Araw at oras' : 'Date & time'}</span>
                      <span className="font-bold text-[#0F172A] dark:text-white">{dayTitle(liveAppointment.date)} ({liveAppointment.date}) · {liveAppointment.timeSlot}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] dark:text-[#94A8D0] block text-xs font-semibold">{isTl ? 'Magulang' : 'Parent contact'}</span>
                      <span className="font-semibold text-[#0F172A] dark:text-white">{liveAppointment.parentName} ({liveAppointment.parentPhone || 'No phone'})</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {onOpenPrint && (
                        <button
                          type="button"
                          onClick={() => onOpenPrint('callSlip')}
                          className="btn-press px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-[#0B1527] text-xs font-semibold text-[#0F172A] dark:text-white flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#1E469B] dark:text-[#7CB8F7]" />
                          {isTl ? 'I-print ang Call Slip' : 'Print Call Slip'}
                        </button>
                      )}
                      <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                        {isTl ? 'Pindutin ang kumpirma para tumuloy sa Step 5 (Attendance).' : 'Confirm to advance to Step 5 (Attendance).'}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-flow="schedule-conference"
                      disabled={busy}
                      onClick={() => onAction({ kind: 'schedule_conference', targetDate: `${liveAppointment.date} ${liveAppointment.timeSlot}` })}
                      className="btn-press px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                    >
                      {isTl ? 'Kumpirmahin at magpatuloy' : 'Confirm & proceed'}
                    </button>
                  </div>
                </div>
              ) : (
                /* FULL EMBEDDED PARENT CONFERENCE SCHEDULER INSIDE STEP 4 */
                <div className="rounded-xl border border-[#CBD5E1] dark:border-[#223555] bg-white dark:bg-[#0B1527] shadow-xs overflow-hidden divide-y divide-[#E2E8F0] dark:divide-[#1E2E4E]">
                  {/* 1. Parent contact strip */}
                  {student && (
                    <div className="p-3 bg-[#F8FAFC] dark:bg-[#0F182C] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#64748B] dark:text-[#94A3B8]">{isTl ? 'Magulang:' : 'Parent:'}</span>
                        <span className="font-bold text-[#0F172A] dark:text-white">{student.parentName || '—'}</span>
                        {student.parentPhone && (
                          <span className="font-mono font-semibold text-[#1E469B] dark:text-[#7CB8F7]">· {student.parentPhone}</span>
                        )}
                        {student.parentEmail && (
                          <span className="text-[#64748B] dark:text-[#94A3B8]">· {student.parentEmail}</span>
                        )}
                      </div>
                      {liveAppointment && changeScheduleMode && !isReschedule && (
                        <button
                          type="button"
                          onClick={() => setChangeScheduleMode(false)}
                          className="text-xs font-semibold text-[#1E469B] dark:text-[#7CB8F7] hover:underline"
                        >
                          {isTl ? 'Kanselahin ang pagpapalit' : 'Keep current schedule'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* 2. Slot Selection Section */}
                  <div className="p-3.5 space-y-3">
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold text-[#0F172A] dark:text-white">
                        {isTl ? 'Mungkahing bakanteng oras (1-click pumili):' : 'Suggested free times (1-click select):'}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-inline-suggestions>
                        {suggestions.length === 0 && (
                          <span className="text-xs text-[#64748B] col-span-3">{isTl ? 'Pumili ng araw sa ibaba.' : 'Pick a date below.'}</span>
                        )}
                        {suggestions.map((s) => {
                          const isSelected = s.date === schedDate && s.start === schedStart;
                          return (
                            <button
                              key={s.date + s.start}
                              type="button"
                              onClick={() => {
                                setSchedDate(s.date);
                                setSchedStart(s.start);
                              }}
                              className={`btn-press px-2.5 py-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                                isSelected
                                  ? 'bg-[#1E469B] border-[#1E469B] text-white shadow-xs ring-2 ring-[#1E469B]/20'
                                  : 'bg-[#F8FAFC] dark:bg-[#0F182C] border-[#CBD5E1] dark:border-[#253B66] text-[#0F172A] dark:text-white hover:border-[#1E469B]'
                              }`}
                            >
                              <span className="block font-bold">{dayTitle(s.date)}</span>
                              <span className="block text-[11px] opacity-90 mt-0.5">{s.label.split('–')[0].trim()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Manual Date & Slot Override */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#F1F5F9] dark:border-[#1E2E4E] text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-[#0F172A] dark:text-white" htmlFor="inline-conf-date">
                            {isTl ? 'O pumili ng ibang araw' : 'Or select another day'}
                          </label>
                          <span className="text-[11px] text-[#64748B] dark:text-[#94A8D0]">
                            Mon–Thu 8AM–5PM
                          </span>
                        </div>
                        <input
                          id="inline-conf-date"
                          type="date"
                          min={todayISO()}
                          value={schedDate}
                          onChange={(e) => {
                            setSchedDate(e.target.value);
                            setSchedStart(null);
                          }}
                          className={`w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-xs font-semibold text-[#0F172A] dark:text-white ${
                            schedDateBad ? 'ring-2 ring-rose-500' : ''
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-[#0F172A] dark:text-white mb-1" htmlFor="inline-conf-time">
                          {isTl ? 'Oras ng Conference (45 mins)' : 'Conference Time Slot (45 mins)'}
                        </label>
                        <select
                          id="inline-conf-time"
                          value={schedStart ?? ''}
                          onChange={(e) => setSchedStart(e.target.value === '' ? null : Number(e.target.value))}
                          disabled={schedDateBad}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-xs font-semibold text-[#0F172A] dark:text-white"
                        >
                          <option value="">
                            {schedDateBad
                              ? '—'
                              : freeSlots.length
                              ? isTl ? 'Pumili ng oras' : 'Select time slot'
                              : isTl ? 'Puno na ang araw na ito' : 'This day is fully booked'}
                          </option>
                          {freeSlots.map((s) => (
                            <option key={s} value={s}>
                              {slotLabel(s)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 3. Notice Dispatch & Message Section */}
                  <div className="p-3.5 bg-[#F8FAFC]/60 dark:bg-[#0F182C]/60 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={schedSendNow}
                          onChange={(e) => setSchedSendNow(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#1E469B]"
                        />
                        {isTl ? 'Magpadala ng abiso sa magulang' : 'Dispatch notice to parent'}
                      </label>

                      {schedSendNow && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(['sms', 'gmail', 'both'] as Channel[]).map((ch) => (
                            <button
                              key={ch}
                              type="button"
                              disabled={ch !== 'sms' && !student?.parentEmail}
                              onClick={() => setSchedChannel(ch)}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                                schedChannel === ch
                                  ? 'bg-[#1E469B] border-[#1E469B] text-white shadow-xs'
                                  : 'bg-white dark:bg-[#0B1527] border-[#CBD5E1] dark:border-[#253B66] text-[#475569] dark:text-[#94A8D0]'
                              }`}
                            >
                              {ch === 'sms' ? 'SMS' : ch === 'gmail' ? 'Email' : 'SMS + Email'}
                            </button>
                          ))}
                          <div className="inline-flex rounded-md border border-[#CBD5E1] dark:border-[#253B66] p-0.5 bg-white dark:bg-[#0B1527]">
                            <button
                              type="button"
                              onClick={() => {
                                setSchedMsgLang('taglish');
                                setSchedMsgEdited(false);
                                setSchedMessage(buildInlineMsg(schedDate, schedStart, 'taglish'));
                              }}
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                schedMsgLang === 'taglish' ? 'bg-[#1E469B] text-white' : 'text-[#475569] dark:text-[#94A8D0]'
                              }`}
                            >
                              Taglish
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSchedMsgLang('english');
                                setSchedMsgEdited(false);
                                setSchedMessage(buildInlineMsg(schedDate, schedStart, 'english'));
                              }}
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                schedMsgLang === 'english' ? 'bg-[#1E469B] text-white' : 'text-[#475569] dark:text-[#94A8D0]'
                              }`}
                            >
                              English
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {schedSendNow && (
                      <div className="space-y-1">
                        <textarea
                          rows={3}
                          value={schedMessage}
                          onChange={(e) => {
                            setSchedMessage(e.target.value);
                            setSchedMsgEdited(true);
                          }}
                          className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-[#0B1527] text-xs font-medium text-[#0F172A] dark:text-white leading-relaxed resize-y ${
                            sensitiveWords.length ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#CBD5E1] dark:border-[#253B66]'
                          }`}
                        />
                        {sensitiveWords.length > 0 ? (
                          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                            {isTl
                              ? `Bawal ang detalye ng offense sa mensahe ("${sensitiveWords.join('", "')}"). `
                              : `No offense details allowed ("${sensitiveWords.join('", "')}"). `}
                            <button
                              type="button"
                              className="underline font-bold"
                              onClick={() => {
                                setSchedMsgEdited(false);
                                setSchedMessage(buildInlineMsg(schedDate, schedStart, schedMsgLang));
                              }}
                            >
                              {isTl ? 'Ibalik sa ligtas na mensahe' : 'Restore safe message'}
                            </button>
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#64748B] dark:text-[#94A8D0]">
                            {(() => {
                              const info = smsInfo(schedMessage);
                              return isTl
                                ? `${info.length} letra · ${info.parts} SMS · RA 10173 compliant (walang detalye ng offense)`
                                : `${info.length} characters · ${info.parts} SMS · RA 10173 compliant (no offense details)`;
                            })()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. Action Bar */}
                  <div className="p-3 bg-white dark:bg-[#0B1527] flex flex-wrap items-center justify-between gap-2">
                    {onOpenPrint ? (
                      <button
                        type="button"
                        onClick={() => onOpenPrint('callSlip')}
                        className="btn-press px-3 py-1.5 rounded-lg border border-[#CBD5E1] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-xs font-semibold text-[#0F172A] dark:text-white hover:border-[#1E469B] flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#1E469B] dark:text-[#7CB8F7]" />
                        {isTl ? 'Mag-print ng Call Slip / Summons' : 'Print Call Slip / Summons'}
                      </button>
                    ) : <span />}

                    <button
                      type="button"
                      data-flow="schedule-conference-inline"
                      disabled={!canSaveInlineSched || schedStart === null}
                      onClick={() => {
                        if (schedStart === null) return;
                        const slotStr = slotLabel(schedStart);
                        onAction({
                          kind: 'schedule_conference',
                          targetDate: `${dayTitle(schedDate)} · ${slotStr}`,
                          inlineSchedule: {
                            date: schedDate,
                            timeSlot: slotStr,
                            sendNow: schedSendNow,
                            channel: schedChannel,
                            message: schedMessage.trim(),
                            rescheduleFromId: liveAppointment?.id,
                          },
                        });
                        setChangeScheduleMode(false);
                      }}
                      className="btn-press px-4 py-2 rounded-lg bg-[#1E469B] hover:bg-[#16377E] text-white text-xs font-semibold disabled:opacity-50 shadow-xs"
                    >
                      {schedStart === null
                        ? isTl ? 'Pumili muna ng oras' : 'Pick a time first'
                        : isReschedule || changeScheduleMode
                        ? isTl ? 'I-save ang bagong schedule at tumuloy sa Step 5' : 'Save new schedule & proceed to Step 5'
                        : isTl ? 'I-schedule ang conference at tumuloy sa Step 5' : 'Schedule conference & proceed to Step 5'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Major Offense Step 5: Conference Attendance Hearing (Attended vs No-Show / Reschedule) */}
          {(next === 'Parent Conference Attendance' || next === 'Parent Notified') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                    {isTl ? 'Pagharap ng magulang' : 'Parent conference attendance'}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A8D0] mt-0.5">
                    {isTl
                      ? 'I-record kung dumalo o hindi sumipot ang magulang upang makapagpatuloy sa pormal na proseso.'
                      : 'Record whether the parent attended or was a no-show to determine due process progression.'}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/30">
                  {isTl ? 'Pagpapatotoo' : 'Verification'}
                </span>
              </div>

              {/* Attendance Choice */}
              <div className="rounded-xl border border-[#CBD5E1] dark:border-[#223555] bg-white dark:bg-[#0B1527] shadow-xs overflow-hidden divide-y divide-[#E2E8F0] dark:divide-[#1E2E4E]">
                <div className="p-3.5 space-y-2.5">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white block">
                    {isTl ? 'Dumalo ba ang magulang sa itinakdang conference?' : 'Did the parent attend the scheduled conference?'}
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setParentStatus('Attended')}
                      className={`btn-press p-3 rounded-xl text-xs font-bold border flex flex-col sm:flex-row items-center justify-center gap-2 transition-all ${
                        parentStatus === 'Attended'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-600/20'
                          : 'bg-[#F8FAFC] dark:bg-[#0F182C] border-[#CBD5E1] dark:border-[#253B66] text-[#0F172A] dark:text-white hover:border-emerald-600'
                      }`}
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{isTl ? 'Dumalo ang Magulang' : 'Parent Attended'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setParentStatus('No-Show')}
                      className={`btn-press p-3 rounded-xl text-xs font-bold border flex flex-col sm:flex-row items-center justify-center gap-2 transition-all ${
                        parentStatus === 'No-Show'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-600/20'
                          : 'bg-[#F8FAFC] dark:bg-[#0F182C] border-[#CBD5E1] dark:border-[#253B66] text-[#0F172A] dark:text-white hover:border-amber-600'
                      }`}
                    >
                      <RotateCcw className="w-4 h-4 shrink-0" />
                      <span>{isTl ? 'Hindi Sumipot (No-Show)' : 'Did Not Show Up'}</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0F182C] border border-[#E2E8F0] dark:border-[#1E2E4E]">
                    {parentStatus === 'No-Show' ? (
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold leading-relaxed flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>{isTl
                          ? 'Babalik sa Step 4 para magtakda ng susunod na patawag (Re-summons). Naka-lock ang desisyon.'
                          : 'Will cycle back to Step 4 to issue the next summons. Sanction decision remains locked.'}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold leading-relaxed flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <span>{isTl
                          ? 'Nakaharap ang magulang. Ma-unlock ang Step 6 (Desisyon) pagka-save.'
                          : 'Parent attended the hearing. Step 6 (Decision) will unlock upon saving.'}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Hearing Method */}
                <div className="p-3.5 bg-[#F8FAFC]/50 dark:bg-[#0F182C]/50 space-y-2">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white block">
                    {isTl ? 'Paraan ng komunikasyon / pagdinig:' : 'Hearing / communication method:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {HOW.map(([en, tl]) => (
                      <button 
                        key={en} 
                        type="button" 
                        data-how={en} 
                        aria-pressed={how === en} 
                        onClick={() => setHow(en)} 
                        className={`btn-press px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          how === en 
                            ? 'bg-[#1E469B] text-white border-[#1E469B] shadow-xs' 
                            : 'border-[#CBD5E1] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-[#475569] dark:text-[#94A3B8] hover:border-[#1E469B]'
                        }`}
                      >
                        {isTl ? tl : en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="p-3 bg-white dark:bg-[#0B1527] flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {isTl
                      ? 'I-save ang tala upang umusad ang kaso.'
                      : 'Save attendance record to proceed.'}
                  </span>
                  <button
                    type="button"
                    data-flow="conference-outcome"
                    disabled={busy || !how}
                    onClick={() => onAction({ kind: 'conference_outcome', how, conferenceStatus: parentStatus })}
                    className={`btn-press px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 ${
                      parentStatus === 'No-Show'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {parentStatus === 'No-Show' ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isTl ? 'I-save: No-Show & Bumalik sa Summons' : 'Save: No-Show & Re-Summons'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{isTl ? 'I-save: Dumalo ang Magulang' : 'Save: Parent Attended'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {next === 'Decision' && (
            <div className="space-y-3" data-decision-box>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {isTl ? 'Hatol at desisyon' : 'Case decision & ruling'}
                </p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-400/30">
                  {isTl ? 'Pormal na hatol' : 'Official ruling'}
                </span>
              </div>

              {/* 1-Click Quick Decision Chips */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[#475569] dark:text-[#94A8D0] block">
                  {isTl ? 'Mabilisang pagpili:' : 'Quick resolution presets:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    {
                      labelEn: 'Confirmed violation',
                      labelTl: 'Napatunayang lumabag',
                      descEn: isMinor
                        ? `Confirmed minor infraction of ${c.offenseTitleEn}. Issued official verbal reminder and guidance counseling.`
                        : `Found responsible for ${c.offenseTitleEn} after conference with student and parent.`,
                      descTl: isMinor
                        ? `Napatunayang may paglabag sa ${c.offenseTitleTl}. Nabigyan ng paalala at guidance counseling.`
                        : `Napatunayang may pananagutan sa ${c.offenseTitleTl} matapos dinggin ang panig kasama ang magulang.`
                    },
                    {
                      labelEn: 'Amicable settlement',
                      labelTl: 'Nagkasundo',
                      descEn: 'Parties reached mutual understanding and signed an amicable agreement with restitution.',
                      descTl: 'Nagkasundo ang magkabilang panig at pumirma ng kasunduan ng pagbabati at paumanhin.'
                    },
                    {
                      labelEn: 'First warning with undertaking',
                      labelTl: 'Unang babala at kasunduan',
                      descEn: 'First offense with remorse: issued official warning and signed behavioral pledge.',
                      descTl: 'Unang paglabag na may pagsisisi: binigyan ng pormal na babala at lumagda sa behavioral pledge.'
                    },
                    {
                      labelEn: 'Cleared / misunderstanding',
                      labelTl: 'Naipaliwanag / walang pananagutan',
                      descEn: 'Case clarified as misunderstanding; student acted in defense or cleared of wrongdoing.',
                      descTl: 'Naipaliwanag na walang malisyosong intensyon o napagkamalan lamang; abswelto ang estudyante.'
                    }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDecision(isTl ? preset.descTl : preset.descEn)}
                      className={`text-left p-2 rounded-lg border text-xs transition-[border-color,background-color] active:scale-[0.98] ${
                        decision === (isTl ? preset.descTl : preset.descEn)
                          ? 'border-[#1E469B] bg-sky-50 dark:bg-sky-950/40 text-[#1E469B] dark:text-[#7CB8F7] font-bold shadow-xs'
                          : 'border-slate-200 dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <div className="font-semibold text-xs leading-snug">
                        {isTl ? preset.labelTl : preset.labelEn}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="block text-xs font-semibold text-[#475569] dark:text-[#94A8D0] mb-1">
                  {isTl ? 'Opisyal na hatol' : 'Official decision'}
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
                <span className="block text-xs font-semibold text-[#475569] dark:text-[#94A8D0] mb-1">
                  {isTl ? 'Sanction (mula sa Handbook — puwedeng baguhin)' : 'Sanction (Handbook standard — editable)'}
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
                  {isTl ? 'I-save ang desisyon' : 'Save decision & sanction'}
                </button>
              </div>
            </div>
          )}

          {next === 'Follow-Up' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                    {isTl ? 'Pagsubaybay sa sanction' : 'Sanction monitoring'}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A8D0]">
                    {isTl ? `Sanction: ${c.sanction || 'Formative Intervention'}` : `Sanction: ${c.sanction || 'Formative Intervention'}`}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${c.sanctionStatus === 'Done' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300'}`}>
                  {c.sanctionStatus === 'Done' ? (isTl ? 'Natapos na' : 'Completed') : (isTl ? 'Ginagawa pa' : 'In progress')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#13203B] border border-slate-200 dark:border-white/10 space-y-2">
                <span className="text-xs font-semibold text-[#475569] dark:text-[#94A8D0] block">
                  {isTl ? 'Katayuan ng sanction:' : 'Sanction status:'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-flow="followup-start"
                    disabled={busy || c.sanctionStatus === 'Pending parent notice'}
                    onClick={() => onAction({ kind: 'followup', sanctionDone: false })}
                    className="btn-press px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1527] text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-[#1E469B]"
                  >
                    {isTl ? 'Nagsimula / ginagawa pa' : 'Serving / in progress'}
                  </button>
                  <button
                    type="button"
                    data-flow="followup-done"
                    disabled={busy || c.sanctionStatus === 'Pending parent notice'}
                    onClick={() => onAction({ kind: 'followup', sanctionDone: true })}
                    className="btn-press px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isTl ? 'Nakumpleto na ang sanction' : 'Sanction completed'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {next === 'Closed' && (
            <div className="space-y-3">
              {/* Executive Due Process & Sanction Compliance Summary Card */}
              <div className="rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/40 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      {isTl ? 'Buod ng pagsunod sa due process' : 'Due process & compliance summary'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                    {isTl ? 'Kumpleto ang mga hakbang' : 'Ready for closure'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white/90 dark:bg-[#0B1527] border border-emerald-200/80 dark:border-emerald-950">
                    <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A8D0] block">
                      {isTl ? '1. Salaysay ng estudyante' : '1. Student statement'}
                    </span>
                    <span className="font-bold text-[#0F172A] dark:text-white block mt-0.5">
                      {c.explanation ? (isTl ? 'Nakasulat at naitala' : 'Filed & verified') : (isTl ? 'Naitala' : 'Acknowledged')}
                    </span>
                  </div>

                  {!isMinor && (
                    <div className="p-2.5 rounded-lg bg-white/90 dark:bg-[#0B1527] border border-emerald-200/80 dark:border-emerald-950">
                      <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A8D0] block">
                        {isTl ? '2. Pagharap ng magulang' : '2. Parent hearing'}
                      </span>
                      <span className="font-bold text-[#0F172A] dark:text-white block mt-0.5">
                        {c.parentConferenceStatus === 'Attended'
                          ? (isTl ? `Dumalo (${c.summonsCount || 1} patawag)` : `Attended (${c.summonsCount || 1} summons)`)
                          : (isTl ? 'Naabisuhan' : 'Hearing held')}
                      </span>
                    </div>
                  )}

                  <div className="p-2.5 rounded-lg bg-white/90 dark:bg-[#0B1527] border border-emerald-200/80 dark:border-emerald-950">
                    <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A8D0] block">
                      {isMinor ? (isTl ? '2. Sanction' : '2. Sanction') : (isTl ? '3. Sanction' : '3. Sanction')}
                    </span>
                    <span className="font-bold text-[#0F172A] dark:text-white block truncate mt-0.5">
                      {c.sanction || (isTl ? 'Babala at counseling' : 'Warning & counseling')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {isTl ? 'Tala ng counseling bago isara ang kaso:' : 'Counseling notes before closure:'}
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
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
                <div className="flex items-center gap-2">
                  {onOpenPrint && (
                    <button
                      type="button"
                      onClick={() => onOpenPrint('caseResolutionSummary')}
                      className="btn-press px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1527] text-xs font-semibold text-[#0F172A] dark:text-white hover:border-[#1E469B] flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#1E469B] dark:text-[#7CB8F7]" />
                      <span>{isTl ? 'I-print ang buod ng kaso' : 'Print resolution summary'}</span>
                    </button>
                  )}
                  <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                    {counselingNotes.trim().length < 5
                      ? (isTl ? 'Maglagay ng maikling tala ng counseling bago isara.' : 'Enter brief counseling notes before closing.')
                      : (isTl ? 'Handa nang isara nang opisyal' : 'Ready for formal case resolution')}
                  </span>
                </div>
                <button
                  type="button"
                  data-flow="close"
                  disabled={busy}
                  onClick={() => onAction({ kind: 'close', counselingNotes: counselingNotes.trim() })}
                  className={`${btn} bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:scale-[0.97] flex items-center gap-1.5`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isTl ? 'Isara ang kaso (Resolved)' : 'Close case (Resolved)'}</span>
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
            <span className="text-xs font-bold text-[#1E469B] dark:text-[#7CB8F7]">
              {isTl ? 'Opisyal na paliwanag ng estudyante' : 'Student official explanation'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {isTl ? 'Naitala' : 'Verified'}
            </span>
          </div>

          <div className="p-3.5 space-y-2 text-xs">
            <div className="space-y-0.5">
              <span className="block text-xs font-semibold text-[#64748B] dark:text-[#94A8D0]">
                {isTl ? 'Pangalan ng estudyante' : 'Student name'}
              </span>
              <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                {c.studentName} {c.studentNumber ? `· ID #${c.studentNumber}` : ''} ({c.gradeSection})
              </p>
            </div>

            <div className="space-y-0.5 pt-1.5 border-t border-[#F1F5F9] dark:border-[#1E2E4E]">
              <span className="block text-xs font-semibold text-[#64748B] dark:text-[#94A8D0]">
                {isTl ? 'Salaysay / paliwanag' : 'Statement'}
              </span>
              <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0A1224] border border-[#E2E8F0] dark:border-[#1E2E4E] text-xs leading-relaxed text-[#0F172A] dark:text-slate-100 whitespace-pre-line font-medium">
                {c.explanation}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summons & Reschedule History Tracker (For Case Documentation & Closure PDF) */}
      {(c.summonsCount || 0) > 0 || c.parentConferenceStatus === 'No-Show' ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 overflow-hidden shadow-xs mt-3">
          <div className="px-4 py-2 bg-amber-100/60 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                {isTl ? 'Kasaysayan ng mga Patawag sa Magulang (Summons Record)' : 'Parent Summons & Attendance History'}
              </span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-800/60 text-amber-950 dark:text-amber-100">
              {c.summonsCount || 1} {isTl ? 'Patawag' : 'Summons'} {c.parentConferenceStatus === 'No-Show' ? `(${c.summonsCount || 1} No-Show)` : ''}
            </span>
          </div>

          <div className="p-3 text-xs space-y-2">
            <p className="text-[#64748B] dark:text-amber-300 font-medium leading-relaxed">
              {isTl
                ? `Ang kasong ito ay may naitalang ${c.summonsCount || 1} patawag sa magulang. Naitatala ang bawat hindi pagsipot (No-Show) alinsunod sa DepEd Order No. 40 para sa pormal na buod ng saradong kaso.`
                : `This case has recorded ${c.summonsCount || 1} parent summons. Each no-show event is preserved under DepEd Order No. 40 due process guidelines for the final closed case report.`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
              <div className="p-2 rounded-lg bg-white/80 dark:bg-[#0B1527] border border-amber-200 dark:border-amber-900/50">
                <span className="text-[#64748B] dark:text-[#94A8D0] block text-[11px] font-semibold">{isTl ? 'Huling Patawag (Summons)' : 'Latest Summons'}</span>
                <span className="font-bold text-[#0F172A] dark:text-white">Summons #{c.summonsCount || 1} · {c.conferenceTargetDate || 'Scheduled'}</span>
              </div>
              <div className="p-2 rounded-lg bg-white/80 dark:bg-[#0B1527] border border-amber-200 dark:border-amber-900/50">
                <span className="text-[#64748B] dark:text-[#94A8D0] block text-[11px] font-semibold">{isTl ? 'Katayuan ng Magulang' : 'Parent Status'}</span>
                <span className={`font-bold ${c.parentConferenceStatus === 'No-Show' ? 'text-rose-600 dark:text-rose-400' : c.parentConferenceStatus === 'Attended' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                  {c.parentConferenceStatus || 'Pending Hearing'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
