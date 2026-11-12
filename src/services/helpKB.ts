// Help Assistant knowledge base (offline, free, no data leaves the computer).
// Every answer is written from the real screens of this app. Keep the button names exactly as they appear
// (English / Tagalog) so the staff can find them. When a screen changes, update its answer here.

export type HelpTarget =
  | 'dashboard'
  | 'new-case'
  | 'cases'
  | 'students'
  | 'masterlist'
  | 'parents-schedule'
  | 'parents-conferences'
  | 'parents-followups'
  | 'parents-messages'
  | 'concerns'
  | 'counselor'
  | 'reports'
  | 'audit'
  | 'settings'
  | 'guide';

export type HelpCategory = 'start' | 'cases' | 'parents' | 'students' | 'concerns' | 'counselor' | 'reports' | 'settings' | 'problems';

export interface HelpEntry {
  id: string;
  cat: HelpCategory;
  /** the question as the staff would ask it */
  q: string;
  /** other ways people ask it (Taglish, English, short words, common typos) */
  alt: string[];
  /** short answer */
  a: string;
  steps?: string[];
  tip?: string;
  go?: HelpTarget;
  /** shown as a ready-made question */
  top?: boolean;
}

export const HELP_CATEGORIES: { id: HelpCategory; label: string }[] = [
  { id: 'start', label: '🚀 Pagsisimula' },
  { id: 'cases', label: '📁 Mga kaso' },
  { id: 'parents', label: '👪 Magulang at conference' },
  { id: 'students', label: '🎓 Estudyante at master list' },
  { id: 'concerns', label: '💬 Concerns ng estudyante' },
  { id: 'counselor', label: '🧑‍⚕️ Counselor' },
  { id: 'reports', label: '📊 Reports at Audit' },
  { id: 'settings', label: '⚙️ Settings' },
  { id: 'problems', label: '🛠 May problema' },
];

export const GO_LABEL: Record<HelpTarget, string> = {
  dashboard: 'Buksan ang Dashboard',
  'new-case': 'Gumawa ng Bagong Kaso',
  cases: 'Buksan ang mga Kaso',
  students: 'Buksan ang mga Estudyante',
  masterlist: 'Buksan ang Master List import',
  'parents-schedule': 'Buksan: Kailangang i-schedule',
  'parents-conferences': 'Buksan ang mga Conference',
  'parents-followups': 'Buksan ang Follow-ups',
  'parents-messages': 'Buksan ang mga Mensahe',
  concerns: 'Buksan ang Concerns',
  counselor: 'Buksan ang Counselor',
  reports: 'Buksan ang Reports',
  audit: 'Buksan ang Audit Trail',
  settings: 'Buksan ang Settings',
  guide: 'Buksan ang Quick Guide',
};

