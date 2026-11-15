// Concerns — page 11 (Submitted Reports) + page 12 (Concern Chats), features flowchart.
// - Urgent ("Happening now") waiting concerns always on top (not an alarm).
// - Approve (optional link to a case) opens a chat; Reject needs a reason the student will see.
// - Deactivate fake account. Chat messages are kept forever (no edit/delete in the DB).
// - Students never see case records; the chat shows the office as "Guidance Office".
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CasePrefill } from './Stage3CasesHub';
import { useLanguage } from '../context/LanguageContext';
import { useConfirmChange } from '../components/ui/ConfirmChange';
import { soundFX } from '../services/soundEngine';
import type { ToastNextAction } from './DashboardPage';
import type { StudentRecord, DisciplineCaseRecord } from '../data/stage3MockData';
import { insertActivityLogInDb } from '../services/supabaseClient';
import {
  ConcernItem,
  ConcernMessage,
  PortalAccount,
  fetchConcerns,
  updateConcern,
  fetchMessages,
  fetchMessagesAfter,
  fetchLastMessages,
  sendMessage,
  fetchAccounts,
  setAccountStatus,
  insertPracticeConcern,
} from '../services/concernsDb';
import { isOfficeDay, todayISO } from '../services/scheduling';
import { Legend } from '../components/ui/Charts';
import {
  Lock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  MapPin,
  Users,
  Eye,
  Maximize2,
  Phone,
  FileText,
  Send,
  Ban,
  Image as ImageIcon,
  User,
  AlertTriangle,
  Target,
  Camera,
} from 'lucide-react';

export type ConcernsTab = 'reports' | 'chats' | 'accounts';

interface ConcernsHubProps {
  students: StudentRecord[];
  cases: DisciplineCaseRecord[];
  onTriggerToast: (msg: string, undo?: () => void, next?: ToastNextAction) => void;
  onOpenCase?: (caseCode: string) => void;
  /** open New Case filled in from this concern */
  onCreateCase?: (p: CasePrefill) => void;
  /** tell the shell to refresh the sidebar badge */
  onChanged?: () => void;
  initialTab?: ConcernsTab;
}

const PAGE = 50;
const SEEN_KEY = 'aics_chat_seen_v1';
const readSeen = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
  } catch {
    return {};
  }
};
const REJECT_REASONS = [
  ['Not enough details. Please send it again with what, when and where.', 'Kulang ang detalye. Paki-send ulit kasama kung ano, kailan at saan.'],
  ['This is not a guidance concern. Please talk to your adviser or the office in charge.', 'Hindi ito concern ng Guidance. Kausapin ang adviser o ang tamang office.'],
  ['This was already reported. We are already handling it.', 'Naipadala na ito dati. Inaasikaso na namin ito.'],
] as const;

const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap';
const card = 'rounded-2xl saas-card overflow-hidden';
const sub = 'text-xs text-[#4A608A] dark:text-[#94A8D0]';

function officeOpenNow(): boolean {
  const d = new Date();
  const h = d.getHours() + d.getMinutes() / 60;
  return isOfficeDay(todayISO()) && h >= 8 && h < 17;
}

