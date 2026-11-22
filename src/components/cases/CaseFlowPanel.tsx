// The dynamic progressive due process case flow:
// For 1st Minor: 5 steps: Reported → Student Called → Explanation → Decision → Closed
// For Major / 2nd Minor / Serious: 8 steps: Reported → Student Called → Explanation → Schedule Conference → Parent Conference Attendance → Decision → Follow-Up → Closed
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Calendar, Phone, Check, AlertTriangle, Printer, Clock, RotateCcw, ShieldCheck, FileText, Mail, CalendarCheck2, CalendarDays, FolderOpen } from 'lucide-react';
import type { ParentAppointmentItem } from '../../data/dashboardMockData';
import {
  CASE_STEPS,
  MINOR_CASE_STEPS,
  MAJOR_CASE_STEPS,
  type CaseStep,
  type DisciplineCaseRecord,
  type StudentRecord,
} from '../../data/stage3MockData';
import { suggestSlots, freeSlotsOn, slotLabel, todayISO, addDays, isOfficeDay, parseISO, officeHoursText, daySlots, sanctionEndFrom } from '../../services/scheduling';
import { findSensitiveWords, type Channel } from '../../services/parentComms';
import { DateField } from '../ui/DateField';
import { ParentContactGate, phoneProblem, parentEmailMarkedNone, markParentEmailNone, isEmail } from './ParentContactGate';
import { buildFolderHtml, buildBatchCallSlipsHtml, printHtml, type FormKind } from '../../services/printForms';
import { summonsLevel, summonsAttempt, summonsLabel, summonsMessage, maxSummons } from '../../services/summonsLadder';
import { smsInfo } from '../../services/smsText';
import { useAppConfig, getAppConfig } from '../../services/appConfig';

export type FlowAction =
  | { kind: 'call' }
  | { kind: 'absent' }
  | { kind: 'explanation'; text: string; present?: string; refused?: boolean; noticed?: boolean }
  | { kind: 'proceed_without_parent'; reason: string }
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
  | { kind: 'conference_outcome'; how: string; conferenceStatus: 'Attended' | 'No-Show'; notes?: string; attendedBy?: string }
  | { kind: 'notified'; how: string; conferenceStatus?: 'Attended' | 'No-Show' }
  | { kind: 'decision'; decision: string; sanction: string; sanctionEndDate?: string; principalApprovedBy?: string }
  | { kind: 'appeal'; by: string; reason: string; result: string; note?: string }
  | { kind: 'followup'; sanctionDone?: boolean }
  | { kind: 'close'; counselingNotes?: string };

/** Reminder shown when talking to the reported student: protect whoever reported (no retaliation) */
/** after this many parent no-shows, the case may continue to the Decision without the parent */
type MsgStyle = 'auto' | 'short';
/** how the parent was told the decision (for the sanction to start) */
const NOTICE_HOW: [string, string][] = [
  ['Phone call', 'Tawag sa telepono'],
  ['SMS / text', 'SMS / text'],
  ['In person', 'Personal'],
  ['Letter', 'Sulat'],
];


const ConfidentialHint: React.FC<{ isTl: boolean }> = ({ isTl }) => (
  <p className="flex items-start gap-1.5 text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
    <ShieldCheck className="w-3.5 h-3.5 mt-px shrink-0 text-[#007AFF] dark:text-[#409CFF]" aria-hidden />
    {isTl
      ? 'Huwag banggitin sa estudyante kung sino ang nag-report o naapektuhan.'
      : 'Do not tell the student who reported them or who was affected.'}
  </p>
);

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

/** short stepper labels so no step wraps to 3 lines (Golden Rule 8) */
const SHORT_EN: Partial<Record<CaseStep, string>> = {
  'Schedule Conference': 'Schedule',
  'Parent Conference Attendance': 'Parent came?',
  'Student Called': 'Student called',
};

/** the current step as one plain question/instruction (Golden Rule 6) */
const STEP_QUESTION_EN: Partial<Record<CaseStep, string>> = {
  'Student Called': 'Call the student to the office',
  Explanation: "Write the student's side",
  'Schedule Conference': 'Schedule the parent conference',
  'Parent Conference Attendance': 'Did the parent come?',
  'Parent Notified': 'Did the parent come?',
  Decision: 'Decide the sanction',
  'Follow-Up': 'Check the sanction',
  Closed: 'Close the case',
};
const STEP_QUESTION_TL: Partial<Record<CaseStep, string>> = {
  'Student Called': 'Tawagin ang estudyante sa opisina',
  Explanation: 'Isulat ang panig ng estudyante',
  'Schedule Conference': 'I-schedule ang conference ng magulang',
  'Parent Conference Attendance': 'Dumating ba ang magulang?',
  'Parent Notified': 'Dumating ba ang magulang?',
  Decision: 'Pagpasyahan ang sanction',
  'Follow-Up': 'Suriin ang sanction',
  Closed: 'Isara ang kaso',
};

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
];

