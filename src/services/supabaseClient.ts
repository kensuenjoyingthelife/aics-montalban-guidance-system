/// <reference types="vite/client" />
import {
  ParentAppointmentItem,
  AppointmentStatus,
  FollowUpTaskItem,
  FollowUpCategory,
  StrandSectionStatus,
  OfficeActivityLog,
} from '../data/dashboardMockData';
import {
  StudentRecord,
  DisciplineCaseRecord,
  CaseStatusType,
} from '../data/stage3MockData';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://mfkudukapnvbmwcfhhzn.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ma3VkdWthcG52Ym13Y2ZoaHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMzcwNjksImV4cCI6MjEwOTgxMzA2OX0.-jNrpsQ8Mg7ufJmmkmTSJMS5-z3vsu22zKmkfXztgu4';
export const SUPABASE_PROJECT_NAME =
  import.meta.env.VITE_SUPABASE_PROJECT_NAME || 'aics-guidance-db';

// Who is signed in: sent with every request so the Audit Trail can say WHO made each change.
let currentActor = '';
export function setAuditActor(email: string) {
  currentActor = String(email || '').trim().slice(0, 120);
}
/** header that the database audit trigger reads (empty when nobody is signed in) */
export const actorHeader = (): Record<string, string> => (currentActor ? { 'x-aics-actor': currentActor } : {});

function getHeaders(preferReturn = false): HeadersInit {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...actorHeader(),
  };
  if (preferReturn) {
    headers['Prefer'] = 'return=representation';
  }
  return headers;
}


// ---------------------------------------------------------------------------
// Every database write reports success or failure, so the screen never says
// "saved" when the database did not get it (Golden Rule 6).
// ---------------------------------------------------------------------------
export const DB_WRITE_FAILED = 'aics:db-write-failed';
export const DB_WRITE_OK = 'aics:db-write-ok';
export const ACTIVITY_ADDED = 'aics:activity-added';
function reportWrite(res: Response | null, what: string): boolean {
  const ok = !!res && res.ok;
  try {
    window.dispatchEvent(
      new CustomEvent(ok ? DB_WRITE_OK : DB_WRITE_FAILED, { detail: { what, status: res?.status ?? 0 } })
    );
  } catch {
    /* no window (tests) */
  }
  return ok;
}

export interface DbDashboardSnapshot {
  connected: boolean;
  appointments: ParentAppointmentItem[];
  followUps: FollowUpTaskItem[];
  sections: StrandSectionStatus[];
  activityLogs: OfficeActivityLog[];
  concernAcknowledged: boolean;
}

/**
 * The server returns at most 1000 rows per request. This reads EVERY row, 1000 at a time,
 * and gives back one normal Response (so a school with 1500+ students still sees all of them).
 */
