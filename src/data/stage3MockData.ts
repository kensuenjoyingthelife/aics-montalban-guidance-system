import { IconName } from '../components/ui/iconPaths';

export type MainCategoryId =
  | 'dashboard'
  | 'cases-hub'
  | 'parents-hub'
  | 'referrals-hub'
  | 'audit-hub'
  | 'support-hub'
  | 'clearance-hub'
  | 'records-hub'
  | 'settings-hub';

export interface MainCategoryNavItem {
  id: MainCategoryId;
  stageNumber: number;
  icon: IconName;
  labelEn: string;
  labelTl: string;
  subLabelEn: string;
  subLabelTl: string;
  badgeKey?: 'cases' | 'parents' | 'concerns' | 'referrals' | 'ids';
}

/**
 * OPTION 1 NAVIGATION: 6 Clean, Spacious Main Categories in the Left Sidebar
 * Sub-pages appear as a locked-height horizontal sub-tab bar at the top of the workspace!
 */
export const MAIN_SIDEBAR_CATEGORIES: MainCategoryNavItem[] = [
  {
    id: 'dashboard',
    stageNumber: 2,
    icon: 'squaresFour',
    labelEn: 'Dashboard',
    labelTl: 'Dashboard',
    subLabelEn: 'Today’s work',
    subLabelTl: 'Gawain ngayong araw',
  },
  {
    id: 'cases-hub',
    stageNumber: 3,
    icon: 'folderOpen',
    labelEn: 'Cases',
    labelTl: 'Mga Kaso',
    subLabelEn: 'Cases & students',
    subLabelTl: 'Kaso at estudyante',
    badgeKey: 'cases',
  },
  {
    id: 'parents-hub',
    stageNumber: 3,
    icon: 'calendarCheck',
    labelEn: 'Parents',
    labelTl: 'Magulang',
    subLabelEn: 'Conferences',
    subLabelTl: 'Mga conference',
    badgeKey: 'parents',
  },
  {
    id: 'support-hub',
    stageNumber: 3,
    icon: 'warningCircle',
    labelEn: 'Concerns',
    labelTl: 'Mga Concern',
    subLabelEn: 'Reports & chats',
    subLabelTl: 'Report at chat',
    badgeKey: 'concerns',
  },
  {
    id: 'referrals-hub',
    stageNumber: 3,
    icon: 'usersThree',
    labelEn: 'Counselor',
    labelTl: 'Counselor',
    subLabelEn: 'Referral queue',
    subLabelTl: 'Para sa counselor',
    badgeKey: 'referrals',
  },
  {
    id: 'audit-hub',
    stageNumber: 3,
    icon: 'clipboardText',
    labelEn: 'Audit Trail',
    labelTl: 'Audit Trail',
    subLabelEn: 'Every change',
    subLabelTl: 'Bawat pagbabago',
  },
  {
    id: 'clearance-hub',
    stageNumber: 7,
    icon: 'checkSquareOffset',
    labelEn: 'ID Holds',
    labelTl: 'Naka-hold na ID',
    subLabelEn: 'Kept IDs',
    subLabelTl: 'ID na itinago',
    badgeKey: 'ids',
  },
  {
    id: 'records-hub',
    stageNumber: 3,
    icon: 'chartBar',
    labelEn: 'Reports',
    labelTl: 'Reports',
    subLabelEn: 'Stats & monthly',
    subLabelTl: 'Stats at buwanan',
  },
  {
    id: 'settings-hub',
    stageNumber: 3,
    icon: 'gearSix',
    labelEn: 'Settings',
    labelTl: 'Settings',
    subLabelEn: 'PIN-protected',
    subLabelTl: 'May PIN',
  },
];

