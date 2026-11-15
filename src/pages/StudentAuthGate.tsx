import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  FileText,
  Shield,
  ShieldCheck,
  Check,
  RefreshCw,
  Download,
  MessageSquare,
  Calendar,
  HeartHandshake,
  PhoneCall,
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Users,
  Compass,
  CheckCircle2,
  HelpCircle,
  FileHeart,
  SmilePlus,
} from 'lucide-react';
import { CelestialBackground } from '../components/auth/CelestialBackground';
import { WavyBackground } from '../components/auth/WavyBackground';
import { useStudentEncouragementWings, StudentPairInteractiveWing } from '../components/auth/StudentEncouragementWing';
import { SoundTogglePill, soundFX } from '../services/soundEngine';
import { SkyThemePill } from '../context/ThemeContext';
import { LocaleSwitchPill, useLanguage } from '../context/LanguageContext';
import { SafezoneMascot } from '../components/auth/SafezoneMascot';
import { CloudflareTurnstile } from '../components/auth/CloudflareTurnstile';
import { LiveCameraCaptureModal } from '../components/student/LiveCameraCaptureModal';
import { compressImageClientSide } from '../services/imageOptimizer';
import {
  StudentPortalUser,
  registerStudentPortalAccount,
  loginStudentPortal,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
} from '../services/studentAuthService';
import { studentLoginRateLimiter, studentForgotRateLimiter, studentRegisterRateLimiter } from '../services/rateLimiter';

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
  const isTl = locale === 'tl';
  const { boyWing, girlWing } = useStudentEncouragementWings();

  const [mode, setMode] = useState<PortalAuthMode>('login');

  // Carousel state for rotating psychiatrist mental health & anti-bullying affirmations
  const [affirmationIndex, setAffirmationIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  useEffect(() => {
    // Automatically pause carousel while student is registering to ensure 100% smooth, stutter-free input typing
    if (isCarouselPaused || mode === 'register') return;
    const interval = setInterval(() => {
      setAffirmationIndex((prev) => (prev + 1) % MENTAL_HEALTH_AFFIRMATIONS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isCarouselPaused, mode]);

  // ==========================================
  // LOGIN FORM STATE & SECURITY
  // ==========================================
  const [loginStudentNumber, setLoginStudentNumber] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Invisible Honeypot Anti-Bot Traps (Real students never see or fill these)
  const [loginHoneypot, setLoginHoneypot] = useState('');
  const [regHoneypot, setRegHoneypot] = useState('');
  const [forgotHoneypot, setForgotHoneypot] = useState('');

  // Rate Limiting Cooldown Seconds
  const [loginCooldownSeconds, setLoginCooldownSeconds] = useState(0);
  const [forgotCooldownSeconds, setForgotCooldownSeconds] = useState(0);

  // Cloudflare Turnstile Token State
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
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
          ? 'Para i-install ang AICS Kalang Ba sa iyong cellphone: Pindutin ang tatlong tuldok (⋮) sa browser at piliin ang "Install app" o "Add to Home screen"!'
          : 'To install AICS Kalang Ba on your phone: Tap the browser menu (⋮) and select "Install app" or "Add to Home screen"!'
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
  const [regLastName, setRegLastName] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regMiddleInitial, setRegMiddleInitial] = useState('');
  const [regContactNumber, setRegContactNumber] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStudentNumber, setRegStudentNumber] = useState('');
  const [regGradeLevel, setRegGradeLevel] = useState('11');
  const [regStrand, setRegStrand] = useState('ICT');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regQuickPin, setRegQuickPin] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Privacy Terms & Conditions Modal State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

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
  const [show20sScanner, setShow20sScanner] = useState(false);
  const [scanPendingAccount, setScanPendingAccount] = useState<any>(null);
  const [scanForcedError, setScanForcedError] = useState<string | null>(null);

  // Success Modal State
  const [successData, setSuccessData] = useState<{
    username: string;
    account: StudentPortalUser;
  } | null>(null);

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
    if (!regMiddleInitial.trim()) return { type: 'not_input', label: 'OPTIONAL (N/A)' };
    if (regMiddleInitial.trim().length > 2) return { type: 'wrong', label: '1 letter' };
    return { type: 'correct', label: 'Correct' };
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
    return { type: 'correct', label: 'Valid Gmail ✓' };
  }, [regEmail]);

  // 5. Student Number
  const studentNumberStatus = useMemo(() => {
    const num = regStudentNumber.trim();
    if (!num) return { type: 'not_input', label: 'Not Input' };
    if (num.length < 5) return { type: 'wrong', label: 'Invalid ID' };
    return { type: 'correct', label: 'Correct' };
  }, [regStudentNumber]);

  // 6. Uploaded / Captured Student Verification ID
  const studentIdStatus = useMemo(() => {
    if (!studentIdFile) return { type: 'not_input', label: isMobileDevice ? 'Live Cam Required' : 'Not Uploaded' };
    return { type: 'correct', label: 'ID Verified ✓' };
  }, [studentIdFile, isMobileDevice]);

  // 6b. Live Personal Face Photo
  const personalPhotoStatus = useMemo(() => {
    if (!personalPhotoFile) return { type: 'not_input', label: isMobileDevice ? 'Live Selfie Required' : 'Not Uploaded' };
    return { type: 'correct', label: 'Face Verified ✓' };
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
    return { type: 'correct', label: 'Matched ✓' };
  }, [regConfirmPassword, regPassword]);

  // 9. 5-Digit Quick Unlock PIN (for mobile & daily login convenience)
  const quickPinStatus = useMemo(() => {
    const cleaned = regQuickPin.trim();
    if (!cleaned) return { type: 'not_input', label: 'Not Input' };
    if (!/^\d{5}$/.test(cleaned)) return { type: 'wrong', label: 'Must be 5 digits' };
    return { type: 'correct', label: '5-Digit PIN Set ✓' };
  }, [regQuickPin]);

  // Check if form is ready to submit (Student ID card is no longer required as face selfie is captured)
  const isRegisterFormValid =
    lastNameStatus.type === 'correct' &&
    firstNameStatus.type === 'correct' &&
    phoneStatus.type === 'correct' &&
    emailStatus.type === 'correct' &&
    studentNumberStatus.type === 'correct' &&
    personalPhotoStatus.type === 'correct' &&
    passwordStatus.type === 'correct' &&
    confirmPasswordStatus.type === 'correct' &&
    quickPinStatus.type === 'correct';

  // Badge render helper
  const renderBadge = (status: { type: string; label: string }) => {
    if (status.type === 'correct') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full badge-correct shadow-xs">
          <span>✓</span> {status.label}
        </span>
      );
    }
    if (status.type === 'wrong') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full badge-wrong shadow-xs">
          <span>✕</span> {status.label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full badge-not-input whitespace-nowrap">
        <span>○</span> {status.label}
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
      setRegError('Security verification failed. Please try again.');
      return;
    }

    if (!isRegisterFormValid) {
      soundFX.playError();
      setRegError(isTl ? 'Pakisuyong ayusin ang mga may maling input bago mag-submit.' : 'Please fix the highlighted inputs before proceeding.');
      return;
    }

    setRegLoading(true);
    setRegError(null);

    try {
      const res = await registerStudentPortalAccount({
        lastName: regLastName,
        firstName: regFirstName,
        middleInitial: regMiddleInitial,
        contactNumber: regContactNumber,
        email: regEmail,
        studentNumber: regStudentNumber,
        password: regPassword,
        quickPin: regQuickPin.trim(),
        gradeSection: `Grade ${regGradeLevel} · ${regStrand}`,
        studentIdFile,
        personalPhotoFile,
      });

      setRegLoading(false);

      if (!res.success || !res.account) {
        soundFX.playError();
        setRegError(res.error || (isTl ? 'Hindi nagawa ang account. Subukan ulit.' : 'The account was not created. Please try again.'));
      } else {
        studentRegisterRateLimiter.reset();
        soundFX.playSuccessCheck();
        setSuccessData({ username: res.account.studentNumber, account: res.account });
      }
    } catch (err: any) {
      setRegLoading(false);
      soundFX.playError();
      setRegError(isTl ? 'Walang koneksyon. I-check ang internet, tapos subukan ulit.' : 'No connection. Check the internet, then try again.');
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
          ? `Masyadong maraming maling pagsubok. Naka-lockout ang pag-login ng ${timeStr}.`
          : `Too many failed attempts. Login locked out for ${timeStr}.`
      );
      return;
    }

    if (!loginStudentNumber.trim() || !loginPassword) {
      soundFX.playError();
      setLoginError(isTl ? 'Ilagay ang iyong Student ID Number at Password.' : 'Please enter your Student ID Number and Password.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    const res = await loginStudentPortal(loginStudentNumber, loginPassword);
    setLoginLoading(false);

    if (!res.success || !res.account) {
      // Record failed attempt in Rate Limiter
      const attemptRes = studentLoginRateLimiter.recordFailedAttempt();
      soundFX.playError();

      if (attemptRes.locked) {
        setLoginError(
          isTl
            ? 'Naabot ang maximum na 5 maling pagsubok! Naka-lockout ang account ng 5 minuto para sa proteksyon.'
            : 'Maximum 5 failed attempts reached! Account temporarily locked out for 5 minutes for security.'
        );
      } else {
        const remaining = 5 - attemptRes.attempts;
        setLoginError(
          `${res.error || 'Invalid Student ID or Password.'} (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
        );
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

    const res = await sendForgotPasswordOtp(forgotIdentifier);
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

    const res = await resetPasswordWithOtp(forgotIdentifier, forgotOtp, forgotNewPassword);
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
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden font-sans select-none bg-[#030B18] dark:bg-[#020710] text-slate-100">
      
      {/* Dynamic Institutional Ambient Background with Desaturated Campus Photo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute inset-0 bg-no-repeat bg-cover bg-center opacity-[0.22] dark:opacity-[0.14] filter saturate-[0.7] mix-blend-luminosity scale-105 transition-opacity"
          style={{ backgroundImage: `url('/aics-campus-header.jpg')` }}
        />
        {/* Multi-Stop Directional Institutional Navy & Teal Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030B18] via-[#071E3D]/92 to-[#030B18]/78" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030B18]/95 via-transparent to-[#030B18]" />
        
        {/* Subtle Concentric Orbital Rings (CDM-style academic geometry) */}
        <div className="absolute -top-32 -right-32 w-[680px] h-[680px] rounded-full border border-sky-400/10 pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-[520px] h-[520px] rounded-full border border-amber-400/10 pointer-events-none" />
        <div className="absolute top-1/2 -left-48 w-[600px] h-[600px] rounded-full border border-teal-400/10 pointer-events-none" />
      </div>

      {/* ====================================================
          1. STICKY INSTITUTIONAL HEADER & BRAND CLUSTER
          ==================================================== */}
      <header className="sticky top-0 z-40 w-full px-4 sm:px-8 py-3.5 border-b border-white/10 dark:border-white/5 bg-[#030B18]/90 dark:bg-[#020710]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Official AICS Crest & Institution Typography */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full p-0.5 bg-white/20 ring-2 ring-white/60 shadow-xl overflow-hidden flex items-center justify-center">
                <img
                  src="/aics-logo.jpg"
                  alt="AICS Logo"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-[#030B18] shadow-sm"
                title="100% Confidential & RA 10173 Protected"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black tracking-wide text-white uppercase truncate">
                  Asian Institute of Computer Studies
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-[10px] font-extrabold text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  MONTALBAN CAMPUS
                </span>
              </div>
              <p className="text-xs text-[#9BCBFF] font-medium tracking-wide">
                GUIDANCE & COUNSELING SERVICES · SAFEZONE PORTAL
              </p>
            </div>
          </div>

          {/* Right: Quick Controls, Language Switcher, Theme & Install */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleInstallApp}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-sky-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>{isTl ? 'I-install ang App' : 'Install App'}</span>
            </button>

            <div className="flex items-center p-1 rounded-full bg-white/10 dark:bg-white/5 border border-white/15 dark:border-white/10 shadow-inner">
              <SoundTogglePill />
              <div className="h-4 w-[1px] bg-white/20 mx-1" />
              <LocaleSwitchPill />
              <div className="h-4 w-[1px] bg-white/20 mx-1" />
              <SkyThemePill />
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playToggleSwitch(true);
                window.location.reload();
              }}
              title={isTl ? 'I-refresh ang pahina' : 'Refresh page'}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-sky-200 border border-white/15 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================
          2. MAIN HERO & FORM CONTAINER
          ==================================================== */}
      <main className="relative z-20 flex-1 flex flex-col justify-center px-4 sm:px-8 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto w-full">

          {/* ====================================================
              MODE: LOGIN SCREEN (CDM-Style Asymmetric 2-Column Hero)
              ==================================================== */}
          {mode === 'login' && (
            <div className="space-y-16">
              
              {/* TOP HERO ROW: Left Editorial Typography + Right Floating Login Card */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                
                {/* Left Column: Boy & Girl Students with Unified Guidance Speech Bubble + Editorial Affirmation */}
                <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-left space-y-6">
                  {/* Eyebrow with Amber Dash & Live Status */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-[2px] bg-amber-400" />
                    <span className="text-xs sm:text-sm font-extrabold tracking-[0.18em] uppercase text-amber-400">
                      AICS GUIDANCE & COUNSELING SAFEGUARD
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-bold text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      PEER SUPPORT LIVE
                    </span>
                  </div>

                  {/* Headline */}
                  <div className="space-y-1">
                    <h1 className="text-3xl sm:text-5xl xl:text-6xl font-serif font-black tracking-tight text-white leading-[1.02]">
                      Your Safe Space. Your Voice. <br />
                      <span className="text-amber-400 italic">One SafeZone.</span>
                    </h1>
                  </div>

                  {/* Dual Student Interactive Wing (Boy & Girl with Single Unified Speech Bubble) */}
                  <div className="w-full pt-1">
                    <StudentPairInteractiveWing />
                  </div>

                  {/* 3 Pillar Reassurance Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 w-full max-w-2xl">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                        <ShieldCheck className="w-4 h-4" />
                        <span>{isTl ? '100% Kumpidensyal' : '100% Confidential'}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {isTl ? 'Guidance Office lamang ang nakakakita ng iyong report.' : 'Strictly restricted to licensed Guidance staff.'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
                      <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
                        <HeartHandshake className="w-4 h-4" />
                        <span>{isTl ? 'Walang Balikan' : 'Zero Retaliation'}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {isTl ? 'Protektado laban sa anumang pambu-bully o ganti.' : 'Guaranteed safety and institutional peer protection.'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isTl ? 'Gumaan ang Loob' : 'Peace of Mind'}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {isTl ? 'Mababawasan ang iyong dinadalang bigat sa eskwela.' : 'Compassionate guidance to resolve problems early.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: CDM-Inspired Sleek Floating Login Card */}
                <div className="lg:col-span-5 w-full max-w-md mx-auto">
                  <div className="relative rounded-3xl bg-[#081832]/95 dark:bg-[#061326]/95 border border-white/15 dark:border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5 text-left">
                    
                    {/* Top Golden Accent Indicator Bar */}
                    <div className="w-12 h-1 rounded-full bg-amber-400" />

                    {/* Card Header */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold tracking-widest uppercase text-emerald-400">
                          {isTl ? 'PORTAL LOGIN' : 'STUDENT PORTAL ACCESS'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          RA 10173 SECURE
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight">
                        {isTl ? 'Maligayang Pagbabalik' : 'Welcome back'}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 font-medium">
                        {isTl ? 'Mag-sign in gamit ang iyong Student ID at Password.' : 'Sign in with your student credentials.'}
                      </p>
                    </div>

                    {/* Login Error Notification */}
                    {loginError && (
                      <div
                        role="alert"
                        className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs sm:text-sm font-bold flex items-start gap-2.5 shadow-md"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 leading-snug">
                          {loginError}
                        </div>
                      </div>
                    )}

                    {/* Form Component */}
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      {/* Invisible Honeypot Anti-Bot Field */}
                      <div className="opacity-0 absolute -left-[9999px] -top-[9999px] pointer-events-none select-none h-0 w-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
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

                      {/* Lockout Warning */}
                      {loginCooldownSeconds > 0 && (
                        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-between">
                          <span>{isTl ? 'Pansamantalang naka-lockout' : 'Login temporarily locked out'}</span>
                          <span className="font-mono">
                            {Math.floor(loginCooldownSeconds / 60)}:{(loginCooldownSeconds % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      )}

                      {/* Student Number Input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold uppercase tracking-wide text-slate-300">
                          {isTl ? 'Student ID Number' : 'Student ID Number'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <User className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            required
                            value={loginStudentNumber}
                            onChange={(e) => setLoginStudentNumber(e.target.value)}
                            placeholder="Hal. 2024-12345"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#040F22] border border-white/20 text-white placeholder-slate-400 text-sm font-semibold focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Password Input */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-extrabold uppercase tracking-wide text-slate-300">
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playToggleSwitch(true);
                              setMode('forgot');
                              setForgotIdentifier(loginStudentNumber);
                            }}
                            className="text-xs text-sky-400 hover:text-sky-300 hover:underline font-bold"
                          >
                            {isTl ? 'Nakalimutan?' : 'Forgot?'}
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <Lock className="w-4 h-4" />
                          </span>
                          <input
                            type={showLoginPassword ? 'text' : 'password'}
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#040F22] border border-white/20 text-white placeholder-slate-400 text-sm font-semibold focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playToggleSwitch(true);
                              setShowLoginPassword((prev) => !prev);
                            }}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                            title={showLoginPassword ? 'Hide password' : 'Show password'}
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Primary Sign In Button (Bespoke Human-Crafted State) */}
                      <button
                        type="submit"
                        disabled={loginLoading || loginCooldownSeconds > 0}
                        className="btn-human-primary w-full py-3.5 rounded-xl bg-[#0F3A78] hover:bg-[#15468E] active:scale-[0.975] text-white text-sm font-extrabold shadow-md border border-sky-400/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
                      >
                        {loginLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>{isTl ? 'Pina-process ang account...' : 'Signing in...'}</span>
                          </div>
                        ) : (
                          <>
                            <span>{isTl ? 'Pumasok sa SafeZone Portal' : 'Sign in to SafeZone Portal'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      {/* Turnstile / Bot Verification */}
                      <div className="pt-1 flex justify-center">
                        <CloudflareTurnstile
                          siteKey={CLOUDFLARE_SITE_KEY}
                          onVerify={(token) => {
                            setTurnstileToken(token);
                            soundFX.playToggleSwitch(true);
                          }}
                          onExpire={() => setTurnstileToken(null)}
                          onError={(err) => console.warn('Turnstile note:', err)}
                        />
                      </div>
                    </form>

                    {/* Divider: New Student Registration */}
                    <div className="pt-2 border-t border-white/10 space-y-2.5">
                      <div className="text-center">
                        <span className="text-xs text-slate-300 font-medium">
                          {isTl ? 'Bago ka pa lang sa AICS Guidance Portal?' : 'New to AICS SafeZone Portal?'}
                        </span>
                      </div>

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
                        className="btn-press w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2"
                      >
                        <span>+ {isTl ? 'Gumawa ng Bagong Student Account' : 'Create New Student Account'}</span>
                      </button>
                    </div>

                    {/* Direct Android APK Download Option */}
                    <div className="pt-1 text-center">
                      <a
                        href="/aics-kalang-ba.apk"
                        download="AICS_SafeZone.apk"
                        onClick={() => soundFX.playToggleSwitch(true)}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-300 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isTl ? 'I-download ang Android APK (.apk)' : 'Download Android APK (.apk)'}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* ====================================================
                  SECTION 3: INSTITUTIONAL GUIDANCE WORKSPACES (6-CARD GRID)
                  Inspired by CDM Portal Academic Services Architecture
                  ==================================================== */}
              <div className="pt-10 border-t border-white/10 space-y-8 text-left">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-[2px] bg-sky-400" />
                    <span className="text-xs font-extrabold tracking-[0.18em] uppercase text-sky-400">
                      GUIDANCE WORKSPACES & SERVICES
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-serif font-black text-white tracking-tight">
                    {isTl ? 'Ligtas na suporta sa bawat hakbang mo sa AICS.' : 'Compassionate support in one secure place.'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
                    {isTl
                      ? 'Mag-sign in para ma-access ang iyong kumpidensyal na dashboard at mga serbisyo ng Guidance and Counseling Office.'
                      : 'Sign in to access authorized guidance services, monitor filed concerns, and connect with school counselors.'}
                  </p>
                </div>

                {/* 6 Structured Guidance Capability Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  
                  {/* Card 1: Confidential Concern Filing */}
                  <div className="p-5 rounded-2xl bg-[#081832]/80 border border-white/10 hover:border-sky-400/40 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-sky-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {isTl ? 'Kumpidensyal' : 'Confidential'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {isTl ? '1. Pag-uulat ng Hinaing o Bullying' : '1. Safe Concern & Peer Reporting'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {isTl
                          ? 'Isumite ang mga isyu sa panunukso, cyberbullying, o harassment nang walang takot sa paghihiganti.'
                          : 'Privately submit bullying, academic distress, or peer conflicts directly to Guidance Associates.'}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: 1-on-1 Guidance Counseling */}
                  <div className="p-5 rounded-2xl bg-[#081832]/80 border border-white/10 hover:border-teal-400/40 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-teal-400">
                        <HeartHandshake className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                        {isTl ? 'Kalinga at Suporta' : '1-on-1 Counseling'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {isTl ? '2. Direktang Guidance Consultation' : '2. Direct Guidance Counseling'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {isTl
                          ? 'Makisalamuha at humingi ng payo sa Guidance Associate para gumaan ang loob at mabigyan ng solusyon.'
                          : 'Connect one-on-one with school counselors for emotional and academic well-being support.'}
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Real-Time Chat & Follow-ups */}
                  <div className="p-5 rounded-2xl bg-[#081832]/80 border border-white/10 hover:border-emerald-400/40 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {isTl ? 'Subaybay' : 'Real-Time'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {isTl ? '3. Live Case Status & Guidance Chat' : '3. Case Status Tracking & Chat'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {isTl
                          ? 'Malaman agad kung inaksyunan na ng eskwelahan ang iyong report at mag-chat nang ligtas.'
                          : 'Real-time updates as your report moves from investigation to gentle resolution.'}
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Quick Emergency SOS Discretion */}
                  <div className="p-5 rounded-2xl bg-[#081832]/80 border border-white/10 hover:border-rose-400/40 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-400">
                        <Shield className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        {isTl ? 'Discretion' : 'SOS Protection'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {isTl ? '4. Emergency SOS & Instant Exit' : '4. Emergency SOS & Instant Exit'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {isTl
                          ? 'Isang pindot lang sa SOS mascot, agad magsasara ang app o mag-clear ng history para walang makakitang iba.'
                          : 'Immediate window close and session purge with 5-digit PIN quick lock protection on mobile.'}
                      </p>
                    </div>
                  </div>

                  {/* Card 5: Mental Health Affirmations & Articles */}
                  <div className="p-5 rounded-2xl bg-[#081832]/80 border border-white/10 hover:border-amber-400/40 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                        <FileHeart className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {isTl ? 'Kalusugang Pangkaisipan' : 'Self-Help'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {isTl ? '5. Karapatan at Gabay sa Kapayapaan' : '5. Student Rights & Wellness Guides'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {isTl
                          ? 'Mga gabay alinsunod sa Anti-Bullying Act (RA 10627) upang malaman mo ang iyong proteksyon sa campus.'
                          : 'Institutional policies, mental wellness affirmations, and peer intervention guidelines.'}
                      </p>
                    </div>
                  </div>

                  {/* Card 6: Official Peer Referral Protocol */}
                  <div className="p-5 rounded-2xl bg-[#081832]/80 border border-white/10 hover:border-purple-400/40 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {isTl ? 'Kaibigan / Kaklase' : 'Peer Referral'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {isTl ? '6. Tulong para sa Nangangailangang Kaklase' : '6. Helping a Distressed Peer'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {isTl
                          ? 'Maaari mong ipaalam sa Guidance Office kung may kaklaseng labis na nalulungkot o nanganganib.'
                          : 'Confidentially refer fellow classmates who may be struggling in silence.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Institutional Privacy & Confidentiality Guarantee Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/40 via-sky-900/30 to-teal-900/40 border border-sky-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {isTl ? 'Garantisadong Ligtas sa Ilalim ng RA 10173 at RA 10627' : 'Strict Institutional Confidentiality Guarantee'}
                      </h4>
                      <p className="text-xs text-slate-300">
                        {isTl
                          ? 'Hindi kailanman ibinubunyag sa publiko ang anumang report o pagkakakilanlan.'
                          : 'Student records and reports never appear on public screens and remain protected.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playToggleSwitch(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-white transition-colors shrink-0"
                  >
                    {isTl ? 'Mag-sign In para Mag-report →' : 'Sign In to File a Report →'}
                  </button>
                </div>
              </div>

              {/* ====================================================
                  SECTION 4: ROLE-BASED ENTRY POINTS ("GETTING STARTED")
                  ==================================================== */}
              <div className="pt-6 border-t border-white/10 space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-[2px] bg-amber-400" />
                  <span className="text-xs font-extrabold tracking-[0.18em] uppercase text-amber-400">
                    GETTING STARTED BY ROLE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Role 01: Students */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/30 transition-colors flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <span className="text-xs font-mono font-black text-amber-400 tracking-wider">01 · STUDENTS</span>
                      <h4 className="text-base font-bold text-white">
                        {isTl ? 'Mag-ulat o Humingi ng Tulong' : 'Report Concerns & Seek Help'}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {isTl
                          ? 'Gumawa ng account gamit ang iyong Student Number upang makapagsumite ng concern at mag-chat sa Guidance.'
                          : 'Create or unlock your student account to file concerns and track resolution in private.'}
                      </p>
                    </div>
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
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-300 hover:text-amber-200"
                    >
                      <span>{isTl ? 'Gumawa ng Account →' : 'Create Account →'}</span>
                    </button>
                  </div>

                  {/* Role 02: Guidance Associates */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-sky-400/30 transition-colors flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <span className="text-xs font-mono font-black text-sky-400 tracking-wider">02 · GUIDANCE ASSOCIATES</span>
                      <h4 className="text-base font-bold text-white">
                        {isTl ? 'Opisyal na Guidance Terminal' : 'Official Guidance Terminal'}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {isTl
                          ? 'Nakalaan para sa awtorisadong kawani ng Guidance Office sa pamamahala ng mga kaso at interbensyon.'
                          : 'Desktop terminal for licensed Guidance personnel to review cases and schedule sessions.'}
                      </p>
                    </div>
                    <a
                      href="?mode=staff#staff"
                      onClick={() => soundFX.playToggleSwitch(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-sky-300 hover:text-sky-200"
                    >
                      <span>{isTl ? 'Staff Desktop Terminal →' : 'Staff Terminal Login →'}</span>
                    </a>
                  </div>

                  {/* Role 03: Teachers & Campus Officers */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/30 transition-colors flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <span className="text-xs font-mono font-black text-emerald-400 tracking-wider">03 · FACULTY & STAFF</span>
                      <h4 className="text-base font-bold text-white">
                        {isTl ? 'Student Endorsement & Referral' : 'Student Endorsement & Care'}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {isTl
                          ? 'I-endorse ang mga estudyanteng nangangailangan ng agarang gabay sa silid-aralan.'
                          : 'Endorse students exhibiting signs of distress or behavioral changes for early guidance.'}
                      </p>
                    </div>
                    <a
                      href="?mode=staff#staff"
                      onClick={() => soundFX.playToggleSwitch(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-300 hover:text-emerald-200"
                    >
                      <span>{isTl ? 'Staff Referral →' : 'Staff Referral Access →'}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              MODE: REGISTER / CREATE ACCOUNT (Clean Spacious Form)
              ==================================================== */}
          {mode === 'register' && (
            <div className="space-y-8">
              {/* Header inside Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 dark:border-white/15 pb-5">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight card-title-text">
                    {isTl ? 'Gumawa ng Student Account' : 'Create Student Account'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playBackspace();
                    setMode('login');
                  }}
                  className="btn-press px-5 py-2.5 rounded-xl card-back-button text-xs font-extrabold self-start sm:self-auto"
                >
                  {isTl ? '← Bumalik sa Sign In' : '← Back to Login'}
                </button>
              </div>

              {regError && (
                <div className="p-4 rounded-2xl bg-rose-500/25 border border-rose-500/50 text-rose-200 text-sm font-semibold flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-8">
                {/* Invisible Honeypot Anti-Bot Field for Register */}
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

                {/* 1. STUDENT IDENTITY */}
                <div className="space-y-3 p-5 rounded-2xl register-section-card">
                  <h3 className="text-xs font-extrabold tracking-wider register-section-title uppercase">
                    {isTl ? '1. Pagkakakilanlan ng Estudyante (Buong Pangalan)' : '1. Student Identity (Full Name)'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold register-label">{isTl ? 'Apelyido (Last Name)' : 'Last Name'}</label>
                        {renderBadge(lastNameStatus)}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dela Cruz"
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 rounded-xl cosmic-input text-sm font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold register-label">{isTl ? 'Pangalan (First Name)' : 'First Name'}</label>
                        {renderBadge(firstNameStatus)}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Jansen"
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 rounded-xl cosmic-input text-sm font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5 min-w-[130px]">
                      <div className="flex items-center justify-between gap-1 whitespace-nowrap">
                        <label className="text-xs sm:text-sm font-bold register-label uppercase whitespace-nowrap">M.I.</label>
                        <span className="shrink-0">{renderBadge(miStatus)}</span>
                      </div>
                      <input
                        type="text"
                        maxLength={2}
                        placeholder="K."
                        value={regMiddleInitial}
                        onChange={(e) => setRegMiddleInitial(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 rounded-xl cosmic-input text-sm font-semibold text-center focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. CONTACT DETAILS & STUDENT ID */}
                <div className="space-y-3 p-5 rounded-2xl register-section-card">
                  <h3 className="text-xs font-extrabold tracking-wider register-section-title uppercase">
                    {isTl ? '2. Detalye ng Pakikipag-ugnayan at Opisyal na Student Number' : '2. Contact Details & Official Student Number'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold register-label">{isTl ? 'Contact No.' : 'Contact No.'}</label>
                        {renderBadge(phoneStatus)}
                      </div>
                      <input
                        type="text"
                        maxLength={11}
                        required
                        placeholder="09XXXXXXXXX"
                        value={regContactNumber}
                        onChange={(e) => setRegContactNumber(e.target.value.replace(/\D/g, ""))}
                        className="w-full px-4 py-3 rounded-xl cosmic-input text-sm font-mono font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold register-label">
                          {isTl ? 'Personal Gmail Account' : 'Personal Gmail Account'}
                        </label>
                        {renderBadge(emailStatus)}
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="yourname@gmail.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl cosmic-input text-sm font-semibold focus:outline-none"
                      />
                      <p className="text-[10px] text-sky-200/80 font-medium">
                        {isTl ? 'Gagamitin para sa contact at recovery ng Forgot Password' : 'Used for official contact & Forgot Password OTP recovery'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold register-label">{isTl ? 'Student Number' : 'Student Number'}</label>
                        {renderBadge(studentNumberStatus)}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="260050"
                        value={regStudentNumber}
                        onChange={(e) => setRegStudentNumber(e.target.value.toUpperCase().replace(/[^0-9-]/g, ""))}
                        className="w-full px-4 py-3 rounded-xl cosmic-input text-sm font-mono font-bold focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold register-label">
                        {isTl ? 'Baitang (Grade Level)' : 'Grade Level'}
                      </label>
                      <select
                        value={regGradeLevel}
                        onChange={(e) => setRegGradeLevel(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl cosmic-input text-sm font-bold focus:outline-none bg-slate-900 text-white"
                      >
                        <option value="11" className="bg-slate-900 text-white">Grade 11</option>
                        <option value="12" className="bg-slate-900 text-white">Grade 12</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold register-label">
                        {isTl ? 'Strand' : 'Strand'}
                      </label>
                      <select
                        value={regStrand}
                        onChange={(e) => setRegStrand(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl cosmic-input text-sm font-bold focus:outline-none bg-slate-900 text-white"
                      >
                        <option value="HUMSS" className="bg-slate-900 text-white">HUMSS</option>
                        <option value="ABM" className="bg-slate-900 text-white">ABM</option>
                        <option value="ICT" className="bg-slate-900 text-white">ICT</option>
                        <option value="GAS" className="bg-slate-900 text-white">GAS</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. VERIFICATION PHOTOS: STUDENT ID & LIVE PERSONAL PHOTO */}
                <div className="space-y-6 p-5 rounded-2xl register-section-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <h3 className="text-xs font-extrabold tracking-wider register-section-title uppercase flex items-center gap-2">
                        <span>
    <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    </svg>
  </span>
                        <span>{isTl ? '3. Beripikasyon ng Identidad (Live Photo Selfie)' : '3. Identity Verification (Live Profile Selfie)'}</span>
                      </h3>
                      <p className="text-xs opacity-80 mt-1">
                        {isMobileDevice
                          ? (isTl
                              ? 'MOBILE DETECTED: Required ang LIVE CAMERA capture para sa iyong mukha at Student ID. Bawal ang file upload sa cellphone.'
                              : 'MOBILE DETECTED: LIVE CAMERA capture is strictly required for your face and Student ID. Upload is disabled on mobile.')
                          : (isTl
                              ? 'DESKTOP/LAPTOP DETECTED: Maaaring gamitin ang Webcam o mag-upload kung walang available na camera.'
                              : 'DESKTOP/LAPTOP DETECTED: You may use your Webcam or upload an image file if a camera is unavailable.')}
                      </p>
                    </div>
                  </div>

                  {/* Sub-item B: Live Personal Face Photo (Selfie) */}
                  <div className="p-4 rounded-2xl register-inner-card space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold uppercase tracking-wide register-label flex items-center gap-1.5">
                        <span>
    <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  </span> {isTl ? 'Live Personal Photo (Actual Face Selfie)' : 'Live Personal Photo (Actual Face Selfie)'}
                      </label>
                      {renderBadge(personalPhotoStatus)}
                    </div>

                    {personalPhotoPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-black/60 flex flex-col items-center justify-center p-3">
                        <img
                          src={personalPhotoPreview}
                          alt="Live Face Preview"
                          className="max-h-60 w-full object-contain rounded-xl"
                        />
                        <div className="mt-3 flex items-center justify-between w-full px-2">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <span>✓</span> {isTl ? 'Mukha Nakuha Na' : 'Face Verified & Ready'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playBackspace();
                              setPersonalPhotoFile(null);
                              setPersonalPhotoPreview(null);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
                          >
                            {isTl ? 'Kumuha Muli' : 'Retake'}
                          </button>
                        </div>
                      </div>
                    ) : isMobileDevice ? (
                      /* Mobile Phone: Strictly Live Selfie Camera Only */
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playToggleSwitch(true);
                          setActiveCameraModal('personal');
                        }}
                        className="w-full h-36 rounded-2xl border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 flex flex-col items-center justify-center text-center p-4 transition-all"
                      >
                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center animate-pulse border border-cyan-500/40">
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    </svg>
  </div>
                        <span className="text-sm font-black text-cyan-300 mt-2">
                          {isTl ? 'Pindutin para sa Live Selfie (Bawal Upload)' : 'Tap for Live Face Selfie (Upload Disabled)'}
                        </span>
                        <span className="text-[11px] text-slate-300 mt-1">
                          {isTl ? 'Kumuha ng malinaw na litrato ng iyong mukha' : 'Take a clear frontal photo of your face'}
                        </span>
                      </button>
                    ) : (
                      /* PC / Laptop Mode: Webcam Selfie + Fallback File Upload */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playToggleSwitch(true);
                            setActiveCameraModal('personal');
                          }}
                          className="h-32 rounded-2xl border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 flex flex-col items-center justify-center text-center p-3 transition-all"
                        >
                          <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center mx-auto mb-1 border border-cyan-500/30">
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    </svg>
  </div>
                          <span className="text-xs font-extrabold text-cyan-300 mt-1.5">
                            {isTl ? 'Kumuha ng Selfie sa Webcam' : 'Take Webcam Selfie'}
                          </span>
                          <span className="text-[10px] opacity-75 mt-0.5">{isTl ? 'Live facial verification' : 'Live front snap'}</span>
                        </button>

                        <label className="btn-press h-32 rounded-2xl border-2 border-dashed upload-dropzone cursor-pointer flex flex-col items-center justify-center text-center p-3 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-white/10 text-slate-300 flex items-center justify-center mx-auto mb-1 border border-white/15">
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  </div>
                          <span className="text-xs font-extrabold register-label mt-1.5">
                            {isTl ? 'Mag-upload ng Litrato (PC/Laptop)' : 'Upload Face Photo (PC Mode)'}
                          </span>
                          <span className="text-[10px] opacity-75 mt-0.5">JPG, PNG</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            onChange={handlePersonalPhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. PASSWORD & SECURITY CHECKLIST */}
                <div className="space-y-3 p-5 rounded-2xl register-section-card">
                  <h3 className="text-xs font-extrabold tracking-wider register-section-title uppercase">
                    {isTl ? '4. Password at Seguridad ng Account' : '4. Account Password & Security'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold register-label">{isTl ? 'Gumawa ng Password' : 'Type Password'}</label>
                        {renderBadge(passwordStatus)}
                      </div>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          placeholder={isTl ? 'Hindi bababa sa 6 na karakter' : 'At least 6 characters'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full pl-4 pr-11 py-3 rounded-xl cosmic-input text-sm font-semibold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playToggleSwitch(true);
                            setShowRegPassword((prev) => !prev);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/60 dark:hover:text-white text-sm"
                          title={showRegPassword ? 'Hide password' : 'Show password'}
                        >
                          {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold register-label">{isTl ? 'Ulitin ang Password' : 'Confirm Password'}</label>
                        {renderBadge(confirmPasswordStatus)}
                      </div>
                      <div className="relative">
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder={isTl ? 'Ulitin ang password' : 'Repeat password'}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="w-full pl-4 pr-11 py-3 rounded-xl cosmic-input text-sm font-semibold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playToggleSwitch(true);
                            setShowRegConfirmPassword((prev) => !prev);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/60 dark:hover:text-white text-sm"
                          title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password Checklist Bar */}
                  <div className="p-3.5 rounded-xl checklist-bar grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className={passwordCriteria.length ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'checklist-dim'}>
                      {passwordCriteria.length ? '✓' : '○'} {isTl ? '6+ karakter' : '6+ characters'}
                    </div>
                    <div className={passwordCriteria.number ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'checklist-dim'}>
                      {passwordCriteria.number ? '✓' : '○'} {isTl ? '1+ Numero (0-9)' : '1+ Number (0-9)'}
                    </div>
                    <div className={passwordCriteria.uppercase ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'checklist-dim'}>
                      {passwordCriteria.uppercase ? '✓' : '○'} {isTl ? '1+ Malaking Letra (A-Z)' : '1+ Uppercase (A-Z)'}
                    </div>
                    <div className={passwordCriteria.special ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : 'checklist-dim'}>
                      {passwordCriteria.special ? '✓' : '○'} {isTl ? '1+ Simbolo (!@#$)' : '1+ Special (!@#$)'}
                    </div>
                  </div>

                  {/* 5-Digit PIN for Login */}
                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold register-label flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>ENTER PIN FOR LOGIN</span>
                      </label>
                      {renderBadge(quickPinStatus)}
                    </div>
                    <div className="relative w-full max-w-xs">
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={5}
                        required
                        placeholder="••••• (5 digits)"
                        value={regQuickPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                          setRegQuickPin(val);
                        }}
                        className="w-full px-4 py-3 rounded-xl cosmic-input text-base font-mono font-bold tracking-[0.35em] text-center focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Big Submit Button */}
                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={regLoading || !isRegisterFormValid}
                    className="btn-press w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:opacity-95 text-white text-base font-extrabold shadow-xl shadow-emerald-950/60 border border-white/20 disabled:opacity-45 transition-all flex items-center justify-center gap-2.5"
                  >
                    {regLoading ? (
                      <span>{isTl ? 'Inaapruba at Ginagawa ang Account...' : 'Creating & Approving Account...'}</span>
                    ) : (
                      <>
                        <span>{isTl ? '✓ Gumawa ng Account (Awtomatikong Aprubado)' : '✓ Create Account (Automatic Approved)'}</span>
                        <span>→</span>
                      </>
                    )}
                  </button>

                  {!isRegisterFormValid && (
                    <p className="text-center text-[11px] font-semibold text-rose-500 dark:text-rose-400">
                      {isTl
                        ? 'Pakisuyong tiyaking may green checkmark (✓) ang bawat field sa itaas bago mag-submit.'
                        : 'Please ensure all required fields above have a green checkmark (✓) before submitting.'}
                    </p>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ====================================================
              MODE: FORGOT PASSWORD
              ==================================================== */}
          {mode === 'forgot' && (
            <div className="space-y-7">
              <div className="flex items-center justify-between border-b border-white/15 dark:border-white/15 pb-4">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight card-title-text">
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
                  className="btn-press px-4 py-2 rounded-xl card-back-button text-xs font-extrabold"
                >
                  ← Back to Login
                </button>
              </div>

              {forgotError && (
                <div className="p-4 rounded-2xl bg-rose-500/25 border border-rose-500/50 text-rose-200 text-sm font-semibold flex items-center gap-3">
                  <span className="text-base">⚠️</span>
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/25 border border-emerald-500/50 text-emerald-200 text-sm font-semibold flex items-center gap-3">
                  <span className="text-base">✓</span>
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {forgotStep === 'request' ? (
                <form onSubmit={handleForgotRequestOtp} className="space-y-6">
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
                    <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-between gap-3 animate-pulse">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Masyadong maraming paghingi ng OTP. Maghintay muna.</span>
                      </div>
                      <span className="font-mono px-2 py-1 rounded-lg bg-amber-500/20 text-xs">
                        {Math.floor(forgotCooldownSeconds / 60)}:{(forgotCooldownSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-extrabold text-white">
                      Enter Student ID Number or Registered Email
                    </label>
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="e.g. 2025-11098 or name@gmail.com"
                      className="w-full px-5 py-4 rounded-2xl bg-black/40 border border-white/25 text-white placeholder-white/40 text-base font-semibold focus:outline-none focus:border-[#4E92DF]"
                    />
                    <p className="text-xs text-[#9BCBFF]/80">
                      We will send a 6-digit OTP verification code to your registered email address.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-press w-full py-4 rounded-2xl bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white text-base font-extrabold shadow-xl disabled:opacity-50"
                  >
                    {forgotLoading ? 'Sending OTP Code...' : 'Send 6-Digit Verification OTP →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotResetPassword} className="space-y-6">
                  <div className="p-4 rounded-2xl bg-blue-500/20 border border-blue-400/40 text-sm text-blue-200">
                    We sent a 6-digit OTP code to <strong>{forgotMaskedEmail}</strong>. Please check your inbox.
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-extrabold text-white">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full px-5 py-4 rounded-2xl bg-black/40 border border-white/25 text-white text-center text-xl font-mono font-extrabold tracking-widest focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-white">New Password</label>
                      <div className="relative">
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Min 6 characters"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          className="w-full pl-4 pr-11 py-3 rounded-xl bg-black/40 border border-white/20 text-white text-sm font-semibold focus:outline-none focus:border-[#4E92DF]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playToggleSwitch(true);
                            setShowForgotNewPassword((prev) => !prev);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-sm"
                          title={showForgotNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-white">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showForgotConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="Repeat password"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          className="w-full pl-4 pr-11 py-3 rounded-xl bg-black/40 border border-white/20 text-white text-sm font-semibold focus:outline-none focus:border-[#4E92DF]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playToggleSwitch(true);
                            setShowForgotConfirmPassword((prev) => !prev);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-sm"
                          title={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-press w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-base font-extrabold shadow-xl disabled:opacity-50"
                  >
                    {forgotLoading ? 'Updating Password...' : '✓ Reset Password & Sign In'}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ====================================================
          INSTITUTIONAL FOOTER & LEGAL CLUSTER
          ==================================================== */}
      <footer className="relative z-20 py-8 px-4 sm:px-8 border-t border-white/10 bg-[#020814]/90 text-left">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">Asian Institute of Computer Studies – Montalban</span>
            <span>•</span>
            <span>Guidance & Counseling Services</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>RA 10173 (Data Privacy Act of 2012)</span>
            <span>•</span>
            <span>RA 10627 (Anti-Bullying Act)</span>
            <span>•</span>
            <span>DepEd Child Protection Policy</span>
          </div>
        </div>
      </footer>

      {/* ====================================================
          ACCOUNT CREATED: success mini-card
          ==================================================== */}
      {successData && (
        <div className="fixed inset-0 z-50 bg-[#06122B]/90 flex items-center justify-center p-3 sm:p-6" data-reg-success>
          <div role="dialog" aria-modal="true" aria-label={isTl ? 'Nagawa ang account' : 'Account created'} className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0B1E48] border-2 border-emerald-400 p-5 sm:p-6 space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-white font-extrabold">
                <Check className="w-7 h-7 text-white stroke-[3]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold text-white leading-tight">{isTl ? 'Nagawa na ang account mo!' : 'Your account is ready!'}</h3>
                <p className="text-xs text-[#9BCBFF]">
                  {isTl ? 'Username mo ang Student No.:' : 'Your username is your Student No.:'} <b className="font-mono text-emerald-300">{successData.username}</b>
                </p>
              </div>
            </div>

            <section className="rounded-2xl bg-white/5 border border-white/15 p-3.5 space-y-1">
              <p className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>{isTl ? 'Ang iyong privacy (RA 10173)' : 'Your privacy (RA 10173)'}</span>
              </p>
              <ul className="text-xs text-white/85 leading-relaxed list-disc pl-4 space-y-0.5">
                <li>{isTl ? 'Ang Guidance Office lang ang makakakita ng impormasyon at mga report mo.' : 'Only the Guidance Office can see your information and reports.'}</li>
                <li>{isTl ? 'Hindi ito ibibigay sa isinumbong mo, sa ibang estudyante, o sa magulang.' : 'They are never shared with the student you report, other students, or parents.'}</li>
                <li>{isTl ? 'Ginagamit lang ang student ID mo para patunayan na ikaw talaga ito.' : 'Your student ID is used only to check that it is really you.'}</li>
              </ul>
            </section>

            <section className="rounded-2xl bg-white/5 border border-white/15 p-3.5 space-y-1">
              <p className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-sky-400" />
                <span>{isTl ? 'Para maging ligtas ka' : 'Staying safe'}</span>
              </p>
              <ul className="text-xs text-white/85 leading-relaxed list-disc pl-4 space-y-0.5">
                <li>{isTl ? 'Huwag ibigay kahit kanino ang password mo.' : 'Never share your password with anyone.'}</li>
                <li>{isTl ? 'Mag-Sign Out pagkatapos, lalo na sa computer ng school o computer shop. Kusa rin itong nagsa-sign out pagkalipas ng 15 minuto.' : 'Sign out when done, especially on school or shop computers. It also signs out by itself after 15 minutes.'}</li>
                <li>{isTl ? 'Kung may panganib ngayon mismo, pumunta agad sa guro, guard o Guidance Office. Hindi pang-emergency ang portal.' : 'If you are in danger right now, go to a teacher, the guard or the Guidance Office. The portal is not for emergencies.'}</li>
              </ul>
            </section>

            <section className="rounded-2xl bg-white/5 border border-white/15 p-3.5 space-y-1">
              <p className="text-xs font-extrabold text-white">📝 {isTl ? 'Paano gamitin' : 'How to use it'}</p>
              <ol className="text-xs text-white/85 leading-relaxed list-decimal pl-4 space-y-0.5">
                <li>{isTl ? '"Report Concern": piliin ang uri, isulat ang nangyari, tapos i-submit.' : '"Report Concern": pick the type, write what happened, then submit.'}</li>
                <li>{isTl ? '"My Reports": dito mo makikita kung na-review na ng Guidance Office.' : '"My Reports": see whether the Guidance Office has reviewed it.'}</li>
                <li>{isTl ? '"Guidance Chat": magbubukas kapag na-approve ang report mo.' : '"Guidance Chat": opens once your report is approved.'}</li>
              </ol>
            </section>

            <button
              type="button"
              data-reg-success-go
              onClick={() => {
                soundFX.playSuccessCheck();
                onLoginSuccess(successData.account);
              }}
              className="btn-press w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm"
            >
              {isTl ? 'Naintindihan ko — Pumasok sa Portal →' : 'Got it — Open the Portal →'}
            </button>
          </div>
        </div>
      )}

      

      {/* ====================================================
          DATA PRIVACY TERMS & CONDITIONS MODAL
          ==================================================== */}
      {/* ====================================================
          DATA PRIVACY TERMS & CONDITIONS MODAL
          (Appears strictly before opening Create Account form)
          ==================================================== */}
      {showPrivacyModal && (
          <div className="fixed inset-0 z-50 bg-[#06122B]/90 flex items-center justify-center p-4 sm:p-6" data-terms-modal>
            <div className="w-full max-w-2xl rounded-3xl cosmic-glass-card terms-still p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                    <FileText className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold card-title-text">
                      {isTl ? 'Kasunduan sa Data Privacy at Paggamit ng Portal' : 'Data Privacy Agreement & Terms of Use'}
                    </h2>
                    <p className="text-xs card-subtitle-text">
                      Republic Act No. 10173 (Data Privacy Act of 2012)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playBackspace();
                    setShowPrivacyModal(false);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Terms Content */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs sm:text-sm register-inner-card p-4 sm:p-5 rounded-2xl leading-relaxed text-slate-800 dark:text-slate-200">
                <div className="p-3.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-400/40 text-blue-900 dark:text-blue-200 text-xs font-semibold">
                  🛡️ {isTl
                    ? 'Mahalaga: Ang portal na ito ay nilikha para protektahan ang iyong kaligtasan at kapakanan bilang mag-aaral ng AICS Montalban. Basahin ang sumusunod na kasunduan bago magparehistro.'
                    : 'Important: This portal is created to safeguard your well-being and privacy as an AICS Montalban student. Please review the following agreement prior to account creation.'}
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <h4 className="font-extrabold text-[#0B1F4D] dark:text-white text-xs sm:text-sm flex items-center gap-2">
                    <span>1.</span>
                    <span>{isTl ? 'Proteksyon sa ilalim ng RA 10173 (Data Privacy Act)' : 'Protection under RA 10173 (Data Privacy Act)'}</span>
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {isTl
                      ? 'Ang lahat ng personal na impormasyon (Pangalan, Contact Number, Student ID, at Larawan) na iyong ilalagay ay ituturing na mahigpit na kumpidensyal. Tanging ang lisensyadong Guidance Associate at Counseling Office lamang ang may pahintulot na humawak ng iyong datos.'
                      : 'All personal data provided (Name, Contact Number, Student ID, and Photo Uploads) will be treated with absolute confidentiality. Only authorized Guidance Associates and Counselors are granted access to your records.'}
                  </p>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <h4 className="font-extrabold text-[#0B1F4D] dark:text-white text-xs sm:text-sm flex items-center gap-2">
                    <span>2.</span>
                    <span>{isTl ? 'Proteksyon Laban sa Retaliation o Pagganti' : 'Non-Retaliation & Safety Assurance'}</span>
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {isTl
                      ? 'Ginawa ang sistema upang mapigilan ang anumang uri ng paghihiganti o harassment. Ang iyong isinumiteng reklamo o chat history ay HINDI kailanman ibubunyag sa inirereklamong kaklase, estudyante, o hindi awtorisadong kawani ng paaralan.'
                      : 'The system strictly prohibits retaliation. Your reports and counseling discussions will NEVER be disclosed to reported individuals, fellow students, or unauthorized school personnel.'}
                  </p>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <h4 className="font-extrabold text-[#0B1F4D] dark:text-white text-xs sm:text-sm flex items-center gap-2">
                    <span>3.</span>
                    <span>{isTl ? 'Awtomatikong Pag-Logout para sa Iyong Kaligtasan' : 'Automatic Session Termination for Discretion'}</span>
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {isTl
                      ? 'Para sa iyong seguridad sakaling maiwan mo ang iyong cellphone o computer na nakabukas sa silid-aralan o internet shop, awtomatikong magla-lock out ang iyong account pagkatapos ng 15 minuto ng walang aktibidad upang walang makakita ng iyong mga ulat.'
                      : 'To protect you in case you leave your device unattended in a classroom or computer laboratory, your session will automatically terminate after 15 minutes of inactivity so no evidence is left visible.'}
                  </p>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <h4 className="font-extrabold text-[#0B1F4D] dark:text-white text-xs sm:text-sm flex items-center gap-2">
                    <span>4.</span>
                    <span>{isTl ? 'Tapat at Makatotohanang Pag-uulat' : 'Truthfulness of Information'}</span>
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {isTl
                      ? 'Sumasang-ayon ka na maging tapat sa lahat ng impormasyong ilalagay. Ang sadyang pagpapasa ng gawa-gawang paratang laban sa kapwa estudyante ay may karampatang disiplina alinsunod sa AICS Student Handbook.'
                      : 'You agree to provide factual and truthful information. Malicious or fabricated reports against peers are subject to institutional disciplinary measures under the AICS Student Handbook.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playBackspace();
                    setShowPrivacyModal(false);
                  }}
                  className="btn-press w-full sm:w-auto px-5 py-2.5 rounded-xl card-back-button text-xs font-bold"
                >
                  {isTl ? 'Hindi Sumasang-ayon (Bumalik)' : 'Decline & Go Back'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.playSuccessCheck();
                    setPrivacyAgreed(true);
                    setShowPrivacyModal(false);
                    setMode('register');
                  }}
                  className="btn-press w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
                >
                  <span>✓</span>
                  <span>{isTl ? 'Nauunawaan Ko at Sumasang-ayon Ako' : 'I Understand & Agree to Terms'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Live Camera Capture Modal for Student ID and Personal Photo */}
      <LiveCameraCaptureModal
        isOpen={activeCameraModal !== null}
        onClose={() => setActiveCameraModal(null)}
        onCapture={async (file, previewUrl) => {
          const optimizedFile = await compressImageClientSide(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.72 });
          if (activeCameraModal === 'id') {
            setStudentIdFile(optimizedFile);
            setStudentIdPreview(previewUrl);
          } else if (activeCameraModal === 'personal') {
            setPersonalPhotoFile(optimizedFile);
            setPersonalPhotoPreview(previewUrl);
          }
          soundFX.playToggleSwitch(true);
        }}
        title={
          activeCameraModal === 'id'
            ? (isTl ? 'Kumuha ng Litrato ng Student ID' : 'Capture Student ID Photo')
            : (isTl ? 'Kumuha ng Live Personal Face Selfie' : 'Capture Live Personal Selfie')
        }
        description={
          activeCameraModal === 'id'
            ? (isTl ? 'Itutok nang maayos ang ID card sa loob ng kahon.' : 'Align your official Student ID card inside the frame.')
            : (isTl ? 'Tumingin sa camera at tiyaking maliwanag ang iyong mukha.' : 'Look at the camera and ensure your face is well-lit.')
        }
        facingMode={activeCameraModal === 'id' ? 'environment' : 'user'}
        isTl={isTl}
      />
    </div>
  );
};

