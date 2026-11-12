import { IconName } from '../components/ui/iconPaths';
import { TileColor } from '../components/ui/IconTile';

export interface SidebarNavItem {
  id: string;
  pageNumber: number;
  stageNumber: number;
  group: 'OVERVIEW' | 'CASES' | 'PARENTS' | 'STUDENT SUPPORT' | 'RECORDS';
  icon: IconName;
  color: TileColor;
  labelEn: string;
  labelTl: string;
  badgeCount?: number;
  badgeVariant?: 'cobalt' | 'amber' | 'rose' | 'emerald';
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  // OVERVIEW
  {
    id: 'dashboard',
    pageNumber: 1,
    stageNumber: 2,
    group: 'OVERVIEW',
    icon: 'squaresFour',
    color: 'cobalt',
    labelEn: 'Dashboard',
    labelTl: 'Dashboard',
  },
  // CASES
  {
    id: 'log-new-case',
    pageNumber: 2,
    stageNumber: 3,
    group: 'CASES',
    icon: 'plusCircle',
    color: 'indigo',
    labelEn: 'Log New Case',
    labelTl: 'Mag-log ng Kaso',
  },
  {
    id: 'active-case-board',
    pageNumber: 3,
    stageNumber: 3,
    group: 'CASES',
    icon: 'folderOpen',
    color: 'azure',
    labelEn: 'Active Case Board',
    labelTl: 'Active Case Board',
    badgeCount: 24,
    badgeVariant: 'cobalt',
  },
  {
    id: 'case-detail',
    pageNumber: 4,
    stageNumber: 4,
    group: 'CASES',
    icon: 'clipboardText',
    color: 'indigo',
    labelEn: 'Case Detail & Timeline',
    labelTl: 'Detalye at Timeline',
  },
  {
    id: 'student-profile',
    pageNumber: 5,
    stageNumber: 4,
    group: 'CASES',
    icon: 'identificationCard',
    color: 'teal',
    labelEn: 'Student Case History',
    labelTl: 'Rekord ng Estudyante',
  },
  // PARENTS
  {
    id: 'appointments',
    pageNumber: 6,
    stageNumber: 5,
    group: 'PARENTS',
    icon: 'calendarCheck',
    color: 'teal',
    labelEn: 'Parent Appointments',
    labelTl: 'Iskedyul ng Magulang',
    badgeCount: 4,
    badgeVariant: 'emerald',
  },
  {
    id: 'sms-followup',
    pageNumber: 7,
    stageNumber: 5,
    group: 'PARENTS',
    icon: 'paperPlaneTilt',
    color: 'azure',
    labelEn: 'SMS & Gmail Follow-Up',
    labelTl: 'SMS at Gmail Follow-Up',
  },
  {
    id: 'missed-conferences',
    pageNumber: 8,
    stageNumber: 5,
    group: 'PARENTS',
    icon: 'phoneCall',
    color: 'amber',
    labelEn: 'Missed Conferences',
    labelTl: 'Hindi Nakadalo',
    badgeCount: 5,
    badgeVariant: 'amber',
  },
  // STUDENT SUPPORT
  {
    id: 'student-concerns',
    pageNumber: 9,
    stageNumber: 6,
    group: 'STUDENT SUPPORT',
    icon: 'warningCircle',
    color: 'rose',
    labelEn: 'Student Concerns',
    labelTl: 'Student Concerns',
    badgeCount: 3,
    badgeVariant: 'rose',
  },
  {
    id: 'counseling-notes',
    pageNumber: 10,
    stageNumber: 6,
    group: 'STUDENT SUPPORT',
    icon: 'notebook',
    color: 'indigo',
    labelEn: 'Counseling Sessions',
    labelTl: 'Counseling Notes',
  },
  {
    id: 'id-tracker',
    pageNumber: 11,
    stageNumber: 7,
    group: 'STUDENT SUPPORT',
    icon: 'clockCountdown',
    color: 'amber',
    labelEn: 'Confiscated ID Tracker',
    labelTl: 'Nakumpiskang ID',
    badgeCount: 2,
    badgeVariant: 'amber',
  },
  // RECORDS
  {
    id: 'student-directory',
    pageNumber: 14,
    stageNumber: 8,
    group: 'RECORDS',
    icon: 'usersThree',
    color: 'cobalt',
    labelEn: 'Student Directory',
    labelTl: 'Listahan ng Estudyante',
  },
  {
    id: 'reports-exports',
    pageNumber: 15,
    stageNumber: 8,
    group: 'RECORDS',
    icon: 'chartBar',
    color: 'indigo',
    labelEn: 'Reports & Exports',
    labelTl: 'Reports at Exports',
  },
  {
    id: 'policy-book',
    pageNumber: 16,
    stageNumber: 9,
    group: 'RECORDS',
    icon: 'bookOpenText',
    color: 'teal',
    labelEn: 'Offense Policy Book',
    labelTl: 'Policy Handbook',
  },
  {
    id: 'settings-audit',
    pageNumber: 17,
    stageNumber: 9,
    group: 'RECORDS',
    icon: 'gearSix',
    color: 'slate',
    labelEn: 'Settings & Audit Log',
    labelTl: 'Settings at Audit Log',
  },
];

