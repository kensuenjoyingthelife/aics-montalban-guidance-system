import React, { useState, useMemo, useEffect } from 'react';
import { Phone, PhoneCall, Calendar, PhoneOff, AlertTriangle, CheckCircle2, User, BookOpen, X, Info, Send, Mail, MessageSquare, RotateCcw, MapPin, Clock, ShieldCheck, FileText, Bell, Plus, ChevronRight, SlidersHorizontal, Check } from 'lucide-react';
import { PhoneInput, checkPhMobile } from '../components/ui/PhoneInput';
import { useConfirmChange } from '../components/ui/ConfirmChange';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardBento } from '../components/dashboard/DashboardBento';
import { useLanguage } from '../context/LanguageContext';
import { soundFX } from '../services/soundEngine';
import { DuotoneIcon } from '../components/ui/icons';
import { Clock24 } from '../components/layout/Clock24';
import { WorkspaceSidebar } from '../components/layout/WorkspaceSidebar';
import {
  INITIAL_TODAY_APPOINTMENTS,
  ParentAppointmentItem,
  AppointmentStatus,
  INITIAL_FOLLOW_UP_TASKS,
  FollowUpTaskItem,
  FollowUpCategory,
  TimeframeKey,
  INITIAL_ACTIVITY_LOGS,
  OfficeActivityLog,
  localISODate,
  detectPrivacySensitiveTerms,
  buildDefaultParentMessage,
} from '../data/dashboardMockData';
import {
  MAIN_SIDEBAR_CATEGORIES,
  MainCategoryNavItem,
  INITIAL_STUDENTS,
  StudentRecord,
  INITIAL_DISCIPLINE_CASES,
  DisciplineCaseRecord,
} from '../data/stage3MockData';
import { Stage3CasesHub, type Stage3SubTab, type CasePrefill } from './Stage3CasesHub';
import { updateConcern, fetchConcerns } from '../services/concernsDb';
import { Sparkline } from '../components/ui/Charts';
import { useTheme } from '../context/ThemeContext';
import { ParentsHub, type ParentsTab } from './ParentsHub';
import ConcernsHub from './ConcernsHub';
import { HelpAssistant } from '../components/help/HelpAssistant';
import { SmsFallbackHost } from '../components/parents/SmsFallback';
import { ScanningScene } from '../components/ui/ScanningScene';
const SAVING_MS = 900;
import type { HelpTarget } from '../services/helpKB';
import { SortControl, SortKey, loadSort, saveSort, timeOf, addedLabel } from '../components/ui/SortControl';
import ReferralQueue from './ReferralQueue';
import AuditTrail from './AuditTrail';
import ReportsHub from './ReportsHub';
import SettingsPage from './SettingsPage';
import { fetchReferrals } from '../services/referralsDb';
import { buildQueue, ReferralRow } from '../services/referralRules';
import { loadAppConfig, useAppConfig } from '../services/appConfig';
import { sendParentMessage, isSmsConfigured, buildConferenceSms } from '../services/parentComms';
import { todayISO, addDays, byDateTime, isOfficeDay, sanctionEndingSoon } from '../services/scheduling';
import { smsInfo } from '../services/smsText';
import { TEXT_SIZES, TextSize, getTextSize, setTextSize, TEXT_SIZE_EVENT } from '../services/textSize';
import {
  fetchLiveDashboardData,
  fetchStage3Data,
  updateAppointmentStatusInDb,
  insertAppointmentInDb,
  insertFollowUpTaskInDb,
  updateFollowUpTaskInDb,
  insertActivityLogInDb,
  insertSmsGmailLogInDb,
  acknowledgeConcernInDb,
  DB_WRITE_FAILED,
  DB_WRITE_OK,
  updateAppointmentInDb,
  insertContactLogInDb,
  fetchBadgeCountsFromDb,
  setAuditActor,
  updateCaseFlowInDb,
  ACTIVITY_ADDED,
} from '../services/supabaseClient';

interface DashboardPageProps {
  staffEmail: string;
  staffRole: string;
  onLockTerminal: () => void;
}

type DashboardViewTab = 'queue' | 'analytics' | 'watchlist';

/** A "what to do next" button shown on the confirmation card after an action. */
export type ToastNextAction = { label: string; hint?: string; run: () => void };

/** Older saved records used other words; show them with the one wording used everywhere (Golden Rule 3). */
const plainAttendanceWords = (s: string) =>
  s.replace(/Did Not Attend Today/g, 'Did not attend today').replace(/Hindi Nakadalo Ngayong Araw/g, 'Hindi dumalo ngayong araw');

/** Hide technical sync words in the activity list (Golden Rule 3). */
const plainTimeAgo = (s: string, isTl: boolean) =>
  /synced|postgres|supabase/i.test(s) ? (isTl ? 'Na-save' : 'Saved') : s;

/** Sort order: what still needs the staff first. */
const CALL_WILL_COME = 'Reached — will come to the conference';
const CALL_STUDENT = 'Told the student to tell the parent';
const CALL_NEW_DATE = 'Reached — asked for a new date';
const CALL_OUTCOMES = [CALL_WILL_COME, CALL_NEW_DATE, 'No answer', 'Wrong number', CALL_STUDENT];
const CALL_OUTCOMES_TL: Record<string, string> = {
  [CALL_STUDENT]: 'Ipinatawag ang estudyante para sabihan ang magulang',
  [CALL_WILL_COME]: 'Nakausap — darating sa conference',
  'Reached — asked for a new date': 'Nakausap — humiling ng ibang araw',
  'No answer': 'Walang sumagot',
  'Wrong number': 'Maling number',
};
const CALL_TO_CONTACT_RESULT: Record<string, string> = {
  [CALL_WILL_COME]: 'Reached – will come',
  'Reached — asked for a new date': 'Reached – asked to reschedule',
  'No answer': 'No answer',
  'Wrong number': 'Wrong number',
  [CALL_STUDENT]: 'Left a message',
};
const NO_SHOW_REASONS_DASH = ['Busy at work', 'Did not get the message', 'Sick / emergency', 'Forgot', 'No reason given'];
const NO_SHOW_REASONS_DASH_TL: Record<string, string> = {
  'Busy at work': 'Abala sa trabaho',
  'Did not get the message': 'Hindi natanggap ang mensahe',
  'Sick / emergency': 'May sakit / emergency',
  Forgot: 'Nakalimutan',
  'No reason given': 'Walang sinabing dahilan',
};
const APT_ORDER: Record<string, number> = { Scheduled: 0, 'Did Not Attend': 1, Attended: 2, Rescheduled: 3 };
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;