/** which steps are done, from the saved fields */
export function flowState(c: DisciplineCaseRecord) {
  const isMinor = isMinorCase(c);
  const activeSteps = isMinor ? MINOR_CASE_STEPS : MAJOR_CASE_STEPS;
  const closed = c.status === 'Resolved';
  const isNoShowLoop = c.parentConferenceStatus === 'No-Show' && c.status === 'Pending Reschedule' && !c.proceededWithoutParent;

  const hasConferenceScheduled =
    !isNoShowLoop &&
    (!!c.conferenceScheduledAt ||
      c.status === 'Conference Scheduled' ||
      !!c.parentNotifiedAt ||
      (!!c.parentConferenceStatus && c.parentConferenceStatus === 'Attended') ||
      !!c.proceededWithoutParent);

  const hasConferenceAttendance =
    !isNoShowLoop &&
    !!c.parentConferenceStatus &&
    (c.parentConferenceStatus === 'Attended' || !!c.proceededWithoutParent);

  // Follow-Up is done only when the sanction is FINISHED (a running sanction keeps the case in Step 7)
  const hasFollowUpDone = c.sanctionStatus === 'Done' || closed;

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
  /** other cases from the same group incident, so decisions stay fair */
  groupCases?: DisciplineCaseRecord[];
  /** open the real Parent Conference scheduling modal in ParentsHub */
  onScheduleConference?: (caseCode: string) => void;
  /** update student's parent contact info directly from this card */
  onUpdateStudentContact?: (studentNumber: string, phone: string, email: string) => Promise<boolean>;
  /** opens the parent SMS composer (safe message, no offense details) */
  onComposeParent?: () => void;
  /** same incident: turn "wait for every parent before deciding" on/off for all its cases */
  onSetWaitForAll?: (on: boolean) => void;
  /** same incident: schedule the other students' parents too (one action per case) */
  onScheduleOthers?: (items: { c: DisciplineCaseRecord; action: FlowAction }[]) => void;
}> = ({ c, student, isTl, busy, suggestedSanction, onAction, onOpenStation, onOpenPrint, appointments = [], groupCases = [], onUpdateStudentContact, onComposeParent, onSetWaitForAll, onScheduleOthers }) => {
  // students in the same incident whose parent conference is not done yet (only matters when "wait for all" is on)
  const groupWaiting = groupCases.filter(
    (g) => g.status !== 'Resolved' && g.parentConferenceStatus !== 'Attended' && !g.proceededWithoutParent && !g.decision
  );
  const decisionLocked = !!c.waitForAll && groupWaiting.length > 0;
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
  // the ready message gets firmer with each missed conference and with how heavy the matter is
  const [msgStyle, setMsgStyle] = useState<MsgStyle>('auto');
  const ladderLevel = summonsLevel(c.severity);
  const ladderAt = summonsAttempt(c.summonsCount);
  const ladderWhy = summonsLabel(ladderLevel, ladderAt.n, ladderAt.isLast, isTl);
  // the date picker shows "November 18, 2026", not "11/18/2026"
  const otherDayRef = useRef<HTMLInputElement>(null);

  // Editable Parent Contact State
  const [editingContact, setEditingContact] = useState<boolean>(false);
  const [parentPhoneInput, setParentPhoneInput] = useState<string>(student?.parentPhone ?? '');
  const [parentEmailInput, setParentEmailInput] = useState<string>(student?.parentEmail ?? '');
  const [savingContact, setSavingContact] = useState<boolean>(false);
  // Gmail guideline (instead of a pop-up): show the contact fields with the email in green when it is missing
  const [emailNoneNow, setEmailNoneNow] = useState(false);
  useEffect(() => {
    if (next === 'Schedule Conference' && student && !(student.parentEmail || '').trim() && !parentEmailMarkedNone(student.studentNumber)) {
      setEditingContact(true);
    }
  }, [next, student?.studentNumber, student?.parentEmail]);

  useEffect(() => {
    if (student) {
      setParentPhoneInput(student.parentPhone ?? '');
      setParentEmailInput(student.parentEmail ?? '');
    }
  }, [student]);

  const freeSlots = useMemo(() => freeSlotsOn(appointments, schedDate), [appointments, schedDate]);
  // all times of the day; taken ones stay visible (greyed) so a missing time never looks like a bug
  const allSlots = useMemo(() => daySlots(appointments, schedDate), [appointments, schedDate]);

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

  const buildInlineMsg = (d: string, s: number | null, lang: 'taglish' | 'english', style: MsgStyle = msgStyle) => {
    if (s === null) return '';
    const dd = parseISO(d);
    const loc = lang === 'english' ? 'en-US' : 'fil-PH';
    const time = slotLabel(s).split('–')[0].trim().replace(/^0/, '');
    const first = c.studentName.split(/\s+/)[0] || c.studentName;
    if (style === 'short') {
      // fits one SMS
      const shortDay = isNaN(dd.getTime()) ? d : new Intl.DateTimeFormat(loc, { month: 'short', day: 'numeric' }).format(dd);
      return lang === 'english'
        ? `AICS Guidance: Parent conference for ${c.studentName} on ${shortDay}, ${time}, Guidance Office. Thank you.`
        : `AICS Guidance: Parent Conference para kay ${c.studentName} sa ${shortDay}, ${time}, Guidance Office. Salamat po.`;
    }
    // SMS is read later by the parent: always the real date, never "Tomorrow"/"Bukas"
    const longDay = isNaN(dd.getTime()) ? d : new Intl.DateTimeFormat(loc, { weekday: 'long', month: 'long', day: 'numeric' }).format(dd);
    return summonsMessage({ level: ladderLevel, n: ladderAt.n, isLast: ladderAt.isLast, lang, name: c.studentName, first, when: `${longDay}, ${time}` });
  };

  const [schedMessage, setSchedMessage] = useState<string>(() => buildInlineMsg(schedDate, schedStart, 'taglish'));
  useEffect(() => {
    if (!schedMsgEdited) {
      setSchedMessage(buildInlineMsg(schedDate, schedStart, schedMsgLang));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedDate, schedStart, schedMsgLang, msgStyle]);

  const sensitiveWords = useMemo(() => findSensitiveWords(schedMessage), [schedMessage]);
  const schedDateBad = !isOfficeDay(schedDate) || schedDate < todayISO();
  const canSaveInlineSched =
    !schedDateBad &&
    schedStart !== null &&
    freeSlots.includes(schedStart) &&
    !busy &&
    (!schedSendNow || (schedMessage.trim().length > 5 && sensitiveWords.length === 0));

  // same incident: other students who also wait for a parent conference → same day, next free times (one family per time)
  const groupToSchedule = useMemo(
    () => groupCases.filter((g) => g.status !== 'Resolved' && flowState(g).next === 'Schedule Conference'),
    [groupCases]
  );
  const [withGroup, setWithGroup] = useState<boolean>(true);
  const groupPlan = useMemo(() => {
    if (schedStart === null) return [] as { g: DisciplineCaseRecord; start: number | null }[];
    const later = freeSlots.filter((s) => s !== schedStart).sort((a, b) => (a > schedStart ? 0 : 1) - (b > schedStart ? 0 : 1) || a - b);
    return groupToSchedule.map((g, i) => ({ g, start: later[i] ?? null }));
  }, [groupToSchedule, freeSlots, schedStart]);
  const msgFor = (g: DisciplineCaseRecord, d: string, s: number, lang: 'taglish' | 'english') => {
    const dd = parseISO(d);
    const longDay = isNaN(dd.getTime()) ? d : new Intl.DateTimeFormat(lang === 'english' ? 'en-US' : 'fil-PH', { weekday: 'long', month: 'long', day: 'numeric' }).format(dd);
    const at = summonsAttempt(g.summonsCount);
    return summonsMessage({ level: summonsLevel(g.severity), n: at.n, isLast: at.isLast, lang, name: g.studentName, first: g.studentName.split(/\s+/)[0], when: `${longDay}, ${slotLabel(s).split('–')[0].trim().replace(/^0/, '')}` });
  };

  const [text, setText] = useState(c.explanation ?? '');
  // due process: tell the student the complaint first (never the reporter's name)
  const [noticed, setNoticed] = useState<boolean>(!!c.complaintNoticedAt);
  // heavy decisions (major/grave, or suspension) need the principal's approval
  const [approver, setApprover] = useState<string>(c.principalApprovedBy || getAppConfig().signatories?.principal || '');
  const [approved, setApproved] = useState<boolean>(!!c.principalApprovedAt);
  // appeal / request for reconsideration
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealBy, setAppealBy] = useState<string>('Parent / guardian');
  const [appealReason, setAppealReason] = useState('');
  const [appealResult, setAppealResult] = useState<string>('Kept the decision');
  const [appealNote, setAppealNote] = useState('');
  const [present, setPresent] = useState<string>(c.explanationPresent ?? 'Guidance staff only');
  const [attendedBy, setAttendedBy] = useState<string>(c.conferenceAttendedBy ?? 'Mother');
  const [minutes, setMinutes] = useState<string>(c.conferenceMinutes ?? '');
  const [pwpReason, setPwpReason] = useState('');
  const [endDate, setEndDate] = useState<string>(c.sanctionEndDate ?? '');
  const [endDays, setEndDays] = useState<number | 'other' | null>(c.sanctionEndDate ? 'other' : null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeHow, setNoticeHow] = useState<string>('Phone call');
  // the next 6 office days as one-tap chips (today included when the office is open)
  const officeDays = useMemo(() => {
    const out: string[] = [];
    let d = todayISO();
    for (let i = 0; i < 30 && out.length < 6; i++) {
      if (isOfficeDay(d)) out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, []);
  const dayFmtShort = useMemo(
    () => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    [isTl]
  );
  const [how, setHow] = useState(c.parentNotifiedHow || 'Conference attended (In-Person)');
  const [parentStatus, setParentStatus] = useState<'Attended' | 'No-Show'>(c.parentConferenceStatus === 'No-Show' ? 'No-Show' : 'Attended');
  // same incident: record the other families' attendance from here too (each saved to its own case)
  const groupAtAttendance = useMemo(
    () => groupCases.filter((g) => g.status !== 'Resolved' && flowState(g).next === 'Parent Conference Attendance'),
    [groupCases]
  );
  const [groupAtt, setGroupAtt] = useState<Record<string, 'Attended' | 'No-Show' | null>>({});
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
  const primary = `${btn} bg-[#007AFF] text-white hover:bg-[#16377c] active:scale-[0.97]`;
  const input = 'w-full px-3 py-2 rounded-xl border border-[#D1D1D6] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-sm text-[#1D1D1F] dark:text-white';

  const stepIndex = next ? activeSteps.indexOf(next) + 1 : activeSteps.length;
  const totalSteps = activeSteps.length;

  return (
    <div className="px-6 py-4 border-b border-[#E5E5EA] dark:border-[#38383A] space-y-3" data-case-flow>
      {/* before the parent summons: a correct mobile number is required; Gmail is asked once */}
      {next === 'Schedule Conference' && student && onUpdateStudentContact && (
        <ParentContactGate
          key={student.studentNumber}
          studentNumber={student.studentNumber}
          studentName={c.studentName}
          parentName={student.parentName}
          phone={student.parentPhone || ''}
          email={student.parentEmail || ''}
          isTl={isTl}
          onSave={(phone, email) => onUpdateStudentContact(student.studentNumber, phone, email)}
        />
      )}
      {/* Why a 1st minor has no parent steps (no dead ends: say why) */}
      {isMinor && (
        <p className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
          {isTl ? '1st minor: paalala lang, kaya walang patawag sa magulang.' : '1st minor: a reminder only, so there is no parent summons.'}
        </p>
      )}
      {/* Progress (AGENTS §5 #6): one segmented line; tap a finished segment to see what was recorded */}
      <div className="space-y-2" aria-label={isTl ? 'Mga hakbang ng kaso' : 'Case steps'}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">
            {next
              ? isTl ? `Hakbang ${stepIndex} ng ${totalSteps}` : `Step ${stepIndex} of ${totalSteps}`
              : isTl ? 'Tapos na ang lahat ng hakbang' : 'All steps done'}
          </p>
        </div>
        <ol className="flex gap-1" title={isTl ? 'Pindutin ang berdeng bahagi para makita ang naitala' : 'Tap a green part to see what was recorded'}>
          {activeSteps.map((s) => {
            const isDone = done[s];
            const isNext = s === next;
            return (
              <li key={s} data-step={s} data-done={isDone ? '1' : '0'} className="flex-1 min-w-0">
                <button
                  type="button"
                  disabled={!isDone}
                  onClick={() => setInspectStep((prev) => (prev === s ? null : s))}
                  aria-current={isNext ? 'step' : undefined}
                  title={`${isTl ? STEP_TL[s] : SHORT_EN[s] ?? s}${isDone && dates[s] ? ' · ' + fmt(dates[s], isTl) : ''}`}
                  className="w-full text-left group disabled:cursor-default"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-[opacity,transform] duration-150 ${
                      inspectStep === s
                        ? 'bg-sky-500'
                        : isDone
                        ? 'bg-emerald-500 group-hover:opacity-80'
                        : isNext
                        ? 'tl-done'
                        : 'bg-black/[0.08] dark:bg-white/[0.1]'
                    }`}
                  />
                  <span className={`mt-1.5 block truncate text-[11px] ${isNext ? 'font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]' : isDone ? 'text-[#6E6E73] dark:text-[#A1A1A6]' : 'text-[#AEAEB2] dark:text-[#636366]'}`}>
                    {isTl ? STEP_TL[s] : SHORT_EN[s] ?? s}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Previous Step Inspector Box */}
      {inspectStep && (
        <div className="rounded-xl bg-sky-50/70 dark:bg-[#0A162D] border border-sky-200 dark:border-sky-900/50 p-4 space-y-2 shadow-xs transition-all">
          <div className="flex items-center justify-between border-b border-sky-200 dark:border-sky-900/40 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#007AFF] dark:text-[#409CFF]">
                {isTl ? `Sinusuring Nakaraang Hakbang: ${STEP_TL[inspectStep]}` : `Inspecting Step: ${inspectStep}`}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {isTl ? 'Naitala Na' : 'Completed'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setInspectStep(null)}
              className="text-[11px] font-bold text-[#6E6E73] hover:text-[#1D1D1F] dark:text-[#A1A1A6] dark:hover:text-white"
            >
              ✕ {isTl ? 'Isara' : 'Close review'}
            </button>
          </div>

          <div className="text-xs space-y-2 text-[#1D1D1F] dark:text-white">
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
                <p className="p-2.5 rounded-lg bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-slate-800 leading-relaxed italic">
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
                  <p className="p-2.5 rounded-lg bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-slate-800 leading-relaxed italic">
                    "{c.counselingNotes}"
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Current Active Action Card */}
      {next && (
        <div className="pt-1 space-y-3" data-next-step={next}>
          <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7]">
            {(isTl ? STEP_QUESTION_TL : STEP_QUESTION_EN)[next] ?? (isTl ? STEP_TL[next] : next)}
          </h3>

          {next === 'Student Called' && (
            <div className="space-y-4">
              <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">
                {isTl ? 'Mag-print ng call slip para sa adviser, o tawagin ang estudyante nang direkta.' : 'Print a call slip for the adviser, or call the student in directly.'}
              </p>
              <ConfidentialHint isTl={isTl} />
              <div className="sticky bottom-0 z-10 -mx-1 glass-bar rounded-2xl px-3 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  {onOpenPrint && (
                    <button type="button" onClick={() => onOpenPrint('callSlip')} className="h-11 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform duration-150">
                      <Printer className="w-4 h-4" aria-hidden />
                      {isTl ? 'I-print ang call slip' : 'Print call slip'}
                    </button>
                  )}
                  {groupCases.length > 0 && (
                    <button
                      type="button"
                      title={isTl ? 'Isa-isa silang kakausapin, hindi sabay-sabay' : 'Talk to them one at a time, not together'}
                      onClick={() =>
                        printHtml(
                          buildBatchCallSlipsHtml(
                            [c, ...groupCases].map((g) => ({ caseCode: g.caseCode, studentName: g.studentName, gradeSection: g.gradeSection, offenseTitle: '' })),
                            window.location.origin
                          )
                        )
                      }
                      className="h-11 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform duration-150"
                    >
                      <Printer className="w-4 h-4" aria-hidden />
                      {isTl ? `Lahat ng call slip (${groupCases.length + 1})` : `All call slips (${groupCases.length + 1})`}
                    </button>
                  )}
                  <button
                    type="button"
                    data-flow="absent"
                    disabled={busy}
                    onClick={() => onAction({ kind: 'absent' })}
                    title={isTl ? 'Itatala na wala ang estudyante ngayon. Mananatili sa hakbang na ito.' : 'Records that the student was not in school today. The case stays on this step.'}
                    className="h-11 px-4 rounded-full text-[13px] font-medium text-[#6E6E73] dark:text-[#A1A1A6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-[0.97] transition-transform duration-150"
                  >
                    {isTl ? 'Absent ngayon' : 'Absent today'}
                  </button>
                </div>
                <button type="button" data-flow="call" disabled={busy} onClick={() => onAction({ kind: 'call' })} className="btn-lit h-11 px-6 text-[14px] font-semibold">
                  {isTl ? 'Nakarating na ang estudyante' : 'Student is here'}
                </button>
              </div>
            </div>
          )}

          {next === 'Explanation' && (
            <div className="space-y-4">
              <ConfidentialHint isTl={isTl} />

              {/* due process: a minor may have someone with them while giving a statement */}
              <div className="space-y-2">
                <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Sino ang kasama ng estudyante?' : 'Who was with the student?'}</span>
                <div className="seg-track flex-wrap">
                  {(isTl ? ['Wala', 'Adviser', 'Magulang', 'Guidance staff lang'] : ['No one', 'Adviser', 'Parent', 'Guidance staff only']).map((w, i) => {
                    const val = ['No one', 'Adviser', 'Parent', 'Guidance staff only'][i];
                    return (
                      <button key={val} type="button" onClick={() => setPresent(val)} className={`px-3.5 py-1.5 text-[13px] ${present === val ? 'seg-on' : 'seg-off'}`}>
                        {w}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Sinabi ng estudyante' : 'What the student said'}</span>
                  <span className={`text-[12px] tabular-nums ${text.trim().length >= 10 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#8E8E93]'}`}>
                    {text.trim().length < 10 ? `${text.trim().length} / 10 ${isTl ? 'letra (minimum)' : 'letters (minimum)'}` : `${text.trim().length} / 2000`}
                  </span>
                </span>
                <label className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 mb-2 cursor-pointer border ${noticed ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800' : 'border-amber-300 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-800'}`}>
                  <input type="checkbox" data-flow-noticed checked={noticed} onChange={(e) => setNoticed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#1E469B]" />
                  <span className="text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                    <b>{isTl ? 'Ipinaalam ko sa estudyante ang reklamo laban sa kanya' : 'I told the student what the complaint is'}</b>
                    <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Bago siya magpaliwanag. Huwag banggitin kung sino ang nag-report.' : 'Before they explain. Do not say who reported it.'}</span>
                  </span>
                </label>
                {/* quick starters: one tap, then type the rest in the student's words */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {(isTl
                    ? ['Inamin ng estudyante ang nangyari. ', 'Hindi inamin ng estudyante. Ayon sa kanya: ', 'Bahagyang inamin. Ayon sa kanya: ']
                    : ['The student admitted what happened. ', 'The student denied it. In their words: ', 'Partly admitted. In their words: ']
                  ).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setText((prev) => (prev.startsWith(s) ? prev : s + prev.replace(/^(Inamin ng estudyante ang nangyari\. |Hindi inamin ng estudyante\. Ayon sa kanya: |Bahagyang inamin\. Ayon sa kanya: |The student admitted what happened\. |The student denied it\. In their words: |Partly admitted\. In their words: )/, '')))}
                      className={`h-8 px-3 rounded-full text-[12px] transition-[background-color,transform] duration-150 active:scale-[0.97] ${
                        text.startsWith(s) ? 'btn-lit font-semibold' : 'bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#007AFF]'
                      }`}
                    >
                      {s.split('.')[0]}
                    </button>
                  ))}
                  {onOpenPrint && (
                    <button type="button" onClick={() => onOpenPrint('studentStatement')} title={isTl ? 'Blankong papel para sulat-kamay ng estudyante' : 'Blank sheet for the student to handwrite'} className="h-8 px-3 rounded-full text-[12px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] inline-flex items-center gap-1">
                      <Printer className="w-3.5 h-3.5" aria-hidden />
                      {isTl ? 'Papel para sulat-kamay' : 'Handwritten form'}
                    </button>
                  )}
                </div>
                <textarea
                  data-flow-text
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 2000))}
                  rows={4}
                  className={`${input} rounded-xl text-[15px] leading-relaxed`}
                  placeholder={isTl ? 'hal. Na-late po ako dahil nag-aberya ang sinakyang jeep…' : 'e.g. I was late because the jeep broke down…'}
                />
              </label>

              <div className="sticky bottom-0 z-10 -mx-1 glass-bar rounded-2xl px-3 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  {onOpenStation && (
                    <button
                      type="button"
                      data-flow="station"
                      disabled={busy}
                      onClick={onOpenStation}
                      title={isTl ? 'Bubukas ang naka-lock na screen kung saan ang estudyante mismo ang magta-type.' : 'Opens a locked screen where the student types it.'}
                      className="h-11 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-[0.97] transition-transform duration-150"
                    >
                      {isTl ? 'Ipa-type sa estudyante' : 'Let the student type it'}
                    </button>
                  )}
                  <button
                    type="button"
                    data-flow="refused"
                    disabled={busy}
                    onClick={() => onAction({ kind: 'explanation', text: '', refused: true, present, noticed })}
                    title={isTl ? 'Itatala na ayaw magbigay ng pahayag ng estudyante, at tutuloy ang kaso.' : 'Records that the student chose not to give a statement. The case moves on.'}
                    className="h-11 px-4 rounded-full text-[13px] font-medium text-[#6E6E73] dark:text-[#A1A1A6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-[0.97] transition-transform duration-150"
                  >
                    {isTl ? 'Ayaw magsalita' : 'Refused to explain'}
                  </button>
                </div>
                <button
                  type="button"
                  data-flow="explanation"
                  disabled={busy || !noticed || text.trim().length < 10}
                  title={!noticed ? (isTl ? 'I-tsek muna na naipaalam ang reklamo' : 'First tick that the complaint was explained') : undefined}
                  onClick={() => onAction({ kind: 'explanation', text: text.trim(), present, noticed })}
                  className="btn-lit h-11 px-6 text-[14px] font-semibold"
                >
                  {isTl ? 'I-save ang paliwanag' : 'Save explanation'}
                </button>
              </div>
            </div>
          )}

          {/* Major Offense Step 4: Schedule Conference (Embedded Inline Scheduler) */}
          {next === 'Schedule Conference' && (
            <div className="space-y-4">
              {/* ONE line that says what is happening + what to do (no chip pile, no alarm red for a normal no-show) */}
              {c.parentConferenceStatus === 'No-Show' ? (
                <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/50 space-y-2.5">
                  <p className="flex items-start gap-2 text-[13px] text-amber-900 dark:text-amber-200">
                    <RotateCcw className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                    {isTl
                      ? `Hindi dumalo ang magulang sa ika-${c.summonsCount || 1} patawag. Pumili ng bagong araw.`
                      : `The parent did not attend summons ${c.summonsCount || 1}. Pick a new date.`}
                  </p>
                  {/* After repeated no-shows the case may not stay stuck forever (due process) */}
                  {(c.summonsCount || 0) >= maxSummons() && (
                    <div className="pt-2.5 border-t border-amber-200 dark:border-amber-900/50 space-y-2">
                      <label htmlFor="pwp-reason" className="block text-[12px] text-amber-900 dark:text-amber-200">
                        {isTl
                          ? `${c.summonsCount} beses nang hindi dumalo. Pwede nang tumuloy sa Desisyon nang wala ang magulang. Dahilan:`
                          : `${c.summonsCount} summons without the parent. You may go on to the Decision without them. Reason:`}
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          id="pwp-reason"
                          value={pwpReason}
                          onChange={(e) => setPwpReason(e.target.value.slice(0, 300))}
                          placeholder={isTl ? 'hal. hindi sumasagot sa tawag at text' : 'e.g. no answer to calls and texts'}
                          className={`${input} flex-1 min-w-[220px] h-10 rounded-xl text-[13px]`}
                        />
                        <button
                          type="button"
                          data-flow="proceed-without-parent"
                          disabled={busy || pwpReason.trim().length < 5}
                          onClick={() => onAction({ kind: 'proceed_without_parent', reason: pwpReason.trim() })}
                          className="h-10 px-4 rounded-full text-[13px] font-medium text-amber-900 dark:text-amber-100 bg-white dark:bg-white/[0.08] shadow-[0_0_0_0.5px_rgb(15_23_42/0.15)] hover:bg-amber-100/60 dark:hover:bg-white/[0.12] disabled:opacity-50 active:scale-[0.97] transition-[background-color,transform] duration-150"
                        >
                          {isTl ? 'Tumuloy nang wala ang magulang' : 'Continue without parent'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">
                  {isTl ? 'Pumili ng araw at oras para sa conference ng magulang.' : 'Pick a day and time for the parent conference.'}
                  {(c.summonsCount || 0) > 0 && <span className="ml-1 text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? `(ika-${(c.summonsCount || 0) + 1} patawag)` : `(summons ${(c.summonsCount || 0) + 1})`}</span>}
                </p>
              )}

              {/* already scheduled: show it calmly, with "Change" */}
              {liveAppointment && !changeScheduleMode && !isReschedule ? (
                <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-[14px] font-medium text-emerald-700 dark:text-emerald-300">
                      <CalendarCheck2 className="w-4 h-4" aria-hidden />
                      {isTl ? 'May schedule na' : 'Conference is set'}
                    </span>
                    <button type="button" onClick={() => setChangeScheduleMode(true)} className="h-9 px-3 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                      {isTl ? 'Palitan' : 'Change'}
                    </button>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Araw at oras' : 'Day and time'}</span>
                    <span className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7]">{dayTitle(liveAppointment.date)} · {liveAppointment.timeSlot}</span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Magulang' : 'Parent'}</span>
                    <span className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7]">{liveAppointment.parentName} · {liveAppointment.parentPhone || (isTl ? 'walang number' : 'no number')}</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* parent contact: one calm row, Edit opens the fields */}
                  {student && (
                    <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10">
                      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {student.parentName || '—'}
                          {!editingContact && (
                            <span className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">
                              {student.parentPhone ? ` · ${student.parentPhone}` : isTl ? ' · walang number' : ' · no number'}
                              {student.parentEmail ? ` · ${student.parentEmail}` : ''}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          {liveAppointment && changeScheduleMode && !isReschedule && !editingContact && (
                            <button type="button" onClick={() => setChangeScheduleMode(false)} className="h-9 px-3 rounded-full text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] hover:bg-black/[0.04]">
                              {isTl ? 'Huwag nang palitan' : 'Keep current'}
                            </button>
                          )}
                          {!editingContact && (
                            <button type="button" onClick={() => setEditingContact(true)} className="h-9 px-3 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                              {isTl ? 'Baguhin ang contact' : 'Edit contact'}
                            </button>
                          )}
                        </span>
                      </div>
                      {editingContact && (
                        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="block space-y-1">
                            <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Mobile ng magulang' : 'Parent mobile'}</span>
                            <input type="tel" value={parentPhoneInput} onChange={(e) => setParentPhoneInput(e.target.value)} placeholder="0917-000-0000" className={`${input} h-10 rounded-xl text-[13px] tabular-nums ${phoneProblem(parentPhoneInput, isTl) ? 'border-rose-400' : ''}`} />
                            {phoneProblem(parentPhoneInput, isTl) && <span className="block text-[12px] text-rose-700 dark:text-rose-300">{phoneProblem(parentPhoneInput, isTl)}</span>}
                          </label>
                          {(() => {
                            // green guideline: no Gmail on file yet and the office has not said "No record"
                            const guide = !(student.parentEmail || '').trim() && !parentEmailMarkedNone(student.studentNumber) && !emailNoneNow;
                            const bad = !!parentEmailInput.trim() && !isEmail(parentEmailInput);
                            return (
                              <label className="block space-y-1">
                                <span className={`block text-[12px] ${guide && !bad ? 'font-semibold text-[#248A3D] dark:text-[#30D158]' : 'text-[#6E6E73] dark:text-[#A1A1A6]'}`}>{isTl ? 'Gmail ng magulang (opsyonal)' : 'Parent Gmail (optional)'}</span>
                                <input
                                  type="email"
                                  value={parentEmailInput}
                                  onChange={(e) => setParentEmailInput(e.target.value.slice(0, 120))}
                                  placeholder="pangalan@gmail.com"
                                  className={`${input} h-10 rounded-xl text-[13px] ${bad ? '!border-rose-400' : guide ? '!border-[#34C759] ring-4 ring-[#34C759]/20' : ''}`}
                                />
                                {bad ? (
                                  <span className="block text-[12px] text-rose-700 dark:text-rose-300">{isTl ? 'Hindi tama ang ayos ng email (hal. pangalan@gmail.com).' : 'Not a valid email (e.g. name@gmail.com).'}</span>
                                ) : guide ? (
                                  <span className="block text-[12px] text-[#248A3D] dark:text-[#30D158]">
                                    {isTl ? 'Kung alam mo, ilagay ang Gmail para may email din ang magulang bukod sa SMS. ' : 'If you know it, add the Gmail so the parent also gets an email besides the SMS. '}
                                    <button type="button" onClick={() => { markParentEmailNone(student.studentNumber); setEmailNoneNow(true); }} className="font-semibold underline underline-offset-2">{isTl ? 'Walang record' : 'No record'}</button>
                                  </span>
                                ) : null}
                              </label>
                            );
                          })()}
                          <div className="sm:col-span-2 flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={savingContact}
                              onClick={() => {
                                setParentPhoneInput(student.parentPhone ?? '');
                                setParentEmailInput(student.parentEmail ?? '');
                                setEditingContact(false);
                              }}
                              className="h-9 px-4 rounded-full text-[13px] text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04]"
                            >
                              {isTl ? 'Huwag na' : 'Cancel'}
                            </button>
                            <button
                              type="button"
                              disabled={savingContact || !!phoneProblem(parentPhoneInput, isTl) || (!!parentEmailInput.trim() && !isEmail(parentEmailInput))}
                              onClick={async () => {
                                if (!onUpdateStudentContact) {
                                  setEditingContact(false);
                                  return;
                                }
                                setSavingContact(true);
                                await onUpdateStudentContact(student.studentNumber, parentPhoneInput.trim(), parentEmailInput.trim());
                                setSavingContact(false);
                                setEditingContact(false);
                              }}
                              className="btn-lit h-9 px-4 text-[13px] font-semibold"
                            >
                              {savingContact ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? 'I-save ang contact' : 'Save contact'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DAY chips (next office days) + TIME pills — no dropdown, no repeated "Tomorrow" */}
                  <div className="space-y-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Araw' : 'Day'}</span>
                      <span className="text-[12px] text-[#8E8E93]">{isTl ? 'Bukas ang opisina' : 'Office open'}: {officeHoursText(isTl)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2" data-inline-suggestions>
                      {officeDays.map((d) => {
                        const on = d === schedDate;
                        const free = freeSlotsOn(appointments, d).length;
                        const dt = parseISO(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={free === 0}
                            onClick={() => {
                              setSchedDate(d);
                              setSchedStart(freeSlotsOn(appointments, d)[0] ?? null); // one tap = earliest free time
                            }}
                            className={`min-w-[64px] h-14 px-3 rounded-2xl flex flex-col items-center justify-center transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.97] disabled:opacity-40 ${
                              on
                                ? 'btn-lit'
                                : 'bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#007AFF] dark:hover:border-[#5B8DEF]'
                            }`}
                          >
                            <span className={`text-[11px] ${on ? 'text-white/80' : 'text-[#8E8E93]'}`}>{dayFmtShort.format(dt).split(' ')[0]}</span>
                            <span className="text-[16px] font-semibold tabular-nums leading-tight">{dt.getDate()}</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          const el = otherDayRef.current;
                          if (!el) return;
                          try {
                            el.showPicker();
                          } catch {
                            el.focus();
                          }
                        }}
                        className={`relative h-14 px-4 rounded-2xl border border-dashed flex items-center gap-2 text-[13px] active:scale-[0.97] transition-transform duration-150 ${!officeDays.includes(schedDate) ? 'border-[#007AFF] text-[#007AFF] dark:text-[#409CFF]' : 'border-[#C7C7CC] dark:border-white/20 text-[#6E6E73] dark:text-[#A1A1A6]'}`}
                      >
                        <CalendarDays className="w-4 h-4" aria-hidden />
                        <span className="text-left leading-tight">
                          <span className="block text-[11px] opacity-80">{isTl ? 'Ibang araw' : 'Other day'}</span>
                          <span className="block font-medium">
                            {new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(parseISO(schedDate))}
                          </span>
                        </span>
                        <input
                          ref={otherDayRef}
                          id="inline-conf-date"
                          type="date"
                          tabIndex={-1}
                          min={todayISO()}
                          value={schedDate}
                          onChange={(e) => {
                            if (!e.target.value) return;
                            setSchedDate(e.target.value);
                            setSchedStart(freeSlotsOn(appointments, e.target.value)[0] ?? null);
                          }}
                          aria-label={isTl ? 'Pumili ng ibang araw' : 'Pick another day'}
                          className="absolute inset-0 opacity-0 pointer-events-none"
                        />
                      </button>
                    </div>

                    <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] pt-1">{isTl ? 'Oras (45 minuto)' : 'Time (45 minutes)'}</span>
                    {schedDateBad ? (
                      <p className="text-[13px] text-rose-700 dark:text-rose-300">{isTl ? 'Sarado ang opisina sa araw na ito. Pumili ng ibang araw.' : 'The office is closed that day. Pick another day.'}</p>
                    ) : freeSlots.length === 0 ? (
                      <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Puno na ang araw na ito. Pumili ng ibang araw.' : 'This day is full. Pick another day.'}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={isTl ? 'Oras' : 'Time'}>
                        {allSlots.filter((x) => x.state !== 'past').map(({ start: s, state, who }) => {
                          const on = s === schedStart;
                          if (state === 'taken') {
                            return (
                              <span
                                key={s}
                                title={isTl ? `May naka-schedule na: magulang ni ${who}` : `Already booked: parent of ${who}`}
                                className="h-11 px-4 rounded-full inline-flex flex-col items-center justify-center leading-none bg-black/[0.03] dark:bg-white/[0.04] border border-dashed border-[#D2D2D7] dark:border-white/10 text-[#AEAEB2] dark:text-[#636366] cursor-not-allowed select-none"
                              >
                                <span className="text-[13px] tabular-nums line-through decoration-1">{slotLabel(s).split('–')[0].trim().replace(/^0/, '')}</span>
                                <span className="text-[10px] mt-0.5">{isTl ? 'May naka-schedule' : 'Booked'}</span>
                              </span>
                            );
                          }
                          return (
                            <button
                              key={s}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => setSchedStart(s)}
                              className={`h-11 px-4 rounded-full text-[14px] tabular-nums transition-[background-color,transform] duration-150 active:scale-[0.97] ${
                                on
                                  ? 'btn-lit font-semibold'
                                  : 'bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#007AFF] dark:hover:border-[#5B8DEF]'
                              }`}
                            >
                              {slotLabel(s).split('–')[0].trim().replace(/^0/, '')}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {onScheduleOthers && groupToSchedule.length > 0 && schedStart !== null && (
                    <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10">
                      <label className="px-4 py-3 flex items-start gap-2.5 cursor-pointer select-none">
                        <input type="checkbox" checked={withGroup} onChange={(e) => setWithGroup(e.target.checked)} className="mt-0.5 w-5 h-5 rounded-md accent-[#1E469B]" />
                        <span>
                          <span className="block text-[14px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {isTl ? `Isabay ang ${groupToSchedule.length} pang magulang sa parehong insidente` : `Also schedule ${groupToSchedule.length} more parent(s) from the same incident`}
                          </span>
                          <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">
                            {isTl ? 'Parehong araw, magkakasunod na oras. Hiwalay ang bawat pamilya at hiwalay ang SMS.' : 'Same day, one after another. Each family meets separately and gets its own SMS.'}
                          </span>
                        </span>
                      </label>
                      {withGroup && (
                        <ul className="border-t border-black/[0.06] dark:border-white/[0.06] divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                          {groupPlan.map(({ g, start }) => (
                            <li key={g.caseCode} className="px-4 py-2.5 flex items-center justify-between gap-3 text-[14px]">
                              <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">{g.studentName}</span>
                              {start === null ? (
                                <span className="text-[12px] text-rose-700 dark:text-rose-300">{isTl ? 'Wala nang bakanteng oras, i-schedule nang hiwalay' : 'No free time left, schedule separately'}</span>
                              ) : (
                                <span className="h-7 px-3 rounded-full inline-flex items-center bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/15 dark:text-[#409CFF] text-[13px] font-semibold tabular-nums">
                                  {slotLabel(start).split('–')[0].trim().replace(/^0/, '')}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* notice to the parent: how to send + a suggested message, always visible */}
                  <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10">
                    <label className="px-4 py-3 flex items-center gap-2.5 text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] cursor-pointer select-none border-b border-black/[0.06] dark:border-white/[0.06]">
                      <input type="checkbox" checked={schedSendNow} onChange={(e) => setSchedSendNow(e.target.checked)} className="w-5 h-5 rounded-md accent-[#1E469B]" />
                      <span className="font-medium">{isTl ? 'Ipadala ang patawag sa magulang' : 'Send the summons to the parent'}</span>
                    </label>
                    {schedSendNow && (
                      <div className="px-4 py-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Paano ipapadala' : 'Send by'}</span>
                            <div className="seg-track w-full">
                              {(['both', 'sms', 'gmail'] as Channel[]).map((ch) => (
                                <button
                                  key={ch}
                                  type="button"
                                  disabled={ch !== 'sms' && !student?.parentEmail}
                                  title={ch !== 'sms' && !student?.parentEmail ? (isTl ? 'Walang email ang magulang' : 'The parent has no email') : undefined}
                                  onClick={() => setSchedChannel(ch)}
                                  className={`flex-1 px-3 py-2 text-[13px] disabled:opacity-40 ${schedChannel === ch ? 'seg-on' : 'seg-off'}`}
                                >
                                  {ch === 'sms' ? 'SMS' : ch === 'gmail' ? 'Email' : 'SMS + Email'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Wika' : 'Language'}</span>
                            <div className="seg-track w-full">
                              {(['taglish', 'english'] as const).map((lg) => (
                                <button
                                  key={lg}
                                  type="button"
                                  onClick={() => {
                                    setSchedMsgLang(lg);
                                    setSchedMsgEdited(false);
                                    setSchedMessage(buildInlineMsg(schedDate, schedStart, lg));
                                  }}
                                  className={`flex-1 px-3 py-2 text-[13px] ${schedMsgLang === lg ? 'seg-on' : 'seg-off'}`}
                                >
                                  {lg === 'taglish' ? 'Tagalog' : 'English'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Mungkahing mensahe' : 'Suggested message'}</span>
                            {/* why this message: level of the matter + which summons (no offense words shown to the parent) */}
                            <span
                              title={isTl ? 'Kusang pinili ng system. Pwede mong baguhin ang mensahe.' : 'Picked by the system. You can still edit the message.'}
                              className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-semibold ${
                                ladderLevel === 'urgent'
                                  ? 'bg-gradient-to-r from-rose-500/15 to-orange-500/15 text-rose-700 dark:text-rose-300'
                                  : ladderLevel === 'high'
                                  ? 'bg-gradient-to-r from-amber-500/15 to-orange-400/15 text-amber-800 dark:text-amber-300'
                                  : 'bg-gradient-to-r from-[#007AFF]/10 to-sky-500/10 text-[#007AFF] dark:text-[#409CFF]'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${ladderLevel === 'urgent' ? 'bg-rose-500' : ladderLevel === 'high' ? 'bg-amber-500' : 'bg-[#007AFF] dark:bg-[#0A84FF]'}`} aria-hidden />
                              {ladderWhy}
                            </span>
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                ['auto', isTl ? 'Mungkahi' : 'Suggested', isTl ? 'Kusang pinili ayon sa bigat at sa bilang ng patawag' : 'Picked for you from how heavy it is and the summons count'],
                                ['short', isTl ? 'Maikli' : 'Short', isTl ? 'Kasya sa 1 SMS' : 'Fits in 1 SMS'],
                              ] as const
                            ).map(([k, label, hint]) => (
                              <button
                                key={k}
                                type="button"
                                title={hint}
                                aria-pressed={msgStyle === k && !schedMsgEdited}
                                onClick={() => {
                                  setMsgStyle(k);
                                  setSchedMsgEdited(false);
                                  setSchedMessage(buildInlineMsg(schedDate, schedStart, schedMsgLang, k));
                                }}
                                className={`h-10 px-4 rounded-full text-[13px] transition-[background-color,transform] duration-150 active:scale-[0.97] ${
                                  msgStyle === k && !schedMsgEdited
                                    ? 'btn-lit font-semibold'
                                    : 'bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#007AFF]'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <label className="block space-y-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Mensahe (pwedeng baguhin)' : 'Message (you can edit it)'}</span>
                            <span className="text-[11px] text-[#8E8E93] tabular-nums">
                              {(() => {
                                const info = smsInfo(schedMessage);
                                return isTl ? `${info.length} letra · ${info.parts} SMS` : `${info.length} characters · ${info.parts} SMS`;
                              })()}
                            </span>
                          </span>
                          <textarea
                            rows={5}
                            value={schedMessage}
                            onChange={(e) => {
                              setSchedMessage(e.target.value);
                              setSchedMsgEdited(true);
                            }}
                            className={`w-full min-h-[125px] px-3.5 py-3 rounded-xl border bg-white dark:bg-[#1C1C1E] text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed resize-y ${
                              sensitiveWords.length ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#E5E5EA] dark:border-white/10'
                            }`}
                          />
                        </label>
                        {sensitiveWords.length > 0 ? (
                          <p className="text-[12px] text-rose-700 dark:text-rose-300">
                            {isTl ? `Bawal ang detalye ng offense sa mensahe ("${sensitiveWords.join('", "')}"). ` : `No offense details allowed ("${sensitiveWords.join('", "')}"). `}
                            <button type="button" className="underline font-medium" onClick={() => { setSchedMsgEdited(false); setSchedMessage(buildInlineMsg(schedDate, schedStart, schedMsgLang)); }}>
                              {isTl ? 'Ibalik sa ligtas na mensahe' : 'Restore the safe message'}
                            </button>
                          </p>
                        ) : (
                          <p className="text-[12px] text-[#8E8E93]">{isTl ? 'Walang detalye ng offense. Isang araw bago ang conference, kusa ring may paalala.' : 'No offense details. A reminder also goes out the office day before.'}</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* the ONE main action, always visible at the bottom (AGENTS §5 #13 #18 #25) */}
              <div className="sticky bottom-0 z-10 -mx-1 glass-bar rounded-2xl px-3 py-3 flex flex-wrap items-center justify-between gap-2">
                {onOpenPrint && ladderAt.isLast && ladderAt.n > 1 ? (
                  <button type="button" onClick={() => onOpenPrint('parentLetter')} title={isTl ? 'Pormal na sulat sa magulang. Ibibigay sa estudyante o adviser. Walang detalye ng offense.' : 'Formal letter to the parent, sent through the student or adviser. No offense details.'} className="h-11 px-4 rounded-full text-[13px] font-semibold text-[#007AFF] dark:text-[#409CFF] bg-[#007AFF]/[0.08] dark:bg-white/[0.08] hover:bg-[#007AFF]/[0.14] inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform duration-150">
                    <Printer className="w-4 h-4" aria-hidden />
                    {isTl ? 'I-print ang sulat sa magulang' : 'Print the parent letter'}
                  </button>
                ) : onOpenPrint ? (
                  <button type="button" onClick={() => onOpenPrint('conference')} title={isTl ? 'Form para sa conference ng magulang (pipirmahan sa pagdinig)' : 'Form for the parent conference (signed at the meeting)'} className="h-11 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform duration-150">
                    <Printer className="w-4 h-4" aria-hidden />
                    {isTl ? 'I-print ang conference form' : 'Print conference form'}
                  </button>
                ) : (
                  <span />
                )}
                {liveAppointment && !changeScheduleMode && !isReschedule ? (
                  <button
                    type="button"
                    data-flow="schedule-conference"
                    disabled={busy}
                    onClick={() => onAction({ kind: 'schedule_conference', targetDate: `${liveAppointment.date} ${liveAppointment.timeSlot}` })}
                    className="btn-lit btn-lit-green h-11 px-6 text-[14px] font-semibold"
                  >
                    {isTl ? 'Kumpirmahin ang schedule' : 'Confirm schedule'}
                  </button>
                ) : (
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
                      if (onScheduleOthers && withGroup && groupPlan.length) {
                        onScheduleOthers(
                          groupPlan
                            .filter((x) => x.start !== null)
                            .map(({ g, start }) => {
                              const slot = slotLabel(start as number);
                              return {
                                c: g,
                                action: {
                                  kind: 'schedule_conference' as const,
                                  targetDate: `${dayTitle(schedDate)} · ${slot}`,
                                  inlineSchedule: { date: schedDate, timeSlot: slot, sendNow: schedSendNow, channel: schedChannel, message: msgFor(g, schedDate, start as number, schedMsgLang) },
                                },
                              };
                            })
                        );
                      }
                      setChangeScheduleMode(false);
                    }}
                    className="btn-lit h-11 px-6 text-[14px] font-semibold"
                  >
                    {schedStart === null
                      ? isTl ? 'Pumili muna ng oras' : 'Pick a time first'
                      : isTl
                      ? `I-schedule: ${dayFmtShort.format(parseISO(schedDate))}, ${slotLabel(schedStart).split('–')[0].trim().replace(/^0/, '')}`
                      : `Schedule for ${dayFmtShort.format(parseISO(schedDate))}, ${slotLabel(schedStart).split('–')[0].trim().replace(/^0/, '')}`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Major Offense Step 5: Conference Attendance Hearing (Attended vs No-Show / Reschedule) */}
          {(next === 'Parent Conference Attendance' || next === 'Parent Notified') && (
            <div className="space-y-4">
              {/* two big, clear answers (AGENTS §5 #16 zero-click choices, #17 big targets) */}
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={isTl ? 'Dumating ba ang magulang?' : 'Did the parent come?'}>
                {(
                  [
                    ['Attended', isTl ? 'Dumalo' : 'Attended', isTl ? 'Susunod: Desisyon' : 'Next: Decision', Check, 'emerald'],
                    ['No-Show', isTl ? 'Hindi dumalo' : 'Did not attend', isTl ? 'Pipili ng bagong araw' : 'Pick a new date next', RotateCcw, 'amber'],
                  ] as const
                ).map(([k, title, sub, Ic, tone]) => {
                  const on = parentStatus === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setParentStatus(k)}
                      className={`min-h-[76px] px-4 py-3 rounded-2xl border-2 flex items-center gap-3 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] ${
                        on
                          ? tone === 'emerald'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                            : 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                          : 'border-[#E5E5EA] dark:border-white/10 bg-white dark:bg-[#1C1C1E] hover:border-[#AEB8C8]'
                      }`}
                    >
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${on ? (tone === 'emerald' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white') : 'bg-[#F5F5F7] dark:bg-white/[0.08] text-[#6E6E73] dark:text-[#A1A1A6]'}`}>
                        <Ic className="w-5 h-5" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{title}</span>
                        <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Paano nakausap' : 'How you met'}</span>
                <div className="flex flex-wrap gap-2">
                  {HOW.map(([en, tl]) => (
                    <button
                      key={en}
                      type="button"
                      data-how={en}
                      aria-pressed={how === en}
                      onClick={() => setHow(en)}
                      className={`h-10 px-4 rounded-full text-[13px] transition-[background-color,transform] duration-150 active:scale-[0.97] ${
                        how === en ? 'btn-lit font-semibold' : 'bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#007AFF]'
                      }`}
                    >
                      {isTl ? tl : en}
                    </button>
                  ))}
                </div>
              </div>

              {/* conference record: who came + what was agreed (a hearing record, not counseling notes) */}
              {parentStatus === 'Attended' && (
                <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 p-4 space-y-3">
                  <div className="space-y-2">
                    <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Sino ang dumalo?' : 'Who came?'}</span>
                    <div className="seg-track flex-wrap">
                      {(['Mother', 'Father', 'Guardian', 'Both parents'] as const).map((w) => (
                        <button key={w} type="button" onClick={() => setAttendedBy(w)} className={`px-3.5 py-1.5 text-[13px] ${attendedBy === w ? 'seg-on' : 'seg-off'}`}>
                          {isTl ? { Mother: 'Nanay', Father: 'Tatay', Guardian: 'Guardian', 'Both parents': 'Nanay at Tatay' }[w] : w}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label htmlFor="conf-minutes" className="block space-y-1">
                    <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Napagkasunduan (opsyonal)' : 'What was agreed (optional)'}</span>
                    <textarea
                      id="conf-minutes"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value.slice(0, 1000))}
                      rows={2}
                      className={`${input} rounded-xl text-[14px] leading-relaxed`}
                      placeholder={isTl ? 'hal. Pumayag ang magulang sa sanction; babantayan ang pagpasok nang maaga.' : 'e.g. Parent agreed to the sanction; will make sure the student comes on time.'}
                    />
                  </label>
                </div>
              )}

              {onScheduleOthers && groupAtAttendance.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  <p className="px-4 py-2.5 text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">
                    {isTl ? 'Ibang pamilya sa parehong insidente: itala rin dito (opsyonal)' : 'Other families from the same incident: record them here too (optional)'}
                  </p>
                  {groupAtAttendance.map((g) => {
                    const v = groupAtt[g.caseCode] ?? null;
                    return (
                      <div key={g.caseCode} className="px-4 py-2.5 flex items-center justify-between gap-3">
                        <span className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7]">{g.studentName}</span>
                        <div className="seg-track p-0.5 inline-flex" role="radiogroup" aria-label={g.studentName}>
                          {([
                            [null, isTl ? 'Hindi pa' : 'Not yet'],
                            ['Attended', isTl ? 'Dumalo' : 'Attended'],
                            ['No-Show', isTl ? 'Hindi dumalo' : 'Did not attend'],
                          ] as ['Attended' | 'No-Show' | null, string][]).map(([k, lbl]) => (
                            <button
                              key={String(k)}
                              type="button"
                              role="radio"
                              aria-checked={v === k}
                              onClick={() => setGroupAtt((m) => ({ ...m, [g.caseCode]: k }))}
                              className={`px-3 py-1.5 text-[12px] ${v === k ? 'seg-on' : 'seg-off'}`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="sticky bottom-0 z-10 -mx-1 glass-bar rounded-2xl px-3 py-3 flex flex-wrap items-center justify-between gap-2">
                <span className="px-1 text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">
                  {parentStatus === 'No-Show' ? (isTl ? 'Babalik sa Step 4 para sa bagong araw.' : 'Goes back to Step 4 for a new date.') : isTl ? 'Susunod ang Desisyon.' : 'The Decision is next.'}
                </span>
                <button
                  type="button"
                  data-flow="conference-outcome"
                  disabled={busy || !how}
                  onClick={() => {
                    onAction({
                      kind: 'conference_outcome',
                      how,
                      conferenceStatus: parentStatus,
                      attendedBy: parentStatus === 'Attended' ? attendedBy : undefined,
                      notes: parentStatus === 'Attended' ? minutes.trim() : undefined,
                    });
                    const others = groupAtAttendance.filter((g) => groupAtt[g.caseCode]);
                    if (onScheduleOthers && others.length) {
                      onScheduleOthers(
                        others.map((g) => ({
                          c: g,
                          action: { kind: 'conference_outcome' as const, how: 'Conference attended (In-Person)', conferenceStatus: groupAtt[g.caseCode] as 'Attended' | 'No-Show' },
                        }))
                      );
                    }
                  }}
                  className={`btn-lit ${parentStatus === 'Attended' ? 'btn-lit-green' : ''} h-11 px-6 text-[14px] font-semibold`}
                >
                  {parentStatus === 'No-Show' ? (isTl ? 'I-save: hindi dumalo' : 'Save: did not attend') : isTl ? 'I-save: dumalo ang magulang' : 'Save: parent attended'}
                </button>
              </div>
            </div>
          )}

          {next === 'Decision' && (
            <div className="space-y-4" data-decision-box>
              <div className="space-y-2">
                <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Pumili ng desisyon' : 'Pick a decision'}</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      labelEn: 'Confirmed violation',
                      labelTl: 'Napatunayang lumabag',
                      descEn: isMinor
                        ? `Confirmed minor infraction of ${c.offenseTitleEn}. Gave an official verbal reminder.`
                        : `Found responsible for ${c.offenseTitleEn} after hearing the student and the parent.`,
                      descTl: isMinor
                        ? `Napatunayang may paglabag sa ${c.offenseTitleTl}. Binigyan ng pormal na paalala.`
                        : `Napatunayang may pananagutan sa ${c.offenseTitleTl} matapos dinggin ang estudyante at magulang.`,
                    },
                    {
                      labelEn: 'Settled (agreement)',
                      labelTl: 'Nagkasundo',
                      descEn: 'Both sides reached an understanding and signed a written agreement (Kasunduan).',
                      descTl: 'Nagkasundo ang magkabilang panig at pumirma ng Kasunduan.',
                    },
                    {
                      labelEn: 'First warning',
                      labelTl: 'Unang babala',
                      descEn: 'First offense: gave an official warning; the student promised to follow school rules.',
                      descTl: 'Unang paglabag: binigyan ng pormal na babala; nangakong susunod sa patakaran.',
                    },
                    {
                      labelEn: 'Cleared',
                      labelTl: 'Walang pananagutan',
                      descEn: 'Found to be a misunderstanding; the student is cleared.',
                      descTl: 'Napatunayang hindi pagkakaunawaan; walang pananagutan ang estudyante.',
                    },
                  ].map((preset, idx) => {
                    const v = isTl ? preset.descTl : preset.descEn;
                    const on = decision === v;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDecision(v)}
                        aria-pressed={on}
                        className={`h-10 px-4 rounded-full text-[13px] transition-[background-color,transform] duration-150 active:scale-[0.97] ${
                          on ? 'btn-lit font-semibold' : 'bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#007AFF]'
                        }`}
                      >
                        {isTl ? preset.labelTl : preset.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 p-4 space-y-3">
                <label className="block space-y-1">
                  <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Desisyon' : 'Decision'}</span>
                  <textarea
                    data-flow-decision
                    rows={2}
                    value={decision}
                    onChange={(e) => setDecision(e.target.value.slice(0, 300))}
                    placeholder={isTl ? `hal. Napatunayang lumabag sa ${c.offenseTitleTl}.` : `e.g. Confirmed violation of ${c.offenseTitleEn}.`}
                    className={`${input} rounded-xl text-[14px] leading-relaxed`}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Sanction</span>
                    <span className="text-[11px] text-[#8E8E93]">{isTl ? 'Galing sa Handbook, pwedeng baguhin' : 'From the Handbook, you can edit it'}</span>
                  </span>
                  <input data-flow-sanction value={sanction} onChange={(e) => setSanction(e.target.value.slice(0, 300))} className={`${input} h-11 rounded-xl text-[14px]`} />
                </label>
                {/* how long: one tap; the system counts school days only (weekends and closed days skipped) */}
                <div className="space-y-1.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Gaano katagal ang sanction? (opsyonal)' : 'How long is the sanction? (optional)'}</span>
                    <span className="text-[11px] text-[#8E8E93]">{isTl ? 'May paalala isang araw bago matapos' : 'You get a reminder the day before it ends'}</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={isTl ? 'Haba ng sanction' : 'Sanction length'}>
                    {([
                      [null, isTl ? 'Walang petsa' : 'No end date'],
                      [1, isTl ? '1 araw' : '1 day'],
                      [3, isTl ? '3 araw' : '3 days'],
                      [5, isTl ? '1 linggo' : '1 week'],
                      [10, isTl ? '2 linggo' : '2 weeks'],
                      ['other', isTl ? 'Ibang petsa' : 'Pick a date'],
                    ] as [number | 'other' | null, string][]).map(([k, lbl]) => {
                      const on = endDays === k;
                      return (
                        <button
                          key={String(k)}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => {
                            setEndDays(k);
                            if (k === null) setEndDate('');
                            else if (typeof k === 'number') setEndDate(sanctionEndFrom(k));
                          }}
                          className={`h-10 px-4 rounded-full text-[13px] transition-[background-color,transform] duration-150 active:scale-[0.97] ${
                            on ? 'btn-lit font-semibold' : 'bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#007AFF]'
                          }`}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                    {endDays === 'other' && (
                      <DateField compact className="w-[200px]" value={endDate} min={todayISO()} onChange={setEndDate} isTl={isTl} ariaLabel={isTl ? 'Huling araw' : 'Last day'} />
                    )}
                  </div>
                  {endDate && (
                    <p className="text-[12px] text-[#007AFF] dark:text-[#409CFF]">
                      {isTl ? 'Huling araw ng sanction: ' : 'Last day of the sanction: '}
                      <b>{new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(parseISO(endDate))}</b>
                      {typeof endDays === 'number' && <span className="text-[#8E8E93]">{isTl ? ' · bilang lang ang may pasok' : ' · school days only'}</span>}
                    </p>
                  )}
                </div>
              </div>

              {(summonsLevel(c.severity) === 'urgent' || /suspen/i.test(sanction)) && (
                <div className={`rounded-2xl border p-4 space-y-2.5 ${approved && approver.trim() ? 'border-emerald-300 dark:border-emerald-800' : 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/15'}`}>
                  <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Kailangan ng pag-apruba ng Principal' : 'Needs the Principal’s approval'}</p>
                  <p className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Mabigat na offense o suspension: aprubado muna ng Principal bago simulan.' : 'Major offense or suspension: the Principal approves it before it starts.'}</p>
                  <input data-flow-approver value={approver} onChange={(e) => setApprover(e.target.value.slice(0, 80))} placeholder={isTl ? 'Pangalan ng Principal' : 'Principal’s name'} className={`${input} h-10 rounded-xl text-[14px]`} />
                  <label className="flex items-center gap-2 text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] cursor-pointer">
                    <input type="checkbox" data-flow-approved checked={approved} onChange={(e) => setApproved(e.target.checked)} className="w-4 h-4 accent-[#1E469B]" />
                    {isTl ? 'Inaprubahan ng Principal ang desisyong ito' : 'The Principal approved this decision'}
                  </label>
                </div>
              )}

              {/* Same incident, other students: keep decisions fair */}
              {groupCases.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  <p className="px-4 py-2.5 text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Ibang estudyante sa parehong insidente (para pantay)' : 'Other students in the same incident (to keep it fair)'}</p>
                  {onSetWaitForAll && (
                    <label className="px-4 py-3 flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={!!c.waitForAll} disabled={busy} onChange={(e) => onSetWaitForAll(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#1E469B]" />
                      <span>
                        <span className="block text-[14px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Hintayin ang lahat bago magdesisyon' : 'Wait for everyone before deciding'}</span>
                        <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">
                          {isTl ? 'Kapag naka-off, pwedeng mauna ang estudyanteng dumalo ang magulang.' : 'When off, a student whose parent attended can go first.'}
                        </span>
                      </span>
                    </label>
                  )}
                  {groupCases.map((g) => (
                    <div key={g.caseCode} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7]">{g.studentName}</span>
                        <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6] line-clamp-2" title={g.explanation || ''}>
                          {g.explanationRefused ? (isTl ? 'Tumangging magpaliwanag' : 'Chose not to explain') : g.explanation ? `"${g.explanation}"` : isTl ? 'Wala pang paliwanag' : 'No explanation yet'}
                        </span>
                      </span>
                      <span className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] text-right shrink-0">{g.sanction || (isTl ? 'wala pang desisyon' : 'no decision yet')}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="sticky bottom-0 z-10 -mx-1 glass-bar rounded-2xl px-3 py-3 flex flex-wrap items-center justify-between gap-2">
                <span className="px-1 text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">
                  {decisionLocked ? (isTl ? `Naghihintay pa: ${groupWaiting.map((g) => g.studentName.split(' ')[0]).join(', ')}` : `Still waiting for: ${groupWaiting.map((g) => g.studentName.split(' ')[0]).join(', ')}`) : c.parentNotifiedAt ? (isTl ? 'Magsisimula agad ang sanction.' : 'The sanction starts right away.') : isTl ? 'Maghihintay ang sanction hanggang malaman ng magulang.' : 'The sanction waits until the parent is told.'}
                </span>
                <button
                  type="button"
                  data-flow="decision"
                  disabled={busy || decisionLocked || decision.trim().length < 3 || sanction.trim().length < 3 || ((summonsLevel(c.severity) === 'urgent' || /suspen/i.test(sanction)) && !(approved && approver.trim()))}
                  onClick={() => onAction({ kind: 'decision', decision: decision.trim(), sanction: sanction.trim(), sanctionEndDate: endDate || undefined, principalApprovedBy: (summonsLevel(c.severity) === 'urgent' || /suspen/i.test(sanction)) && approved ? approver.trim() : undefined })}
                  className="btn-lit h-11 px-6 text-[14px] font-semibold"
                >
                  {isTl ? 'I-save ang desisyon' : 'Save decision'}
                </button>
              </div>
            </div>
          )}

          {next === 'Follow-Up' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">Sanction</span>
                  <span className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] text-right">{c.sanction || '—'}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Matatapos' : 'Ends'}</span>
                  <span className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7]">{c.sanctionEndDate ? fmt(c.sanctionEndDate, isTl) : '—'}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Katayuan' : 'Status'}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${c.sanctionStatus === 'Done' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : c.sanctionStatus === 'Pending parent notice' ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200'}`}>
                    {c.sanctionStatus === 'Done' ? (isTl ? 'Tapos na' : 'Done') : c.sanctionStatus === 'Pending parent notice' ? (isTl ? 'Naghihintay sa magulang' : 'Waiting for the parent') : isTl ? 'Ginagawa pa' : 'Being served'}
                  </span>
                </div>
              </div>
              {/* The sanction waits until the parent knows the decision. This is where that gets recorded (no dead end). */}
              {c.sanctionStatus === 'Pending parent notice' && (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/50 p-4 space-y-3" data-parent-notice>
                  <div>
                    <p className="text-[15px] font-semibold text-amber-950 dark:text-amber-100">{isTl ? 'Ipaalam sa magulang ang desisyon' : 'Let the parent know the decision'}</p>
                    <p className="text-[13px] text-amber-900 dark:text-amber-200">{isTl ? 'Magsisimula lang ang sanction kapag alam na ng magulang.' : 'The sanction starts only after the parent is told.'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="block text-[12px] text-amber-900 dark:text-amber-200">{isTl ? 'Paano naipaalam?' : 'How was the parent told?'}</span>
                    <div className="flex flex-wrap gap-2">
                      {NOTICE_HOW.map(([en, tl]) => (
                        <button
                          key={en}
                          type="button"
                          aria-pressed={noticeHow === en}
                          onClick={() => setNoticeHow(en)}
                          className={`h-10 px-4 rounded-full text-[13px] transition-[background-color,transform] duration-150 active:scale-[0.97] ${
                            noticeHow === en ? 'btn-lit font-semibold' : 'bg-white dark:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-[0_0_0_0.5px_rgb(15_23_42/0.15)] hover:bg-amber-100/60 dark:hover:bg-white/[0.12]'
                          }`}
                        >
                          {isTl ? tl : en}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {onComposeParent && noticeHow === 'SMS / text' && (
                      <button type="button" onClick={onComposeParent} className="h-10 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] bg-white dark:bg-white/[0.08] shadow-[0_0_0_0.5px_rgb(15_23_42/0.15)] hover:bg-white/80 active:scale-[0.97] transition-[background-color,transform] duration-150">
                        {isTl ? 'Isulat ang SMS (walang detalye ng offense)' : 'Write the SMS (no offense details)'}
                      </button>
                    )}
                    <button
                      type="button"
                      data-flow="notified"
                      disabled={busy || !noticeHow}
                      onClick={() => onAction({ kind: 'notified', how: noticeHow, conferenceStatus: c.parentConferenceStatus === 'No-Show' ? 'No-Show' : 'Attended' })}
                      className="btn-lit h-10 px-5 text-[13px] font-semibold"
                    >
                      {isTl ? 'Alam na ng magulang, simulan ang sanction' : 'Parent told, start the sanction'}
                    </button>
                  </div>
                </div>
              )}
              <div className="sticky bottom-0 z-10 -mx-1 glass-bar rounded-2xl px-3 py-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  data-flow="followup-start"
                  disabled={busy || c.sanctionStatus === 'Pending parent notice'}
                  onClick={() => onAction({ kind: 'followup', sanctionDone: false })}
                  className="h-11 px-5 rounded-full text-[14px] font-medium text-[#007AFF] dark:text-[#409CFF] bg-white/80 dark:bg-white/[0.06] shadow-[0_0_0_0.5px_rgb(15_23_42/0.12)] hover:bg-white dark:hover:bg-white/[0.1] disabled:opacity-50 active:scale-[0.97] transition-[background-color,transform] duration-150"
                >
                  {isTl ? 'Ginagawa pa' : 'Still serving'}
                </button>
                <button
                  type="button"
                  data-flow="followup-done"
                  disabled={busy || c.sanctionStatus === 'Pending parent notice'}
                  onClick={() => onAction({ kind: 'followup', sanctionDone: true })}
                  className="btn-lit btn-lit-green h-11 px-6 text-[14px] font-semibold inline-flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" aria-hidden />
                  {isTl ? 'Tapos na ang sanction' : 'Sanction done'}
                </button>
              </div>
            </div>
          )}

          {next === 'Closed' && (
            <div className="space-y-4">
              {/* summary from the REAL record (no invented text) */}
              <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {[
                  [
                    isTl ? 'Panig ng estudyante' : "Student's side",
                    c.explanationRefused ? (isTl ? 'Ayaw magbigay ng pahayag' : 'Chose not to give a statement') : c.explanation ? (isTl ? 'Naisulat' : 'Written') : '—',
                  ],
                  ...(!isMinor
                    ? [[
                        isTl ? 'Magulang' : 'Parent',
                        c.proceededWithoutParent
                          ? isTl ? 'Hindi dumalo; tumuloy nang wala' : 'Did not attend; went on without'
                          : c.parentConferenceStatus === 'Attended'
                          ? isTl ? `Dumating${c.conferenceAttendedBy ? ` (${c.conferenceAttendedBy})` : ''}` : `Came${c.conferenceAttendedBy ? ` (${c.conferenceAttendedBy})` : ''}`
                          : '—',
                      ]]
                    : []),
                  [isTl ? 'Desisyon' : 'Decision', c.decision || '—'],
                  ['Sanction', c.sanction ? `${c.sanction}${c.sanctionStatus === 'Done' ? (isTl ? ' · tapos na' : ' · done') : ''}` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="px-4 py-3 flex items-start justify-between gap-4">
                    <span className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] shrink-0">{k}</span>
                    <span className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] text-right">{v}</span>
                  </div>
                ))}
              </div>
              <label className="block space-y-1">
                <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Tala sa pagsara (opsyonal)' : 'Closing note (optional)'}</span>
                <textarea
                  value={counselingNotes}
                  onChange={(e) => setCounselingNotes(e.target.value.slice(0, 1500))}
                  rows={2}
                  className={`${input} rounded-xl text-[14px] leading-relaxed`}
                  placeholder={isTl ? 'hal. Natapos ang sanction noong Nob 20; kinumpirma ng adviser.' : 'e.g. Sanction finished on Nov 20; confirmed by the adviser.'}
                />
              </label>
              <div className="sticky bottom-0 z-10 -mx-1 glass-bar rounded-2xl px-3 py-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  title={isTl ? 'Buod, conference form at kasunduan, sabay-sabay i-print para sa folder' : 'Summary, conference form and kasunduan in one print, for the folder'}
                  onClick={() => {
                    const kinds: FormKind[] = ['caseResolutionSummary'];
                    if (c.parentConferenceStatus === 'Attended') kinds.push('conference');
                    if (c.decision) kinds.push('kasunduan');
                    printHtml(buildFolderHtml(kinds, { c, stu: student }, window.location.origin));
                  }}
                  className="h-11 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform duration-150"
                >
                  <FolderOpen className="w-4 h-4" aria-hidden />
                  {isTl ? 'I-print ang folder' : 'Print the folder'}
                </button>
                {onOpenPrint ? (
                  <button type="button" onClick={() => onOpenPrint('caseResolutionSummary')} className="h-11 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform duration-150">
                    <Printer className="w-4 h-4" aria-hidden />
                    {isTl ? 'I-print ang buod' : 'Print summary'}
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  data-flow="close"
                  disabled={busy}
                  onClick={() => onAction({ kind: 'close', counselingNotes: counselingNotes.trim() })}
                  className="btn-lit btn-lit-green h-11 px-6 text-[14px] font-semibold inline-flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" aria-hidden />
                  {isTl ? 'Isara ang kaso' : 'Close the case'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* appeal / request for reconsideration: after a decision, before the case is closed */}
      {c.decidedAt && c.status !== 'Resolved' && (
        <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10">
          {c.appealRequestedAt ? (
            <div className="px-4 py-3 text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
              <b>{isTl ? 'May apela' : 'Appeal recorded'}</b> · {c.appealBy} · {fmt(c.appealRequestedAt, isTl)}
              <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">
                {isTl ? 'Dahilan' : 'Reason'}: {c.appealReason} · {isTl ? 'Resulta' : 'Result'}: <b>{c.appealResult}</b>{c.appealNote ? ` · ${c.appealNote}` : ''}
              </span>
            </div>
          ) : !appealOpen ? (
            <button type="button" onClick={() => setAppealOpen(true)} className="w-full px-4 py-3 text-left text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] rounded-2xl">
              {isTl ? 'Humiling ng muling pagsusuri (apela) ang magulang o estudyante?' : 'Did the parent or student ask for a review (appeal)?'}
            </button>
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Itala ang apela' : 'Record the appeal'}</p>
              <div className="flex flex-wrap gap-1.5">
                {[['Parent / guardian', 'Magulang'], ['Student', 'Estudyante']].map(([en, tl]) => (
                  <button key={en} type="button" onClick={() => setAppealBy(en)} className={`h-8 px-3 rounded-full text-[12px] ${appealBy === en ? 'btn-lit font-semibold' : 'border border-[#E5E5EA] dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7]'}`}>{isTl ? tl : en}</button>
                ))}
              </div>
              <textarea value={appealReason} onChange={(e) => setAppealReason(e.target.value.slice(0, 1000))} rows={2} placeholder={isTl ? 'Ano ang dahilan ng apela?' : 'Why are they appealing?'} className={`${input} rounded-xl text-[14px]`} />
              <div className="flex flex-wrap gap-1.5">
                {[['Kept the decision', 'Pinanatili ang desisyon'], ['Changed the sanction', 'Binago ang parusa'], ['Withdrawn', 'Binawi ang parusa']].map(([en, tl]) => (
                  <button key={en} type="button" onClick={() => setAppealResult(en)} className={`h-8 px-3 rounded-full text-[12px] ${appealResult === en ? 'btn-lit font-semibold' : 'border border-[#E5E5EA] dark:border-white/10 text-[#1D1D1F] dark:text-[#F5F5F7]'}`}>{isTl ? tl : en}</button>
                ))}
              </div>
              <input value={appealNote} onChange={(e) => setAppealNote(e.target.value.slice(0, 300))} placeholder={isTl ? 'Tala (opsyonal), hal. bagong parusa' : 'Note (optional), e.g. the new sanction'} className={`${input} h-10 rounded-xl text-[14px]`} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAppealOpen(false)} className="h-9 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04]">{isTl ? 'Huwag na' : 'Cancel'}</button>
                <button type="button" disabled={busy || appealReason.trim().length < 5} onClick={() => onAction({ kind: 'appeal', by: appealBy, reason: appealReason.trim(), result: appealResult, note: appealNote.trim() || undefined })} className="btn-lit h-9 px-5 text-[13px] font-semibold disabled:opacity-40">
                  {isTl ? 'I-save ang apela' : 'Save appeal'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