async function fetchAll(pathWithQuery: string): Promise<Response> {
  const PAGE = 1000;
  const all: unknown[] = [];
  for (let from = 0; from < 500000; from += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
      headers: { ...(getHeaders() as Record<string, string>), 'Range-Unit': 'items', Range: `${from}-${from + PAGE - 1}` },
    });
    if (!res.ok && res.status !== 416) return res;
    if (res.status === 416) break;
    const rows = (await res.json()) as { id?: unknown }[];
    // the server ignored paging and sent the same rows again → we already have everything
    if (from > 0 && rows.length && all.length && JSON.stringify(rows[0]) === JSON.stringify(all[0])) break;
    all.push(...rows);
    // fewer rows = last page; MORE rows than asked = the server sent everything at once
    if (rows.length !== PAGE) break;
  }
  return new Response(JSON.stringify(all), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/**
 * Fetches live PostgreSQL records from Supabase (aics-guidance-db)
 */
export async function fetchLiveDashboardData(): Promise<DbDashboardSnapshot | null> {
  try {
    const [aptRes, fupRes, secRes, actRes, conRes] = await Promise.all([
      fetchAll('parent_appointments?select=*&order=id.asc'),
      fetchAll('follow_up_tasks?select=*&order=id.desc'),
      fetchAll('shs_sections?select=*&order=id.asc'),
      fetch(`${SUPABASE_URL}/rest/v1/office_activity_logs?select=*&order=id.desc&limit=8`, {
        headers: getHeaders(),
      }),
      fetch(
        `${SUPABASE_URL}/rest/v1/student_concerns?referral_code=eq.REF-2026-019&select=status`,
        {
          headers: getHeaders(),
        }
      ),
    ]);

    if (!aptRes.ok || !fupRes.ok || !secRes.ok || !actRes.ok) {
      return null;
    }

    const aptRows = await aptRes.json();
    const fupRows = await fupRes.json();
    const secRows = await secRes.json();
    const actRows = await actRes.json();
    const conRows = conRes.ok ? await conRes.json() : [];

    const appointments: ParentAppointmentItem[] = aptRows.map(
      (r: Record<string, unknown>) => ({
        id: String(r.appointment_code),
        caseId: String(r.case_code),
        studentName: String(r.student_name),
        studentNumber: String(r.student_number),
        initials: String(r.initials ?? ''),
        gradeSection: String(r.grade_section),
        offenseTypeEn: String(r.offense_type_en),
        offenseTypeTl: String(r.offense_type_tl),
        severityTagEn: String(r.severity_tag_en),
        severityTagTl: String(r.severity_tag_tl),
        severityTone: (r.severity_tone as 'amber' | 'rose' | 'cobalt') || 'cobalt',
        parentName: String(r.parent_name),
        relationship: String(r.relationship),
        parentPhone: String(r.parent_phone ?? ''),
        parentEmail: String(r.parent_email ?? ''),
        timeSlot: String(r.time_slot),
        date: r.appointment_date ? String(r.appointment_date) : String(r.created_at || '').slice(0, 10),
        status: (r.status as AppointmentStatus) || 'Scheduled',
        noShowReason: r.no_show_reason ? String(r.no_show_reason) : undefined,
        noticeReceived: Boolean(r.notice_received),
        reminderSentAt: r.reminder_sent_at ? String(r.reminder_sent_at) : null,
        rescheduledFrom: r.rescheduled_from ? String(r.rescheduled_from) : undefined,
      })
    );

    const followUps: FollowUpTaskItem[] = fupRows.map((r: Record<string, unknown>) => ({
      id: String(r.task_code),
      caseId: String(r.case_code),
      studentName: String(r.student_name),
      initials: String(r.initials ?? ''),
      gradeSection: String(r.grade_section),
      parentName: String(r.parent_name),
      parentPhone: String(r.parent_phone ?? ''),
      parentEmail: String(r.parent_email ?? ''),
      category: (r.category as FollowUpCategory) || 'Priority Calls',
      reasonEn: String(r.reason_en ?? ''),
      reasonTl: String(r.reason_tl ?? ''),
      diagnosticNoteEn: String(r.diagnostic_note_en ?? ''),
      diagnosticNoteTl: String(r.diagnostic_note_tl ?? ''),
      attemptsCount: Number(r.attempts_count ?? 0),
      lastContactSummaryEn: String(r.last_contact_summary_en ?? ''),
      lastContactSummaryTl: String(r.last_contact_summary_tl ?? ''),
      resolved: Boolean(r.resolved),
      createdAt: String(r.created_at ?? ''),
    }));

    const sections: StrandSectionStatus[] = secRows.map((r: Record<string, unknown>) => ({
      sectionCode: String(r.section_code),
      strandName: String(r.strand_name),
      openCases: Number(r.open_cases_count || 0),
      clearancePercent: Number(r.clearance_percent ?? 0),
      watchCount: Number(r.watch_count || 0),
      tone: (r.tone as 'emerald' | 'cobalt' | 'amber') || 'cobalt',
    }));

    const activityLogs: OfficeActivityLog[] = actRows.map((r: Record<string, unknown>) => ({
      id: 'ACT-' + String(r.id),
      timeAgoEn: 'Synced in PostgreSQL',
      timeAgoTl: 'Naka-sync sa PostgreSQL',
      actor: String(r.actor),
      actionEn: String(r.action_en),
      actionTl: String(r.action_tl),
      tag: String(r.tag),
      tone: (r.tone as 'emerald' | 'cobalt' | 'amber' | 'rose') || 'cobalt',
    }));

    const concernAcknowledged =
      Array.isArray(conRows) &&
      conRows.length > 0 &&
      conRows[0]?.status === 'Acknowledged';

    return {
      connected: true,
      appointments,
      followUps,
      sections,
      activityLogs,
      concernAcknowledged,
    };
  } catch {
    return null;
  }
}

export async function updateAppointmentStatusInDb(
  appointmentCode: string,
  status: AppointmentStatus,
  noShowReason?: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/parent_appointments?appointment_code=eq.${encodeURIComponent(
        appointmentCode
      )}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          status,
          no_show_reason: noShowReason || null,
        }),
      }
    );
    return reportWrite(res, 'updateAppointmentStatusInDb');
  } catch {
    return reportWrite(null, 'updateAppointmentStatusInDb');
  }
}

