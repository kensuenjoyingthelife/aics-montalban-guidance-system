/**
 * Masterlist Import Engine
 * ------------------------------------------------------------
 * Reads real-world school masterlists (Excel .xlsx / CSV) and turns them into
 * MasterlistPreviewRow records for the Preview & Fix table.
 *
 * Handles what registrar files actually look like:
 *  - title / school-name rows above the real header row
 *  - headers in any order, English or Filipino ("Pangalan", "Apelyido", "LRN")
 *  - separate Last / First / Middle name columns, or "LAST, FIRST M." in one column
 *  - "Grade & Section" in one column ("12-ICT 1", "Grade 11 - STEM A") or two columns
 *  - phone numbers whose leading 0 was dropped by Excel (9171234567), +63 / 63 formats
 *  - multiple sheets (picks the sheet that looks like a masterlist)
 *  - blank rows, repeated header rows, "nothing follows" footer rows
 *
 * It NEVER invents data. Anything missing stays blank and is flagged for a human to fix.
 */

import type { MasterlistPreviewRow } from '../data/stage3MockData';

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

export type FieldKey =
  | 'studentNumber'
  | 'fullName'
  | 'lastName'
  | 'firstName'
  | 'middleName'
  | 'grade'
  | 'section'
  | 'gradeSection'
  | 'parentName'
  | 'phone'
  | 'email';

export const FIELD_LABELS: Record<FieldKey, { en: string; tl: string; required: boolean }> = {
  studentNumber: { en: 'Student ID / LRN', tl: 'Student ID / LRN', required: true },
  fullName: { en: 'Full Name', tl: 'Buong Pangalan', required: false },
  lastName: { en: 'Last Name', tl: 'Apelyido', required: false },
  firstName: { en: 'First Name', tl: 'Unang Pangalan', required: false },
  middleName: { en: 'Middle Name / M.I.', tl: 'Gitnang Pangalan', required: false },
  grade: { en: 'Grade Level', tl: 'Baitang', required: false },
  section: { en: 'Section / Strand', tl: 'Section / Strand', required: false },
  gradeSection: { en: 'Grade & Section (one column)', tl: 'Grade & Section (iisang column)', required: false },
  parentName: { en: 'Parent / Guardian Name', tl: 'Pangalan ng Magulang', required: true },
  phone: { en: 'Parent Mobile', tl: 'Mobile ng Magulang', required: true },
  email: { en: 'Parent Gmail (optional)', tl: 'Gmail ng Magulang (optional)', required: false },
};

export const FIELD_ORDER: FieldKey[] = [
  'studentNumber',
  'fullName',
  'lastName',
  'firstName',
  'middleName',
  'grade',
  'section',
  'gradeSection',
  'parentName',
  'phone',
  'email',
];

export type ColumnMapping = Record<FieldKey, number>; // -1 = not in file

const emptyMapping = (): ColumnMapping =>
  FIELD_ORDER.reduce((acc, k) => ({ ...acc, [k]: -1 }), {} as ColumnMapping);

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

export type RawCell = string | number | boolean | Date | null | undefined | unknown;
export type RawSheet = { name: string; rows: RawCell[][] };

export const cellText = (v: RawCell): string => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    if (!isFinite(v)) return '';
    // Avoid 1.23E+11 for long IDs / phone numbers
    return Number.isInteger(v) ? v.toFixed(0) : String(v);
  }
  let s = String(v)
    .replace(/ /g, ' ') // non-breaking spaces from copy-paste
    .replace(/[​-‍﻿]/g, '') // zero-width chars / BOM
    .replace(/\s+/g, ' ')
    .trim();
  // Numeric strings that Excel stored as "123456789012.0"
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '');
  return s;
};

/** Removes spreadsheet-formula prefixes so imported text can never become a formula later (CSV injection). */
const stripFormulaPrefix = (s: string) => s.replace(/^[=+@\t\r]+/, '').replace(/^-(?=[=+@])/, '');

