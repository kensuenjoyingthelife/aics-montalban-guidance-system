// Offline search for the Help Assistant: understands Taglish, English, short words and small typos.
// Nothing typed here is saved or sent anywhere.
import { HELP_KB, type HelpEntry } from './helpKB';
import { HELP_EN } from './helpKB.en';

/** words that carry no meaning for the search */
const STOP = new Set(
  ('paano pano panu pa no papaano paanu ano anong ang ng sa si kay ni mga ko mo ba po na nga lang yung ung yun iyon ito dito diyan ' +
    'para kung kapag pag at o din rin pa naman ako ikaw siya sila kami tayo namin natin ninyo nila akin iyo kanya ' +
    'how do does i to the a an of in on for is are can what where when why which my me it this that be with and or ' +
    'gagawin gawin ginagawa dapat kailangan need want gusto pwede puwede please pls po opo yes ok okay ' +
    'ilagay maglagay lagay ilalagay gamitin gamit makita tingnan malaman alam ibig sabihin meron mayroon may wala ').split(/\s+/),
);

/** Taglish / English / short forms → one meaning */
const SYN: Record<string, string> = {
  magulang: 'parent', nanay: 'parent', tatay: 'parent', mama: 'parent', papa: 'parent', guardian: 'parent', parents: 'parent', parent: 'parent', ina: 'parent', ama: 'parent',
  estudyante: 'student', bata: 'student', student: 'student', students: 'student', learner: 'student', anak: 'student', mag: '', aaral: 'student',
  kaso: 'case', case: 'case', cases: 'case', violation: 'offense', paglabag: 'offense', offense: 'offense', offenses: 'offense', kasalanan: 'offense',
  tawag: 'call', tawagan: 'call', tumawag: 'call', tinawagan: 'call', tawagin: 'call', ipatawag: 'summon', call: 'call', calls: 'call', phone: 'call', telepono: 'call',
  text: 'sms', itext: 'sms', texts: 'sms', sms: 'sms', mensahe: 'message', message: 'message', messages: 'message', send: 'send', padala: 'send', ipadala: 'send', magpadala: 'send', sent: 'send', naipadala: 'send',
  email: 'email', gmail: 'email', mail: 'email',
  print: 'print', iprint: 'print', printer: 'print', imprenta: 'print',
  slip: 'slip', form: 'form', forms: 'form',
  schedule: 'schedule', ischedule: 'schedule', iskedyul: 'schedule', petsa: 'date', date: 'date', araw: 'day', oras: 'time', time: 'time',
  dumalo: 'attend', attended: 'attend', attend: 'attend', dumating: 'attend', pumunta: 'attend', sumipot: 'attend', attendance: 'attend',
  pin: 'pin', password: 'pin', code: 'code', otp: 'code',
  login: 'login', signin: 'login', pumasok: 'login', logout: 'lock', signout: 'lock', lock: 'lock', ilock: 'lock',
  settings: 'settings', setting: 'settings', setup: 'settings', ayos: 'settings',
  report: 'report', reports: 'report', ulat: 'report', graph: 'graph', graphs: 'graph', chart: 'graph',
  concern: 'concern', concerns: 'concern', sumbong: 'concern',
  counselor: 'counselor', counseling: 'counselor', referral: 'counselor', refer: 'counselor',
  ebidensya: 'evidence', evidence: 'evidence', litrato: 'photo', picture: 'photo', photo: 'photo', larawan: 'photo',
  salaysay: 'statement', statement: 'statement', paliwanag: 'statement',
  import: 'import', upload: 'upload', iupload: 'upload', excel: 'excel', masterlist: 'masterlist', master: 'masterlist', listahan: 'list', list: 'list',
  undo: 'undo', ibalik: 'undo', bawiin: 'undo', mali: 'wrong', nagkamali: 'wrong', wrong: 'wrong',
  hanap: 'search', hanapin: 'search', search: 'search', find: 'search',
  isara: 'close', close: 'close', sarado: 'close', tapos: 'done', done: 'done',
  next: 'next', susunod: 'next', after: 'after', pagkatapos: 'after',
  hakbang: 'step', step: 'step', steps: 'step',
  nakalimutan: 'forgot', forgot: 'forgot', limot: 'forgot',
  palitan: 'change', baguhin: 'change', change: 'change', edit: 'edit', iedit: 'edit', itama: 'edit',
  dagdag: 'add', magdagdag: 'add', idagdag: 'add', add: 'add', bago: 'new', bagong: 'new', new: 'new',
  holiday: 'holiday', walang: 'no', pasok: 'class',
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** strip common Tagalog affixes: i-text → text, magpadala → padala, tawagan → tawag */
function stem(w: string): string {
  let x = w;
  for (const p of ['ipa', 'mag', 'nag', 'pag', 'ma', 'na']) if (x.startsWith(p) && x.length - p.length >= 4 && SYN[x.slice(p.length)]) return x.slice(p.length);
  if (x.startsWith('i') && x.length >= 5 && SYN[x.slice(1)]) return x.slice(1);
  for (const s of ['han', 'hin', 'an', 'in']) if (x.endsWith(s) && x.length - s.length >= 4 && SYN[x.slice(0, -s.length)]) return x.slice(0, -s.length);
  return x;
}

const SYN_KEYS = Object.keys(SYN).filter((k) => k.length >= 5);
/** a misspelled common word (e.g. "magulng") still maps to its meaning */
const fuzzySyn = (w: string): string | undefined => {
  if (w.length < 5) return undefined;
  for (const k of SYN_KEYS) if (close(w, k)) return SYN[k];
  return undefined;
};

function tokens(s: string): string[] {
  const out: string[] = [];
  for (const raw of norm(s).split(' ')) {
    if (!raw || STOP.has(raw)) continue;
    const w = stem(raw);
    const c = SYN[w] ?? SYN[raw] ?? fuzzySyn(raw);
    if (c === '') continue;
    out.push(c || w);
  }
  return out;
}

/** small typo tolerance (Levenshtein, stops early) */
function close(a: string, b: string): boolean {
  if (a === b) return true;
  const max = Math.min(a.length, b.length) >= 7 ? 2 : Math.min(a.length, b.length) >= 4 ? 1 : 0;
  if (!max || Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

interface Indexed {
  e: HelpEntry;
  q: Set<string>;
  alt: Set<string>;
  phrases: string[];
}
let INDEX: Indexed[] | null = null;
const index = () =>
  (INDEX ??= HELP_KB.map((e) => ({
    e,
    q: new Set(tokens(e.q)),
    alt: new Set([...e.alt, HELP_EN[e.id]?.q ?? ''].flatMap(tokens)),
    phrases: e.alt.map(norm).filter((p) => p.includes(' ')),
  })));

export interface HelpHit {
  entry: HelpEntry;
  score: number;
}

/** best answers for a question, best first; empty when nothing fits well */
export function searchHelp(question: string, limit = 3): HelpHit[] {
  const qt = [...new Set(tokens(question))];
  const nq = ' ' + norm(question) + ' ';
  if (!qt.length) return [];
  const hits: HelpHit[] = [];
  for (const it of index()) {
    let score = 0;
    let matched = 0;
    for (const t of qt) {
      if (it.q.has(t)) { score += 3; matched++; continue; }
      if (it.alt.has(t)) { score += 2.2; matched++; continue; }
      let fuzzy = false;
      for (const w of it.q) if (close(t, w)) { fuzzy = true; break; }
      if (!fuzzy) for (const w of it.alt) if (close(t, w)) { fuzzy = true; break; }
      if (fuzzy) { score += 1.4; matched++; }
    }
    for (const p of it.phrases) if (nq.includes(' ' + p + ' ')) score += 2.5; // a whole known phrase
    if (!matched && score === 0) continue;
    // share of the question that was understood matters most
    const coverage = matched / qt.length;
    const final = score * (0.45 + 0.55 * coverage);
    hits.push({ entry: it.e, score: final });
  }
  hits.sort((a, b) => b.score - a.score);
  const best = hits[0]?.score ?? 0;
  if (best < 2.2) return [];
  return hits.filter((h) => h.score >= Math.max(2.2, best * 0.5)).slice(0, limit);
}
