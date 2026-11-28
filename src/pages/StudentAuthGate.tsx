import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import jsPDF from 'jspdf';
import { PrivacyTerms, LegalLinks, type LegalTab } from '../components/legal/PrivacyTerms';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  FileText,
  Shield,
  Check,
  RefreshCw,
  Download,
  XCircle,
  CheckCircle2,
  ChevronDown,
  Search,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Mail,
  Phone,
  BookOpen,
} from 'lucide-react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabaseClient';
import { StudentPairInteractiveWing } from '../components/auth/StudentEncouragementWing';
import { soundFX } from '../services/soundEngine';
import { isCapacitorNativeApp } from '../services/devicePerformance';
import { SkyThemePill, useTheme } from '../context/ThemeContext';
import { LocaleSwitchPill, useLanguage } from '../context/LanguageContext';
import { CloudflareTurnstile } from '../components/auth/CloudflareTurnstile';
import { ChristmasLights, HollySprig } from '../components/student/ChristmasDecor';
import { christmasOn } from '../config/seasonalTheme';
import { CelestialBackground } from '../components/auth/CelestialBackground';
import { WavyBackground } from '../components/auth/WavyBackground';
import { compressImageClientSide } from '../services/imageOptimizer';
import {
  StudentPortalUser,
  registerStudentPortalAccount,
  loginStudentPortal,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
} from '../services/studentAuthService';
import { studentLoginRateLimiter, studentForgotRateLimiter, studentRegisterRateLimiter } from '../services/rateLimiter';

/** Student ID box: numbers only, max 6, a dash after the first 2 (23-0001); erasing removes the dash too. */
const maskStudentId = (next: string, prev: string) => {
  const d = next.replace(/\D/g, '').slice(0, 6);
  const erasing = next.length < prev.length;
  return d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d.length === 2 && !erasing ? `${d}-` : d;
};
/** The masterlist keeps IDs without the dash (230001). */
const idForDb = (v: string) => (/^\d{2}-\d*$/.test(v.trim()) ? v.trim().replace('-', '') : v.trim());

export type PortalAuthMode = 'login' | 'register' | 'forgot';

// 15 Psychiatrist-backed anti-bullying & freedom of speech affirmations
const MENTAL_HEALTH_AFFIRMATIONS = [
  {
    en: 'Every concern deserves care and genuine attention.',
    tl: 'Bawat hinaing at alalahanin mo ay karapat-dapat sa kalinga.',
  },
  {
    en: 'Speaking up against harm is an act of courage, not tattling.',
    tl: 'Hindi pagiging sumbungero ang pagtindig sa sarili at sa kapwa.',
  },
  {
    en: 'You have every right to learn in peace—free from fear and intimidation.',
    tl: 'May karapatan kang mag-aral nang walang takot, kaba, o panghihiya.',
  },
  {
    en: 'Your identity is strictly guarded; you are completely safe to speak here.',
    tl: '100% Protektado ang pagkakakilanlan mo; ligtas kang magsalita rito.',
  },
  {
    en: "You are never to blame for someone else's cruelty or abusive words.",
    tl: 'Hindi mo kasalanan kung bakit ka nila tinatrato nang mali.',
  },
  {
    en: 'Admitting you are hurt is never a weakness; it is honoring your truth.',
    tl: 'Hindi kabawasan sa pagkatao ang pag-amin na ikaw ay nasasaktan.',
  },
  {
    en: "Never let anyone's cruel words define your worth or dim your light.",
    tl: 'Huwag mong hayaang burahin ng panunukso ng iba ang iyong tunay na halaga.',
  },
  {
    en: 'Your voice holds the real power to put an end to unfair treatment.',
    tl: 'Ang iyong boses ay may kapangyarihang patigilin ang pang-aapi.',
  },
  {
    en: 'Online cyberbullying or on-campus harassment: we take immediate action.',
    tl: 'Online man o sa campus, bawal ang pambu-bully. Handa kaming umaksyon.',
  },
  {
    en: 'You are never facing this alone; the Guidance team stands firmly beside you.',
    tl: 'Hindi ka nag-iisa sa labang ito; kaagapay mo ang AICS Guidance.',
  },
  {
    en: 'You possess the absolute freedom of speech to be heard with full respect.',
    tl: 'May karapatan kang magsalita, magpahayag, at pakinggan nang buo.',
  },
  {
    en: 'No concern is too petty or shallow; if it pains you, it deeply matters.',
    tl: "Walang maliit o mababaw na reklamo; kung nasasaktan ka, mahalaga 'yon.",
  },
  {
    en: 'Silence should never be the price you pay for keeping the peace.',
    tl: 'Hindi solusyon ang pananahimik kung ang kapalit ay ang iyong kapayapaan.',
  },
  {
    en: 'We are here to uphold justice, provide gentle guidance, and foster healing.',
    tl: 'Nandito kami para magbigay ng katarungan, paggabay, at paghilom.',
  },
  {
    en: 'Your story is safe. You have the freedom to be unapologetically you.',
    tl: 'Ligtas ang iyong kwento. Malaya kang maging ikaw sa AICS.',
  },
];

interface StudentAuthGateProps {
  onLoginSuccess: (user: StudentPortalUser) => void;
}

