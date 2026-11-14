// Audit Trail — features flowchart page 16: "Who did what and when. Every change, before and after,
// cannot be edited." Read only: the database records every change by itself.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { soundFX } from '../services/soundEngine';
import { AuditEntry, fetchAuditPage, TABLE_WORDS, changedFields, fieldWord, showValue, whoOf, keyWord } from '../services/auditDb';
import { todayISO, addDays } from '../services/scheduling';
import { Legend } from '../components/ui/Charts';

const PAGE_SIZE = 50;
const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap';
const sub = 'text-xs text-[#4A608A] dark:text-[#94A8D0]';
const input = 'px-3 py-2 rounded-xl border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white';

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
  useEffect(() => setPage(0), [table, from, to, term]);

  const badDates = !!from && !!to && from > to;
  useEffect(() => {
    if (badDates) return;
    const id = ++reqId.current;
    setRows(null);
    void fetchAuditPage({ table, from, to, search: term, page, pageSize: PAGE_SIZE }).then((r) => {
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
  }, [table, from, to, term, page, badDates, retry]);

  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
    [isTl]
  );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const last = Math.min(total, (page + 1) * PAGE_SIZE);
  const filtered = !!table || !!term || from !== addDays(todayISO(), -30) || to !== todayISO();

  return (
    <main className="p-5 lg:p-6 max-w-[1440px] w-full mx-auto space-y-5 flex-1">
      {/* CDM-INSPIRED AUDIT TRAIL BREADCRUMB HEADER */}
      <div className="cdm-panel px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-wider uppercase text-[#1E469B] dark:text-[#7CB8F7]">
            SYSTEM SECURITY / FORENSIC AUDIT TRAIL & LOGS
          </div>
          <h1 className="text-xl font-extrabold text-[#0B1F4D] dark:text-white mt-0.5">
            {isTl ? 'Kasaysayan ng mga Pagbabago at Tala ng Aksyon' : 'System Audit Trail & Forensic Activity Log'}
          </h1>
          <p className="text-xs text-[#4A608A] dark:text-[#94A8D0] mt-1">
            {isTl
              ? 'Kusang itinatala ng database ang bawat pagbabago (dati at bagong value). Hindi ito maaaring i-edit o burahin (R.A. 10173).'
              : 'Permanent append-only record of all case modifications, status updates, and user access trails.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="cdm-badge-ready">
            ✓ IMMUTABLE LOGS
          </span>
        </div>
      </div>

      <div className="cdm-panel p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="block text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0]">{isTl ? 'Ano' : 'What'}</span>
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
            <span className="block text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0]">{isTl ? 'Mula' : 'From'}</span>
            <input data-audit-filter="from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={input} />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0]">{isTl ? 'Hanggang' : 'To'}</span>
            <input data-audit-filter="to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={input} />
          </label>
          <label className="space-y-1 flex-1 min-w-[220px]">
            <span className="block text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0]">{isTl ? 'Hanapin' : 'Search'}</span>
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
        <div className="px-5 py-3 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-[#0B1F4D] dark:text-white" data-audit-count>
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
          <div className="flex gap-1.5">
            <button type="button" data-audit-page="newer" disabled={page === 0 || rows === null} onClick={() => setPage((p) => Math.max(0, p - 1))} className={`${btn} saas-card-subtle disabled:opacity-40`}>
              ← {isTl ? 'Mas bago' : 'Newer'}
            </button>
            <span className={`${sub} self-center px-1`}>
              {page + 1}/{pages}
            </span>
            <button type="button" data-audit-page="older" disabled={page + 1 >= pages || rows === null} onClick={() => setPage((p) => p + 1)} className={`${btn} saas-card-subtle disabled:opacity-40`}>
              {isTl ? 'Mas luma' : 'Older'} →
            </button>
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-2 bg-[#F4F7FC] dark:bg-[#0B1527] min-h-[240px]">
          {rows !== null && rows.length === 0 && !error && (
            <div className="py-10 text-center space-y-1">
              <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Walang nakitang pagbabago.' : 'No changes found.'}</p>
              <p className={sub}>{isTl ? 'Subukang palawakin ang petsa o i-reset ang filter.' : 'Try a wider date range or reset the filters.'}</p>
            </div>
          )}
          {(rows ?? []).map((e) => {
            const a = ACTION[e.action] ?? ACTION.update;
            const fields = changedFields(e);
            const who = whoOf(e);
            const [en, tl] = TABLE_WORDS[e.table] ?? [e.table, e.table];
            return (
              <article key={e.id} data-audit-row={e.id} className="rounded-xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-extrabold ${a.cls}`}>{isTl ? a.tl : a.en}</span>
                  <span className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
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
                        <tr key={f.key} className="border-t border-[#EEF2F9] dark:border-[#1E3158]">
                          <td className="py-1 pr-3 align-top font-bold text-[#4A608A] dark:text-[#94A8D0] w-44">{fieldWord(f.key, isTl)}</td>
                          {e.action === 'update' ? (
                            <td className="py-1 align-top text-[#0B1F4D] dark:text-white break-words">
                              <span className="text-rose-700 dark:text-rose-300 line-through decoration-rose-300/70">{showValue(f.before, isTl)}</span>
                              <span className="mx-1.5 text-[#4A608A]">→</span>
                              <span className="text-emerald-700 dark:text-emerald-300 font-bold">{showValue(f.after, isTl)}</span>
                            </td>
                          ) : (
                            <td className="py-1 align-top text-[#0B1F4D] dark:text-white break-words">{showValue(e.action === 'insert' ? f.after : f.before, isTl)}</td>
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
