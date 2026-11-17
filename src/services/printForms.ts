// Printable forms for a case (features flowchart page 3 "Print forms"):
// Call slip · Conference form · Behavioral contract · Kasunduan · Suspension letter.
// Each form is its own small page printed from a hidden frame, so the app (sidebar, buttons) is never
// printed, and it works the same in the browser and in Tauri (WebView2).
import type { DisciplineCaseRecord, StudentRecord } from '../data/stage3MockData';
import { getAppConfig } from './appConfig';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type FormKind =
  | 'callSlip'
  | 'studentStatement'
  | 'witnessStatement'
  | 'conference'
  | 'parentLetter'
  | 'contract'
  | 'kasunduan'
  | 'suspension'
  | 'caseResolutionSummary'
  | 'closedNotice';

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
  /** edited in the print preview for THIS print only (default = Settings › Signatories) */
  /** edited list of signers (max 6), replaces the form's own signature row */
  signRows?: SignRow[];
  signers?: { associate?: { name: string; title: string }; principal?: { name: string; title: string } };
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
type Sig = string | { name: string; title: string };
export type SignRow = { name: string; title: string };
/** the signers the last built form asked for (used to fill the editable list in the preview) */
let lastSigns: SignRow[] = [];
const toRow = (l: Sig): SignRow => (typeof l === 'string' ? { name: l, title: 'Signature over printed name / Date' } : l);
const sign = (labels: Sig[]) => {
  lastSigns = labels.map(toRow);
  return signHtml(lastSigns);
};
const signHtml = (labels: Sig[]) =>
  `<!--signs--><div class="signs">${labels
    .map((l) => {
      const name = typeof l === 'string' ? l : l.name;
      const title = typeof l === 'string' ? 'Signature over printed name / Date' : l.title;
      return `<div class="sign"><div class="sigline"></div><div class="sign-name">${esc(name)}</div><div class="sign-title">${esc(title)}</div></div>`;
    })
    .join('')}</div><!--/signs-->`;

/** who signs this form by default (from the form and Settings) */
export function defaultSignersFor(f: FormInput): SignRow[] {
  lastSigns = [];
  buildFormHtml({ ...f, signRows: undefined });
  return lastSigns.slice(0, 6);
}

export const FORM_TITLES: Record<FormKind, [string, string]> = {
  callSlip: ['Call Slip', 'Call Slip'],
  studentStatement: ["Student's Written Explanation", 'Nakasulat na Paliwanag ng Estudyante'],
  witnessStatement: ['Statement of Reporter / Witness', 'Salaysay ng Nag-ulat / Testigo'],
  parentLetter: ['Letter to Parent (Summons)', 'Sulat sa Magulang (Patawag)'],
  conference: ['Parent Conference Form', 'Form ng Parent Conference'],
  contract: ['Behavioral Contract', 'Behavioral Contract'],
  kasunduan: ['Kasunduan', 'Kasunduan'],
  suspension: ['Suspension Letter', 'Sulat ng Suspension'],
  caseResolutionSummary: ['Case Summary', 'Buod ng Kaso'],
  closedNotice: ['Notice: Matter Closed', 'Paabiso: Tapos na ang Usapin'],
};