export interface StudentRecord {
  studentNumber: string;
  fullName: string;
  initials: string;
  gradeSection: string;
  sectionCode: string;
  parentName: string;
  parentRelationship: string;
  parentPhone: string;
  parentEmail: string;
  minorOffenseCount: number;
  majorOffenseCount: number;
  clearanceStatus:
    | 'Cleared'
    | 'Pending Conference'
    | 'Hold - Major Case'
    | 'Pending Reschedule'
    | 'Pending Follow-Up'
    | 'ID Confiscated'
    | 'Cleared with Warning'
    | 'Not set';
  priorOffensesEn: string;
  priorOffensesTl: string;
  /** when the student was added to the masterlist (ISO) */
  createdAt?: string;
  /** false = graduated / transferred / stopped (kept for history, hidden from new cases) */
  enrolled?: boolean;
  leftReason?: string;
  /** extra information from Settings › Student fields (e.g. Adviser) */
  extra?: Record<string, string>;
  /** Days the parent can come, e.g. 'Mon,Wed,Fri' (used by Smart Scheduling) */
  parentPrefDays?: string;
  /** 'AM' | 'PM' | '' */
  parentPrefTime?: string;
}

export const INITIAL_STUDENTS: StudentRecord[] = [
  {
    studentNumber: '2025-11042',
    fullName: 'Mateo R. Villanueva',
    initials: 'MV',
    gradeSection: 'Grade 12 · ICT-1',
    sectionCode: 'ICT-1',
    parentName: 'Mrs. Marites Villanueva',
    parentRelationship: 'Mother',
    parentPhone: '0917-842-3319',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    minorOffenseCount: 2,
    majorOffenseCount: 0,
    clearanceStatus: 'Pending Conference',
    priorOffensesEn: '2 Minor Offenses (Tardiness, No ID) — 1 more triggers Major Case',
    priorOffensesTl: '2 Minor Offense (Late, Walang ID) — 1 pa ay Major Offense na',
  },
  {
    studentNumber: '2025-11098',
    fullName: 'Jansen K. Dela Cruz',
    initials: 'JD',
    gradeSection: 'Grade 11 · STEM-1',
    sectionCode: 'STEM-1',
    parentName: 'Mr. Roberto Dela Cruz',
    parentRelationship: 'Father',
    parentPhone: '0918-553-9104',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    minorOffenseCount: 2,
    majorOffenseCount: 0,
    clearanceStatus: 'Pending Conference',
    priorOffensesEn: '2 Minor Offenses (Cutting Class, Uniform) — Early counseling advised',
    priorOffensesTl: '2 Minor Offense (Cutting, Uniform) — Kailangan ng counseling',
  },
  {
    studentNumber: '2025-12015',
    fullName: 'Althea M. Soriano',
    initials: 'AS',
    gradeSection: 'Grade 12 · ABM-1',
    sectionCode: 'ABM-1',
    parentName: 'Mrs. Rowena Soriano',
    parentRelationship: 'Mother',
    parentPhone: '0998-214-7760',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    minorOffenseCount: 1,
    majorOffenseCount: 0,
    clearanceStatus: 'Pending Conference',
    priorOffensesEn: '1st Minor Offense (Improper Use of School ID)',
    priorOffensesTl: '1st Minor Offense (Maling Paggamit ng School ID)',
  },
  {
    studentNumber: '2025-11204',
    fullName: 'Kurt Justine P. Mendoza',
    initials: 'KM',
    gradeSection: 'Grade 11 · ICT-2',
    sectionCode: 'ICT-2',
    parentName: 'Mrs. Lorna Mendoza',
    parentRelationship: 'Guardian',
    parentPhone: '0927-609-4412',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    minorOffenseCount: 0,
    majorOffenseCount: 1,
    clearanceStatus: 'Hold - Major Case',
    priorOffensesEn: 'Major Offense (Classroom Disruption & Disrespect)',
    priorOffensesTl: 'Major Offense (Kaguluhan sa Klase)',
  },
  {
    studentNumber: '2025-11310',
    fullName: 'Christian Jay B. Ramos',
    initials: 'CR',
    gradeSection: 'Grade 12 · ICT-2',
    sectionCode: 'ICT-2',
    parentName: 'Mrs. Evelyn Ramos',
    parentRelationship: 'Mother',
    parentPhone: '0917-339-8210',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    minorOffenseCount: 2,
    majorOffenseCount: 0,
    clearanceStatus: 'Pending Reschedule',
    priorOffensesEn: '2 Minor Offenses — Missed parent conference yesterday',
    priorOffensesTl: '2 Minor Offense — Hindi nakadalo sa conference kahapon',
  },
  {
    studentNumber: '2025-11355',
    fullName: 'Renz Paolo D. Bautista',
    initials: 'RB',
    gradeSection: 'Grade 11 · GAS-1',
    sectionCode: 'GAS-1',
    parentName: 'Mr. Noel Bautista',
    parentRelationship: 'Father',
    parentPhone: '0908-112-904',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    minorOffenseCount: 1,
    majorOffenseCount: 0,
    clearanceStatus: 'Pending Follow-Up',
    priorOffensesEn: '1st Minor Offense — Failed SMS delivery on parent number',
    priorOffensesTl: '1st Minor Offense — Bigo ang SMS sa numero ng magulang',
  },
  {
    studentNumber: '2025-11408',
    fullName: 'Princess Mae L. Aguilar',
    initials: 'PA',
    gradeSection: 'Grade 11 · HUMSS-1',
    sectionCode: 'HUMSS-1',
    parentName: 'Mrs. Glenda Aguilar',
    parentRelationship: 'Mother',
    parentPhone: '0919-740-5581',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    minorOffenseCount: 1,
    majorOffenseCount: 0,
    clearanceStatus: 'ID Confiscated',
    priorOffensesEn: 'Confiscated ID Hold Overdue (4 Days at Guidance)',
    priorOffensesTl: '4 Araw nang nasa Guidance ang School ID',
  },
  {
    studentNumber: '2025-12088',
    fullName: 'Trisha Mae C. Pascual',
    initials: 'TP',
    gradeSection: 'Grade 12 · HUMSS-1',
    sectionCode: 'HUMSS-1',
    parentName: 'Mrs. Clarissa Pascual',
    parentRelationship: 'Mother',
    parentPhone: '0922-419-6032',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
    minorOffenseCount: 2,
    majorOffenseCount: 0,
    clearanceStatus: 'Cleared with Warning',
    priorOffensesEn: '2 Minor Offenses (Late Submission, Dress Code) — Parent notified',
    priorOffensesTl: '2 Minor Offense (Late Submission, Dress Code) — Naabisuhan na',
  },
];

