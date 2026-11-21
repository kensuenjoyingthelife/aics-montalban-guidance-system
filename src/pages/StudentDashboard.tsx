import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useConfirmChange } from '../components/ui/ConfirmChange';
import {
  Menu,
  X,
  FileEdit,
  FolderArchive,
  MessageSquare,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Shield,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Bell,
  BellOff,
  Camera,
  Image as ImageIcon,
  Trash2,
  Compass,
  Lock as LockIcon,
  User,
  Users,
  Clock,
  Send,
  FileText,
  Download,
  CheckCheck,
  Home as HomeIcon,
  Plus,
  UserCircle2,
  Sparkles,
  UserCheck,
  UserX,
  Hand,
  Smartphone,
  Wind,
  Coins,
  Scissors,
  Hammer,
  DoorOpen,
  PenLine,
  AlarmClock,
  Shirt,
  BadgeCheck,
  Volume2,
  PhoneOff,
  MoreHorizontal,
} from 'lucide-react';
import { WavyBackground } from '../components/auth/WavyBackground';
import { SoundTogglePill, soundFX } from '../services/soundEngine';
import { notificationService } from '../services/notificationService';
import { isCapacitorNativeApp } from '../services/devicePerformance';
import { SkyThemePill, useTheme } from '../context/ThemeContext';
import { LocaleSwitchPill, useLanguage } from '../context/LanguageContext';
import { StudentPortalUser, changeStudentPassword } from '../services/studentAuthService';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabaseClient';
import { loadAppConfig, useAppConfig } from '../services/appConfig';
import { officeHoursText, isOfficeDay, todayISO, SLOT_STARTS, SLOT_MINUTES } from '../services/scheduling';
import { SafezoneMascot } from '../components/auth/SafezoneMascot';
import { Clock as ClockIcon, Check as CheckIcon, ShieldCheck as ShieldIcon } from 'lucide-react';
import { QuickExitButton } from '../components/security/QuickExitButton';
import { MobileAppTourModal } from '../components/student/MobileAppTourModal';
import { ChristmasLights, Parol, PaskoGreeting, PaskoChip, HollySprig } from '../components/student/ChristmasDecor';
import { christmasOn, insideDecorWanted, setInsideDecorWanted, DECOR_EVENT } from '../config/seasonalTheme';
import { moderateReportContent, recordSecurityAudit } from '../services/securityEngine';
import {
  ConcernMessage,
  fetchMessages,
  fetchMessagesAfter,
  sendMessage,
  ChatState,
  fetchChatState,
  markChatSeen,
  setChatTyping,
} from '../services/concernsDb';

interface StudentDashboardProps {
  user: StudentPortalUser;
  onSignOut: () => void;
}

interface StudentConcernHistory {
  id: number;
  referralCode: string;
  category: string;
  whatHappened: string;
  status: string;
  urgency: string;
  chatStatus: 'None' | 'Open' | 'Closed';
  chatClosedAt: string;
  createdAt: string;
  reviewedAt: string;
}

/** Report categories (values stay the same for database compatibility, without exposing severity labels to students). */
const CONCERN_GROUPS = [
  {
    items: [
      { v: 'Physical Bullying & Fighting', en: 'Bullying or fighting', tl: 'Bullying o away', icon: Hand },
      { v: 'Cyberbullying & Online Harassment', en: 'Cyberbullying', tl: 'Cyberbullying', icon: Smartphone },
      { v: 'Vaping / Smoking Infraction', en: 'Vaping or smoking', tl: 'Vape o sigarilyo', icon: Wind },
      { v: 'Extortion & Coercion', en: 'Asking for money or threats', tl: 'Panghihingi ng pera o pananakot', icon: Coins },
      { v: 'Weapons & Dangerous Contraband', en: 'Weapons or dangerous items', tl: 'Matalim o delikadong gamit', icon: Scissors },
      { v: 'Vandalism & Campus Property Damage', en: 'Damage to school property', tl: 'Pagsira ng gamit ng school', icon: Hammer },
      { v: 'Cutting Classes & Truancy', en: 'Cutting classes', tl: 'Pag-cutting', icon: DoorOpen },
      { v: 'Forgery & Tampering of Records', en: 'Fake signature or records', tl: 'Pekeng pirma o records', icon: PenLine },
      { v: 'Habitual Tardiness', en: 'Always late', tl: 'Laging late', icon: AlarmClock },
      { v: 'Improper Uniform & Dress Code', en: 'Uniform or dress code', tl: 'Uniporme o gupit', icon: Shirt },
      { v: 'Improper Use of School ID', en: 'School ID', tl: 'School ID', icon: BadgeCheck },
      { v: 'Classroom Disruption', en: 'Noise in class', tl: 'Ingay sa klase', icon: Volume2 },
      { v: 'Littering on Campus', en: 'Littering', tl: 'Pagkakalat', icon: Trash2 },
      { v: 'Unauthorized Device Use', en: 'Phone use in class', tl: 'Cellphone sa klase', icon: PhoneOff },
      { v: 'Other Disciplinary Infraction', en: 'Something else', tl: 'Iba pa', icon: MoreHorizontal },
    ],
  },
] as const;
const fieldCls = 'w-full h-14 px-4 rounded-2xl cosmic-input text-[16px] font-medium focus:outline-none';
const primaryBtn = 'btn-press h-14 px-7 rounded-full sd-primary text-white text-[16px] font-semibold inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25';
const backBtn = 'btn-press h-14 px-6 rounded-full lg-chip lg-ink text-[16px] font-semibold inline-flex items-center gap-1.5';

/** Split the stored narrative into readable parts (the form saves labelled [TAGS]). */
const readNarrative = (raw: string) => {
  const s = String(raw || '');
  // photos are saved as "[EVIDENCE_PHOTO_n]: data:image/..." — pull them out so they never show as text
  const photos = [...s.matchAll(/\[EVIDENCE_PHOTO_\d+\]:\s*(\S+)/g)].map((m) => m[1]).filter((p) => /^(data:image\/|https?:)/.test(p));
  const body = s.replace(/\[EVIDENCE_PHOTO_\d+\]:\s*\S+/g, ' ');
  let forFriend = '';
  let about = '';
  for (const m of body.matchAll(/\[([^\]:]+):\s*([^\]]*)\]/g)) {
    const k = m[1].toUpperCase();
    if (k.includes('FRIEND')) forFriend = m[2].trim().replace(/\s*\(N\/A\)$/, '');
    else if (k.includes('RESPONDENT') || k.includes('INIREREKLAMO')) about = m[2].trim();
  }
  const [namePart, looksPart = ''] = about.split(/\s*-\s*Palatandaan:\s*/);
  const unknown = /hindi (kilala|tiyak)/i.test(namePart);
  const aboutName = unknown ? '' : namePart.trim();
  const aboutLooks = looksPart && looksPart !== 'N/A' ? looksPart.trim() : '';
  const story = body.replace(/\[[^\]]*\]:?/g, ' ').replace(/\s+/g, ' ').trim();
  return { forFriend, about, aboutName, aboutLooks, story, photos };
};

/** Philippine time now (Asia/Manila), ticking every second. Only the clock re-renders. */
const usePhNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
};
const phParts = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(d).map((x) => [x.type, x.value]));
  return { h: Number(p.hour) % 24, m: Number(p.minute), s: Number(p.second) };
};

/** Real analog clock face (Apple Clock widget style). */
const AnalogClock: React.FC<{ now: Date }> = ({ now }) => {
  const { h, m, s } = phParts(now);
  const sec = s * 6;
  const min = m * 6 + s * 0.1;
  const hr = (h % 12) * 30 + m * 0.5;
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_10px_24px_rgba(8,20,60,0.35)]" role="img" aria-label="Analog clock">
      <defs>
        <radialGradient id="aicsFace" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EEF3FF" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#aicsFace)" stroke="rgba(255,255,255,0.9)" strokeWidth="3" />
      {Array.from({ length: 60 }, (_, i) => {
        const big = i % 5 === 0;
        const a = (i * 6 * Math.PI) / 180;
        const r1 = big ? 78 : 84;
        return <line key={i} x1={100 + r1 * Math.sin(a)} y1={100 - r1 * Math.cos(a)} x2={100 + 90 * Math.sin(a)} y2={100 - 90 * Math.cos(a)} stroke={big ? '#1D1D1F' : '#A1A1AA'} strokeWidth={big ? 3 : 1.2} strokeLinecap="round" />;
      })}
      {[12, 3, 6, 9].map((n) => {
        const a = ((n % 12) * 30 * Math.PI) / 180;
        return <text key={n} x={100 + 62 * Math.sin(a)} y={100 - 62 * Math.cos(a) + 6} textAnchor="middle" fontSize="17" fontWeight="600" fill="#1D1D1F">{n}</text>;
      })}
      <line x1="100" y1="100" x2="100" y2="54" stroke="#1D1D1F" strokeWidth="6" strokeLinecap="round" transform={`rotate(${hr} 100 100)`} />
      <line x1="100" y1="100" x2="100" y2="30" stroke="#1D1D1F" strokeWidth="4" strokeLinecap="round" transform={`rotate(${min} 100 100)`} />
      <g transform={`rotate(${sec} 100 100)`}>
        <line x1="100" y1="118" x2="100" y2="22" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" />
        <circle cx="100" cy="100" r="5" fill="#FF3B30" />
      </g>
      <circle cx="100" cy="100" r="2" fill="#FFFFFF" />
    </svg>
  );
};

/** Hero widget: analog clock + big date + digital PH time. */
const HeroClock: React.FC<{ isTl: boolean }> = ({ isTl }) => {
  const now = usePhNow();
  const loc = isTl ? 'fil-PH' : 'en-US';
  const tz = 'Asia/Manila';
  const month = new Intl.DateTimeFormat(loc, { timeZone: tz, month: 'long' }).format(now).toUpperCase();
  const weekday = new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: 'long' }).format(now).toUpperCase();
  const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, day: 'numeric' }).format(now);
  const [hms, ampm] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(now).split(' ');
  const wd = new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: 'short' }).format(now);
  const mon = month.charAt(0) + month.slice(1).toLowerCase();
  return (
    <div className="flex-1 min-h-0 grid grid-cols-2 lg:grid-rows-[minmax(0,1fr)_auto] gap-3">
      {/* clock tile */}
      <div className="hidden lg:flex rounded-[30px] bg-white/95 shadow-[0_12px_30px_-14px_rgba(8,20,60,0.6)] items-center justify-center p-3 min-h-[150px]">
        <div className="w-full max-w-[260px] aspect-square"><AnalogClock now={now} /></div>
      </div>
      {/* date tile */}
      <div className="col-span-2 lg:col-span-1 rounded-[22px] lg:rounded-[30px] lg:wg-glass px-1 lg:p-5 xl:p-6 flex flex-row items-baseline gap-2 lg:flex-col lg:items-start lg:justify-between lg:min-h-[150px] text-white">
        <p className="text-[20px] lg:text-[44px] xl:text-[64px] leading-none font-semibold lg:font-bold tracking-tight">{wd}<span className="lg:hidden">,</span></p>
        <p className="order-3 lg:order-none text-[20px] lg:text-[96px] xl:text-[140px] leading-none lg:leading-[0.85] font-semibold lg:font-bold tracking-tight tabular-nums">{day}</p>
        <p className="order-2 lg:order-none text-[20px] lg:text-[30px] xl:text-[40px] leading-none font-semibold text-white/90">{mon}</p>
      </div>
      {/* digital time tile */}
      <div className="col-span-2 rounded-[22px] lg:rounded-[30px] wg-glass px-5 sm:px-7 py-3 lg:py-4 flex items-end justify-between gap-3">
        <p className="text-[40px] lg:text-[64px] xl:text-[88px] leading-none font-semibold tracking-tight text-white tabular-nums">
          {hms}<span className="ml-2 text-[18px] xl:text-[26px] font-semibold">{ampm}</span>
        </p>
        <p className="pb-1 text-[12px] xl:text-[14px] font-semibold text-white/80 text-right leading-tight">{isTl ? 'Oras sa' : 'Philippine'}<br />{isTl ? 'Pilipinas' : 'time'}</p>
      </div>
    </div>
  );
};