/** The whole printable page (HTML). Pure — easy to check in tests. */
export function buildFormHtml(f: FormInput, origin = ''): string {
  // "09:30 AM" reads as "9:30 AM" on paper (saved times keep their 2-digit form)
  if (f.when) f = { ...f, when: f.when.replace(/(^|[^d:])0(d:dds?[AP]M)/gi, '$1$2') };
  const { c, stu } = f;
  const today = long(new Date().toISOString());
  const parent = stu?.parentName || '';
  const config = getAppConfig();
  const campus = config.campus || {
    schoolName: 'ASIAN INSTITUTE OF COMPUTER STUDIES',
    campusName: 'Montalban Campus',
    campusAddress: 'Rodriguez, Rizal',
  };
  const assoc = {
    name: f.signers?.associate?.name?.trim() || f.signer || config.signatories?.guidanceAssociate || 'Guidance Associate',
    title: f.signers?.associate?.title?.trim() || config.signatories?.guidanceAssociateTitle || 'Guidance Associate',
  };
  const principalSig = {
    name: f.signers?.principal?.name?.trim() || config.signatories?.principal || 'School Principal',
    title: f.signers?.principal?.title?.trim() || config.signatories?.principalTitle || 'School Principal',
  };
  const signer = assoc;
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
      <div>Form Series: ${new Date().getFullYear()}-AICS-GF</div>
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
  } else if (f.kind === 'studentStatement') {
    title = "STUDENT'S WRITTEN EXPLANATION";
    body = `${who}
      <p>Incident date: <b>${esc(long(c.incidentDate))}</b></p>
      <p>Write what happened in your own words. You may write in English or Filipino. You may also choose not to write anything.</p>
      <h3>My explanation</h3>${lines(16)}
      <p class="small">&#9744; I chose not to give a written explanation.</p>
      ${sign(['Student', signer])}`;
  } else if (f.kind === 'witnessStatement') {
    title = 'STATEMENT OF REPORTER / WITNESS';
    body = `<table class="info">
      <tr><td>Name</td><td>____________________________</td><td>Grade &amp; section</td><td>________________</td></tr>
      <tr><td>Role</td><td colspan="3">&#9744; Reported the incident &nbsp; &#9744; Affected student &nbsp; &#9744; Witness</td></tr>
      <tr><td>Case no.</td><td>${esc(c.caseCode)}</td><td>Incident date</td><td>${esc(long(c.incidentDate))}</td></tr>
    </table>
      <h3>What I saw or experienced</h3>${lines(15)}
      <p class="small"><b>Confidential.</b> Kept only at the Guidance Office. It is not shown to the reported student or to other parents.</p>
      ${sign(['Signature of the one giving the statement', signer])}`;
  } else if (f.kind === 'parentLetter') {
    title = 'SULAT SA MAGULANG';
    // after a no-show the letter is for the NEXT summons; otherwise it backs up the one already set
    const n = c.parentConferenceStatus === 'No-Show' ? (c.summonsCount || 0) + 1 : Math.max(1, c.summonsCount || 0);
    const when = f.when || (c.conferenceTargetDate ? longTl(c.conferenceTargetDate) : '____________________');
    body = `<p>${esc(longTl(new Date().toISOString()))}</p>
      <p>Mahal na <b>${esc(parent || 'Magulang / Guardian')}</b>,</p>
      <p>Magandang araw po. Kami po ay mula sa Guidance Office ng ${esc(campus.schoolName || 'AICS')}, ${esc(campus.campusName || 'Montalban Campus')}.</p>
      <p>Ito na po ang <b>ika-${n} na patawag</b> para sa isang pag-uusap tungkol sa inyong anak na si <b>${esc(c.studentName)}</b> ng <b>${esc(c.gradeSection)}</b>.${n > 1 ? " Hindi pa po namin kayo nakakausap sa mga naunang patawag." : ""}</p>
      <p>Kinakailangan po ang inyong personal na pagdalo sa:</p>
      <p class="box"><b>${esc(when)}</b> &middot; Guidance Office</p>
      <p>Kung hindi po kayo makakarating sa petsang ito, pakitawagan po ang opisina para sa ibang oras. Kung wala pong magulang o guardian na dadalo, itutuloy po ng paaralan ang proseso nang wala kayo, ayon sa Student Handbook.</p>
      <p>Maraming salamat po sa inyong pakikiisa para sa kapakanan ng inyong anak.</p>
      <p>Lubos na gumagalang,</p>
      ${sign([signer])}
      <p class="small">Pakibalik po ang bahaging ito sa Guidance Office. &nbsp; Natanggap ni: ______________________ &nbsp; Petsa: __________ &nbsp; Pirma: __________</p>`;
  } else if (f.kind === 'closedNotice') {
    title = 'PAABISO';
    body = `<p>${esc(longTl(new Date().toISOString()))}</p>
      <p>Mahal na <b>${esc(parent || 'Magulang / Guardian')}</b>,</p>
      <p>Magandang araw po. Nais po naming ipaalam na <b>tapos na po</b> ang pagsusuri ng Guidance Office sa isang usapin tungkol sa inyong anak na si <b>${esc(c.studentName)}</b> ng <b>${esc(c.gradeSection)}</b>, at wala na pong kailangang gawin.</p>
      <p>Salamat po sa inyong pakikiisa. Para sa mga tanong, bumisita o tumawag po sa Guidance Office sa oras ng opisina.</p>
      <p>Lubos na gumagalang,</p>
      ${sign([signer])}`;
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
  } else if (f.kind === 'caseResolutionSummary') {
    title = 'CASE SUMMARY';
    const summonsCount = c.summonsCount || (c.conferenceScheduledAt ? 1 : 0);
    const hearingDateStr = c.proceededWithoutParent ? 'Parent did not attend after repeated summons; decision made without the parent' : c.parentNotifiedAt ? long(c.parentNotifiedAt) : 'Not recorded';
    // never invent record text: empty fields print as "Not recorded"
    const decisionStr = c.decision || 'Not recorded';
    const sanctionStr = c.sanction || 'Not recorded';
    const counselingStr = c.counselingNotes || 'No closing note.';
    
    body = `${who}
      <div style="background:#F8FAFC; border:1px solid #CBD5E1; padding:10px 14px; margin-bottom:14px; border-radius:4px;">
        <div style="font-size:10px; font-weight:800; color:#1E469B; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">OFFICIAL CASE CLASSIFICATION</div>
        <div style="font-size:13px; font-weight:900; color:#0F172A;">${esc(c.offenseTitleEn)} (${esc(c.severity)})</div>
        <div style="font-size:11px; color:#475569; margin-top:2px;">Incident Date: <b>${esc(long(c.incidentDate))}</b> · Reported by: <b>${/student report|confidential/i.test(c.reportedBy) ? 'On file at the Guidance Office (confidential)' : esc(c.reportedBy)}</b> · Official Status: <b>${c.status === 'Resolved' ? 'CLOSED' : 'OPEN'}</b></div>
      </div>

      <h3 style="margin-top:12px;">I. Due process steps (as recorded)</h3>
      <table class="info" style="margin-bottom:12px;">
        <tr>
          <td style="width:25%;">1. Notice of the complaint</td>
          <td>${c.complaintNoticedAt ? `<b>Done</b>: the student was told the complaint on <b>${esc(long(c.complaintNoticedAt))}</b> (reporter not named).` : '<b>Not recorded</b>'}</td>
        </tr>
        <tr>
          <td>2. Student's side (right to be heard)</td>
          <td>${c.explanationRefused ? '<b>Done</b>: the student chose not to give a statement.' : c.explanation ? '<b>Done</b>: written explanation on file (see II).' : '<b>Not recorded</b>'}</td>
        </tr>
        <tr>
          <td>3. Parent summons</td>
          <td>${summonsCount > 0 ? `<b>${summonsCount}</b> summons sent (no offense details in SMS).` : '<b>Not recorded</b>'}</td>
        </tr>
        <tr>
          <td>4. Parent conference</td>
          <td>${c.parentConferenceStatus === 'Attended' ? `<b>Attended</b> on <b>${esc(hearingDateStr)}</b>${c.conferenceAttendedBy ? ` by ${esc(c.conferenceAttendedBy)}` : ''}.` : c.proceededWithoutParent ? '<b>Continued without the parent</b> after repeated summons.' : '<b>Not held yet</b>'}</td>
        </tr>
        ${c.principalApprovedBy ? `<tr><td>5. Principal approval</td><td><b>Approved</b> by <b>${esc(c.principalApprovedBy)}</b>${c.principalApprovedAt ? ` on ${esc(long(c.principalApprovedAt))}` : ''}.</td></tr>` : ''}
        ${c.appealRequestedAt ? `<tr><td>${c.principalApprovedBy ? '6' : '5'}. Appeal</td><td>By <b>${esc(c.appealBy || '')}</b> on ${esc(long(c.appealRequestedAt))}. Reason: ${esc(c.appealReason || '')}. Result: <b>${esc(c.appealResult || '')}</b>${c.appealNote ? ` (${esc(c.appealNote)})` : ''}.</td></tr>` : ''}
      </table>

      <h3>II. Student Respondent Official Explanation</h3>
      <div class="box" style="margin-bottom:12px; font-style:italic;">"${c.explanationRefused ? 'The student chose not to give a statement.' : c.explanation ? esc(c.explanation) : 'Not recorded'}"</div>

      <h3>III. Guidance Ruling &amp; Corrective Measures Imposed</h3>
      <table class="info" style="margin-bottom:12px;">
        <tr>
          <td style="width:25%;">Administrative Ruling</td>
          <td><b>${esc(decisionStr)}</b></td>
        </tr>
        <tr>
          <td>Imposed Measure / Sanction</td>
          <td><b>${esc(sanctionStr)}</b> (Status: <b>${c.sanctionStatus === 'Done' ? 'Completed' : c.sanctionStatus === 'Active' ? 'In progress' : c.sanction ? 'Waiting for parent notice' : '—'}</b>)</td>
        </tr>
      </table>

      <h3>IV. Closing note</h3>
      <div class="box" style="margin-bottom:16px;">${esc(counselingStr)}</div>

      <div style="border-top:1px solid #CBD5E1; padding-top:10px; font-size:10.5px; color:#475569; margin-bottom:24px;">
        <b>Note:</b> The due process steps above are as recorded in the Guidance Office system. Corrective interventions were formative in nature, respecting student rights and dignity under the Child Protection Policy and Data Privacy Act of 2012 (RA 10173).
      </div>

      ${sign([signer, principalSig, 'Student', 'Parent / Guardian'])}`;
  } else {
    const days = Math.max(1, Number(f.suspensionDays) || 1);
    body = `<p>${esc(today)}</p>
      <p>Dear <b>${esc(parent || 'Parent / Guardian')}</b>,</p>
      <p>This is to inform you that your child, <b>${esc(c.studentName)}</b> of <b>${esc(c.gradeSection)}</b>, is <b>suspended for ${days} school day${days === 1 ? '' : 's'}</b>
      ${f.suspensionStart ? `starting <b>${esc(long(f.suspensionStart))}</b>` : ''} because of <b>${esc(c.offenseTitleEn)}</b> (Case no. ${esc(c.caseCode)}), based on the Student Handbook.</p>
      ${f.returnDate ? `<p>Your child may return to class on <b>${esc(long(f.returnDate))}</b>, together with a parent or guardian, and report to the Guidance Office first.</p>` : ''}
      <p>We ask for your support in guiding your child during this time. For questions, please visit or contact the Guidance Office.</p>
      <p>Respectfully,</p>
      ${sign([signer, principalSig])}
      <p class="small">Received by parent / guardian: ______________________ &nbsp; Date: __________</p>`;
  }
  if (f.signRows) {
    const rows = f.signRows.filter((r) => r.name.trim() || r.title.trim()).slice(0, 6);
    body = body.replace(/<!--signs-->[\s\S]*?<!--\/signs-->/, () => (rows.length ? signHtml(rows) : ''));
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — ${esc(c.studentName)}</title><style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0F172A; font-size: 11px; line-height: 1.4; margin: 0; padding: 0; box-sizing: border-box; }
    .page-container { border: 1.5px solid #0B1F4D; padding: 14px 18px; border-radius: 4px; box-sizing: border-box; page-break-inside: avoid; }
    header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0B1F4D; padding-bottom: 8px; margin-bottom: 10px; }
    .header-left { display: flex; align-items: center; gap: 10px; }
    header img { width: 50px; height: 50px; object-fit: cover; border-radius: 50%; }
    .school-title { font-weight: 900; font-size: 13.5px; color: #0B1F4D; letter-spacing: 0.5px; }
    .school-sub { font-size: 10.5px; color: #334155; font-weight: 600; }
    .office-tag { font-size: 10px; font-weight: 800; color: #1E469B; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }
    .header-right { text-align: right; font-size: 9.5px; color: #475569; }
    .form-badge { display: inline-block; padding: 2px 7px; font-weight: 800; font-size: 10px; background: #0B1F4D; color: #FFF; border-radius: 3px; margin-top: 3px; }
    h1 { text-align: center; font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 8px 0 10px; letter-spacing: 0.5px; color: #0B1F4D; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; }
    h3 { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0B1F4D; margin: 8px 0 3px; letter-spacing: 0.2px; }
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5px; }
    table.info td { border: 1px solid #94A3B8; padding: 4px 7px; vertical-align: middle; }
    table.info td:nth-child(odd) { width: 20%; background: #F1F5F9; font-weight: 800; color: #1E293B; }
    .line { border-bottom: 1px solid #94A3B8; height: 18px; }
    .box { border: 1px solid #94A3B8; background: #F8FAFC; padding: 6px 10px; white-space: pre-wrap; font-size: 10.5px; border-radius: 3px; }
    .signs { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 22px 16px; margin-top: 24px; page-break-inside: avoid; }
    .sign { flex: 0 0 calc((100% - 32px) / 3); text-align: center; font-size: 10px; }
    .sigline { border-bottom: 1.5px solid #0F172A; height: 26px; margin-bottom: 4px; }
    .sign-name { font-weight: 800; color: #0F172A; text-transform: uppercase; font-size: 10px; }
    .sign-title { font-size: 9.5px; color: #475569; }
    .small { font-size: 9.5px; color: #475569; margin-top: 10px; border-top: 1px dashed #CBD5E1; padding-top: 5px; }
    ol { margin-top: 3px; padding-left: 18px; } li { margin: 3px 0; font-size: 10.5px; }
    @media print { .page-container.multi { max-height: none; } }
  </style></head><body><div class="page-container">${head}<h1>${esc(title)}</h1>${body}</div><script>(function(){document.querySelectorAll('.page-container').forEach(function(p){var max=1047;var h=p.scrollHeight;if(h>max){var k=max/h;if(k>=0.8){p.style.zoom=String(k);}else{p.classList.add('multi');p.style.pageBreakInside='auto';}}});})();</script></body></html>`;
}

/** Case folder: several forms in one print job, each on its own page */
export function buildFolderHtml(kinds: FormKind[], base: Omit<FormInput, 'kind'>, origin = ''): string {
  const docs = kinds.map((k) => buildFormHtml({ ...base, kind: k }, origin));
  if (!docs.length) return '';
  const first = docs[0];
  const pages = docs.map((d) => (d.match(/<div class="page-container">[\s\S]*?<\/div><script>/) || [''])[0].replace(/<script>$/, ''));
  const joined = pages.join('<div style="page-break-after:always"></div>');
  return first.replace(/<div class="page-container">[\s\S]*?<\/div><script>/, () => joined + '<script>').replace(/<title>[^<]*<\/title>/, `<title>Case folder — ${esc(base.c.caseCode)}</title>`);
}

/** Print a page made only of the form (hidden frame). Returns false when printing is not possible. */
export function printHtml(html: string): boolean {
  // If a previous print frame exists, clean it up first
  const old = document.getElementById('aics-print-isolated-frame');
  if (old) old.remove();

  const frame = document.createElement('iframe');
  frame.id = 'aics-print-isolated-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;opacity:0;pointer-events:none;z-index:-9999;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();

  // Explicitly focus and print ONLY the isolated iframe window, never the main app window
  setTimeout(() => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      /* ignore */
    }
    // Cleanly remove after print dialog interaction
    setTimeout(() => {
      try {
        frame.remove();
      } catch {
        /* ignore */
      }
    }, 2000);
  }, 350);
  return true;
}

/** Downloads the form directly as an authentic 1-page PDF document file using jsPDF */
export async function downloadFormDocument(html: string, filename: string): Promise<void> {
  // Render html inside a hidden offscreen container with exact A4 dimensions
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // 210mm at 96 DPI
  container.style.minHeight = '1123px'; // 297mm at 96 DPI
  container.style.background = '#FFFFFF';
  container.style.zIndex = '-9999';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await (html2canvas as any)(container, {
      scale: 2, // crisp high DPI
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const boxW = pageW - margin * 2;
    const boxH = pageH - margin * 2;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    // real proportions: never stretch a short form or squash a long one
    let w = boxW;
    let h = (canvas.height / canvas.width) * w;
    if (h <= boxH) {
      pdf.addImage(imgData, 'JPEG', margin, margin, w, h);
    } else if (boxH / h >= 0.8) {
      const k = boxH / h; // shrink a little so it fits one page
      w *= k;
      h = boxH;
      pdf.addImage(imgData, 'JPEG', margin + (boxW - w) / 2, margin, w, h);
    } else {
      // too long: more pages at full size, with page numbers
      const pages = Math.ceil(h / boxH);
      for (let i = 0; i < pages; i++) {
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, margin - i * boxH, w, h);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageW, margin, 'F');
        pdf.rect(0, pageH - margin, pageW, margin, 'F');
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.text(`Page ${i + 1} of ${pages}`, pageW - margin, pageH - 4, { align: 'right' });
      }
    }

    const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeName);
  } catch (err) {
    console.error('Failed to generate pure PDF via jsPDF:', err);
    // never save a broken file: open the print window so the user can pick "Save as PDF"
    printHtml(html);
    return;
    // (old) download as PDF blob
    const blob = new Blob([html], { type: 'application/pdf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  } finally {
    container.remove();
  }
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
    .slip-header img { width: 36px; height: 36px; object-fit: cover; border-radius: 50%; }
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
