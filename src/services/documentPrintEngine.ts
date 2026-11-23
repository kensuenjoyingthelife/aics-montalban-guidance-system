// Official AICS document engine: ONE professional layout for every printed / PDF report.
// - A4, full width, real page numbers ("Page 1 of 2") in the page margin, no browser URL/date header
// - Letterhead and signatories come from Settings (campus + signatories), never hard-coded
// - Signature block never splits across pages; tables repeat their header on every page
import { AICS_LOGO_BASE64 } from './aicsLogoBase64';
import { getAppConfig } from './appConfig';

export interface IncidentSlipData {
  caseCode: string;
  incidentDate: string;
  studentName: string;
  studentNumber?: string;
  gradeSection: string;
  offenseType: string;
  offenseCommitted: string;
  details: string;
  penaltyAction: string;
  guidanceStaffName?: string;
}

export interface AuditPdfOptions {
  rows: Array<{
    date: string;
    actor: string;
    action: string;
    table: string;
    description: string;
    detail: string;
  }>;
  filterSummary: string;
  dateRange: string;
  staffName?: string;
}

export interface MonthlyPdfOptions {
  monthName: string;
  newCases: number;
  attended: number;
  conferencesHeld: number;
  attendanceRate: number | null;
  overdueCount: number;
  avgDaysToClose: number | null;
  byLevel: Array<{ label: string; count: number; pct: number }>;
  noShowReasons: Array<{ label: string; count: number; pct: number }>;
  staffName?: string;
  /** optional extra detail (shown when given) */
  byType?: Array<{ label: string; count: number; pct: number }>;
  didNotAttend?: number;
  closed?: number;
  overdueRows?: Array<{ code: string; student: string; offense: string; since: string; days: number }>;
}

export interface DepEdComplianceReportOptions {
  quarter: string; // e.g. "Q4 2026 (Oct - Dec)"
  schoolYear: string; // e.g. "S.Y. 2026 - 2027"
  cases: Array<{
    code: string;
    date: string;
    studentName: string;
    gradeSection: string;
    offenseTitle: string;
    level: string;
    status: string;
  }>;
  childProtectionMetrics: {
    totalIncidents: number;
    bullyingCases: number;
    substanceCases: number;
    discriminationCases: number;
    interventionsProvided: number;
    whistleblowerReportsReceived: number;
  };
  guidanceStaffName?: string;
  counselorName?: string;
  principalName?: string;
}

export interface SimpleTablePdfOptions {
  title: string;
  period: string;
  rows: Array<[string, string]>;
}

// ------------------------------------------------------------------ shared kit

