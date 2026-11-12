// Counselor Referral Queue — features flowchart page 10.
// "Cases the counselor should handle on scheduled days. Severe or repeated cases, ordered by priority."
// Students enter automatically; the office schedules them on a counselor day and marks them Seen.
// No counseling notes here (out of scope, manuscript §1.6).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { useConfirmChange } from '../components/ui/ConfirmChange';
import { soundFX } from '../services/soundEngine';
import type { ToastNextAction } from './DashboardPage';
import type { StudentRecord, DisciplineCaseRecord } from '../data/stage3MockData';
import type { ParentAppointmentItem } from '../data/dashboardMockData';
import { insertActivityLogInDb } from '../services/supabaseClient';
import { buildQueue, nextCounselorDays, QueueItem, ReferralRow, ReferralStatus, UNDONE } from '../services/referralRules';
import { fetchReferrals, insertReferral, updateReferral } from '../services/referralsDb';
import { useAppConfig, saveConfig } from '../services/appConfig';
import { todayISO, addDays } from '../services/scheduling';
import { Legend } from '../components/ui/Charts';

type Tab = 'waiting' | 'scheduled' | 'done';
interface Props {
  students: StudentRecord[];
  cases: DisciplineCaseRecord[];
  appointments: ParentAppointmentItem[];
  onTriggerToast: (msg: string, undo?: () => void, next?: ToastNextAction) => void;
  onOpenCase?: (caseCode: string) => void;
  /** keeps the sidebar badge in step with this page */
  onRowsChanged?: (rows: ReferralRow[]) => void;
}

const PAGE = 50;
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEK_TL: Record<string, string> = { Mon: 'Lunes', Tue: 'Martes', Wed: 'Miyerkules', Thu: 'Huwebes', Fri: 'Biyernes' };
const WEEK_EN: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };
const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap';
const card = 'rounded-2xl saas-card overflow-hidden';
const sub = 'text-xs text-[#4A608A] dark:text-[#94A8D0]';
const NOT_SAVED_EN = '⚠️ Not saved. Check the internet, then try again.';
const NOT_SAVED_TL = '⚠️ Hindi na-save. I-check ang internet, tapos subukan ulit.';

const reasonTone: Record<string, string> = {
  grave: 'bg-rose-600 text-white',
  serious: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  escalated: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  repeat: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  missed: 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200',
  manual: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
};

