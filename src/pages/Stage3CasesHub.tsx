import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { PhoneInput, checkPhMobile, formatPhMobile } from '../components/ui/PhoneInput';
import { SortControl, SortKey, loadSort, saveSort, timeOf, addedLabel } from '../components/ui/SortControl';
import { useAppConfig, activeOffenses } from '../services/appConfig';
import { Legend } from '../components/ui/Charts';
import { StudentForm, StudentFormValue } from '../components/students/StudentForm';
import { CaseFlowPanel, FlowAction, flowState } from '../components/cases/CaseFlowPanel';
import { StatementStation } from '../components/cases/StatementStation';
import { PrintFormsWindow } from '../components/cases/PrintFormsWindow';
import { EvidencePanel } from '../components/cases/EvidencePanel';
import { FORM_TITLES } from '../services/printForms';
import { useConfirmChange } from '../components/ui/ConfirmChange';
import { soundFX } from '../services/soundEngine';
import { checkEmail } from '../services/validators';
import { importMasterlistFile } from '../services/masterlistImportRunner';
import { ImportScanModal } from '../components/ui/ImportScanModal';
import type { ToastNextAction } from './DashboardPage';
import type { ParentAppointmentItem } from '../data/dashboardMockData';
import { todayISO, byDateTime } from '../services/scheduling';
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
  CaseHistoryEntry,
} from '../services/supabaseClient';

export type Stage3SubTab = 'add-report' | 'case-board' | 'students' | 'masterlist';

interface Stage3CasesHubProps {
  students: StudentRecord[];
  setStudents: React.Dispatch<React.SetStateAction<StudentRecord[]>>;
  cases: DisciplineCaseRecord[];
  setCases: React.Dispatch<React.SetStateAction<DisciplineCaseRecord[]>>;
  quickSearch: string;
  onTriggerToast: (msg: string, undo?: () => void, next?: ToastNextAction) => void;
  /** all parent conferences (to show the next one on each case) */
  appointments?: ParentAppointmentItem[];
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
  }) => void;
  /** Which tab to open first (e.g. "+ New Case" opens Add Report, the Open Cases card opens the board). */
  initialSubTab?: Stage3SubTab;
  /** open the board already filtered (from a Dashboard alert) */
  initialCaseFlag?: 'overdue' | 'waiting' | null;
}


