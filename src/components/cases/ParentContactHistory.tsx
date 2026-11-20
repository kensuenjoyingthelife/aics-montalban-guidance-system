// Inside a case: every call / text / student call-out to the parent, in order (proof the school tried to reach them).
// Read-only (contact logs cannot be edited). Collapsed to the summary line until opened.
import React, { useEffect, useState } from 'react';
import { Phone, MessageSquare, UserRound, ChevronDown } from 'lucide-react';
import { fetchContactLogsForCase, type ContactLogEntry } from '../../services/supabaseClient';
import { contactLine, isReached, isNoAnswer } from '../../services/contactSummary';

export const ParentContactHistory: React.FC<{ caseCode: string; isTl: boolean; refreshKey?: unknown }> = ({ caseCode, isTl, refreshKey }) => {
  const [logs, setLogs] = useState<ContactLogEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    void fetchContactLogsForCase(caseCode).then((l) => { if (alive) setLogs(l ?? []); });
    return () => { alive = false; };
  }, [caseCode, refreshKey]);

  if (logs === null) return null;
  const when = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
  };
  const tone = (r: string) => (isReached(r) ? 'text-[#248A3D] dark:text-[#30D158]' : isNoAnswer(r) ? 'text-[#C93400] dark:text-[#FF9F0A]' : /wrong/i.test(r) ? 'text-[#D70015] dark:text-[#FF6961]' : 'text-[#1D1D1F] dark:text-white');
  const Icon = (m: string) => (/text|sms/i.test(m) ? MessageSquare : /call-out|student/i.test(m) ? UserRound : Phone);

  return (
    <section className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A]" data-contact-history>
      <button type="button" onClick={() => logs.length && setOpen((o) => !o)} aria-expanded={open} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <span className="w-9 h-9 rounded-full bg-[#007AFF]/[0.12] text-[#007AFF] flex items-center justify-center shrink-0"><Phone className="w-[18px] h-[18px]" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-[#1D1D1F] dark:text-white">{isTl ? 'Mga tawag sa magulang' : 'Parent contact history'}</span>
          <span className="block text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">{contactLine(logs, isTl)}</span>
        </span>
        {logs.length > 0 && <ChevronDown className={`w-4 h-4 text-[#8E8E93] transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && logs.length > 0 && (
        <ol className="px-4 pb-3 space-y-0 divide-y divide-[#F2F2F7] dark:divide-[#2C2C2E]">
          {logs.map((l, i) => {
            const I = Icon(l.method);
            return (
              <li key={l.id} className="py-2 flex items-start gap-3">
                <span className="w-6 text-right text-[12px] tabular-nums text-[#8E8E93] pt-0.5">{i + 1}.</span>
                <I className="w-4 h-4 mt-0.5 text-[#8E8E93] shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-semibold ${tone(l.result)}`}>{l.result || '—'}</span>
                  <span className="block text-[12px] text-[#6E6E73] dark:text-[#A1A1A6]">{when(l.when)} · {l.method}{l.actor ? ` · ${l.actor}` : ''}</span>
                  {l.note && <span className="block text-[12px] text-[#3A3A3C] dark:text-[#D1D1D6]">“{l.note}”</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