export type HandbookClassification = 'Minor' | 'Less Serious' | 'Serious' | 'Grave';

export interface OffenseHandbookRule {
  policyCode: string;
  titleEn: string;
  titleTl: string;
  classification: HandbookClassification;
  dbCategory: 'Minor' | 'Major';
  sanction1stEn: string;
  sanction1stTl: string;
  sanction2ndEn: string;
  sanction2ndTl: string;
  sanction3rdEn: string;
  sanction3rdTl: string;
}

export const OFFENSE_HANDBOOK_RULES: OffenseHandbookRule[] = [
  {
    policyCode: 'MIN-01',
    titleEn: 'Habitual Tardiness & Late Gate Arrival',
    titleTl: 'Madalas na Pagkahuli sa Klase at Gate',
    classification: 'Minor',
    dbCategory: 'Minor',
    sanction1stEn: 'Verbal Reminder & Case Log Entry',
    sanction1stTl: 'Verbal Reminder at Tala sa Rekord',
    sanction2ndEn: 'If the last offense was also minor: Serious offense + Parent Conference & Counseling',
    sanction2ndTl: 'Kung minor din ang huli: Serious offense + Conference sa Magulang at Counseling',
    sanction3rdEn: 'Serious offense + Mandatory Parent Conference',
    sanction3rdTl: 'Serious offense + Mandatory Parent Conference',
  },
  {
    policyCode: 'MIN-02',
    titleEn: 'Improper Uniform / Dress Code & Haircut Violation',
    titleTl: 'Paglabag sa Tamang Uniporme at Gupit',
    classification: 'Minor',
    dbCategory: 'Minor',
    sanction1stEn: 'Temporary Gate Pass & Written Warning',
    sanction1stTl: 'Temporary Gate Pass at Written Warning',
    sanction2ndEn: 'If the last offense was also minor: Serious offense + ID Hold + Parent Conference',
    sanction2ndTl: 'Kung minor din ang huli: Serious offense + ID Hold + Conference sa Magulang',
    sanction3rdEn: 'Serious offense + Parent Conference',
    sanction3rdTl: 'Serious offense + Conference sa Magulang',
  },
  {
    policyCode: 'MIN-03',
    titleEn: 'Non-Wearing or Improper Use of School ID',
    titleTl: 'Hindi Pagsusuot o Maling Paggamit ng School ID',
    classification: 'Minor',
    dbCategory: 'Minor',
    sanction1stEn: '24-Hour ID Hold at Guidance Office',
    sanction1stTl: '24-Oras na ID Hold sa Guidance Office',
    sanction2ndEn: 'If the last offense was also minor: Serious offense + Parent Conference',
    sanction2ndTl: 'Kung minor din ang huli: Serious offense + Conference sa Magulang',
    sanction3rdEn: 'Serious offense + Mandatory Parent Conference',
    sanction3rdTl: 'Serious offense + Mandatory Parent Conference',
  },
  {
    policyCode: 'LSR-01',
    titleEn: 'Cutting Classes & Unauthorized Lab Absence',
    titleTl: 'Pag-cutting Classes at Hindi Pagpasok sa Lab',
    classification: 'Less Serious',
    dbCategory: 'Major',
    sanction1stEn: 'Parent Conference + Written Warning',
    sanction1stTl: 'Conference sa Magulang + Nakasulat na Babala',
    sanction2ndEn: 'Behavioral Contract (Kasunduan) + Parent Conference',
    sanction2ndTl: 'Kasunduan + Conference sa Magulang',
    sanction3rdEn: 'Suspension Warning & Disciplinary Hearing',
    sanction3rdTl: 'Babala sa Suspension at Disciplinary Hearing',
  },
  {
    policyCode: 'SER-01',
    titleEn: 'Classroom Disruption & Disrespect to Faculty',
    titleTl: 'Kaguluhan sa Klase at Kawalan ng Galang sa Guro',
    classification: 'Serious',
    dbCategory: 'Major',
    sanction1stEn: 'Mandatory Parent Conference + Written Apology & Kasunduan',
    sanction1stTl: 'Mandatory Parent Conference + Written Apology at Kasunduan',
    sanction2ndEn: '3-Day Preventive Suspension + Counseling Program',
    sanction2ndTl: '3-Araw na Suspension + Counseling Program',
    sanction3rdEn: 'Disciplinary Board Evaluation',
    sanction3rdTl: 'Disciplinary Board Evaluation',
  },
  {
    policyCode: 'GRV-01',
    titleEn: 'Tampering with School Records / Forging Parent Signature',
    titleTl: 'Pamemeke ng Pirman ng Magulang o School Records',
    classification: 'Grave',
    dbCategory: 'Major',
    sanction1stEn: 'Immediate Parent Summons + Behavioral Contract',
    sanction1stTl: 'Agarang Patawag sa Magulang + Kasunduan',
    sanction2ndEn: 'Disciplinary Board Hearing & Suspension',
    sanction2ndTl: 'Disciplinary Board Hearing at Suspension',
    sanction3rdEn: 'Non-Readmission / Transfer Recommendation',
    sanction3rdTl: 'Non-Readmission / Rekomendasyon sa Paglipat',
  },
];

