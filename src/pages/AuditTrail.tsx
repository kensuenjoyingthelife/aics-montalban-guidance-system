// Audit Trail — features flowchart page 16: "Who did what and when. Every change, before and after,
// cannot be edited." Read only: the database records every change by itself.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DateField } from '../components/ui/DateField';
import { useLanguage } from '../context/LanguageContext';
import { soundFX } from '../services/soundEngine';
import { AuditEntry, fetchAuditPage, TABLE_WORDS, changedFields, fieldWord, showValue, whoOf, keyWord } from '../services/auditDb';
import { todayISO, addDays } from '../services/scheduling';
import { Legend } from '../components/ui/Charts';
import { printAuditTrailPdf, setNextPrintNote } from '../services/documentPrintEngine';
import { usePrintInfo, confirmPrint, recordPrint, reprintNote, printedBadgeText } from '../services/printLog';
import { useConfirmChange } from '../components/ui/ConfirmChange';
import { Printer, Download, Filter, RefreshCw, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

const PAGE_SIZE = 50;
const btn = 'px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap';
const sub = 'text-xs text-[#6E6E73] dark:text-[#A1A1A6]';
const input = 'px-3 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-sm text-[#1D1D1F] dark:text-white';

const ACTION: Record<string, { en: string; tl: string; cls: string }> = {
  insert: { en: 'Added', tl: 'Idinagdag', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  update: { en: 'Changed', tl: 'Binago', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200' },
  delete: { en: 'Removed', tl: 'Inalis', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200' },
};

const AuditTrail: React.FC = () => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';
  const [table, setTable] = useState('');
  const [from, setFrom] = useState(addDays(todayISO(), -30));
  const [to, setTo] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState(''); // debounced search
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const reqId = useRef(0);

  // wait until the user stops typing (no request per key)
  useEffect(() => {
    const t = window.setTimeout(() => setTerm(search), 350);
    return () => window.clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(0), [table, from, to, term, pageSize]);

  const badDates = !!from && !!to && from > to;
  useEffect(() => {
    if (badDates) return;
    const id = ++reqId.current;
    setRows(null);
    void fetchAuditPage({ table, from, to, search: term, page, pageSize }).then((r) => {
      if (id !== reqId.current) return; // an older request finished late
      if (!r) {
        setError(true);
        setRows([]);
        return;
      }
      setError(false);
      setRows(r.rows);
      setTotal(r.total);
    });
  }, [table, from, to, term, page, pageSize, badDates, retry]);

  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
    [isTl]
  );
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);
  const filtered = !!table || !!term || from !== addDays(todayISO(), -30) || to !== todayISO();

  // print log: same date range + filter = same document ("Printed" badge, warning before a reprint)
  const confirm = useConfirmChange();
  const auditKey = `audit:${from}_${to}_${table || 'all'}_${term || ''}`;
  const printed = usePrintInfo([auditKey]);
  const auditBadge = printedBadgeText(printed(auditKey), isTl);
  const handleDownloadPdf = async () => {
    if (!rows || rows.length === 0) return;
    const ok = await confirmPrint(confirm, {
      docKey: auditKey,
      titleEn: 'Audit Trail Log',
      titleTl: 'Audit Trail Log',
      tl: isTl,
      rows: [
        { label: isTl ? 'Petsa' : 'Dates', after: `${from} – ${to}` },
        { label: isTl ? 'Bilang ng tala' : 'Records', after: String(rows.length) },
      ],
    });
    if (!ok) return;
    setNextPrintNote(reprintNote(printed(auditKey)));
    soundFX.playStepUnlock();
    const formattedRows = rows.map((e) => {
      const a = ACTION[e.action] ?? ACTION.update;
      const fields = changedFields(e);
      const who = whoOf(e);
      const [en, tl] = TABLE_WORDS[e.table] ?? [e.table, e.table];
      const desc = `${isTl ? tl : en}${who ? ' · ' + who : ''}`;
      const detailStr = fields
        .map((f) => {
          const fName = fieldWord(f.key, isTl);
          if (e.action === 'update') {
            return `${fName}: ${showValue(f.before, isTl)} → ${showValue(f.after, isTl)}`;
          }
          return `${fName}: ${showValue(e.action === 'insert' ? f.after : f.before, isTl)}`;
        })
        .join('; ');

      return {
        date: e.at ? timeFmt.format(new Date(e.at)) : '—',
        actor: e.actor || 'System',
        action: isTl ? a.tl : a.en,
        table: isTl ? tl : en,
        description: desc,
        detail: detailStr || (isTl ? 'Walang partikular na field' : 'No specific field changed'),
      };
    });

    const filterText = [
      table ? `Module: ${table}` : 'Module: All',
      term ? `Search: "${term}"` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    printAuditTrailPdf({
      rows: formattedRows,
      filterSummary: filterText || 'All Modules',
      dateRange: `${from} to ${to}`,
      staffName: 'Guidance Staff',
    });
    void recordPrint(auditKey, 'audit', `Audit Trail ${from} to ${to}`);
  };

  return (
    <main className="p-5 lg:p-6 max-w-[1440px] w-full mx-auto space-y-5 flex-1">
      {/* CLEAN EXECUTIVE AUDIT TRAIL HEADER (NO ALL-CAPS EYEBROW) */}
      <div className="px-1 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="sr-only">
            {isTl ? 'Kasaysayan ng mga Pagbabago at Tala ng Aksyon' : 'System Audit Trail & Forensic Activity Log'}
          </h1>
          <p className="text-[15px] text-[#6E6E73] dark:text-[#A1A1A6]">
            {isTl
              ? 'Lahat ng pagbabago ay naitatala dito (dati at bago). Hindi ito mae-edit o mabubura.'
              : 'Every change is saved here (old and new). It cannot be edited or deleted.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!rows || rows.length === 0}
            onClick={() => void handleDownloadPdf()}
            className={`${btn} bg-[#007AFF] hover:bg-[#0062CC] text-white active:scale-[0.97] transition-[transform,background-color] inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50`}
          >
            <Download className="w-3.5 h-3.5" />
            {isTl ? 'Audit Trail · I-download / I-print (PDF)' : 'Audit Trail · Download / Print (PDF)'}
          </button>
          {auditBadge && (
            <span data-printed-badge="audit" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[#E8F5E9] text-[#166534] dark:bg-[#14301C] dark:text-[#4ADE80]">
              ✓ {auditBadge}
            </span>
          )}
          <span className="cdm-badge-ready">
            {isTl ? 'Opisyal na tala' : 'Immutable log'}
          </span>
        </div>
      </div>

      <div className="cdm-panel p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="block text-[11px] font-extrabold text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Ano' : 'What'}</span>
            <select data-audit-filter="table" value={table} onChange={(e) => setTable(e.target.value)} className={input}>
              <option value="">{isTl ? 'Lahat' : 'Everything'}</option>
              {Object.entries(TABLE_WORDS).map(([k, [en, tl]]) => (
                <option key={k} value={k}>
                  {isTl ? tl : en}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] font-extrabold text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Mula' : 'From'}</span>
            <DateField compact value={from} max={to || undefined} onChange={setFrom} isTl={isTl} placeholder={isTl ? 'Mula' : 'From'} ariaLabel={isTl ? 'Mula' : 'From'} />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] font-extrabold text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Hanggang' : 'To'}</span>
            <DateField compact value={to} min={from || undefined} onChange={setTo} isTl={isTl} placeholder={isTl ? 'Hanggang' : 'To'} ariaLabel={isTl ? 'Hanggang' : 'To'} />
          </label>
          <label className="space-y-1 flex-1 min-w-[220px]">
            <span className="block text-[11px] font-extrabold text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Hanapin' : 'Search'}</span>
            <input
              data-audit-filter="search"
              value={search}
              onChange={(e) => setSearch(e.target.value.slice(0, 80))}
              placeholder={isTl ? 'Pangalan, student no., o case code' : 'Name, student no. or case code'}
              className={`${input} w-full`}
            />
          </label>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                soundFX.playToggleSwitch(false);
                setTable('');
                setSearch('');
                setFrom(addDays(todayISO(), -30));
                setTo(todayISO());
              }}
              className={`${btn} py-2.5 saas-card-subtle`}
            >
              {isTl ? 'I-reset' : 'Reset'}
            </button>
          )}
        </div>
        {badDates && (
          <p role="alert" className="text-xs font-bold text-rose-700 dark:text-rose-300">
            {isTl ? '"Mula" ay dapat bago o kapareho ng "Hanggang". Ayusin ang petsa.' : '"From" must be on or before "To". Fix the dates.'}
          </p>
        )}
      </div>

      {error && (
        <div role="alert" className="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold text-rose-900 dark:text-rose-200">{isTl ? 'Hindi makuha ang history. I-check ang internet, tapos subukan ulit.' : 'Could not load the history. Check the internet, then try again.'}</p>
          <button type="button" onClick={() => setRetry((n) => n + 1)} className={`${btn} bg-rose-600 text-white`}>
            {isTl ? 'Subukan ulit' : 'Try again'}
          </button>
        </div>
      )}

      <section className="rounded-2xl saas-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E5EA] dark:border-[#38383A] flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-[#1D1D1F] dark:text-white" data-audit-count>
            {rows === null
              ? isTl ? 'Kinukuha…' : 'Loading…'
              : total === 0
              ? isTl ? 'Walang pagbabago sa napili' : 'No changes for this choice'
              : isTl ? `${first}–${last} sa ${total} pagbabago · pinakabago sa itaas` : `${first}–${last} of ${total} changes · newest first`}
          </p>
          <Legend
            items={[
              { color: '#10B981', label: isTl ? 'Idinagdag' : 'Added', shape: 'box' },
              { color: '#0EA5E9', label: isTl ? 'Binago (pula = dati, berde = bago)' : 'Changed (red = old, green = new)', shape: 'box' },
              { color: '#F43F5E', label: isTl ? 'Inalis' : 'Removed', shape: 'box' },
            ]}
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
              <span>{isTl ? 'Bawat pahina:' : 'Rows:'}</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-xs font-bold"
              >
                {[15, 25, 50, 100].map((sz) => (
                  <option key={sz} value={sz}>{sz}</option>
                ))}
              </select>
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                data-audit-page="newer"
                disabled={page === 0 || rows === null}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className={`${btn} saas-card-subtle disabled:opacity-40 inline-flex items-center gap-1`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {isTl ? 'Mas bago' : 'Newer'}
              </button>
              <span className={`${sub} self-center px-1 font-mono font-bold`}>
                {page + 1} / {pages}
              </span>
              <button
                type="button"
                data-audit-page="older"
                disabled={page + 1 >= pages || rows === null}
                onClick={() => setPage((p) => p + 1)}
                className={`${btn} saas-card-subtle disabled:opacity-40 inline-flex items-center gap-1`}
              >
                {isTl ? 'Mas luma' : 'Older'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-2 bg-[#F5F5F7] dark:bg-[#1C1C1E] min-h-[240px]">
          {rows !== null && rows.length === 0 && !error && (
            <div className="py-10 text-center space-y-1">
              <p className="text-sm font-extrabold text-[#1D1D1F] dark:text-white">{isTl ? 'Walang nakitang pagbabago.' : 'No changes found.'}</p>
              <p className={sub}>{isTl ? 'Subukang palawakin ang petsa o i-reset ang filter.' : 'Try a wider date range or reset the filters.'}</p>
            </div>
          )}
          {(rows ?? []).map((e) => {
            const a = ACTION[e.action] ?? ACTION.update;
            const fields = changedFields(e);
            const who = whoOf(e);
            const [en, tl] = TABLE_WORDS[e.table] ?? [e.table, e.table];
            return (
              <article key={e.id} data-audit-row={e.id} className="rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-extrabold ${a.cls}`}>{isTl ? a.tl : a.en}</span>
                  <span className="text-sm font-extrabold text-[#1D1D1F] dark:text-white">
                    {isTl ? tl : en}
                    {who ? ` · ${who}` : ''}
                  </span>
                  <span className={sub}>{keyWord(e, isTl)}</span>
                  <span className={`${sub} ml-auto whitespace-nowrap`}>
                    {e.at ? timeFmt.format(new Date(e.at)) : ''} · {e.actor || (isTl ? 'System' : 'System')}
                  </span>
                </div>
                {fields.length > 0 && (
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {fields.map((f) => (
                        <tr key={f.key} className="border-t border-[#EEF2F9] dark:border-[#38383A]">
                          <td className="py-1 pr-3 align-top font-bold text-[#6E6E73] dark:text-[#A1A1A6] w-44">{fieldWord(f.key, isTl)}</td>
                          {e.action === 'update' ? (
                            <td className="py-1 align-top text-[#1D1D1F] dark:text-white break-words">
                              <span className="text-rose-700 dark:text-rose-300 line-through decoration-rose-300/70">{showValue(f.before, isTl)}</span>
                              <span className="mx-1.5 text-[#6E6E73]">→</span>
                              <span className="text-emerald-700 dark:text-emerald-300 font-bold">{showValue(f.after, isTl)}</span>
                            </td>
                          ) : (
                            <td className="py-1 align-top text-[#1D1D1F] dark:text-white break-words">{showValue(e.action === 'insert' ? f.after : f.before, isTl)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default AuditTrail;