const triggerPrintIframe = (html: string, _title: string): boolean => {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;opacity:0;pointer-events:none';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 2500);
  }, 300);
  return true;
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] || c);
/** text for a CSS `content: "..."` value */
const cssText = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
const longDate = (d = new Date()) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const refNo = (prefix: string) => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; // local date, not UTC
  return `${prefix}-${ymd}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
};

interface Signatory {
  role: string; // Prepared by / Noted by / Approved by
  name: string;
  title: string;
}
interface DocParts {
  docTitle: string;
  docSubtitle?: string;
  reference: string;
  meta: Array<[string, string]>;
  body: string;
  signatories?: Signatory[];
  landscape?: boolean;
}

const signatoriesFromSettings = (preparedName?: string): Signatory[] => {
  const s = getAppConfig().signatories;
  return [
    { role: 'Prepared by', name: preparedName && !/^guidance (staff|associate)$/i.test(preparedName) ? preparedName : s.guidanceAssociate, title: s.guidanceAssociateTitle || 'Guidance Associate' },
    { role: 'Noted by', name: s.guidanceCounselor, title: s.guidanceCounselorTitle || 'Guidance Counselor' },
    { role: 'Approved by', name: s.principal, title: s.principalTitle || 'School Principal' },
  ];
};

/** The one official AICS page: letterhead, title block, body, signatures, page footer */
function officialDocument(p: DocParts): string {
  const c = getAppConfig().campus;
  const school = c.schoolName || 'ASIAN INSTITUTE OF COMPUTER STUDIES';
  const footerLeft = cssText(`AICS Guidance Office · ${p.reference}`);
  const footerCenter = cssText('Confidential · R.A. 10173');
  const signs = p.signatories ?? [];
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(p.docTitle)} · ${esc(p.reference)}</title>
<style>
  @page {
    size: A4 ${p.landscape ? 'landscape' : 'portrait'};
    margin: 14mm 15mm 17mm 15mm;
    @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; }
    @bottom-left { content: "${footerLeft}"; font: 7.5pt Arial, sans-serif; color: #64748B; }
    @bottom-center { content: "${footerCenter}"; font: 7.5pt Arial, sans-serif; color: #64748B; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7.5pt Arial, sans-serif; color: #64748B; }
  }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; line-height: 1.45; color: #0F172A; }

  /* letterhead */
  .lh { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; }
  .lh img { width: 58px; height: 58px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .lh-text { flex: 1; min-width: 0; }
  .lh-school { font-size: 14pt; font-weight: 800; letter-spacing: 0.4px; color: #0B1F4D; text-transform: uppercase; line-height: 1.15; }
  .lh-office { font-size: 9.5pt; font-weight: 700; color: #1E469B; margin-top: 2px; }
  .lh-contact { font-size: 7.8pt; color: #475569; margin-top: 2px; }
  .lh-tag { font-size: 7.5pt; font-weight: 800; letter-spacing: 1px; color: #9F1239; border: 1px solid #FDA4AF; background: #FFF1F2; padding: 3px 8px; border-radius: 3px; white-space: nowrap; }
  .rule { height: 3px; background: #0B1F4D; border-bottom: 1px solid #C9A227; margin-bottom: 12px; }

  /* title block */
  .title { font-size: 13pt; font-weight: 800; color: #0B1F4D; letter-spacing: 0.3px; text-transform: uppercase; margin: 0; }
  .subtitle { font-size: 9pt; color: #475569; margin: 2px 0 8px; }
  .meta { display: grid; grid-template-columns: repeat(${Math.max(1, Math.min(4, p.meta.length))}, 1fr); border: 1px solid #CBD5E1; border-radius: 4px; margin-bottom: 14px; }
  .meta div { padding: 6px 10px; border-left: 1px solid #E2E8F0; }
  .meta div:first-child { border-left: 0; }
  .meta b { display: block; font-size: 7pt; letter-spacing: 0.8px; text-transform: uppercase; color: #64748B; font-weight: 700; }
  .meta span { font-size: 9.5pt; font-weight: 700; color: #0B1F4D; }

  /* sections */
  h2 { font-size: 10pt; font-weight: 800; color: #0B1F4D; text-transform: uppercase; letter-spacing: 0.6px; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #CBD5E1; break-after: avoid; }
  p.note { font-size: 8.5pt; color: #475569; margin: 4px 0 0; }
  p.lead { margin: 0 0 6px; }

  /* KPI strip */
  .kpis { display: grid; grid-template-columns: repeat(var(--n, 4), 1fr); border: 1px solid #CBD5E1; border-radius: 4px; break-inside: avoid; }
  .kpi { padding: 8px 10px; border-left: 1px solid #E2E8F0; }
  .kpi:first-child { border-left: 0; }
  .kpi b { display: block; font-size: 7pt; letter-spacing: 0.8px; text-transform: uppercase; color: #64748B; }
  .kpi strong { display: block; font-size: 17pt; font-weight: 800; color: #0B1F4D; line-height: 1.2; margin-top: 2px; }
  .kpi strong.bad { color: #B91C1C; }
  .kpi small { font-size: 7.8pt; color: #475569; }

  /* tables */
  table { width: 100%; border-collapse: collapse; font-size: 8.8pt; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th { background: #EEF2F8; color: #0B1F4D; text-align: left; font-size: 7.5pt; letter-spacing: 0.6px; text-transform: uppercase; padding: 5px 7px; border-bottom: 1.5px solid #0B1F4D; }
  td { padding: 5px 7px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #FAFBFD; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  td.nw { white-space: nowrap; }
  td.mono { font-family: Consolas, monospace; font-size: 8pt; white-space: nowrap; }
  td.empty { text-align: center; color: #64748B; font-style: italic; padding: 10px; }
  .bar { height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden; min-width: 80px; }
  .bar i { display: block; height: 100%; background: #1E469B; }
  .bar.red i { background: #B91C1C; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .pill { white-space: nowrap; display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 7.5pt; font-weight: 700; background: #F1F5F9; color: #0F172A; }
  .pill.ok { background: #DCFCE7; color: #166534; }
  .pill.wait { background: #FEF3C7; color: #92400E; }
  .pill.ins { background: #DCFCE7; color: #166534; } .pill.upd { background: #E0F2FE; color: #075985; } .pill.del { background: #FFE4E6; color: #9F1239; }

  /* label : value form (incident slip) */
  .fields { border: 1px solid #CBD5E1; border-radius: 4px; }
  .field { display: grid; grid-template-columns: 170px 1fr; border-top: 1px solid #E2E8F0; }
  .field:first-child { border-top: 0; }
  .field b { background: #F8FAFC; padding: 7px 10px; font-size: 7.8pt; letter-spacing: 0.6px; text-transform: uppercase; color: #334155; border-right: 1px solid #E2E8F0; }
  .field span { padding: 7px 10px; font-size: 10pt; color: #0B1F4D; white-space: pre-wrap; }
  .field.big span { min-height: 90px; }

  /* signatures */
  .signs { display: grid; grid-template-columns: repeat(${Math.max(1, signs.length)}, 1fr); gap: 22px; margin-top: 22px; break-inside: avoid; }
  .sign small { display: block; font-size: 7.8pt; color: #64748B; margin-bottom: 26px; }
  .sign .line { border-top: 1px solid #0B1F4D; padding-top: 4px; }
  .sign strong { display: block; font-size: 9.5pt; color: #0B1F4D; }
  .sign em { display: block; font-style: normal; font-size: 8pt; color: #475569; }
</style>
</head>
<body>
  <header class="lh">
    <img src="${AICS_LOGO_BASE64}" alt="AICS seal" />
    <div class="lh-text">
      <div class="lh-school">${esc(school)}</div>
      <div class="lh-office">${esc(c.campusName || 'Montalban Campus')} · Guidance Office</div>
      <div class="lh-contact">${esc([c.campusAddress, c.contactNumber, c.officialEmail].filter(Boolean).join('  ·  '))}</div>
    </div>
    <div class="lh-tag">CONFIDENTIAL</div>
  </header>
  <div class="rule"></div>

  <h1 class="title">${esc(p.docTitle)}</h1>
  ${p.docSubtitle ? `<p class="subtitle">${esc(p.docSubtitle)}</p>` : '<div style="height:8px"></div>'}
  <div class="meta">${p.meta.map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div>

  ${p.body}

  ${
    signs.length
      ? `<section class="signs">${signs
          .map((s) => `<div class="sign"><small>${esc(s.role)}:</small><div class="line"><strong>${esc(s.name)}</strong><em>${esc(s.title)}</em></div></div>`)
          .join('')}</section>`
      : ''
  }
</body>
</html>`;
}