export async function insertAppointmentInDb(apt: ParentAppointmentItem): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/parent_appointments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        appointment_code: apt.id,
        case_code: apt.caseId,
        student_name: apt.studentName,
        student_number: apt.studentNumber,
        initials: apt.initials,
        grade_section: apt.gradeSection,
        offense_type_en: apt.offenseTypeEn,
        offense_type_tl: apt.offenseTypeTl,
        severity_tag_en: apt.severityTagEn,
        severity_tag_tl: apt.severityTagTl,
        severity_tone: apt.severityTone,
        parent_name: apt.parentName,
        relationship: apt.relationship,
        parent_phone: apt.parentPhone,
        parent_email: apt.parentEmail,
        time_slot: apt.timeSlot,
        appointment_date: apt.date,
        status: apt.status,
        rescheduled_from: apt.rescheduledFrom ?? null,
      }),
    });
    return reportWrite(res, 'insertAppointmentInDb');
  } catch {
    return reportWrite(null, 'insertAppointmentInDb');
  }
}

/** Change any fields of one conference (date, time, reminder, notice received…) */
export async function updateAppointmentInDb(
  appointmentCode: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/parent_appointments?appointment_code=eq.${encodeURIComponent(appointmentCode)}`,
      { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(patch) }
    );
    return reportWrite(res, 'updateAppointmentInDb');
  } catch {
    return reportWrite(null, 'updateAppointmentInDb');
  }
}

export async function insertFollowUpTaskInDb(task: FollowUpTaskItem): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/follow_up_tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        task_code: task.id,
        case_code: task.caseId,
        student_name: task.studentName,
        initials: task.initials,
        grade_section: task.gradeSection,
        parent_name: task.parentName,
        parent_phone: task.parentPhone,
        parent_email: task.parentEmail,
        category: task.category,
        reason_en: task.reasonEn,
        reason_tl: task.reasonTl,
        diagnostic_note_en: task.diagnosticNoteEn,
        diagnostic_note_tl: task.diagnosticNoteTl,
        attempts_count: task.attemptsCount,
        last_contact_summary_en: task.lastContactSummaryEn,
        last_contact_summary_tl: task.lastContactSummaryTl,
        resolved: task.resolved,
      }),
    });
    reportWrite(res, 'insertFollowUpTaskInDb');
  } catch {
    reportWrite(null, 'insertFollowUpTaskInDb');
  }
}

export async function updateFollowUpTaskInDb(
  taskCode: string,
  attemptsCount: number,
  summary: string,
  resolved: boolean
): Promise<void> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/follow_up_tasks?task_code=eq.${encodeURIComponent(taskCode)}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          attempts_count: attemptsCount,
          last_contact_summary_en: summary,
          last_contact_summary_tl: summary,
          resolved,
        }),
      }
    );
    reportWrite(res, 'updateFollowUpTaskInDb');
  } catch {
    reportWrite(null, 'updateFollowUpTaskInDb');
  }
}

export async function insertActivityLogInDb(log: {
  actor: string;
  actionEn: string;
  actionTl: string;
  tag: string;
  tone: string;
}): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/office_activity_logs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        actor: log.actor,
        action_en: log.actionEn,
        action_tl: log.actionTl,
        tag: log.tag,
        tone: log.tone,
      }),
    });
    if (reportWrite(res, 'insertActivityLogInDb')) {
      try {
        window.dispatchEvent(new CustomEvent(ACTIVITY_ADDED, { detail: log }));
      } catch {
        /* no window */
      }
    }
  } catch {
    reportWrite(null, 'insertActivityLogInDb');
  }
}

export async function insertSmsGmailLogInDb(entry: {
  studentName: string;
  gradeSection: string;
  parentName: string;
  phone: string;
  email: string;
  channel: string;
  message: string;
  deliveryStatus: string;
  kind?: 'notice' | 'reminder' | 'reschedule';
  appointmentCode?: string;
  caseCode?: string;
  error?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sms_gmail_logs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        student_name: entry.studentName,
        grade_section: entry.gradeSection,
        parent_name: entry.parentName,
        recipient_phone: entry.phone,
        recipient_email: entry.email,
        channel: entry.channel,
        message_body: entry.message,
        delivery_status: entry.deliveryStatus,
        kind: entry.kind ?? null,
        appointment_code: entry.appointmentCode ?? null,
        case_code: entry.caseCode ?? null,
        error: entry.error ?? null,
      }),
    });
    return reportWrite(res, 'insertSmsGmailLogInDb');
  } catch {
    return reportWrite(null, 'insertSmsGmailLogInDb');
  }
}

export interface SmsLogEntry {
  id: string;
  when: string;
  caseCode: string;
  appointmentCode: string;
  studentName: string;
  parentName: string;
  phone: string;
  email: string;
  channel: string;
  kind: string;
  status: string;
  error: string;
  message: string;
}

export async function fetchSmsLogsFromDb(limit = 300): Promise<SmsLogEntry[] | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/sms_gmail_logs?select=*&order=id.desc&limit=${limit}`,
      { headers: getHeaders() }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      when: String(r.created_at ?? ''),
      caseCode: String(r.case_code ?? ''),
      appointmentCode: String(r.appointment_code ?? ''),
      studentName: String(r.student_name ?? ''),
      parentName: String(r.parent_name ?? ''),
      phone: String(r.recipient_phone ?? ''),
      email: String(r.recipient_email ?? ''),
      channel: String(r.channel ?? ''),
      kind: String(r.kind ?? ''),
      status: String(r.delivery_status ?? ''),
      error: String(r.error ?? ''),
      message: String(r.message_body ?? ''),
    }));
  } catch {
    return null;
  }
}

