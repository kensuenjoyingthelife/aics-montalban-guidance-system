// Printable forms for a case (features flowchart page 3 "Print forms"):
// Call slip · Conference form · Behavioral contract · Kasunduan · Suspension letter.
// Each form is its own small page printed from a hidden frame, so the app (sidebar, buttons) is never
// printed, and it works the same in the browser and in Tauri (WebView2).
import type { DisciplineCaseRecord, StudentRecord } from '../data/stage3MockData';
import { getAppConfig } from './appConfig';

export type FormKind = 'callSlip' | 'conference' | 'contract' | 'kasunduan' | 'suspension';

export interface FormInput {
  kind: FormKind;
  c: DisciplineCaseRecord;
  stu?: StudentRecord;
  /** call slip / conference: when (free text, e.g. "Nov 14, 2026 · 9:00 AM") */
  when?: string;
  /** behavioral contract / kasunduan: what the student promises (one per line) */
  promises?: string;
  /** suspension */
  suspensionDays?: number;
  suspensionStart?: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  signer?: string; // guidance staff name
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] as string);
const long = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(d);
};
const longTl = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat('fil-PH', { month: 'long', day: 'numeric', year: 'numeric' }).format(d);
};
const lines = (n: number) => Array.from({ length: n }, () => '<div class="line"></div>').join('');
const sign = (labels: string[]) =>
  `<div class="signs">${labels.map((l) => `<div class="sign"><div class="sigline"></div><div class="sign-name">${esc(l)}</div><div class="sign-title">Authorized Signature / Date</div></div>`).join('')}</div>`;

export const FORM_TITLES: Record<FormKind, [string, string]> = {
  callSlip: ['Call Slip', 'Call Slip'],
  conference: ['Parent Conference Form', 'Form ng Parent Conference'],
  contract: ['Behavioral Contract', 'Behavioral Contract'],
  kasunduan: ['Kasunduan', 'Kasunduan'],
  suspension: ['Suspension Letter', 'Sulat ng Suspension'],
};

