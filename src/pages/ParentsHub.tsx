import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { useConfirmChange } from '../components/ui/ConfirmChange';
import { soundFX } from '../services/soundEngine';
import type { ToastNextAction } from './DashboardPage';
import {
  ParentAppointmentItem,
  FollowUpTaskItem,
  localISODate,
} from '../data/dashboardMockData';
import type { StudentRecord, DisciplineCaseRecord } from '../data/stage3MockData';
import {
  insertAppointmentInDb,
  updateAppointmentInDb,
  updateAppointmentStatusInDb,
  insertFollowUpTaskInDb,
  updateFollowUpTaskInDb,
  insertActivityLogInDb,
  insertContactLogInDb,
  fetchContactLogsFromDb,
  fetchSmsLogsFromDb,
  updateStudentPrefsInDb,
  ContactLogEntry,
  SmsLogEntry,
} from '../services/supabaseClient';
import {
  suggestSlots,
  freeSlotsOn,
  slotLabel,
  slotStart,
  byDateTime,
  todayISO,
  addDays,
  isOfficeDay,
  parseISO,
  DAY_KEYS,
  OFFICE_DAYS,
} from '../services/scheduling';
import { buildConferenceSms, findSensitiveWords, sendParentMessage, dateTl, Channel } from '../services/parentComms';
import { smsInfo } from '../services/smsText';
import { SortControl, SortKey, loadSort, saveSort, timeOf, addedLabel } from '../components/ui/SortControl';
import { Legend } from '../components/ui/Charts';

export type ParentsTab = 'schedule' | 'conferences' | 'followups' | 'messages';

interface ParentsHubProps {
  appointments: ParentAppointmentItem[];
  setAppointments: React.Dispatch<React.SetStateAction<ParentAppointmentItem[]>>;
  followUps: FollowUpTaskItem[];
  setFollowUps: React.Dispatch<React.SetStateAction<FollowUpTaskItem[]>>;
  students: StudentRecord[];
  setStudents: React.Dispatch<React.SetStateAction<StudentRecord[]>>;
  cases: DisciplineCaseRecord[];
  smsReady: boolean | null;
  onTriggerToast: (msg: string, undo?: () => void, next?: ToastNextAction) => void;
  /** open the schedule window for this case right away (from the Cases page) */
  initialScheduleCase?: string | null;
  initialTab?: ParentsTab;
  /** contact logs written here also flip "notice received" — parent keeps them */
  onContactLogged?: () => void;
  /** the parent came → the case's "Parent Notified" step is done (7-step flow) */
  onConferenceAttended?: (caseCode: string) => void;
}

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
const CONTACT_RESULTS = ['Reached – will come', 'Reached – asked to reschedule', 'No answer', 'Wrong number', 'Left a message'] as const;
const CONTACT_RESULTS_TL: Record<string, string> = {
  'Reached – will come': 'Nakausap – darating',
  'Reached – asked to reschedule': 'Nakausap – gustong ilipat',
  'No answer': 'Walang sumagot',
  'Wrong number': 'Maling number',
  'Left a message': 'Nag-iwan ng mensahe',
};
const NO_SHOW_REASONS = ['Busy at work', 'Did not get the message', 'Sick / emergency', 'Forgot', 'No reason given'];
const NO_SHOW_TL: Record<string, string> = {
  'Busy at work': 'Abala sa trabaho',
  'Did not get the message': 'Hindi natanggap ang mensahe',
  'Sick / emergency': 'May sakit / emergency',
  Forgot: 'Nakalimutan',
  'No reason given': 'Walang sinabing dahilan',
};

type ScheduleState = { mode: 'new' | 'reschedule'; caseCode: string; from?: ParentAppointmentItem } | null;