export interface ContactLogEntry {
  id: string;
  when: string;
  caseCode: string;
  appointmentCode: string;
  studentName: string;
  parentName: string;
  method: string;
  result: string;
  note: string;
  actor: string;
}

/** Every call / text / call-out — append-only (cannot be edited) */
export async function insertContactLogInDb(entry: Omit<ContactLogEntry, 'id' | 'when' | 'actor'>): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_logs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        case_code: entry.caseCode || null,
        appointment_code: entry.appointmentCode || null,
        student_name: entry.studentName,
        parent_name: entry.parentName,
        method: entry.method,
        result: entry.result,
        note: entry.note || null,
      }),
    });
    return reportWrite(res, 'insertContactLogInDb');
  } catch {
    return reportWrite(null, 'insertContactLogInDb');
  }
}

export async function fetchContactLogsFromDb(limit = 300): Promise<ContactLogEntry[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_logs?select=*&order=id.desc&limit=${limit}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      when: String(r.created_at ?? ''),
      caseCode: String(r.case_code ?? ''),
      appointmentCode: String(r.appointment_code ?? ''),
      studentName: String(r.student_name ?? ''),
      parentName: String(r.parent_name ?? ''),
      method: String(r.method ?? ''),
      result: String(r.result ?? ''),
      note: String(r.note ?? ''),
      actor: String(r.actor ?? ''),
    }));
  } catch {
    return null;
  }
}

