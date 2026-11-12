import type { ImportAnalysis } from './masterlistImport';
import { checkEmail } from './validators';

export type Finding = { tone: 'ok' | 'warn' | 'info'; text: string };

/**
 * Plain-language summary of what the importer actually found in the file.
 * Every line is computed from the real rows — nothing here is decorative.
 */
const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const computeImportFindings = (
  analysis: ImportAnalysis,
  existingIds: Set<string>,
  isTl: boolean
): Finding[] => {
  const rows = analysis.extract.rows;
  const n = rows.length;
  const out: Finding[] = [];
  const t = (en: string, tl: string) => (isTl ? tl : en);

  // 1. Where the data was found
  const sheets = analysis.layouts.map((l) => l.sheetName);
  out.push({
    tone: 'ok',
    text:
      sheets.length > 1
        ? t(`Found the student list in ${sheets.length} sheets: ${sheets.join(', ')}`, `Nahanap ang listahan sa ${sheets.length} sheet: ${sheets.join(', ')}`)
        : t(`Found the column headers on row ${analysis.layout.headerRowIndex + 1}`, `Nahanap ang mga header sa row ${analysis.layout.headerRowIndex + 1}`),
  });

  // 2. How many students were read (and what was skipped)
  const skipped = analysis.extract.skippedFooter + analysis.extract.skippedRepeatedHeader;
  out.push({
    tone: 'ok',
    text:
      t(`Read ${pl(n, 'student', 'students')}`, `Nabasa ang ${n} estudyante`) +
      (skipped > 0 ? t(` · skipped ${skipped} title/footer rows`, ` · nilaktawan ang ${skipped} title/footer row`) : ''),
  });

  // 3. Names
  if (analysis.extract.namesFormatted > 0) {
    out.push({
      tone: 'info',
      text: t(
        `Tidied ${pl(analysis.extract.namesFormatted, 'name', 'names')} (e.g. "DELA CRUZ, JUAN" → "Juan Dela Cruz")`,
        `Inayos ang ${analysis.extract.namesFormatted} pangalan (hal. "DELA CRUZ, JUAN" → "Juan Dela Cruz")`
      ),
    });
  }
  const noName = rows.filter((r) => !r.fullName.trim()).length;
  if (noName) out.push({ tone: 'warn', text: t(`${pl(noName, 'row has', 'rows have')} no student name`, `${noName} row ang walang pangalan ng estudyante`) });

  // 4. LRN / Student ID
  const missingId = rows.filter((r) => !r.studentNumber.trim()).length;
  const seen = new Set<string>();
  let dupInFile = 0;
  let alreadySaved = 0;
  rows.forEach((r) => {
    const id = r.studentNumber.trim();
    if (!id) return;
    if (seen.has(id)) dupInFile++;
    seen.add(id);
    if (existingIds.has(id)) alreadySaved++;
  });
  if (!missingId && !dupInFile && !alreadySaved) {
    out.push({ tone: 'ok', text: t('Checked every LRN — no duplicates', 'Na-check ang bawat LRN — walang duplicate') });
  } else {
    if (missingId) out.push({ tone: 'warn', text: t(`${pl(missingId, 'row has', 'rows have')} no LRN / Student ID`, `${missingId} row ang walang LRN / Student ID`) });
    if (dupInFile) out.push({ tone: 'warn', text: t(`${pl(dupInFile, 'LRN appears', 'LRNs appear')} twice in the file`, `${dupInFile} LRN ang doble sa file`) });
    if (alreadySaved) out.push({ tone: 'ok', text: t(`${pl(alreadySaved, 'student is', 'students are')} already in the Masterlist — name, section and parent will be updated (offenses and cases are kept)`, `${alreadySaved} estudyante ang nasa Masterlist na — ia-update ang pangalan, section at magulang (hindi gagalawin ang offense at kaso)`) });
  }

  // 5. Grade & section
  const noGrade = rows.filter((r) => !/^Grade 1[12]\b/.test(r.gradeSection)).length;
  const noSection = rows.filter((r) => !r.sectionCode.trim()).length;
  if (!noGrade && !noSection) {
    const sections = new Set(rows.map((r) => r.gradeSection)).size;
    out.push({ tone: 'ok', text: t(`Grade & section found for everyone (${sections} sections)`, `May grade at section ang lahat (${sections} section)`) });
  } else {
    if (noGrade) out.push({ tone: 'warn', text: t(`${pl(noGrade, 'row has', 'rows have')} no grade level`, `${noGrade} row ang walang grade level`) });
    if (noSection) out.push({ tone: 'warn', text: t(`${pl(noSection, 'row has', 'rows have')} no section`, `${noSection} row ang walang section`) });
  }

  // 6. Parents & mobile numbers
  const noParent = rows.filter((r) => !r.parentName.trim()).length;
  if (noParent) out.push({ tone: 'warn', text: t(`${pl(noParent, 'row has', 'rows have')} no parent / guardian name`, `${noParent} row ang walang pangalan ng magulang`) });
  if (analysis.extract.phonesFixed > 0) {
    out.push({
      tone: 'info',
      text: t(
        `Repaired ${pl(analysis.extract.phonesFixed, 'mobile number', 'mobile numbers')} (missing 0 or +63 → 09…)`,
        `Inayos ang ${analysis.extract.phonesFixed} mobile number (nawalang 0 o +63 → 09…)`
      ),
    });
  }
  const badPhone = rows.filter((r) => {
    const d = r.parentPhone.replace(/\D/g, '');
    return !(d.length === 11 && d.startsWith('09'));
  }).length;
  out.push(
    badPhone
      ? { tone: 'warn', text: t(`${pl(badPhone, 'mobile number needs', 'mobile numbers need')} fixing`, `${badPhone} mobile number ang kailangang ayusin`) }
      : { tone: 'ok', text: t('All mobile numbers are valid (09XX-XXX-XXXX)', 'Tama ang lahat ng mobile number (09XX-XXX-XXXX)') }
  );

  // 7. Gmail (optional)
  const withEmail = rows.filter((r) => r.parentEmail.trim()).length;
  const badEmail = rows.filter((r) => r.parentEmail.trim() && !checkEmail(r.parentEmail, isTl).ok).length;
  if (withEmail) {
    out.push({ tone: 'info', text: t(`${pl(withEmail, 'parent has', 'parents have')} a Gmail on file`, `${withEmail} magulang ang may Gmail`) });
  }
  if (badEmail) out.push({ tone: 'warn', text: t(`${pl(badEmail, 'email looks', 'emails look')} wrong or has a typo`, `${badEmail} email ang mali o may typo`) });

  return out;
};

/** Rows that will need a human fix (same rules as the Preview & Fix table, minus "already saved"). */
export const countRowsNeedingFix = (analysis: ImportAnalysis, isTl: boolean): number =>
  analysis.extract.rows.filter((r) => {
    const d = r.parentPhone.replace(/\D/g, '');
    return (
      !r.studentNumber.trim() ||
      !r.fullName.trim() ||
      !r.parentName.trim() ||
      !(d.length === 11 && d.startsWith('09')) ||
      !/^Grade 1[12]\b/.test(r.gradeSection) ||
      !r.sectionCode.trim() ||
      !checkEmail(r.parentEmail, isTl).ok
    );
  }).length;
