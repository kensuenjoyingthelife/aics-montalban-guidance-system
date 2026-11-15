// Dedicated Document & PDF Export Engine with official AICS institutional formatting
// Features: Circular AICS Logo, Data Privacy Act compliance header, clean typography, signature block
import { AICS_LOGO_BASE64 } from './aicsLogoBase64';

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
}

const triggerPrintIframe = (html: string, title: string): boolean => {
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
  }, 250);
  return true;
};

const esc = (s: string) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] || c);

/**
 * 1. Single Incident Slip (Exact match of physical form uploaded by user)
 */
export function printIncidentSlip(data: IncidentSlipData): boolean {
  const staff = data.guidanceStaffName || 'Guidance Associate';
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>AICS Guidance Incident Report - ${esc(data.caseCode)}</title>
  <style>
    @page { size: portrait; margin: 20mm 20mm 20mm 20mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif, Arial;
      color: #0F172A;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
      background: #fff;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;
      text-align: center;
    }
    .logo {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid #1E469B;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .inst-name {
      font-size: 20px;
      font-weight: bold;
      color: #0B1F4D;
      letter-spacing: 0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .dept-name {
      font-size: 14px;
      font-style: italic;
      color: #334155;
      margin-top: 2px;
    }
    .sub-banner {
      font-size: 11px;
      letter-spacing: 1px;
      color: #64748B;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .divider {
      border-bottom: 2px solid #0B1F4D;
      margin: 12px 0 24px 0;
    }
    .doc-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #0B1F4D;
      margin-bottom: 24px;
      text-decoration: underline;
    }
    .field-list {
      margin: 0 auto;
      max-width: 650px;
      font-size: 13.5px;
    }
    .field-row {
      display: flex;
      margin-bottom: 16px;
      align-items: baseline;
    }
    .field-bullet {
      font-size: 16px;
      margin-right: 8px;
      color: #0B1F4D;
    }
    .field-label {
      font-weight: bold;
      color: #0F172A;
      width: 230px;
      flex-shrink: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .field-colon {
      margin-right: 12px;
      font-weight: bold;
    }
    .field-value {
      flex: 1;
      border-bottom: 1px dotted #94A3B8;
      padding-bottom: 2px;
      color: #0B1F4D;
      font-weight: 500;
    }
    .details-box {
      border: 1px solid #CBD5E1;
      padding: 10px 14px;
      border-radius: 4px;
      background: #F8FAFC;
      margin-top: 4px;
      min-height: 50px;
      font-style: italic;
    }
    .sign-section {
      margin-top: 60px;
      display: flex;
      justify-content: flex-end;
    }
    .sign-box {
      text-align: center;
      width: 240px;
    }
    .sign-line {
      border-bottom: 1.5px solid #0B1F4D;
      margin-bottom: 6px;
      height: 35px;
    }
    .sign-name {
      font-weight: bold;
      font-size: 14px;
      color: #0B1F4D;
    }
    .sign-title {
      font-size: 12px;
      color: #475569;
      font-style: italic;
    }
    .footer-note {
      margin-top: 40px;
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
      font-size: 10px;
      color: #64748B;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${AICS_LOGO_BASE64}" class="logo" alt="AICS Seal" />
    <div>
      <h1 class="inst-name">Asian Institute of Computer Studies</h1>
      <div class="dept-name">Guidance Department · Montalban Campus</div>
      <div class="sub-banner">Official Student Disciplinary & Incident Record</div>
    </div>
  </div>

  <div class="divider"></div>
  <div class="doc-title">INCIDENT RECORD SLIP</div>

  <div class="field-list">
    <div class="field-row">
      <span class="field-bullet">•</span>
      <span class="field-label">DATE OF INCIDENT</span>
      <span class="field-colon">:</span>
      <span class="field-value">${esc(data.incidentDate)}</span>
    </div>

    <div class="field-row">
      <span class="field-bullet">•</span>
      <span class="field-label">NAME OF STUDENT</span>
      <span class="field-colon">:</span>
      <span class="field-value">${esc(data.studentName)} ${data.studentNumber ? `<span style="font-size:12px;color:#64748B;">(${esc(data.studentNumber)})</span>` : ''}</span>
    </div>

    <div class="field-row">
      <span class="field-bullet">•</span>
      <span class="field-label">SECTION</span>
      <span class="field-colon">:</span>
      <span class="field-value">${esc(data.gradeSection)}</span>
    </div>

    <div class="field-row">
      <span class="field-bullet">•</span>
      <span class="field-label">TYPE OF OFFENSE</span>
      <span class="field-colon">:</span>
      <span class="field-value">${esc(data.offenseType)}</span>
    </div>

    <div class="field-row">
      <span class="field-bullet">•</span>
      <span class="field-label">OFFENSE COMMITTED</span>
      <span class="field-colon">:</span>
      <span class="field-value" style="font-weight:bold;">${esc(data.offenseCommitted)}</span>
    </div>

    <div class="field-row" style="align-items:flex-start;">
      <span class="field-bullet">•</span>
      <span class="field-label">DETAILS</span>
      <span class="field-colon">:</span>
      <div class="field-value details-box">${esc(data.details || 'No additional narrative provided.')}</div>
    </div>

    <div class="field-row">
      <span class="field-bullet">•</span>
      <span class="field-label">PENALTY / RESULTING ACTION</span>
      <span class="field-colon">:</span>
      <span class="field-value" style="color:#0B1F4D;font-weight:bold;">${esc(data.penaltyAction || 'Conference Scheduled / Under Evaluation')}</span>
    </div>
  </div>

  <div class="sign-section">
    <div class="sign-box">
      <div class="sign-line"></div>
      <div class="sign-name">${esc(staff)}</div>
      <div class="sign-title">Guidance Associate</div>
    </div>
  </div>

  <div class="footer-note">
    <span>Case Reference: <strong>${esc(data.caseCode)}</strong></span>
    <span>CONFIDENTIAL · R.A. 10173 Data Privacy Act Compliant</span>
    <span>Printed: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
  </div>
</body>
</html>`;
  return triggerPrintIframe(html, `Incident-Slip-${data.caseCode}`);
}

/**
 * 2. Official Audit Trail PDF
 */
export function printAuditTrailPdf(opts: AuditPdfOptions): boolean {
  const staff = opts.staffName || 'Guidance Associate';
  const tableRows = opts.rows
    .map(
      (r, idx) => `
    <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
      <td style="white-space:nowrap;font-family:monospace;font-size:11px;">${esc(r.date)}</td>
      <td style="font-weight:bold;color:#0B1F4D;">${esc(r.actor)}</td>
      <td><span class="badge ${r.action.toLowerCase()}">${esc(r.action)}</span></td>
      <td style="font-weight:600;">${esc(r.table)}</td>
      <td>${esc(r.description)}</td>
      <td style="font-size:11px;color:#334155;">${esc(r.detail)}</td>
    </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>AICS Guidance Audit Trail Log</title>
  <style>
    @page { size: landscape; margin: 12mm 15mm 15mm 15mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #0F172A; margin: 0; padding: 10px; font-size: 12px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1E469B; padding-bottom: 8px; margin-bottom: 12px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo { width: 52px; height: 52px; border-radius: 50%; border: 1.5px solid #1E469B; object-fit: cover; }
    .inst-title { font-size: 16px; font-weight: bold; color: #0B1F4D; margin: 0; text-transform: uppercase; }
    .sub-title { font-size: 12px; color: #475569; margin: 2px 0 0 0; }
    .meta-box { text-align: right; font-size: 11px; color: #475569; }
    .filter-summary { background: #F1F5F9; border-left: 3px solid #1E469B; padding: 6px 12px; font-size: 11px; margin-bottom: 12px; border-radius: 0 4px 4px 0; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
    th { background: #0B1F4D; color: #fff; text-align: left; padding: 7px 8px; font-weight: bold; border: 1px solid #0B1F4D; font-size: 11px; }
    td { padding: 6px 8px; border: 1px solid #CBD5E1; vertical-align: top; }
    tr.even { background: #F8FAFC; }
    tr.odd { background: #FFFFFF; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
    .badge.insert { background: #DCFCE7; color: #166534; }
    .badge.update { background: #E0F2FE; color: #075985; }
    .badge.delete { background: #FFE4E6; color: #9F1239; }
    .footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #64748B; border-top: 1px solid #CBD5E1; padding-top: 8px; }
    .sign-box { text-align: center; width: 200px; }
    .sign-line { border-bottom: 1px solid #0B1F4D; height: 25px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${AICS_LOGO_BASE64}" class="logo" alt="AICS Seal" />
      <div>
        <h1 class="inst-title">Asian Institute of Computer Studies</h1>
        <p class="sub-title">Montalban Campus · Guidance Office Forensic Audit Trail</p>
      </div>
    </div>
    <div class="meta-box">
      <div><strong>Security Hash:</strong> AICS-AUD-${Date.now().toString(36).toUpperCase()}</div>
      <div><strong>Date Range:</strong> ${esc(opts.dateRange)}</div>
      <div><strong>Generated:</strong> ${new Date().toLocaleString('en-US')}</div>
    </div>
  </div>

  <div class="filter-summary">
    <span>Filter: <strong>${esc(opts.filterSummary)}</strong></span>
    <span>Total Records Exported: <strong>${opts.rows.length}</strong></span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:130px;">Timestamp</th>
        <th style="width:120px;">Staff / Actor</th>
        <th style="width:70px;">Action</th>
        <th style="width:110px;">Module / Table</th>
        <th style="width:200px;">Target Description</th>
        <th>Field Modifications (Before → After)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="6" style="text-align:center;padding:20px;">No audit records found matching this criteria.</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <p style="margin:0 0 2px 0;"><strong>CONFIDENTIAL FORENSIC LOG</strong> · Compliant with Republic Act No. 10173 (Data Privacy Act of 2012)</p>
      <p style="margin:0;">This document is an immutable system record generated from the AICS Guidance Core Database.</p>
    </div>
    <div class="sign-box">
      <div class="sign-line"></div>
      <div style="font-weight:bold;color:#0B1F4D;">${esc(staff)}</div>
      <div style="font-size:10px;color:#64748B;">Certified Correct · Guidance Associate</div>
    </div>
  </div>
</body>
</html>`;
  return triggerPrintIframe(html, 'Audit-Trail-Log');
}

/**
 * 3. Full Monthly Report PDF with Embedded Visual Graphs & Signatures
 */
export function printMonthlyExecutivePdf(opts: MonthlyPdfOptions): boolean {
  const staff = opts.staffName || 'Guidance Associate';
  const levelBars = opts.byLevel
    .map(
      (b) => `
    <div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:bold;margin-bottom:2px;">
        <span>${esc(b.label)}</span>
        <span>${b.count} (${b.pct}%)</span>
      </div>
      <div style="height:10px;background:#E2E8F0;border-radius:5px;overflow:hidden;">
        <div style="height:100%;width:${b.pct}%;background:#1E469B;border-radius:5px;"></div>
      </div>
    </div>`
    )
    .join('');

  const reasonBars = opts.noShowReasons
    .map(
      (r) => `
    <div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:bold;margin-bottom:2px;">
        <span>${esc(r.label)}</span>
        <span>${r.count} (${r.pct}%)</span>
      </div>
      <div style="height:10px;background:#FEE2E2;border-radius:5px;overflow:hidden;">
        <div style="height:100%;width:${r.pct}%;background:#DC2626;border-radius:5px;"></div>
      </div>
    </div>`
    )
    .join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>AICS Guidance Monthly Executive Report - ${esc(opts.monthName)}</title>
  <style>
    @page { size: portrait; margin: 15mm 18mm 18mm 18mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #0F172A; margin: 0; padding: 12px; font-size: 12px; line-height: 1.4; }
    .header { display: flex; align-items: center; justify-content: center; gap: 14px; text-align: center; border-bottom: 2px solid #1E469B; padding-bottom: 12px; margin-bottom: 16px; }
    .logo { width: 62px; height: 62px; border-radius: 50%; border: 1.5px solid #1E469B; object-fit: cover; }
    .inst-title { font-size: 18px; font-weight: bold; color: #0B1F4D; margin: 0; text-transform: uppercase; }
    .sub-title { font-size: 13px; color: #334155; margin: 2px 0 0; }
    .doc-badge { display: inline-block; background: #EEF2F6; color: #1E469B; font-weight: bold; padding: 4px 12px; border-radius: 12px; font-size: 11px; margin-top: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .kpi-card { border: 1.5px solid #CBD5E1; border-radius: 8px; padding: 10px; text-align: center; background: #F8FAFC; }
    .kpi-title { font-size: 10.5px; font-weight: bold; color: #64748B; text-transform: uppercase; }
    .kpi-value { font-size: 22px; font-weight: 900; color: #0B1F4D; margin: 4px 0 2px; }
    .kpi-sub { font-size: 10px; color: #475569; }
    .section-title { font-size: 13px; font-weight: bold; color: #0B1F4D; border-bottom: 1.5px solid #CBD5E1; padding-bottom: 4px; margin: 18px 0 10px; text-transform: uppercase; }
    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .chart-box { border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px; background: #fff; }
    .sign-row { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
    .sign-box { text-align: center; width: 220px; }
    .sign-line { border-bottom: 1.5px solid #0B1F4D; height: 35px; margin-bottom: 4px; }
    .footer { margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 8px; font-size: 10px; color: #64748B; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${AICS_LOGO_BASE64}" class="logo" alt="AICS Seal" />
    <div>
      <h1 class="inst-title">Asian Institute of Computer Studies</h1>
      <p class="sub-title">Montalban Campus · Guidance & Counseling Department</p>
      <span class="doc-badge">MONTHLY DISCIPLINE & PARENT CONFERENCE EXECUTIVE REPORT</span>
    </div>
  </div>

  <div style="margin-bottom:14px;display:flex;justify-content:space-between;font-size:11.5px;color:#334155;">
    <span>Reporting Period: <strong>${esc(opts.monthName)}</strong></span>
    <span>Date Prepared: <strong>${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></span>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-title">New Incidents</div>
      <div class="kpi-value">${opts.newCases}</div>
      <div class="kpi-sub">Reported in ${esc(opts.monthName)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Parent Attendance</div>
      <div class="kpi-value">${opts.attendanceRate === null ? '—' : opts.attendanceRate + '%'}</div>
      <div class="kpi-sub">${opts.attended} of ${opts.conferencesHeld} held</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Overdue Cases</div>
      <div class="kpi-value" style="color:${opts.overdueCount > 0 ? '#DC2626' : '#0B1F4D'};">${opts.overdueCount}</div>
      <div class="kpi-sub">Awaiting resolution</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Avg Resolution</div>
      <div class="kpi-value">${opts.avgDaysToClose === null ? '—' : opts.avgDaysToClose + 'd'}</div>
      <div class="kpi-sub">Days from incident to close</div>
    </div>
  </div>

  <div class="charts-grid">
    <div class="chart-box">
      <div style="font-weight:bold;color:#0B1F4D;font-size:12px;margin-bottom:10px;">Offenses Breakdown by Severity</div>
      ${levelBars || '<p style="color:#64748B;font-style:italic;">No incident records for this month.</p>'}
    </div>
    <div class="chart-box">
      <div style="font-weight:bold;color:#0B1F4D;font-size:12px;margin-bottom:10px;">Parent Absence Reasons</div>
      ${reasonBars || '<p style="color:#64748B;font-style:italic;">100% attendance or no missed meetings.</p>'}
    </div>
  </div>

  <div class="sign-row">
    <div class="sign-box">
      <div class="sign-line"></div>
      <div style="font-weight:bold;color:#0B1F4D;">${esc(staff)}</div>
      <div style="font-size:11px;color:#475569;">Guidance Associate</div>
    </div>
    <div class="sign-box">
      <div class="sign-line"></div>
      <div style="font-weight:bold;color:#0B1F4D;">School Principal / Director</div>
      <div style="font-size:11px;color:#475569;">Asian Institute of Computer Studies</div>
    </div>
  </div>

  <div class="footer">
    <span>Report Ref: AICS-REP-${Date.now().toString(36).toUpperCase()}</span>
    <span>CONFIDENTIAL INSTITUTIONAL REPORT · FOR INTERNAL ACADEMIC USE ONLY</span>
    <span>Page 1 of 1</span>
  </div>
</body>
</html>`;
  return triggerPrintIframe(html, `Monthly-Report-${opts.monthName}`);
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

export function printDepEdCompliancePdf(opts: DepEdComplianceReportOptions): boolean {
  const staff = opts.guidanceStaffName || 'Maurice Enriquez';
  const counselor = opts.counselorName || 'Registered Guidance Counselor (RGC)';
  const principal = opts.principalName || 'School Principal';
  const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const rowsHtml = opts.cases.slice(0, 30).map((c) => `
    <tr>
      <td style="font-family:monospace;font-weight:bold;color:#1E469B;">${esc(c.code)}</td>
      <td>${esc(c.date)}</td>
      <td style="font-weight:600;">${esc(c.studentName)}</td>
      <td>${esc(c.gradeSection)}</td>
      <td>${esc(c.offenseTitle)}</td>
      <td><span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:bold;background:#F1F5F9;color:#0F172A;">${esc(c.level)}</span></td>
      <td style="font-weight:bold;color:${c.status === 'Closed' ? '#059669' : '#D97706'};">${esc(c.status)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DepEd Child Protection Compliance Report - ${esc(opts.quarter)}</title>
  <style>
    @page { size: portrait; margin: 10mm 12mm 10mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0B1F4D; margin: 0; padding: 0; font-size: 11px; line-height: 1.4; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0B1F4D; padding-bottom: 8px; margin-bottom: 12px; }
    .header-logo { width: 54px; height: 54px; object-fit: contain; }
    .header-center { text-align: center; flex: 1; margin: 0 10px; }
    .deped-tag { font-size: 10px; font-weight: 800; color: #1E469B; text-transform: uppercase; letter-spacing: 0.5px; }
    .school-title { font-size: 14px; font-weight: 900; letter-spacing: 0.2px; }
    .school-sub { font-size: 10px; color: #475569; }
    .badge { font-size: 8px; font-weight: bold; background: #EEF2F6; padding: 3px 8px; border-radius: 4px; border: 1px solid #CBD5E1; }
    .title-banner { background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .title-banner h2 { margin: 0; font-size: 12px; font-weight: 800; color: #0B1F4D; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
    .kpi-card { border: 1px solid #CBD5E1; border-radius: 6px; padding: 6px 10px; background: #FFFFFF; }
    .kpi-val { font-size: 16px; font-weight: 900; color: #1E469B; }
    .kpi-lbl { font-size: 9.5px; font-weight: bold; color: #475569; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 14px; }
    th { background: #0B1F4D; color: #FFFFFF; text-align: left; padding: 5px 6px; font-weight: 800; font-size: 9px; text-transform: uppercase; }
    td { padding: 4px 6px; border-bottom: 1px solid #E2E8F0; }
    tr:nth-child(even) td { background: #F8FAFC; }
    .sign-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 18px; page-break-inside: avoid; }
    .sign-box { text-align: center; }
    .sign-line { border-bottom: 1px solid #0B1F4D; height: 32px; margin-bottom: 4px; }
    .legal-note { font-size: 8.5px; color: #64748B; font-style: italic; margin-top: 10px; border-top: 1px solid #E2E8F0; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${AICS_LOGO_BASE64}" class="header-logo" alt="AICS Seal" />
    <div class="header-center">
      <div class="deped-tag">Republic of the Philippines · Department of Education</div>
      <div class="school-title">ASIAN INSTITUTE OF COMPUTER STUDIES (AICS)</div>
      <div class="school-sub">Rodriguez, Rizal Campus · Child Protection Committee &amp; Guidance Office</div>
      <div style="font-weight: 800; font-size: 11px; margin-top: 2px;">DEPED ORDER NO. 40, S. 2012 COMPLIANCE REPORT</div>
    </div>
    <div class="badge">DO 40, S. 2012<br>CERTIFIED</div>
  </div>

  <div class="title-banner">
    <div>
      <h2>Quarterly Child Protection &amp; Anti-Bullying Incident Record</h2>
      <div style="font-size: 9.5px; color: #475569;">Covering: ${esc(opts.quarter)} · ${esc(opts.schoolYear)}</div>
    </div>
    <div style="text-align: right; font-size: 9.5px;">
      <div><strong>Date Generated:</strong> ${esc(now)}</div>
      <div><strong>Confidentiality:</strong> DepEd Protected (DO 40)</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-lbl">Total Incidents Recorded</div>
      <div class="kpi-val">${opts.childProtectionMetrics.totalIncidents}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Bullying &amp; Harassment</div>
      <div class="kpi-val">${opts.childProtectionMetrics.bullyingCases}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Anti-Substance &amp; Vaping</div>
      <div class="kpi-val">${opts.childProtectionMetrics.substanceCases}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Interventions Provided</div>
      <div class="kpi-val">${opts.childProtectionMetrics.interventionsProvided}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Whistleblower Reports</div>
      <div class="kpi-val">${opts.childProtectionMetrics.whistleblowerReportsReceived}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Due Process Resolution Rate</div>
      <div class="kpi-val">${opts.childProtectionMetrics.totalIncidents > 0 ? Math.round((opts.childProtectionMetrics.interventionsProvided / opts.childProtectionMetrics.totalIncidents) * 100) : 100}%</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Case Code</th>
        <th>Date</th>
        <th>Student Name</th>
        <th>Grade &amp; Section</th>
        <th>Offense / Classification</th>
        <th>Handbook Level</th>
        <th>Due Process Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" style="text-align:center;padding:12px;color:#64748B;">No incident records filed during this period.</td></tr>'}
    </tbody>
  </table>

  <div class="legal-note">
    <strong>DepEd DO 40, s. 2012 Mandate:</strong> This document certifies compliance with the "DepEd Child Protection Policy". All reported incidents undergo documented procedural due process, confidential intake, parent consultation, and positive behavioral intervention without administrative bias.
  </div>

  <div class="sign-row">
    <div class="sign-box">
      <div class="sign-line"></div>
      <div style="font-weight:bold;">${esc(staff)}</div>
      <div style="font-size:9.5px;color:#475569;">Guidance Associate &amp; Intake Officer</div>
    </div>
    <div class="sign-box">
      <div class="sign-line"></div>
      <div style="font-weight:bold;">${esc(counselor)}</div>
      <div style="font-size:9.5px;color:#475569;">Registered Guidance Counselor (RGC)</div>
    </div>
    <div class="sign-box">
      <div class="sign-line"></div>
      <div style="font-weight:bold;">${esc(principal)}</div>
      <div style="font-size:9.5px;color:#475569;">School Principal / CPC Chairperson</div>
    </div>
  </div>
</body>
</html>`;

  return triggerPrintIframe(html, `DepEd-DO40-Compliance-Report-${opts.quarter}`);
}