export type CaseStatusType =
  | 'Open'
  | 'Under Review'
  | 'Conference Scheduled'
  | 'Sanction In Progress'
  | 'Resolved';

export interface DisciplineCaseRecord {
  caseCode: string;
  studentNumber: string;
  studentName: string;
  gradeSection: string;
  offenseTitleEn: string;
  offenseTitleTl: string;
  severity: string;
  status: CaseStatusType;
  reportedBy: string;
  incidentDate: string;
  notes: string;
  /** Same code on every case that came from one incident (group incident). */
  incidentCode?: string;
  /** Where the case is in the 7-step flow (features flowchart) */
  step?: CaseStep;
  studentCalledAt?: string | null;
  explanation?: string;
  parentNotifiedAt?: string | null;
  parentNotifiedHow?: string;
  decision?: string;
  sanction?: string;
  /** a sanction stays pending until the parent has been informed */
  sanctionStatus?: 'Pending parent notice' | 'Active' | 'Done' | '';
  decidedAt?: string | null;
  closedAt?: string | null;
  /** when the case was logged (ISO) */
  createdAt?: string;
}

export const CASE_STEPS = ['Reported', 'Student Called', 'Explanation', 'Parent Notified', 'Decision', 'Follow-Up', 'Closed'] as const;
export type CaseStep = (typeof CASE_STEPS)[number];

