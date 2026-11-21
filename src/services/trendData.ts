// Turns a list of event dates (e.g. when each case came in) into points for the trend chart:
// by day (last 30 days), by week (last 13 weeks) or by month (last 6 months).
export type TrendUnit = 'day' | 'week' | 'month';
export interface TrendPoint { label: string; title: string; a: number; b: number }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayOf = (s: string) => (s || '').slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

export const TREND_SPAN: Record<TrendUnit, number> = { day: 30, week: 13, month: 6 };

/** count events into buckets; a = first list (e.g. new), b = second list (e.g. solved) */
export function buildTrend(aDates: string[], bDates: string[], unit: TrendUnit, tl = false, today = new Date(), extra = 0): TrendPoint[] {
  const span = TREND_SPAN[unit] + extra; // extra = older buckets, only used to warm up the average line
  const loc = tl ? 'fil-PH' : 'en-US';
  const buckets: { from: string; to: string; label: string; title: string }[] = [];
  if (unit === 'day') {
    for (let i = span - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      buckets.push({ from: iso(d), to: iso(d), label: new Intl.DateTimeFormat(loc, { month: 'short', day: 'numeric' }).format(d), title: new Intl.DateTimeFormat(loc, { weekday: 'short', month: 'short', day: 'numeric' }).format(d) });
    }
  } else if (unit === 'week') {
    const m0 = monday(today);
    for (let i = span - 1; i >= 0; i--) {
      const s = addDays(m0, -7 * i), e = addDays(s, 6);
      const f = new Intl.DateTimeFormat(loc, { month: 'short', day: 'numeric' });
      buckets.push({ from: iso(s), to: iso(e), label: f.format(s), title: `${f.format(s)} – ${f.format(e)}` });
    }
  } else {
    for (let i = span - 1; i >= 0; i--) {
      const s = new Date(today.getFullYear(), today.getMonth() - i, 1), e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
      buckets.push({ from: iso(s), to: iso(e), label: new Intl.DateTimeFormat(loc, { month: 'short' }).format(s), title: new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(s) });
    }
  }
  const count = (list: string[], b: { from: string; to: string }) => list.reduce((n, x) => { const d = dayOf(x); return d >= b.from && d <= b.to ? n + 1 : n; }, 0);
  return buckets.map((b) => ({ label: b.label, title: b.title, a: count(aDates, b), b: count(bDates, b) }));
}

/** smooth "trend" line: average of the last n points (like the blue line on a stock chart) */
export function movingAverage(values: number[], n: number): number[] {
  return values.map((_, i) => {
    const from = Math.max(0, i - n + 1);
    const slice = values.slice(from, i + 1);
    return Math.round((slice.reduce((s, v) => s + v, 0) / slice.length) * 10) / 10;
  });
}
export const AVG_WINDOW: Record<TrendUnit, number> = { day: 7, week: 4, month: 3 };

/** plain sentence: is it going up or down, and how many were solved / reviewed */
export function trendSentence(points: TrendPoint[], unit: TrendUnit, words: { aUp: string; aDown: string; aSame: string; b: string }, tl = false): string {
  if (!points.length) return '';
  const k = unit === 'day' ? 7 : unit === 'week' ? 4 : 1;
  const sum = (arr: TrendPoint[], key: 'a' | 'b') => arr.reduce((s, p) => s + p[key], 0);
  const last = points.slice(-k), prev = points.slice(-2 * k, -k);
  const nowA = sum(last, 'a'), prevA = sum(prev, 'a'), nowB = sum(last, 'b');
  const span = unit === 'day' ? (tl ? 'nitong 7 araw' : 'in the last 7 days') : unit === 'week' ? (tl ? 'nitong 4 na linggo' : 'in the last 4 weeks') : tl ? 'ngayong buwan' : 'this month';
  const dir = nowA > prevA ? words.aUp : nowA < prevA ? words.aDown : words.aSame;
  return `${dir} ${span} (${nowA}${tl ? ', mula ' : ', from '}${prevA}). ${nowB} ${words.b}.`;
}

/** SAMPLE ONLY (demo button): ~3 months of believable daily numbers, clearly marked as sample in the UI */
export function sampleDates(days = 92, seed = 7): { a: string[]; b: string[] } {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const a: string[] = [], b: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // school days only
    const t = (days - i) / days;
    const wave = 2.2 + 1.4 * Math.sin(t * Math.PI * 2.3) + 0.8 * Math.sin(t * Math.PI * 7.1);
    const nA = Math.max(0, Math.round(wave + (rnd() - 0.4) * 2.4));
    const nB = Math.max(0, Math.round(wave * 0.8 + (t > 0.5 ? 0.9 : 0) + (rnd() - 0.45) * 2));
    for (let j = 0; j < nA; j++) a.push(iso(d));
    for (let j = 0; j < nB; j++) b.push(iso(d));
  }
  return { a, b };
}