export const ParentsHub: React.FC<ParentsHubProps> = ({
  appointments,
  setAppointments,
  followUps,
  setFollowUps,
  students,
  setStudents,
  cases,
  smsReady,
  onTriggerToast,
  initialScheduleCase,
  initialTab,
  onConferenceAttended,
}) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';
  const confirmChange = useConfirmChange();
  const today = todayISO();
  const tomorrow = addDays(today, 1);

  const [tab, setTab] = useState<ParentsTab>(initialTab ?? (initialScheduleCase ? 'schedule' : 'conferences'));
  const [calView, setCalView] = useState<'list' | 'week' | 'month'>('list');
  const [calAnchor, setCalAnchor] = useState<string>(today);
  const [showPast, setShowPast] = useState(false);
  const [msgFilter, setMsgFilter] = useState<'all' | 'problems'>('all');
  const [contactLogs, setContactLogs] = useState<ContactLogEntry[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLogEntry[] | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState>(
    initialScheduleCase ? { mode: 'new', caseCode: initialScheduleCase } : null
  );
  const [noShowFor, setNoShowFor] = useState<ParentAppointmentItem | null>(null);
  const [contactFor, setContactFor] = useState<{ caseCode: string; task?: FollowUpTaskItem; apt?: ParentAppointmentItem } | null>(null);
  const [prefsFor, setPrefsFor] = useState<StudentRecord | null>(null);
  // Golden Rule 9: draw long lists in pages of 50
  const [listLimit, setListLimit] = useState(50);
  useEffect(() => setListLimit(50), [tab]);

  const loadLogs = async () => {
    const [c, m] = await Promise.all([fetchContactLogsFromDb(), fetchSmsLogsFromDb()]);
    if (c) setContactLogs(c);
    setSmsLogs(m);
  };
  useEffect(() => {
    void loadLogs();
  }, []);

  // Esc closes the top-most window
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-confirm-open]')) return;
      if (prefsFor) setPrefsFor(null);
      else if (contactFor) setContactFor(null);
      else if (noShowFor) setNoShowFor(null);
      else if (schedule) setSchedule(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  // ---------------- derived data ----------------
  const studentByNo = useMemo(() => new Map(students.map((s) => [s.studentNumber, s])), [students]);
  const caseByCode = useMemo(() => new Map(cases.map((c) => [c.caseCode, c])), [cases]);
  const upcoming = useMemo(
    () => appointments.filter((a) => a.status === 'Scheduled' && a.date >= today).sort(byDateTime),
    [appointments, today]
  );
  const nextAptByCase = useMemo(() => {
    const m = new Map<string, ParentAppointmentItem>();
    upcoming.forEach((a) => !m.has(a.caseId) && m.set(a.caseId, a));
    return m;
  }, [upcoming]);
  const noShowsByCase = useMemo(() => {
    const m = new Map<string, number>();
    appointments.forEach((a) => a.status === 'Did Not Attend' && m.set(a.caseId, (m.get(a.caseId) ?? 0) + 1));
    return m;
  }, [appointments]);
  /** cases that need a conference and have none booked yet */
  const toSchedule = useMemo(
    () =>
      cases
        .filter((c) => c.status === 'Conference Scheduled' && !nextAptByCase.has(c.caseCode))
        .sort((a, b) => a.incidentDate.localeCompare(b.incidentDate)),
    [cases, nextAptByCase]
  );
  const [taskSort, setTaskSortState] = useState<SortKey>(() => loadSort('parents-tasks'));
  const setTaskSort = (v: SortKey) => {
    setTaskSortState(v);
    saveSort('parents-tasks', v);
  };
  const openTasks = useMemo(
    () =>
      followUps
        .filter((t) => !t.resolved)
        .sort((a, b) => {
          if (taskSort === 'name') return a.parentName.localeCompare(b.parentName);
          if (taskSort === 'attention') return (noShowsByCase.get(b.caseId) ?? 0) - (noShowsByCase.get(a.caseId) ?? 0) || b.attemptsCount - a.attemptsCount;
          const d = timeOf(b.createdAt) - timeOf(a.createdAt);
          return taskSort === 'oldest' ? -d : d;
        }),
    [followUps, noShowsByCase, taskSort]
  );
  const remindersDue = useMemo(
    () => appointments.filter((a) => a.status === 'Scheduled' && a.date === tomorrow && !a.reminderSentAt),
    [appointments, tomorrow]
  );
  const pastConfs = useMemo(
    () => appointments.filter((a) => a.date < today || (a.status !== 'Scheduled' && a.date === today)).sort((a, b) => -byDateTime(a, b)),
    [appointments, today]
  );
  const problemMsgs = (smsLogs ?? []).filter((m) => m.status !== 'Sent' && m.status !== 'Delivered' && m.status !== 'Email Sent');

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    [isTl]
  );
  const dayTitle = (iso: string) =>
    iso === today ? (isTl ? 'Ngayong araw' : 'Today') : iso === tomorrow ? (isTl ? 'Bukas' : 'Tomorrow') : dateFmt.format(parseISO(iso));
  const timeFmt = useMemo(() => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), [isTl]);
  const prettyWhen = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : timeFmt.format(d);
  };

  const logActivity = (en: string, tl: string, tag: string, tone: string) =>
    void insertActivityLogInDb({ actor: 'Guidance Associate', actionEn: en, actionTl: tl, tag, tone });

  /** one open "call the parent" task per case (no duplicates) */
  const ensureTask = (p: {
    caseId: string;
    category: FollowUpTaskItem['category'];
    reasonEn: string;
    reasonTl: string;
    noteEn: string;
    noteTl: string;
  }): FollowUpTaskItem | null => {
    const existing = followUps.find((t) => !t.resolved && t.caseId === p.caseId && t.category === p.category);
    if (existing) return null;
    const c = caseByCode.get(p.caseId);
    const stu = c ? studentByNo.get(c.studentNumber) : undefined;
    if (!c || !stu) return null;
    const task: FollowUpTaskItem = {
      id: uid('FUP'),
      caseId: c.caseCode,
      studentName: c.studentName,
      initials: stu.initials,
      gradeSection: c.gradeSection,
      parentName: stu.parentName,
      parentPhone: stu.parentPhone,
      parentEmail: stu.parentEmail,
      category: p.category,
      reasonEn: p.reasonEn,
      reasonTl: p.reasonTl,
      diagnosticNoteEn: p.noteEn,
      diagnosticNoteTl: p.noteTl,
      attemptsCount: 0,
      lastContactSummaryEn: 'Not contacted yet',
      lastContactSummaryTl: 'Hindi pa natatawagan',
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    setFollowUps((prev) => [task, ...prev]);
    void insertFollowUpTaskInDb(task);
    return task;
  };

  // ---------------- attendance ----------------
  const markAttended = async (apt: ParentAppointmentItem) => {
    const ok = await confirmChange({
      title: isTl ? 'Dumalo ang magulang?' : 'Did the parent attend?',
      description: `${apt.parentName} · ${apt.studentName} · ${dayTitle(apt.date)} ${apt.timeSlot}`,
      rows: [{ label: 'Status', before: isTl ? 'Naka-schedule' : 'Scheduled', after: isTl ? 'Dumalo' : 'Attended' }],
      confirmLabel: isTl ? 'Oo, dumalo' : 'Yes, attended',
      tone: 'success',
    });
    if (!ok) return;
    const prev = apt.status;
    setAppointments((list) => list.map((a) => (a.id === apt.id ? { ...a, status: 'Attended' } : a)));
    if (!(await updateAppointmentStatusInDb(apt.id, 'Attended'))) {
      setAppointments((list) => list.map((a) => (a.id === apt.id ? { ...a, status: prev } : a)));
      onTriggerToast(isTl ? '⚠️ Hindi na-save. I-check ang internet, tapos subukan ulit.' : '⚠️ Not saved. Check the internet, then try again.');
      return;
    }
    onConferenceAttended?.(apt.caseId);
    // a task about this missed/unreached conference is now done
    followUps
      .filter((t) => !t.resolved && t.caseId === apt.caseId)
      .forEach((t) => {
        setFollowUps((l) => l.map((x) => (x.id === t.id ? { ...x, resolved: true, lastContactSummaryEn: 'Parent attended', lastContactSummaryTl: 'Dumalo ang magulang' } : x)));
        void updateFollowUpTaskInDb(t.id, t.attemptsCount, 'Parent attended', true);
      });
    logActivity(`Conference attended: ${apt.parentName} (${apt.studentName})`, `Dumalo sa conference: ${apt.parentName} (${apt.studentName})`, apt.caseId, 'emerald');
    onTriggerToast(
      isTl ? `✓ Dumalo si ${apt.parentName}.` : `✓ ${apt.parentName} attended.`,
      () => {
        setAppointments((list) => list.map((a) => (a.id === apt.id ? { ...a, status: prev } : a)));
        void updateAppointmentStatusInDb(apt.id, prev);
      }
    );
  };

  const [noShowReason, setNoShowReason] = useState<string>(NO_SHOW_REASONS[0]);
  const [noShowNote, setNoShowNote] = useState('');
  const confirmNoShow = async () => {
    const apt = noShowFor;
    if (!apt) return;
    const reason = noShowNote.trim() ? `${noShowReason} – ${noShowNote.trim()}` : noShowReason;
    const count = (noShowsByCase.get(apt.caseId) ?? 0) + 1;
    const ok = await confirmChange({
      title: isTl ? 'Hindi dumalo ang magulang?' : 'Parent did not attend?',
      description: `${apt.parentName} · ${apt.studentName}`,
      rows: [
        { label: 'Status', before: isTl ? 'Naka-schedule' : 'Scheduled', after: isTl ? 'Hindi dumalo' : 'Did not attend' },
        { label: isTl ? 'Dahilan' : 'Reason', after: reason },
        { label: 'Follow-up', after: isTl ? 'Gagawa ng task: tawagan ang magulang' : 'A "call the parent" task is created' },
        ...(count >= 2 ? [{ label: isTl ? 'Babala' : 'Warning', after: isTl ? `${count}x nang hindi dumalo – markahan para sa counselor` : `${count} missed conferences – flag for the counselor` }] : []),
      ],
      confirmLabel: isTl ? 'Oo, hindi dumalo' : 'Yes, did not attend',
      tone: 'danger',
    });
    if (!ok) return;
    setAppointments((list) => list.map((a) => (a.id === apt.id ? { ...a, status: 'Did Not Attend', noShowReason: reason } : a)));
    void updateAppointmentStatusInDb(apt.id, 'Did Not Attend', reason);
    ensureTask({
      caseId: apt.caseId,
      category: 'Missed Conferences',
      reasonEn: `Did not attend on ${dayTitle(apt.date)} (${apt.timeSlot})`,
      reasonTl: `Hindi dumalo noong ${dayTitle(apt.date)} (${apt.timeSlot})`,
      noteEn: reason,
      noteTl: reason,
    });
    logActivity(`Missed conference (${count}x): ${apt.parentName} – ${reason}`, `Hindi dumalo (${count}x): ${apt.parentName} – ${reason}`, apt.caseId, 'amber');
    setNoShowFor(null);
    setNoShowNote('');
    onTriggerToast(
      isTl
        ? `Naitala. May task na para tawagan si ${apt.parentName}.${count >= 2 ? ` ⚠ ${count}x nang hindi dumalo.` : ''}`
        : `Saved. A task to call ${apt.parentName} was added.${count >= 2 ? ` ⚠ ${count} missed conferences.` : ''}`,
      undefined,
      {
        label: isTl ? 'Mag-schedule ulit' : 'Schedule again',
        hint: isTl ? 'Pumili ng bagong araw at oras' : 'Pick a new day and time',
        run: () => setSchedule({ mode: 'reschedule', caseCode: apt.caseId, from: { ...apt, status: 'Did Not Attend' } }),
      }
    );
  };

  const listLen = tab === 'schedule' ? toSchedule.length : openTasks.length;

  // ---------------- UI helpers ----------------
  const pill = (txt: string, cls: string) => (
    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap ${cls}`}>{txt}</span>
  );
  const statusPill = (a: ParentAppointmentItem) =>
    a.status === 'Attended'
      ? pill(isTl ? 'Dumalo' : 'Attended', 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300')
      : a.status === 'Did Not Attend'
      ? pill(isTl ? 'Hindi dumalo' : 'Did not attend', 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300')
      : a.status === 'Rescheduled'
      ? pill(isTl ? 'Nailipat' : 'Rescheduled', 'saas-card-subtle text-[#4A608A]')
      : pill(isTl ? 'Naka-schedule' : 'Scheduled', 'bg-[#E4ECFC] dark:bg-[#192D58] text-[#1E469B] dark:text-[#7CB8F7]');
  const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap';
  const subtleBtn = `${btn} saas-card-subtle hover:border-[#1E469B] text-[#0B1F4D] dark:text-white`;

  const confRow = (a: ParentAppointmentItem, showActions = true) => {
    const isPastDay = a.date < today;
    const noShows = noShowsByCase.get(a.caseId) ?? 0;
    return (
      <div
        key={a.id}
        data-apt={a.id}
        className="rounded-xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-[92px] shrink-0">
            <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white font-mono">{a.timeSlot.split('–')[0].trim()}</p>
            <p className="text-[10.5px] text-[#687FA8] dark:text-[#89A7DF]">{isTl ? '45 minuto' : '45 min'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
              {a.parentName}{' '}
              <span className="text-xs font-semibold text-[#4A608A] dark:text-[#94A8D0]">
                · {isTl ? 'magulang ni' : 'parent of'} {a.studentName} ({a.gradeSection})
              </span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {statusPill(a)}
              {a.status === 'Scheduled' &&
                (a.noticeReceived
                  ? pill(isTl ? '✓ Alam na ng magulang' : '✓ Parent knows', 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300')
                  : pill(isTl ? 'Hindi pa sigurado kung alam na' : 'Not confirmed yet', 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'))}
              {a.status === 'Scheduled' && a.date >= tomorrow && a.reminderSentAt &&
                pill(isTl ? 'May reminder na' : 'Reminder sent', 'saas-card-subtle text-[#4A608A]')}
              {noShows >= 2 && pill(isTl ? `⚠ ${noShows}x hindi dumalo` : `⚠ ${noShows} missed`, 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300')}
              {a.noShowReason && a.status === 'Did Not Attend' && (
                <span className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">{a.noShowReason}</span>
              )}
            </div>
          </div>
        </div>
        {showActions && a.status === 'Scheduled' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {a.date <= today && (
              <>
                <button type="button" onClick={() => markAttended(a)} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
                  ✓ {isTl ? 'Dumalo' : 'Attended'}
                </button>
                <button type="button" onClick={() => { setNoShowReason(NO_SHOW_REASONS[0]); setNoShowFor(a); }} className={`${btn} bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300`}>
                  ✕ {isTl ? 'Hindi dumalo' : 'Did not attend'}
                </button>
              </>
            )}
            {!a.noticeReceived && (
              <button type="button" onClick={() => setContactFor({ caseCode: a.caseId, apt: a })} className={subtleBtn}>
                📞 {isTl ? 'Tawagan' : 'Call parent'}
              </button>
            )}
            <button type="button" onClick={() => setSchedule({ mode: 'reschedule', caseCode: a.caseId, from: a })} className={subtleBtn}>
              ↻ {isTl ? 'Ilipat' : 'Reschedule'}
            </button>
          </div>
        )}
        {isPastDay && a.status === 'Scheduled' && (
          <p className="w-full text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            {isTl ? '⚠ Lumipas na ang araw na ito. Markahan kung dumalo o hindi.' : '⚠ This day has passed. Mark whether the parent attended.'}
          </p>
        )}
      </div>
    );
  };

  // ---------------- calendar ----------------
  const weekStart = (() => {
    const d = parseISO(calAnchor);
    const back = (d.getDay() + 6) % 7; // Monday
    return addDays(calAnchor, -back);
  })();
  const weekDays = [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
  const monthStart = calAnchor.slice(0, 8) + '01';
  const monthGrid = (() => {
    const first = parseISO(monthStart);
    const back = (first.getDay() + 6) % 7;
    const start = addDays(monthStart, -back);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  })();
  const confsOn = (iso: string) =>
    appointments.filter((a) => a.date === iso && a.status !== 'Rescheduled').sort(byDateTime);

  // ======================================================================
  return (
    <main className="p-5 lg:p-6 max-w-[1440px] w-full mx-auto space-y-4 flex-1">
      {/* sub tabs + main action */}
      <div className="shrink-0 h-[54px] flex items-center justify-between gap-4 border-b border-[#DCE5F2] dark:border-[#1E3158]">
        <div className="inline-flex p-1 rounded-xl saas-card-subtle gap-1">
          {(
            [
              ['schedule', isTl ? `Kailangang i-schedule · ${toSchedule.length}` : `To schedule · ${toSchedule.length}`, isTl ? 'Mga kasong wala pang schedule ng conference' : 'Cases that still need a conference date'],
              ['conferences', isTl ? `Mga conference · ${upcoming.length}` : `Conferences · ${upcoming.length}`, isTl ? 'Mga darating na conference' : 'Upcoming conferences'],
              ['followups', isTl ? `Follow-ups · ${openTasks.length}` : `Follow-ups · ${openTasks.length}`, isTl ? 'Mga magulang na kailangang tawagan' : 'Parents to call or text'],
              ['messages', isTl ? `Mga mensahe${problemMsgs.length ? ` · ⚠ ${problemMsgs.length}` : ''}` : `Messages${problemMsgs.length ? ` · ⚠ ${problemMsgs.length}` : ''}`, isTl ? 'Lahat ng SMS at email sa magulang' : 'Every SMS and email to parents'],
            ] as const
          ).map(([id, label, tip]) => (
            <button
              key={id}
              type="button"
              title={tip}
              onClick={() => {
                soundFX.playToggleSwitch(true);
                setTab(id);
              }}
              className={`px-4 py-2 rounded-lg text-xs sm:text-[13px] font-bold whitespace-nowrap transition-colors ${
                tab === id ? 'bg-[#1E469B] text-white shadow-sm' : 'text-[#4A608A] dark:text-[#94A8D0] hover:text-[#0B1F4D] dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* honest SMS status */}
      {smsReady === false && (
        <div role="note" className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-xs">
          <p className="font-extrabold text-amber-900 dark:text-amber-200">
            📵 {isTl ? 'Hindi pa naka-setup ang SMS.' : 'SMS is not set up yet.'}
          </p>
          <p className="text-amber-900/90 dark:text-amber-200/90 mt-0.5">
            {isTl
              ? 'Walang text na matatanggap ang magulang hangga’t walang SMS service (Semaphore). Email lang ang naipapadala. Tawagan muna sila — kusang gagawa ang app ng task na "Tawagan ang magulang".'
              : 'Parents will not get a text until an SMS service (Semaphore) is connected. Only email goes out. Call them for now — the app adds a "Call the parent" task each time.'}
          </p>
        </div>
      )}
      {remindersDue.length > 0 && smsReady === false && (
        <div className="px-4 py-3 rounded-xl bg-[#EEF3FC] dark:bg-[#13203B] border border-[#C9D7F0] dark:border-[#253B66] text-xs flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold text-[#0B1F4D] dark:text-white">
            🔔{' '}
            {isTl
              ? `${remindersDue.length} magulang ang may conference bukas pero hindi pa napapaalalahanan. Tawagan sila ngayon.`
              : `${remindersDue.length} parent(s) have a conference tomorrow and no reminder yet. Call them today.`}
          </p>
          <button type="button" onClick={() => setTab('conferences')} className={`${btn} bg-[#1E469B] text-white`}>
            {isTl ? 'Tingnan' : 'Show them'}
          </button>
        </div>
      )}

      {/* ================= TAB: TO SCHEDULE ================= */}
      {tab === 'schedule' && (
        <section className="rounded-2xl saas-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158]">
            <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
              {isTl ? 'Mga kasong kailangan ng conference' : 'Cases that need a parent conference'}
            </h2>
            <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
              {isTl ? 'Pinakamatagal nang naghihintay ang nasa itaas. Pindutin ang "Mag-schedule".' : 'The longest waiting are on top. Press "Schedule".'}
            </p>
          </div>
          <div className="p-4 sm:p-5 space-y-2.5 bg-[#F4F7FC] dark:bg-[#0B1527]">
            {toSchedule.length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-emerald-700 dark:text-emerald-400">
                ✓ {isTl ? 'Lahat ng kaso ay may schedule na. Ayos!' : 'Every case already has a conference date. All set!'}
              </p>
            )}
            {toSchedule.slice(0, listLimit).map((c) => {
              const stu = studentByNo.get(c.studentNumber);
              const missed = noShowsByCase.get(c.caseCode) ?? 0;
              return (
                <div key={c.caseCode} data-to-schedule={c.caseCode} className="rounded-xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-extrabold text-[#0B1F4D] dark:text-white">
                      {c.studentName}{' '}
                      <span className="text-xs font-semibold text-[#4A608A] dark:text-[#94A8D0]">· {c.gradeSection}</span>
                    </p>
                    <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                      {isTl ? 'Magulang' : 'Parent'}: <span className="font-bold text-[#0B1F4D] dark:text-white">{stu?.parentName ?? '—'}</span>{' '}
                      · {stu?.parentPhone || (isTl ? 'walang number' : 'no number')}
                      {stu?.parentPrefDays ? ` · ${isTl ? 'pwede' : 'can come'}: ${stu.parentPrefDays}${stu.parentPrefTime ? ' ' + stu.parentPrefTime : ''}` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {pill(isTl ? `Naitala: ${dateFmt.format(parseISO(c.incidentDate))}` : `Logged: ${dateFmt.format(parseISO(c.incidentDate))}`, 'saas-card-subtle text-[#4A608A]')}
                      {missed > 0 && pill(isTl ? `${missed}x hindi dumalo` : `${missed} missed before`, 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSchedule({ mode: 'new', caseCode: c.caseCode })}
                    className="px-4 py-2 rounded-lg bg-[#1E469B] hover:bg-[#16377E] text-white text-xs font-extrabold whitespace-nowrap"
                  >
                    📅 {isTl ? 'Mag-schedule' : 'Schedule'}
                  </button>
                </div>
              );
            })}
            {listLen > listLimit && (
              <button type="button" onClick={() => setListLimit((n) => n + 50)} className="w-full py-2.5 rounded-xl border border-dashed border-[#B9C8E4] dark:border-[#2E4778] text-xs font-extrabold text-[#1E469B] dark:text-[#7CB8F7]">
                {isTl ? `Ipakita pa (${listLen - listLimit} pa)` : `Show more (${listLen - listLimit} left)`}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ================= TAB: CONFERENCES ================= */}
      {tab === 'conferences' && (
        <section className="rounded-2xl saas-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Mga conference' : 'Conferences'}</h2>
              <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                {isTl ? 'Lunes–Biyernes, 8:00 AM – 4:00 PM, 45 minuto bawat isa. Walang dobleng schedule.' : 'Mon–Fri, 8:00 AM – 4:00 PM, 45 minutes each. No double booking.'}
              </p>
            </div>
            <div className="inline-flex p-1 rounded-lg saas-card-subtle gap-1">
              {(['list', 'week', 'month'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCalView(v)}
                  className={`px-3 py-1 rounded-md text-xs font-bold ${calView === v ? 'bg-[#1E469B] text-white' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}
                >
                  {v === 'list' ? (isTl ? 'Listahan' : 'List') : v === 'week' ? (isTl ? 'Linggo' : 'Week') : isTl ? 'Buwan' : 'Month'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4 bg-[#F4F7FC] dark:bg-[#0B1527]">
            {calView === 'list' && (
              <>
                {upcoming.length === 0 && (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-sm font-bold text-[#0B1F4D] dark:text-white">{isTl ? 'Walang darating na conference.' : 'No upcoming conferences.'}</p>
                    {toSchedule.length > 0 && (
                      <button type="button" onClick={() => setTab('schedule')} className={`${btn} bg-[#1E469B] text-white`}>
                        {isTl ? `${toSchedule.length} kaso ang kailangang i-schedule →` : `${toSchedule.length} case(s) need a date →`}
                      </button>
                    )}
                  </div>
                )}
                {[...new Set(upcoming.map((a) => a.date))].map((d) => (
                  <div key={d} className="space-y-2">
                    <p className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#4A608A] dark:text-[#94A8D0]">
                      {dayTitle(d)} · {upcoming.filter((a) => a.date === d).length}
                    </p>
                    {upcoming.filter((a) => a.date === d).map((a) => confRow(a))}
                  </div>
                ))}
                {pastConfs.length > 0 && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      aria-expanded={showPast}
                      onClick={() => setShowPast((v) => !v)}
                      className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#4A608A] dark:text-[#94A8D0] hover:text-[#0B1F4D] dark:hover:text-white"
                    >
                      {showPast ? '▾' : '▸'} {isTl ? 'Mga nakaraan' : 'Earlier'} · {pastConfs.length}{' '}
                      <span className="normal-case tracking-normal font-semibold">— {showPast ? (isTl ? 'itago' : 'hide') : isTl ? 'ipakita' : 'show'}</span>
                    </button>
                    {showPast && pastConfs.slice(0, 40).map((a) => (
                      <div key={a.id} className="space-y-1">
                        <p className="text-[10.5px] font-bold text-[#687FA8] dark:text-[#89A7DF]">{dayTitle(a.date)}</p>
                        {confRow(a)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {calView !== 'list' && (
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setCalAnchor(calView === 'week' ? addDays(calAnchor, -7) : localISODate(new Date(parseISO(monthStart).getFullYear(), parseISO(monthStart).getMonth() - 1, 1)))} className={subtleBtn} aria-label={isTl ? 'Nakaraan' : 'Previous'}>
                  ← {isTl ? 'Nakaraan' : 'Previous'}
                </button>
                <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                  {calView === 'week'
                    ? `${dateFmt.format(parseISO(weekDays[0]))} – ${dateFmt.format(parseISO(weekDays[4]))}`
                    : new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'long', year: 'numeric' }).format(parseISO(monthStart))}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCalAnchor(today)} className={subtleBtn}>{isTl ? 'Ngayon' : 'Today'}</button>
                  <button type="button" onClick={() => setCalAnchor(calView === 'week' ? addDays(calAnchor, 7) : localISODate(new Date(parseISO(monthStart).getFullYear(), parseISO(monthStart).getMonth() + 1, 1)))} className={subtleBtn} aria-label={isTl ? 'Susunod' : 'Next'}>
                    {isTl ? 'Susunod' : 'Next'} →
                  </button>
                </div>
              </div>
            )}

            {calView !== 'list' && (
              <Legend
                className="px-1 pb-2"
                items={[
                  { color: '#3B82F6', label: isTl ? 'Naka-schedule' : 'Scheduled', shape: 'box' },
                  { color: '#10B981', label: isTl ? 'Dumalo' : 'Attended', shape: 'box' },
                  { color: '#F43F5E', label: isTl ? 'Hindi dumalo' : 'Did not attend', shape: 'box' },
                ]}
              />
            )}
            {calView === 'week' && (
              <div className="grid grid-cols-5 gap-2" data-week>
                {weekDays.map((d) => (
                  <div key={d} className={`rounded-xl border p-2 min-h-[220px] ${d === today ? 'border-[#1E469B] bg-white dark:bg-[#0F1A30]' : 'border-[#D3DDEE] dark:border-[#253B66] bg-white/70 dark:bg-[#0F1A30]/70'}`}>
                    <p className={`text-xs font-extrabold mb-2 ${d === today ? 'text-[#1E469B] dark:text-[#7CB8F7]' : 'text-[#0B1F4D] dark:text-white'}`}>
                      {dateFmt.format(parseISO(d))}
                    </p>
                    <div className="space-y-1.5">
                      {confsOn(d).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          title={`${a.parentName} · ${a.studentName}`}
                          onClick={() => {
                            setCalView('list');
                            setTab('conferences');
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] leading-tight border ${
                            a.status === 'Attended'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                              : a.status === 'Did Not Attend'
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                              : 'bg-[#EEF3FC] dark:bg-[#192D58] border-[#C9D7F0] dark:border-[#2E4778]'
                          }`}
                        >
                          <span className="font-extrabold font-mono block">{a.timeSlot.split('–')[0].trim()}</span>
                          <span className="font-semibold block truncate">{a.parentName}</span>
                        </button>
                      ))}
                      {confsOn(d).length === 0 && (
                        <p className="text-[11px] text-[#687FA8] dark:text-[#89A7DF]">{isTl ? 'Walang conference' : 'No conferences'}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {calView === 'month' && (
              <div data-month>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((k, i) => (
                    <p key={k} className="text-[10.5px] font-extrabold text-center text-[#4A608A] dark:text-[#94A8D0]">
                      {isTl ? ['Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab', 'Lin'][i] : k}
                    </p>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthGrid.map((d) => {
                    const n = confsOn(d).length;
                    const inMonth = d.slice(0, 7) === monthStart.slice(0, 7);
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={!isOfficeDay(d)}
                        onClick={() => {
                          setCalAnchor(d);
                          setCalView('week');
                        }}
                        title={`${dateFmt.format(parseISO(d))} · ${n ? (isTl ? `${n} conference` : `${n} conference(s)`) : isTl ? 'walang conference' : 'no conferences'}`}
                        aria-label={`${dateFmt.format(parseISO(d))} · ${n ? (isTl ? `${n} conference` : `${n} conference(s)`) : isTl ? 'walang conference' : 'no conferences'}`}
                        className={`h-14 rounded-lg border text-left px-1.5 py-1 ${inMonth ? '' : 'opacity-40'} ${
                          d === today ? 'border-[#1E469B]' : 'border-[#D3DDEE] dark:border-[#253B66]'
                        } ${isOfficeDay(d) ? 'bg-white dark:bg-[#0F1A30] hover:border-[#1E469B]' : 'bg-transparent cursor-default'}`}
                      >
                        <span className="text-[11px] font-bold text-[#0B1F4D] dark:text-white">{parseISO(d).getDate()}</span>
                        {n > 0 && (
                          <span className="block mt-0.5 text-[10px] font-extrabold text-[#1E469B] dark:text-[#7CB8F7]">
                            {n} {isTl ? 'conf' : 'conf'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-[#687FA8] dark:text-[#89A7DF]">
                  {isTl ? 'Pindutin ang araw para makita ang linggo nito.' : 'Click a day to see its week.'}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================= TAB: FOLLOW-UPS ================= */}
      {tab === 'followups' && (
        <section className="rounded-2xl saas-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Mga magulang na kailangang tawagan' : 'Parents to call or text'}</h2>
              <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                {isTl
                  ? 'Kusang nagagawa kapag hindi dumalo ang magulang o hindi naipadala ang SMS.'
                  : 'Added automatically when a parent misses a conference or an SMS does not go out.'}
              </p>
            </div>
            <SortControl id="parents-tasks" value={taskSort} onChange={setTaskSort} isTl={isTl} />
          </div>
          <div className="p-4 sm:p-5 space-y-2.5 bg-[#F4F7FC] dark:bg-[#0B1527]">
            {openTasks.length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-emerald-700 dark:text-emerald-400">
                ✓ {isTl ? 'Walang kailangang tawagan. Ayos!' : 'Nobody to call right now. All caught up!'}
              </p>
            )}
            {openTasks.slice(0, listLimit).map((t) => {
              const missed = noShowsByCase.get(t.caseId) ?? 0;
              const logs = contactLogs.filter((l) => l.caseCode === t.caseId).slice(0, 3);
              const c = caseByCode.get(t.caseId);
              const stu = c ? studentByNo.get(c.studentNumber) : undefined;
              const next = nextAptByCase.get(t.caseId);
              return (
                <div key={t.id} data-task={t.id} className={`rounded-xl bg-white dark:bg-[#0F1A30] border px-4 py-3 space-y-2 ${missed >= 2 ? 'border-rose-300 dark:border-rose-800' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-extrabold text-[#0B1F4D] dark:text-white">
                        {t.parentName}{' '}
                        <span className="text-xs font-semibold text-[#4A608A] dark:text-[#94A8D0]">· {t.parentPhone || (isTl ? 'walang number' : 'no number')}</span>
                      </p>
                      <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                        {isTl ? 'Magulang ni' : 'Parent of'} {t.studentName} ({t.gradeSection}) · {isTl ? t.reasonTl : t.reasonEn}
                        {t.createdAt ? <span data-added> · {addedLabel(t.createdAt, isTl)}</span> : null}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {pill(
                          t.category === 'Failed SMS' ? (isTl ? 'Hindi naipadala ang SMS' : 'SMS not sent') : t.category === 'Missed Conferences' ? (isTl ? 'Hindi dumalo' : 'Missed conference') : isTl ? 'Unahin' : 'Priority',
                          'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                        )}
                        {pill(isTl ? `${t.attemptsCount}x natawagan` : `${t.attemptsCount} attempt(s)`, 'saas-card-subtle text-[#4A608A]')}
                        {missed >= 2 && pill(isTl ? `⚠ ${missed}x hindi dumalo – para sa counselor` : `⚠ ${missed} missed – flag for counselor`, 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300')}
                        {next && pill(`${isTl ? 'Bagong schedule' : 'New date'}: ${dayTitle(next.date)} ${next.timeSlot.split('–')[0].trim()}`, 'bg-[#E4ECFC] dark:bg-[#192D58] text-[#1E469B] dark:text-[#7CB8F7]')}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => setContactFor({ caseCode: t.caseId, task: t, apt: next })} className={`${btn} bg-[#1E469B] text-white`}>
                        📞 {isTl ? 'Itala ang tawag' : 'Log a call'}
                      </button>
                      {!next && (
                        <button type="button" onClick={() => setSchedule({ mode: 'new', caseCode: t.caseId })} className={subtleBtn}>
                          📅 {isTl ? 'Mag-schedule' : 'Schedule'}
                        </button>
                      )}
                      {stu && (
                        <button type="button" onClick={() => setPrefsFor(stu)} className={subtleBtn} title={isTl ? 'Mga araw na pwede ang magulang' : 'Days the parent can come'}>
                          🗓 {isTl ? 'Pwedeng araw' : 'Best days'}
                        </button>
                      )}
                    </div>
                  </div>
                  {logs.length > 0 && (
                    <ul className="border-l-2 border-[#DCE5F2] dark:border-[#1E3158] pl-3 space-y-0.5">
                      {logs.map((l) => (
                        <li key={l.id} className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">
                          <span className="font-bold text-[#0B1F4D] dark:text-white">{l.method}</span> · {isTl ? CONTACT_RESULTS_TL[l.result] ?? l.result : l.result}
                          {l.note ? ` · ${l.note}` : ''} · {prettyWhen(l.when)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {listLen > listLimit && (
              <button type="button" onClick={() => setListLimit((n) => n + 50)} className="w-full py-2.5 rounded-xl border border-dashed border-[#B9C8E4] dark:border-[#2E4778] text-xs font-extrabold text-[#1E469B] dark:text-[#7CB8F7]">
                {isTl ? `Ipakita pa (${listLen - listLimit} pa)` : `Show more (${listLen - listLimit} left)`}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ================= TAB: MESSAGES (SMS LOG) ================= */}
      {tab === 'messages' && (
        <section className="rounded-2xl saas-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Mga mensahe sa magulang' : 'Messages to parents'}</h2>
              <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                {isTl ? 'Lahat ng SMS at email. Hindi ito mae-edit.' : 'Every SMS and email. This list cannot be edited.'}
              </p>
            </div>
            <div className="inline-flex p-1 rounded-lg saas-card-subtle gap-1">
              {(['all', 'problems'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setMsgFilter(f)} className={`px-3 py-1 rounded-md text-xs font-bold ${msgFilter === f ? 'bg-[#1E469B] text-white' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}>
                  {f === 'all' ? `${isTl ? 'Lahat' : 'All'} · ${(smsLogs ?? []).length}` : `${isTl ? 'May problema' : 'Problems'} · ${problemMsgs.length}`}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 sm:p-5 space-y-2 bg-[#F4F7FC] dark:bg-[#0B1527]">
            {smsLogs === null && (
              <p className="py-6 text-center text-sm font-semibold text-rose-600 dark:text-rose-400">
                ⚠ {isTl ? 'Hindi makuha ang mga mensahe. I-check ang internet, tapos buksan ulit ang tab na ito.' : "Couldn't load the messages. Check the internet, then open this tab again."}
              </p>
            )}
            {smsLogs !== null && (msgFilter === 'all' ? smsLogs : problemMsgs).length === 0 && (
              <p className="py-6 text-center text-sm font-bold text-[#4A608A] dark:text-[#94A8D0]">
                {msgFilter === 'problems' ? (isTl ? '✓ Walang problema sa mga mensahe.' : '✓ No message problems.') : isTl ? 'Wala pang naipadalang mensahe.' : 'No messages sent yet.'}
              </p>
            )}
            {(msgFilter === 'all' ? smsLogs ?? [] : problemMsgs).slice(0, 100).map((m) => {
              const okSent = m.status === 'Sent' || m.status === 'Delivered' || m.status === 'Email Sent';
              return (
                <div key={m.id} data-msg={m.id} className="rounded-xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white">
                      {m.parentName} <span className="font-semibold text-[#4A608A] dark:text-[#94A8D0]">· {m.studentName}</span>
                    </p>
                    <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">
                      {m.channel === 'gmail' ? `✉ Email · ${m.email}` : m.channel === 'sms' ? `💬 SMS · ${m.phone}` : `${m.channel} · ${m.phone} ${m.email}`}
                      {m.kind ? ` · ${m.kind === 'reminder' ? (isTl ? 'paalala' : 'reminder') : m.kind === 'reschedule' ? (isTl ? 'paglipat' : 'reschedule') : isTl ? 'abiso' : 'notice'}` : ''} · {prettyWhen(m.when)}
                    </p>
                    {!okSent && m.error && <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{m.error}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {okSent
                      ? pill(isTl ? 'Naipadala' : 'Sent', 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300')
                      : m.status === 'Not sent'
                      ? pill(isTl ? 'Hindi naipadala (walang SMS service)' : 'Not sent (no SMS service)', 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300')
                      : pill(isTl ? 'Pumalya' : 'Failed', 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300')}
                    {!okSent && m.caseCode && caseByCode.has(m.caseCode) && (
                      <button type="button" onClick={() => setContactFor({ caseCode: m.caseCode, apt: nextAptByCase.get(m.caseCode) })} className={subtleBtn}>
                        📞 {isTl ? 'Tawagan' : 'Call parent'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= WINDOWS ================= */}
      {schedule &&
        createPortal(
          <ScheduleWindow
            key={schedule.caseCode + schedule.mode}
            state={schedule}
            onClose={() => setSchedule(null)}
            isTl={isTl}
            appointments={appointments}
            setAppointments={setAppointments}
            followUps={followUps}
            setFollowUps={setFollowUps}
            students={students}
            setStudents={setStudents}
            caseByCode={caseByCode}
            studentByNo={studentByNo}
            confirmChange={confirmChange}
            onTriggerToast={onTriggerToast}
            ensureTask={ensureTask}
            afterSend={() => void loadLogs()}
            dayTitle={dayTitle}
            smsReady={smsReady}
          />,
          document.body
        )}

      {noShowFor &&
        createPortal(
          <Overlay onClose={() => setNoShowFor(null)} label={isTl ? 'Hindi dumalo' : 'Did not attend'}>
            <h3 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
              {isTl ? 'Bakit hindi dumalo?' : 'Why did the parent not attend?'}
            </h3>
            <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
              {noShowFor.parentName} · {noShowFor.studentName}
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {NO_SHOW_REASONS.map((r) => (
                <label key={r} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer ${noShowReason === r ? 'border-[#1E469B] bg-[#EEF3FC] dark:bg-[#192D58]' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}>
                  <input type="radio" name="noshow" checked={noShowReason === r} onChange={() => setNoShowReason(r)} className="accent-[#1E469B]" />
                  {isTl ? NO_SHOW_TL[r] : r}
                </label>
              ))}
            </div>
            <input value={noShowNote} onChange={(e) => setNoShowNote(e.target.value)} placeholder={isTl ? 'Dagdag na detalye (optional)' : 'More details (optional)'} className="w-full px-3 py-2 rounded-lg saas-card-subtle text-xs font-semibold" />
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setNoShowFor(null)} className={subtleBtn}>{isTl ? 'Kanselahin' : 'Cancel'}</button>
              <button type="button" onClick={confirmNoShow} className={`${btn} bg-rose-600 hover:bg-rose-700 text-white`}>
                {isTl ? 'I-save' : 'Save'}
              </button>
            </div>
          </Overlay>,
          document.body
        )}

      {contactFor &&
        createPortal(
          <ContactWindow
            target={contactFor}
            isTl={isTl}
            onClose={() => setContactFor(null)}
            caseByCode={caseByCode}
            studentByNo={studentByNo}
            confirmChange={confirmChange}
            onSaved={(entry, resolved, wantsReschedule) => {
              setContactLogs((l) => [entry, ...l]);
              const t = contactFor.task ?? followUps.find((x) => !x.resolved && x.caseId === contactFor.caseCode);
              if (t) {
                const summary = `${entry.method}: ${entry.result}${entry.note ? ' · ' + entry.note : ''}`;
                setFollowUps((list) => list.map((x) => (x.id === t.id ? { ...x, attemptsCount: x.attemptsCount + 1, lastContactSummaryEn: summary, lastContactSummaryTl: summary, resolved } : x)));
                void updateFollowUpTaskInDb(t.id, t.attemptsCount + 1, summary, resolved);
              }
              const apt = contactFor.apt;
              if (apt && entry.result === 'Reached – will come') {
                setAppointments((list) => list.map((a) => (a.id === apt.id ? { ...a, noticeReceived: true, reminderSentAt: a.date === tomorrow ? a.reminderSentAt ?? new Date().toISOString() : a.reminderSentAt } : a)));
                void updateAppointmentInDb(apt.id, {
                  notice_received: true,
                  ...(apt.date === tomorrow && !apt.reminderSentAt ? { reminder_sent_at: new Date().toISOString() } : {}),
                });
              }
              setContactFor(null);
              onTriggerToast(
                isTl ? `✓ Naitala ang ${entry.method.toLowerCase()} kay ${entry.parentName}.` : `✓ ${entry.method} with ${entry.parentName} saved.`,
                undefined,
                wantsReschedule
                  ? { label: isTl ? 'Pumili ng bagong araw' : 'Pick a new date', run: () => setSchedule({ mode: apt ? 'reschedule' : 'new', caseCode: contactFor.caseCode, from: apt }) }
                  : undefined
              );
            }}
          />,
          document.body
        )}

      {prefsFor &&
        createPortal(
          <PrefsWindow
            student={prefsFor}
            isTl={isTl}
            onClose={() => setPrefsFor(null)}
            onSave={async (days, time) => {
              const okSave = await updateStudentPrefsInDb(prefsFor.studentNumber, days, time);
              if (!okSave) {
                onTriggerToast(isTl ? '⚠️ Hindi na-save. I-check ang internet, tapos subukan ulit.' : '⚠️ Not saved. Check the internet, then try again.');
                return;
              }
              setStudents((list) => list.map((s) => (s.studentNumber === prefsFor.studentNumber ? { ...s, parentPrefDays: days, parentPrefTime: time } : s)));
              setPrefsFor(null);
              onTriggerToast(isTl ? `✓ Na-save ang pwedeng araw ni ${prefsFor.parentName}.` : `✓ Saved the best days for ${prefsFor.parentName}.`);
            }}
          />,
          document.body
        )}
    </main>
  );
};

// ============================================================================
// Small shared window shell (portal → covers the whole screen)
// ============================================================================
const Overlay: React.FC<{ onClose: () => void; label: string; wide?: boolean; children: React.ReactNode }> = ({ onClose, label, wide, children }) => (
  <div className="fixed inset-0 !m-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
    <div
      role="dialog"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[calc(100dvh/var(--app-zoom,1)_-_2rem)] overflow-y-auto clean-scroll rounded-2xl saas-card p-6 space-y-3`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        title="Close"
        className="float-right w-8 h-8 rounded-lg saas-card-subtle text-sm font-bold text-[#4A608A]"
      >
        ✕
      </button>
      {children}
    </div>
  </div>
);

// ============================================================================
// Schedule / Reschedule window — Smart Scheduling + honest SMS/email
// ============================================================================
const ScheduleWindow: React.FC<{
  state: NonNullable<ScheduleState>;
  onClose: () => void;
  isTl: boolean;
  appointments: ParentAppointmentItem[];
  setAppointments: React.Dispatch<React.SetStateAction<ParentAppointmentItem[]>>;
  followUps: FollowUpTaskItem[];
  setFollowUps: React.Dispatch<React.SetStateAction<FollowUpTaskItem[]>>;
  students: StudentRecord[];
  setStudents: React.Dispatch<React.SetStateAction<StudentRecord[]>>;
  caseByCode: Map<string, DisciplineCaseRecord>;
  studentByNo: Map<string, StudentRecord>;
  confirmChange: ReturnType<typeof useConfirmChange>;
  onTriggerToast: ParentsHubProps['onTriggerToast'];
  ensureTask: (p: { caseId: string; category: FollowUpTaskItem['category']; reasonEn: string; reasonTl: string; noteEn: string; noteTl: string }) => FollowUpTaskItem | null;
  afterSend: () => void;
  dayTitle: (iso: string) => string;
  smsReady: boolean | null;
}> = ({ state, onClose, isTl, appointments, setAppointments, followUps, setFollowUps, caseByCode, studentByNo, confirmChange, onTriggerToast, ensureTask, afterSend, dayTitle, smsReady }) => {
  const c = caseByCode.get(state.caseCode);
  const stu = c ? studentByNo.get(c.studentNumber) : undefined;
  const reschedule = state.mode === 'reschedule' && state.from;
  const ignoreId = reschedule && state.from?.status === 'Scheduled' ? state.from.id : undefined;
  const suggestions = useMemo(
    // start tomorrow: the parent gets notice and a reminder the day before (today can still be picked by hand)
    () => suggestSlots(appointments, { fromISO: addDays(todayISO(), 1), prefDays: stu?.parentPrefDays, prefTime: stu?.parentPrefTime, ignoreId, limit: 6 }),
    [appointments, stu, ignoreId]
  );
  const [date, setDate] = useState<string>(suggestions[0]?.date ?? addDays(todayISO(), 1));
  const [start, setStart] = useState<number | null>(suggestions[0]?.start ?? null);
  const [channel, setChannel] = useState<Channel>(stu?.parentEmail ? 'both' : 'sms');
  const [sendNow, setSendNow] = useState(true);
  const free = useMemo(() => freeSlotsOn(appointments, date, ignoreId), [appointments, date, ignoreId]);
  const autoMsg = (d: string, s: number | null) =>
    stu && c && s !== null
      ? buildConferenceSms({ kind: reschedule ? 'reschedule' : 'notice', parentName: stu.parentName, studentName: c.studentName, date: d, timeSlot: slotLabel(s) })
      : '';
  const [message, setMessage] = useState<string>(autoMsg(date, start));
  const [msgEdited, setMsgEdited] = useState(false);
  useEffect(() => {
    if (!msgEdited) setMessage(autoMsg(date, start));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, start]);
  const sensitive = findSensitiveWords(message);
  const [saving, setSaving] = useState(false);

  if (!c || !stu) {
    return (
      <Overlay onClose={onClose} label="Schedule">
        <p className="text-sm font-bold text-[#0B1F4D] dark:text-white">
          {isTl ? 'Hindi makita ang kaso o ang estudyante. Isara ito at subukan ulit mula sa listahan.' : "Can't find this case or student. Close this and try again from the list."}
        </p>
      </Overlay>
    );
  }

  const dateBad = !isOfficeDay(date) || date < todayISO();
  const canSave = !dateBad && start !== null && free.includes(start) && !saving && (!sendNow || (message.trim() && sensitive.length === 0));

  const save = async () => {
    if (start === null) return;
    const when = `${dayTitle(date)} · ${slotLabel(start)}`;
    const ok = await confirmChange({
      title: reschedule ? (isTl ? 'Ilipat ang conference?' : 'Move the conference?') : isTl ? 'I-schedule ang conference?' : 'Schedule the conference?',
      description: `${stu.parentName} · ${isTl ? 'magulang ni' : 'parent of'} ${c.studentName}`,
      rows: [
        ...(reschedule && state.from ? [{ label: isTl ? 'Dating araw' : 'Old date', before: `${dayTitle(state.from.date)} · ${state.from.timeSlot}`, after: isTl ? 'Kinansela (pati ang reminder)' : 'Cancelled (and its reminder)' }] : []),
        { label: isTl ? 'Bagong araw' : 'Date & time', after: when },
        {
          label: isTl ? 'Ipapadala' : 'Message',
          after: !sendNow
            ? isTl ? 'Walang ipapadala ngayon' : 'Nothing sent now'
            : `${channel === 'gmail' ? 'Email' : channel === 'sms' ? 'SMS' : 'SMS + Email'}${channel !== 'gmail' && smsReady === false ? (isTl ? ' (hindi pa gagana ang SMS)' : ' (SMS not set up — will not go out)') : ''}`,
        },
        { label: isTl ? 'Reminder' : 'Reminder', after: isTl ? 'Isang araw bago' : 'One day before' },
      ],
      note: sendNow ? (isTl ? 'Totoong mensahe ito sa magulang. Walang detalye ng offense.' : 'This sends a real message to the parent. No offense details.') : undefined,
      confirmLabel: reschedule ? (isTl ? 'Oo, ilipat' : 'Yes, move it') : isTl ? 'Oo, i-schedule' : 'Yes, schedule',
    });
    if (!ok) return;
    setSaving(true);
    const apt: ParentAppointmentItem = {
      id: uid('APT'),
      caseId: c.caseCode,
      studentName: c.studentName,
      studentNumber: c.studentNumber,
      initials: stu.initials,
      gradeSection: c.gradeSection,
      offenseTypeEn: c.offenseTitleEn,
      offenseTypeTl: c.offenseTitleTl,
      severityTagEn: c.severity,
      severityTagTl: c.severity,
      severityTone: /serious|grave|major|escalat/i.test(c.severity) ? 'rose' : /2nd|consecutive/i.test(c.severity) ? 'amber' : 'cobalt',
      parentName: stu.parentName,
      relationship: stu.parentRelationship,
      parentPhone: stu.parentPhone,
      parentEmail: stu.parentEmail,
      timeSlot: slotLabel(start),
      date,
      status: 'Scheduled',
      noticeReceived: false,
      reminderSentAt: null,
      rescheduledFrom: reschedule && state.from ? state.from.id : undefined,
    };
    const saved = await insertAppointmentInDb(apt);
    if (!saved) {
      setSaving(false);
      onTriggerToast(isTl ? '⚠️ Hindi na-save ang schedule. I-check ang internet, tapos pindutin ulit ang "I-schedule".' : '⚠️ The conference was not saved. Check the internet, then press "Schedule" again.');
      return;
    }
    setAppointments((list) => [
      ...list.map((a) => (reschedule && state.from && a.id === state.from.id && a.status === 'Scheduled' ? { ...a, status: 'Rescheduled' as const } : a)),
      apt,
    ]);
    if (reschedule && state.from && state.from.status === 'Scheduled') void updateAppointmentInDb(state.from.id, { status: 'Rescheduled' });
    // a "missed conference" task is handled once a new date is set
    followUps
      .filter((t) => !t.resolved && t.caseId === c.caseCode && t.category === 'Missed Conferences')
      .forEach((t) => {
        const sum = `Rescheduled to ${when}`;
        setFollowUps((l) => l.map((x) => (x.id === t.id ? { ...x, resolved: true, lastContactSummaryEn: sum, lastContactSummaryTl: `Inilipat sa ${when}` } : x)));
        void updateFollowUpTaskInDb(t.id, t.attemptsCount, sum, true);
      });
    void insertActivityLogInDb({
      actor: 'Guidance Associate',
      actionEn: `${reschedule ? 'Rescheduled' : 'Scheduled'} parent conference: ${when}`,
      actionTl: `${reschedule ? 'Inilipat' : 'Nag-schedule'} ng conference: ${when}`,
      tag: c.caseCode,
      tone: 'cobalt',
    });

    let resultEn = '', resultTl = '';
    if (sendNow) {
      const r = await sendParentMessage({
        channel,
        phone: stu.parentPhone,
        email: stu.parentEmail,
        message,
        kind: reschedule ? 'reschedule' : 'notice',
        parentName: stu.parentName,
        studentName: c.studentName,
        gradeSection: c.gradeSection,
        caseCode: c.caseCode,
        appointmentCode: apt.id,
        scheduleText: when,
      });
      resultEn = r.summaryEn;
      resultTl = r.summaryTl;
      if (r.smsFailed)
        ensureTask({
          caseId: c.caseCode,
          category: 'Failed SMS',
          reasonEn: `SMS about ${when} did not go out`,
          reasonTl: `Hindi naipadala ang SMS tungkol sa ${when}`,
          noteEn: 'Call the parent to tell the date and time.',
          noteTl: 'Tawagan ang magulang para sabihin ang araw at oras.',
        });
      afterSend();
    }
    setSaving(false);
    onClose();
    const failed = sendNow && /not sent|failed/i.test(resultEn);
    onTriggerToast(
      `${failed ? '⚠️' : '✓'} ${isTl ? `Naka-schedule: ${when}.` : `Scheduled: ${when}.`}${sendNow ? ` ${isTl ? resultTl : resultEn}.` : ''}${
        failed ? (isTl ? ' May task na para tawagan ang magulang.' : ' A task to call the parent was added.') : ''
      }`
    );
  };

  return (
    <Overlay onClose={onClose} label={isTl ? 'Mag-schedule' : 'Schedule'} wide>
      <h3 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
        {reschedule ? (isTl ? 'Ilipat ang conference' : 'Move the conference') : isTl ? 'Mag-schedule ng conference' : 'Schedule a conference'}
      </h3>
      <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
        {stu.parentName} · {isTl ? 'magulang ni' : 'parent of'} <span className="font-bold">{c.studentName}</span> ({c.gradeSection}) · {stu.parentPhone || (isTl ? 'walang number' : 'no number')}
        {stu.parentEmail ? ` · ${stu.parentEmail}` : ''}
      </p>
      {reschedule && state.from && (
        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
          {isTl ? 'Dating schedule' : 'Old date'}: {dayTitle(state.from.date)} · {state.from.timeSlot}
        </p>
      )}

      {/* Smart suggestions */}
      <div>
        <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white mb-1.5">
          ✨ {isTl ? 'Mungkahing oras (bakante)' : 'Suggested free times'}
          {stu.parentPrefDays ? (
            <span className="font-semibold text-[#4A608A] dark:text-[#94A8D0]">
              {' '}· {isTl ? 'pwede ang magulang' : 'parent can come'}: {stu.parentPrefDays}
              {stu.parentPrefTime ? ` ${stu.parentPrefTime}` : ''}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-1.5" data-suggestions>
          {suggestions.length === 0 && (
            <p className="text-xs text-[#4A608A]">{isTl ? 'Walang bakante sa susunod na 2 linggo. Pumili ng ibang araw sa ibaba.' : 'No free time in the next 2 weeks. Pick another day below.'}</p>
          )}
          {suggestions.map((s) => {
            const on = s.date === date && s.start === start;
            return (
              <button
                key={s.date + s.start}
                type="button"
                onClick={() => {
                  setDate(s.date);
                  setStart(s.start);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${on ? 'bg-[#1E469B] border-[#1E469B] text-white' : 'border-[#D3DDEE] dark:border-[#253B66] text-[#0B1F4D] dark:text-white hover:border-[#1E469B]'}`}
              >
                {s.preferred ? '★ ' : ''}
                {dayTitle(s.date)} · {s.label.split('–')[0].trim()}
              </button>
            );
          })}
        </div>
      </div>

      {/* manual pick */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold mb-1" htmlFor="conf-date">{isTl ? 'O pumili ng araw' : 'Or pick a day'}</label>
          <input
            id="conf-date"
            type="date"
            min={todayISO()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setStart(null);
            }}
            className={`w-full px-3 py-2 rounded-lg saas-card-subtle text-xs font-bold ${dateBad ? 'ring-2 ring-rose-500' : ''}`}
          />
          {dateBad && (
            <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              {date < todayISO() ? (isTl ? 'Lumipas na ang araw na ito.' : 'This day has passed.') : isTl ? 'Lunes–Biyernes lang bukas ang office.' : 'The office is open Monday–Friday only.'}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold mb-1" htmlFor="conf-time">{isTl ? 'Oras' : 'Time'}</label>
          <select
            id="conf-time"
            value={start ?? ''}
            onChange={(e) => setStart(e.target.value === '' ? null : Number(e.target.value))}
            disabled={dateBad}
            className="w-full px-3 py-2 rounded-lg saas-card-subtle text-xs font-bold"
          >
            <option value="">{dateBad ? '—' : free.length ? (isTl ? 'Pumili ng oras' : 'Pick a time') : isTl ? 'Puno na ang araw na ito' : 'This day is full'}</option>
            {free.map((s) => (
              <option key={s} value={s}>{slotLabel(s)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* message */}
      <div className="space-y-1.5">
        <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
          <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} className="w-4 h-4 accent-[#1E469B]" />
          {reschedule ? (isTl ? 'Sabihan ang magulang tungkol sa bagong araw' : 'Tell the parent about the new date') : isTl ? 'Ipadala ang abiso sa magulang ngayon' : 'Send the notice to the parent now'}
        </label>
        {sendNow && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {(['sms', 'gmail', 'both'] as Channel[]).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  disabled={ch !== 'sms' && !stu.parentEmail}
                  title={ch !== 'sms' && !stu.parentEmail ? (isTl ? 'Walang email ang magulang' : 'The parent has no email') : undefined}
                  onClick={() => setChannel(ch)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border disabled:opacity-40 ${channel === ch ? 'bg-[#1E469B] border-[#1E469B] text-white' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}
                >
                  {ch === 'sms' ? 'SMS' : ch === 'gmail' ? 'Email' : 'SMS + Email'}
                </button>
              ))}
            </div>
            {channel !== 'gmail' && smsReady === false && (
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                📵 {isTl ? 'Hindi pa naka-setup ang SMS kaya hindi ito makakarating. Gagawa ang app ng task na tawagan ang magulang.' : 'SMS is not set up, so it will not arrive. The app will add a task to call the parent.'}
              </p>
            )}
            <textarea
              rows={6}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setMsgEdited(true);
              }}
              className={`w-full px-4 py-3 rounded-xl saas-card-subtle text-sm font-medium leading-relaxed resize-y min-h-[150px] ${sensitive.length ? 'ring-2 ring-rose-500' : ''}`}
            />
            {sensitive.length > 0 ? (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                ⚠ {isTl ? `Bawal ang detalye ng offense sa mensahe: "${sensitive.join('", "')}". Tanggalin ito, o pindutin ang` : `No offense details allowed: "${sensitive.join('", "')}". Remove it, or press`}{' '}
                <button type="button" className="underline font-bold" onClick={() => { setMsgEdited(false); setMessage(autoMsg(date, start)); }}>
                  {isTl ? 'ibalik ang ligtas na mensahe' : 'restore the safe message'}
                </button>
              </p>
            ) : (
              <p className="text-[11px] text-[#687FA8] dark:text-[#89A7DF]">
                {(() => {
                  const i = smsInfo(message);
                  const base = isTl ? `Filipino · ${i.length} letra · ${i.parts} SMS · walang detalye ng offense` : `Filipino · ${i.length} letters · ${i.parts} SMS · no offense details`;
                  return i.parts > 1 || i.unicode
                    ? `${base} — ${isTl ? `⚠ ${i.parts} SMS ang singil${i.unicode ? `; may espesyal na simbolo (${i.badChars.join(' ')})` : ''}. Paikliin para 1 SMS lang.` : `⚠ costs ${i.parts} SMS${i.unicode ? `; special symbol (${i.badChars.join(' ')})` : ''}. Shorten it to 1 SMS.`}`
                    : base;
                })()}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold">
          {isTl ? 'Kanselahin' : 'Cancel'}
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={save}
          title={start === null ? (isTl ? 'Pumili muna ng oras' : 'Pick a time first') : undefined}
          className="px-5 py-2 rounded-lg bg-[#1E469B] hover:bg-[#16377E] text-white text-xs font-extrabold disabled:bg-[#94A8D0] disabled:cursor-not-allowed"
        >
          {saving
            ? isTl ? 'Sine-save…' : 'Saving…'
            : start === null
            ? isTl ? 'Pumili muna ng oras' : 'Pick a time first'
            : reschedule
            ? isTl ? '✓ Ilipat' : '✓ Move conference'
            : isTl ? '✓ I-schedule' : '✓ Schedule'}
        </button>
      </div>
    </Overlay>
  );
};

// ============================================================================
// Contact log window (call / text / student call-out)
// ============================================================================
const ContactWindow: React.FC<{
  target: { caseCode: string; task?: FollowUpTaskItem; apt?: ParentAppointmentItem };
  isTl: boolean;
  onClose: () => void;
  caseByCode: Map<string, DisciplineCaseRecord>;
  studentByNo: Map<string, StudentRecord>;
  confirmChange: ReturnType<typeof useConfirmChange>;
  onSaved: (entry: ContactLogEntry, resolved: boolean, wantsReschedule: boolean) => void;
}> = ({ target, isTl, onClose, caseByCode, studentByNo, confirmChange, onSaved }) => {
  const c = caseByCode.get(target.caseCode);
  const stu = c ? studentByNo.get(c.studentNumber) : undefined;
  const parentName = stu?.parentName ?? target.task?.parentName ?? '';
  const phone = stu?.parentPhone ?? target.task?.parentPhone ?? '';
  const [method, setMethod] = useState<'Call' | 'Text' | 'Student call-out'>('Call');
  const [result, setResult] = useState<string>(CONTACT_RESULTS[0]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const resolved = result.startsWith('Reached');
    const ok = await confirmChange({
      title: isTl ? 'I-save ang contact?' : 'Save this contact?',
      description: `${parentName} · ${c?.studentName ?? ''}`,
      rows: [
        { label: isTl ? 'Paraan' : 'Method', after: method },
        { label: isTl ? 'Resulta' : 'Result', after: isTl ? CONTACT_RESULTS_TL[result] : result },
        ...(target.task ? [{ label: 'Task', before: isTl ? 'Bukas' : 'Open', after: resolved ? (isTl ? 'Tapos na' : 'Done') : isTl ? 'Bukas pa' : 'Still open' }] : []),
      ],
      note: isTl ? 'Hindi na mae-edit ang contact log.' : 'The contact log cannot be edited later.',
      confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save',
    });
    if (!ok) return;
    setBusy(true);
    const entry = {
      caseCode: target.caseCode,
      appointmentCode: target.apt?.id ?? '',
      studentName: c?.studentName ?? target.task?.studentName ?? '',
      parentName,
      method,
      result,
      note: note.trim(),
    };
    const saved = await insertContactLogInDb(entry);
    setBusy(false);
    if (!saved) return; // the app-wide warning already tells the user what to do
    onSaved({ ...entry, id: 'local-' + Date.now(), when: new Date().toISOString(), actor: 'Guidance Associate' }, resolved, result === 'Reached – asked to reschedule');
  };

  return (
    <Overlay onClose={onClose} label={isTl ? 'Itala ang tawag' : 'Log a call'}>
      <h3 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Itala ang tawag o text' : 'Log a call or text'}</h3>
      <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
        {parentName} · <a className="font-mono font-bold text-[#1E469B] dark:text-[#7CB8F7]" href={`tel:${phone.replace(/\D/g, '')}`}>{phone || (isTl ? 'walang number' : 'no number')}</a>
        {target.apt ? ` · ${isTl ? 'conference' : 'conference'}: ${target.apt.date} ${target.apt.timeSlot.split('–')[0].trim()}` : ''}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(['Call', 'Text', 'Student call-out'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMethod(m)} className={`px-3 py-1 rounded-lg text-xs font-bold border ${method === m ? 'bg-[#1E469B] border-[#1E469B] text-white' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}>
            {m === 'Call' ? (isTl ? '📞 Tawag' : '📞 Call') : m === 'Text' ? (isTl ? '💬 Text' : '💬 Text') : isTl ? '🧑‍🎓 Pinatawag ang estudyante' : '🧑‍🎓 Student call-out'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {CONTACT_RESULTS.map((r) => (
          <label key={r} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer ${result === r ? 'border-[#1E469B] bg-[#EEF3FC] dark:bg-[#192D58]' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}>
            <input type="radio" name="result" checked={result === r} onChange={() => setResult(r)} className="accent-[#1E469B]" />
            {isTl ? CONTACT_RESULTS_TL[r] : r}
          </label>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={isTl ? 'Tala (optional), hal. "Darating ng 9 AM"' : 'Note (optional), e.g. "Will come at 9 AM"'} className="w-full px-3 py-2 rounded-lg saas-card-subtle text-xs font-semibold" />
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold">{isTl ? 'Kanselahin' : 'Cancel'}</button>
        <button type="button" disabled={busy} onClick={save} className="px-5 py-2 rounded-lg bg-[#1E469B] text-white text-xs font-extrabold disabled:opacity-50">
          {busy ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? '✓ I-save' : '✓ Save'}
        </button>
      </div>
    </Overlay>
  );
};

// ============================================================================
// Parent's preferred days (used by Smart Scheduling)
// ============================================================================
const PrefsWindow: React.FC<{
  student: StudentRecord;
  isTl: boolean;
  onClose: () => void;
  onSave: (days: string, time: string) => void;
}> = ({ student, isTl, onClose, onSave }) => {
  const [days, setDays] = useState<string[]>((student.parentPrefDays || '').split(',').filter(Boolean));
  const [time, setTime] = useState<string>(student.parentPrefTime || '');
  const tl: Record<string, string> = { Mon: 'Lunes', Tue: 'Martes', Wed: 'Miyerkules', Thu: 'Huwebes', Fri: 'Biyernes' };
  return (
    <Overlay onClose={onClose} label={isTl ? 'Pwedeng araw' : 'Best days'}>
      <h3 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Kailan pwede ang magulang?' : 'When can the parent come?'}</h3>
      <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
        {student.parentName} · {isTl ? 'Gagamitin ito ng Smart Scheduling sa susunod.' : 'Smart Scheduling will use this next time.'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {OFFICE_DAYS.map((d) => (
          <button key={d} type="button" onClick={() => setDays((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]))} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${days.includes(d) ? 'bg-[#1E469B] border-[#1E469B] text-white' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}>
            {isTl ? tl[d] : d}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[['', isTl ? 'Kahit anong oras' : 'Any time'], ['AM', isTl ? 'Umaga' : 'Morning'], ['PM', isTl ? 'Hapon' : 'Afternoon']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setTime(v)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${time === v ? 'bg-[#1E469B] border-[#1E469B] text-white' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold">{isTl ? 'Kanselahin' : 'Cancel'}</button>
        <button type="button" onClick={() => onSave(DAY_KEYS.filter((k) => days.includes(k)).join(','), time)} className="px-5 py-2 rounded-lg bg-[#1E469B] text-white text-xs font-extrabold">
          {isTl ? '✓ I-save' : '✓ Save'}
        </button>
      </div>
    </Overlay>
  );
};