export type AppointmentStatus = 'Scheduled' | 'Attended' | 'Did Not Attend' | 'Rescheduled';

/** Local date as YYYY-MM-DD (not UTC — the office is in Manila) */
export const localISODate = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface ParentAppointmentItem {
  id: string;
  caseId: string;
  studentName: string;
  studentNumber: string;
  initials: string;
  gradeSection: string;
  offenseTypeEn: string;
  offenseTypeTl: string;
  severityTagEn: string;
  severityTagTl: string;
  severityTone: 'amber' | 'rose' | 'cobalt';
  parentName: string;
  relationship: string;
  parentPhone: string;
  parentEmail: string;
  timeSlot: string;
  /** Conference day, YYYY-MM-DD */
  date: string;
  status: AppointmentStatus;
  noShowReason?: string;
  /** Staff confirmed the parent got the notice (call, or SMS delivered) */
  noticeReceived?: boolean;
  /** When the one-day-before reminder went out (ISO time) */
  reminderSentAt?: string | null;
  /** The appointment this one replaced */
  rescheduledFrom?: string;
}

export const INITIAL_TODAY_APPOINTMENTS: ParentAppointmentItem[] = [
  {
    id: 'APT-2026-101',
    caseId: 'CASE-2026-084',
    studentName: 'Mateo R. Villanueva',
    studentNumber: '2025-11042',
    initials: 'MV',
    gradeSection: 'Grade 12 · ICT-1',
    offenseTypeEn: 'Habitual Tardiness & Dress Code',
    offenseTypeTl: 'Madalas na Late at Dress Code',
    severityTagEn: '2nd Minor · Next is Major',
    severityTagTl: '2nd Minor · Susunod ay Major',
    severityTone: 'amber',
    parentName: 'Mrs. Marites Villanueva',
    relationship: 'Mother',
    parentPhone: '0917-842-3319',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    timeSlot: '09:00 AM – 09:45 AM',
    date: localISODate(),
    status: 'Attended',
  },
  {
    id: 'APT-2026-102',
    caseId: 'CASE-2026-089',
    studentName: 'Jansen K. Dela Cruz',
    studentNumber: '2025-11098',
    initials: 'JD',
    gradeSection: 'Grade 11 · STEM-1',
    offenseTypeEn: 'Cutting Classes (2 Subjects)',
    offenseTypeTl: 'Nag-cutting Classes (2 Subject)',
    severityTagEn: '2nd Minor · Next is Major',
    severityTagTl: '2nd Minor · Susunod ay Major',
    severityTone: 'amber',
    parentName: 'Mr. Roberto Dela Cruz',
    relationship: 'Father',
    parentPhone: '0918-553-9104',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    timeSlot: '10:30 AM – 11:15 AM',
    date: localISODate(),
    status: 'Scheduled',
  },
  {
    id: 'APT-2026-103',
    caseId: 'CASE-2026-091',
    studentName: 'Althea M. Soriano',
    studentNumber: '2025-12015',
    initials: 'AS',
    gradeSection: 'Grade 12 · ABM-1',
    offenseTypeEn: 'Improper Use of School ID',
    offenseTypeTl: 'Maling Paggamit ng School ID',
    severityTagEn: '1st Minor Offense',
    severityTagTl: '1st Minor Offense',
    severityTone: 'cobalt',
    parentName: 'Mrs. Rowena Soriano',
    relationship: 'Mother',
    parentPhone: '0998-214-7760',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    timeSlot: '01:30 PM – 02:15 PM',
    date: localISODate(),
    status: 'Scheduled',
  },
  {
    id: 'APT-2026-104',
    caseId: 'CASE-2026-094',
    studentName: 'Kurt Justine P. Mendoza',
    studentNumber: '2025-11204',
    initials: 'KM',
    gradeSection: 'Grade 11 · ICT-2',
    offenseTypeEn: 'Classroom Disruption & Disrespect',
    offenseTypeTl: 'Kaguluhan sa Klase',
    severityTagEn: 'Major Offense · Conference Required',
    severityTagTl: 'Major Offense · Kailangan ang Magulang',
    severityTone: 'rose',
    parentName: 'Mrs. Lorna Mendoza',
    relationship: 'Guardian',
    parentPhone: '0927-609-4412',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    timeSlot: '03:00 PM – 03:45 PM',
    date: localISODate(),
    status: 'Scheduled',
  },
];