/** Save the days/times a parent can come */
export async function updateStudentPrefsInDb(
  studentNumber: string,
  days: string,
  time: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/students?student_number=eq.${encodeURIComponent(studentNumber)}`,
      { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ parent_pref_days: days, parent_pref_time: time }) }
    );
    return reportWrite(res, 'updateStudentPrefsInDb');
  } catch {
    return reportWrite(null, 'updateStudentPrefsInDb');
  }
}

export async function acknowledgeConcernInDb(referralCode: string): Promise<void> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/student_concerns?referral_code=eq.${encodeURIComponent(
        referralCode
      )}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'Acknowledged' }),
      }
    );
    reportWrite(res, 'acknowledgeConcernInDb');
  } catch {
    reportWrite(null, 'acknowledgeConcernInDb');
  }
}

export interface DbStage3Snapshot {
  students: StudentRecord[];
  cases: DisciplineCaseRecord[];
}

export async function fetchStage3Data(): Promise<DbStage3Snapshot | null> {
  try {
    const [stuRes, caseRes] = await Promise.all([
      fetchAll('students?select=*&order=id.asc'),
      fetchAll('discipline_cases?select=*&order=id.desc'),
    ]);

    if (!stuRes.ok || !caseRes.ok) return null;

    const stuRows = await stuRes.json();
    const caseRows = await caseRes.json();

    const students: StudentRecord[] = stuRows.map((r: Record<string, unknown>) => ({
      createdAt: String(r.created_at ?? ''),
      enrolled: r.enrolled !== false,
      leftReason: String(r.left_reason ?? ''),
      extra: (r.extra && typeof r.extra === 'object' ? (r.extra as Record<string, string>) : {}),
      studentNumber: String(r.student_number),
      fullName: String(r.full_name),
      initials: String(r.initials ?? ''),
      gradeSection: String(r.grade_section),
      sectionCode: String(r.section_code),
      parentName: String(r.parent_name),
      parentRelationship: String(r.parent_relationship ?? ''),
      parentPhone: String(r.parent_phone ?? ''),
      parentEmail: String(r.parent_email ?? ''),
      minorOffenseCount: Number(r.minor_offense_count || 0),
      majorOffenseCount: Number(r.major_offense_count || 0),
      clearanceStatus: (r.clearance_status as StudentRecord['clearanceStatus']) || 'Not set', // never pretend 'Cleared'
      priorOffensesEn: String(r.prior_offenses_en ?? ''),
      priorOffensesTl: String(r.prior_offenses_tl ?? ''),
      parentPrefDays: r.parent_pref_days ? String(r.parent_pref_days) : '',
      parentPrefTime: r.parent_pref_time ? String(r.parent_pref_time) : '',
    }));

    const cases: DisciplineCaseRecord[] = caseRows.map((r: Record<string, unknown>) => ({
      createdAt: String(r.created_at ?? ''),
      caseCode: String(r.case_code),
      studentNumber: String(r.student_number),
      studentName: String(r.student_name),
      gradeSection: String(r.grade_section),
      offenseTitleEn: String(r.offense_title_en),
      offenseTitleTl: String(r.offense_title_tl),
      severity: String(r.severity),
      status: (r.status as CaseStatusType) || 'Open',
      reportedBy: String(r.reported_by || 'Not recorded'),
      incidentDate: String(r.incident_date ?? ''),
      notes: String(r.notes || ''),
      step: (r.step as DisciplineCaseRecord['step']) || (r.status === 'Resolved' ? 'Closed' : 'Reported'),
      studentCalledAt: r.student_called_at ? String(r.student_called_at) : null,
      explanation: String(r.explanation ?? ''),
      parentNotifiedAt: r.parent_notified_at ? String(r.parent_notified_at) : null,
      parentNotifiedHow: String(r.parent_notified_how ?? ''),
      decision: String(r.decision ?? ''),
      sanction: String(r.sanction ?? ''),
      sanctionStatus: (r.sanction_status as DisciplineCaseRecord['sanctionStatus']) || '',
      decidedAt: r.decided_at ? String(r.decided_at) : null,
      closedAt: r.closed_at ? String(r.closed_at) : null,
      // column if it exists, otherwise the marker saved in the notes (see insertDisciplineCaseInDb)
      incidentCode: r.incident_code
        ? String(r.incident_code)
        : String(r.notes || '').match(/Incident: (INC-[\w-]+)/)?.[1],
    }));

    return { students, cases };
  } catch {
    return null;
  }
}

export async function insertDisciplineCaseInDb(
  caseItem: DisciplineCaseRecord
): Promise<boolean> {
  const row: Record<string, unknown> = {
    case_code: caseItem.caseCode,
    student_number: caseItem.studentNumber,
    student_name: caseItem.studentName,
    grade_section: caseItem.gradeSection,
    offense_title_en: caseItem.offenseTitleEn,
    offense_title_tl: caseItem.offenseTitleTl,
    severity: caseItem.severity,
    status: caseItem.status,
    reported_by: caseItem.reportedBy,
    incident_date: caseItem.incidentDate,
    notes: caseItem.notes,
    step: caseItem.step ?? 'Reported',
  };
  if (caseItem.incidentCode) row.incident_code = caseItem.incidentCode;
  const post = (body: Record<string, unknown>) =>
    fetch(`${SUPABASE_URL}/rest/v1/discipline_cases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
  try {
    let res = await post(row);
    // The incident_code column is added by scripts/add-incident-code.sql. Until it exists,
    // save the case anyway and keep the link as a marker line in the notes.
    if (!res.ok && caseItem.incidentCode && /incident_code/.test(await res.clone().text())) {
      delete row.incident_code;
      row.notes = `${caseItem.notes}\nIncident: ${caseItem.incidentCode}`;
      res = await post(row);
    }
    return reportWrite(res, 'insertDisciplineCaseInDb');
  } catch {
    return reportWrite(null, 'insertDisciplineCaseInDb');
  }
}