export const StudentAuthGate: React.FC<StudentAuthGateProps> = ({
  onLoginSuccess,
}) => {
  const { locale } = useLanguage();
  const { theme } = useTheme();
  const isNight = theme === 'dark';
  const xmas = christmasOn();
  // No sounds at all on Sign In, Forgot Password and Create Account (user, 2026-11-20): faster and quieter.
  // ...and no animations (user, 2026-11-20): html.auth-still stops CSS motion, MotionConfig stops Framer Motion
  useEffect(() => {
    soundFX.muted = false;
  }, []);
  // big-screen-only decorations are not mounted at all on phones / the APK (they used to run hidden)
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches && !document.body.classList.contains('capacitor-mobile'));
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(mq.matches && !document.body.classList.contains('capacitor-mobile'));
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  // the light/dark toggle crossfades the whole login screen instead of the circle reveal
  // website only (1024px and up, not the APK): the phone keeps its own toggle animation
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => root.classList.toggle('theme-xfade', xmas && mq.matches && !document.body.classList.contains('capacitor-mobile'));
    sync();
    mq.addEventListener('change', sync);
    return () => { mq.removeEventListener('change', sync); root.classList.remove('theme-xfade'); };
  }, []);
  const isTl = locale === 'tl';

  const [mode, setMode] = useState<PortalAuthMode>('login');

  // Carousel state for rotating psychiatrist mental health & anti-bullying affirmations
  // one message per visit (no rotating carousel: it re-drew the whole page every few seconds)
  const [affirmationIndex] = useState(() => Math.floor(Math.random() * MENTAL_HEALTH_AFFIRMATIONS.length));
  const [, setIsCarouselPaused] = useState(false);

  // ==========================================
  // LOGIN FORM STATE & SECURITY
  // ==========================================
  const [loginStudentNumber, setLoginStudentNumber] = useState('');
  const [showLoginId, setShowLoginId] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginErrorTitle, setLoginErrorTitle] = useState<string | null>(null);
  const [loginErrorField, setLoginErrorField] = useState<'id' | 'password' | null>(null);
  const [loginTriesLeft, setLoginTriesLeft] = useState<number | null>(null);

  // Invisible Honeypot Anti-Bot Traps (Real students never see or fill these)
  const [loginHoneypot, setLoginHoneypot] = useState('');
  const [regHoneypot, setRegHoneypot] = useState('');
  const [forgotHoneypot, setForgotHoneypot] = useState('');

  // Rate Limiting Cooldown Seconds
  const [loginCooldownSeconds, setLoginCooldownSeconds] = useState(0);
  const [forgotCooldownSeconds, setForgotCooldownSeconds] = useState(0);

  // Cloudflare Turnstile Token State
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0); // bump = fresh Cloudflare box (each token works once)
  const [turnstileBroken, setTurnstileBroken] = useState(false);
  const CLOUDFLARE_SITE_KEY = '0x4AAAAAAGAqyhAW68d155yA';

  // PWA & Mobile App Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    soundFX.playToggleSwitch(true);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setCanInstall(false);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        isTl
          ? 'Para i-install ang AICS Report Concern sa iyong cellphone: Pindutin ang tatlong tuldok (⋮) sa browser at piliin ang "Install app" o "Add to Home screen"!'
          : 'To install AICS Report Concern on your phone: Tap the browser menu (⋮) and select "Install app" or "Add to Home screen"!'
      );
    }
  };

  // Check rate limit timer tick - Highly optimized to never trigger re-renders unless locked
  useEffect(() => {
    const checkLimits = () => {
      const loginStatus = studentLoginRateLimiter.isLocked();
      const forgotStatus = studentForgotRateLimiter.isLocked();

      setLoginCooldownSeconds((prev) => (prev !== loginStatus.remainingSeconds ? loginStatus.remainingSeconds : prev));
      setForgotCooldownSeconds((prev) => (prev !== forgotStatus.remainingSeconds ? forgotStatus.remainingSeconds : prev));
    };

    checkLimits();
    const interval = setInterval(checkLimits, 1000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // REGISTER FORM STATE
  // ==========================================
  const [regGradeLevel, setRegGradeLevel] = useState('11');
  const [regStudentNumber, setRegStudentNumber] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regMiddleInitial, setRegMiddleInitial] = useState('');
  const [regContactNumber, setRegContactNumber] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStrand, setRegStrand] = useState('ICT');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regQuickPin, setRegQuickPin] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Available students list from masterlist (excluding already-registered portal accounts)
  const [allMasterlistStudents, setAllMasterlistStudents] = useState<Array<{ student_number: string; full_name: string; grade_section: string; parent_phone?: string; parent_email?: string }>>([]);
  const [registeredNumbers, setRegisteredNumbers] = useState<Set<string>>(new Set());
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  // Load masterlist and registered accounts
  useEffect(() => {
    let mounted = true;
    const loadStudentData = async () => {
      try {
        const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
        const [studRes, portalRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/students?select=student_number,full_name,grade_section,parent_phone,parent_email&order=student_number.asc&limit=1000`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/portal_accounts?select=student_number`, { headers }),
        ]);
        if (mounted && studRes.ok) {
          const sData = await studRes.json();
          setAllMasterlistStudents(sData || []);
        }
        if (mounted && portalRes.ok) {
          const pData = await portalRes.json();
          const pSet = new Set<string>((pData || []).map((p: any) => String(p.student_number || '').trim()));
          setRegisteredNumbers(pSet);
        }
      } catch (err) {
        console.error('Failed to load student directory for registration:', err);
      }
    };
    loadStudentData();
    return () => { mounted = false; };
  }, [mode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(e.target as Node)) {
        setStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter available students: match selected Grade Level, exclude registered, match search (with or without dash e.g. "250020" or "25-0020" or "20")
  const availableStudentsForGrade = useMemo(() => {
    const gradePrefix = regGradeLevel === '11' ? '25-' : '26-';
    const cleanSearch = studentSearchQuery.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    return allMasterlistStudents.filter((s) => {
      const sNum = String(s.student_number || '').trim();
      const numClean = sNum.replace('-', '').toLowerCase();
      // Exclude if already registered
      if (registeredNumbers.has(sNum) || registeredNumbers.has(numClean)) return false;
      // Filter by Grade Level
      if (!sNum.startsWith(gradePrefix) && !s.grade_section?.includes(`Grade ${regGradeLevel}`)) return false;
      // Search filter: matches with dash, without dash, by number, or by student name
      if (cleanSearch) {
        const nameClean = (s.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchNum = numClean.includes(cleanSearch) || sNum.toLowerCase().includes(cleanSearch);
        const matchName = nameClean.includes(cleanSearch);
        return matchNum || matchName;
      }
      return true;
    });
  }, [allMasterlistStudents, registeredNumbers, regGradeLevel, studentSearchQuery]);

  // Handle student selection from dropdown with automatic fillup
  const handleSelectStudentNumber = (s: { student_number: string; full_name: string; grade_section: string; parent_phone?: string; parent_email?: string }) => {
    soundFX.playStepUnlock();
    setRegStudentNumber(s.student_number);
    setStudentDropdownOpen(false);
    setStudentSearchQuery('');

    // Parse LAST NAME, FIRST NAME MIDDLE INITIAL.
    // e.g. "RAMOS, LEXTER F." -> Last: "RAMOS", First: "LEXTER", MI: "F."
    const parts = (s.full_name || '').split(',');
    if (parts.length >= 2) {
      const lName = parts[0].trim();
      const rest = parts[1].trim().split(' ');
      const mi = rest.length > 1 && rest[rest.length - 1].length <= 2 ? rest.pop() || '' : '';
      const fName = rest.join(' ').trim();
      setRegLastName(lName);
      setRegFirstName(fName);
      setRegMiddleInitial(mi.replace('.', ''));
    } else {
      setRegLastName(s.full_name || '');
    }

    // Auto-detect strand from grade_section (e.g. "Grade 11 - STEM 2")
    if (s.grade_section) {
      if (s.grade_section.includes('STEM')) setRegStrand('STEM');
      else if (s.grade_section.includes('ICT')) setRegStrand('ICT');
      else if (s.grade_section.includes('ABM')) setRegStrand('ABM');
      else if (s.grade_section.includes('HUMSS')) setRegStrand('HUMSS');
      else if (s.grade_section.includes('GAS')) setRegStrand('GAS');
    }

    // Default contact if present
    if (s.parent_phone && !regContactNumber) {
      setRegContactNumber(s.parent_phone);
    }
  };

  // Privacy Terms & Conditions Modal State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  // Privacy & Terms page (Privacy Notice · Terms of Use · Browser storage)
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);

  // ID & Photo Verification State
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [studentIdPreview, setStudentIdPreview] = useState<string | null>(null);

  // Live Personal Face Photo State
  const [personalPhotoFile, setPersonalPhotoFile] = useState<File | null>(null);
  const [personalPhotoPreview, setPersonalPhotoPreview] = useState<string | null>(null);

  // Camera Modal State
  const [activeCameraModal, setActiveCameraModal] = useState<'id' | 'personal' | null>(null);

  // Device Detection: Is user on mobile/tablet or desktop/laptop
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|iphone|ipad|ipod|windows phone|mobile/i.test(ua) || window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobileDevice(/android|iphone|ipad|ipod|windows phone|mobile/i.test(ua) || (window.innerWidth < 768 && isTouch));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Friendly human-readable database error parser (strips Postgres / JSON raw syntax)
  const formatFriendlyRegError = (rawErr: string): string => {
    if (!rawErr) return isTl ? 'Hindi nagawa ang account. Subukan ulit.' : 'Account registration failed. Please try again.';
    const lower = rawErr.toLowerCase();
    if (lower.includes('unique') || lower.includes('duplicate') || lower.includes('already exists') || lower.includes('student_number')) {
      return isTl
        ? 'May nakarehistro nang account gamit ang Student ID na ito. Kung sa iyo ito, subukang mag-login o gamitin ang Forgot Password.'
        : 'An account is already registered with this Student ID. If this is yours, please sign in or use Forgot Password.';
    }
    if (lower.includes('email') && (lower.includes('unique') || lower.includes('already exists'))) {
      return isTl
        ? 'Nagamit na ang Gmail address na ito sa ibang account. Pakisuyong gumamit ng ibang personal Gmail.'
        : 'This Gmail address is already registered to another account. Please use a different Gmail.';
    }
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
      return isTl
        ? 'Nawalan ng koneksyon sa server. I-check ang internet connection at subukan muli.'
        : 'Network connection failed. Please check your internet connection and try again.';
    }
    if (lower.includes('quick_pin_hash') || lower.includes('column')) {
      return isTl
        ? 'Nagkaroon ng pag-update sa server database. Naisulong na ang fallback, pakisubukang i-click muli ang Create Account.'
        : 'Server database schema updated. Fallback engaged, please click Create Account once more.';
    }
    return rawErr.replace(/\{[^}]*\}/g, '').replace(/Database insert failed:\s*/i, '').trim() || (isTl ? 'May naganap na error sa pagrehistro. Pakisubukang muli.' : 'A registration error occurred. Please try again.');
  };
  const [regStatusModal, setRegStatusModal] = useState<{
    type: 'error' | 'success';
    title: string;
    message: string;
    details?: string[];
  } | null>(null);
  const [show20sScanner, setShow20sScanner] = useState(false);
  const [scanPendingAccount, setScanPendingAccount] = useState<any>(null);
  const [scanForcedError, setScanForcedError] = useState<string | null>(null);

  // Success Modal State with Credential Preview & PDF Backup
  const [successData, setSuccessData] = useState<{
    username: string;
    account: StudentPortalUser;
    plainPassword?: string;
  } | null>(null);
  const [showBackupPassword, setShowBackupPassword] = useState(false);
  const [postRegPinStep, setPostRegPinStep] = useState<boolean>(false);
  const [postRegPinInput, setPostRegPinInput] = useState<string>('');
  const [postRegPinError, setPostRegPinError] = useState<string | null>(null);

  // Download PDF Backup of Account Credentials
  const downloadCredentialBackupPdf = () => {
    soundFX.playToggleSwitch(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a6', // Clean compact pocket-sized ID card format (105 x 148 mm)
      });

      // Background header fill
      doc.setFillColor(11, 30, 72); // Deep AICS Blue #0B1E48
      doc.rect(0, 0, 105, 32, 'F');

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('AICS MONTALBAN BRANCH', 52.5, 12, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(155, 203, 255);
      doc.text('GUIDANCE & DISCIPLINE OFFICE', 52.5, 18, { align: 'center' });
      doc.text('STUDENT PORTAL LOGIN BACKUP CARD', 52.5, 24, { align: 'center' });

      // Body Card Container
      doc.setDrawColor(210, 225, 245);
      doc.setFillColor(248, 250, 253);
      doc.roundedRect(6, 36, 93, 76, 3, 3, 'FD');

      // Student Full Name
      const fullName = `${regLastName}, ${regFirstName} ${regMiddleInitial ? regMiddleInitial + '.' : ''}`.trim();
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(fullName || 'STUDENT ACCOUNT', 10, 44);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Grade ${regGradeLevel} · ${regStrand}`, 10, 50);

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.line(10, 53, 95, 53);

      // Student ID Box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('STUDENT NUMBER (USERNAME):', 10, 60);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(14, 116, 144); // Sky cyan #0E7490
      doc.text(regStudentNumber || successData?.username || '—', 10, 67);

      // Gmail Box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('REGISTERED GMAIL ADDRESS:', 10, 75);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(regEmail || '—', 10, 81);

      // Password Box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('ACCOUNT PASSWORD:', 10, 89);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(225, 29, 72); // Rose/Crimson
      doc.text(successData?.plainPassword || regPassword || '••••••••', 10, 96);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Date Created: ' + new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' }), 10, 106);

      // Security Notice Footer
      doc.setFillColor(254, 243, 199); // Amber tint
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(6, 115, 93, 26, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(146, 64, 14);
      doc.text('PAUNAWA / CONFIDENTIALITY NOTICE:', 10, 121);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 53, 15);
      doc.text('1. Itabi at huwag ibahagi ang dokumentong ito sa kaklase.', 10, 126);
      doc.text('2. Gamitin ang Student ID at Password para makapag-log in.', 10, 130);
      doc.text('3. Protektado sa ilalim ng RA 10173 (Data Privacy Act of 2012).', 10, 134);

      doc.save(`AICS_Login_Credentials_${regStudentNumber || 'Student'}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF backup:', err);
    }
  };

  // ==========================================
  // FORGOT PASSWORD STATE
  // ==========================================
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // ==========================================
  // LIVE VALIDATION STATUSES (Not Input, Wrong, Correct)
  // ==========================================

  // 1. Last Name & First Name
  const lastNameStatus = useMemo(() => {
    if (!regLastName.trim()) return { type: 'not_input', label: 'Not Input' };
    if (regLastName.trim().length < 2) return { type: 'wrong', label: 'Min 2 letters' };
    return { type: 'correct', label: 'Correct' };
  }, [regLastName]);

  const firstNameStatus = useMemo(() => {
    if (!regFirstName.trim()) return { type: 'not_input', label: 'Not Input' };
    if (regFirstName.trim().length < 2) return { type: 'wrong', label: 'Min 2 letters' };
    return { type: 'correct', label: 'Correct' };
  }, [regFirstName]);

  // 2. Middle Initial
  const miStatus = useMemo(() => {
    if (!regMiddleInitial.trim()) return { type: 'not_input', label: 'Optional' };
    if (regMiddleInitial.trim().length > 2) return { type: 'wrong', label: 'Max 2 chars' };
    return { type: 'correct', label: 'OK' };
  }, [regMiddleInitial]);

  // 3. Contact Number: Must start with 09 and be exactly 11 digits
  const phoneStatus = useMemo(() => {
    const raw = regContactNumber.trim().replace(/\D/g, '');
    if (!raw) return { type: 'not_input', label: 'Not Input' };
    if (!raw.startsWith('09')) return { type: 'wrong', label: 'Must start with 09' };
    if (raw.length !== 11) return { type: 'wrong', label: `${raw.length}/11 digits` };
    return { type: 'correct', label: 'Correct (11 digits)' };
  }, [regContactNumber]);

  // 4. Personal Gmail Account (Used for contact & password recovery)
  const emailStatus = useMemo(() => {
    const e = regEmail.trim().toLowerCase();
    if (!e) return { type: 'not_input', label: 'Not Input' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(e)) return { type: 'wrong', label: 'Invalid Email' };
    if (!e.endsWith('@gmail.com')) return { type: 'wrong', label: 'Must be @gmail.com' };
    return { type: 'correct', label: 'Valid Gmail' };
  }, [regEmail]);

  // 5. Student Number
  const studentNumberStatus = useMemo(() => {
    const num = regStudentNumber.trim();
    if (!num) return { type: 'not_input', label: 'Not Input' };
    if (num.replace(/\D/g, '').length !== 6) return { type: 'wrong', label: 'Needs 6 digits' };
    return { type: 'correct', label: 'Correct' };
  }, [regStudentNumber]);

  // 6. Uploaded / Captured Student Verification ID
  const studentIdStatus = useMemo(() => {
    if (!studentIdFile) return { type: 'not_input', label: isMobileDevice ? 'Live Cam Required' : 'Not Uploaded' };
    return { type: 'correct', label: 'Added' };
  }, [studentIdFile, isMobileDevice]);

  // 6b. Live Personal Face Photo
  const personalPhotoStatus = useMemo(() => {
    if (!personalPhotoFile) return { type: 'not_input', label: isMobileDevice ? 'Live Selfie Required' : 'Not Uploaded' };
    return { type: 'correct', label: 'Added' };
  }, [personalPhotoFile, isMobileDevice]);

  // 7. Password: 6+ characters, >=1 number, >=1 uppercase, >=1 special char
  const passwordCriteria = useMemo(() => {
    const p = regPassword;
    return {
      length: p.length >= 6,
      number: /\d/.test(p),
      uppercase: /[A-Z]/.test(p),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
    };
  }, [regPassword]);

  const passwordStatus = useMemo(() => {
    if (!regPassword) return { type: 'not_input', label: 'Not Input' };
    const allPassed =
      passwordCriteria.length &&
      passwordCriteria.number &&
      passwordCriteria.uppercase &&
      passwordCriteria.special;
    if (!allPassed) return { type: 'wrong', label: 'Weak password' };
    return { type: 'correct', label: 'Strong Password' };
  }, [regPassword, passwordCriteria]);

  // 8. Confirm Password
  const confirmPasswordStatus = useMemo(() => {
    if (!regConfirmPassword) return { type: 'not_input', label: 'Not Input' };
    if (regConfirmPassword !== regPassword) return { type: 'wrong', label: 'Do not match' };
    return { type: 'correct', label: 'Matched' };
  }, [regConfirmPassword, regPassword]);

  // Check if form is ready to submit (Student ID card is no longer required as face selfie is captured)
  const isRegisterFormValid =
    lastNameStatus.type === 'correct' &&
    firstNameStatus.type === 'correct' &&
    phoneStatus.type === 'correct' &&
    emailStatus.type === 'correct' &&
    studentNumberStatus.type === 'correct' &&
    passwordStatus.type === 'correct' &&
    confirmPasswordStatus.type === 'correct';

  // ==========================================
  // ADAPTIVE VISUAL INPUT FEEDBACK (RED, ORANGE, GREEN)
  // - Green: 100% Valid & Complete
  // - Orange: Almost Complete / In-Progress (e.g. 09XX typing, user@g... typing, password 4-5 chars)
  // - Red: Invalid / Incorrect format when user entered data
  // - Neutral: Untouched / empty
  // ==========================================

  // Contact Number: 09XX and 11 digits
  const contactFeedback = useMemo<{ state: 'empty' | 'valid' | 'progress' | 'error'; label: string }>(() => {
    const raw = regContactNumber.trim().replace(/\D/g, '');
    if (!raw) return { state: 'empty', label: '' };
    if (!raw.startsWith('09')) {
      return { state: 'error', label: isTl ? 'Mali: Dapat magsimula sa 09' : 'Invalid: Must start with 09' };
    }
    if (raw.length === 11) {
      return { state: 'valid', label: isTl ? 'Tama: 11-digit mobile number' : 'Correct: 11-digit mobile number' };
    }
    if (raw.length < 11) {
      const remaining = 11 - raw.length;
      return {
        state: 'progress',
        label: isTl
          ? `Kulang pa: ${raw.length}/11 digits (mag-type pa ng ${remaining})`
          : `Almost complete: ${raw.length}/11 digits (type ${remaining} more)`,
      };
    }
    return { state: 'error', label: isTl ? 'Mali: Lumagpas sa 11 digits' : 'Invalid: Exceeded 11 digits' };
  }, [regContactNumber, isTl]);

  // Gmail: Personal Gmail account
  const emailFeedback = useMemo<{ state: 'empty' | 'valid' | 'progress' | 'error'; label: string }>(() => {
    const e = regEmail.trim().toLowerCase();
    if (!e) return { state: 'empty', label: '' };
    if (e.endsWith('@gmail.com') && e.length > 10 && /^[^\s@]+@gmail\.com$/.test(e)) {
      return { state: 'valid', label: isTl ? 'Tama: Valid personal Gmail' : 'Correct: Valid personal Gmail' };
    }
    if (e.includes('@') && !e.endsWith('@gmail.com')) {
      return {
        state: 'progress',
        label: isTl ? 'Kulang pa: Dapat magtapos sa @gmail.com' : 'Almost there: Must end with @gmail.com',
      };
    }
    if (e.length >= 3) {
      return {
        state: 'progress',
        label: isTl ? 'Kulang pa: Dugtungan ng @gmail.com' : 'In progress: Append @gmail.com',
      };
    }
    return { state: 'progress', label: isTl ? 'Kulang pa: Ilagay ang buong Gmail' : 'In progress: Enter full Gmail' };
  }, [regEmail, isTl]);

  // Password: 6+ chars, number, uppercase, special
  const passwordFeedback = useMemo<{ state: 'empty' | 'valid' | 'progress' | 'error'; label: string }>(() => {
    if (!regPassword) return { state: 'empty', label: '' };
    const allPassed =
      passwordCriteria.length &&
      passwordCriteria.number &&
      passwordCriteria.uppercase &&
      passwordCriteria.special;
    if (allPassed) {
      return { state: 'valid', label: isTl ? 'Tama: Malakas at ligtas na password' : 'Correct: Strong password' };
    }
    if (regPassword.length >= 4) {
      return {
        state: 'progress',
        label: isTl ? 'Kulang pa: Kumpletuhin ang checklist sa ibaba' : 'Almost there: Complete the checklist below',
      };
    }
    return { state: 'error', label: isTl ? 'Mali: Masyadong maikli (min 6 chars)' : 'Invalid: Too short (min 6 chars)' };
  }, [regPassword, passwordCriteria, isTl]);

  // Confirm password
  const confirmPasswordFeedback = useMemo<{ state: 'empty' | 'valid' | 'progress' | 'error'; label: string }>(() => {
    if (!regConfirmPassword) return { state: 'empty', label: '' };
    if (regConfirmPassword === regPassword && regPassword.length >= 6) {
      return { state: 'valid', label: isTl ? 'Tama: Eksaktong tumugma' : 'Correct: Exact match' };
    }
    if (regPassword.startsWith(regConfirmPassword) || regConfirmPassword.startsWith(regPassword)) {
      return {
        state: 'progress',
        label: isTl ? 'Kulang pa: Ituloy ang pag-type hanggang tumugma' : 'Almost there: Continue typing to match',
      };
    }
    return { state: 'error', label: isTl ? 'Mali: Hindi tumutugma sa password' : 'Invalid: Does not match password' };
  }, [regConfirmPassword, regPassword, isTl]);

  // Helper for adaptive border & background styling
  const getFieldBorderClass = (state: 'empty' | 'valid' | 'progress' | 'error', isLocked = false) => {
    if (isLocked) {
      return 'border-sky-500/40 bg-sky-950/20 text-slate-200 cursor-not-allowed select-none opacity-90';
    }
    switch (state) {
      case 'valid':
        return 'border-emerald-500 bg-emerald-500/10 text-white shadow-[0_0_14px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/40';
      case 'progress':
        return 'border-amber-400 bg-amber-400/10 text-white shadow-[0_0_14px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/40';
      case 'error':
        return 'border-rose-500 bg-rose-500/10 text-white shadow-[0_0_14px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/40';
      default:
        return 'border-white/15 focus:border-sky-400 bg-black/30 text-white';
    }
  };

  // Status Badge Component: High-contrast clear feedback tag
  const renderStatusBadge = (feedback: { state: 'empty' | 'valid' | 'progress' | 'error'; label: string }) => {
    if (feedback.state === 'empty' || !feedback.label) return null;
    if (feedback.state === 'valid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-in fade-in duration-150">
          <Check className="w-3 h-3 stroke-[2.5]" />
          {feedback.label}
        </span>
      );
    }
    if (feedback.state === 'progress') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-in fade-in duration-150">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {feedback.label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-in fade-in duration-150">
        <XCircle className="w-3 h-3" />
        {feedback.label}
      </span>
    );
  };

  // Image Upload Handlers
  const handleStudentIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') || file.type.includes('pdf')) {
        soundFX.playError();
        setRegError('BAWAL ANG PDF O VIDEO: Tanging totoong litrato (JPG/PNG) lamang ng Student ID ang tinatanggap.');
        return;
      }
      // Fast client-side optimization to avoid lag for 100+ concurrent students
      const optimizedFile = await compressImageClientSide(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.72 });
      setStudentIdFile(optimizedFile);
      const url = URL.createObjectURL(optimizedFile);
      setStudentIdPreview(url);
      soundFX.playToggleSwitch(true);
    }
  };

  const handlePersonalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') || file.type.includes('pdf')) {
        soundFX.playError();
        setRegError('BAWAL ANG PDF O VIDEO: Tanging totoong litrato (JPG/PNG) lamang ng mukha ang tinatanggap.');
        return;
      }
      // Fast client-side optimization to avoid lag for 100+ concurrent students
      const optimizedFile = await compressImageClientSide(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.72 });
      setPersonalPhotoFile(optimizedFile);
      const url = URL.createObjectURL(optimizedFile);
      setPersonalPhotoPreview(url);
      soundFX.playToggleSwitch(true);
    }
  };

  // ==========================================
  // ACTION: HANDLE REGISTER
  // ==========================================
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Invisible Honeypot Bot Trap: Reject bot if filled
    if (regHoneypot.trim()) {
      soundFX.playError();
      const msg = 'Security verification failed. Please try again.';
      setRegError(msg);
      setRegStatusModal({ type: 'error', title: isTl ? 'Hindi Matagumpay' : 'Verification Error', message: msg });
      return;
    }

    if (!isRegisterFormValid) {
      soundFX.playError();
      const missingFields: string[] = [];
      if (lastNameStatus.type !== 'correct') missingFields.push(isTl ? 'Apelyido (Last Name - hindi bababa sa 2 letra)' : 'Last Name (at least 2 letters)');
      if (firstNameStatus.type !== 'correct') missingFields.push(isTl ? 'Pangalan (First Name - hindi bababa sa 2 letra)' : 'First Name (at least 2 letters)');
      if (phoneStatus.type !== 'correct') missingFields.push(isTl ? 'Contact No. (dapat 11 digits at nagsisimula sa 09)' : 'Contact No. (must start with 09 and be 11 digits)');
      if (emailStatus.type !== 'correct') missingFields.push(isTl ? 'Gmail (dapat nagtatapos sa @gmail.com)' : 'Gmail (must end with @gmail.com)');
      if (studentNumberStatus.type !== 'correct') missingFields.push(isTl ? 'Student Number (opisyal na AICS ID number)' : 'Student Number (valid official ID)');
      if (passwordStatus.type !== 'correct') missingFields.push(isTl ? 'Password (6+ karakter, may 1+ numero, malaking titik at simbolo)' : 'Password (6+ chars with number, uppercase & symbol)');
      if (confirmPasswordStatus.type !== 'correct') missingFields.push(isTl ? 'Confirm Password (dapat tugma sa nilagay mong password)' : 'Confirm Password (must match your password)');

      const msg = isTl
        ? 'May mga kulang o maling impormasyon pa sa iyong form. Pakisuyong kumpletuhin ang mga ito:'
        : 'There are missing or incomplete fields in your registration form. Please complete the following:';

      setRegError(msg);
      setRegStatusModal({
        type: 'error',
        title: isTl ? 'May Kulang sa Form (Invalid Input)' : 'Registration Incomplete',
        message: msg,
        details: missingFields,
      });
      return;
    }

    setRegLoading(true);
    setRegError(null);
    setRegStatusModal(null);

    try {
      const res = await registerStudentPortalAccount({
        lastName: regLastName,
        firstName: regFirstName,
        middleInitial: regMiddleInitial,
        contactNumber: regContactNumber,
        email: regEmail,
        studentNumber: idForDb(regStudentNumber),
        password: regPassword,
        // no quick-unlock PIN anymore (user, 2026-11-23): students sign in with ID, password and email OTP
        gradeSection: `Grade ${regGradeLevel} · ${regStrand}`,
        studentIdFile,
        personalPhotoFile,
      });

      setRegLoading(false);

      if (!res.success || !res.account) {
        soundFX.playError();
        const friendlyMsg = formatFriendlyRegError(res.error || '');
        setRegError(friendlyMsg);
        setRegStatusModal({
          type: 'error',
          title: isTl ? 'Hindi Naaprubahan ang Pag-create' : 'Registration Failed',
          message: friendlyMsg,
        });
      } else {
        studentRegisterRateLimiter.reset();
        soundFX.playSuccessCheck();
        setSuccessData({
          username: res.account.studentNumber,
          account: res.account,
          plainPassword: regPassword,
        });
        setPostRegPinStep(false);
        setPostRegPinInput('');
      }
    } catch (err: any) {
      setRegLoading(false);
      soundFX.playError();
      const errText = isTl ? 'Walang koneksyon sa server. I-check ang iyong internet connection, tapos subukan ulit.' : 'No server connection. Please check your internet connection and try again.';
      setRegError(errText);
      setRegStatusModal({ type: 'error', title: isTl ? 'Connection Error' : 'Connection Error', message: errText });
    }
  };

  // ==========================================
  // ACTION: HANDLE LOGIN
  // ==========================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Invisible Honeypot Bot Trap: Reject bot silently if filled
    if (loginHoneypot.trim()) {
      soundFX.playError();
      setLoginError('Security verification failed. (Automated bot pattern detected)');
      return;
    }

    // 2. Anti-Brute-Force Rate Limiting Lockout Check
    const rateStatus = studentLoginRateLimiter.isLocked();
    if (rateStatus.locked) {
      soundFX.playError();
      const mins = Math.floor(rateStatus.remainingSeconds / 60);
      const secs = rateStatus.remainingSeconds % 60;
      const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      setLoginError(
        isTl
          ? `Masyadong maraming mali. Subukan ulit pagkalipas ng ${timeStr}.`
          : `Too many wrong tries. Try again in ${timeStr}.`
      );
      return;
    }

    if (!loginStudentNumber.trim() || !loginPassword) {
      soundFX.playError();
      setLoginErrorTitle(isTl ? 'Kulang pa' : 'Something is missing');
      setLoginErrorField(!loginStudentNumber.trim() ? 'id' : 'password');
      setLoginError(isTl ? 'Ilagay ang Student ID at password mo.' : 'Type your Student ID and password.');
      return;
    }

    // 3. Cloudflare: must pass "Verify you are human", then the SERVER checks the token (siteverify)
    if (!turnstileToken) {
      setLoginErrorTitle(isTl ? 'Isang hakbang pa' : 'One more step');
      setLoginErrorField(null);
      setLoginTriesLeft(null);
      setLoginError(
        turnstileBroken
          ? isTl ? 'Hindi gumana ang security check. I-refresh ang page, tapos subukan ulit.' : 'The security check did not load. Refresh the page, then try again.'
          : isTl ? 'Hintayin munang matapos ang security check sa ilalim ng Sign In (green check), tapos Sign In ulit.' : 'Wait for the security check under the Sign In button to finish (green check), then Sign In again.'
      );
      return;
    }

    setLoginLoading(true);
    setLoginError(null);
    setLoginErrorTitle(null);
    setLoginErrorField(null);
    setLoginTriesLeft(null);

    const res = await loginStudentPortal(loginStudentNumber, loginPassword, turnstileToken);
    setLoginLoading(false);
    // a token works only once: always show a fresh box for the next try
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);
    if (res.code === 'not_human') {
      // not a wrong password: do not count it against the 5 tries
      setLoginErrorTitle(isTl ? 'Hindi pumasa sa security check' : 'Security check did not pass');
      setLoginErrorField(null);
      setLoginTriesLeft(null);
      setLoginError(isTl ? 'Hintayin ulit ang green check sa security check, tapos Sign In.' : 'Wait for the green check in the security check again, then Sign In.');
      return;
    }

    if (!res.success || !res.account) {
      // Record failed attempt in Rate Limiter
      const attemptRes = studentLoginRateLimiter.recordFailedAttempt();
      soundFX.playError();

      if (attemptRes.locked) {
        setLoginErrorTitle(isTl ? 'Sandali lang' : 'Please wait');
        setLoginError(
          isTl
            ? '5 beses nang mali. Para sa seguridad, maghintay ng 5 minuto bago sumubok ulit.'
            : 'Too many wrong tries. For your safety, wait 5 minutes before trying again.'
        );
      } else {
        const remaining = 5 - attemptRes.attempts;
        const msg: Record<string, [string, string, string, string]> = {
          no_account: ['Walang account', 'Tingnan ang Student ID mo (pindutin ang mata). Wala pang account? Gumawa sa ibaba.', 'No account exists', 'Check your Student ID (tap the eye). No account yet? Create one below.'],
          wrong_password: ['Mali ang password', 'Subukan ulit, o pindutin ang "Forgot Password?".', 'Wrong password', 'Try again, or tap "Forgot Password?".'],
          deactivated: ['Naka-off ang account mo', 'Pumunta sa Guidance Office para mabuksan ulit ito.', 'Your account is turned off', 'Please visit the Guidance Office to turn it back on.'],
          offline: ['Hindi maka-connect', 'Tingnan ang internet mo, tapos subukan ulit.', 'Could not connect', 'Check your internet, then try again.'],
        };
        const key = res.code || 'wrong_password';
        const m = msg[key];
        setLoginErrorTitle(isTl ? m[0] : m[2]);
        setLoginError(isTl ? m[1] : m[3]);
        setLoginErrorField(res.code === 'no_account' ? 'id' : res.code === 'wrong_password' ? 'password' : null);
        setLoginTriesLeft(res.code === 'offline' ? null : remaining);
      }
      return;
    }

    // Success -> Reset Rate Limiter
    studentLoginRateLimiter.reset();
    soundFX.playSuccessCheck();
    onLoginSuccess(res.account);
  };

  // ==========================================
  // ACTION: FORGOT PASSWORD
  // ==========================================
  const handleForgotRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Invisible Honeypot Trap
    if (forgotHoneypot.trim()) {
      soundFX.playError();
      setForgotError('Security verification failed.');
      return;
    }

    // 2. Rate Limiting Check
    const rateStatus = studentForgotRateLimiter.isLocked();
    if (rateStatus.locked) {
      soundFX.playError();
      const mins = Math.floor(rateStatus.remainingSeconds / 60);
      const secs = rateStatus.remainingSeconds % 60;
      setForgotError(
        isTl
          ? `Masyadong maraming paghingi ng OTP. Maghintay ng ${mins}:${secs < 10 ? '0' : ''}${secs}.`
          : `Too many OTP requests. Please wait ${mins}:${secs < 10 ? '0' : ''}${secs}.`
      );
      return;
    }

    setForgotLoading(true);
    setForgotError(null);

    const res = await sendForgotPasswordOtp(idForDb(forgotIdentifier));
    setForgotLoading(false);

    if (!res.success) {
      studentForgotRateLimiter.recordFailedAttempt();
      soundFX.playError();
      setForgotError(res.error || 'Failed to request reset OTP.');
      return;
    }

    studentForgotRateLimiter.reset();
    soundFX.playStepUnlock();
    setForgotMaskedEmail(res.emailMasked || 'your registered email');
    setForgotStep('verify');
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPassword.length < 6) {
      soundFX.playError();
      setForgotError(isTl ? 'Ang password ay dapat hindi bababa sa 6 characters.' : 'Password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      soundFX.playError();
      setForgotError(isTl ? 'Hindi tugma ang bagong password.' : 'Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);

    const res = await resetPasswordWithOtp(idForDb(forgotIdentifier), forgotOtp, forgotNewPassword);
    setForgotLoading(false);

    if (!res.success) {
      soundFX.playError();
      setForgotError(res.error || 'Failed to reset password.');
      return;
    }

    soundFX.playSuccessCheck();
    setForgotSuccess(isTl ? 'Matagumpay na napalitan ang iyong password! Maaari ka nang mag-login.' : 'Password reset successful! You can now log in.');
    window.setTimeout(() => {
      setMode('login');
      setForgotStep('request');
      setForgotSuccess(null);
    }, 2400);
  };

  return (
    <MotionConfig transition={{ duration: 0 }}>
    <div className={`min-h-screen w-full relative flex flex-col justify-between font-sans select-none student-portal-canvas bg-[#05112B] text-white overflow-x-hidden ${
      mode === 'login' ? 'lg:h-screen lg:overflow-hidden' : 'min-h-[100dvh]'
    }`}>
      {/* AICS Northern Lights Aurora Gradient Background (Mobile View / Phones Only - lg:hidden) */}
      <div className="lg:hidden fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Deep navy midnight canvas base */}
        <div className="absolute inset-0 bg-[#06112C] dark:bg-[#03091A]" />
        
        {/* Aurora Main Ribbon 1: Neon Cyan & Emerald Green Wave */}
        <div
          className="absolute -top-[10%] left-[-15%] w-[120vw] h-[70vh] blur-[60px] opacity-75 dark:opacity-65 transform-gpu -rotate-[18deg] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.45) 0%, rgba(6, 182, 212, 0.55) 30%, rgba(56, 189, 248, 0.35) 60%, transparent 80%)',
          }}
        />

        {/* Aurora Luminous Core 2: Bright White-Cyan Ribbon Spine */}
        <div
          className="absolute top-[10%] left-[5%] w-[90vw] h-[35vh] blur-[45px] opacity-70 dark:opacity-55 transform-gpu -rotate-[22deg] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.35) 25%, rgba(34, 211, 238, 0.6) 50%, rgba(56, 189, 248, 0.4) 75%, transparent 100%)',
          }}
        />

        {/* Aurora Atmospheric Ribbon 3: Violet / Soft Purple Drift */}
        <div
          className="absolute top-[25%] -right-[20%] w-[100vw] h-[80vh] blur-[80px] opacity-60 dark:opacity-50 transform-gpu -rotate-[12deg] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(168, 85, 247, 0.4) 0%, rgba(99, 102, 241, 0.45) 40%, rgba(30, 70, 155, 0.35) 70%, transparent 85%)',
          }}
        />

        {/* Deep Royal Midnight Base Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#06112C]/30 via-transparent to-[#03091A]/90 pointer-events-none" />
      </div>

      {/* Campus background: day picture in light mode, night picture in dark mode (crossfade on toggle) - DESKTOP WEBSITE 100% ORIGINAL */}
      {xmas ? (
      <div className={`login-web-only hidden lg:block fixed inset-0 z-0 pointer-events-none ${isNight ? 'bg-[#0B1A3A]' : 'bg-[#7FB6E8]'}`} aria-hidden="true">
        <img src="/login-day.webp" alt="" decoding="async" {...{ fetchpriority: "high" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="login-bg absolute inset-0 w-full h-full object-cover object-[42%_50%]" style={{ opacity: isNight ? 0 : 1 }} />
        <img src="/login-night.webp" alt="" decoding="async" {...{ fetchpriority: "high" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="login-bg absolute inset-0 w-full h-full object-cover object-[42%_50%]" style={{ opacity: isNight ? 1 : 0 }} />
        <div className={`absolute inset-0 transition-opacity duration-700 ${isNight ? 'bg-gradient-to-b from-black/25 via-black/10 to-black/45' : 'bg-gradient-to-b from-black/10 via-transparent to-black/30'}`} />
      </div>
      ) : (
        <>
          {isDesktop && <div className="hidden lg:block"><CelestialBackground /></div>}
          {isDesktop && <div className="hidden lg:block"><WavyBackground /></div>}
        </>
      )}

      {/* Top Floating Glass Island Navbar */}
      <header className="relative z-30 w-full px-3 sm:px-6 pt-12 sm:pt-4 safe-area-top">
        {/* ====================================================
            DESKTOP NAVBAR: Original Classic Glass Capsule (Hidden on mobile)
            ==================================================== */}
        <div className="hidden lg:flex max-w-6xl mx-auto rounded-full bg-[#0B1E48]/85 dark:bg-[#07132B]/85 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl shadow-blue-950/40 lg-glass-bar px-6 py-3 items-center justify-between gap-4 transition-all">
          {/* Left: Official Brand Seal & Campus Title */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src="/aics-logo.jpg"
                alt="AICS Logo"
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white/50 bg-white p-0.5 shadow-md"
              />
              {/* Live Security Shield Dot */}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0B1E48] dark:ring-[#07132B]"
                title="100% Confidential & RA 10173 Protected"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-tight text-white uppercase truncate">
                  AICS MONTALBAN BRANCH
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-bold text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  RA 10173
                </span>
              </div>
              <p className="text-xs text-[#9BCBFF] font-medium truncate">
                {isTl ? 'Ligtas at Kumpidensyal na Guidance Portal' : 'Safe & Confidential Concern Reporting'}
              </p>
            </div>
          </div>

          {/* Right: Unified Sleek Controls Cluster + Quick Refresh */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                soundFX.playToggleSwitch(true);
                window.location.reload();
              }}
              title={isTl ? 'I-refresh ang pahina' : 'Refresh page'}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-sky-200 border border-white/15 shadow-sm transition-all flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center p-1 rounded-full bg-white/10 dark:bg-white/5 border border-white/15 dark:border-white/10 shadow-inner">
              <div className="h-4 w-[1px] bg-white/20 mx-1" />
              <LocaleSwitchPill />
              <div className="h-4 w-[1px] bg-white/20 mx-1" />
              <SkyThemePill />
            </div>
          </div>
        </div>

        {/* ====================================================
            MOBILE APP NAVBAR: Custom Stretched Campus Background & Layout (Visible only on mobile)
            ==================================================== */}
        <div className="lg:hidden relative max-w-6xl mx-auto rounded-3xl overflow-hidden border border-white/25 dark:border-white/15 shadow-2xl shadow-blue-950/50 transition-all">
          <HollySprig className="absolute z-20 top-1.5 right-2 w-11 h-8" />
          {/* Campus Photo Ambient Layer stretched to fill with blue tint */}
          <div
            className="absolute inset-0 bg-no-repeat pointer-events-none"
            style={{
              backgroundImage: `url('/aics-campus-header.jpg')`,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
            }}
          />
          {/* Blue Translucent Overlay */}
          <div className="absolute inset-0 bg-[#072464]/65 mix-blend-multiply pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020b24]/40 via-[#0a2769]/35 to-[#020b24]/70 pointer-events-none" />

          {/* Inner Content: 2-column mobile layout with centered circular logo */}
          <div className="relative z-10 px-4 py-3 flex items-center gap-3.5 min-h-[105px]">
            {/* Left: Prominent Circular Logo */}
            <div className="relative shrink-0 flex items-center justify-center my-auto">
              <div className="w-[80px] h-[80px] rounded-full p-1 bg-white/20 backdrop-blur-md ring-2 ring-white/75 shadow-2xl flex items-center justify-center">
                <img
                  src="/aics-logo.jpg"
                  alt="AICS Logo"
                  className="w-full h-full rounded-full object-cover shadow-inner"
                />
              </div>
              <span
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-[#020b24] shadow-md"
                title="100% Confidential & RA 10173 Protected"
              />
            </div>

            {/* Right: Titles on top, Toggles on bottom */}
            <div className="flex-1 flex flex-col justify-between gap-2.5 min-w-0">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-sm font-black tracking-wide text-white uppercase truncate drop-shadow-md">
                    AICS MONTALBAN BRANCH
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 backdrop-blur-sm shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    RA 10173
                  </span>
                </div>
                <p className="text-[11px] text-sky-100 font-semibold truncate drop-shadow-md">
                  {isTl ? 'Ligtas at Kumpidensyal na Portal' : 'Safe & Confidential Concern Reporting'}
                </p>
              </div>

              {/* Toggles cluster & Quick Refresh Button */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-full bg-slate-950/70 border border-white/25 shadow-xl backdrop-blur-md">
                  <div className="h-3.5 w-[1px] bg-white/20 mx-1" />
                  <LocaleSwitchPill />
                  <div className="h-3.5 w-[1px] bg-white/20 mx-1" />
                  <SkyThemePill />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playToggleSwitch(true);
                    window.location.reload();
                  }}
                  title={isTl ? 'I-refresh ang pahina' : 'Refresh page'}
                  className="p-1.5 rounded-full bg-slate-950/70 hover:bg-slate-900 text-sky-200 border border-white/25 shadow-xl backdrop-blur-md transition-all flex items-center justify-center cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Glassmorphic Container: Left Student Pair & Right Form Card */}
      <main className={`relative z-20 flex-1 flex flex-col justify-center items-center p-3 sm:p-6 lg:px-8 ${
  mode === 'login' ? 'my-1 sm:my-4 lg:my-0 lg:py-2' : 'my-4 sm:my-8 py-4 sm:py-6'
}`}>
        <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-6 xl:gap-16">
          {/* Left Wing: Boy and Girl Students Together with 1 Message Bubble (Desktop Only) */}
          {mode === 'login' && (
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="hidden lg:flex shrink-0 items-end justify-center w-full max-w-lg xl:max-w-xl order-1 lg:order-none"
            >
              {isDesktop && <StudentPairInteractiveWing />}
            </motion.div>
          )}

          {/* Right Column: Original Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`w-full ${
              mode === 'register' ? 'max-w-5xl xl:max-w-6xl' : mode === 'forgot' ? 'max-w-[540px]' : 'max-w-[430px]'
            } cosmic-glass-card login-glass p-4 sm:p-6 sm:py-6 space-y-4 sm:space-y-5 relative z-10 order-2 lg:order-none`}
          >
          <ChristmasLights className="lg:hidden absolute z-[2] -top-1 left-5 right-5 h-8 w-[calc(100%-2.5rem)]" />
          {/* ====================================================
              MODE: LOGIN SCREEN
              ==================================================== */}
          {mode === 'login' && (
            <div className="space-y-4">
              <div className="text-center space-y-3 pb-2 sm:pb-4 lg:hidden">

                {/* Mobile Phone Only: 3.5s Rotating Affirmation Carousel (Clean without quotation marks "") */}
                <div
                  onMouseEnter={() => setIsCarouselPaused(true)}
                  onMouseLeave={() => setIsCarouselPaused(false)}
                  onTouchStart={() => setIsCarouselPaused(true)}
                  onTouchEnd={() => setIsCarouselPaused(false)}
                  className="lg:hidden min-h-[40px] flex items-center justify-center px-2 relative overflow-hidden"
                  title="Anti-Bullying & Confidential Guidance Shield"
                >
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={affirmationIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="text-xs font-bold text-sky-900 dark:text-sky-200 text-center leading-relaxed"
                    >
                      {isTl ? MENTAL_HEALTH_AFFIRMATIONS[affirmationIndex].tl : MENTAL_HEALTH_AFFIRMATIONS[affirmationIndex].en}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {(loginError || loginCooldownSeconds > 0) && (
                <div role="alert" className="login-alert rounded-[22px] p-4 flex items-start gap-3.5 anim-pop">
                  <span className="w-10 h-10 rounded-full bg-[#FF3B30] text-white flex items-center justify-center shrink-0 shadow-[0_6px_16px_-6px_rgba(255,59,48,0.8)]">
                    {loginErrorField === 'id' ? <User className="w-5 h-5" /> : loginErrorField === 'password' ? <Lock className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold leading-snug text-white">{loginErrorTitle || (loginCooldownSeconds > 0 ? (isTl ? 'Sandali lang' : 'Please wait') : isTl ? 'Hindi maka-sign in' : 'Could not sign in')}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-white/80">{loginError || (isTl ? '5 beses nang mali. Para sa seguridad, maghintay muna.' : 'Too many wrong tries. For your safety, please wait.')}</p>
                    {loginCooldownSeconds > 0 && (
                      <span className="mt-2.5 inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-white/10 text-[12.5px] font-semibold text-white/90 tabular-nums">
                        <span className="w-2 h-2 rounded-full bg-[#FF9F0A]" />
                        {isTl ? 'Subukan ulit sa ' : 'Try again in '}{Math.floor(loginCooldownSeconds / 60)}:{(loginCooldownSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                    {loginTriesLeft !== null && loginCooldownSeconds === 0 && (
                      <span className="mt-2.5 inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-white/10 text-[12.5px] font-semibold text-white/90">
                        <span className={`w-2 h-2 rounded-full ${loginTriesLeft <= 2 ? 'bg-[#FF453A]' : 'bg-[#FF9F0A]'}`} />
                        {isTl ? `${loginTriesLeft} subok na lang bago maghintay ng 5 minuto` : `${loginTriesLeft} ${loginTriesLeft === 1 ? 'try' : 'tries'} left before a 5-minute wait`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Invisible Honeypot Anti-Bot Field (Hidden from real users via CSS & offscreen) */}
                <div className="opacity-0 absolute -left-[9999px] -top-[9999px] pointer-events-none select-none h-0 w-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
                  <label htmlFor="student_hp_verify">Leave this field empty</label>
                  <input
                    id="student_hp_verify"
                    type="text"
                    name="student_hp_verify"
                    value={loginHoneypot}
                    onChange={(e) => setLoginHoneypot(e.target.value)}
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-extrabold register-label flex items-center justify-between">
                    <span>Student ID Number</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 pointer-events-none">
                      <User className="w-5 h-5" />
                    </span>
                    <input
                      type={showLoginId ? 'text' : 'password'}
                      required
                      inputMode="numeric"
                      autoComplete="username"
                      maxLength={7}
                      value={loginStudentNumber}
                      onChange={(e) => { setLoginStudentNumber(maskStudentId(e.target.value, loginStudentNumber)); if (loginErrorField === 'id') setLoginErrorField(null); }}
                      placeholder="e.g. 23-0001"
                      aria-invalid={loginErrorField === 'id'}
                      className={`w-full pl-12 pr-12 py-4 rounded-2xl cosmic-input text-base font-semibold focus:outline-none transition-all ${loginErrorField === 'id' ? 'login-field-bad' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playToggleSwitch(true);
                        setShowLoginId((prev) => !prev);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/60 dark:hover:text-white p-1 transition-colors"
                      title={showLoginId ? 'Hide Student ID' : 'Show Student ID'}
                      aria-label={showLoginId ? 'Hide Student ID' : 'Show Student ID'}
                    >
                      {showLoginId ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-extrabold register-label block">Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); if (loginErrorField === 'password') setLoginErrorField(null); }}
                      placeholder="Enter your password"
                      aria-invalid={loginErrorField === 'password'}
                      className={`w-full pl-12 pr-12 py-4 rounded-2xl cosmic-input text-base font-semibold focus:outline-none transition-all ${loginErrorField === 'password' ? 'login-field-bad' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playToggleSwitch(true);
                        setShowLoginPassword((prev) => !prev);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/60 dark:hover:text-white p-1 text-sm font-semibold transition-colors"
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playToggleSwitch(true);
                        setMode('forgot');
                        setForgotIdentifier(loginStudentNumber);
                      }}
                      className="text-sm text-[#2557BE] dark:text-[#7CB8F7] hover:underline font-extrabold"
                    >
                      {isTl ? 'Nakalimutan ang Password?' : 'Forgot Password?'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading || loginCooldownSeconds > 0}
                  className="btn-press w-full py-4 rounded-2xl bg-gradient-to-r from-[#1E469B] via-[#2557BE] to-[#1E469B] hover:opacity-95 text-white text-base font-extrabold shadow-xl shadow-blue-950/60 border border-white/20 lg-signin-btn disabled:opacity-50 transition-all flex items-center justify-center gap-2.5"
                >
                  {loginLoading ? (
                    <div className="flex items-center gap-3">
                      {/* High-tech AICS Computer Science Pulsing Circuit Core */}
                      <div className="relative w-5 h-5 flex items-center justify-center">
                        <span className="absolute inset-0 rounded-full border-2 border-sky-300 border-t-transparent animate-spin" />
                        <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse shadow-[0_0_8px_#38bdf8]" />
                      </div>
                      <span className="tracking-wide">
                        {isTl ? 'Pina-process ang Cyber Security Credentials...' : 'Processing AICS Secure Credentials...'}
                      </span>
                    </div>
                  ) : loginCooldownSeconds > 0 ? (
                    <span className="tabular-nums">{isTl ? 'Subukan ulit sa ' : 'Try again in '}{Math.floor(loginCooldownSeconds / 60)}:{(loginCooldownSeconds % 60).toString().padStart(2, '0')}</span>
                  ) : (
                    <>
                      <span>{isTl ? 'Pumasok sa Student Portal' : 'Sign In to Student Portal'}</span>
                      <span className="text-lg">→</span>
                    </>
                  )}
                </button>

                {/* Cloudflare Turnstile Human & Bot Shield (Positioned below Sign In button) */}
                <div className="flex justify-center">
                  <CloudflareTurnstile
                    key={turnstileKey}
                    siteKey={CLOUDFLARE_SITE_KEY}
                    onVerify={(token) => {
                      setTurnstileToken(token);
                      soundFX.playToggleSwitch(true);
                    }}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => { setTurnstileToken(null); setTurnstileBroken(true); }}
                  />
                </div>
              </form>

              <div className="pt-3 border-t border-white/10 dark:border-white/10 flex flex-row items-center justify-between gap-3 text-sm">
                <span className="card-subtitle-text font-semibold">
                  {isTl ? 'Wala pang account?' : 'No account yet?'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playToggleSwitch(true);
                    if (!privacyAgreed) {
                      setShowPrivacyModal(true);
                    } else {
                      setMode('register');
                    }
                  }}
                  className="btn-press px-5 py-2.5 rounded-xl card-back-button font-extrabold whitespace-nowrap transition-all"
                >
                  {isTl ? '+ Gumawa ng account' : '+ Create account'}
                </button>
              </div>

              {/* Download Android APK & PWA Install (Mobile Screen Only - hidden on desktop website) */}
              <div className={`lg:hidden pt-3 space-y-2.5 ${isCapacitorNativeApp() ? '!hidden' : ''}`}>
                {/* Mobile-Only PWA Home Screen Install Banner */}
                <button
                  type="button"
                  onClick={handleInstallApp}
                  className="lg:hidden btn-press w-full p-3 rounded-2xl bg-gradient-to-r from-sky-500/15 via-blue-600/20 to-sky-500/15 hover:from-sky-500/25 hover:to-blue-600/30 border border-sky-400/35 dark:border-sky-400/25 flex items-center justify-between gap-3 text-left transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-[#1E469B] flex items-center justify-center text-white shadow-sm shrink-0">
                      <Download className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-bold text-slate-900 dark:text-white tracking-tight">
                          {isTl ? 'I-install sa Home Screen (Web App)' : 'Install to Home Screen (Web App)'}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300 font-bold border border-sky-400/30">
                          PWA
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
                        {isTl ? 'Para sa mabilis na pagbukas sa browser' : 'Add shortcut directly to your mobile screen'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[12px] font-semibold text-sky-600 dark:text-sky-400 shrink-0">
                    {isTl ? 'I-install' : 'Install'} →
                  </span>
                </button>

                {/* Direct Android APK Download Button (Mobile Only: hidden on desktop website) */}
                <a
                  href="/aics-kalang-ba.apk"
                  download="AICS_Report_Concern.apk"
                  onClick={() => soundFX.playToggleSwitch(true)}
                  className="btn-press w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-600/20 to-emerald-500/15 hover:from-emerald-500/25 hover:to-teal-600/30 border border-emerald-400/35 dark:border-emerald-400/25 flex items-center justify-between gap-3 text-left transition-all duration-200 cursor-pointer shadow-sm group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform duration-200">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="10" rx="2" />
                        <circle cx="12" cy="5" r="2" />
                        <path d="M12 7v4" />
                        <line x1="8" y1="16" x2="8" y2="16" />
                        <line x1="16" y1="16" x2="16" y2="16" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-bold text-slate-900 dark:text-white tracking-tight">
                          {isTl ? 'I-download ang Android APK (Mobile App)' : 'Download Android APK (Mobile App)'}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-400/30">
                          APK
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
                        {isTl ? 'Opisyal na offline-ready mobile application' : 'Official native Android installer package'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 group-hover:translate-x-0.5 transition-transform duration-200">
                    <Download className="w-3.5 h-3.5" />
                  </span>
                </a>
              </div>
              {/* very bottom of the card (like other school portals) */}
              <LegalLinks isTl={isTl} onOpen={setLegalTab} className="pt-3 border-t border-white/10" />
            </div>
          )}

          {/* ====================================================
              MODE: CREATE ACCOUNT (2026 WORLD-CLASS APPLE / LINEAR ARCHITECTURE)
              - Zero Emojis (SVG Vector Icons only)
              - Zero Boring Slop (Sleek grouped segmented cards, clean typography, live dot indicators)
              - Streamlined Flow: Grade Toggle -> Filtered Student ID -> Identity Card -> Credentials
              ==================================================== */}
          {mode === 'register' && (
            <div className="space-y-6">
              {/* Header inside Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 dark:border-white/10 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
                      Official Student Registration
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {isTl ? 'Gumawa ng Student Account' : 'Create Student Account'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playBackspace();
                    setMode('login');
                  }}
                  className="btn-press px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold self-start sm:self-auto transition-colors cursor-pointer"
                >
                  {isTl ? '← Bumalik sa Sign In' : '← Back to Login'}
                </button>
              </div>

              {regError && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                      {isTl ? 'Paunawa sa Pagpaparehistro' : 'Registration Notice'}
                    </p>
                    <p className="mt-0.5 text-xs text-rose-200 leading-relaxed font-normal">
                      {regError}
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-6">
                {/* Invisible Honeypot Anti-Bot Field */}
                <div className="opacity-0 absolute -left-[9999px] -top-[9999px] pointer-events-none select-none h-0 w-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
                  <label htmlFor="reg_hp_code">Do not fill this</label>
                  <input
                    id="reg_hp_code"
                    type="text"
                    name="reg_hp_code"
                    value={regHoneypot}
                    onChange={(e) => setRegHoneypot(e.target.value)}
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>

                {/* SECTION 1: STUDENT ID & GRADE LEVEL */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
                        {isTl ? 'Baitang at Student ID' : 'Grade Level & Student ID'}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-300">
                      {availableStudentsForGrade.length} {isTl ? 'natitirang ID' : 'available IDs'}
                    </span>
                  </div>

                  {/* Segmented Grade Level Switcher (Apple iOS Segmented Control) */}
                  <div className="p-1 rounded-xl bg-black/40 border border-white/10 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playToggleSwitch(true);
                        setRegGradeLevel('11');
                        setRegStudentNumber('');
                        setRegLastName('');
                        setRegFirstName('');
                        setRegMiddleInitial('');
                      }}
                      className={`py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        regGradeLevel === '11'
                          ? 'bg-[#2557BE] text-white shadow-sm ring-1 ring-sky-300/40'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Grade 11 (25-XXXX)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playToggleSwitch(true);
                        setRegGradeLevel('12');
                        setRegStudentNumber('');
                        setRegLastName('');
                        setRegFirstName('');
                        setRegMiddleInitial('');
                      }}
                      className={`py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        regGradeLevel === '12'
                          ? 'bg-[#2557BE] text-white shadow-sm ring-1 ring-sky-300/40'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Grade 12 (26-XXXX)</span>
                    </button>
                  </div>

                  {/* Searchable Student Number Dropdown */}
                  <div className="space-y-1.5 relative" ref={studentDropdownRef}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        {isTl ? 'Student ID Number' : 'Student ID Number'}
                      </label>
                      {regStudentNumber && (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setStudentDropdownOpen((prev) => !prev)}
                      className={`w-full px-4 py-3 rounded-xl text-left font-mono font-bold flex items-center justify-between transition-all duration-200 focus:outline-none cursor-pointer ${
                        regStudentNumber
                          ? 'border-emerald-500/80 bg-emerald-500/[0.05] shadow-[0_0_12px_rgba(16,185,129,0.22)] ring-1 ring-emerald-500/30'
                          : 'border-white/15 bg-black/30 hover:border-white/30'
                      }`}
                    >
                      <span className={regStudentNumber ? 'text-white text-sm' : 'text-slate-400 font-sans font-normal text-xs'}>
                        {regStudentNumber
                          ? `${regStudentNumber} — ${regLastName ? `${regLastName}, ${regFirstName}` : ''}`
                          : (isTl ? `Pumili ng Grade ${regGradeLevel} Student Number...` : `Select Grade ${regGradeLevel} Student Number...`)}
                      </span>
                      <div className="flex items-center gap-2">
                        {regStudentNumber && <Check className="w-4 h-4 text-emerald-400" />}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${studentDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Dropdown Menu: Max 5 items visible (~210px), with internal search bar */}
                    {studentDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl bg-[#0B1E48] border border-white/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Search Filter Header */}
                        <div className="p-2.5 border-b border-white/10 bg-black/20 flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                          <input
                            type="text"
                            autoFocus
                            placeholder={isTl ? 'Mag-search ng ID o Pangalan...' : 'Search ID or Name...'}
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-xs font-semibold text-white placeholder:text-slate-400 focus:outline-none"
                          />
                          {studentSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setStudentSearchQuery('')}
                              className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Items List: max 5 items visible (each item ~42px, max-h-[210px]) */}
                        <div className="max-h-[210px] overflow-y-auto divide-y divide-white/5">
                          {availableStudentsForGrade.length === 0 ? (
                            <div className="p-4 text-center text-xs font-medium text-slate-400">
                              {studentSearchQuery
                                ? (isTl ? 'Walang nahanap na Student ID.' : 'No matching Student ID found.')
                                : (isTl ? 'Lahat ng Student ID sa baitang na ito ay nakarehistro na.' : 'All Student IDs for this grade are already registered.')}
                            </div>
                          ) : (
                            availableStudentsForGrade.map((student) => (
                              <button
                                key={student.student_number}
                                type="button"
                                onClick={() => handleSelectStudentNumber(student)}
                                className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                                  regStudentNumber === student.student_number ? 'bg-sky-500/20 font-bold' : ''
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="font-mono font-bold text-sky-300 text-xs block">
                                    {student.student_number}
                                  </span>
                                  <span className="text-[11px] text-slate-200 truncate block">
                                    {student.full_name}
                                  </span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-medium shrink-0">
                                  {student.grade_section}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 2: AUTO-FILLED STUDENT PROFILE (LOCKED FROM MASTERLIST) */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
                        {isTl ? 'Pangalan at Strand' : 'Student Identity'}
                      </span>
                    </div>
                    {regStudentNumber ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-400/30">
                        <Lock className="w-3 h-3 text-sky-300" />
                        {isTl ? 'Naka-lock (Mula sa Opisyal na Masterlist)' : 'Locked (Official Masterlist)'}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">
                        {isTl ? 'Pumili muna ng Student ID sa itaas' : 'Select a Student ID above'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                    <div className="md:col-span-5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          {regStudentNumber && <Lock className="w-3 h-3 text-slate-400" />}
                          <span>{isTl ? 'Apelyido (Last Name)' : 'Last Name'}</span>
                        </label>
                        {regLastName && (
                          <span className="text-[10px] text-sky-300 font-semibold">
                            {isTl ? 'Masterlist' : 'Auto-filled'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        readOnly={!!regStudentNumber}
                        tabIndex={regStudentNumber ? -1 : 0}
                        required
                        placeholder="DELA CRUZ"
                        value={regLastName}
                        onChange={(e) => {
                          if (!regStudentNumber) setRegLastName(e.target.value.toUpperCase());
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 focus:outline-none ${
                          regStudentNumber
                            ? 'border-white/10 bg-black/40 text-slate-200 cursor-not-allowed select-none opacity-85'
                            : 'border-white/15 bg-black/30 text-white focus:border-sky-400'
                        }`}
                      />
                    </div>

                    <div className="md:col-span-5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          {regStudentNumber && <Lock className="w-3 h-3 text-slate-400" />}
                          <span>{isTl ? 'Pangalan (First Name)' : 'First Name'}</span>
                        </label>
                        {regFirstName && (
                          <span className="text-[10px] text-sky-300 font-semibold">
                            {isTl ? 'Masterlist' : 'Auto-filled'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        readOnly={!!regStudentNumber}
                        tabIndex={regStudentNumber ? -1 : 0}
                        required
                        placeholder="JANSEN"
                        value={regFirstName}
                        onChange={(e) => {
                          if (!regStudentNumber) setRegFirstName(e.target.value.toUpperCase());
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 focus:outline-none ${
                          regStudentNumber
                            ? 'border-white/10 bg-black/40 text-slate-200 cursor-not-allowed select-none opacity-85'
                            : 'border-white/15 bg-black/30 text-white focus:border-sky-400'
                        }`}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300">M.I.</label>
                        {regStudentNumber && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                      <input
                        type="text"
                        maxLength={2}
                        readOnly={!!regStudentNumber}
                        tabIndex={regStudentNumber ? -1 : 0}
                        placeholder="K."
                        value={regMiddleInitial}
                        onChange={(e) => {
                          if (!regStudentNumber) setRegMiddleInitial(e.target.value.toUpperCase());
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-center transition-all duration-200 focus:outline-none ${
                          regStudentNumber
                            ? 'border-white/10 bg-black/40 text-slate-200 cursor-not-allowed select-none opacity-85'
                            : 'border-white/15 bg-black/30 text-white focus:border-sky-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isTl ? 'Strand' : 'Academic Strand'}</span>
                        </label>
                        {regStudentNumber && (
                          <span className="text-[10px] text-sky-300 font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Naka-lock
                          </span>
                        )}
                      </div>
                      <select
                        value={regStrand}
                        disabled={!!regStudentNumber}
                        onChange={(e) => setRegStrand(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-white focus:outline-none ${
                          regStudentNumber
                            ? 'border-white/10 bg-black/40 text-slate-200 cursor-not-allowed select-none opacity-85'
                            : 'border-white/15 bg-black/30 focus:border-sky-400'
                        }`}
                      >
                        <option value="STEM" className="bg-[#0B1E48] text-white">STEM (Science, Tech, Eng, Math)</option>
                        <option value="ICT" className="bg-[#0B1E48] text-white">ICT (Information & Comm Tech)</option>
                        <option value="ABM" className="bg-[#0B1E48] text-white">ABM (Accountancy & Business)</option>
                        <option value="HUMSS" className="bg-[#0B1E48] text-white">HUMSS (Humanities & Social Sci)</option>
                        <option value="GAS" className="bg-[#0B1E48] text-white">GAS (General Academic Strand)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isTl ? 'Contact Number' : 'Contact Number'}</span>
                        </label>
                        {renderStatusBadge(contactFeedback)}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={11}
                          required
                          placeholder="09XXXXXXXXX"
                          value={regContactNumber}
                          onChange={(e) => setRegContactNumber(e.target.value.replace(/\D/g, ''))}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-semibold transition-all duration-200 focus:outline-none ${getFieldBorderClass(contactFeedback.state)}`}
                        />
                        {contactFeedback.state === 'valid' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: CREDENTIALS (GMAIL & PASSWORD) */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
                        {isTl ? 'Login Credentials' : 'Login Credentials'}
                      </span>
                    </div>
                  </div>

                  {/* Gmail Address */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isTl ? 'Personal Gmail Address' : 'Personal Gmail Address'}</span>
                      </label>
                      {renderStatusBadge(emailFeedback)}
                    </div>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="yourname@gmail.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 focus:outline-none ${getFieldBorderClass(emailFeedback.state)}`}
                      />
                      {emailFeedback.state === 'valid' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-sky-300/80">
                      {isTl ? 'Dito ipapadala ang code kapag nakalimutan mo ang iyong password.' : 'Used for official password reset codes.'}
                    </p>
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-xs font-semibold text-slate-300">
                          {isTl ? 'Password' : 'Password'}
                        </label>
                        {renderStatusBadge(passwordFeedback)}
                      </div>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          placeholder={isTl ? 'Min. 6 na karakter' : 'Min. 6 characters'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 focus:outline-none ${getFieldBorderClass(passwordFeedback.state)}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playToggleSwitch(true);
                            setShowRegPassword((prev) => !prev);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                          title={showRegPassword ? 'Hide password' : 'Show password'}
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-xs font-semibold text-slate-300">
                          {isTl ? 'Ulitin ang Password' : 'Confirm Password'}
                        </label>
                        {renderStatusBadge(confirmPasswordFeedback)}
                      </div>
                      <div className="relative">
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder={isTl ? 'Ulitin ang password' : 'Repeat password'}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 focus:outline-none ${getFieldBorderClass(confirmPasswordFeedback.state)}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playToggleSwitch(true);
                            setShowRegConfirmPassword((prev) => !prev);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                          title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Clean Minimal Password Checklist (Linear style pills with small dots, no raw text symbols) */}
                  <div className="p-3 rounded-xl bg-black/25 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.length ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${passwordCriteria.length ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span>{isTl ? '6+ karakter' : '6+ characters'}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.number ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${passwordCriteria.number ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span>{isTl ? '1+ numero' : '1+ number'}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.uppercase ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${passwordCriteria.uppercase ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span>{isTl ? '1+ malaking titik' : '1+ uppercase'}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.special ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${passwordCriteria.special ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span>{isTl ? '1+ simbolo' : '1+ special symbol'}</span>
                    </div>
                  </div>
                </div>

                {/* Big Submit Button */}
                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="btn-press w-full py-3.5 rounded-xl bg-[#2557BE] hover:bg-[#1E469B] text-white text-sm font-bold shadow-lg shadow-blue-950/40 border border-white/15 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {regLoading ? (
                      <span>{isTl ? 'Ginagawa ang account…' : 'Creating your account…'}</span>
                    ) : (
                      <>
                        <span>{isTl ? 'Gumawa ng Account' : 'Create Account'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-slate-400" data-legal-agree>
                    {isTl ? 'Sa paggawa ng account, sumasang-ayon ka sa ' : 'By creating an account, you agree to the '}
                    <button type="button" onClick={() => setLegalTab('privacy')} className="text-sky-300 underline underline-offset-2 hover:text-white cursor-pointer">Privacy Notice</button>
                    {isTl ? ' at ' : ' and '}
                    <button type="button" onClick={() => setLegalTab('terms')} className="text-sky-300 underline underline-offset-2 hover:text-white cursor-pointer">Terms of Use</button>.
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* ====================================================
              MODE: FORGOT PASSWORD
              ==================================================== */}
          {mode === 'forgot' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/15 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight card-title-text">
                    Reset Student Password
                  </h2>
                  <p className="text-xs font-semibold mt-0.5 card-subtitle-text">
                    Verified via Official AICS Montalban Gmail OTP
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playBackspace();
                    setMode('login');
                    setForgotStep('request');
                  }}
                  className="btn-press px-3.5 py-1.5 rounded-xl card-back-button text-xs font-extrabold cursor-pointer"
                >
                  ← Back to Login
                </button>
              </div>

              {forgotError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border-1.5 border-rose-500/80 dark:border-rose-400 text-rose-950 dark:text-rose-100 text-xs font-semibold flex items-center gap-2.5 shadow-md">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border-1.5 border-emerald-500/80 dark:border-emerald-400 text-emerald-950 dark:text-emerald-100 text-xs font-semibold flex items-center gap-2.5 shadow-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {forgotStep === 'request' ? (
                <form onSubmit={handleForgotRequestOtp} className="space-y-5">
                  {/* Invisible Honeypot Field */}
                  <div className="opacity-0 absolute -left-[9999px] -top-[9999px] pointer-events-none select-none h-0 w-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
                    <input
                      type="text"
                      name="forgot_hp_field"
                      value={forgotHoneypot}
                      onChange={(e) => setForgotHoneypot(e.target.value)}
                      autoComplete="off"
                      tabIndex={-1}
                    />
                  </div>

                  {forgotCooldownSeconds > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-between gap-3 animate-pulse">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Masyadong maraming paghingi ng OTP. Maghintay muna.</span>
                      </div>
                      <span className="font-mono px-2 py-1 rounded-lg bg-amber-500/20 text-xs">
                        {Math.floor(forgotCooldownSeconds / 60)}:{(forgotCooldownSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-extrabold register-label flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                      <span>Enter Student ID Number or Registered Email</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForgotIdentifier(/[a-zA-Z@._]/.test(v) ? v : maskStudentId(v, forgotIdentifier));
                      }}
                      placeholder="e.g. 23-0001 or name@gmail.com"
                      className="w-full px-4 py-3 sm:py-3.5 rounded-xl cosmic-input text-sm font-semibold focus:outline-none"
                    />
                    <p className="text-[11px] font-medium text-slate-600 dark:text-sky-200/90 leading-tight">
                      We will send a 6-digit OTP verification code to your registered email address.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-press w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:opacity-95 text-white text-sm font-extrabold shadow-lg shadow-blue-950/20 border border-white/20 lg-signin-btn disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {forgotLoading ? 'Sending OTP Code...' : 'Send 6-Digit Verification OTP →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotResetPassword} className="space-y-5">
                  <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-700 text-xs text-blue-900 dark:text-blue-100 font-medium">
                    We sent a 6-digit OTP code to <strong>{forgotMaskedEmail}</strong>. Please check your inbox.
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-extrabold register-label">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full px-4 py-3 rounded-xl cosmic-input text-center text-lg font-mono font-extrabold tracking-widest focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold register-label">New Password</label>
                      <div className="relative">
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Min 6 characters"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playToggleSwitch(true);
                            setShowForgotNewPassword((prev) => !prev);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          title={showForgotNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showForgotNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold register-label">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showForgotConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="Repeat password"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playToggleSwitch(true);
                            setShowForgotConfirmPassword((prev) => !prev);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          title={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showForgotConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-press w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:opacity-95 text-white text-sm font-extrabold shadow-lg shadow-emerald-950/20 border border-white/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {forgotLoading ? 'Updating Password...' : 'Save New Password & Sign In →'}
                  </button>
                </form>
              )}
            </div>
          )}
        </motion.div>

      </div>
    </main>

      {/* Footer (Hidden on mobile or when virtual keyboard opens, keeping the screen Messenger-clean) */}
      <footer className="relative z-20 py-4 text-center text-xs text-[#9BCBFF]/75 border-t border-white/10 bg-[#0B1E48]/50 student-footer lg-glass-footer hidden sm:block">
        Official Student Concern & Peer Referral Portal · Asian Institute of Computer Studies – Montalban (RA 10173 Protected)
      </footer>

      {/* ====================================================
          REGISTRATION STATUS MODAL (Lottie-Grade Animated Dialog - 0% Lag)
          ==================================================== */}
      {regStatusModal && (
        <div className="fixed inset-0 z-50 bg-[#06122B]/90 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl border-2 ${
              regStatusModal.type === 'error'
                ? 'bg-[#0E1528] border-rose-500/70 text-white'
                : 'bg-[#0B1E48] border-emerald-400/80 text-white'
            }`}
          >
            {/* Animated Lottie-Style Pure SVG Badge Header */}
            <div className="flex flex-col items-center text-center space-y-3 pt-1">
              {regStatusModal.type === 'error' ? (
                <div className="relative">
                  <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-500/60 flex items-center justify-center shadow-lg shadow-rose-950/60">
                    <motion.svg
                      viewBox="0 0 24 24"
                      className="w-9 h-9 text-rose-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animate={{
                        rotate: [0, -8, 8, -6, 6, 0],
                        scale: [1, 1.08, 1],
                      }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </motion.svg>
                  </div>
                  {/* Subtle Radar Ripple */}
                  <span className="absolute inset-0 rounded-3xl bg-rose-500/30 animate-ping pointer-events-none" style={{ animationDuration: '2.5s' }} />
                </div>
              ) : (
                <div className="relative">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400/70 flex items-center justify-center shadow-lg shadow-emerald-950/60">
                    <motion.svg
                      viewBox="0 0 24 24"
                      className="w-9 h-9 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1, scale: [0.9, 1.1, 1] }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </motion.svg>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xl font-black tracking-tight text-white">{regStatusModal.title}</h3>
                <p className="text-xs text-sky-200/80 font-medium mt-0.5">AICS Guidance Student Registration</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
              <p className="text-sm font-semibold leading-relaxed text-slate-100">
                {regStatusModal.message}
              </p>

              {/* Step-by-Step Student Guidance List */}
              {regStatusModal.details && regStatusModal.details.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <p className="text-xs font-black uppercase tracking-wider text-rose-300">
                    {isTl ? 'Mga Dapat Ayusin:' : 'Items to Fix:'}
                  </p>
                  <ul className="space-y-1.5">
                    {regStatusModal.details.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-200">
                        <span className="w-4 h-4 rounded-full bg-rose-500/30 text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                          <XCircle className="w-3 h-3" />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playBackspace();
                setRegStatusModal(null);
              }}
              className={`btn-press w-full py-3.5 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-md ${
                regStatusModal.type === 'error'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white active:scale-[0.98]'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white active:scale-[0.98]'
              }`}
            >
              {isTl ? 'Naiintindihan Ko (Ayusin ang Form)' : 'Got It (Review & Fix)'}
            </button>
          </motion.div>
        </div>
      )}

      {/* ====================================================
          ACCOUNT CREATED: CREDENTIALS PREVIEW & PDF BACKUP MODAL
          ==================================================== */}
      {successData && (
        <div className="fixed inset-0 z-50 bg-[#06122B]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6" data-reg-success>
          <div role="dialog" aria-modal="true" aria-label={isTl ? 'Nagawa ang account' : 'Account created'} className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0B1E48] border-2 border-emerald-400 p-5 sm:p-7 space-y-5 shadow-2xl text-left text-white">
            <div className="flex items-center gap-3.5 border-b border-white/10 pb-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-emerald-950/50">
                <Check className="w-7 h-7 text-white stroke-[3]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  {isTl ? 'MATAGUMPAY NA REHISTRO' : 'REGISTRATION SUCCESSFUL'}
                </span>
                <h3 className="text-xl font-black text-white leading-tight mt-1">
                  {isTl ? 'Nagawa na ang iyong Account!' : 'Your Account is Ready!'}
                </h3>
              </div>
            </div>

            {/* Credential Preview Card */}
            <div className="rounded-2xl bg-white/10 dark:bg-black/30 border border-white/20 p-4.5 space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-200">
                  {isTl ? 'Mga Detalye sa Pag-login (Credentials)' : 'Your Login Credentials'}
                </span>
                <span className="text-[10px] text-amber-300 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                  {isTl ? 'Huwag Iwala' : 'Keep Confidential'}
                </span>
              </div>

              {/* Student Number (Username) */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-300 block">STUDENT NUMBER (USERNAME)</span>
                  <span className="text-lg font-mono font-black text-emerald-300 tracking-wider">
                    {successData.username}
                  </span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                  Official ID
                </span>
              </div>

              {/* Gmail Address */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-[11px] font-bold text-slate-300 block">REGISTERED GMAIL</span>
                  <span className="text-sm font-semibold text-white truncate block">
                    {regEmail || successData.account.email || '—'}
                  </span>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-400/30 shrink-0">
                  Gmail OTP
                </span>
              </div>

              {/* Password Preview */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-300 block">PASSWORD</span>
                  <span className="text-base font-mono font-bold text-rose-300 tracking-wide">
                    {showBackupPassword ? (successData.plainPassword || regPassword || '••••••••') : '••••••••••••'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playToggleSwitch(true);
                    setShowBackupPassword((prev) => !prev);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  {showBackupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showBackupPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
            </div>

            {/* Prominent PDF Backup Download Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-600/20 via-blue-600/30 to-sky-600/20 border border-sky-400/40 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-slate-200">
                  <p className="font-bold text-white text-sm">
                    {isTl ? 'I-download ang PDF Backup Form' : 'Download Credential Backup PDF'}
                  </p>
                  <p className="text-sky-200/90 text-[11px] mt-0.5">
                    {isTl
                      ? 'Kung sakaling makalimutan mo ang iyong password o student number, i-download itong opisyal na PDF file para may kopya ka anumang oras.'
                      : 'Save this official AICS credential slip to your phone or computer so you never lose access to your account.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadCredentialBackupPdf}
                className="btn-press w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all border border-white/20"
              >
                <Download className="w-4 h-4" />
                <span>{isTl ? 'I-DOWNLOAD ANG PDF BACKUP FORM' : 'DOWNLOAD PDF BACKUP CARD'}</span>
              </button>
            </div>

            {/* Proceed to Dashboard Button */}
            <button
              type="button"
              data-reg-success-go
              onClick={() => {
                soundFX.playSuccessCheck();
                onLoginSuccess(successData.account);
              }}
              className="btn-press w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:opacity-95 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isTl ? 'Naintindihan ko — Pumasok sa Dashboard' : 'Got it — Enter Student Dashboard'}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* ====================================================
          NEW FEATURE: MANDATORY POST-REGISTRATION 5-DIGIT PIN CONFIRMATION
          (Required for every newly created account before entering student dashboard)
          ==================================================== */}
      {successData && postRegPinStep && (
        <div className="fixed inset-0 z-50 bg-[#06122B]/95 backdrop-blur-xl flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border-2 border-sky-400/60 bg-[#0A1A3D] text-white text-center"
          >
            {/* Lottie-Style Animated PIN Shield Header */}
            <div className="relative mx-auto w-16 h-16 rounded-3xl bg-sky-500/20 border-2 border-sky-400/70 flex items-center justify-center shadow-lg shadow-sky-950/60">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Lock className="w-8 h-8 text-sky-300" />
              </motion.div>
              <span className="absolute inset-0 rounded-3xl bg-sky-400/25 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/30">
                {isTl ? 'BAGONG TAMPOK (SECURITY PIN)' : 'NEW SECURITY FEATURE'}
              </span>
              <h3 className="text-xl font-black text-white pt-2">
                {isTl ? 'Ilagay ang Iyong 5-Digit PIN' : 'Enter Your 5-Digit PIN'}
              </h3>
              <p className="text-xs text-sky-200/80 font-medium">
                {isTl
                  ? 'I-type ang 5-digit PIN na iyong itinakda kanina upang kumpirmahin ang seguridad bago pumasok sa dashboard.'
                  : 'Enter the 5-digit PIN you just created to verify security before proceeding to your dashboard.'}
              </p>
            </div>

            {/* PIN Input Box */}
            <div className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                autoFocus
                value={postRegPinInput}
                onChange={(e) => {
                  setPostRegPinError(null);
                  const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setPostRegPinInput(val);
                }}
                placeholder="• • • • •"
                className="w-full py-4 px-4 rounded-2xl bg-black/40 border-2 border-sky-400/50 text-white text-2xl font-mono font-bold tracking-[0.5em] text-center focus:outline-none focus:border-emerald-400 transition-colors shadow-inner"
              />

              {postRegPinError && (
                <p className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1.5 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{postRegPinError}</span>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (postRegPinInput.length !== 5) {
                    soundFX.playError();
                    setPostRegPinError(isTl ? 'Dapat eksaktong 5 digits ang PIN.' : 'PIN must be exactly 5 digits.');
                    return;
                  }
                  if (regQuickPin.trim() && postRegPinInput !== regQuickPin.trim()) {
                    soundFX.playError();
                    setPostRegPinError(isTl ? 'Maling PIN! Hindi ito tumutugma sa ginawa mong PIN.' : 'Incorrect PIN! Does not match the PIN you registered.');
                    return;
                  }

                  soundFX.playSuccessCheck();
                  onLoginSuccess(successData.account);
                }}
                className="btn-press w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isTl ? 'Kumpirmahin at Pumasok sa Dashboard' : 'Confirm PIN & Open Dashboard'}</span>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.playBackspace();
                  setPostRegPinStep(false);
                }}
                className="text-xs text-sky-300/80 hover:text-white font-bold transition-colors cursor-pointer"
              >
                {isTl ? '← Tingnan Muli ang Account Details' : '← Review Account Details'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ====================================================
          DATA PRIVACY TERMS & CONDITIONS MODAL
          (Apple iOS System Modal Sheet Style & SF Pro Typography)
          ==================================================== */}
      {showPrivacyModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6" data-terms-modal>
            <div className="w-full max-w-xl rounded-t-[28px] sm:rounded-[28px] bg-[#F2F2F7] dark:bg-[#1C1C1E] text-slate-900 dark:text-white border border-slate-300/80 dark:border-white/10 shadow-2xl max-h-[88vh] flex flex-col overflow-hidden font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Inter',sans-serif]">
              {/* Apple Drag Indicator Pill (Mobile Sheet Handle) */}
              <div className="sm:hidden w-full flex justify-center pt-2.5 pb-1">
                <div className="w-9 h-1 rounded-full bg-slate-400/50 dark:bg-white/20" />
              </div>

              {/* Apple Header Bar */}
              <div className="px-5 py-4 border-b border-slate-300/60 dark:border-white/10 flex items-center justify-between bg-white/70 dark:bg-[#2C2C2E]/70 backdrop-blur-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                      {isTl ? 'Kasunduan sa Data Privacy' : 'Data Privacy Agreement'}
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-normal">
                      Republic Act No. 10173 · DepEd Child Protection
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playBackspace();
                    setShowPrivacyModal(false);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-200/80 dark:bg-white/15 hover:bg-slate-300 dark:hover:bg-white/25 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Apple Inset Grouped List Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-[13px] leading-relaxed">
                {/* Info Callout */}
                <div className="p-3.5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-400/30 text-blue-900 dark:text-blue-200 text-xs font-semibold flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    {isTl
                      ? 'Nilikha ang portal na ito upang protektahan ang iyong kaligtasan at kapakanan sa AICS Montalban. Pakisuyong basahin ang kasunduan bago magparehistro.'
                      : 'This portal is designed to safeguard your well-being and privacy as an AICS student. Please review these terms prior to account registration.'}
                  </span>
                </div>

                {/* Section 1 */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-slate-200/80 dark:border-white/5 shadow-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-[13px]">
                      {isTl ? 'Proteksyon sa ilalim ng RA 10173 (Data Privacy)' : 'Protection under RA 10173'}
                    </h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs pl-7">
                    {isTl
                      ? 'Lahat ng personal na impormasyon (Pangalan, Contact Number at Student Number) ay ituturing na mahigpit na kumpidensyal. Tanging ang Guidance Office lamang ang may pahintulot na humawak nito.'
                      : 'All personal data (Name, Contact Number and Student Number) will be held with strict confidentiality, exclusively accessible by authorized Guidance counselors.'}
                  </p>
                </div>

                {/* Section 2 */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-slate-200/80 dark:border-white/5 shadow-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-[13px]">
                      {isTl ? 'Proteksyon Laban sa Retaliation (Pagganti)' : 'Non-Retaliation & Safety Assurance'}
                    </h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs pl-7">
                    {isTl
                      ? 'Mahigpit na ipinagbabawal ang anumang uri ng paghihiganti. Ang iyong isinumiteng reklamo ay HINDI kailanman ibubunyag sa inirereklamong kaklase o hindi awtorisadong tao.'
                      : 'Retaliation is strictly prohibited. Your concerns and statements will NEVER be disclosed to reported peers or unauthorized parties.'}
                  </p>
                </div>

                {/* Section 3 */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-slate-200/80 dark:border-white/5 shadow-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-[13px]">
                      {isTl ? 'Awtomatikong Pag-Logout para sa Seguridad' : 'Automatic Session Security Lock'}
                    </h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs pl-7">
                    {isTl
                      ? 'Sakaling maiwan mo ang iyong cellphone o computer, awtomatikong magla-lock out ang iyong session pagkatapos ng 15 minuto upang walang makakita ng iyong ulat.'
                      : 'To protect you if a device is left unattended, sessions terminate automatically after 15 minutes of inactivity.'}
                  </p>
                </div>

                {/* Section 4 */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-slate-200/80 dark:border-white/5 shadow-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">4</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-[13px]">
                      {isTl ? 'Tapat at Makatotohanang Pag-uulat' : 'Truthfulness of Information'}
                    </h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs pl-7">
                    {isTl
                      ? 'Sumasang-ayon ka na maging tapat sa mga isusulat. Ang sadyang pagpapasa ng gawa-gawang paratang ay may karampatang disiplina alinsunod sa Student Handbook.'
                      : 'You agree to provide honest information. Malicious or fabricated reports are subject to institutional disciplinary measures under school policy.'}
                  </p>
                </div>
              </div>

              <p className="px-5 pb-3 text-[12px] text-slate-600 dark:text-slate-300">
                {isTl ? 'Buong detalye: ' : 'Full details: '}
                <button type="button" onClick={() => setLegalTab('privacy')} className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">Privacy Notice</button>
                {' · '}
                <button type="button" onClick={() => setLegalTab('terms')} className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">Terms of Use</button>
              </p>
              {/* Apple Action Bar */}
              <div className="p-4 bg-white/70 dark:bg-[#2C2C2E]/70 backdrop-blur-lg border-t border-slate-300/60 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5 safe-area-bottom">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playBackspace();
                    setShowPrivacyModal(false);
                  }}
                  className="btn-press w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all hover:bg-slate-300 dark:hover:bg-white/15"
                >
                  {isTl ? 'Bumalik' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.playSuccessCheck();
                    setPrivacyAgreed(true);
                    setShowPrivacyModal(false);
                    setMode('register');
                  }}
                  className="btn-press w-full sm:w-auto px-6 py-3 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isTl ? 'Sumasang-ayon Ako' : 'Agree & Continue'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
      <PrivacyTerms open={!!legalTab} initialTab={legalTab ?? 'privacy'} isTl={isTl} onClose={() => setLegalTab(null)} />
    </MotionConfig>
  );
};