export const HELP_KB: HelpEntry[] = [
  // ───────────── PAGSISIMULA ─────────────
  {
    id: 'daily-flow', cat: 'start', top: true,
    q: 'Ano ang gagawin ko araw-araw? (step by step)',
    alt: ['daily', 'araw araw', 'routine', 'saan magsisimula', 'unang gagawin', 'step by step', 'paano gamitin system', 'how to use', 'workflow', 'proseso'],
    a: 'Ito ang simpleng daloy ng trabaho bawat araw:',
    steps: [
      'Buksan ang Dashboard. Tingnan ang "Kailangang aksyunan" (overdue na kaso, sanction na naghihintay).',
      'Tingnan ang mga conference ngayong araw. Pindutin ang "Dumalo" o "Hindi dumalo".',
      'Tawagan o i-text ang mga magulang na nasa Follow-ups.',
      'Kapag may bagong insidente, pindutin ang "+ Bagong Kaso".',
      'Buksan ang bawat bukas na kaso at sundan ang "Susunod na gagawin".',
      'Bago umuwi, i-check ang Concerns kung may bagong report ang estudyante.',
    ],
    go: 'dashboard',
  },
  {
    id: 'login', cat: 'start',
    q: 'Paano mag-login sa system?',
    alt: ['login', 'log in', 'sign in', 'pumasok', 'buksan ang app', 'pin at code', 'otp', 'email code'],
    a: 'Dalawang hakbang ang login para ligtas ang records:',
    steps: [
      'I-type ang 6-digit na PIN ng app.',
      'I-type ang email ng staff account mo, tapos pindutin ang Enter.',
      'Buksan ang email mo. May 6-character code (letra at numero).',
      'I-type ang code sa app. Isang beses lang ito magagamit at mag-e-expire pagkalipas ng ilang minuto.',
    ],
    tip: 'Kung walang dumating na code, i-check ang Spam folder at ang internet.',
  },
  {
    id: 'pin-forgot', cat: 'start', top: true,
    q: 'Nakalimutan ko ang PIN. Ano ang gagawin?',
    alt: ['forgot pin', 'nakalimutan pin', 'mali pin', 'reset pin', 'hindi ko alam pin', 'pin locked', 'naka lock pin', 'limot pin'],
    a: 'Para sa seguridad, walang "forgot PIN" button. Ganito ang gagawin:',
    steps: [
      'Kung naka-lock dahil sa maling PIN, maghintay muna (5 minuto ang default) bago sumubok ulit.',
      'Kung talagang hindi maalala, makipag-ugnayan sa IT o sa nag-setup ng system para ma-reset ang PIN.',
      'Pagka-login, palitan agad ang PIN sa Settings › Accounts at security.',
    ],
    tip: 'Huwag isulat ang PIN sa papel na nakadikit sa computer.',
  },
  {
    id: 'pin-change', cat: 'start',
    q: 'Paano palitan ang PIN?',
    alt: ['change pin', 'palitan pin', 'bagong pin', 'new pin', 'update pin'],
    a: 'Sa Settings mo mapapalitan ang PIN:',
    steps: [
      'Pindutin ang Settings sa kaliwa at i-type ang kasalukuyang PIN.',
      'Piliin ang "Accounts at security".',
      'I-type ang lumang PIN, ang bagong PIN, at ulitin ang bagong PIN.',
      'Pindutin ang palitan. Gamitin na ang bagong PIN sa susunod na login.',
    ],
    go: 'settings',
  },
  {
    id: 'auto-lock', cat: 'start',
    q: 'Bakit biglang nag-lock o nag-sign out ang app?',
    alt: ['auto sign out', 'nag logout', 'nag lock', 'biglang nawala', 'session expired', 'idle', 'walang galaw'],
    a: 'Kusang nagla-lock ang app kapag walang galaw nang ilang minuto (15 minuto ang default). Proteksyon ito para walang makakita ng records kapag umalis ka sa computer.',
    steps: ['Mag-login ulit gamit ang PIN at email code.', 'Mapapalitan ang bilang ng minuto sa Settings › Accounts at security.'],
    tip: 'Isang minuto bago mag-lock, may lalabas na babala sa ibaba. Igalaw lang ang mouse para hindi mag-lock.',
    go: 'settings',
  },
  {
    id: 'lock-now', cat: 'start',
    q: 'Paano i-lock ang app kapag aalis ako sandali?',
    alt: ['lock session', 'i lock', 'aalis', 'break', 'lunch', 'sign out', 'logout', 'mag log out'],
    a: 'Pindutin ang "I-lock ang Session" sa ibaba ng kaliwang menu. Kailangan ulit ng PIN at email code para makabalik.',
  },
  {
    id: 'language', cat: 'start',
    q: 'Paano gawing Tagalog o English ang app?',
    alt: ['language', 'tagalog', 'english', 'filipino', 'wika', 'translate', 'salin'],
    a: 'Sa ibaba ng kaliwang menu, pindutin ang language button (English / Filipino). Agad magbabago ang mga salita sa buong app.',
  },
  {
    id: 'dark-text', cat: 'start',
    q: 'Paano palakihin ang letra o gawing dark mode?',
    alt: ['dark mode', 'light mode', 'malaking letra', 'text size', 'font', 'zoom', 'maliit letra', 'malabo', 'madilim', 'maliwanag'],
    a: 'Nasa ibaba ng kaliwang menu ang mga button para sa Dark/Light mode at sa laki ng letra (A, A+, A++). Pindutin lang ang gusto mo.',
  },
  {
    id: 'quick-guide', cat: 'start',
    q: 'May gabay ba para sa bagong user?',
    alt: ['guide', 'tutorial', 'quick guide', 'paano gamitin', 'bago lang', 'new user', 'gabay', 'turo'],
    a: 'Oo. Pindutin ang "❓ Paano Gamitin" sa itaas. May 6 na hakbang doon ng araw-araw na trabaho. Pindutin ang isang hakbang para buksan agad ang page.',
    go: 'guide',
  },
  {
    id: 'colors', cat: 'start',
    q: 'Ano ang ibig sabihin ng mga kulay?',
    alt: ['kulay', 'color', 'pula', 'dilaw', 'berde', 'red', 'yellow', 'green', 'legend', 'badge'],
    a: 'Pareho ang ibig sabihin ng mga kulay sa buong app:',
    steps: [
      '🔴 Pula: serious o major na offense, o naghihintay nang 7+ araw.',
      '🟡 Dilaw: ika-2 minor (bantayan), o naghihintay nang 3–6 araw.',
      '🟢 Berde: tapos na, o dumalo ang magulang.',
    ],
    tip: 'May legend (paliwanag ng kulay) sa ilalim ng bawat listahan.',
  },
  {
    id: 'numbers', cat: 'start',
    q: 'Ano ang mga numero sa tabi ng menu?',
    alt: ['badge', 'numero', 'number sa menu', 'bilang', 'count', 'pula na numero'],
    a: 'Ipinapakita ng numero kung ilan ang naghihintay: bukas na kaso (Cases), conference ngayong araw (Parents), concern na hindi pa nare-review (Concerns), at estudyanteng naghihintay sa counselor (Counselor). Itapat ang mouse para makita ang paliwanag.',
  },
  {
    id: 'undo', cat: 'start', top: true,
    q: 'Nagkamali ako ng pindot. Paano i-undo?',
    alt: ['undo', 'mali pindot', 'nagkamali', 'ibalik', 'bawiin', 'cancel', 'revert', 'mali'],
    a: 'Pagkatapos ng karamihan ng aksyon, may lalabas na mensahe sa ibaba na may "I-undo" na button. Pindutin agad iyon para ibalik ang dati.',
    tip: 'Kung wala nang Undo, buksan ulit ang record at itama ito. Lahat ng pagbabago ay naitatala sa Audit Trail.',
  },
  {
    id: 'internet', cat: 'start',
    q: 'Gumagana ba ang system kahit walang internet?',
    alt: ['offline', 'walang internet', 'no internet', 'wifi', 'nawalan ng internet', 'mahina internet'],
    a: 'Hindi. Kailangan ng internet dahil nasa cloud ang records, para iisa ang data kahit saang computer. Kapag nawala ang internet, lalabas ang "Hindi na-save. I-check ang internet". Hintayin bumalik ang internet, tapos subukan ulit.',
  },

  // ───────────── MGA KASO ─────────────
  {
    id: 'new-case', cat: 'cases', top: true,
    q: 'Paano mag-record ng bagong kaso?',
    alt: ['new case', 'bagong kaso', 'record case', 'add case', 'mag log', 'offense', 'violation', 'insidente', 'report', 'gumawa kaso', 'magdagdag kaso'],
    a: 'Ganito mag-record ng bagong kaso:',
    steps: [
      'Pindutin ang "+ Bagong Kaso" sa itaas.',
      'Hanapin at piliin ang estudyante. Kusang lalabas ang grade, section at magulang mula sa master list.',
      'Piliin ang offense. Kusang bibilangin ng system kung pang-ilan na ito at magmumungkahi ng sanction mula sa handbook.',
      'Ilagay ang petsa, lugar at mga nakakita (kung mayroon).',
      'Pindutin ang I-save. Lalabas ang kaso sa listahan ng mga kaso.',
    ],
    tip: 'Puwedeng isang insidente para sa ilang estudyante. Idagdag lang sila isa-isa.',
    go: 'new-case',
  },
  {
    id: 'student-missing', cat: 'cases',
    q: 'Wala sa listahan ang estudyante. Paano?',
    alt: ['wala estudyante', 'not in the list', 'hindi makita estudyante', 'student not found', 'bagong estudyante', 'transferee'],
    a: 'Sa pagpili ng estudyante, may "Wala sa listahan? + Magdagdag ng estudyante". Pindutin iyon, punan ang form, at i-save. Magagamit agad ang estudyante sa kaso.',
    go: 'students',
  },
  {
    id: 'case-steps', cat: 'cases', top: true,
    q: 'Ano ang 7 hakbang ng kaso? (step by step)',
    alt: ['7 steps', 'hakbang', 'flow', 'proseso ng kaso', 'case flow', 'next step', 'susunod na gagawin', 'paano tapusin kaso', 'stepper'],
    a: 'Bawat kaso ay dumadaan sa 7 hakbang. Sa loob ng kaso, laging nakasulat ang "Susunod na gagawin" at may isang button para dito:',
    steps: [
      'Na-report: naitala ang kaso.',
      'Tinawag ang estudyante: pindutin ang "✓ Natawag na ang estudyante".',
      'Paliwanag: isulat ang paliwanag niya, o ipa-type sa kanya sa Statement Station.',
      'Alam ng magulang: piliin kung paano nalaman (conference, tawag, SMS, sulat, email).',
      'Desisyon: isulat ang desisyon at sanction (may mungkahi mula sa handbook).',
      'Follow-up: pindutin ang "✓ Nagsimula na" kapag sinimulan na ang sanction.',
      'Sarado: pindutin ang "✓ Isara ang kaso" kapag tapos na lahat.',
    ],
    tip: 'May "I-undo" pagkatapos ng bawat hakbang.',
    go: 'cases',
  },
  {
    id: 'open-case', cat: 'cases',
    q: 'Paano buksan at tingnan ang buong detalye ng kaso?',
    alt: ['open case', 'buksan kaso', 'detalye', 'details', 'tingnan kaso', 'view case', 'case details'],
    a: 'Sa listahan ng mga kaso, pindutin ang card ng kaso, o ang "⋯" tapos "Buksan ang buong kaso". Makikita mo ang 7 hakbang, ang history, ang ebidensya at ang mga form.',
    go: 'cases',
  },
  {
    id: 'statement-station', cat: 'cases', top: true,
    q: 'Paano ipa-type sa estudyante ang kanyang salaysay?',
    alt: ['statement station', 'salaysay', 'malayang salaysay', 'statement', 'ipa type', 'pa type sa bata', 'written statement', 'paliwanag ng estudyante', 'kiosk'],
    a: 'Gamitin ang Statement Station. Ang estudyante mismo ang magta-type, at naka-lock ang screen:',
    steps: [
      'Buksan ang kaso. Dapat nasa hakbang na "Paliwanag".',
      'Pindutin ang "🖥 Ipa-type sa estudyante".',
      'Ibigay ang computer sa estudyante. Pangalan at grade lang niya ang makikita, walang ibang record.',
      'Sasagutin niya ang 4 na tanong at iche-check na totoo ang isinulat niya, tapos pipindutin ang "Ipasa".',
      'Kunin ang computer at i-type ang PIN ng staff para ma-unlock.',
    ],
    tip: 'Kung kailangang ihinto, pindutin ang "Staff: ihinto nang hindi sine-save" at i-type ang PIN. Walang mase-save.',
    go: 'cases',
  },
  {
    id: 'station-stuck', cat: 'cases',
    q: 'Paano lumabas sa Statement Station?',
    alt: ['station locked', 'hindi makalabas', 'naka lock screen', 'unlock station', 'stuck', 'naipit', 'exit station'],
    a: 'Pindutin ang "Staff: i-unlock" (o "Staff: ihinto nang hindi sine-save") at i-type ang 6-digit na PIN ng app. Hindi gumagana ang Esc o ang pagsara ng window habang naka-lock, para hindi makalabas ang estudyante.',
    tip: 'Pagkatapos ng 5 maling PIN, naka-lock ito nang 1 minuto.',
  },
  {
    id: 'print-form', cat: 'cases', top: true,
    q: 'Paano mag-print ng call slip o ibang form?',
    alt: ['print', 'i print', 'call slip', 'form', 'behavioral contract', 'kasunduan', 'suspension letter', 'conference form', 'printer', 'papel'],
    a: 'Ganito mag-print ng form:',
    steps: [
      'Sa listahan ng mga kaso, pindutin ang "⋯" ng kaso, o buksan ang kaso.',
      'Piliin ang "🖨️ Mag-print ng form…".',
      'Piliin ang form: Call Slip, Parent Conference Form, Behavioral Contract, Kasunduan o Suspension Letter.',
      'Punan ang kailangan (hal. petsa at oras), tapos pindutin ang I-print.',
    ],
    tip: 'Kusang nakalagay sa form ang pangalan, grade, case number at ang salaysay ng estudyante.',
    go: 'cases',
  },
  {
    id: 'evidence', cat: 'cases',
    q: 'Paano maglagay ng ebidensya (litrato o PDF)?',
    alt: ['evidence', 'ebidensya', 'attach', 'upload', 'litrato', 'picture', 'photo', 'pdf', 'screenshot', 'file'],
    a: 'Sa loob ng kaso, sa bahaging Ebidensya:',
    steps: [
      'Pindutin ang pagpili ng file. JPG, PNG o PDF lang, hanggang 10 MB.',
      'Maglagay ng maikling tala (hal. "Litrato sa gate").',
      'Pindutin ang "I-upload". Lalabas ang file sa listahan ng ebidensya.',
    ],
    tip: 'Pribado ang ebidensya. Sa loob lang ng app ito mabubuksan.',
    go: 'cases',
  },
  {
    id: 'sanction', cat: 'cases',
    q: 'Paano malalaman ang tamang sanction?',
    alt: ['sanction', 'parusa', 'handbook', 'penalty', 'anong parusa', 'suggested sanction'],
    a: 'Kusang nagmumungkahi ang system ng sanction mula sa handbook, batay sa offense at kung pang-ilan na ito (1st, 2nd o 3rd). Lalabas ito sa hakbang na "Desisyon". Puwede mo itong baguhin bago i-save.',
    tip: 'Ang listahan ng offense at sanction ay nasa Settings › Offenses at patakaran.',
  },
  {
    id: 'sanction-waiting', cat: 'cases',
    q: 'Bakit "naghihintay" ang sanction?',
    alt: ['pending sanction', 'naghihintay sanction', 'waiting', 'hindi magsimula sanction', 'sanction waiting'],
    a: 'Ayon sa patakaran, hindi puwedeng simulan ang sanction hangga\'t hindi pa alam ng magulang. Kapag naitala mo na ang hakbang na "Alam ng magulang", kusang magsisimula ang sanction.',
    go: 'cases',
  },
  {
    id: 'escalation', cat: 'cases',
    q: 'Bakit naging Serious ang isang minor na offense?',
    alt: ['serious', 'escalate', 'minor naging serious', '2 minor', 'sunod sunod', 'early intervention', 'babala'],
    a: 'Ayon sa handbook, ang 2 minor na sunod-sunod ay itinuturing na Serious. Kusa itong binibilang ng system. Bago pa mangyari, may lumalabas na early intervention alert para makausap agad ang estudyante.',
    tip: 'Ang bilang na ito (2) ay mapapalitan sa Settings › Offenses at patakaran.',
  },
  {
    id: 'close-case', cat: 'cases',
    q: 'Paano isara ang kaso?',
    alt: ['close case', 'isara kaso', 'tapos na kaso', 'resolved', 'mark as done', 'done'],
    a: 'Sa loob ng kaso, kapag nasa huling hakbang na, pindutin ang "✓ Isara ang kaso". Magpapakita muna ito ng kumpirmasyon. Puwede ring "⋯" › "Tapos na" sa listahan.',
    tip: 'May I-undo kapag nagkamali.',
    go: 'cases',
  },
  {
    id: 'find-case', cat: 'cases',
    q: 'Paano hanapin ang kaso ng isang estudyante?',
    alt: ['search', 'hanap', 'hanapin', 'find', 'filter', 'history', 'kasaysayan', 'record ng estudyante'],
    a: 'I-type ang pangalan o student number sa search box sa itaas (sa Dashboard o Cases). Sa Cases, may filter din ayon sa grade, panahon at kalagayan (overdue o naghihintay).',
    go: 'cases',
  },
  {
    id: 'edit-case', cat: 'cases',
    q: 'Paano itama ang mali sa kaso?',
    alt: ['edit case', 'itama', 'mali sa kaso', 'baguhin kaso', 'correct', 'change case'],
    a: 'Buksan ang kaso at pindutin ang "I-edit". Itama ang petsa, lugar o detalye, tapos i-save. Naitatala sa Audit Trail ang bawat pagbabago.',
    go: 'cases',
  },
  {
    id: 'overdue', cat: 'cases',
    q: 'Ano ang ibig sabihin ng "overdue" na kaso?',
    alt: ['overdue', 'matagal na kaso', 'late', 'lagpas', 'needs attention', 'kailangang aksyunan'],
    a: 'Ang overdue ay kasong bukas pa nang higit sa itinakdang araw (14 na araw ang default). Lumalabas ito sa "Kailangang aksyunan" sa Dashboard. Pindutin ito para makita ang listahan.',
    go: 'dashboard',
  },

  // ───────────── MAGULANG AT CONFERENCE ─────────────
  {
    id: 'call-parent', cat: 'parents', top: true,
    q: 'Paano ipatawag ang magulang? (step by step)',
    alt: ['ipatawag magulang', 'tawag magulang', 'summon parent', 'call parent', 'conference', 'papuntahin magulang', 'imbitahin magulang', 'paano itawag ang magulang', 'tawagin nanay', 'tatay'],
    a: 'Ganito ipatawag ang magulang para sa conference:',
    steps: [
      'Pumunta sa Parents › "Kailangang i-schedule". Nandito ang mga kasong wala pang conference.',
      'Pindutin ang "I-schedule" sa kaso. Magmumungkahi ang system ng bakanteng petsa at oras ayon sa office hours at schedule ng counselor.',
      'Piliin ang petsa at oras, tapos i-save.',
      'Ipadala ang abiso sa magulang (SMS at/o email). Puwede ring mag-print ng Call Slip para sa estudyante.',
      'Tawagan ang magulang bago ang araw para kumpirmahin.',
    ],
    tip: 'Hindi kailanman isinasama ang offense sa text o email. Petsa, oras at lugar lang.',
    go: 'parents-schedule',
  },
  {
    id: 'after-text', cat: 'parents', top: true,
    q: 'Ano ang susunod pagkatapos ko mag-send ng text?',
    alt: ['after text', 'after send', 'pagkatapos mag text', 'naipadala na', 'next after sms', 'ano susunod', 'after sending'],
    a: 'Pagkatapos ipadala ang abiso:',
    steps: [
      'Tingnan ang Parents › "Mga mensahe" para makita kung "Naipadala" o "Hindi naipadala".',
      'Kung hindi naipadala, tawagan ang magulang at i-log ang tawag.',
      'Tawagan ang magulang isang araw bago ang conference para kumpirmahin.',
      'Sa araw mismo, pindutin ang "Dumalo" o "Hindi dumalo" sa Dashboard.',
      'Kapag dumalo, kusang matatapos ang hakbang na "Alam ng magulang" sa kaso.',
    ],
    tip: 'Sa ngayon, hindi pa naka-setup ang SMS kaya "Hindi naipadala" ang lalabas sa SMS. Gumamit muna ng tawag o email.',
    go: 'parents-messages',
  },
  {
    id: 'send-text', cat: 'parents',
    q: 'Paano mag-text o mag-email sa magulang?',
    alt: ['text parent', 'i text', 'sms', 'email', 'gmail', 'mensahe', 'message', 'abiso', 'notice', 'padalhan'],
    a: 'Ganito magpadala ng abiso:',
    steps: [
      'Sa listahan ng mga kaso, pindutin ang "⋯" › "I-text ang magulang", o "I-text" sa Follow-ups.',
      'Piliin kung SMS, email, o pareho.',
      'Basahin ang mensahe. Nakahanda na ito mula sa SMS template. Puwede mo itong baguhin.',
      'Pindutin ang send. Makikita ang resulta sa Parents › "Mga mensahe".',
    ],
    tip: 'Kapag may offense o pribadong salita sa mensahe, babalaan ka ng system bago ipadala.',
    go: 'parents-messages',
  },
  {
    id: 'attendance', cat: 'parents', top: true,
    q: 'Paano markahan kung dumalo o hindi ang magulang?',
    alt: ['attended', 'dumalo', 'markahan dumalo', 'did not attend', 'attendance', 'dumating magulang', 'pumunta magulang', 'mark attendance'],
    a: 'Sa Dashboard, sa listahan ng conference ngayong araw:',
    steps: [
      'Pindutin ang "Dumalo" kapag dumating ang magulang.',
      'Pindutin ang "Hindi dumalo" kapag hindi dumating. Pumili ng dahilan (hal. may trabaho).',
      'Kapag hindi dumalo, kusang gagawa ang system ng follow-up para tawagan ang magulang.',
    ],
    tip: 'May I-undo kung nagkamali ng pindot.',
    go: 'dashboard',
  },
  {
    id: 'no-show', cat: 'parents',
    q: 'Hindi dumating ang magulang. Ano ang gagawin?',
    alt: ['hindi dumating', 'hindi dumalo', 'hindi pumunta', 'absent parent', 'no show', 'hindi sumipot', 'ulit schedule', 'balik schedule', 'hindi dumalo ang nanay', 'hindi dumalo ang magulang', 'hindi dumalo ang tatay'],
    a: 'Ganito kapag hindi dumalo ang magulang:',
    steps: [
      'Pindutin ang "Hindi dumalo" at piliin ang dahilan.',
      'Pumunta sa Parents › Follow-ups. Nandoon na ang gawain na tawagan ang magulang.',
      'Tawagan o i-text ang magulang, at i-log ang tawag.',
      'Mag-schedule ulit ng bagong petsa.',
    ],
    tip: 'Ang magulang na hindi dumalo dati ay minamarkahan bilang "priority follow-up" para mas maagang tawagan. Staff lang ang nakakakita nito.',
    go: 'parents-followups',
  },
  {
    id: 'log-call', cat: 'parents',
    q: 'Paano i-log ang tawag sa magulang?',
    alt: ['log call', 'i log tawag', 'tumawag', 'phone call', 'call log', 'tinawagan', 'record tawag'],
    a: 'Sa Dashboard o sa Parents › Follow-ups, pindutin ang "I-log ang Tawag" sa tabi ng magulang. Piliin ang resulta (hal. sumagot, hindi sumagot) at maglagay ng maikling tala. I-save.',
    tip: 'Naitatala ang bawat tawag, kaya makikita kung ilang beses nang na-contact ang magulang.',
    go: 'parents-followups',
  },
  {
    id: 'reschedule', cat: 'parents',
    q: 'Paano ilipat ang petsa ng conference?',
    alt: ['reschedule', 'ilipat petsa', 'change date', 'move conference', 'palitan oras'],
    a: 'Sa Parents › "Mga conference", hanapin ang conference at pindutin ang I-schedule (o baguhin ang petsa). Pumili ng bagong petsa at oras, tapos i-save. Magpadala ulit ng abiso sa magulang.',
    go: 'parents-conferences',
  },
  {
    id: 'walk-in', cat: 'parents',
    q: 'Dumating ang magulang nang walang schedule. Paano?',
    alt: ['walk in', 'walk-in', 'biglang dumating', 'walang appointment', 'walang schedule'],
    a: 'Pindutin ang "Walk-in Parent" sa itaas ng Dashboard. Piliin ang estudyante at itala ang conference. Kusang matatapos ang hakbang na "Alam ng magulang" sa kaso.',
    go: 'dashboard',
  },
  {
    id: 'smart-schedule', cat: 'parents',
    q: 'Paano pumipili ng petsa ang system?',
    alt: ['suggested schedule', 'smart scheduling', 'bakanteng oras', 'available', 'slot', 'mungkahing petsa'],
    a: 'Nagmumungkahi ang system ng bakanteng oras batay sa office days at hours, mga closed day (holiday), at schedule ng counselor. Hindi ito nagdo-double booking. Puwede ka pa ring pumili ng ibang petsa.',
    tip: 'Ang mga oras at holiday ay nasa Settings › Araw at oras ng office.',
    go: 'parents-schedule',
  },
  {
    id: 'reminder', cat: 'parents',
    q: 'May reminder ba sa magulang bago ang conference?',
    alt: ['reminder', 'paalala', 'one day before', 'isang araw bago', 'remind parent'],
    a: 'Oo. Magpapadala ang system ng SMS reminder isang araw bago ang conference, kapag naka-setup na ang SMS. Sa ngayon, tawagan muna ang magulang isang araw bago.',
  },
  {
    id: 'sms-not-sent', cat: 'parents',
    q: 'Bakit "Hindi naipadala" ang SMS?',
    alt: ['sms failed', 'not sent', 'hindi naipadala', 'hindi na send', 'walang text', 'sms error', 'philsms'],
    a: 'Hindi pa naka-setup ang SMS service (PhilSMS) sa system, kaya tapat nitong sinasabing "Hindi naipadala". Habang hinihintay ito, tawagan ang magulang o gamitin ang email. Kapag naka-setup na, kusa nang ipapadala ang SMS.',
    go: 'parents-messages',
  },
  {
    id: 'parent-number', cat: 'parents',
    q: 'Paano palitan ang number ng magulang?',
    alt: ['parent number', 'cellphone number', 'mobile number', 'palitan number', 'mali number', 'contact', 'emergency contact'],
    a: 'Pumunta sa Cases › Students, hanapin ang estudyante at i-edit. Palitan ang mobile number ng magulang (09 + 9 na numero, kabuuang 11), tapos i-save.',
    tip: 'Sasabihin agad ng form kung mali ang format ng number.',
    go: 'students',
  },

  // ───────────── ESTUDYANTE AT MASTER LIST ─────────────
  {
    id: 'import-masterlist', cat: 'students', top: true,
    q: 'Paano i-upload ang master list ng estudyante?',
    alt: ['import', 'master list', 'masterlist', 'upload excel', 'excel', 'csv', 'enrollment list', 'listahan estudyante'],
    a: 'Gawin ito tuwing simula ng school year:',
    steps: [
      'Pumunta sa Cases › Master list.',
      'Pumili ng Excel (.xlsx) o CSV file ng enrollment list.',
      'Titingnan ng system ang bawat row. Mamarkahan ang may kulang na detalye o dobleng student number.',
      'Ayusin o alisin ang may problema, tapos pindutin ang import.',
    ],
    tip: 'Ang mga estudyanteng nasa system na ay ia-update lang, hindi madodoble.',
    go: 'masterlist',
  },
  {
    id: 'add-student', cat: 'students',
    q: 'Paano magdagdag o mag-edit ng estudyante?',
    alt: ['add student', 'magdagdag estudyante', 'edit student', 'bagong estudyante', 'baguhin estudyante', 'student info'],
    a: 'Sa Cases › Students, pindutin ang "Magdagdag ng estudyante" para sa bago, o pindutin ang estudyante para i-edit. Punan ang form at i-save. Sasabihin agad ng form kung may kulang o mali.',
    go: 'students',
  },
  {
    id: 'move-up', cat: 'students', top: true,
    q: 'Paano iakyat ang mga estudyante sa bagong school year?',
    alt: ['move up', 'umakyat', 'school year', 'grade 11 to 12', 'promote', 'bagong taon', 'graduate', 'graduated', 'ict 11 to ict 12'],
    a: 'Gamitin ang "Umakyat ng school year…" sa Cases › Students:',
    steps: [
      'Pindutin ang "Umakyat ng school year…".',
      'Basahin ang buod: ilan ang aakyat sa Grade 12 at ilan ang magiging graduate.',
      'Pindutin ang kumpirmasyon. Aakyat ang Grade 11 sa Grade 12, at ang Grade 12 ay magiging "Not enrolled (Graduated)".',
    ],
    tip: 'May I-undo kapag nagkamali. Hindi nabubura ang mga kaso ng graduate.',
    go: 'students',
  },
  {
    id: 'not-enrolled', cat: 'students',
    q: 'Paano markahan ang estudyanteng hindi na naka-enroll?',
    alt: ['not enrolled', 'hindi na enrolled', 'transfer', 'lumipat', 'dropped', 'tumigil', 'umalis', 'stop'],
    a: 'Sa Cases › Students, buksan ang estudyante at piliin ang "Hindi na naka-enroll". Pumili ng dahilan (graduated, lumipat, o tumigil). Hindi nabubura ang kanyang records.',
    go: 'students',
  },
  {
    id: 'student-history', cat: 'students',
    q: 'Paano makita ang lahat ng offense ng isang estudyante?',
    alt: ['student history', 'record ng estudyante', 'ilang offense', 'kasaysayan', 'profile', 'lahat ng kaso'],
    a: 'Sa Cases › Students, pindutin ang estudyante. Makikita ang lahat ng kaso niya at ang bilang ng offense. Puwede ring i-type ang pangalan sa search box.',
    go: 'students',
  },
  {
    id: 'student-fields', cat: 'students',
    q: 'Paano magdagdag o magbago ng field sa student form?',
    alt: ['student fields', 'field', 'impormasyon', 'dagdag na tanong', 'form ng estudyante', 'custom field'],
    a: 'Sa Settings › "Impormasyon ng estudyante", puwede kang magdagdag, mag-alis o magpalit ng pangalan ng mga field na hinihingi sa "Add student".',
    go: 'settings',
  },

  // ───────────── CONCERNS ─────────────
  {
    id: 'review-concern', cat: 'concerns', top: true,
    q: 'Paano i-review ang concern na pinadala ng estudyante?',
    alt: ['concern', 'report ng estudyante', 'review', 'approve', 'reject', 'student report', 'bullying report', 'sumbong'],
    a: 'Ganito i-review ang concern:',
    steps: [
      'Pumunta sa Concerns. Nasa itaas ang mga bago at urgent.',
      'Buksan ang concern at basahin ang salaysay.',
      'Pindutin ang "I-approve" kung totoo at kailangang aksyunan. Magbubukas ito ng chat sa estudyante.',
      'Pindutin ang "I-reject" kung hindi tanggap, at isulat ang dahilan. Makikita ng estudyante ang dahilan.',
    ],
    tip: 'Kapag seryoso ang concern, gumawa ng kaso para sa estudyanteng sangkot.',
    go: 'concerns',
  },
  {
    id: 'concern-chat', cat: 'concerns',
    q: 'Paano makipag-chat sa estudyante tungkol sa concern?',
    alt: ['chat', 'reply', 'sagot sa estudyante', 'message student', 'usap estudyante', 'follow up question'],
    a: 'Bubukas lang ang chat pagkatapos ma-approve ang concern. Sa Concerns › Mga chat, buksan ang chat, i-type ang sagot, at ipadala. Pindutin ang "Isara ang chat" kapag tapos na.',
    tip: 'Hindi para sa counseling o emergency ang chat. Sa office days at hours lang ito sinasagot.',
    go: 'concerns',
  },
  {
    id: 'urgent-concern', cat: 'concerns',
    q: 'Ano ang gagawin sa urgent na concern?',
    alt: ['urgent', 'emergency', 'nangyayari ngayon', 'happening now', 'apurahan', 'mabilis'],
    a: 'Nasa pinakataas ng Concerns ang urgent na concern. Basahin agad at kumilos ayon sa proseso ng paaralan. Ang "urgent" ay marka lang. Walang alarm, at ang staff lang ang makakakita nito habang naka-login.',
    go: 'concerns',
  },
  {
    id: 'confidential', cat: 'concerns',
    q: 'Ano ang "confidential" na concern?',
    alt: ['confidential', 'anonymous', 'lihim', 'hindi pangalan', 'secret', 'pribado'],
    a: 'Sa confidential na concern, ang Guidance Office lang ang nakakaalam kung sino ang nagpadala. Walang anonymous na concern: kailangang naka-register ang estudyante.',
    go: 'concerns',
  },
  {
    id: 'fake-account', cat: 'concerns',
    q: 'Paano harangin ang pekeng student account?',
    alt: ['fake account', 'pekeng account', 'block account', 'deactivate', 'harangin', 'portal account'],
    a: 'Sa Concerns, hanapin ang account at i-deactivate ito. Hindi na ito makakapag-login o makakapagpadala ng concern. Ang mga account na tugma sa master list ay may markang "nasa masterlist".',
    go: 'concerns',
  },

  // ───────────── COUNSELOR ─────────────
  {
    id: 'counselor-queue', cat: 'counselor', top: true,
    q: 'Paano ipasa sa counselor ang estudyante?',
    alt: ['counselor', 'referral', 'refer', 'ipasa sa counselor', 'counseling', 'severe', 'paulit ulit'],
    a: 'Kusang inilalagay ng system sa listahan ng counselor ang mga kasong malala o paulit-ulit. Para mag-schedule:',
    steps: [
      'Pumunta sa Counselor.',
      'Sa "Kailangang makausap ng counselor", pindutin ang "I-schedule sa counselor" sa estudyante.',
      'Pumili ng petsa sa araw ng counselor, tapos i-save.',
      'Kapag nakausap na, markahan bilang "Nakausap na ng counselor".',
    ],
    tip: 'Puwede ring magdagdag nang mano-mano gamit ang "Magdagdag ng estudyante sa counselor".',
    go: 'counselor',
  },
  {
    id: 'counselor-days', cat: 'counselor',
    q: 'Paano itakda ang araw ng counselor?',
    alt: ['counselor days', 'araw ng counselor', 'schedule counselor', 'kailan counselor'],
    a: 'Sa Counselor, pindutin ang "I-set ang araw ng counselor", o pumunta sa Settings › Schedule ng mga tao. Piliin ang mga araw at i-save. Ito ang ginagamit sa pagmumungkahi ng petsa.',
    go: 'counselor',
  },
  {
    id: 'counselor-remove', cat: 'counselor',
    q: 'Paano alisin ang estudyante sa listahan ng counselor?',
    alt: ['remove counselor', 'alisin counselor', 'hindi na kailangan', 'tanggalin sa listahan'],
    a: 'Sa Counselor, pindutin ang "Alisin" sa estudyante at isulat kung bakit. May I-undo kapag nagkamali.',
    go: 'counselor',
  },

  // ───────────── REPORTS AT AUDIT ─────────────
  {
    id: 'monthly-report', cat: 'reports', top: true,
    q: 'Paano gumawa ng monthly report?',
    alt: ['monthly report', 'report', 'buwanang report', 'ulat', 'summary', 'print report', 'csv', 'excel report'],
    a: 'Kusang ginagawa ng system ang buod bawat buwan:',
    steps: [
      'Pumunta sa Reports.',
      'Piliin ang buwan sa monthly report.',
      'Pindutin ang "I-print" para sa papel, o ang CSV para buksan sa Excel.',
    ],
    go: 'reports',
  },
  {
    id: 'graphs', cat: 'reports',
    q: 'Paano makita kung dumadami o kumokonti ang kaso?',
    alt: ['graph', 'trend', 'tumataas', 'bumababa', 'statistics', 'stats', 'chart', 'dumami', 'kumonti'],
    a: 'Sa Reports › Overview, may mga graph ng kaso bawat buwan, ng mga naisarang kaso, at ng pagdalo ng magulang. Ang ▲ ay pagtaas at ang ▼ ay pagbaba kumpara sa nakaraang buwan.',
    go: 'reports',
  },
  {
    id: 'recidivism', cat: 'reports',
    q: 'Paano makita ang mga estudyanteng umuulit ng offense?',
    alt: ['recidivism', 'umuulit', 'repeat offense', 'paulit ulit', 'inulit'],
    a: 'Sa Reports, makikita ang mga estudyanteng umulit ng parehong offense pagkatapos mabigyan ng sanction.',
    go: 'reports',
  },
  {
    id: 'handover', cat: 'reports',
    q: 'Paano mag-iwan ng handover note para sa ibang staff?',
    alt: ['handover', 'note', 'tala', 'iiwan', 'pasa sa ibang staff', 'kapalit', 'leave'],
    a: 'Sa Reports › Buod at handover notes, hanapin ang kaso at isulat ang tala (hal. "Tinawagan ang nanay, babalik sa Biyernes"). I-save. Makikita ito ng susunod na staff para maituloy ang kaso.',
    go: 'reports',
  },
  {
    id: 'audit', cat: 'reports',
    q: 'Paano makita kung sino ang nagbago ng record?',
    alt: ['audit', 'audit trail', 'history ng pagbabago', 'sino nagbago', 'log', 'who changed', 'record changes'],
    a: 'Pumunta sa Audit Trail. Nakalista ang bawat pagbabago: ano ang binago, ang dati at bagong laman, sino, at kailan. Gamitin ang Hanapin. Hindi ito mae-edit o mabubura.',
    go: 'audit',
  },

  // ───────────── SETTINGS ─────────────
  {
    id: 'settings-open', cat: 'settings', top: true,
    q: 'Paano buksan at gamitin ang Settings? (step by step)',
    alt: ['settings', 'setting', 'next step sa settings', 'ayos settings', 'configuration', 'saan settings'],
    a: 'Naka-PIN ang Settings para hindi mabago ng iba:',
    steps: [
      'Pindutin ang Settings sa kaliwa at i-type ang 6-digit na PIN.',
      'Pumili ng bahagi: Araw at oras ng office, Schedule ng mga tao, Offenses at patakaran, Impormasyon ng estudyante, SMS templates, Accounts at security, o Backup.',
      'Baguhin ang kailangan at pindutin ang I-save.',
      'Basahin ang "Bago → Pagkatapos" na kumpirmasyon, tapos pindutin ang Oo.',
    ],
    tip: 'May I-undo pagkatapos mag-save. Naitatala sa Audit Trail ang bawat pagbabago.',
    go: 'settings',
  },
  {
    id: 'office-hours', cat: 'settings',
    q: 'Paano baguhin ang office days at oras?',
    alt: ['office hours', 'oras ng office', 'office days', 'lunch', 'bukas na araw', 'schedule ng office'],
    a: 'Sa Settings › "Araw at oras ng office", piliin ang mga araw, ang oras ng simula at tapos, ang lunch, at ang haba ng bawat slot. I-save. Ito ang ginagamit ng system sa pagmumungkahi ng petsa.',
    go: 'settings',
  },
  {
    id: 'holiday', cat: 'settings',
    q: 'Paano maglagay ng holiday o walang pasok?',
    alt: ['holiday', 'walang pasok', 'closed day', 'sarado', 'suspension ng klase', 'bagyo', 'no class'],
    a: 'Sa Settings › "Araw at oras ng office", sa Closed days, ilagay ang petsa at dahilan (hal. "Holiday"), tapos idagdag. Hindi na magmumungkahi ang system ng conference sa araw na iyon.',
    go: 'settings',
  },
  {
    id: 'people-schedule', cat: 'settings',
    q: 'Paano ilagay ang schedule ng principal o ibang tao?',
    alt: ['principal', 'schedule ng tao', 'people schedule', 'adviser schedule', 'counselor schedule'],
    a: 'Sa Settings › "Schedule ng mga tao", pindutin ang magdagdag, ilagay ang pangalan, at piliin ang mga araw na available siya. I-save.',
    go: 'settings',
  },
  {
    id: 'offense-list', cat: 'settings',
    q: 'Paano magdagdag o magbago ng offense sa handbook?',
    alt: ['add offense', 'offense list', 'handbook', 'bagong offense', 'baguhin sanction', 'violation list'],
    a: 'Sa Settings › "Offenses at patakaran", pindutin ang magdagdag ng offense. Ilagay ang pangalan, antas, at sanction para sa 1st, 2nd at 3rd. I-save. Ang inalis na offense ay hindi na mapipili, pero hindi nabubura ang mga lumang kaso.',
    go: 'settings',
  },
  {
    id: 'sms-template', cat: 'settings',
    q: 'Paano baguhin ang mensahe na ipinapadala sa magulang?',
    alt: ['sms template', 'template', 'mensahe', 'baguhin text', 'message template', 'wording'],
    a: 'Sa Settings › "SMS templates", baguhin ang mensahe. Gamitin ang {student} para sa pangalan ng estudyante at {when} para sa petsa at oras. Bawal maglagay ng offense. Babalaan ka ng system kapag mayroon.',
    tip: 'Ang 1 SMS ay hanggang 160 letra lang. Ipinapakita ang bilang habang nagta-type.',
    go: 'settings',
  },
  {
    id: 'add-staff', cat: 'settings',
    q: 'Paano magdagdag ng account para sa ibang staff?',
    alt: ['add staff', 'bagong staff', 'account', 'user', 'counselor account', 'email ng staff'],
    a: 'Sa Settings › "Accounts at security", pindutin ang magdagdag ng staff. Ilagay ang pangalan at email niya, tapos i-save. Gagamitin niya ang email na iyon sa login.',
    go: 'settings',
  },
  {
    id: 'backup', cat: 'settings',
    q: 'Paano mag-backup ng data?',
    alt: ['backup', 'download data', 'i save lahat', 'kopya', 'export', 'retention'],
    a: 'Sa Settings › "Backup at retention", pindutin ang Backup. Mada-download ang isang file na may lahat ng records. Itago ito sa ligtas na lugar (hal. naka-lock na USB).',
    tip: 'Huwag ibahagi ang backup file. Pribadong data ng estudyante ang laman nito.',
    go: 'settings',
  },

  // ───────────── MAY PROBLEMA ─────────────
  {
    id: 'not-saved', cat: 'problems', top: true,
    q: '"Hindi na-save" ang lumabas. Ano ang gagawin?',
    alt: ['not saved', 'hindi na save', 'error', 'ayaw mag save', 'failed', 'nag error', 'save failed'],
    a: 'Kadalasan, internet ang dahilan:',
    steps: [
      'I-check kung may internet ang computer.',
      'Pindutin ulit ang I-save. Nandoon pa rin ang tinype mo.',
      'Kung ayaw pa rin, i-restart ang app at subukan ulit.',
      'Kung tuloy pa rin, sabihin sa IT kung ano ang lumabas na mensahe.',
    ],
  },
  {
    id: 'no-code', cat: 'problems',
    q: 'Walang dumating na code sa email. Ano ang gagawin?',
    alt: ['no code', 'walang code', 'otp not received', 'hindi dumating email', 'email code', 'spam'],
    a: 'Subukan ito:',
    steps: [
      'I-check ang Spam o Promotions folder ng email.',
      'I-check kung tama ang email na tinype.',
      'Hintayin nang 1 minuto, tapos humingi ng bagong code.',
      'I-check ang internet.',
    ],
  },
  {
    id: 'slow', cat: 'problems',
    q: 'Mabagal ang app. Ano ang gagawin?',
    alt: ['slow', 'mabagal', 'lag', 'nagla lag', 'loading', 'matagal mag load', 'hang'],
    a: 'Subukan ito:',
    steps: [
      'Isara ang ibang program na hindi ginagamit (hal. laro o maraming browser tab).',
      'I-check ang bilis ng internet.',
      'I-restart ang app.',
    ],
    tip: 'Ginawa ang system para tumakbo kahit sa Core i3 na may 4 GB RAM.',
  },
  {
    id: 'print-problem', cat: 'problems',
    q: 'Ayaw mag-print. Ano ang gagawin?',
    alt: ['print problem', 'ayaw mag print', 'printer error', 'walang lumalabas', 'printer not working'],
    a: 'I-check kung naka-on at may papel ang printer, at kung ito ang napili sa print window. Subukan ulit ang "Mag-print ng form…". Kung ayaw pa rin, i-restart ang printer.',
  },
  {
    id: 'wrong-student', cat: 'problems',
    q: 'Naitala ko sa maling estudyante ang kaso. Paano?',
    alt: ['wrong student', 'maling estudyante', 'mali estudyante', 'nagkamali pangalan'],
    a: 'Kung kagagawa lang, pindutin ang "I-undo". Kung hindi na, buksan ang kaso, pindutin ang "I-edit", at itama ito. Naitatala sa Audit Trail ang pagwawasto.',
    go: 'cases',
  },
  {
    id: 'privacy', cat: 'problems',
    q: 'Sino ang puwedeng makakita ng records?',
    alt: ['privacy', 'data privacy', 'sino makakakita', 'confidential records', 'ra 10173', 'magulang makikita', 'estudyante makikita'],
    a: 'Ang Guidance staff lang na may account ang makakakita ng mga kaso. Hindi makikita ng estudyante, magulang, teacher o principal ang anumang case record. Sariling concern lang ang nakikita ng estudyante sa portal. Hindi isinasama ang offense sa text o email sa magulang.',
  },
  {
    id: 'not-in-system', cat: 'problems',
    q: 'Wala sa system ang hinahanap kong feature. Ano ang gagawin?',
    alt: ['missing feature', 'wala feature', 'hindi kaya', 'gusto ko', 'request'],
    a: 'May mga bagay na sadyang hindi kasama, gaya ng counseling notes, psychological testing, at access ng teacher o magulang. Para sa ibang kailangan, sabihin sa IT o sa nag-setup ng system.',
  },
];
