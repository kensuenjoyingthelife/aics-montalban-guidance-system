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
  Check,
} from 'lucide-react';
import { CelestialBackground } from '../components/auth/CelestialBackground';
import { WavyBackground } from '../components/auth/WavyBackground';
import { useStudentEncouragementWings } from '../components/auth/StudentEncouragementWing';
import { SoundTogglePill, soundFX } from '../services/soundEngine';
import { SkyThemePill } from '../context/ThemeContext';
import { LocaleSwitchPill, useLanguage } from '../context/LanguageContext';
import { SafezoneMascot } from '../components/auth/SafezoneMascot';
import {
  StudentPortalUser,
  registerStudentPortalAccount,
  loginStudentPortal,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
} from '../services/studentAuthService';

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
    if (isCarouselPaused) return;
    const interval = setInterval(() => {
      setAffirmationIndex((prev) => (prev + 1) % MENTAL_HEALTH_AFFIRMATIONS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isCarouselPaused]);

  // ==========================================
  // LOGIN FORM STATE
  // ==========================================
  const [loginStudentNumber, setLoginStudentNumber] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // ==========================================
  // REGISTER FORM STATE
  // ==========================================
  const [regLastName, setRegLastName] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regMiddleInitial, setRegMiddleInitial] = useState('');
  const [regContactNumber, setRegContactNumber] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStudentNumber, setRegStudentNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Privacy Terms & Conditions Modal State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  // ID & Photo Verification State
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [studentIdPreview, setStudentIdPreview] = useState<string | null>(null);

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

  // 4. Email
  const emailStatus = useMemo(() => {
    const e = regEmail.trim();
    if (!e) return { type: 'not_input', label: 'Not Input' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(e)) return { type: 'wrong', label: 'Invalid email' };
    return { type: 'correct', label: 'Correct' };
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
    if (!studentIdFile) return { type: 'not_input', label: 'Not Uploaded' };
    return { type: 'correct', label: 'Verified Photo ✓' };
  }, [studentIdFile]);

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

  // Check if form is ready to submit
  const isRegisterFormValid =
    lastNameStatus.type === 'correct' &&
    firstNameStatus.type === 'correct' &&
    phoneStatus.type === 'correct' &&
    emailStatus.type === 'correct' &&
    studentNumberStatus.type === 'correct' &&
    studentIdStatus.type === 'correct' &&
    passwordStatus.type === 'correct' &&
    confirmPasswordStatus.type === 'correct';

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
  const handleStudentIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') || file.type.includes('pdf')) {
        soundFX.playError();
        setRegError('BAWAL ANG PDF O VIDEO: Tanging totoong litrato (JPG/PNG) lamang ng Student ID ang tinatanggap.');
        return;
      }
      setStudentIdFile(file);
      const url = URL.createObjectURL(file);
      setStudentIdPreview(url);
      soundFX.playToggleSwitch(true);
    }
  };

  // ==========================================
  // ACTION: HANDLE REGISTER
  // ==========================================
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        studentIdFile,
      });

      setRegLoading(false);

      if (!res.success || !res.account) {
        soundFX.playError();
        setRegError(res.error || (isTl ? 'Hindi nagawa ang account. Subukan ulit.' : 'The account was not created. Please try again.'));
      } else {
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
      soundFX.playError();
      setLoginError(res.error || 'Invalid Student ID or Password.');
      return;
    }

    soundFX.playSuccessCheck();
    onLoginSuccess(res.account);
  };

  // ==========================================
  // ACTION: FORGOT PASSWORD
  // ==========================================
  const handleForgotRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);

    const res = await sendForgotPasswordOtp(forgotIdentifier);
    setForgotLoading(false);

    if (!res.success) {
      soundFX.playError();
      setForgotError(res.error || 'Failed to request reset OTP.');
      return;
    }

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
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden font-sans select-none student-portal-canvas bg-[#05112B] text-white">
      {/* Celestial Background: Active on Desktop, hidden/static on mobile */}
      <div className="hidden lg:block">
        <CelestialBackground />
      </div>
      <WavyBackground />

      {/* Top Floating Glass Island Navbar */}
      <header className="relative z-30 w-full px-3 sm:px-6 pt-3 sm:pt-4 safe-area-top">
        {/* ====================================================
            DESKTOP NAVBAR: Original Classic Glass Capsule (Hidden on mobile)
            ==================================================== */}
        <div className="hidden lg:flex max-w-6xl mx-auto rounded-full bg-[#0B1E48]/85 dark:bg-[#07132B]/85 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl shadow-blue-950/40 px-6 py-3 items-center justify-between gap-4 transition-all">
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
                  AICS MONTALBAN
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

          {/* Right: Unified Sleek Controls Cluster */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <div className="flex items-center p-1 rounded-full bg-white/10 dark:bg-white/5 border border-white/15 dark:border-white/10 shadow-inner">
              <SoundTogglePill />
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
                    AICS MONTALBAN
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

              {/* Toggles cluster */}
              <div className="flex items-center">
                <div className="flex items-center p-1 rounded-full bg-slate-950/70 border border-white/25 shadow-xl backdrop-blur-md">
                  <SoundTogglePill />
                  <div className="h-3.5 w-[1px] bg-white/20 mx-1" />
                  <LocaleSwitchPill />
                  <div className="h-3.5 w-[1px] bg-white/20 mx-1" />
                  <SkyThemePill />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Glassmorphic Container with Left and Right Student Encouragement Wings */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-3 sm:p-6 lg:p-8 my-2 sm:my-4">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-6 xl:gap-12">
          {/* Left Wing: Boy Student (Desktop Website Only - Hidden on Mobile/PWA/Capacitor) */}
          {mode === 'login' && (
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="hidden lg:flex shrink-0 order-1 lg:order-none"
            >
              {boyWing}
            </motion.div>
          )}

          {/* Central Login / Register Glass Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`w-full ${
              mode === 'register' ? 'max-w-5xl' : 'max-w-xl'
            } cosmic-glass-card p-5 sm:p-12 space-y-6 sm:space-y-8 relative z-10`}
          >
          {/* ====================================================
              MODE: LOGIN SCREEN
              ==================================================== */}
          {mode === 'login' && (
            <div className="space-y-7">
              <div className="text-center space-y-3 pb-2 sm:pb-4">
                {/* Desktop: Official Clean AICS Seal (hidden on mobile) */}
                <div className="hidden lg:block">
                  <div className="w-16 h-16 rounded-full overflow-hidden mx-auto shadow-xl ring-2 ring-blue-400/40 bg-white p-0.5">
                    <img
                      src="/aics-logo.jpg"
                      alt="AICS Logo"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>

                {/* Mobile App: Friendly Animated Safezone Robot Companion (Visible only on Mobile) */}
                <div className="block lg:hidden">
                  <SafezoneMascot />
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight card-title-text uppercase">
                  AICS SAFEZONE
                </h2>

                {/* Desktop: 1 sentence only description below AICS SAFEZONE */}
                <p className="hidden lg:block text-sm font-semibold card-subtitle-text">
                  {isTl ? 'Bawat hinaing at alalahanin mo ay karapat-dapat sa kalinga.' : 'Every Concern Deserves Care.'}
                </p>

                {/* Mobile Phone Only: 3.5s Rotating Affirmation Carousel (Clean without quotation marks "") */}
                <div
                  onMouseEnter={() => setIsCarouselPaused(true)}
                  onMouseLeave={() => setIsCarouselPaused(false)}
                  onTouchStart={() => setIsCarouselPaused(true)}
                  onTouchEnd={() => setIsCarouselPaused(false)}
                  className="lg:hidden min-h-[50px] flex items-center justify-center px-4 py-2 rounded-2xl bg-blue-500/10 dark:bg-white/5 border border-blue-400/20 shadow-inner relative overflow-hidden transition-all"
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

              {loginError && (
                <div className="p-4 rounded-2xl bg-rose-500/25 border border-rose-500/50 text-rose-200 text-sm font-semibold flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-extrabold register-label flex items-center justify-between">
                    <span>Student ID Number</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 pointer-events-none">
                      <User className="w-5 h-5" />
                    </span>
                    <input
                      type="text"
                      required
                      value={loginStudentNumber}
                      onChange={(e) => setLoginStudentNumber(e.target.value)}
                      placeholder="Enter your Student ID Number"
                      className="w-full pl-12 pr-5 py-4 rounded-2xl cosmic-input text-base font-semibold focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-extrabold register-label">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playToggleSwitch(true);
                        setMode('forgot');
                        setForgotIdentifier(loginStudentNumber);
                      }}
                      className="text-xs text-[#2557BE] dark:text-[#7CB8F7] hover:underline font-extrabold"
                    >
                      {isTl ? 'Nakalimutan ang Password?' : 'Forgot Password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-12 pr-12 py-4 rounded-2xl cosmic-input text-base font-semibold focus:outline-none transition-all"
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
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="btn-press w-full py-4 rounded-2xl bg-gradient-to-r from-[#1E469B] via-[#2557BE] to-[#1E469B] hover:opacity-95 text-white text-base font-extrabold shadow-xl shadow-blue-950/60 border border-white/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2.5"
                >
                  {loginLoading ? (
                    <span>Verifying Credentials...</span>
                  ) : (
                    <>
                      <span>Sign In to Student Portal</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-4 border-t border-white/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                <span className="card-subtitle-text font-semibold">
                  {isTl ? 'Wala ka pang student account?' : "Don't have a student account?"}
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
                  className="btn-press px-6 py-2.5 rounded-xl card-back-button font-extrabold transition-all"
                >
                  {isTl ? '+ Mag-Create ng Account' : '+ Create Student Account'}
                </button>
              </div>
            </div>
          )}

          {/* ====================================================
              MODE: CREATE ACCOUNT (SPACIOUS & ORGANIZED LAYOUT)
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        <label className="text-sm font-bold register-label">{isTl ? 'Email Address' : 'Email Address'}</label>
                        {renderBadge(emailStatus)}
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="name@gmail.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl cosmic-input text-sm font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold register-label">{isTl ? 'Student Number' : 'Student Number'}</label>
                        {renderBadge(studentNumberStatus)}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="2025-11098"
                        value={regStudentNumber}
                        onChange={(e) => setRegStudentNumber(e.target.value.toUpperCase().replace(/[^0-9-]/g, ""))}
                        className="w-full px-4 py-3 rounded-xl cosmic-input text-sm font-mono font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. STUDENT ID PHOTO UPLOAD */}
                <div className="space-y-4 p-5 rounded-2xl register-section-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-extrabold tracking-wider register-section-title uppercase">
                        {isTl ? '3. Litrato ng Student ID' : '3. Student ID Photo Verification'}
                      </h3>
                      <p className="text-xs opacity-75 mt-0.5">
                        {isTl
                          ? 'I-upload ang malinaw na litrato ng iyong opisyal na AICS Student ID (JPG o PNG).'
                          : 'Upload a clear photo of your official AICS Student ID (JPG or PNG).'}
                      </p>
                    </div>
                    <div>{renderBadge(studentIdStatus)}</div>
                  </div>

                  <div className="p-5 rounded-2xl register-inner-card space-y-4">
                    {studentIdPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-black/60 flex flex-col items-center justify-center p-3">
                        <img
                          src={studentIdPreview}
                          alt="Student ID Preview"
                          className="max-h-72 w-full object-contain rounded-xl"
                        />
                        <div className="mt-3 flex items-center justify-between w-full px-2">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <span>✓</span> {isTl ? 'Student ID Handa Na' : 'Student ID Uploaded & Ready'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playBackspace();
                              setStudentIdFile(null);
                              setStudentIdPreview(null);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
                          >
                            {isTl ? 'Palitan ang File' : 'Change File'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="btn-press flex flex-col items-center justify-center h-40 rounded-2xl border-2 border-dashed upload-dropzone cursor-pointer text-center p-4 transition-colors">
                        <span className="text-3xl">📤</span>
                        <span className="text-sm font-extrabold register-label mt-2">
                          {isTl ? 'Pindutin para i-upload ang Student ID' : 'Click to Upload Student ID'}
                        </span>
                        <span className="text-xs opacity-70 mt-1">
                          {isTl ? 'TOTOONG LITRATO LAMANG (JPG, PNG)' : 'REAL PHOTO ONLY (JPG, PNG)'}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={handleStudentIdUpload}
                          className="hidden"
                        />
                      </label>
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
                </div>

                {/* Big Submit Button */}
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
        </motion.div>

        {/* Right Wing: Girl Student (Desktop Website Only - Hidden on Mobile/PWA/Capacitor) */}
        {mode === 'login' && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden lg:flex shrink-0 order-3 lg:order-none"
          >
            {girlWing}
          </motion.div>
        )}
      </div>
    </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 text-center text-xs text-[#9BCBFF]/75 border-t border-white/10 bg-[#0B1E48]/50">
        Official Student Concern & Peer Referral Portal · Asian Institute of Computer Studies – Montalban (RA 10173 Protected)
      </footer>

      {/* ====================================================
          ACCOUNT CREATED: success mini-card (privacy, safety, how to use) — no animation
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
    </div>
  );
};