export type FollowUpCategory = 'Missed Conferences' | 'Failed SMS' | 'Priority Calls';

export interface FollowUpTaskItem {
  id: string;
  caseId: string;
  studentName: string;
  initials: string;
  gradeSection: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  category: FollowUpCategory;
  reasonEn: string;
  reasonTl: string;
  diagnosticNoteEn: string;
  diagnosticNoteTl: string;
  attemptsCount: number;
  lastContactSummaryEn: string;
  lastContactSummaryTl: string;
  resolved: boolean;
  /** when the task was added (ISO) */
  createdAt?: string;
}

export const INITIAL_FOLLOW_UP_TASKS: FollowUpTaskItem[] = [
  {
    id: 'FUP-301',
    caseId: 'CASE-2026-079',
    studentName: 'Christian Jay B. Ramos',
    initials: 'CR',
    gradeSection: 'Grade 12 · ICT-2',
    parentName: 'Mrs. Evelyn Ramos',
    parentPhone: '0917-339-8210',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    category: 'Missed Conferences',
    reasonEn: 'Missed scheduled conference yesterday (2:00 PM)',
    reasonTl: 'Hindi nakadalo sa conference kahapon (2:00 PM)',
    diagnosticNoteEn: 'Parent work shift conflict — requested afternoon reschedule',
    diagnosticNoteTl: 'May pasok sa trabaho ang magulang — humiling ng bagong araw',
    attemptsCount: 2,
    lastContactSummaryEn: 'SMS Delivered · Needs phone confirmation for Friday 2:00 PM',
    lastContactSummaryTl: 'Naipadala ang SMS · Kailangan ng tawag para sa Biyernes 2:00 PM',
    resolved: false,
  },
  {
    id: 'FUP-302',
    caseId: 'CASE-2026-082',
    studentName: 'Renz Paolo D. Bautista',
    initials: 'RB',
    gradeSection: 'Grade 11 · GAS-1',
    parentName: 'Mr. Noel Bautista',
    parentPhone: '0908-112-904',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    category: 'Failed SMS',
    reasonEn: 'Failed SMS Delivery — Incomplete mobile number (10 digits)',
    reasonTl: 'Hindi Naipadala ang SMS — Kulang ng isang digit ang numero',
    diagnosticNoteEn: 'Mobile number is missing 1 digit · Send via Email or call guardian',
    diagnosticNoteTl: 'Kulang ng 1 digit ang numero · Mag-Email o tawagan ang magulang',
    attemptsCount: 1,
    lastContactSummaryEn: 'Failed SMS at 8:15 AM · Gmail backup notice ready to send',
    lastContactSummaryTl: 'Bigo ang SMS 8:15 AM · Handa na ang Gmail backup notice',
    resolved: false,
  },
  {
    id: 'FUP-303',
    caseId: 'CASE-2026-086',
    studentName: 'Princess Mae L. Aguilar',
    initials: 'PA',
    gradeSection: 'Grade 11 · HUMSS-1',
    parentName: 'Mrs. Glenda Aguilar',
    parentPhone: '0919-740-5581',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    category: 'Priority Calls',
    reasonEn: '2nd Unanswered Notice — Confiscated ID Hold Overdue (4 Days)',
    reasonTl: '2 Beses Hindi Nasagot — 4 Araw nang Nakabinbin ang ID',
    diagnosticNoteEn: 'Student ID #2025-11408 held at Guidance since last Thursday',
    diagnosticNoteTl: 'Nasa Guidance pa ang School ID #2025-11408 mula pa noong Huwebes',
    attemptsCount: 2,
    lastContactSummaryEn: 'No answer on 1st call · Priority follow-up call due today',
    lastContactSummaryTl: 'Walang sumagot sa unang tawag · Kailangan tawagan ngayong araw',
    resolved: false,
  },
];