const ReferralQueue: React.FC<Props> = ({ students, cases, appointments, onTriggerToast, onOpenCase, onRowsChanged }) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';
  const confirmChange = useConfirmChange();
  const today = todayISO();

  const [tab, setTab] = useState<Tab>('waiting');
  const [rows, setRows] = useState<ReferralRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  // counselor days = Settings › Schedules (one value for the whole app)
  const appCfg = useAppConfig();
  const days = useMemo(() => (appCfg.counselorDays || []).filter((x) => WEEK.includes(x)), [appCfg.counselorDays]);
  const daysLoaded = appCfg.loaded;
  const [limit, setLimit] = useState(PAGE);
  const [scheduleFor, setScheduleFor] = useState<QueueItem | null>(null);
  const [removeFor, setRemoveFor] = useState<QueueItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [daysOpen, setDaysOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const r = await fetchReferrals();
    if (r) {
      setRows(r);
      setLoadError(false);
    } else setLoadError(true);
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);

  const queue = useMemo(() => (rows ? buildQueue(cases, appointments, rows) : []), [cases, appointments, rows]);
  const waiting = useMemo(() => queue.filter((q) => q.status === 'Waiting'), [queue]);
  const scheduled = useMemo(
    () => queue.filter((q) => q.status === 'Scheduled').sort((a, b) => (a.row?.scheduledDate ?? '').localeCompare(b.row?.scheduledDate ?? '')),
    [queue]
  );
  const done = useMemo(
    () => queue.filter((q) => q.status === 'Seen' || q.status === 'Removed').sort((a, b) => (b.row?.id ?? 0) - (a.row?.id ?? 0)),
    [queue]
  );
  const dueNow = scheduled.filter((q) => (q.row?.scheduledDate ?? '') <= today);
  useEffect(() => {
    if (rows) onRowsChanged?.(rows);
  }, [rows, onRowsChanged]);
  useEffect(() => setLimit(PAGE), [tab]);

  const dateFmt = useMemo(() => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' }), [isTl]);
  const dayTitle = (iso: string) => (iso === today ? (isTl ? 'Ngayon' : 'Today') : iso === addDays(today, 1) ? (isTl ? 'Bukas' : 'Tomorrow') : dateFmt.format(new Date(iso + 'T00:00:00')));
  const daysText = days.length ? days.map((d) => (isTl ? WEEK_TL[d] : WEEK_EN[d])).join(', ') : isTl ? 'wala pang naka-set' : 'not set yet';

  /** write the new status: update the open row, or start a new row (new referral cycle) */
  const saveStatus = async (q: QueueItem, status: ReferralStatus, extra: { scheduledDate?: string | null; removedReason?: string } = {}) => {
    const open = q.row && (q.row.status === 'Waiting' || q.row.status === 'Scheduled') ? q.row : undefined;
    const saved = open
      ? await updateReferral(open.id, { status, scheduledDate: extra.scheduledDate, removedReason: extra.removedReason ?? null, seen: status === 'Seen' })
      : await insertReferral({ studentNumber: q.studentNumber, studentName: q.studentName, status, scheduledDate: extra.scheduledDate, removedReason: extra.removedReason });
    if (!saved) return null;
    setRows((l) => (l ? (open ? l.map((r) => (r.id === saved.id ? saved : r)) : [...l, saved]) : [saved]));
    return { saved, previous: open };
  };
  /** put a row back exactly as it was (Undo) */
  const restore = async (saved: ReferralRow, previous?: ReferralRow) => {
    const back = previous
      ? await updateReferral(saved.id, { status: previous.status, scheduledDate: previous.scheduledDate || null, removedReason: previous.removedReason || null, seen: previous.status === 'Seen' })
      : await updateReferral(saved.id, { status: 'Removed', removedReason: UNDONE });
    if (!back) return onTriggerToast(isTl ? NOT_SAVED_TL : NOT_SAVED_EN);
    if (previous) setRows((l) => (l ? l.map((r) => (r.id === back.id ? back : r)) : l));
    else setRows((l) => (l ? l.filter((r) => r.id !== saved.id) : l)); // a brand-new row that was undone: hide it
  };
  const log = (en: string, tl: string, tone = 'blue') => void insertActivityLogInDb({ actor: 'Guidance Associate', actionEn: en, actionTl: tl, tag: 'Referral', tone });

  const doSchedule = async (q: QueueItem, date: string) => {
    const ok = await confirmChange({
      title: isTl ? 'I-schedule sa counselor?' : 'Schedule with the counselor?',
      description: `${q.studentName}${q.gradeSection ? ` · ${q.gradeSection}` : ''}`,
      rows: [
        { label: 'Status', before: q.status === 'Scheduled' ? (isTl ? 'Naka-schedule' : 'Scheduled') : isTl ? 'Naghihintay' : 'Waiting', after: isTl ? 'Naka-schedule' : 'Scheduled' },
        { label: isTl ? 'Petsa' : 'Date', before: q.row?.scheduledDate ? dayTitle(q.row.scheduledDate) : undefined, after: dayTitle(date) },
      ],
      confirmLabel: isTl ? 'Oo, i-schedule' : 'Yes, schedule',
      tone: 'primary',
    });
    if (!ok) return;
    setBusy(true);
    const r = await saveStatus(q, 'Scheduled', { scheduledDate: date });
    setBusy(false);
    if (!r) return onTriggerToast(isTl ? NOT_SAVED_TL : NOT_SAVED_EN);
    setScheduleFor(null);
    log(`Scheduled ${q.studentName} with the counselor on ${date}`, `Na-schedule si ${q.studentName} sa counselor sa ${date}`);
    soundFX.playSuccessCheck();
    onTriggerToast(
      isTl ? `✓ Naka-schedule si ${q.studentName} sa counselor: ${dayTitle(date)}.` : `✓ ${q.studentName} is scheduled with the counselor: ${dayTitle(date)}.`,
      () => void restore(r.saved, r.previous),
      { label: isTl ? 'Tingnan ang naka-schedule' : 'See scheduled', run: () => setTab('scheduled') }
    );
  };

  const doSeen = async (q: QueueItem) => {
    const ok = await confirmChange({
      title: isTl ? 'Nakausap na ng counselor?' : 'Seen by the counselor?',
      description: q.studentName,
      rows: [
        { label: 'Status', before: isTl ? 'Naka-schedule' : 'Scheduled', after: isTl ? 'Nakausap na' : 'Seen' },
        { label: isTl ? 'Mga kaso' : 'Cases', after: isTl ? 'Hindi nagbabago — isara sa "Mga Kaso" kapag tapos na' : 'Not changed — close them in "Cases" when done' },
      ],
      confirmLabel: isTl ? 'Oo, nakausap na' : 'Yes, seen',
      tone: 'success',
    });
    if (!ok) return;
    const r = await saveStatus(q, 'Seen');
    if (!r) return onTriggerToast(isTl ? NOT_SAVED_TL : NOT_SAVED_EN);
    log(`${q.studentName} was seen by the counselor`, `Nakausap na ng counselor si ${q.studentName}`, 'emerald');
    soundFX.playSuccessCheck();
    onTriggerToast(isTl ? `✓ Nakausap na si ${q.studentName}. Babalik siya sa listahan kapag may bagong kaso.` : `✓ ${q.studentName} was seen. They come back to the list if a new case is reported.`, () => void restore(r.saved, r.previous));
  };

  const doRemove = async (q: QueueItem, reason: string) => {
    const ok = await confirmChange({
      title: isTl ? 'Alisin sa listahan ng counselor?' : 'Remove from the counselor list?',
      description: q.studentName,
      rows: [
        { label: 'Status', before: isTl ? 'Naghihintay' : 'Waiting', after: isTl ? 'Inalis' : 'Removed' },
        { label: isTl ? 'Dahilan' : 'Reason', after: reason },
      ],
      note: isTl ? 'Babalik siya kapag may bagong kaso. Puwede mo rin siyang ibalik sa "Tapos na".' : 'They come back if a new case is reported. You can also put them back in "Done".',
      confirmLabel: isTl ? 'Oo, alisin' : 'Yes, remove',
      tone: 'danger',
    });
    if (!ok) return;
    const r = await saveStatus(q, 'Removed', { removedReason: reason });
    if (!r) return onTriggerToast(isTl ? NOT_SAVED_TL : NOT_SAVED_EN);
    setRemoveFor(null);
    log(`Removed ${q.studentName} from the counselor list · ${reason}`, `Inalis si ${q.studentName} sa listahan ng counselor · ${reason}`, 'rose');
    onTriggerToast(isTl ? `Inalis si ${q.studentName} sa listahan.` : `${q.studentName} was removed from the list.`, () => void restore(r.saved, r.previous));
  };

  const doPutBack = async (q: QueueItem) => {
    const saved = await insertReferral({ studentNumber: q.studentNumber, studentName: q.studentName, status: 'Waiting', addedManually: true, manualReason: isTl ? 'Ibinalik' : 'Put back' });
    if (!saved) return onTriggerToast(isTl ? NOT_SAVED_TL : NOT_SAVED_EN);
    setRows((l) => [...(l ?? []), saved]);
    log(`Put ${q.studentName} back in the counselor list`, `Ibinalik si ${q.studentName} sa listahan ng counselor`);
    onTriggerToast(isTl ? `Naibalik si ${q.studentName} sa "Naghihintay".` : `${q.studentName} is back in "Waiting".`, undefined, { label: isTl ? 'Tingnan' : 'Show', run: () => setTab('waiting') });
  };

  const doAdd = async (stu: StudentRecord, reason: string) => {
    if (queue.some((q) => q.studentNumber === stu.studentNumber && (q.status === 'Waiting' || q.status === 'Scheduled'))) {
      onTriggerToast(isTl ? `Nasa listahan na si ${stu.fullName}.` : `${stu.fullName} is already on the list.`);
      return;
    }
    setBusy(true);
    const saved = await insertReferral({ studentNumber: stu.studentNumber, studentName: stu.fullName, status: 'Waiting', addedManually: true, manualReason: reason });
    setBusy(false);
    if (!saved) return onTriggerToast(isTl ? NOT_SAVED_TL : NOT_SAVED_EN);
    setRows((l) => [...(l ?? []), saved]);
    setAddOpen(false);
    setTab('waiting');
    log(`Added ${stu.fullName} to the counselor list · ${reason}`, `Idinagdag si ${stu.fullName} sa listahan ng counselor · ${reason}`);
    onTriggerToast(isTl ? `✓ Naidagdag si ${stu.fullName}.` : `✓ ${stu.fullName} was added.`, () => void restore(saved));
  };

  const saveDays = async (next: string[]) => {
    const prev = days;
    if (!(await saveConfig('counselor_days', next))) return onTriggerToast(isTl ? NOT_SAVED_TL : NOT_SAVED_EN);
    setDaysOpen(false);
    log(`Counselor days set to ${next.join(', ') || 'none'}`, `Ginawang ${next.join(', ') || 'wala'} ang araw ng counselor`);
    onTriggerToast(isTl ? '✓ Na-save ang araw ng counselor.' : '✓ Counselor days saved.', async () => {
      await saveConfig('counselor_days', prev);
    });
  };

  // ---------- rows ----------
  const list = tab === 'waiting' ? waiting : tab === 'scheduled' ? scheduled : done;
  const renderRow = (q: QueueItem, rank?: number) => (
    <div data-referral={q.studentNumber} className="rounded-xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex gap-3 items-start">
        {rank != null && (
          <span className="shrink-0 w-8 h-8 rounded-full bg-[#E4ECFC] dark:bg-[#192D58] text-[#1E469B] dark:text-[#7CB8F7] text-xs font-extrabold flex items-center justify-center" title={isTl ? 'Pagkakasunod ayon sa priority' : 'Order by priority'}>
            #{rank}
          </span>
        )}
        <div className="min-w-0 space-y-1">
          <p className="text-[15px] font-extrabold text-[#0B1F4D] dark:text-white">
            {q.studentName} {q.gradeSection && <span className="text-xs font-semibold text-[#4A608A] dark:text-[#94A8D0]">· {q.gradeSection}</span>}
          </p>
          <div className="flex flex-wrap gap-1">
            {q.reasons.map((r) => (
              <span key={r.key} className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${reasonTone[r.key]}`}>
                {isTl ? r.tl : r.en}
              </span>
            ))}
          </div>
          <p className={sub}>
            {q.openCases.length > 0 ? (
              <>
                {isTl ? 'Bukas na kaso: ' : 'Open cases: '}
                {q.openCases.slice(0, 4).map((c, i) => (
                  <React.Fragment key={c.caseCode}>
                    {i > 0 && ', '}
                    {onOpenCase ? (
                      <button type="button" onClick={() => onOpenCase(c.caseCode)} className="font-bold text-[#1E469B] dark:text-[#7CB8F7] underline" title={isTl ? c.offenseTitleTl : c.offenseTitleEn}>
                        {c.caseCode}
                      </button>
                    ) : (
                      c.caseCode
                    )}
                  </React.Fragment>
                ))}
                {q.openCases.length > 4 && ` +${q.openCases.length - 4}`}
                {q.waitingDays > 0 && ` · ${isTl ? `${q.waitingDays} araw nang naghihintay` : `waiting ${q.waitingDays} day(s)`}`}
              </>
            ) : isTl ? 'Walang bukas na kaso' : 'No open case'}
          </p>
          {q.status === 'Scheduled' && q.row?.scheduledDate && (
            <p className={`text-xs font-extrabold ${q.row.scheduledDate < today ? 'text-rose-700 dark:text-rose-300' : 'text-[#1E469B] dark:text-[#7CB8F7]'}`}>
              📅 {dayTitle(q.row.scheduledDate)}
              {q.row.scheduledDate < today && (isTl ? ' — lumipas na, i-mark kung nakausap na o ilipat' : ' — date passed: mark as seen or move it')}
            </p>
          )}
          {(q.status === 'Seen' || q.status === 'Removed') && (
            <p className={sub}>
              {q.status === 'Seen'
                ? `✓ ${isTl ? 'Nakausap na ng counselor' : 'Seen by the counselor'}${q.row?.seenAt ? ` · ${dateFmt.format(new Date(q.row.seenAt))}` : ''}`
                : `${isTl ? 'Inalis' : 'Removed'}${q.row?.removedReason ? ` · ${q.row.removedReason}` : ''}`}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {q.status === 'Waiting' && (
          <>
            <button type="button" data-action="schedule" onClick={() => setScheduleFor(q)} className={`${btn} px-4 py-2 bg-[#1E469B] text-white`}>
              📅 {isTl ? 'I-schedule sa counselor' : 'Schedule with counselor'}
            </button>
            <button type="button" data-action="remove" onClick={() => setRemoveFor(q)} className={`${btn} px-3 py-2 saas-card-subtle text-[#4A608A] dark:text-[#94A8D0]`}>
              {isTl ? 'Alisin' : 'Remove'}
            </button>
          </>
        )}
        {q.status === 'Scheduled' && (
          <>
            <button type="button" data-action="seen" onClick={() => void doSeen(q)} className={`${btn} px-4 py-2 bg-emerald-600 text-white`}>
              ✓ {isTl ? 'Nakausap na' : 'Seen'}
            </button>
            <button type="button" data-action="move" onClick={() => setScheduleFor(q)} className={`${btn} px-3 py-2 saas-card-subtle`}>
              {isTl ? 'Ilipat ang petsa' : 'Change date'}
            </button>
          </>
        )}
        {(q.status === 'Seen' || q.status === 'Removed') && (
          <button type="button" data-action="put-back" onClick={() => void doPutBack(q)} className={`${btn} px-3 py-2 saas-card-subtle`}>
            {isTl ? 'Ibalik sa listahan' : 'Put back on the list'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <main className="p-5 lg:p-6 max-w-[1440px] w-full mx-auto space-y-4 flex-1">
      <div className="shrink-0 min-h-[54px] flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE5F2] dark:border-[#1E3158] pb-2">
        <div className="inline-flex flex-wrap p-1 rounded-xl saas-card-subtle gap-1" role="tablist">
          {(
            [
              ['waiting', isTl ? `Naghihintay · ${waiting.length}` : `Waiting · ${waiting.length}`, isTl ? 'Mga estudyanteng kailangang makausap ng counselor' : 'Students the counselor should see'],
              ['scheduled', isTl ? `Naka-schedule · ${scheduled.length}` : `Scheduled · ${scheduled.length}`, isTl ? 'May petsa na sa counselor' : 'Already have a counselor date'],
              ['done', isTl ? `Tapos na · ${done.length}` : `Done · ${done.length}`, isTl ? 'Nakausap na o inalis' : 'Seen or removed'],
            ] as const
          ).map(([id, label, tip]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              title={tip}
              data-referral-tab={id}
              onClick={() => {
                soundFX.playToggleSwitch(true);
                setTab(id);
              }}
              className={`px-4 py-2 rounded-lg text-xs sm:text-[13px] font-bold whitespace-nowrap transition-colors ${
                tab === id ? 'bg-[#1E469B] text-white shadow-sm' : 'text-[#4A608A] dark:text-[#94A8D0] hover:text-[#0B1F4D] dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" data-action="days" onClick={() => setDaysOpen(true)} className={`${btn} px-3 py-2 saas-card-subtle`} title={isTl ? 'Palitan ang araw ng counselor' : 'Change the counselor days'}>
            🗓 {isTl ? 'Araw ng counselor' : 'Counselor days'}: <span className="text-[#1E469B] dark:text-[#7CB8F7]">{daysLoaded ? daysText : '…'}</span>
          </button>
          <button type="button" data-action="add" onClick={() => setAddOpen(true)} className={`${btn} px-3 py-2 saas-card-subtle`}>
            + {isTl ? 'Magdagdag ng estudyante' : 'Add a student'}
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold text-rose-900 dark:text-rose-200">
            {isTl ? 'Hindi makuha ang listahan. I-check ang internet, tapos pindutin ang "Subukan ulit".' : 'Could not load the list. Check the internet, then press "Try again".'}
          </p>
          <button type="button" onClick={() => void reload()} className={`${btn} bg-rose-600 text-white`}>
            {isTl ? 'Subukan ulit' : 'Try again'}
          </button>
        </div>
      )}
      {daysLoaded && days.length === 0 && (
        <div role="note" className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-xs flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold text-amber-900 dark:text-amber-200">{isTl ? 'Wala pang araw ng counselor. I-set muna para makapag-schedule.' : 'No counselor days yet. Set them first so you can schedule.'}</p>
          <button type="button" onClick={() => setDaysOpen(true)} className={`${btn} bg-amber-600 text-white`}>
            {isTl ? 'I-set ngayon' : 'Set now'}
          </button>
        </div>
      )}
      {tab !== 'scheduled' && dueNow.length > 0 && (
        <div className="px-4 py-3 rounded-xl bg-[#EEF3FC] dark:bg-[#13203B] border border-[#C9D7F0] dark:border-[#253B66] text-xs flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold text-[#0B1F4D] dark:text-white">
            📅 {isTl ? `${dueNow.length} estudyante ang naka-schedule sa counselor ngayon o lumipas na.` : `${dueNow.length} student(s) are scheduled with the counselor today or the date has passed.`}
          </p>
          <button type="button" onClick={() => setTab('scheduled')} className={`${btn} bg-[#1E469B] text-white`}>
            {isTl ? 'Tingnan' : 'Show them'}
          </button>
        </div>
      )}

      <section className={card}>
        <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158]">
          <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">
            {tab === 'waiting'
              ? isTl ? 'Kailangang makausap ng counselor' : 'Students the counselor should see'
              : tab === 'scheduled'
              ? isTl ? 'Naka-schedule sa counselor' : 'Scheduled with the counselor'
              : isTl ? 'Nakausap na o inalis' : 'Seen or removed'}
          </h2>
          <p className={sub}>
            {tab === 'waiting'
              ? isTl
                ? 'Kusang pumapasok dito ang Serious o Grave na kaso, paulit-ulit na offense, at 2x hindi dumalo ang magulang. Pinaka-urgent ang nasa itaas.'
                : 'Serious or grave cases, repeated offenses and parents who missed 2 conferences come here by themselves. Most urgent on top.'
              : tab === 'scheduled'
              ? isTl ? 'Pinakamalapit na petsa ang nasa itaas.' : 'The nearest date is on top.'
              : isTl ? 'Babalik ang estudyante sa "Naghihintay" kapag may bagong kaso.' : 'A student comes back to "Waiting" when a new case is reported.'}
          </p>
        </div>
        {tab === 'waiting' && (
          <Legend
            className="px-6 py-2 border-b border-[#DCE5F2] dark:border-[#1E3158]"
            items={[
              { color: '#E11D48', label: isTl ? 'Grave / Serious' : 'Grave / Serious', shape: 'box' },
              { color: '#F59E0B', label: isTl ? 'Paulit-ulit' : 'Repeated', shape: 'box' },
              { color: '#F97316', label: isTl ? 'Hindi dumalo ang magulang' : 'Parent missed', shape: 'box' },
              { color: '#0EA5E9', label: isTl ? 'Idinagdag ng office' : 'Added by the office', shape: 'box' },
            ]}
          />
        )}
        <div className="p-4 sm:p-5 space-y-2.5 bg-[#F4F7FC] dark:bg-[#0B1527]">
          {rows === null && !loadError && <p className={`${sub} py-8 text-center`}>{isTl ? 'Kinukuha ang listahan…' : 'Loading the list…'}</p>}
          {rows !== null && list.length === 0 && (
            <div className="py-8 text-center space-y-1">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                ✓{' '}
                {tab === 'waiting'
                  ? isTl ? 'Walang estudyanteng naghihintay sa counselor.' : 'No students waiting for the counselor.'
                  : tab === 'scheduled'
                  ? isTl ? 'Walang naka-schedule.' : 'Nothing scheduled.'
                  : isTl ? 'Wala pa rito.' : 'Nothing here yet.'}
              </p>
              {tab === 'waiting' && (
                <p className={sub}>{isTl ? 'Kapag may Serious o paulit-ulit na kaso, lalabas sila rito nang kusa.' : 'Serious or repeated cases will show up here by themselves.'}</p>
              )}
            </div>
          )}
          {list.slice(0, limit).map((q, i) => (
            <React.Fragment key={`${q.studentNumber}-${q.row?.id ?? 'auto'}`}>{renderRow(q, tab === 'waiting' ? i + 1 : undefined)}</React.Fragment>
          ))}
          {list.length > limit && (
            <button type="button" onClick={() => setLimit((n) => n + PAGE)} className={`${btn} w-full py-2 saas-card-subtle`}>
              {isTl ? `Ipakita pa (${list.length - limit} pa)` : `Show more (${list.length - limit} more)`}
            </button>
          )}
        </div>
      </section>

      {scheduleFor && (
        <ScheduleWindow
          q={scheduleFor}
          isTl={isTl}
          busy={busy}
          options={nextCounselorDays(today, days, 6)}
          countOn={(d) => scheduled.filter((x) => x.row?.scheduledDate === d && x.studentNumber !== scheduleFor.studentNumber).length}
          dayTitle={dayTitle}
          onSetDays={() => {
            setScheduleFor(null);
            setDaysOpen(true);
          }}
          onCancel={() => setScheduleFor(null)}
          onPick={(d) => void doSchedule(scheduleFor, d)}
        />
      )}
      {removeFor && <RemoveWindow q={removeFor} isTl={isTl} onCancel={() => setRemoveFor(null)} onRemove={(r) => void doRemove(removeFor, r)} />}
      {addOpen && <AddWindow students={students} isTl={isTl} busy={busy} onCancel={() => setAddOpen(false)} onAdd={(s, r) => void doAdd(s, r)} />}
      {daysOpen && <DaysWindow current={days} isTl={isTl} onCancel={() => setDaysOpen(false)} onSave={(d) => void saveDays(d)} />}
    </main>
  );
};

// ---------------------------------------------------------------------------
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }> = ({ title, onClose, children, footer }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-confirm-open]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[80] !m-0 bg-black/50 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] shadow-2xl">
        <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex items-center justify-between">
          <h3 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg text-[#4A608A] hover:bg-slate-100 dark:hover:bg-slate-800">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-3 overflow-y-auto">{children}</div>
        <div className="px-6 py-4 border-t border-[#DCE5F2] dark:border-[#1E3158] flex justify-end gap-2">{footer}</div>
      </div>
    </div>,
    document.body
  );
};

const ScheduleWindow: React.FC<{
  q: QueueItem;
  isTl: boolean;
  busy: boolean;
  options: string[];
  countOn: (d: string) => number;
  dayTitle: (d: string) => string;
  onSetDays: () => void;
  onCancel: () => void;
  onPick: (d: string) => void;
}> = ({ q, isTl, busy, options, countOn, dayTitle, onSetDays, onCancel, onPick }) => {
  const [pick, setPick] = useState(options.find((d) => d !== q.row?.scheduledDate) ?? options[0] ?? '');
  return (
    <Modal
      title={isTl ? `I-schedule si ${q.studentName}` : `Schedule ${q.studentName}`}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className={`${btn} px-4 py-2.5 saas-card-subtle`}>
            {isTl ? 'Kanselahin' : 'Cancel'}
          </button>
          <button type="button" data-action="schedule-confirm" disabled={!pick || busy || pick === q.row?.scheduledDate} onClick={() => onPick(pick)} className={`${btn} px-5 py-2.5 bg-[#1E469B] text-white disabled:opacity-50`}>
            {busy ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? 'I-schedule' : 'Schedule'}
          </button>
        </>
      }
    >
      {options.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-bold text-[#0B1F4D] dark:text-white">{isTl ? 'Wala pang araw ng counselor.' : 'There are no counselor days yet.'}</p>
          <button type="button" onClick={onSetDays} className={`${btn} px-4 py-2 bg-amber-600 text-white`}>
            {isTl ? 'I-set ang araw ng counselor' : 'Set the counselor days'}
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Pumili ng araw ng counselor:' : 'Pick a counselor day:'}</p>
          <div className="grid grid-cols-2 gap-2">
            {options.map((d) => {
              const n = countOn(d);
              const current = d === q.row?.scheduledDate;
              return (
                <button
                  key={d}
                  type="button"
                  data-day={d}
                  disabled={current}
                  onClick={() => setPick(d)}
                  className={`text-left rounded-xl border px-3 py-2.5 ${pick === d ? 'border-[#1E469B] bg-[#EEF3FC] dark:bg-[#13203B] ring-1 ring-[#1E469B]/40' : 'border-[#D3DDEE] dark:border-[#253B66]'} disabled:opacity-50`}
                >
                  <span className="block text-sm font-extrabold text-[#0B1F4D] dark:text-white">{dayTitle(d)}</span>
                  <span className="block text-[11px] text-[#4A608A] dark:text-[#94A8D0]">
                    {current ? (isTl ? 'Kasalukuyang petsa' : 'Current date') : n === 0 ? (isTl ? 'Wala pang naka-schedule' : 'Nobody scheduled yet') : isTl ? `${n} naka-schedule na` : `${n} already scheduled`}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
};

const REMOVE_REASONS: [string, string][] = [
  ['Already handled by the office', 'Naayos na ng office'],
  ['Student moved to another school', 'Lumipat na ng school ang estudyante'],
  ['Added by mistake', 'Nagkamali ng pagdagdag'],
];
const RemoveWindow: React.FC<{ q: QueueItem; isTl: boolean; onCancel: () => void; onRemove: (r: string) => void }> = ({ q, isTl, onCancel, onRemove }) => {
  const [pick, setPick] = useState<number | null>(null);
  const [own, setOwn] = useState('');
  const reason = pick != null ? REMOVE_REASONS[pick][isTl ? 1 : 0] : own.trim();
  return (
    <Modal
      title={isTl ? `Alisin si ${q.studentName}?` : `Remove ${q.studentName}?`}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className={`${btn} px-4 py-2.5 saas-card-subtle`}>
            {isTl ? 'Kanselahin' : 'Cancel'}
          </button>
          <button type="button" data-action="remove-confirm" disabled={reason.length < 5} onClick={() => onRemove(reason)} className={`${btn} px-5 py-2.5 bg-rose-600 text-white disabled:opacity-50`} title={reason.length < 5 ? (isTl ? 'Pumili o magsulat muna ng dahilan' : 'Pick or write a reason first') : undefined}>
            {isTl ? 'Alisin' : 'Remove'}
          </button>
        </>
      }
    >
      <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Bakit aalisin?' : 'Why remove?'}</p>
      {REMOVE_REASONS.map(([en, tl], i) => (
        <label key={i} className={`flex gap-2 items-center rounded-xl border px-3 py-2 cursor-pointer text-sm text-[#0B1F4D] dark:text-white ${pick === i ? 'border-[#1E469B] bg-[#EEF3FC] dark:bg-[#13203B]' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}>
          <input type="radio" name="remove" checked={pick === i} onChange={() => setPick(i)} />
          {isTl ? tl : en}
        </label>
      ))}
      <label className="block text-sm text-[#0B1F4D] dark:text-white space-y-1">
        <span className="flex gap-2 items-center">
          <input type="radio" name="remove" checked={pick === null} onChange={() => setPick(null)} />
          {isTl ? 'Ibang dahilan:' : 'Other reason:'}
        </span>
        <input
          value={own}
          onChange={(e) => {
            setOwn(e.target.value.slice(0, 200));
            setPick(null);
          }}
          className="w-full px-3 py-2 rounded-lg border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm"
        />
      </label>
    </Modal>
  );
};

const AddWindow: React.FC<{ students: StudentRecord[]; isTl: boolean; busy: boolean; onCancel: () => void; onAdd: (s: StudentRecord, reason: string) => void }> = ({
  students,
  isTl,
  busy,
  onCancel,
  onAdd,
}) => {
  const [q, setQ] = useState('');
  const [chosen, setChosen] = useState<StudentRecord | null>(null);
  const [reason, setReason] = useState('');
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return students.filter((s) => s.fullName.toLowerCase().includes(t) || s.studentNumber.includes(t)).slice(0, 8);
  }, [q, students]);
  return (
    <Modal
      title={isTl ? 'Magdagdag ng estudyante sa counselor' : 'Add a student for the counselor'}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className={`${btn} px-4 py-2.5 saas-card-subtle`}>
            {isTl ? 'Kanselahin' : 'Cancel'}
          </button>
          <button type="button" data-action="add-confirm" disabled={!chosen || reason.trim().length < 5 || busy} onClick={() => chosen && onAdd(chosen, reason.trim())} className={`${btn} px-5 py-2.5 bg-[#1E469B] text-white disabled:opacity-50`}>
            {busy ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? 'Idagdag' : 'Add'}
          </button>
        </>
      }
    >
      <p className={sub}>{isTl ? 'Para sa estudyanteng kailangang makausap ng counselor kahit hindi pa siya kusang lumalabas sa listahan.' : 'For a student the counselor should see even if they are not on the list automatically.'}</p>
      <label htmlFor="ref-student" className="block text-xs font-extrabold text-[#0B1F4D] dark:text-white">
        {isTl ? 'Estudyante' : 'Student'}
      </label>
      {chosen ? (
        <div className="flex items-center justify-between rounded-xl border border-[#1E469B] bg-[#EEF3FC] dark:bg-[#13203B] px-3 py-2">
          <span className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
            {chosen.fullName} <span className={sub}>· {chosen.studentNumber}</span>
          </span>
          <button type="button" onClick={() => setChosen(null)} className={`${btn} saas-card-subtle`}>
            {isTl ? 'Palitan' : 'Change'}
          </button>
        </div>
      ) : (
        <>
          <input
            id="ref-student"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isTl ? 'I-type ang pangalan o student no.' : 'Type a name or student no.'}
            className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white"
          />
          <div className="space-y-1">
            {q.trim() && matches.length === 0 && <p className={sub}>{isTl ? 'Walang tugma sa masterlist.' : 'No match in the masterlist.'}</p>}
            {matches.map((s) => (
              <button key={s.studentNumber} type="button" data-pick={s.studentNumber} onClick={() => setChosen(s)} className="w-full text-left rounded-lg px-3 py-2 hover:bg-[#EEF3FC] dark:hover:bg-[#13203B] text-sm text-[#0B1F4D] dark:text-white">
                {s.fullName} <span className={sub}>· {s.studentNumber} · {s.gradeSection}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <label htmlFor="ref-reason" className="block text-xs font-extrabold text-[#0B1F4D] dark:text-white">
        {isTl ? 'Dahilan (para sa office lang)' : 'Reason (office only)'}
      </label>
      <input
        id="ref-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, 200))}
        placeholder={isTl ? 'hal. Hiniling ng adviser' : 'e.g. Requested by the adviser'}
        className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white"
      />
    </Modal>
  );
};

const DaysWindow: React.FC<{ current: string[]; isTl: boolean; onCancel: () => void; onSave: (d: string[]) => void }> = ({ current, isTl, onCancel, onSave }) => {
  const [sel, setSel] = useState<string[]>(current);
  const same = sel.length === current.length && sel.every((d) => current.includes(d));
  return (
    <Modal
      title={isTl ? 'Araw ng counselor' : 'Counselor days'}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className={`${btn} px-4 py-2.5 saas-card-subtle`}>
            {isTl ? 'Kanselahin' : 'Cancel'}
          </button>
          <button type="button" data-action="days-save" disabled={same} onClick={() => onSave(WEEK.filter((d) => sel.includes(d)))} className={`${btn} px-5 py-2.5 bg-[#1E469B] text-white disabled:opacity-50`}>
            {isTl ? 'I-save' : 'Save'}
          </button>
        </>
      }
    >
      <p className={sub}>{isTl ? 'Anong mga araw pumupunta ang counselor sa school?' : 'Which days is the counselor at school?'}</p>
      <div className="grid grid-cols-1 gap-2">
        {WEEK.map((d) => (
          <label key={d} className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer text-sm text-[#0B1F4D] dark:text-white ${sel.includes(d) ? 'border-[#1E469B] bg-[#EEF3FC] dark:bg-[#13203B]' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}>
            <input type="checkbox" data-weekday={d} checked={sel.includes(d)} onChange={() => setSel((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))} />
            {isTl ? WEEK_TL[d] : WEEK_EN[d]}
          </label>
        ))}
      </div>
    </Modal>
  );
};

export default ReferralQueue;