export const INITIAL_DISCIPLINE_CASES: DisciplineCaseRecord[] = [
  {
    caseCode: 'CASE-2026-084',
    studentNumber: '2025-11042',
    studentName: 'Mateo R. Villanueva',
    gradeSection: 'Grade 12 · ICT-1',
    offenseTitleEn: 'Habitual Tardiness & Dress Code',
    offenseTitleTl: 'Madalas na Late at Dress Code',
    severity: '2nd Minor · Next is Major',
    status: 'Conference Scheduled',
    reportedBy: 'Prof. R. Macapagal',
    incidentDate: '2026-11-10',
    notes: '2nd minor violation this semester; parent conference scheduled today.',
  },
  {
    caseCode: 'CASE-2026-089',
    studentNumber: '2025-11098',
    studentName: 'Jansen K. Dela Cruz',
    gradeSection: 'Grade 11 · STEM-1',
    offenseTitleEn: 'Cutting Classes (2 Subjects)',
    offenseTitleTl: 'Nag-cutting Classes (2 Subject)',
    severity: '2nd Minor · Next is Major',
    status: 'Conference Scheduled',
    reportedBy: 'Prof. L. Salonga',
    incidentDate: '2026-11-10',
    notes: 'Skipped afternoon lab class; SMS & Gmail sent to father.',
  },
  {
    caseCode: 'CASE-2026-091',
    studentNumber: '2025-12015',
    studentName: 'Althea M. Soriano',
    gradeSection: 'Grade 12 · ABM-1',
    offenseTitleEn: 'Improper Use of School ID',
    offenseTitleTl: 'Maling Paggamit ng School ID',
    severity: '1st Minor Offense',
    status: 'Conference Scheduled',
    reportedBy: 'Campus Security Gate',
    incidentDate: '2026-11-09',
    notes: 'Lent school ID to classmate at main gate.',
  },
  {
    caseCode: 'CASE-2026-094',
    studentNumber: '2025-11204',
    studentName: 'Kurt Justine P. Mendoza',
    gradeSection: 'Grade 11 · ICT-2',
    offenseTitleEn: 'Classroom Disruption & Disrespect',
    offenseTitleTl: 'Kaguluhan sa Klase',
    severity: 'Major Offense · Conference Required',
    status: 'Conference Scheduled',
    reportedBy: 'Prof. D. Evangelista',
    incidentDate: '2026-11-09',
    notes: 'Mandatory parent conference required before returning to lab.',
  },
];

export interface MasterlistPreviewRow {
  rowId: string;
  studentNumber: string;
  fullName: string;
  sectionCode: string;
  gradeSection: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}

export const SAMPLE_MASTERLIST_IMPORT_BATCH: MasterlistPreviewRow[] = [
  {
    rowId: 'ROW-1',
    studentNumber: '2025-12104',
    fullName: 'Gabriel Angelo S. Mercado',
    sectionCode: 'ICT-1',
    gradeSection: 'Grade 12 · ICT-1',
    parentName: 'Mrs. Teresa Mercado',
    parentPhone: '0917-642-8819',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
  },
  {
    rowId: 'ROW-2',
    // Intentional duplicate student number to demonstrate Preview & Fix!
    studentNumber: '2025-11042',
    fullName: 'Bea Katrina L. Dizon',
    sectionCode: 'STEM-1',
    gradeSection: 'Grade 11 · STEM-1',
    parentName: 'Mr. Ferdinand Dizon',
    parentPhone: '0918-402-7193',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
  },
  {
    rowId: 'ROW-3',
    studentNumber: '2025-12119',
    fullName: 'Mark Joshua T. Enriquez',
    sectionCode: 'ABM-1',
    gradeSection: 'Grade 12 · ABM-1',
    parentName: 'Mrs. Celia Enriquez',
    // Intentional 10-digit incomplete phone number to demonstrate Preview & Fix!
    parentPhone: '0927-881-402',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
  },
  {
    rowId: 'ROW-4',
    studentNumber: '2025-12135',
    fullName: 'Hannah Nicole P. Salazar',
    sectionCode: 'HUMSS-1',
    gradeSection: 'Grade 11 · HUMSS-1',
    // Intentional missing parent name to demonstrate Preview & Fix!
    parentName: '',
    parentPhone: '0998-512-6604',
    parentEmail: 'aicsmontalbansafeguard@gmail.com',
  },
];