export async function updateDisciplineCaseStatusInDb(
  caseCode: string,
  status: CaseStatusType
): Promise<boolean> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/discipline_cases?case_code=eq.${encodeURIComponent(caseCode)}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      }
    );
    return reportWrite(res, 'updateDisciplineCaseStatusInDb');
  } catch {
    return reportWrite(null, 'updateDisciplineCaseStatusInDb');
  }
}

export async function updateStudentOffenseInDb(
  studentNumber: string,
  patch: {
    minor_offense_count: number;
    major_offense_count: number;
    prior_offenses_en: string;
    prior_offenses_tl: string;
  }
): Promise<void> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/students?student_number=eq.${encodeURIComponent(studentNumber)}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(patch),
      }
    );
    reportWrite(res, 'updateStudentOffenseInDb');
  } catch {
    reportWrite(null, 'updateStudentOffenseInDb');
  }
}

const studentToRow = (stu: StudentRecord) => ({
  student_number: stu.studentNumber,
  full_name: stu.fullName,
  initials: stu.initials,
  grade_section: stu.gradeSection,
  section_code: stu.sectionCode,
  parent_name: stu.parentName,
  parent_relationship: stu.parentRelationship,
  parent_phone: stu.parentPhone,
  parent_email: stu.parentEmail,
  minor_offense_count: stu.minorOffenseCount,
  major_offense_count: stu.majorOffenseCount,
  clearance_status: stu.clearanceStatus,
  prior_offenses_en: stu.priorOffensesEn,
  prior_offenses_tl: stu.priorOffensesTl,
  extra: stu.extra ?? {},
});

