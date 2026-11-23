// Print log for official documents (reports + forms).
// - Shows "Printed · Nov 24 · 2×" next to each print button
// - Asks before printing, and warns clearly before a REPRINT (avoids misclicks and duplicate copies)
// - Kept forever: the app can add and read, never change or delete (database policy)
import { useEffect, useState } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY, actorHeader, getAuditActor } from './supabaseClient';
import { getAppConfig } from './appConfig';

export type PrintDocType = 'monthly' | 'quarterly' | 'slip' | 'audit' | 'form';
export interface PrintRecord {
  docKey: string;
  title: string;
  by: string;
  at: string;
}
export interface PrintInfo {
  count: number;
  last: PrintRecord | null;
}

const headers = (): HeadersInit => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  ...actorHeader(),
});

// in-memory cache so badges show at once; refreshed from the database
const cache = new Map<string, PrintRecord[]>();
const EVENT = 'aics-print-log-changed';

/** a person's display name from the staff list (falls back to the email name) */
export const staffNameFor = (email: string) => {
  const s = getAppConfig().staff.find((x) => x.email.toLowerCase() === email.toLowerCase());
  return s?.fullName || (email.includes('@') ? email.split('@')[0] : email) || 'Guidance staff';
};

export async function loadPrints(docKeys: string[]): Promise<void> {
  const keys = [...new Set(docKeys.filter(Boolean))];
  if (!keys.length) return;
  try {
    const list = keys.map((k) => `"${k.replace(/"/g, '')}"`).join(',');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/document_prints?select=doc_key,title,printed_by,printed_at&doc_key=in.(${encodeURIComponent(list)})&order=printed_at.desc&limit=1000`, { headers: headers() });
    if (!res.ok) return;
    const rows = (await res.json()) as Array<Record<string, string>>;
    keys.forEach((k) => cache.set(k, []));
    rows.forEach((r) => cache.get(r.doc_key)?.push({ docKey: r.doc_key, title: r.title, by: r.printed_by, at: r.printed_at }));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* offline: badges just stay as they were */
  }
}

export const printInfo = (docKey: string): PrintInfo => {
  const l = cache.get(docKey) ?? [];
  return { count: l.length, last: l[0] ?? null };
};

export async function recordPrint(docKey: string, docType: PrintDocType, title: string): Promise<void> {
  const by = getAuditActor() || 'Guidance staff';
  const rec: PrintRecord = { docKey, title, by, at: new Date().toISOString() };
  cache.set(docKey, [rec, ...(cache.get(docKey) ?? [])]);
  window.dispatchEvent(new Event(EVENT));
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/document_prints`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ doc_key: docKey, doc_type: docType, title: title.slice(0, 200), printed_by: by }),
    });
  } catch {
    /* the badge still shows on this computer; the next load corrects it */
  }
}

/** React: print info for these documents, loaded once and kept up to date */
export function usePrintInfo(docKeys: string[]): (docKey: string) => PrintInfo {
  const [, setTick] = useState(0);
  const sig = docKeys.join('|');
  useEffect(() => {
    void loadPrints(docKeys);
    const on = () => setTick((t) => t + 1);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return printInfo;
}

const when = (iso: string, tl: boolean) =>
  new Intl.DateTimeFormat(tl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/** short badge text: "Printed · Nov 24 · 2×" (empty when never printed) */
export const printedBadgeText = (info: PrintInfo, tl: boolean) =>
  info.count
    ? `${tl ? 'Na-print' : 'Printed'} · ${new Intl.DateTimeFormat(tl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(info.last!.at))}${info.count > 1 ? ` · ${info.count}×` : ''}`
    : '';

/** "REPRINT · 2nd copy" for the paper itself (empty for the first print) */
export const reprintNote = (info: PrintInfo) => {
  if (!info.count) return '';
  const n = info.count + 1;
  const sfx = n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th';
  return `REPRINT · ${n}${sfx} copy`;
};

type ConfirmFn = (o: {
  title: string;
  description?: string;
  rows: Array<{ label: string; before?: string; after: string }>;
  confirmLabel?: string;
  tone?: 'primary' | 'danger' | 'success';
}) => Promise<boolean>;

/**
 * Ask before printing. First print: a normal question. Already printed: says when and by whom, and asks again.
 * Returns true when the user really wants to print.
 */
export async function confirmPrint(
  confirm: ConfirmFn,
  opts: { docKey: string; titleEn: string; titleTl: string; tl: boolean; rows?: Array<{ label: string; after: string }> }
): Promise<boolean> {
  const info = printInfo(opts.docKey);
  const t = opts.tl ? opts.titleTl : opts.titleEn;
  if (!info.count) {
    return confirm({
      title: opts.tl ? `I-print / i-download ang ${t}?` : `Print / download the ${t}?`,
      description: opts.tl ? 'Bubukas ang print. Piliin ang printer, o "Save as PDF" para ma-download.' : 'The print window opens. Pick the printer, or "Save as PDF" to download it.',
      rows: [{ label: opts.tl ? 'Dokumento' : 'Document', after: t }, ...(opts.rows ?? [])],
      confirmLabel: opts.tl ? 'Oo, i-print' : 'Yes, print',
      tone: 'primary',
    });
  }
  return confirm({
    title: opts.tl ? `Na-print na ito. I-print ulit?` : `This was already printed. Print again?`,
    description: opts.tl
      ? `Huling na-print noong ${when(info.last!.at, true)} ni ${staffNameFor(info.last!.by)} (${info.count}× na). May nakasulat na "REPRINT" sa bagong kopya.`
      : `Last printed on ${when(info.last!.at, false)} by ${staffNameFor(info.last!.by)} (${info.count}× so far). The new copy will say "REPRINT".`,
    rows: [{ label: opts.tl ? 'Dokumento' : 'Document', after: t }, ...(opts.rows ?? [])],
    confirmLabel: opts.tl ? 'Oo, i-print ulit' : 'Yes, print again',
    tone: 'danger',
  });
}