export const Stage3CasesHub: React.FC<Stage3CasesHubProps> = ({
  students,
  setStudents,
  cases,
  setCases,
  quickSearch,
  onTriggerToast,
  onOpenParentComposer,
  appointments = [],
  onScheduleConference,
  initialSubTab,
  initialCaseFlag,
}) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';
  const confirmChange = useConfirmChange();

  const [subTab, setSubTab] = useState<Stage3SubTab>(initialSubTab ?? 'add-report');

  // ==========================================================================
  // SUB-TAB 1 STATE: ADD NEW CASE REPORT (PAGE 2)
  // - Starts clean for new users, with a 1-click "Fill Sample Data" helper
  // ==========================================================================
  const [selectedStudentNumbers, setSelectedStudentNumbers] = useState<string[]>([]);
  const [studentPickerQuery, setStudentPickerQuery] = useState<string>('');
  const [selectedPolicyCode, setSelectedPolicyCode] = useState<string>('MIN-01');
  // Group incident: a different offense per student (empty = same as the main offense)
  const [policyOverride, setPolicyOverride] = useState<Record<string, string>>({});
  const [incidentDate, setIncidentDate] = useState<string>('2026-11-10');
  const [reportedBy, setReportedBy] = useState<string>('');
  const [incidentNotes, setIncidentNotes] = useState<string>('');
  const [incidentTime, setIncidentTime] = useState<string>('');
  const [incidentPlace, setIncidentPlace] = useState<string>('');
  const [incidentWitness, setIncidentWitness] = useState<string>('');
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
  const [caseStatusFilter, setCaseStatusFilter] = useState<'ALL' | CaseStatusType>('ALL');
  // extra filters (grade, period, overdue / waiting sanction)
  const [gradeF, setGradeF] = useState<'all' | '11' | '12'>('all');
  const [periodF, setPeriodF] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [fromF, setFromF] = useState('');
  const [toF, setToF] = useState('');
  const [flagF, setFlagF] = useState<'all' | 'overdue' | 'waiting'>(initialCaseFlag ?? 'all');
  // sort choice per list (newest first by default, remembered on this computer)
  const [pickerSort, setPickerSortState] = useState<SortKey>(() => loadSort('picker'));
  const [caseSort, setCaseSortState] = useState<SortKey>(() => loadSort('cases'));
  const [studentSort, setStudentSortState] = useState<SortKey>(() => loadSort('students'));
  const setPickerSort = (v: SortKey) => { setPickerSortState(v); saveSort('picker', v); };
  const setCaseSort = (v: SortKey) => { setCaseSortState(v); saveSort('cases', v); };
  const setStudentSort = (v: SortKey) => { setStudentSortState(v); saveSort('students', v); };
  const [callSlipCase, setCallSlipCase] = useState<DisciplineCaseRecord | null>(null);
  // Case Details panel
  const [openCaseCode, setOpenCaseCode] = useState<string | null>(null);
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
      if (e.key !== 'Escape' || document.querySelector('[data-confirm-open], [data-evidence-viewer], [data-student-form], [data-print-forms], [data-statement-station]')) return;
      if (callSlipCase) setCallSlipCase(null);
      else if (selectedStudentProfile) setSelectedStudentProfile(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  useEffect(() => {
    if (!openCaseCode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !caseEditing && !document.querySelector('[data-confirm-open], [data-evidence-viewer], [data-print-forms], [data-statement-station]')) setOpenCaseCode(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [openCaseCode, caseEditing]);

  // ==========================================================================
  // SUB-TAB 3 STATE: STUDENTS DIRECTORY & HISTORY (PAGE 4)
  // ==========================================================================
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
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
    const watchStudents = students.filter((s) => s.minorOffenseCount >= 2).length;
    const totalStudents = students.length;
    return { activeCases, watchStudents, totalStudents };
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
  const isMinorSeverity = (sev: string) =>
    /minor/i.test(sev) && !/escalat|→ serious|serious offense|major case/i.test(sev);

  /** How many minor offenses in a row the student has right now (newest first, stops at a serious one). */
  const minorsInARow = (stu: StudentRecord): number => {
    const list = cases
      .filter((c) => c.studentNumber === stu.studentNumber)
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
      ? 'Consecutive Minor → Serious Offense'
      : stu.minorOffenseCount === 0
      ? '1st Minor Offense'
      : 'Minor Offense';
    return { nextMinor, escalated, consecutive, word, severityLabel };
  };
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
      const matchesStatus = caseStatusFilter === 'ALL' || c.status === caseStatusFilter;
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
      m[c.status] = (m[c.status] ?? 0) + 1;
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
        return onTriggerToast(isTl ? `⚠️ May estudyante na sa ${v.studentNumber}. Hanapin siya at i-edit.` : `⚠️ ${v.studentNumber} already exists. Find them and edit instead.`);
      if (r !== 'ok') return onTriggerToast(isTl ? '⚠️ Hindi na-save. I-check ang internet, tapos subukan ulit.' : '⚠️ Not saved. Check the internet, then try again.');
      setStudents((prev) => [stu, ...prev]);
      setStudentFormFor(null);
      soundFX.playSuccessCheck();
      onTriggerToast(isTl ? `✓ Naidagdag si ${v.fullName}.` : `✓ ${v.fullName} was added.`, undefined, {
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
    if (!saved) return onTriggerToast(isTl ? '⚠️ Hindi na-save. I-check ang internet, tapos subukan ulit.' : '⚠️ Not saved. Check the internet, then try again.');
    const updated: StudentRecord = { ...existing, fullName: v.fullName, initials: patch.initials, gradeSection, sectionCode: v.section, parentName: v.parentName, parentRelationship: v.parentRelationship, parentPhone: v.parentPhone, parentEmail: v.parentEmail, extra: v.extra };
    setStudents((prev) => prev.map((x) => (x.studentNumber === existing.studentNumber ? updated : x)));
    if (selectedStudentProfile?.studentNumber === existing.studentNumber) setSelectedStudentProfile(updated);
    setStudentFormFor(null);
    soundFX.playSuccessCheck();
    onTriggerToast(isTl ? `✓ Na-save ang pagbabago kay ${v.fullName}.` : `✓ ${v.fullName} updated.`, async () => {
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
      return onTriggerToast(isTl ? '⚠️ Hindi na-save. I-check ang internet, tapos subukan ulit.' : '⚠️ Not saved. Check the internet, then try again.');
    const next = { ...stu, enrolled, leftReason: enrolled ? '' : reason };
    setStudents((prev) => prev.map((x) => (x.studentNumber === stu.studentNumber ? next : x)));
    setSelectedStudentProfile(null);
    setLeaveFor(null);
    onTriggerToast(
      enrolled ? (isTl ? `✓ Naka-enroll ulit si ${stu.fullName}.` : `✓ ${stu.fullName} is enrolled again.`) : isTl ? `Hindi na naka-enroll si ${stu.fullName} (${reason}).` : `${stu.fullName} is marked not enrolled (${reason}).`,
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
    if (!r) return onTriggerToast(isTl ? '⚠️ Hindi natuloy. I-check ang internet, tapos subukan ulit.' : '⚠️ Not done. Check the internet, then try again.');
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
    onTriggerToast(isTl ? `✓ ${r.promoted} ang naging Grade 12 · ${r.graduated} ang graduated.` : `✓ ${r.promoted} moved to Grade 12 · ${r.graduated} graduated.`, async () => {
      if (await undoSchoolYearMoveInDb(r.id)) setStudents(prev);
    });
  };

  // Filtered Students for Sub-Tab 3
  const filteredDirectoryStudents = useMemo(() => {
    if (subTab !== 'students') return [] as StudentRecord[]; // only sort 1,000 students when that tab is open
    const q = quickSearch.trim().toLowerCase();
    const list = students.filter((s) => {
      if ((s.enrolled !== false) !== (enrolledFilter === 'enrolled')) return false;
      const matchesSec = sectionFilter === 'ALL' || s.sectionCode === sectionFilter;
      const matchesSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q) ||
        s.gradeSection.toLowerCase().includes(q);
      return matchesSec && matchesSearch;
    });
    return sortStudents(list, studentSort);
  }, [students, sectionFilter, quickSearch, subTab, studentSort, enrolledFilter]);

  const sectionOptions = useMemo(() => {
    const m = new Map<string, number>();
    students.forEach((s) => m.set(s.sectionCode, (m.get(s.sectionCode) ?? 0) + 1));
    return [...m.entries()].filter(([k]) => k).sort((a, b) => a[0].localeCompare(b[0]));
  }, [students]);

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
        issues.push(`📱 ${checkPhMobile(row.parentPhone, isTl).message}`);
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
        issues.push(`✉ ${email}: ${ec.message} ${isTl ? '(itama o burahin)' : '(fix or clear it)'}`);
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
          ? '⚠️ Pumili muna ng kahit isang estudyante.'
          : '⚠️ Please select at least one student from the list.'
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
          after: `${nextMinor} minor · ${nextMajor} ${isTl ? 'malubha' : 'serious'}${escalated ? ` ⚠ ${outcomeFor(stu, pol).word}` : ''}`,
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
      note: autoNotifyParent
        ? isTl
          ? 'Ihahanda rin ang SMS/Gmail notice para sa magulang.'
          : 'A parent SMS/Gmail notice will also be prepared.'
        : undefined,
      confirmLabel: isTl ? 'Oo, i-save ang case' : 'Yes, save case',
    });
    if (!okCase) return;

    const createdCases: DisciplineCaseRecord[] = [];
    // unique, increasing case numbers (the old random number could repeat inside a group)
    const lastCaseNo = cases.reduce((m, c) => {
      const n = Number(c.caseCode.split('-').pop());
      return Number.isFinite(n) && n > m ? n : m;
    }, 100);
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
        [details, incidentNotes.trim()].filter(Boolean).join('\n') || 'No notes added.';

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
        status:
          escalatedToMajor ? 'Conference Scheduled' : 'Open',
        reportedBy: nextReportedBy,
        incidentDate,
        notes: nextNotes,
      };

      // save the case first; only count the offense if the database really has it
      const saved = await insertDisciplineCaseInDb(newCase);
      if (!saved) {
        failedStudents.push(stu);
        continue;
      }
      createdCases.push(newCase);


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
          ? `⚠️ Hindi na-save ang case ni ${failedStudents.map((x) => x.fullName).join(', ')}. I-check ang internet, tapos pindutin ulit ang "I-save". Nandito pa ang form.${
              createdCases.length ? ` (Na-save na ang ${createdCases.length}.)` : ''
            }`
          : `⚠️ The case for ${failedStudents.map((x) => x.fullName).join(', ')} was not saved. Check the internet, then press "Save case" again. The form is still here.${
              createdCases.length ? ` (${createdCases.length} other case(s) were saved.)` : ''
            }`
      );
      return;
    }

    const firstStu = selectedStudentsList[0];
    onTriggerToast(
      isTl
        ? `✓ Naitala na ang Case Report (${createdCases
            .map((c) => c.caseCode)
            .join(', ')}) para kay ${createdCases.map((c) => c.studentName).join(', ')}!`
        : `✓ Case Report (${createdCases
            .map((c) => c.caseCode)
            .join(', ')}) saved for ${createdCases.map((c) => c.studentName).join(', ')}!`,
      undefined, // no undo for a saved case
      // Golden Rule 6: the obvious next step — summon the parent
      autoNotifyParent && firstStu
        ? {
            label: isGroupSave
              ? isTl ? `I-text ang magulang ni ${firstStu.fullName.split(' ')[0]}` : `Text ${firstStu.fullName.split(' ')[0]}'s parent`
              : isTl ? 'I-text ang magulang' : 'Text the parent',
            hint: isGroupSave
              ? isTl
                ? 'Ang ibang magulang: buksan ang bawat case → "Text parent".'
                : 'For the other parents: open each case → "Text parent".'
              : isTl
              ? `Susunod: ipatawag si ${firstStu.parentName} para sa conference.`
              : `Next: invite ${firstStu.parentName} to a conference.`,
            run: () =>
              onOpenParentComposer({
                studentName: firstStu.fullName,
                gradeSection: firstStu.gradeSection,
                parentName: firstStu.parentName,
                parentPhone: firstStu.parentPhone,
                parentEmail: firstStu.parentEmail,
                scheduleText: '',
              }),
          }
        : undefined
    );

    setSelectedStudentNumbers([]);
    setPolicyOverride({});
    setReportedBy('');
    setIncidentNotes('');
    setIncidentTime('');
    setIncidentPlace('');
    setIncidentWitness('');
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setLastSavedCodes(createdCases.map((c) => c.caseCode));
    setSubTab('case-board');
  };

  // ==========================================================================
  // HANDLER 2: UPDATE CASE STATUS ON BOARD
  // ==========================================================================

  // One plain word per status (Golden Rule 3)
  const statusWord = (st: CaseStatusType): string =>
    ((isTl
      ? {
          Open: 'Bago',
          'Under Review': 'Sinusuri',
          'Conference Scheduled': 'Kailangan ng conference',
          'Sanction In Progress': 'May sanction',
          Resolved: 'Tapos na',
        }
      : {
          Open: 'New',
          'Under Review': 'Reviewing',
          'Conference Scheduled': 'Needs conference',
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
    if (/grave/i.test(sev)) return { word: isTl ? 'Grave offense' : 'Grave offense', cls: red };
    if (/less serious/i.test(sev)) return { word: isTl ? 'Less serious offense' : 'Less serious offense', cls: red };
    if (/serious/i.test(sev)) return { word: isTl ? 'Serious offense' : 'Serious offense', cls: red };
    // check "2nd" before "major": "2nd Minor · Next is Major" is still a minor offense
    if (/escalat/i.test(sev) || (/major/i.test(sev) && !/minor/i.test(sev)))
      return {
        word: isTl ? 'Major offense' : 'Major offense',
        cls: 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300',
      };
    if (/2nd/i.test(sev))
      return {
        word: isTl ? 'Ika-2 minor' : '2nd minor',
        cls: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300',
      };
    return {
      word: isTl ? 'Unang minor' : '1st minor',
      cls: 'bg-[#E4ECFC] dark:bg-[#192D58] text-[#1E469B] dark:text-[#7CB8F7]',
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
    // otherwise: the next step of the 7-step flow (opens in the case details)
    const nx = flowState(c).next;
    const words: Record<string, [string, string]> = {
      'Student Called': ['Next: call the student', 'Susunod: tawagin ang estudyante'],
      Explanation: ['Next: write the student’s explanation', 'Susunod: isulat ang paliwanag ng estudyante'],
      'Parent Notified': ['Next: let the parent know', 'Susunod: ipaalam sa magulang'],
      Decision: ['Next: record the decision and sanction', 'Susunod: itala ang desisyon at sanction'],
      'Follow-Up': ['Next: start the follow-up', 'Susunod: simulan ang follow-up'],
      Closed: ['Next: close the case when the sanction is done', 'Susunod: isara kapag tapos na ang sanction'],
    };
    const w = nx ? words[nx] : null;
    const buttons: Record<string, [string, string]> = {
      'Student Called': ['Call student', 'Tawagin'],
      Explanation: ['Write explanation', 'Isulat ang paliwanag'],
      'Parent Notified': ['Parent notified?', 'Alam na ng magulang?'],
      Decision: ['Record decision', 'Itala ang desisyon'],
      'Follow-Up': ['Start follow-up', 'Simulan ang follow-up'],
      Closed: ['Close case', 'Isara ang kaso'],
    };
    // one main button on the card: it opens the case at its next step
    return { hint: w ? w[isTl ? 1 : 0] : '', action: nx ? 'flow' : null, button: nx ? buttons[nx][isTl ? 1 : 0] : undefined };
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
          ? '⚠️ Wala sa masterlist ang estudyanteng ito. I-import muna ang masterlist (Mga Kaso › I-import ang masterlist) para makuha ang number ng magulang.'
          : '⚠️ This student is not in the masterlist. Import the masterlist first (Cases › Import masterlist) to get the parent number.'
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
    const ok = await confirmChange({
      title: isTl ? `I-update ang ${caseItem.caseCode}?` : `Update ${caseItem.caseCode}?`,
      description: `${caseItem.studentName} (${caseItem.gradeSection}) · ${
        isTl ? caseItem.offenseTitleTl : caseItem.offenseTitleEn
      }`,
      rows: [{ label: 'Status', before: statusWord(caseItem.status), after: statusWord(nextStatus) }],
      confirmLabel: isTl ? 'Oo, i-update' : 'Yes, update',
      tone: nextStatus === 'Resolved' ? 'success' : 'primary',
    });
    if (!ok) return;
    setCases((prev) =>
      prev.map((c) => (c.caseCode === caseItem.caseCode ? { ...c, status: nextStatus, closedAt: nextStatus === 'Resolved' ? c.closedAt ?? new Date().toISOString() : null } : c))
    );
    const savedStatus = await updateDisciplineCaseStatusInDb(caseItem.caseCode, nextStatus);
    if (!savedStatus) {
      setCases((prev) => prev.map((c) => (c.caseCode === caseItem.caseCode ? { ...c, status: caseItem.status, closedAt: caseItem.closedAt ?? null } : c)));
      onTriggerToast(
        isTl
          ? '⚠️ Hindi nabago ang status. I-check ang internet, tapos subukan ulit.'
          : '⚠️ The status was not changed. Check the internet, then try again.'
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
        ? `✓ ${caseItem.studentName}: ${statusWord(nextStatus)} na ang kaso.`
        : `✓ ${caseItem.studentName}: case is now "${statusWord(nextStatus)}".`,
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
    setCaseHistory(await fetchCaseHistoryFromDb(code));
  };

  const openCaseDetails = (c: DisciplineCaseRecord) => {
    soundFX.playStepUnlock();
    setOpenCaseCode(c.caseCode);
    setCaseEditing(false);
    void loadCaseHistory(c.caseCode);
  };

  /** the handbook sanction for the 1st / 2nd / 3rd time this student did this offense */
  const suggestedSanctionFor = (c: DisciplineCaseRecord): string => {
    const rule = HANDBOOK.find((r) => r.titleEn.trim().toLowerCase() === c.offenseTitleEn.trim().toLowerCase());
    if (!rule) return '';
    const nth = cases.filter((x) => x.studentNumber === c.studentNumber && x.offenseTitleEn === c.offenseTitleEn && x.incidentDate <= c.incidentDate).length;
    const pick = nth >= 3 ? [rule.sanction3rdEn, rule.sanction3rdTl] : nth === 2 ? [rule.sanction2ndEn, rule.sanction2ndTl] : [rule.sanction1stEn, rule.sanction1stTl];
    return isTl ? pick[1] : pick[0];
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
    onTriggerToast(isTl ? '✓ Na-save ang salaysay ng estudyante. Susunod: ipaalam sa magulang.' : '✓ The student’s statement is saved. Next: let the parent know.', async () => {
      if (await updateCaseFlowInDb(before.caseCode, { explanation: before.explanation || null, step: before.step ?? 'Reported' })) setCases((prev) => prev.map((x) => (x.caseCode === before.caseCode ? { ...x, explanation: before.explanation, step: before.step } : x)));
    });
  };

  /** one step of the 7-step flow: save → show → Undo */
  const applyFlow = async (c: DisciplineCaseRecord, a: FlowAction) => {
    const now = new Date().toISOString();
    let db: Record<string, unknown> = {};
    let local: Partial<DisciplineCaseRecord> = {};
    let msg = '';
    if (a.kind === 'call') {
      db = { student_called_at: now, step: 'Student Called' };
      local = { studentCalledAt: now, step: 'Student Called' };
      msg = isTl ? '✓ Naitala: natawag ang estudyante. Susunod: isulat ang paliwanag niya.' : '✓ Saved: student called. Next: write their explanation.';
    } else if (a.kind === 'explanation') {
      db = { explanation: a.text, step: 'Explanation' };
      local = { explanation: a.text, step: 'Explanation' };
      msg = isTl ? '✓ Na-save ang paliwanag. Susunod: ipaalam sa magulang.' : '✓ Explanation saved. Next: let the parent know.';
    } else if (a.kind === 'notified') {
      const activate = c.sanctionStatus === 'Pending parent notice';
      db = { parent_notified_at: now, parent_notified_how: a.how, step: c.decidedAt ? 'Decision' : 'Parent Notified', ...(activate ? { sanction_status: 'Active', status: 'Sanction In Progress' } : {}) };
      local = { parentNotifiedAt: now, parentNotifiedHow: a.how, step: c.decidedAt ? 'Decision' : 'Parent Notified', ...(activate ? { sanctionStatus: 'Active' as const, status: 'Sanction In Progress' as const } : {}) };
      msg = activate
        ? isTl ? '✓ Alam na ng magulang — nagsimula na ang sanction.' : '✓ Parent notified — the sanction has started.'
        : isTl ? '✓ Alam na ng magulang. Susunod: itala ang desisyon.' : '✓ Parent notified. Next: record the decision.';
    } else if (a.kind === 'decision') {
      const notified = !!c.parentNotifiedAt;
      db = { decision: a.decision, sanction: a.sanction, decided_at: now, step: notified ? 'Decision' : c.step || 'Explanation', sanction_status: notified ? 'Active' : 'Pending parent notice', ...(notified ? { status: 'Sanction In Progress' } : {}) };
      local = { decision: a.decision, sanction: a.sanction, decidedAt: now, step: (notified ? 'Decision' : c.step || 'Explanation') as DisciplineCaseRecord['step'], sanctionStatus: notified ? 'Active' : 'Pending parent notice', ...(notified ? { status: 'Sanction In Progress' as const } : {}) };
      msg = notified
        ? isTl ? '✓ Na-save ang desisyon. Nagsimula na ang sanction.' : '✓ Decision saved. The sanction has started.'
        : isTl ? '✓ Na-save ang desisyon. Maghihintay ang sanction hanggang malaman ng magulang.' : '✓ Decision saved. The sanction waits until the parent is notified.';
    } else if (a.kind === 'followup') {
      db = { step: 'Follow-Up', status: 'Sanction In Progress' };
      local = { step: 'Follow-Up', status: 'Sanction In Progress' };
      msg = isTl ? '✓ Nasa follow-up na. Isara ang kaso kapag tapos na ang sanction.' : '✓ In follow-up. Close the case when the sanction is done.';
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
      db = { step: 'Closed', status: 'Resolved', ...(c.sanction ? { sanction_status: 'Done' } : {}) };
      local = { step: 'Closed', status: 'Resolved', closedAt: now, ...(c.sanction ? { sanctionStatus: 'Done' as const } : {}) };
      msg = isTl ? `✓ Sarado na ang kaso ni ${c.studentName}.` : `✓ ${c.studentName}'s case is closed.`;
    }
    setFlowBusy(true);
    const saved = await updateCaseFlowInDb(c.caseCode, db);
    setFlowBusy(false);
    if (!saved) return onTriggerToast(isTl ? '⚠️ Hindi na-save. I-check ang internet, tapos subukan ulit.' : '⚠️ Not saved. Check the internet, then try again.');
    setCases((prev) => prev.map((x) => (x.caseCode === c.caseCode ? { ...x, ...local } : x)));
    soundFX.playSuccessCheck();
    const stepWords: Record<FlowAction['kind'], [string, string]> = {
      call: ['Student called to the Guidance Office', 'Tinawag ang estudyante sa Guidance Office'],
      explanation: ['Student explanation written', 'Naisulat ang paliwanag ng estudyante'],
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
    onTriggerToast(msg, async () => {
      if (await updateCaseFlowInDb(c.caseCode, undoPatch)) setCases((prev) => prev.map((x) => (x.caseCode === c.caseCode ? c : x)));
    });
  };

  const startCaseEdit = () => {
    if (!openCase) return;
    setEditDate(openCase.incidentDate);
    setEditReportedBy(openCase.reportedBy);
    setEditNotes(hideIncidentMarker(openCase.notes));
    setCaseEditing(true);
  };

  const saveCaseEdit = async () => {
    if (!openCase) return;
    const next = {
      incidentDate: editDate || openCase.incidentDate,
      reportedBy: editReportedBy.trim() || openCase.reportedBy,
      notes: keepIncidentMarker(openCase.notes, editNotes.trim() || 'No notes added.'),
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
          ? '⚠️ Hindi na-save. I-check ang internet, tapos pindutin ulit ang "I-save".'
          : '⚠️ Not saved. Check the internet connection, then press "Save changes" again.'
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
    onTriggerToast(isTl ? '✓ Na-save ang pagbabago.' : '✓ Changes saved.');
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
          ? `⚠️ Walang ma-auto-fix. ${stillFlagged} row ang kailangang ayusin nang mano-mano (hal. maling number, duplicate ID).`
          : `⚠️ Nothing can be auto-fixed. ${stillFlagged} row(s) need a manual fix (e.g. wrong number, duplicate ID).`
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
        ? `✓ Naayos ang format ng ${changes.length} mobile number.`
        : `✓ Fixed the format of ${changes.length} mobile number(s).`
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
          ? '⚠️ Ayusin muna ang mga naka-flag na row bago i-save sa Masterlist.'
          : '⚠️ Please fix the flagged rows before saving to the Masterlist.'
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
    const updateIds = new Set(validRows.filter((r) => r.isUpdate).map((r) => r.studentNumber.trim()));
    const toInsert = newStudentRecords.filter((s) => !updateIds.has(s.studentNumber));
    const toUpdate = newStudentRecords.filter((s) => updateIds.has(s.studentNumber));
    const ins = toInsert.length ? await insertStudentsBatchInDb(toInsert) : { saved: 0, failed: 0, failedIds: [] as string[] };
    const upd = toUpdate.length ? await updateStudentsProfileBatchInDb(toUpdate) : { saved: 0, failed: 0, failedIds: [] as string[] };
    const result = { saved: ins.saved + upd.saved, failed: ins.failed + upd.failed, failedIds: [...ins.failedIds, ...upd.failedIds] };
    setSavingMasterlist(false);
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
          ? `⚠️ Na-save ang ${result.saved}, pero ${result.failed} ang hindi na-save (internet o database). Nasa preview pa sila — subukan ulit.`
          : `⚠️ Saved ${result.saved}, but ${result.failed} could not be saved (internet or database). They are still in the preview — try again.`
      );
      return;
    }
    onTriggerToast(
      remaining.length > 0
        ? isTl
          ? `✓ ${savedNew.length} bagong estudyante${savedUpd.size ? `, ${savedUpd.size} na-update` : ''}. ${remaining.length} row pa ang kailangang ayusin sa ibaba.`
          : `✓ ${savedNew.length} new student(s)${savedUpd.size ? `, ${savedUpd.size} updated` : ''}. ${remaining.length} row(s) below still need fixing.`
        : isTl
        ? `✓ ${savedNew.length} bagong estudyante${savedUpd.size ? `, ${savedUpd.size} na-update` : ''}. Makikita na sila sa Mga estudyante.`
        : `✓ ${savedNew.length} new student(s)${savedUpd.size ? `, ${savedUpd.size} updated` : ''}. You can find them under Students.`
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
        ? `📥 Nabasa ang ${rows.length} estudyante mula sa ${importAnalysis.fileName}. I-check ang mga naka-flag bago i-save.`
        : `📥 Read ${rows.length} students from ${importAnalysis.fileName}. Check flagged rows before saving.`
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
          DIRECT, CLEAN SUB-TAB BAR (NO DUPLICATE KPI CARDS — STRAIGHT TO ACTION)
          ==================================================================== */}
      <div className="shrink-0 h-[54px] flex items-center justify-between gap-4 border-b border-[#DCE5F2] dark:border-[#1E3158]">
        <div className="inline-flex p-1 rounded-xl saas-card-subtle gap-1 overflow-x-auto">
          {(
            [
              {
                id: 'add-report',
                labelEn: '＋ New case',
                labelTl: '＋ Bagong kaso',
                tip: '',
              },
              {
                id: 'case-board',
                labelEn: `Cases · ${summaryStats.activeCases} open`,
                labelTl: `Mga kaso · ${summaryStats.activeCases} bukas`,
                tip: isTl ? 'Bilang ng kasong hindi pa tapos' : 'Number of cases not yet done',
              },
              {
                id: 'students',
                labelEn: `Students · ${students.length}`,
                labelTl: `Mga estudyante · ${students.length}`,
                tip: isTl ? 'Lahat ng estudyante sa listahan' : 'All students in the list',
              },
              {
                id: 'masterlist',
                labelEn: 'Import masterlist',
                labelTl: 'I-import ang masterlist',
                tip: isTl ? 'Mag-upload ng Excel ng mga estudyante' : 'Upload the Excel list of students',
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
                className={`px-4 py-2 rounded-lg text-xs sm:text-[13px] font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#1E469B] text-white shadow-sm'
                    : 'text-[#4A608A] dark:text-[#94A8D0] hover:text-[#0B1F4D] dark:hover:text-white'
                }`}
              >
                {isTl ? tab.labelTl : tab.labelEn}
              </button>
            );
          })}
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
            {draftPrompt && (
              <div className="xl:col-span-12 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  📝{' '}
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
                    className="px-3 py-1.5 rounded-lg bg-[#1E469B] text-white text-xs font-extrabold"
                  >
                    {isTl ? 'Ituloy ang draft' : 'Continue draft'}
                  </button>
                </div>
              </div>
            )}
            {/* LEFT 5 COLS: Student Selector (Supports 1 or Multiple Students) */}
            <div className="xl:col-span-5 rounded-2xl saas-card p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
                    {isTl
                      ? 'Step 1: Sino ang estudyante?'
                      : 'Step 1: Who is involved?'}
                  </h2>
                  <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                    {isTl
                      ? 'Pwedeng isa o higit pa. Kusang kukunin ang section at magulang.'
                      : 'Pick one or more. Section and parent are filled in for you.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#E4ECFC] dark:bg-[#192D58] text-[#1E469B] dark:text-[#7CB8F7] text-xs font-extrabold whitespace-nowrap shrink-0">
                  {selectedStudentNumbers.length} {isTl ? 'napili' : 'selected'}
                </span>
              </div>

              <input
                type="text"
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
                className="w-full px-3.5 py-2 rounded-xl saas-card-subtle text-xs font-semibold text-[#0B1F4D] dark:text-white focus:outline-none focus:border-[#1E469B]"
              />
              <div className="-mt-2 flex items-center justify-between gap-3">
                <p id="picker-hint" className="text-[11px] text-[#687FA8] dark:text-[#89A7DF] min-w-0">
                  {isTl ? 'Tip: mag-type, tapos Enter para piliin.' : 'Tip: type, then press Enter to pick.'}
                </p>
                <SortControl id="picker" value={pickerSort} onChange={setPickerSort} isTl={isTl} />
                <button
                  type="button"
                  data-action="picker-add-student"
                  onClick={() => setStudentFormFor('new')}
                  title={isTl ? 'Magdagdag ng isang estudyante (o mag-import ng masterlist sa "I-import ang masterlist")' : 'Add one student (or import the masterlist under "Import masterlist")'}
                  className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg saas-card-subtle hover:border-[#1E469B] text-[11px] font-bold text-[#1E469B] dark:text-[#7CB8F7]"
                >
                  {isTl ? 'Wala sa listahan? + Idagdag' : 'Not in the list? + Add student'}
                </button>
              </div>

              <div className="max-h-[290px] xl:max-h-none xl:h-0 xl:flex-1 xl:min-h-[200px] overflow-y-auto clean-scroll divide-y divide-[#E2E9F5] dark:divide-[#1E3158] rounded-xl border border-[#DCE5F2] dark:border-[#1E3158]">
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
                          ? 'bg-[#E4ECFC]/75 dark:bg-[#192D58]/80'
                          : 'hover:bg-[#F8FAFE] dark:hover:bg-[#13203B]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border ${
                            isChecked
                              ? 'bg-[#1E469B] border-[#1E469B] text-white'
                              : 'border-[#94A8D0] text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-extrabold text-[#0B1F4D] dark:text-white leading-snug">
                            {stu.fullName}
                          </p>
                          <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">
                            #{stu.studentNumber} · {stu.gradeSection} · {stu.parentName}
                            {stu.createdAt ? ` · ${addedLabel(stu.createdAt, isTl)}` : ''}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold shrink-0 ${
                          stu.majorOffenseCount > 0
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                            : stu.minorOffenseCount >= 2
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                            : 'saas-card-subtle text-[#4A608A] dark:text-[#94A8D0]'
                        }`}
                      >
                        {stu.majorOffenseCount > 0
                          ? `${stu.majorOffenseCount} ${isTl ? 'malubha' : 'serious'}`
                          : `${stu.minorOffenseCount} Minor`}
                      </span>
                    </button>
                  );
                })}
                {filteredStudentPicker.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs font-semibold text-[#4A608A] dark:text-[#94A8D0]">
                    {isTl
                      ? `Walang tugma sa "${studentPickerQuery}". Subukan ang ibang spelling o student no.`
                      : `No student matches "${studentPickerQuery}". Try another spelling or the student no.`}
                  </p>
                )}
                {filteredStudentPicker.length > visiblePicker.length && (
                  <p className="px-4 py-3 text-center text-[11px] font-semibold text-[#687FA8] dark:text-[#89A7DF] bg-[#F8FAFE] dark:bg-[#13203B]">
                    {isTl
                      ? `Ipinapakita ang ${visiblePicker.length} sa ${filteredStudentPicker.length}. Mag-type ng pangalan para mahanap ang iba.`
                      : `Showing ${visiblePicker.length} of ${filteredStudentPicker.length}. Type a name to find the others.`}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT 7 COLS: Offense Details, Auto-Classification & Early Intervention Alert */}
            <div className="xl:col-span-7 rounded-2xl saas-card p-6 space-y-5 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
                    {isTl
                      ? 'Step 2: Ano ang nangyari?'
                      : 'Step 2: What happened?'}
                  </h2>
                  <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                    {isTl
                      ? 'Bibilangin ng system kung pang-ilang offense na ito at ipapakita ang sanction.'
                      : 'The system counts past offenses and shows the Handbook sanction.'}
                  </p>
                </div>

              </div>

              <div className="relative flex-1">
              {noStudentYet && (
                <div className="absolute inset-0 z-10 flex items-start justify-center pt-24">
                  <div className="px-4 py-3 rounded-xl bg-white dark:bg-[#0F1A30] border border-[#1E469B]/40 shadow-lg text-center max-w-xs">
                    <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                      👈 {isTl ? 'Pumili muna ng estudyante sa Step 1' : 'Pick a student in Step 1 first'}
                    </p>
                    <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0] mt-0.5">
                      {isTl ? 'Bubukas ang Step 2 kapag may napili na.' : 'Step 2 opens once a student is picked.'}
                    </p>
                  </div>
                </div>
              )}
              <fieldset
                disabled={noStudentYet}
                aria-disabled={noStudentYet}
                className={`min-w-0 m-0 p-0 border-0 space-y-5 transition-opacity duration-200 ${
                  noStudentYet ? 'opacity-35 select-none' : ''
                }`}
              >
              {/* LIVE EARLY INTERVENTION / ESCALATION ALERT BANNER */}
              {!isGroup && selectedStudentsList.some(
                (s) => s.minorOffenseCount >= 1 || s.majorOffenseCount >= 1
              ) && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 dark:text-amber-300">
                    <span>⚡</span>
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
                          className="text-xs font-semibold text-[#0B1F4D] dark:text-white"
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
                  <label className="block text-xs font-bold text-[#0B1F4D] dark:text-white mb-1.5">
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
                    className="w-full px-3.5 py-2.5 rounded-xl saas-card-subtle text-xs sm:text-sm font-bold text-[#0B1F4D] dark:text-white focus:outline-none focus:border-[#1E469B]"
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
                  <div className="md:col-span-2 rounded-xl border border-[#DCE5F2] dark:border-[#1E3158] overflow-hidden">
                    <div className="px-3.5 py-2.5 bg-[#F4F7FC] dark:bg-[#13203B] space-y-1">
                      <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white">
                        {isTl
                          ? `Isang insidente · ${selectedStudentsList.length} hiwalay na case ang gagawin`
                          : `One incident · ${selectedStudentsList.length} separate cases will be made`}
                      </p>
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        {isTl
                          ? '⚠ Isama lang ang may ginawang mali. Ang biktima o saksi ay ilagay sa "Saksi o patunay", hindi rito.'
                          : '⚠ Only include students who did something wrong. Put a victim or witness in "Witness or proof", not here.'}
                      </p>
                    </div>
                    <div className="divide-y divide-[#E2E9F5] dark:divide-[#1E3158]">
                      {selectedStudentsList.map((stu) => {
                        const pol = policyFor(stu);
                        const out = outcomeFor(stu, pol);
                        return (
                          <div key={stu.studentNumber} className="px-3.5 py-2 grid grid-cols-[190px_minmax(0,1fr)_24px] items-center gap-2">
                            <div className="min-w-0 space-y-0.5">
                              <span className="text-xs font-bold text-[#0B1F4D] dark:text-white block truncate" title={stu.fullName}>
                              {stu.fullName}
                            </span>
                              <span
                              className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold whitespace-nowrap inline-block ${
                                out.escalated
                                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                                  : stu.minorOffenseCount >= 1
                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                                  : 'bg-[#E4ECFC] dark:bg-[#192D58] text-[#1E469B] dark:text-[#7CB8F7]'
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
                              className="w-full px-2 py-1.5 rounded-lg saas-card-subtle text-[11px] font-bold text-[#0B1F4D] dark:text-white"
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
                              className="w-6 h-6 rounded-md text-xs font-bold text-[#4A608A] hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/60"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0B1F4D] dark:text-white mb-1">
                    {isTl ? 'Petsa' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl saas-card-subtle text-xs font-bold text-[#0B1F4D] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B1F4D] dark:text-white mb-1">
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
                    className="w-full px-3.5 py-2 rounded-xl saas-card-subtle text-xs font-bold text-[#0B1F4D] dark:text-white"
                  />
                  <datalist id="aics-reporters">
                    {reporterSuggestions.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B1F4D] dark:text-white mb-1">
                    {isTl ? 'Oras (optional)' : 'Time (optional)'}
                  </label>
                  <input
                    type="time"
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl saas-card-subtle text-xs font-bold text-[#0B1F4D] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B1F4D] dark:text-white mb-1">
                    {isTl ? 'Saan nangyari (optional)' : 'Place (optional)'}
                  </label>
                  <input
                    type="text"
                    value={incidentPlace}
                    onChange={(e) => setIncidentPlace(e.target.value)}
                    placeholder={isTl ? 'hal. Gate, Room 204, Canteen' : 'e.g. Gate, Room 204, Canteen'}
                    className="w-full px-3.5 py-2 rounded-xl saas-card-subtle text-xs font-bold text-[#0B1F4D] dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#0B1F4D] dark:text-white mb-1">
                    {isTl ? 'Saksi o patunay (optional)' : 'Witness or proof (optional)'}
                  </label>
                  <input
                    type="text"
                    value={incidentWitness}
                    onChange={(e) => setIncidentWitness(e.target.value)}
                    placeholder={isTl ? 'hal. Guard J. Cruz; may kuha sa CCTV' : 'e.g. Guard J. Cruz; CCTV clip on file'}
                    className="w-full px-3.5 py-2 rounded-xl saas-card-subtle text-xs font-bold text-[#0B1F4D] dark:text-white"
                  />
                </div>
              </div>

              {/* Auto-Suggested Handbook Progressive Sanction Box */}
              <div className="p-4 rounded-xl saas-card-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1E469B] dark:text-[#7CB8F7]">
                    {isTl
                      ? 'Sanction ayon sa Handbook'
                      : 'Sanction from the Handbook'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#1E469B] text-white text-[11px] font-bold">
                    {selectedPolicy.classification}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] leading-snug">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0F1A30] border border-[#DCE5F2] dark:border-[#1E3158]">
                    <p className="font-bold text-[#4A608A] dark:text-[#94A8D0]">1st Offense</p>
                    <p className="font-semibold text-[#0B1F4D] dark:text-white mt-0.5">
                      {isTl ? selectedPolicy.sanction1stTl : selectedPolicy.sanction1stEn}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0F1A30] border border-[#DCE5F2] dark:border-[#1E3158]">
                    <p className="font-bold text-amber-600 dark:text-amber-400">2nd Offense</p>
                    <p className="font-semibold text-[#0B1F4D] dark:text-white mt-0.5">
                      {isTl ? selectedPolicy.sanction2ndTl : selectedPolicy.sanction2ndEn}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0F1A30] border border-[#DCE5F2] dark:border-[#1E3158]">
                    <p className="font-bold text-rose-600 dark:text-rose-400">3rd Offense</p>
                    <p className="font-semibold text-[#0B1F4D] dark:text-white mt-0.5">
                      {isTl ? selectedPolicy.sanction3rdTl : selectedPolicy.sanction3rdEn}
                    </p>
                  </div>
                </div>
              </div>

              {/* Incident Narrative / Notes */}
              <div>
                <label className="block text-xs font-bold text-[#0B1F4D] dark:text-white mb-1">
                  {isTl
                    ? 'Maikling kwento ng nangyari (optional)'
                    : 'What happened, in a few words (optional)'}
                </label>
                <textarea
                  rows={2}
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  placeholder={
                    isTl
                      ? 'Ilagay ang maikling detalye ng insidente o ginawang paunang counseling...'
                      : 'Enter brief summary of the incident or initial guidance action taken...'
                  }
                  className="w-full p-3 rounded-xl saas-card-subtle text-xs font-semibold text-[#0B1F4D] dark:text-white focus:outline-none focus:border-[#1E469B]"
                />
              </div>

              </fieldset>
              </div>

              {/* Bottom Submit Row — stays visible while scrolling (fits 1366×768) */}
              <div className="sticky bottom-0 z-20 -mx-6 -mb-6 px-6 py-3 rounded-b-2xl bg-white/95 dark:bg-[#0F1A30]/95 backdrop-blur border-t border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-bold text-[#4A608A] dark:text-[#94A8D0]">
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
                <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0B1F4D] dark:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoNotifyParent}
                    onChange={(e) => setAutoNotifyParent(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#1E469B]"
                  />
                  <span>
                    {isTl
                      ? 'Ihanda rin ang text at email sa magulang'
                      : 'Also prepare the text and email to the parent'}
                  </span>
                </label>
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
                      : 'bg-[#1E469B] hover:bg-[#16377E] ring-2 ring-[#7CB8F7]/60'
                  }`}
                >
                  {selectedStudentNumbers.length === 0
                    ? isTl ? 'Pumili muna ng estudyante' : 'Pick a student first'
                    : isTl
                    ? `✓ I-save ang case (${selectedStudentNumbers.length} estudyante)`
                    : `✓ Save case (${selectedStudentNumbers.length} student${selectedStudentNumbers.length === 1 ? '' : 's'})`}
                </button>
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
              ✓{' '}
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
                className="px-3 py-1.5 rounded-lg saas-card-subtle text-xs font-bold text-[#0B1F4D] dark:text-white"
              >
                {isTl ? 'Tingnan ang case' : 'View the case'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLastSavedCodes([]);
                  setSubTab('add-report');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#1E469B] text-white text-xs font-extrabold"
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
                ✕
              </button>
            </div>
          </div>
        )}

        {subTab === 'case-board' && (
          <section className="rounded-2xl saas-card overflow-hidden">
            <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
                  {isTl ? 'Lahat ng kaso' : 'All cases'}
                </h2>
                <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                  {isTl
                    ? 'Nasa itaas ang kailangan pang asikasuhin; nasa baba ang tapos na.'
                    : 'Cases that still need action are on top; finished ones are at the bottom.'}
                </p>
              </div>

              <div className="inline-flex flex-wrap p-1 rounded-lg saas-card-subtle gap-1">
                {(
                  [
                    { key: 'ALL', label: isTl ? 'Lahat' : 'All' },
                    { key: 'Open', label: statusWord('Open') },
                    { key: 'Conference Scheduled', label: statusWord('Conference Scheduled') },
                    { key: 'Sanction In Progress', label: statusWord('Sanction In Progress') },
                    { key: 'Resolved', label: statusWord('Resolved') },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setCaseStatusFilter(f.key)}
                    className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                      caseStatusFilter === f.key
                        ? 'bg-[#1E469B] text-white'
                        : 'text-[#4A608A] dark:text-[#94A8D0] hover:text-[#0B1F4D] dark:hover:text-white'
                    }`}
                  >
                    {f.label} · {caseStatusCount[f.key] ?? 0}
                  </button>
                ))}
              </div>
              <SortControl id="cases" value={caseSort} onChange={setCaseSort} isTl={isTl} />
            </div>
            {/* more filters: grade, period, overdue / waiting sanction */}
            <div className="px-6 py-2 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center gap-2" data-case-filters>
              <span className="text-[11px] font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'I-filter:' : 'Filter:'}</span>
              <select data-filter="grade" value={gradeF} onChange={(e) => setGradeF(e.target.value as typeof gradeF)} aria-label="Grade" className="px-2.5 py-1.5 rounded-lg border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-xs font-bold text-[#0B1F4D] dark:text-white">
                <option value="all">{isTl ? 'Lahat ng grade' : 'All grades'}</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
              <select data-filter="period" value={periodF} onChange={(e) => setPeriodF(e.target.value as typeof periodF)} aria-label={isTl ? 'Petsa ng insidente' : 'Incident date'} className="px-2.5 py-1.5 rounded-lg border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-xs font-bold text-[#0B1F4D] dark:text-white">
                <option value="all">{isTl ? 'Lahat ng petsa' : 'Any date'}</option>
                <option value="week">{isTl ? 'Ngayong linggo' : 'This week'}</option>
                <option value="month">{isTl ? 'Ngayong buwan' : 'This month'}</option>
                <option value="custom">{isTl ? 'Pumili ng petsa…' : 'Pick dates…'}</option>
              </select>
              {periodF === 'custom' && (
                <>
                  <input type="date" data-filter="from" value={fromF} max={toF || undefined} onChange={(e) => setFromF(e.target.value)} aria-label={isTl ? 'Mula' : 'From'} className="px-2 py-1 rounded-lg border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-xs text-[#0B1F4D] dark:text-white" />
                  <span className="text-xs text-[#4A608A]">–</span>
                  <input type="date" data-filter="to" value={toF} min={fromF || undefined} onChange={(e) => setToF(e.target.value)} aria-label={isTl ? 'Hanggang' : 'To'} className="px-2 py-1 rounded-lg border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-xs text-[#0B1F4D] dark:text-white" />
                </>
              )}
              <select data-filter="flag" value={flagF} onChange={(e) => setFlagF(e.target.value as typeof flagF)} aria-label={isTl ? 'Kailangang aksyunan' : 'Needs action'} className="px-2.5 py-1.5 rounded-lg border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-xs font-bold text-[#0B1F4D] dark:text-white">
                <option value="all">{isTl ? 'Lahat ng kaso' : 'All cases'}</option>
                <option value="overdue">{isTl ? `Overdue lang (higit ${overdueDays} araw)` : `Overdue only (over ${overdueDays} days)`}</option>
                <option value="waiting">{isTl ? 'Naghihintay ang sanction' : 'Sanction waiting for parent'}</option>
              </select>
              {filtersOn && (
                <>
                  <span className="text-xs font-bold text-[#1E469B] dark:text-[#7CB8F7]" data-filter-count>
                    {isTl ? `${filteredCases.length} kaso` : `${filteredCases.length} case(s)`}
                  </span>
                  <button type="button" data-filter="clear" onClick={() => { setGradeF('all'); setPeriodF('all'); setFlagF('all'); setFromF(''); setToF(''); }} className="px-2.5 py-1.5 rounded-lg saas-card-subtle text-xs font-bold">
                    {isTl ? 'Alisin ang filter' : 'Clear filters'}
                  </button>
                </>
              )}
            </div>
            {/* what the colors on each card mean */}
            <div className="px-6 py-2 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="text-[11px] font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Kulay ng guhit sa gilid:' : 'Side stripe:'}</span>
              <Legend
                items={[
                  { color: '#F43F5E', label: isTl ? 'Serious / Grave / Major' : 'Serious / Grave / Major', shape: 'box' },
                  { color: '#FBBF24', label: isTl ? 'Ika-2 minor' : '2nd minor', shape: 'box' },
                  { color: '#2557BE', label: isTl ? 'Minor' : 'Minor', shape: 'box' },
                  { color: '#10B981', label: isTl ? 'Tapos na' : 'Done', shape: 'box' },
                ]}
              />
              <span className="text-[11px] font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Ilang araw:' : 'Days open:'}</span>
              <Legend
                items={[
                  { color: '#E11D48', label: isTl ? '7+ araw' : '7+ days', shape: 'dot' },
                  { color: '#B45309', label: isTl ? '3–6 araw' : '3–6 days', shape: 'dot' },
                ]}
              />
            </div>

            <div className="p-4 sm:p-5 space-y-5 bg-[#F4F7FC] dark:bg-[#0B1527]">
              {filteredCases.length === 0 && (
                <div className="px-6 py-10 text-center space-y-3 rounded-xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66]">
                  <p className="text-sm font-bold text-[#0B1F4D] dark:text-white">
                    {quickSearch.trim()
                      ? isTl
                        ? `Walang kasong tugma sa "${quickSearch.trim()}".`
                        : `No case matches "${quickSearch.trim()}".`
                      : caseStatusFilter === 'ALL'
                      ? isTl
                        ? 'Wala pang naitalang kaso.'
                        : 'No cases yet.'
                      : isTl
                      ? `Walang kaso na "${statusWord(caseStatusFilter)}".`
                      : `No cases marked "${statusWord(caseStatusFilter)}".`}
                  </p>
                  <div className="flex justify-center gap-2">
                    {caseStatusFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setCaseStatusFilter('ALL')}
                        className="px-3 py-1.5 rounded-lg saas-card-subtle text-xs font-bold text-[#1E469B] dark:text-[#7CB8F7]"
                      >
                        {isTl ? 'Ipakita lahat' : 'Show all cases'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSubTab('add-report')}
                      className="px-3 py-1.5 rounded-lg bg-[#1E469B] text-white text-xs font-bold"
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
                  return (
                    <div
                      key={c.caseCode}
                      data-case-card={c.caseCode}
                      data-status={c.status}
                      role="button"
                      tabIndex={0}
                      title={isTl ? 'I-click para makita ang buong kaso' : 'Click to see the full case'}
                      onClick={() => openCaseDetails(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openCaseDetails(c);
                      }}
                      className={`relative rounded-xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] pl-5 pr-4 py-3.5 cursor-pointer shadow-sm hover:shadow-md hover:border-[#9DB4DC] dark:hover:border-[#3A5794] transition-[box-shadow,border-color] duration-150 ${
                        isResolved && !menuOpen ? 'opacity-75' : ''
                      } ${menuOpen ? 'z-30' : ''}`}
                    >
                      <span
                        aria-hidden="true"
                        data-stripe
                        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${stripeFor(c)}`}
                      />
                      {/* line 1: who + how serious + how long */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[15px] font-extrabold text-[#0B1F4D] dark:text-white">
                            {c.studentName}
                          </span>
                          <span title={c.severity} className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${sev.cls}`}>
                            {sev.word}
                          </span>
                          {groupSize > 1 && (
                            <span
                              title={isTl ? 'Kasama sa iisang insidente' : 'Part of one group incident'}
                              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300"
                            >
                              👥 {isTl ? 'May kasama' : 'Group'} · {groupSize}
                            </span>
                          )}
                        </div>
                        <span
                          title={prettyDate(c.incidentDate)}
                          className={`shrink-0 text-[11px] font-bold whitespace-nowrap ${
                            !isResolved && age.days >= 7
                              ? 'text-rose-600 dark:text-rose-400'
                              : !isResolved && age.days >= 3
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-[#687FA8] dark:text-[#89A7DF]'
                          }`}
                        >
                          {age.text}
                        </span>
                      </div>

                      {/* line 2: what + where */}
                      <p className="mt-0.5 text-xs text-[#4A608A] dark:text-[#94A8D0] truncate">
                        <span className="font-bold text-[#0B1F4D] dark:text-[#DCE8FF]">
                          {isTl ? c.offenseTitleTl : c.offenseTitleEn}
                        </span>{' '}
                        · {c.gradeSection} ·{' '}
                        <span className="font-mono text-[10.5px]" title={isTl ? 'Case number' : 'Case number'}>
                          {c.caseCode}
                        </span>
                        {c.createdAt ? <span data-added> · {addedLabel(c.createdAt, isTl)}</span> : null}
                      </p>

                      {/* line 3: the one next step */}
                      <div
                        className="mt-2.5 flex items-center justify-between gap-3"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key !== 'Escape') e.stopPropagation();
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                              isResolved
                                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {c.status === 'Conference Scheduled' && nextConfByCase.has(c.caseCode)
                              ? isTl ? 'May schedule na' : 'Conference set'
                              : statusWord(c.status)}
                          </span>
                          {step.hint && (
                            <span className="text-xs font-semibold text-[#1E469B] dark:text-[#7CB8F7] truncate">
                              → {step.hint}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {step.action === 'text' && (
                            <button
                              type="button"
                              onClick={() => openComposerForCase(c)}
                              title={isTl ? 'Hindi kasama ang offense sa text' : 'The message never includes the offense'}
                              className="px-3.5 py-1.5 rounded-lg bg-[#1E469B] hover:bg-[#16377E] text-white text-xs font-extrabold whitespace-nowrap"
                            >
                              ✉ {isTl ? 'I-text ang magulang' : 'Text parent'}
                            </button>
                          )}
                          {step.action === 'schedule' && (
                            <button
                              type="button"
                              onClick={() => onScheduleConference?.(c.caseCode)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#1E469B] hover:bg-[#16377E] text-white text-xs font-extrabold whitespace-nowrap"
                            >
                              📅 {isTl ? 'Mag-schedule' : 'Schedule conference'}
                            </button>
                          )}
                          {step.action === 'flow' && (
                            <button
                              type="button"
                              data-card-flow={c.caseCode}
                              onClick={() => openCaseDetails(c)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#1E469B] hover:bg-[#16377E] text-white text-xs font-extrabold whitespace-nowrap"
                            >
                              {step.button} →
                            </button>
                          )}
                          {step.action === 'done' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCaseStatus(c, 'Resolved')}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold whitespace-nowrap"
                            >
                              ✓ {isTl ? 'Tapos na' : 'Mark as done'}
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
                              className="w-8 h-8 rounded-lg saas-card-subtle hover:border-[#1E469B] text-sm font-extrabold text-[#4A608A] dark:text-[#94A8D0]"
                            >
                              ⋯
                            </button>
                            {menuOpen && (
                              <>
                                <div
                                  role="menu"
                                  className="absolute right-0 top-9 z-40 w-52 py-1 rounded-xl bg-white dark:bg-[#14223E] border border-[#D3DDEE] dark:border-[#253B66] shadow-xl"
                                >
                                  {[
                                    {
                                      show: true,
                                      label: isTl ? '📄 Buksan ang buong kaso' : '📄 Open full case',
                                      run: () => openCaseDetails(c),
                                    },
                                    {
                                      show: step.action !== 'text',
                                      label: isTl ? '✉ I-text ang magulang' : '✉ Text parent',
                                      run: () => openComposerForCase(c),
                                    },
                                    {
                                      show: true,
                                      label: isTl ? '🖨️ Mag-print ng form…' : '🖨️ Print a form…',
                                      run: () => {
                                        soundFX.playKeyClick(2);
                                        setCallSlipCase(c);
                                      },
                                    },
                                    {
                                      show: !isResolved && step.action !== 'done',
                                      label: isTl ? '✓ Tapos na' : '✓ Mark as done',
                                      run: () => handleUpdateCaseStatus(c, 'Resolved'),
                                    },
                                    {
                                      show: isResolved,
                                      label: isTl ? '↺ Buksan ulit' : '↺ Reopen case',
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
                                        className="w-full text-left px-3.5 py-2 text-xs font-bold text-[#0B1F4D] dark:text-white hover:bg-[#F4F7FC] dark:hover:bg-[#1B2C4F]"
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
                      className="w-full py-2.5 rounded-xl border border-dashed border-[#B9C8E4] dark:border-[#2E4778] text-xs font-extrabold text-[#1E469B] dark:text-[#7CB8F7] hover:bg-white dark:hover:bg-[#0F1A30]"
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
                        {groupDone && (
                          <p className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#4A608A] dark:text-[#94A8D0]">
                            {isTl ? 'Kailangan pang asikasuhin' : 'Needs action'} · {todo.length}
                          </p>
                        )}
                        {todo.slice(0, boardLimit).map(card)}
                        {moreButton(todo.length - boardLimit)}
                      </div>
                    )}
                    {todo.length === 0 && groupDone && done.length > 0 && (
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 text-center py-4">
                        ✓ {isTl ? 'Walang kasong naghihintay. Ayos!' : 'No case is waiting. All caught up!'}
                      </p>
                    )}
                    {done.length > 0 &&
                      (groupDone ? (
                        <div className="space-y-2.5">
                          <button
                            type="button"
                            onClick={() => setShowDoneCases((v) => !v)}
                            aria-expanded={showDoneCases}
                            className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#4A608A] dark:text-[#94A8D0] hover:text-[#0B1F4D] dark:hover:text-white"
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
            SUB-TAB 3: STUDENT DIRECTORY & OFFENSE HISTORY (PAGE 4)
            ================================================================== */}
        {subTab === 'students' && (
          <section className="rounded-2xl saas-card overflow-hidden">
            <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
                  {isTl
                    ? `Mga estudyante (${filteredDirectoryStudents.length})`
                    : `Students (${filteredDirectoryStudents.length})`}
                </h2>
                <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                  {(isTl
                    ? { newest: 'Pinakabagong idinagdag ang nasa itaas.', oldest: 'Pinakalumang idinagdag ang nasa itaas.', name: 'Ayon sa pangalan (A–Z).', attention: 'Nasa itaas ang may serious o paulit-ulit na offense.' }
                    : { newest: 'Newest added on top.', oldest: 'Oldest added on top.', name: 'By name (A–Z).', attention: 'Students with serious or repeated offenses on top.' })[studentSort]}{' '}
                  {isTl ? 'I-click ang estudyante para makita ang record.' : 'Click a student to see their record.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 rounded-lg saas-card-subtle gap-1" role="group" aria-label={isTl ? 'Naka-enroll o hindi' : 'Enrolled or not'}>
                  {(
                    [
                      ['enrolled', isTl ? `Naka-enroll · ${students.filter((x) => x.enrolled !== false).length}` : `Enrolled · ${students.filter((x) => x.enrolled !== false).length}`],
                      ['left', isTl ? `Hindi na naka-enroll · ${students.filter((x) => x.enrolled === false).length}` : `Not enrolled · ${students.filter((x) => x.enrolled === false).length}`],
                    ] as const
                  ).map(([k, t]) => (
                    <button key={k} type="button" data-enrolled-filter={k} onClick={() => { setEnrolledFilter(k); setDirPage(0); }} className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap ${enrolledFilter === k ? 'bg-[#1E469B] text-white' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <button type="button" data-action="add-student" onClick={() => setStudentFormFor('new')} className="px-3 py-1.5 rounded-lg bg-[#1E469B] text-white text-xs font-bold whitespace-nowrap">
                  + {isTl ? 'Magdagdag ng estudyante' : 'Add student'}
                </button>
                <button type="button" data-action="move-up" onClick={() => void moveUpSchoolYear()} title={isTl ? 'Grade 11 → 12 at Grade 12 → Graduated (sa simula ng school year)' : 'Grade 11 → 12 and Grade 12 → Graduated (start of a school year)'} className="px-3 py-1.5 rounded-lg saas-card-subtle text-xs font-bold whitespace-nowrap">
                  {isTl ? 'Umakyat ng school year…' : 'Move up a school year…'}
                </button>
              </div>
              <SortControl id="students" value={studentSort} onChange={(v) => { setStudentSort(v); setDirPage(0); }} isTl={isTl} />
              <Legend
                className="w-full"
                items={[
                  { color: '#F43F5E', label: isTl ? 'May serious offense' : 'Has a serious offense', shape: 'box' },
                  { color: '#F59E0B', label: isTl ? 'Bantayan (2+ minor)' : 'Watch (2+ minor)', shape: 'box' },
                  { color: '#0EA5E9', label: '1 minor', shape: 'box' },
                  { color: '#10B981', label: isTl ? 'Walang offense' : 'No offense', shape: 'box' },
                ]}
              />

              <div className="inline-flex flex-wrap p-1 rounded-lg saas-card-subtle gap-1">
                {[['ALL', students.length] as [string, number], ...sectionOptions].map(([sec, n]) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setSectionFilter(sec);
                      setDirPage(0);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                      sectionFilter === sec
                        ? 'bg-[#1E469B] text-white'
                        : 'text-[#4A608A] dark:text-[#94A8D0] hover:text-[#0B1F4D] dark:hover:text-white'
                    }`}
                  >
                    {sec === 'ALL' ? (isTl ? 'Lahat' : 'All') : sec} · {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-[#E2E9F5] dark:divide-[#1E3158]">
              {filteredDirectoryStudents.length === 0 && (
                <div className="px-6 py-10 text-center space-y-3">
                  <p className="text-sm font-bold text-[#0B1F4D] dark:text-white">
                    {students.length === 0
                      ? isTl
                        ? 'Wala pang estudyante. Mag-import ng masterlist o magdagdag ng isa.'
                        : 'No students yet. Import the masterlist or add one.'
                      : quickSearch.trim()
                      ? isTl
                        ? `Walang estudyanteng tugma sa "${quickSearch.trim()}".`
                        : `No student matches "${quickSearch.trim()}".`
                      : isTl
                      ? 'Walang estudyante sa section na ito.'
                      : 'No students in this section.'}
                  </p>
                  <div className="flex justify-center gap-2">
                    {sectionFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setSectionFilter('ALL')}
                        className="px-3 py-1.5 rounded-lg saas-card-subtle text-xs font-bold text-[#1E469B] dark:text-[#7CB8F7]"
                      >
                        {isTl ? 'Ipakita lahat' : 'Show all students'}
                      </button>
                    )}
                    {students.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setSubTab('masterlist')}
                        className="px-3 py-1.5 rounded-lg bg-[#1E469B] text-white text-xs font-bold"
                      >
                        {isTl ? 'I-import ang masterlist' : 'Import masterlist'}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {pagedDirectoryStudents.map((stu) => (
                <div
                  key={stu.studentNumber}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    soundFX.playStepUnlock();
                    setSelectedStudentProfile(stu);
                    setPasswordResetCode(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSelectedStudentProfile(stu);
                      setPasswordResetCode(null);
                    }
                  }}
                  className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#F8FAFE] dark:hover:bg-[#13203B] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#E4ECFC] dark:bg-[#192D58] text-[#1E469B] dark:text-[#7CB8F7] font-extrabold text-xs flex items-center justify-center shrink-0">
                      {stu.initials}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                          {stu.fullName}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#1E469B] dark:text-[#7CB8F7]">
                          #{stu.studentNumber}
                        </span>
                        <span className="text-xs font-semibold text-[#4A608A] dark:text-[#94A8D0]">
                          · {stu.gradeSection}
                        </span>
                      </div>
                      <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                        {isTl ? 'Magulang' : 'Parent'}: {stu.parentName} · {stu.parentPhone || (isTl ? 'walang number' : 'no number')}
                        {stu.createdAt ? <span data-added> · {addedLabel(stu.createdAt, isTl)}</span> : null}
                        {(stu.minorOffenseCount > 0 || stu.majorOffenseCount > 0) && (
                          <>
                            {' · '}
                            <span className="font-semibold">
                              {stu.minorOffenseCount} minor · {stu.majorOffenseCount} {isTl ? 'malubha' : 'serious'}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${attentionBadge(stu).cls}`}>
                      {attentionBadge(stu).text}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playStepUnlock();
                        setSelectedStudentProfile(stu);
                        setPasswordResetCode(null);
                      }}
                      className="px-3 py-1.5 rounded-lg saas-card-subtle hover:border-[#1E469B] text-xs font-bold whitespace-nowrap text-[#0B1F4D] dark:text-white"
                    >
                      {isTl ? 'Tingnan ang record' : 'View record'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {dirPageCount > 1 && (
              <div className="px-6 py-3 border-t border-[#DCE5F2] dark:border-[#1E3158] flex items-center justify-between text-xs font-bold text-[#4A608A] dark:text-[#94A8D0]">
                <span>
                  {isTl ? 'Ipinapakita' : 'Showing'} {safeDirPage * DIR_PAGE_SIZE + 1}–
                  {Math.min((safeDirPage + 1) * DIR_PAGE_SIZE, filteredDirectoryStudents.length)}{' '}
                  {isTl ? 'sa' : 'of'} {filteredDirectoryStudents.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={safeDirPage === 0}
                    onClick={() => setDirPage(safeDirPage - 1)}
                    className="px-3 py-1.5 rounded-lg saas-card-subtle disabled:opacity-40"
                  >
                    ← {isTl ? 'Nakaraan' : 'Previous'}
                  </button>
                  <button
                    type="button"
                    disabled={safeDirPage >= dirPageCount - 1}
                    onClick={() => setDirPage(safeDirPage + 1)}
                    className="px-3 py-1.5 rounded-lg saas-card-subtle disabled:opacity-40"
                  >
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
          <section className="rounded-2xl saas-card p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
                  {isTl
                    ? 'I-import ang masterlist ng estudyante'
                    : 'Import the student masterlist'}
                </h2>
                <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                  {isTl
                    ? 'I-upload ang Excel. Ipapakita muna ang may mali (doble, kulang na number) bago i-save.'
                    : 'Upload the Excel file. Rows with problems (duplicates, wrong numbers) are shown before saving.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="btn-press px-3.5 py-2 rounded-xl saas-card-subtle hover:border-[#1E469B] text-xs font-bold"
                >
                  ⬇ {isTl ? 'I-download ang Template' : 'Download Template'}
                </button>

                {totalPreviewErrors > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoFixMasterlist}
                    title={
                      isTl
                        ? 'Inaayos lang ang format ng mobile number. Ang ibang mali ay ayusin sa table.'
                        : 'Only fixes mobile number formats. Fix other problems in the table.'
                    }
                    className="btn-press px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-[#0B1F4D] text-xs font-extrabold shadow-sm"
                  >
                    ✨{' '}
                    {isTl
                      ? 'Ayusin ang format ng mobile number'
                      : 'Fix mobile number formats'}
                  </button>
                )}

                <button
                  type="button"
                  disabled={readyPreviewCount === 0 || savingMasterlist}
                  onClick={handleCommitMasterlistToDb}
                  className="btn-press px-4 py-2 rounded-xl bg-[#1E469B] hover:bg-[#16377E] text-white text-xs font-extrabold shadow-sm disabled:opacity-40"
                >
                  💾{' '}
                  {savingMasterlist
                    ? isTl
                      ? 'Sine-save…'
                      : 'Saving…'
                    : isTl
                    ? `I-save sa Masterlist (${readyPreviewCount})`
                    : `Save to Masterlist (${readyPreviewCount})`}
                </button>
              </div>
            </div>

            {/* STEP 1 — Drop zone (reading happens in the center popup) */}
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
              className={`block rounded-2xl border-2 border-dashed px-6 py-6 text-center cursor-pointer transition-colors ${
                importDragOver
                  ? 'border-[#2557BE] bg-[#E4ECFC] dark:bg-[#192D58]'
                  : 'border-[#CFD9F2] dark:border-[#243B6B] hover:border-[#2557BE] hover:bg-[#F6F9FE] dark:hover:bg-[#12203F]'
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.csv,.txt,.xls,.pdf,.ods"
                className="sr-only"
                onChange={(e) => {
                  void handleImportFile(e.target.files?.[0]);
                  e.target.value = ''; // allow re-selecting the same file
                }}
              />
              <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                {isTl
                  ? '📂 I-drag dito ang Excel o CSV file, o i-click para pumili'
                  : '📂 Drag an Excel or CSV file here, or click to choose'}
              </p>
              <p className="mt-1 text-xs text-[#4A608A] dark:text-[#94A8D0]">
                {isTl
                  ? 'Tinatanggap: .xlsx at .csv · Kahit anong ayos ng column — kami na ang maghahanap ng Name, LRN, Section, Magulang at Mobile.'
                  : 'Accepted: .xlsx and .csv · Any column order — we find Name, LRN, Section, Parent and Mobile for you.'}
              </p>
            </label>

            {importError && (
              <div
                role="alert"
                className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-[13px] font-semibold text-rose-800 dark:text-rose-200"
              >
                <span>⚠ {importError}</span>
                <button type="button" onClick={() => setImportError('')} className="font-extrabold" aria-label="Dismiss">
                  ✕
                </button>
              </div>
            )}

            {/* STEP 2 — Match Columns */}
            {importAnalysis && (
              <div className="rounded-2xl border border-[#CFD9F2] dark:border-[#243B6B] overflow-hidden">
                <div className="px-5 py-4 bg-[#F1F5FD] dark:bg-[#12203F] border-b border-[#CFD9F2] dark:border-[#243B6B]">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#2557BE] dark:text-[#7CB8F7]">
                    {isTl ? 'Step 2 · I-check ang mga column' : 'Step 2 · Check the columns'}
                  </p>
                  <h3 className="mt-0.5 text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                    {isTl
                      ? `Nakabasa ng ${importAnalysis.extract.rows.length} estudyante sa "${importAnalysis.fileName}"`
                      : `Found ${importAnalysis.extract.rows.length} students in "${importAnalysis.fileName}"`}
                  </h3>
                  <p className="mt-1 text-xs text-[#4A608A] dark:text-[#94A8D0]">
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
                        <label htmlFor={`map-${field}`} className="font-bold text-[#0B1F4D] dark:text-white">
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
                            <p className="mt-0.5 truncate text-[11px] text-[#687FA8] dark:text-[#89A7DF]">
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
                    ⚠{' '}
                    {isTl
                      ? `Hindi nakita: ${importMissingRequired.join(', ')}. Piliin ang tamang column, o ituloy at punan sa preview.`
                      : `Not found: ${importMissingRequired.join(', ')}. Pick the right column, or continue and fill them in the preview.`}
                  </p>
                )}

                <div className="px-5 py-3 flex justify-end gap-2 bg-[#F6F9FE] dark:bg-[#0E1A33] border-t border-[#E2E9F5] dark:border-[#1E3158]">
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
                    className="btn-press px-5 py-2 rounded-lg bg-[#1E469B] hover:bg-[#16377E] text-white text-xs font-extrabold disabled:opacity-40"
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
                <p className="text-sm font-bold text-[#0B1F4D] dark:text-white">
                  {isTl ? 'Wala pang naka-preview na estudyante.' : 'No students in the preview yet.'}
                </p>
                <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
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
                            : 'bg-[#1E469B] text-white'
                          : 'text-[#4A608A] dark:text-[#94A8D0] hover:text-[#0B1F4D] dark:hover:text-white'
                      }`}
                    >
                      {label} <span className="font-mono opacity-80">({count})</span>
                    </button>
                  ))}
                </div>

                {previewPageCount > 1 && (
                  <div className="flex items-center gap-2 text-xs font-bold text-[#4A608A] dark:text-[#94A8D0]">
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
                      ? '✓ Wala nang kailangang ayusin!'
                      : '✓ Nothing left to fix!'
                    : isTl
                    ? 'Walang row dito.'
                    : 'No rows here.'}
                </div>
              ) : (
              <div className="overflow-x-auto rounded-xl border border-[#DCE5F2] dark:border-[#1E3158]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="saas-card-subtle border-b border-[#DCE5F2] dark:border-[#1E3158] text-[#4A608A] dark:text-[#94A8D0] font-extrabold">
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Student ID / LRN</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Grade · Section</th>
                      <th className="py-3 px-4">Parent / Guardian</th>
                      <th className="py-3 px-4">Parent Mobile</th>
                      <th className="py-3 px-4">Parent Gmail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E9F5] dark:divide-[#1E3158]">
                    {pagedPreviewRows.map((row) => (
                      <tr
                        key={row.rowId}
                        className={
                          row.isValid
                            ? 'bg-white dark:bg-[#0F1A30]'
                            : 'bg-rose-50/60 dark:bg-rose-950/25'
                        }
                      >
                        <td className="py-2.5 px-4 align-top w-56">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold whitespace-nowrap">
                              {row.isUpdate ? `↻ ${isTl ? 'Ia-update' : 'Will update'}` : `✓ ${isTl ? 'Bago · handa nang i-save' : 'New · ready to save'}`}
                            </span>
                          ) : (
                            <ul className="space-y-1">
                              {row.issues.map((iss, i) => (
                                <li
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[11px] leading-snug"
                                >
                                  ⚠ {iss}
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
                            <p className="mt-0.5 text-[10px] text-[#687FA8] dark:text-[#89A7DF]">
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
                              aria-label="Grade level"
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
                            placeholder="Enter parent name..."
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
                            aria-label="Parent Gmail"
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
            className="fixed inset-0 !m-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => !caseEditing && setOpenCaseCode(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && !caseEditing && !document.querySelector('[data-evidence-viewer], [data-print-forms], [data-statement-station]')) setOpenCaseCode(null);
            }}
          >
            <motion.div
              role="dialog"
              aria-label={isTl ? 'Detalye ng kaso' : 'Case details'}
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[calc(100dvh/var(--app-zoom,1)_-_2rem)] rounded-2xl saas-card flex flex-col overflow-hidden"
            >
              {/* header */}
              <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
                      {openCase.studentName}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${severityInfo(openCase.severity).cls}`}>
                      {severityInfo(openCase.severity).word}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        openCase.status === 'Resolved'
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {statusWord(openCase.status)}
                    </span>
                  </div>
                  <p className="text-xs text-[#4A608A] dark:text-[#94A8D0] mt-0.5">
                    {openCase.gradeSection} · #{openCase.studentNumber} ·{' '}
                    <span className="font-mono">{openCase.caseCode}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenCaseCode(null)}
                  disabled={caseEditing}
                  title={isTl ? 'Isara' : 'Close'}
                  aria-label={isTl ? 'Isara' : 'Close'}
                  className="w-8 h-8 rounded-lg saas-card-subtle text-sm font-bold text-[#4A608A] disabled:opacity-40 shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* body */}
              <div className="overflow-y-auto clean-scroll">
              <CaseFlowPanel key={openCase.caseCode + (openCase.step ?? '') + (openCase.decidedAt ?? '')} c={openCase} isTl={isTl} busy={flowBusy} suggestedSanction={suggestedSanctionFor(openCase)} onAction={(a) => void applyFlow(openCase, a)} onOpenStation={() => setStationCase(openCase)} />
              {stationCase && (
                <StatementStation studentName={stationCase.studentName} gradeSection={stationCase.gradeSection} isTl={isTl} onSubmit={(s) => saveStationStatement(stationCase, s.text)} onClose={closeStation} />
              )}
              <div className="px-6 py-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <p className="font-bold text-[#4A608A] dark:text-[#94A8D0]">{isTl ? 'Offense' : 'Offense'}</p>
                    <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                      {isTl ? openCase.offenseTitleTl : openCase.offenseTitleEn}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-[#4A608A] dark:text-[#94A8D0] mb-1">{isTl ? 'Petsa' : 'Date'}</p>
                    {caseEditing ? (
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg saas-card-subtle font-bold text-[#0B1F4D] dark:text-white"
                      />
                    ) : (
                      <p className="font-semibold text-[#0B1F4D] dark:text-white">{prettyDate(openCase.incidentDate)}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-[#4A608A] dark:text-[#94A8D0] mb-1">{isTl ? 'Nag-report' : 'Reported by'}</p>
                    {caseEditing ? (
                      <input
                        type="text"
                        value={editReportedBy}
                        onChange={(e) => setEditReportedBy(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg saas-card-subtle font-bold text-[#0B1F4D] dark:text-white"
                      />
                    ) : (
                      <p className="font-semibold text-[#0B1F4D] dark:text-white">{openCase.reportedBy}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="font-bold text-[#4A608A] dark:text-[#94A8D0] mb-1">
                      {isTl ? 'Ano ang nangyari' : 'What happened'}
                    </p>
                    {caseEditing ? (
                      <textarea
                        rows={4}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full p-3 rounded-lg saas-card-subtle font-semibold text-[#0B1F4D] dark:text-white"
                      />
                    ) : (
                      <p className="font-semibold text-[#0B1F4D] dark:text-white whitespace-pre-line">{hideIncidentMarker(openCase.notes)}</p>
                    )}
                    {caseEditing && (
                      <p className="mt-1 text-[11px] text-[#687FA8] dark:text-[#89A7DF]">
                        {isTl
                          ? 'ⓘ Hindi mapapalitan dito ang offense dahil binabago nito ang bilang ng offense ng estudyante.'
                          : "ⓘ The offense can't be changed here because it changes the student's offense count."}
                      </p>
                    )}
                  </div>
                  {openCaseStudent && (
                    <div className="col-span-2">
                      <p className="font-bold text-[#4A608A] dark:text-[#94A8D0]">{isTl ? 'Magulang' : 'Parent'}</p>
                      <p className="font-semibold text-[#0B1F4D] dark:text-white">
                        {openCaseStudent.parentName} · {openCaseStudent.parentPhone || (isTl ? 'walang number' : 'no number')}
                        {openCaseStudent.parentEmail ? ` · ${openCaseStudent.parentEmail}` : ''}
                      </p>
                    </div>
                  )}
                </div>

                {openCase.incidentCode &&
                  cases.some((x) => x.incidentCode === openCase.incidentCode && x.caseCode !== openCase.caseCode) && (
                    <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/60">
                      <p className="font-extrabold text-violet-800 dark:text-violet-300 mb-1.5">
                        👥 {isTl ? 'Kasama sa insidenteng ito' : 'Also in this incident'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cases
                          .filter((x) => x.incidentCode === openCase.incidentCode && x.caseCode !== openCase.caseCode)
                          .map((x) => (
                            <button
                              key={x.caseCode}
                              type="button"
                              disabled={caseEditing}
                              onClick={() => openCaseDetails(x)}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0F1A30] border border-violet-200 dark:border-violet-800/60 text-[11px] font-bold text-[#0B1F4D] dark:text-white hover:border-violet-500 disabled:opacity-50"
                            >
                              {x.studentName} · {isTl ? x.offenseTitleTl : x.offenseTitleEn} →
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                {/* evidence: photos / PDFs, private */}
                <EvidencePanel
                  caseCode={openCase.caseCode}
                  isTl={isTl}
                  by={appConfig.staff.find((x) => x.active)?.email ?? ''}
                  onToast={(m, undo) => onTriggerToast(m, undo)}
                  onChanged={() => void loadCaseHistory(openCase.caseCode)}
                />
                {/* timeline from the audit trail */}
                <div>
                  <p className="font-extrabold text-[#0B1F4D] dark:text-white mb-2">
                    {isTl ? 'Mga nangyari sa kasong ito' : 'What happened on this case'}
                  </p>
                  {caseHistory === 'loading' ? (
                    <p className="text-[#4A608A] dark:text-[#94A8D0]">{isTl ? 'Kinukuha…' : 'Loading…'}</p>
                  ) : caseHistory === null ? (
                    <p className="text-rose-600 dark:text-rose-400 font-semibold">
                      {isTl
                        ? '⚠ Hindi makuha ang history. I-check ang internet, tapos isara at buksan ulit.'
                        : "⚠ Couldn't load the history. Check the internet, then close and open this case again."}
                    </p>
                  ) : caseHistory.length === 0 ? (
                    <p className="text-[#4A608A] dark:text-[#94A8D0]">
                      {isTl ? 'Wala pang naitala.' : 'Nothing recorded yet.'}
                    </p>
                  ) : (
                    <ol className="space-y-2 border-l-2 border-[#DCE5F2] dark:border-[#1E3158] pl-3">
                      {caseHistory.map((h, i) => (
                        <li key={i}>
                          <p className="font-semibold text-[#0B1F4D] dark:text-white">{isTl ? h.actionTl : h.actionEn}</p>
                          <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">
                            {prettyTime(h.when)} · {h.actor}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
              </div>

              {/* footer */}
              <div className="px-6 py-3 border-t border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center justify-between gap-2">
                {caseEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCaseEditing(false)}
                      className="px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold"
                    >
                      {isTl ? 'Kanselahin' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={saveCaseEdit}
                      className="px-4 py-2 rounded-lg bg-[#1E469B] text-white text-xs font-extrabold"
                    >
                      {isTl ? '✓ I-save' : '✓ Save changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={startCaseEdit}
                        className="px-3 py-2 rounded-lg saas-card-subtle hover:border-[#1E469B] text-xs font-bold text-[#0B1F4D] dark:text-white"
                      >
                        ✎ {isTl ? 'I-edit' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCallSlipCase(openCase);
                          setOpenCaseCode(null);
                        }}
                        className="px-3 py-2 rounded-lg saas-card-subtle hover:border-[#1E469B] text-xs font-bold whitespace-nowrap text-[#0B1F4D] dark:text-white"
                      >
                        🖨️ {isTl ? 'Mag-print ng form…' : 'Print a form…'}
                      </button>
                      {openCaseStudent && (
                        <button
                          type="button"
                          title={isTl ? 'Hindi kasama ang offense sa text' : 'The message never includes the offense'}
                          onClick={() => {
                            setOpenCaseCode(null);
                            onOpenParentComposer({
                              studentName: openCaseStudent.fullName,
                              gradeSection: openCaseStudent.gradeSection,
                              parentName: openCaseStudent.parentName,
                              parentPhone: openCaseStudent.parentPhone,
                              parentEmail: openCaseStudent.parentEmail,
                              scheduleText: '',
                            });
                          }}
                          className="px-3 py-2 rounded-lg saas-card-subtle hover:border-[#1E469B] text-xs font-bold whitespace-nowrap text-[#1E469B] dark:text-[#7CB8F7]"
                        >
                          ✉ {isTl ? 'I-text ang magulang' : 'Text parent'}
                        </button>
                      )}
                    </div>
                    {openCase.status === 'Resolved' ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateCaseStatus(openCase, 'Open')}
                        className="px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold text-[#0B1F4D] dark:text-white"
                      >
                        ↺ {isTl ? 'Buksan ulit' : 'Reopen case'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateCaseStatus(openCase, 'Resolved')}
                        title={isTl ? 'Isara agad nang hindi dumadaan sa lahat ng hakbang (hal. simpleng paalala sa 1st minor)' : 'Close right away without all the steps (e.g. a simple reminder for a 1st minor)'}
                        className="px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold text-[#0B1F4D] dark:text-white"
                      >
                        {isTl ? 'Isara agad' : 'Close right away'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      ,document.body)}

      {/* Print forms: call slip, conference form, behavioral contract, kasunduan, suspension letter */}
      {callSlipCase && (
        <PrintFormsWindow
          c={callSlipCase}
          stu={students.find((x) => x.studentNumber === callSlipCase.studentNumber)}
          isTl={isTl}
          conferenceWhen={nextConfByCase.has(callSlipCase.caseCode) ? confText(nextConfByCase.get(callSlipCase.caseCode)!) : ''}
          onClose={() => setCallSlipCase(null)}
          onPrinted={(kind) => {
            const t = FORM_TITLES[kind];
            void insertActivityLogInDb({ actor: 'Guidance Associate', actionEn: `${callSlipCase.caseCode}: printed ${t[0]}`, actionTl: `${callSlipCase.caseCode}: nag-print ng ${t[1]}`, tag: callSlipCase.caseCode, tone: 'blue' });
            onTriggerToast(isTl ? `🖨 Binuksan ang print ng ${t[1]}. Piliin ang printer at pindutin ang Print.` : `🖨 ${t[0]} is ready to print. Pick the printer and press Print.`);
          }}
          onFailed={() => onTriggerToast(isTl ? '⚠️ Hindi mabuksan ang print. Isara at buksan ulit ang app, tapos subukan ulit.' : '⚠️ Could not open printing. Close and reopen the app, then try again.')}
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
            className="fixed inset-0 !m-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-xl rounded-2xl saas-card p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#1E469B] text-white font-extrabold text-sm flex items-center justify-center">
                    {selectedStudentProfile.initials}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
                      {selectedStudentProfile.fullName}
                    </h3>
                    <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
                      #{selectedStudentProfile.studentNumber} ·{' '}
                      {selectedStudentProfile.gradeSection}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentProfile(null)}
                  title={isTl ? 'Isara' : 'Close'}
                  aria-label={isTl ? 'Isara' : 'Close'}
                  className="w-8 h-8 rounded-lg saas-card-subtle text-sm font-bold text-[#4A608A]"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl saas-card-subtle">
                  <p className="text-[#4A608A] dark:text-[#94A8D0] font-bold">
                    {isTl ? 'Magulang / guardian' : 'Parent / guardian'}
                  </p>
                  <p className="font-extrabold text-[#0B1F4D] dark:text-white mt-0.5">
                    {selectedStudentProfile.parentName}
                  </p>
                  <p className="font-semibold text-[#4A608A] dark:text-[#94A8D0]">
                    {selectedStudentProfile.parentPhone || (isTl ? 'walang number' : 'no number')}
                  </p>
                </div>
                <div className="p-3 rounded-xl saas-card-subtle">
                  <p className="text-[#4A608A] dark:text-[#94A8D0] font-bold">
                    {isTl ? 'Kabuuang offense' : 'Offenses so far'}
                  </p>
                  <p className="font-extrabold text-[#0B1F4D] dark:text-white mt-0.5">
                    {selectedStudentProfile.minorOffenseCount} minor ·{' '}
                    {selectedStudentProfile.majorOffenseCount} {isTl ? 'malubha' : 'serious'}
                  </p>
                </div>
              </div>

              {/* Student's Case History List */}
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white">
                  {isTl ? 'Mga kaso niya' : 'Their cases'}
                </p>
                {cases.filter((c) => c.studentNumber === selectedStudentProfile.studentNumber).length === 0 && (
                  <p className="p-3 rounded-xl saas-card-subtle text-xs font-semibold text-[#4A608A] dark:text-[#94A8D0]">
                    {isTl ? 'Wala pang naitalang kaso. Malinis ang record.' : 'No cases recorded. Clean record.'}
                  </p>
                )}
                {cases
                  .filter((c) => c.studentNumber === selectedStudentProfile.studentNumber)
                  .sort((a, b) => b.incidentDate.localeCompare(a.incidentDate))
                  .map((c) => (
                    <button
                      key={c.caseCode}
                      type="button"
                      title={isTl ? 'Buksan ang buong kaso' : 'Open the full case'}
                      onClick={() => {
                        setSelectedStudentProfile(null);
                        openCaseDetails(c);
                      }}
                      className="w-full text-left p-3 rounded-xl saas-card-subtle hover:border-[#1E469B] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[#0B1F4D] dark:text-white">
                          {isTl ? c.offenseTitleTl : c.offenseTitleEn}
                        </p>
                        <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">
                          {prettyDate(c.incidentDate)} · <span className="font-mono">{c.caseCode}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${severityInfo(c.severity).cls}`}>
                          {severityInfo(c.severity).word}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold saas-card-subtle">
                          {statusWord(c.status)}
                        </span>
                        <span className="text-[#4A608A]">→</span>
                      </div>
                    </button>
                  ))}
              </div>

              {/* extra info from Settings › Student fields, and the actions */}
              {Object.keys(selectedStudentProfile.extra ?? {}).filter((k) => (selectedStudentProfile.extra ?? {})[k]).length > 0 && (
                <div className="grid grid-cols-2 gap-2 text-xs" data-extra-info>
                  {appConfig.studentFields.custom
                    .filter((c) => (selectedStudentProfile.extra ?? {})[c.key])
                    .map((c) => (
                      <div key={c.key} className="p-2.5 rounded-xl saas-card-subtle">
                        <p className="text-[#4A608A] dark:text-[#94A8D0] font-bold">{isTl ? c.labelTl || c.labelEn : c.labelEn}</p>
                        <p className="font-extrabold text-[#0B1F4D] dark:text-white break-words">{(selectedStudentProfile.extra ?? {})[c.key]}</p>
                      </div>
                    ))}
                </div>
              )}
              {selectedStudentProfile.enrolled === false && (
                <p className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#0B1F4D] dark:text-white">
                  {isTl ? 'Hindi na naka-enroll' : 'Not enrolled anymore'} · {selectedStudentProfile.leftReason || '—'}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" data-action="edit-student" onClick={() => setStudentFormFor(selectedStudentProfile)} className="px-4 py-2 rounded-lg bg-[#1E469B] text-white text-xs font-bold">
                  {isTl ? 'Baguhin ang impormasyon' : 'Edit details'}
                </button>
                {selectedStudentProfile.enrolled === false ? (
                  <button type="button" data-action="re-enroll" onClick={() => void setEnrollment(selectedStudentProfile, true)} className="px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold">
                    {isTl ? 'Ibalik bilang naka-enroll' : 'Mark as enrolled again'}
                  </button>
                ) : (
                  <button type="button" data-action="not-enrolled" onClick={() => setLeaveFor(selectedStudentProfile)} className="px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold text-rose-700 dark:text-rose-300">
                    {isTl ? 'Hindi na naka-enroll…' : 'Not enrolled anymore…'}
                  </button>
                )}
              </div>
              {leaveFor && leaveFor.studentNumber === selectedStudentProfile.studentNumber && (
                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800 space-y-2" data-leave-reasons>
                  <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Bakit?' : 'Why?'}</p>
                  <div className="flex flex-wrap gap-2">
                    {(isTl ? [['Graduated', 'Graduated'], ['Transferred', 'Lumipat ng school'], ['Stopped', 'Huminto sa pag-aaral']] : [['Graduated', 'Graduated'], ['Transferred', 'Transferred'], ['Stopped', 'Stopped school']]).map(([k, t]) => (
                      <button key={k} type="button" data-leave-reason={k} onClick={() => void setEnrollment(selectedStudentProfile, false, t)} className="px-3 py-1.5 rounded-lg saas-card-subtle text-xs font-bold">
                        {t}
                      </button>
                    ))}
                    <button type="button" onClick={() => setLeaveFor(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#4A608A]">
                      {isTl ? 'Kanselahin' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Portal password help — not connected to the student portal yet, so it is shown as "Coming soon" (Golden Rule 2) */}
              <div className="p-3.5 rounded-xl saas-card-subtle flex items-center justify-between gap-3 text-xs opacity-70">
                <div>
                  <p className="font-extrabold text-[#0B1F4D] dark:text-white">
                    🔑 {isTl ? 'Nakalimutan ang password sa student portal' : 'Forgot student portal password'}
                  </p>
                  <p className="text-[#4A608A] dark:text-[#94A8D0]">
                    {isTl
                      ? 'Paparating pa: gagana ito kapag nakakonekta na ang student portal.'
                      : 'Coming soon: this will work once the student portal is connected.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold shrink-0 saas-card-subtle text-[#4A608A]">
                  {isTl ? 'Paparating' : 'Coming soon'}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentProfile(null)}
                  className="px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold"
                >
                  {isTl ? 'Isara' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentNumbers([selectedStudentProfile.studentNumber]);
                    setSelectedStudentProfile(null);
                    setSubTab('add-report');
                  }}
                  className="px-4 py-2 rounded-lg bg-[#1E469B] text-white text-xs font-bold"
                >
                  {isTl ? '＋ Bagong kaso para sa kanya' : '＋ New case for this student'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
};
