// Printable forms for a case (features flowchart page 3 "Print forms"):
// Call slip · Conference form · Behavioral contract · Kasunduan · Suspension letter.
// Each form is its own small page printed from a hidden frame, so the app (sidebar, buttons) is never
// printed, and it works the same in the browser and in Tauri (WebView2).
import type { DisciplineCaseRecord, StudentRecord } from '../data/stage3MockData';

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
  `<div class="signs">${labels.map((l) => `<div class="sign"><div class="sigline"></div><div>${esc(l)}</div></div>`).join('')}</div>`;

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
  const signer = f.signer || 'Guidance Office';
  const head = `<header><img src="${esc(origin)}/aics-logo.jpg" alt="" onerror="this.style.display='none'"><div>
    <div class="school">ASIAN INSTITUTE OF COMPUTER STUDIES — MONTALBAN</div>
    <div class="office">Guidance Office · Rodriguez, Rizal</div></div></header>`;
  const who = `<table class="info">
    <tr><td>Student</td><td><b>${esc(c.studentName)}</b></td><td>Student no.</td><td>${esc(c.studentNumber)}</td></tr>
    <tr><td>Grade &amp; section</td><td>${esc(c.gradeSection)}</td><td>Case no.</td><td>${esc(c.caseCode)}</td></tr>
    ${parent ? `<tr><td>Parent / guardian</td><td>${esc(parent)}</td><td>Mobile</td><td>${esc(stu?.parentPhone || '')}</td></tr>` : ''}
  </table>`;
  let title = FORM_TITLES[f.kind][0];
  let body = '';
  if (f.kind === 'callSlip') {
    body = `${who}
      <p>Please allow the student named above to report to the <b>Guidance Office</b>${f.when ? ` on <b>${esc(f.when)}</b>` : ' as soon as possible'}.</p>
      <p>Thank you.</p>
      ${sign([signer, 'Received by (teacher / adviser)'])}
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
      <p>I, <b>${esc(c.studentName)}</b>, understand that my behavior (<b>${esc(c.offenseTitleEn)}</b>) is against the school rules. I promise to:</p>
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
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12.5px; line-height: 1.5; }
    header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0B1F4D; padding-bottom: 8px; margin-bottom: 14px; }
    header img { width: 54px; height: 54px; object-fit: contain; }
    .school { font-weight: bold; font-size: 14px; color: #0B1F4D; } .office { font-size: 12px; color: #333; }
    h1 { text-align: center; font-size: 18px; margin: 6px 0 14px; letter-spacing: .5px; }
    h3 { font-size: 13px; margin: 14px 0 4px; }
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    table.info td { border: 1px solid #999; padding: 5px 7px; vertical-align: top; }
    table.info td:nth-child(odd) { width: 18%; background: #f2f4f8; font-weight: bold; }
    .line { border-bottom: 1px solid #777; height: 22px; }
    .box { border: 1px solid #999; padding: 6px 8px; white-space: pre-wrap; }
    .signs { display: flex; gap: 28px; margin-top: 46px; }
    .sign { flex: 1; text-align: center; font-size: 12px; } .sigline { border-bottom: 1px solid #111; height: 34px; margin-bottom: 4px; }
    .small { font-size: 11px; color: #333; margin-top: 18px; }
    ol { margin-top: 4px; } li { margin: 4px 0; }
  </style></head><body>${head}<h1>${esc(title)}</h1>${body}</body></html>`;
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
    setTimeout(() => frame.remove(), 2000);
  }, 400);
  return true;
}