/** Edit one student's details (name, grade, section, parent, extra fields). Offenses and cases are not touched. */
export async function updateStudentDetailsInDb(
  studentNumber: string,
  patch: Partial<{ full_name: string; initials: string; grade_section: string; section_code: string; parent_name: string; parent_relationship: string; parent_phone: string; parent_email: string; extra: Record<string, string> }>
): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?student_number=eq.${encodeURIComponent(studentNumber)}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(patch),
    });
    return reportWrite(res, 'updateStudentDetailsInDb');
  } catch {
    return reportWrite(null, 'updateStudentDetailsInDb');
  }
}

/** Mark a student as enrolled again, or not enrolled anymore (graduated / transferred / stopped). */
export async function setStudentEnrollmentInDb(studentNumber: string, enrolled: boolean, reason = ''): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?student_number=eq.${encodeURIComponent(studentNumber)}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(enrolled ? { enrolled: true, left_reason: null, left_at: null } : { enrolled: false, left_reason: reason || 'Not enrolled', left_at: new Date().toISOString().slice(0, 10) }),
    });
    return reportWrite(res, 'setStudentEnrollmentInDb');
  } catch {
    return reportWrite(null, 'setStudentEnrollmentInDb');
  }
}

/** One click for a new school year: Grade 11 → Grade 12, Grade 12 → Graduated. Returns the move id for Undo. */
export async function moveUpSchoolYearInDb(): Promise<{ id: number; promoted: number; graduated: number } | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/move_up_school_year`, { method: 'POST', headers: getHeaders(), body: '{}' });
    if (!reportWrite(res, 'moveUpSchoolYear')) return null;
    return (await res.json()) as { id: number; promoted: number; graduated: number };
  } catch {
    reportWrite(null, 'moveUpSchoolYear');
    return null;
  }
}
export async function undoSchoolYearMoveInDb(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/undo_school_year_move`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ p_id: id }) });
    if (!reportWrite(res, 'undoSchoolYearMove')) return false;
    return !!((await res.json()) as { ok: boolean }).ok;
  } catch {
    return reportWrite(null, 'undoSchoolYearMove');
  }
}

/** Adds ONE student. Plain insert: an existing student number is never overwritten. */
export async function insertStudentInDb(stu: StudentRecord): Promise<'ok' | 'duplicate' | 'failed'> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(studentToRow(stu)),
    });
    if (res.status === 409) return 'duplicate';
    return reportWrite(res, 'insertStudentInDb') ? 'ok' : 'failed';
  } catch {
    reportWrite(null, 'insertStudentInDb');
    return 'failed';
  }
}

/**
 * Saves many students in a few requests (500 per request) instead of one request per student,
 * and reports exactly how many were saved — so a big masterlist import never fails silently.
 */
export async function insertStudentsBatchInDb(
  students: StudentRecord[],
  onProgress?: (saved: number, total: number) => void
): Promise<{ saved: number; failed: number; failedIds: string[] }> {
  const CHUNK = 500;
  let saved = 0;
  const failedIds: string[] = [];
  for (let i = 0; i < students.length; i += CHUNK) {
    const chunk = students.slice(i, i + CHUNK);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
        method: 'POST',
        headers: { ...getHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify(chunk.map(studentToRow)),
      });
      if (reportWrite(res, 'insertStudentsBatchInDb')) saved += chunk.length;
      else failedIds.push(...chunk.map((s) => s.studentNumber));
    } catch {
      reportWrite(null, 'insertStudentsBatchInDb');
      failedIds.push(...chunk.map((s) => s.studentNumber));
    }
    onProgress?.(saved, students.length);
  }
  return { saved, failed: failedIds.length, failedIds };
}

