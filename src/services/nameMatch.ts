/**
 * Smart student name matching (New case → "Who is involved?", and auto-pick from a student report).
 * - Word order does not matter: "al flores" = "flores al" = "Flores, Al".
 * - Middle initials are ignored on both sides ("Al D. Flores" matches "al flores" and "al x flores").
 * - One wrong letter is forgiven ("ai flores" still finds "Al Flores"), but exact words rank higher.
 * - The last name counts most, so the right person comes first.
 */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // ñ → n, é → e
    .replace(/[.,]/g, ' ');

const words = (s: string) => norm(s).split(/\s+/).filter(Boolean);

/** true when a and b differ by at most one letter (change, add or remove) */
const oneEditApart = (a: string, b: string): boolean => {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};

/**
 * Score how well `query` fits `fullName` (0 = no match). Higher is better.
 * Every real query word (2+ letters) must fit some name word.
 */
export function nameMatchScore(fullName: string, query: string): number {
  const qWords = words(query);
  if (!qWords.length) return 0;
  const nWords = words(fullName);
  if (!nWords.length) return 0;
  const lastName = nWords[nWords.length - 1];
  // single letters are middle initials: ignore them (unless the query is one letter only)
  const realQ = qWords.length === 1 ? qWords : qWords.filter((w) => w.length > 1);
  const realN = nWords.filter((w) => w.length > 1);
  if (!realQ.length) return 0;

  let score = 0;
  const used = new Set<number>();
  for (const q of realQ) {
    let best = 0;
    let bestIdx = -1;
    realN.forEach((n, idx) => {
      if (used.has(idx)) return;
      let s = 0;
      if (n === q) s = 6;
      else if (n.startsWith(q)) s = 4;
      // one wrong letter: in the whole word ("flores" ~ "florez") or in the start of it ("ai" ~ "al…")
      else if (oneEditApart(n, q) || oneEditApart(n.slice(0, q.length), q)) s = 2;
      if (s && n === lastName) s += 2; // last name first
      if (s > best) {
        best = s;
        bestIdx = idx;
      }
    });
    if (!best) return 0; // this word fits nobody → not a match
    used.add(bestIdx);
    score += best;
  }
  return score;
}

/** quick yes/no for lists that only need to filter */
export const nameMatches = (fullName: string, query: string) => nameMatchScore(fullName, query) > 0;
