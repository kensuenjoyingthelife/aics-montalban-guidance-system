// Parent contact attempts (calls / texts / student call-outs) summed up in plain words.
// Used by the case record, the Reports page and the printed forms.
import type { ContactLogEntry } from './supabaseClient';

export const isReached = (r: string) => /^reached/i.test(r);
export const isNoAnswer = (r: string) => /no answer/i.test(r);

export interface ContactSummary {
  total: number;
  noAnswer: number;
  reached: number;
  reschedule: number;
  wrongNumber: number;
  firstReachedAt: string; // ISO or ''
  triesBeforeReached: number; // attempts up to and including the first "Reached"
}

export function summarizeContacts(logs: ContactLogEntry[]): ContactSummary {
  const sorted = [...logs].sort((a, b) => (a.when < b.when ? -1 : 1));
  const firstIdx = sorted.findIndex((l) => isReached(l.result));
  return {
    total: sorted.length,
    noAnswer: sorted.filter((l) => isNoAnswer(l.result)).length,
    reached: sorted.filter((l) => isReached(l.result)).length,
    reschedule: sorted.filter((l) => /reschedule/i.test(l.result)).length,
    wrongNumber: sorted.filter((l) => /wrong number/i.test(l.result)).length,
    firstReachedAt: firstIdx >= 0 ? sorted[firstIdx].when : '',
    triesBeforeReached: firstIdx >= 0 ? firstIdx + 1 : 0,
  };
}

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
};

/** one line for forms / case: "Parent contacted 6 times (5 no answer); reached on Nov 19, 2026." */
export function contactLine(logs: ContactLogEntry[], tl = false): string {
  const s = summarizeContacts(logs);
  if (!s.total) return tl ? 'Walang naitalang tawag o text sa magulang.' : 'No calls or texts to the parent recorded.';
  const parts: string[] = [];
  if (s.noAnswer) parts.push(tl ? `${s.noAnswer} walang sumagot` : `${s.noAnswer} no answer`);
  if (s.wrongNumber) parts.push(tl ? `${s.wrongNumber} maling number` : `${s.wrongNumber} wrong number`);
  const head = tl ? `Na-contact ang magulang nang ${s.total} beses` : `Parent contacted ${s.total} time${s.total === 1 ? '' : 's'}`;
  const tail = s.firstReachedAt
    ? tl ? `; naabot noong ${day(s.firstReachedAt)}.` : `; reached on ${day(s.firstReachedAt)}.`
    : tl ? '; hindi pa naaabot.' : '; not reached yet.';
  return `${head}${parts.length ? ` (${parts.join(', ')})` : ''}${tail}`;
}