/** phone Home: "Fri, Nov 20 · 8:43 PM" (only this tiny line updates every second) */
const PhoneDateLine: React.FC<{ isTl: boolean }> = ({ isTl }) => {
  const now = usePhNow();
  const loc = isTl ? 'fil-PH' : 'en-US';
  const d = new Intl.DateTimeFormat(loc, { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' }).format(now);
  const tm = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).format(now);
  return <p className="text-[14px] lg-ink-soft tabular-nums">{d} · {tm}</p>;
};

/** Mobile Home: Aurora Date & Live Philippine Time Widget */
const MobileAuroraDateTimeWidget: React.FC<{ isTl: boolean }> = ({ isTl }) => {
  const now = usePhNow();
  const tz = 'Asia/Manila';
  const loc = isTl ? 'fil-PH' : 'en-US';
  
  // Date components
  const monthStr = new Intl.DateTimeFormat(loc, { timeZone: tz, month: 'short' }).format(now).toUpperCase();
  const dayStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, day: 'numeric' }).format(now);
  const yearStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(now);
  const weekdayStr = new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: 'long' }).format(now);

  // Time components
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(now);

  const hour = parts.find((p) => p.type === 'hour')?.value || '12';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';
  const second = parts.find((p) => p.type === 'second')?.value || '00';
  const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value || 'AM';

  return (
    <div className="relative rounded-[22px] p-3.5 sm:p-4 overflow-hidden border border-cyan-400/30 dark:border-cyan-400/20 shadow-lg shadow-blue-950/20 text-white"
      style={{
        background: 'linear-gradient(135deg, rgba(8, 28, 68, 0.95) 0%, rgba(14, 45, 98, 0.92) 50%, rgba(18, 20, 64, 0.95) 100%)',
      }}
    >
      {/* Aurora Ambient Ribbons */}
      <div
        className="absolute -top-6 -left-6 w-36 h-24 rounded-full blur-[24px] pointer-events-none opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.7) 0%, rgba(16, 185, 129, 0.4) 60%, transparent 80%)' }}
      />
      <div
        className="absolute -bottom-6 -right-6 w-36 h-24 rounded-full blur-[26px] pointer-events-none opacity-50"
        style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, rgba(56, 189, 248, 0.4) 60%, transparent 80%)' }}
      />

      <div className="relative z-10 flex items-center justify-between gap-3">
        {/* Left Side: Date */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex flex-col items-center justify-center shrink-0 shadow-inner">
            <span className="text-[9px] font-black uppercase text-cyan-300 leading-tight">{monthStr}</span>
            <span className="text-[16px] font-black tabular-nums text-white leading-none">{dayStr}</span>
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider truncate">{weekdayStr}</p>
            <p className="text-[13px] font-black tracking-tight text-white tabular-nums truncate">
              {monthStr} {dayStr}, {yearStr}
            </p>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-9 w-[1px] bg-white/15 shrink-0" />

        {/* Right Side: Hour:Min:Sec PH Time */}
        <div className="text-right shrink-0 leading-none">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-[20px] font-black tracking-tight font-mono tabular-nums text-white drop-shadow-sm">
              {hour}:{minute}:{second}
            </span>
            <span className="text-[11px] font-black text-cyan-300 uppercase">{dayPeriod}</span>
          </div>
          <p className="text-[9.5px] font-bold text-sky-200/70 tracking-widest uppercase mt-1">
            {isTl ? 'PH TIME (PHT)' : 'PH TIME (PHT)'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onSignOut }) => {
  const { locale, setLocale } = useLanguage();
  const { theme, toggleThemeWithAura } = useTheme();
  const [soundOn, setSoundOn] = useState<boolean>(() => soundFX.isEnabled());
  const isTl = locale === 'tl';

  const [activeTab, setActiveTab] = useState<'home' | 'submit' | 'history' | 'chat' | 'me'>('home');

  // Multi-step Google Form-style pagination for report submission (1 -> 2 -> 3)
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  // Notifications toggle state
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => notificationService.isEnabled());

  // Right-side Drawer / Menu Bar state
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // office hours come from the office's Settings (never a hard-coded schedule)
  useAppConfig();
  useEffect(() => {
    void loadAppConfig();
  }, []);
  const hoursText = officeHoursText(isTl);
  // the app zooms the page (Font Size setting); measure the real screen height in CSS pixels so the
  // home cards end exactly where the right rail ends
  useEffect(() => {
    const set = () => {
      const z = parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;
      document.documentElement.style.setProperty("--sd-vh", window.innerHeight / z + "px");
    };
    set();
    window.addEventListener("resize", set);
    const mo = new MutationObserver(set);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    return () => {
      window.removeEventListener("resize", set);
      mo.disconnect();
    };
  }, []);

  // Submit Concern Form State
  const [reportType, setReportType] = useState<string>('Vaping / Smoking Infraction');
  // Reporting Role: 'self' (Mag-report sa sarili) vs 'peer' (I-report ang nangyari sa kaibigan/kaklase)
  const [reportingRole, setReportingRole] = useState<'self' | 'peer'>('self');
  const [friendName, setFriendName] = useState<string>('');
  const [friendGradeSection, setFriendGradeSection] = useState<string>('');
  const [knowsSuspect, setKnowsSuspect] = useState<'yes' | 'no' | 'unsure'>('no');
  const [suspectName, setSuspectName] = useState<string>('');
  const [suspectDetails, setSuspectDetails] = useState<string>('');
  const [whatHappened, setWhatHappened] = useState<string>('');
  const [happenedWhen, setHappenedWhen] = useState<string>('');
  const [happenedWhere, setHappenedWhere] = useState<string>('');
  const [witnesses, setWitnesses] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [truthfulAck, setTruthfulAck] = useState<boolean>(false);
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ---- phones / APK: the report is saved ON THIS PHONE while typing (never sent), and checked before sending
  const isPhoneUI = typeof window !== 'undefined' && (!window.matchMedia('(min-width: 1024px)').matches || isCapacitorNativeApp());
  const confirmChange = useConfirmChange();
  const DRAFT_KEY = `aics_report_draft_v1_${user.studentNumber}`;
  const [draftRestored, setDraftRestored] = useState(false);
  const draftLoaded = useRef(false);
  useEffect(() => {
    if (!isPhoneUI || draftLoaded.current) return;
    draftLoaded.current = true;
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!d || !String(d.whatHappened || d.suspectName || d.friendName || '').trim()) return;
      setReportType(d.reportType ?? reportType); setReportingRole(d.reportingRole ?? 'self');
      setFriendName(d.friendName ?? ''); setFriendGradeSection(d.friendGradeSection ?? '');
      setKnowsSuspect(d.knowsSuspect ?? 'no'); setSuspectName(d.suspectName ?? ''); setSuspectDetails(d.suspectDetails ?? '');
      setWhatHappened(d.whatHappened ?? ''); setHappenedWhen(d.happenedWhen ?? ''); setHappenedWhere(d.happenedWhere ?? '');
      setWitnesses(d.witnesses ?? ''); setIsUrgent(!!d.isUrgent);
      setDraftRestored(true);
    } catch { /* no draft */ }
  }, []);
  useEffect(() => {
    if (!isPhoneUI || !draftLoaded.current) return;
    const id = window.setTimeout(() => {
      const has = (whatHappened + suspectName + suspectDetails + friendName + happenedWhere + witnesses).trim();
      try {
        if (has) localStorage.setItem(DRAFT_KEY, JSON.stringify({ reportType, reportingRole, friendName, friendGradeSection, knowsSuspect, suspectName, suspectDetails, whatHappened, happenedWhen, happenedWhere, witnesses, isUrgent }));
        else localStorage.removeItem(DRAFT_KEY);
      } catch { /* storage full or private mode */ }
    }, 600);
    return () => window.clearTimeout(id);
  }, [reportType, reportingRole, friendName, friendGradeSection, knowsSuspect, suspectName, suspectDetails, whatHappened, happenedWhen, happenedWhere, witnesses, isUrgent]);
  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setFriendName(''); setFriendGradeSection(''); setKnowsSuspect('no'); setSuspectName(''); setSuspectDetails('');
    setWhatHappened(''); setHappenedWhen(''); setHappenedWhere(''); setWitnesses(''); setIsUrgent(false); setReportingRole('self');
    setDraftRestored(false);
  };
  const [submittedConcernCode, setSubmittedConcernCode] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<StudentConcernHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Direct Student-Guidance Chat State
  const [selectedChatConcern, setSelectedChatConcern] = useState<StudentConcernHistory | null>(null);
  const [chatMessages, setChatMessages] = useState<ConcernMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [chatInputText, setChatInputText] = useState<string>('');
  const [chatState, setChatState] = useState<ChatState | null>(null);
  const lastTypingPing = useRef(0);
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-Logout Inactivity Timer: 15 minutes (900 seconds)
  // Protects students so no evidence of reporting is left open on shared phones or school computers
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [showIdleWarning, setShowIdleWarning] = useState<boolean>(false);

  // Quick Panic / Discretion Shield Mode
  // If someone approaches or student presses ESC / Panic button, immediately covers the screen with study notes
  const [panicMode, setPanicMode] = useState<boolean>(false);

  // PWA / APK Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [canInstallApp, setCanInstallApp] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstallApp(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    soundFX.playStepUnlock();
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstallApp(false);
      }
      setInstallPrompt(null);
    } else {
      // Guide user if on iOS Safari or already installed
      alert(
        isTl
          ? 'Para i-install: Pindutin ang Share button sa Safari at piliin ang "Add to Home Screen", o pumunta sa Chrome menu at i-click ang "Install App".'
          : 'To install: Tap the Share button in Safari and choose "Add to Home Screen", or open Chrome settings and tap "Install App".'
      );
    }
  };

  // Listen to deep-link custom event from Lock Screen Notification Click
  useEffect(() => {
    const handleNavEvent = (e: any) => {
      const tab = e.detail?.tab;
      if (tab === 'chat') {
        setActiveTab('chat');
        soundFX.playToggleSwitch(true);
      }
    };
    window.addEventListener('aics:navigate-tab', handleNavEvent);
    if (window.location.hash === '#chat' || window.location.search.includes('tab=chat')) {
      setActiveTab('chat');
    }
    return () => window.removeEventListener('aics:navigate-tab', handleNavEvent);
  }, []);

  // Guided Onboarding Tour for Mobile Phone Users
  const [showMobileTour, setShowMobileTour] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hasSeen = localStorage.getItem('aics_mobile_tour_completed');
    const isMobileDevice = window.innerWidth < 768 || 'ontouchstart' in window;
    return !hasSeen && isMobileDevice;
  });

  // Reset timer on any active user interaction
  const resetInactivityTimer = () => {
    setSecondsRemaining(15 * 60);
    if (showIdleWarning) setShowIdleWarning(false);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Emergency Quick Shield on ESC key
      if (e.key === 'Escape') {
        setPanicMode(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      resetInactivityTimer();
    };

    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          soundFX.playBackspace();
          onSignOut();
          return 0;
        }
        // Show silent discrete banner when only 60 seconds left
        if (prev <= 60 && !showIdleWarning) {
          setShowIdleWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, [showIdleWarning, onSignOut]);

  // Auto-scroll to bottom of chat
  // scroll only the message list (never the whole page), like Instagram: newest message at the bottom
  const scrollToBottom = () => {
    const list = chatScrollRef.current?.parentElement;
    if (list) list.scrollTop = list.scrollHeight;
  };
  useEffect(() => {
    if (activeTab !== 'chat') return;
    const id = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, chatMessages.length]);

  // Track previous statuses to trigger native phone notifications on change
  const prevStatusesRef = useRef<Record<number, string>>({});

  const fetchMyHistory = async (notifyOnChange: boolean = false) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/student_concerns?student_number=eq.${encodeURIComponent(
          user.studentNumber
        )}&select=*&order=id.desc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (res.ok) {
        const rows = await res.json();
        const mapped: StudentConcernHistory[] = rows.map((r: Record<string, unknown>) => ({
          id: Number(r.id),
          referralCode: String(r.referral_code || 'CON-REF'),
          category: String(r.category || r.concern_type || 'General Concern'),
          whatHappened: String(r.what_happened || r.summary_en || ''),
          status: String(r.status || 'Pending'),
          urgency: String(r.urgency || 'Normal'),
          chatStatus: (String(r.chat_status || 'None') as 'None' | 'Open' | 'Closed'),
          chatClosedAt: String(r.chat_closed_at || ''),
          createdAt: String(r.created_at || new Date().toISOString()),
          reviewedAt: String(r.reviewed_at || ''),
        }));

        // Check if any report status changed and notify student's phone
        if (notifyOnChange) {
          mapped.forEach((item) => {
            const prev = prevStatusesRef.current[item.id];
            if (prev && prev !== item.status) {
              const s = item.status.toLowerCase();
              if (s === 'approved' || s === 'resolved') {
                void notificationService.sendDiscreetNotification(
                  'AICS',
                  `Approved: Your report (${item.referralCode}) has been approved by Guidance.`
                );
              } else if (s === 'rejected' || s === 'dismissed' || s === 'declined') {
                void notificationService.sendDiscreetNotification(
                  'AICS',
                  `Reject: Your report (${item.referralCode}) was reviewed and closed.`
                );
              } else if (s === 'in counseling' || s === 'investigating' || s === 'under review') {
                void notificationService.sendDiscreetNotification(
                  'AICS',
                  `Action Taken: Guidance is now actively addressing your concern (${item.referralCode}).`
                );
              }
            }
          });
        }

        // Store latest statuses in ref
        const newStatuses: Record<number, string> = {};
        mapped.forEach((m) => {
          newStatuses[m.id] = m.status;
        });
        prevStatusesRef.current = newStatuses;

        // Only update state if data actually changed to prevent mobile screen flicker / glitching!
        setHistory((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(mapped)) {
            return prev; // Zero DOM re-render = Zero screen jump/glitch!
          }
          return mapped;
        });

        // If no chat is selected yet, automatically select the most recent concern with an Open or Closed chat
        if (!selectedChatConcern && mapped.length > 0) {
          const firstWithChat = mapped.find((c) => c.chatStatus === 'Open') || mapped[0];
          setSelectedChatConcern(firstWithChat);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void fetchMyHistory(false);

    // Periodically poll for status changes (e.g. Approved, Reject) every 10 seconds
    const statusInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchMyHistory(true);
      }
    }, 10000);

    return () => clearInterval(statusInterval);
  }, []);

  // Poll for new messages when in Chat tab with a selected concern
  useEffect(() => {
    if (!selectedChatConcern) return;
    let isMounted = true;
    let lastMsgId = 0;

    const loadInitialMessages = async () => {
      setLoadingMessages(true);
      const msgs = await fetchMessages(selectedChatConcern.id);
      if (!isMounted) return;
      if (msgs) {
        setChatMessages(msgs);
        if (msgs.length > 0) lastMsgId = msgs[msgs.length - 1].id;
        setTimeout(scrollToBottom, 100);
      }
      setLoadingMessages(false);
    };

    void loadInitialMessages();

    // every 2 s: new messages, "typing...", and what Guidance has seen
    const interval = setInterval(async () => {
      if (document.visibilityState !== 'visible' || !isMounted) return;
      void fetchChatState(selectedChatConcern.id).then((st) => { if (isMounted) setChatState(st); });
      {
        const newer = await fetchMessagesAfter(selectedChatConcern.id, lastMsgId);
        if (isMounted && newer && newer.length > 0) {
          lastMsgId = newer[newer.length - 1].id;
          if (newer.some((m) => m.sender !== 'student')) soundFX.playStepUnlock();

          setChatMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = newer.filter((m) => !existingIds.has(m.id));
            return [...prev, ...fresh];
          });
          setTimeout(scrollToBottom, 100);
        }
      }
    }, 2000);

    return () => {
      setChatState(null);
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedChatConcern?.id]);

  // last Guidance message the student has actually looked at, per report (kept on this device)
  const [readUpTo, setReadUpTo] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('aics_student_chat_read_v1') || '{}'); } catch { return {}; }
  });
  const [unreadChats, setUnreadChats] = useState<Record<string, number>>({});
  const [chatPopup, setChatPopup] = useState<{ concern: StudentConcernHistory; body: string } | null>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedChatConcern?.id ?? null;
  const markChatRead = (id: number, msgId: number) => {
    setReadUpTo((r) => {
      if ((r[String(id)] ?? 0) >= msgId) return r;
      const next = { ...r, [String(id)]: msgId };
      try { localStorage.setItem('aics_student_chat_read_v1', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
    setUnreadChats((u) => { if (!u[String(id)]) return u; const n = { ...u }; delete n[String(id)]; return n; });
  };
  // the chat on screen counts as read
  useEffect(() => {
    if (activeTab !== 'chat' || !selectedChatConcern) return;
    const lastOffice = [...chatMessages].reverse().find((m) => m.sender !== 'student');
    if (lastOffice) {
      markChatRead(selectedChatConcern.id, lastOffice.id);
      if (document.visibilityState === 'visible') void markChatSeen(selectedChatConcern.id, 'student');
    }
    setChatPopup((p) => (p && p.concern.id === selectedChatConcern.id ? null : p));
  }, [activeTab, selectedChatConcern?.id, chatMessages]);
  // every 6 s: any new Guidance message in any open chat?
  const openChatKey = history.filter((h) => h.chatStatus === 'Open').map((h) => h.id).join(',');
  useEffect(() => {
    const open = history.filter((h) => h.chatStatus === 'Open');
    if (!open.length) return;
    let alive = true;
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      for (const c of open) {
        const msgs = await fetchMessagesAfter(c.id, readUpTo[String(c.id)] ?? 0);
        if (!alive || !msgs) continue;
        const office = msgs.filter((m) => m.sender !== 'student');
        if (!office.length) continue;
        if (activeTabRef.current === 'chat' && selectedIdRef.current === c.id) continue;
        const last = office[office.length - 1];
        setUnreadChats((u) => {
          if ((u[String(c.id)] ?? 0) >= last.id) return u;
          soundFX.playStepUnlock();
          setChatPopup({ concern: c, body: last.body });
          void notificationService.sendDiscreetNotification('AICS', 'You have a new message from the Guidance Office.');
          return { ...u, [String(c.id)]: last.id };
        });
      }
    };
    void check();
    const iv = window.setInterval(() => void check(), 6000);
    return () => { alive = false; window.clearInterval(iv); };
  }, [openChatKey, readUpTo]);
  const unreadCount = Object.keys(unreadChats).length;

  const [sendFailed, setSendFailed] = useState(false);
  // phone Reports: list first, then one report full screen; "What you wrote" stays hidden until tapped
  const [mRepId, setMRepId] = useState<number | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  // Change password (phones / APK)
  const [showPw, setShowPw] = useState(false);
  const [pwCur, setPwCur] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwNew2, setPwNew2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const pwRules = [
    [pwNew.length >= 6, isTl ? '6+ karakter' : '6+ characters'],
    [/\d/.test(pwNew), isTl ? 'May numero' : 'A number'],
    [/[A-Z]/.test(pwNew), isTl ? 'May malaking letra' : 'An uppercase letter'],
    [/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwNew), isTl ? 'May simbolo' : 'A symbol'],
    [!!pwNew && pwNew === pwNew2, isTl ? 'Magkapareho ang dalawa' : 'Both new passwords match'],
  ] as const;
  const pwReady = !!pwCur && pwRules.every(([ok]) => ok) && pwNew !== pwCur;
  const closePw = () => { setShowPw(false); setPwCur(''); setPwNew(''); setPwNew2(''); setPwMsg(null); };
  const savePw = async () => {
    if (!pwReady || pwBusy) return;
    setPwBusy(true);
    setPwMsg(null);
    const res = await changeStudentPassword(user.studentNumber, pwCur, pwNew);
    setPwBusy(false);
    if (res.ok) {
      setPwCur(''); setPwNew(''); setPwNew2('');
      setPwMsg({ ok: true, text: isTl ? 'Napalitan na ang password mo. Gamitin ito sa susunod na login.' : 'Your password is changed. Use it the next time you sign in.' });
      return;
    }
    setPwMsg({
      ok: false,
      text:
        res.code === 'offline' ? (isTl ? 'Hindi maka-connect. Tingnan ang internet, tapos subukan ulit.' : 'Could not connect. Check your internet, then try again.')
        : res.code === 'deactivated' ? (isTl ? 'Naka-off ang account mo. Pumunta sa Guidance Office.' : 'Your account is turned off. Please visit the Guidance Office.')
        : isTl ? 'Mali ang kasalukuyang password. Subukan ulit.' : 'The current password is wrong. Try again.',
    });
  };
  const hasPin = !!user.quickPin;
  const lockNow = () => {
    try { localStorage.setItem('student_pin_locked', 'true'); } catch { /* private mode */ }
    window.location.reload();
  };
  // auto-lock: away from the app for more than 1 minute -> ask for the PIN again
  useEffect(() => {
    // phones + the APK only (the website does not lock when you switch browser tabs)
    if (!hasPin || (window.matchMedia('(min-width: 1024px)').matches && !isCapacitorNativeApp())) return;
    let leftAt = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') leftAt = Date.now();
      else if (leftAt && Date.now() - leftAt > 60_000) lockNow();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [hasPin]);
  const [showWrote, setShowWrote] = useState(false);
  // phone: Messenger-style (list first, then one conversation full screen). The website shows both side by side.
  const [mChatOpen, setMChatOpen] = useState(false);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedChatConcern || !chatInputText.trim() || sendingMsg) return;

    const textToSend = chatInputText.trim();
    setSendingMsg(true);
    setSendFailed(false);
    soundFX.playToggleSwitch(true);

    const saved = await sendMessage(selectedChatConcern.id, 'student', textToSend);
    setSendingMsg(false);

    if (saved) {
      setChatInputText('');
      setChatMessages((prev) => [...prev, saved]);
      setTimeout(scrollToBottom, 100);
    } else {
      // keep the text so the student can simply tap Send again
      setSendFailed(true);
      soundFX.playError();
    }
  };

  const openConcernChat = (item: StudentConcernHistory) => {
    setSelectedChatConcern(item);
    setMChatOpen(true);
    setActiveTab('chat');
    soundFX.playToggleSwitch(true);
  };

    const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const maxPhotos = 10;
    const remainingSlots = maxPhotos - evidencePhotos.length;
    if (remainingSlots <= 0) {
      setPhotoError(isTl ? 'Hanggang 10 litrato ang maaaring i-attach bawat report.' : 'Maximum 10 photos allowed per report.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setPhotoError(isTl ? 'Litrato lamang (PNG, JPG, JPEG) ang maaaring i-attach.' : 'Only image files allowed.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setPhotoError(isTl ? 'Masyadong malaki ang litrato (Maximum 8MB).' : 'Image size exceeds 8MB limit.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.65);
            setEvidencePhotos((prev) => [...prev, compressed].slice(0, 10));
            soundFX.playToggleSwitch(true);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    // Reset input value so taking consecutive photos or selecting the same photo works seamlessly
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeEvidencePhoto = (idx: number) => {
    soundFX.playBackspace();
    setEvidencePhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!truthfulAck) {
      soundFX.playError();
      setSubmitError(
        isTl
          ? 'Pakisuyong kumpirmahin ang Data Privacy at Truthfulness statement.'
          : 'Please acknowledge that the submitted concern is truthful and confidential.'
      );
      return;
    }

    if (!whatHappened.trim()) {
      soundFX.playError();
      setSubmitError(isTl ? 'Ilagay ang detalye ng pangyayari.' : 'Please describe what happened.');
      return;
    }

    // Security Filter: Moderation & XSS Sanitization Check
    const moderation = moderateReportContent(whatHappened);
    if (!moderation.isClean) {
      soundFX.playError();
      setSubmitError(
        isTl
          ? `Bawal ang hindi kanais-nais na pananalita o trolling sa opisyal na ulat. Natagpuan ang: "${moderation.flaggedWord}".`
          : `Inappropriate language or trolling is strictly prohibited in official reports. Detected: "${moderation.flaggedWord}".`
      );
      return;
    }

    if (isPhoneUI) {
      const short = (s: string, n = 140) => (s.length > n ? s.slice(0, n).trimEnd() + '…' : s);
      const ok = await confirmChange({
        title: isTl ? 'Ipadala ang report?' : 'Send this report?',
        description: isTl ? 'Tingnan muna kung tama. Pindutin ang Bumalik para mag-edit.' : 'Check that it is right. Tap Go back to edit.',
        rows: [
          { label: isTl ? 'Uri' : 'Type', after: reportType },
          { label: isTl ? 'Para kay' : 'For', after: reportingRole === 'peer' ? friendName || (isTl ? 'Kaibigan / kaklase' : 'A friend / classmate') : isTl ? 'Sarili ko' : 'Myself' },
          { label: isTl ? 'Tungkol kay' : 'About', after: knowsSuspect === 'yes' && suspectName ? suspectName : isTl ? 'Hindi kilala' : 'Not known' },
          ...(happenedWhen ? [{ label: isTl ? 'Kailan' : 'When', after: happenedWhen }] : []),
          ...(happenedWhere ? [{ label: isTl ? 'Saan' : 'Where', after: happenedWhere }] : []),
          { label: isTl ? 'Nangyari' : 'What happened', after: short(whatHappened.trim()) },
          ...(evidencePhotos.length ? [{ label: isTl ? 'Litrato' : 'Photos', after: String(evidencePhotos.length) }] : []),
          ...(isUrgent ? [{ label: isTl ? 'Agarang tulong' : 'Urgent', after: isTl ? 'Oo' : 'Yes' }] : []),
        ],
        confirmLabel: isTl ? 'Ipadala' : 'Send',
      });
      if (!ok) return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const refCode = `CON-${Date.now().toString(36).toUpperCase()}`;

    const isPeer = reportingRole === 'peer';
    const finalNarrative = [
      isPeer ? `[REPORT FOR FRIEND/CLASSMATE: ${friendName} (${friendGradeSection || 'N/A'})]` : '[SELF-REPORT BY STUDENT]',
      knowsSuspect === 'yes' ? `[RESPONDENT / INIREREKLAMO: ${suspectName}${suspectDetails ? ` - Palatandaan: ${suspectDetails}` : ''}]` : (knowsSuspect === 'unsure' ? `[RESPONDENT / INIREREKLAMO: Hindi tiyak ang pangalan - Palatandaan: ${suspectDetails || 'N/A'}]` : `[RESPONDENT / INIREREKLAMO: Hindi kilala ang pangalan - Palatandaan: ${suspectDetails || 'N/A'}]`),
      `[SALAYSAY / WHAT HAPPENED]:\n${moderation.sanitizedText}`,
      ...(evidencePhotos.length > 0 ? evidencePhotos.map((p, idx) => `[EVIDENCE_PHOTO_${idx + 1}]: ${p}`) : [])
    ].join('\n\n');

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/student_concerns`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          referral_code: refCode,
          student_name: isPeer && friendName.trim() ? friendName.trim() : user.fullName,
          grade_section: isPeer && friendGradeSection.trim() ? friendGradeSection.trim() : user.gradeSection || 'SHS Student',
          student_number: user.studentNumber,
          account_id: user.id,
          submitted_by: isPeer ? `Report for Friend by ${user.fullName} (${user.studentNumber})` : `Self-Report: ${user.fullName}`,
          category: reportType,
          concern_type: reportType,
          urgency: isUrgent ? 'Urgent' : 'Normal',
          who_involved: knowsSuspect === 'yes' ? `${suspectName}${suspectDetails ? ` (${suspectDetails})` : ''}` : (knowsSuspect === 'unsure' ? `Hindi tiyak${suspectDetails ? ` (${suspectDetails})` : ''}` : `Hindi kilala${suspectDetails ? ` (${suspectDetails})` : ''}`),
          summary_en: whatHappened.slice(0, 160),
          summary_tl: whatHappened.slice(0, 160),
          what_happened: finalNarrative,
          happened_when: happenedWhen || 'Not specified',
          happened_where: happenedWhere || 'AICS Campus / Online',
          witnesses: witnesses || 'None',
          is_confidential: true,
          is_urgent: isUrgent,
          truthful: true,
          status: 'Pending',
          chat_status: 'None',
          is_practice: false,
        }),
      });

      setSubmitting(false);

      if (!res.ok) {
        soundFX.playError();
        setSubmitError('Failed to submit concern. Please try again.');
        return;
      }

      soundFX.playSuccessCheck();
      setSubmittedConcernCode(refCode);
      try { localStorage.removeItem(`aics_report_draft_v1_${user.studentNumber}`); } catch { /* ignore */ }
      setDraftRestored(false);
      recordSecurityAudit('REPORT_SUBMITTED', user.studentNumber);

      // Trigger instant submission confirmation notification on phone
      void notificationService.sendDiscreetNotification(
        'AICS',
        `Submitted: Your concern report (${refCode}) was received safely by Guidance.`
      );

      // Reset Form
      setFormStep(1);
      setWhatHappened('');
      setHappenedWhen('');
      setHappenedWhere('');
      setWitnesses('');
      setEvidencePhotos([]);
      setTruthfulAck(false);
      setReportingRole('self');
      setFriendName('');
      setFriendGradeSection('');
      setKnowsSuspect('no');
      setSuspectName('');
      setSuspectDetails('');
    } catch (err: unknown) {
      setSubmitting(false);
      soundFX.playError();
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.');
    }
  };

  // office open right now? (office days + hours from Settings)
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const openNow = isOfficeDay(todayISO()) && nowMin >= (SLOT_STARTS[0] ?? 480) && nowMin < (SLOT_STARTS[SLOT_STARTS.length - 1] ?? 900) + SLOT_MINUTES;
  const latest = history[0];
  const [repFilter, setRepFilter] = useState<'all' | 'amber' | 'green' | 'rose'>('all');
  const repTone = (st: string): 'green' | 'rose' | 'amber' => (/approv|resolv/i.test(st) ? 'green' : /reject|block|declin/i.test(st) ? 'rose' : 'amber');
  const stepNames = [
    [isTl ? 'Uri ng concern' : 'Kind of concern', isTl ? 'Ano ang nangyari' : 'Pick one'],
    [isTl ? 'Sino' : 'Who it is about', isTl ? 'Kahit walang pangalan' : 'Name not required'],
    [isTl ? 'Kuwento' : 'Your story', isTl ? 'Kailan, saan, litrato' : 'When, where, photos'],
  ] as const;
  const dayStart = SLOT_STARTS[0] ?? 480;
  const dayEnd = (SLOT_STARTS[SLOT_STARTS.length - 1] ?? 900) + SLOT_MINUTES;
  const dayPct = Math.min(100, Math.max(0, ((nowMin - dayStart) / (dayEnd - dayStart)) * 100));
  const fmtMin = (m: number) => { const h = Math.floor(m / 60); const mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const week = (() => {
    const base = new Date(); base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    return Array.from({ length: 5 }, (_, i) => { const d = new Date(base); d.setDate(base.getDate() + i); const iso = isoOf(d); return { iso, num: d.getDate(), today: iso === isoOf(new Date()), open: isOfficeDay(iso), label: d.toLocaleDateString(isTl ? 'fil-PH' : 'en-US', { weekday: 'short' }).slice(0, 3) }; });
  })();
  const officeNote = (() => {
    if (openNow) { const left = dayEnd - nowMin; return isTl ? `Sasara ng ${fmtMin(dayEnd)} (${Math.floor(left / 60)}h ${left % 60}m pa)` : `Closes at ${fmtMin(dayEnd)} (${Math.floor(left / 60)}h ${left % 60}m left)`; }
    for (let i = 0; i < 8; i++) { const d = new Date(); d.setDate(d.getDate() + i); if (i === 0 && nowMin >= dayStart) continue; if (isOfficeDay(isoOf(d))) { const w = i === 0 ? (isTl ? 'ngayon' : 'today') : i === 1 ? (isTl ? 'bukas' : 'tomorrow') : d.toLocaleDateString(isTl ? 'fil-PH' : 'en-US', { weekday: 'long' }); return isTl ? `Bubukas ${w}, ${fmtMin(dayStart)}` : `Opens ${w} at ${fmtMin(dayStart)}`; } }
    return hoursText;
  })();
  const openChats = history.filter((c) => c.chatStatus === 'Open').length;
  const firstName = (() => {
    const raw = (user.fullName || '').trim();
    const given = raw.includes(',') ? raw.split(',')[1].trim() : raw;
    const w = given.split(/\s+/)[0] || raw;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  })();
  const hour = new Date().getHours();
  const greet = isTl ? (hour < 12 ? 'Magandang umaga' : hour < 18 ? 'Magandang hapon' : 'Magandang gabi') : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const statusTone = (st: string) => (/approv/i.test(st) ? 'green' : /reject|block/i.test(st) ? 'rose' : 'amber');
  const statusWord = (st: string) => (/approv/i.test(st) ? (isTl ? 'Tinanggap' : 'Accepted') : /reject|block/i.test(st) ? (isTl ? 'Hindi tinanggap' : 'Not accepted') : isTl ? 'Sinusuri ng Guidance' : 'Being reviewed');
  const goTab = (k: 'home' | 'submit' | 'history' | 'chat' | 'me') => {
    soundFX.playToggleSwitch(true);
    setActiveTab(k);
    if (k === 'history') void fetchMyHistory();
  };
  // phone Home: the big greeting shrinks into the header once it scrolls away (iOS large title)
  const greetRef = useRef<HTMLDivElement | null>(null);
  const [titleInHeader, setTitleInHeader] = useState(false);
  useEffect(() => {
    const el = greetRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setTitleInHeader(false); return; }
    const io = new IntersectionObserver(([en]) => setTitleInHeader(!en.isIntersecting), { rootMargin: '-64px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [activeTab]);

  // Christmas decorations inside the portal: season switch + the student's own choice in Settings
  const [decorWanted, setDecorWanted] = useState(insideDecorWanted);
  useEffect(() => {
    const on = (e: Event) => setDecorWanted(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(DECOR_EVENT, on);
    return () => window.removeEventListener(DECOR_EVENT, on);
  }, []);
  const decor = christmasOn() && decorWanted;

  const settingsBody = (
    <>
            {/* who is signed in */}
            <div className="mx-4 mt-2 sd-list p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full sd-hero text-white flex items-center justify-center text-[16px] font-semibold shrink-0">
                {user.fullName.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-[#1D1D1F] dark:text-white truncate">{user.fullName}</p>
                <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6] truncate">{[user.gradeSection, user.studentNumber].filter(Boolean).join(' · ')}</p>
              </div>
            </div>

            {/* display */}
            <p className="sd-list-title">{isTl ? 'Itsura' : 'Display'}</p>
            <div className="mx-4 sd-list divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              <div className="sd-row">
                <span className="sd-row-label">{isTl ? 'Tema' : 'Appearance'}</span>
                <div className="seg-track p-0.5">
                  {([['light', isTl ? 'Light' : 'Light'], ['dark', isTl ? 'Dark' : 'Dark']] as const).map(([k, l]) => (
                    <button key={k} type="button" onClick={(e) => theme !== k && toggleThemeWithAura(e)} className={`h-7 px-3 text-[13px] ${theme === k ? 'seg-on' : 'seg-off'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="sd-row">
                <span className="sd-row-label">{isTl ? 'Wika' : 'Language'}</span>
                <div className="seg-track p-0.5">
                  {([['en', 'English'], ['tl', 'Taglish']] as const).map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setLocale(k)} className={`h-7 px-3 text-[13px] ${locale === k ? 'seg-on' : 'seg-off'}`}>{l}</button>
                  ))}
                </div>
              </div>
              {christmasOn() && (
                <label className="sd-row cursor-pointer">
                  <span className="sd-row-label">{isTl ? 'Pamaskong dekorasyon' : 'Christmas decorations'}</span>
                  <input type="checkbox" className="sd-switch" checked={decorWanted} onChange={(e) => { setInsideDecorWanted(e.target.checked); setDecorWanted(e.target.checked); }} aria-label={isTl ? 'Pamaskong dekorasyon' : 'Christmas decorations'} />
                </label>
              )}
              <label className="sd-row cursor-pointer">
                <span className="sd-row-label">{isTl ? 'Mga tunog' : 'Sounds'}</span>
                <input type="checkbox" className="sd-switch" checked={soundOn} onChange={(e) => { soundFX.setEnabled(e.target.checked); setSoundOn(e.target.checked); }} />
              </label>
              <label className="sd-row cursor-pointer">
                <span className="sd-row-label">{isTl ? 'Notification sa phone' : 'Notifications'}</span>
                <input
                  type="checkbox"
                  className="sd-switch"
                  checked={notificationsEnabled}
                  onChange={async (e) => {
                    if (e.target.checked) {
                      const granted = await notificationService.requestPermission();
                      setNotificationsEnabled(granted);
                      if (granted) void notificationService.sendDiscreetNotification('AICS Kalang Ba', isTl ? 'Bukas na ang notifications para sa iyong mga report.' : 'Notifications are on for your reports.');
                    } else {
                      notificationService.setEnabled(false);
                      setNotificationsEnabled(false);
                    }
                  }}
                />
              </label>
            </div>

            {/* app */}
            <p className="sd-list-title">{isTl ? 'App' : 'App'}</p>
            <div className="mx-4 sd-list divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              <button type="button" onClick={handleInstallClick} className={`sd-row w-full text-left ${isCapacitorNativeApp() ? '!hidden' : ''}`}>
                <span className="flex items-center gap-3"><span className="w-7 h-7 rounded-lg tile-grad tile-blue text-white flex items-center justify-center"><Download className="w-4 h-4" /></span><span className="sd-row-label">{isTl ? 'I-install ang app' : 'Install the app'}</span></span>
                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
              </button>
              <button type="button" onClick={() => { setIsMenuOpen(false); setShowMobileTour(true); }} className="sd-row w-full text-left">
                <span className="flex items-center gap-3"><span className="w-7 h-7 rounded-lg tile-grad tile-teal text-white flex items-center justify-center"><HelpCircle className="w-4 h-4" /></span><span className="sd-row-label">{isTl ? 'Gabay sa paggamit' : 'How to use'}</span></span>
                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
              </button>
              <button type="button" onClick={() => window.location.reload()} className="sd-row w-full text-left">
                <span className="flex items-center gap-3"><span className="w-7 h-7 rounded-lg tile-grad tile-slate text-white flex items-center justify-center"><RefreshCw className="w-4 h-4" /></span><span className="sd-row-label">{isTl ? 'I-refresh' : 'Refresh'}</span></span>
                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
              </button>
            </div>

            {/* privacy & lock (phones / APK) */}
            <p className="sd-list-title lg:hidden">{isTl ? 'Privacy' : 'Privacy'}</p>
            <div className="mx-4 sd-list divide-y divide-black/[0.06] dark:divide-white/[0.08] lg:hidden">
              <button type="button" onClick={() => setShowPrivacy(true)} className="sd-row w-full text-left">
                <span className="flex items-center gap-3"><span className="w-7 h-7 rounded-lg bg-[#5856D6] text-white flex items-center justify-center"><ShieldIcon className="w-4 h-4" /></span><span className="sd-row-label">{isTl ? 'Privacy at kaligtasan' : 'Privacy & safety'}</span></span>
                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
              </button>
              <button type="button" onClick={() => setShowPw(true)} className="sd-row w-full text-left">
                <span className="flex items-center gap-3"><span className="w-7 h-7 rounded-lg bg-[#FF9500] text-white flex items-center justify-center"><LockIcon className="w-4 h-4" /></span><span className="sd-row-label">{isTl ? 'Palitan ang password' : 'Change password'}</span></span>
                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
              </button>
              {hasPin && (
                <button type="button" onClick={lockNow} className="sd-row w-full text-left">
                  <span className="flex items-center gap-3"><span className="w-7 h-7 rounded-lg bg-[#8E8E93] text-white flex items-center justify-center"><LockIcon className="w-4 h-4" /></span><span className="sd-row-label">{isTl ? 'I-lock ang app ngayon' : 'Lock the app now'}</span></span>
                  <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                </button>
              )}
            </div>
            {hasPin && <p className="mx-6 mt-1.5 text-[12.5px] text-[#8E8E93] lg:hidden">{isTl ? 'Kapag umalis ka sa app nang higit 1 minuto, hihingin ulit ang PIN mo.' : 'If you leave the app for more than 1 minute, it asks for your PIN again.'}</p>}

            <div className="mx-4 mt-6 sd-list">
              {/* website: signs out at once (as before) */}
              <div className="hidden lg:block">
              <button
                type="button"
                onClick={() => {
                  soundFX.playBackspace();
                  setIsMenuOpen(false);
                  onSignOut();
                }}
                className="sd-row w-full !justify-center gap-2 text-[15px] font-medium text-[#FF3B30]"
              >
                <LogOut className="w-4 h-4" />
                {isTl ? 'Mag-sign out' : 'Sign out'}
              </button>
              </div>
              {/* phones: ask first, like iPhone */}
              {!confirmSignOut ? (
                <div className="lg:hidden"><button type="button" onClick={() => setConfirmSignOut(true)} className="sd-row w-full !justify-center gap-2 text-[15px] font-medium text-[#FF3B30]">
                  <LogOut className="w-4 h-4" />{isTl ? 'Mag-sign out' : 'Sign out'}
                </button></div>
              ) : (
                <div className="lg:hidden p-4 text-center">
                  <p className="text-[15px] font-semibold text-[#1D1D1F] dark:text-white">{isTl ? 'Mag-sign out?' : 'Sign out?'}</p>
                  <p className="mt-0.5 text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Kailangan mong mag-login ulit para makita ang mga report mo.' : 'You will need to sign in again to see your reports.'}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirmSignOut(false)} className="h-11 rounded-[12px] bg-black/[0.06] dark:bg-white/[0.1] text-[15px] font-semibold text-[#1D1D1F] dark:text-white">{isTl ? 'Huwag' : 'Cancel'}</button>
                    <button type="button" onClick={() => { setIsMenuOpen(false); onSignOut(); }} className="h-11 rounded-[12px] bg-[#FF3B30] text-white text-[15px] font-semibold">{isTl ? 'Mag-sign out' : 'Sign out'}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Change password sheet (phones) */}
            {showPw && createPortal(
              <div className="fixed inset-0 z-[99999] flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label={isTl ? 'Palitan ang password' : 'Change password'}>
                <div className="absolute inset-0 bg-black/40" onClick={closePw} />
                <form onSubmit={(e) => { e.preventDefault(); void savePw(); }} className="relative w-full rounded-t-[22px] bg-white dark:bg-[#1C1C1E] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] max-h-[90dvh] overflow-y-auto">
                  <span className="block mx-auto w-9 h-1.5 rounded-full bg-[#C7C7CC] dark:bg-[#48484A]" />
                  <div className="mt-3 flex items-center justify-between">
                    <button type="button" onClick={closePw} className="text-[16px] text-[#0A84FF]">{isTl ? 'Kanselahin' : 'Cancel'}</button>
                    <p className="text-[17px] font-semibold text-[#1D1D1F] dark:text-white">{isTl ? 'Password' : 'Password'}</p>
                    <button type="submit" disabled={!pwReady || pwBusy} className="text-[16px] font-semibold text-[#0A84FF] disabled:text-[#C7C7CC] dark:disabled:text-[#48484A]">{pwBusy ? (isTl ? 'Sandali…' : 'Saving…') : isTl ? 'I-save' : 'Save'}</button>
                  </div>
                  {pwMsg && (
                    <p role={pwMsg.ok ? 'status' : 'alert'} className={`mt-4 px-3 py-2.5 rounded-[12px] text-[14px] ${pwMsg.ok ? 'bg-[#34C759]/[0.12] text-[#248A3D] dark:text-[#30D158]' : 'bg-[#FF3B30]/[0.1] text-[#D70015] dark:text-[#FF6961]'}`}>{pwMsg.text}</p>
                  )}
                  <div className="mt-4 rounded-[14px] bg-[#F2F2F7] dark:bg-[#2C2C2E] divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                    {([
                      [pwCur, setPwCur, isTl ? 'Kasalukuyan' : 'Current', 'current-password'],
                      [pwNew, setPwNew, isTl ? 'Bago' : 'New', 'new-password'],
                      [pwNew2, setPwNew2, isTl ? 'Ulitin ang bago' : 'Repeat new', 'new-password'],
                    ] as const).map(([v, set, label, ac], i) => (
                      <label key={i} className="flex items-center gap-3 px-4 h-12">
                        <span className="w-[108px] shrink-0 text-[15px] text-[#1D1D1F] dark:text-white">{label}</span>
                        <input type="password" value={v} onChange={(e) => { (set as (s: string) => void)(e.target.value); setPwMsg(null); }} autoComplete={ac} className="flex-1 min-w-0 bg-transparent text-[15px] text-[#1D1D1F] dark:text-white outline-none" />
                      </label>
                    ))}
                  </div>
                  <ul className="mt-3 px-1 grid grid-cols-2 gap-x-3 gap-y-1">
                    {pwRules.map(([ok, label], i) => (
                      <li key={i} className={`text-[13px] flex items-center gap-1.5 ${ok ? 'text-[#248A3D] dark:text-[#30D158]' : 'text-[#8E8E93]'}`}>{ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border border-current" />}{label}</li>
                    ))}
                  </ul>
                  {pwNew && pwNew === pwCur && <p className="mt-2 px-1 text-[13px] text-[#D70015] dark:text-[#FF6961]">{isTl ? 'Dapat iba ang bagong password sa luma.' : 'The new password must be different from the current one.'}</p>}
                  <p className="mt-3 px-1 text-[12.5px] text-[#8E8E93]">{isTl ? 'Nakalimutan ang kasalukuyang password? Mag-sign out at gamitin ang "Forgot Password?".' : 'Forgot the current one? Sign out and use "Forgot Password?".'}</p>
                </form>
              </div>,
              document.body
            )}

            {/* Privacy & safety sheet (phones) */}
            {showPrivacy && createPortal(
              <div className="fixed inset-0 z-[99999] flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label={isTl ? 'Privacy at kaligtasan' : 'Privacy & safety'}>
                <div className="absolute inset-0 bg-black/40" onClick={() => setShowPrivacy(false)} />
                <div className="relative w-full rounded-t-[22px] bg-white dark:bg-[#1C1C1E] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto">
                  <span className="block mx-auto w-9 h-1.5 rounded-full bg-[#C7C7CC] dark:bg-[#48484A]" />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[20px] font-bold text-[#1D1D1F] dark:text-white">{isTl ? 'Privacy at kaligtasan' : 'Privacy & safety'}</p>
                    <button type="button" onClick={() => setShowPrivacy(false)} className="text-[16px] font-semibold text-[#0A84FF]">{isTl ? 'Tapos' : 'Done'}</button>
                  </div>
                  <div className="mt-4 space-y-4">
                    {[
                      [ShieldIcon, isTl ? 'Sino ang nakakabasa' : 'Who can read it', isTl ? 'Ang Guidance Office lang. Hindi sasabihin sa inireklamo kung sino ka.' : 'Only the Guidance Office. The reported student is never told who you are.'],
                      [LockIcon, isTl ? 'Nakatago sa unang screen' : 'Hidden on the first screen', isTl ? 'Walang detalye ng report o mensahe sa Home at sa notifications, para walang makakita.' : 'No report or message details on Home or in notifications, so nobody can peek.'],
                      [LogOut, isTl ? 'Exit' : 'Exit', isTl ? 'Pindutin ang Exit sa itaas para agad umalis sa app.' : 'Tap Exit at the top to leave the app at once.'],
                      [FileText, 'RA 10173', isTl ? 'Protektado ng Data Privacy Act ang mga impormasyon mo.' : 'Your information is protected by the Data Privacy Act.'],
                    ].map(([Ic, a, b], i) => {
                      const I = Ic as typeof ShieldIcon;
                      return (
                        <div key={i} className="flex gap-3">
                          <span className="w-9 h-9 rounded-full bg-[#0A84FF]/[0.12] text-[#0A84FF] flex items-center justify-center shrink-0"><I className="w-[18px] h-[18px]" /></span>
                          <span><span className="block text-[15px] font-semibold text-[#1D1D1F] dark:text-white">{a as string}</span><span className="block text-[14px] text-[#6E6E73] dark:text-[#A1A1A6]">{b as string}</span></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>,
              document.body
            )}
    </>
  );

  return (
    <div className="min-h-[100dvh] w-full relative flex flex-col justify-start overflow-x-clip font-sans select-none student-portal-canvas sd-canvas bg-[#F5F5F7] dark:bg-[#0B1220] text-slate-900 dark:text-white transition-colors duration-150">
      {/* Top Navigation Bar - Clean, Organized & Non-Congested Header */}
      <header className="sticky top-0 z-30 w-full sd-header !pt-1 sm:!pt-2 lg:!pt-0">
        {decor && <ChristmasLights className="absolute left-0 right-0 -bottom-[13px] h-[18px] w-full z-[1]" />}
        <div className="relative w-full px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-0 lg:h-[92px] flex items-center gap-3 sm:gap-4">
          <img src="/aics-logo.jpg" alt="AICS" className="w-10 h-10 sm:w-12 sm:h-12 lg:w-[60px] lg:h-[60px] rounded-full object-cover bg-white shrink-0 ring-1 ring-black/5 shadow-sm" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[14px] sm:text-[18px] lg:text-[17px] xl:text-[22px] font-bold tracking-tight text-[#0F2557] dark:text-white uppercase lg:whitespace-nowrap truncate"><span className="sm:hidden">AICS Montalban</span><span className="hidden sm:inline">Asian Institute of Computer Studies</span></p>
            <p className="text-[11px] sm:text-[14px] text-[#1E469B] dark:text-[#9CC3FF] truncate">
              <span className="hidden sm:inline font-semibold uppercase">Montalban Branch</span>
              <span className="text-[#6E6E73] dark:text-[#A1A1A6]">
                <span className="hidden sm:inline"> · Confidential Guidance Portal</span>
                <span className="sm:hidden">Confidential Portal</span>
              </span>
            </p>
          </div>
          {decor && (
            <div className="hidden lg:flex shrink-0 self-start items-start gap-3 pointer-events-none" aria-hidden="true">
              <PaskoGreeting isTl={isTl} className="hidden lg:inline-flex mt-8 mr-1" />
              <Parol color="red" className="w-6 h-[40px] lg:w-9 lg:h-[60px] text-[#8E8E93]" />
              <Parol color="gold" delay={0.8} className="w-5 h-[33px] lg:w-8 lg:h-[52px] text-[#8E8E93]" />
              <Parol color="blue" delay={1.6} className="hidden lg:block w-7 h-[46px] lg:w-9 lg:h-[60px] text-[#8E8E93]" />
            </div>
          )}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <QuickExitButton onTrigger={onSignOut} />
          </div>
        </div>
      </header>

      {/* Right Drawer Navigation (Native CSS for 100% reliable clicks on mobile) */}
      {/* Menu: iOS Settings-style sheet (follows light/dark). The 3 sections already live in the tabs. */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[99990] flex justify-end" role="dialog" aria-modal="true" aria-label={isTl ? 'Menu' : 'Menu'}>
          <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" />
          <motion.div
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="relative h-full w-[min(360px,92vw)] sd-sheet z-[99995] flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <p className="text-[22px] font-bold tracking-tight text-[#1D1D1F] dark:text-white">{isTl ? 'Menu' : 'Menu'}</p>
              <button type="button" onClick={() => setIsMenuOpen(false)} aria-label={isTl ? 'Isara' : 'Close'} className="w-8 h-8 rounded-full flex items-center justify-center bg-black/[0.06] dark:bg-white/[0.12] text-[#6E6E73] dark:text-[#A1A1A6] active:scale-[0.97] transition-transform duration-150">
                <X className="w-4 h-4" />
              </button>
            </div>

            {settingsBody}
            <p className="mt-auto px-6 py-5 text-[12px] text-center text-[#8E8E93]">{isTl ? 'Pribado at protektado (RA 10173)' : 'Private and protected (RA 10173)'}</p>
          </motion.div>
        </div>
      )}


      {/* Inactivity Warning Banner (Discreetly alerts student when only 60s left) */}
      <AnimatePresence>
        {showIdleWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm flex items-center justify-center p-6"
            role="alertdialog"
            aria-modal="true"
          >
            <motion.div initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }} className="w-full max-w-[320px] rounded-[26px] bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-xl text-center overflow-hidden shadow-2xl">
              <div className="px-6 pt-6 pb-5">
                <span className="mx-auto w-12 h-12 rounded-full bg-[#FF9F0A] text-white flex items-center justify-center"><LockIcon className="w-6 h-6" /></span>
                <p className="mt-3 text-[18px] font-bold text-[#1D1D1F] dark:text-white">{isTl ? 'Nandiyan ka pa ba?' : 'Are you still there?'}</p>
                <p className="mt-1 text-[14px] leading-snug text-[#3A3A3C] dark:text-[#D1D1D6]">
                  {isTl ? 'Para sa kaligtasan mo, masa-sign out ka sa loob ng ' : 'For your safety, you will be signed out in '}
                  <b className="tabular-nums">{secondsRemaining}s</b>.
                </p>
              </div>
              <div className="grid grid-cols-2 border-t border-black/10 dark:border-white/10">
                <button type="button" onClick={onSignOut} className="h-12 text-[16px] text-[#FF3B30] border-r border-black/10 dark:border-white/10">{isTl ? 'Mag-sign out' : 'Sign out'}</button>
                <button type="button" onClick={resetInactivityTimer} className="h-12 text-[16px] font-semibold text-[#0A84FF]">{isTl ? 'Manatili' : 'Stay signed in'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatPopup && (
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            role="status"
            aria-live="polite"
            className="fixed top-3 inset-x-0 mx-auto z-[55] w-[min(440px,calc(100vw-24px))] rounded-[22px] bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-xl shadow-2xl p-3 flex items-center gap-3"
          >
            <span className="w-11 h-11 rounded-full nav-c-chat text-white flex items-center justify-center text-[14px] font-bold shrink-0">GO</span>
            <button type="button" onClick={() => { openConcernChat(chatPopup.concern); setChatPopup(null); }} className="min-w-0 flex-1 text-left">
              <span className="block text-[15px] font-semibold text-[#1D1D1F] dark:text-white">{isTl ? 'Bagong mensahe · Guidance' : 'New message · Guidance'}</span>
              <span className="block text-[14px] text-[#3A3A3C] dark:text-[#D1D1D6] truncate"><span className="lg:hidden">{isTl ? 'Pindutin ang Buksan para mabasa.' : 'Tap Open to read it.'}</span><span className="hidden lg:inline">{chatPopup.body}</span></span>
            </button>
            <button type="button" onClick={() => { openConcernChat(chatPopup.concern); setChatPopup(null); }} className="h-9 px-4 rounded-full bg-[#0A84FF] text-white text-[14px] font-semibold shrink-0">{isTl ? 'Buksan' : 'Open'}</button>
            <button type="button" onClick={() => setChatPopup(null)} aria-label={isTl ? 'Isara' : 'Close'} title={isTl ? 'Isara' : 'Close'} className="w-9 h-9 rounded-full lg-chip lg-ink-soft flex items-center justify-center shrink-0"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Area (Clean Responsive Vertical Flow: Compact Spacing on Mobile) */}
      <main className={`relative z-20 flex-1 w-full mx-auto px-4 pt-4 sm:px-6 space-y-5 pb-[calc(84px+env(safe-area-inset-bottom))] lg:pb-32 lg:pr-[148px] ${activeTab === 'home' ? 'lg:max-w-none lg:px-8 lg:pt-5 lg:pb-6' : activeTab === 'me' ? 'max-w-3xl lg:pb-10' : 'lg:max-w-none lg:px-8 lg:pt-5 lg:pb-10'}`}>
        {/* Navigation Tabs (Hidden on Mobile < 768px because everything is neatly in the Right Menu Drawer) */}
        {/* TAB 1: SUBMIT REPORT (Compact, Responsive Padding) */}
        {activeTab === 'home' && (() => {
          const nAcc = history.filter((h) => statusTone(h.status) === 'green').length;
          const nRev = history.filter((h) => statusTone(h.status) === 'amber').length;
          const nRej = history.filter((h) => statusTone(h.status) === 'rose').length;
          const firstName = (user.fullName || '').trim().split(/\s+/)[0] || '';
          const initials = (user.fullName || '').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
          const firstOpen = history.find((c) => c.chatStatus === 'Open');
          const row = 'w-full flex items-center gap-3 px-4 py-3 text-left active:bg-black/[0.04] dark:active:bg-white/[0.06]';
          return (
          <div className="m-home lg:hidden space-y-4 pt-1">
            {/* 1. Top Greeting Title: Good morning AICSIAN */}
            <div ref={greetRef} className="px-1 space-y-1.5">
              <p className="text-[26px] leading-tight font-black tracking-tight lg-ink">
                {isTl ? `${greet} AICSIAN` : `${greet} AICSIAN`}
              </p>
              
              {/* 2. Christmas Countdown Pill */}
              {decor && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white text-[12px] font-bold shadow-md shadow-rose-950/30 border border-white/20">
                  <span>⭐</span>
                  <PaskoChip isTl={isTl} className="!h-auto !p-0 !bg-transparent !shadow-none !border-0 text-white !text-[12px] font-bold" />
                </div>
              )}
            </div>

            {/* 3. New Aurora Date & Live Philippine Time Widget */}
            <MobileAuroraDateTimeWidget isTl={isTl} />

            {/* 4. GUIDANCE OFFICE HOURS WIDGET */}
            <div className="relative rounded-[26px] p-5 bg-[#0F224A] text-white shadow-xl border border-white/10 overflow-hidden space-y-4">
              {decor && <HollySprig className="absolute top-3.5 right-3.5 w-10 h-7" />}
              
              {/* Top header row: Orange clock circle badge + "Guidance Office" title */}
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-md ${openNow ? 'bg-[#30D158] text-white' : 'bg-[#FF9F0A] text-white'}`}>
                  <ClockIcon className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white/90">Guidance Office</h3>
                  <p className="text-[11px] text-white/60 font-medium">{hoursText}</p>
                </div>
              </div>

              {/* Status Headline & next opening/closing detail (from real Guidance App settings) */}
              <div className="space-y-1">
                <p className="text-[26px] font-black tracking-tight leading-none text-white">
                  {openNow ? (isTl ? 'Bukas ngayon' : 'Open now') : isTl ? 'Sarado ngayon' : 'Closed now'}
                </p>
                <p className="text-xs font-semibold text-sky-200/80">
                  {officeNote}
                </p>
                {openNow && (
                  <div className="mt-2.5 h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full rounded-full bg-[#30D158]" style={{ width: `${dayPct}%` }} />
                  </div>
                )}
              </div>

              {/* Mon to Fri 5-day Calendar Slots (Exact 1:1 match with Desktop Reference Widget) */}
              <div className="flex justify-between items-center gap-1.5 pt-1">
                {week.map((d) => (
                  <div
                    key={d.iso}
                    title={d.open ? (isTl ? 'Bukas' : 'Open') : isTl ? 'Sarado' : 'Closed'}
                    className={`flex-1 py-2.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-center transition-all ${
                      d.today
                        ? 'bg-gradient-to-b from-[#1E469B] to-[#0A84FF] text-white shadow-md shadow-blue-900/50 ring-1 ring-white/40'
                        : d.open
                        ? 'bg-white/10 text-white/90 border border-white/5'
                        : 'bg-white/5 text-white/35'
                    }`}
                  >
                    <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">{d.label}</span>
                    <span className="text-[15px] font-black tabular-nums">{d.num}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* the one main action (the tab bar + also opens it) */}
            <button type="button" onClick={() => goTab('submit')} className="m-press w-full lg-card flex items-center gap-3 p-3 text-left">
              <span className="w-10 h-10 rounded-full bg-[#0A84FF] text-white text-[14px] font-semibold flex items-center justify-center shrink-0">{initials || 'ME'}</span>
              <span className="flex-1 text-[15px] lg-ink-soft">{isTl ? 'May gusto ka bang i-report?' : 'Something to report?'}</span>
              <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
            </button>

            {/* first visit: how it works (only before the first report) */}
            {!loadingHistory && history.length === 0 && (
              <div>
                <p className="px-1 pb-1.5 text-[13px] font-semibold uppercase tracking-wide lg-ink-soft">{isTl ? 'Paano ito gumagana' : 'How it works'}</p>
                <div className="lg-card divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                  {[
                    [isTl ? 'Mag-report' : 'Send a report', isTl ? 'Isulat ang nangyari. Confidential ito.' : 'Write what happened. It stays confidential.'],
                    [isTl ? 'Susuriin ng Guidance' : 'Guidance reviews it', isTl ? 'Babasahin ito ng Guidance Office.' : 'The Guidance Office reads it.'],
                    [isTl ? 'Mag-chat kapag tinanggap' : 'Chat when accepted', isTl ? 'Bubuksan nila ang chat para sa iyo.' : 'They open a chat with you.'],
                  ].map(([a, b], i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#0A84FF] text-white text-[14px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="min-w-0"><span className="block text-[15px] font-semibold lg-ink">{a}</span><span className="block text-[13px] lg-ink-soft">{b}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* reports + messages: one grouped list, same 40px solid icons, every row opens something */}
            {(loadingHistory && history.length === 0) ? (
              <div className="space-y-2" aria-hidden="true"><div className="m-skel h-[64px] rounded-[18px]" /><div className="m-skel h-[64px] rounded-[18px]" /></div>
            ) : history.length > 0 && (
              <div>
                <p className="px-1 pb-1.5 text-[13px] font-semibold uppercase tracking-wide lg-ink-soft">{isTl ? 'Para sa iyo' : 'For you'}</p>
                <div className="lg-card overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                  <button type="button" onClick={() => goTab('history')} className={row}>
                    <span className="w-10 h-10 rounded-full bg-[#0A84FF] text-white flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold lg-ink">{isTl ? `${history.length} report` : `${history.length} report${history.length > 1 ? 's' : ''}`}</span>
                      <span className="block text-[13px] lg-ink-soft truncate">{[nRev && (isTl ? `${nRev} sinusuri` : `${nRev} being reviewed`), nAcc && (isTl ? `${nAcc} tinanggap` : `${nAcc} accepted`), nRej && (isTl ? `${nRej} hindi tinanggap` : `${nRej} not accepted`)].filter(Boolean).join(' · ')}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
                  </button>
                  <button type="button" onClick={() => (firstOpen ? openConcernChat(firstOpen) : goTab('chat'))} className={row}>
                    <span className="w-10 h-10 rounded-full bg-[#30D158] text-white text-[13px] font-bold flex items-center justify-center shrink-0">GO</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold lg-ink">Guidance Office</span>
                      <span className={`block text-[13px] truncate ${unreadCount ? 'font-semibold text-[#0A84FF]' : 'lg-ink-soft'}`}>
                        {unreadCount ? (isTl ? 'May bagong mensahe' : unreadCount > 1 ? `${unreadCount} new messages` : 'New message') : openChats ? (isTl ? 'Bukas ang chat' : 'Chat open') : isTl ? 'Magbubukas kapag tinanggap ang report mo' : 'Opens when your report is accepted'}
                      </span>
                    </span>
                    {unreadCount > 0 && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#FF3B30] text-white text-[12px] font-bold flex items-center justify-center">{unreadCount}</span>}
                    <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* office: information only (not a card, nothing to tap) */}
            <p className="px-1 flex items-center gap-2 text-[14px] lg-ink">
              <span className={`w-2 h-2 rounded-full shrink-0 ${openNow ? 'bg-[#30D158]' : 'bg-[#FF9F0A]'}`} />
              <span><b className="font-semibold">Guidance Office · {openNow ? (isTl ? 'Bukas ngayon' : 'Open now') : isTl ? 'Sarado' : 'Closed'}</b> <span className="lg-ink-soft">· {officeNote}</span></span>
            </p>

            {/* confidential: a quiet footnote */}
            <p className="px-1 text-[13px] leading-snug lg-ink-soft flex gap-2"><ShieldIcon className="w-4 h-4 shrink-0 mt-px" />{isTl ? 'Confidential ang report mo. Ang Guidance Office lang ang makakabasa. Pindutin ang Exit kung kailangan.' : 'Your report is confidential. Only the Guidance Office can read it. Tap Exit anytime.'}</p>
          </div>
          );
        })()}
        {activeTab === 'home' && (
          <div className="hidden lg:grid lg:!mt-0 grid-cols-2 lg:grid-cols-4 lg:grid-rows-[1fr_1fr_auto] gap-4 pt-2 lg:pt-0 lg:h-[calc(var(--sd-vh,100dvh)-138px)]">
            
            {/* hero: clock widget + the one main action */}
            <div className={`lg-card lg-widget relative overflow-hidden col-span-2 lg:row-span-2 p-3 sm:p-3.5 ${decor ? 'pt-7 sm:pt-7' : ''} flex flex-col gap-3 lg:min-h-0`}>
              <span aria-hidden className="wg-blob wg-b1" /><span aria-hidden className="wg-blob wg-b2" /><span aria-hidden className="wg-blob wg-b3" />
              {decor && <ChristmasLights className="absolute z-[2] top-0 left-4 right-4 h-6 w-[calc(100%-2rem)]" />}
              <div className="relative flex-1 min-h-0 flex flex-col"><HeroClock isTl={isTl} /></div>
              <button type="button" onClick={() => goTab('submit')} className="relative wg-glass flex items-center gap-3 px-5 h-14 w-full rounded-[22px] text-left active:scale-[0.99] transition-transform duration-150">
                <span className="flex-1 text-[15px] text-white/85">{isTl ? 'May gusto ka bang i-report?' : 'Something to report? Start here'}</span>
                <span className="w-9 h-9 rounded-full bg-white text-[#2563EB] flex items-center justify-center"><Plus className="w-5 h-5" strokeWidth={2.4} /></span>
              </button>
            </div>

            {/* latest report */}
            <div className={`lg-card col-span-2 p-5 xl:p-7 flex flex-col gap-4 ${latest ? 'lg-tone-' + statusTone(latest.status) : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[15px] xl:text-[17px] font-semibold lg-ink-soft inline-flex items-center gap-2">{isTl ? 'Huling report' : 'Latest report'}{decor && <Parol color="green" className="w-4 h-[26px] -mb-2 text-[#8E8E93]" />}</p>
                <button type="button" onClick={() => goTab('history')} className="text-[14px] xl:text-[15px] font-semibold text-[#0A84FF] hover:underline">{isTl ? 'Tingnan lahat' : 'See all'} ({history.length})</button>
              </div>
              {latest ? (
                <button type="button" onClick={() => goTab('history')} className="flex-1 min-h-0 text-left flex flex-col justify-between gap-3">
                  <span className="block">
                    <span className="block text-[24px] xl:text-[34px] leading-tight font-bold tracking-tight lg-ink truncate">{latest.category}</span>
                    <span className="block mt-1 text-[14px] xl:text-[15px] lg-ink-soft">{new Date(latest.createdAt).toLocaleDateString(isTl ? 'fil-PH' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {latest.referralCode}</span>
                    {readNarrative(latest.whatHappened).story && <span className="block mt-2 text-[15px] xl:text-[16px] lg-ink line-clamp-2">{readNarrative(latest.whatHappened).story}</span>}
                  </span>
                  <span className="flex items-center gap-2 text-[14px] xl:text-[15px] font-semibold lg-ink">
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-5 h-5 text-[#30D158]" />{isTl ? 'Naipadala' : 'Sent'}</span>
                    <span className="flex-1 h-[2px] rounded-full lg-line" />
                    <span className="inline-flex items-center gap-1.5">{statusTone(latest.status) === 'amber' ? <Clock className="w-5 h-5 text-[#FF9F0A]" /> : <CheckCircle2 className="w-5 h-5 text-[#30D158]" />}{isTl ? 'Sinusuri' : 'Reviewed'}</span>
                    <span className="flex-1 h-[2px] rounded-full lg-line" />
                    <span className={`h-8 px-3.5 rounded-full inline-flex items-center text-[13px] text-white lg-status-${statusTone(latest.status)}`}>{statusWord(latest.status)}</span>
                  </span>
                </button>
              ) : (
                <button type="button" onClick={() => goTab('submit')} className="flex-1 text-left">
                  <span className="block text-[24px] xl:text-[30px] font-bold lg-ink">{isTl ? 'Wala ka pang report' : 'No reports yet'}</span>
                  <span className="block text-[15px] lg-ink-soft">{isTl ? 'Pindutin ang + para magsimula. Confidential ito.' : 'Tap + to start one. It stays confidential.'}</span>
                </button>
              )}
            </div>

            {/* office now (Control Center tile) */}
            <div className="lg-card relative col-span-2 lg:col-span-1 p-5 xl:p-7 flex flex-col justify-between gap-3">
              {decor && <HollySprig className="hidden lg:block absolute top-3 right-3 w-10 h-7" />}
              <div className="flex items-center gap-3">
                <span className={`w-11 h-11 xl:w-12 xl:h-12 rounded-full flex items-center justify-center shrink-0 text-white ${openNow ? 'bg-[#30D158]' : 'bg-[#FF9F0A]'}`}><ClockIcon className="w-6 h-6" /></span>
                <p className="text-[14px] xl:text-[15px] font-semibold lg-ink-soft leading-tight">Guidance Office</p>
              </div>
              <div>
                <p className="text-[24px] xl:text-[32px] leading-tight font-bold tracking-tight lg-ink">{openNow ? (isTl ? 'Bukas ngayon' : 'Open now') : isTl ? 'Sarado ngayon' : 'Closed now'}</p>
                <p className="text-[14px] xl:text-[16px] lg-ink-soft">{officeNote}</p>
                {openNow && <div className="mt-3 h-2 rounded-full lg-line overflow-hidden"><div className="h-full rounded-full bg-[#30D158]" style={{ width: `${dayPct}%` }} /></div>}
              </div>
              <div className="flex justify-between gap-1">
                {week.map((d) => (
                  <span key={d.iso} title={d.open ? (isTl ? 'Bukas' : 'Open') : isTl ? 'Sarado' : 'Closed'} className={`flex-1 h-12 xl:h-14 rounded-2xl flex flex-col items-center justify-center text-[11px] xl:text-[12px] font-semibold ${d.today ? 'bg-[#0A84FF] text-white' : d.open ? 'lg-chip lg-ink' : 'lg-ink-soft opacity-50'}`}>
                    {d.label}<span className="text-[15px] xl:text-[17px] font-bold">{d.num}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* chat: open chats you can tap */}
            <div className="lg-card relative col-span-2 lg:col-span-1 p-5 xl:p-7 flex flex-col gap-3 min-h-0">
              {decor && <HollySprig className="hidden lg:block absolute top-3 right-3 w-10 h-7" />}
              <button type="button" onClick={() => goTab('chat')} className="flex items-center gap-3 text-left">
                <span className={`w-11 h-11 xl:w-12 xl:h-12 rounded-full flex items-center justify-center shrink-0 ${openChats ? 'bg-[#0A84FF] text-white' : 'lg-chip'}`}><MessageSquare className="w-6 h-6" /></span>
                <span className="text-[14px] xl:text-[15px] font-semibold lg-ink-soft">Chat</span>
              </button>
              <p className="text-[24px] xl:text-[32px] leading-tight font-bold tracking-tight lg-ink">{openChats ? (isTl ? `${openChats} bukas na chat` : `${openChats} open chat${openChats > 1 ? 's' : ''}`) : isTl ? 'Walang chat' : 'No chat yet'}</p>
              {openChats ? (
                <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
                  {history.filter((c) => c.chatStatus === 'Open').slice(0, 3).map((c) => (
                    <button key={c.id} type="button" onClick={() => openConcernChat(c)} className="w-full rounded-2xl lg-chip px-3.5 py-2.5 text-left flex items-center gap-2 active:scale-[0.98] transition-transform duration-150">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] xl:text-[15px] font-semibold lg-ink truncate">{c.category}</span>
                        <span className="block text-[12px] lg-ink-soft">{isTl ? 'Pindutin para buksan' : 'Tap to open'} · {c.referralCode}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 lg-ink-soft shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] xl:text-[15px] lg-ink-soft">{isTl ? 'Bubuksan ng Guidance kapag tinanggap ang report mo.' : 'Guidance opens a chat when they accept your report.'}</p>
              )}
            </div>

            {/* safety note */}
            <div className="lg-card relative col-span-2 lg:col-span-4 p-5 flex items-center gap-4">
              {decor && (
                <div className="hidden lg:flex absolute right-6 top-0 items-start gap-4" aria-hidden="true">
                  <Parol color="gold" className="w-7 h-[46px] text-[#8E8E93]" />
                  <Parol color="red" delay={0.7} className="w-8 h-[54px] text-[#8E8E93]" />
                  <Parol color="green" delay={1.4} className="w-7 h-[46px] text-[#8E8E93]" />
                  <Parol color="blue" delay={2.1} className="w-8 h-[54px] text-[#8E8E93]" />
                </div>
              )}
              <span className="w-11 h-11 rounded-2xl tile-grad tile-violet text-white flex items-center justify-center shrink-0"><ShieldIcon className="w-5 h-5" /></span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold lg-ink">{isTl ? 'Confidential ang report mo' : 'Your report is confidential'}</p>
                <p className="text-[13px] lg-ink-soft">{isTl ? 'Ang Guidance Office lang ang makakabasa. Hindi sasabihin sa inireklamo kung sino ka. Pindutin ang Quick Exit kung kailangan.' : 'Only the Guidance Office can read it. The reported student is never told who you are. Use Quick Exit anytime.'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="max-w-2xl mx-auto pt-2 lg-me">
            <p className="px-1 text-[30px] sm:text-[34px] font-bold tracking-tight lg-ink flex items-center gap-2">{isTl ? 'Ako' : 'Me'}{decor && <Parol color="blue" className="w-6 h-[38px] -mb-3 text-[#8E8E93]" />}</p>
            <p className="px-1 pb-2 text-[15px] lg-ink-soft">{isTl ? 'Ang account mo at mga setting.' : 'Your account and settings.'}</p>
            {settingsBody}
            <p className="pt-6 text-[12px] text-center lg-ink-soft">{isTl ? 'Pribado at protektado (RA 10173)' : 'Private and protected (RA 10173)'}</p>
          </div>
        )}

        {activeTab === 'submit' && (
          <div className="lg:grid lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:gap-5 lg:items-start pt-2 lg:pt-0">
          {draftRestored && (
            <div className="lg:hidden mb-3 lg-card px-4 py-3 flex items-center gap-3" role="status">
              <span className="w-8 h-8 rounded-full bg-[#0A84FF] text-white flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></span>
              <span className="min-w-0 flex-1 text-[14px] lg-ink">{isTl ? 'Naibalik ang draft mo (litrato hindi kasama).' : 'Your draft is back (photos are not saved).'}</span>
              <button type="button" onClick={discardDraft} className="text-[14px] font-semibold text-[#FF3B30] shrink-0">{isTl ? 'Burahin' : 'Discard'}</button>
            </div>
          )}
          {/* LEFT (website): who is reporting, the steps, office now */}
          <aside className="hidden lg:flex flex-col gap-5 sticky top-[112px]">
            <div className="lg-card lg-widget relative overflow-hidden p-6 text-white">
              <span aria-hidden className="wg-blob wg-b1" /><span aria-hidden className="wg-blob wg-b2" /><span aria-hidden className="wg-blob wg-b3" />
              <div className="relative">
                <div className="flex items-center gap-4">
                  <span className="w-16 h-16 rounded-[22px] wg-glass flex items-center justify-center text-[22px] font-bold shrink-0">
                    {user.fullName.split(/[\s,]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[22px] leading-tight font-bold tracking-tight">{firstName}</p>
                    <p className="text-[15px] text-white/80 truncate">{user.gradeSection || user.studentNumber}</p>
                  </div>
                </div>
                <p className="mt-5 rounded-2xl wg-glass px-4 py-3 text-[15px] leading-snug flex items-start gap-2.5">
                  <ShieldIcon className="w-5 h-5 mt-0.5 shrink-0" />
                  {isTl ? 'Pribado ito. Ang Guidance Office lang ang makakabasa.' : 'This is private. Only the Guidance Office can read it.'}
                </p>
              </div>
            </div>

            <ol className="lg-card p-3">
              {stepNames.map((s, i) => {
                const n = i + 1;
                const done = formStep > n;
                const on = formStep === n;
                return (
                  <li key={n} className={`flex items-center gap-4 px-3 py-3.5 rounded-2xl ${on ? 'lg-chip' : ''}`}>
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0 ${done ? 'bg-[#30D158] text-white' : on ? 'nav-c-home text-white' : 'lg-chip lg-ink-soft'}`}>
                      {done ? <CheckIcon className="w-5 h-5" /> : n}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[17px] ${on ? 'font-bold lg-ink' : 'font-semibold lg-ink-soft'}`}>{s[0]}</span>
                      <span className="block text-[13px] lg-ink-soft">{done ? (isTl ? 'Tapos na' : 'Done') : s[1]}</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="lg-card p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white ${openNow ? 'bg-[#30D158]' : 'bg-[#FF9F0A]'}`}><ClockIcon className="w-6 h-6" /></span>
                <div className="min-w-0">
                  <p className="text-[20px] leading-tight font-bold lg-ink">{openNow ? (isTl ? 'Bukas ngayon' : 'Open now') : isTl ? 'Sarado ngayon' : 'Closed now'}</p>
                  <p className="text-[14px] lg-ink-soft">{officeNote}</p>
                </div>
              </div>
              {openNow && <div className="h-2 rounded-full lg-line overflow-hidden"><div className="h-full rounded-full bg-[#30D158]" style={{ width: `${dayPct}%` }} /></div>}
              <div className="flex justify-between gap-1">
                {week.map((d) => (
                  <span key={d.iso} className={`flex-1 h-12 rounded-2xl flex flex-col items-center justify-center text-[11px] font-semibold ${d.today ? 'bg-[#0A84FF] text-white' : d.open ? 'lg-chip lg-ink' : 'lg-ink-soft opacity-50'}`}>
                    {d.label}<span className="text-[15px] font-bold">{d.num}</span>
                  </span>
                ))}
              </div>
              {!openNow && <p className="text-[13px] lg-ink-soft">{isTl ? 'Pwede ka pa ring mag-report. Babasahin ito sa susunod na pasok.' : 'You can still send it. Guidance reads it on the next office day.'}</p>}
            </div>
          </aside>

          <div className="lg-card p-5 sm:p-8 space-y-6">
            {/* header */}
            <div>
              <div className="flex items-center gap-3">
                <span className="h-8 px-3.5 rounded-full lg-chip inline-flex items-center text-[13px] font-bold lg-ink">{isTl ? `Hakbang ${formStep} sa 3` : `Step ${formStep} of 3`}</span>
                <span className="text-[13px] font-semibold text-[#30A14E] inline-flex items-center gap-1.5"><Shield className="w-4 h-4" />{isTl ? 'Confidential' : 'Confidential'}</span>
              </div>
              <h2 className="mt-3 text-[28px] sm:text-[36px] leading-tight font-bold tracking-tight lg-ink">
                {formStep === 1 ? (isTl ? 'Anong klaseng concern?' : 'What kind of concern?') : formStep === 2 ? (isTl ? 'Sino ang inirereklamo?' : 'Who is it about?') : isTl ? 'Ano ang nangyari?' : 'What happened?'}
              </h2>
              <p className="mt-1 text-[16px] lg-ink-soft">
                {formStep === 1 ? (isTl ? 'Piliin ang pinakamalapit. Okay lang kung hindi sigurado, piliin ang "Iba pa".' : 'Pick the closest one. Not sure? Choose "Something else".') : formStep === 2 ? (isTl ? 'Kahit hindi mo alam ang pangalan, pwede pa rin.' : 'It is okay if you do not know their name.') : isTl ? 'Ikuwento nang tapat. Ang Guidance lang ang makakabasa.' : 'Tell it honestly. Only Guidance will read it.'}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((s) => <span key={s} className={`h-1.5 rounded-full ${formStep >= s ? 'nav-c-home' : 'lg-line'}`} />)}
              </div>
            </div>

            {/* office (phones; the website shows it on the left) */}
            <div className="lg:hidden rounded-2xl lg-chip px-4 py-3 flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full shrink-0 ${openNow ? 'bg-[#30D158]' : 'bg-[#FF9F0A]'}`} />
              <p className="text-[14px] lg-ink"><b className="font-semibold">{openNow ? (isTl ? 'Bukas ngayon' : 'Open now') : isTl ? 'Sarado ngayon' : 'Closed now'}</b> · {officeNote}</p>
            </div>

            {submitError && (
              <div className="p-4 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[15px] font-semibold text-[#D70015] dark:text-[#FF6961] flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitConcern} className="space-y-6">
              {formStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <p className="mb-3 text-[15px] font-bold lg-ink-soft">{isTl ? 'Pumili ng uri ng insidente' : 'Select incident type'}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                      {CONCERN_GROUPS[0].items.map((c) => {
                        const on = reportType === c.v;
                        const Ic = c.icon;
                        return (
                          <button key={c.v} type="button" onClick={() => setReportType(c.v)} aria-pressed={on} className={`min-h-[96px] p-4 rounded-[22px] text-left flex flex-col justify-between gap-2 border-2 transition-colors duration-150 active:scale-[0.98] ${on ? 'border-[#0A84FF] bg-[#0A84FF]/[0.08] dark:bg-[#0A84FF]/20' : 'border-transparent lg-chip hover:border-[#0A84FF]/30'}`}>
                            <span className={`w-10 h-10 rounded-full flex items-center justify-center ${on ? 'nav-c-home text-white' : 'bg-blue-500/[0.12] text-blue-500 dark:text-blue-400'}`}><Ic className="w-5 h-5" /></span>
                            <span className="text-[15px] leading-snug font-semibold lg-ink">{isTl ? c.tl : c.en}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[15px] font-bold lg-ink-soft">{isTl ? 'Para kanino ang report?' : 'Who is this report for?'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {([
                        ['self', User, isTl ? 'Para sa sarili ko' : 'For myself', isTl ? 'Ako mismo ang nakaranas nito' : 'It happened to me'],
                        ['peer', Users, isTl ? 'Para sa kaibigan o kaklase' : 'For a friend or classmate', isTl ? 'Nangyari ito sa kaibigan ko' : 'It happened to someone I know'],
                      ] as const).map(([v, Ic, t1, t2]) => {
                        const on = reportingRole === v;
                        return (
                          <button key={v} type="button" onClick={() => { soundFX.playToggleSwitch(true); setReportingRole(v); }} aria-pressed={on} className={`p-4 rounded-[22px] text-left flex items-center gap-4 border-2 transition-colors duration-150 ${on ? 'border-[#0A84FF] bg-[#0A84FF]/[0.08] dark:bg-[#0A84FF]/20' : 'border-transparent lg-chip'}`}>
                            <span className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${on ? 'nav-c-home text-white' : 'nav-c-me text-white'}`}><Ic className="w-6 h-6" /></span>
                            <span><span className="block text-[17px] font-bold lg-ink">{t1}</span><span className="block text-[14px] lg-ink-soft">{t2}</span></span>
                          </button>
                        );
                      })}
                    </div>
                    {reportingRole === 'peer' && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block mb-1.5 text-[15px] font-semibold lg-ink">{isTl ? 'Pangalan ng kaibigan' : "Friend's name"} *</span>
                          <input type="text" required placeholder={isTl ? 'Buong pangalan' : 'Full name'} value={friendName} onChange={(e) => setFriendName(e.target.value)} className={fieldCls} />
                        </label>
                        <label className="block">
                          <span className="block mb-1.5 text-[15px] font-semibold lg-ink">{isTl ? 'Grade at section' : 'Grade and section'}</span>
                          <input type="text" placeholder={isTl ? 'hal. Grade 11 · STEM-1' : 'e.g. Grade 11 · STEM-1'} value={friendGradeSection} onChange={(e) => setFriendGradeSection(e.target.value)} className={fieldCls} />
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="sd-actionbar flex justify-end">
                    <button type="button" onClick={() => {
                      if (reportingRole === 'peer' && !friendName.trim()) { soundFX.playError(); setSubmitError(isTl ? 'Ilagay ang pangalan ng kaibigan mo para makapagpatuloy.' : "Type your friend's name to continue."); return; }
                      setSubmitError(null); soundFX.playToggleSwitch(true); setFormStep(2);
                    }} className={primaryBtn}>
                      {isTl ? 'Susunod' : 'Next'}<ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {formStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <p className="mb-3 text-[15px] font-bold lg-ink-soft">{isTl ? 'Kilala mo ba siya?' : 'Do you know who it is?'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {([
                        ['yes', UserCheck, isTl ? 'Oo, kilala ko' : 'Yes, I know them', isTl ? 'Alam ko ang pangalan' : 'I know their name'],
                        ['unsure', HelpCircle, isTl ? 'Hindi sigurado' : 'Not sure', isTl ? 'May hula ako sa pangalan' : 'I think I know who'],
                        ['no', UserX, isTl ? 'Hindi ko kilala' : 'I do not know', isTl ? 'Ilalarawan ko na lang' : 'I will describe them'],
                      ] as const).map(([v, Ic, t1, t2]) => {
                        const on = knowsSuspect === v;
                        return (
                          <button key={v} type="button" onClick={() => { soundFX.playToggleSwitch(true); setKnowsSuspect(v as any); }} aria-pressed={on} className={`p-4 rounded-[22px] text-left flex flex-col gap-3 border-2 transition-colors duration-150 ${on ? 'border-[#0A84FF] bg-[#0A84FF]/[0.08] dark:bg-[#0A84FF]/20' : 'border-transparent lg-chip'}`}>
                            <span className={`w-12 h-12 rounded-full flex items-center justify-center ${on ? 'nav-c-home text-white' : 'nav-c-history text-white'}`}><Ic className="w-6 h-6" /></span>
                            <span><span className="block text-[17px] font-bold lg-ink">{t1}</span><span className="block text-[14px] lg-ink-soft">{t2}</span></span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {knowsSuspect === 'yes' && (
                    <label className="block">
                      <span className="block mb-1.5 text-[15px] font-semibold lg-ink">{isTl ? 'Pangalan niya' : 'Their name'} *</span>
                      <input type="text" required placeholder={isTl ? 'hal. Juan Dela Cruz, o palayaw' : 'e.g. Juan Dela Cruz, or a nickname'} value={suspectName} onChange={(e) => setSuspectName(e.target.value)} className={fieldCls} />
                    </label>
                  )}
                  <label className="block">
                    <span className="block mb-1.5 text-[15px] font-semibold lg-ink">{knowsSuspect === 'yes' ? (isTl ? 'Grade, section o itsura (hindi kailangan)' : 'Grade, section or looks (optional)') : isTl ? 'Ilarawan siya' : 'Describe them'}</span>
                    <span className="block mb-2 text-[14px] lg-ink-soft">{isTl ? 'Suot, kulay ng bag, tantyang grade, o saan siya madalas tumambay.' : 'Clothes, bag, guessed grade, or where they usually hang out.'}</span>
                    <input type="text" placeholder={isTl ? 'hal. Matangkad, laging nasa 3rd floor tuwing break, itim na bag' : 'e.g. Tall, at the 3rd floor during break, black bag'} value={suspectDetails} onChange={(e) => setSuspectDetails(e.target.value)} className={fieldCls} />
                  </label>
                  <div className="sd-actionbar flex items-center justify-between gap-3">
                    <button type="button" onClick={() => { soundFX.playBackspace(); setFormStep(1); }} className={backBtn}><ChevronLeft className="w-5 h-5" />{isTl ? 'Bumalik' : 'Back'}</button>
                    <button type="button" onClick={() => {
                      if (knowsSuspect === 'yes' && !suspectName.trim()) { soundFX.playError(); setSubmitError(isTl ? 'Ilagay ang pangalan niya, o piliin ang "Hindi sigurado".' : 'Type their name, or choose "Not sure".'); return; }
                      setSubmitError(null); soundFX.playToggleSwitch(true); setFormStep(3);
                    }} className={primaryBtn}>{isTl ? 'Susunod' : 'Next'}<ChevronRight className="w-5 h-5" /></button>
                  </div>
                </div>
              )}

              {formStep === 3 && (
                <div className="space-y-6">
                  <label className="block">
                    <span className="block mb-1.5 text-[15px] font-semibold lg-ink">{isTl ? 'Ikuwento ang nangyari' : 'Tell us what happened'} *</span>
                    <textarea rows={6} required placeholder={isTl ? 'Ano ang ginawa o sinabi? Sino-sino ang kasama?' : 'What was done or said? Who was there?'} value={whatHappened} onChange={(e) => setWhatHappened(e.target.value)} className={`${fieldCls} h-auto py-4 leading-relaxed`} />
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      [isTl ? 'Kailan' : 'When', isTl ? 'hal. Kanina, 10:15 AM recess' : 'e.g. Today, 10:15 AM recess', happenedWhen, setHappenedWhen],
                      [isTl ? 'Saan' : 'Where', isTl ? 'hal. CR sa 3rd floor' : 'e.g. 3rd floor CR', happenedWhere, setHappenedWhere],
                      [isTl ? 'May nakakita ba?' : 'Who saw it?', isTl ? 'hal. 2 kaklase, guard' : 'e.g. 2 classmates, the guard', witnesses, setWitnesses],
                    ] as const).map(([l, p, v, set]) => (
                      <label key={l} className="block">
                        <span className="block mb-1.5 text-[15px] font-semibold lg-ink">{l}</span>
                        <input type="text" placeholder={p} value={v} onChange={(e) => set(e.target.value)} className={fieldCls} />
                      </label>
                    ))}
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[15px] font-bold lg-ink-soft">{isTl ? 'Litrato (hindi kailangan)' : 'Photos (optional)'}</p>
                      <span className="text-[14px] lg-ink-soft">{evidencePhotos.length}/10</span>
                    </div>
                    {photoError && <p className="mb-2 text-[14px] font-semibold text-[#D70015] dark:text-[#FF6961] flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{photoError}</p>}
                    {evidencePhotos.length < 10 && (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="p-4 rounded-[22px] lg-chip flex items-center gap-3 cursor-pointer border-2 border-transparent hover:border-[#0A84FF]/30">
                          <input type="file" accept="image/*" capture="environment" onChange={handleEvidenceUpload} className="hidden" />
                          <span className="w-12 h-12 rounded-full nav-c-home text-white flex items-center justify-center shrink-0"><Camera className="w-6 h-6" /></span>
                          <span className="text-[16px] font-semibold lg-ink">{isTl ? 'Kumuha ng litrato' : 'Take a photo'}</span>
                        </label>
                        <label className="p-4 rounded-[22px] lg-chip flex items-center gap-3 cursor-pointer border-2 border-transparent hover:border-[#0A84FF]/30">
                          <input type="file" accept="image/*" multiple onChange={handleEvidenceUpload} className="hidden" />
                          <span className="w-12 h-12 rounded-full nav-c-me text-white flex items-center justify-center shrink-0"><ImageIcon className="w-6 h-6" /></span>
                          <span className="text-[16px] font-semibold lg-ink">{isTl ? 'Pumili sa gallery' : 'Choose from gallery'}</span>
                        </label>
                      </div>
                    )}
                    {evidencePhotos.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {evidencePhotos.map((photoUrl, idx) => (
                          <div key={idx} className="relative rounded-2xl overflow-hidden aspect-square bg-black/5">
                            <img src={photoUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeEvidencePhoto(idx)} title={isTl ? 'Alisin' : 'Remove'} aria-label={isTl ? 'Alisin' : 'Remove'} className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[22px] lg-chip divide-y divide-black/5 dark:divide-white/10">
                    <label className="flex items-center gap-4 p-4 cursor-pointer">
                      <span className="w-10 h-10 rounded-full bg-[#FF3B30] text-white flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5" /></span>
                      <span className="flex-1"><span className="block text-[16px] font-semibold lg-ink">{isTl ? 'Urgent ito' : 'This is urgent'}</span><span className="block text-[14px] lg-ink-soft">{isTl ? 'May banta sa kaligtasan o kailangan agad ng tulong' : 'Someone is in danger or needs help right away'}</span></span>
                      <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="w-6 h-6 accent-[#FF3B30]" />
                    </label>
                    <label className="flex items-center gap-4 p-4 cursor-pointer">
                      <span className="w-10 h-10 rounded-full bg-[#30D158] text-white flex items-center justify-center shrink-0"><ShieldIcon className="w-5 h-5" /></span>
                      <span className="flex-1"><span className="block text-[16px] font-semibold lg-ink">{isTl ? 'Totoo ang sinabi ko' : 'What I wrote is true'} *</span><span className="block text-[14px] lg-ink-soft">{isTl ? 'Protektado ang pangalan mo ng Data Privacy Act (RA 10173).' : 'Your name is protected by the Data Privacy Act (RA 10173).'}</span></span>
                      <input type="checkbox" checked={truthfulAck} onChange={(e) => setTruthfulAck(e.target.checked)} className="w-6 h-6 accent-[#30D158]" />
                    </label>
                  </div>

                  <div className="sd-actionbar flex items-center justify-between gap-3">
                    <button type="button" onClick={() => { soundFX.playBackspace(); setFormStep(2); }} className={backBtn}><ChevronLeft className="w-5 h-5" />{isTl ? 'Bumalik' : 'Back'}</button>
                    <button type="submit" disabled={submitting || !truthfulAck || !whatHappened.trim()} className={`${primaryBtn} disabled:opacity-45`}>
                      {submitting ? (isTl ? 'Ipinapadala...' : 'Sending...') : <><Send className="w-5 h-5" />{isTl ? 'Ipadala sa Guidance' : 'Send to Guidance'}</>}
                    </button>
                  </div>
                  {(!truthfulAck || !whatHappened.trim()) && <p className="text-right text-[14px] lg-ink-soft">{isTl ? 'Isulat ang nangyari at i-check ang "Totoo ang sinabi ko" para maipadala.' : 'Write what happened and tick "What I wrote is true" to send.'}</p>}
                </div>
              )}
            </form>
          </div>
          </div>
        )}

        {/* TAB 2: MY SUBMITTED REPORTS HISTORY */}
        {activeTab === 'history' && (
          <div className="pt-2 space-y-5">
            {/* title */}
            <div className={`items-end justify-between gap-3 px-1 ${mRepId ? 'hidden lg:flex' : 'flex'}`}>
              <div>
                <p className="text-[30px] sm:text-[34px] font-bold tracking-tight lg-ink flex items-center gap-2">{isTl ? 'Mga Report Ko' : 'My Reports'}{decor && <Parol color="gold" className="w-6 h-[38px] -mb-3 text-[#8E8E93]" />}</p>
                <p className="text-[15px] lg-ink-soft">{isTl ? 'Ang lagay ng bawat report mo.' : 'Where each of your reports stands.'}</p>
              </div>
              <button type="button" onClick={() => void fetchMyHistory()} title={isTl ? 'I-refresh' : 'Refresh'} aria-label={isTl ? 'I-refresh' : 'Refresh'} className="lg-capsule h-11 px-4 rounded-full hidden lg:flex items-center gap-2 lg-ink text-[14px] font-semibold active:scale-[0.97] transition-transform duration-150">
                <RefreshCw className={`w-[18px] h-[18px] ${loadingHistory ? 'animate-spin' : ''}`} />{isTl ? 'I-refresh' : 'Refresh'}
              </button>
            </div>

            {/* counts = filters */}
            {history.length > 0 && (
              <div className={`lg:hidden -mx-4 px-4 gap-2 overflow-x-auto no-scrollbar ${mRepId ? 'hidden' : 'flex'}`} role="tablist" aria-label={isTl ? 'Ipakita' : 'Show'}>
                {([
                  ['all', isTl ? 'Lahat' : 'All', history.length],
                  ['amber', isTl ? 'Sinusuri' : 'Reviewing', history.filter((h) => repTone(h.status) === 'amber').length],
                  ['green', isTl ? 'Tinanggap' : 'Accepted', history.filter((h) => repTone(h.status) === 'green').length],
                  ['rose', isTl ? 'Hindi tinanggap' : 'Not accepted', history.filter((h) => repTone(h.status) === 'rose').length],
                ] as const).map(([k, label, n]) => {
                  const on = repFilter === k;
                  return (
                    <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setRepFilter(k)} className={`shrink-0 h-9 px-3.5 rounded-full text-[14px] font-semibold inline-flex items-center gap-1.5 ${on ? 'bg-[#0A84FF] text-white' : 'bg-white dark:bg-[#1C1C1E] lg-ink'}`}>
                      {label}<span className={`tabular-nums ${on ? 'text-white/85' : 'lg-ink-soft'}`}>{n}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {history.length > 0 && (
              <div className="hidden lg:grid grid-cols-2 lg:grid-cols-4 gap-3">
                {([
                  ['all', isTl ? 'Lahat' : 'All reports', history.length, 'nav-c-home', FileText],
                  ['amber', isTl ? 'Sinusuri' : 'Being reviewed', history.filter((h) => repTone(h.status) === 'amber').length, 'nav-c-history', Clock],
                  ['green', isTl ? 'Tinanggap' : 'Accepted', history.filter((h) => repTone(h.status) === 'green').length, 'nav-c-chat', CheckCircle2],
                  ['rose', isTl ? 'Hindi tinanggap' : 'Not accepted', history.filter((h) => repTone(h.status) === 'rose').length, 'lg-status-rose', AlertTriangle],
                ] as const).map(([k, label, n, tone, Ic]) => {
                  const on = repFilter === k;
                  return (
                    <button key={k} type="button" onClick={() => setRepFilter(k)} aria-pressed={on} className={`lg-card p-4 flex items-center gap-3 text-left border-2 transition-colors duration-150 ${on ? '!border-[#0A84FF]' : 'border-transparent'}`}>
                      <span className={`w-11 h-11 rounded-2xl ${tone} text-white flex items-center justify-center shrink-0`}><Ic className="w-5 h-5" /></span>
                      <span className="min-w-0">
                        <span className="block text-[26px] leading-none font-bold lg-ink tabular-nums">{n}</span>
                        <span className="block mt-1 text-[13px] font-semibold lg-ink-soft truncate">{label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {loadingHistory && history.length === 0 ? (
              <div className="grid gap-4">
                {[0, 1].map((i) => <div key={i} className="lg-card h-[180px] animate-pulse" />)}
              </div>
            ) : history.length === 0 ? (
              <div className="lg-card p-10 text-center">
                <span className="mx-auto w-14 h-14 rounded-2xl nav-c-home text-white flex items-center justify-center"><FileText className="w-7 h-7" /></span>
                <p className="mt-4 text-[20px] font-semibold lg-ink">{isTl ? 'Wala ka pang report' : 'No reports yet'}</p>
                <p className="mt-1 text-[15px] lg-ink-soft max-w-md mx-auto">{isTl ? 'Kapag may gusto kang sabihin, pindutin ang + para mag-report. Confidential ito.' : 'When something happens, tap + to report it. It stays confidential.'}</p>
                <button type="button" onClick={() => goTab('submit')} className="mt-5 h-11 px-6 rounded-full sd-primary text-white text-[15px] font-semibold inline-flex items-center gap-2"><Plus className="w-5 h-5" />{isTl ? 'Mag-report' : 'Report a concern'}</button>
              </div>
            ) : (
              <>
              <div className="lg:hidden">
                {(() => {
                  const d = (s: string) => (s ? new Date(s).toLocaleDateString(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
                  const sel = mRepId ? history.find((h) => h.id === mRepId) : null;
                  if (sel) {
                    const tone = repTone(sel.status);
                    const n = readNarrative(sel.whatHappened);
                    const word = tone === 'green' ? (isTl ? 'Tinanggap' : 'Accepted') : tone === 'rose' ? (isTl ? 'Hindi tinanggap' : 'Not accepted') : isTl ? 'Sinusuri' : 'Being reviewed';
                    const steps = [
                      { label: isTl ? 'Naipadala' : 'Sent', date: d(sel.createdAt), state: 'done' },
                      { label: isTl ? 'Sinusuri ng Guidance' : 'Reviewed by Guidance', date: tone === 'amber' ? '' : d(sel.reviewedAt), state: tone === 'amber' ? 'now' : 'done' },
                      { label: tone === 'rose' ? (isTl ? 'Hindi tinanggap' : 'Not accepted') : isTl ? 'Tinanggap · bukas ang chat' : 'Accepted · chat opened', date: tone === 'amber' ? '' : d(sel.reviewedAt), state: tone === 'amber' ? 'todo' : tone === 'rose' ? 'bad' : 'done' },
                    ];
                    const rowCls = 'px-4 py-3 flex items-start justify-between gap-3';
                    return (
                      <div className="space-y-5">
                        <button type="button" onClick={() => { setMRepId(null); setShowWrote(false); }} className="-ml-1 h-9 flex items-center gap-0.5 text-[#0A84FF] text-[16px]"><ChevronLeft className="w-6 h-6" />{isTl ? 'Mga Report' : 'Reports'}</button>
                        <div className="px-1">
                          <span className={`inline-flex h-7 px-3 rounded-full items-center text-[13px] font-semibold text-white lg-status-${tone}`}>{word}</span>
                          <p className="mt-2 text-[24px] leading-tight font-bold tracking-tight lg-ink">{sel.category}</p>
                          <p className="mt-0.5 text-[14px] lg-ink-soft">{d(sel.createdAt)} · {sel.referralCode}</p>
                        </div>

                        {/* timeline with dates */}
                        <div>
                          <p className="px-1 pb-1.5 text-[13px] font-semibold uppercase tracking-wide lg-ink-soft">{isTl ? 'Lagay' : 'Progress'}</p>
                          <div className="lg-card px-4 py-3">
                            {steps.map((s, i) => (
                              <div key={i} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <span className={`w-3 h-3 rounded-full mt-1 ${s.state === 'done' ? 'bg-[#30D158]' : s.state === 'now' ? 'bg-[#FF9F0A]' : s.state === 'bad' ? 'bg-[#FF3B30]' : 'bg-[#C7C7CC]'}`} />
                                  {i < steps.length - 1 && <span className={`w-[2px] flex-1 my-1 ${s.state === 'done' ? 'bg-[#30D158]' : 'bg-[#E5E5EA] dark:bg-[#38383A]'}`} />}
                                </div>
                                <div className={`pb-4 ${i === steps.length - 1 ? '!pb-0' : ''}`}>
                                  <p className={`text-[15px] ${s.state === 'todo' ? 'lg-ink-soft' : 'font-semibold lg-ink'}`}>{s.label}</p>
                                  {s.date ? <p className="text-[13px] lg-ink-soft">{s.date}</p> : s.state === 'now' ? <p className="text-[13px] lg-ink-soft">{isTl ? 'Hinihintay pa' : 'Waiting'}</p> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* details */}
                        <div>
                          <p className="px-1 pb-1.5 text-[13px] font-semibold uppercase tracking-wide lg-ink-soft">{isTl ? 'Detalye' : 'Details'}</p>
                          <div className="lg-card divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                            <div className={rowCls}><span className="text-[15px] lg-ink-soft">{isTl ? 'Report code' : 'Report code'}</span><span className="text-[15px] font-semibold lg-ink tabular-nums">{sel.referralCode}</span></div>
                            <div className={rowCls}><span className="text-[15px] lg-ink-soft">{isTl ? 'Para kay' : 'Reported for'}</span><span className="text-[15px] font-semibold lg-ink text-right">{n.forFriend || (isTl ? 'Sarili ko' : 'Myself')}</span></div>
                            <div className={rowCls}><span className="text-[15px] lg-ink-soft">{isTl ? 'Tungkol kay' : 'About'}</span><span className="text-[15px] font-semibold lg-ink text-right">{n.aboutName || (isTl ? 'Hindi kilala' : 'Name not known')}{n.aboutLooks && <span className="block text-[13px] font-normal lg-ink-soft">{n.aboutLooks}</span>}</span></div>
                          </div>
                        </div>

                        {/* what you wrote: hidden until tapped (someone may be looking at your screen) */}
                        {(n.story || n.photos.length > 0) && (
                          <div>
                            <p className="px-1 pb-1.5 text-[13px] font-semibold uppercase tracking-wide lg-ink-soft">{isTl ? 'Ang isinulat mo' : 'What you wrote'}</p>
                            <div className="lg-card px-4 py-3">
                              {showWrote ? (
                                <>
                                  {n.story && <p className="text-[15px] leading-relaxed lg-ink whitespace-pre-wrap">{n.story}</p>}
                                  {n.photos.length > 0 && <div className="mt-3 flex gap-2 flex-wrap">{n.photos.slice(0, 6).map((src, i) => <img key={i} src={src} alt={`${isTl ? 'Litrato' : 'Photo'} ${i + 1}`} className="w-16 h-16 rounded-xl object-cover" />)}</div>}
                                  <button type="button" onClick={() => setShowWrote(false)} className="mt-3 text-[15px] font-semibold text-[#0A84FF]">{isTl ? 'Itago' : 'Hide'}</button>
                                </>
                              ) : (
                                <button type="button" onClick={() => setShowWrote(true)} className="w-full flex items-center justify-between gap-3 text-left">
                                  <span className="text-[15px] lg-ink-soft">{isTl ? 'Nakatago para sa privacy mo.' : 'Hidden for your privacy.'}</span>
                                  <span className="text-[15px] font-semibold text-[#0A84FF]">{isTl ? 'Ipakita' : 'Show'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* next step */}
                        <p className="px-1 text-[14px] lg-ink-soft">
                          {sel.chatStatus === 'Open'
                            ? isTl ? 'Bukas na ang chat. Pwede mo nang kausapin ang Guidance.' : 'The chat is open. You can talk to Guidance now.'
                            : tone === 'amber'
                            ? isTl ? 'Babasahin ito ng Guidance. Bubuksan nila ang chat kapag tinanggap.' : 'Guidance will read it and open a chat when they accept it.'
                            : tone === 'rose'
                            ? isTl ? 'Pwede kang pumunta sa Guidance Office kung may tanong ka.' : 'You can visit the Guidance Office if you have questions.'
                            : isTl ? 'Hintayin ang Guidance na buksan ang chat.' : 'Wait for Guidance to open the chat.'}
                        </p>
                        {sel.chatStatus === 'Open' && (
                          <button type="button" onClick={() => openConcernChat(sel)} className="m-press w-full h-12 rounded-[14px] bg-[#0A84FF] text-white text-[16px] font-semibold inline-flex items-center justify-center gap-2"><MessageSquare className="w-5 h-5" />{isTl ? 'Buksan ang chat' : 'Open chat'}</button>
                        )}
                      </div>
                    );
                  }
                  const list = history.filter((h) => repFilter === 'all' || repTone(h.status) === repFilter);
                  if (!list.length)
                    return (
                      <p className="px-1 py-6 text-center text-[15px] lg-ink-soft">
                        {isTl ? 'Walang report dito.' : 'No reports here.'}{' '}
                        <button type="button" onClick={() => setRepFilter('all')} className="font-semibold text-[#0A84FF]">{isTl ? 'Ipakita lahat' : 'Show all'}</button>
                      </p>
                    );
                  return (
                    <div className="lg-card overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {list.map((item) => {
                        const tone = repTone(item.status);
                        const word = tone === 'green' ? (isTl ? 'Tinanggap' : 'Accepted') : tone === 'rose' ? (isTl ? 'Hindi tinanggap' : 'Not accepted') : isTl ? 'Sinusuri' : 'Reviewing';
                        return (
                          <button key={item.id} type="button" onClick={() => { setMRepId(item.id); setShowWrote(false); window.scrollTo(0, 0); }} className="m-press w-full px-4 py-3 flex items-center gap-3 text-left">
                            <span className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 lg-status-${tone}`}>
                              {tone === 'green' ? <CheckCircle2 className="w-5 h-5" /> : tone === 'rose' ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-semibold lg-ink truncate">{item.category}</span>
                              <span className="block text-[13px] lg-ink-soft truncate">{d(item.createdAt)} · {word}{unreadChats[String(item.id)] ? (isTl ? ' · may bagong mensahe' : ' · new message') : ''}</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              <div className="hidden lg:grid lg:!mt-0 gap-4">
                {history.filter((h) => repFilter === 'all' || repTone(h.status) === repFilter).length === 0 && (
                  <div className="lg-card p-8 text-center text-[15px] lg-ink-soft">
                    {isTl ? 'Walang report dito.' : 'No reports here.'}{' '}
                    <button type="button" onClick={() => setRepFilter('all')} className="font-semibold text-[#0A84FF]">{isTl ? 'Ipakita lahat' : 'Show all'}</button>
                  </div>
                )}
                {history.filter((h) => repFilter === 'all' || repTone(h.status) === repFilter).map((item) => {
                  const tone = repTone(item.status);
                  const word = tone === 'green' ? (isTl ? 'Tinanggap' : 'Accepted') : tone === 'rose' ? (isTl ? 'Hindi tinanggap' : 'Not accepted') : isTl ? 'Sinusuri ng Guidance' : 'Being reviewed';
                  const n = readNarrative(item.whatHappened);
                  const date = new Date(item.createdAt).toLocaleDateString(isTl ? 'fil-PH' : 'en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
                  const steps = [
                    { label: isTl ? 'Naipadala' : 'Sent', state: 'done' },
                    { label: isTl ? 'Sinusuri' : 'Being reviewed', state: tone === 'amber' ? 'now' : 'done' },
                    { label: tone === 'rose' ? (isTl ? 'Hindi tinanggap' : 'Not accepted') : isTl ? 'Tinanggap' : 'Accepted', state: tone === 'amber' ? 'todo' : tone === 'rose' ? 'bad' : 'done' },
                  ];
                  return (
                    <div key={item.id} className="lg-card p-5 sm:p-6">
                      {/* header */}
                      <div className="flex flex-wrap items-start gap-4">
                        <span className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 lg-status-${tone}`}>
                          {tone === 'green' ? <CheckCircle2 className="w-6 h-6" /> : tone === 'rose' ? <AlertTriangle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[20px] sm:text-[24px] leading-tight font-bold tracking-tight lg-ink">{item.category}</p>
                          <p className="mt-1 text-[14px] lg-ink-soft">{date}</p>
                        </div>
                        <span className={`h-9 px-4 rounded-full inline-flex items-center gap-1.5 text-[14px] font-semibold text-white lg-status-${tone}`}>{word}</span>
                      </div>

                      {/* progress */}
                      <div className="mt-5 grid grid-cols-3 gap-2">
                        {steps.map((s, i) => (
                          <div key={i}>
                            <div className={`h-1.5 rounded-full ${s.state === 'done' ? 'bg-[#30D158]' : s.state === 'now' ? 'bg-[#FF9F0A]' : s.state === 'bad' ? 'bg-[#FF453A]' : 'lg-line'}`} />
                            <p className={`mt-2 text-[13px] ${s.state === 'todo' ? 'lg-ink-soft' : 'font-semibold lg-ink'}`}>{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* details */}
                      <div className="rep-details mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-2xl lg-chip p-4">
                          <p className="text-[12px] font-semibold uppercase tracking-wide lg-ink-soft">{isTl ? 'Report code' : 'Report code'}</p>
                          <p className="mt-1 text-[16px] font-semibold lg-ink tabular-nums">{item.referralCode}</p>
                        </div>
                        <div className="rounded-2xl lg-chip p-4">
                          <p className="text-[12px] font-semibold uppercase tracking-wide lg-ink-soft">{isTl ? 'Para kay' : 'Reported for'}</p>
                          <p className="mt-1 text-[16px] font-semibold lg-ink">{n.forFriend || (isTl ? 'Sarili ko' : 'Myself')}</p>
                        </div>
                        <div className="rounded-2xl lg-chip p-4">
                          <p className="text-[12px] font-semibold uppercase tracking-wide lg-ink-soft">{isTl ? 'Tungkol kay' : 'About'}</p>
                          <p className="mt-1 text-[16px] font-semibold lg-ink">{n.aboutName || (isTl ? 'Hindi kilala' : 'Name not known')}</p>
                          {n.aboutLooks && <p className="text-[13px] lg-ink-soft">{n.aboutLooks}</p>}
                        </div>
                      </div>

                      {/* what they wrote + photos */}
                      {(n.story || n.photos.length > 0) && (
                        <div className="mt-3 rounded-2xl lg-chip p-4">
                          <p className="text-[12px] font-semibold uppercase tracking-wide lg-ink-soft">{isTl ? 'Ang isinulat mo' : 'What you wrote'}</p>
                          {n.story && <p className="mt-1 text-[15px] leading-relaxed lg-ink line-clamp-3">{n.story}</p>}
                          {n.photos.length > 0 && (
                            <div className="mt-3 flex items-center gap-2">
                              {n.photos.slice(0, 4).map((src, i) => <img key={i} src={src} alt={`${isTl ? 'Litrato' : 'Photo'} ${i + 1}`} className="w-14 h-14 rounded-xl object-cover" />)}
                              <span className="text-[13px] lg-ink-soft">{n.photos.length} {isTl ? 'litrato' : n.photos.length === 1 ? 'photo' : 'photos'}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* next step */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[14px] lg-ink-soft">
                          {item.chatStatus === 'Open'
                            ? isTl ? 'Bukas na ang chat. Pwede mo nang kausapin ang Guidance.' : 'The chat is open. You can talk to Guidance now.'
                            : tone === 'amber'
                            ? isTl ? 'Babasahin ito ng Guidance. Bubuksan nila ang chat kapag tinanggap.' : 'Guidance will read it and open a chat when they accept it.'
                            : tone === 'rose'
                            ? isTl ? 'Pwede kang pumunta sa Guidance Office kung may tanong ka.' : 'You can visit the Guidance Office if you have questions.'
                            : isTl ? 'Hintayin ang Guidance na buksan ang chat.' : 'Wait for Guidance to open the chat.'}
                        </p>
                        {item.chatStatus === 'Open' && (
                          <button type="button" onClick={() => openConcernChat(item)} className="h-11 px-5 rounded-full sd-primary text-white text-[15px] font-semibold inline-flex items-center gap-2 active:scale-[0.97] transition-transform duration-150">
                            <MessageSquare className="w-5 h-5" />{isTl ? 'Buksan ang chat' : 'Open chat'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: CONFIDENTIAL GUIDANCE CHAT */}
        {activeTab === 'chat' && (
          <div className={`pt-2 space-y-4 ${mChatOpen ? 'm-chat-open' : ''}`}>
            <div className={`px-1 ${mChatOpen ? 'hidden lg:block' : ''}`}>
              <p className="text-[30px] sm:text-[34px] font-bold tracking-tight lg-ink flex items-center gap-2">Chat{decor && <Parol color="red" className="w-6 h-[38px] -mb-3 text-[#8E8E93]" />}</p>
              <p className="text-[15px] lg-ink-soft">{isTl ? 'Pribadong usapan ninyo ng Guidance Office.' : 'Your private conversation with the Guidance Office.'}</p>
            </div>

            <div className="lg:grid lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:gap-5 space-y-4 lg:space-y-0">
              {/* conversations (one per report) */}
              <div className={`lg-card m-chatlist p-3 lg:h-[calc(var(--sd-vh,100dvh)-252px)] lg:overflow-y-auto ${mChatOpen ? 'hidden lg:block' : ''}`}>
                <p className="hidden lg:block px-2 pt-1 pb-2 text-[13px] font-semibold uppercase tracking-wide lg-ink-soft">{isTl ? 'Mga usapan' : 'Conversations'}</p>
                {history.length === 0 ? (
                  <p className="px-2 pb-2 text-[14px] lg-ink-soft">{isTl ? 'Wala pa. Magsisimula ito kapag tinanggap ang report mo.' : 'None yet. A chat starts when your report is accepted.'}</p>
                ) : (
                  <div className="flex flex-col gap-0 lg:gap-2 pb-1 divide-y lg:divide-y-0 divide-black/[0.06] dark:divide-white/[0.08]">
                    {[...history].sort((a, b) => Number(b.chatStatus === 'Open') - Number(a.chatStatus === 'Open')).map((h) => {
                      // phones: plain Messenger rows (no selected highlight); website: the selected row is blue
                      const on = selectedChatConcern?.id === h.id && window.matchMedia('(min-width: 1024px)').matches;
                      const open = h.chatStatus === 'Open';
                      return (
                        <button key={h.id} type="button" onClick={() => { setSelectedChatConcern(h); setMChatOpen(true); }} aria-pressed={on} className={`m-press w-full rounded-none lg:rounded-2xl px-1 py-3 lg:p-3 text-left flex items-center gap-3 transition-colors duration-150 ${on ? 'bg-[#0A84FF] text-white' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}>
                          <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${on ? 'bg-white/20' : open ? 'nav-c-chat text-white' : 'lg-chip lg-ink-soft'}`}><MessageSquare className="w-5 h-5" /></span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[15px] font-semibold truncate ${on ? 'text-white' : 'lg-ink'}`}>{h.category}</span>
                            <span className={`block text-[13px] truncate ${on ? 'text-white/80' : 'lg-ink-soft'}`}>
                              {open ? (isTl ? 'Bukas ang chat' : 'Chat open') : h.chatStatus === 'Closed' ? (isTl ? 'Sarado na' : 'Closed') : isTl ? 'Hindi pa bukas' : 'Not open yet'} · {h.referralCode}
                            </span>
                          </span>
                          {!on && unreadChats[String(h.id)] ? <span className="h-6 px-2 rounded-full bg-[#FF3B30] text-white text-[12px] font-bold inline-flex items-center shrink-0">{isTl ? 'Bago' : 'New'}</span> : open && !on && <span className="w-2.5 h-2.5 rounded-full bg-[#30D158] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* the conversation */}
              <div className={`lg-card m-conv overflow-hidden flex-col lg:h-[calc(var(--sd-vh,100dvh)-252px)] ${mChatOpen ? 'flex' : 'hidden lg:flex'}`}>
                {!selectedChatConcern ? (
                  <div className="flex-1 min-h-[320px] flex flex-col items-center justify-center text-center p-8">
                    <span className="w-16 h-16 rounded-[22px] nav-c-chat text-white flex items-center justify-center"><MessageSquare className="w-8 h-8" /></span>
                    <p className="mt-4 text-[20px] font-bold lg-ink">{isTl ? 'Pumili ng usapan' : 'Pick a conversation'}</p>
                    <p className="mt-1 text-[15px] lg-ink-soft max-w-sm">{history.length ? (isTl ? 'Pindutin ang isang report sa listahan para makita ang chat.' : 'Tap a report in the list to see its chat.') : isTl ? 'Mag-report muna. Bubuksan ng Guidance ang chat kapag tinanggap nila ito.' : 'Send a report first. Guidance opens a chat when they accept it.'}</p>
                    {!history.length && <button type="button" onClick={() => goTab('submit')} className="mt-5 h-11 px-6 rounded-full sd-primary text-white text-[15px] font-semibold inline-flex items-center gap-2"><Plus className="w-5 h-5" />{isTl ? 'Mag-report' : 'Report a concern'}</button>}
                  </div>
                ) : (
                  <>
                    {/* header */}
                    <div className="px-3 lg:px-5 py-2.5 lg:py-4 flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                      <button type="button" onClick={() => setMChatOpen(false)} aria-label={isTl ? 'Bumalik sa mga usapan' : 'Back to chats'} className="lg:hidden -ml-1 h-10 pr-1 flex items-center text-[#0A84FF] text-[16px]"><ChevronLeft className="w-7 h-7" /></button>
                      <span className="w-10 h-10 lg:w-12 lg:h-12 rounded-full nav-c-chat text-white flex items-center justify-center text-[16px] font-bold shrink-0">GO</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[17px] font-bold lg-ink truncate">Guidance Office</p>
                        <p className="text-[13px] lg-ink-soft truncate">
                          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${selectedChatConcern.chatStatus === 'Open' ? 'bg-[#30D158]' : 'bg-[#8E8E93]'}`} />
                          {selectedChatConcern.chatStatus === 'Open' ? (isTl ? `Sumasagot sa oras ng opisina · ${hoursText}` : `Replies during office hours · ${hoursText}`) : isTl ? 'Sarado ang chat' : 'Chat closed'}
                        </p>
                      </div>
                      <span className="hidden sm:inline-flex h-8 px-3 rounded-full lg-chip text-[13px] font-semibold lg-ink tabular-nums">{selectedChatConcern.referralCode}</span>
                    </div>

                    {/* messages */}
                    <div className="flex-1 min-h-0 sd-chat-scroll overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 space-y-1.5">
                      <p className="mx-auto mb-3 max-w-md text-center text-[12.5px] lg-ink-soft flex items-center justify-center gap-1.5"><ShieldIcon className="w-3.5 h-3.5" />{isTl ? 'Confidential ito. Kayo lang ng Guidance Office ang makakabasa.' : 'This is confidential. Only you and the Guidance Office can read it.'}</p>
                      {loadingMessages ? (
                        <p className="py-10 text-center text-[14px] lg-ink-soft">{isTl ? 'Kinukuha ang mga mensahe...' : 'Loading messages...'}</p>
                      ) : chatMessages.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-[17px] font-semibold lg-ink">{isTl ? 'Wala pang mensahe' : 'No messages yet'}</p>
                          <p className="mt-1 text-[14px] lg-ink-soft">{isTl ? 'Pwede kang magtanong o magdagdag ng detalye.' : 'You can ask a question or add more details.'}</p>
                        </div>
                      ) : (
                        chatMessages.map((msg, i) => {
                          const me = msg.sender === 'student';
                          const d = new Date(msg.createdAt);
                          const prev = chatMessages[i - 1];
                          const newDay = !prev || new Date(prev.createdAt).toDateString() !== d.toDateString();
                          const nextSame = chatMessages[i + 1]?.sender === msg.sender;
                          return (
                            <React.Fragment key={msg.id}>
                              {newDay && <p className="pt-3 pb-2 text-center text-[12.5px] font-semibold lg-ink-soft">{d.toLocaleDateString(isTl ? 'fil-PH' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>}
                              <div className={`flex flex-col ${me ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[80%] sm:max-w-[65%] px-4 py-2.5 text-[15px] leading-snug whitespace-pre-wrap break-words ${me ? 'bg-[#0A84FF] text-white rounded-[20px] rounded-br-md' : 'lg-chip lg-ink rounded-[20px] rounded-bl-md'}`}>{msg.body}</div>
                                {!nextSame && (
                                  <p className="mt-1 mb-2 px-1 text-[12px] lg-ink-soft">
                                    {me ? (isTl ? 'Ikaw' : 'You') : 'Guidance Office'} · {d.toLocaleTimeString(isTl ? 'fil-PH' : 'en-US', { hour: 'numeric', minute: '2-digit' })}
                                    {me && ((chatState?.studentSeenUpTo ?? 0) >= msg.id
                                      ? <> · <span className="font-semibold text-[#0A84FF]">{isTl ? 'Nakita na' : 'Seen'}</span></>
                                      : <> · {isTl ? 'Naipadala' : 'Sent'}</>)}
                                  </p>
                                )}
                              </div>
                            </React.Fragment>
                          );
                        })
                      )}
                      {chatState?.officeTyping && selectedChatConcern.chatStatus === 'Open' && (
                        <div className="flex items-center gap-2" aria-live="polite">
                          <span className="lg-chip rounded-[20px] rounded-bl-md px-4 py-3 inline-flex gap-1" aria-hidden="true">
                            {[0, 1, 2].map((k) => <span key={k} className="w-2 h-2 rounded-full bg-current lg-ink-soft animate-bounce" style={{ animationDelay: `${k * 150}ms` }} />)}
                          </span>
                          <span className="text-[12px] lg-ink-soft">{isTl ? 'Nagta-type ang Guidance...' : 'Guidance is typing...'}</span>
                        </div>
                      )}
                      <div ref={chatScrollRef} />
                    </div>

                    {/* input */}
                    {selectedChatConcern.chatStatus === 'Open' && !openNow && (
                      <p className="px-4 py-2 text-[13px] text-center bg-[#FF9F0A]/[0.12] text-[#B25E00] dark:text-[#FFB340]">{isTl ? 'Sarado ang office ngayon. ' : 'The office is closed now. '}{officeNote}</p>
                    )}
                    {sendFailed && (
                      <p role="alert" className="px-4 py-2 text-[13px] text-center bg-[#FF3B30]/[0.1] text-[#D70015] dark:text-[#FF6961]">{isTl ? 'Hindi naipadala. Tingnan ang internet, tapos pindutin ulit ang Send.' : 'Not sent. Check your internet, then tap Send again.'}</p>
                    )}
                    {selectedChatConcern.chatStatus === 'Open' ? (
                      <form onSubmit={handleSendMessage} className="p-3 sm:p-4 flex items-center gap-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                        <input
                          type="text"
                          placeholder={isTl ? 'Mensahe sa Guidance Office' : 'Message the Guidance Office'}
                          value={chatInputText}
                          onChange={(e) => {
                            setChatInputText(e.target.value);
                            const now = Date.now();
                            if (e.target.value.trim() && now - lastTypingPing.current > 2500) {
                              lastTypingPing.current = now;
                              void setChatTyping(selectedChatConcern.id, 'student');
                            }
                          }}
                          disabled={sendingMsg}
                          aria-label={isTl ? 'Mensahe' : 'Message'}
                          className="flex-1 h-12 px-5 rounded-full cosmic-input text-[15px] focus:outline-none"
                        />
                        <button type="submit" disabled={!chatInputText.trim() || sendingMsg} title={isTl ? 'Ipadala' : 'Send'} aria-label={isTl ? 'Ipadala' : 'Send'} className="w-12 h-12 rounded-full bg-[#0A84FF] text-white flex items-center justify-center shrink-0 disabled:opacity-35 active:scale-[0.94] transition-transform duration-150">
                          {sendingMsg ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      </form>
                    ) : (
                      <p className="p-4 text-center text-[14px] lg-ink-soft border-t border-black/[0.06] dark:border-white/[0.08]">
                        {selectedChatConcern.chatStatus === 'Closed'
                          ? isTl ? 'Isinara na ng Guidance Office ang chat na ito. Mababasa mo pa rin ang mga mensahe.' : 'The Guidance Office closed this chat. You can still read the messages.'
                          : isTl ? 'Bubuksan ng Guidance ang chat kapag tinanggap nila ang report mo.' : 'Guidance will open this chat when they accept your report.'}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer (Messenger-Style Clean: hidden on mobile phones so keyboard never pushes or squishes it) */}
      {/* website: standing rail on the right edge, tabs spread from top to bottom (uses the free side space) */}
      <nav className="hidden lg:flex fixed right-8 top-[112px] bottom-6 z-40 w-[92px] flex-col items-center gap-4" aria-label={isTl ? 'Mga seksyon' : 'Sections'}>
        <div className="lg-capsule flex-1 w-full flex flex-col items-center justify-evenly py-3 rounded-[46px]">
          {([
            ['home', HomeIcon, 'Home'],
            ['history', FolderArchive, isTl ? 'Mga Report' : 'Reports'],
            ['chat', MessageSquare, 'Chat'],
            ['me', UserCircle2, isTl ? 'Ako' : 'Me'],
          ] as const).map(([k, Icon, label]) => {
            const on = activeTab === k;
            return (
              <button key={k} type="button" onClick={() => goTab(k)} aria-current={on ? 'page' : undefined} className="relative w-[76px] h-[76px] flex flex-col items-center justify-center gap-1 rounded-[26px] active:scale-[0.96] transition-transform duration-150">
                <span className={`relative w-[52px] h-[52px] rounded-full flex items-center justify-center nav-float ${on ? 'nav-on nav-c-' + k + ' -translate-x-[26px]' : ''}`}>
                  <Icon className={`w-[26px] h-[26px] ${on ? 'text-white' : 'lg-ink-soft'}`} strokeWidth={on ? 2.3 : 1.8} />
                </span>
                <span className={`relative text-[12px] ${on ? 'font-bold nav-t-' + k : 'font-medium lg-ink-soft'}`}>{label}</span>
                {k === 'chat' && (unreadCount > 0 ? <span title={isTl ? 'May bagong mensahe' : 'New message'} className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF3B30] text-white text-[11px] font-bold leading-[18px] text-center ring-2 ring-white/70">{unreadCount}</span> : openChats > 0 && <span className="absolute top-3 right-4 w-2.5 h-2.5 rounded-full bg-[#30D158] ring-2 ring-white/60" />)}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => goTab('submit')} aria-label={isTl ? 'Mag-report' : 'Report a concern'} title={isTl ? 'Mag-report' : 'Report a concern'} className={`lg-capsule shrink-0 w-[84px] h-[84px] rounded-full flex items-center justify-center active:scale-[0.95] transition-transform duration-150 ${activeTab === 'submit' ? 'ring-2 ring-[#0A84FF]/60' : ''}`}>
          <span className="w-[60px] h-[60px] rounded-full lg-plus flex items-center justify-center"><Plus className="w-7 h-7 text-white" strokeWidth={2.4} /></span>
        </button>
      </nav>

      {/* phones + tablets: a real app tab bar, fixed to the bottom, full width ("+ Report" in the middle) */}
      <nav className="m-tabbar lg:hidden fixed bottom-0 inset-x-0 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label={isTl ? 'Mga seksyon' : 'Sections'}>
        <div className="h-[58px] grid grid-cols-5 items-stretch max-w-xl mx-auto">
          {([
            ['home', HomeIcon, 'Home'],
            ['history', FolderArchive, isTl ? 'Mga Report' : 'Reports'],
            ['submit', Plus, isTl ? 'Mag-report' : 'Report'],
            ['chat', MessageSquare, 'Chat'],
            ['me', UserCircle2, isTl ? 'Ako' : 'Me'],
          ] as const).map(([k, Icon, label]) => {
            const on = activeTab === k;
            if (k === 'submit')
              return (
                <button key={k} type="button" onClick={() => goTab('submit')} aria-label={isTl ? 'Mag-report' : 'Report a concern'} className="flex flex-col items-center justify-center gap-0.5">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center bg-[#0A84FF] text-white ${on ? 'ring-4 ring-[#0A84FF]/20' : ''}`}><Plus className="w-[22px] h-[22px]" strokeWidth={2.6} /></span>
                </button>
              );
            return (
              <button key={k} type="button" onClick={() => { if (k === 'chat') setMChatOpen(false); if (k === 'history') { setMRepId(null); setShowWrote(false); } goTab(k); }} aria-current={on ? 'page' : undefined} className="relative flex flex-col items-center justify-center gap-[3px]">
                <Icon className={`w-6 h-6 ${on ? 'text-[#0A84FF]' : 'text-[#8E8E93]'}`} strokeWidth={on ? 2.2 : 1.8} />
                <span className={`text-[10.5px] leading-none ${on ? 'font-semibold text-[#0A84FF]' : 'font-medium text-[#8E8E93]'}`}>{label}</span>
                {k === 'chat' && (unreadCount > 0 ? <span title={isTl ? 'May bagong mensahe' : 'New message'} className="absolute top-1.5 left-1/2 ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF3B30] text-white text-[11px] font-bold leading-[18px] text-center">{unreadCount}</span> : openChats > 0 && <span className="absolute top-2 left-1/2 ml-2 w-2 h-2 rounded-full bg-[#30D158]" />)}
              </button>
            );
          })}
        </div>
      </nav>

      <footer className="relative z-20 py-3 text-center text-xs card-subtitle-text mt-auto student-footer hidden md:block">
        AICS Montalban Student Guidance Office · All submissions are strictly confidential (RA 10173 Protected)
      </footer>

      {/* Success Submission Modal */}
      <AnimatePresence>
        {submittedConcernCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              role="dialog"
              aria-modal="true"
              className="w-full max-w-[440px] rounded-[32px] bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-white p-7 text-center shadow-2xl"
            >
              <span className="mx-auto w-20 h-20 rounded-full bg-[#30D158] text-white flex items-center justify-center shadow-[0_14px_30px_-12px_rgba(48,209,88,0.8)]">
                <CheckCircle2 className="w-11 h-11" strokeWidth={2.2} />
              </span>
              <h3 className="mt-5 text-[26px] leading-tight font-bold tracking-tight">{isTl ? 'Naipadala na!' : 'Report sent'}</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-[#6E6E73] dark:text-[#A1A1A6]">
                {isTl ? 'Natanggap na ng Guidance Office ang report mo. Confidential ito.' : 'The Guidance Office has your report. It stays confidential.'}
              </p>
              <div className="mt-5 rounded-[22px] bg-black/[0.04] dark:bg-white/[0.06] p-4">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-[#6E6E73] dark:text-[#A1A1A6]">{isTl ? 'Report code mo' : 'Your report code'}</p>
                <p className="mt-1 text-[24px] font-bold tracking-tight tabular-nums">{submittedConcernCode}</p>
              </div>
              <p className="mt-4 text-[14px] text-[#6E6E73] dark:text-[#A1A1A6]">
                {isTl ? 'Susunod: susuriin ito ng Guidance. Bubuksan nila ang chat kapag tinanggap.' : 'Next: Guidance reviews it and opens a chat when they accept it.'}
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <button type="button" onClick={() => { soundFX.playToggleSwitch(true); setSubmittedConcernCode(null); setActiveTab('history'); }} className="h-14 rounded-full sd-primary text-white text-[16px] font-semibold">
                  {isTl ? 'Tingnan ang report ko' : 'See my report'}
                </button>
                <button type="button" onClick={() => { setSubmittedConcernCode(null); setActiveTab('home'); }} className="h-12 rounded-full text-[16px] font-semibold text-[#0A84FF]">
                  {isTl ? 'Bumalik sa Home' : 'Back to Home'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guideline / Onboarding Tour Modal */}
      <MobileAppTourModal
        isOpen={showMobileTour}
        defaultLanguage={isTl ? 'tl' : 'en'}
        onComplete={() => {
          localStorage.setItem('aics_mobile_tour_completed', 'true');
          setShowMobileTour(false);
        }}
      />
    </div>
  );
};