const barRow = (label: string, count: number, pct: number, red = false) =>
  `<tr><td>${esc(label)}</td><td class="num">${count}</td><td class="num">${pct}%</td><td><div class="bar${red ? ' red' : ''}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div></td></tr>`;
const countTable = (rows: Array<{ label: string; count: number; pct: number }>, firstHead: string, empty: string, red = false) =>
  `<table><thead><tr><th>${esc(firstHead)}</th><th class="num">Count</th><th class="num">Share</th><th style="width:32%">&nbsp;</th></tr></thead><tbody>${
    rows.length ? rows.map((r) => barRow(r.label, r.count, r.pct, red)).join('') : `<tr><td colspan="4" class="empty">${esc(empty)}</td></tr>`
  }</tbody></table>`;

// ------------------------------------------------------------------ 1. Incident record slip

export function printIncidentSlip(data: IncidentSlipData): boolean {
  const s = getAppConfig().signatories;
  const body = `
  <section class="fields">
    <div class="field"><b>Date of incident</b><span>${esc(data.incidentDate)}</span></div>
    <div class="field"><b>Student</b><span>${esc(data.studentName)}${data.studentNumber ? `  ·  #${esc(data.studentNumber)}` : ''}</span></div>
    <div class="field"><b>Grade &amp; section</b><span>${esc(data.gradeSection)}</span></div>
    <div class="field"><b>Offense level</b><span>${esc(data.offenseType)}</span></div>
    <div class="field"><b>Offense committed</b><span><strong>${esc(data.offenseCommitted)}</strong></span></div>
    <div class="field big"><b>Details</b><span>${esc(data.details || 'No additional narrative provided.')}</span></div>
    <div class="field"><b>Sanction / action</b><span><strong>${esc(data.penaltyAction || 'Under evaluation')}</strong></span></div>
  </section>`;
  return triggerPrintIframe(
    officialDocument({
      docTitle: 'Incident Record Slip',
      docSubtitle: 'Official record of a student discipline incident',
      reference: data.caseCode,
      meta: [
        ['Case reference', data.caseCode],
        ['Date of incident', data.incidentDate],
        ['Date printed', longDate()],
      ],
      body,
      signatories: [
        { role: 'Prepared by', name: data.guidanceStaffName && !/^guidance (staff|associate)$/i.test(data.guidanceStaffName) ? data.guidanceStaffName : s.guidanceAssociate, title: s.guidanceAssociateTitle || 'Guidance Associate' },
        { role: 'Noted by', name: s.guidanceCounselor, title: s.guidanceCounselorTitle || 'Guidance Counselor' },
      ],
    }),
    `Incident-Slip-${data.caseCode}`
  );
}

// ------------------------------------------------------------------ 2. Audit trail

export function printAuditTrailPdf(opts: AuditPdfOptions): boolean {
  const ref = refNo('AUD');
  const pillFor = (a: string) => (/insert|add|create/i.test(a) ? 'ins' : /delete|remove/i.test(a) ? 'del' : 'upd');
  const rows = opts.rows
    .map(
      (r) => `<tr><td class="mono">${esc(r.date)}</td><td><strong>${esc(r.actor)}</strong></td><td><span class="pill ${pillFor(r.action)}">${esc(r.action)}</span></td><td>${esc(r.table)}</td><td>${esc(r.description)}</td><td style="font-size:8pt;color:#334155">${esc(r.detail)}</td></tr>`
    )
    .join('');
  const body = `
  <table>
    <thead><tr><th style="width:118px">Date &amp; time</th><th style="width:120px">Staff</th><th style="width:70px">Action</th><th style="width:110px">Record</th><th style="width:190px">Description</th><th>Changes (before → after)</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" class="empty">No audit records match this filter.</td></tr>'}</tbody>
  </table>
  <p class="note">This log is read-only: audit entries can be added but never edited or deleted.</p>`;
  return triggerPrintIframe(
    officialDocument({
      docTitle: 'Audit Trail Log',
      docSubtitle: 'Every change made in the Guidance Office system',
      reference: ref,
      landscape: true,
      meta: [
        ['Reference no.', ref],
        ['Date range', opts.dateRange],
        ['Filter', opts.filterSummary],
        ['Records', String(opts.rows.length)],
      ],
      body,
      signatories: [signatoriesFromSettings(opts.staffName)[0], signatoriesFromSettings()[1]].map((x, i) => (i === 0 ? { ...x, role: 'Certified correct by' } : x)),
    }),
    'Audit-Trail-Log'
  );
}

// ------------------------------------------------------------------ 3. Monthly report

export function printMonthlyExecutivePdf(opts: MonthlyPdfOptions): boolean {
  const ref = refNo('MR');
  const didNot = opts.didNotAttend ?? Math.max(0, opts.conferencesHeld - opts.attended);
  const att = opts.attendanceRate === null ? 'no conferences were held' : `${opts.attendanceRate}% of parents attended (${opts.attended} of ${opts.conferencesHeld})`;
  const summary = `In ${esc(opts.monthName)}, the Guidance Office recorded <strong>${opts.newCases}</strong> new case${opts.newCases === 1 ? '' : 's'}. In parent conferences, ${esc(att)}. ${
    opts.overdueCount > 0 ? `<strong>${opts.overdueCount}</strong> case${opts.overdueCount === 1 ? ' is' : 's are'} overdue and need${opts.overdueCount === 1 ? 's' : ''} action.` : 'No case is overdue.'
  }`;
  const overdueTable =
    opts.overdueRows && opts.overdueRows.length
      ? `<table><thead><tr><th style="width:110px">Case</th><th>Student</th><th>Offense</th><th style="width:90px">Since</th><th class="num" style="width:70px">Days open</th></tr></thead><tbody>${opts.overdueRows
          .map((o) => `<tr><td class="mono">${esc(o.code)}</td><td>${esc(o.student)}</td><td>${esc(o.offense)}</td><td>${esc(o.since)}</td><td class="num"><strong>${o.days}</strong></td></tr>`)
          .join('')}</tbody></table>`
      : `<p class="note">No overdue cases this month.</p>`;
  const body = `
  <h2>1. Summary</h2>
  <p class="lead">${summary}</p>
  <div class="kpis" style="--n:4">
    <div class="kpi"><b>New cases</b><strong>${opts.newCases}</strong><small>recorded this month</small></div>
    <div class="kpi"><b>Parent attendance</b><strong>${opts.attendanceRate === null ? '—' : opts.attendanceRate + '%'}</strong><small>${opts.attended} of ${opts.conferencesHeld} conferences</small></div>
    <div class="kpi"><b>Overdue cases</b><strong class="${opts.overdueCount > 0 ? 'bad' : ''}">${opts.overdueCount}</strong><small>open past the day limit</small></div>
    <div class="kpi"><b>Average time to close</b><strong>${opts.avgDaysToClose === null ? '—' : opts.avgDaysToClose + ' days'}</strong><small>${opts.closed !== undefined ? `${opts.closed} case${opts.closed === 1 ? '' : 's'} closed` : 'from incident to close'}</small></div>
  </div>

  <h2>2. Offenses</h2>
  <div class="${opts.byType && opts.byType.length ? 'two' : ''}">
    <div>${countTable(opts.byLevel, 'By level', 'No cases this month.')}</div>
    ${opts.byType && opts.byType.length ? `<div>${countTable(opts.byType, 'By type', 'No cases this month.')}</div>` : ''}
  </div>

  <h2>3. Parent conferences</h2>
  <div class="two">
    <table><thead><tr><th>Conferences</th><th class="num">Count</th></tr></thead><tbody>
      <tr><td>Held</td><td class="num">${opts.conferencesHeld}</td></tr>
      <tr><td>Attended</td><td class="num">${opts.attended}</td></tr>
      <tr><td>Did not attend</td><td class="num">${didNot}</td></tr>
      <tr><td><strong>Attendance rate</strong></td><td class="num"><strong>${opts.attendanceRate === null ? '—' : opts.attendanceRate + '%'}</strong></td></tr>
    </tbody></table>
    <div>${countTable(opts.noShowReasons, 'Reasons for not attending', 'Every parent attended, or no conference was missed.', true)}</div>
  </div>

  <h2>4. Overdue cases</h2>
  ${overdueTable}`;
  return triggerPrintIframe(
    officialDocument({
      docTitle: 'Monthly Discipline & Parent Conference Report',
      docSubtitle: 'Summary of cases, parent conferences and follow-up for the month',
      reference: ref,
      meta: [
        ['Reference no.', ref],
        ['Reporting period', opts.monthName],
        ['School year', getAppConfig().campus.schoolYear || '—'],
        ['Date prepared', longDate()],
      ],
      body,
      signatories: signatoriesFromSettings(opts.staffName),
    }),
    `Monthly-Report-${opts.monthName}`
  );
}

// ------------------------------------------------------------------ 4. Quarterly child protection report

export function printDepEdCompliancePdf(opts: DepEdComplianceReportOptions): boolean {
  const ref = refNo('QR');
  const m = opts.childProtectionMetrics;
  const rate = m.totalIncidents > 0 ? Math.round((m.interventionsProvided / m.totalIncidents) * 100) + '%' : '—';
  const rows = opts.cases
    .map(
      (c) =>
        `<tr><td class="mono">${esc(c.code)}</td><td class="nw">${esc(c.date)}</td><td><strong>${esc(c.studentName)}</strong></td><td class="nw">${esc(c.gradeSection)}</td><td>${esc(c.offenseTitle)}</td><td><span class="pill">${esc(c.level)}</span></td><td><span class="pill ${/resolved|closed/i.test(c.status) ? 'ok' : 'wait'}">${esc(c.status)}</span></td></tr>`
    )
    .join('');
  const sig = getAppConfig().signatories;
  const body = `
  <h2>1. Summary</h2>
  <div class="kpis" style="--n:3">
    <div class="kpi"><b>Total incidents</b><strong>${m.totalIncidents}</strong><small>recorded this quarter</small></div>
    <div class="kpi"><b>Bullying &amp; harassment</b><strong>${m.bullyingCases}</strong><small>incl. cyberbullying</small></div>
    <div class="kpi"><b>Vaping &amp; substances</b><strong>${m.substanceCases}</strong><small>cases</small></div>
  </div>
  <div class="kpis" style="--n:3;margin-top:6px">
    <div class="kpi"><b>Cases closed</b><strong>${m.interventionsProvided}</strong><small>due process completed</small></div>
    <div class="kpi"><b>From student reports</b><strong>${m.whistleblowerReportsReceived}</strong><small>confidential reports</small></div>
    <div class="kpi"><b>Resolution rate</b><strong>${rate}</strong><small>closed ÷ total</small></div>
  </div>

  <h2>2. Cases this quarter</h2>
  <table>
    <thead><tr><th>Case</th><th>Date</th><th>Student</th><th>Grade &amp; section</th><th>Offense</th><th>Level</th><th>Status</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7" class="empty">No cases were recorded this quarter.</td></tr>'}</tbody>
  </table>
  <p class="note">Numbers come only from cases recorded in the system. Cases withdrawn as filed in error are not counted.</p>`;
  return triggerPrintIframe(
    officialDocument({
      docTitle: 'Quarterly Child Protection & Anti-Bullying Report',
      docSubtitle: 'In line with DepEd Order No. 40, s. 2012 (Child Protection Policy)',
      reference: ref,
      meta: [
        ['Reference no.', ref],
        ['Quarter', opts.quarter],
        ['School year', opts.schoolYear],
        ['Date prepared', longDate()],
      ],
      body,
      signatories: [
        { role: 'Prepared by', name: opts.guidanceStaffName || sig.guidanceAssociate, title: sig.guidanceAssociateTitle || 'Guidance Associate' },
        { role: 'Noted by', name: opts.counselorName || sig.guidanceCounselor, title: sig.guidanceCounselorTitle || 'Guidance Counselor' },
        { role: 'Approved by', name: opts.principalName || sig.principal, title: 'School Principal / CPC Chairperson' },
      ],
    }),
    `Quarterly-Report-${opts.quarter}`
  );
}

// ------------------------------------------------------------------ 5. Simple two-column table (Reports → Quick table print)

export function printSimpleTablePdf(opts: SimpleTablePdfOptions): boolean {
  const ref = refNo('TBL');
  const body = `<table><thead><tr><th style="width:55%">Item</th><th>Value</th></tr></thead><tbody>${opts.rows
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`)
    .join('')}</tbody></table>`;
  return triggerPrintIframe(
    officialDocument({
      docTitle: opts.title,
      reference: ref,
      meta: [
        ['Reference no.', ref],
        ['Period', opts.period],
        ['Date prepared', longDate()],
      ],
      body,
      signatories: signatoriesFromSettings().slice(0, 2),
    }),
    opts.title
  );
}