export const DashboardPage: React.FC<DashboardPageProps> = ({
  staffEmail,
  staffRole,
  onLockTerminal,
}) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';

  // Apple style for everything inside the staff app (also pop-ups opened in portals); the login screen is not affected
  useEffect(() => {
    document.documentElement.classList.add('desk-app');
    return () => document.documentElement.classList.remove('desk-app');
  }, []);

  // 5-Tier Font Size State
  const [currentTextSize, setCurrentTextSize] = useState<TextSize>(() => getTextSize());
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<TextSize>;
      if (custom.detail) setCurrentTextSize(custom.detail);
    };
    window.addEventListener(TEXT_SIZE_EVENT, handler);
    return () => window.removeEventListener(TEXT_SIZE_EVENT, handler);
  }, []);

  const handleSetTextSize = (size: TextSize) => {
    setTextSize(size);
    setCurrentTextSize(size);
    soundFX.playKeyClick();
  };

  // Option 1 Sidebar Category navigation state (6 Main Categories)
  const [activeCategory, setActiveCategory] = useState<MainCategoryNavItem>(
    MAIN_SIDEBAR_CATEGORIES[0] // First-time users land on the Dashboard overview
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  // Golden Rule 10: a short "start here" guide on the first visit (remembered per computer)
  const [showGettingStarted, setShowGettingStarted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aics_getting_started_done_v1') !== '1';
    } catch {
      return true;
    }
  });
  const dismissGettingStarted = () => {
    setShowGettingStarted(false);
    try {
      localStorage.setItem('aics_getting_started_done_v1', '1');
    } catch {
      // storage blocked: the guide simply shows again next time
    }
  };
  const [casesInitialTab, setCasesInitialTab] = useState<Stage3SubTab>('case-board');
  const [casesInitialFlag, setCasesInitialFlag] = useState<'overdue' | 'waiting' | 'ending' | null>(null);
  const [casesOpenKey, setCasesOpenKey] = useState<number>(0);
  const [casesPrefill, setCasesPrefill] = useState<CasePrefill | null>(null);

  // Stage 3 Live State (Students Masterlist + Active Discipline Cases)
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [cases, setCases] = useState<DisciplineCaseRecord[]>([]);

  // Progressive Disclosure Workspace Tab (Prevents visual overload / "nakakahilo"!)
  const [activeTab, setActiveTab] = useState<DashboardViewTab>('queue');
  const [quickSearch, setQuickSearch] = useState<string>('');
  // the search box only filters the Dashboard and Cases — hide it (and forget the text) elsewhere (Golden Rule 5)
  const searchHere = activeCategory.id === 'dashboard' || activeCategory.id === 'cases-hub';
  useEffect(() => {
    if (!searchHere) setQuickSearch('');
  }, [searchHere]);

  // Urgent Student Concern Banner state
  const [concernAcknowledged, setConcernAcknowledged] = useState<boolean>(false);
  const [showConcernModal, setShowConcernModal] = useState<boolean>(false);
  const [showQuickGuideModal, setShowQuickGuideModal] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Analytics Timeframe state
  const [timeframe, setTimeframe] = useState<TimeframeKey>('month');

  // Today's Parent Appointments state
  const [appointments, setAppointments] = useState<ParentAppointmentItem[]>([]);
  const [aptFilter, setAptFilter] = useState<'ALL' | AppointmentStatus>('ALL');

  // Follow-Up Tasks Due state
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTaskItem[]>([]);
  const [taskFilter, setTaskFilter] = useState<'ALL' | FollowUpCategory>('ALL');
  // Pending first (Golden Rule 4): finished tasks only show when the user asks
  const [showDoneTasks, setShowDoneTasks] = useState<boolean>(false);

  // Recent Office Activity state
  const [activityLogs, setActivityLogs] = useState<OfficeActivityLog[]>([]);
  // 'loading' → 'ok' | 'offline' (could not reach the database) | 'unsaved' (a save failed)
  const [syncState, setSyncState] = useState<'loading' | 'ok' | 'offline' | 'unsaved'>('loading');

  const [badgeCounts, setBadgeCounts] = useState<{ pendingConcerns: number }>({ pendingConcerns: 0 });
  const { theme } = useTheme();
  // Dashboard tile: student reports sent per day, last 7 days (counts only)
  const [reports7, setReports7] = useState<number[]>([]);
  useEffect(() => {
    let alive = true;
    void fetchConcerns().then((list) => {
      if (!alive || !list) return;
      const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
      const real = list.filter((c) => !c.practice);
      setReports7(days.map((d) => real.filter((c) => { const x = new Date(c.createdAt); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` === d; }).length));
    });
    return () => { alive = false; };
  }, []);
  // every save carries the signed-in staff email → Audit Trail shows who made the change
  useEffect(() => setAuditActor(staffEmail), [staffEmail]);

  // Settings (office hours, offenses, SMS templates, security…) — loaded once, shared by every page
  const appConfig = useAppConfig();
  // Settings locks again every time you leave it (PIN asked on each visit)
  const [settingsKey, setSettingsKey] = useState(0);
  useEffect(() => {
    if (activeCategory.id !== 'settings-hub') setSettingsKey((k) => k + 1);
  }, [activeCategory.id]);
  useEffect(() => {
    void loadAppConfig();
  }, []);

  // Auto sign-out after N quiet minutes (Settings › Accounts & security). Warns during the last minute.
  const signOutMs = Math.max(1, Number(appConfig.security.autoSignOutMinutes) || 15) * 60000;
  const lastActivity = React.useRef(Date.now());
  const [idleWarnSecs, setIdleWarnSecs] = useState<number | null>(null);
  useEffect(() => {
    const bump = () => {
      lastActivity.current = Date.now();
    };
    const evs = ['mousedown', 'mousemove', 'keydown', 'wheel', 'touchstart'] as const;
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = window.setInterval(() => {
      const left = signOutMs - (Date.now() - lastActivity.current);
      if (left <= 0) {
        window.clearInterval(t);
        onLockTerminal();
      } else setIdleWarnSecs(left <= 60000 ? Math.ceil(left / 1000) : null);
    }, 1000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(t);
    };
  }, [signOutMs, onLockTerminal]);

  /** 8-step flow: a parent who attended the conference is notified → updates attendance and unlocks Decision */
  /** a missed conference also moves the case back to "pick a new date" (Step 4), so both places agree */
  const markParentNoShow = (caseCode: string) => {
    const c = cases.find((x) => x.caseCode === caseCode);
    if (!c || c.status === 'Resolved') return;
    const db: Record<string, unknown> = {
      parent_conference_status: 'No-Show',
      status: 'Pending Reschedule',
      step: 'Schedule Conference',
    };
    void updateCaseFlowInDb(caseCode, db).then((ok) => {
      if (!ok) return;
      setCases((prev) =>
        prev.map((x) =>
          x.caseCode === caseCode
            ? { ...x, parentConferenceStatus: 'No-Show', status: 'Pending Reschedule', step: 'Schedule Conference' }
            : x
        )
      );
    });
  };

  const markParentNotified = (caseCode: string) => {
    const c = cases.find((x) => x.caseCode === caseCode);
    if (!c || c.status === 'Resolved') return;
    const now = new Date().toISOString();
    const activate = c.sanctionStatus === 'Pending parent notice';
    const db: Record<string, unknown> = {
      parent_notified_at: now,
      parent_notified_how: 'Conference attended (In-Person)',
      parent_conference_status: 'Attended',
      status: 'Conference Attended',
      step: c.decidedAt ? 'Decision' : 'Parent Conference Attendance',
      ...(activate ? { sanction_status: 'Active', status: 'Sanction In Progress' } : {})
    };
    void updateCaseFlowInDb(caseCode, db).then((ok) => {
      if (!ok) return;
      setCases((prev) =>
        prev.map((x) =>
          x.caseCode === caseCode
            ? {
                ...x,
                parentNotifiedAt: now,
                parentNotifiedHow: 'Conference attended (In-Person)',
                parentConferenceStatus: 'Attended',
                status: (activate ? 'Sanction In Progress' : 'Conference Attended') as DisciplineCaseRecord['status'],
                step: (c.decidedAt ? 'Decision' : 'Parent Conference Attendance') as DisciplineCaseRecord['step'],
                ...(activate ? { sanctionStatus: 'Active' as const } : {})
              }
            : x
        )
      );
    });
  };
  const [referralRows, setReferralRows] = useState<ReferralRow[] | null>(null);
  const refreshBadges = React.useCallback(() => {
    void fetchBadgeCountsFromDb().then((c) => c && setBadgeCounts(c));
    void fetchReferrals().then((r) => r && setReferralRows(r));
  }, []);
  useEffect(() => {
    refreshBadges();
    // new concerns arrive from the student portal: keep the sidebar badge fresh
    const t = window.setInterval(() => document.visibilityState === 'visible' && refreshBadges(), 30000);
    return () => window.clearInterval(t);
  }, [refreshBadges]);

  // Every saved audit entry (from Cases, Parents or here) shows in the activity feed right away
  useEffect(() => {
    const onAdded = (e: Event) => {
      const d = (e as CustomEvent).detail as { actor: string; actionEn: string; actionTl: string; tag: string; tone: string };
      setActivityLogs((prev) => [
        {
          id: 'ACT-' + Date.now() + Math.random().toString(36).slice(2, 5),
          timeAgoEn: 'Just now',
          timeAgoTl: 'Ngayon lang',
          actor: d.actor,
          actionEn: d.actionEn,
          actionTl: d.actionTl,
          tag: d.tag,
          tone: (d.tone as OfficeActivityLog['tone']) || 'cobalt',
        },
        ...prev.slice(0, 7),
      ]);
    };
    window.addEventListener(ACTIVITY_ADDED, onAdded);
    return () => window.removeEventListener(ACTIVITY_ADDED, onAdded);
  }, []);

  // Live Supabase PostgreSQL Sync on mount
  useEffect(() => {
    let mounted = true;
    fetchLiveDashboardData().then((snapshot) => {
      if (!mounted) return;
      if (!snapshot || !snapshot.connected) {
        setSyncState('offline');
        return;
      }
      setSyncState((st) => (st === 'offline' ? st : 'ok'));
      // real data replaces the sample data, even when the database is empty
      setAppointments(snapshot.appointments);
      setFollowUpTasks(snapshot.followUps);
      setActivityLogs(snapshot.activityLogs);
      if (snapshot.concernAcknowledged) setConcernAcknowledged(true);
    });
    fetchStage3Data().then((s3) => {
      if (!mounted) return;
      if (!s3) {
        setSyncState('offline');
        return;
      }
      setStudents(s3.students);
      setCases(s3.cases);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Floating Undo Toast state
  const [toastPhase, setToastPhase] = useState<'saving' | 'done'>('done');
  const [lightToast, setLightToast] = useState<{ message: string; undoAction?: () => void } | null>(null);
  const [toastBanner, setToastBanner] = useState<{
    message: string;
    undoAction?: () => void;
    /** Golden Rule 6: the obvious next step after an action (e.g. "Text the parent"). */
    nextAction?: ToastNextAction;
  } | null>(null);

  // Modal 1: Quick No-Show Reason Modal
  const [noShowTarget, setNoShowTarget] = useState<ParentAppointmentItem | null>(null);
  const [noShowReason, setNoShowReason] = useState<string>('');

  // Modal 2: Quick Contact Attempt Logger Modal
  const [callLogTarget, setCallLogTarget] = useState<FollowUpTaskItem | null>(null);
  const [callOutcome, setCallOutcome] = useState<string>('');
  const [callCustomNotes, setCallCustomNotes] = useState<string>('');
  useEffect(() => {
    if (callLogTarget) setCallOutcome('');
  }, [callLogTarget]);
  useEffect(() => {
    if (noShowTarget) setNoShowReason('');
  }, [noShowTarget]);

  // Modal 3: User-Editable SMS & Gmail Composer Modal
  const [composerOpen, setComposerOpen] = useState<boolean>(false);
  const [composerChannel, setComposerChannel] = useState<'both' | 'sms' | 'gmail'>('both');
  // empty until a real parent is picked (never a sample parent or the office inbox)
  const [composerStudentName, setComposerStudentName] = useState<string>('');
  const [composerGradeSection, setComposerGradeSection] = useState<string>('');
  const [composerParentName, setComposerParentName] = useState<string>('');
  const [composerPhone, setComposerPhone] = useState<string>('');
  const [composerEmail, setComposerEmail] = useState<string>('');
  const [composerSchedule, setComposerSchedule] = useState<string>('');
  const [composerMessage, setComposerMessage] = useState<string>('');
  const [isSendingNotice, setIsSendingNotice] = useState<boolean>(false);

  // Modal 4: Walk-In Parent Conference Logger Modal
  const [walkInOpen, setWalkInOpen] = useState<boolean>(false);
  // Esc closes the top-most popup (Golden Rule 6: same behaviour everywhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-confirm-open], [data-statement-station], [data-help-assistant]')) return;
      if (toastBanner) setToastBanner(null);
      else if (composerOpen) setComposerOpen(false);
      else if (callLogTarget) setCallLogTarget(null);
      else if (walkInOpen) setWalkInOpen(false);
      else if (showQuickGuideModal) setShowQuickGuideModal(false);
      else if (showConcernModal) setShowConcernModal(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  const [walkInStudent, setWalkInStudent] = useState<string>('');
  const [walkInGrade, setWalkInGrade] = useState<string>('Grade 12 · ICT-1');
  const [walkInParent, setWalkInParent] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const confirmChange = useConfirmChange();
  const [walkInPurpose, setWalkInPurpose] = useState<string>(
    'Walk-in Parent Inquiry'
  );

  // Helper to show a Centered Mini Confirmation Card with Animated Check + Check Sound
  const [sendFlowActive, setSendFlowActive] = useState(false);
  const sendFlowRef = React.useRef(false);
  const deferredToast = React.useRef<[string, (() => void) | undefined, ToastNextAction | undefined] | null>(null);
  const triggerToast = (message: string, undoAction?: () => void, nextAction?: ToastNextAction) => {
    const isWarning = message.trim().startsWith('⚠');
    const isFail = /not saved|hindi na-save|failed|error/i.test(message);
    if (!isWarning && !isFail && !nextAction) {
      // simple success: small notice at the bottom, closes by itself, Undo stays available
      setLightToast({ message, undoAction });
      window.setTimeout(() => setLightToast((cur) => (cur?.message === message ? null : cur)), undoAction ? 6000 : 3500);
      return;
    }
    // a send to a parent is on screen: show this pop-up after it closes (never two pop-ups at once)
    if (sendFlowRef.current) { deferredToast.current = [message, undoAction, nextAction]; return; }
    const loading = !isWarning && !isFail; // "Next" choices first show the short "Saving…" scene (like the login loading)
    setToastPhase(loading ? 'saving' : 'done');
    if (loading) window.setTimeout(() => { setToastPhase('done'); soundFX.playSuccessCheck(); }, SAVING_MS);
    else soundFX.playError();
    setToastBanner({ message, undoAction, nextAction });
    // Stay longer when there is a next step to choose
    window.setTimeout(() => {
      setToastBanner((current) => (current?.message === message ? null : current));
    }, (nextAction ? 8000 : 2800) + (loading ? SAVING_MS : 0));
  };

  useEffect(() => {
    sendFlowRef.current = sendFlowActive;
    if (!sendFlowActive && deferredToast.current) {
      const [m, undo, nx] = deferredToast.current;
      deferredToast.current = null;
      triggerToast(m, undo, nx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendFlowActive]);

  useEffect(() => {
    let lastWarn = 0;
    const failing = new Set<string>(); // which kinds of save are still failing
    const onFail = (e: Event) => {
      setSyncState((st) => (st === 'offline' ? st : 'unsaved'));
      const what = (e as CustomEvent).detail?.what as string | undefined;
      if (what) failing.add(what);
      // these two already tell the user exactly what failed
      if (what === 'insertDisciplineCaseInDb' || what === 'updateDisciplineCaseDetailsInDb') return;
      if (Date.now() - lastWarn < 4000) return;
      lastWarn = Date.now();
      triggerToast(
        isTl
          ? '⚠️ Hindi na-save sa database ang huling ginawa mo. I-check ang internet, tapos ulitin. Mawawala ito kapag ni-reload ang page.'
          : '⚠️ Your last change was not saved to the database. Check the internet, then do it again. It will be gone if the page reloads.'
      );
    };
    const onOk = (e: Event) => {
      const what = (e as CustomEvent).detail?.what as string | undefined;
      if (what) failing.delete(what);
      // only clear the warning once the save that failed has worked again
      if (failing.size === 0) setSyncState((st) => (st === 'unsaved' ? 'ok' : st));
    };
    window.addEventListener(DB_WRITE_FAILED, onFail);
    window.addEventListener(DB_WRITE_OK, onOk);
    return () => {
      window.removeEventListener(DB_WRITE_FAILED, onFail);
      window.removeEventListener(DB_WRITE_OK, onOk);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTl]);

  // ---- "Needs attention" alerts (Settings › Offenses & rules sets the day limits) ----
  const dayCount = (iso: string) => Math.floor((Date.now() - new Date(iso.slice(0, 10) + 'T00:00:00').getTime()) / 86400000);
  const alerts = useMemo(() => {
    const r = appConfig.caseRules;
    const overdue = cases.filter((c) => c.status !== 'Resolved' && dayCount(c.incidentDate) > (r.overdueDays || 14));
    const waiting = cases.filter((c) => c.sanctionStatus === 'Pending parent notice' && c.decidedAt && dayCount(c.decidedAt) > (r.pendingSanctionDays ?? 3));
    return { overdue, waiting };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases, appConfig.caseRules]);

  // Only keep appointments & follow-ups linked to an existing active/closed case (prevents ghost records after case deletion)
  const validCaseCodes = useMemo(
    () => new Set(cases.map((c) => c.caseCode.trim().toLowerCase())),
    [cases]
  );
  const validCaseStudentNames = useMemo(
    () => new Set(cases.map((c) => c.studentName.trim().toLowerCase())),
    [cases]
  );
  const activeAppointments = useMemo(
    () =>
      appointments.filter((a) => {
        if (cases.length === 0) return false;
        if (a.caseId) return validCaseCodes.has(a.caseId.trim().toLowerCase());
        return validCaseStudentNames.has(a.studentName.trim().toLowerCase());
      }),
    [appointments, cases.length, validCaseCodes, validCaseStudentNames]
  );
  // cases that are still open (a closed case must not show in "Conferences today" or "Parents to call")
  const openCaseCodes = useMemo(
    () => new Set(cases.filter((c) => c.status !== 'Resolved').map((c) => c.caseCode.trim().toLowerCase())),
    [cases]
  );
  // cases that still have a conference coming (today or later)
  const casesWithUpcomingConf = useMemo(() => {
    const today = todayISO();
    return new Set(appointments.filter((a) => a.status === 'Scheduled' && a.date >= today && a.caseId).map((a) => a.caseId.trim().toLowerCase()));
  }, [appointments]);
  const activeFollowUpsList = useMemo(
    () =>
      followUpTasks.filter((t) => {
        if (cases.length === 0) return false;
        // "reminder did not go out" only matters while the conference is still coming;
        // after it happened (attended / did not attend) the next step lives on the conference itself
        if (!t.resolved && t.category === 'Failed SMS' && t.caseId && !casesWithUpcomingConf.has(t.caseId.trim().toLowerCase())) return false;
        if (t.caseId) {
          const code = t.caseId.trim().toLowerCase();
          // done tasks stay in "Done"; a still-open task of a closed case is hidden (nothing left to call about)
          return validCaseCodes.has(code) && (t.resolved || openCaseCodes.has(code));
        }
        return validCaseStudentNames.has(t.studentName.trim().toLowerCase());
      }),
    [followUpTasks, cases.length, validCaseCodes, validCaseStudentNames, openCaseCodes, casesWithUpcomingConf]
  );

  // The Dashboard shows TODAY's conferences only (other days live on the Parents page)
  const todayStr = todayISO();
  const referralsWaiting = useMemo(
    () => (referralRows ? buildQueue(cases, activeAppointments, referralRows).filter((q) => q.status === 'Waiting').length : 0),
    [cases, activeAppointments, referralRows]
  );
  const todayAppointments = useMemo(() => {
    // today only, open cases only, and one row per case + time slot (the latest one wins, no repeats)
    const seen = new Map<string, (typeof activeAppointments)[number]>();
    for (const a of activeAppointments) {
      if (a.date !== todayStr || a.status === 'Rescheduled') continue;
      if (a.caseId && !openCaseCodes.has(a.caseId.trim().toLowerCase())) continue;
      seen.set(`${(a.caseId || a.studentName).toLowerCase()}|${a.timeSlot}`, a);
    }
    return [...seen.values()];
  }, [activeAppointments, todayStr, openCaseCodes]
  );

  // Is an SMS service connected? (never pretend a text was sent)
  const [smsReady, setSmsReady] = useState<boolean | null>(null);
  useEffect(() => {
    void isSmsConfigured().then(setSmsReady);
  }, []);

  // Automatic reminder one day before (manuscript anchor; flowchart page 5). Runs when the app is open.
  // "One day before" = the last OFFICE day before the conference, so a Monday conference is reminded on Friday
  // (nobody opens the app on Sunday). If the SMS cannot go out, a "call the parent" task is made: never silent.
  // tried today is remembered on this computer, so re-opening the app does not text the same parent again
  const remindersTried = React.useRef<Set<string>>(
    (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('aics_reminders_tried_v1') || '{}');
        return new Set<string>(raw.day === todayISO() && Array.isArray(raw.ids) ? raw.ids : []);
      } catch {
        return new Set<string>();
      }
    })()
  );
  const rememberTried = (id: string) => {
    remindersTried.current.add(id);
    try {
      localStorage.setItem('aics_reminders_tried_v1', JSON.stringify({ day: todayISO(), ids: [...remindersTried.current] }));
    } catch {
      /* private window: the in-memory set still stops repeats this session */
    }
  };
  const cfgLoaded = useAppConfig().loaded;
  useEffect(() => {
    // wait for Settings so the reminder uses the office's own SMS template (not the built-in one)
    if (syncState !== 'ok' || smsReady === null || !cfgLoaded) return;
    let nextOffice = addDays(todayStr, 1);
    for (let i = 0; i < 14 && !isOfficeDay(nextOffice); i++) nextOffice = addDays(nextOffice, 1);
    // never remind about a closed or withdrawn case
    const closedCases = new Set(cases.filter((c) => c.status === 'Resolved').map((c) => c.caseCode));
    const due = appointments.filter(
      (a) =>
        a.status === 'Scheduled' &&
        !closedCases.has(a.caseId) &&
        a.date > todayStr &&
        a.date <= nextOffice &&
        !a.reminderSentAt &&
        !remindersTried.current.has(a.id)
    );
    if (!due.length) return;

    const callInstead = (a: ParentAppointmentItem, why: 'not-set-up' | 'failed') => {
      if (followUpTasks.some((t) => !t.resolved && t.caseId === a.caseId && t.category === 'Failed SMS')) return;
      const task: FollowUpTaskItem = {
        id: uid('FUP'),
        caseId: a.caseId,
        studentName: a.studentName,
        initials: a.initials,
        gradeSection: a.gradeSection,
        parentName: a.parentName,
        parentPhone: a.parentPhone,
        parentEmail: a.parentEmail,
        category: 'Failed SMS',
        reasonEn: why === 'not-set-up' ? 'Reminder not sent (SMS not set up)' : 'Reminder SMS did not go out',
        reasonTl: why === 'not-set-up' ? 'Hindi naipadala ang paalala (wala pang SMS)' : 'Hindi naipadala ang paalalang SMS',
        diagnosticNoteEn: `Call to remind about ${a.date} ${a.timeSlot}.`,
        diagnosticNoteTl: `Tawagan para ipaalala ang ${a.date} ${a.timeSlot}.`,
        attemptsCount: 0,
        lastContactSummaryEn: 'Not contacted yet',
        lastContactSummaryTl: 'Hindi pa natatawagan',
        resolved: false,
        createdAt: new Date().toISOString(),
      };
      setFollowUpTasks((prev) => [task, ...prev]);
      void insertFollowUpTaskInDb(task);
    };

    // SMS not connected: say so plainly and turn each reminder into a call task
    if (smsReady === false) {
      due.forEach((a) => {
        rememberTried(a.id);
        callInstead(a, 'not-set-up');
      });
      triggerToast(
        isTl
          ? `⚠️ ${due.length} paalala ang hindi naipadala dahil wala pang SMS. Nasa "Tatawagang magulang" na sila.`
          : `⚠️ ${due.length} reminder(s) not sent because SMS is not set up yet. They are now in "Parents to call".`
      );
      return;
    }

    due.forEach(async (a) => {
      rememberTried(a.id);
      const r = await sendParentMessage({
        channel: a.parentEmail ? 'both' : 'sms',
        phone: a.parentPhone,
        email: a.parentEmail,
        message: buildConferenceSms({ kind: 'reminder', parentName: a.parentName, studentName: a.studentName, date: a.date, timeSlot: a.timeSlot }),
        kind: 'reminder',
        phoneFallback: false, // automatic: becomes a "call the parent" task, no pop-up
        parentName: a.parentName,
        studentName: a.studentName,
        gradeSection: a.gradeSection,
        caseCode: a.caseId,
        appointmentCode: a.id,
      });
      if (r.anyDelivered) {
        const at = new Date().toISOString();
        setAppointments((list) => list.map((x) => (x.id === a.id ? { ...x, reminderSentAt: at } : x)));
        void updateAppointmentInDb(a.id, { reminder_sent_at: at });
      }
      if (r.smsFailed || !r.anyDelivered) callInstead(a, 'failed');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, cases, syncState, smsReady, todayStr, cfgLoaded]);

  // Dynamic KPI Metrics computed from live state (today only)
  const attendanceStats = useMemo(() => {
    const total = todayAppointments.length;
    const attended = todayAppointments.filter((a) => a.status === 'Attended').length;
    const scheduled = todayAppointments.filter((a) => a.status === 'Scheduled').length;
    const noShow = todayAppointments.filter((a) => a.status === 'Did Not Attend').length;
    // real share of today's parents who attended (no padding numbers)
    const ratePercent = total > 0 ? Math.round((attended / total) * 100) : null;

    return {
      total,
      attended,
      scheduled,
      noShow,
      ratePercent,
    };
  }, [todayAppointments]);

  const activeFollowUpCount = useMemo(
    () => activeFollowUpsList.filter((t) => !t.resolved).length,
    [activeFollowUpsList]
  );
  // "To do" = conferences still waiting for attendance + follow-ups not yet done
  const todoCount = attendanceStats.scheduled + activeFollowUpCount;

  const [casesInitialOpenCaseCode, setCasesInitialOpenCaseCode] = useState<string | null>(null);

  /** Opens the Cases page on a given tab (used by "+ New Case" and the Open Cases card). */
  const openCasesTab = (tab: Stage3SubTab, flag: 'overdue' | 'waiting' | 'ending' | null = null, prefill: CasePrefill | null = null, directCaseCode: string | null = null) => {
    soundFX.playStepUnlock();
    setCasesPrefill(prefill);
    setCasesInitialTab(tab);
    setCasesInitialFlag(flag);
    setCasesInitialOpenCaseCode(directCaseCode);
    setCasesOpenKey((k) => k + 1); // remount so the chosen tab opens even if Cases is already open
    setActiveCategory(MAIN_SIDEBAR_CATEGORIES[1]);
  };

  // Parents page: open it (optionally straight into "schedule this case")
  const [parentsKey, setParentsKey] = useState(0);
  const [parentsScheduleCase, setParentsScheduleCase] = useState<string | null>(null);
  const [parentsTab, setParentsTab] = useState<ParentsTab | undefined>(undefined);
  const openParents = (tab?: ParentsTab, scheduleCase?: string) => {
    soundFX.playStepUnlock();
    setParentsTab(tab);
    setParentsScheduleCase(scheduleCase ?? null);
    setParentsKey((k) => k + 1);
    const item = MAIN_SIDEBAR_CATEGORIES.find((c) => c.id === 'parents-hub');
    if (item) setActiveCategory(item);
  };

  /** Help Assistant "Open the page" buttons */
  const helpGo = (t: HelpTarget) => {
    setHelpOpen(false);
    const goId = (id: string) => {
      soundFX.playStepUnlock();
      const item = MAIN_SIDEBAR_CATEGORIES.find((c) => c.id === id);
      if (item) setActiveCategory(item);
    };
    if (t === 'dashboard') goId('dashboard');
    else if (t === 'new-case') openCasesTab('add-report');
    else if (t === 'cases') openCasesTab('case-board');
    else if (t === 'students') openCasesTab('students');
    else if (t === 'masterlist') openCasesTab('masterlist');
    else if (t === 'parents-schedule') openParents('schedule');
    else if (t === 'parents-conferences') openParents('conferences');
    else if (t === 'parents-followups') openParents('followups');
    else if (t === 'parents-messages') openParents('messages');
    else if (t === 'concerns') goId('support-hub');
    else if (t === 'counselor') goId('referrals-hub');
    else if (t === 'reports') goId('records-hub');
    else if (t === 'audit') goId('audit-hub');
    else if (t === 'settings') goId('settings-hub');
    else if (t === 'guide') setShowQuickGuideModal(true);
  };

  /** Shows the "Today" tab and scrolls to a panel (conferences or follow-ups). */
  const goToQueue = (anchorId: string) => {
    soundFX.playToggleSwitch(true);
    setActiveTab('queue');
    window.requestAnimationFrame(() =>
      document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  const filteredAppointments = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    return todayAppointments.filter((a) => {
      const matchesTab = aptFilter === 'ALL' || a.status === aptFilter;
      const matchesSearch =
        !q ||
        a.studentName.toLowerCase().includes(q) ||
        a.gradeSection.toLowerCase().includes(q) ||
        a.parentName.toLowerCase().includes(q) ||
        a.studentNumber.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    })
      // What still needs the staff comes first: Scheduled → Did Not Attend → Attended
      .sort((x, y) => APT_ORDER[x.status] - APT_ORDER[y.status] || byDateTime(x, y));
  }, [todayAppointments, aptFilter, quickSearch]);

  // In the "All" view, finished conferences fold into one line so pending ones stay visible
  const [showAttended, setShowAttended] = useState<boolean>(false);
  const attendedHiddenCount =
    aptFilter === 'ALL' && !showAttended
      ? filteredAppointments.filter((a) => a.status === 'Attended').length
      : 0;
  const visibleAppointments =
    attendedHiddenCount > 0 ? filteredAppointments.filter((a) => a.status !== 'Attended') : filteredAppointments;

  const [taskSort, setTaskSortState] = useState<SortKey>(() => loadSort('dash-tasks'));
  const setTaskSort = (v: SortKey) => {
    setTaskSortState(v);
    saveSort('dash-tasks', v);
  };
  const filteredFollowUps = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    const list = activeFollowUpsList.filter((t) => {
      const matchesTab = taskFilter === 'ALL' || t.category === taskFilter;
      const matchesDone = Boolean(t.resolved) === showDoneTasks;
      const matchesSearch =
        !q ||
        t.studentName.toLowerCase().includes(q) ||
        t.gradeSection.toLowerCase().includes(q) ||
        t.parentName.toLowerCase().includes(q);
      return matchesTab && matchesDone && matchesSearch;
    });
    const seenKey = new Set<string>();
    return list.filter((t) => {
      if (t.resolved) return true;
      const k = `${t.caseId}|${t.parentPhone.replace(/\D/g, '')}`;
      if (seenKey.has(k)) return false;
      seenKey.add(k);
      return true;
    }).sort((a, b) => {
      if (taskSort === 'name') return a.studentName.localeCompare(b.studentName);
      if (taskSort === 'attention') return Number(a.resolved) - Number(b.resolved) || b.attemptsCount - a.attemptsCount || timeOf(a.createdAt) - timeOf(b.createdAt);
      const d = timeOf(b.createdAt) - timeOf(a.createdAt);
      return taskSort === 'oldest' ? -d : d;
    });
  }, [activeFollowUpsList, taskFilter, quickSearch, taskSort, showDoneTasks]);
  const doneTaskCount = useMemo(() => activeFollowUpsList.filter((t) => t.resolved).length, [activeFollowUpsList]);
  const pendingTaskCount = activeFollowUpsList.length - doneTaskCount;

  // ---- Real numbers from the cases and students in the system (so every number agrees) ----
  const caseDate = (c: DisciplineCaseRecord) => {
    const d = new Date(`${c.incidentDate}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  };
  const offensesThisMonth = useMemo(() => {
    const now = new Date();
    return cases.filter((c) => {
      if (/^withdrawn/i.test(c.decision ?? "")) return false; // withdrawn = filed in error, not an offense
      const d = caseDate(c);
      return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [cases]);

  const currentAnalytics = useMemo(() => {
    const now = new Date();
    type Bucket = { labelEn: string; labelTl: string; logged: number; resolved: number; match: (d: Date) => boolean };
    let buckets: Bucket[] = [];
    if (timeframe === 'week') {
      const monday = new Date(now);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const en = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const tl = ['Lun', 'Mar', 'Miy', 'Huw', 'Biy'];
      buckets = en.map((labelEn, i) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        return { labelEn, labelTl: tl[i], logged: 0, resolved: 0, match: (d) => d.toDateString() === day.toDateString() };
      });
    } else if (timeframe === 'month') {
      buckets = [1, 2, 3, 4, 5].map((w) => ({
        labelEn: `Wk ${w}`,
        labelTl: `Wk ${w}`,
        logged: 0,
        resolved: 0,
        match: (d) =>
          d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && Math.ceil(d.getDate() / 7) === w,
      }));
    } else {
      // semester = last 6 months, year = last 12 months
      const months = timeframe === 'semester' ? 6 : 12;
      const enM = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      buckets = Array.from({ length: months }, (_, i) => {
        const m = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
        return {
          labelEn: enM[m.getMonth()],
          labelTl: enM[m.getMonth()],
          logged: 0,
          resolved: 0,
          match: (d) => d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(),
        };
      });
    }
    cases.forEach((c) => {
      const d = caseDate(c);
      if (!d) return;
      const b = buckets.find((x) => x.match(d));
      if (!b) return;
      b.logged++;
      if (c.status === 'Resolved') b.resolved++;
    });
    const points = buckets.map(({ labelEn, labelTl, logged, resolved }) => ({ labelEn, labelTl, logged, resolved }));
    const totalLogged = points.reduce((s, p) => s + p.logged, 0);
    const totalResolved = points.reduce((s, p) => s + p.resolved, 0);
    return {
      points,
      totalLogged,
      totalResolved,
      takeawayEn:
        totalLogged === 0
          ? 'No cases were logged in this period.'
          : `${totalLogged} case${totalLogged === 1 ? '' : 's'} logged · ${totalResolved} resolved · ${totalLogged - totalResolved} still open.`,
      takeawayTl:
        totalLogged === 0
          ? 'Walang naitalang kaso sa panahong ito.'
          : `${totalLogged} kaso ang naitala · ${totalResolved} ang naayos · ${totalLogged - totalResolved} ang bukas pa.`,
    };
  }, [cases, timeframe]);

  // Open cases per section (most first = needs attention). One pass over students and cases.
  const sectionCases = useMemo(() => {
    const bySection = new Map<string, { total: number; open: number; withCase: Set<string> }>();
    const sectionOf = new Map<string, string>();
    students.forEach((s) => {
      const key = s.sectionCode || '—';
      sectionOf.set(s.studentNumber, key);
      const row = bySection.get(key) ?? { total: 0, open: 0, withCase: new Set<string>() };
      row.total++;
      bySection.set(key, row);
    });
    cases.forEach((c) => {
      if (c.status === 'Resolved') return;
      const row = bySection.get(sectionOf.get(c.studentNumber) ?? '');
      if (row) {
        row.open++;
        row.withCase.add(c.studentNumber);
      }
    });
    const list = [...bySection.entries()]
      .map(([sectionCode, r]) => ({ sectionCode, openCases: r.open, students: r.total, studentsWithCase: r.withCase.size }))
      .sort((a, b) => b.openCases - a.openCases || a.sectionCode.localeCompare(b.sectionCode));
    const max = Math.max(1, ...list.map((x) => x.openCases));
    return list.map((x) => ({ ...x, barPercent: Math.round((x.openCases / max) * 100) }));
  }, [students, cases]);

  // Early Intervention: students with a minor offense whose NEXT minor offense would be serious
  const earlyInterventionList = useMemo(
    () => students.filter((s) => s.minorOffenseCount >= 1 && s.majorOffenseCount === 0),
    [students]
  );

  const maxTrendValue = useMemo(
    () => Math.max(...currentAnalytics.points.map((p) => Math.max(p.logged, p.resolved)), 1),
    [currentAnalytics]
  );

  // Action: Mark appointment as Attended
  // Attendance KPI preview for Before → After confirmations
  const previewAttendance = (deltaAttended: number) => {
    const a = attendanceStats.attended + deltaAttended;
    const t = attendanceStats.total;
    return t > 0 ? `${Math.round((a / t) * 100)}% · ${a} of ${t}` : `${a} of ${t}`;
  };

  const handleMarkAttended = async (apt: ParentAppointmentItem) => {
    const previousStatus = apt.status;
    const ok = await confirmChange({
      title: isTl ? 'Markahan bilang Attended?' : 'Mark as Attended?',
      description: `${apt.parentName} · ${apt.studentName} (${apt.gradeSection}) · ${apt.timeSlot}`,
      rows: [
        { label: 'Status', before: previousStatus, after: 'Attended' },
        {
          label: isTl ? 'Pagdalo (KPI)' : 'Attendance (KPI)',
          before: previewAttendance(0),
          after: previewAttendance(1),
        },
      ],
      confirmLabel: isTl ? 'Oo, dumalo' : 'Yes, attended',
      tone: 'success',
    });
    if (!ok) return;

    setAppointments((prev) =>
      prev.map((item) => (item.id === apt.id ? { ...item, status: 'Attended' } : item))
    );
    if (!(await updateAppointmentStatusInDb(apt.id, 'Attended'))) {
      setAppointments((prev) => prev.map((item) => (item.id === apt.id ? { ...item, status: previousStatus } : item)));
      triggerToast(isTl ? '⚠️ Hindi na-save ang "Dumalo". I-check ang internet, tapos subukan ulit.' : '⚠️ "Attended" was not saved. Check the internet, then try again.');
      return;
    }
    markParentNotified(apt.caseId);

    const newLog: OfficeActivityLog = {
      id: 'ACT-' + Date.now(),
      timeAgoEn: 'Just now',
      timeAgoTl: 'Kararating lang',
      actor: 'Guidance Associate',
      actionEn: `Marked ${apt.parentName} (${apt.studentName}) conference as Attended`,
      actionTl: `Minarkahang Dumalo si ${apt.parentName} (${apt.studentName})`,
      tag: apt.id,
      tone: 'emerald',
    };
    void insertActivityLogInDb(newLog);

    triggerToast(
      isTl
        ? `✓ Minarkahang 'Attended' si ${apt.parentName} (${apt.studentName}).`
        : `✓ Marked ${apt.parentName} (${apt.studentName}) as Attended.`,
      () => {
        soundFX.playBackspace();
        setAppointments((prev) =>
          prev.map((item) => (item.id === apt.id ? { ...item, status: previousStatus } : item))
        );
        void updateAppointmentStatusInDb(apt.id, previousStatus);
        setToastBanner(null);
      }
    );
  };

  // Action: Confirm Did Not Attend (No-Show) & Auto-Add Follow-Up Task
  const handleConfirmNoShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noShowTarget) return;
    if (!noShowReason) {
      triggerToast(isTl ? '⚠️ Piliin muna ang dahilan.' : '⚠️ Pick a reason first.');
      return;
    }

    const apt = noShowTarget;
    const previousStatus = apt.status;

    const ok = await confirmChange({
      title: isTl ? 'Markahan bilang Hindi dumalo?' : 'Mark as Did not attend?',
      description: `${apt.parentName} · ${apt.studentName} (${apt.gradeSection})`,
      rows: [
        { label: 'Status', before: previousStatus, after: isTl ? 'Hindi dumalo' : 'Did not attend' },
        { label: isTl ? 'Dahilan' : 'Reason', before: apt.noShowReason, after: noShowReason },
        {
          label: 'Follow-Up',
          before: undefined,
          after: isTl ? 'Gagawa ng bagong follow-up task' : 'A new follow-up task will be created',
        },
      ],
      confirmLabel: isTl ? 'Oo, hindi dumalo' : 'Yes, did not attend',
      tone: 'danger',
    });
    if (!ok) return;
    soundFX.playError();

    setAppointments((prev) =>
      prev.map((item) =>
        item.id === apt.id
          ? { ...item, status: 'Did Not Attend', noShowReason }
          : item
      )
    );
    void updateAppointmentStatusInDb(apt.id, 'Did Not Attend', noShowReason);
    markParentNoShow(apt.caseId);

    const createdTask: FollowUpTaskItem = {
      id: uid('FUP'),
      caseId: apt.caseId,
      studentName: apt.studentName,
      initials: apt.initials,
      gradeSection: apt.gradeSection,
      parentName: apt.parentName,
      parentPhone: apt.parentPhone,
      parentEmail: apt.parentEmail,
      category: 'Missed Conferences',
      reasonEn: `Did not attend on ${apt.date} (${apt.timeSlot})`,
      reasonTl: `Hindi dumalo noong ${apt.date} (${apt.timeSlot})`,
      diagnosticNoteEn: noShowReason,
      diagnosticNoteTl: noShowReason,
      attemptsCount: 1,
      lastContactSummaryEn: 'Not contacted yet',
      lastContactSummaryTl: 'Hindi pa natatawagan',
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    setFollowUpTasks((prev) => [createdTask, ...prev]);
    void insertFollowUpTaskInDb(createdTask);

    const newLog: OfficeActivityLog = {
      id: 'ACT-' + Date.now(),
      timeAgoEn: 'Just now',
      timeAgoTl: 'Kararating lang',
      actor: 'Guidance Associate',
      actionEn: `Logged Missed Conference for ${apt.parentName} — queued in Follow-Up Tasks`,
      actionTl: `Nagtala ng Missed Conference para kay ${apt.parentName} — nasa Follow-Up Tasks na`,
      tag: apt.caseId,
      tone: 'amber',
    };
    void insertActivityLogInDb(newLog);

    setNoShowTarget(null);

    triggerToast(
      isTl
        ? `Naitala. May task na para tawagan si ${apt.parentName} at pumili ng bagong araw.`
        : `Saved. A task to call ${apt.parentName} and set a new date was added.`,
      () => {
        soundFX.playBackspace();
        setAppointments((prev) =>
          prev.map((item) => (item.id === apt.id ? { ...item, status: previousStatus } : item))
        );
        setFollowUpTasks((prev) => prev.filter((t) => t.id !== createdTask.id));
        // undo in the database too (tasks cannot be deleted, so close it with a note)
        void updateAppointmentStatusInDb(apt.id, previousStatus, apt.noShowReason);
        void updateFollowUpTaskInDb(createdTask.id, 0, 'Undone by staff', true);
        setToastBanner(null);
      }
    );
  };

  // Action: Open SMS / Gmail Composer pre-filled for a parent
  const [composerCaseCode, setComposerCaseCode] = useState<string>('');
  const openComposerForParent = (params: {
    studentName: string;
    gradeSection: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    scheduleText: string;
    caseCode?: string;
    /** ready text to start from (e.g. the decision notice); default = summons notice */
    message?: string;
  }) => {
    soundFX.playStepUnlock();
    setComposerCaseCode(params.caseCode ?? '');
    setComposerStudentName(params.studentName);
    setComposerGradeSection(params.gradeSection);
    setComposerParentName(params.parentName);
    setComposerPhone(params.parentPhone);
    setComposerEmail(params.parentEmail || '');
    // No parent Gmail on file → default to SMS only (never send to the office inbox by mistake)
    setComposerChannel(params.parentEmail ? 'both' : 'sms');
    setComposerSchedule(params.scheduleText);
    setComposerMessage(
      params.message ||
      buildDefaultParentMessage({
        parentName: params.parentName,
        studentName: params.studentName,
        gradeSection: params.gradeSection,
        scheduleText: params.scheduleText,
        locale: 'tl',
      })
    );
    setComposerOpen(true);
  };

  // Action: Send Parent Notice via Live Gmail SMTP + Semaphore SMS Gateway
  const handleSendParentNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const usesSms = composerChannel !== 'gmail';
    const usesGmail = composerChannel !== 'sms';
    const ok = await confirmChange({
      title: isTl ? 'I-send ang notice sa magulang?' : 'Send this notice to the parent?',
      description: `${composerParentName} · ${composerStudentName} (${composerGradeSection})`,
      rows: [
        {
          label: isTl ? 'Paraan' : 'Channel',
          after: usesSms && usesGmail ? 'SMS + Gmail' : usesSms ? 'SMS only' : 'Gmail only',
        },
        ...(usesSms ? [{ label: 'SMS to', after: composerPhone }] : []),
        ...(usesGmail ? [{ label: 'Gmail to', after: composerEmail }] : []),
        ...(composerSchedule ? [{ label: isTl ? 'Schedule' : 'Schedule', after: composerSchedule }] : []),
        {
          label: isTl ? 'Mensahe' : 'Message',
          after: composerMessage.length > 160 ? composerMessage.slice(0, 160) + '…' : composerMessage,
        },
      ],
      note: isTl
        ? 'Totoong mensahe ito na matatanggap ng magulang. Hindi na ito mababawi.'
        : 'This sends a real message to the parent. It cannot be unsent.',
      confirmLabel: isTl ? 'Oo, i-send' : 'Yes, send now',
    });
    if (!ok) return;
    setIsSendingNotice(true);
    soundFX.playToggleSwitch(true);
    const result = await sendParentMessage({
      channel: composerChannel as 'sms' | 'gmail' | 'both',
      phone: composerPhone,
      email: composerEmail,
      message: composerMessage,
      kind: 'notice',
      parentName: composerParentName,
      studentName: composerStudentName,
      gradeSection: composerGradeSection,
      caseCode: composerCaseCode || undefined,
      scheduleText: composerSchedule,
    });
    setIsSendingNotice(false);
    setComposerOpen(false);

    const newLog: OfficeActivityLog = {
      id: 'ACT-' + Date.now(),
      timeAgoEn: 'Just now',
      timeAgoTl: 'Kararating lang',
      actor: 'Guidance Associate',
      actionEn: `Message to ${composerParentName}: ${result.summaryEn}`,
      actionTl: `Mensahe kay ${composerParentName}: ${result.summaryTl}`,
      tag: composerCaseCode || 'Message',
      tone: result.anyDelivered ? 'cobalt' : 'amber',
    };
    void insertActivityLogInDb(newLog);

    // SMS did not go out → make sure someone calls the parent (flowchart page 7)
    if (result.smsFailed && composerCaseCode && !followUpTasks.some((t) => !t.resolved && t.caseId === composerCaseCode && t.category === 'Failed SMS')) {
      const c = cases.find((x) => x.caseCode === composerCaseCode);
      const task: FollowUpTaskItem = {
        id: uid('FUP'),
        caseId: composerCaseCode,
        studentName: composerStudentName,
        initials: composerStudentName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(''),
        gradeSection: composerGradeSection,
        parentName: composerParentName,
        parentPhone: composerPhone,
        parentEmail: composerEmail,
        category: 'Failed SMS',
        reasonEn: 'SMS did not go out',
        reasonTl: 'Hindi naipadala ang SMS',
        diagnosticNoteEn: c ? 'Call the parent instead.' : 'Call the parent instead.',
        diagnosticNoteTl: 'Tawagan na lang ang magulang.',
        attemptsCount: 0,
        lastContactSummaryEn: 'Not contacted yet',
        lastContactSummaryTl: 'Hindi pa natatawagan',
        resolved: false,
        createdAt: new Date().toISOString(),
      };
      setFollowUpTasks((prev) => [task, ...prev]);
      void insertFollowUpTaskInDb(task);
    }

    triggerToast(
      `${result.anyDelivered && !result.smsFailed ? '✓' : '⚠️'} ${isTl ? `${composerParentName}: ${result.summaryTl}.` : `${composerParentName}: ${result.summaryEn}.`}${
        result.smsFailed ? (isTl ? ' Tawagan na lang ang magulang — may task na para dito.' : ' Call the parent instead — a task was added.') : ''
      }`
    );
  };

  // Action: Save Call Attempt Log
  const handleSaveCallAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callLogTarget) return;

    if (!callOutcome) {
      triggerToast(isTl ? '⚠️ Piliin muna kung ano ang nangyari sa tawag.' : '⚠️ Pick what happened on the call first.');
      return;
    }
    const isResolved = callOutcome === CALL_WILL_COME || callOutcome === CALL_NEW_DATE || callOutcome === CALL_STUDENT;

    const nextSummary = `${callOutcome}${callCustomNotes ? ` · ${callCustomNotes}` : ''}`;
    const nextAttempts = callLogTarget.attemptsCount + 1;

    const ok = await confirmChange({
      title: isTl ? 'I-save ang tawag?' : 'Save this call?',
      description: `${callLogTarget.parentName} · ${callLogTarget.studentName}`,
      rows: [
        {
          label: isTl ? 'Huling resulta' : 'Last result',
          before: isTl ? callLogTarget.lastContactSummaryTl : callLogTarget.lastContactSummaryEn,
          after: nextSummary,
        },
        {
          label: isTl ? 'Ilang beses' : 'Attempts',
          before: `${callLogTarget.attemptsCount}x`,
          after: `${nextAttempts}x`,
        },
        {
          label: 'Task',
          before: callLogTarget.resolved ? 'Resolved' : 'Open',
          after: isResolved ? 'Resolved' : 'Open',
        },
      ],
      confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save call',
      tone: isResolved ? 'success' : 'primary',
    });
    if (!ok) return;

    const sameKey = (x: FollowUpTaskItem) => x.id !== callLogTarget.id && !x.resolved && x.caseId === callLogTarget.caseId && x.parentPhone.replace(/\D/g, '') === callLogTarget.parentPhone.replace(/\D/g, '');
    if (isResolved) followUpTasks.filter(sameKey).forEach((x) => void updateFollowUpTaskInDb(x.id, x.attemptsCount, nextSummary, true));
    setFollowUpTasks((prev) =>
      prev.map((item) =>
        isResolved && sameKey(item)
          ? { ...item, lastContactSummaryEn: nextSummary, lastContactSummaryTl: nextSummary, resolved: true }
          : item.id === callLogTarget.id
          ? {
              ...item,
              attemptsCount: nextAttempts,
              lastContactSummaryEn: nextSummary,
              lastContactSummaryTl: nextSummary,
              resolved: isResolved,
            }
          : item
      )
    );
    void updateFollowUpTaskInDb(callLogTarget.id, nextAttempts, nextSummary, isResolved);
    void insertContactLogInDb({
      caseCode: callLogTarget.caseId,
      appointmentCode: '',
      studentName: callLogTarget.studentName,
      parentName: callLogTarget.parentName,
      method: callOutcome === CALL_STUDENT ? 'Student call-out' : 'Call',
      result: CALL_TO_CONTACT_RESULT[callOutcome] ?? callOutcome,
      note: callCustomNotes,
    });

    const newLog: OfficeActivityLog = {
      id: 'ACT-' + Date.now(),
      timeAgoEn: 'Just now',
      timeAgoTl: 'Kararating lang',
      actor: 'Guidance Associate',
      actionEn: `Logged phone call to ${callLogTarget.parentName}: "${callOutcome}"`,
      actionTl: `Nagtala ng tawag kay ${callLogTarget.parentName}: "${callOutcome}"`,
      tag: callLogTarget.caseId,
      tone: isResolved ? 'emerald' : 'cobalt',
    };
    void insertActivityLogInDb(newLog);

    const target = callLogTarget;
    setCallLogTarget(null);
    setCallCustomNotes('');
    setCallOutcome('');
    // Say what happened AND the obvious next step (Golden Rule 6)
    if (callOutcome === CALL_NEW_DATE) {
      openParents('schedule', target.caseId || undefined);
      triggerToast(isTl ? `Naitala ang tawag. Pumili na dito ng bagong araw para kay ${target.parentName}.` : `Call saved. Pick the new date for ${target.parentName} here.`);
    } else if (callOutcome === CALL_STUDENT) {
      triggerToast(isTl ? `Naitala. Tapos na ang follow-up para kay ${target.parentName}.` : `Saved. The follow-up for ${target.parentName} is done.`);
    } else if (callOutcome === 'Wrong number') {
      triggerToast(
        isTl ? `Naitala ang tawag. Ayusin ang number ni ${target.parentName} sa kaso.` : `Call saved. Fix ${target.parentName}'s number in the case.`,
        undefined,
        { label: isTl ? 'Ayusin ang number' : 'Fix number', run: () => openCasesTab('case-board', null, null, target.caseId || null) }
      );
    } else {
      triggerToast(
        isResolved
          ? isTl ? `Tapos na ang follow-up para kay ${target.parentName}.` : `Follow-up for ${target.parentName} is done.`
          : isTl ? `Naitala ang tawag. Nasa listahan pa si ${target.parentName} para tawagan ulit.` : `Call saved. ${target.parentName} stays on the list to call again.`
      );
    }
  };

  // Action: Log Walk-In Parent Conference (parent came without an appointment)
  const walkInLabel = (st: StudentRecord) => `${st.fullName} · ${st.gradeSection} · #${st.studentNumber}`;
  const walkInMatch = useMemo(() => {
    const q = walkInStudent.trim().toLowerCase();
    if (!q) return undefined;
    return (
      students.find((st) => walkInLabel(st).toLowerCase() === q || st.studentNumber.toLowerCase() === q.replace('#', '')) ??
      (students.filter((st) => st.fullName.toLowerCase() === q).length === 1 ? students.find((st) => st.fullName.toLowerCase() === q) : undefined)
    );
  }, [walkInStudent, students]);
  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = walkInMatch;
    if (!stu) {
      triggerToast(
        isTl
          ? '⚠️ Pumili ng estudyante mula sa listahan. Kung wala siya, idagdag muna sa Mga Kaso → Mga estudyante.'
          : '⚠️ Pick the student from the list. If they are not there, add them first in Cases → Students.'
      );
      return;
    }
    const openCase = cases
      .filter((c) => c.studentNumber === stu.studentNumber && c.status !== 'Resolved')
      .sort((x, y) => y.incidentDate.localeCompare(x.incidentDate))[0];
    const alreadyToday = appointments.some(
      (a) => a.studentNumber === stu.studentNumber && a.date === todayStr && a.timeSlot.startsWith('Walk-In')
    );
    const ok = await confirmChange({
      title: isTl ? 'I-log ang walk-in?' : 'Log this walk-in?',
      description: isTl ? 'Madadagdag ito ngayong araw bilang Dumalo.' : "This is added to today's list as Attended.",
      rows: [
        { label: isTl ? 'Estudyante' : 'Student', after: `${stu.fullName} (${stu.gradeSection})` },
        { label: isTl ? 'Magulang' : 'Parent', after: `${stu.parentName} · ${stu.parentPhone || '—'}` },
        { label: isTl ? 'Kaso' : 'Case', after: openCase ? `${openCase.caseCode} · ${isTl ? openCase.offenseTitleTl : openCase.offenseTitleEn}` : isTl ? 'Walang bukas na kaso' : 'No open case' },
        { label: isTl ? 'Dahilan' : 'Purpose', after: walkInPurpose },
      ],
      note: alreadyToday
        ? isTl ? `May walk-in na si ${stu.fullName} ngayong araw. Siguraduhing hindi ito doble.` : `${stu.fullName} already has a walk-in today. Make sure this is not a duplicate.`
        : undefined,
      confirmLabel: isTl ? 'Oo, i-log' : 'Yes, log walk-in',
      tone: 'success',
    });
    if (!ok) return;
    const newApt: ParentAppointmentItem = {
      id: uid('APT'),
      caseId: openCase?.caseCode ?? '',
      studentName: stu.fullName,
      studentNumber: stu.studentNumber,
      initials: stu.initials || 'ST',
      gradeSection: stu.gradeSection,
      offenseTypeEn: walkInPurpose,
      offenseTypeTl: walkInPurpose,
      severityTagEn: 'Walk-In Conference',
      severityTagTl: 'Walk-In Conference',
      severityTone: 'cobalt',
      parentName: stu.parentName,
      relationship: stu.parentRelationship,
      parentPhone: stu.parentPhone,
      parentEmail: stu.parentEmail, // the parent's own email — never the office's
      timeSlot: 'Walk-In · ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: localISODate(),
      status: 'Attended',
      noticeReceived: true,
    };
    const saved = await insertAppointmentInDb(newApt);
    if (!saved) {
      triggerToast(isTl ? '⚠️ Hindi na-log ang walk-in. I-check ang internet, tapos subukan ulit.' : '⚠️ The walk-in was not saved. Check the internet, then try again.');
      return;
    }
    setAppointments((prev) => [newApt, ...prev]);
    void insertContactLogInDb({
      caseCode: openCase?.caseCode ?? '',
      appointmentCode: newApt.id,
      studentName: stu.fullName,
      parentName: stu.parentName,
      method: 'Walk-in',
      result: 'Reached – will come',
      note: walkInPurpose,
    });
    setWalkInOpen(false);
    setWalkInStudent('');
    triggerToast(
      isTl ? `✓ Naitala ang walk-in ni ${stu.parentName} (${stu.fullName}) bilang Dumalo.` : `✓ Walk-in for ${stu.parentName} (${stu.fullName}) logged as Attended.`
    );
  };

  // Live RA 10173 Privacy Detection for Composer
  const detectedSensitiveTerms = useMemo(
    () => detectPrivacySensitiveTerms(composerMessage),
    [composerMessage]
  );

  // SVG Donut Ring calculations
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const attendedStroke =
    (attendanceStats.attended / Math.max(attendanceStats.total, 1)) * donutCircumference;
  const scheduledStroke =
    (attendanceStats.scheduled / Math.max(attendanceStats.total, 1)) * donutCircumference;
  const noShowStroke =
    (attendanceStats.noShow / Math.max(attendanceStats.total, 1)) * donutCircumference;

  return (
    <div className="desk-apple h-screen w-full saas-workspace-canvas flex overflow-hidden select-none">
      {/* ====================================================================
          LEFT CALM SaaS SIDEBAR (OPTION 1: 6 MAIN CATEGORIES)
          ==================================================================== */}
      <WorkspaceSidebar
        activeCategoryId={activeCategory.id}
        onSelectCategory={(item) => {
          // a sidebar click always opens the page itself: forget one-time jumps
          // (e.g. "Pick a new date" opened a case; that case must not open again on the next visit)
          setCasesInitialOpenCaseCode(null);
          setCasesInitialFlag(null);
          setParentsScheduleCase(null);
          setActiveCategory(item);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onLockTerminal={onLockTerminal}
        staffEmail={staffEmail}
        openCasesCount={cases.filter((c) => c.status !== 'Resolved').length}
        // Parents badge = everything to do there: conferences still to hold today + cases that need a new date + parents to call
        todayAppointmentsCount={
          todayAppointments.filter((a) => a.status === 'Scheduled').length +
          cases.filter((c) => c.status === 'Pending Reschedule').length +
          pendingTaskCount
        }
        pendingConcernsCount={badgeCounts.pendingConcerns}
        referralsWaitingCount={referralsWaiting}
      />

      {/* ====================================================================
          RIGHT MAIN SaaS WORKSPACE
          - Strictly top-aligned (justify-start) + stable scrollbar gutter
          - Guarantees 0px vertical/horizontal shift when switching tabs!
          ==================================================================== */}
      <div className="flex-1 min-w-0 h-screen flex flex-col justify-start overflow-hidden">
        {/* ==================================================================
            CDM-STYLE ENTERPRISE APP TOPBAR (1:1 ARCHITECTURE)
            Left: Subtle Breadcrumbs + Clean View Title
            Right: Staff User Badge with Initials + Staff Role + Sign out link
            ================================================================== */}
        <header className="shrink-0 h-16 px-6 lg:px-8 bg-white dark:bg-[#1C1C1E] border-b border-[#E5E5EA] dark:border-[#38383A] flex items-center justify-between gap-4 z-30">
          {/* Left Zone: Clean Heading */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-[#EDF4FC] truncate">
              {isTl ? activeCategory.labelTl : activeCategory.labelEn}
            </h1>
          </div>

          {/* Right Zone: CDM User Profile Badge + Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Search */}
            {searchHere && (
              <div className="relative hidden md:block w-64">
                <svg
                  className="w-3.5 h-3.5 text-[#6E6E73] dark:text-[#A1A1A6] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder={isTl ? 'Hanapin ang estudyante…' : 'Search student or ID…'}
                  className="w-full pl-8 pr-7 py-1.5 rounded-[10px] bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A] text-xs font-medium text-[#1D1D1F] dark:text-[#EDF4FC] placeholder-[#52637A] dark:placeholder-[#94A8C4] focus:outline-none focus:border-[#007AFF] dark:focus:border-[#38BDF8]"
                />
                {quickSearch && (
                  <button
                    type="button"
                    onClick={() => setQuickSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6E6E73] hover:text-[#1D1D1F]"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Font size lives in the sidebar only (one control, not two) */}

            {/* Sign Out link */}
            <button
              type="button"
              onClick={() => {
                soundFX.playBackspace();
                onLockTerminal();
              }}
              title={isTl ? 'Mag-sign out' : 'Sign out'}
              className="text-xs font-semibold text-[#6E6E73] hover:text-rose-600 dark:text-[#A1A1A6] dark:hover:text-rose-400 pl-1 transition-colors"
            >
              {isTl ? 'Mag-sign out' : 'Sign out'}
            </button>
          </div>
        </header>

        {/* Scrollable Content Container with Stable Gutter & Top Alignment */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden clean-scroll [scrollbar-gutter:stable] flex flex-col justify-start bg-[#F5F5F7] dark:bg-transparent">

        {/* ==================================================================
            CENTERED MINI CONFIRMATION CARD (ANIMATED CHECK + CHECK SFX)
            ================================================================== */}
        <AnimatePresence>
          {toastBanner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => toastPhase === 'done' && setToastBanner(null)}
              className="fixed inset-0 !m-0 z-[100] bg-[#06122B]/35 backdrop-blur-[3px] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.86, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 8 }}
                transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl saas-card p-6 text-center shadow-2xl border border-[#E5E5EA] dark:border-[#243B6B] space-y-4"
              >
                {toastPhase === 'saving' ? (
                  <div role="status" aria-live="polite" className="space-y-3" data-saving>
                    <ScanningScene className="w-full h-40" title={isTl ? 'Sine-save' : 'Saving'} />
                    <p className="text-base font-extrabold text-[#1D1D1F] dark:text-white">{isTl ? 'Sine-save…' : 'Saving…'}</p>
                    <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/10 overflow-hidden">
                      <div className="h-full w-full rounded-full bg-gradient-to-r from-[#007AFF] to-[#4E92DF] origin-left toast-saving-bar" />
                    </div>
                  </div>
                ) : (<>
                {/* Animated Icon Badge (Red for Failures, Amber for Warnings, Emerald for Success) */}
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  {(() => {
                    const isError =
                      toastBanner.message.toLowerCase().includes('not saved') ||
                      toastBanner.message.toLowerCase().includes('hindi na-save') ||
                      toastBanner.message.toLowerCase().includes('failed') ||
                      toastBanner.message.toLowerCase().includes('error');
                    const isWarn = !isError && (toastBanner.message.trim().startsWith('⚠️') || toastBanner.message.trim().startsWith('⚠'));

                    return (
                      <>
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0.8 }}
                          animate={{ scale: 1.35, opacity: 0 }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                          className={`absolute inset-0 rounded-full ${
                            isError
                              ? 'bg-rose-500/30'
                              : isWarn
                              ? 'bg-amber-400/40'
                              : 'bg-emerald-400/40'
                          }`}
                        />
                        <motion.div
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                          className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                            isError
                              ? 'bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/30 text-white'
                              : isWarn
                              ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30 text-white'
                              : 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30 text-white'
                          }`}
                        >
                          {isError ? (
                            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          ) : isWarn ? (
                            <span className="text-2xl font-black text-white">!</span>
                          ) : (
                            <svg
                              className="w-8 h-8 text-white"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <motion.path
                                d="M20 6L9 17l-5-5"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
                              />
                            </svg>
                          )}
                        </motion.div>
                      </>
                    );
                  })()}
                </div>

                {/* Confirmation Heading & Message */}
                <div className="space-y-1.5">
                  <h4 className="text-base font-extrabold text-[#1D1D1F] dark:text-white">
                    {(() => {
                      const msg = toastBanner.message.toLowerCase();
                      if (msg.includes('not saved') || msg.includes('hindi na-save') || msg.includes('failed') || msg.includes('error')) {
                        return isTl ? 'Hindi Na-save ang Aksyon' : 'Save Failed';
                      }
                      if (toastBanner.message.trim().startsWith('⚠️') || toastBanner.message.trim().startsWith('⚠')) {
                        return isTl ? 'Paalala sa System' : 'Attention Required';
                      }
                      return isTl ? 'Na-save' : 'Saved';
                    })()}
                  </h4>
                  <p className="text-xs sm:text-[13px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6] leading-relaxed">
                    {/* heading already says "Saved", so drop a leading "Saved:" / "Naitala:" from the text */}
                    {toastBanner.message.replace(/^(?:✓|✨|📥|⚠️|⚠)\s*/u, '').replace(/^\s*(?:saved|na-save|naitala)\s*:\s*/i, '').replace(/^./, (c) => c.toUpperCase())}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-2.5 pt-1">
                  {toastBanner.undoAction && (
                    <button
                      type="button"
                      onClick={() => {
                        toastBanner.undoAction?.();
                        setToastBanner(null);
                      }}
                      className="btn-press px-4 py-2 rounded-xl saas-card-subtle text-xs font-extrabold text-[#007AFF] dark:text-[#409CFF]"
                    >
                      {isTl ? 'I-undo' : 'Undo'}
                    </button>
                  )}
                  {toastBanner.nextAction ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setToastBanner(null)}
                        className="btn-press px-4 py-2 rounded-xl saas-card-subtle text-xs font-bold text-[#6E6E73] dark:text-[#A1A1A6]"
                      >
                        {isTl ? 'Mamaya na' : 'Later'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = toastBanner.nextAction;
                          setToastBanner(null);
                          next?.run();
                        }}
                        className="btn-press px-5 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-extrabold shadow-sm"
                      >
                        {toastBanner.nextAction.label} →
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setToastBanner(null)}
                      className={`btn-press px-6 py-2 rounded-xl text-white text-xs font-extrabold shadow-sm ${
                        toastBanner.message.toLowerCase().includes('not saved') || toastBanner.message.toLowerCase().includes('hindi na-save')
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {isTl ? 'OK, Nakuha Ko' : 'OK, Got It'}
                    </button>
                  )}
                </div>
                {toastBanner.nextAction?.hint && (
                  <p className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
                    {toastBanner.nextAction.hint}
                  </p>
                )}
                </>)}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {idleWarnSecs !== null && (
          <div role="alert" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[90] !m-0 px-5 py-3 rounded-2xl bg-[#0B1F4D] text-white shadow-2xl flex items-center gap-4" data-idle-warning>
            <p className="text-sm font-semibold">
              {isTl ? `Magla-lock ang app sa loob ng ${idleWarnSecs} segundo dahil walang galaw.` : `The app will lock in ${idleWarnSecs} seconds because nothing was done.`}
            </p>
            <button type="button" onClick={() => setIdleWarnSecs(null)} className="btn-press px-4 py-2 rounded-xl bg-white text-[#1D1D1F] text-xs font-bold whitespace-nowrap">
              {isTl ? 'Manatiling naka-sign in' : 'Stay signed in'}
            </button>
          </div>
        )}

        {/* ==================================================================
            MAIN MODULE ROUTER (OPTION 1 NAVIGATION: 6 MAIN MODULES)
            - Module 1 ('dashboard'): Stage 2 Executive Dashboard
            - Module 2 ('cases-hub'): Stage 3 Cases, Students & Masterlist Hub
            - Modules 3–6: Stage 5–8 Roadmap Preview
            ================================================================== */}
        {activeCategory.id === 'cases-hub' ? (
          <Stage3CasesHub
            key={casesOpenKey}
            initialSubTab={casesInitialTab}
            initialCaseFlag={casesInitialFlag}
            initialOpenCaseCode={casesInitialOpenCaseCode}
            prefill={casesPrefill}
            onPrefillSaved={(codes) => {
              const p = casesPrefill;
              setCasesPrefill(null);
              if (!p || !codes.length) return;
              void updateConcern(p.concernId, { linked_case_code: codes[0] }, 'linkConcernCase').then((ok) => {
                if (!ok) triggerToast(isTl ? `⚠️ Nagawa ang kaso, pero hindi na-link sa report ${p.concernCode}. I-link ito sa Concerns.` : `⚠️ The case was saved, but not linked to report ${p.concernCode}. Link it in Concerns.`);
              });
            }}
            students={students}
            setStudents={setStudents}
            cases={cases}
            setCases={setCases}
            quickSearch={quickSearch}
            onTriggerToast={triggerToast}
            onOpenParentComposer={openComposerForParent}
            appointments={appointments}
            setAppointments={setAppointments}
            onScheduleConference={(caseCode) => openParents('schedule', caseCode)}
          />
        ) : activeCategory.id === 'parents-hub' ? (
          <ParentsHub
            key={parentsKey}
            appointments={activeAppointments}
            setAppointments={setAppointments}
            followUps={activeFollowUpsList}
            setFollowUps={setFollowUpTasks}
            students={students}
            setStudents={setStudents}
            cases={cases}
            smsReady={smsReady}
            onTriggerToast={triggerToast}
            initialScheduleCase={parentsScheduleCase}
            initialTab={parentsTab}
            onConferenceAttended={markParentNotified}
            onConferenceMissed={markParentNoShow}
            onOpenCaseDueProcess={(caseCode) => {
              const found = cases.find((c) => c.caseCode.toLowerCase() === caseCode.toLowerCase());
              if (found) {
                setQuickSearch('');
                // Pass directCaseCode so Stage3CasesHub directly opens the modal
                openCasesTab('case-board', null, null, found.caseCode);
              } else {
                openParents('schedule', caseCode);
              }
            }}
          />
        ) : activeCategory.id === 'support-hub' ? (
          <ConcernsHub
            students={students}
            cases={cases}
            onTriggerToast={triggerToast}
            onChanged={refreshBadges}
            onCreateCase={(p) => openCasesTab('add-report', null, p)}
            onOpenCase={(code) => {
              // Direct Case Opener: Check if the case actually exists in memory
              const found = cases.find((c) => c.caseCode.toLowerCase() === code.toLowerCase());
              if (found) {
                setQuickSearch('');
                openCasesTab('case-board');
                // Open the found case drawer directly
                setTimeout(() => {
                  const cardEl = document.querySelector(`[data-case-card="${found.caseCode}"]`) as HTMLElement;
                  if (cardEl) cardEl.click();
                }, 150);
              } else {
                // If the case doesn't exist yet, prompt to create it directly with prefill
                triggerToast(
                  isTl
                    ? `Walang nahanap na case file para sa ${code}. Gusto mo bang gawan ito ng pormal na kaso?`
                    : `No active case file found for ${code}. Would you like to create it now?`,
                  undefined,
                  {
                    label: isTl ? 'Gumawa ng Kaso' : 'Create Case Now',
                    run: () => openCasesTab('add-report'),
                  }
                );
              }
            }}
          />
        ) : activeCategory.id === 'referrals-hub' ? (
          <ReferralQueue
            students={students}
            cases={cases}
            appointments={appointments}
            onTriggerToast={triggerToast}
            onRowsChanged={setReferralRows}
            onOpenCase={(code) => {
              // Direct Case Opener: Check if the case actually exists in memory
              const found = cases.find((c) => c.caseCode.toLowerCase() === code.toLowerCase());
              if (found) {
                setQuickSearch('');
                openCasesTab('case-board');
                // Open the found case drawer directly
                setTimeout(() => {
                  const cardEl = document.querySelector(`[data-case-card="${found.caseCode}"]`) as HTMLElement;
                  if (cardEl) cardEl.click();
                }, 150);
              } else {
                // If the case doesn't exist yet, prompt to create it directly with prefill
                triggerToast(
                  isTl
                    ? `Walang nahanap na case file para sa ${code}. Gusto mo bang gawan ito ng pormal na kaso?`
                    : `No active case file found for ${code}. Would you like to create it now?`,
                  undefined,
                  {
                    label: isTl ? 'Gumawa ng Kaso' : 'Create Case Now',
                    run: () => openCasesTab('add-report'),
                  }
                );
              }
            }}
          />
        ) : activeCategory.id === 'records-hub' ? (
          <ReportsHub
            cases={cases}
            appointments={appointments}
            followUps={followUpTasks}
            staffEmail={staffEmail}
            onTriggerToast={triggerToast}
            onOpenCase={(code) => {
              // Direct Case Opener: Check if the case actually exists in memory
              const found = cases.find((c) => c.caseCode.toLowerCase() === code.toLowerCase());
              if (found) {
                setQuickSearch('');
                openCasesTab('case-board');
                // Open the found case drawer directly
                setTimeout(() => {
                  const cardEl = document.querySelector(`[data-case-card="${found.caseCode}"]`) as HTMLElement;
                  if (cardEl) cardEl.click();
                }, 150);
              } else {
                // If the case doesn't exist yet, prompt to create it directly with prefill
                triggerToast(
                  isTl
                    ? `Walang nahanap na case file para sa ${code}. Gusto mo bang gawan ito ng pormal na kaso?`
                    : `No active case file found for ${code}. Would you like to create it now?`,
                  undefined,
                  {
                    label: isTl ? 'Gumawa ng Kaso' : 'Create Case Now',
                    run: () => openCasesTab('add-report'),
                  }
                );
              }
            }}
          />
        ) : activeCategory.id === 'settings-hub' ? (
          <SettingsPage key={settingsKey} onTriggerToast={triggerToast} />
        ) : activeCategory.id === 'audit-hub' ? (
          <AuditTrail />
        ) : activeCategory.id !== 'dashboard' ? (
          <main className="p-6 lg:p-10 max-w-3xl mx-auto w-full my-auto">
            <div className="p-8 rounded-2xl saas-card space-y-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#409CFF] flex items-center justify-center mx-auto">
                <DuotoneIcon name={activeCategory.icon} size={24} />
              </div>
              <div className="space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#EAF3FF] dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#409CFF]">
                  {isTl ? 'Paparating pa' : 'Coming soon'}
                </span>
                <h2 className="text-2xl font-extrabold text-[#1D1D1F] dark:text-white">
                  {isTl ? activeCategory.labelTl : activeCategory.labelEn}
                </h2>
                <p className="text-sm text-[#6E6E73] dark:text-[#A1A1A6] max-w-lg mx-auto">
                  {isTl
                    ? 'Ginagawa pa ang page na ito. Sa ngayon, magagamit mo ang Dashboard at ang Mga Kaso.'
                    : 'This page is still being built. For now you can use the Dashboard and Cases.'}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playStepUnlock();
                    setActiveCategory(MAIN_SIDEBAR_CATEGORIES[0]);
                  }}
                  className="btn-press px-5 py-2.5 rounded-xl saas-card-subtle text-xs font-bold"
                >
                  {isTl ? '← Bumalik sa Dashboard' : '← Back to Dashboard'}
                </button>
                <button
                  type="button"
                  onClick={() => openCasesTab('add-report')}
                  className="btn-press px-5 py-2.5 rounded-xl bg-[#007AFF] text-white text-xs font-bold"
                >
                  {isTl ? '＋ Bagong Kaso' : '＋ New Case'}
                </button>
              </div>
            </div>
          </main>
        ) : (
          /* ==================================================================
             MAIN CALM SaaS DASHBOARD WORKSPACE
             - shrink-0 on Top Cards & Tab Bar + min-h-[430px] on Tab Panel
             - Ensures 0px vertical/horizontal jump when switching tabs!
             ================================================================== */
          <main className="p-5 lg:p-6 max-w-[1440px] w-full mx-auto space-y-4 flex-1">
            {/* ================================================================
                1. COMPACT PRIORITY BANNER (LOCKED HEIGHT — NEVER JUMPS)
                ================================================================ */}
            {/* Needs attention first (Golden Rule 4) — every alert opens the list behind it (Rule 5) */}
            {(alerts.overdue.length > 0 || alerts.waiting.length > 0) && (
              <section aria-label={isTl ? 'Kailangang aksyunan' : 'Needs attention'} className="shrink-0 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 px-4 py-3 space-y-2" data-alerts>
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">{isTl ? 'Kailangang aksyunan' : 'Needs attention'}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {alerts.overdue.length > 0 && (
                    <button type="button" data-alert="overdue" onClick={() => openCasesTab('case-board', 'overdue')} className="btn-press text-left rounded-lg bg-white dark:bg-[#1C1C1E] border border-rose-200 dark:border-rose-900/60 px-3 py-2 hover:border-rose-400">
                      <span className="block text-sm font-bold text-[#1D1D1F] dark:text-white">
                        {isTl ? `${alerts.overdue.length} overdue na kaso` : `${alerts.overdue.length} overdue case${alerts.overdue.length === 1 ? '' : 's'}`}
                      </span>
                      <span className="block text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                        {isTl ? `Bukas nang higit ${appConfig.caseRules.overdueDays} araw · Tingnan` : `Open more than ${appConfig.caseRules.overdueDays} day${appConfig.caseRules.overdueDays === 1 ? '' : 's'} · Show`}
                      </span>
                    </button>
                  )}
                  {alerts.waiting.length > 0 && (
                    <button type="button" data-alert="waiting" onClick={() => openCasesTab('case-board', 'waiting')} className="btn-press text-left rounded-lg bg-white dark:bg-[#1C1C1E] border border-rose-200 dark:border-rose-900/60 px-3 py-2 hover:border-rose-400">
                      <span className="block text-sm font-bold text-[#1D1D1F] dark:text-white">
                        {isTl ? `${alerts.waiting.length} sanction na naghihintay` : `${alerts.waiting.length} sanction${alerts.waiting.length === 1 ? '' : 's'} waiting`}
                      </span>
                      <span className="block text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                        {isTl ? `Hindi pa alam ng magulang nang higit ${appConfig.caseRules.pendingSanctionDays} araw · Tingnan` : `Parent not notified for over ${appConfig.caseRules.pendingSanctionDays} day${appConfig.caseRules.pendingSanctionDays === 1 ? '' : 's'} · Show`}
                      </span>
                    </button>
                  )}
                </div>
              </section>
            )}
            {/* 2026 bento: hero (greeting + today ring + New Case) and 4 live widgets */}
            <DashboardBento
              isTl={isTl}
              cases={cases.filter((c) => !/^withdrawn/i.test(c.decision ?? ""))}
              studentCount={students.length}
              confToday={todayAppointments.filter((a) => a.status === 'Scheduled').length}
              confDoneToday={todayAppointments.filter((a) => a.status === 'Attended').length}
              callsPending={pendingTaskCount}
              callsDone={doneTaskCount}
              overdue={alerts.overdue.length}
              waiting={alerts.waiting.length}
              sanctionsEnding={cases.filter((c) => sanctionEndingSoon(c)).length}
              onSanctionsEnding={() => openCasesTab('case-board', 'ending')}
              onOverdue={() => openCasesTab('case-board', 'overdue')}
              onWaiting={() => openCasesTab('case-board', 'waiting')}
              offensesThisMonth={offensesThisMonth}
              attendance={attendanceStats}
              onNewCase={() => openCasesTab('add-report')}
              onStudents={() => openCasesTab('students')}
              onOpenCases={() => openCasesTab('case-board')}
              onStats={() => {
                soundFX.playToggleSwitch(true);
                setActiveTab('analytics');
              }}
              onConferences={() => goToQueue('dash-conferences')}
              onCalls={() => goToQueue('dash-followups')}
              nextUp={(() => {
                const n = todayAppointments.filter((a) => a.status === 'Scheduled').sort(byDateTime)[0];
                return n ? { time: n.timeSlot, text: isTl ? `Conference · ${n.studentName}` : `Parent conference · ${n.studentName}` } : null;
              })()}
            />

            {/* ================================================================
                3. LOCKED-POSITION SaaS WORKSPACE TABS (h-[52px] shrink-0)
                ================================================================ */}
            <div className="shrink-0 h-[52px] flex items-center justify-between gap-4">
              <div className="inline-flex p-0.5 rounded-[10px] bg-[#E8E8ED] dark:bg-white/[0.08] gap-0.5">
                {(
                  [
                    {
                      id: 'queue',
                      labelEn: `Today · ${todoCount} to do`,
                      labelTl: `Ngayong araw · ${todoCount} gagawin`,
                    },
                    {
                      id: 'analytics',
                      labelEn: 'Statistics',
                      labelTl: 'Statistics',
                    },
                    {
                      id: 'watchlist',
                      labelEn: 'Early Intervention',
                      labelTl: 'Early Intervention',
                    },
                  ] as const
                ).map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        soundFX.playToggleSwitch(true);
                        setActiveTab(tab.id);
                      }}
                      className={`px-4 py-1.5 rounded-[8px] text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150 ${
                        isActive
                          ? 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgb(0_0_0/0.12)]'
                          : 'text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      {isTl ? tab.labelTl : tab.labelEn}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* ================================================================
                STABLE MIN-HEIGHT TAB CONTENT CONTAINER (min-h-[420px])
                ================================================================ */}
            <div className="min-h-[420px]">

            {/* ================================================================
                TAB 1: TODAY'S ACTION QUEUE (APPOINTMENTS + FOLLOW-UP CALLS)
                ================================================================ */}
            {activeTab === 'queue' && (
              <button
                type="button"
                data-reports-tile
                onClick={() => helpGo('concerns')}
                title={isTl ? 'Buksan ang Concerns' : 'Open Concerns'}
                className="w-full mb-5 panel-2026 px-5 py-3 flex items-center gap-4 text-left hover:ring-2 hover:ring-[#007AFF]/30 transition-shadow"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {isTl ? 'Mga report ng estudyante' : 'Student reports'} ·{' '}
                    <span className={badgeCounts.pendingConcerns > 0 ? 'text-[#C2410C] dark:text-[#FDBA74]' : ''}>
                      {badgeCounts.pendingConcerns} {isTl ? 'naghihintay ng review' : 'waiting for review'}
                    </span>
                  </p>
                  <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                    {isTl ? `${reports7.reduce((s, n) => s + n, 0)} naipadala sa nakaraang 7 araw (website + app)` : `${reports7.reduce((s, n) => s + n, 0)} sent in the last 7 days (website + app)`}
                  </p>
                </div>
                <div className="w-40 shrink-0">
                  <Sparkline values={reports7.length ? reports7 : [0, 0]} color={theme === 'dark' ? '#0A84FF' : '#007AFF'} ariaLabel={isTl ? 'Report bawat araw, 7 araw' : 'Reports per day, last 7 days'} />
                </div>
                <span className="text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF] shrink-0">{isTl ? 'Buksan ›' : 'Open ›'}</span>
              </button>
            )}
            {activeTab === 'queue' && (
              <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
                {/* LEFT 7 COLS: Today's Parent Appointments */}
                <div id="dash-conferences" className="xl:col-span-7 panel-2026 overflow-hidden scroll-mt-4 flex flex-col">
                  <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0 h-[112px] flex flex-col items-start justify-center gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {isTl ? 'Conference ngayon' : 'Conferences today'}
                        </h2>
                      </div>
                    </div>

                    <div className="inline-flex p-0.5 rounded-[10px] bg-[#E8E8ED] dark:bg-white/[0.08] gap-0.5">
                      {(
                        [
                          { key: 'ALL', label: isTl ? 'Lahat' : 'All' },
                          { key: 'Scheduled', label: isTl ? 'Scheduled' : 'Scheduled' },
                          { key: 'Attended', label: isTl ? 'Dumalo' : 'Attended' },
                          { key: 'Did Not Attend', label: isTl ? 'Hindi dumalo' : 'Did not attend' },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setAptFilter(f.key)}
                          className={`px-3 py-1 rounded-[8px] text-xs font-medium transition-[background-color,color] duration-150 ${
                            aptFilter === f.key
                              ? 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgb(0_0_0/0.12)]'
                              : 'text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 space-y-3 flex-1 h-[400px] overflow-y-auto clean-scroll">
                    {visibleAppointments.length === 0 && attendedHiddenCount === 0 && (
                      <div className="py-10 px-4 text-center space-y-1.5"><Calendar className="w-7 h-7 mx-auto mb-2 text-[#C7C7CC] dark:text-[#636366]" aria-hidden />
                        <p className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {isTl ? 'Walang conference ngayon' : 'No conferences today'}
                        </p>
                        <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">
                          {isTl
                            ? 'Kapag nag-schedule ka ng magulang sa isang kaso, lalabas ito dito.'
                            : 'When you schedule a parent in a case, it shows up here.'}
                        </p>
                      </div>
                    )}
                    {visibleAppointments.map((apt) => {
                      const isAttended = apt.status === 'Attended';
                      const isNoShow = apt.status === 'Did Not Attend';

                      return (
                        <div
                          key={apt.id}
                          className={`px-5 py-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-[transform,border-color] duration-150 ${
                            isAttended
                              ? 'border-l-[3px] border-l-emerald-500 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : isNoShow
                              ? 'border-l-[3px] border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/25 border-rose-200 dark:border-rose-800/70'
                              : apt.severityTone === 'rose'
                              ? 'border-l-[3px] border-l-rose-500 border-[#D1D1D6] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] hover:border-[#007AFF]'
                              : apt.severityTone === 'amber'
                              ? 'border-l-[3px] border-l-amber-500 border-[#D1D1D6] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] hover:border-[#007AFF]'
                              : 'border-l-[3px] border-l-[#007AFF] border-[#D1D1D6] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] hover:border-[#007AFF]'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                                isAttended
                                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                                  : isNoShow
                                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200'
                                  : 'bg-[#EAF3FF] dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#409CFF]'
                              }`}
                            >
                              {apt.initials}
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-[#1D1D1F] dark:text-white">
                                  {apt.studentName}
                                </span>
                                <span className="text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
                                  · {apt.gradeSection}
                                </span>
                                {isAttended && (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    {isTl ? 'Dumalo' : 'Attended'}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                                {apt.parentName} ({apt.relationship}) ·{' '}
                                <span className="font-semibold text-[#1D1D1F] dark:text-white">
                                  {apt.timeSlot}
                                </span>
                              </p>
                            </div>
                          </div>

                          {isNoShow ? (
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <span
                                title={apt.noShowReason || undefined}
                                className="px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-semibold whitespace-nowrap"
                              >
                                {isTl ? 'Hindi dumalo' : 'Did not attend'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const found = cases.find((c) => c.caseCode.toLowerCase() === (apt.caseId || '').toLowerCase());
                                  if (found) {
                                    setQuickSearch('');
                                    openCasesTab('case-board', null, null, found.caseCode);
                                  } else {
                                    openParents('schedule', apt.caseId || undefined);
                                  }
                                }}
                                className="btn-press px-3.5 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold whitespace-nowrap"
                              >
                                {isTl ? 'Pumili ng bagong araw' : 'Pick a new date'}
                              </button>
                              <button
                                type="button"
                                title={isTl ? 'Ibalik sa Naka-schedule' : 'Undo — set back to Scheduled'}
                                onClick={async () => {
                                  const ok = await confirmChange({
                                    title: isTl ? 'I-undo ang "Hindi dumalo"?' : 'Undo "Did not attend"?',
                                    description: `${apt.parentName} · ${apt.studentName}`,
                                    rows: [{ label: 'Status', before: isTl ? 'Hindi dumalo' : 'Did not attend', after: isTl ? 'Naka-schedule' : 'Scheduled' }],
                                    confirmLabel: isTl ? 'Oo, i-undo' : 'Yes, undo',
                                  });
                                  if (!ok) return;
                                  setAppointments((prev) => prev.map((item) => (item.id === apt.id ? { ...item, status: 'Scheduled', noShowReason: undefined } : item)));
                                  void updateAppointmentStatusInDb(apt.id, 'Scheduled');
                                }}
                                className="btn-press px-3 py-1.5 rounded-lg text-xs font-semibold saas-card-subtle text-[#6E6E73] dark:text-[#A1A1A6]"
                              >
                                {isTl ? 'I-undo' : 'Undo'}
                              </button>
                            </div>
                          ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            {!isAttended && (
                              <button
                                type="button"
                                onClick={() => handleMarkAttended(apt)}
                                className="btn-press px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              >
                                {isTl ? 'Dumalo' : 'Attended'}
                              </button>
                            )}

                            {isAttended ? (
                              <button
                                type="button"
                                title={isTl ? 'Ibalik sa Scheduled' : 'Undo — set back to Scheduled'}
                                onClick={async () => {
                                  const ok = await confirmChange({
                                    title: isTl ? 'I-undo ang Attended?' : 'Undo Attended?',
                                    description: `${apt.parentName} · ${apt.studentName} (${apt.gradeSection})`,
                                    rows: [
                                      { label: 'Status', before: 'Attended', after: 'Scheduled' },
                                      {
                                        label: isTl ? 'Pagdalo (KPI)' : 'Attendance (KPI)',
                                        before: previewAttendance(0),
                                        after: previewAttendance(-1),
                                      },
                                    ],
                                    confirmLabel: isTl ? 'Oo, i-undo' : 'Yes, undo',
                                    tone: 'danger',
                                  });
                                  if (!ok) return;
                                  soundFX.playBackspace();
                                  setAppointments((prev) =>
                                    prev.map((item) =>
                                      item.id === apt.id ? { ...item, status: 'Scheduled' } : item
                                    )
                                  );
                                  void updateAppointmentStatusInDb(apt.id, 'Scheduled');
                                }}
                                className="btn-press px-3 py-1.5 rounded-lg text-xs font-semibold saas-card-subtle text-[#6E6E73] dark:text-[#A1A1A6]"
                              >
                                {isTl ? 'I-undo' : 'Undo'}
                              </button>
                            ) : (
                            <button
                              type="button"
                              disabled={isNoShow}
                              onClick={() => {
                                soundFX.playKeyClick(2);
                                setNoShowTarget(apt);
                              }}
                              className="btn-press px-3 py-1.5 rounded-lg text-xs font-semibold saas-card-subtle hover:border-rose-500 text-[#6E6E73] dark:text-[#A1A1A6] hover:text-rose-600"
                            >
                              {isTl ? 'Hindi dumalo' : 'Did not attend'}
                            </button>
                            )}

                            <button
                              type="button"
                              title={isTl ? `I-text si ${apt.parentName}` : `Text ${apt.parentName}`}
                              onClick={() =>
                                openComposerForParent({
                                  studentName: apt.studentName,
                                  gradeSection: apt.gradeSection,
                                  parentName: apt.parentName,
                                  parentPhone: apt.parentPhone,
                                  parentEmail: apt.parentEmail,
                                  scheduleText: `ngayong araw, ${apt.timeSlot.split('–')[0].trim().replace(/^0/, '')}`,
                                  caseCode: apt.caseId || undefined,
                                })
                              }
                              className="btn-press px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap saas-card-subtle hover:border-[#007AFF] text-[#007AFF] dark:text-[#409CFF]"
                            >
                              {isTl ? 'I-text' : 'Text'}
                            </button>
                          </div>
                          )}
                        </div>
                      );
                    })}
                    {attendedHiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAttended(true)}
                        className="btn-press w-full px-5 py-3 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-left text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        {attendedHiddenCount} {isTl ? 'ang dumalo na' : (attendedHiddenCount === 1 ? 'parent already attended' : 'parents already attended')}
                        <span className="ml-2 font-medium text-emerald-700/80 dark:text-emerald-400/80">{isTl ? '· ipakita' : '· show'}</span>
                      </button>
                    )}
                    {showAttended && aptFilter === 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setShowAttended(false)}
                        className="w-full py-2 text-center text-xs font-bold text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white"
                      >
                        {isTl ? 'Itago ang mga dumalo na' : 'Hide attended'}
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT 5 COLS: Follow-Up Tasks Due */}
                <div id="dash-followups" className="xl:col-span-5 panel-2026 overflow-hidden scroll-mt-4 flex flex-col">
                  <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0 h-[112px] flex flex-col items-start justify-center gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {isTl ? 'Tatawagang magulang' : 'Parents to call'}
                        </h2>
                      </div>
                    </div>

                    <div className="w-full flex flex-wrap items-center gap-2">
                      <div
                        role="tablist"
                        aria-label={isTl ? 'Ipakita ang task' : 'Show tasks'}
                        className="flex items-center p-0.5 rounded-lg bg-[#EEF3F9] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A]"
                      >
                        {[
                          { done: false, label: isTl ? 'Kailangan pa' : 'Pending', n: pendingTaskCount },
                          { done: true, label: isTl ? 'Tapos na' : 'Done', n: doneTaskCount },
                        ].map((o) => (
                          <button
                            key={o.label}
                            type="button"
                            role="tab"
                            aria-selected={showDoneTasks === o.done}
                            onClick={() => setShowDoneTasks(o.done)}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors active:scale-[0.97] ${
                              showDoneTasks === o.done
                                ? 'bg-white dark:bg-[#1E3250] text-[#1D1D1F] dark:text-white shadow-sm'
                                : 'text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white'
                            }`}
                          >
                            {o.label} <span className="tabular-nums opacity-70">{o.n}</span>
                          </button>
                        ))}
                      </div>
                      {/* Filter + sort tucked into one "Filter" menu (fewer controls, Apple-style) */}
                      <details className="relative ml-auto">
                        <summary
                          className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                            taskFilter !== 'ALL'
                              ? 'bg-[#007AFF]/10 text-[#007AFF] dark:text-[#409CFF]'
                              : 'text-[#6E6E73] dark:text-[#A1A1A6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
                          {isTl ? 'Filter' : 'Filter'}
                        </summary>
                        <div className="absolute right-0 top-full mt-1.5 z-30 p-3 rounded-2xl ring-card w-max space-y-3">
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Uri' : 'Type'}</p>
                            <div className="flex flex-col">
                              {(
                                [
                                  ['ALL', isTl ? 'Lahat' : 'All'],
                                  ['Missed Conferences', isTl ? 'Hindi dumalo' : 'Did not attend'],
                                  ['Failed SMS', isTl ? 'Hindi naipadala ang SMS' : 'SMS not sent'],
                                  ['Priority Calls', isTl ? 'Unahin' : 'Priority'],
                                ] as const
                              ).map(([v, l]) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setTaskFilter(v as 'ALL' | FollowUpCategory)}
                                  className="flex items-center justify-between gap-6 px-2 py-1.5 rounded-lg text-[13px] text-left text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                                >
                                  {l}
                                  {taskFilter === v && <Check className="w-4 h-4 text-[#007AFF] dark:text-[#409CFF]" aria-hidden />}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Ayos' : 'Sort'}</p>
                            <SortControl id="dash-tasks" value={taskSort} onChange={setTaskSort} isTl={isTl} />
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>

                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] flex-1 h-[400px] overflow-y-auto clean-scroll">
                    {filteredFollowUps.length === 0 && (
                      <div className="py-10 px-6 text-center space-y-2">
                        <p className="text-sm font-bold text-[#1D1D1F] dark:text-[#EDF4FC]">
                          {showDoneTasks
                            ? isTl ? 'Wala pang tapos na follow-up.' : 'No finished follow-ups yet.'
                            : isTl ? 'Lahat ng follow-up ay tapos na.' : 'All follow-ups are done.'}
                        </p>
                        <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                          {isTl
                            ? 'Lalabas dito ang mga magulang na hindi dumalo o kailangang tawagan.'
                            : 'Parents who did not attend or need a call will show up here.'}
                        </p>
                        {!showDoneTasks && doneTaskCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowDoneTasks(true)}
                            className="text-xs font-bold text-[#007AFF] dark:text-[#409CFF] hover:underline"
                          >
                            {isTl ? `Tingnan ang ${doneTaskCount} na tapos na →` : `See ${doneTaskCount} done →`}
                          </button>
                        )}
                      </div>
                    )}
                    {filteredFollowUps.map((task) => {
                      const escalate = !task.resolved && task.attemptsCount >= 3;
                      const tone = task.resolved
                        ? 'emerald'
                        : escalate || task.category === 'Failed SMS'
                        ? 'rose'
                        : task.category === 'Missed Conferences'
                        ? 'amber'
                        : 'cobalt';
                      const rowTone = {
                        emerald: 'border-l-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20',
                        rose: 'border-l-rose-500 bg-rose-50/60 dark:bg-rose-950/20',
                        amber: 'border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/15',
                        cobalt: 'border-l-[#2557BE] bg-[#F1F5FD] dark:bg-[#12203F]',
                      }[tone];
                      const dotTone = {
                        emerald: 'bg-emerald-500',
                        rose: 'bg-rose-500',
                        amber: 'bg-amber-500',
                        cobalt: 'bg-[#2557BE]',
                      }[tone];
                      const attemptsTone = {
                        emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
                        rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
                        amber: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
                        cobalt: 'bg-[#EAF3FF] text-[#007AFF] dark:bg-[#2C2C2E] dark:text-[#AFCBFA]',
                      }[tone];
                      return (
                      <div
                        key={task.id}
                        className={`px-5 py-3 space-y-1.5 border-l-4 transition-colors ${rowTone}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${dotTone}`} />
                              <span className="text-xs font-black text-[#1D1D1F] dark:text-white truncate">
                                {task.studentName}
                              </span>
                              <span className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                                ({task.gradeSection})
                              </span>
                              {task.resolved ? (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9.5px] font-bold">
                                  {isTl ? 'Tapos na' : 'Done'}
                                </span>
                              ) : escalate ? (
                                <span className="px-2 py-0.5 rounded-full bg-[#FF3B30] text-white text-[11px] font-semibold" title={isTl ? 'Hindi sumasagot. Ipatawag ang estudyante at ipasabi sa magulang, tapos piliin ito sa Log call.' : 'No answer many times. Call the student in to tell the parent, then pick that in Log call.'}>
                                  {isTl ? 'Ipatawag ang estudyante' : 'Call the student in'}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[12.5px] font-semibold text-[#FF3B30] mt-0.5 truncate">
                              {plainAttendanceWords(isTl ? task.reasonTl : task.reasonEn)}
                            </p>
                            {(() => {
                              const appt = appointments.find((a) => a.caseId === task.caseId && a.status === 'Scheduled');
                              return appt ? (
                                <p className="text-[12.5px] text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                                  {isTl ? 'Conference: ' : 'Conference: '}<b className="font-semibold">{new Date(appt.date + 'T00:00').toLocaleDateString(isTl ? 'fil-PH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {appt.timeSlot}</b>
                                </p>
                              ) : null;
                            })()}
                          </div>

                          <span
                            title={isTl ? 'Ilang beses nang na-contact' : 'Contact attempts'}
                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold shrink-0 ${attemptsTone}`}
                          >
                            {task.attemptsCount}x
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-0.5 gap-2">
                          <span className="text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] truncate">
                            {task.parentName} · <a href={`tel:${task.parentPhone.replace(/\D/g, '')}`} className="font-mono font-semibold text-[#1D1D1F] dark:text-white hover:underline">{task.parentPhone}</a>
                          </span>

                          {/* Finished follow-ups are read-only: no Log call / Text that would silently reopen them */}
                          {task.resolved ? (
                            <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] shrink-0 truncate max-w-[45%]" title={isTl ? task.lastContactSummaryTl : task.lastContactSummaryEn}>
                              {isTl ? task.lastContactSummaryTl : task.lastContactSummaryEn}
                            </span>
                          ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {task.caseId && (
                              <button
                                type="button"
                                onClick={() => openCasesTab('case-board', null, null, task.caseId)}
                                title={isTl ? `Buksan ang kaso ${task.caseId}` : `Open case ${task.caseId}`}
                                className="btn-press px-3 py-1 rounded-full saas-card-subtle text-[13px] font-semibold text-[#007AFF] dark:text-[#409CFF] whitespace-nowrap"
                              >
                                {isTl ? 'Buksan ang kaso' : 'Open case'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                soundFX.playKeyClick(1);
                                setCallLogTarget(task);
                              }}
                              title={isTl ? 'Tawagan ang magulang, tapos itala dito ang nangyari' : 'Call the parent, then save what happened here'}
                              className="btn-press px-3 py-1 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-[13px] font-semibold whitespace-nowrap"
                            >
                              {isTl ? 'Itala ang tawag' : 'Log call'}
                            </button>
                            {smsReady === true && <button
                              type="button"
                              onClick={() =>
                                openComposerForParent({
                                  studentName: task.studentName,
                                  gradeSection: task.gradeSection,
                                  parentName: task.parentName,
                                  parentPhone: task.parentPhone,
                                  parentEmail: task.parentEmail,
                                  scheduleText: (() => { const a = appointments.find((x) => x.caseId === task.caseId && x.status === 'Scheduled'); return a ? `${a.date} ${a.timeSlot}` : ''; })(),
                                  caseCode: task.caseId || undefined,
                                })
                              }
                              title={isTl ? `I-text si ${task.parentName}` : `Text ${task.parentName}`}
                              className="btn-press px-3 py-1 rounded-full saas-card-subtle text-[13px] font-semibold whitespace-nowrap"
                            >
                              <span>{isTl ? 'I-text' : 'Text'}</span>
                            </button>}
                          </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* ================================================================
                TAB 2: ANALYTICS & OPEN CASES BY SECTION
                ================================================================ */}
            {activeTab === 'analytics' && (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Bar Chart (5 Cols) */}
                <div className="lg:col-span-5 p-6 rounded-2xl saas-card flex flex-col justify-between gap-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-[#1D1D1F] dark:text-white">
                        {isTl ? 'Trend ng Kaso at Naayos' : 'Case Volume & Resolution'}
                      </h3>
                      <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                        {isTl ? 'Naitalang kaso vs. naayos' : 'Logged cases vs. resolved cases'}
                      </p>
                    </div>

                    <div className="inline-flex p-1 rounded-lg saas-card-subtle gap-1">
                      {(['week', 'month', 'semester', 'year'] as TimeframeKey[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setTimeframe(k)}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            timeframe === k
                              ? 'bg-[#007AFF] text-white'
                              : 'text-[#6E6E73] dark:text-[#A1A1A6]'
                          }`}
                        >
                          {
                            (isTl
                              ? { week: 'Linggo', month: 'Buwan', semester: 'Semestre', year: 'Taon' }
                              : { week: 'Week', month: 'Month', semester: 'Semester', year: 'Year' })[k]
                          }
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-44 pt-4 px-2 flex items-end justify-around gap-3 border-b border-[#E5E5EA] dark:border-[#38383A]">
                    {currentAnalytics.points.map((pt, idx) => {
                      const loggedH = pt.logged ? Math.max(8, Math.round((pt.logged / maxTrendValue) * 130)) : 2;
                      const resolvedH = pt.resolved
                        ? Math.max(8, Math.round((pt.resolved / maxTrendValue) * 130))
                        : 2;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full flex items-end justify-center gap-1.5 h-[136px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-mono font-bold text-[#007AFF] dark:text-[#409CFF]">
                                {pt.logged}
                              </span>
                              <div
                                style={{ height: `${loggedH}px` }}
                                className="w-5 rounded-t-md bg-[#007AFF]"
                              />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-mono font-bold text-emerald-600">
                                {pt.resolved}
                              </span>
                              <div
                                style={{ height: `${resolvedH}px` }}
                                className="w-5 rounded-t-md bg-emerald-500"
                              />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#6E6E73] dark:text-[#A1A1A6] pb-1">
                            {isTl ? pt.labelTl : pt.labelEn}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
                    {isTl ? currentAnalytics.takeawayTl : currentAnalytics.takeawayEn}
                  </p>
                </div>

                {/* Donut Breakdown (3 Cols) */}
                <div className="lg:col-span-3 p-6 rounded-2xl saas-card flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-[#1D1D1F] dark:text-white">
                      {isTl ? 'Breakdown Ngayong Araw' : "Today's Conferences"}
                    </h3>
                    <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      {isTl ? 'Pagdalo ng magulang ngayong araw' : 'Parent attendance today'}
                    </p>
                  </div>

                  <div className="flex justify-center py-2">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                        <circle
                          cx="64"
                          cy="64"
                          r={donutRadius}
                          fill="transparent"
                          stroke="rgba(148,163,184,0.2)"
                          strokeWidth="12"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r={donutRadius}
                          fill="transparent"
                          stroke="#34C759"
                          strokeWidth="12"
                          strokeDasharray={`${attendedStroke} ${donutCircumference}`}
                          strokeDashoffset={0}
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r={donutRadius}
                          fill="transparent"
                          stroke="#FF9500"
                          strokeWidth="12"
                          strokeDasharray={`${scheduledStroke} ${donutCircumference}`}
                          strokeDashoffset={-attendedStroke}
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r={donutRadius}
                          fill="transparent"
                          stroke="#EF4444"
                          strokeWidth="12"
                          strokeDasharray={`${noShowStroke} ${donutCircumference}`}
                          strokeDashoffset={-(attendedStroke + scheduledStroke)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-mono font-extrabold text-[#1D1D1F] dark:text-white">
                          {attendanceStats.attended}/{attendanceStats.total}
                        </span>
                        <span className="text-[10px] font-bold text-[#6E6E73] dark:text-[#A1A1A6]">
                          {isTl ? 'DUMALO' : 'ATTENDED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Attended
                      </span>
                      <span className="font-mono font-bold">{attendanceStats.attended}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Scheduled
                      </span>
                      <span className="font-mono font-bold">{attendanceStats.scheduled}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Did Not Attend
                      </span>
                      <span className="font-mono font-bold">{attendanceStats.noShow}</span>
                    </div>
                  </div>
                </div>

                {/* Open cases by section (4 Cols) */}
                <div className="lg:col-span-4 p-6 rounded-2xl saas-card space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-[#1D1D1F] dark:text-white">
                      {isTl ? 'Bukas na kaso bawat section' : 'Open cases by section'}
                    </h3>
                    <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      {isTl
                        ? 'Pinakamaraming bukas na kaso ang nasa itaas'
                        : 'Most open cases first'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {sectionCases.length === 0 && (
                      <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Wala pang estudyante sa masterlist.' : 'No students in the masterlist yet.'}</p>
                    )}
                    {sectionCases.slice(0, 8).map((st) => (
                      <div key={st.sectionCode} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-[#1D1D1F] dark:text-white">
                            {st.sectionCode}{' '}
                            <span className="font-normal text-[#6E6E73] dark:text-[#A1A1A6]">
                              · {st.students} {isTl ? 'estudyante' : st.students === 1 ? 'student' : 'students'}
                            </span>
                          </span>
                          <span className="font-mono font-bold text-[#007AFF] dark:text-[#409CFF]">
                            {st.openCases} {isTl ? 'kaso' : st.openCases === 1 ? 'case' : 'cases'}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#EAF3FF] dark:bg-[#2C2C2E] overflow-hidden">
                          <div
                            style={{ width: `${st.barPercent}%` }}
                            className="h-full rounded-full bg-[#007AFF] dark:bg-[#0A84FF]"
                          />
                        </div>
                      </div>
                    ))}
                    {sectionCases.length > 8 && (
                      <p className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                        {isTl ? `+${sectionCases.length - 8} pang section` : `+${sectionCases.length - 8} more section(s)`}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ================================================================
                TAB 3: EARLY WATCHLIST & OFFICE AUDIT LOG
                ================================================================ */}
            {activeTab === 'watchlist' && (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 p-6 rounded-2xl saas-card space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-[#1D1D1F] dark:text-white">
                      {isTl ? 'Early Intervention' : 'Early Intervention'}
                    </h3>
                    <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      {isTl
                        ? 'Mga estudyanteng magiging serious ang susunod na minor offense · kausapin sila nang maaga'
                        : 'Students whose next minor offense would be serious · talk with them early'}
                    </p>
                  </div>

                  <div className="divide-y divide-[#E5E5EA] dark:divide-[#38383A]">
                    {earlyInterventionList.length === 0 && (
                      <p className="py-4 text-sm font-medium text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Walang estudyante sa listahan ngayon.' : 'No students on the list right now.'}</p>
                    )}
                    {earlyInterventionList.map((item) => (
                      <div
                        key={item.studentNumber}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-sm font-bold text-[#1D1D1F] dark:text-white">
                              {item.fullName}
                            </span>
                            <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                              · {item.gradeSection}
                            </span>
                          </div>
                          <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                            {isTl ? item.priorOffensesTl : item.priorOffensesEn}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openComposerForParent({
                              studentName: item.fullName,
                              gradeSection: item.gradeSection,
                              parentName: item.parentName,
                              parentPhone: item.parentPhone,
                              parentEmail: item.parentEmail,
                              scheduleText: '',
                            })
                          }
                          title={isTl ? 'Hindi isasama ang offense sa mensahe' : 'The message never includes the offense'}
                          className="btn-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#007AFF] text-white text-xs font-semibold shrink-0 whitespace-nowrap"
                        >
                          {isTl ? 'I-text ang magulang' : 'Text parent'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 rounded-2xl saas-card space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-[#1D1D1F] dark:text-white">
                      {isTl ? 'Kamakailang Aktibidad sa Opisina' : 'Recent Guidance Activity'}
                    </h3>
                    <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      {isTl ? 'Mga huling ginawa ng opisina · nasa Settings ang buong tala' : 'What the office did lately · the full log is in Settings'}
                    </p>
                  </div>

                  <div className="divide-y divide-[#E5E5EA] dark:divide-[#38383A]">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="py-3 space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#007AFF] dark:text-[#409CFF]">
                            {log.actor}
                          </span>
                          <span className="text-[#6E6E73] dark:text-[#A1A1A6]">
                            {plainTimeAgo(isTl ? log.timeAgoTl : log.timeAgoEn, isTl)}
                          </span>
                        </div>
                        <p className="text-xs text-[#1D1D1F] dark:text-white">
                          {isTl ? log.actionTl : log.actionEn}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
            </div>
          </main>
        )}

        {/* Calm Footer */}
        <footer className="shrink-0 px-8 py-4 border-t border-[#E5E5EA] dark:border-[#38383A] text-center text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
          Official Guidance System of Asian Institute of Computer Studies · Montalban — Data Privacy
          Act (RA 10173) Compliant
        </footer>
        </div>
      </div>

      {/* ====================================================================
          MODAL 1: QUICK NO-SHOW REASON MODAL
          ==================================================================== */}
      <AnimatePresence>
        {noShowTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 !m-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.form
              onSubmit={handleConfirmNoShow}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md rounded-2xl saas-card p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#1D1D1F] dark:text-white">
                  {isTl ? 'Markahan bilang Hindi dumalo' : 'Mark as Did not attend'}
                </h3>
                <button
                  aria-label={isTl ? 'Isara' : 'Close'}
                  title={isTl ? 'Isara' : 'Close'}
                  type="button"
                  onClick={() => setNoShowTarget(null)}
                  className="text-sm font-bold text-[#6E6E73]"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 rounded-xl saas-card-subtle text-xs space-y-1">
                <p className="font-bold text-[#1D1D1F] dark:text-white">
                  {noShowTarget.parentName} ({noShowTarget.studentName})
                </p>
                <p className="text-[#6E6E73] dark:text-[#A1A1A6]">
                  {isTl
                    ? 'Awtomatikong idaragdag ito sa Follow-Up Tasks Due.'
                    : 'Automatically queues a follow-up task for rescheduling.'}
                </p>
              </div>

              <div className="space-y-2">
                {NO_SHOW_REASONS_DASH.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setNoShowReason(reason)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-colors ${
                      noShowReason === reason
                        ? 'bg-[#007AFF] text-white'
                        : 'saas-card-subtle text-[#1D1D1F] dark:text-white'
                    }`}
                  >
                    {isTl ? NO_SHOW_REASONS_DASH_TL[reason] : reason}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNoShowTarget(null)}
                  className="px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold"
                >
                  {isTl ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold"
                >
                  {isTl ? 'Ituloy' : 'Continue'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          MODAL 2: QUICK CALL ATTEMPT LOGGER MODAL (RICH CONTEXT & EMIL KOWALSKI POLISH)
          ==================================================================== */}
      <AnimatePresence>
        {callLogTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 !m-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.form
              onSubmit={handleSaveCallAttempt}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-lg rounded-2xl saas-card p-6 space-y-4 shadow-2xl border border-slate-300 dark:border-white/10"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="text-base font-extrabold text-[#1D1D1F] dark:text-white leading-tight">
                    {isTl ? 'Itala ang tawag' : 'Log the call'}
                  </h3>
                  <p className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
                    {isTl ? 'Tawagan muna ang magulang, tapos piliin dito ang nangyari.' : 'Call the parent first, then pick what happened.'}
                  </p>
                </div>
                <button
                  aria-label={isTl ? 'Isara' : 'Close'}
                  title={isTl ? 'Isara' : 'Close'}
                  type="button"
                  onClick={() => setCallLogTarget(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-[0.97]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target Parent & Student Context Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-[#1D1D1F] dark:text-white truncate">
                      {callLogTarget.parentName}
                    </div>
                    <div className="text-[11px] text-[#6E6E73] dark:text-slate-400 mt-0.5 truncate">
                      {isTl ? 'Magulang / Guardian ni' : 'Parent / Guardian of'}{' '}
                      <span className="font-semibold text-[#1D1D1F] dark:text-slate-200">{callLogTarget.studentName}</span>
                      {callLogTarget.gradeSection ? ` · ${callLogTarget.gradeSection}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-[#007AFF] dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      {callLogTarget.caseId}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                      {isTl ? `Pagtatangka #${callLogTarget.attemptsCount + 1}` : `Attempt #${callLogTarget.attemptsCount + 1}`}
                    </span>
                  </div>
                </div>

                {/* Phone & Reason Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-white/5">
                  <div className="text-[11px] text-[#6E6E73] dark:text-slate-400">
                    <span>{isTl ? 'Telepono: ' : 'Contact: '}</span>
                    <a
                      href={`tel:${callLogTarget.parentPhone}`}
                      className="font-mono font-bold text-[#007AFF] dark:text-blue-300 hover:underline"
                      title={isTl ? 'Pindutin para tumawag' : 'Click to call'}
                    >
                      {callLogTarget.parentPhone}
                    </a>
                  </div>

                  <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium truncate max-w-[210px]" title={isTl ? callLogTarget.reasonTl : callLogTarget.reasonEn}>
                    <span className="truncate">{isTl ? callLogTarget.reasonTl : callLogTarget.reasonEn}</span>
                  </div>
                </div>
              </div>

              {/* Call Outcome Options */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1D1D1F] dark:text-slate-200 block">
                  {isTl ? 'Ano ang kinalabasan ng tawag?' : 'What happened on this call?'}
                </label>
                <div className="space-y-2">
                  {CALL_OUTCOMES.filter((opt) => opt !== CALL_STUDENT || callLogTarget.attemptsCount >= 2).map((opt) => {
                    const isSelected = callOutcome === opt;
                    const isCome = opt === CALL_WILL_COME;
                    const isResched = opt === CALL_NEW_DATE;
                    const isNoAns = opt === 'No answer';
                    const isWrong = opt === 'Wrong number';
                    const isStudent = opt === CALL_STUDENT;

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCallOutcome(opt)}
                        className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition-all border flex items-center justify-between active:scale-[0.98] ${
                          isSelected
                            ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm'
                            : 'bg-white dark:bg-slate-800/80 text-[#1D1D1F] dark:text-white border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div>
                          <span className="font-bold">{isTl ? CALL_OUTCOMES_TL[opt] : opt}</span>
                          <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-[#6E6E73] dark:text-slate-400'}`}>
                            {isCome && (isTl ? 'Tapos na ang follow-up na ito.' : 'This follow-up is done.')}
                            {isResched && (isTl ? 'Pagkatapos i-save, bubukas agad ang pagpili ng bagong araw.' : 'After saving, picking the new date opens right away.')}
                            {isStudent && (isTl ? 'Hindi sumasagot ang magulang. Tapos na ang follow-up na ito.' : 'The parent never answers. This follow-up is done.')}
                            {isNoAns && (isTl ? 'Mananatili sa listahan para tawagan ulit.' : 'Stays on the list so you can call again.')}
                            {isWrong && (isTl ? 'Pagkatapos i-save, aayusin mo ang number sa kaso.' : 'After saving, you fix the number in the case.')}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-white bg-white text-[#007AFF]' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-[#007AFF]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Custom Notes Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6E6E73] dark:text-slate-300 block">
                  {isTl ? 'Tala (hindi required)' : 'Note (optional)'}
                </label>
                <input
                  type="text"
                  value={callCustomNotes}
                  onChange={(e) => setCallCustomNotes(e.target.value)}
                  placeholder={
                    isTl
                      ? 'Halimbawa: "Humiling ng alas-2 ng hapon bukas", "Nasa trabaho pa"...'
                      : 'e.g. "Requested 2:00 PM tomorrow", "Mother answered at work"...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-semibold text-[#1D1D1F] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setCallLogTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-[#1D1D1F] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-[0.97]"
                >
                  {isTl ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#007AFF] hover:bg-[#163574] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.97]"
                >
                  {isTl ? 'I-save' : 'Save'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          MODAL 3: USER-EDITABLE SMS & LIVE GMAIL COMPOSER (RA 10173 GUARDED)
          ==================================================================== */}
      <AnimatePresence>
        {composerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 !m-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.form
              onSubmit={handleSendParentNotice}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-2xl rounded-2xl saas-card p-6 space-y-4 max-h-[calc(92vh/var(--app-zoom,1))] overflow-y-auto clean-scroll border border-slate-300 dark:border-white/10 shadow-2xl"
            >
              {/* Modal Header with Case Badge */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[#1D1D1F] dark:text-white leading-tight">
                      {isTl ? 'Magpadala ng mensahe sa magulang' : 'Message the parent'}
                    </h3>
                    {composerCaseCode && (
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-[#007AFF] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {composerCaseCode}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
                    {isTl ? 'Pwede mong i-edit bago ipadala. Walang detalye ng offense ang lalabas.' : 'You can edit it before sending. No offense details are ever included.'}
                  </p>
                </div>
                <button
                  aria-label={isTl ? 'Isara' : 'Close'}
                  title={isTl ? 'Isara' : 'Close'}
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-[0.97]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Delivery Channel Selector */}
              <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5">
                {(
                  [
                    { key: 'both', label: isTl ? 'Text + Email' : 'Text + Email' },
                    { key: 'sms', label: 'SMS Only' },
                    { key: 'gmail', label: isTl ? 'Email lang' : 'Email only' },
                  ] as const
                ).map((ch) => {
                  const isSelected = composerChannel === ch.key;
                  return (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={() => setComposerChannel(ch.key)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'bg-[#007AFF] text-white shadow-sm'
                          : 'text-[#6E6E73] dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      {ch.label}
                    </button>
                  );
                })}
              </div>

              {/* Parent, Student & Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-[#1D1D1F] dark:text-slate-200 mb-1">
                    {isTl ? 'Pangalan ng Magulang / Guardian' : 'Parent / Guardian Name'}
                  </label>
                  <input
                    type="text"
                    value={composerParentName}
                    onChange={(e) => setComposerParentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 font-semibold text-[#1D1D1F] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1D1D1F] dark:text-slate-200 mb-1">
                    {isTl ? 'Estudyante at Seksiyon' : 'Student & Section'}
                  </label>
                  <input
                    type="text"
                    value={`${composerStudentName}${composerGradeSection ? ` (${composerGradeSection})` : ''}`}
                    readOnly
                    className="w-full px-3 py-2 rounded-xl border border-slate-300/80 dark:border-white/5 bg-slate-100 dark:bg-slate-800/60 font-semibold text-[#1D1D1F] dark:text-slate-300 cursor-not-allowed opacity-90"
                  />
                </div>
                <div>
                  <label htmlFor="composer-phone" className="block font-bold text-[#1D1D1F] dark:text-slate-200 mb-1">
                    {isTl ? 'Mobile Number (SMS)' : 'Mobile Number (SMS)'}
                    {composerChannel === 'gmail' && <span className="text-[10px] text-slate-400 font-normal ml-1">({isTl ? 'hindi gagamitin' : 'not used'})</span>}
                  </label>
                  <PhoneInput
                    id="composer-phone"
                    value={composerPhone}
                    onChange={setComposerPhone}
                    isTl={isTl}
                    disabled={composerChannel === 'gmail'}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 font-mono font-semibold text-[#1D1D1F] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] ${
                      composerChannel === 'gmail' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1D1D1F] dark:text-slate-200 mb-1">
                    {isTl ? 'Email ng magulang' : 'Parent email'}
                    {composerChannel === 'sms' && <span className="text-[10px] text-slate-400 font-normal ml-1">({isTl ? 'hindi gagamitin' : 'not used'})</span>}
                  </label>
                  <input
                    type="email"
                    value={composerEmail}
                    onChange={(e) => setComposerEmail(e.target.value)}
                    disabled={composerChannel === 'sms'}
                    placeholder={composerChannel === 'sms' ? (isTl ? 'Naka-SMS Only' : 'SMS Only mode') : 'parent@example.com'}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 font-semibold text-[#1D1D1F] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] ${
                      composerChannel === 'sms' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Conference Schedule & Venue Settings */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1D1D1F] dark:text-white">
                    {isTl ? 'Petsa at lugar ng conference' : 'Conference date and place'}
                  </span>
                  <span className="text-[10px] text-[#6E6E73] dark:text-slate-400">
                    {isTl ? 'Kasama ito sa mensahe' : 'This goes into the message'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-[#6E6E73] dark:text-slate-400 block mb-0.5">
                      {isTl ? 'Petsa at Oras (Kailan)' : 'Date & Time (When)'}
                    </label>
                    <input
                      type="text"
                      value={composerSchedule}
                      onChange={(e) => setComposerSchedule(e.target.value)}
                      placeholder={isTl ? 'Hal. Bukas, 10:15 AM' : 'e.g. Tomorrow, 10:15 AM'}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-semibold text-[#1D1D1F] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#6E6E73] dark:text-slate-400 block mb-0.5">
                      {isTl ? 'Lugar / Deskripsyon' : 'Venue / Room'}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        readOnly
                        value="Guidance Office (Main Campus Room 204)"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Template Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1D1D1F] dark:text-slate-200">
                    {isTl ? 'Handang mensahe' : 'Ready messages'}
                  </span>
                  <span className="text-[10px] text-[#6E6E73] dark:text-slate-400">
                    {isTl ? 'Pindutin para gamitin' : 'Click one to use it'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const when = composerSchedule ? ` sa ${composerSchedule}` : '';
                      setComposerMessage(
                        `AICS Guidance Office: Magandang araw po. Inaanyayahan po kayo sa Parent Conference para kay ${composerStudentName}${when} sa Guidance Office. Salamat po.`
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 hover:border-[#007AFF] text-[#1D1D1F] dark:text-white text-[11px] font-bold transition-all active:scale-[0.97]"
                  >
                    {isTl ? 'Unang Paanyaya' : 'First Notice'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const when = composerSchedule ? ` bukas ${composerSchedule}` : ' bukas';
                      setComposerMessage(
                        `AICS Guidance: Paalala po, may Parent Conference po kayo para kay ${composerStudentName}${when} sa Guidance Room. Mangyaring dumalo po. Salamat po.`
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 hover:border-[#007AFF] text-[#1D1D1F] dark:text-white text-[11px] font-bold transition-all active:scale-[0.97]"
                  >
                    {isTl ? 'Paalala (Reminder)' : 'Reminder'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const when = composerSchedule ? ` sa ${composerSchedule}` : '';
                      setComposerMessage(
                        `AICS Guidance Office: Inilipat po ang ating pag-uusap para kay ${composerStudentName}${when}. Ipagbigay-alam po kung matatanggap. Salamat po.`
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 hover:border-[#007AFF] text-[#1D1D1F] dark:text-white text-[11px] font-bold transition-all active:scale-[0.97]"
                  >
                    {isTl ? 'Reschedule' : 'Reschedule'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setComposerMessage(
                        `AICS Guidance: Urgent follow-up po ito para sa kapakanan ni ${composerStudentName}. Mangyaring makipag-ugnayan agad sa Guidance Office. Salamat po.`
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:border-rose-400 text-rose-800 dark:text-rose-300 text-[11px] font-bold transition-all active:scale-[0.97]"
                  >
                    {isTl ? 'Urgent Follow-up' : 'Urgent Notice'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setComposerMessage(
                        buildDefaultParentMessage({
                          parentName: composerParentName,
                          studentName: composerStudentName,
                          gradeSection: composerGradeSection,
                          scheduleText: composerSchedule,
                          locale: 'tl',
                        })
                      )
                    }
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40 text-[#6E6E73] dark:text-slate-400 text-[11px] font-semibold active:scale-[0.97] ml-auto"
                    title={isTl ? 'Ibalik sa orihinal na template' : 'Reset to default template'}
                  >
                    {isTl ? 'I-reset' : 'Reset'}
                  </button>
                </div>
              </div>

              {/* Message Content & Character Counter */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#1D1D1F] dark:text-slate-200">{isTl ? 'Nilalaman ng Mensahe' : 'Message Content'}</span>
                  <div className="flex items-center gap-2">
                    {composerChannel !== 'gmail' && (
                      <span className="font-mono text-[11px] text-[#007AFF] dark:text-[#409CFF]">
                        {(() => {
                          const i = smsInfo(composerMessage);
                          return isTl ? `${i.length} letra · ${i.parts} SMS` : `${i.length} letters · ${i.parts} SMS`;
                        })()}
                      </span>
                    )}
                    {composerChannel === 'gmail' && (
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        {isTl ? 'Walang limit sa haba (email)' : 'No length limit (email)'}
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  rows={5}
                  value={composerMessage}
                  onChange={(e) => setComposerMessage(e.target.value)}
                  placeholder={isTl ? 'I-type ang mensahe para sa magulang...' : 'Type official notice message...'}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-medium text-[#1D1D1F] dark:text-white leading-relaxed resize-y min-h-[120px] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              {/* RA 10173 Privacy Compliance Check Banner */}
              {detectedSensitiveTerms.length > 0 ? (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 text-rose-800 dark:text-rose-200 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      {isTl
                        ? `Bawal ito sa mensahe sa magulang: ${detectedSensitiveTerms.join(', ')}. Tanggalin ang detalye ng offense.`
                        : `Not allowed in a parent message: ${detectedSensitiveTerms.join(', ')}. Remove the offense details.`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setComposerMessage(
                        buildDefaultParentMessage({
                          parentName: composerParentName,
                          studentName: composerStudentName,
                          gradeSection: composerGradeSection,
                          scheduleText: composerSchedule,
                          locale: 'tl',
                        })
                      )
                    }
                    className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs inline-flex items-center gap-1 active:scale-[0.97]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isTl ? 'Ibalik ang ligtas na mensahe' : 'Use the safe message'}</span>
                  </button>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{isTl ? 'Ligtas: walang detalye ng offense sa mensahe (Data Privacy Act).' : 'Safe: no offense details in the message (Data Privacy Act).'}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-[#1D1D1F] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-[0.97]"
                >
                  {isTl ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={
                    isSendingNotice ||
                    (composerChannel !== 'gmail' && !checkPhMobile(composerPhone, isTl).ok)
                  }
                  title={
                    composerChannel !== 'gmail' && !checkPhMobile(composerPhone, isTl).ok
                      ? isTl
                        ? 'Ayusin muna ang mobile number'
                        : 'Fix the mobile number first'
                      : undefined
                  }
                  className="px-5 py-2 rounded-xl bg-[#007AFF] hover:bg-[#163574] text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-[0.97]"
                >
                  <span>{isSendingNotice ? (isTl ? 'Ipinapadala...' : 'Sending...') : (isTl ? 'Ipadala' : 'Send')}</span>
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          MODAL 4: WALK-IN PARENT LOGGER MODAL
          ==================================================================== */}
      <AnimatePresence>
        {walkInOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 !m-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.form
              onSubmit={handleAddWalkIn}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md rounded-2xl saas-card p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#1D1D1F] dark:text-white">
                  {isTl ? 'Walk-in na magulang' : 'Walk-in parent'}
                </h3>
                <button
                  aria-label={isTl ? 'Isara' : 'Close'}
                  title={isTl ? 'Isara' : 'Close'}
                  type="button"
                  onClick={() => setWalkInOpen(false)}
                  className="text-sm font-bold text-[#6E6E73]"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] -mt-2">
                {isTl ? 'Para sa magulang na dumating nang walang appointment.' : 'For a parent who came without an appointment.'}
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label htmlFor="walkin-student" className="block font-bold mb-1">{isTl ? 'Estudyante' : 'Student'}</label>
                  <input
                    id="walkin-student"
                    type="text"
                    list="walkin-students"
                    value={walkInStudent}
                    onChange={(e) => setWalkInStudent(e.target.value)}
                    placeholder={isTl ? 'I-type ang pangalan o student no.' : 'Type a name or student no.'}
                    className={`w-full px-3 py-2 rounded-lg saas-card-subtle font-semibold ${walkInStudent && !walkInMatch ? 'ring-2 ring-amber-400' : walkInMatch ? 'ring-2 ring-emerald-500/70' : ''}`}
                  />
                  <datalist id="walkin-students">
                    {students
                      .filter((st) => !walkInStudent.trim() || st.fullName.toLowerCase().includes(walkInStudent.trim().toLowerCase()) || st.studentNumber.includes(walkInStudent.trim()))
                      .slice(0, 50)
                      .map((st) => (
                        <option key={st.studentNumber} value={walkInLabel(st)} />
                      ))}
                  </datalist>
                  {walkInStudent && !walkInMatch && (
                    <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      {isTl ? 'Pumili mula sa listahan na lumalabas. Wala siya? Idagdag muna sa Mga Kaso → Mga estudyante.' : 'Pick from the list that appears. Not there? Add them first in Cases → Students.'}
                    </p>
                  )}
                </div>
                {walkInMatch && (
                  <div className="p-3 rounded-lg saas-card-subtle">
                    <p className="font-bold text-[#1D1D1F] dark:text-white">
                      {isTl ? 'Magulang' : 'Parent'}: {walkInMatch.parentName}
                    </p>
                    <p className="text-[#6E6E73] dark:text-[#A1A1A6]">
                      {walkInMatch.parentPhone || (isTl ? 'walang number' : 'no number')}
                      {walkInMatch.parentEmail ? ` · ${walkInMatch.parentEmail}` : ''}
                    </p>
                  </div>
                )}
                <div>
                  <label htmlFor="walkin-purpose" className="block font-bold mb-1">{isTl ? 'Dahilan ng pagpunta' : 'Purpose'}</label>
                  <input
                    id="walkin-purpose"
                    type="text"
                    value={walkInPurpose}
                    onChange={(e) => setWalkInPurpose(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg saas-card-subtle font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWalkInOpen(false)}
                  className="px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold"
                >
                  {isTl ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!walkInMatch}
                  className="px-4 py-2 rounded-lg bg-[#007AFF] text-white text-xs font-bold disabled:bg-[#94A8D0] disabled:cursor-not-allowed"
                >
                  {walkInMatch ? (isTl ? '✓ I-log ang walk-in' : '✓ Log walk-in') : isTl ? 'Pumili muna ng estudyante' : 'Pick a student first'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>



      {/* ====================================================================
          MODAL 6: NEW USER QUICK GUIDE MODAL (4-STEP WORKFLOW HELPER)
          ==================================================================== */}
      {helpOpen && <HelpAssistant isTl={isTl} onClose={() => setHelpOpen(false)} onGo={helpGo} />}
      {lightToast && (
        <div role="status" aria-live="polite" data-light-toast className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] max-w-[560px] w-[calc(100%-32px)] rounded-2xl bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#1D1D1F] shadow-2xl px-4 py-3 flex items-center gap-3 light-toast-in">
          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </span>
          <p className="text-[13px] font-medium flex-1 min-w-0">{lightToast.message.replace(/^(?:✓|✨|📥)s*/u, '').trim()}</p>
          {lightToast.undoAction && (
            <button type="button" onClick={() => { lightToast.undoAction?.(); setLightToast(null); }} className="text-[13px] font-semibold text-[#64B5FF] dark:text-[#007AFF] shrink-0 hover:underline">{isTl ? 'I-undo' : 'Undo'}</button>
          )}
          <button type="button" onClick={() => setLightToast(null)} aria-label={isTl ? 'Isara' : 'Close'} title={isTl ? 'Isara' : 'Close'} className="w-6 h-6 rounded-full text-white/60 dark:text-black/50 hover:bg-white/10 dark:hover:bg-black/10 shrink-0">×</button>
        </div>
      )}
      {/* waits until the save message is closed, so two pop-ups never sit on top of each other */}
      <SmsFallbackHost
        onToast={(m) => triggerToast(m)}
        onActiveChange={setSendFlowActive}
        onTextedByPhone={(d) => {
          const digits = (s: string) => s.replace(/D/g, '');
          const match = (x: FollowUpTaskItem) => !x.resolved && x.category === 'Failed SMS' && digits(x.parentPhone) === digits(d.phone) && (!d.caseCode || x.caseId === d.caseCode);
          const summary = isTl ? 'Na-text ng staff gamit ang sariling phone' : 'Texted by staff from own phone';
          followUpTasks.filter(match).forEach((x) => void updateFollowUpTaskInDb(x.id, x.attemptsCount, summary, true));
          setFollowUpTasks((prev) => prev.map((x) => (match(x) ? { ...x, resolved: true, lastContactSummaryEn: summary, lastContactSummaryTl: summary } : x)));
        }}
      />
      <AnimatePresence>
        {showQuickGuideModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQuickGuideModal(false)}
            className="fixed inset-0 !m-0 z-50 bg-[#06122B]/45 backdrop-blur-[3px] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl saas-card p-6 space-y-4 shadow-2xl" data-quick-guide
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#E5E5EA] dark:border-[#38383A] pb-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EAF3FF] dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#409CFF] text-[11px] font-extrabold mb-1">
                    {isTl ? 'PAANO GAMITIN' : 'QUICK GUIDE'}
                  </span>
                  <h3 className="text-lg font-extrabold text-[#1D1D1F] dark:text-white">
                    {isTl ? 'Ang araw-araw na trabaho sa 6 na hakbang' : 'Your daily work in 6 steps'}
                  </h3>
                  <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                    {isTl ? 'Pindutin ang isang hakbang para buksan agad ang page na iyon.' : 'Press a step to open that page right away.'}
                  </p>
                </div>
                <button
                  aria-label={isTl ? 'Isara' : 'Close'}
                  title={isTl ? 'Isara' : 'Close'}
                  type="button"
                  onClick={() => setShowQuickGuideModal(false)}
                  className="text-sm font-bold text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              {(() => {
                const go = (fn: () => void) => () => {
                  setShowQuickGuideModal(false);
                  fn();
                };
                const goPage = (id: string) =>
                  go(() => {
                    soundFX.playStepUnlock();
                    const item = MAIN_SIDEBAR_CATEGORIES.find((c) => c.id === id);
                    if (item) setActiveCategory(item);
                  });
                const steps: { key: string; en: string; tl: string; dEn: string; dTl: string; aEn: string; aTl: string; run: () => void }[] = [
                  {
                    key: 'dashboard',
                    en: 'Start on the Dashboard',
                    tl: 'Magsimula sa Dashboard',
                    dEn: '"Needs attention" shows overdue cases and sanctions waiting for the parent. Press one to open the list.',
                    dTl: 'Ipinapakita ng "Kailangang asikasuhin" ang mga overdue na kaso at ang mga sanction na naghihintay sa magulang. Pindutin para buksan ang listahan.',
                    aEn: 'Open the Dashboard',
                    aTl: 'Buksan ang Dashboard',
                    run: goPage('dashboard'),
                  },
                  {
                    key: 'new-case',
                    en: 'Record a new case',
                    tl: 'Mag-record ng bagong kaso',
                    dEn: 'Pick the student and the offense. The system counts the offense and suggests the sanction from the handbook.',
                    dTl: 'Piliin ang estudyante at offense. Bibilangin ng system ang offense at magmumungkahi ng sanction mula sa handbook.',
                    aEn: '+ New Case',
                    aTl: '+ Bagong Kaso',
                    run: go(() => openCasesTab('add-report')),
                  },
                  {
                    key: 'flow',
                    en: 'Follow the 7 steps of the case',
                    tl: 'Sundan ang 7 hakbang ng kaso',
                    dEn: 'Open a case. "Next step" tells you what to do: call the student, get their statement, tell the parent, decide, follow up, close. Each step has Undo.',
                    dTl: 'Buksan ang kaso. Sasabihin ng "Susunod na gagawin" ang gagawin: tawagin ang estudyante, kunin ang salaysay, ipaalam sa magulang, magdesisyon, mag-follow-up, isara. May Undo bawat hakbang.',
                    aEn: 'Open the cases',
                    aTl: 'Buksan ang mga kaso',
                    run: go(() => openCasesTab('case-board')),
                  },
                  {
                    key: 'station',
                    en: 'Let the student type their statement',
                    tl: 'Ipa-type sa estudyante ang salaysay',
                    dEn: 'In the "Explanation" step, press 🖥 Let the student type it. The screen locks, and only the staff PIN opens it again.',
                    dTl: 'Sa hakbang na "Paliwanag", pindutin ang 🖥 Ipa-type sa estudyante. Magla-lock ang screen, at PIN lang ng staff ang makakapagbukas ulit.',
                    aEn: 'Open the cases',
                    aTl: 'Buksan ang mga kaso',
                    run: go(() => openCasesTab('case-board')),
                  },
                  {
                    key: 'parents',
                    en: 'Hold the parent conference',
                    tl: 'Gawin ang parent conference',
                    dEn: 'Schedule it and send the notice. On the day, press Attended or Did not attend. A follow-up is made when the parent does not come.',
                    dTl: 'I-schedule at padalhan ng abiso. Sa araw mismo, pindutin ang Dumalo o Hindi dumalo. May follow-up kapag hindi dumalo ang magulang.',
                    aEn: 'Open Parents',
                    aTl: 'Buksan ang Parents',
                    run: go(() => openParents()),
                  },
                  {
                    key: 'print',
                    en: 'Print forms and attach evidence',
                    tl: 'Mag-print ng form at maglagay ng ebidensya',
                    dEn: 'Inside a case: "Print a form…" (call slip, conference form, contract, kasunduan, suspension letter), and add photos or PDF files as evidence.',
                    dTl: 'Sa loob ng kaso: "Mag-print ng form…" (call slip, conference form, contract, kasunduan, suspension letter), at magdagdag ng litrato o PDF bilang ebidensya.',
                    aEn: 'Open the cases',
                    aTl: 'Buksan ang mga kaso',
                    run: go(() => openCasesTab('case-board')),
                  },
                ];
                const others: { key: string; en: string; tl: string; run: () => void }[] = [
                  { key: 'students', en: 'Students & master list', tl: 'Mga estudyante at master list', run: go(() => openCasesTab('students')) },
                  { key: 'support-hub', en: 'Concerns from students', tl: 'Concerns ng estudyante', run: goPage('support-hub') },
                  { key: 'referrals-hub', en: 'Counselor referrals', tl: 'Referral sa counselor', run: goPage('referrals-hub') },
                  { key: 'records-hub', en: 'Reports & graphs', tl: 'Reports at graphs', run: goPage('records-hub') },
                  { key: 'audit-hub', en: 'Audit Trail (every change)', tl: 'Audit Trail (bawat pagbabago)', run: goPage('audit-hub') },
                  { key: 'settings-hub', en: 'Settings (PIN needed)', tl: 'Settings (kailangan ng PIN)', run: goPage('settings-hub') },
                ];
                return (
                  <>
                    <ol className="grid grid-cols-2 gap-2.5 text-left">
                      {steps.map((st, i) => (
                        <li key={st.key}>
                          <button
                            type="button"
                            data-guide-step={st.key}
                            onClick={st.run}
                            className="btn-press w-full h-full text-left p-3 rounded-xl saas-card-subtle hover:border-[#007AFF] flex gap-3 items-start"
                          >
                            <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#007AFF] text-white text-xs font-extrabold">{i + 1}</span>
                            <span className="min-w-0 space-y-0.5">
                              <span className="block text-sm font-extrabold text-[#1D1D1F] dark:text-white">{isTl ? st.tl : st.en}</span>
                              <span className="block text-xs text-[#6E6E73] dark:text-[#A1A1A6] leading-relaxed">{isTl ? st.dTl : st.dEn}</span>
                              <span className="block text-xs font-extrabold text-[#007AFF] dark:text-[#409CFF]">{isTl ? st.aTl : st.aEn} →</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Iba pang page' : 'Other pages'}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {others.map((o) => (
                          <button key={o.key} type="button" data-guide-page={o.key} onClick={o.run} className="btn-press px-3 py-2 rounded-lg saas-card-subtle hover:border-[#007AFF] text-xs font-bold text-[#007AFF] dark:text-[#409CFF] text-left whitespace-nowrap">
                            {isTl ? o.tl : o.en} →
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5E5EA] dark:border-[#38383A]">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6E6E73] dark:text-[#A1A1A6]" data-guide-colors aria-label={isTl ? 'Ibig sabihin ng mga kulay' : 'What the colours mean'}>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> {isTl ? 'Serious o major / naghihintay 7+ araw' : 'Serious or major / waiting 7+ days'}</span>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> {isTl ? 'Ika-2 minor (bantayan) / 3–6 araw' : '2nd minor (watch) / 3–6 days'}</span>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> {isTl ? 'Tapos na / Dumalo' : 'Done / Attended'}</span>
                      </div>
                      <button
                        type="button"
                        data-guide-close
                        onClick={() => setShowQuickGuideModal(false)}
                        className="btn-press px-5 py-2 rounded-lg bg-[#007AFF] text-white text-xs font-semibold whitespace-nowrap"
                      >
                        {isTl ? 'OK, naintindihan ko' : 'Got it'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