/** The whole printable page (HTML). Pure — easy to check in tests. */
export function buildFormHtml(f: FormInput, origin = ''): string {
  const { c, stu } = f;
  const today = long(new Date().toISOString());
  const parent = stu?.parentName || '';
  const config = getAppConfig();
  const campus = config.campus || {
    schoolName: 'ASIAN INSTITUTE OF COMPUTER STUDIES',
    campusName: 'Montalban Campus',
    campusAddress: 'Rodriguez, Rizal',
  };
  const signer = f.signer || config.signatories?.guidanceAssociate || 'Maurice Enriquez';
  let title = FORM_TITLES[f.kind][0];
  const head = `<header>
    <div class="header-left">
      <img src="${esc(origin)}/aics-logo.jpg" alt="AICS Seal" onerror="this.style.display='none'">
      <div>
        <div class="school-title">${esc(campus.schoolName || 'ASIAN INSTITUTE OF COMPUTER STUDIES')}</div>
        <div class="school-sub">${esc(campus.campusName || 'Montalban Campus')} · ${esc(campus.campusAddress || 'Rodriguez, Rizal')}</div>
        <div class="office-tag">Guidance &amp; Student Affairs Office</div>
      </div>
    </div>
    <div class="header-right">
      <div>Form Series: 2026-AICS-GF</div>
      <div class="form-badge">${esc(title)}</div>
    </div>
  </header>`;
  const who = `<table class="info">
    <tr><td>Student</td><td><b>${esc(c.studentName)}</b></td><td>Student no.</td><td>${esc(c.studentNumber)}</td></tr>
    <tr><td>Grade &amp; section</td><td>${esc(c.gradeSection)}</td><td>Case no.</td><td>${esc(c.caseCode)}</td></tr>
    ${parent ? `<tr><td>Parent / guardian</td><td>${esc(parent)}</td><td>Mobile</td><td>${esc(stu?.parentPhone || '')}</td></tr>` : ''}
  </table>`;
  let body = '';
  if (f.kind === 'callSlip') {
    body = `${who}
      <p>Please allow the student named above to report to the <b>Guidance Office</b>${f.when ? ` on <b>${esc(f.when)}</b>` : ' as soon as possible'}.</p>
      <p>Thank you.</p>
      ${sign([signer, 'Received by (Teacher / Class Adviser)'])}
      <p class="small">Time left class: ________ &nbsp;&nbsp; Time returned: ________</p>`;
  } else if (f.kind === 'conference') {
    body = `${who}
      <table class="info"><tr><td>Date &amp; time</td><td>${esc(f.when || '')}</td><td>Offense</td><td>${esc(c.offenseTitleEn)}</td></tr>
      <tr><td>Incident date</td><td>${esc(long(c.incidentDate))}</td><td>Level</td><td>${esc(c.severity)}</td></tr></table>
      <h3>Present</h3><p>☐ Parent / guardian &nbsp; ☐ Student &nbsp; ☐ Adviser &nbsp; ☐ Guidance staff &nbsp; ☐ Others: ____________</p>
      <h3>What was discussed</h3>${lines(4)}
      <h3>Student's side</h3>${c.explanation ? `<p class="box">${esc(c.explanation)}</p>` : lines(3)}
      <h3>Agreements / next steps</h3>${c.decision ? `<p class="box">${esc(c.decision)}${c.sanction ? ` — Sanction: ${esc(c.sanction)}` : ''}</p>` : lines(3)}
      ${sign(['Parent / guardian', 'Student', signer])}`;
  } else if (f.kind === 'contract') {
    const promises = (f.promises || '').split('\n').map((x) => x.trim()).filter(Boolean);
    body = `${who}
      <p>I, <b>${esc(c.studentName)}</b>, understand that my behavior (<b>${esc(c.offenseTitleEn)}</b>, ${esc(long(c.incidentDate))}) is against the school rules.</p>
      <h3>My statement</h3>${c.explanation ? `<p class="box">${esc(c.explanation)}</p>` : lines(4)}
      <p>I promise to:</p>
      <ol>${(promises.length ? promises : ['Follow the school rules and the Student Handbook.', 'Respect my teachers, classmates and school staff.', 'Report to the Guidance Office when called.']).map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
      <p>I understand that if I break this contract, the school may give a heavier sanction based on the Student Handbook.</p>
      <p>Signed on ${esc(today)}.</p>
      ${sign(['Student', 'Parent / guardian', signer])}`;
  } else if (f.kind === 'kasunduan') {
    title = 'KASUNDUAN';
    const promises = (f.promises || '').split('\n').map((x) => x.trim()).filter(Boolean);
    body = `${who}
      <p>Kami, ang magulang/guardian na si <b>${esc(parent || '____________________')}</b> at ang mag-aaral na si <b>${esc(c.studentName)}</b>, ay nagkakasundo kasama ang Guidance Office tungkol sa nangyari noong <b>${esc(longTl(c.incidentDate))}</b> (${esc(c.offenseTitleTl || c.offenseTitleEn)}).</p>
      <p>Ipinapangako ng mag-aaral na:</p>
      <ol>${(promises.length ? promises : ['Susundin ang mga patakaran ng paaralan at ng Student Handbook.', 'Igagalang ang mga guro, kaklase at kawani ng paaralan.', 'Pupunta sa Guidance Office kapag tinawag.']).map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
      <p>Ipinapangako ng magulang/guardian na gagabayan at babantayan ang mag-aaral, at makikipag-ugnayan sa Guidance Office kapag kailangan.</p>
      <p>Nauunawaan namin na kapag hindi natupad ang kasunduang ito, maaaring magbigay ang paaralan ng mas mabigat na parusa ayon sa Student Handbook.</p>
      <p>Nilagdaan ngayong ${esc(longTl(new Date().toISOString()))}.</p>
      ${sign(['Mag-aaral', 'Magulang / Guardian', signer])}`;
  } else {
    const days = Math.max(1, Number(f.suspensionDays) || 1);
    body = `<p>${esc(today)}</p>
      <p>Dear <b>${esc(parent || 'Parent / Guardian')}</b>,</p>
      <p>This is to inform you that your child, <b>${esc(c.studentName)}</b> of <b>${esc(c.gradeSection)}</b>, is <b>suspended for ${days} school day${days === 1 ? '' : 's'}</b>
      ${f.suspensionStart ? `starting <b>${esc(long(f.suspensionStart))}</b>` : ''} because of <b>${esc(c.offenseTitleEn)}</b> (Case no. ${esc(c.caseCode)}), based on the Student Handbook.</p>
      ${f.returnDate ? `<p>Your child may return to class on <b>${esc(long(f.returnDate))}</b>, together with a parent or guardian, and report to the Guidance Office first.</p>` : ''}
      <p>We ask for your support in guiding your child during this time. For questions, please visit or contact the Guidance Office.</p>
      <p>Respectfully,</p>
      ${sign([signer, 'Principal'])}
      <p class="small">Received by parent / guardian: ______________________ &nbsp; Date: __________</p>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — ${esc(c.studentName)}</title><style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0F172A; font-size: 12px; line-height: 1.5; margin: 0; padding: 0; }
    .page-container { border: 1.5px solid #0B1F4D; padding: 18px 24px; border-radius: 4px; }
    header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #0B1F4D; padding-bottom: 12px; margin-bottom: 16px; }
    .header-left { display: flex; align-items: center; gap: 14px; }
    header img { width: 62px; height: 62px; object-fit: contain; }
    .school-title { font-weight: 900; font-size: 15px; color: #0B1F4D; letter-spacing: 0.5px; }
    .school-sub { font-size: 11.5px; color: #334155; font-weight: 600; }
    .office-tag { font-size: 11px; font-weight: 800; color: #1E469B; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .header-right { text-align: right; font-size: 10.5px; color: #475569; }
    .form-badge { display: inline-block; padding: 3px 8px; font-weight: 800; font-size: 11px; background: #0B1F4D; color: #FFF; border-radius: 3px; margin-top: 4px; }
    h1 { text-align: center; font-size: 17px; font-weight: 900; text-transform: uppercase; margin: 12px 0 16px; letter-spacing: 1px; color: #0B1F4D; border-bottom: 1px solid #CBD5E1; padding-bottom: 6px; }
    h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0B1F4D; margin: 14px 0 4px; letter-spacing: 0.3px; }
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11.5px; }
    table.info td { border: 1px solid #94A3B8; padding: 6px 9px; vertical-align: middle; }
    table.info td:nth-child(odd) { width: 20%; background: #F1F5F9; font-weight: 800; color: #1E293B; }
    .line { border-bottom: 1px solid #94A3B8; height: 24px; }
    .box { border: 1px solid #94A3B8; background: #F8FAFC; padding: 8px 12px; white-space: pre-wrap; font-size: 11.5px; border-radius: 3px; }
    .signs { display: flex; gap: 24px; margin-top: 40px; }
    .sign { flex: 1; text-align: center; font-size: 11px; }
    .sigline { border-bottom: 1.5px solid #0F172A; height: 36px; margin-bottom: 5px; }
    .sign-name { font-weight: 800; color: #0F172A; text-transform: uppercase; font-size: 11px; }
    .sign-title { font-size: 10.5px; color: #475569; }
    .small { font-size: 10.5px; color: #475569; margin-top: 16px; border-top: 1px dashed #CBD5E1; padding-top: 8px; }
    ol { margin-top: 4px; padding-left: 20px; } li { margin: 5px 0; font-size: 11.5px; }
  </style></head><body><div class="page-container">${head}<h1>${esc(title)}</h1>${body}</div></body></html>`;
}

/** Print a page made only of the form (hidden frame). Returns false when printing is not possible. */
export function printHtml(html: string): boolean {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  // wait for the logo, then print
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 350);
  return true;
}