const normHeader = (s: string) =>
  cellText(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // ñ → n, é → e
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// ---------------------------------------------------------------------------
// Header recognition
// ---------------------------------------------------------------------------

type HeaderGuess = { field: FieldKey; score: number; parentHint: boolean };

const has = (h: string, ...words: string[]) => words.some((w) => new RegExp(`(^| )${w}( |$)`).test(h));
const hasPart = (h: string, ...parts: string[]) => parts.some((p) => h.includes(p));

/** Returns the most likely field for a header cell, or null. */
export const guessHeader = (raw: RawCell): HeaderGuess | null => {
  const h = normHeader(cellText(raw));
  if (!h || h.length > 60) return null;

  const parentHint = has(h, 'parent', 'parents', 'guardian', 'guardians', 'mother', 'father', 'magulang', 'nanay', 'tatay', 'tagapag alaga');
  const studentHint = has(h, 'student', 'students', 'learner', 'learners', 'estudyante', 'mag aaral');

  // Email
  if (hasPart(h, 'email', 'e mail', 'gmail')) return { field: 'email', score: 10, parentHint };

  // Phone
  if (
    has(h, 'contact', 'mobile', 'cellphone', 'cell', 'cp', 'phone', 'tel', 'telephone', 'cel', 'numero', 'telepono', 'mobile no', 'contact no') ||
    hasPart(h, 'cellphone', 'mobile', 'contact', 'phone')
  ) {
    return { field: 'phone', score: parentHint ? 10 : studentHint ? 3 : 7, parentHint };
  }

  // Grade & Section in one column
  if ((has(h, 'grade', 'yr', 'year', 'level', 'baitang') && has(h, 'section', 'sec', 'strand', 'seksyon')) || h === 'grade section' || h === 'gr sec' || h === 'class') {
    return { field: 'gradeSection', score: 9, parentHint };
  }

  // Grade level
  if (has(h, 'grade', 'grade level', 'year level', 'yr level', 'level', 'baitang', 'gr', 'yr')) {
    return { field: 'grade', score: 9, parentHint };
  }

  // Section / strand
  if (has(h, 'section', 'sec', 'strand', 'seksyon', 'track', 'strand section', 'program')) {
    return { field: 'section', score: 9, parentHint };
  }

  // Student ID / LRN
  if (
    has(h, 'lrn', 'id', 'id no', 'id number', 'student id', 'student no', 'student number', 'stud no', 'student', 'no', 'number') &&
    (has(h, 'lrn', 'id') || hasPart(h, 'student no', 'student number', 'stud no', 'id no', 'id number', 'learner reference'))
  ) {
    return { field: 'studentNumber', score: has(h, 'lrn') ? 10 : 9, parentHint };
  }
  if (hasPart(h, 'learner reference')) return { field: 'studentNumber', score: 10, parentHint };

  // Parent / guardian name (before generic "name")
  if (parentHint) {
    // "Mother" alone, "Parent/Guardian", "Name of Guardian", "Parent's Name"
    const strength = has(h, 'guardian', 'guardians') ? 10 : has(h, 'parent', 'parents', 'magulang') ? 9 : 7;
    return { field: 'parentName', score: strength, parentHint };
  }

  // "LEARNER'S NAME (Last Name, First Name, Middle Name)" describes ONE full-name column
  const nameParts = ['last', 'first', 'middle', 'surname', 'given'].filter((w) => has(h, w)).length;
  if (nameParts >= 2) return { field: 'fullName', score: 10, parentHint };

  // Name parts
  if (has(h, 'last name', 'lastname', 'surname', 'family name', 'apelyido', 'apellido', 'last')) return { field: 'lastName', score: 10, parentHint };
  if (has(h, 'first name', 'firstname', 'given name', 'given names', 'unang pangalan', 'first')) return { field: 'firstName', score: 10, parentHint };
  if (has(h, 'middle name', 'middlename', 'middle initial', 'mi', 'm i', 'middle', 'gitnang pangalan')) return { field: 'middleName', score: 10, parentHint };

  // Full name
  if (has(h, 'name', 'names', 'full name', 'fullname', 'student name', 'learner name', 'name of student', 'name of learner', 'pangalan', 'buong pangalan', 'student', 'learner')) {
    return { field: 'fullName', score: has(h, 'name', 'pangalan', 'full name') ? 9 : 5, parentHint };
  }

  return null;
};

/** Builds a mapping from a header row. Each column is used once; best score wins per field. */
export const mappingFromHeader = (headerRow: RawCell[]): { mapping: ColumnMapping; matched: number } => {
  const mapping = emptyMapping();
  const best: Partial<Record<FieldKey, number>> = {};
  let matched = 0;

  headerRow.forEach((cell, col) => {
    const g = guessHeader(cell);
    if (!g) return;
    const prev = best[g.field];
    if (prev === undefined || g.score > prev) {
      if (prev === undefined) matched++;
      best[g.field] = g.score;
      mapping[g.field] = col;
    }
  });

  // "Apelyido | Pangalan | Gitnang Pangalan": when a Last Name column exists, a plain
  // "Name/Pangalan" column is the FIRST name, not the full name.
  if (mapping.lastName >= 0 && mapping.firstName < 0 && mapping.fullName >= 0) {
    mapping.firstName = mapping.fullName;
    mapping.fullName = -1;
  }
  // A single-column full name beats split name parts only if parts are incomplete
  if (mapping.fullName >= 0 && mapping.lastName >= 0 && mapping.firstName >= 0) {
    mapping.fullName = -1;
  }
  // Grade+Section combined column is only needed if separate ones are missing
  if (mapping.gradeSection >= 0 && mapping.grade >= 0 && mapping.section >= 0) {
    mapping.gradeSection = -1;
  }
  return { mapping, matched };
};

const isNameMapped = (m: ColumnMapping) => m.fullName >= 0 || (m.lastName >= 0 && m.firstName >= 0);

// ---------------------------------------------------------------------------
// Sheet + header row detection
// ---------------------------------------------------------------------------

export type DetectedLayout = {
  sheetIndex: number;
  sheetName: string;
  headerRowIndex: number;
  headers: string[];
  mapping: ColumnMapping;
  matched: number;
};

const HEADER_SCAN_ROWS = 25;

/** Finds the header row of ONE sheet (or null if the sheet is not a student list). */
export const detectSheetLayout = (sheet: RawSheet, sheetIndex: number): DetectedLayout | null => {
  let best: DetectedLayout | null = null;
  const limit = Math.min(sheet.rows.length, HEADER_SCAN_ROWS);
  for (let r = 0; r < limit; r++) {
    const row = sheet.rows[r] || [];
    const nonEmpty = row.filter((c) => cellText(c) !== '').length;
    if (nonEmpty < 2) continue;
    const { mapping, matched } = mappingFromHeader(row);
    if (matched < 2 || !isNameMapped(mapping)) continue;
    const hasDataBelow = sheet.rows.slice(r + 1).some((rr) => (rr || []).filter((c) => cellText(c) !== '').length >= 2);
    if (!hasDataBelow) continue;
    if (!best || matched > best.matched) {
      best = { sheetIndex, sheetName: sheet.name, headerRowIndex: r, headers: row.map((c) => cellText(c)), mapping, matched };
    }
  }
  return best;
};

/** All sheets that look like student lists (workbooks often have one sheet per section). */
export const detectLayouts = (sheets: RawSheet[]): DetectedLayout[] =>
  sheets.map((s, i) => detectSheetLayout(s, i)).filter((l): l is DetectedLayout => l !== null);

/** Best single layout (kept for callers that only need one). */
export const detectLayout = (sheets: RawSheet[]): DetectedLayout | null =>
  detectLayouts(sheets).sort((a, b) => b.matched - a.matched)[0] ?? null;

// ---------------------------------------------------------------------------
// Value normalizers
// ---------------------------------------------------------------------------

const ROMAN = /^(ii|iii|iv|vi|vii|viii|ix)$/i;
const SUFFIX_RE = /^(jr|sr|ii|iii|iv)\.?$/i;

/** Title-cases ALL-CAPS or all-lowercase names; leaves mixed case (already proper) alone. */
export const tidyName = (raw: string): string => {
  const s = stripFormulaPrefix(cellText(raw));
  if (!s) return '';
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const isAllCaps = letters && letters === letters.toUpperCase();
  const isAllLower = letters && letters === letters.toLowerCase();
  if (!isAllCaps && !isAllLower) return s;

  return s
    .split(' ')
    .map((word) => {
      if (ROMAN.test(word.replace(/\./g, ''))) return word.toUpperCase();
      const lower = word.toLowerCase();
      if (lower === 'jr' || lower === 'jr.') return 'Jr.';
      if (lower === 'sr' || lower === 'sr.') return 'Sr.';
      // Capitalize after hyphen / apostrophe too: "santos-reyes" → "Santos-Reyes"
      return lower.replace(/(^|[-'’])([a-zà-ÿñ])/g, (_m, p, c) => p + c.toUpperCase());
    })
    .join(' ');
};

/** "DELA CRUZ, JUAN PEDRO S." → "Juan Pedro S. Dela Cruz" */
export const normalizeFullName = (raw: string): string => {
  const s = tidyName(raw);
  if (!s) return '';
  const commaParts = s.split(',').map((p) => p.trim()).filter(Boolean);
  if (commaParts.length === 2) {
    const [last, rest] = commaParts;
    // "Santos, Jr." is a suffix, not a name flip
    if (SUFFIX_RE.test(rest)) return `${last} ${rest}`;
    // "PEÑAFLOR, JOSE III" / "BAUTISTA, CARLO JR." → suffix goes after the last name
    const words = rest.split(' ');
    const suffix = words.length > 1 && SUFFIX_RE.test(words[words.length - 1]) ? words.pop()! : '';
    return [words.join(' '), last, suffix].filter(Boolean).join(' ');
  }
  if (commaParts.length === 3) {
    // "Dela Cruz, Juan, Jr." or "Dela Cruz, Juan, P."
    const [last, first, extra] = commaParts;
    if (SUFFIX_RE.test(extra)) return `${first} ${last} ${extra}`;
    return `${first} ${extra} ${last}`;
  }
  return s;
};

const joinNameParts = (first: string, middle: string, last: string): string => {
  const f = tidyName(first);
  let m = tidyName(middle);
  const l = tidyName(last);
  // Single-letter middle name → "S."
  if (/^[A-Za-zñÑ]$/.test(m)) m = `${m.toUpperCase()}.`;
  return [f, m, l].filter(Boolean).join(' ');
};

const STRANDS = ['ICT', 'STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'HE', 'IA', 'CSS', 'SPORTS', 'ARTS', 'AD', 'AFA'];

export const parseGrade = (raw: string): string => {
  const s = cellText(raw).toUpperCase();
  if (!s) return '';
  // "11", "Grade 11", "G11", "12-ICT 1" — but NOT "Sheet12" or digits inside an LRN
  const m = s.match(/(?:^|[^A-Z0-9])(?:GRADE|GR\.?|G|YEAR|YR\.?)?\s*-?\s*(11|12)(?![0-9])/);
  if (m) return m[1];
  if (/\bXII\b/.test(s)) return '12';
  if (/\bXI\b/.test(s)) return '11';
  return '';
};

/** "ict 1" → "ICT-1", "STEM - A" → "STEM-A", "ICT1" → "ICT-1", "Rizal" → "RIZAL" */
export const normalizeSection = (raw: string): string => {
  let s = stripFormulaPrefix(cellText(raw)).toUpperCase();
  if (!s) return '';
  // Drop grade mentions so "GRADE 12 - ICT 1" → "ICT 1"
  s = s
    .replace(/\b(GRADE|GR\.?|YEAR|YR\.?|G)\s*-?\s*(11|12|XII|XI)\b/g, ' ')
    .replace(/^\s*(11|12|XII|XI)\s*[-–/·.:]?\s*(?=[A-Z])/, ' ')
    .replace(/\((?:\s*(?:GRADE\s*)?(11|12)\s*)\)/g, ' ')
    .replace(/[·•|/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[-–:,]+|[-–:,]+$/g, '')
    .trim();

  const strand = STRANDS.find((st) => new RegExp(`^${st}\\b|^${st}(?=\\s*-?\\s*[0-9A-Z]$)|^${st}(?=[0-9])`).test(s));
  if (strand) {
    const rest = s.slice(strand.length).replace(/^[\s\-–_.]+/, '').trim();
    return rest ? `${strand}-${rest.replace(/\s+/g, '-')}` : strand;
  }
  return s.replace(/\s*[-–]\s*/g, '-');
};

/** Reads "12-ICT 1", "Grade 11 - STEM A", "ICT-1 (12)" from one column. */
export const parseGradeSection = (raw: string): { grade: string; section: string } => ({
  grade: parseGrade(raw),
  section: normalizeSection(raw),
});

/** Restores numbers Excel broke; never invents digits. Returns display format when valid. */
export const normalizePhone = (raw: string): string => {
  const s = stripFormulaPrefix(cellText(raw));
  if (!s) return '';
  // Several numbers in one cell: "0917-123-4567 / 0918-..." → first one
  const first = s.split(/\s*(?:\/|;|,|\bor\b|&|\|)\s*/i).find((p) => /\d/.test(p)) ?? s;
  let d = first.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('63')) d = '0' + d.slice(2);
  if (d.length === 10 && d.startsWith('9')) d = '0' + d; // Excel dropped the leading 0
  if (d.length === 11 && d.startsWith('09')) return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  return first.trim(); // leave as-is so the row gets flagged with the real value
};

export const normalizeEmail = (raw: string): string => {
  const s = stripFormulaPrefix(cellText(raw)).toLowerCase();
  if (!s) return '';
  const m = s.match(/[^\s,;/<>()]+@[^\s,;/<>()]+/);
  return m ? m[0].replace(/^mailto:/, '') : s;
};

const normalizeStudentNumber = (raw: string) =>
  stripFormulaPrefix(cellText(raw)).replace(/\s+/g, '').replace(/^'+/, '');

// ---------------------------------------------------------------------------
// Row extraction
// ---------------------------------------------------------------------------

const FOOTER_PATTERNS = /^(nothing follows|\*+|total|grand total|prepared by|noted by|approved by|certified|end of list|wala nang kasunod)/i;

export type ExtractResult = {
  rows: MasterlistPreviewRow[];
  skippedEmpty: number;
  skippedFooter: number;
  /** Rows that look like a repeated header and were skipped. */
  skippedRepeatedHeader: number;
  /** Phone numbers the importer repaired (lost leading 0, +63, dashes/spaces). */
  phonesFixed: number;
  /** Names re-formatted (ALL CAPS, "LAST, FIRST" order, split columns joined). */
  namesFormatted: number;
  /** 1-based spreadsheet row number for each extracted row (for "see row 14 in your file"). */
  sourceRowNumbers: number[];
};

export const extractRows = (
  sheet: RawSheet,
  headerRowIndex: number,
  mapping: ColumnMapping,
  idPrefix = 'XL'
): ExtractResult => {
  const get = (row: RawCell[], key: FieldKey) => (mapping[key] >= 0 ? cellText(row[mapping[key]]) : '');
  const headerTexts = (sheet.rows[headerRowIndex] || []).map((c) => normHeader(cellText(c)));

  const rows: MasterlistPreviewRow[] = [];
  const sourceRowNumbers: number[] = [];
  let skippedEmpty = 0;
  let skippedFooter = 0;
  let skippedRepeatedHeader = 0;
  let phonesFixed = 0;
  let namesFormatted = 0;
  const stamp = Date.now().toString(36);

  // Context from the sheet name ("Grade 11 - ICT 1") or from section title rows inside the sheet
  const sheetCtx = parseGradeSection(sheet.name);
  let ctxGrade = sheetCtx.grade;
  // Whole-word strand only: "Sheet12" must not match "HE"
  let ctxSection = STRANDS.some((st) => new RegExp(`(^|[^A-Z])${st}([^A-Z]|$)`).test(sheet.name.toUpperCase()))
    ? sheetCtx.section
    : '';

  for (let r = headerRowIndex + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] || [];
    const texts = row.map((c) => cellText(c));
    if (texts.every((t) => t === '')) {
      skippedEmpty++;
      continue;
    }
    const nonEmptyTexts = texts.filter((t) => t !== '');
    const firstNonEmpty = nonEmptyTexts[0] || '';
    if (FOOTER_PATTERNS.test(firstNonEmpty.replace(/^[*\s-]+/, '')) || /^\*+.*\*+$/.test(firstNonEmpty)) {
      skippedFooter++;
      continue;
    }
    // Section title row: one cell like "GRADE 11 - ICT 1" / "ICT-2" / "Section: STEM-A"
    if (nonEmptyTexts.length === 1 && !/\d{6,}/.test(firstNonEmpty) && !/@/.test(firstNonEmpty)) {
      const t = firstNonEmpty.replace(/^(section|seksyon|strand)\s*[:\-]\s*/i, '');
      const g = parseGrade(t);
      const looksLikeSection = STRANDS.some((st) => new RegExp(`\\b${st}`, 'i').test(t)) || /\b(grade|baitang)\b/i.test(t);
      if (looksLikeSection) {
        if (g) ctxGrade = g;
        const sec = normalizeSection(t);
        if (sec) ctxSection = sec;
        skippedFooter++;
        continue;
      }
    }
    // Repeated header (common when lists are copy-pasted per section)
    const sameAsHeader = row.filter((c, i) => normHeader(cellText(c)) !== '' && normHeader(cellText(c)) === headerTexts[i]).length;
    if (sameAsHeader >= 2) {
      skippedRepeatedHeader++;
      continue;
    }

    // Name
    let fullName = '';
    if (mapping.fullName >= 0) fullName = normalizeFullName(get(row, 'fullName'));
    if (!fullName && (mapping.lastName >= 0 || mapping.firstName >= 0)) {
      fullName = joinNameParts(get(row, 'firstName'), get(row, 'middleName'), get(row, 'lastName'));
    }
    if (fullName && mapping.fullName >= 0 && fullName !== get(row, 'fullName')) namesFormatted++;

    // Grade / section
    let grade = mapping.grade >= 0 ? parseGrade(get(row, 'grade')) : '';
    let section = mapping.section >= 0 ? normalizeSection(get(row, 'section')) : '';
    if (mapping.gradeSection >= 0) {
      const gs = parseGradeSection(get(row, 'gradeSection'));
      grade = grade || gs.grade;
      section = section || gs.section;
    }
    // Grade written inside the section cell ("12-ICT 1")
    if (!grade && mapping.section >= 0) grade = parseGrade(get(row, 'section'));
    // Fall back to the section title row / sheet name
    grade = grade || ctxGrade;
    section = section || ctxSection;

    const studentNumber = normalizeStudentNumber(get(row, 'studentNumber'));
    const parentName = tidyName(get(row, 'parentName'));
    const rawPhone = get(row, 'phone');
    const parentPhone = normalizePhone(rawPhone);
    // Counted as "fixed" only when digits were restored (lost 0, +63 → 0), not just re-dashed
    if (
      rawPhone &&
      /^09\d{2}-\d{3}-\d{4}$/.test(parentPhone) &&
      rawPhone.replace(/\D/g, '') !== parentPhone.replace(/\D/g, '')
    ) {
      phonesFixed++;
    }
    const parentEmail = normalizeEmail(get(row, 'email'));

    // Row that has nothing we care about (e.g. a section sub-title like "ICT-1")
    if (!studentNumber && !fullName && !parentName && !parentPhone) {
      skippedFooter++;
      continue;
    }

    rows.push({
      rowId: `${idPrefix}-${stamp}-${r}`,
      studentNumber,
      fullName,
      sectionCode: section,
      gradeSection: grade && section ? `Grade ${grade} · ${section}` : grade ? `Grade ${grade}` : section,
      parentName,
      parentPhone,
      parentEmail,
    });
    sourceRowNumbers.push(r + 1);
  }

  return { rows, skippedEmpty, skippedFooter, skippedRepeatedHeader, sourceRowNumbers, phonesFixed, namesFormatted };
};

// ---------------------------------------------------------------------------
// CSV (RFC 4180 + Excel quirks)
// ---------------------------------------------------------------------------

/** Detects , ; or TAB by counting outside quotes on the first lines. */
const detectDelimiter = (text: string): string => {
  const sample = text.split(/\r?\n/).slice(0, 10).join('\n');
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  let inQ = false;
  for (const ch of sample) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ',';
};

export const parseCsv = (input: string): string[][] => {
  const text = input.replace(/^﻿/, '');
  // Excel "sep=;" first line
  let body = text;
  let delim = '';
  const sepLine = text.match(/^sep=(.)\r?\n/i);
  if (sepLine) {
    delim = sepLine[1];
    body = text.slice(sepLine[0].length);
  }
  delim = delim || detectDelimiter(body);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inQuotes) {
      if (ch === '"') {
        if (body[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === '') inQuotes = true;
    else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && body[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

/** Decodes CSV bytes as UTF-8, falling back to Windows-1252 (Excel "CSV" on Windows) so Ñ survives. */
export const decodeCsvBytes = (buf: ArrayBuffer): string => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
};

// ---------------------------------------------------------------------------
// File loading (browser)
// ---------------------------------------------------------------------------

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMPORT_ROWS = 5000;

export type LoadErrorCode = 'too_big' | 'legacy_xls' | 'pdf' | 'unsupported' | 'unreadable' | 'empty' | 'no_header';

export class MasterlistLoadError extends Error {
  constructor(public code: LoadErrorCode, message: string) {
    super(message);
  }
}

const ext = (name: string) => (name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '');

/** Sniffs the real file type from the first bytes (renamed files are common). */
const sniff = (bytes: Uint8Array): 'zip' | 'ole' | 'pdf' | 'text' => {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'zip'; // PK → .xlsx / .ods
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) return 'ole'; // legacy .xls
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf'; // %PDF
  return 'text';
};

type XlsxReader = (
  input: Blob,
  options: { parseNumber: (s: string) => string; trim: boolean }
) => Promise<{ sheet: string; data: unknown[][] }[]>;

/**
 * Reads a File into raw sheets. `xlsxReader` lets the Web Worker pass the worker-safe build;
 * on the main thread the browser build is lazy-loaded.
 */
export const readSpreadsheetFile = async (file: File, xlsxReader?: XlsxReader): Promise<RawSheet[]> => {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new MasterlistLoadError('too_big', 'File is larger than 10 MB.');
  }
  const buf = await file.arrayBuffer();
  if (buf.byteLength === 0) throw new MasterlistLoadError('empty', 'The file is empty.');
  const kind = sniff(new Uint8Array(buf.slice(0, 8)));
  const e = ext(file.name);

  if (kind === 'pdf' || e === 'pdf') {
    throw new MasterlistLoadError('pdf', 'PDF files cannot be imported.');
  }
  if (kind === 'ole' || e === 'xls') {
    throw new MasterlistLoadError('legacy_xls', 'Old Excel 97-2003 (.xls) format.');
  }
  if (kind === 'zip') {
    if (e === 'ods') throw new MasterlistLoadError('unsupported', 'OpenDocument (.ods) format.');
    try {
      // Lazy-loaded so the Excel reader is only downloaded when someone imports (keeps the app fast)
      const reader: XlsxReader =
        xlsxReader ?? ((await import('read-excel-file/browser')).default as unknown as XlsxReader);
      // Keep numbers as text → LRNs and phone numbers keep every digit
      const sheets = await reader(file, { parseNumber: (s: string) => s, trim: true });
      return sheets.map((s) => ({ name: s.sheet, rows: s.data as RawCell[][] }));
    } catch {
      throw new MasterlistLoadError('unreadable', 'The Excel file could not be read.');
    }
  }
  // Text: CSV / TSV / TXT
  if (!['csv', 'txt', 'tsv', ''].includes(e)) {
    throw new MasterlistLoadError('unsupported', `.${e} files are not supported.`);
  }
  const rows = parseCsv(decodeCsvBytes(buf));
  return [{ name: file.name, rows }];
};

export type ImportAnalysis = {
  fileName: string;
  sheets: RawSheet[];
  /** Primary layout (shown in the Match Columns step). */
  layout: DetectedLayout;
  /** Every sheet that was read. */
  layouts: DetectedLayout[];
  extract: ExtractResult;
  /** "Sheet name · row 14" for each extracted row. */
  sourceLabels: string[];
  skippedSheets: string[];
  truncated: boolean;
};

const sameHeaders = (a: string[], b: string[]) =>
  a.map(normHeader).filter(Boolean).join('|') === b.map(normHeader).filter(Boolean).join('|');

const runExtraction = (
  sheets: RawSheet[],
  layouts: DetectedLayout[],
  primary: DetectedLayout,
  primaryMapping: ColumnMapping
) => {
  const all: ExtractResult = { rows: [], skippedEmpty: 0, skippedFooter: 0, skippedRepeatedHeader: 0, sourceRowNumbers: [], phonesFixed: 0, namesFormatted: 0 };
  const sourceLabels: string[] = [];
  const multi = layouts.length > 1;
  layouts.forEach((l) => {
    // A manual column fix applies to every sheet with the same headers as the primary sheet
    const mapping = sameHeaders(l.headers, primary.headers) ? primaryMapping : l.mapping;
    const res = extractRows(sheets[l.sheetIndex], l.headerRowIndex, mapping, `XL${l.sheetIndex}`);
    all.rows.push(...res.rows);
    all.sourceRowNumbers.push(...res.sourceRowNumbers);
    sourceLabels.push(...res.sourceRowNumbers.map((n) => (multi ? `${l.sheetName} · row ${n}` : `row ${n}`)));
    all.skippedEmpty += res.skippedEmpty;
    all.skippedFooter += res.skippedFooter;
    all.skippedRepeatedHeader += res.skippedRepeatedHeader;
    all.phonesFixed += res.phonesFixed;
    all.namesFormatted += res.namesFormatted;
  });
  const truncated = all.rows.length > MAX_IMPORT_ROWS;
  if (truncated) {
    all.rows = all.rows.slice(0, MAX_IMPORT_ROWS);
    all.sourceRowNumbers = all.sourceRowNumbers.slice(0, MAX_IMPORT_ROWS);
    sourceLabels.length = MAX_IMPORT_ROWS;
  }
  return { extract: all, sourceLabels, truncated };
};

export const analyzeSheets = (fileName: string, sheets: RawSheet[]): ImportAnalysis => {
  const nonEmpty = sheets.filter((s) => s.rows.some((r) => (r || []).some((c) => cellText(c) !== '')));
  if (nonEmpty.length === 0) throw new MasterlistLoadError('empty', 'The file has no data.');
  const layouts = detectLayouts(sheets);
  if (layouts.length === 0) {
    throw new MasterlistLoadError('no_header', 'Could not find a header row with student names.');
  }
  // Primary = the sheet with the most recognized columns (ties → first sheet)
  const primary = [...layouts].sort((a, b) => b.matched - a.matched || a.sheetIndex - b.sheetIndex)[0];
  const { extract, sourceLabels, truncated } = runExtraction(sheets, layouts, primary, primary.mapping);
  const used = new Set(layouts.map((l) => l.sheetIndex));
  const skippedSheets = nonEmpty.filter((s) => !used.has(sheets.indexOf(s))).map((s) => s.name);
  return { fileName, sheets, layout: primary, layouts, extract, sourceLabels, skippedSheets, truncated };
};

/** Re-runs extraction after the user changes the column matching. */
export const reExtract = (analysis: ImportAnalysis, mapping: ColumnMapping): ImportAnalysis => {
  const primary = { ...analysis.layout, mapping };
  const layouts = analysis.layouts.map((l) => (l.sheetIndex === primary.sheetIndex ? primary : l));
  const { extract, sourceLabels, truncated } = runExtraction(analysis.sheets, layouts, primary, mapping);
  return { ...analysis, layout: primary, layouts, extract, sourceLabels, truncated };
};

export const loadErrorMessage = (err: unknown, isTl: boolean): string => {
  const code = err instanceof MasterlistLoadError ? err.code : 'unreadable';
  const msg: Record<LoadErrorCode, [string, string]> = {
    too_big: ['File is too big (max 10 MB). Split it per grade level.', 'Masyadong malaki ang file (max 10 MB). Hatiin per grade level.'],
    legacy_xls: [
      'This is an old Excel file (.xls). Open it in Excel → File → Save As → "Excel Workbook (.xlsx)", then upload again.',
      'Lumang Excel file ito (.xls). Buksan sa Excel → File → Save As → "Excel Workbook (.xlsx)", tapos i-upload ulit.',
    ],
    pdf: [
      'PDF cannot be imported reliably. Ask the registrar for the Excel copy, or open the PDF in Excel/Word and save as .xlsx.',
      'Hindi pwede ang PDF. Humingi ng Excel copy sa registrar, o i-convert muna ang PDF sa .xlsx.',
    ],
    unsupported: ['Use an Excel (.xlsx) or CSV file.', 'Gumamit ng Excel (.xlsx) o CSV file.'],
    unreadable: [
      'The file could not be read. It may be damaged or password-protected. Open it in Excel and save a new copy.',
      'Hindi mabasa ang file. Baka sira o may password. Buksan sa Excel at i-save ulit.',
    ],
    empty: ['The file is empty.', 'Walang laman ang file.'],
    no_header: [
      'Could not find the column headers (e.g. "Name", "LRN", "Section"). Use the template or add a header row.',
      'Walang nakitang header (hal. "Name", "LRN", "Section"). Gamitin ang template o lagyan ng header row.',
    ],
  };
  return msg[code][isTl ? 1 : 0];
};

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export const TEMPLATE_HEADERS = [
  'LRN / Student ID',
  'Last Name',
  'First Name',
  'Middle Name',
  'Grade Level',
  'Section',
  'Parent / Guardian Name',
  'Parent Mobile (09XXXXXXXXX)',
  'Parent Gmail (optional)',
];

export const buildTemplateCsv = (): string => {
  const sample = ['136521140001', 'Dela Cruz', 'Juan', 'Santos', '11', 'ICT-1', 'Maria Dela Cruz', '09171234567', 'maria.delacruz@gmail.com'];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // Mobile numbers prefixed with ="..." would be a formula; instead we rely on our importer restoring the 0.
  return '﻿' + [TEMPLATE_HEADERS, sample].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
};
