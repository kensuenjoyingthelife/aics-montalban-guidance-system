// One sort menu used by every list (Golden Rule 3: same words everywhere).
// Default is "Newest first": the newest case / student / task is on top, the oldest at the bottom.
import React from 'react';

export type SortKey = 'newest' | 'oldest' | 'name' | 'attention';

const WORDS: Record<SortKey, [string, string]> = {
  newest: ['Newest first', 'Pinakabago muna'],
  oldest: ['Oldest first', 'Pinakaluma muna'],
  name: ['Name A–Z', 'Pangalan A–Z'],
  attention: ['Needs action first', 'Kailangang aksyunan muna'],
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
  <label className="inline-flex items-center gap-1.5 shrink-0" title={isTl ? 'Ayusin ang pagkakasunod ng listahan' : 'Change the order of the list'}>
    <span className="text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0] whitespace-nowrap">{isTl ? 'Ayusin:' : 'Sort:'}</span>
    <select
      data-sort={id}
      value={value}
      onChange={(e) => onChange(e.target.value as SortKey)}
      className="px-2.5 py-1.5 rounded-lg border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-xs font-bold text-[#0B1F4D] dark:text-white"
    >
      {options.map((k) => (
        <option key={k} value={k}>
          {WORDS[k][isTl ? 1 : 0]}
        </option>
      ))}
    </select>
  </label>
);