/** 4-in-1 Compact Call Slip Batch Sheet (Morning Routine Optimizer) */
export function buildBatchCallSlipsHtml(
  items: Array<{ caseCode: string; studentName: string; gradeSection: string; offenseTitle: string; when?: string }>,
  origin = ''
): string {
  const config = getAppConfig();
  const campus = config.campus || {
    schoolName: 'ASIAN INSTITUTE OF COMPUTER STUDIES',
    campusName: 'Montalban Campus',
    campusAddress: 'Rodriguez, Rizal',
  };
  const signer = config.signatories?.guidanceAssociate || 'Maurice Enriquez';

  const slipsHtml = items.slice(0, 4).map((it) => `
    <div class="slip">
      <div class="slip-header">
        <img src="${esc(origin)}/aics-logo.jpg" alt="AICS Seal" onerror="this.style.display='none'">
        <div class="slip-title-box">
          <div class="school-name">${esc(campus.schoolName)}</div>
          <div class="campus-sub">${esc(campus.campusName)} · ${esc(campus.campusAddress)}</div>
          <div class="office-sub">Guidance Office · Official Call Slip</div>
        </div>
        <div class="slip-badge">CALL SLIP</div>
      </div>

      <div class="slip-meta">
        <div><strong>Student:</strong> ${esc(it.studentName)}</div>
        <div><strong>Section:</strong> ${esc(it.gradeSection)}</div>
        <div><strong>Case Code:</strong> <span style="font-family:monospace;font-weight:bold;">${esc(it.caseCode)}</span></div>
        <div><strong>Reason:</strong> ${esc(it.offenseTitle)}</div>
        <div style="grid-column: span 2; margin-top: 2px;">
          <strong>Reporting Time:</strong> ${esc(it.when || 'Immediate / Next Guidance Period')}
        </div>
      </div>

      <div class="slip-instr">
        Adviser / Subject Teacher: Please excuse the student for an intake interview. Return to class after the meeting.
      </div>

      <div class="slip-footer">
        <div class="sig-area">
          <div class="sig-line"></div>
          <div>${esc(signer)}</div>
          <div style="font-size: 8px; color: #64748B;">Guidance Associate</div>
        </div>
        <div class="sig-area">
          <div class="sig-line"></div>
          <div>Time In / Time Out</div>
          <div style="font-size: 8px; color: #64748B;">Guidance Room Log</div>
        </div>
      </div>
    </div>
  `).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Batch Call Slips (4-in-1)</title>
  <style>
    @page { size: portrait; margin: 8mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0B1F4D; margin: 0; padding: 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8mm; height: 96vh; }
    .slip { border: 1.5px dashed #64748B; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; background: #FFF; }
    .slip-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #0B1F4D; padding-bottom: 6px; margin-bottom: 6px; }
    .slip-header img { width: 36px; height: 36px; object-fit: contain; }
    .slip-title-box { text-align: center; flex: 1; margin: 0 4px; }
    .school-name { font-size: 9px; font-weight: 900; }
    .campus-sub { font-size: 8px; color: #475569; }
    .office-sub { font-size: 8.5px; font-weight: 800; color: #1E469B; text-transform: uppercase; }
    .slip-badge { font-size: 8px; font-weight: 900; background: #0B1F4D; color: #FFF; padding: 2px 6px; border-radius: 3px; }
    .slip-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 9.5px; margin-bottom: 6px; }
    .slip-instr { font-size: 8px; color: #475569; font-style: italic; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 4px 6px; border-radius: 4px; margin-bottom: 8px; }
    .slip-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: auto; }
    .sig-area { text-align: center; flex: 1; font-size: 8.5px; font-weight: bold; }
    .sig-line { border-bottom: 1px solid #0B1F4D; height: 22px; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="grid">
    ${slipsHtml}
  </div>
</body>
</html>`;
}