export type TimeframeKey = 'week' | 'month' | 'semester' | 'year';

export interface TrendBarPoint {
  labelEn: string;
  labelTl: string;
  logged: number;
  resolved: number;
}

export interface AnalyticsPeriodDataset {
  key: TimeframeKey;
  labelEn: string;
  labelTl: string;
  takeawayEn: string;
  takeawayTl: string;
  totalLogged: number;
  totalResolved: number;
  points: TrendBarPoint[];
}

export const ANALYTICS_DATASETS: Record<TimeframeKey, AnalyticsPeriodDataset> = {
  week: {
    key: 'week',
    labelEn: 'This Week',
    labelTl: 'Ngayong Linggo',
    takeawayEn: '💡 Tardiness & ID violations dropped 18% since Monday after morning gate reminders.',
    takeawayTl: '💡 Bumaba nang 18% ang late at ID violations mula Lunes dahil sa gate reminders.',
    totalLogged: 14,
    totalResolved: 11,
    points: [
      { labelEn: 'Mon', labelTl: 'Lun', logged: 4, resolved: 3 },
      { labelEn: 'Tue', labelTl: 'Mar', logged: 3, resolved: 3 },
      { labelEn: 'Wed', labelTl: 'Miy', logged: 3, resolved: 2 },
      { labelEn: 'Thu', labelTl: 'Huw', logged: 2, resolved: 2 },
      { labelEn: 'Fri', labelTl: 'Biy', logged: 2, resolved: 1 },
    ],
  },
  month: {
    key: 'month',
    labelEn: 'This Month',
    labelTl: 'Ngayong Buwan',
    takeawayEn: '💡 76% of cases this month were resolved within 48 hours via SMS + Gmail parent notice.',
    takeawayTl: '💡 76% ng mga kaso ngayong buwan ay naayos sa loob ng 48 oras gamit ang SMS + Gmail.',
    totalLogged: 17,
    totalResolved: 13,
    points: [
      { labelEn: 'Wk 1', labelTl: 'Linggo 1', logged: 6, resolved: 5 },
      { labelEn: 'Wk 2', labelTl: 'Linggo 2', logged: 5, resolved: 4 },
      { labelEn: 'Wk 3', labelTl: 'Linggo 3', logged: 4, resolved: 3 },
      { labelEn: 'Wk 4', labelTl: 'Linggo 4', logged: 2, resolved: 1 },
    ],
  },
  semester: {
    key: 'semester',
    labelEn: 'This Semester',
    labelTl: 'Ngayong Semestre',
    takeawayEn: '💡 Most cases this semester were closed within two weeks.',
    takeawayTl: '💡 Karamihan sa mga kaso ngayong semestre ay naisara sa loob ng dalawang linggo.',
    totalLogged: 68,
    totalResolved: 59,
    points: [
      { labelEn: 'Aug', labelTl: 'Ago', logged: 18, resolved: 16 },
      { labelEn: 'Sep', labelTl: 'Set', logged: 21, resolved: 19 },
      { labelEn: 'Oct', labelTl: 'Okt', logged: 17, resolved: 15 },
      { labelEn: 'Nov', labelTl: 'Nob', logged: 12, resolved: 9 },
    ],
  },
  year: {
    key: 'year',
    labelEn: 'School Year',
    labelTl: 'Buong Taon',
    takeawayEn: '💡 Repeat minor offenses decreased by 31% year-over-year thanks to 2nd-offense parent alerts.',
    takeawayTl: '💡 Bumaba nang 31% ang umuulit na minor offense dahil sa maagang abiso sa magulang.',
    totalLogged: 142,
    totalResolved: 128,
    points: [
      { labelEn: 'Q1', labelTl: 'Q1', logged: 42, resolved: 39 },
      { labelEn: 'Q2', labelTl: 'Q2', logged: 38, resolved: 35 },
      { labelEn: 'Q3', labelTl: 'Q3', logged: 34, resolved: 31 },
      { labelEn: 'Q4', labelTl: 'Q4', logged: 28, resolved: 23 },
    ],
  },
};