const ConcernsHub: React.FC<ConcernsHubProps> = ({ students, cases, onTriggerToast, onOpenCase, onCreateCase, onChanged, initialTab }) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';
  const confirmChange = useConfirmChange();

  const [tab, setTab] = useState<ConcernsTab>(initialTab ?? 'reports');
  const [concerns, setConcerns] = useState<ConcernItem[] | null>(null);
  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [lastMsg, setLastMsg] = useState<Map<number, ConcernMessage>>(new Map());
  const [seen, setSeen] = useState<Record<string, number>>(readSeen);
  const [filter, setFilter] = useState<'waiting' | 'approved' | 'rejected' | 'all'>('waiting');
  const [limit, setLimit] = useState(PAGE);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [chatId, setChatId] = useState<number | null>(null);
  const [approveFor, setApproveFor] = useState<ConcernItem | null>(null);
  const [rejectFor, setRejectFor] = useState<ConcernItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    [isTl]
  );
  const when = useCallback((iso: string) => (iso ? dateFmt.format(new Date(iso)) : ''), [dateFmt]);

  const reload = useCallback(async () => {
    const [c, a, l] = await Promise.all([fetchConcerns(), fetchAccounts(), fetchLastMessages()]);
    if (c) {
      setConcerns(c);
      setLoadError(false);
    } else setLoadError(true);
    if (a) setAccounts(a);
    setLastMsg(l);
  }, []);

  useEffect(() => {
    void reload();
    // new reports / replies arrive from the student portal: check every 20 s while the window is visible
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reload();
    }, 20000);
    return () => window.clearInterval(t);
  }, [reload]);

  const studentByNo = useMemo(() => new Map(students.map((s) => [s.studentNumber, s])), [students]);
  const studentByName = useMemo(() => new Map(students.map((s) => [s.fullName.trim().toLowerCase(), s])), [students]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const matchOf = useCallback(
    (c: ConcernItem): StudentRecord | undefined =>
      (c.studentNumber && studentByNo.get(c.studentNumber)) || studentByName.get(c.studentName.trim().toLowerCase()),
    [studentByNo, studentByName]
  );

  const list = concerns ?? [];
  const waiting = useMemo(
    () =>
      list
        .filter((c) => c.status === 'Pending')
        .sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.id - b.id), // urgent first, then oldest first
    [list]
  );
  const urgentWaiting = waiting.filter((c) => c.urgent);
  const shown = useMemo(() => {
    if (filter === 'waiting') return waiting;
    const base = filter === 'all' ? list : list.filter((c) => c.status === (filter === 'approved' ? 'Approved' : 'Rejected'));
    return [...base].sort((a, b) => b.id - a.id);
  }, [filter, list, waiting]);
  const chats = useMemo(
    () =>
      list
        .filter((c) => c.chatStatus === 'Open' || c.chatStatus === 'Closed')
        .sort((a, b) => {
          if (a.chatStatus !== b.chatStatus) return a.chatStatus === 'Open' ? -1 : 1;
          return (lastMsg.get(b.id)?.id ?? 0) - (lastMsg.get(a.id)?.id ?? 0);
        }),
    [list, lastMsg]
  );
  const unread = useCallback(
    (c: ConcernItem) => {
      const m = lastMsg.get(c.id);
      return !!m && m.sender === 'student' && m.id > (seen[String(c.id)] ?? 0);
    },
    [lastMsg, seen]
  );
  const openChats = chats.filter((c) => c.chatStatus === 'Open');
  const unreadCount = chats.filter(unread).length;
  const blocked = accounts.filter((a) => a.status === 'Deactivated');

  const selected = list.find((c) => c.id === selectedId) ?? null;
  useEffect(() => {
    if (selectedId == null && shown.length) setSelectedId(shown[0].id);
  }, [shown, selectedId]);

  const patchLocal = (id: number, p: Partial<ConcernItem>) =>
    setConcerns((l) => (l ? l.map((c) => (c.id === id ? { ...c, ...p } : c)) : l));

  // ---------- actions ----------
  const doApprove = async (c: ConcernItem, caseCode: string) => {
    const ok = await confirmChange({
      title: isTl ? 'I-approve ang concern?' : 'Approve this concern?',
      description: `${c.studentName} · ${c.type}`,
      rows: [
        { label: 'Status', before: isTl ? 'Naghihintay' : 'Waiting', after: isTl ? 'Approved' : 'Approved' },
        { label: isTl ? 'Kaso' : 'Case', after: caseCode || (isTl ? 'Walang naka-link' : 'Not linked') },
        { label: 'Chat', after: isTl ? 'Magbubukas ng chat sa estudyante' : 'A chat with the student opens' },
      ],
      note: isTl ? 'Makikita ng estudyante na na-approve ang concern niya.' : 'The student will see that the concern was approved.',
      confirmLabel: isTl ? 'Oo, i-approve' : 'Yes, approve',
      tone: 'success',
    });
    if (!ok) return;
    setBusy(true);
    const patch = { status: 'Approved', reviewed_at: new Date().toISOString(), linked_case_code: caseCode || null, chat_status: 'Open', reject_reason: null };
    const saved = await updateConcern(c.id, patch, 'approveConcern');
    if (!saved) {
      setBusy(false);
      onTriggerToast(isTl ? 'Hindi na-save. I-check ang internet, tapos subukan ulit.' : 'Not saved. Check the internet, then try again.');
      return;
    }
    patchLocal(c.id, { status: 'Approved', reviewedAt: patch.reviewed_at, linkedCaseCode: caseCode, chatStatus: 'Open', rejectReason: '' });
    const first = await sendMessage(
      c.id,
      'office',
      'Natanggap na po ng Guidance Office ang iyong concern. Puwede kang mag-reply dito. Sasagot kami sa oras ng opisina (Lunes–Biyernes, 8:00 AM–5:00 PM).'
    );
    if (first) setLastMsg((m) => new Map(m).set(c.id, first));
    void insertActivityLogInDb({
      actor: 'Guidance Associate',
      actionEn: `Approved concern ${c.code} (${c.studentName})${caseCode ? ` · linked to ${caseCode}` : ''} · chat opened`,
      actionTl: `In-approve ang concern ${c.code} (${c.studentName})${caseCode ? ` · naka-link sa ${caseCode}` : ''} · nabuksan ang chat`,
      tag: 'Concern',
      tone: 'emerald',
    });
    setBusy(false);
    setApproveFor(null);
    onChanged?.();
    soundFX.playSuccessCheck();
    onTriggerToast(isTl ? `Na-approve. Bukas na ang chat kay ${c.studentName}.` : `Approved. The chat with ${c.studentName} is open.`, undefined, {
      label: isTl ? 'Buksan ang chat' : 'Open the chat',
      run: () => {
        setTab('chats');
        setChatId(c.id);
      },
    });
  };

  const doReject = async (c: ConcernItem, reason: string) => {
    const ok = await confirmChange({
      title: isTl ? 'I-reject ang concern?' : 'Reject this concern?',
      description: `${c.studentName} · ${c.type}`,
      rows: [
        { label: 'Status', before: isTl ? 'Naghihintay' : 'Waiting', after: 'Rejected' },
        { label: isTl ? 'Dahilan (makikita ng estudyante)' : 'Reason (the student will see it)', after: reason },
      ],
      confirmLabel: isTl ? 'Oo, i-reject' : 'Yes, reject',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    const at = new Date().toISOString();
    const saved = await updateConcern(c.id, { status: 'Rejected', reject_reason: reason, reviewed_at: at, chat_status: 'None' }, 'rejectConcern');
    setBusy(false);
    if (!saved) {
      onTriggerToast(isTl ? 'Hindi na-save. I-check ang internet, tapos subukan ulit.' : 'Not saved. Check the internet, then try again.');
      return;
    }
    patchLocal(c.id, { status: 'Rejected', rejectReason: reason, reviewedAt: at });
    void insertActivityLogInDb({
      actor: 'Guidance Associate',
      actionEn: `Rejected concern ${c.code} (${c.studentName}) · reason: ${reason}`,
      actionTl: `Ni-reject ang concern ${c.code} (${c.studentName}) · dahilan: ${reason}`,
      tag: 'Concern',
      tone: 'rose',
    });
    setRejectFor(null);
    onChanged?.();
    onTriggerToast(isTl ? `Ni-reject. Makikita ni ${c.studentName} ang dahilan.` : `Rejected. ${c.studentName} will see the reason.`);
  };

  const doDeactivate = async (c: ConcernItem) => {
    const acc = c.accountId != null ? accountById.get(c.accountId) : undefined;
    if (!acc) return;
    const ok = await confirmChange({
      title: isTl ? 'I-block ang account na ito?' : 'Block this account?',
      description: isTl
        ? 'Para sa account na hindi totoong estudyante. Hindi na ito makakapag-sign in o makakapagpadala ng concern.'
        : 'For accounts that are not real students. It can no longer sign in or send concerns.',
      rows: [
        { label: 'Account', after: `${acc.fullName}${acc.studentNumber ? ` · ${acc.studentNumber}` : ''}` },
        { label: 'Masterlist', after: matchOf(c) ? (isTl ? 'Nasa masterlist (mag-ingat!)' : 'In the masterlist (be careful!)') : isTl ? 'Wala sa masterlist' : 'Not in the masterlist' },
        { label: 'Status', before: 'Active', after: isTl ? 'Naka-block' : 'Blocked' },
      ],
      note: isTl ? 'Puwede itong i-unblock sa tab na "Naka-block na account".' : 'You can unblock it in the "Blocked accounts" tab.',
      confirmLabel: isTl ? 'Oo, i-block' : 'Yes, block',
      tone: 'danger',
    });
    if (!ok) return;
    const reason = matchOf(c) ? 'Blocked by the office' : 'Not in the masterlist (fake account)';
    if (!(await setAccountStatus(acc.id, false, reason))) {
      onTriggerToast(isTl ? 'Hindi na-save. I-check ang internet, tapos subukan ulit.' : 'Not saved. Check the internet, then try again.');
      return;
    }
    setAccounts((l) => l.map((a) => (a.id === acc.id ? { ...a, status: 'Deactivated', deactivatedReason: reason } : a)));
    void insertActivityLogInDb({
      actor: 'Guidance Associate',
      actionEn: `Blocked portal account of ${acc.fullName} · ${reason}`,
      actionTl: `Na-block ang portal account ni ${acc.fullName} · ${reason}`,
      tag: 'Concern',
      tone: 'rose',
    });
    onTriggerToast(isTl ? `Na-block ang account ni ${acc.fullName}.` : `${acc.fullName}'s account is blocked.`, async () => {
      if (await setAccountStatus(acc.id, true)) setAccounts((l) => l.map((a) => (a.id === acc.id ? { ...a, status: 'Active', deactivatedReason: '' } : a)));
    });
  };

  const doUnblock = async (a: PortalAccount) => {
    if (!(await setAccountStatus(a.id, true))) {
      onTriggerToast(isTl ? 'Hindi na-save. I-check ang internet, tapos subukan ulit.' : 'Not saved. Check the internet, then try again.');
      return;
    }
    setAccounts((l) => l.map((x) => (x.id === a.id ? { ...x, status: 'Active', deactivatedReason: '' } : x)));
    void insertActivityLogInDb({ actor: 'Guidance Associate', actionEn: `Unblocked portal account of ${a.fullName}`, actionTl: `Na-unblock ang portal account ni ${a.fullName}`, tag: 'Concern', tone: 'blue' });
    onTriggerToast(isTl ? `Na-unblock ang account ni ${a.fullName}.` : `${a.fullName}'s account is unblocked.`);
  };

  const markSeen = useCallback((id: number, msgId: number) => {
    setSeen((s0) => {
      if ((s0[String(id)] ?? 0) >= msgId) return s0;
      const next = { ...s0, [String(id)]: msgId };
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  // ---------- render helpers ----------
  const statusPill = (c: ConcernItem) => {
    const map: Record<string, [string, string, string]> = {
      Pending: ['Naghihintay', 'Waiting', 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'],
      Approved: ['Approved', 'Approved', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'],
      Rejected: ['Rejected', 'Rejected', 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'],
    };
    const [tl, en, cls] = map[c.status] ?? [c.status, c.status, 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'];
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${cls}`}>{isTl ? tl : en}</span>;
  };
  const matchPill = (c: ConcernItem) =>
    matchOf(c) ? (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" title={isTl ? 'Tugma sa masterlist ng mga naka-enroll' : 'Matches the enrollment masterlist'}>
        {isTl ? 'Nasa masterlist' : 'In masterlist'}
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200" title={isTl ? 'Walang ganitong estudyante sa masterlist — baka fake account' : 'No such student in the masterlist — may be a fake account'}>
        {isTl ? 'Wala sa masterlist' : 'Not in masterlist'}
      </span>
    );

  const tabs: [ConcernsTab, string, string][] = [
    ['reports', isTl ? `Mga concern · ${waiting.length} naghihintay` : `Submitted reports · ${waiting.length} waiting`, isTl ? 'Mga concern mula sa website o Android app ng estudyante' : 'Concerns sent from the student website or Android app'],
    ['chats', `${isTl ? 'Mga chat' : 'Chats'} · ${openChats.length} ${isTl ? 'bukas' : 'open'}${unreadCount ? ` · ${unreadCount} ${isTl ? 'bagong reply' : 'new'}` : ''}`, isTl ? 'Usapan sa estudyante pagka-approve ng concern' : 'Talk with the student after a concern is approved'],
    ['accounts', `${isTl ? 'Naka-block na account' : 'Blocked accounts'} · ${blocked.length}`, isTl ? 'Mga account na hindi totoong estudyante' : 'Accounts that are not real students'],
  ];

  return (
    <main className="p-5 lg:p-6 max-w-[1440px] w-full mx-auto space-y-4 flex-1">
      <div className="shrink-0 min-h-[54px] flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE5F2] dark:border-[#1E3158] pb-2">
        <div className="inline-flex flex-wrap p-1 rounded-xl saas-card-subtle gap-1" role="tablist">
          {tabs.map(([id, label, tip]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              title={tip}
              data-concerns-tab={id}
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
        {import.meta.env.DEV && (
          <PracticeButton
            students={students}
            onDone={async (ok) => {
              if (ok) await reload();
              onTriggerToast(ok ? 'Practice concern added (dev only).' : ' Practice concern not saved.');
              onChanged?.();
            }}
          />
        )}
      </div>

      {loadError && (
        <div role="alert" className="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold text-rose-900 dark:text-rose-200">
            {isTl ? 'Hindi makuha ang mga concern. I-check ang internet, tapos pindutin ang "Subukan ulit".' : 'Could not load the concerns. Check the internet, then press "Try again".'}
          </p>
          <button type="button" onClick={() => void reload()} className={`${btn} bg-rose-600 text-white`}>
            {isTl ? 'Subukan ulit' : 'Try again'}
          </button>
        </div>
      )}

      {/* urgent first (visual only — not an emergency alarm) */}
      {urgentWaiting.length > 0 && tab === 'reports' && (
        <div role="note" className="px-4 py-3 rounded-xl bg-rose-600 text-white flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-extrabold">
            <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 align-middle animate-pulse" />
            {isTl
              ? `${urgentWaiting.length} URGENT na concern ("Nangyayari ngayon") — basahin muna ito.`
              : `${urgentWaiting.length} URGENT concern(s) ("Happening now") — read these first.`}
          </p>
          <button
            type="button"
            onClick={() => {
              setFilter('waiting');
              setSelectedId(urgentWaiting[0].id);
            }}
            className={`${btn} bg-white text-rose-700`}
          >
            {isTl ? 'Buksan ang una' : 'Open the first one'}
          </button>
        </div>
      )}

      {/* ================= SUBMITTED REPORTS ================= */}
      {tab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr] gap-4 items-stretch h-[calc(100vh-245px)] min-h-[520px]" data-concern-grid>
          <section className={`${card} flex flex-col min-h-0`}>
            <div className="px-4 py-3 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap gap-1.5">
              {(
                [
                  ['waiting', isTl ? `Naghihintay · ${waiting.length}` : `Waiting · ${waiting.length}`],
                  ['approved', `Approved · ${list.filter((c) => c.status === 'Approved').length}`],
                  ['rejected', `Rejected · ${list.filter((c) => c.status === 'Rejected').length}`],
                  ['all', isTl ? `Lahat · ${list.length}` : `All · ${list.length}`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  data-concern-filter={id}
                  onClick={() => {
                    setFilter(id);
                    setLimit(PAGE);
                    setSelectedId(null);
                  }}
                  className={`${btn} ${filter === id ? 'bg-[#1E469B] text-white' : 'saas-card-subtle text-[#4A608A] dark:text-[#94A8D0]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Legend
              className="px-4 py-2 border-b border-[#DCE5F2] dark:border-[#1E3158]"
              items={[
                { color: '#E11D48', label: isTl ? 'Urgent' : 'Urgent', shape: 'box' },
                { color: '#F59E0B', label: isTl ? 'Naghihintay' : 'Waiting', shape: 'box' },
                { color: '#10B981', label: isTl ? 'Approved / nasa masterlist' : 'Approved / in masterlist', shape: 'box' },
                { color: '#8B5CF6', label: isTl ? 'Confidential' : 'Confidential', shape: 'box' },
              ]}
            />
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 bg-[#F4F7FC] dark:bg-[#0B1527]">
              {concerns === null && !loadError && <p className={`${sub} p-6 text-center`}>{isTl ? 'Kinukuha ang mga concern…' : 'Loading concerns…'}</p>}
              {concerns !== null && shown.length === 0 && (
                <div className="p-6 text-center space-y-1">
                  <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                    {filter === 'waiting' ? (isTl ? ' Walang naghihintay na concern.' : ' No concerns waiting.') : isTl ? 'Wala pang laman dito.' : 'Nothing here yet.'}
                  </p>
                  <p className={sub}>
                    {isTl
                      ? 'Dito lalabas ang mga concern na ipinadala ng estudyante mula sa website o Android app.'
                      : 'Concerns that students send from the website or Android app will appear here.'}
                  </p>
                </div>
              )}
              {shown.slice(0, limit).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  data-concern-row={c.code}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 border transition-colors ${
                    selectedId === c.id
                      ? 'bg-white dark:bg-[#13203B] border-[#1E469B] dark:border-[#7CB8F7] ring-1 ring-[#1E469B]/30'
                      : c.urgent && c.status === 'Pending'
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                      : 'bg-white dark:bg-[#0F1A30] border-[#D3DDEE] dark:border-[#253B66] hover:border-[#1E469B]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white truncate">
                      
                      {c.studentName}
                    </p>
                    <span className="text-[11px] text-[#4A608A] dark:text-[#94A8D0] whitespace-nowrap">{when(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-[#4A608A] dark:text-[#94A8D0] truncate">{c.type || (isTl ? 'Walang uri' : 'No type')}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.urgent && c.status === 'Pending' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-600 text-white">URGENT</span>
                    )}
                    {statusPill(c)}
                    {matchPill(c)}
                    {c.practice && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">practice</span>}
                  </div>
                </button>
              ))}
              {shown.length > limit && (
                <button type="button" onClick={() => setLimit((n) => n + PAGE)} className={`${btn} w-full saas-card-subtle`}>
                  {isTl ? `Ipakita pa (${shown.length - limit} pa)` : `Show more (${shown.length - limit} more)`}
                </button>
              )}
            </div>
          </section>

          <section className={`${card} flex flex-col min-h-0`}>
            {!selected ? (
              <div className="p-10 text-center">
                <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Pumili ng concern sa kaliwa.' : 'Pick a concern on the left.'}</p>
                <p className={sub}>{isTl ? 'Babasahin mo rito ang buong detalye bago mag-approve o mag-reject.' : 'Read the full details here before you approve or reject.'}</p>
              </div>
            ) : (
              <ConcernDetail
                c={selected}
                isTl={isTl}
                match={matchOf(selected)}
                account={selected.accountId != null ? accountById.get(selected.accountId) : undefined}
                when={when}
                statusPill={statusPill(selected)}
                matchPill={matchPill(selected)}
                busy={busy}
                onApprove={() => setApproveFor(selected)}
                onReject={() => setRejectFor(selected)}
                onDeactivate={() => void doDeactivate(selected)}
                onOpenChat={() => {
                  setTab('chats');
                  setChatId(selected.id);
                }}
                onOpenCase={onOpenCase}
                onCreateCase={
                  onCreateCase && selected.status !== 'Rejected'
                    ? () => {
                        let rawName = selected.who || '';
                        const bracketMatch = rawName.match(/\[RESPONDENT[^:]*:\s*([^\-\]\n]+)/i);
                        if (bracketMatch) {
                          rawName = bracketMatch[1].trim();
                        } else {
                          rawName = rawName.replace(/^\[[^\]]+\]\s*/, '');
                        }
                        const firstName = rawName.split(/,|;|\band\b|\bat\b|\(|\n/i)[0].trim().slice(0, 50);

                        // Match student report type to official handbook policyCode
                        const reportTypeLower = (selected.type || '').toLowerCase();
                        let matchedPolicyCode = 'MIN-01'; // fallback
                        if (reportTypeLower.includes('cyberbullying') || reportTypeLower.includes('social media')) {
                          matchedPolicyCode = 'MAJ-02';
                        } else if (reportTypeLower.includes('bullying') || reportTypeLower.includes('away') || reportTypeLower.includes('fighting') || reportTypeLower.includes('pananakit')) {
                          matchedPolicyCode = 'MAJ-01';
                        } else if (reportTypeLower.includes('vape') || reportTypeLower.includes('vaping') || reportTypeLower.includes('smoking') || reportTypeLower.includes('sigarilyo')) {
                          matchedPolicyCode = 'MAJ-03';
                        } else if (reportTypeLower.includes('extortion') || reportTypeLower.includes('hingi') || reportTypeLower.includes('pera') || reportTypeLower.includes('blackmail')) {
                          matchedPolicyCode = 'MAJ-04';
                        } else if (reportTypeLower.includes('weapon') || reportTypeLower.includes('matalim') || reportTypeLower.includes('contraband')) {
                          matchedPolicyCode = 'MAJ-05';
                        } else if (reportTypeLower.includes('vandalism') || reportTypeLower.includes('sira')) {
                          matchedPolicyCode = 'MAJ-06';
                        } else if (reportTypeLower.includes('cutting') || reportTypeLower.includes('truancy') || reportTypeLower.includes('takas')) {
                          matchedPolicyCode = 'LSR-01';
                        } else if (reportTypeLower.includes('forgery') || reportTypeLower.includes('pemeke') || reportTypeLower.includes('records')) {
                          matchedPolicyCode = 'GRV-01';
                        } else if (reportTypeLower.includes('uniform') || reportTypeLower.includes('dress code') || reportTypeLower.includes('haircut') || reportTypeLower.includes('gupit')) {
                          matchedPolicyCode = 'MIN-02';
                        } else if (reportTypeLower.includes('id') || reportTypeLower.includes('school id')) {
                          matchedPolicyCode = 'MIN-03';
                        } else if (reportTypeLower.includes('disruption') || reportTypeLower.includes('ingay') || reportTypeLower.includes('kakulitan')) {
                          matchedPolicyCode = 'MIN-04';
                        } else if (reportTypeLower.includes('littering') || reportTypeLower.includes('kalat')) {
                          matchedPolicyCode = 'MIN-05';
                        } else if (reportTypeLower.includes('phone') || reportTypeLower.includes('cellphone') || reportTypeLower.includes('gadget')) {
                          matchedPolicyCode = 'MIN-06';
                        } else if (reportTypeLower.includes('tardiness') || reportTypeLower.includes('late')) {
                          matchedPolicyCode = 'MIN-01';
                        }

                        onCreateCase({
                          concernId: selected.id,
                          concernCode: selected.code,
                          place: selected.where || '',
                          witnesses: selected.witnesses || '',
                          reportedBy: selected.studentName || 'Student Reporter',
                          notes: `[FROM STUDENT CONCERN REPORT ${selected.code}]\nReporter / Complainant: ${selected.studentName} (ID: ${selected.studentNumber || '—'})\nWhen: ${selected.when || 'Not specified'}\nWhere: ${selected.where || 'Not specified'}\nWitnesses: ${selected.witnesses || 'None'}\nNarrative:\n${selected.whatHappened || ''}`.slice(0, 2000),
                          search: firstName,
                          policyCode: matchedPolicyCode,
                        });
                      }
                    : undefined
                }
              />
            )}
          </section>
        </div>
      )}

      {/* ================= CHATS ================= */}
      {tab === 'chats' && (
        <ChatsView
          isTl={isTl}
          chats={chats}
          unread={unread}
          lastMsg={lastMsg}
          chatId={chatId}
          setChatId={setChatId}
          when={when}
          onSent={(m) => setLastMsg((x) => new Map(x).set(m.concernId, m))}
          onSeen={markSeen}
          onClose={async (c) => {
            const ok = await confirmChange({
              title: isTl ? 'Isara ang chat?' : 'Close the chat?',
              description: `${c.studentName} · ${c.type}`,
              rows: [
                { label: 'Chat', before: isTl ? 'Bukas' : 'Open', after: isTl ? 'Sarado' : 'Closed' },
                { label: isTl ? 'Mga mensahe' : 'Messages', after: isTl ? 'Nakatago pa rin, hindi mabubura' : 'Kept, never deleted' },
              ],
              note: isTl ? 'Hindi na makakapag-reply ang estudyante sa chat na ito.' : 'The student can no longer reply in this chat.',
              confirmLabel: isTl ? 'Oo, isara' : 'Yes, close',
              tone: 'primary',
            });
            if (!ok) return;
            const at = new Date().toISOString();
            if (!(await updateConcern(c.id, { chat_status: 'Closed', chat_closed_at: at }, 'closeChat'))) {
              onTriggerToast(isTl ? 'Hindi na-save. I-check ang internet, tapos subukan ulit.' : 'Not saved. Check the internet, then try again.');
              return;
            }
            patchLocal(c.id, { chatStatus: 'Closed', chatClosedAt: at });
            void insertActivityLogInDb({ actor: 'Guidance Associate', actionEn: `Closed the chat for concern ${c.code} (${c.studentName})`, actionTl: `Isinara ang chat ng concern ${c.code} (${c.studentName})`, tag: 'Concern', tone: 'blue' });
            onTriggerToast(isTl ? 'Sarado na ang chat. Nakatago pa rin ang mga mensahe.' : 'Chat closed. The messages are kept.');
          }}
          onFailed={() => onTriggerToast(isTl ? ' Hindi naipadala. I-check ang internet, tapos subukan ulit.' : ' Not sent. Check the internet, then try again.')}
        />
      )}

      {/* ================= BLOCKED ACCOUNTS ================= */}
      {tab === 'accounts' && (
        <section className={card}>
          <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158]">
            <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Mga naka-block na account' : 'Blocked accounts'}</h2>
            <p className={sub}>{isTl ? 'Hindi makakapag-sign in o makakapagpadala ng concern ang mga account na ito.' : 'These accounts cannot sign in or send concerns.'}</p>
          </div>
          <div className="p-4 space-y-2 bg-[#F4F7FC] dark:bg-[#0B1527]">
            {blocked.length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {isTl ? 'Walang naka-block na account.' : 'No blocked accounts.'}
              </p>
            )}
            {blocked.slice(0, limit).map((a) => (
              <div key={a.id} className="rounded-xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                    {a.fullName} {a.studentNumber && <span className={sub}>· {a.studentNumber}</span>}
                  </p>
                  <p className={sub}>{a.deactivatedReason || (isTl ? 'Walang dahilan' : 'No reason given')}</p>
                </div>
                <button type="button" onClick={() => void doUnblock(a)} className={`${btn} saas-card-subtle`}>
                  {isTl ? 'I-unblock' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {approveFor && (
        <ApproveWindow
          c={approveFor}
          isTl={isTl}
          busy={busy}
          studentCases={cases.filter((k) => {
            const m = matchOf(approveFor);
            const own = m ? k.studentNumber === m.studentNumber : k.studentName.trim().toLowerCase() === approveFor.studentName.trim().toLowerCase();
            // also the cases of the students the reporter named under "Who was involved"
            const who = (approveFor.who || '').toLowerCase();
            const last = k.studentName.split(',')[0].trim().toLowerCase();
            const named = who.length > 2 && last.length > 2 && who.includes(last);
            return own || named || k.caseCode === approveFor.linkedCaseCode;
          })}
          onCancel={() => setApproveFor(null)}
          onApprove={(code) => void doApprove(approveFor, code)}
        />
      )}
      {rejectFor && <RejectWindow c={rejectFor} isTl={isTl} busy={busy} onCancel={() => setRejectFor(null)} onReject={(r) => void doReject(rejectFor, r)} />}
    </main>
  );
};

// ---------------------------------------------------------------------------
const Field: React.FC<{ label: string; value: string; empty: string }> = ({ label, value, empty }) => (
  <div>
    <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#4A608A] dark:text-[#94A8D0]">{label}</p>
    <p className={`text-sm whitespace-pre-wrap break-words ${value ? 'text-[#0B1F4D] dark:text-white' : 'italic text-[#4A608A] dark:text-[#94A8D0]'}`}>
      {value || empty}
    </p>
  </div>
);

// Smart helper: extracts structured cards from student submission narrative
function parseIncidentData(whatHappened: string, rawWho: string) {
  let reporterType = '';
  let respondentRaw = rawWho || '';
  let narrativeText = whatHappened || '';

  // Extract [REPORT FOR FRIEND / SELF-REPORT]
  const reportTypeMatch = narrativeText.match(/\[(REPORT FOR FRIEND[^\n\]]*|SELF-REPORT[^\n\]]*)\]/i);
  if (reportTypeMatch) {
    reporterType = reportTypeMatch[1].trim();
    narrativeText = narrativeText.replace(reportTypeMatch[0], '').trim();
  }

  // Extract [RESPONDENT / INIREREKLAMO: ...]
  const respondentMatch = narrativeText.match(/\[RESPONDENT[^:]*:\s*([^\n\]]+)\]/i);
  if (respondentMatch) {
    if (!respondentRaw || respondentRaw.toLowerCase().includes('not answered')) {
      respondentRaw = respondentMatch[1].trim();
    }
    narrativeText = narrativeText.replace(respondentMatch[0], '').trim();
  }

  // Extract [SALAYSAY / WHAT HAPPENED]: ...
  const salaysayMatch = narrativeText.match(/\[SALAYSAY[^:]*:\s*([\s\S]*)$/i);
  if (salaysayMatch) {
    narrativeText = salaysayMatch[1].trim();
  }

  // Parse respondent details (e.g. "Mark Santos - Palatandaan: Grade 11 ICT-2")
  let respondentName = respondentRaw;
  let respondentDetails = '';
  if (respondentRaw.includes('- Palatandaan:')) {
    const parts = respondentRaw.split('- Palatandaan:');
    respondentName = parts[0].trim();
    respondentDetails = parts[1].trim();
  } else if (respondentRaw.includes('-')) {
    const parts = respondentRaw.split('-');
    respondentName = parts[0].trim();
    respondentDetails = parts.slice(1).join('-').trim();
  }

  // Extract [EVIDENCE_PHOTO_1]: ...
  const evidencePhotos: string[] = [];
  const photoRegex = /\[EVIDENCE_PHOTO_\d+\]:\s*(data:image\/[^\n\s]+|https?:\/\/[^\n\s]+)/gi;
  let matchPhoto: RegExpExecArray | null;
  while ((matchPhoto = photoRegex.exec(narrativeText)) !== null) {
    evidencePhotos.push(matchPhoto[1]);
  }
  // Strip evidence photo tags from clean narrative
  narrativeText = narrativeText.replace(/\[EVIDENCE_PHOTO_\d+\]:\s*(data:image\/[^\n\s]+|https?:\/\/[^\n\s]+)/gi, '').trim();

  return {
    reporterType,
    respondentName: respondentName || 'Hindi tinukoy (Unknown)',
    respondentDetails,
    cleanNarrative: narrativeText || whatHappened,
    evidencePhotos,
  };
}

const ConcernDetail: React.FC<{
  c: ConcernItem;
  isTl: boolean;
  match?: StudentRecord;
  account?: PortalAccount;
  when: (s: string) => string;
  statusPill: React.ReactNode;
  matchPill: React.ReactNode;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDeactivate: () => void;
  onOpenChat: () => void;
  onOpenCase?: (code: string) => void;
  onCreateCase?: () => void;
}> = ({ c, isTl, match, account, when, statusPill, matchPill, busy, onApprove, onReject, onDeactivate, onOpenChat, onOpenCase, onCreateCase }) => {
  const none = isTl ? 'Hindi sinagot' : 'Not answered';
  const [view, setView] = useState<{ src: string; label: string } | null>(null);
  useEffect(() => {
    if (!view) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setView(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [view]);

  const cardBox = 'rounded-2xl border border-[#DCE5F2] dark:border-[#1E3158] bg-white dark:bg-[#0F1A30] flex flex-col min-h-0';
  const cardHead = 'px-4 py-2.5 border-b border-[#DCE5F2] dark:border-[#1E3158] text-[11px] font-extrabold uppercase tracking-wide text-[#4A608A] dark:text-[#94A8D0]';
  const cardFoot = 'mt-auto px-4 py-3 border-t border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center gap-2';
  const lab = 'text-[10px] font-extrabold uppercase tracking-wide text-[#4A608A] dark:text-[#94A8D0]';
  const val = 'text-[13px] leading-snug text-[#0B1F4D] dark:text-white break-words';

  const Photo = (p: { src: string; label: string; w: string; h: string; testId: string; fit: 'cover' | 'contain' }) =>
    p.src ? (
      <button
        type="button"
        data-concern-photo={p.testId}
        onClick={() => setView({ src: p.src, label: p.label })}
        title={isTl ? 'Pindutin para palakihin' : 'Press to enlarge'}
        className={`${p.w} ${p.h} shrink-0 rounded-xl overflow-hidden border border-[#C9D6EC] dark:border-[#253B66] bg-[#EEF3FC] dark:bg-[#0B1527] hover:ring-4 hover:ring-[#1E469B]/20`}
      >
        <img src={p.src} alt={p.label} loading="lazy" className={`w-full h-full ${p.fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
      </button>
    ) : (
      <div data-concern-photo-missing={p.testId} className={`${p.w} ${p.h} shrink-0 rounded-xl border-2 border-dashed border-[#C9D6EC] dark:border-[#253B66] bg-[#F4F7FC] dark:bg-[#0B1527] flex flex-col items-center justify-center text-center px-2`}>
        <ImageIcon className="w-5 h-5 text-sky-400" />
        <span className="text-[10.5px] font-bold text-[#4A608A] dark:text-[#94A8D0] leading-tight">{isTl ? `Walang ${p.label.toLowerCase()}` : `No ${p.label.toLowerCase()}`}</span>
      </div>
    );

  const photoLabel = isTl ? 'Actual na litrato' : 'Actual photo';
  const idLabel = isTl ? 'Student ID' : 'Student ID';

  return (
    <div data-concern-detail={c.code} className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {c.urgent && c.status === 'Pending' && <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-600 text-white">URGENT · {isTl ? 'Nangyayari ngayon' : 'Happening now'}</span>}
          {statusPill}
          {matchPill}
          {c.confidential && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200" title={isTl ? 'Gustong ilihim ng estudyante ang concern na ito' : 'The student asked to keep this private'}>
              {isTl ? 'Confidential' : 'Confidential'}
            </span>
          )}
        </div>
        <h2 className="text-lg font-extrabold text-[#0B1F4D] dark:text-white break-words">{c.type || (isTl ? 'Concern' : 'Concern')}</h2>
        <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
          {c.code} · {isTl ? 'Ipinadala' : 'Sent'} {when(c.createdAt)}
        </p>
      </div>

      <div className="flex-1 min-h-0 p-3 grid grid-cols-[1.25fr_1fr] gap-3 bg-[#F4F7FC] dark:bg-[#0B1527]">
        {/* ---------- LEFT: COMPLAINANT (REPORTING STUDENT) - CLEAN STRUCTURED PROFILE ---------- */}
        <section className={cardBox} data-concern-student>
          <div className="px-4 py-2.5 border-b border-[#DCE5F2] dark:border-[#1E3158] flex items-center justify-between bg-slate-50/60 dark:bg-[#0B1527]/60">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{isTl ? 'Complainant / Nagsumbong na Estudyante' : 'Complainant (Reporting Student)'}</span>
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              {isTl ? 'Verified Portal Account' : 'Portal Verified'}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 clean-scroll" data-student-scroll>
            {/* Primary Profile Identity Mini-Card */}
            <div className="p-3.5 rounded-xl border border-sky-100 dark:border-sky-900/40 bg-gradient-to-br from-white via-sky-50/30 to-blue-50/20 dark:from-[#0E1D3B] dark:to-[#0B1527] shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E469B] to-[#2557BE] text-white flex items-center justify-center text-lg font-black shrink-0 shadow-sm ring-2 ring-sky-300/40">
                  {c.studentName ? c.studentName.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A608A] dark:text-[#94A8D0]">
                    {isTl ? 'Buong Pangalan ng Nagsumbong' : 'Reporting Student Full Name'}
                  </p>
                  <p className="text-sm font-black text-[#0B1F4D] dark:text-white leading-tight mt-0.5 truncate" title={c.studentName}>
                    {c.studentName}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] font-bold text-[#1E469B] dark:text-[#7CB8F7] bg-white dark:bg-[#0B1527] px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-900">
                      LRN / ID: {c.studentNumber || '—'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0B1527] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                      {c.gradeSection || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Masterlist Verification Mini-Card */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0D182E] shadow-xs space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A608A] dark:text-[#94A8D0] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{isTl ? 'Pagtutugma sa Registrar Masterlist' : 'Registrar Masterlist Status'}</span>
              </p>
              {match ? (
                <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                      {match.fullName}
                    </p>
                    <p className="text-[10.5px] text-emerald-700 dark:text-emerald-300 font-medium">
                      {match.gradeSection} · Senior High School
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-200 leading-tight">
                    {isTl ? 'Wala sa masterlist. Kumpirmahin muna ang account ng mag-aaral.' : 'Not verified in the official masterlist.'}
                  </p>
                </div>
              )}
            </div>

            {/* Contact Details Mini-Card */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0D182E] shadow-xs space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A608A] dark:text-[#94A8D0] flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{isTl ? 'Impormasyon sa Pakikipag-ugnayan' : 'Contact Information'}</span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0B1527] border border-slate-100 dark:border-white/5">
                  <p className="text-[9.5px] font-bold text-[#4A608A] dark:text-[#94A8D0]">Email Address</p>
                  <p className="font-bold text-[#0B1F4D] dark:text-white mt-0.5 truncate" title={account?.email || '—'}>
                    {account?.email || '—'}
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0B1527] border border-slate-100 dark:border-white/5">
                  <p className="text-[9.5px] font-bold text-[#4A608A] dark:text-[#94A8D0]">Mobile Number</p>
                  <p className="font-bold text-[#0B1F4D] dark:text-white mt-0.5 truncate" title={account?.contactNumber || '—'}>
                    {account?.contactNumber || '—'}
                  </p>
                </div>
              </div>

              {c.submittedBy && !/^self-report/i.test(c.submittedBy.trim()) && (
                <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-[9.5px] font-extrabold text-amber-800 dark:text-amber-300 uppercase">
                    {isTl ? 'Paraan ng Pagpasa (Report Scope)' : 'Submission Type'}
                  </p>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-100 mt-0.5">
                    {c.submittedBy}
                  </p>
                </div>
              )}
            </div>

            {account?.status === 'Deactivated' && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {isTl ? 'Naka-block na ang account na ito.' : 'This account is blocked.'}
              </div>
            )}
          </div>

          {account && account.status !== 'Deactivated' && (
            <div className={cardFoot}>
              <button
                type="button"
                data-action="deactivate"
                onClick={onDeactivate}
                className={`${btn} px-4 py-2.5 saas-card-subtle text-rose-700 dark:text-rose-300 w-full sm:w-auto`}
                title={isTl ? 'Para sa account na hindi totoong estudyante' : 'For accounts that are not real students'}
              >
                {isTl ? 'I-block ang fake account' : 'Block fake account'}
              </button>
            </div>
          )}
        </section>

        {/* ---------- RIGHT: the report (Organized High-Clarity Mini Cards) ---------- */}
        <section className={cardBox} data-concern-report>
          <div className="px-4 py-2.5 border-b border-[#DCE5F2] dark:border-[#1E3158] flex items-center justify-between bg-slate-50/60 dark:bg-[#0B1527]/60">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{isTl ? 'Mga Tala ng Insidente (Incident Record)' : 'Incident Breakdown & Record'}</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-400/20">
              {c.code}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 clean-scroll">
            {(() => {
              const parsed = parseIncidentData(c.whatHappened, c.who);
              return (
                <>
                  {/* CARD 1: RESPONDENT CARD (Prominent Identification) */}
                  <div className="rounded-xl border border-sky-200 dark:border-sky-900/60 bg-gradient-to-br from-sky-50/60 via-white to-blue-50/30 dark:from-[#0E1D3B] dark:to-[#0B1527] p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-sky-100 dark:border-sky-800/40 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-[#1E469B] text-white flex items-center justify-center text-[10px] font-black">
                          <Target className="w-3.5 h-3.5 text-indigo-500" />
                        </span>
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7]">
                          {isTl ? 'Inirereklamong Estudyante (Respondent)' : 'Reported Student (Respondent)'}
                        </span>
                      </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7]">
              {isTl ? 'Disciplinary Case Connection:' : 'Disciplinary Case Connection:'}
            </span>
            {onCreateCase && (
              <button
                type="button"
                data-action="create-case-always"
                onClick={onCreateCase}
                className="px-2.5 py-1 rounded-lg bg-[#1E469B] hover:bg-[#16377E] active:scale-95 text-white text-[10.5px] font-black shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title={isTl ? 'Pumunta sa Cases para gawan ng pormal na kaso ang inirereklamo' : 'Open Cases form for the reported student'}
              >
                <span>＋</span>
                <span>{isTl ? 'Gumawa ng Kaso para sa Inirereklamo' : 'Create Case for Respondent'}</span>
              </button>
            )}
          </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-white/80 dark:bg-[#0B1527]/80 p-2 border border-sky-100 dark:border-sky-900/40">
                        <p className="text-[9.5px] font-extrabold uppercase text-[#4A608A] dark:text-[#94A8D0]">
                          {isTl ? 'Pangalan ng Inirereklamo' : 'Student Name'}
                        </p>
                        <p className="text-[13px] font-black text-[#0B1F4D] dark:text-white mt-0.5 truncate" title={parsed.respondentName}>
                          {parsed.respondentName}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white/80 dark:bg-[#0B1527]/80 p-2 border border-sky-100 dark:border-sky-900/40">
                        <p className="text-[9.5px] font-extrabold uppercase text-[#4A608A] dark:text-[#94A8D0]">
                          {isTl ? 'Section / Palatandaan' : 'Section / Attributes'}
                        </p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={parsed.respondentDetails || none}>
                          {parsed.respondentDetails || none}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: NARRATIVE CARD (Salaysay ng Pangyayari) */}
                  <div className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0D182E] p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-1.5">
                      <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-sky-500" />
                        <span>{isTl ? 'Buong Salaysay ng Pangyayari (Narrative)' : 'Official Narrative of What Happened'}</span>
                      </span>
                      {parsed.reporterType && (
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {parsed.reporterType}
                        </span>
                      )}
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-[#0B1F4D] dark:text-slate-100 font-medium whitespace-pre-wrap p-2.5 rounded-lg bg-slate-50/70 dark:bg-[#0B1527]/70 border border-slate-200/60 dark:border-white/5">
                      {parsed.cleanNarrative}
                    </p>
                  </div>

                  {/* EVIDENCE PHOTOS CARD (Photos of injuries, damages, vape/contraband, screenshots) */}
                  {parsed.evidencePhotos.length > 0 && (
                    <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/40 via-white to-orange-50/20 dark:from-[#2A1018] dark:to-[#0B1527] p-3 shadow-xs space-y-2">
                      <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/40 pb-1.5">
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-sky-500" />
                          <span>{isTl ? 'Kalakip na Litrato / Pisikal na Ebidensya' : 'Attached Photo & Physical Evidence'}</span>
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-400/30">
                          {parsed.evidencePhotos.length} {isTl ? 'Katibayan' : 'Photos'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">
                        {isTl
                          ? 'I-click ang alinmang litrato upang palakihin at masusing suriin.'
                          : 'Click any photo evidence to view full resolution.'}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {parsed.evidencePhotos.map((imgSrc, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setView({ src: imgSrc, label: `Ebidensya ${pIdx + 1}` })}
                            title={isTl ? 'Pindutin para palakihin ang ebidensya' : 'Enlarge evidence'}
                            className="relative group rounded-xl overflow-hidden border-2 border-rose-300 dark:border-rose-800 aspect-video bg-black/10 hover:ring-4 hover:ring-rose-500/30 transition-all cursor-pointer shadow-xs"
                          >
                            <img src={imgSrc} alt={`Evidence ${pIdx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                              <span className='flex items-center gap-1'><Maximize2 className='w-3 h-3' /><span>{isTl ? 'Palakihin' : 'Zoom'}</span></span>
                            </div>
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-black/70 text-white">
                              Ebidensya {pIdx + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PABABA / VERTICAL STACKED MINI-CARDS (NO TRUNCATION, FULL TEXT DISPLAY) */}
                  {/* CARD 3: WHEN (KAILAN) */}
                  <div className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0D182E] p-3 shadow-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <span>⏰</span>
                      <span>{isTl ? 'Kailan Nangyari (When)' : 'When It Happened (Date & Time)'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-[#0B1527]/70 border border-slate-200/60 dark:border-white/5">
                      <p className="text-xs font-bold text-[#0B1F4D] dark:text-white leading-relaxed whitespace-pre-wrap break-words">
                        {c.when || none}
                      </p>
                    </div>
                  </div>

                  {/* CARD 4: WHERE (SAAN) */}
                  <div className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0D182E] p-3 shadow-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-sky-500" />
                      <span>{isTl ? 'Saan Nangyari (Where)' : 'Location of Incident (Where)'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-[#0B1527]/70 border border-slate-200/60 dark:border-white/5">
                      <p className="text-xs font-bold text-[#0B1F4D] dark:text-white leading-relaxed whitespace-pre-wrap break-words">
                        {c.where || none}
                      </p>
                    </div>
                  </div>

                  {/* CARD 5: WITNESSES (MGA SAKSI) */}
                  <div className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0D182E] p-3 shadow-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-sky-500" />
                      <span>{isTl ? 'Mga Saksi sa Pangyayari (Witnesses)' : 'Witnesses Present'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-[#0B1527]/70 border border-slate-200/60 dark:border-white/5">
                      <p className="text-xs font-bold text-[#0B1F4D] dark:text-white leading-relaxed whitespace-pre-wrap break-words">
                        {c.witnesses || (isTl ? 'Wala / Hindi sinagot' : 'None / Not answered')}
                      </p>
                    </div>
                  </div>

                  {/* TRUTHFULNESS & DATA PRIVACY BANNER */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>
                        {c.truthful
                          ? (isTl ? 'Nangako ang estudyante na totoo ang buong salaysay (RA 10173 Protected).' : 'Student certified this report truthful under RA 10173.')
                          : (isTl ? 'Walang pormal na pangako.' : 'Uncertified submission.')}
                      </span>
                    </span>
                    <span className="text-[9.5px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      VERIFIED
                    </span>
                  </div>

                  {/* REJECTION OR CASE LINK NOTICES */}
                  {c.status === 'Rejected' && (
                    <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3">
                      <p className="text-[10px] font-black uppercase text-rose-800 dark:text-rose-300">
                        {isTl ? 'Dahilan ng Pag-reject (Nakikita ng Estudyante)' : 'Rejection Reason'}
                      </p>
                      <p className="text-xs font-semibold text-rose-900 dark:text-rose-100 mt-0.5">
                        {c.rejectReason || '—'}
                      </p>
                    </div>
                  )}

                  {c.status === 'Approved' && c.linkedCaseCode && (
                    <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                      <span className="text-xs text-[#0B1F4D] dark:text-white font-medium">
                        {isTl ? 'Naka-link sa Opisyal na Kaso:' : 'Linked Case:'}
                      </span>
                      {onOpenCase ? (
                        <button
                          type="button"
                          onClick={() => onOpenCase(c.linkedCaseCode)}
                          className="px-2.5 py-1 rounded bg-[#1E469B] text-white text-xs font-black shadow-xs hover:bg-[#16377E]"
                        >
                          {c.linkedCaseCode} ↗
                        </button>
                      ) : (
                        <span className="font-extrabold text-[#1E469B] dark:text-[#7CB8F7] text-xs">
                          {c.linkedCaseCode}
                        </span>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          {(c.status === 'Pending' || c.chatStatus === 'Open' || c.chatStatus === 'Closed') && (
            <div className={`${cardFoot} justify-end`}>
              {c.status === 'Pending' ? (
                <>
                  <button type="button" disabled={busy} data-action="reject" onClick={onReject} className={`${btn} px-4 py-2.5 saas-card-subtle text-rose-700 dark:text-rose-300`}>
                    {isTl ? 'I-reject' : 'Reject'}
                  </button>
                  <button type="button" disabled={busy} data-action="approve" onClick={onApprove} className={`${btn} px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50`}>
                    {isTl ? 'I-approve' : 'Approve'}
                  </button>
                </>
              ) : (
                <button type="button" onClick={onOpenChat} className={`${btn} px-5 py-2.5 bg-[#1E469B] text-white`}>
                  {c.chatStatus === 'Open' ? (isTl ? 'Buksan ang chat' : 'Open the chat') : isTl ? 'Tingnan ang chat (sarado)' : 'View chat (closed)'}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {view &&
        createPortal(
          <div className="fixed inset-0 z-[90] !m-0 bg-black/80 flex flex-col items-center justify-center p-6 gap-3" data-photo-viewer onMouseDown={(e) => e.target === e.currentTarget && setView(null)}>
            <img src={view.src} alt={view.label} className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl bg-white" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">{view.label} · {c.studentName}</span>
              <button type="button" onClick={() => setView(null)} className="px-4 py-2 rounded-lg bg-white text-[#0B1F4D] text-xs font-extrabold">
                {isTl ? 'Isara (Esc)' : 'Close (Esc)'}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

// ---------------------------------------------------------------------------
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-confirm-open]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[80] !m-0 bg-black/50 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] shadow-2xl">
        <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex items-center justify-between">
          <h3 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg text-[#4A608A] hover:bg-slate-100 dark:hover:bg-slate-800">
            
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

const ApproveWindow: React.FC<{
  c: ConcernItem;
  isTl: boolean;
  busy: boolean;
  studentCases: DisciplineCaseRecord[];
  onCancel: () => void;
  onApprove: (caseCode: string) => void;
}> = ({ c, isTl, busy, studentCases, onCancel, onApprove }) => {
  const [code, setCode] = useState('');
  return (
    <Modal title={isTl ? `I-approve ang concern ni ${c.studentName}` : `Approve ${c.studentName}'s concern`} onClose={onCancel}>
      <div className="p-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="link-case" className="text-xs font-extrabold text-[#0B1F4D] dark:text-white">
            {isTl ? 'I-link sa kaso (opsyonal)' : 'Link to a case (optional)'}
          </label>
          <select
            id="link-case"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white"
          >
            <option value="">{isTl ? 'Huwag i-link' : 'Do not link'}</option>
            {studentCases.map((k) => (
              <option key={k.caseCode} value={k.caseCode}>
                {k.caseCode} · {isTl ? k.offenseTitleTl : k.offenseTitleEn} · {k.status}
              </option>
            ))}
          </select>
          <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">
            {studentCases.length === 0
              ? isTl ? 'Wala pang kaso para dito. Pagkatapos mag-approve, pindutin ang "＋ Gumawa ng kaso para sa isinumbong" sa report.' : 'No case yet. After approving, press "＋ Record a case for the reported student" in the report.'
              : isTl ? 'Hindi makikita ng estudyante ang kaso — sa office lang ito.' : 'The student never sees the case — it is for the office only.'}
          </p>
        </div>
        <p className="text-xs text-[#0B1F4D] dark:text-white rounded-xl saas-card-subtle p-3">
          {isTl ? 'Magbubukas ng chat at magpapadala ng unang mensahe: "Natanggap na po ng Guidance Office ang iyong concern…"' : 'A chat opens with a first message: "The Guidance Office has received your concern…"'}
        </p>
      </div>
      <div className="px-6 py-4 border-t border-[#DCE5F2] dark:border-[#1E3158] flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={`${btn} px-4 py-2.5 saas-card-subtle`}>
          {isTl ? 'Kanselahin' : 'Cancel'}
        </button>
        <button type="button" disabled={busy} data-action="approve-confirm" onClick={() => onApprove(code)} className={`${btn} px-5 py-2.5 bg-emerald-600 text-white disabled:opacity-50`}>
          {busy ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? 'I-approve' : 'Approve'}
        </button>
      </div>
    </Modal>
  );
};

const RejectWindow: React.FC<{ c: ConcernItem; isTl: boolean; busy: boolean; onCancel: () => void; onReject: (r: string) => void }> = ({ c, isTl, busy, onCancel, onReject }) => {
  const [preset, setPreset] = useState<number | null>(null);
  const [own, setOwn] = useState('');
  const reason = preset != null ? REJECT_REASONS[preset][1] : own.trim();
  const tooShort = preset == null && own.trim().length > 0 && own.trim().length < 10;
  return (
    <Modal title={isTl ? `I-reject ang concern ni ${c.studentName}` : `Reject ${c.studentName}'s concern`} onClose={onCancel}>
      <div className="p-6 space-y-3">
        <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Bakit? Makikita ito ng estudyante.' : 'Why? The student will see this.'}</p>
        {REJECT_REASONS.map(([en, tl], i) => (
          <label key={i} className={`flex gap-2 items-start rounded-xl border px-3 py-2 cursor-pointer text-sm ${preset === i ? 'border-[#1E469B] bg-[#EEF3FC] dark:bg-[#13203B]' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}>
            <input type="radio" name="reject" checked={preset === i} onChange={() => setPreset(i)} className="mt-1" />
            <span className="text-[#0B1F4D] dark:text-white">
              {tl}
              {!isTl && <span className="block text-xs text-[#4A608A] dark:text-[#94A8D0]">{en}</span>}
            </span>
          </label>
        ))}
        <label className={`flex gap-2 items-start rounded-xl border px-3 py-2 text-sm ${preset === null ? 'border-[#1E469B]' : 'border-[#D3DDEE] dark:border-[#253B66]'}`}>
          <input type="radio" name="reject" checked={preset === null} onChange={() => setPreset(null)} className="mt-1" />
          <span className="flex-1 space-y-1">
            <span className="text-[#0B1F4D] dark:text-white">{isTl ? 'Ibang dahilan:' : 'Other reason:'}</span>
            <textarea
              value={own}
              onChange={(e) => {
                setOwn(e.target.value.slice(0, 300));
                setPreset(null);
              }}
              rows={3}
              placeholder={isTl ? 'Isulat nang malinaw at magalang…' : 'Write it clearly and politely…'}
              className="w-full px-3 py-2 rounded-lg border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white leading-relaxed"
            />
            {tooShort && <span className="block text-xs font-bold text-rose-700 dark:text-rose-300">{isTl ? 'Masyadong maikli. Ipaliwanag nang kaunti pa (10+ letra).' : 'Too short. Explain a little more (10+ letters).'}</span>}
          </span>
        </label>
      </div>
      <div className="px-6 py-4 border-t border-[#DCE5F2] dark:border-[#1E3158] flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={`${btn} px-4 py-2.5 saas-card-subtle`}>
          {isTl ? 'Kanselahin' : 'Cancel'}
        </button>
        <button
          type="button"
          disabled={busy || reason.length < 10}
          data-action="reject-confirm"
          onClick={() => onReject(reason)}
          title={reason.length < 10 ? (isTl ? 'Pumili o magsulat muna ng dahilan' : 'Pick or write a reason first') : undefined}
          className={`${btn} px-5 py-2.5 bg-rose-600 text-white disabled:opacity-50`}
        >
          {isTl ? 'I-reject' : 'Reject'}
        </button>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
const SHOW_MSGS = 200;
const ChatsView: React.FC<{
  isTl: boolean;
  chats: ConcernItem[];
  unread: (c: ConcernItem) => boolean;
  lastMsg: Map<number, ConcernMessage>;
  chatId: number | null;
  setChatId: (id: number) => void;
  when: (s: string) => string;
  onSent: (m: ConcernMessage) => void;
  onSeen: (concernId: number, msgId: number) => void;
  onClose: (c: ConcernItem) => void;
  onFailed: () => void;
}> = ({ isTl, chats, unread, lastMsg, chatId, setChatId, when, onSent, onSeen, onClose, onFailed }) => {
  const active = chats.find((c) => c.id === chatId) ?? chats[0] ?? null;
  const [msgs, setMsgs] = useState<ConcernMessage[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [chatLimit, setChatLimit] = useState(PAGE);
  const endRef = useRef<HTMLDivElement>(null);
  const activeId = active?.id ?? null;

  useEffect(() => {
    if (activeId == null) return;
    let alive = true;
    let lastId = 0;
    setMsgs(null);
    setShowAll(false);
    const first = async () => {
      const m = await fetchMessages(activeId);
      if (!alive || !m) return;
      lastId = m.length ? m[m.length - 1].id : 0;
      setMsgs(m);
    };
    const load = async () => {
      const m = await fetchMessagesAfter(activeId, lastId);
      if (!alive || !m || m.length === 0) return;
      lastId = m[m.length - 1].id;
      setMsgs((prev) => {
        const have = new Set((prev ?? []).map((x) => x.id));
        const add = m.filter((x) => !have.has(x.id));
        return add.length ? [...(prev ?? []), ...add] : prev;
      });
    };
    void first();
    // new replies from the student: check every 4 s while this chat is on screen
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 4000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [activeId]);

  useEffect(() => {
    if (!msgs || activeId == null) return;
    const last = msgs[msgs.length - 1];
    if (last) onSeen(activeId, last.id);
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, activeId, onSeen]);

  const send = async () => {
    const body = text.trim();
    if (!active || !body || sending) return;
    setSending(true);
    const m = await sendMessage(active.id, 'office', body);
    setSending(false);
    if (!m) return onFailed();
    setText('');
    setMsgs((l) => [...(l ?? []), m]);
    onSent(m);
  };

  if (chats.length === 0)
    return (
      <section className={`${card} p-10 text-center`}>
        <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? 'Wala pang chat.' : 'No chats yet.'}</p>
        <p className={sub}>{isTl ? 'Magbubukas ang chat kapag in-approve mo ang isang concern sa "Mga concern".' : 'A chat opens when you approve a concern in "Submitted reports".'}</p>
      </section>
    );

  const open = officeOpenNow();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,360px)_1fr] gap-4 items-start">
      <section className={card}>
        <div className="max-h-[calc(100vh-240px)] min-h-[300px] overflow-y-auto p-2 space-y-1.5 bg-[#F4F7FC] dark:bg-[#0B1527]">
          {(active && chats.indexOf(active) >= chatLimit ? [...chats.slice(0, chatLimit), active] : chats.slice(0, chatLimit)).map((c) => {
            const lm = lastMsg.get(c.id);
            const isNew = unread(c);
            return (
              <button
                key={c.id}
                type="button"
                data-chat-row={c.code}
                onClick={() => setChatId(c.id)}
                className={`w-full text-left rounded-xl px-3 py-2.5 border ${
                  active?.id === c.id ? 'bg-white dark:bg-[#13203B] border-[#1E469B] dark:border-[#7CB8F7]' : 'bg-white dark:bg-[#0F1A30] border-[#D3DDEE] dark:border-[#253B66]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white truncate">
                    {isNew && <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1.5 align-middle" title={isTl ? 'Bagong reply' : 'New reply'} />}
                    {c.studentName}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${c.chatStatus === 'Open' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                    {c.chatStatus === 'Open' ? (isTl ? 'Bukas' : 'Open') : isTl ? 'Sarado' : 'Closed'}
                  </span>
                </div>
                <p className="text-xs text-[#4A608A] dark:text-[#94A8D0] truncate">
                  {lm ? `${lm.sender === 'office' ? (isTl ? 'Ikaw: ' : 'You: ') : ''}${lm.body}` : c.type}
                </p>
              </button>
            );
          })}
          {chats.length > chatLimit && (
            <button type="button" onClick={() => setChatLimit((n) => n + PAGE)} className={`${btn} w-full saas-card-subtle`}>
              {isTl ? `Ipakita pa (${chats.length - chatLimit} pa)` : `Show more (${chats.length - chatLimit} more)`}
            </button>
          )}
        </div>
      </section>

      {active && (
        <section className={`${card} flex flex-col`} data-chat-thread={active.code}>
          <div className="px-5 py-3 border-b border-[#DCE5F2] dark:border-[#1E3158] flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base font-extrabold text-[#0B1F4D] dark:text-white">{active.studentName}</p>
              <p className={sub}>
                {active.type} · {active.code}
              </p>
            </div>
            {active.chatStatus === 'Open' && (
              <button type="button" data-action="close-chat" onClick={() => onClose(active)} className={`${btn} saas-card-subtle`}>
                {isTl ? 'Isara ang chat' : 'Close chat'}
              </button>
            )}
          </div>
          <p className={`px-5 py-2 text-xs font-bold ${open ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'}`}>
            
            {open
              ? isTl ? 'Bukas ang office ngayon (Lunes–Biyernes, 8:00 AM–5:00 PM). Makikita ng estudyante ang mensahe mo bilang "Guidance Office".' : 'The office is open now (Mon–Fri, 8:00 AM–5:00 PM). The student sees your messages as "Guidance Office".'
              : isTl ? 'Sarado ang office ngayon. Makikita ng estudyante na sasagot kayo sa susunod na oras ng opisina.' : 'The office is closed now. The student is told you will reply during office hours.'}
          </p>
          <div className="h-[calc(100vh-430px)] min-h-[260px] overflow-y-auto px-5 py-4 space-y-2 bg-[#F4F7FC] dark:bg-[#0B1527]">
            {msgs === null && <p className={`${sub} text-center`}>{isTl ? 'Kinukuha ang mga mensahe…' : 'Loading messages…'}</p>}
            {msgs && msgs.length > SHOW_MSGS && !showAll && (
              <button type="button" onClick={() => setShowAll(true)} className={`${btn} mx-auto block saas-card-subtle`}>
                {isTl ? `Ipakita ang mas luma (${msgs.length - SHOW_MSGS})` : `Show older (${msgs.length - SHOW_MSGS})`}
              </button>
            )}
            {msgs && msgs.length === 0 && <p className={`${sub} text-center`}>{isTl ? 'Wala pang mensahe.' : 'No messages yet.'}</p>}
            {msgs && <Bubbles msgs={msgs} showAll={showAll} studentName={active.studentName} when={when} />}
            <div ref={endRef} />
          </div>
          {active.chatStatus === 'Open' ? (
            <div className="p-3 border-t border-[#DCE5F2] dark:border-[#1E3158] flex gap-2 items-end">
              <textarea
                value={text}
                aria-label={isTl ? 'Isulat ang mensahe' : 'Write a message'}
                onChange={(e) => setText(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder={isTl ? 'Isulat ang mensahe… (Enter = ipadala, Shift+Enter = bagong linya)' : 'Write a message… (Enter = send, Shift+Enter = new line)'}
                className="flex-1 px-3 py-2 rounded-xl border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white leading-relaxed resize-none"
              />
              <button type="button" data-action="send" disabled={!text.trim() || sending} onClick={() => void send()} className={`${btn} px-5 py-2.5 bg-[#1E469B] text-white disabled:opacity-50`}>
                {sending ? (isTl ? 'Ipinapadala…' : 'Sending…') : isTl ? 'Ipadala' : 'Send'}
              </button>
            </div>
          ) : (
            <p className="px-5 py-3 border-t border-[#DCE5F2] dark:border-[#1E3158] text-xs font-bold text-[#4A608A] dark:text-[#94A8D0]">
              {isTl ? 'Sarado na ang chat na ito' : 'This chat is closed'}
              {active.chatClosedAt ? ` (${when(active.chatClosedAt)})` : ''}. {isTl ? 'Nakatago pa rin ang lahat ng mensahe.' : 'All messages are kept.'}
            </p>
          )}
          {import.meta.env.DEV && active.chatStatus === 'Open' && (
            <button
              type="button"
              data-action="practice-reply"
              onClick={async () => {
                const m = await sendMessage(active.id, 'student', 'Salamat po. (practice reply from the student — dev only)');
                if (m) {
                  setMsgs((l) => [...(l ?? []), m]);
                  onSent(m);
                }
              }}
              className="text-[11px] text-slate-500 underline px-5 pb-2 text-left"
            >
              Practice student reply (dev only)
            </button>
          )}
        </section>
      )}
    </div>
  );
};

// drawn once per new message — typing in the box does not redraw the chat
const Bubbles = React.memo(function Bubbles({ msgs, showAll, studentName, when }: { msgs: ConcernMessage[]; showAll: boolean; studentName: string; when: (s: string) => string }) {
  const visible = showAll ? msgs : msgs.slice(-SHOW_MSGS);
  return (
    <>
      {visible.map((m) => (
        <div key={m.id} className={`flex ${m.sender === 'office' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${m.sender === 'office' ? 'bg-[#1E469B] text-white rounded-br-md' : 'bg-white dark:bg-[#13203B] text-[#0B1F4D] dark:text-white border border-[#D3DDEE] dark:border-[#253B66] rounded-bl-md'}`}>
            <p className={`text-[11px] font-extrabold mb-0.5 ${m.sender === 'office' ? 'text-white/80' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}>
              {m.sender === 'office' ? 'Guidance Office' : studentName} · {when(m.createdAt)}
            </p>
            {m.body}
          </div>
        </div>
      ))}
    </>
  );
});

// DEV only — lets us try the page before the student portal exists
const PracticeButton: React.FC<{ students: StudentRecord[]; onDone: (ok: boolean) => void }> = ({ students, onDone }) => (
  <div className="flex gap-1.5">
    <button
      type="button"
      data-action="practice-concern"
      onClick={async () => {
        const s = students[Math.floor(Math.random() * Math.max(1, students.length))];
        onDone(
          await insertPracticeConcern({
            studentName: s?.fullName ?? 'Practice Student',
            gradeSection: s?.gradeSection ?? 'Grade 11',
            studentNumber: s?.studentNumber ?? '',
            urgent: Math.random() < 0.4,
            confidential: Math.random() < 0.5,
            type: 'Peer conflict',
            what: 'May nang-aasar po sa akin araw-araw sa canteen at ayaw na po nilang tumigil.',
          })
        );
      }}
      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 border border-dashed border-slate-400"
    >
      + Practice concern (dev only)
    </button>
    <button
      type="button"
      data-action="practice-fake"
      onClick={async () =>
        onDone(
          await insertPracticeConcern({
            studentName: 'Hindi Totoong Pangalan',
            gradeSection: 'Grade 12',
            studentNumber: '',
            urgent: false,
            confidential: false,
            type: 'Other',
            what: 'test test',
          })
        )
      }
      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 border border-dashed border-slate-400"
    >
      + Practice fake account (dev only)
    </button>
  </div>
);

export default ConcernsHub;
