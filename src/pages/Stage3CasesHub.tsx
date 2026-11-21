import { decisionNoticeMessage } from '../services/summonsLadder';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserPlus, Printer, Layers, Upload, X, Image as ImageIcon, Trash2, Check, Search, Info, Plus, Undo2, SlidersHorizontal, MoreHorizontal, FolderOpen, AlertTriangle, CalendarDays, Download, ChevronRight, Pencil, MessageSquare, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { PhoneInput, checkPhMobile, formatPhMobile } from '../components/ui/PhoneInput';
import { StudentGenderAvatar } from '../components/students/StudentGenderAvatar';
import { SortControl, SortKey, loadSort, saveSort, timeOf, addedLabel } from '../components/ui/SortControl';
import { useAppConfig, activeOffenses } from '../services/appConfig';
import { DuotoneIcon } from '../components/ui/icons';
import { Legend } from '../components/ui/Charts';
import { StudentForm, StudentFormValue } from '../components/students/StudentForm';
import { CaseFlowPanel, FlowAction, flowState, isMinorCase } from '../components/cases/CaseFlowPanel';
import { StatementStation } from '../components/cases/StatementStation';
import { PrintFormsWindow } from '../components/cases/PrintFormsWindow';
import { ParentContactHistory } from '../components/cases/ParentContactHistory';
import { EvidencePanel } from '../components/cases/EvidencePanel';
import { StatementsPanel } from '../components/cases/StatementsPanel';
import { DateField } from '../components/ui/DateField';
import { uploadEvidence, checkEvidenceFile } from '../services/evidenceDb';
import { FORM_TITLES, buildBatchCallSlipsHtml, buildFormHtml, printHtml, downloadFormDocument } from '../services/printForms';
import { useConfirmChange } from '../components/ui/ConfirmChange';
import { useLoading } from '../components/ui/LoadingCard';
import { soundFX } from '../services/soundEngine';
import { checkEmail } from '../services/validators';
import { importMasterlistFile } from '../services/masterlistImportRunner';
import { ImportScanModal } from '../components/ui/ImportScanModal';
import type { ToastNextAction } from './DashboardPage';
import type { ParentAppointmentItem } from '../data/dashboardMockData';
import { todayISO, byDateTime, sanctionEndingSoon } from '../services/scheduling';
import { computeImportFindings, countRowsNeedingFix } from '../services/importFindings';
import {
  buildTemplateCsv,
  FIELD_LABELS,
  FIELD_ORDER,
  loadErrorMessage,
  reExtract,
  type ColumnMapping,
  type FieldKey,
  type ImportAnalysis,
} from '../services/masterlistImport';
import {
  StudentRecord,
  DisciplineCaseRecord,
  CaseStatusType,
  OFFENSE_HANDBOOK_RULES,
  OffenseHandbookRule,
  MasterlistPreviewRow,
  SAMPLE_MASTERLIST_IMPORT_BATCH,
  MINOR_CASE_STEPS,
  MAJOR_CASE_STEPS,
  type CaseStep,
} from '../data/stage3MockData';
import {
  insertDisciplineCaseInDb,
  updateDisciplineCaseStatusInDb,
  updateStudentOffenseInDb,
  insertStudentsBatchInDb,
  updateStudentsProfileBatchInDb,
  insertStudentInDb,
  updateStudentDetailsInDb,
  updateCaseFlowInDb,
  setStudentEnrollmentInDb,
  moveUpSchoolYearInDb,
  undoSchoolYearMoveInDb,
  insertActivityLogInDb,
  updateDisciplineCaseDetailsInDb,
  fetchCaseHistoryFromDb,
  fetchHighestCaseNumberEver,
  insertAppointmentInDb,
  updateAppointmentInDb,
  CaseHistoryEntry,
} from '../services/supabaseClient';
import { sendParentMessage } from '../services/parentComms';

export type Stage3SubTab = 'add-report' | 'case-board' | 'closed-cases' | 'students' | 'masterlist';

/** A New Case started from a student's concern (Concerns > "+ Record a case") */
export interface CasePrefill {
  concernId: number;
  concernCode: string;
  place: string;
  witnesses: string;
  notes: string;
  reportedBy: string;
  /** names the student wrote under "Who was involved" (put in the student search) */
  search: string;
  /** Suggested or matched offense policy code from student report (e.g. 'MAJ-01' for Bullying) */
  policyCode?: string;
  /** staff-only: the student who was affected (from the concern) */
  affectedStudentNumber?: string;
}

interface Stage3CasesHubProps {
  students: StudentRecord[];
  setStudents: React.Dispatch<React.SetStateAction<StudentRecord[]>>;
  cases: DisciplineCaseRecord[];
  setCases: React.Dispatch<React.SetStateAction<DisciplineCaseRecord[]>>;
  quickSearch: string;
  onTriggerToast: (msg: string, undo?: () => void, next?: ToastNextAction) => void;
  /** all parent conferences (to show the next one on each case) */
  appointments?: ParentAppointmentItem[];
  setAppointments?: React.Dispatch<React.SetStateAction<ParentAppointmentItem[]>>;
  /** open the Parents page with the schedule window for this case */
  onScheduleConference?: (caseCode: string) => void;
  onOpenParentComposer: (params: {
    studentName: string;
    gradeSection: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    scheduleText: string;
      caseCode?: string;
    message?: string;
  }) => void;
  /** Which tab to open first (e.g. "+ New Case" opens Add Report, the Open Cases card opens the board). */
  initialSubTab?: Stage3SubTab;
  /** open the board already filtered (from a Dashboard alert) */
  initialCaseFlag?: 'overdue' | 'waiting' | 'ending' | null;
  /** directly open a specific case code in the drawer */
  initialOpenCaseCode?: string | null;
  /** start the New Case form from a student concern */
  prefill?: CasePrefill | null;
  /** the cases saved from that prefill (so the concern can be linked to them) */
  onPrefillSaved?: (caseCodes: string[]) => void;
}


type BoardBucket = 'ALL' | 'new' | 'progress' | 'conference' | 'sanction' | 'done';