export interface StrandSectionStatus {
  sectionCode: string;
  strandName: string;
  openCases: number;
  clearancePercent: number;
  watchCount: number;
  tone: 'emerald' | 'cobalt' | 'amber';
}

export const STRAND_SECTION_STATUSES: StrandSectionStatus[] = [
  {
    sectionCode: 'ICT-1',
    strandName: 'TVL · Information & Communications Tech',
    openCases: 6,
    clearancePercent: 91,
    watchCount: 2,
    tone: 'cobalt',
  },
  {
    sectionCode: 'ICT-2',
    strandName: 'TVL · Computer Programming & Servicing',
    openCases: 5,
    clearancePercent: 86,
    watchCount: 2,
    tone: 'amber',
  },
  {
    sectionCode: 'STEM-1',
    strandName: 'Academic · Science, Tech, Eng & Math',
    openCases: 3,
    clearancePercent: 95,
    watchCount: 1,
    tone: 'emerald',
  },
  {
    sectionCode: 'ABM-1',
    strandName: 'Academic · Accountancy & Business Mgmt',
    openCases: 4,
    clearancePercent: 93,
    watchCount: 1,
    tone: 'emerald',
  },
  {
    sectionCode: 'HUMSS-1',
    strandName: 'Academic · Humanities & Social Sciences',
    openCases: 3,
    clearancePercent: 89,
    watchCount: 1,
    tone: 'cobalt',
  },
  {
    sectionCode: 'GAS-1',
    strandName: 'Academic · General Academic Strand',
    openCases: 3,
    clearancePercent: 88,
    watchCount: 1,
    tone: 'cobalt',
  },
];

export interface EarlyInterventionItem {
  id: string;
  studentName: string;
  studentNumber: string;
  gradeSection: string;
  priorOffensesEn: string;
  priorOffensesTl: string;
  parentPhone: string;
  parentEmail: string;
  parentName: string;
}

export const EARLY_INTERVENTION_WATCHLIST: EarlyInterventionItem[] = [
  {
    id: 'EI-01',
    studentName: 'Mateo R. Villanueva',
    studentNumber: '2025-11042',
    gradeSection: 'Grade 12 · ICT-1',
    priorOffensesEn: '2 Minor Offenses (Tardiness, No ID) — 1 more triggers Major Case',
    priorOffensesTl: '2 Minor Offense (Late, Walang ID) — 1 pa ay Major Offense na',
    parentName: 'Mrs. Marites Villanueva',
    parentPhone: '0917-842-3319',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
  },
  {
    id: 'EI-02',
    studentName: 'Jansen K. Dela Cruz',
    studentNumber: '2025-11098',
    gradeSection: 'Grade 11 · STEM-1',
    priorOffensesEn: '2 Minor Offenses (Cutting Class, Uniform) — Early counseling advised',
    priorOffensesTl: '2 Minor Offense (Cutting, Uniform) — Kailangan ng counseling',
    parentName: 'Mr. Roberto Dela Cruz',
    parentPhone: '0918-553-9104',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
  },
  {
    id: 'EI-03',
    studentName: 'Trisha Mae C. Pascual',
    studentNumber: '2025-12088',
    gradeSection: 'Grade 12 · HUMSS-1',
    priorOffensesEn: '2 Minor Offenses (Late Submission, Dress Code) — Parent notified',
    priorOffensesTl: '2 Minor Offense (Late Submission, Dress Code) — Naabisuhan na',
    parentName: 'Mrs. Clarissa Pascual',
    parentPhone: '0922-419-6032',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
  },
];

