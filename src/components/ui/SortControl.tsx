// One sort control used by every list (Golden Rule 3: same words everywhere).
// AGENTS.md §5 #1 (Hick's Law): 2–4 choices are segmented pills, not a dropdown.
// Default is "Newest first": the newest case / student / task is on top, the oldest at the bottom.
import React from 'react';

export type SortKey = 'newest' | 'oldest' | 'name' | 'attention';

/** [long English, long Tagalog, short English, short Tagalog] */
const WORDS: Record<SortKey, [string, string, string, string]> = {
  newest: ['Newest first', 'Pinakabago muna', 'Newest', 'Bago'],
  oldest: ['Oldest first', 'Pinakaluma muna', 'Oldest', 'Luma'],
  name: ['Name A–Z', 'Pangalan A–Z', 'A–Z', 'A–Z'],
  attention: ['Needs action first', 'Kailangang aksyunan muna', 'Urgent', 'Urgent'],
};

/** remembers the choice per list on this computer (safe if storage is blocked) */
export function loadSort(key: string, fallback: SortKey = 'newest'): SortKey {
  try {
    const v = localStorage.getItem('aics_sort_' + key) as SortKey | null;
    return v && v in WORDS ? v : fallback;
  } catch {
    return fallback;
  }
}
export function saveSort(key: string, v: SortKey) {
  try {
    localStorage.setItem('aics_sort_' + key, v);
  } catch {
    /* private mode */
  }
}

/** ISO date → time (missing dates go last on "newest", first on "oldest") */
export const timeOf = (iso?: string | null) => {
  const t = iso ? Date.parse(iso.length === 10 ? iso + 'T00:00:00' : iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

// made once: building a date formatter is slow, and lists show many dates
const FMT_EN = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const FMT_TL = new Intl.DateTimeFormat('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' });

/** "Added Nov 12, 2026" */
export function addedLabel(iso: string | undefined | null, tl: boolean): string {
  const t = timeOf(iso);
  if (!t) return '';
  const d = new Date(t);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  const when = sameDay
    ? tl ? 'ngayon' : 'today'
    : d.toDateString() === y.toDateString()
    ? tl ? 'kahapon' : 'yesterday'
    : (tl ? FMT_TL : FMT_EN).format(d);
  return tl ? `Idinagdag ${when}` : `Added ${when}`;
}

export const SortControl: React.FC<{
  value: SortKey;
  onChange: (v: SortKey) => void;
  isTl: boolean;
  options?: SortKey[];
  id: string;
}> = ({ value, onChange, isTl, options = ['newest', 'oldest', 'name', 'attention'], id }) => (
  <div
    role="radiogroup"
    data-sort={id}
    aria-label={isTl ? 'Ayusin ang listahan' : 'Sort the list'}
    className="inline-flex items-center p-0.5 rounded-lg bg-[#EEF3F9] dark:bg-[#0E1D34] border border-[#E5E5EA] dark:border-white/10 shrink-0"
  >
    {options.map((k) => {
      const on = value === k;
      return (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={on}
          title={WORDS[k][isTl ? 1 : 0]}
          onClick={() => onChange(k)}
          className={`px-2 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
            on
              ? 'bg-white dark:bg-[#1E3250] text-[#1D1D1F] dark:text-white shadow-sm'
              : 'text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white'
          }`}
        >
          {WORDS[k][isTl ? 3 : 2]}
        </button>
      );
    })}
  </div>
);