export const Stage3CasesHub: React.FC<Stage3CasesHubProps> = ({
  students,
  setStudents,
  cases,
  setCases,
  quickSearch,
  onTriggerToast,
  onOpenParentComposer,
  appointments = [],
  setAppointments,
  onScheduleConference,
  initialSubTab,
  initialCaseFlag,
  initialOpenCaseCode,
  prefill,
  onPrefillSaved,
}) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';
  const confirmChange = useConfirmChange();
  const { startLoading, stopLoading } = useLoading();

  const [subTab, setSubTab] = useState<Stage3SubTab>(prefill ? 'add-report' : initialSubTab ?? 'case-board');

  // ==========================================================================
  // SUB-TAB 1 STATE: ADD NEW CASE REPORT (PAGE 2)
  // - Starts clean for new users, with a 1-click "Fill Sample Data" helper
  // ==========================================================================
  // Auto-prefill matching student from concern reporter's identified respondent
  const initialPrefilledStudentNos = useMemo(() => {
    if (!prefill?.search || !students || students.length === 0) return [];
    const q = prefill.search.toLowerCase().trim();
    if (!q || q.length < 2) return [];
    const directMatch = students.find((s) => s.fullName.toLowerCase().includes(q) || q.includes(s.fullName.toLowerCase()));
    return directMatch ? [directMatch.studentNumber] : [];
  }, [prefill, students]);

  const [selectedStudentNumbers, setSelectedStudentNumbers] = useState<string[]>(initialPrefilledStudentNos);
  const [studentPickerQuery, setStudentPickerQuery] = useState<string>(prefill?.search ?? '');
  const [selectedPolicyCode, setSelectedPolicyCode] = useState<string>(prefill?.policyCode ?? 'MIN-01');
  // Group incident: a different offense per student (empty = same as the main offense)
  const [policyOverride, setPolicyOverride] = useState<Record<string, string>>({});
  const [incidentDate, setIncidentDate] = useState<string>(() => new Date().toLocaleDateString('en-CA'));
  const [reportedBy, setReportedBy] = useState<string>(prefill?.reportedBy ?? '');
  const [incidentNotes, setIncidentNotes] = useState<string>(prefill?.notes ?? '');
  const [affectedQuery, setAffectedQuery] = useState(() => {
    const s = prefill?.affectedStudentNumber ? students.find((x) => x.studentNumber === prefill.affectedStudentNumber) : undefined;
    return s ? `${s.fullName} · #${s.studentNumber}` : '';
  });
  const [incidentTime, setIncidentTime] = useState<string>('');
  const [incidentPlace, setIncidentPlace] = useState<string>(prefill?.place ?? '');
  const [incidentWitness, setIncidentWitness] = useState<string>(prefill?.witnesses ?? '');
  const [incidentEvidenceFiles, setIncidentEvidenceFiles] = useState<File[]>([]);

  // Synchronize prefill when prop changes (e.g. user clicks another concern in Concerns Hub)
  useEffect(() => {
    if (!prefill) return;
    if (prefill.policyCode) {
      setSelectedPolicyCode(prefill.policyCode);
    }
    if (prefill.search) {
      setStudentPickerQuery(prefill.search);
      const q = prefill.search.toLowerCase().trim();
      const directMatch = students.find((s) => s.fullName.toLowerCase().includes(q) || q.includes(s.fullName.toLowerCase()));
      if (directMatch) {
        setSelectedStudentNumbers([directMatch.studentNumber]);
      }
    }
    if (prefill.reportedBy) setReportedBy(prefill.reportedBy);
    if (prefill.notes) setIncidentNotes(prefill.notes);
    if (prefill.place) setIncidentPlace(prefill.place);
    if (prefill.witnesses) setIncidentWitness(prefill.witnesses);
  }, [prefill, students]);
  const offenseSelectRef = useRef<HTMLSelectElement>(null);
  const [lastSavedCodes, setLastSavedCodes] = useState<string[]>([]);
  const [showDoneCases, setShowDoneCases] = useState<boolean>(false);
  const [caseMenuOpen, setCaseMenuOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!caseMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[role=menu]') || t.closest('[aria-haspopup=menu]')) return;
      setCaseMenuOpen(null);
      // the click that closes the menu should do nothing else (e.g. not open another case)
      const swallow = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      document.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 400);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCaseMenuOpen(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [caseMenuOpen]);

  // ---- Draft: what was typed survives leaving the page (Golden Rule 7) ----
  type CaseDraft = {
    students: string[]; policy: string; override: Record<string, string>; date: string;
    reportedBy: string; time: string; place: string; witness: string; notes: string; savedAt: number;
  };
  const DRAFT_KEY = 'aics_case_draft_v1';
  const [draftPrompt, setDraftPrompt] = useState<CaseDraft | null>(() => {
    if (prefill) return null; // a concern fills the form; don't offer the old draft
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? (JSON.parse(raw) as CaseDraft) : null;
    } catch {
      return null;
    }
  });
  const [autoNotifyParent, setAutoNotifyParent] = useState<boolean>(true);

  // ==========================================================================
  // SUB-TAB 2 STATE: ACTIVE CASE BOARD (PAGE 3)
  // ==========================================================================
  const [caseStatusFilter, setCaseStatusFilter] = useState<BoardBucket>('ALL');
  /** One plain bucket per case, same words as the badge on each card (Golden Rule 3) */
  const bucketOf = (c: DisciplineCaseRecord): Exclude<BoardBucket, 'ALL'> =>
    c.status === 'Resolved'
      ? 'done'
      : c.status === 'Sanction In Progress'
      ? 'sanction'
      : c.status === 'Conference Scheduled' || c.status === 'Pending Reschedule' || c.status === 'Conference Attended'
      ? 'conference'
      : !c.step || c.step === 'Reported'
      ? 'new'
      : 'progress';
  const bucketWord = (b: BoardBucket): string =>
    (isTl
      ? { ALL: 'Lahat', new: 'Bago', progress: 'Ginagawa', conference: 'Conference', sanction: 'May sanction', done: 'Tapos na' }
      : { ALL: 'All', new: 'New', progress: 'In progress', conference: 'Conference', sanction: 'Serving sanction', done: 'Done' })[b];
  // extra filters (grade, period, overdue / waiting sanction)
  const [gradeF, setGradeF] = useState<'all' | '11' | '12'>('all');
  const [periodF, setPeriodF] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [fromF, setFromF] = useState('');
  const [toF, setToF] = useState('');
  const [flagF, setFlagF] = useState<'all' | 'overdue' | 'waiting' | 'ending'>(initialCaseFlag ?? 'all');
  // sort choice per list (newest first by default, remembered on this computer)
  const [pickerSort, setPickerSortState] = useState<SortKey>(() => loadSort('picker'));
  const [caseSort, setCaseSortState] = useState<SortKey>(() => loadSort('cases'));
  const [studentSort, setStudentSortState] = useState<SortKey>(() => loadSort('students'));
  const setPickerSort = (v: SortKey) => { setPickerSortState(v); saveSort('picker', v); };
  const setCaseSort = (v: SortKey) => { setCaseSortState(v); saveSort('cases', v); };
  const setStudentSort = (v: SortKey) => { setStudentSortState(v); saveSort('students', v); };
  const [callSlipCase, setCallSlipCase] = useState<DisciplineCaseRecord | null>(null);
  const [callSlipInitialForm, setCallSlipInitialForm] = useState<import('../services/printForms').FormKind | null>(null);
  // Case Details panel
  const [openCaseCode, setOpenCaseCode] = useState<string | null>(initialOpenCaseCode ?? null);
  // A wrong case is WITHDRAWN (kept + audited), never deleted — the audit trail cannot be edited (manuscript)
  const [withdrawFor, setWithdrawFor] = useState<DisciplineCaseRecord | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  // 'withdraw' = filed by mistake; 'notProven' = heard both sides, not enough proof / found untrue
  const [closeMode, setCloseMode] = useState<'withdraw' | 'notProven'>('withdraw');

  useEffect(() => {
    if (initialOpenCaseCode) {
      setOpenCaseCode(initialOpenCaseCode);
      setSubTab('case-board');
    }
  }, [initialOpenCaseCode]);
  const [caseHistory, setCaseHistory] = useState<CaseHistoryEntry[] | null | 'loading'>('loading');
  const [caseEditing, setCaseEditing] = useState<boolean>(false);
  const [flowBusy, setFlowBusy] = useState(false);
  /** Student Statement Station: the case it is open for, and the case as it was before the student saved */
  const [stationCase, setStationCase] = useState<DisciplineCaseRecord | null>(null);
  const stationBefore = useRef<DisciplineCaseRecord | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editReportedBy, setEditReportedBy] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  // Esc closes the top-most popup of this page (same as Case Details)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-confirm-open], [data-evidence-viewer], [data-student-form], [data-print-forms], [data-statement-station], [data-help-assistant]')) return;
      if (callSlipCase) setCallSlipCase(null);
      else if (selectedStudentProfile) setSelectedStudentProfile(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  useEffect(() => {
    if (!openCaseCode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !caseEditing && !document.querySelector('[data-confirm-open], [data-evidence-viewer], [data-print-forms], [data-statement-station], [data-help-assistant]')) setOpenCaseCode(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [openCaseCode, caseEditing]);

  // ==========================================================================
  // SUB-TAB 3 STATE: STUDENTS DIRECTORY & HISTORY (PAGE 4)
  // ==========================================================================
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [studentGrade, setStudentGrade] = useState<'ALL' | '11' | '12'>('ALL');
  const [studentOffense, setStudentOffense] = useState<'all' | 'serious' | 'watch' | 'minor' | 'none'>('all');
  // manual add / edit (restored) + enrolled filter
  const [studentFormFor, setStudentFormFor] = useState<StudentRecord | 'new' | null>(null);
  const [studentSaving, setStudentSaving] = useState(false);
  const [enrolledFilter, setEnrolledFilter] = useState<'enrolled' | 'left'>('enrolled');
  const [leaveFor, setLeaveFor] = useState<StudentRecord | null>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<StudentRecord | null>(
    null
  );
  const [passwordResetCode, setPasswordResetCode] = useState<string | null>(null);

  // ==========================================================================
  // SUB-TAB 4 STATE: MASTERLIST IMPORT & PREVIEW-FIX TABLE (PAGE 15)
  // ==========================================================================
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
  const [importError, setImportError] = useState<string>('');
  const [importBusy, setImportBusy] = useState<boolean>(false);
  const [importStage, setImportStage] = useState<number>(0);
  const [scanOpen, setScanOpen] = useState<boolean>(false);
  const [dirPage, setDirPage] = useState<number>(0);
  const [savingMasterlist, setSavingMasterlist] = useState<boolean>(false);
  const [previewPage, setPreviewPage] = useState<number>(0);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'issues' | 'ready'>('all');
  const [scanAnalysis, setScanAnalysis] = useState<ImportAnalysis | null>(null);
  const importTokenRef = useRef(0);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importDragOver, setImportDragOver] = useState<boolean>(false);
  const [previewSourceLabels, setPreviewSourceLabels] = useState<Record<string, string>>({});
  // starts EMPTY: practice rows only exist in the development build
  const [previewRows, setPreviewRows] = useState<MasterlistPreviewRow[]>([]);

  // ==========================================================================
  // COMPUTED SUMMARY METRICS (LOCKED TOP KPI ROW)
  // ==========================================================================
  const summaryStats = useMemo(() => {
    const activeCases = cases.filter((c) => c.status !== 'Resolved').length;
    const closedCases = cases.filter((c) => c.status === 'Resolved').length;
    const watchStudents = students.filter((s) => s.minorOffenseCount >= 2).length;
    const totalStudents = students.length;
    return { activeCases, closedCases, watchStudents, totalStudents };
  }, [cases, students]);

  // Selected Student Objects for Add Report
  const selectedStudentsList = useMemo(
    () => students.filter((s) => selectedStudentNumbers.includes(s.studentNumber)),
    [students, selectedStudentNumbers]
  );

  // offenses come from Settings › Offenses (the office can add, edit or remove them)
  const appConfig = useAppConfig();
  const HANDBOOK = useMemo(() => {
    const list = activeOffenses(appConfig);
    return list.length ? list : OFFENSE_HANDBOOK_RULES;
  }, [appConfig]);
  const escalateAfter = Math.max(2, Number(appConfig.caseRules.escalateAfterMinors) || 2);
  const selectedPolicy: OffenseHandbookRule = useMemo(
    () => HANDBOOK.find((r) => r.policyCode === selectedPolicyCode) || HANDBOOK[0],
    [selectedPolicyCode, HANDBOOK]
  );

  const policyFor = (stu: StudentRecord): OffenseHandbookRule =>
    HANDBOOK.find(
      (r) => r.policyCode === (policyOverride[stu.studentNumber] || selectedPolicyCode)
    ) || selectedPolicy;

  // ==========================================================================
  // ESCALATION RULE — the ONLY place it is defined.
  // Source: manuscript, Definition of Terms: "two or more consecutive minor
  // offenses count as a serious offense". Offense classes: Minor, Less Serious,
  // Serious, Grave. Change here once the official AICS Student Handbook says otherwise.
  // ==========================================================================
  /** a case withdrawn as "filed in error" is kept for the record but never counts as an offense */
  const isWithdrawn = (c: DisciplineCaseRecord) => /^(withdrawn|not proven)/i.test(c.decision ?? '');
  const isNotProven = (c: DisciplineCaseRecord) => /^not proven/i.test(c.decision ?? '');
  const closedWord = (c: DisciplineCaseRecord) => (isNotProven(c) ? (isTl ? 'Hindi napatunayan' : 'Not proven') : isTl ? 'Binawi' : 'Withdrawn');
  const isMinorSeverity = (sev: string) =>
    /minor/i.test(sev) && !/escalat|→ serious|serious offense|major case/i.test(sev);

  /** How many minor offenses in a row the student has right now (newest first, stops at a serious one). */
  const minorsInARow = (stu: StudentRecord): number => {
    const list = cases
      .filter((c) => c.studentNumber === stu.studentNumber && !isWithdrawn(c))
      .sort((a, b) => b.incidentDate.localeCompare(a.incidentDate) || b.caseCode.localeCompare(a.caseCode));
    if (!list.length) return stu.majorOffenseCount === 0 ? stu.minorOffenseCount : 0; // no case yet: use the counts
    let n = 0;
    for (const c of list) {
      if (!isMinorSeverity(c.severity)) break;
      n++;
    }
    return n;
  };
  /** True when this minor offense makes "N minors in a row" (Settings › Offenses; manuscript default 2). */
  const lastOffenseWasMinor = (stu: StudentRecord): boolean => minorsInARow(stu) >= escalateAfter - 1;

  const outcomeFor = (stu: StudentRecord, pol: OffenseHandbookRule) => {
    const nextMinor = pol.dbCategory === 'Minor' ? stu.minorOffenseCount + 1 : stu.minorOffenseCount;
    const consecutive = pol.dbCategory === 'Minor' && lastOffenseWasMinor(stu);
    const escalated = pol.dbCategory === 'Major' || consecutive;
    const classWord = (c: string) =>
      isTl
        ? ({ 'Less Serious': 'Less serious', Serious: 'Serious', Grave: 'Grave' } as Record<string, string>)[c] ?? c
        : ({ 'Less Serious': 'Less serious', Serious: 'Serious', Grave: 'Grave' } as Record<string, string>)[c] ?? c;
    const word = pol.dbCategory === 'Major'
      ? `${classWord(pol.classification)} offense`
      : consecutive
      ? isTl ? 'Sunod na minor → Serious' : 'Minor in a row → Serious'
      : stu.minorOffenseCount === 0
      ? isTl ? 'Unang minor' : '1st minor'
      : isTl ? 'Minor' : 'Minor';
    /** what is saved in the case's "severity" text */
    const severityLabel = pol.dbCategory === 'Major'
      ? `${pol.classification} Offense`
      : consecutive
      ? '2nd Minor (Consecutive) → Serious Offense'
      : stu.minorOffenseCount >= 1
      ? `${((n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'))(stu.minorOffenseCount + 1)} Minor → Serious Offense`
      : '1st Minor Offense';
    return { nextMinor, escalated, consecutive, word, severityLabel };
  };
  // the datalist value is "Name · #number"; match it back to one student
  const affectedStudent = useMemo(() => {
    const m = affectedQuery.match(/#(\S+)\s*$/);
    return m ? students.find((s) => s.studentNumber === m[1]) ?? null : null;
  }, [affectedQuery, students]);
  const isGroup = selectedStudentNumbers.length > 1;


  // ---------- case board: draw in pages of 30 ----------
  const BOARD_PAGE = 30;
  const [boardLimit, setBoardLimit] = useState<number>(BOARD_PAGE);
  useEffect(() => setBoardLimit(BOARD_PAGE), [caseStatusFilter, quickSearch]);
  const groupSizeByIncident = useMemo(() => {
    const m = new Map<string, number>();
    cases.forEach((c) => c.incidentCode && m.set(c.incidentCode, (m.get(c.incidentCode) ?? 0) + 1));
    return m;
  }, [cases]);
  const noStudentYet = selectedStudentNumbers.length === 0;

  useEffect(() => {
    if (draftPrompt) return; // never overwrite a draft the user has not decided on
    const hasContent =
      selectedStudentNumbers.length > 0 || incidentNotes.trim() || incidentPlace.trim() ||
      incidentWitness.trim() || reportedBy.trim() || incidentTime;
    try {
      if (!hasContent) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      const d: CaseDraft = {
        students: selectedStudentNumbers, policy: selectedPolicyCode, override: policyOverride,
        date: incidentDate, reportedBy, time: incidentTime, place: incidentPlace,
        witness: incidentWitness, notes: incidentNotes, savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* storage blocked: the form still works, only the draft is not kept */
    }
  }, [draftPrompt, selectedStudentNumbers, selectedPolicyCode, policyOverride, incidentDate,
      reportedBy, incidentTime, incidentPlace, incidentWitness, incidentNotes]);

  const resumeDraft = () => {
    if (!draftPrompt) return;
    const known = new Set(students.map((x) => x.studentNumber));
    setSelectedStudentNumbers(draftPrompt.students.filter((id) => known.has(id)));
    setSelectedPolicyCode(draftPrompt.policy);
    setPolicyOverride(draftPrompt.override || {});
    setIncidentDate(draftPrompt.date);
    setReportedBy(draftPrompt.reportedBy);
    setIncidentTime(draftPrompt.time);
    setIncidentPlace(draftPrompt.place);
    setIncidentWitness(draftPrompt.witness);
    setIncidentNotes(draftPrompt.notes);
    setDraftPrompt(null);
  };
  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setDraftPrompt(null);
  };

  // When Step 2 unlocks (first student picked), move the cursor there
  const prevPickCount = useRef(selectedStudentNumbers.length);
  useEffect(() => {
    if (prevPickCount.current === 0 && selectedStudentNumbers.length > 0) {
      offenseSelectRef.current?.focus({ preventScroll: true });
      offenseSelectRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    prevPickCount.current = selectedStudentNumbers.length;
  }, [selectedStudentNumbers.length]);

  const reporterSuggestions = useMemo(
    () =>
      [...new Set(cases.map((c) => c.reportedBy.trim()).filter((x) => x && x !== 'Guidance Office Staff'))].slice(0, 30),
    [cases]
  );

  const CLASS_ORDER = ['Minor', 'Less Serious', 'Serious', 'Grave'] as const;
  const offenseGroups = CLASS_ORDER.map((cls) => ({
    cls,
    label:
      cls === 'Less Serious'
        ? isTl ? 'Less serious' : 'Less serious'
        : cls,
    rules: HANDBOOK.filter((r) => r.classification === cls),
  })).filter((g) => g.rules.length > 0);

  // Students needing attention first (Golden Rule 4)
  /** 0 = has a serious offense, 1 = 2+ minor (watch), 2 = one minor, 3 = no offense */
  const attentionRank = (stu: StudentRecord): number =>
    stu.majorOffenseCount > 0 ? 0 : stu.minorOffenseCount >= 2 ? 1 : stu.minorOffenseCount === 1 ? 2 : 3;
  const attentionBadge = (stu: StudentRecord): { text: string; cls: string } => {
    const r = attentionRank(stu);
    if (r === 0) return { text: isTl ? 'May serious offense' : 'Has a serious offense', cls: 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300' };
    if (r === 1) return { text: isTl ? `Bantayan · ${stu.minorOffenseCount} minor` : `Watch · ${stu.minorOffenseCount} minor`, cls: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300' };
    if (r === 2) return { text: isTl ? '1 minor' : '1 minor', cls: 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300' };
    return { text: isTl ? 'Walang offense' : 'No offense', cls: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300' };
  };
  /** when a case was logged (falls back to the incident day) */
  const caseTime = (c: DisciplineCaseRecord) => timeOf(c.createdAt) || timeOf(c.incidentDate);
  const sortStudents = (list: StudentRecord[], key: SortKey): StudentRecord[] => {
    if (key === 'name') return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    // read each date once (not on every comparison) — fast even with thousands of students
    const t = new Map(list.map((x) => [x, timeOf(x.createdAt)]));
    if (key === 'attention') return list.sort((a, b) => attentionRank(a) - attentionRank(b) || t.get(b)! - t.get(a)!);
    const dir = key === 'oldest' ? -1 : 1;
    return list.sort((a, b) => dir * (t.get(b)! - t.get(a)!) || (a.fullName < b.fullName ? -1 : a.fullName > b.fullName ? 1 : 0));
  };
  const filteredStudentPicker = useMemo(() => {
    if (subTab !== 'add-report') return [] as StudentRecord[]; // only sort when the New case form is open
    const q = studentPickerQuery.trim().toLowerCase();
    const enrolledOnly = students.filter((x) => x.enrolled !== false); // graduated / left cannot get a new case
    const list = !q
      ? enrolledOnly
      : enrolledOnly.filter(
          (s) =>
            s.fullName.toLowerCase().includes(q) ||
            s.studentNumber.toLowerCase().includes(q) ||
            s.gradeSection.toLowerCase().includes(q)
        );
    return sortStudents(list, pickerSort);
  }, [students, studentPickerQuery, pickerSort, subTab]);

  // Golden Rule 9: never draw 1,000 rows at once
  const PICKER_LIMIT = 50;
  const visiblePicker = useMemo(() => {
    const picked = new Set(selectedStudentNumbers);
    const first = filteredStudentPicker.filter((x) => picked.has(x.studentNumber));
    const rest = filteredStudentPicker.filter((x) => !picked.has(x.studentNumber));
    return [...first, ...rest].slice(0, Math.max(PICKER_LIMIT, first.length));
  }, [filteredStudentPicker, selectedStudentNumbers]);

  const overdueDays = appConfig.caseRules.overdueDays || 14;
  const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000);
  const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  /** [from, to] for the period filter (YYYY-MM-DD, '' = open end) */
  const periodRangeOf = (): [string, string] => {
    const now = new Date();
    if (periodF === 'week') {
      const m = new Date(now);
      m.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return [isoDay(m), isoDay(now)];
    }
    if (periodF === 'month') return [isoDay(new Date(now.getFullYear(), now.getMonth(), 1)), isoDay(now)];
    if (periodF === 'custom') return [fromF, toF];
    return ['', ''];
  };
  const filtersOn = gradeF !== 'all' || periodF !== 'all' || flagF !== 'all';
  // Filtered Cases for Sub-Tab 2
  const filteredCases = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    const list = cases.filter((c) => {
      const matchesStatus = caseStatusFilter === 'ALL' || bucketOf(c) === caseStatusFilter;
      const matchesSearch =
        !q ||
        c.studentName.toLowerCase().includes(q) ||
        c.caseCode.toLowerCase().includes(q) ||
        c.gradeSection.toLowerCase().includes(q) ||
        c.offenseTitleEn.toLowerCase().includes(q);
      if (!(matchesStatus && matchesSearch)) return false;
      if (gradeF !== 'all' && !new RegExp(`Grade ${gradeF}\\b`).test(c.gradeSection)) return false;
      const d = c.incidentDate.slice(0, 10);
      if (periodF !== 'all') {
        const [from, to] = periodRangeOf();
        if ((from && d < from) || (to && d > to)) return false;
      }
      if (flagF === 'overdue' && !(c.status !== 'Resolved' && daysSince(d) > overdueDays)) return false;
      if (flagF === 'waiting' && c.sanctionStatus !== 'Pending parent notice') return false;
      if (flagF === 'ending' && !sanctionEndingSoon(c)) return false;
      return true;
    });
    const t = new Map(list.map((c) => [c, caseTime(c)])); // each date read once
    return list.sort((a, b) => {
      const caseTime = (c: DisciplineCaseRecord) => t.get(c)!;
      if (caseSort === 'name') return a.studentName.localeCompare(b.studentName) || caseTime(b) - caseTime(a);
      if (caseSort === 'attention') {
        const ra = a.status === 'Resolved' ? 1 : 0;
        const rb = b.status === 'Resolved' ? 1 : 0;
        if (ra !== rb) return ra - rb;
        return caseTime(a) - caseTime(b); // waiting longest first
      }
      return caseSort === 'oldest' ? caseTime(a) - caseTime(b) : caseTime(b) - caseTime(a);
    });
  }, [cases, caseStatusFilter, quickSearch, caseSort, gradeF, periodF, fromF, toF, flagF, overdueDays]);

  const caseStatusCount = useMemo(() => {
    const m: Record<string, number> = { ALL: cases.length };
    cases.forEach((c) => {
      const k = bucketOf(c);
      m[k] = (m[k] ?? 0) + 1;
    });
    return m;
  }, [cases]);

  // ---------- manual add / edit student ----------
  const initialsOf = (name: string) =>
    name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'ST';
  const saveStudent = async (v: StudentFormValue) => {
    const gradeSection = `${v.grade} · ${v.section}`;
    const existing = studentFormFor !== 'new' ? studentFormFor : null;
    if (!existing) {
      const ok = await confirmChange({
        title: isTl ? `Idagdag si ${v.fullName}?` : `Add ${v.fullName}?`,
        rows: [
          { label: 'Student no.', after: v.studentNumber },
          { label: isTl ? 'Grade at section' : 'Grade & section', after: gradeSection },
          { label: isTl ? 'Magulang' : 'Parent', after: `${v.parentName} · ${v.parentPhone}` },
        ],
        confirmLabel: isTl ? 'Oo, idagdag' : 'Yes, add student',
        tone: 'success',
      });
      if (!ok) return;
      const stu: StudentRecord = {
        createdAt: new Date().toISOString(),
        studentNumber: v.studentNumber,
        fullName: v.fullName,
        initials: initialsOf(v.fullName),
        gradeSection,
        sectionCode: v.section,
        parentName: v.parentName,
        parentRelationship: v.parentRelationship,
        parentPhone: v.parentPhone,
        parentEmail: v.parentEmail,
        minorOffenseCount: 0,
        majorOffenseCount: 0,
        clearanceStatus: 'Cleared',
        priorOffensesEn: 'No prior offenses',
        priorOffensesTl: 'Walang nakaraang offense',
        enrolled: true,
        extra: v.extra,
      };
      setStudentSaving(true);
      const r = await insertStudentInDb(stu);
      setStudentSaving(false);
      if (r === 'duplicate')
        return onTriggerToast(isTl ? ` May estudyante na sa ${v.studentNumber}. Hanapin siya at i-edit.` : ` ${v.studentNumber} already exists. Find them and edit instead.`);
      if (r !== 'ok') return onTriggerToast(isTl ? ' Hindi na-save. I-check ang internet, tapos subukan ulit.' : ' Not saved. Check the internet, then try again.');
      setStudents((prev) => [stu, ...prev]);
      setStudentFormFor(null);
      soundFX.playSuccessCheck();
      onTriggerToast(isTl ? ` Naidagdag si ${v.fullName}.` : ` ${v.fullName} was added.`, undefined, {
        label: isTl ? 'Magtala ng kaso para sa kanya' : 'Log a case for them',
        run: () => {
          setSelectedStudentNumbers([stu.studentNumber]);
          setSubTab('add-report');
        },
      });
      return;
    }
    // edit: show only what changed
    const before = { fullName: existing.fullName, gradeSection: existing.gradeSection, parentName: existing.parentName, parentRelationship: existing.parentRelationship, parentPhone: existing.parentPhone, parentEmail: existing.parentEmail, extra: JSON.stringify(existing.extra ?? {}) };
    const after = { fullName: v.fullName, gradeSection, parentName: v.parentName, parentRelationship: v.parentRelationship, parentPhone: v.parentPhone, parentEmail: v.parentEmail, extra: JSON.stringify(v.extra) };
    const words: Record<string, string> = { fullName: isTl ? 'Pangalan' : 'Name', gradeSection: isTl ? 'Grade at section' : 'Grade & section', parentName: isTl ? 'Magulang' : 'Parent', parentRelationship: isTl ? 'Relasyon' : 'Relationship', parentPhone: 'Mobile', parentEmail: 'Email', extra: isTl ? 'Iba pang impormasyon' : 'Other information' };
    const changed = (Object.keys(after) as (keyof typeof after)[]).filter((k) => before[k] !== after[k]);
    if (!changed.length) {
      setStudentFormFor(null);
      return onTriggerToast(isTl ? 'Walang binago.' : 'Nothing changed.');
    }
    const ok = await confirmChange({
      title: isTl ? `I-save ang pagbabago kay ${existing.fullName}?` : `Save changes to ${existing.fullName}?`,
      rows: changed.map((k) => ({ label: words[k], before: k === 'extra' ? '…' : String(before[k] || '—'), after: k === 'extra' ? (isTl ? 'Binago' : 'Changed') : String(after[k] || '—') })),
      note: isTl ? 'Hindi gagalawin ang mga kaso at offense niya.' : 'Their cases and offenses are not changed.',
      confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save',
    });
    if (!ok) return;
    const patch = { full_name: v.fullName, initials: initialsOf(v.fullName), grade_section: gradeSection, section_code: v.section, parent_name: v.parentName, parent_relationship: v.parentRelationship, parent_phone: v.parentPhone, parent_email: v.parentEmail, extra: v.extra };
    setStudentSaving(true);
    const saved = await updateStudentDetailsInDb(existing.studentNumber, patch);
    setStudentSaving(false);
    if (!saved) return onTriggerToast(isTl ? ' Hindi na-save. I-check ang internet, tapos subukan ulit.' : ' Not saved. Check the internet, then try again.');
    const updated: StudentRecord = { ...existing, fullName: v.fullName, initials: patch.initials, gradeSection, sectionCode: v.section, parentName: v.parentName, parentRelationship: v.parentRelationship, parentPhone: v.parentPhone, parentEmail: v.parentEmail, extra: v.extra };
    setStudents((prev) => prev.map((x) => (x.studentNumber === existing.studentNumber ? updated : x)));
    if (selectedStudentProfile?.studentNumber === existing.studentNumber) setSelectedStudentProfile(updated);
    setStudentFormFor(null);
    soundFX.playSuccessCheck();
    onTriggerToast(isTl ? ` Na-save ang pagbabago kay ${v.fullName}.` : ` ${v.fullName} updated.`, async () => {
      const back = await updateStudentDetailsInDb(existing.studentNumber, { full_name: existing.fullName, initials: existing.initials, grade_section: existing.gradeSection, section_code: existing.sectionCode, parent_name: existing.parentName, parent_relationship: existing.parentRelationship, parent_phone: existing.parentPhone, parent_email: existing.parentEmail, extra: existing.extra ?? {} });
      if (back) setStudents((prev) => prev.map((x) => (x.studentNumber === existing.studentNumber ? existing : x)));
    });
  };

  const setEnrollment = async (stu: StudentRecord, enrolled: boolean, reason = '') => {
    const ok = await confirmChange({
      title: enrolled ? (isTl ? `Ibalik si ${stu.fullName} bilang naka-enroll?` : `Mark ${stu.fullName} as enrolled again?`) : isTl ? `Hindi na naka-enroll si ${stu.fullName}?` : `${stu.fullName} is not enrolled anymore?`,
      rows: [
        { label: 'Status', before: stu.enrolled === false ? (isTl ? 'Hindi na naka-enroll' : 'Not enrolled') : isTl ? 'Naka-enroll' : 'Enrolled', after: enrolled ? (isTl ? 'Naka-enroll' : 'Enrolled') : `${isTl ? 'Hindi na naka-enroll' : 'Not enrolled'} · ${reason}` },
        { label: isTl ? 'Mga kaso' : 'Cases', after: isTl ? 'Mananatili (para sa history at reports)' : 'Kept (for history and reports)' },
      ],
      note: enrolled ? undefined : isTl ? 'Hindi na siya mapipili sa bagong kaso.' : 'They cannot be picked for a new case.',
      confirmLabel: isTl ? 'Oo' : 'Yes',
      tone: enrolled ? 'success' : 'danger',
    });
    if (!ok) return;
    if (!(await setStudentEnrollmentInDb(stu.studentNumber, enrolled, reason)))
      return onTriggerToast(isTl ? ' Hindi na-save. I-check ang internet, tapos subukan ulit.' : ' Not saved. Check the internet, then try again.');
    const next = { ...stu, enrolled, leftReason: enrolled ? '' : reason };
    setStudents((prev) => prev.map((x) => (x.studentNumber === stu.studentNumber ? next : x)));
    setSelectedStudentProfile(null);
    setLeaveFor(null);
    onTriggerToast(
      enrolled ? (isTl ? ` Naka-enroll ulit si ${stu.fullName}.` : ` ${stu.fullName} is enrolled again.`) : isTl ? `Hindi na naka-enroll si ${stu.fullName} (${reason}).` : `${stu.fullName} is marked not enrolled (${reason}).`,
      async () => {
        if (await setStudentEnrollmentInDb(stu.studentNumber, stu.enrolled !== false, stu.leftReason || ''))
          setStudents((prev) => prev.map((x) => (x.studentNumber === stu.studentNumber ? stu : x)));
      }
    );
  };

  const moveUpSchoolYear = async () => {
    const g11 = students.filter((x) => x.enrolled !== false && /^Grade 11/.test(x.gradeSection)).length;
    const g12 = students.filter((x) => x.enrolled !== false && /^Grade 12/.test(x.gradeSection)).length;
    const ok = await confirmChange({
      title: isTl ? 'Umakyat ng school year?' : 'Move up a school year?',
      description: isTl ? 'Gawin ito isang beses, sa simula ng bagong school year.' : 'Do this once, at the start of a new school year.',
      rows: [
        { label: 'Grade 11', before: `${g11} ${isTl ? 'estudyante' : 'students'}`, after: 'Grade 12' },
        { label: 'Grade 12', before: `${g12} ${isTl ? 'estudyante' : 'students'}`, after: isTl ? 'Graduated (hindi na naka-enroll)' : 'Graduated (not enrolled)' },
        { label: isTl ? 'Mga kaso' : 'Cases', after: isTl ? 'Walang nagbabago' : 'Nothing changes' },
      ],
      note: isTl ? 'Pareho ang section pag-akyat. Kung may lumipat ng section, i-edit lang siya pagkatapos. May Undo.' : 'Sections stay the same. If someone changed section, edit them after. You can Undo.',
      confirmLabel: isTl ? 'Oo, umakyat' : 'Yes, move up',
      tone: 'danger',
    });
    if (!ok) return;
    const r = await moveUpSchoolYearInDb();
    if (!r) return onTriggerToast(isTl ? ' Hindi natuloy. I-check ang internet, tapos subukan ulit.' : ' Not done. Check the internet, then try again.');
    const prev = students;
    setStudents((list) =>
      list.map((x) =>
        x.enrolled === false
          ? x
          : /^Grade 12/.test(x.gradeSection)
          ? { ...x, enrolled: false, leftReason: 'Graduated' }
          : /^Grade 11/.test(x.gradeSection)
          ? { ...x, gradeSection: x.gradeSection.replace(/^Grade 11/, 'Grade 12') }
          : x
      )
    );
    soundFX.playSuccessCheck();
    onTriggerToast(isTl ? ` ${r.promoted} ang naging Grade 12 · ${r.graduated} ang graduated.` : ` ${r.promoted} moved to Grade 12 · ${r.graduated} graduated.`, async () => {
      if (await undoSchoolYearMoveInDb(r.id)) setStudents(prev);
    });
  };

  // Filtered Students for Sub-Tab 3
  /** "Grade 11 · ABM" → "11" */
  const gradeOf = (s: StudentRecord) => s.gradeSection.match(/Grade\s*(\d+)/i)?.[1] ?? '';
  /** one offense level per student (same rule as the badge on each row) */
  const offenseLevel = (s: StudentRecord): 'serious' | 'watch' | 'minor' | 'none' =>
    s.majorOffenseCount > 0 ? 'serious' : s.minorOffenseCount >= 2 ? 'watch' : s.minorOffenseCount === 1 ? 'minor' : 'none';
  const filteredDirectoryStudents = useMemo(() => {
    if (subTab !== 'students') return [] as StudentRecord[]; // only sort 1,000 students when that tab is open
    const q = quickSearch.trim().toLowerCase();
    const list = students.filter((s) => {
      if ((s.enrolled !== false) !== (enrolledFilter === 'enrolled')) return false;
      const matchesSec = sectionFilter === 'ALL' || s.sectionCode === sectionFilter;
      if (studentGrade !== 'ALL' && gradeOf(s) !== studentGrade) return false;
      if (studentOffense !== 'all' && offenseLevel(s) !== studentOffense) return false;
      const matchesSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q) ||
        s.gradeSection.toLowerCase().includes(q);
      return matchesSec && matchesSearch;
    });
    return sortStudents(list, studentSort);
  }, [students, sectionFilter, quickSearch, subTab, studentSort, enrolledFilter, studentGrade, studentOffense]);

  // section counts follow the chosen grade, so "ABM 33" means Grade 11 ABM when Grade 11 is picked
  const sectionOptions = useMemo(() => {
    const m = new Map<string, number>();
    students
      .filter((s) => studentGrade === 'ALL' || gradeOf(s) === studentGrade)
      .forEach((s) => m.set(s.sectionCode, (m.get(s.sectionCode) ?? 0) + 1));
    return [...m.entries()].filter(([k]) => k).sort((a, b) => a[0].localeCompare(b[0]));
  }, [students, studentGrade]);

  const DIR_PAGE_SIZE = 50;
  const dirPageCount = Math.max(1, Math.ceil(filteredDirectoryStudents.length / DIR_PAGE_SIZE));
  const safeDirPage = Math.min(dirPage, dirPageCount - 1);
  const pagedDirectoryStudents = filteredDirectoryStudents.slice(
    safeDirPage * DIR_PAGE_SIZE,
    (safeDirPage + 1) * DIR_PAGE_SIZE
  );

  // Validation logic for Sub-Tab 4 (Masterlist Preview & Fix Table)
  const existingStudentNumberSet = useMemo(
    () => new Set(students.map((s) => s.studentNumber)),
    [students]
  );

  // Per-row checks are cached by row object: editing one cell only re-checks that row,
  // so typing stays instant even with thousands of imported rows.
  const rowIssueCache = useRef(new WeakMap<MasterlistPreviewRow, { tl: boolean; issues: string[] }>());
  const validatedPreviewRows = useMemo(() => {
    // an ID that appears more than once flags EVERY copy: the office picks the right one (never a silent overwrite)
    const idCount = new Map<string, number>();
    for (const r of previewRows) {
      const k = r.studentNumber.trim();
      if (k) idCount.set(k, (idCount.get(k) ?? 0) + 1);
    }
    return previewRows.map((row) => {
      const cleanId = row.studentNumber.trim();
      const idIssues: string[] = [];
      if (!cleanId) {
        idIssues.push(isTl ? 'Walang Student ID' : 'Missing Student ID');
      } else if ((idCount.get(cleanId) ?? 0) > 1) {
        idIssues.push(isTl ? `Doble ang ID sa file (${cleanId}) — itama o burahin ang mali` : `Same ID twice in the file (${cleanId}) — fix or remove the wrong one`);
      }

      let cached = rowIssueCache.current.get(row);
      if (!cached || cached.tl !== isTl) {
        cached = { tl: isTl, issues: rowFieldIssues(row) };
        rowIssueCache.current.set(row, cached);
      }
      const issues = idIssues.length ? [...idIssues, ...cached.issues] : cached.issues;
      return { ...row, issues, isValid: issues.length === 0, isUpdate: !!cleanId && existingStudentNumberSet.has(cleanId) };
    });

    function rowFieldIssues(row: MasterlistPreviewRow): string[] {
      const issues: string[] = [];
      const digitsOnlyPhone = row.parentPhone.replace(/\D/g, '');
      if (!row.fullName.trim()) {
        issues.push(isTl ? 'Walang Pangalan' : 'Missing Student Name');
      }
      if (!row.parentName.trim()) {
        issues.push(isTl ? 'Walang Pangalan ng Magulang' : 'Missing Parent Name');
      }
      if (digitsOnlyPhone.length !== 11 || !digitsOnlyPhone.startsWith('09')) {
        issues.push(` ${checkPhMobile(row.parentPhone, isTl).message}`);
      }
      if (!/^Grade 1[12]\b/.test(row.gradeSection)) {
        issues.push(isTl ? 'Walang Grade Level (11 o 12)' : 'Missing Grade Level (11 or 12)');
      }
      if (!row.sectionCode.trim()) {
        issues.push(isTl ? 'Walang Section' : 'Missing Section');
      }
      const email = row.parentEmail.trim();
      const ec = checkEmail(email, isTl);
      if (!ec.ok) {
        issues.push(` ${email}: ${ec.message} ${isTl ? '(itama o burahin)' : '(fix or clear it)'}`);
      }
      return issues;
    }
  }, [previewRows, existingStudentNumberSet, isTl]);

  const totalPreviewErrors = useMemo(
    () => validatedPreviewRows.filter((r) => !r.isValid).length,
    [validatedPreviewRows]
  );
  const readyPreviewCount = validatedPreviewRows.length - totalPreviewErrors;

  // Only one page of rows is rendered at a time → 1,000+ row imports stay smooth on school PCs
  const PREVIEW_PAGE_SIZE = 50;
  const filteredPreviewRows = useMemo(
    () =>
      previewFilter === 'issues'
        ? validatedPreviewRows.filter((r) => !r.isValid)
        : previewFilter === 'ready'
        ? validatedPreviewRows.filter((r) => r.isValid)
        : validatedPreviewRows,
    [validatedPreviewRows, previewFilter]
  );
  const previewPageCount = Math.max(1, Math.ceil(filteredPreviewRows.length / PREVIEW_PAGE_SIZE));
  const safePreviewPage = Math.min(previewPage, previewPageCount - 1);
  const pagedPreviewRows = filteredPreviewRows.slice(
    safePreviewPage * PREVIEW_PAGE_SIZE,
    (safePreviewPage + 1) * PREVIEW_PAGE_SIZE
  );

  // ==========================================================================
  // HANDLER 1: SUBMIT NEW CASE REPORT (SINGLE OR MULTI-STUDENT)
  // ==========================================================================
  const handleCreateCaseReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentsList.length === 0) {
      soundFX.playError();
      onTriggerToast(
        isTl
          ? ' Pumili muna ng kahit isang estudyante.'
          : ' Please select at least one student from the list.'
      );
      return;
    }

    const isGroupSave = selectedStudentsList.length > 1;
    // Before → After preview per student (same escalation rule as below)
    const previewRows = selectedStudentsList.flatMap((stu) => {
      const pol = policyFor(stu);
      const { nextMinor, escalated } = outcomeFor(stu, pol);
      const nextMajor = escalated ? stu.majorOffenseCount + 1 : stu.majorOffenseCount;
      return [
        {
          label: isGroupSave ? `${stu.fullName} — ${isTl ? pol.titleTl : pol.titleEn}` : stu.fullName,
          before: `${stu.minorOffenseCount} minor · ${stu.majorOffenseCount} ${isTl ? 'malubha' : 'serious'}`,
          after: `${nextMinor} minor · ${nextMajor} ${isTl ? 'malubha' : 'serious'}${escalated ? `  ${outcomeFor(stu, pol).word}` : ''}`,
        },
      ];
    });
    const okCase = await confirmChange({
      title: isTl
        ? `I-save ang case para sa ${selectedStudentsList.length} estudyante?`
        : `Save case for ${selectedStudentsList.length} student(s)?`,
      description: isGroupSave
        ? isTl
          ? `Isang insidente · ${selectedStudentsList.length} hiwalay na case · ${incidentDate}`
          : `One incident · ${selectedStudentsList.length} separate cases · ${incidentDate}`
        : `${isTl ? selectedPolicy.titleTl : selectedPolicy.titleEn} · ${incidentDate}`,
      rows: previewRows,
      // Prevent mistakes (Golden Rule 7): same student + same offense + same day is probably filed twice
      note: (() => {
        const dupes = selectedStudentsList.filter((stu) => {
          const pol = policyFor(stu);
          return cases.some(
            (c) =>
              c.studentNumber === stu.studentNumber &&
              c.incidentDate === incidentDate &&
              c.offenseTitleEn === pol.titleEn &&
              !isWithdrawn(c)
          );
        });
        const dupeNote = dupes.length
          ? isTl
            ? `Babala: may kaso na sa parehong araw at offense para kay ${dupes.map((d) => d.fullName).join(', ')}. Baka doble ito.`
            : `Heads up: ${dupes.map((d) => d.fullName).join(', ')} already has a case for this offense on this day. This may be a duplicate.`
          : '';
        const smsNote = autoNotifyParent
          ? isTl
            ? 'Ihahanda rin ang SMS/Gmail notice para sa magulang.'
            : 'A parent SMS/Gmail notice will also be prepared.'
          : '';
        return [dupeNote, smsNote].filter(Boolean).join(' ') || undefined;
      })(),
      confirmLabel: isTl ? 'Oo, i-save ang case' : 'Yes, save case',
    });
    if (!okCase) return;

    const createdCases: DisciplineCaseRecord[] = [];
    // unique, increasing case numbers (the old random number could repeat inside a group)
    // never reuse a case number, even one from an old deleted case (its history would mix in)
    const everUsed = await fetchHighestCaseNumberEver();
    const lastCaseNo = cases.reduce((m, c) => {
      const n = Number(c.caseCode.split('-').pop());
      return Number.isFinite(n) && n > m ? n : m;
    }, Math.max(100, everUsed));
    const usedIncidents = new Set(cases.map((c) => c.incidentCode).filter(Boolean));
    let incidentCode: string | undefined;
    if (isGroupSave) {
      do {
        incidentCode = `INC-${incidentDate.replace(/-/g, '')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      } while (usedIncidents.has(incidentCode));
    }

    const failedStudents: StudentRecord[] = [];
    for (const [idx, stu] of selectedStudentsList.entries()) {
      const pol = policyFor(stu);
      const outcome = outcomeFor(stu, pol);
      const nextMinorCount = outcome.nextMinor;
      const escalatedToMajor = outcome.escalated;
      const nextMajorCount = escalatedToMajor
        ? stu.majorOffenseCount + 1
        : stu.majorOffenseCount;

      const severityLabel = outcome.severityLabel;

      const nextReportedBy = reportedBy.trim() || 'Guidance Office Staff';
      const details = [
        incidentTime && `Time: ${incidentTime}`,
        incidentPlace.trim() && `Place: ${incidentPlace.trim()}`,
        incidentWitness.trim() && `Witness/proof: ${incidentWitness.trim()}`,
      ]
        .filter(Boolean)
        .join(' · ');
      const nextNotes =
        [details, incidentNotes.trim()].filter(Boolean).join('\n');

      const newCase: DisciplineCaseRecord = {
        createdAt: new Date().toISOString(),
        caseCode: `CASE-${incidentDate.slice(0, 4)}-${String(lastCaseNo + 1 + idx).padStart(3, '0')}`,
        incidentCode,
        studentNumber: stu.studentNumber,
        studentName: stu.fullName,
        gradeSection: stu.gradeSection,
        offenseTitleEn: pol.titleEn,
        offenseTitleTl: pol.titleTl,
        severity: severityLabel,
        step: 'Reported',
        status: 'Open',
        reportedBy: nextReportedBy,
        incidentDate,
        notes: nextNotes,
        ...(affectedStudent && affectedStudent.studentNumber !== stu.studentNumber
          ? { affectedStudentNumber: affectedStudent.studentNumber, affectedStudentName: affectedStudent.fullName }
          : {}),
      };

      // save the case first; only count the offense if the database really has it
      const saved = await insertDisciplineCaseInDb(newCase);
      if (!saved) {
        failedStudents.push(stu);
        continue;
      }
      createdCases.push(newCase);

      // Upload any attached incident evidence photos/files
      if (incidentEvidenceFiles.length > 0) {
        for (const file of incidentEvidenceFiles) {
          try {
            await uploadEvidence(newCase.caseCode, file, 'Attached during initial case filing', nextReportedBy || 'Guidance Staff');
          } catch (evErr) {
            console.error('Failed to upload evidence for case:', newCase.caseCode, evErr);
          }
        }
      }


      const nextPriorEn = escalatedToMajor
        ? `${outcomeFor(stu, pol).severityLabel} (${pol.titleEn}) — Conference Required`
        : `${nextMinorCount} Minor Offense(s) (${pol.titleEn})`;
      const nextPriorTl = escalatedToMajor
        ? `${outcomeFor(stu, pol).severityLabel} (${pol.titleTl}) — Kailangan ang Magulang`
        : `${nextMinorCount} Minor Offense (${pol.titleTl})`;

      void updateStudentOffenseInDb(stu.studentNumber, {
        minor_offense_count: nextMinorCount,
        major_offense_count: nextMajorCount,
        prior_offenses_en: nextPriorEn,
        prior_offenses_tl: nextPriorTl,
      });

      setStudents((prev) =>
        prev.map((item) =>
          item.studentNumber === stu.studentNumber
            ? {
                ...item,
                minorOffenseCount: nextMinorCount,
                majorOffenseCount: nextMajorCount,
                priorOffensesEn: nextPriorEn,
                priorOffensesTl: nextPriorTl,
              }
            : item
        )
      );

      void insertActivityLogInDb({
        actor: 'Guidance Associate',
        actionEn: `Logged new case ${newCase.caseCode} for ${stu.fullName} (${pol.titleEn})${
          incidentCode ? ` · group incident ${incidentCode} with ${selectedStudentsList.length - 1} other student(s)` : ''
        }`,
        actionTl: `Nagtala ng bagong kaso ${newCase.caseCode} para kay ${stu.fullName}`,
        tag: newCase.caseCode,
        tone: escalatedToMajor ? 'rose' : 'cobalt',
      });
    }

    setCases((prev) => [...createdCases, ...prev]);

    if (failedStudents.length > 0) {
      soundFX.playError();
      // keep the form so nothing has to be typed again; only the unsaved students stay picked
      setSelectedStudentNumbers(failedStudents.map((x) => x.studentNumber));
      onTriggerToast(
        isTl
          ? ` Hindi na-save ang case ni ${failedStudents.map((x) => x.fullName).join(', ')}. I-check ang internet, tapos pindutin ulit ang "I-save". Nandito pa ang form.${
              createdCases.length ? ` (Na-save na ang ${createdCases.length}.)` : ''
            }`
          : ` The case for ${failedStudents.map((x) => x.fullName).join(', ')} was not saved. Check the internet, then press "Save case" again. The form is still here.${
              createdCases.length ? ` (${createdCases.length} other case(s) were saved.)` : ''
            }`
      );
      return;
    }

    // Golden Rule of Due Process:
    // Never jump to "Text parent" right upon filing! The case must follow sequential Due Process:
    // Step 1: Reported -> Step 2: Student Called -> Step 3: Explanation -> Step 4: Schedule Conference (only if serious/escalated).
    onTriggerToast(
      isTl
        ? `Naitala na ang Case Report (${createdCases
            .map((c) => c.caseCode)
            .join(', ')}) para kay ${createdCases.map((c) => c.studentName).join(', ')}! Naka-queue na sa Step 2: Tawagin ang Estudyante.`
        : `Case Report (${createdCases
            .map((c) => c.caseCode)
            .join(', ')}) saved for ${createdCases.map((c) => c.studentName).join(', ')}! Proceed to Step 2: Call Student.`,
      undefined // no premature action
    );

    setSelectedStudentNumbers([]);
    setPolicyOverride({});
    setReportedBy('');
    setIncidentNotes('');
    setIncidentTime('');
    setIncidentPlace('');
    setIncidentWitness('');
    setIncidentEvidenceFiles([]);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setLastSavedCodes(createdCases.map((c) => c.caseCode));
    if (prefill && onPrefillSaved) onPrefillSaved(createdCases.map((c) => c.caseCode));
    setSubTab('case-board');
    // Rekta sa Due Process (open the newly created case drawer directly)
    if (createdCases.length > 0) {
      setOpenCaseCode(createdCases[0].caseCode);
    }
  };

  // ==========================================================================
  // HANDLER 2: UPDATE CASE STATUS ON BOARD
  // ==========================================================================

  /** "New" only until the student is called; after that the case is "In progress" (badge matches the stepper) */
  const caseBadgeWord = (c: DisciplineCaseRecord): string =>
    c.status === 'Open' && !!c.step && c.step !== 'Reported'
      ? isTl ? 'Ginagawa' : 'In progress'
      : statusWord(c.status);
  // One plain word per status (Golden Rule 3)
  const statusWord = (st: CaseStatusType): string =>
    ((isTl
      ? {
          Open: 'Bago',
          'Under Review': 'Sinusuri',
          'Conference Scheduled': 'Kailangan ng conference',
          'Pending Reschedule': 'Kailangan ng bagong araw',
          'Conference Attended': 'Tapos ang conference',
          'Sanction In Progress': 'May sanction',
          Resolved: 'Tapos na',
        }
      : {
          Open: 'New',
          'Under Review': 'Reviewing',
          'Conference Scheduled': 'Needs conference',
          'Pending Reschedule': 'Needs new date',
          'Conference Attended': 'Conference done',
          'Sanction In Progress': 'Serving sanction',
          Resolved: 'Done',
        }) as Record<string, string>)[st] ?? st;
  // 'Incident: INC-...' is a hidden link line used until the incident_code column exists
  const INCIDENT_MARKER = /\n?Incident: INC-[\w-]+/;
  const hideIncidentMarker = (notes: string) => notes.replace(INCIDENT_MARKER, '');
  const keepIncidentMarker = (oldNotes: string, newNotes: string) => {
    const m = oldNotes.match(INCIDENT_MARKER);
    return m ? newNotes + m[0] : newNotes;
  };
  const severityInfo = (sev: string): { word: string; cls: string } => {
    const red = 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300';
    if (/grave/i.test(sev)) return { word: isTl ? 'Mabigat na offense (grave)' : 'Grave offense', cls: red };
    if (/less serious/i.test(sev)) return { word: isTl ? 'Medyo seryosong offense' : 'Less serious offense', cls: red };
    if (/serious/i.test(sev)) return { word: isTl ? 'Seryosong offense' : 'Serious offense', cls: red };
    // check "2nd" before "major": "2nd Minor · Next is Major" is still a minor offense
    if (/escalat/i.test(sev) || (/major/i.test(sev) && !/minor/i.test(sev)))
      return {
        word: isTl ? 'Malaking offense' : 'Major offense',
        cls: 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300',
      };
    if (/2nd/i.test(sev))
      return {
        word: isTl ? 'Ika-2 minor' : '2nd minor',
        cls: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300',
      };
    return {
      word: isTl ? 'Unang minor' : '1st minor',
      cls: 'bg-[#EAF3FF] dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#409CFF]',
    };
  };
  /** "today", "yesterday", "5 days ago" — how long a case has been waiting */
  const caseAge = (iso: string): { text: string; days: number } => {
    const d = new Date(iso + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.max(0, Math.round((today.getTime() - d.getTime()) / 86400000));
    if (isNaN(days)) return { text: '', days: 0 };
    return {
      days,
      text:
        days === 0
          ? isTl ? 'ngayon' : 'today'
          : days === 1
          ? isTl ? 'kahapon' : 'yesterday'
          : isTl ? `${days} araw na` : `${days} days ago`,
    };
  };
  const nextConfByCase = useMemo(() => {
    const t = todayISO();
    const m = new Map<string, ParentAppointmentItem>();
    [...appointments]
      .filter((a) => a.status === 'Scheduled' && a.date >= t)
      .sort(byDateTime)
      .forEach((a) => !m.has(a.caseId) && m.set(a.caseId, a));
    return m;
  }, [appointments]);
  const confDateFmt = useMemo(
    () => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    [isTl]
  );
  const confText = (a: ParentAppointmentItem) =>
    `${a.date === todayISO() ? (isTl ? 'ngayon' : 'today') : confDateFmt.format(new Date(a.date + 'T00:00:00'))} · ${a.timeSlot.split('–')[0].trim()}`;

  /** The one obvious next step for a case (Golden Rule 1) */
  const nextStepFor = (c: DisciplineCaseRecord): { hint: string; action: 'text' | 'done' | 'schedule' | 'flow' | null; button?: string } => {
    if (c.status === 'Resolved') return { hint: '', action: null };
    if (c.status === 'Conference Scheduled') {
      const conf = nextConfByCase.get(c.caseCode);
      if (conf)
        return {
          hint: isTl ? `Conference: ${confText(conf)}${conf.noticeReceived ? ' · alam na ng magulang' : ''}` : `Conference: ${confText(conf)}${conf.noticeReceived ? ' · parent knows' : ''}`,
          action: null,
        };
      return {
        hint: isTl ? 'Susunod: mag-schedule ng conference sa magulang' : 'Next: schedule a conference with the parent',
        action: onScheduleConference ? 'schedule' : 'text',
      };
    }
    // otherwise: the next step of the 8-step flow (opens in the case details)
    const nx = flowState(c).next;
    const words: Record<string, [string, string]> = {
      'Student Called': ['Next: call the student', 'Susunod: tawagin ang estudyante'],
      Explanation: ['Next: write the student’s explanation', 'Susunod: isulat ang paliwanag ng estudyante'],
      'Schedule Conference': ['Next: schedule conference with parent', 'Susunod: mag-isyu ng patawag sa magulang'],
      'Parent Conference Attendance': ['Next: parent conference hearing', 'Susunod: pagharap ng magulang sa conference'],
      'Parent Notified': ['Next: let the parent know', 'Susunod: ipaalam sa magulang'],
      Decision: ['Next: record the decision and sanction', 'Susunod: itala ang desisyon at sanction'],
      'Follow-Up': ['Next: start the follow-up', 'Susunod: simulan ang follow-up'],
      Closed: ['Next: close the case when the sanction is done', 'Susunod: isara kapag tapos na ang sanction'],
    };
    const w = nx && words[nx] ? words[nx] : null;
    const buttons: Record<string, [string, string]> = {
      'Student Called': ['Call student', 'Tawagin'],
      Explanation: ['Write explanation', 'Isulat ang paliwanag'],
      'Schedule Conference': ['Schedule conference', 'Iskedyul conference'],
      'Parent Conference Attendance': ['Conference hearing', 'Pagharap ng magulang'],
      'Parent Notified': ['Parent notified?', 'Alam na ng magulang?'],
      Decision: ['Record decision', 'Itala ang desisyon'],
      'Follow-Up': ['Start follow-up', 'Simulan ang follow-up'],
      Closed: ['Close case', 'Isara ang kaso'],
    };
    const btnTuple = nx && buttons[nx] ? buttons[nx] : undefined;
    // one main button on the card: it opens the case at its next step
    return { hint: w ? w[isTl ? 1 : 0] : '', action: nx ? 'flow' : null, button: btnTuple ? btnTuple[isTl ? 1 : 0] : undefined };
  };
  /** Colour of the bar on the card's left edge: how serious the case is */
  const stripeFor = (c: DisciplineCaseRecord): string => {
    if (c.status === 'Resolved') return 'bg-emerald-500';
    const cls = severityInfo(c.severity).cls;
    if (cls.includes('rose')) return 'bg-rose-500';
    if (cls.includes('amber')) return 'bg-amber-400';
    return 'bg-[#2557BE]';
  };
  const openComposerForCase = (c: DisciplineCaseRecord) => {
    const stu = students.find((x) => x.studentNumber === c.studentNumber);
    if (!stu) {
      onTriggerToast(
        isTl
          ? ' Wala sa masterlist ang estudyanteng ito. I-import muna ang masterlist (Mga Kaso › I-import ang masterlist) para makuha ang number ng magulang.'
          : ' This student is not in the masterlist. Import the masterlist first (Cases › Import masterlist) to get the parent number.'
      );
      return;
    }
    onOpenParentComposer({
      studentName: stu.fullName,
      gradeSection: stu.gradeSection,
      parentName: stu.parentName,
      parentPhone: stu.parentPhone,
      parentEmail: stu.parentEmail,
      scheduleText: '',
      caseCode: c.caseCode,
    });
  };

  const prettyTime = (iso: string): string => {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleString(isTl ? 'fil-PH' : 'en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
  };
  // one shared formatter: creating Intl formatters per row is slow on school PCs
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    [isTl]
  );
  const prettyDate = (iso: string): string => {
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d.getTime()) ? iso : dateFmt.format(d);
  };

  const handleUpdateCaseStatus = async (
    caseItem: DisciplineCaseRecord,
    nextStatus: CaseStatusType
  ) => {
    const nextStep = nextStatus === 'Open' ? (caseItem.decidedAt ? 'Decision' : caseItem.explanation ? 'Schedule Conference' : 'Student Called') : (nextStatus === 'Resolved' ? 'Closed' : caseItem.step);
    const ok = await confirmChange({
      title: isTl ? (nextStatus === 'Open' ? `Muling buksan ang ${caseItem.caseCode}?` : `Isara ang ${caseItem.caseCode}?`) : (nextStatus === 'Open' ? `Reopen ${caseItem.caseCode}?` : `Close ${caseItem.caseCode}?`),
      description: `${caseItem.studentName} (${caseItem.gradeSection}) · ${
        isTl ? caseItem.offenseTitleTl : caseItem.offenseTitleEn
      }`,
      rows: [
        { label: 'Status', before: statusWord(caseItem.status), after: statusWord(nextStatus) },
        ...(nextStatus === 'Open' ? [{ label: isTl ? 'Babalik sa Hakbang' : 'Return to Step', after: isTl ? 'Aktibong Due Process' : 'Active Due Process' }] : []),
      ],
      confirmLabel: isTl ? (nextStatus === 'Open' ? 'Oo, muling buksan' : 'Oo, isara') : (nextStatus === 'Open' ? 'Yes, reopen' : 'Yes, close'),
      tone: nextStatus === 'Resolved' ? 'success' : 'primary',
    });
    if (!ok) return;

    setCases((prev) =>
      prev.map((c) => (c.caseCode === caseItem.caseCode ? { ...c, status: nextStatus, step: nextStep as DisciplineCaseRecord['step'], closedAt: nextStatus === 'Resolved' ? c.closedAt ?? new Date().toISOString() : null } : c))
    );
    const savedStatus = await updateCaseFlowInDb(caseItem.caseCode, {
      status: nextStatus,
      step: nextStep,
      closed_at: nextStatus === 'Resolved' ? new Date().toISOString() : null,
    });
    if (!savedStatus) {
      setCases((prev) => prev.map((c) => (c.caseCode === caseItem.caseCode ? { ...c, status: caseItem.status, closedAt: caseItem.closedAt ?? null } : c)));
      onTriggerToast(
        isTl
          ? ' Hindi nabago ang status. I-check ang internet, tapos subukan ulit.'
          : ' The status was not changed. Check the internet, then try again.'
      );
      return;
    }
    void insertActivityLogInDb({
      actor: 'Guidance Associate',
      actionEn: `Changed status: ${statusWord(caseItem.status)} → ${statusWord(nextStatus)}`,
      actionTl: `Pinalitan ang status: ${statusWord(caseItem.status)} → ${statusWord(nextStatus)}`,
      tag: caseItem.caseCode,
      tone: nextStatus === 'Resolved' ? 'emerald' : 'cobalt',
    });
    const prevStatus = caseItem.status;
    onTriggerToast(
      isTl
        ? ` ${caseItem.studentName}: ${statusWord(nextStatus)} na ang kaso.`
        : ` ${caseItem.studentName}: case is now "${statusWord(nextStatus)}".`,
      () => {
        setCases((prev) =>
          prev.map((c) => (c.caseCode === caseItem.caseCode ? { ...c, status: prevStatus, closedAt: caseItem.closedAt ?? null } : c))
        );
        void updateDisciplineCaseStatusInDb(caseItem.caseCode, prevStatus);
        void insertActivityLogInDb({
          actor: 'Guidance Associate',
          actionEn: `Undid status change → ${statusWord(prevStatus)}`,
          actionTl: `Ibinalik ang status → ${statusWord(prevStatus)}`,
          tag: caseItem.caseCode,
          tone: 'amber',
        });
      }
    );
    if (openCaseCode === caseItem.caseCode) void loadCaseHistory(caseItem.caseCode);
  };

  // ==========================================================================
  // CASE DETAILS PANEL
  // ==========================================================================
  const openCase = cases.find((c) => c.caseCode === openCaseCode) ?? null;
  const openCaseStudent = openCase
    ? students.find((s) => s.studentNumber === openCase.studentNumber) ?? null
    : null;

  const loadCaseHistory = async (code: string) => {
    setCaseHistory('loading');
    const rows = await fetchCaseHistoryFromDb(code);
    // a case number used by an old (deleted) case must not mix its history in: keep entries from this case's start
    const c = cases.find((x) => x.caseCode === code);
    const start = c?.createdAt ? Date.parse(c.createdAt) - 60_000 : NaN;
    setCaseHistory(rows && Number.isFinite(start) ? rows.filter((h) => Date.parse(h.when) >= start) : rows);
  };

  const openCaseDetails = (c: DisciplineCaseRecord) => {
    soundFX.playStepUnlock();
    setOpenCaseCode(c.caseCode);
    setCaseEditing(false);
    void loadCaseHistory(c.caseCode);
  };

  /** the handbook sanction for the 1st / 2nd / 3rd time this student did this offense */
  const suggestedSanctionFor = (c?: DisciplineCaseRecord | null): string => {
    if (!c || !c.offenseTitleEn) return '';
    const offenseTitleClean = (c.offenseTitleEn || '').trim().toLowerCase();
    const rule = HANDBOOK.find((r) => (r.titleEn || '').trim().toLowerCase() === offenseTitleClean);
    if (!rule) return '';
    const nth = cases.filter((x) => x.studentNumber === c.studentNumber && (x.offenseTitleEn || '').trim().toLowerCase() === offenseTitleClean && x.incidentDate <= c.incidentDate).length;
    const pick = nth >= 3 ? [rule.sanction3rdEn, rule.sanction3rdTl] : nth === 2 ? [rule.sanction2ndEn, rule.sanction2ndTl] : [rule.sanction1stEn, rule.sanction1stTl];
    return isTl ? pick[1] || pick[0] || '' : pick[0] || pick[1] || '';
  };

  /** Statement Station: the student's statement is the case's explanation step */
  const saveStationStatement = async (c: DisciplineCaseRecord, text: string): Promise<boolean> => {
    const ok = await updateCaseFlowInDb(c.caseCode, { explanation: text, step: 'Explanation' });
    if (!ok) return false;
    stationBefore.current = c;
    setCases((prev) => prev.map((x) => (x.caseCode === c.caseCode ? { ...x, explanation: text, step: 'Explanation' } : x)));
    void insertActivityLogInDb({ actor: 'Student (Statement Station)', actionEn: `${c.caseCode}: Student typed their statement at the Statement Station`, actionTl: `${c.caseCode}: Nag-type ang estudyante ng salaysay sa Statement Station`, tag: c.caseCode, tone: 'blue' }).then(() => void loadCaseHistory(c.caseCode));
    return true;
  };
  const closeStation = () => {
    setStationCase(null);
    const before = stationBefore.current;
    stationBefore.current = null;
    soundFX.playSuccessCheck();
    if (!before) return onTriggerToast(isTl ? 'Isinara ang Statement Station. Walang na-save.' : 'Statement Station closed. Nothing was saved.');
    onTriggerToast(isTl ? ' Na-save ang salaysay ng estudyante. Susunod: ipaalam sa magulang.' : ' The student’s statement is saved. Next: let the parent know.', async () => {
      if (await updateCaseFlowInDb(before.caseCode, { explanation: before.explanation || null, step: before.step ?? 'Reported' })) setCases((prev) => prev.map((x) => (x.caseCode === before.caseCode ? { ...x, explanation: before.explanation, step: before.step } : x)));
    });
  };

  /** one step of the 7-step flow: save → show → Undo */
  const applyFlow = async (c: DisciplineCaseRecord, a: FlowAction) => {
    const now = new Date().toISOString();
    let db: Record<string, unknown> = {};
    let local: Partial<DisciplineCaseRecord> = {};
    let msg = '';
    if (a.kind === 'absent') {
      // nothing changes in the case; only the attempt goes to the audit trail
      void insertActivityLogInDb({
        actor: 'Guidance Associate',
        actionEn: `${c.caseCode}: Tried to call the student, absent today`,
        actionTl: `${c.caseCode}: Sinubukang tawagin ang estudyante, absent ngayon`,
        tag: c.caseCode,
        tone: 'amber',
      }).then(() => void loadCaseHistory(c.caseCode));
      onTriggerToast(isTl ? 'Naitala: absent ang estudyante. Subukan ulit bukas.' : 'Saved: the student was absent. Try again tomorrow.');
      return;
    }
    if (a.kind === 'proceed_without_parent') {
      const ok = await confirmChange({
        title: isTl ? 'Tumuloy nang wala ang magulang?' : 'Continue without the parent?',
        description: `${c.studentName} · ${c.caseCode}`,
        rows: [
          { label: isTl ? 'Mga patawag' : 'Summons sent', after: String(appointments.filter((x) => x.caseId === c.caseCode).length) },
          { label: isTl ? 'Dahilan' : 'Reason', after: a.reason },
        ],
        note: isTl
          ? 'Itatala ito sa Audit Trail. Ipaalam pa rin sa magulang ang desisyon.'
          : 'This goes to the Audit Trail. The parent must still be told the decision.',
        confirmLabel: isTl ? 'Oo, tumuloy' : 'Yes, continue',
      });
      if (!ok) return;
      db = { proceeded_without_parent: true, parent_conference_status: 'No-Show', status: 'Open', step: 'Parent Conference Attendance' };
      local = { proceededWithoutParent: true, parentConferenceStatus: 'No-Show', status: 'Open', step: 'Parent Conference Attendance' };
      msg = isTl ? ' Tumuloy nang wala ang magulang. Susunod: Desisyon.' : ' Continued without the parent. Next: Decision.';
    } else if (a.kind === 'call') {
      db = { student_called_at: now, step: 'Student Called' };
      local = { studentCalledAt: now, step: 'Student Called' };
      msg = isTl ? ' Naitala: natawag ang estudyante. Susunod: isulat ang paliwanag niya.' : ' Saved: student called. Next: write their explanation.';
    } else if (a.kind === 'explanation') {
      const text = a.refused ? '(The student chose not to give a statement.)' : a.text;
      const noticedAt = a.noticed ? c.complaintNoticedAt || now : c.complaintNoticedAt || null;
      db = { explanation: text, explanation_refused: !!a.refused, explanation_present: a.present ?? null, complaint_noticed_at: noticedAt, step: 'Explanation' };
      local = { explanation: text, explanationRefused: !!a.refused, explanationPresent: a.present, complaintNoticedAt: noticedAt, step: 'Explanation' };
      msg = a.refused
        ? isTl ? ' Naitala: ayaw magbigay ng pahayag ng estudyante. Tuloy ang kaso.' : ' Saved: the student chose not to explain. The case moves on.'
        : isTl ? ' Na-save ang paliwanag. Susunod na hakbang.' : ' Explanation saved. On to the next step.';
    } else if (a.kind === 'schedule_conference') {
      const currentCount = appointments.filter((x) => x.caseId === c.caseCode).length || c.summonsCount || (c.conferenceScheduledAt ? 1 : 0);
      const nextCount = currentCount + 1;
      const historyItem = {
        attempt: nextCount,
        scheduledAt: now,
        targetDate: a.targetDate || now,
        outcome: 'Pending' as const,
      };
      const updatedHistory = [...(c.summonsHistory || []), historyItem];

      // If scheduled inline inside Step 4, create/update the appointment in Parents Hub & send notice
      if (a.inlineSchedule) {
        const stu = students.find((s) => s.studentNumber === c.studentNumber);
        const aptId = `APT-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
        const newApt: ParentAppointmentItem = {
          id: aptId,
          caseId: c.caseCode,
          studentName: c.studentName,
          studentNumber: c.studentNumber,
          initials: stu?.initials || 'ST',
          gradeSection: c.gradeSection,
          offenseTypeEn: c.offenseTitleEn,
          offenseTypeTl: c.offenseTitleTl,
          severityTagEn: c.severity,
          severityTagTl: c.severity,
          severityTone: /serious|grave|major|escalat/i.test(c.severity) ? 'rose' : /2nd|consecutive/i.test(c.severity) ? 'amber' : 'cobalt',
          parentName: stu?.parentName || 'Parent / Guardian',
          relationship: stu?.parentRelationship || 'Parent / Guardian',
          parentPhone: stu?.parentPhone || '',
          parentEmail: stu?.parentEmail || '',
          timeSlot: a.inlineSchedule.timeSlot,
          date: a.inlineSchedule.date,
          status: 'Scheduled',
          noticeReceived: false,
          reminderSentAt: null,
          rescheduledFrom: a.inlineSchedule.rescheduleFromId,
        };

        void insertAppointmentInDb(newApt);
        if (a.inlineSchedule.rescheduleFromId) {
          void updateAppointmentInDb(a.inlineSchedule.rescheduleFromId, { status: 'Rescheduled' });
        }
        setAppointments?.((list) => [
          ...list.map((item) =>
            a.inlineSchedule?.rescheduleFromId && item.id === a.inlineSchedule.rescheduleFromId
              ? { ...item, status: 'Rescheduled' as const }
              : item
          ),
          newApt,
        ]);

        if (a.inlineSchedule.sendNow && stu) {
          void sendParentMessage({
            channel: a.inlineSchedule.channel,
            phone: stu.parentPhone,
            email: stu.parentEmail,
            message: a.inlineSchedule.message,
            kind: a.inlineSchedule.rescheduleFromId ? 'reschedule' : 'notice',
            parentName: stu.parentName,
            studentName: c.studentName,
            gradeSection: c.gradeSection,
            caseCode: c.caseCode,
            appointmentCode: aptId,
            scheduleText: a.targetDate || `${a.inlineSchedule.date} ${a.inlineSchedule.timeSlot}`,
          });
        }
      }

      db = {
        conference_scheduled_at: now,
        conference_target_date: a.targetDate || now,
        parent_conference_status: 'Pending',
        status: 'Conference Scheduled',
        step: 'Schedule Conference',
      };
      local = {
        conferenceScheduledAt: now,
        conferenceTargetDate: a.targetDate || now,
        summonsCount: nextCount,
        summonsHistory: updatedHistory,
        parentConferenceStatus: 'Pending',
        status: 'Conference Scheduled' as const,
        step: 'Schedule Conference' as const,
      };
      msg = isTl
        ? `Naitala ang Ika-${nextCount} Patawag (${a.targetDate || ''}). Susunod: Step 5 (Pagharap ng magulang).`
        : `Scheduled Summons #${nextCount} (${a.targetDate || ''}). Advanced to Step 5 (Parent attendance).`;
    } else if (a.kind === 'conference_outcome') {
      const isNoShow = a.conferenceStatus === 'No-Show';
      const currentCount = appointments.filter((x) => x.caseId === c.caseCode).length || c.summonsCount || 1;
      const updatedHistory = (c.summonsHistory || []).map((h, i) =>
        i === (c.summonsHistory || []).length - 1 ? { ...h, outcome: a.conferenceStatus } : h
      );

      db = {
        parent_notified_at: now,
        parent_notified_how: a.how,
        parent_conference_status: a.conferenceStatus,
        status: isNoShow ? 'Pending Reschedule' : 'Conference Attended',
        step: isNoShow ? 'Schedule Conference' : 'Parent Conference Attendance',
        ...(isNoShow ? {} : { conference_attended_by: a.attendedBy ?? null, conference_minutes: a.notes || null }),
      };
      local = {
        parentNotifiedAt: now,
        parentNotifiedHow: a.how,
        parentConferenceStatus: a.conferenceStatus,
        summonsHistory: updatedHistory,
        status: (isNoShow ? 'Pending Reschedule' : 'Conference Attended') as DisciplineCaseRecord['status'],
        step: (isNoShow ? 'Schedule Conference' : 'Parent Conference Attendance') as DisciplineCaseRecord['step'],
        ...(isNoShow ? {} : { conferenceAttendedBy: a.attendedBy, conferenceMinutes: a.notes || undefined }),
      };
      // the conference itself (Parents page, reminders, time slots) must show the same answer
      const apt = appointments
        .filter((x) => x.caseId === c.caseCode && x.status === 'Scheduled')
        .sort((x, y) => (y.date + y.timeSlot).localeCompare(x.date + x.timeSlot))[0];
      if (apt) {
        const aptStatus = isNoShow ? 'Did Not Attend' : 'Attended';
        setAppointments?.((list) => list.map((x) => (x.id === apt.id ? { ...x, status: aptStatus } : x)));
        void updateAppointmentInDb(apt.id, { status: aptStatus });
      }
      msg = isNoShow
        ? isTl
          ? `Naitala: hindi dumalo ang magulang (ika-${currentCount} patawag). Susunod: pumili ng bagong araw.`
          : `Saved: the parent did not attend (summons ${currentCount}). Next: pick a new date.`
        : isTl
        ? 'Naitala: dumating ang magulang. Susunod: Desisyon.'
        : 'Saved: the parent attended. Next: Decision.';
    } else if (a.kind === 'notified') {
      const isNoShow = a.conferenceStatus === 'No-Show';
      const activate = !isNoShow && c.sanctionStatus === 'Pending parent notice';
      db = {
        parent_notified_at: now,
        parent_notified_how: a.how,
        parent_conference_status: a.conferenceStatus || 'Attended',
        step: c.decidedAt ? 'Decision' : 'Parent Notified',
        ...(activate ? { sanction_status: 'Active', status: 'Sanction In Progress' } : {})
      };
      local = {
        parentNotifiedAt: now,
        parentNotifiedHow: a.how,
        parentConferenceStatus: a.conferenceStatus || 'Attended',
        step: c.decidedAt ? 'Decision' : 'Parent Notified',
        ...(activate ? { sanctionStatus: 'Active' as const, status: 'Sanction In Progress' as const } : {})
      };
      msg = isNoShow
        ? isTl ? ' Naitala: No-Show ang magulang. Mag-issue ng 2nd summons o i-reschedule.' : ' Recorded: Parent was a no-show. Issue a 2nd summons or reschedule.'
        : activate
        ? isTl ? ' Dumalo ang magulang — nagsimula na ang sanction.' : ' Parent attended — the sanction has started.'
        : isTl ? ' Dumalo/Naabisuhan ang magulang. Susunod: itala ang desisyon.' : ' Parent attended/notified. Next: record the decision.';
    } else if (a.kind === 'appeal') {
      db = { appeal_requested_at: now, appeal_by: a.by, appeal_reason: a.reason, appeal_result: a.result, appeal_note: a.note || null };
      local = { appealRequestedAt: now, appealBy: a.by, appealReason: a.reason, appealResult: a.result, appealNote: a.note || null };
      msg = isTl ? 'Naitala ang apela. Kung binago ang parusa, i-edit ang kaso.' : 'Appeal saved. If the sanction changed, edit the case.';
    } else if (a.kind === 'decision') {
      const notified = !!c.parentNotifiedAt;
      const appr = a.principalApprovedBy ? { principal_approved_by: a.principalApprovedBy, principal_approved_at: now } : {};
      db = { ...appr, decision: a.decision, sanction: a.sanction, sanction_end_date: a.sanctionEndDate || null, decided_at: now, step: notified ? 'Decision' : c.step || 'Explanation', sanction_status: notified ? 'Active' : 'Pending parent notice', ...(notified ? { status: 'Sanction In Progress' } : {}) };
      local = { ...(a.principalApprovedBy ? { principalApprovedBy: a.principalApprovedBy, principalApprovedAt: now } : {}), decision: a.decision, sanction: a.sanction, sanctionEndDate: a.sanctionEndDate || null, decidedAt: now, step: (notified ? 'Decision' : c.step || 'Explanation') as DisciplineCaseRecord['step'], sanctionStatus: notified ? 'Active' : 'Pending parent notice', ...(notified ? { status: 'Sanction In Progress' as const } : {}) };
      msg = notified
        ? isTl ? ' Na-save ang desisyon. Nagsimula na ang sanction.' : ' Decision saved. The sanction has started.'
        : isTl ? ' Na-save ang desisyon. Maghihintay ang sanction hanggang malaman ng magulang.' : ' Decision saved. The sanction waits until the parent is notified.';
    } else if (a.kind === 'followup') {
      const sanctionDone = a.sanctionDone ?? false;
      db = {
        step: 'Follow-Up',
        status: sanctionDone ? 'Open' : 'Sanction In Progress', // closing is its own step (Step 8)
        sanction_status: sanctionDone ? 'Done' : 'Active',
      };
      local = {
        step: 'Follow-Up',
        status: (sanctionDone ? 'Open' : 'Sanction In Progress') as DisciplineCaseRecord['status'],
        sanctionStatus: (sanctionDone ? 'Done' : 'Active') as DisciplineCaseRecord['sanctionStatus'],
      };
      msg = sanctionDone
        ? isTl ? ' Natapos na ang sanction. Susunod: isara ang kaso.' : ' Sanction done. Next: close the case.'
        : isTl ? ' Nasa follow-up na. Kasalukuyang ginagawa ang sanction.' : ' In follow-up. Sanction is currently in progress.';
    } else {
      const ok = await confirmChange({
        title: isTl ? `Isara ang kaso ni ${c.studentName}?` : `Close ${c.studentName}'s case?`,
        rows: [
          { label: 'Status', before: statusWord(c.status), after: statusWord('Resolved') },
          ...(c.sanction ? [{ label: 'Sanction', after: isTl ? 'Tapos na' : 'Done' }] : []),
        ],
        confirmLabel: isTl ? 'Oo, isara' : 'Yes, close',
        tone: 'success',
      });
      if (!ok) return;
      const notes = a.kind === 'close' ? a.counselingNotes : undefined;
      db = { step: 'Closed', status: 'Resolved', closed_at: now, counseling_notes: notes || null, ...(c.sanction ? { sanction_status: 'Done' } : {}) };
      local = { step: 'Closed', status: 'Resolved', closedAt: now, counselingNotes: notes, ...(c.sanction ? { sanctionStatus: 'Done' as const } : {}) };
      msg = isTl ? ` Sarado na ang kaso ni ${c.studentName}. Nasa Closed Cases na ito.` : ` ${c.studentName}'s case is closed. You can find it in Closed Cases.`;
    }
    setFlowBusy(true);
    const taskId = startLoading({
      titleEn: 'Updating case due process...',
      titleTl: 'Inia-update ang due process ng kaso...',
      messageEn: 'Saving hearing records & syncing with database...',
      messageTl: 'Inililigtas ang tala ng pagdinig sa secure database...',
    });
    const saved = await updateCaseFlowInDb(c.caseCode, db);
    setFlowBusy(false);
    stopLoading(taskId);
    if (!saved) return onTriggerToast(isTl ? ' Hindi na-save. I-check ang internet, tapos subukan ulit.' : ' Not saved. Check the internet, then try again.');
    setCases((prev) => prev.map((x) => (x.caseCode === c.caseCode ? { ...x, ...local } : x)));
    soundFX.playSuccessCheck();

    // Auto-Out from Due Process modal upon closing case, with clear success feedback
    if (a.kind === 'close') {
      setOpenCaseCode(null);
      setSubTab('closed-cases');
    }
    const stepWords: Record<FlowAction['kind'], [string, string]> = {
      absent: ['Student absent', 'Absent ang estudyante'],
      proceed_without_parent: [`Continued without the parent after repeated no-shows · Reason: ${a.kind === 'proceed_without_parent' ? a.reason : ''}`, `Tumuloy nang wala ang magulang · Dahilan: ${a.kind === 'proceed_without_parent' ? a.reason : ''}`],
      call: ['Student called to the Guidance Office', 'Tinawag ang estudyante sa Guidance Office'],
      explanation: [a.kind === 'explanation' && a.refused ? 'Student refused to give a statement' : `Student explanation written${a.kind === 'explanation' && a.present ? ` (present: ${a.present})` : ''}`, a.kind === 'explanation' && a.refused ? 'Ayaw magbigay ng pahayag ang estudyante' : 'Naisulat ang paliwanag ng estudyante'],
      appeal: [a.kind === 'appeal' ? `Appeal by ${a.by}: ${a.result}` : 'Appeal recorded', a.kind === 'appeal' ? `Apela ng ${a.by === 'Student' ? 'estudyante' : 'magulang'}: ${a.result}` : 'Naitala ang apela'],
      schedule_conference: ['Parent conference scheduled', 'Naitakda ang conference ng magulang'],
      conference_outcome: ['Parent conference outcome documented', 'Naitala ang kinalabasan ng conference'],
      notified: [`Parent notified (${a.kind === 'notified' ? a.how : ''})`, `Naabisuhan ang magulang (${a.kind === 'notified' ? a.how : ''})`],
      decision: [`Decision: ${a.kind === 'decision' ? a.decision : ''} · Sanction: ${a.kind === 'decision' ? a.sanction : ''}`, `Desisyon: ${a.kind === 'decision' ? a.decision : ''} · Sanction: ${a.kind === 'decision' ? a.sanction : ''}`],
      followup: ['Follow-up started (sanction being served)', 'Nagsimula ang follow-up (ginagawa ang sanction)'],
      close: ['Case closed', 'Isinara ang kaso'],
    };
    void insertActivityLogInDb({ actor: 'Guidance Associate', actionEn: `${c.caseCode}: ${stepWords[a.kind][0]}`, actionTl: `${c.caseCode}: ${stepWords[a.kind][1]}`, tag: c.caseCode, tone: a.kind === 'close' ? 'emerald' : 'blue' }).then(() => void loadCaseHistory(c.caseCode));
    // Undo = put back exactly the fields that changed
    const back: Record<string, unknown> = {
      student_called_at: c.studentCalledAt ?? null,
      explanation: c.explanation || null,
      parent_notified_at: c.parentNotifiedAt ?? null,
      parent_notified_how: c.parentNotifiedHow ?? null,
      decision: c.decision ?? null,
      sanction: c.sanction ?? null,
      decided_at: c.decidedAt ?? null,
      sanction_status: c.sanctionStatus || null,
      step: c.step ?? 'Reported',
      status: c.status,
    };
    const undoPatch = Object.fromEntries(Object.keys(db).filter((k) => k in back).map((k) => [k, back[k]]));
    // Due process steps: no "Saved · Next" pop-up (the panel itself moves to the next step).
    // Only closing the case says so, because the case leaves this screen.
    if (a.kind === 'close')
      onTriggerToast(msg, async () => {
        if (await updateCaseFlowInDb(c.caseCode, undoPatch)) setCases((prev) => prev.map((x) => (x.caseCode === c.caseCode ? c : x)));
      });
  };

  const startCaseEdit = () => {
    if (!openCase) return;
    setEditDate(openCase.incidentDate);
    setEditReportedBy(openCase.reportedBy);
    setEditNotes(hideIncidentMarker(openCase.notes).replace(/^No notes added.$/, ''));
    setCaseEditing(true);
  };

  const saveCaseEdit = async () => {
    if (!openCase) return;
    const next = {
      incidentDate: editDate || openCase.incidentDate,
      reportedBy: editReportedBy.trim() || openCase.reportedBy,
      notes: keepIncidentMarker(openCase.notes, editNotes.trim()),
    };
    const rows = [
      { label: isTl ? 'Petsa' : 'Date', before: prettyDate(openCase.incidentDate), after: prettyDate(next.incidentDate) },
      { label: isTl ? 'Nag-report' : 'Reported by', before: openCase.reportedBy, after: next.reportedBy },
      { label: 'Notes', before: hideIncidentMarker(openCase.notes), after: hideIncidentMarker(next.notes) },
    ].filter((x) => x.before !== x.after);
    if (rows.length === 0) {
      setCaseEditing(false);
      onTriggerToast(isTl ? 'Walang binago.' : 'Nothing was changed.');
      return;
    }
    const okEdit = await confirmChange({
      title: isTl ? 'I-save ang pagbabago sa kaso?' : 'Save changes to this case?',
      description: `${openCase.studentName} · ${openCase.caseCode}`,
      rows,
      confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save changes',
    });
    if (!okEdit) return;
    const saved = await updateDisciplineCaseDetailsInDb(openCase.caseCode, {
      reported_by: next.reportedBy,
      incident_date: next.incidentDate,
      notes: next.notes,
    });
    if (!saved) {
      onTriggerToast(
        isTl
          ? ' Hindi na-save. I-check ang internet, tapos pindutin ulit ang "I-save".'
          : ' Not saved. Check the internet connection, then press "Save changes" again.'
      );
      return;
    }
    setCases((prev) => prev.map((c) => (c.caseCode === openCase.caseCode ? { ...c, ...next } : c)));
    await insertActivityLogInDb({
      actor: 'Guidance Associate',
      actionEn: `Edited case details (${rows.map((x) => x.label).join(', ')})`,
      actionTl: `In-edit ang detalye ng kaso (${rows.map((x) => x.label).join(', ')})`,
      tag: openCase.caseCode,
      tone: 'cobalt',
    });
    setCaseEditing(false);
    void loadCaseHistory(openCase.caseCode);
    onTriggerToast(isTl ? ' Na-save ang pagbabago.' : ' Changes saved.');
  };

  // ==========================================================================
  // HANDLER 3: AUTO-FIX ALL MASTERLIST PREVIEW ERRORS IN 1 CLICK
  // ==========================================================================
  // Only fixes what can be fixed SAFELY: phone FORMAT (+63 → 09, missing 0, dashes).
  // Never invents phone numbers, student IDs or parent names — those must come from real records.
  const handleAutoFixMasterlist = async () => {
    const changes: { rowId: string; label: string; before: string; after: string }[] = [];
    previewRows.forEach((r) => {
      const check = checkPhMobile(r.parentPhone, isTl);
      const formatted = check.ok ? formatPhMobile(r.parentPhone) : check.fixTo;
      if (formatted && formatted !== r.parentPhone) {
        changes.push({
          rowId: r.rowId,
          label: r.fullName || r.studentNumber || '—',
          before: r.parentPhone,
          after: formatted,
        });
      }
    });

    const stillFlagged = validatedPreviewRows.filter(
      (r) => !r.isValid && !changes.some((c) => c.rowId === r.rowId)
    ).length;

    if (changes.length === 0) {
      onTriggerToast(
        isTl
          ? ` Walang ma-auto-fix. ${stillFlagged} row ang kailangang ayusin nang mano-mano (hal. maling number, duplicate ID).`
          : ` Nothing can be auto-fixed. ${stillFlagged} row(s) need a manual fix (e.g. wrong number, duplicate ID).`
      );
      return;
    }

    const ok = await confirmChange({
      title: isTl
        ? `Ayusin ang format ng ${changes.length} mobile number?`
        : `Fix the format of ${changes.length} mobile number(s)?`,
      description: isTl
        ? 'Format lang ang aayusin. Hindi papalitan ang mismong number.'
        : 'Only the format is fixed. The actual number stays the same.',
      rows: changes.map((c) => ({ label: c.label, before: c.before, after: c.after })),
      note:
        stillFlagged > 0
          ? isTl
            ? `${stillFlagged} row pa rin ang kailangang ayusin nang mano-mano (maling number, duplicate ID, o walang pangalan).`
            : `${stillFlagged} row(s) still need a manual fix (wrong number, duplicate ID, or missing name).`
          : undefined,
      confirmLabel: isTl ? 'Oo, ayusin' : 'Yes, fix format',
    });
    if (!ok) return;

    setPreviewRows((prev) =>
      prev.map((r) => {
        const c = changes.find((x) => x.rowId === r.rowId);
        return c ? { ...r, parentPhone: c.after } : r;
      })
    );
    onTriggerToast(
      isTl
        ? ` Naayos ang format ng ${changes.length} mobile number.`
        : ` Fixed the format of ${changes.length} mobile number(s).`
    );
  };

  // ==========================================================================
  // HANDLER 4: COMMIT VALIDATED MASTERLIST BATCH TO SUPABASE POSTGRESQL
  // ==========================================================================
  const handleCommitMasterlistToDb = async () => {
    const validRows = validatedPreviewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      soundFX.playError();
      onTriggerToast(
        isTl
          ? ' Ayusin muna ang mga naka-flag na row bago i-save sa Masterlist.'
          : ' Please fix the flagged rows before saving to the Masterlist.'
      );
      return;
    }
    const skipped = validatedPreviewRows.length - validRows.length;
    const newCount = validRows.filter((r) => !r.isUpdate).length;
    const updCount = validRows.length - newCount;
    const ok = await confirmChange({
      title: isTl
        ? `I-save ang ${validRows.length} estudyante sa Masterlist?`
        : `Save ${validRows.length} student(s) to the Masterlist?`,
      rows: [
        {
          label: 'Masterlist',
          before: `${students.length} ${isTl ? 'estudyante' : 'students'}`,
          after: `${students.length + newCount} ${isTl ? 'estudyante' : 'students'}`,
        },
        { label: isTl ? 'Bago' : 'New', after: String(newCount) },
        ...(updCount > 0
          ? [{ label: isTl ? 'Ia-update' : 'Updated', after: isTl ? `${updCount} (pangalan, section, magulang lang — hindi gagalawin ang offense at kaso)` : `${updCount} (name, section, parent only — offenses and cases are kept)` }]
          : []),
        ...validRows.slice(0, 8).map((r) => ({
          label: r.studentNumber,
          after: `${r.fullName} · ${r.sectionCode} · ${r.parentPhone}`,
        })),
        ...(validRows.length > 8
          ? [{ label: '…', after: `+${validRows.length - 8} ${isTl ? 'pa' : 'more'}` }]
          : []),
      ],
      note:
        skipped > 0
          ? isTl
            ? `${skipped} row na may error ang HINDI isasama.`
            : `${skipped} row(s) with errors will NOT be included.`
          : undefined,
      confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save to Masterlist',
      tone: 'success',
    });
    if (!ok) return;

    const newStudentRecords: StudentRecord[] = validRows.map((r) => {
      const initials = r.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');

      const stu: StudentRecord = {
        createdAt: new Date().toISOString(),
        studentNumber: r.studentNumber.trim(),
        fullName: r.fullName.trim(),
        initials: initials || 'ST',
        gradeSection: r.gradeSection,
        sectionCode: r.sectionCode,
        parentName: r.parentName.trim(),
        parentRelationship: 'Parent / Guardian',
        parentPhone: r.parentPhone.trim(),
        parentEmail: r.parentEmail.trim(),
        minorOffenseCount: 0,
        majorOffenseCount: 0,
        clearanceStatus: 'Cleared',
        priorOffensesEn: 'Newly imported to Masterlist · 0 offenses',
        priorOffensesTl: 'Bagong import sa Masterlist · 0 offense',
      };
      return stu;
    });

    // One request per 500 students (not one per student), and we know exactly what was saved
    setSavingMasterlist(true);
    const taskId = startLoading({
      titleEn: `Importing ${validRows.length} students to database...`,
      titleTl: `Ina-upload ang ${validRows.length} estudyante sa database...`,
      messageEn: 'Writing masterlist batch records, please do not close...',
      messageTl: 'Inililigtas ang talaan sa masterlist, huwag isara ang window...',
    });
    const updateIds = new Set(validRows.filter((r) => r.isUpdate).map((r) => r.studentNumber.trim()));
    const toInsert = newStudentRecords.filter((s) => !updateIds.has(s.studentNumber));
    const toUpdate = newStudentRecords.filter((s) => updateIds.has(s.studentNumber));
    const ins = toInsert.length ? await insertStudentsBatchInDb(toInsert) : { saved: 0, failed: 0, failedIds: [] as string[] };
    const upd = toUpdate.length ? await updateStudentsProfileBatchInDb(toUpdate) : { saved: 0, failed: 0, failedIds: [] as string[] };
    const result = { saved: ins.saved + upd.saved, failed: ins.failed + upd.failed, failedIds: [...ins.failedIds, ...upd.failedIds] };
    setSavingMasterlist(false);
    stopLoading(taskId);
    const failedSet = new Set(result.failedIds);
    const savedRecords = newStudentRecords.filter((s) => !failedSet.has(s.studentNumber));
    const savedNew = savedRecords.filter((s) => !updateIds.has(s.studentNumber));
    const savedUpd = new Map(savedRecords.filter((s) => updateIds.has(s.studentNumber)).map((s) => [s.studentNumber, s]));

    // updated students keep their offense counts and history
    setStudents((prev) => [
      ...savedNew,
      ...prev.map((p) => {
        const u = savedUpd.get(p.studentNumber);
        return u
          ? { ...p, fullName: u.fullName, initials: u.initials, gradeSection: u.gradeSection, sectionCode: u.sectionCode, parentName: u.parentName, parentPhone: u.parentPhone, parentEmail: u.parentEmail }
          : p;
      }),
    ]);
    // Keep rows that still need fixing AND rows that failed to save, so nothing is lost
    const savedRowIds = new Set(
      validRows.filter((r) => !failedSet.has(r.studentNumber.trim())).map((r) => r.rowId)
    );
    const remaining = previewRows.filter((r) => !savedRowIds.has(r.rowId));
    setPreviewRows(remaining);
    setPreviewPage(0);

    if (result.failed > 0) {
      soundFX.playError();
      onTriggerToast(
        isTl
          ? ` Na-save ang ${result.saved}, pero ${result.failed} ang hindi na-save (internet o database). Nasa preview pa sila — subukan ulit.`
          : ` Saved ${result.saved}, but ${result.failed} could not be saved (internet or database). They are still in the preview — try again.`
      );
      return;
    }
    onTriggerToast(
      remaining.length > 0
        ? isTl
          ? ` ${savedNew.length} bagong estudyante${savedUpd.size ? `, ${savedUpd.size} na-update` : ''}. ${remaining.length} row pa ang kailangang ayusin sa ibaba.`
          : ` ${savedNew.length} new student(s)${savedUpd.size ? `, ${savedUpd.size} updated` : ''}. ${remaining.length} row(s) below still need fixing.`
        : isTl
        ? ` ${savedNew.length} bagong estudyante${savedUpd.size ? `, ${savedUpd.size} na-update` : ''}. Makikita na sila sa Mga estudyante.`
        : ` ${savedNew.length} new student(s)${savedUpd.size ? `, ${savedUpd.size} updated` : ''}. You can find them under Students.`
    );
    if (remaining.length === 0) setSubTab('students');
  };

  // ==========================================================================
  // HANDLER 5: EXCEL / CSV IMPORT → MATCH COLUMNS STEP
  // ==========================================================================
  const handleImportFile = async (file: File | undefined | null) => {
    if (!file || importBusy) return;
    const token = ++importTokenRef.current;
    setImportError('');
    setImportFileName(file.name);
    setImportBusy(true);
    setImportAnalysis(null);
    setScanAnalysis(null);
    setScanOpen(true); // center popup: reads the file, walks every student, shows findings
    try {
      // Runs in a Web Worker; each stage update is real progress from the worker
      const analysis = await importMasterlistFile(file, (s) => {
        if (importTokenRef.current === token) setImportStage(s);
      });
      if (importTokenRef.current !== token) return; // cancelled
      setImportStage(4);
      soundFX.playStepUnlock();
      setScanAnalysis(analysis); // popup continues with the row walk-through + findings
    } catch (err) {
      if (importTokenRef.current !== token) return;
      soundFX.playError();
      setScanOpen(false);
      setImportError(loadErrorMessage(err, isTl));
    } finally {
      if (importTokenRef.current === token) setImportBusy(false);
    }
  };

  const handleScanContinue = () => {
    setImportAnalysis(scanAnalysis); // opens the Check Columns step
    setScanOpen(false);
    setImportStage(0);
  };

  const handleScanCancel = () => {
    importTokenRef.current++; // ignore a result that arrives later
    setScanOpen(false);
    setScanAnalysis(null);
    setImportBusy(false);
    setImportStage(0);
  };

  const scanFindings = useMemo(
    () => (scanAnalysis ? computeImportFindings(scanAnalysis, existingStudentNumberSet, isTl) : []),
    [scanAnalysis, existingStudentNumberSet, isTl]
  );
  const scanNeedsFix = useMemo(
    () => (scanAnalysis ? countRowsNeedingFix(scanAnalysis, isTl) : 0),
    [scanAnalysis, isTl]
  );

  const updateImportMapping = (field: FieldKey, col: number) => {
    if (!importAnalysis) return;
    const next: ColumnMapping = { ...importAnalysis.layout.mapping, [field]: col };
    setImportAnalysis(reExtract(importAnalysis, next));
  };

  const importMissingRequired = useMemo(() => {
    if (!importAnalysis) return [] as string[];
    const m = importAnalysis.layout.mapping;
    const missing: string[] = [];
    if (m.studentNumber < 0) missing.push(isTl ? FIELD_LABELS.studentNumber.tl : FIELD_LABELS.studentNumber.en);
    if (m.fullName < 0 && (m.lastName < 0 || m.firstName < 0))
      missing.push(isTl ? 'Pangalan (Full Name o Last + First)' : 'Name (Full Name or Last + First)');
    if (m.parentName < 0) missing.push(isTl ? FIELD_LABELS.parentName.tl : FIELD_LABELS.parentName.en);
    if (m.phone < 0) missing.push(isTl ? FIELD_LABELS.phone.tl : FIELD_LABELS.phone.en);
    return missing;
  }, [importAnalysis, isTl]);

  const handleApplyImport = async () => {
    if (!importAnalysis) return;
    const rows = importAnalysis.extract.rows;
    if (rows.length === 0) {
      setImportError(isTl ? 'Walang nabasang estudyante sa file.' : 'No students were found in the file.');
      return;
    }
    if (previewRows.length > 0) {
      const ok = await confirmChange({
        title: isTl ? 'Palitan ang kasalukuyang preview?' : 'Replace the current preview?',
        rows: [
          {
            label: 'Preview',
            before: `${previewRows.length} rows`,
            after: `${rows.length} rows (${importAnalysis.fileName})`,
          },
        ],
        note: isTl
          ? 'Hindi pa naka-save ang mga row na nasa preview ngayon.'
          : 'Rows currently in the preview have not been saved yet.',
        confirmLabel: isTl ? 'Oo, palitan' : 'Yes, replace',
      });
      if (!ok) return;
    }
    const labels: Record<string, string> = {};
    rows.forEach((r, i) => (labels[r.rowId] = importAnalysis.sourceLabels[i] ?? ''));
    setPreviewSourceLabels(labels);
    setPreviewRows(rows);
    setPreviewPage(0);
    // Big files: open on the rows that need attention first
    setPreviewFilter(rows.length > PREVIEW_PAGE_SIZE ? 'issues' : 'all');
    setImportAnalysis(null);
    onTriggerToast(
      isTl
        ? ` Nabasa ang ${rows.length} estudyante mula sa ${importAnalysis.fileName}. I-check ang mga naka-flag bago i-save.`
        : ` Read ${rows.length} students from ${importAnalysis.fileName}. Check flagged rows before saving.`
    );
  };

  /** Removes one preview row (e.g. the wrong copy of a duplicate ID). Not saved yet, so Undo just puts it back. */
  const removePreviewRow = (rowId: string) => {
    const idx = previewRows.findIndex((r) => r.rowId === rowId);
    if (idx < 0) return;
    const removed = previewRows[idx];
    setPreviewRows((l) => l.filter((r) => r.rowId !== rowId));
    onTriggerToast(
      isTl ? `Inalis ang row ni ${removed.fullName || removed.studentNumber} sa preview.` : `Removed ${removed.fullName || removed.studentNumber} from the preview.`,
      () => setPreviewRows((l) => [...l.slice(0, idx), removed, ...l.slice(idx)])
    );
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AICS-Masterlist-Template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };


  return (
    <main className="p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-5 flex-1">
      {/* ====================================================================
          DIRECT, CLEAN SUB-TAB BAR WITH PROMINENT ACTION BUTTONS
          ==================================================================== */}
      <div className="shrink-0 py-2 sm:h-[58px] flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5EA] dark:border-[#38383A]">
        <div className="seg-track overflow-x-auto">
          {(
            [
              {
                id: 'case-board',
                labelEn: `Active Cases (${summaryStats.activeCases})`,
                labelTl: `Mga Aktibong Kaso (${summaryStats.activeCases})`,
                tip: isTl ? 'Talaan ng mga kasong inaaksyunan' : 'List of active open cases',
              },
              {
                id: 'closed-cases',
                labelEn: `Closed Cases (${summaryStats.closedCases})`,
                labelTl: `Mga Saradong Kaso (${summaryStats.closedCases})`,
                tip: isTl ? 'Talaan ng mga natapos at naresolbang kaso' : 'List of resolved and closed cases',
              },
              {
                id: 'students',
                labelEn: `Students (${students.length})`,
                labelTl: `Mga Estudyante (${students.length})`,
                tip: isTl ? 'Lahat ng estudyante sa listahan' : 'All enrolled students directory',
              },
            ] as const
          ).map((tab) => {
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                title={tab.tip || undefined}
                onClick={() => {
                  soundFX.playToggleSwitch(true);
                  setSubTab(tab.id);
                }}
                className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-[13px] font-bold whitespace-nowrap transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                  isActive
                    ? 'seg-on'
                    : 'seg-off'
                }`}
              >
                {isTl ? tab.labelTl : tab.labelEn}
              </button>
            );
          })}
        </div>

        {/* Golden Rule 1 + AGENTS.md §5 #13: ONE solid primary (New Case), the rest are ghost buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundFX.playStepUnlock();
              setStudentFormFor('new');
            }}
            className="h-10 px-4 rounded-full bg-white dark:bg-white/[0.06] shadow-[0_0_0_0.5px_rgb(15_23_42/0.1)] text-[#007AFF] dark:text-[#409CFF] hover:bg-[#EEF3F9] dark:hover:bg-[#0E1D34] active:scale-[0.97] text-xs sm:text-[13px] font-bold flex items-center gap-1.5 transition-[background-color,transform] duration-150 whitespace-nowrap"
            title={isTl ? 'Magdagdag ng isang estudyante sa records' : 'Add one student to the records'}
          >
            <UserPlus className="w-4 h-4" aria-hidden />
            <span>{isTl ? 'Estudyante' : 'Add Student'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.playToggleSwitch(true);
              setSubTab('masterlist');
            }}
            className={`h-10 px-4 rounded-full text-xs sm:text-[13px] font-bold flex items-center gap-1.5 transition-[background-color,transform] duration-150 active:scale-[0.97] whitespace-nowrap ${
              subTab === 'masterlist'
                ? 'bg-[#007AFF]/10 text-[#007AFF] dark:text-[#409CFF]'
                : 'bg-white dark:bg-white/[0.06] shadow-[0_0_0_0.5px_rgb(15_23_42/0.1)] text-[#007AFF] dark:text-[#409CFF] hover:bg-[#F5F5F7] dark:hover:bg-white/[0.1]'
            }`}
            title={isTl ? 'Mag-upload ng Excel ng mga estudyante' : 'Upload the student masterlist (Excel)'}
          >
            <Upload className="w-4 h-4" aria-hidden />
            <span>{isTl ? 'Import' : 'Import Masterlist'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.playStepUnlock();
              setSubTab('add-report');
            }}
            className={`h-10 px-5 rounded-full text-white text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 transition-[background-color,transform] duration-150 active:scale-[0.97] whitespace-nowrap ${
              subTab === 'add-report' ? 'bg-[#0062CC] ring-2 ring-[#007AFF]/30' : 'bg-[#007AFF] hover:bg-[#0062CC]'
            }`}
            title={isTl ? 'Magtala ng bagong kaso' : 'File a new discipline case'}
          >
            <Plus className="w-4 h-4" aria-hidden />
            <span>{isTl ? 'Bagong Kaso' : 'New Case'}</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          4. STABLE MIN-HEIGHT TAB CONTENT AREA (min-h-[440px])
          ==================================================================== */}
      <div className="min-h-[440px]">
        {/* ==================================================================
            SUB-TAB 1: ADD NEW CASE REPORT (PAGE 2)
            - Multi-student selector from Masterlist
            - Auto-offense counter & Early Intervention Alert
            - Handbook classification & progressive sanction recommender
            ================================================================== */}
        {subTab === 'add-report' && (
          <form
            onSubmit={handleCreateCaseReport}
            onKeyDown={(e) => {
              // Enter in a text box must never save the whole case by accident
              const t = e.target as HTMLElement;
              if (e.key === 'Enter' && t.tagName === 'INPUT') e.preventDefault();
            }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch"
          >
            {prefill && (
              <div className="xl:col-span-12 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-100" data-case-prefill={prefill.concernCode}>
                 <b>{isTl ? `Galing sa report ${prefill.concernCode}.` : `From student report ${prefill.concernCode}.`}</b>{' '}
                {isTl
                  ? 'Nakapuno na ang lugar, mga saksi at kuwento. Piliin ang estudyanteng isinumbong'
                  : 'The place, witnesses and story are filled in. Pick the student who was reported'}
                {prefill.search ? <> ({isTl ? 'isinulat' : 'written as'}: <b>{prefill.search}</b>)</> : null}
                {isTl ? ', tapos i-save. Kusang ili-link ang report sa kaso.' : ', then save. The report is linked to the case.'}
              </div>
            )}
            {draftPrompt && (
              <div className="xl:col-span-12 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {' '}
                  {isTl
                    ? `May hindi natapos na case kanina (${draftPrompt.students.length} estudyante). Itutuloy mo ba?`
                    : `You have an unfinished case from earlier (${draftPrompt.students.length} student${draftPrompt.students.length === 1 ? '' : 's'}). Continue it?`}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={discardDraft}
                    className="px-3 py-1.5 rounded-lg saas-card-subtle text-xs font-bold"
                  >
                    {isTl ? 'Burahin, bago na lang' : 'Discard, start new'}
                  </button>
                  <button
                    type="button"
                    onClick={resumeDraft}
                    className="px-3 py-1.5 rounded-lg bg-[#007AFF] text-white text-xs font-extrabold"
                  >
                    {isTl ? 'Ituloy ang draft' : 'Continue draft'}
                  </button>
                </div>
              </div>
            )}
            {/* LEFT 5 COLS: Student Selector (Supports 1 or Multiple Students) */}
            <div className="xl:col-span-5 ring-card p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#1D1D1F] dark:text-white">
                    {isTl
                      ? 'Step 1: Sino ang estudyante?'
                      : 'Step 1: Who is involved?'}
                  </h2>
                  <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                    {isTl
                      ? 'Pwedeng isa o higit pa. Kusang kukunin ang section at magulang.'
                      : 'Pick one or more. Section and parent are filled in for you.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#EAF3FF] dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#409CFF] text-xs font-extrabold whitespace-nowrap shrink-0">
                  {selectedStudentNumbers.length} {isTl ? 'napili' : 'selected'}
                </span>
              </div>

              <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E73] dark:text-[#A1A1A6] pointer-events-none" aria-hidden />
              <input
                type="text"
                autoFocus
                value={studentPickerQuery}
                onChange={(e) => setStudentPickerQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || !studentPickerQuery.trim()) return;
                  const first = filteredStudentPicker[0];
                  if (!first) return;
                  setSelectedStudentNumbers((prev) =>
                    prev.includes(first.studentNumber) ? prev : [...prev, first.studentNumber]
                  );
                  setStudentPickerQuery('');
                }}
                aria-describedby="picker-hint"
                placeholder={
                  isTl
                    ? 'Hanapin: pangalan, student no., o section'
                    : 'Search name, student no., or section'
                }
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl saas-card-subtle text-sm font-semibold text-[#1D1D1F] dark:text-white focus:outline-none focus:border-[#007AFF]"
              />
              </div>
              <div className="-mt-2 flex items-center justify-between gap-3">
                <SortControl id="picker" value={pickerSort} onChange={setPickerSort} isTl={isTl} />
                <button
                  type="button"
                  data-action="picker-add-student"
                  onClick={() => setStudentFormFor('new')}
                  title={isTl ? 'Magdagdag ng isang estudyante (o mag-import ng masterlist sa "I-import ang masterlist")' : 'Add one student (or import the masterlist under "Import masterlist")'}
                  className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg saas-card-subtle hover:border-[#007AFF] text-[11px] font-bold text-[#007AFF] dark:text-[#409CFF]"
                >
                  {isTl ? 'Wala sa listahan? + Idagdag' : 'Not in the list? + Add student'}
                </button>
              </div>

              {/* Fills the card down to the same height as Step 2 (no empty gap) */}
              <div className="max-h-[290px] xl:max-h-none xl:flex-1 xl:h-0 xl:min-h-[240px] overflow-y-auto clean-scroll divide-y divide-[#E5E5EA] dark:divide-[#38383A] rounded-xl border border-[#E5E5EA] dark:border-[#38383A]">
                {visiblePicker.map((stu) => {
                  const isChecked = selectedStudentNumbers.includes(stu.studentNumber);
                  return (
                    <button
                      key={stu.studentNumber}
                      type="button"
                      onClick={() => {
                        soundFX.playKeyClick(1);
                        setSelectedStudentNumbers((prev) =>
                          prev.includes(stu.studentNumber)
                            ? prev.filter((id) => id !== stu.studentNumber)
                            : [...prev, stu.studentNumber]
                        );
                      }}
                      className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors ${
                        isChecked
                          ? 'bg-[#EAF3FF]/75 dark:bg-[#2C2C2E]/80'
                          : 'hover:bg-[#F8FAFE] dark:hover:bg-[#13203B]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border ${
                            isChecked
                              ? 'bg-[#007AFF] border-[#007AFF] text-white'
                              : 'border-[#94A8D0] text-transparent'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-extrabold text-[#1D1D1F] dark:text-white leading-snug">
                            {stu.fullName}
                          </p>
                          <p className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                            #{stu.studentNumber} · {stu.gradeSection}
                          </p>
                        </div>
                      </div>

                      {/* Only show a record badge when there is a record (no "0 Minor" noise) */}
                      {(stu.majorOffenseCount > 0 || stu.minorOffenseCount > 0) && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold shrink-0 ${
                          stu.majorOffenseCount > 0
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                            : stu.minorOffenseCount >= 2
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                            : 'saas-card-subtle text-[#6E6E73] dark:text-[#A1A1A6]'
                        }`}
                      >
                        {stu.majorOffenseCount > 0
                          ? `${stu.majorOffenseCount} ${isTl ? 'malubha' : 'serious'}`
                          : `${stu.minorOffenseCount} Minor`}
                      </span>
                      )}
                    </button>
                  );
                })}
                {filteredStudentPicker.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
                    {isTl
                      ? `Walang tugma sa "${studentPickerQuery}". Subukan ang ibang spelling o student no.`
                      : `No student matches "${studentPickerQuery}". Try another spelling or the student no.`}
                  </p>
                )}
                {filteredStudentPicker.length > visiblePicker.length && (
                  <p className="px-4 py-3 text-center text-[11px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6] bg-[#F8FAFE] dark:bg-[#2C2C2E]">
                    {isTl
                      ? `Ipinapakita ang ${visiblePicker.length} sa ${filteredStudentPicker.length}. Mag-type ng pangalan para mahanap ang iba.`
                      : `Showing ${visiblePicker.length} of ${filteredStudentPicker.length}. Type a name to find the others.`}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT 7 COLS: Offense Details, Auto-Classification & Early Intervention Alert */}
            <div className="xl:col-span-7 ring-card p-6 space-y-5 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-[#1D1D1F] dark:text-white">
                    {isTl
                      ? 'Step 2: Ano ang nangyari?'
                      : 'Step 2: What happened?'}
                  </h2>
                  <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                    {isTl
                      ? 'Bibilangin ng system kung pang-ilang offense na ito at ipapakita ang sanction.'
                      : 'The system counts past offenses and shows the Handbook sanction.'}
                  </p>
                </div>

              </div>

              <div className="relative flex-1">
              {noStudentYet && (
                <div className="absolute inset-0 z-10 flex items-start justify-center pt-24">
                  <div className="px-4 py-3 rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#007AFF]/40 shadow-lg text-center max-w-xs">
                    <p className="text-sm font-extrabold text-[#1D1D1F] dark:text-white">
                       {isTl ? 'Pumili muna ng estudyante sa Step 1' : 'Pick a student in Step 1 first'}
                    </p>
                    <p className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                      {isTl ? 'Bubukas ang Step 2 kapag may napili na.' : 'Step 2 opens once a student is picked.'}
                    </p>
                  </div>
                </div>
              )}
              <fieldset
                disabled={noStudentYet}
                aria-disabled={noStudentYet}
                className={`min-w-0 m-0 p-0 border-0 space-y-5 transition-opacity duration-200 ${
                  noStudentYet ? 'opacity-60 select-none' : ''
                }`}
              >
              {/* LIVE EARLY INTERVENTION / ESCALATION ALERT BANNER */}
              {!isGroup && selectedStudentsList.some(
                (s) => s.minorOffenseCount >= 1 || s.majorOffenseCount >= 1
              ) && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 dark:text-amber-300">
                    <span></span>
                    <span>
                      {isTl
                        ? 'Paalala: may dati nang offense'
                        : 'Heads up: past offenses found'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {selectedStudentsList.map((stu) => {
                      const out = outcomeFor(stu, selectedPolicy);
                      return (
                        <p
                          key={stu.studentNumber}
                          className="text-xs font-semibold text-[#1D1D1F] dark:text-white"
                        >
                          • <strong>{stu.fullName}</strong> ({stu.gradeSection}):{' '}
                          {out.consecutive ? (
                            <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                              {isTl
                                ? 'Minor din ang huli niyang offense. Ayon sa patakaran, ang 2 sunod na minor ay Serious offense na — kailangan ng conference sa magulang.'
                                : 'Their last offense was also minor. By the rule, 2 minors in a row count as a Serious offense — a parent conference is needed.'}
                            </span>
                          ) : out.escalated ? (
                            <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                              {isTl
                                ? `${out.word} ito — kailangan ng conference sa magulang.`
                                : `This is a ${out.word} — a parent conference is needed.`}
                            </span>
                          ) : (
                            <span className="text-amber-800 dark:text-amber-300 font-bold">
                              {isTl
                                ? 'May dati nang offense. Kapag minor ulit ang susunod, magiging Serious na.'
                                : 'Has a past offense. If the next one is minor too, it becomes Serious.'}
                            </span>
                          )}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Offense Policy Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#1D1D1F] dark:text-white mb-1.5">
                    {isTl
                      ? isGroup
                        ? 'Offense (para sa lahat — puwedeng palitan sa bawat isa sa ibaba)'
                        : 'Offense (ayon sa Student Handbook)'
                      : isGroup
                      ? 'Offense (for everyone — change it per student below)'
                      : 'Offense (from the Student Handbook)'}
                  </label>
                  <select
                    ref={offenseSelectRef}
                    value={selectedPolicyCode}
                    onChange={(e) => setSelectedPolicyCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl saas-card-subtle text-xs sm:text-sm font-bold text-[#1D1D1F] dark:text-white focus:outline-none focus:border-[#007AFF]"
                  >
                    {offenseGroups.map((g) => (
                      <optgroup key={g.cls} label={g.label}>
                        {g.rules.map((rule) => (
                          <option key={rule.policyCode} value={rule.policyCode}>
                            {isTl ? rule.titleTl : rule.titleEn} ({rule.classification})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {isGroup && (
                  <div className="md:col-span-2 rounded-xl border border-[#E5E5EA] dark:border-[#38383A] overflow-hidden">
                    <div className="px-3.5 py-2.5 bg-[#F5F5F7] dark:bg-[#2C2C2E] space-y-1">
                      <p className="text-xs font-extrabold text-[#1D1D1F] dark:text-white">
                        {isTl
                          ? `Isang insidente · ${selectedStudentsList.length} hiwalay na case ang gagawin`
                          : `One incident · ${selectedStudentsList.length} separate cases will be made`}
                      </p>
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        {isTl
                          ? ' Isama lang ang may ginawang mali. Ang biktima o saksi ay ilagay sa "Saksi o patunay", hindi rito.'
                          : ' Only include students who did something wrong. Put a victim or witness in "Witness or proof", not here.'}
                      </p>
                    </div>
                    <div className="divide-y divide-[#E5E5EA] dark:divide-[#38383A]">
                      {selectedStudentsList.map((stu) => {
                        const pol = policyFor(stu);
                        const out = outcomeFor(stu, pol);
                        return (
                          <div key={stu.studentNumber} className="px-3.5 py-2 grid grid-cols-[190px_minmax(0,1fr)_24px] items-center gap-2">
                            <div className="min-w-0 space-y-0.5">
                              <span className="text-xs font-bold text-[#1D1D1F] dark:text-white block truncate" title={stu.fullName}>
                              {stu.fullName}
                            </span>
                              <span
                              className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold whitespace-nowrap inline-block ${
                                out.escalated
                                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                                  : stu.minorOffenseCount >= 1
                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                                  : 'bg-[#EAF3FF] dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#409CFF]'
                              }`}
                            >
                              {out.word}
                            </span>
                            </div>
                            <select
                              title={isTl ? policyFor(stu).titleTl : policyFor(stu).titleEn}
                              aria-label={isTl ? `Offense ni ${stu.fullName}` : `Offense for ${stu.fullName}`}
                              value={policyOverride[stu.studentNumber] || ''}
                              onChange={(e) =>
                                setPolicyOverride((prev) => ({ ...prev, [stu.studentNumber]: e.target.value }))
                              }
                              className="w-full px-2 py-1.5 rounded-lg saas-card-subtle text-[11px] font-bold text-[#1D1D1F] dark:text-white"
                            >
                              <option value="">{isTl ? 'Pareho sa itaas' : 'Same as above'}</option>
                              {offenseGroups.map((g) => (
                                <optgroup key={g.cls} label={g.label}>
                                  {g.rules.map((rule) => (
                                    <option key={rule.policyCode} value={rule.policyCode}>
                                      {isTl ? rule.titleTl : rule.titleEn} ({rule.classification})
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            <button
                              type="button"
                              title={isTl ? `Alisin si ${stu.fullName}` : `Remove ${stu.fullName}`}
                              aria-label={isTl ? `Alisin si ${stu.fullName}` : `Remove ${stu.fullName}`}
                              onClick={() =>
                                setSelectedStudentNumbers((prev) => prev.filter((id) => id !== stu.studentNumber))
                              }
                              className="w-6 h-6 rounded-md text-xs font-bold text-[#6E6E73] hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/60"
                            >
                              
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#1D1D1F] dark:text-white mb-1">
                    {isTl ? 'Petsa' : 'Date'}
                  </label>
                  <DateField value={incidentDate} onChange={setIncidentDate} isTl={isTl} max={todayISO()} ariaLabel={isTl ? 'Petsa ng insidente' : 'Incident date'} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1D1D1F] dark:text-white mb-1">
                    {isTl ? 'Sino ang nag-report' : 'Reported by'}
                  </label>
                  <input
                    type="text"
                    list="aics-reporters"
                    value={reportedBy}
                    onChange={(e) => setReportedBy(e.target.value)}
                    placeholder={
                      isTl
                        ? 'hal. Prof. R. Macapagal (Class Adviser)'
                        : 'e.g. Prof. R. Macapagal (Class Adviser)'
                    }
                    className="w-full px-3.5 py-2 rounded-xl saas-card-subtle text-xs font-bold text-[#1D1D1F] dark:text-white"
                  />
                  <datalist id="aics-reporters">
                    {reporterSuggestions.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1D1D1F] dark:text-white mb-1">
                    {isTl ? 'Oras (optional)' : 'Time (optional)'}
                  </label>
                  <input
                    type="time"
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl saas-card-subtle text-xs font-bold text-[#1D1D1F] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1D1D1F] dark:text-white mb-1">
                    {isTl ? 'Saan nangyari (optional)' : 'Place (optional)'}
                  </label>
                  <input
                    type="text"
                    value={incidentPlace}
                    onChange={(e) => setIncidentPlace(e.target.value)}
                    placeholder={isTl ? 'hal. Gate, Room 204, Canteen' : 'e.g. Gate, Room 204, Canteen'}
                    className="w-full px-3.5 py-2 rounded-xl saas-card-subtle text-xs font-bold text-[#1D1D1F] dark:text-white"
                  />
                </div>

                {/* Affected student (complainant): staff-only, never in SMS or the parent's copy */}
                <div className="md:col-span-2 space-y-1.5">
                  <label htmlFor="affected-student" className="block text-xs font-bold text-[#1D1D1F] dark:text-white">
                    {isTl ? 'May naapektuhang estudyante? (opsyonal)' : 'Was a student affected? (optional)'}
                  </label>
                  <input
                    id="affected-student"
                    list="affected-student-list"
                    value={affectedQuery}
                    onChange={(e) => setAffectedQuery(e.target.value)}
                    placeholder={isTl ? 'I-type ang pangalan o student no.' : 'Type a name or student no.'}
                    className="w-full px-3.5 py-2 rounded-xl saas-card-subtle text-xs font-bold text-[#1D1D1F] dark:text-white"
                  />
                  <datalist id="affected-student-list">
                    {affectedQuery.trim().length >= 2 &&
                      students
                        .filter((s) => `${s.fullName} ${s.studentNumber}`.toLowerCase().includes(affectedQuery.trim().toLowerCase()))
                        .slice(0, 8)
                        .map((s) => <option key={s.studentNumber} value={`${s.fullName} · #${s.studentNumber}`} />)}
                  </datalist>
                  <p className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                    {affectedStudent
                      ? isTl ? `Naitala: ${affectedStudent.fullName}. Staff lang ang makakakita.` : `Linked: ${affectedStudent.fullName}. Only staff can see this.`
                      : isTl ? 'Staff lang ang makakakita. Hindi ito lalabas sa SMS o sa kopya ng magulang.' : 'Only staff can see this. It never appears in SMS or the parent copy.'}
                  </p>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-[#1D1D1F] dark:text-white">
                    {isTl ? 'Mga saksi at patunay' : 'Witnesses and proof'}
                  </label>
                  <input
                    type="text"
                    value={incidentWitness}
                    onChange={(e) => setIncidentWitness(e.target.value)}
                    placeholder={isTl ? 'hal. Guard J. Cruz; Subject Teacher; may kuha sa CCTV' : 'e.g. Guard J. Cruz; Subject Teacher; CCTV clip on file'}
                    className="w-full px-3.5 py-2 rounded-xl saas-card-subtle text-xs font-bold text-[#1D1D1F] dark:text-white"
                  />

                  {/* Multiple Evidence Upload (Photos / PDFs) */}
                  <div className="mt-2 p-3 rounded-xl border border-dashed border-[#D1D1D6] dark:border-[#38383A] bg-[#F5F5F7] dark:bg-[#1C1C1E] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#6E6E73] dark:text-[#A1A1A6] flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-[#007AFF] dark:text-[#409CFF]" />
                        <span>{isTl ? 'Maglakip ng Litrato / Dokumento ng Insidente (Multiple Files)' : 'Attach Incident Photos & Documents (Multiple)'}</span>
                      </span>
                      <label className="btn-press cursor-pointer px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs">
                        <Upload className="w-3 h-3" />
                        <span>{isTl ? 'Pumili ng Files' : 'Select Files'}</span>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            if (!e.target.files) return;
                            const newFiles = Array.from(e.target.files);
                            const validFiles = newFiles.filter((f) => {
                              const err = checkEvidenceFile(f, isTl);
                              if (err) {
                                onTriggerToast(err);
                                return false;
                              }
                              return true;
                            });
                            setIncidentEvidenceFiles((prev) => [...prev, ...validFiles]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    {incidentEvidenceFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {incidentEvidenceFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1C1C1E] border border-[#D1D1D6] dark:border-[#38383A] text-xs font-medium text-[#1D1D1F] dark:text-white shadow-2xs"
                          >
                            <span className="truncate max-w-[160px] text-[11px] font-semibold">{file.name}</span>
                            <span className="text-[10px] text-[#6E6E73]">({(file.size / 1024).toFixed(0)} KB)</span>
                            <button
                              type="button"
                              onClick={() => setIncidentEvidenceFiles((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Auto-Suggested Handbook Progressive Sanction Box */}
              <div className="p-4 rounded-xl saas-card-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#007AFF] dark:text-[#409CFF]">
                    {isTl
                      ? 'Sanction ayon sa Handbook'
                      : 'Sanction from the Handbook'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#007AFF] text-white text-[11px] font-bold">
                    {selectedPolicy.classification}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] leading-snug">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A]">
                    <p className="font-bold text-[#6E6E73] dark:text-[#A1A1A6]">1st Offense</p>
                    <p className="font-semibold text-[#1D1D1F] dark:text-white mt-0.5">
                      {isTl ? selectedPolicy.sanction1stTl : selectedPolicy.sanction1stEn}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A]">
                    <p className="font-bold text-amber-600 dark:text-amber-400">2nd Offense</p>
                    <p className="font-semibold text-[#1D1D1F] dark:text-white mt-0.5">
                      {isTl ? selectedPolicy.sanction2ndTl : selectedPolicy.sanction2ndEn}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A]">
                    <p className="font-bold text-rose-600 dark:text-rose-400">3rd Offense</p>
                    <p className="font-semibold text-[#1D1D1F] dark:text-white mt-0.5">
                      {isTl ? selectedPolicy.sanction3rdTl : selectedPolicy.sanction3rdEn}
                    </p>
                  </div>
                </div>
              </div>

              {/* Incident Narrative / Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#1D1D1F] dark:text-white">
                    {isTl
                      ? 'Buong Salaysay ng Nangyari (Incident Narrative & Notes)'
                      : 'Complete Incident Narrative & Notes'}
                  </label>
                  <span className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
                    {incidentNotes.trim().length > 0 ? `${incidentNotes.trim().length} characters` : (isTl ? 'Opsyonal' : 'Optional')}
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  placeholder={
                    isTl
                      ? 'Ilagay ang buong detalye ng insidente, paunang aksyon ng guidance, o impormasyon mula sa ulat...'
                      : 'Enter complete summary of the incident, initial guidance action taken, or notes from student report...'
                  }
                  className="w-full p-3.5 rounded-xl border border-[#D1D1D6] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-xs font-medium text-[#1D1D1F] dark:text-white leading-relaxed focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/30 min-h-[110px] resize-y"
                />
              </div>

              {/* Anchored Directly Below Incident Narrative (No Floating / No Sticky Scroll Overlay) */}
              <div className="mt-4 pt-4 border-t border-[#E5E5EA] dark:border-[#38383A] flex flex-wrap items-center justify-between gap-3 bg-[#F5F5F7] dark:bg-[#1C1C1E] p-4 rounded-xl border border-[#D1D1D6] dark:border-[#38383A]">
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-bold text-[#6E6E73] dark:text-[#A1A1A6]">
                    {noStudentYet
                      ? isTl ? 'Wala pang napiling estudyante' : 'No student picked yet'
                      : isGroup
                      ? isTl
                        ? `${selectedStudentsList.length} estudyante · ${selectedStudentsList.length} hiwalay na case`
                        : `${selectedStudentsList.length} students · ${selectedStudentsList.length} separate cases`
                      : `${selectedStudentsList[0]?.fullName ?? ''} · ${
                          selectedStudentsList[0] ? outcomeFor(selectedStudentsList[0], policyFor(selectedStudentsList[0])).word : ''
                        }`}
                  </p>
                  {/* Only offer Parent notice checkbox if the offense is Major or consecutive minor (escalated) */}
                  {selectedStudentsList.length > 0 && selectedStudentsList.some((s) => outcomeFor(s, policyFor(s)).escalated) ? (
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#1D1D1F] dark:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoNotifyParent}
                        onChange={(e) => setAutoNotifyParent(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#1E469B]"
                      />
                      <span>
                        {isTl
                          ? 'Ihanda rin ang text at email sa magulang (Major / Serious)'
                          : 'Also prepare text and email to parent (Major / Serious)'}
                      </span>
                    </label>
                  ) : (
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {isTl ? 'ℹ️ 1st Minor Offense: Walang SMS sa magulang (Paalala at tala lamang).' : 'ℹ️ 1st Minor Offense: Internal warning only (No parent SMS required).'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  title={
                    selectedStudentNumbers.length === 0
                      ? isTl ? 'Pumili muna ng estudyante sa Step 1' : 'Pick a student in Step 1 first'
                      : undefined
                  }
                  className={`btn-press px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-extrabold shadow-md whitespace-nowrap ${
                    selectedStudentNumbers.length === 0
                      ? 'bg-[#94A8D0] cursor-not-allowed'
                      : 'bg-[#007AFF] hover:bg-[#0062CC] ring-2 ring-[#7CB8F7]/60'
                  }`}
                >
                  {selectedStudentNumbers.length === 0
                    ? isTl ? 'Pumili muna ng estudyante' : 'Pick a student first'
                    : isTl
                    ? ` I-save ang case (${selectedStudentNumbers.length} estudyante)`
                    : ` Save case (${selectedStudentNumbers.length} student${selectedStudentNumbers.length === 1 ? '' : 's'})`}
                </button>
              </div>

              </fieldset>
              </div>
            </div>
          </form>
        )}

        {/* ==================================================================
            SUB-TAB 2: ACTIVE CASE BOARD (PAGE 3)
            ================================================================== */}
        {subTab === 'case-board' && lastSavedCodes.length > 0 && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {' '}
              {isTl
                ? `Naitala ang ${lastSavedCodes.length} case: ${cases
                    .filter((c) => lastSavedCodes.includes(c.caseCode))
                    .map((c) => c.studentName)
                    .join(', ')}`
                : `Saved ${lastSavedCodes.length} case${lastSavedCodes.length === 1 ? '' : 's'}: ${cases
                    .filter((c) => lastSavedCodes.includes(c.caseCode))
                    .map((c) => c.studentName)
                    .join(', ')}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const c = cases.find((x) => x.caseCode === lastSavedCodes[0]);
                  if (c) openCaseDetails(c);
                }}
                className="px-3 py-1.5 rounded-lg saas-card-subtle text-xs font-bold text-[#1D1D1F] dark:text-white"
              >
                {isTl ? 'Tingnan ang case' : 'View the case'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLastSavedCodes([]);
                  setSubTab('add-report');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#007AFF] text-white text-xs font-extrabold"
              >
                {isTl ? '＋ Isa pang case' : '＋ Another case'}
              </button>
              <button
                type="button"
                onClick={() => setLastSavedCodes([])}
                title={isTl ? 'Isara' : 'Close'}
                aria-label={isTl ? 'Isara' : 'Close'}
                className="w-7 h-7 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              >
                
              </button>
            </div>
          </div>
        )}

        {subTab === 'case-board' && (
          <section className="space-y-4">
            {/* Summary tiles (Dashboard theme): what needs attention first, each one filters the list */}
            {(() => {
              const now = new Date();
              const open = cases.filter((c) => c.status !== 'Resolved');
              const overdueN = open.filter((c) => caseAge(c.incidentDate).days > overdueDays).length;
              const doneMonth = cases.filter((c) => {
                if (c.status !== 'Resolved' || isWithdrawn(c)) return false;
                const d = new Date(c.closedAt || c.incidentDate);
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
              }).length;
              const tiles = [
                { k: 'todo', n: open.length, en: 'Need action', tl: 'Kailangang asikasuhin', chip: 'bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/15 dark:text-[#409CFF]', icon: <FolderOpen className="w-4 h-4" aria-hidden />, on: caseStatusFilter === 'ALL' && flagF === 'all', go: () => { setFlagF('all'); setCaseStatusFilter('ALL'); } },
                { k: 'overdue', n: overdueN, en: `Overdue (over ${overdueDays} days)`, tl: `Overdue (higit ${overdueDays} araw)`, chip: 'bg-[#E11D48]/10 text-[#E11D48] dark:bg-[#FB7185]/15 dark:text-[#FB7185]', icon: <AlertTriangle className="w-4 h-4" aria-hidden />, on: flagF === 'overdue', go: () => { setCaseStatusFilter('ALL'); setFlagF('overdue'); } },
                { k: 'conf', n: caseStatusCount.conference ?? 0, en: 'Parent conference', tl: 'Conference ng magulang', chip: 'bg-[#D97706]/10 text-[#D97706] dark:bg-[#FBBF24]/15 dark:text-[#FBBF24]', icon: <CalendarDays className="w-4 h-4" aria-hidden />, on: caseStatusFilter === 'conference', go: () => { setFlagF('all'); setCaseStatusFilter('conference'); } },
                { k: 'done', n: doneMonth, en: 'Closed this month', tl: 'Naisara ngayong buwan', chip: 'bg-[#059669]/10 text-[#059669] dark:bg-[#34D399]/15 dark:text-[#34D399]', icon: <Check className="w-4 h-4" aria-hidden />, on: caseStatusFilter === 'done', go: () => { setFlagF('all'); setCaseStatusFilter('done'); } },
              ];
              return (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  {tiles.map((t) => (
                    <button
                      key={t.k}
                      type="button"
                      onClick={t.go}
                      aria-pressed={t.on}
                      className={`bento-tile text-left rounded-[18px] px-4 py-3.5 flex items-center gap-3 transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.985] ${t.on ? 'ring-2 ring-[#007AFF]/40 dark:ring-[#0A84FF]/40' : ''}`}
                    >
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.chip}`}>{t.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-[24px] leading-none font-semibold tabular-nums tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7]">{t.n}</span>
                        <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6] mt-1 truncate">{isTl ? t.tl : t.en}</span>
                      </span>
                    </button>
                  ))}
                </div>
              );
            })()}
            {/* ONE toolbar row (Dashboard theme): status chips · Filter menu · More menu */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="seg-track flex-wrap" role="tablist" aria-label={isTl ? 'Ipakita ang mga kaso' : 'Show cases'}>
                {(['ALL', 'new', 'progress', 'conference', 'sanction', 'done'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={caseStatusFilter === k}
                    onClick={() => setCaseStatusFilter(k)}
                    className={`px-3 py-1.5 text-xs whitespace-nowrap ${caseStatusFilter === k ? 'seg-on' : 'seg-off'}`}
                  >
                    {bucketWord(k)} <span className="tabular-nums opacity-70">{caseStatusCount[k] ?? 0}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {filtersOn && (
                  <button
                    type="button"
                    data-filter="clear"
                    onClick={() => { setGradeF('all'); setPeriodF('all'); setFlagF('all'); setFromF(''); setToF(''); }}
                    className="h-9 px-3 rounded-full text-xs font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  >
                    <span data-filter-count>{isTl ? `${filteredCases.length} kaso` : `${filteredCases.length} case(s)`}</span> · {isTl ? 'Alisin ang filter' : 'Clear filters'}
                  </button>
                )}

                {/* Filter + sort (fewer controls on screen) */}
                <details className="relative" data-case-filters>
                  <summary className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${filtersOn ? 'bg-[#007AFF]/10 text-[#007AFF] dark:text-[#409CFF]' : 'bg-white dark:bg-white/[0.06] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-[0_0_0_0.5px_rgb(15_23_42/0.1)] hover:bg-[#F5F5F7] dark:hover:bg-white/[0.1]'}`}>
                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
                    {isTl ? 'Filter at ayos' : 'Filter & sort'}
                  </summary>
                  <div className="absolute right-0 top-full mt-2 z-30 p-4 ring-card w-[300px] space-y-3">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Baitang' : 'Grade'}</span>
                      <select data-filter="grade" value={gradeF} onChange={(e) => setGradeF(e.target.value as typeof gradeF)} className="w-full h-9 px-2.5 rounded-lg saas-card-subtle text-xs font-medium">
                        <option value="all">{isTl ? 'Lahat ng grade' : 'All grades'}</option>
                        <option value="11">Grade 11</option>
                        <option value="12">Grade 12</option>
                      </select>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Petsa ng insidente' : 'Incident date'}</span>
                      <select data-filter="period" value={periodF} onChange={(e) => setPeriodF(e.target.value as typeof periodF)} className="w-full h-9 px-2.5 rounded-lg saas-card-subtle text-xs font-medium">
                        <option value="all">{isTl ? 'Lahat ng petsa' : 'Any date'}</option>
                        <option value="week">{isTl ? 'Ngayong linggo' : 'This week'}</option>
                        <option value="month">{isTl ? 'Ngayong buwan' : 'This month'}</option>
                        <option value="custom">{isTl ? 'Pumili ng petsa…' : 'Pick dates…'}</option>
                      </select>
                    </label>
                    {periodF === 'custom' && (
                      <div className="flex items-center gap-2">
                        <DateField compact className="flex-1" value={fromF} max={toF || undefined} onChange={setFromF} isTl={isTl} ariaLabel={isTl ? 'Mula' : 'From'} placeholder={isTl ? 'Mula' : 'From'} />
                        <span className="text-xs text-[#6E6E73]">–</span>
                        <DateField compact className="flex-1" value={toF} min={fromF || undefined} onChange={setToF} isTl={isTl} ariaLabel={isTl ? 'Hanggang' : 'To'} placeholder={isTl ? 'Hanggang' : 'To'} />
                      </div>
                    )}
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Kailangang aksyunan' : 'Needs action'}</span>
                      <select data-filter="flag" value={flagF} onChange={(e) => setFlagF(e.target.value as typeof flagF)} className="w-full h-9 px-2.5 rounded-lg saas-card-subtle text-xs font-medium">
                        <option value="all">{isTl ? 'Lahat ng kaso' : 'All cases'}</option>
                        <option value="overdue">{isTl ? `Overdue lang (higit ${overdueDays} araw)` : `Overdue only (over ${overdueDays} days)`}</option>
                        <option value="waiting">{isTl ? 'Naghihintay ang sanction' : 'Sanction waiting for parent'}</option>
                      </select>
                    </label>
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Ayos' : 'Sort'}</span>
                      <SortControl id="cases" value={caseSort} onChange={setCaseSort} isTl={isTl} />
                    </div>
                  </div>
                </details>

                {/* rare actions live in one More menu (Golden Rule 1) */}
                <details className="relative">
                  <summary
                    title={isTl ? 'Iba pa' : 'More'}
                    aria-label={isTl ? 'Iba pa' : 'More'}
                    className="list-none [&::-webkit-details-marker]:hidden cursor-pointer h-9 w-9 rounded-full inline-flex items-center justify-center bg-white dark:bg-white/[0.06] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-[0_0_0_0.5px_rgb(15_23_42/0.1)] hover:bg-[#F5F5F7] dark:hover:bg-white/[0.1]"
                  >
                    <MoreHorizontal className="w-4 h-4" aria-hidden />
                  </summary>
                  <div className="absolute right-0 top-full mt-2 z-30 p-2 ring-card w-[300px]">
                    <button
                      type="button"
                      data-action="batch-print-call-slips"
                      onClick={() => {
                        const queue = cases.filter((c) => c.status !== 'Resolved' && (!c.step || c.step === 'Reported' || c.step === 'Student Called'));
                        const toPrint = queue.length ? queue.slice(0, 4) : cases.slice(0, 4);
                        if (!toPrint.length) {
                          onTriggerToast(isTl ? 'Walang case na ma-print ang call slip.' : 'No cases available for call slip printing.');
                          return;
                        }
                        soundFX.playStepUnlock();
                        const html = buildBatchCallSlipsHtml(
                          toPrint.map((c) => ({
                            caseCode: c.caseCode,
                            studentName: c.studentName,
                            gradeSection: c.gradeSection,
                            offenseTitle: c.offenseTitleEn,
                            when: isTl ? 'Agad / Unang Period ng Guidance' : 'Immediate / Next Guidance Period',
                          })),
                          window.location.origin
                        );
                        printHtml(html);
                        onTriggerToast(
                          isTl
                            ? `Naihanda na ang 4 na call slip (${toPrint.map((x) => x.studentName).join(', ')}).`
                            : `4 call slips are ready to print (${toPrint.map((x) => x.studentName).join(', ')}).`
                        );
                      }}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    >
                      <Layers className="w-4 h-4 mt-0.5 text-[#007AFF] dark:text-[#409CFF] shrink-0" aria-hidden />
                      <span>
                        <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Mag-print ng 4 na call slip' : 'Print 4 call slips'}</span>
                        <span className="block text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Mga estudyanteng tatawagin pa, sa isang papel' : 'Students still to call, on one sheet'}</span>
                      </span>
                    </button>
                    <div className="px-3 py-2.5 space-y-2 border-t border-black/[0.06] dark:border-white/[0.08] mt-1">
                      <span className="block text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Ibig sabihin ng kulay ng tuldok' : 'What the dot colors mean'}</span>
                      <Legend
                        items={[
                          { color: '#F43F5E', label: isTl ? 'Seryoso / Grave / Major' : 'Serious / Grave / Major', shape: 'dot' },
                          { color: '#FBBF24', label: isTl ? 'Ika-2 minor' : '2nd minor', shape: 'dot' },
                          { color: '#2557BE', label: 'Minor', shape: 'dot' },
                          { color: '#10B981', label: isTl ? 'Tapos na' : 'Done', shape: 'dot' },
                        ]}
                      />
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div className="space-y-5">
              {filteredCases.length === 0 && (
                <div className="px-6 py-10 text-center space-y-3 rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A]">
                  <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">
                    {quickSearch.trim()
                      ? isTl
                        ? `Walang kasong tugma sa "${quickSearch.trim()}".`
                        : `No case matches "${quickSearch.trim()}".`
                      : caseStatusFilter === 'ALL'
                      ? isTl
                        ? 'Wala pang naitalang kaso.'
                        : 'No cases yet.'
                      : isTl
                      ? `Walang kaso na "${bucketWord(caseStatusFilter)}".`
                      : `No cases marked "${bucketWord(caseStatusFilter)}".`}
                  </p>
                  <div className="flex justify-center gap-2">
                    {caseStatusFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setCaseStatusFilter('ALL')}
                        className="px-3 py-1.5 rounded-lg saas-card-subtle text-xs font-bold text-[#007AFF] dark:text-[#409CFF]"
                      >
                        {isTl ? 'Ipakita lahat' : 'Show all cases'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSubTab('add-report')}
                      className="px-3 py-1.5 rounded-lg bg-[#007AFF] text-white text-xs font-bold"
                    >
                      {isTl ? '＋ Bagong kaso' : '＋ New case'}
                    </button>
                  </div>
                </div>
              )}

              {(() => {
                const todo = filteredCases.filter((c) => c.status !== 'Resolved');
                const done = filteredCases.filter((c) => c.status === 'Resolved');
                const groupDone = caseStatusFilter === 'ALL';

                const card = (c: DisciplineCaseRecord) => {
                  const isResolved = c.status === 'Resolved';
                  const sev = severityInfo(c.severity);
                  const age = caseAge(c.incidentDate);
                  const step = nextStepFor(c);
                  const groupSize = c.incidentCode ? groupSizeByIncident.get(c.incidentCode) ?? 0 : 0;
                  const menuOpen = caseMenuOpen === c.caseCode;
                  // due-process progress for the mini bar (5 steps for a 1st minor, 8 otherwise)
                  const flow = isMinorCase(c) ? MINOR_CASE_STEPS : MAJOR_CASE_STEPS;
                  const doneSteps = isResolved ? flow.length : Math.max(1, flow.indexOf((c.step ?? 'Reported') as CaseStep) + 1);
                  const tone = stripeFor(c); // bg-* color by how serious / done
                  const initials = c.studentName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
                  return (
                    <div
                      key={c.caseCode}
                      data-case-card={c.caseCode}
                      data-status={c.status}
                      role="button"
                      tabIndex={0}
                      title={`${c.caseCode} · ${isTl ? 'I-click para makita ang buong kaso' : 'Click to see the full case'}`}
                      onClick={() => openCaseDetails(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openCaseDetails(c);
                      }}
                      className={`group relative grid grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-cols-[auto_minmax(0,1fr)_190px_220px] items-center gap-x-5 gap-y-2 row-card px-4 py-3.5 cursor-pointer ${
                        isResolved && !menuOpen ? 'opacity-70' : ''
                      } ${menuOpen ? 'z-30' : ''}`}
                    >
                      {/* avatar tinted by how serious the case is */}
                      {/* boy/girl avatar with a colored ring for how serious the case is */}
                      <span aria-hidden="true" data-stripe data-initials={initials} className={`relative rounded-full p-[2px] ${tone}`}>
                        <span className="block rounded-full bg-white dark:bg-[#1C1C1E] p-[1.5px]">
                          <StudentGenderAvatar fullName={c.studentName} size="md" />
                        </span>
                        {!isResolved && age.days >= 7 && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#E11D48] ring-2 ring-white dark:ring-[#0F1B2E]" title={isTl ? 'Overdue' : 'Overdue'} />
                        )}
                      </span>

                      {/* who + what */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{c.studentName}</span>
                          {groupSize > 1 && (
                            <span title={isTl ? 'Kasama sa iisang insidente' : 'Part of one group incident'} className="shrink-0 px-1.5 py-px rounded-full text-[10px] font-semibold bg-[#F5F5F7] dark:bg-white/[0.08] text-[#6E6E73] dark:text-[#A1A1A6]">
                              {isTl ? 'Grupo' : 'Group'} {groupSize}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] truncate">
                          <span className="text-[#1D1D1F] dark:text-[#E5E5EA]">{isTl ? c.offenseTitleTl : c.offenseTitleEn}</span>
                          {' · '}
                          <span title={c.severity}>{sev.word}</span>
                          {' · '}
                          {c.gradeSection}
                        </p>
                      </div>

                      {/* due-process progress: one glance shows how far the case is */}
                      <div className="hidden lg:block" title={isTl ? `Hakbang ${doneSteps} ng ${flow.length}` : `Step ${doneSteps} of ${flow.length}`}>
                        <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                          <span className={`font-semibold truncate ${isResolved ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#1D1D1F] dark:text-[#F5F5F7]'}`}>
                            {isWithdrawn(c)
                              ? closedWord(c)
                              : c.status === 'Conference Scheduled' && nextConfByCase.has(c.caseCode)
                              ? isTl ? 'May schedule na' : 'Conference set'
                              : caseBadgeWord(c)}
                          </span>
                          <span className={`shrink-0 tabular-nums ${!isResolved && age.days >= 7 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-[#8E8E93]'}`} title={prettyDate(c.incidentDate)}>
                            {age.text}
                          </span>
                        </div>
                        <div className="flex gap-0.5" aria-hidden="true">
                          {flow.map((_, i) => (
                            <span
                              key={i}
                              className={`h-1.5 flex-1 rounded-full ${
                                i < doneSteps ? (isResolved ? 'bg-emerald-500' : 'bg-[#007AFF] dark:bg-[#5B8DEF]') : 'bg-[#E8E8ED] dark:bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* the ONE next action (no duplicate "Next:" text) */}
                      <div
                        className="flex items-center gap-2 justify-end"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key !== 'Escape') e.stopPropagation();
                        }}
                      >
                        {step.hint && <span className="sr-only">{step.hint}</span>}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {step.action === 'text' && (
                            <button
                              type="button"
                              onClick={() => openComposerForCase(c)}
                              title={isTl ? 'Hindi kasama ang offense sa text' : 'The message never includes the offense'}
                              className="btn-press h-8 px-4 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold whitespace-nowrap"
                            >
                              {isTl ? 'I-text ang magulang' : 'Text parent'}
                            </button>
                          )}
                          {step.action === 'schedule' && (
                            <button
                              type="button"
                              onClick={() => openCaseDetails(c)}
                              className="btn-press h-8 px-4 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold whitespace-nowrap"
                            >
                              {isTl ? 'Mag-schedule' : 'Schedule conference'}
                            </button>
                          )}
                          {step.action === 'flow' && (
                            <button
                              type="button"
                              data-card-flow={c.caseCode}
                              onClick={() => openCaseDetails(c)}
                              className="btn-press h-8 px-4 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold whitespace-nowrap"
                            >
                              {step.button}
                            </button>
                          )}
                          {step.action === 'done' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCaseStatus(c, 'Resolved')}
                              className="btn-press h-8 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap"
                            >
                              {isTl ? 'Tapos na' : 'Mark as done'}
                            </button>
                          )}
                          <div className="relative">
                            <button
                              type="button"
                              aria-haspopup="menu"
                              aria-expanded={menuOpen}
                              aria-label={isTl ? 'Iba pang gagawin' : 'More actions'}
                              title={isTl ? 'Iba pang gagawin' : 'More actions'}
                              onClick={() => setCaseMenuOpen(menuOpen ? null : c.caseCode)}
                              className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-white/[0.08] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.14] text-sm font-bold text-[#6E6E73] dark:text-[#A1A1A6]"
                            >
                              ⋯
                            </button>
                            {menuOpen && (
                              <>
                                <div
                                  role="menu"
                                  className="absolute right-0 top-9 z-40 w-52 py-1 rounded-xl bg-white dark:bg-[#14223E] border border-[#D1D1D6] dark:border-[#38383A] shadow-xl"
                                >
                                  {[
                                    {
                                      show: true,
                                      label: isTl ? 'Buksan ang buong kaso' : 'Open full case',
                                      run: () => openCaseDetails(c),
                                    },
                                    {
                                      show: step.action !== 'text',
                                      label: isTl ? 'I-text ang magulang' : 'Text parent',
                                      run: () => openComposerForCase(c),
                                    },
                                    {
                                      show: true,
                                      label: isTl ? 'Mag-print ng form…' : 'Print a form…',
                                      run: () => {
                                        soundFX.playKeyClick(2);
                                        setCallSlipCase(c);
                                      },
                                    },
                                    {
                                      show: !isResolved && step.action !== 'done',
                                      label: isTl ? 'Tapos na' : 'Mark as done',
                                      run: () => handleUpdateCaseStatus(c, 'Resolved'),
                                    },
                                    {
                                      show: isResolved,
                                      label: isTl ? 'Buksan ulit' : 'Reopen case',
                                      run: () => handleUpdateCaseStatus(c, 'Open'),
                                    },
                                  ]
                                    .filter((m) => m.show)
                                    .map((m) => (
                                      <button
                                        key={m.label}
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                          setCaseMenuOpen(null);
                                          m.run();
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#1D1D1F] dark:text-white hover:bg-[#F5F5F7] dark:hover:bg-[#1B2C4F]"
                                      >
                                        {m.label}
                                      </button>
                                    ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                };


                const moreButton = (left: number) =>
                  left > 0 ? (
                    <button
                      type="button"
                      onClick={() => setBoardLimit((n) => n + BOARD_PAGE)}
                      className="w-full py-2.5 rounded-xl border border-dashed border-[#B9C8E4] dark:border-[#38383A] text-xs font-extrabold text-[#007AFF] dark:text-[#409CFF] hover:bg-white dark:hover:bg-[#0F1A30]"
                    >
                      {isTl
                        ? `Ipakita pa ang ${Math.min(BOARD_PAGE, left)} (${left} pa ang natitira)`
                        : `Show ${Math.min(BOARD_PAGE, left)} more (${left} left)`}
                    </button>
                  ) : null;

                return (
                  <>
                    {todo.length > 0 && (
                      <div className="space-y-2.5">
                        {todo.slice(0, boardLimit).map(card)}
                        {moreButton(todo.length - boardLimit)}
                      </div>
                    )}
                    {todo.length === 0 && groupDone && done.length > 0 && (
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 text-center py-4">
                         {isTl ? 'Walang kasong naghihintay. Ayos!' : 'No case is waiting. All caught up!'}
                      </p>
                    )}
                    {done.length > 0 &&
                      (groupDone ? (
                        <div className="space-y-2.5">
                          <button
                            type="button"
                            onClick={() => setShowDoneCases((v) => !v)}
                            aria-expanded={showDoneCases}
                            className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white"
                          >
                            <span className={`inline-block transition-transform ${showDoneCases ? 'rotate-90' : ''}`}>▸</span>
                            {isTl ? 'Tapos na' : 'Done'} · {done.length}
                            <span className="normal-case tracking-normal font-semibold">
                              — {showDoneCases ? (isTl ? 'itago' : 'hide') : (isTl ? 'ipakita' : 'show')}
                            </span>
                          </button>
                          {showDoneCases && done.slice(0, boardLimit).map(card)}
                          {showDoneCases && moreButton(done.length - boardLimit)}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {done.slice(0, boardLimit).map(card)}
                          {moreButton(done.length - boardLimit)}
                        </div>
                      ))}
                  </>
                );
              })()}
            </div>
          </section>
        )}

        {/* ==================================================================
            SUB-TAB: CLOSED CASES ARCHIVE (EXECUTIVE SUMMARY & 1-CLICK PDF/PRINT)
            ================================================================== */}
        {subTab === 'closed-cases' && (
          <section className="space-y-4">
            <p className="px-1 text-[15px] text-[#6E6E73] dark:text-[#A1A1A6]">
              {isTl
                ? `${summaryStats.closedCases} saradong kaso. Pindutin ang isang kaso para makita ang buong record, o i-print ang buod.`
                : `${summaryStats.closedCases} closed case${summaryStats.closedCases === 1 ? '' : 's'}. Open one to see the full record, or print its summary.`}
            </p>

            {(() => {
              const closed = cases.filter((c) => c.status === 'Resolved');
              if (closed.length === 0) {
                return (
                  <div className="py-14 text-center space-y-1.5">
                    <Check className="w-7 h-7 mx-auto mb-2 text-[#C7C7CC] dark:text-[#636366]" aria-hidden />
                    <p className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Wala pang saradong kaso' : 'No closed cases yet'}</p>
                    <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Lalabas dito ang kaso kapag naisara na.' : 'A case shows up here once it is closed.'}</p>
                  </div>
                );
              }
              const fact = (label: string, value: string | undefined, accent = false) => (
                <div className="min-w-0">
                  <span className="block text-[11px] text-[#8E8E93]">{label}</span>
                  <span className={`block text-[13px] truncate ${accent ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-[#1D1D1F] dark:text-[#F5F5F7]'}`} title={value || ''}>
                    {value?.trim() ? value : '—'}
                  </span>
                </div>
              );
              const printSummary = async (c: DisciplineCaseRecord, mode: 'print' | 'download') => {
                const stu = students.find((s) => s.studentNumber === c.studentNumber);
                const ok = await confirmChange({
                  title: mode === 'print' ? (isTl ? 'I-print ang buod ng kaso?' : 'Print the case summary?') : isTl ? 'I-download ang buod (PDF)?' : 'Download the summary (PDF)?',
                  description: `${c.studentName} · ${c.caseCode}`,
                  rows: [{ label: isTl ? 'Kaso' : 'Case', after: c.caseCode }],
                  confirmLabel: mode === 'print' ? (isTl ? 'Mag-print' : 'Print') : isTl ? 'I-download' : 'Download',
                  tone: 'primary',
                });
                if (!ok) return;
                const html = buildFormHtml({ kind: 'caseResolutionSummary', c, stu }, window.location.origin);
                if (mode === 'download') {
                  await downloadFormDocument(html, `${c.caseCode}_Case_Summary`);
                  onTriggerToast(isTl ? `Na-download ang buod ng ${c.caseCode}.` : `Downloaded the summary of ${c.caseCode}.`);
                } else if (printHtml(html)) {
                  onTriggerToast(isTl ? 'Bukas na ang print window (piliin ang printer o Save as PDF).' : 'The print window is open (choose a printer or Save as PDF).');
                }
              };

              return (
                <div className="space-y-2.5">
                  {closed.map((c) => {
                    const withdrawn = isWithdrawn(c);
                    const summonsTotal = appointments.filter((x) => x.caseId === c.caseCode).length || c.summonsCount || 0;
                    const initials = c.studentName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
                    return (
                      <div
                        key={c.caseCode}
                        role="button"
                        tabIndex={0}
                        title={c.caseCode}
                        onClick={() => {
                          soundFX.playStepUnlock();
                          setOpenCaseCode(c.caseCode);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setOpenCaseCode(c.caseCode);
                        }}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,2fr)_auto] items-center gap-x-5 gap-y-2 row-card px-4 py-3.5 cursor-pointer"
                      >
                        <span aria-hidden="true" className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white ${withdrawn ? 'bg-[#8E8E93]' : 'bg-emerald-500'}`}>
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{c.studentName}</span>
                            <span className={`shrink-0 px-2 py-px rounded-full text-[10.5px] font-semibold ${withdrawn ? 'bg-[#F5F5F7] text-[#6E6E73] dark:bg-white/[0.08] dark:text-[#A1A1A6]' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'}`}>
                              {withdrawn ? (isTl ? 'Binawi' : 'Withdrawn') : isTl ? 'Sarado' : 'Closed'}
                            </span>
                          </div>
                          <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] line-clamp-2">
                            <span className="text-[#1D1D1F] dark:text-[#E5E5EA]">{isTl ? c.offenseTitleTl : c.offenseTitleEn}</span> · {c.gradeSection} · {prettyDate(c.incidentDate)}
                          </p>
                        </div>
                        <div className="hidden lg:grid grid-cols-3 gap-4">
                          {fact(isTl ? 'Desisyon' : 'Decision', withdrawn ? (c.decision ?? '').replace(/^(Withdrawn|Not proven):\s*/i, `${closedWord(c)}: `) : c.decision)}
                          {fact(isTl ? 'Sanction' : 'Sanction', c.sanction, c.sanctionStatus === 'Done')}
                          {fact(
                            isTl ? 'Patawag sa magulang' : 'Parent summons',
                            summonsTotal > 0
                              ? `${summonsTotal} · ${c.proceededWithoutParent ? (isTl ? 'tumuloy nang wala' : 'went on without') : c.parentConferenceStatus === 'Attended' ? (isTl ? 'dumalo' : 'came') : isTl ? 'naitala' : 'recorded'}`
                              : isMinorCase(c) ? (isTl ? 'Hindi kailangan (1st minor)' : 'Not needed (1st minor)') : undefined
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => void printSummary(c, 'download')}
                            title={isTl ? 'I-download ang buod (PDF)' : 'Download the summary (PDF)'}
                            aria-label={isTl ? 'I-download ang buod (PDF)' : 'Download the summary (PDF)'}
                            className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-white/[0.08] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.14] flex items-center justify-center text-[#6E6E73] dark:text-[#A1A1A6]"
                          >
                            <Download className="w-4 h-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => void printSummary(c, 'print')}
                            className="btn-press h-8 px-4 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" aria-hidden />
                            {isTl ? 'I-print ang buod' : 'Print summary'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>
        )}

        {/* ==================================================================
            SUB-TAB 3: STUDENT DIRECTORY & OFFENSE HISTORY (PAGE 4)
            ================================================================== */}
        {subTab === 'students' && (
          <section className="space-y-4">
            {/* ONE toolbar row: sections · Filter & sort · More (Add student is already the button on top) */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
              {/* Grade first, then section (Grade 11 / Grade 12 are picked most often) */}
              <div className="seg-track" role="tablist" aria-label={isTl ? 'Baitang' : 'Grade'}>
                {(['ALL', '11', '12'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="tab"
                    aria-selected={studentGrade === g}
                    onClick={() => {
                      setStudentGrade(g);
                      setSectionFilter('ALL');
                      setDirPage(0);
                    }}
                    className={`px-3 py-1.5 text-xs whitespace-nowrap ${studentGrade === g ? 'seg-on' : 'seg-off'}`}
                  >
                    {g === 'ALL' ? (isTl ? 'Lahat ng grade' : 'All grades') : `Grade ${g}`}{' '}
                    <span className="tabular-nums opacity-70">{g === 'ALL' ? students.length : students.filter((s) => gradeOf(s) === g).length}</span>
                  </button>
                ))}
              </div>
              <div className="seg-track flex-wrap" role="tablist" aria-label={isTl ? 'Section' : 'Section'}>
                {[['ALL', sectionOptions.reduce((a, [, n]) => a + n, 0)] as [string, number], ...sectionOptions].map(([sec, n]) => (
                  <button
                    key={sec}
                    type="button"
                    role="tab"
                    aria-selected={sectionFilter === sec}
                    onClick={() => {
                      setSectionFilter(sec);
                      setDirPage(0);
                    }}
                    className={`px-3 py-1.5 text-xs whitespace-nowrap ${sectionFilter === sec ? 'seg-on' : 'seg-off'}`}
                  >
                    {sec === 'ALL' ? (isTl ? 'Lahat' : 'All') : sec} <span className="tabular-nums opacity-70">{n}</span>
                  </button>
                ))}
              </div>
              </div>
              <div className="flex items-center gap-2">
                <details className="relative">
                  <summary className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${enrolledFilter !== 'enrolled' || studentOffense !== 'all' ? 'bg-[#007AFF]/10 text-[#007AFF] dark:text-[#409CFF]' : 'bg-white dark:bg-white/[0.06] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-[0_0_0_0.5px_rgb(15_23_42/0.1)] hover:bg-[#F5F5F7] dark:hover:bg-white/[0.1]'}`}>
                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
                    {isTl ? 'Filter at ayos' : 'Filter & sort'}
                  </summary>
                  <div className="absolute right-0 top-full mt-2 z-30 p-4 ring-card w-[300px] space-y-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Offense' : 'Offenses'}</span>
                      <div className="flex flex-col">
                        {(
                          [
                            ['all', isTl ? 'Lahat' : 'All students', ''],
                            ['serious', isTl ? 'May serious offense' : 'Has a serious offense', 'bg-rose-500'],
                            ['watch', isTl ? 'Bantayan (2+ minor)' : 'Watch (2+ minor)', 'bg-amber-400'],
                            ['minor', isTl ? '1 minor' : '1 minor', 'bg-sky-500'],
                            ['none', isTl ? 'Walang offense' : 'No offense', 'bg-emerald-500'],
                          ] as const
                        ).map(([k, t, dot]) => (
                          <button
                            key={k}
                            type="button"
                            data-offense-filter={k}
                            onClick={() => { setStudentOffense(k); setDirPage(0); }}
                            className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg text-[13px] text-left text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                          >
                            <span className="flex items-center gap-2">
                              {dot ? <span className={`w-2 h-2 rounded-full ${dot}`} /> : <span className="w-2 h-2" />}
                              {t}
                              <span className="text-[#8E8E93] tabular-nums">
                                {k === 'all' ? students.length : students.filter((s) => offenseLevel(s) === k).length}
                              </span>
                            </span>
                            {studentOffense === k && <Check className="w-4 h-4 text-[#007AFF] dark:text-[#409CFF]" aria-hidden />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Ipakita' : 'Show'}</span>
                      <div className="seg-track w-full">
                        {(
                          [
                            ['enrolled', isTl ? `Naka-enroll ${students.filter((x) => x.enrolled !== false).length}` : `Enrolled ${students.filter((x) => x.enrolled !== false).length}`],
                            ['left', isTl ? `Umalis ${students.filter((x) => x.enrolled === false).length}` : `Left ${students.filter((x) => x.enrolled === false).length}`],
                          ] as const
                        ).map(([k, t]) => (
                          <button key={k} type="button" data-enrolled-filter={k} onClick={() => { setEnrolledFilter(k); setDirPage(0); }} className={`flex-1 px-3 py-1.5 text-xs ${enrolledFilter === k ? 'seg-on' : 'seg-off'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Ayos' : 'Sort'}</span>
                      <SortControl id="students" value={studentSort} onChange={(v) => { setStudentSort(v); setDirPage(0); }} isTl={isTl} />
                    </div>
                  </div>
                </details>
                <details className="relative">
                  <summary
                    title={isTl ? 'Iba pa' : 'More'}
                    aria-label={isTl ? 'Iba pa' : 'More'}
                    className="list-none [&::-webkit-details-marker]:hidden cursor-pointer h-9 w-9 rounded-full inline-flex items-center justify-center bg-white dark:bg-white/[0.06] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-[0_0_0_0.5px_rgb(15_23_42/0.1)] hover:bg-[#F5F5F7] dark:hover:bg-white/[0.1]"
                  >
                    <MoreHorizontal className="w-4 h-4" aria-hidden />
                  </summary>
                  <div className="absolute right-0 top-full mt-2 z-30 p-2 ring-card w-[300px]">
                    <button
                      type="button"
                      data-action="move-up"
                      onClick={() => void moveUpSchoolYear()}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    >
                      <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Umakyat ng school year…' : 'Move up a school year…'}</span>
                      <span className="block text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Grade 11 → 12, Grade 12 → Graduated' : 'Grade 11 → 12, Grade 12 → Graduated'}</span>
                    </button>
                  </div>
                </details>
              </div>
            </div>

            {filteredDirectoryStudents.length === 0 ? (
              <div className="py-14 text-center space-y-2">
                <p className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {students.length === 0
                    ? isTl ? 'Wala pang estudyante' : 'No students yet'
                    : quickSearch.trim()
                    ? isTl ? `Walang tugma sa "${quickSearch.trim()}"` : `No student matches "${quickSearch.trim()}"`
                    : isTl ? 'Walang estudyante dito' : 'No students here'}
                </p>
                <div className="flex justify-center gap-2">
                  {sectionFilter !== 'ALL' && (
                    <button type="button" onClick={() => setSectionFilter('ALL')} className="h-9 px-4 rounded-full text-xs font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04]">
                      {isTl ? 'Ipakita lahat' : 'Show all students'}
                    </button>
                  )}
                  {students.length === 0 && (
                    <button type="button" onClick={() => setSubTab('masterlist')} className="h-9 px-4 rounded-full bg-[#007AFF] text-white text-xs font-semibold">
                      {isTl ? 'I-import ang masterlist' : 'Import masterlist'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Apple inset grouped list: one surface, hairline dividers, chevron = opens the record */
              <div className="space-y-2.5">
                {pagedDirectoryStudents.map((stu) => {
                  const hasRecord = stu.minorOffenseCount > 0 || stu.majorOffenseCount > 0;
                  const open = () => {
                    soundFX.playStepUnlock();
                    setSelectedStudentProfile(stu);
                    setPasswordResetCode(null);
                  };
                  return (
                    <div
                      key={stu.studentNumber}
                      role="button"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') open();
                      }}
                      className="row-card group px-4 py-3.5 flex items-center gap-3.5 cursor-pointer"
                    >
                      <StudentGenderAvatar fullName={stu.fullName} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                          {stu.fullName} <span className="text-[13px] font-normal text-[#8E8E93]">#{stu.studentNumber}</span>
                        </p>
                        <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] truncate">
                          {stu.gradeSection} · {isTl ? 'Magulang' : 'Parent'}: {stu.parentName}
                          {stu.parentPhone ? '' : isTl ? ' · walang number' : ' · no number'}
                        </p>
                      </div>
                      {/* only show a badge when there is something to see (no "No offense" on every row) */}
                      {hasRecord && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${attentionBadge(stu).cls}`}>
                          {attentionBadge(stu).text}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-[#C7C7CC] dark:text-[#636366] shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </div>
                  );
                })}
              </div>
            )}

            {dirPageCount > 1 && (
              <div className="flex items-center justify-between text-xs text-[#6E6E73] dark:text-[#A1A1A6] px-1">
                <span className="tabular-nums">
                  {safeDirPage * DIR_PAGE_SIZE + 1}–{Math.min((safeDirPage + 1) * DIR_PAGE_SIZE, filteredDirectoryStudents.length)} {isTl ? 'sa' : 'of'} {filteredDirectoryStudents.length}
                </span>
                <div className="seg-track">
                  <button type="button" disabled={safeDirPage === 0} onClick={() => setDirPage(safeDirPage - 1)} className="px-3 py-1.5 seg-off disabled:opacity-40">
                    ← {isTl ? 'Nakaraan' : 'Previous'}
                  </button>
                  <button type="button" disabled={safeDirPage >= dirPageCount - 1} onClick={() => setDirPage(safeDirPage + 1)} className="px-3 py-1.5 seg-off disabled:opacity-40">
                    {isTl ? 'Susunod' : 'Next'} →
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ==================================================================
            SUB-TAB 4: MASTERLIST IMPORT & PREVIEW-FIX TABLE (PAGE 15)
            ================================================================== */}
        {subTab === 'masterlist' && (
          <section className="space-y-6">
            {/* CDM-INSPIRED ORGANIZED STEP WIZARD CARD */}
            <div className="cdm-panel p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="text-[11px] font-extrabold tracking-wider uppercase text-[#007AFF] dark:text-[#409CFF]">
                    REGISTRAR / STUDENT RECORDS
                  </div>
                  <h2 className="text-xl font-extrabold text-[#1D1D1F] dark:text-white mt-0.5">
                    {isTl ? 'Mag-import ng Roster ng mga Estudyante' : 'Import Student Roster & Masterlist'}
                  </h2>
                  <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1">
                    {isTl
                      ? 'Mag-upload ng opisyal na record nang maayos at may pre-validation bago pumasok sa database.'
                      : 'Add official school records with instant structural validation before database insertion.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="btn-press px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-[#007AFF] text-xs font-bold text-[#1D1D1F] dark:text-white bg-white dark:bg-[#1C1C1E] flex items-center gap-2 shadow-sm"
                  >
                    <DuotoneIcon name="clipboardText" size={16} />
                    <span>{isTl ? 'I-download ang CSV Template' : 'Download CSV Template'}</span>
                  </button>

                  {totalPreviewErrors > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoFixMasterlist}
                      className="btn-press px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-[#1D1D1F] text-xs font-extrabold shadow-sm flex items-center gap-1.5"
                    >
                      <DuotoneIcon name="warningCircle" size={15} />
                      <span>{isTl ? 'Auto-Fix Numbers' : 'Auto-Fix Numbers'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={readyPreviewCount === 0 || savingMasterlist}
                    onClick={handleCommitMasterlistToDb}
                    className="btn-press px-5 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-extrabold shadow-sm disabled:opacity-40 flex items-center gap-2"
                  >
                    <DuotoneIcon name="checkSquareOffset" size={16} />
                    <span>
                      {savingMasterlist
                        ? isTl ? 'Sine-save…' : 'Saving…'
                        : isTl ? `I-save sa Masterlist (${readyPreviewCount})` : `Save to Masterlist (${readyPreviewCount})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* 3-STEP GUIDE BOX (EXACT PATTERN FROM CDM PORTAL) */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-[#1D1D1F] dark:text-white">
                  {isTl ? 'Paano ito gumagana' : 'How it works'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Step 1 Card */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="cdm-step-pill">1</span>
                      <span className="text-xs font-black text-[#1D1D1F] dark:text-white">
                        {isTl ? 'I-download ang Template' : 'Download the template'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#6E6E73] dark:text-[#A1A1A6] leading-relaxed">
                      {isTl
                        ? 'Gamitin ang opisyal na format kada estudyante. Panatilihin ang eksaktong headers.'
                        : 'Use one row per student or record. Keep the exact column headers intact.'}
                    </p>
                  </div>

                  {/* Step 2 Card */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="cdm-step-pill">2</span>
                      <span className="text-xs font-black text-[#1D1D1F] dark:text-white">
                        {isTl ? 'Punan ang Detalye' : 'Fill official record details'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#6E6E73] dark:text-[#A1A1A6] leading-relaxed">
                      {isTl
                        ? 'Student number, buong pangalan, baitang, seksyon, pangalan ng magulang, at mobile number.'
                        : 'Student number, full name, strand, section, parent name, and emergency contact number.'}
                    </p>
                  </div>

                  {/* Step 3 Card */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="cdm-step-pill">3</span>
                      <span className="text-xs font-black text-[#1D1D1F] dark:text-white">
                        {isTl ? 'I-preview at I-confirm' : 'Preview and confirm'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#6E6E73] dark:text-[#A1A1A6] leading-relaxed">
                      {isTl
                        ? 'Suriin ang mga error bago pumasok sa database. Awtomatikong sasalain ang duplicates.'
                        : 'Correct any flagged errors first. Inactive and duplicate records are safely isolated.'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
                  <p className="font-bold">
                    {isTl ? 'Mga Kailangang Column:' : 'Required columns:'}{' '}
                    <span className="font-normal font-mono text-[10.5px]">
                      student_number, first_name, last_name, strand, section, parent_name, parent_phone
                    </span>
                  </p>
                  <p className="font-medium text-blue-800/80 dark:text-blue-300/80">
                    {isTl
                      ? 'Tumatanggap ng Excel (.xlsx), CSV, at text sheets. Hindi kailanman mao-overwrite ang may kaso nang estudyante.'
                      : 'Accepts Excel (.xlsx), CSV, and text roster exports. Existing disciplinary case logs are never overwritten.'}
                  </p>
                </div>
              </div>

              {/* STEP 1 — UPLOAD ROSTER DROPZONE (CDM STYLE) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1D1D1F] dark:text-white">
                    {isTl ? 'Mag-upload ng Roster File' : 'Upload Roster'}
                  </h3>
                  <span className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                    CSV or XLSX, up to 1,000 rows
                  </span>
                </div>

                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setImportDragOver(true);
                  }}
                  onDragLeave={() => setImportDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setImportDragOver(false);
                    void handleImportFile(e.dataTransfer.files?.[0]);
                  }}
                  className={`block rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                    importDragOver
                      ? 'border-[#007AFF] bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-slate-300 dark:border-slate-700 hover:border-[#007AFF] hover:bg-slate-50/60 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <input
                    type="file"
                    accept=".xlsx,.csv,.txt,.xls,.pdf,.ods"
                    className="sr-only"
                    onChange={(e) => {
                      void handleImportFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#007AFF] dark:text-[#409CFF] flex items-center justify-center mx-auto mb-2">
                    <DuotoneIcon name="folderOpen" size={20} />
                  </div>
                  <p className="text-sm font-extrabold text-[#1D1D1F] dark:text-white">
                    {isTl
                      ? 'I-drag dito ang Excel o CSV file, o pindutin para pumili'
                      : 'Choose completed CSV / Excel file or drag and drop'}
                  </p>
                  <p className="mt-1 text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                    {isTl
                      ? 'Kahit anong ayos ng columns — awtomatikong tutukuyin ng scanner ang mga fields.'
                      : 'Automatic header matching with duplicate detection.'}
                  </p>
                </label>
              </div>
            </div>

            {importError && (
              <div
                role="alert"
                className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-[13px] font-semibold text-rose-800 dark:text-rose-200"
              >
                <span> {importError}</span>
                <button type="button" onClick={() => setImportError('')} className="font-extrabold" aria-label="Dismiss">
                  
                </button>
              </div>
            )}

            {/* STEP 2 — Match Columns */}
            {importAnalysis && (
              <div className="rounded-2xl border border-[#CFD9F2] dark:border-[#243B6B] overflow-hidden">
                <div className="px-5 py-4 bg-[#F1F5FD] dark:bg-[#12203F] border-b border-[#CFD9F2] dark:border-[#243B6B]">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#007AFF] dark:text-[#409CFF]">
                    {isTl ? 'Step 2 · I-check ang mga column' : 'Step 2 · Check the columns'}
                  </p>
                  <h3 className="mt-0.5 text-sm font-extrabold text-[#1D1D1F] dark:text-white">
                    {isTl
                      ? `Nakabasa ng ${importAnalysis.extract.rows.length} estudyante sa "${importAnalysis.fileName}"`
                      : `Found ${importAnalysis.extract.rows.length} students in "${importAnalysis.fileName}"`}
                  </h3>
                  <p className="mt-1 text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                    {importAnalysis.layouts.length > 1
                      ? isTl
                        ? `Binasa ang ${importAnalysis.layouts.length} sheet: ${importAnalysis.layouts.map((l) => l.sheetName).join(', ')}. `
                        : `Read ${importAnalysis.layouts.length} sheets: ${importAnalysis.layouts.map((l) => l.sheetName).join(', ')}. `
                      : ''}
                    {isTl
                      ? `Header sa row ${importAnalysis.layout.headerRowIndex + 1}. Kung may maling column, palitan sa ibaba.`
                      : `Header on row ${importAnalysis.layout.headerRowIndex + 1}. If a column is wrong, change it below.`}
                    {importAnalysis.skippedSheets.length > 0 &&
                      (isTl
                        ? ` Nilaktawan: ${importAnalysis.skippedSheets.join(', ')} (walang student list).`
                        : ` Skipped: ${importAnalysis.skippedSheets.join(', ')} (no student list).`)}
                    {importAnalysis.truncated &&
                      (isTl ? ' Unang 5,000 row lang ang binasa.' : ' Only the first 5,000 rows were read.')}
                  </p>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
                  {FIELD_ORDER.map((field) => {
                    const m = importAnalysis.layout.mapping;
                    // Hide alternatives that don't apply to keep it simple
                    if (field === 'gradeSection' && m.grade >= 0 && m.section >= 0) return null;
                    if ((field === 'lastName' || field === 'firstName' || field === 'middleName') && m.fullName >= 0 && m[field] < 0)
                      return null;
                    if (field === 'fullName' && m.fullName < 0 && m.lastName >= 0) return null;
                    const col = m[field];
                    const sampleRow = importAnalysis.sheets[importAnalysis.layout.sheetIndex].rows[
                      importAnalysis.layout.headerRowIndex + 1
                    ];
                    const sample = col >= 0 && sampleRow ? String(sampleRow[col] ?? '') : '';
                    const meta = FIELD_LABELS[field];
                    return (
                      <div key={field} className="grid grid-cols-[150px_1fr] items-center gap-3 text-xs">
                        <label htmlFor={`map-${field}`} className="font-bold text-[#1D1D1F] dark:text-white">
                          {isTl ? meta.tl : meta.en}
                          {meta.required && <span className="text-rose-600"> *</span>}
                        </label>
                        <div className="min-w-0">
                          <select
                            id={`map-${field}`}
                            value={col}
                            onChange={(e) => updateImportMapping(field, Number(e.target.value))}
                            className={`w-full px-2.5 py-1.5 rounded-lg saas-card-subtle font-semibold ${
                              col < 0 && meta.required ? 'ring-2 ring-rose-500' : col >= 0 ? 'ring-1 ring-emerald-500/60' : ''
                            }`}
                          >
                            <option value={-1}>{isTl ? '— Wala sa file —' : '— Not in file —'}</option>
                            {importAnalysis.layout.headers.map((h, i) => (
                              <option key={i} value={i}>
                                {h || `${isTl ? 'Column' : 'Column'} ${i + 1}`}
                              </option>
                            ))}
                          </select>
                          {sample && (
                            <p className="mt-0.5 truncate text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                              {isTl ? 'Hal.:' : 'e.g.'} {sample}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {importMissingRequired.length > 0 && (
                  <p className="mx-5 mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[12px] font-semibold text-amber-900 dark:text-amber-200">
                    {' '}
                    {isTl
                      ? `Hindi nakita: ${importMissingRequired.join(', ')}. Piliin ang tamang column, o ituloy at punan sa preview.`
                      : `Not found: ${importMissingRequired.join(', ')}. Pick the right column, or continue and fill them in the preview.`}
                  </p>
                )}

                <div className="px-5 py-3 flex justify-end gap-2 bg-[#F5F5F7] dark:bg-[#1C1C1E] border-t border-[#E5E5EA] dark:border-[#38383A]">
                  <button
                    type="button"
                    onClick={() => setImportAnalysis(null)}
                    className="btn-press px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold"
                  >
                    {isTl ? 'Kanselahin' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyImport}
                    disabled={importAnalysis.extract.rows.length === 0}
                    className="btn-press px-5 py-2 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-extrabold disabled:opacity-40"
                  >
                    {isTl
                      ? `Tama na → Ipakita ang ${importAnalysis.extract.rows.length} sa Preview`
                      : `Looks right → Preview ${importAnalysis.extract.rows.length} students`}
                  </button>
                </div>
              </div>
            )}

            {previewRows.length === 0 ? (
              <div className="p-8 rounded-2xl saas-card-subtle text-center space-y-3">
                <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">
                  {isTl ? 'Wala pang naka-preview na estudyante.' : 'No students in the preview yet.'}
                </p>
                <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                  {isTl
                    ? 'I-upload ang Excel sa itaas. Hindi sigurado sa format? Pindutin ang "I-download ang Template".'
                    : 'Upload the Excel file above. Not sure of the format? Press "Download Template".'}
                </p>
                {/* practice rows only while developing — never in the build the office uses */}
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewSourceLabels({});
                      setPreviewRows(SAMPLE_MASTERLIST_IMPORT_BATCH);
                    }}
                    className="px-4 py-2 rounded-xl saas-card-subtle text-xs font-bold"
                  >
                    {isTl ? 'Practice rows (dev lang)' : 'Practice rows (dev only)'}
                  </button>
                )}
              </div>
            ) : (
              <>
              {/* Filter + pager */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex p-1 rounded-xl saas-card-subtle text-xs font-bold" role="tablist">
                  {(
                    [
                      ['issues', isTl ? 'Kailangang ayusin' : 'Needs fixing', totalPreviewErrors],
                      ['ready', isTl ? 'Handa na' : 'Ready', readyPreviewCount],
                      ['all', isTl ? 'Lahat' : 'All', validatedPreviewRows.length],
                    ] as const
                  ).map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={previewFilter === key}
                      onClick={() => {
                        setPreviewFilter(key);
                        setPreviewPage(0);
                      }}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        previewFilter === key
                          ? key === 'issues'
                            ? 'bg-rose-600 text-white'
                            : key === 'ready'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#007AFF] text-white'
                          : 'text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      {label} <span className="font-mono opacity-80">({count})</span>
                    </button>
                  ))}
                </div>

                {previewPageCount > 1 && (
                  <div className="flex items-center gap-2 text-xs font-bold text-[#6E6E73] dark:text-[#A1A1A6]">
                    <span className="font-mono">
                      {safePreviewPage * PREVIEW_PAGE_SIZE + 1}–
                      {Math.min((safePreviewPage + 1) * PREVIEW_PAGE_SIZE, filteredPreviewRows.length)}{' '}
                      {isTl ? 'sa' : 'of'} {filteredPreviewRows.length}
                    </span>
                    <button
                      type="button"
                      aria-label={isTl ? 'Nakaraang page' : 'Previous page'}
                      disabled={safePreviewPage === 0}
                      onClick={() => setPreviewPage((pg) => Math.max(0, pg - 1))}
                      className="btn-press px-2.5 py-1.5 rounded-lg saas-card-subtle disabled:opacity-40"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      aria-label={isTl ? 'Susunod na page' : 'Next page'}
                      disabled={safePreviewPage >= previewPageCount - 1}
                      onClick={() => setPreviewPage((pg) => Math.min(previewPageCount - 1, pg + 1))}
                      className="btn-press px-2.5 py-1.5 rounded-lg saas-card-subtle disabled:opacity-40"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>

              {filteredPreviewRows.length === 0 ? (
                <div className="p-6 rounded-xl saas-card-subtle text-center text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {previewFilter === 'issues'
                    ? isTl
                      ? ' Wala nang kailangang ayusin!'
                      : ' Nothing left to fix!'
                    : isTl
                    ? 'Walang row dito.'
                    : 'No rows here.'}
                </div>
              ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E5E5EA] dark:border-[#38383A]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="saas-card-subtle border-b border-[#E5E5EA] dark:border-[#38383A] text-[#6E6E73] dark:text-[#A1A1A6] font-extrabold">
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Student ID / LRN</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Grade · Section</th>
                      <th className="py-3 px-4">Parent / Guardian</th>
                      <th className="py-3 px-4">Parent Mobile</th>
                      <th className="py-3 px-4">Parent Gmail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#38383A]">
                    {pagedPreviewRows.map((row) => (
                      <tr
                        key={row.rowId}
                        className={
                          row.isValid
                            ? 'bg-white dark:bg-[#1C1C1E]'
                            : 'bg-rose-50/60 dark:bg-rose-950/25'
                        }
                      >
                        <td className="py-2.5 px-4 align-top w-56">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold whitespace-nowrap">
                              {row.isUpdate ? `↻ ${isTl ? 'Ia-update' : 'Will update'}` : ` ${isTl ? 'Bago · handa nang i-save' : 'New · ready to save'}`}
                            </span>
                          ) : (
                            <ul className="space-y-1">
                              {row.issues.map((iss, i) => (
                                <li
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[11px] leading-snug"
                                >
                                   {iss}
                                </li>
                              ))}
                              <li>
                                <button
                                  type="button"
                                  data-action="remove-preview-row"
                                  onClick={() => removePreviewRow(row.rowId)}
                                  className="mt-0.5 px-2 py-0.5 rounded-md border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-bold text-[11px] hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                >
                                  {isTl ? "Alisin ang row na ito" : "Remove this row"}
                                </button>
                              </li>
                            </ul>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={row.studentNumber}
                            onChange={(e) =>
                              setPreviewRows((prev) =>
                                prev.map((item) =>
                                  item.rowId === row.rowId
                                    ? { ...item, studentNumber: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-28 px-2.5 py-1 rounded-lg saas-card-subtle font-mono font-bold"
                          />
                          {previewSourceLabels[row.rowId] && (
                            <p className="mt-0.5 text-[10px] text-[#6E6E73] dark:text-[#A1A1A6]">
                              {isTl ? 'Sa file:' : 'In file:'} {previewSourceLabels[row.rowId]}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={row.fullName}
                            onChange={(e) =>
                              setPreviewRows((prev) =>
                                prev.map((item) =>
                                  item.rowId === row.rowId
                                    ? { ...item, fullName: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-44 px-2.5 py-1 rounded-lg saas-card-subtle font-bold"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <select
                              aria-label={isTl ? 'Baitang' : 'Grade level'}
                              value={(row.gradeSection.match(/^Grade (11|12)/) || [])[1] || ''}
                              onChange={(e) => {
                                const g = e.target.value;
                                setPreviewRows((prev) =>
                                  prev.map((item) =>
                                    item.rowId === row.rowId
                                      ? {
                                          ...item,
                                          gradeSection: g
                                            ? `Grade ${g}${item.sectionCode ? ` · ${item.sectionCode}` : ''}`
                                            : item.sectionCode,
                                        }
                                      : item
                                  )
                                );
                              }}
                              className="px-1.5 py-1 rounded-lg saas-card-subtle font-bold"
                            >
                              <option value="">G?</option>
                              <option value="11">G11</option>
                              <option value="12">G12</option>
                            </select>
                            <input
                              type="text"
                              aria-label="Section"
                              value={row.sectionCode}
                              placeholder="ICT-1"
                              onChange={(e) => {
                                const sec = e.target.value.toUpperCase();
                                setPreviewRows((prev) =>
                                  prev.map((item) => {
                                    if (item.rowId !== row.rowId) return item;
                                    const g = (item.gradeSection.match(/^Grade (11|12)/) || [])[1] || '';
                                    return {
                                      ...item,
                                      sectionCode: sec,
                                      gradeSection: g ? `Grade ${g}${sec ? ` · ${sec}` : ''}` : sec,
                                    };
                                  })
                                );
                              }}
                              className="w-20 px-2 py-1 rounded-lg saas-card-subtle font-bold"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={row.parentName}
                            placeholder={isTl ? 'Pangalan ng magulang…' : 'Parent name…'}
                            onChange={(e) =>
                              setPreviewRows((prev) =>
                                prev.map((item) =>
                                  item.rowId === row.rowId
                                    ? { ...item, parentName: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-40 px-2.5 py-1 rounded-lg saas-card-subtle font-semibold"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="w-44">
                            <PhoneInput
                              compact
                              value={row.parentPhone}
                              onChange={(next) =>
                                setPreviewRows((prev) =>
                                  prev.map((item) =>
                                    item.rowId === row.rowId
                                      ? { ...item, parentPhone: next }
                                      : item
                                  )
                                )
                              }
                              isTl={isTl}
                              className="w-full px-2.5 py-1 rounded-lg saas-card-subtle font-mono font-semibold"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="email"
                            aria-label={isTl ? 'Gmail ng magulang' : 'Parent Gmail'}
                            value={row.parentEmail}
                            placeholder={isTl ? 'optional' : 'optional'}
                            onChange={(e) =>
                              setPreviewRows((prev) =>
                                prev.map((item) =>
                                  item.rowId === row.rowId ? { ...item, parentEmail: e.target.value.trim() } : item
                                )
                              )
                            }
                            className="w-44 px-2.5 py-1 rounded-lg saas-card-subtle font-semibold"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
              </>
            )}
          </section>
        )}
      </div>

      {/* Center popup: reads the whole Excel, walks every student, shows real findings */}
      <ImportScanModal
        open={scanOpen}
        isTl={isTl}
        fileName={importFileName}
        stage={importStage}
        analysis={scanAnalysis}
        findings={scanFindings}
        needsFixCount={scanNeedsFix}
        onContinue={handleScanContinue}
        onCancel={handleScanCancel}
      />

      {/* ====================================================================
          CASE DETAILS PANEL (portal → covers the whole window, not just the page)
          ==================================================================== */}
      {createPortal(
      <AnimatePresence>
        {openCase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 !m-0 z-50 bg-[#040E20]/65 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !caseEditing && setOpenCaseCode(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && !caseEditing && !document.querySelector('[data-evidence-viewer], [data-print-forms], [data-statement-station], [data-help-assistant]')) setOpenCaseCode(null);
            }}
          >
            <motion.div
              role="dialog"
              aria-label={isTl ? 'Detalye ng kaso' : 'Case details'}
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[calc(100dvh/var(--app-zoom,1)_-_2rem)] rounded-[22px] shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_40px_100px_-20px_rgba(4,14,32,0.5)] flex flex-col overflow-hidden"
            >
              <div className="w-full flex-1 min-h-0 rounded-[20px] panel-2026 flex flex-col overflow-hidden">
              {/* Apple sheet header (Dashboard theme): calm surface, big name, small chips */}
              <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <StudentGenderAvatar fullName={openCase.studentName} size="md" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {openCase.studentName}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${severityInfo(openCase.severity).cls}`}>
                        {severityInfo(openCase.severity).word}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          openCase.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                        }`}
                      >
                        {caseBadgeWord(openCase)}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                      {/* role as plain text, never "suspect" */}
                      <span title={isTl ? 'Ang estudyanteng inireklamo (respondent)' : 'The student this case is about (respondent)'}>{isTl ? 'Inireklamo' : 'Student reported'}</span> · {openCase.gradeSection} · #{openCase.studentNumber} · <span className="font-mono">{openCase.caseCode}</span>
                    </p>
                    {openCase.affectedStudentName && (
                      <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5" title={isTl ? 'Staff lang ang nakakakita nito' : 'Only staff can see this'}>
                        {isTl ? 'Naapektuhan' : 'Student affected'}: <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{openCase.affectedStudentName}</span>
                      </p>
                    )}
                  </div>
                </div>
                {/* toolbar (Apple Mail style): Edit, Print, More. The step's action stays the ONLY bar at the bottom */}
                {!caseEditing && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={startCaseEdit} title={isTl ? 'I-edit ang detalye ng kaso' : 'Edit case details'} className="h-8 px-3 rounded-full bg-[#F5F5F7] dark:bg-white/[0.08] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.14] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors text-[#1D1D1F] dark:text-[#F5F5F7]">
                      <Pencil className="w-3.5 h-3.5" aria-hidden />
                      {isTl ? 'I-edit' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCallSlipCase(openCase);
                        setOpenCaseCode(null);
                      }}
                      title={isTl ? 'Mag-print ng form (Kasunduan, conference form, sulat)' : 'Print a form (Kasunduan, conference form, letter)'}
                      className="h-8 px-3 rounded-full bg-[#F5F5F7] dark:bg-white/[0.08] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.14] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors text-[#1D1D1F] dark:text-[#F5F5F7]"
                    >
                      <Printer className="w-3.5 h-3.5" aria-hidden />
                      Print
                    </button>
                    {openCase.status === 'Resolved' ? (
                      <button type="button" onClick={() => handleUpdateCaseStatus(openCase, 'Open')} className="h-8 px-3 rounded-full bg-[#F5F5F7] dark:bg-white/[0.08] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.14] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors text-[#007AFF] dark:text-[#409CFF]">
                        {isTl ? 'Buksan ulit' : 'Reopen'}
                      </button>
                    ) : (
                      <details className="relative">
                        <summary aria-label={isTl ? 'Iba pa' : 'More'} title={isTl ? 'Iba pa' : 'More'} className="list-none [&::-webkit-details-marker]:hidden cursor-pointer w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-white/[0.08] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.14] flex items-center justify-center text-[#6E6E73] dark:text-[#A1A1A6]">
                          <MoreHorizontal className="w-4 h-4" aria-hidden />
                        </summary>
                        <div className="absolute right-0 top-full mt-2 z-40 p-1.5 ring-card w-[280px]">
                          {!/major|serious|grave|consecutive|2nd|3rd|[4-9]th/i.test(openCase.severity) && (
                            <button type="button" onClick={() => handleUpdateCaseStatus(openCase, 'Resolved')} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                              <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Paalala lang, isara' : 'Reminder only, close'}</span>
                              <span className="block text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Para sa 1st minor lang' : 'For a 1st minor only'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.currentTarget.closest('details')?.removeAttribute('open');
                              setWithdrawReason('');
                              setCloseMode('notProven');
                              setWithdrawFor(openCase);
                            }}
                            className="w-full flex items-start gap-2.5 text-left px-3 py-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                          >
                            <ShieldCheck className="w-4 h-4 mt-0.5 text-[#007AFF] dark:text-[#409CFF] shrink-0" aria-hidden />
                            <span>
                              <span className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Isara: Hindi napatunayan' : 'Close: Not proven'}</span>
                              <span className="block text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Walang sapat na ebidensya o hindi totoo. Hindi bibilang na offense.' : 'Not enough proof or found untrue. Does not count as an offense.'}</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.currentTarget.closest('details')?.removeAttribute('open');
                              setWithdrawReason('');
                              setCloseMode('withdraw');
                              setWithdrawFor(openCase);
                            }}
                            className="w-full flex items-start gap-2.5 text-left px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            <Undo2 className="w-4 h-4 mt-0.5 text-rose-600 shrink-0" aria-hidden />
                            <span>
                              <span className="block text-[13px] font-medium text-rose-700 dark:text-rose-300">{isTl ? 'Bawiin ang kaso' : 'Withdraw case'}</span>
                              <span className="block text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Para sa maling pagka-file. Mananatili sa records.' : 'Filed by mistake. It stays in the records.'}</span>
                            </span>
                          </button>
                        </div>
                      </details>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setOpenCaseCode(null)}
                  disabled={caseEditing}
                  title={isTl ? 'Isara' : 'Close'}
                  aria-label={isTl ? 'Isara' : 'Close'}
                  className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-white/[0.08] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.14] flex items-center justify-center text-[#6E6E73] dark:text-[#A1A1A6] disabled:opacity-40 shrink-0 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </div>

              {/* body */}
              <div className="overflow-y-auto clean-scroll space-y-4 p-5 bg-[#F5F5F7] dark:bg-[#1C1C1E]">
                {/* 1. 7-Step Progressive Flow Stepper & Action Card */}
                {/* One save at a time (Golden Rule 1): while editing the record, the step panel is paused */}
                {caseEditing && (
                  <p className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-[12px] font-medium text-amber-900 dark:text-amber-200">
                    {isTl ? "Nag-e-edit ka ng record. I-save o i-cancel muna bago ituloy ang hakbang." : "You are editing the record. Save or cancel first, then continue the steps."}
                  </p>
                )}
                <div className={caseEditing ? "opacity-40 pointer-events-none select-none" : ""} aria-disabled={caseEditing} {...(caseEditing ? { inert: "" } : {})}>
                <CaseFlowPanel 
                  key={openCase.caseCode + (openCase.step ?? '') + (openCase.decidedAt ?? '') + (openCase.parentConferenceStatus ?? '')} 
                  c={{
                    ...openCase,
                    // summons count comes from the saved conference appointments (it is not a DB column, so it survives a reload)
                    summonsCount: appointments.filter((x) => x.caseId === openCase.caseCode).length || openCase.summonsCount,
                  }}
                  student={openCaseStudent ?? undefined}
                  isTl={isTl} 
                  busy={flowBusy} 
                  suggestedSanction={suggestedSanctionFor(openCase)} 
                  onAction={(a) => void applyFlow(openCase, a)}
                  onScheduleOthers={async (items) => {
                    for (const it of items) await applyFlow(it.c, it.action);
                    const sched = items[0]?.action.kind === 'schedule_conference';
                    onTriggerToast(
                      sched
                        ? isTl ? `Na-schedule din ang ${items.length} pang magulang sa parehong araw.` : `${items.length} more parent(s) scheduled on the same day.`
                        : isTl ? `Naitala rin ang pagdalo ng ${items.length} pang pamilya.` : `Attendance saved for ${items.length} more family(ies).`
                    );
                  }}
                  onOpenStation={() => setStationCase(openCase)} 
                  onOpenPrint={(kind) => {
                    setCallSlipInitialForm(kind ?? null);
                    setCallSlipCase(openCase);
                  }}
                  appointments={appointments}
                  onComposeParent={
                    openCaseStudent
                      ? () => {
                          setOpenCaseCode(null);
                          onOpenParentComposer({
                            studentName: openCaseStudent.fullName,
                            gradeSection: openCaseStudent.gradeSection,
                            parentName: openCaseStudent.parentName,
                            parentPhone: openCaseStudent.parentPhone,
                            parentEmail: openCaseStudent.parentEmail,
                            scheduleText: '',
                            caseCode: openCase.caseCode,
                            message: decisionNoticeMessage('taglish', openCaseStudent.fullName),
                          });
                        }
                      : undefined
                  }
                  onSetWaitForAll={
                    openCase.incidentCode
                      ? async (on) => {
                          const code = openCase.incidentCode;
                          const group = cases.filter((x) => x.incidentCode === code);
                          setCases((prev) => prev.map((x) => (x.incidentCode === code ? { ...x, waitForAll: on } : x)));
                          const results = await Promise.all(group.map((g) => updateCaseFlowInDb(g.caseCode, { wait_for_all: on })));
                          if (results.some((r) => !r)) {
                            setCases((prev) => prev.map((x) => (x.incidentCode === code ? { ...x, waitForAll: !on } : x)));
                            onTriggerToast(isTl ? 'Hindi na-save. I-check ang internet, tapos subukan ulit.' : 'Not saved. Check the internet, then try again.');
                            return;
                          }
                          onTriggerToast(
                            on
                              ? isTl ? 'Hihintayin ang lahat ng magulang bago magdesisyon.' : 'Decisions now wait for every parent.'
                              : isTl ? 'Pwede nang mauna ang estudyanteng dumalo ang magulang.' : 'A student whose parent attended can now go first.'
                          );
                        }
                      : undefined
                  }
                  groupCases={openCase.incidentCode ? cases.filter((x) => x.incidentCode === openCase.incidentCode && x.caseCode !== openCase.caseCode && !isWithdrawn(x)) : []}
                  onUpdateStudentContact={async (studentNumber, phone, email) => {
                    const saved = await updateStudentDetailsInDb(studentNumber, {
                      parent_phone: phone,
                      parent_email: email,
                    });
                    if (saved) {
                      setStudents((prev) =>
                        prev.map((s) =>
                          s.studentNumber === studentNumber
                            ? { ...s, parentPhone: phone, parentEmail: email }
                            : s
                        )
                      );
                      onTriggerToast(
                        isTl
                          ? 'Na-save ang bagong contact info ng magulang.'
                          : 'Parent contact details updated successfully.'
                      );
                      return true;
                    }
                    onTriggerToast(
                      isTl ? 'Hindi na-save ang contact. I-check ang internet.' : 'Failed to save contact info.'
                    );
                    return false;
                  }}
                />
                </div>
                {/* every call / text to the parent for this case (proof the school tried to reach them) */}
                <ParentContactHistory caseCode={openCase.caseCode} isTl={isTl} refreshKey={(openCase.summonsCount ?? 0) + (openCase.parentConferenceStatus ?? '')} />
                
                {stationCase && (
                  <StatementStation 
                    studentName={stationCase.studentName} 
                    gradeSection={stationCase.gradeSection} 
                    isTl={isTl} 
                    onSubmit={(s) => saveStationStatement(stationCase, s.text)} 
                    onClose={closeStation} 
                  />
                )}

                {/* 2. Record, evidence and history as Apple grouped sections */}
                <div className="space-y-5 pt-2">
                  <section className="space-y-2">
                    <h4 className="px-1 text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Detalye ng insidente' : 'Incident'}</h4>
                    <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                      <div className="px-4 py-3 flex items-start justify-between gap-4">
                        <span className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] shrink-0">{isTl ? 'Paglabag' : 'Offense'}</span>
                        <span className="text-[14px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] text-right">{isTl ? openCase.offenseTitleTl : openCase.offenseTitleEn}</span>
                      </div>
                      <div className="px-4 py-3 flex items-center justify-between gap-4">
                        <label htmlFor="edit-incident-date" className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] shrink-0">{isTl ? 'Petsa' : 'Date'}</label>
                        {caseEditing ? (
                          <DateField value={editDate} onChange={setEditDate} isTl={isTl} max={todayISO()} ariaLabel={isTl ? 'Petsa ng insidente' : 'Incident date'} className="max-w-[260px]" />
                        ) : (
                          <span className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7]">{prettyDate(openCase.incidentDate)}</span>
                        )}
                      </div>
                      <div className="px-4 py-3 flex items-center justify-between gap-4">
                        <label htmlFor="edit-reported-by" className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] shrink-0">{isTl ? 'Nag-ulat' : 'Reported by'}</label>
                        {caseEditing ? (
                          <input id="edit-reported-by" type="text" value={editReportedBy} onChange={(e) => setEditReportedBy(e.target.value)} className="h-10 w-64 max-w-full px-3 rounded-xl border border-[#E5E5EA] dark:border-white/10 bg-white dark:bg-[#1C1C1E] text-[14px] text-[#1D1D1F] dark:text-white" />
                        ) : (
                          <span className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] text-right">{openCase.reportedBy}</span>
                        )}
                      </div>
                      {openCaseStudent && (
                        <div className="px-4 py-3 flex items-center justify-between gap-4">
                          <span className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] shrink-0">{isTl ? 'Magulang' : 'Parent'}</span>
                          <span className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] text-right">
                            {openCaseStudent.parentName}
                            {openCaseStudent.parentPhone ? (
                              <a href={`tel:${openCaseStudent.parentPhone.replace(/\D/g, '')}`} className="ml-1 text-[#007AFF] dark:text-[#409CFF] tabular-nums">· {openCaseStudent.parentPhone}</a>
                            ) : (
                              <span className="text-[#8E8E93]"> · {isTl ? 'walang number' : 'no number'}</span>
                            )}
                          </span>
                        </div>
                      )}
                      <div className="px-4 py-3 space-y-1.5">
                        <label htmlFor="edit-notes" className="block text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Salaysay' : 'What happened'}</label>
                        {caseEditing ? (
                          <textarea id="edit-notes" rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5EA] dark:border-white/10 bg-white dark:bg-[#1C1C1E] text-[14px] leading-relaxed text-[#1D1D1F] dark:text-white" />
                        ) : (
                          <p className="text-[14px] leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-pre-line">
                            {hideIncidentMarker(openCase.notes).replace(/^No notes added.$/, '').trim() || <span className="text-[#8E8E93]">{isTl ? 'Walang naisulat na kuwento.' : 'No narrative written.'}</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="px-1 text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Salaysay ng nag-ulat at testigo' : 'Reporter and witness statements'}</h4>
                    <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 p-4">
                      <StatementsPanel
                        caseCode={openCase.caseCode}
                        incidentCode={openCase.incidentCode}
                        isTl={isTl}
                        onPrintBlank={() => {
                          setCallSlipInitialForm('witnessStatement');
                          setCallSlipCase(openCase);
                        }}
                        onSaved={(m) => {
                          onTriggerToast(m);
                          void loadCaseHistory(openCase.caseCode);
                        }}
                      />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="px-1 text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Ebidensya' : 'Evidence'}</h4>
                    <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 p-4">
                      <EvidencePanel
                        caseCode={openCase.caseCode}
                        isTl={isTl}
                        by={appConfig.staff.find((x) => x.active)?.email ?? ''}
                        onToast={(m, undo) => onTriggerToast(m, undo)}
                        onChanged={() => void loadCaseHistory(openCase.caseCode)}
                      />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="px-1 text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Kasaysayan ng kaso' : 'Case history'}</h4>
                    <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 px-4 py-3">
                      {caseHistory === 'loading' ? (
                        <p className="text-[13px] text-[#8E8E93]">{isTl ? 'Kinukuha…' : 'Loading…'}</p>
                      ) : caseHistory === null ? (
                        <p className="text-[13px] text-rose-700 dark:text-rose-300">{isTl ? 'Hindi makuha ang kasaysayan. I-check ang internet.' : "Couldn't load the history. Check the internet."}</p>
                      ) : caseHistory.length === 0 ? (
                        <p className="text-[13px] text-[#8E8E93]">{isTl ? 'Wala pang naitala.' : 'Nothing recorded yet.'}</p>
                      ) : (
                        <ol className="relative space-y-3 pl-5 before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-black/[0.08] dark:before:bg-white/[0.12]">
                          {caseHistory.map((h, i) => (
                            <li key={i} className="relative">
                              <span className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#0F1B2E] ${i === 0 ? 'bg-[#2563EB]' : 'bg-[#C7C7CC] dark:bg-[#636366]'}`} />
                              <p className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? h.actionTl : h.actionEn}</p>
                              <p className="text-[12px] text-[#8E8E93]">{prettyTime(h.when)} · {h.actor}</p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              {/* footer only while editing: Cancel / Save (the one action at that moment) */}
              {caseEditing && (
                <div className="px-6 py-3 bg-white dark:bg-[#1C1C1E] border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
                  <button type="button" onClick={() => setCaseEditing(false)} className="h-10 px-5 rounded-full text-[14px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                    {isTl ? 'Huwag na' : 'Cancel'}
                  </button>
                  <button type="button" onClick={saveCaseEdit} className="btn-lit h-10 px-6 text-[14px] font-semibold">
                    {isTl ? 'I-save ang pagbabago' : 'Save changes'}
                  </button>
                </div>
              )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      ,document.body)}

      {/* WITHDRAW CASE: in-app dialog (window.prompt does not work in the Tauri desktop app) */}
      {withdrawFor && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setWithdrawFor(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdraw-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md ring-card p-6 space-y-4"
          >
            <div className="space-y-1">
              <h3 id="withdraw-title" className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {closeMode === 'notProven'
                  ? isTl ? `Isara ang ${withdrawFor.caseCode} bilang hindi napatunayan?` : `Close ${withdrawFor.caseCode} as not proven?`
                  : isTl ? `Bawiin ang ${withdrawFor.caseCode}?` : `Withdraw ${withdrawFor.caseCode}?`}
              </h3>
              <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">
                {withdrawFor.studentName} · {isTl ? withdrawFor.offenseTitleTl : withdrawFor.offenseTitleEn}
              </p>
            </div>
            <p className="text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-xl bg-[#F5F5F7] dark:bg-white/[0.06] px-3 py-2.5">
              {closeMode === 'notProven'
                ? isTl
                  ? 'Isasara ang kaso bilang "Hindi napatunayan". Hindi ito mabubura at hindi bibilangin bilang offense. Walang SMS na ipapadala.'
                  : 'The case is closed as "Not proven". It is not erased and does not count as an offense. No SMS is sent.'
                : isTl
                ? 'Isasara ang kaso bilang "Binawi". Hindi ito mabubura: makikita pa rin sa Closed Cases at Audit Trail, at hindi ito bibilangin bilang offense.'
                : 'The case is closed as "Withdrawn". It is not erased: it stays in Closed Cases and the Audit Trail, and does not count as an offense.'}
            </p>
            <div className="space-y-2">
              <label htmlFor="withdraw-reason" className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                {isTl ? 'Dahilan' : 'Reason'} <span className="text-rose-600">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(closeMode === 'notProven'
                  ? isTl
                    ? ['Walang sapat na ebidensya', 'Napatunayang hindi totoo', 'Magkasalungat ang salaysay']
                    : ['Not enough evidence', 'Found to be untrue', 'Statements conflict']
                  : isTl
                  ? ['Maling estudyante', 'Doble ang na-file', 'Maling offense', 'Hindi pala nangyari']
                  : ['Wrong student', 'Filed twice', 'Wrong offense', 'Did not happen']
                ).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setWithdrawReason(r)}
                    className={`h-8 px-3 rounded-full text-xs font-medium transition-colors active:scale-[0.97] ${
                      withdrawReason === r
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F5F5F7] dark:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.12]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                id="withdraw-reason"
                autoFocus
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder={isTl ? 'O isulat ang dahilan…' : 'Or type the reason…'}
                className="w-full h-10 px-3 rounded-xl saas-card-subtle text-sm text-[#1D1D1F] dark:text-white focus:outline-none focus:border-[#007AFF]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setWithdrawFor(null)}
                className="h-10 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                {isTl ? 'Huwag na' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={withdrawReason.trim().length < 3}
                onClick={async () => {
                  const c = withdrawFor;
                  const reason = withdrawReason.trim();
                  const mode = closeMode;
                  const decision = `${mode === 'notProven' ? 'Not proven' : 'Withdrawn'}: ${reason}`;
                  const closedAt = new Date().toISOString();
                  setWithdrawFor(null);
                  setCases((prev) => prev.map((x) => (x.caseCode === c.caseCode ? { ...x, status: 'Resolved', step: 'Closed' as DisciplineCaseRecord['step'], decision, closedAt } : x)));
                  const saved = await updateCaseFlowInDb(c.caseCode, { status: 'Resolved', step: 'Closed', decision, closed_at: closedAt });
                  if (!saved) {
                    setCases((prev) => prev.map((x) => (x.caseCode === c.caseCode ? c : x)));
                    onTriggerToast(isTl ? '⚠️ Hindi nabawi ang kaso. I-check ang internet, tapos subukan ulit.' : '⚠️ The case was not withdrawn. Check the internet, then try again.');
                    return;
                  }
                  // Undo the offense count this case added, so escalation stays correct
                  const stu = students.find((s) => s.studentNumber === c.studentNumber);
                  if (stu) {
                    const wasMinor = /minor/i.test(c.severity);
                    const wasEscalated = !isMinorSeverity(c.severity);
                    const minor = Math.max(0, stu.minorOffenseCount - (wasMinor ? 1 : 0));
                    const major = Math.max(0, stu.majorOffenseCount - (wasEscalated ? 1 : 0));
                    setStudents((prev) => prev.map((s) => (s.studentNumber === stu.studentNumber ? { ...s, minorOffenseCount: minor, majorOffenseCount: major } : s)));
                    void updateStudentOffenseInDb(stu.studentNumber, {
                      minor_offense_count: minor,
                      major_offense_count: major,
                      prior_offenses_en: stu.priorOffensesEn,
                      prior_offenses_tl: stu.priorOffensesTl,
                    });
                  }
                  void insertActivityLogInDb({
                    actor: 'Guidance Associate',
                    actionEn: mode === 'notProven' ? `Closed case ${c.caseCode} (${c.studentName}) as not proven · Reason: ${reason}` : `Withdrew case ${c.caseCode} (${c.studentName}) · Reason: ${reason}`,
                    actionTl: mode === 'notProven' ? `Isinara ang kasong ${c.caseCode} (${c.studentName}) bilang hindi napatunayan · Dahilan: ${reason}` : `Binawi ang kasong ${c.caseCode} (${c.studentName}) · Dahilan: ${reason}`,
                    tag: c.caseCode,
                    tone: 'rose',
                  });
                  setOpenCaseCode(null);
                  if (mode === 'notProven') {
                    // parent already summoned? next step: give them the "matter closed" notice (no details)
                    const parentInvolved = !!c.conferenceScheduledAt || (c.summonsCount || 0) > 0;
                    onTriggerToast(
                      isTl ? `Isinara ang ${c.caseCode}: hindi napatunayan. Nasa Closed Cases ito.` : `${c.caseCode} closed as not proven. It is in Closed Cases.`,
                      undefined,
                      parentInvolved
                        ? { label: isTl ? 'I-print ang paabiso sa magulang' : 'Print notice for the parent', run: () => { setCallSlipInitialForm('closedNotice'); setCallSlipCase({ ...c, status: 'Resolved', decision }); } }
                        : undefined
                    );
                  } else {
                    onTriggerToast(
                      isTl ? `Binawi ang ${c.caseCode}. Nasa Closed Cases ito.` : `${c.caseCode} was withdrawn. You can find it in Closed Cases.`
                    );
                  }
                }}
                className={closeMode === "notProven" ? "btn-lit h-10 px-5 text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed" : "h-10 px-5 rounded-full bg-[#E11D48] hover:bg-[#BE123C] disabled:bg-[#E11D48]/40 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-[background-color,transform] active:scale-[0.97]"}
              >
                {closeMode === 'notProven' ? (isTl ? 'Isara ang kaso' : 'Close the case') : isTl ? 'Bawiin ang kaso' : 'Withdraw case'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Print forms: call slip, conference form, behavioral contract, kasunduan, suspension letter, resolution summary */}
      {callSlipCase && (
        <PrintFormsWindow
          c={{ ...callSlipCase, summonsCount: appointments.filter((x) => x.caseId === callSlipCase.caseCode).length || callSlipCase.summonsCount }}
          stu={students.find((x) => x.studentNumber === callSlipCase.studentNumber)}
          isTl={isTl}
          initial={callSlipInitialForm ?? (callSlipCase.status === 'Resolved' ? 'caseResolutionSummary' : 'callSlip')}
          conferenceWhen={nextConfByCase.has(callSlipCase.caseCode) ? confText(nextConfByCase.get(callSlipCase.caseCode)!) : ''}
          onClose={() => {
            setCallSlipCase(null);
            setCallSlipInitialForm(null);
          }}
          onPrinted={(kind) => {
            const t = FORM_TITLES[kind];
            void insertActivityLogInDb({ actor: 'Guidance Associate', actionEn: `${callSlipCase.caseCode}: printed ${t[0]}`, actionTl: `${callSlipCase.caseCode}: nag-print ng ${t[1]}`, tag: callSlipCase.caseCode, tone: 'blue' });
            onTriggerToast(isTl ? ` Binuksan ang print ng ${t[1]}. Piliin ang printer at pindutin ang Print.` : ` ${t[0]} is ready to print. Pick the printer and press Print.`);
          }}
          onFailed={() => onTriggerToast(isTl ? ' Hindi mabuksan ang print. Isara at buksan ulit ang app, tapos subukan ulit.' : ' Could not open printing. Close and reopen the app, then try again.')}
        />
      )}

      {/* ====================================================================
          MODAL B: STUDENT FULL PROFILE, OFFENSE HISTORY & PASSWORD RESET ASSIST
          ==================================================================== */}
      <AnimatePresence>
        {studentFormFor && (
          <StudentForm
            isTl={isTl}
            existing={studentFormFor === 'new' ? null : studentFormFor}
            students={students}
            busy={studentSaving}
            onCancel={() => setStudentFormFor(null)}
            onSave={(v) => void saveStudent(v)}
          />
        )}
        {selectedStudentProfile && !studentFormFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 !m-0 z-50 bg-[#040E20]/65 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-xl max-h-[calc(100dvh/var(--app-zoom,1)_-_2rem)] rounded-[22px] overflow-hidden flex flex-col bg-[#F5F5F7] dark:bg-[#1C1C1E] shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_40px_100px_-20px_rgba(4,14,32,0.5)]"
            >
              {(() => {
                const p = selectedStudentProfile;
                const theirCases = cases.filter((c) => c.studentNumber === p.studentNumber).sort((a, b) => b.incidentDate.localeCompare(a.incidentDate));
                const badge = attentionBadge(p);
                const hasRecord = p.minorOffenseCount > 0 || p.majorOffenseCount > 0;
                const group = 'rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.06]';
                const row = 'px-4 py-3 flex items-center justify-between gap-4';
                const label = 'text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]';
                const value = 'text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] text-right';
                return (
                  <>
                    {/* Apple sheet header */}
                    <div className="px-6 py-4 bg-white dark:bg-[#1C1C1E] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <StudentGenderAvatar fullName={p.fullName} size="lg" />
                        <div className="min-w-0">
                          <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{p.fullName}</h3>
                          <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">#{p.studentNumber} · {p.gradeSection}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentProfile(null)}
                        title={isTl ? 'Isara' : 'Close'}
                        aria-label={isTl ? 'Isara' : 'Close'}
                        className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-white/[0.08] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.14] flex items-center justify-center text-[#6E6E73] dark:text-[#A1A1A6] shrink-0 transition-colors"
                      >
                        <X className="w-4 h-4" aria-hidden />
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto clean-scroll p-5 space-y-5">
                      {p.enrolled === false && (
                        <p className="px-4 py-2.5 rounded-xl bg-[#E8E8ED] dark:bg-white/[0.08] text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {isTl ? 'Hindi na naka-enroll' : 'Not enrolled anymore'} · {p.leftReason || '—'}
                        </p>
                      )}

                      {/* details as an inset grouped list */}
                      <div className={group}>
                        <div className={row}>
                          <span className={label}>{isTl ? 'Magulang / guardian' : 'Parent / guardian'}</span>
                          <span className={value}>{p.parentName || '—'}</span>
                        </div>
                        <div className={row}>
                          <span className={label}>{isTl ? 'Mobile ng magulang' : 'Parent mobile'}</span>
                          {p.parentPhone ? (
                            <a href={`tel:${p.parentPhone.replace(/\D/g, '')}`} className="text-[14px] text-[#007AFF] dark:text-[#409CFF] font-medium tabular-nums">{p.parentPhone}</a>
                          ) : (
                            <span className={value}>{isTl ? 'walang number' : 'no number'}</span>
                          )}
                        </div>
                        <div className={row}>
                          <span className={label}>{isTl ? 'Mga offense' : 'Offenses'}</span>
                          <span className="flex items-center gap-2">
                            <span className={value}>
                              {p.minorOffenseCount} minor · {p.majorOffenseCount} {isTl ? 'malubha' : 'serious'}
                            </span>
                            {hasRecord && <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>{badge.text}</span>}
                          </span>
                        </div>
                        {appConfig.studentFields.custom
                          .filter((c) => (p.extra ?? {})[c.key])
                          .map((c) => (
                            <div key={c.key} className={row} data-extra-info>
                              <span className={label}>{isTl ? c.labelTl || c.labelEn : c.labelEn}</span>
                              <span className={`${value} break-words`}>{(p.extra ?? {})[c.key]}</span>
                            </div>
                          ))}
                      </div>

                      {/* their cases */}
                      <div className="space-y-2">
                        <p className="px-1 text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {isTl ? 'Mga kaso niya' : 'Their cases'} <span className="font-normal text-[#8E8E93]">{theirCases.length}</span>
                        </p>
                        {theirCases.length === 0 ? (
                          <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-white/10 px-4 py-5 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center"><Check className="w-4 h-4" aria-hidden /></span>
                            <span className="text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Walang kaso. Malinis ang record.' : 'No cases. Clean record.'}</span>
                          </div>
                        ) : (
                          <div className={group}>
                            {theirCases.map((c) => (
                              <button
                                key={c.caseCode}
                                type="button"
                                title={c.caseCode}
                                onClick={() => {
                                  setSelectedStudentProfile(null);
                                  openCaseDetails(c);
                                }}
                                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#F4F8FF] dark:hover:bg-white/[0.04] transition-colors"
                              >
                                <span className="min-w-0">
                                  <span className="block text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{isTl ? c.offenseTitleTl : c.offenseTitleEn}</span>
                                  <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{prettyDate(c.incidentDate)} · {severityInfo(c.severity).word}</span>
                                </span>
                                <span className="flex items-center gap-2 shrink-0">
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'}`}>
                                    {isWithdrawn(c) ? closedWord(c) : caseBadgeWord(c)}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-[#C7C7CC] dark:text-[#636366]" aria-hidden />
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {leaveFor && leaveFor.studentNumber === p.studentNumber && (
                        <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-rose-200 dark:border-rose-900/60 p-4 space-y-2.5" data-leave-reasons>
                          <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{isTl ? 'Bakit hindi na naka-enroll?' : 'Why is the student leaving?'}</p>
                          <div className="flex flex-wrap gap-2">
                            {(isTl ? [['Graduated', 'Graduated'], ['Transferred', 'Lumipat ng school'], ['Stopped', 'Huminto sa pag-aaral']] : [['Graduated', 'Graduated'], ['Transferred', 'Transferred'], ['Stopped', 'Stopped school']]).map(([k, t]) => (
                              <button key={k} type="button" data-leave-reason={k} onClick={() => void setEnrollment(p, false, t)} className="h-8 px-3.5 rounded-full bg-[#F5F5F7] dark:bg-white/[0.08] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.14] text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                                {t}
                              </button>
                            ))}
                            <button type="button" onClick={() => setLeaveFor(null)} className="h-8 px-3.5 rounded-full text-[13px] text-[#007AFF] dark:text-[#409CFF]">
                              {isTl ? 'Huwag na' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* footer: rare actions on the left, the one main action on the right */}
                    <div className="px-5 py-3.5 bg-white dark:bg-[#1C1C1E] border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" data-action="edit-student" onClick={() => setStudentFormFor(p)} className="h-9 px-4 rounded-full bg-[#F5F5F7] dark:bg-white/[0.08] hover:bg-[#E8E8ED] dark:hover:bg-white/[0.14] text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {isTl ? 'Baguhin' : 'Edit details'}
                        </button>
                        {p.enrolled === false ? (
                          <button type="button" data-action="re-enroll" onClick={() => void setEnrollment(p, true)} className="h-9 px-4 rounded-full text-[13px] font-medium text-[#007AFF] dark:text-[#409CFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                            {isTl ? 'Ibalik bilang naka-enroll' : 'Mark as enrolled again'}
                          </button>
                        ) : (
                          <button type="button" data-action="not-enrolled" onClick={() => setLeaveFor(p)} className="h-9 px-4 rounded-full text-[13px] font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                            {isTl ? 'Hindi na naka-enroll…' : 'Not enrolled anymore…'}
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentNumbers([p.studentNumber]);
                          setSelectedStudentProfile(null);
                          setSubTab('add-report');
                        }}
                        className="h-9 px-5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-[13px] font-semibold inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" aria-hidden />
                        {isTl ? 'Bagong kaso' : 'New case'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
};