export interface OfficeActivityLog {
  id: string;
  timeAgoEn: string;
  timeAgoTl: string;
  actor: string;
  actionEn: string;
  actionTl: string;
  tag: string;
  tone: 'emerald' | 'cobalt' | 'amber' | 'rose';
}

export const INITIAL_ACTIVITY_LOGS: OfficeActivityLog[] = [
  {
    id: 'ACT-1',
    timeAgoEn: '12 mins ago',
    timeAgoTl: '12 minuto nakalipas',
    actor: 'Guidance Associate',
    actionEn: 'Marked Mrs. Marites Villanueva (ICT-1) conference as Attended',
    actionTl: 'Minarkahang Dumalo si Mrs. Marites Villanueva (ICT-1)',
    tag: 'APT-2026-101',
    tone: 'emerald',
  },
  {
    id: 'ACT-2',
    timeAgoEn: '38 mins ago',
    timeAgoTl: '38 minuto nakalipas',
    actor: 'System Gateway',
    actionEn: 'Sent RA 10173 compliant Gmail + SMS reminder to Mr. Roberto Dela Cruz',
    actionTl: 'Nagpadala ng RA 10173 Gmail + SMS reminder kay Mr. Roberto Dela Cruz',
    tag: 'CASE-2026-089',
    tone: 'cobalt',
  },
  {
    id: 'ACT-3',
    timeAgoEn: '1 hr ago',
    timeAgoTl: '1 oras nakalipas',
    actor: 'Student Concern Box',
    actionEn: 'New Priority Welfare Referral received for Grade 11 · ICT-1 student',
    actionTl: 'Bagong Priority Welfare Referral para sa estudyante ng Grade 11 · ICT-1',
    tag: 'REF-2026-019',
    tone: 'rose',
  },
];

/**
 * RA 10173 Data Privacy Guard: Checks if a message contains sensitive offense details
 * that should NOT be exposed in plain SMS or insecure channels.
 */
export const PRIVACY_SENSITIVE_TERMS = [
  'bullying',
  'vape',
  'vaping',
  'fighting',
  'cheating',
  'stealing',
  'theft',
  'suspension',
  'expulsion',
  'cutting classes',
  'mental',
  'depression',
  'harassment',
  'weapon',
  'alcohol',
  'drugs',
];

export function detectPrivacySensitiveTerms(text: string): string[] {
  const lower = text.toLowerCase();
  return PRIVACY_SENSITIVE_TERMS.filter((term) => lower.includes(term));
}

export function buildDefaultParentMessage({
  parentName,
  studentName,
  gradeSection,
  scheduleText,
  locale,
}: {
  parentName: string;
  studentName: string;
  gradeSection: string;
  scheduleText: string;
  locale: 'en' | 'tl';
}): string {
  // Short on purpose: <= 160 plain letters = 1 SMS. No grade/section (longer + special symbols) and no offense.
  void parentName;
  void gradeSection;
  // no date yet → say so in a short sentence (keeps the SMS within 160 letters)
  const when = scheduleText ? ` sa ${scheduleText}.` : '. Ipapaalam po namin ang petsa.';
  if (locale === 'tl') {
    return `AICS Guidance Office: Magandang araw po. Inaanyayahan po kayo sa pag-uusap tungkol kay ${studentName}${when} Salamat po.`;
  }
  return `AICS Guidance Office: Good day. You are invited to a meeting about ${studentName}${scheduleText ? ` on ${scheduleText}` : ''}. Thank you.`;
}