/**
 * Re-import (new school year): updates ONLY name, section and parent details of students that are
 * already saved. Offense counts, history and cases are never touched.
 */
export async function updateStudentsProfileBatchInDb(
  students: StudentRecord[]
): Promise<{ saved: number; failed: number; failedIds: string[] }> {
  const CHUNK = 500;
  let saved = 0;
  const failedIds: string[] = [];
  for (let i = 0; i < students.length; i += CHUNK) {
    const chunk = students.slice(i, i + CHUNK);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/students?on_conflict=student_number`, {
        method: 'POST',
        headers: { ...getHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(
          chunk.map((st) => ({
            student_number: st.studentNumber,
            full_name: st.fullName,
            initials: st.initials,
            grade_section: st.gradeSection,
            section_code: st.sectionCode,
            parent_name: st.parentName,
            parent_phone: st.parentPhone,
            parent_email: st.parentEmail,
            // in the new masterlist = enrolled again (e.g. came back after transferring)
            enrolled: true,
            left_reason: null,
            left_at: null,
          }))
        ),
      });
      if (reportWrite(res, 'updateStudentsProfileBatchInDb')) saved += chunk.length;
      else failedIds.push(...chunk.map((x) => x.studentNumber));
    } catch {
      reportWrite(null, 'updateStudentsProfileBatchInDb');
      failedIds.push(...chunk.map((x) => x.studentNumber));
    }
  }
  return { saved, failed: failedIds.length, failedIds };
}

/** Saves edits to a case's details. Returns false when the save failed, so the UI can say so. */
export async function updateDisciplineCaseDetailsInDb(
  caseCode: string,
  patch: { reported_by: string; incident_date: string; notes: string }
): Promise<boolean> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/discipline_cases?case_code=eq.${encodeURIComponent(caseCode)}`,
      { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(patch) }
    );
    return reportWrite(res, 'updateDisciplineCaseDetailsInDb');
  } catch {
    return reportWrite(null, 'updateDisciplineCaseDetailsInDb');
  }
}

export interface CaseHistoryEntry {
  when: string; // ISO time
  actor: string;
  actionEn: string;
  actionTl: string;
}

/** Everything the office did on one case, oldest first (from the audit trail). */
export async function fetchCaseHistoryFromDb(caseCode: string): Promise<CaseHistoryEntry[] | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/office_activity_logs?select=actor,action_en,action_tl,created_at&tag=eq.${encodeURIComponent(
        caseCode
      )}&order=id.asc&limit=50`,
      { headers: getHeaders() }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows.map((r) => ({
      when: String(r.created_at ?? ''),
      actor: String(r.actor ?? ''),
      actionEn: String(r.action_en ?? ''),
      actionTl: String(r.action_tl ?? ''),
    }));
  } catch {
    return null;
  }
}


/** Real numbers for the sidebar badges (never literals) */
export async function fetchBadgeCountsFromDb(): Promise<{ pendingConcerns: number } | null> {
  try {
    const h = { ...getHeaders(), Prefer: 'count=exact', Range: '0-0' } as Record<string, string>;
    const c = await fetch(`${SUPABASE_URL}/rest/v1/student_concerns?select=id&status=in.(Pending,Pending%20Review,New,Submitted)`, { headers: h });
    if (!c.ok) return null;
    const total = (r: Response) => Number((r.headers.get('content-range') || '*/0').split('/')[1]) || 0;
    return { pendingConcerns: total(c) };
  } catch {
    return null;
  }
}


/** Move a case along the 7-step flow (any of: step, explanation, decision, sanction, timestamps…) */
export async function updateCaseFlowInDb(caseCode: string, patch: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/discipline_cases?case_code=eq.${encodeURIComponent(caseCode)}`,
      { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(patch) }
    );
    return reportWrite(res, 'updateCaseFlowInDb');
  } catch {
    return reportWrite(null, 'updateCaseFlowInDb');
  }
}
