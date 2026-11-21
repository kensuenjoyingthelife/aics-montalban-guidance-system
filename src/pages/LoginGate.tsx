import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { checkPinOnServer, startStaffLogin, verifyStaffCode } from '../services/staffAuth';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage, LocaleSwitchPill } from '../context/LanguageContext';
import { SkyThemePill } from '../context/ThemeContext';
import { soundFX, SoundTogglePill } from '../services/soundEngine';
import { DuotoneIcon } from '../components/ui/icons';
import { IconTile, TileColor } from '../components/ui/IconTile';
import { CelestialBackground } from '../components/auth/CelestialBackground';
import { WavyBackground } from '../components/auth/WavyBackground';
import { HeadlineCarousel } from '../components/auth/HeadlineCarousel';
import { loadAppConfig, getAppConfig, checkPin } from '../services/appConfig';
import {
  SAFE_OTP_ALPHABET,
  ActiveOtpRecord,
  StaffDirectoryAccount,
  findRegisteredStaff,
  formatTimeRemaining,
  generateSafeSixCharOtp,
  isValidEmailFormat,
} from '../services/authSecurityService';

type AuthStep = 'pin' | 'email' | 'otp' | 'verified';

interface FeatureTileItem {
  id: string;
  icon: 'shieldCheck' | 'chatText' | 'warningCircle' | 'checkSquareOffset' | 'usersThree';
  color: TileColor;
  labelEn: string;
  labelTl: string;
}

const FEATURE_TILES: FeatureTileItem[] = [
  {
    id: 'cases',
    icon: 'shieldCheck',
    color: 'indigo',
    labelEn: 'Case Flow',
    labelTl: 'Case Flow',
  },
  {
    id: 'sms',
    icon: 'chatText',
    color: 'teal',
    labelEn: 'Parent SMS',
    labelTl: 'Parent SMS',
  },
  {
    id: 'concerns',
    icon: 'warningCircle',
    color: 'amber',
    labelEn: 'Concerns',
    labelTl: 'Concerns',
  },
  {
    id: 'counselor',
    icon: 'usersThree',
    color: 'azure',
    labelEn: 'Counselor',
    labelTl: 'Counselor',
  },
];

interface LoginGateProps {
  /** kept for App.tsx; the login screen no longer shows a replay button */
  onReplaySplash?: () => void;
  onEnterDashboard: (staff: StaffDirectoryAccount) => void;
}

/** privacy: only the first 4 characters of the email are shown, the rest are * */
const maskEmail = (e: string) => e.slice(0, 4) + '*'.repeat(Math.max(0, e.length - 4));

export const LoginGate: React.FC<LoginGateProps> = ({
  onEnterDashboard,
}) => {
  const { locale, t } = useLanguage();
  const isTl = locale === 'tl';

  const [step, setStep] = useState<AuthStep>('pin');

  // Step 1: 6-Digit PIN State
  const [pinDigits, setPinDigits] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinShake, setPinShake] = useState<boolean>(false);
  // Lockout after too many wrong PINs (Settings › Accounts & security). Kept on this computer.
  const LOCK_KEY = 'aics_pin_lock_v1';
  const readLock = (): { fails: number; until: number } => {
    try {
      return JSON.parse(localStorage.getItem(LOCK_KEY) || '') as { fails: number; until: number };
    } catch {
      return { fails: 0, until: 0 };
    }
  };
  const writeLock = (v: { fails: number; until: number }) => {
    try {
      localStorage.setItem(LOCK_KEY, JSON.stringify(v));
    } catch {
      /* private mode */
    }
  };
  const [lockLeft, setLockLeft] = useState<number>(() => Math.max(0, Math.ceil((readLock().until - Date.now()) / 1000)));
  useEffect(() => {
    void loadAppConfig(); // PIN, staff accounts and lockout rules come from Settings
  }, []);
  useEffect(() => {
    if (lockLeft <= 0) return;
    const t = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((readLock().until - Date.now()) / 1000));
      setLockLeft(left);
      if (left === 0) setPinError(null);
    }, 1000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockLeft > 0]);

  // Step 2: Staff Email State (Empty by default for strict RA 10173 Data Privacy compliance!)
  const [email, setEmail] = useState<string>('');
  const [showEmail, setShowEmail] = useState(false); // eye toggle: hidden (aics****) by default
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [busyStep, setBusyStep] = useState<null | 'pin' | 'email' | 'otp'>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Step 3: 6-Character OTP State
  const [otpChars, setOtpChars] = useState<string[]>(['', '', '', '', '', '']);
  const [activeOtp, setActiveOtp] = useState<ActiveOtpRecord | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState<number>(300);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpShake, setOtpShake] = useState<boolean>(false);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Step 4: Verified Session
  const [verifiedStaff, setVerifiedStaff] = useState<StaffDirectoryAccount | null>(null);

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== 'otp' || otpSecondsLeft <= 0) return;
    const interval = window.setInterval(() => {
      setOtpSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [step, otpSecondsLeft]);

  // Step 1: PIN Verification (checked on the SERVER, with the server's own lockout)
  const pinRef = useRef('');
  const handleVerifyPin = useCallback(
    async (code: string) => {
      if (Math.ceil((readLock().until - Date.now()) / 1000) > 0) return;
      setBusyStep('pin');
      const pinErr = await checkPinOnServer(code).finally(() => setBusyStep(null));
      if (pinErr === 'network') {
        soundFX.playError();
        setPinError(locale === 'tl' ? 'Walang koneksyon sa server. I-check ang internet, tapos subukan ulit.' : 'Cannot reach the server. Check the internet, then try again.');
        return;
      }
      if (pinErr === 'locked') {
        const mins = Math.max(1, Number(getAppConfig().security.pinLockMinutes) || 5);
        writeLock({ fails: 0, until: Date.now() + mins * 60000 });
        setLockLeft(mins * 60);
        soundFX.playError();
        setPinError(locale === 'tl' ? `Masyadong maraming maling PIN. Naka-lock nang ${mins} minuto.` : `Too many wrong PINs. Locked for ${mins} minute(s).`);
        return;
      }
      if (!pinErr) {
        pinRef.current = code;
        writeLock({ fails: 0, until: 0 });
        soundFX.playStepUnlock();
        setPinError(null);
        setStep('email');
      } else {
        const sec = getAppConfig().security;
        const max = Math.max(3, Number(sec.pinMaxTries) || 5);
        const lock = readLock();
        const fails = lock.fails + 1;
        const left = max - fails;
        soundFX.playError();
        setPinShake(true);
        if (left <= 0) {
          const mins = Math.max(1, Number(sec.pinLockMinutes) || 5);
          writeLock({ fails: 0, until: Date.now() + mins * 60000 });
          setLockLeft(mins * 60);
          setPinError(
            locale === 'tl'
              ? `Masyadong maraming maling PIN. Naka-lock nang ${mins} minuto.`
              : `Too many wrong PINs. Locked for ${mins} minute(s).`
          );
        } else {
          writeLock({ fails, until: 0 });
          setPinError(
            locale === 'tl'
              ? `Maling PIN. ${left} subok na lang bago ma-lock.`
              : `Wrong PIN. ${left} more ${left === 1 ? 'try' : 'tries'} before it locks.`
          );
        }
        window.setTimeout(() => {
          setPinShake(false);
          setPinDigits('');
        }, 380);
      }
    },
    [locale]
  );

  const handleKeypadPress = useCallback(
    (val: string) => {
      if (pinDigits.length >= 6 || lockLeft > 0) return;
      soundFX.playKeyClick(pinDigits.length);
      const next = pinDigits + val;
      setPinDigits(next);
      setPinError(null);
      if (next.length === 6) {
        window.setTimeout(() => void handleVerifyPin(next), 90);
      }
    },
    [pinDigits, handleVerifyPin, lockLeft]
  );

  const handleBackspace = useCallback(() => {
    soundFX.playBackspace();
    setPinDigits((prev) => prev.slice(0, -1));
    setPinError(null);
  }, []);

  const handleClearPin = useCallback(() => {
    soundFX.playBackspace();
    setPinDigits('');
    setPinError(null);
  }, []);

  // Keyboard support for Step 1 PIN
  useEffect(() => {
    if (step !== 'pin') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearPin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, handleKeypadPress, handleBackspace, handleClearPin]);

  // Step 2: Send Live OTP via Gmail SMTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanedEmail = email.trim().toLowerCase();
    if (!isValidEmailFormat(cleanedEmail)) {
      soundFX.playError();
      setEmailError(
        locale === 'tl'
          ? 'Maglagay ng tamang email address.'
          : 'Please enter a valid email address.'
      );
      return;
    }

    // Only staff accounts listed in Settings › Accounts can receive a sign-in code
    const cfg = getAppConfig();
    const listed = cfg.staff.length
      ? cfg.staff.some((a) => a.active && a.email.toLowerCase() === cleanedEmail)
      : !!findRegisteredStaff(cleanedEmail); // settings not reachable: use the built-in list
    if (!listed) {
      soundFX.playError();
      setEmailError(
        locale === 'tl'
          ? 'Hindi staff account ang email na ito. Ipadagdag ito sa Settings › Accounts, o gamitin ang email ng office.'
          : 'This email is not a staff account. Ask to add it in Settings › Accounts, or use the office email.'
      );
      return;
    }

    soundFX.playToggleSwitch(true);
    setEmailError(null);
    setIsSendingEmail(true);

    // the SERVER makes and emails the code; the app never sees it
    const now = Date.now();
    const record: ActiveOtpRecord = {
      email: cleanedEmail,
      code: '',
      issuedAt: now,
      expiresAt: now + 300 * 1000,
      attemptsUsed: 0,
      maxAttempts: 5,
      used: false,
      locked: false,
      isRegisteredAccount: true,
    };

    try {
      setBusyStep('email');
      const result = await startStaffLogin(pinRef.current, cleanedEmail, locale).finally(() => setBusyStep(null));
      if (!result.ok) {
        setIsSendingEmail(false);
        soundFX.playError();
        setEmailError(
          result.error === 'not_staff'
            ? locale === 'tl' ? 'Hindi staff account ang email na ito.' : 'This email is not a staff account.'
            : result.error === 'wrong_pin' || result.error === 'locked'
            ? locale === 'tl' ? 'Kailangang ilagay ulit ang PIN. Bumalik sa unang hakbang.' : 'Please enter the PIN again. Go back to the first step.'
            : locale === 'tl' ? 'Hindi naipadala ang code sa email. I-check ang internet, tapos pindutin ulit.' : 'The code could not be emailed. Check the internet, then press again.'
        );
        return;
      }
    } catch {
      setIsSendingEmail(false);
      soundFX.playError();
      setEmailError(
        locale === 'tl'
          ? 'Hindi naipadala ang code sa email. I-check ang internet, tapos pindutin ulit.'
          : 'The code could not be emailed. Check the internet, then press again.'
      );
      return;
    }

    soundFX.playStepUnlock();
    setActiveOtp(record);
    setOtpChars(['', '', '', '', '', '']);
    setOtpSecondsLeft(300);
    setIsSendingEmail(false);
    setStep('otp');

    window.setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 120);
  };

  // Step 3: Verify 6-Character OTP
  const handleVerifyOtp = async (codeToVerify: string) => {
    if (!activeOtp) return;
    const clean = codeToVerify.trim().toUpperCase();
    setBusyStep('otp');
    const res = await verifyStaffCode(activeOtp.email, clean).finally(() => setBusyStep(null));

    if (res.ok) {
      soundFX.playVerifiedFanfare();
      const s = res.staff;
      const acc = getAppConfig().staff.find((a) => a.email.toLowerCase() === activeOtp.email);
      const staff = (s
        ? { email: s.email, fullName: s.full_name, role: s.role, department: s.department || 'Guidance & Counseling Office · Montalban', badgeCode: s.badge_code || '' }
        : acc
        ? { email: acc.email, fullName: acc.fullName, role: acc.role, department: 'Guidance & Counseling Office · Montalban', badgeCode: '' }
        : findRegisteredStaff(activeOtp.email)) || {
        email: activeOtp.email,
        fullName: 'AICS Montalban Guidance Associate',
        role: 'Guidance Associate & System Administrator',
        department: 'Guidance & Counseling Office · Montalban',
        badgeCode: 'AICS-GA-001',
      };
      setVerifiedStaff(staff);
      setStep('verified');
    } else {
      soundFX.playError();
      setOtpShake(true);
      setOtpError(
        res.error === 'expired'
          ? locale === 'tl' ? 'Nag-expire na ang code. Magpadala ng bago.' : 'The code expired. Send a new one.'
          : res.error === 'too_many'
          ? locale === 'tl' ? 'Masyadong maraming mali. Magpadala ng bagong code.' : 'Too many wrong tries. Send a new code.'
          : res.error === 'network' || res.error === 'auth_failed'
          ? locale === 'tl' ? 'Walang koneksyon sa server. Subukan ulit.' : 'Cannot reach the server. Try again.'
          : locale === 'tl' ? 'Mali ang code na nailagay. Pakisubukan ulit.' : 'Incorrect verification code. Please try again.'
      );
      window.setTimeout(() => setOtpShake(false), 380);
    }
  };

  const handleOtpInput = (idx: number, rawVal: string) => {
    const cleaned = rawVal
      .toUpperCase()
      .split('')
      .filter((ch) => SAFE_OTP_ALPHABET.includes(ch))
      .join('');

    if (!cleaned) {
      const next = [...otpChars];
      next[idx] = '';
      setOtpChars(next);
      return;
    }

    soundFX.playKeyClick(idx);
    const next = [...otpChars];
    for (let i = 0; i < cleaned.length && idx + i < 6; i++) {
      next[idx + i] = cleaned[i];
    }
    setOtpChars(next);
    setOtpError(null);

    const nextFocus = Math.min(5, idx + cleaned.length);
    otpInputRefs.current[nextFocus]?.focus();

    const full = next.join('');
    if (full.length === 6 && next.every((c) => c !== '')) {
      window.setTimeout(() => handleVerifyOtp(full), 80);
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpChars[idx] && idx > 0) {
      otpInputRefs.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="relative min-h-screen w-full aics-sky-canvas flex flex-col justify-between overflow-x-hidden select-none">
      {/* Twinkling Star Drops, Meteors, Floating Computers & Ringed Planets */}
      <CelestialBackground />

      {/* ====================================================================
          MAIN 2-COLUMN SPLIT LAYOUT
          ==================================================================== */}
      <main className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 my-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
        {/* ==================================================================
            LEFT BRAND PANEL (7 Columns — 2-Line Passing Light Shimmer)
            ================================================================== */}
        <section className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5 sm:space-y-6">
          {/* Official Pill Badge */}
          <div
            data-sound-hover="true"
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/14 border border-white/30 backdrop-blur-md shadow-sm"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#8CC5FF]" />
            <span className="text-xs sm:text-[13px] font-extrabold tracking-[0.14em] text-white uppercase">
              {t.badge}
            </span>
          </div>

          {/* STRICTLY 2-LINE HERO TITLE WITH PASSING LIGHT-BEAM SWEEP */}
          <div className="space-y-1.5 w-full">
            <h1 className="text-3xl sm:text-5xl xl:text-[56px] font-extrabold tracking-tight leading-[1.06] whitespace-nowrap title-light-sweep-white">
              ASIAN INSTITUTE OF
            </h1>
            <h2 className="text-xl sm:text-3xl xl:text-[39px] font-extrabold tracking-tight leading-[1.14] whitespace-nowrap uppercase title-light-sweep-azure">
              COMPUTER STUDIES · MONTALBAN
            </h2>
          </div>

          {/* Rotating Guidance Headline */}
          <div className="w-full pt-1">
            <HeadlineCarousel />
          </div>

          {/* Campus Address */}
          <div className="inline-flex items-start justify-center lg:justify-start gap-2.5 text-white/95 text-sm sm:text-[16px] max-w-xl leading-relaxed font-medium">
            <svg
              className="w-5 h-5 mt-0.5 shrink-0 text-[#8CC5FF]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{t.campusAddress}</span>
          </div>

          {/* 4 Larger Square Feature Tiles */}
          <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3.5 sm:gap-4">
            {FEATURE_TILES.map((tile, idx) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => soundFX.playKeyClick(idx)}
                className="btn-press w-[98px] sm:w-[112px] h-[110px] sm:h-[122px] rounded-2xl aics-hero-tile backdrop-blur-md flex flex-col items-center justify-center gap-2.5 p-3 shadow-lg"
              >
                <IconTile color={tile.color} variant="solid" size="lg">
                  <DuotoneIcon name={tile.icon} size={26} />
                </IconTile>
                <span className="text-xs sm:text-[13.5px] font-bold text-white leading-none tracking-wide">
                  {locale === 'tl' ? tile.labelTl : tile.labelEn}
                </span>
              </button>
            ))}
          </div>

          {/* Est. 1996 Line */}
          <p className="pt-1 text-xs sm:text-sm font-semibold text-white/80 tracking-wide">
            Rodriguez, Rizal — Est. 1996
          </p>
        </section>

        {/* ==================================================================
            RIGHT HIGH-CONTRAST GRADIENT GLASS CARD
            - Light Mode: Frosted Pearl-Ice Gradient Card (#0B1F4D Deep Navy Text)
            - Dark Mode: Frosted Midnight-Sapphire Gradient Card (#FFFFFF White Text)
            - Locked Uniform Size Across All 4 Steps: max-w-[440px] h-[590px]
            ================================================================== */}
        <section className="lg:col-span-5 flex flex-col items-center">
          {/* Sound · language · theme — exactly as wide as the sign-in card */}
          <div className="w-full max-w-[440px] mb-3 flex items-center justify-between gap-2" data-login-toggles>
            <SoundTogglePill />
            <LocaleSwitchPill />
            <SkyThemePill />
          </div>
          <div className="relative z-10 w-full max-w-[440px] h-[590px] rounded-[32px] aics-true-glass overflow-hidden flex flex-col transition-all duration-300">
            {busyStep && (
              <div role="status" aria-live="polite" className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-white/80 dark:bg-[#0B1730]/85 backdrop-blur-md">
                <span className="relative w-14 h-14" aria-hidden="true">
                  <span className="absolute inset-0 rounded-full border-[3px] border-[#007AFF]/20" />
                  <span className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#007AFF] animate-spin" />
                </span>
                <div className="text-center px-8">
                  <p className="text-[17px] font-semibold text-[#0B1F4D] dark:text-white">
                    {busyStep === 'pin' ? (isTl ? 'Sinusuri ang PIN…' : 'Checking your PIN…') : busyStep === 'email' ? (isTl ? 'Ipinapadala ang code…' : 'Sending your code…') : isTl ? 'Sinusuri ang code…' : 'Checking your code…'}
                  </p>
                  <p className="mt-1 text-[13px] text-[#3B5284] dark:text-[#B8D0FA]">
                    {busyStep === 'pin' ? (isTl ? 'Ligtas itong sinusuri sa server.' : 'It is checked safely on the server.') : busyStep === 'email' ? (isTl ? 'Ilang segundo lang. Tingnan ang Gmail mo.' : 'This takes a few seconds. Then check your Gmail.') : isTl ? 'Halos tapos na.' : 'Almost done.'}
                  </p>
                </div>
                <ol className="flex items-center gap-2" aria-label={isTl ? 'Mga hakbang' : 'Steps'}>
                  {(['pin', 'email', 'otp'] as const).map((s, i) => {
                    const at = ['pin', 'email', 'otp'].indexOf(busyStep);
                    return <li key={s} className={`h-1.5 rounded-full ${i < at ? 'w-6 bg-emerald-500' : i === at ? 'w-10 bg-[#007AFF]' : 'w-6 bg-black/10 dark:bg-white/15'}`} />;
                  })}
                </ol>
              </div>
            )}
            {/* Top Accent Rim */}
            <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-[#1E469B] via-[#4E92DF] to-[#7CB8F7]" />

            <div className="flex-1 px-7 sm:px-9 pt-6 pb-7 flex flex-col items-center justify-between">
              {/* Fixed Card Header (Logo + School Name) */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-[80px] h-[80px] rounded-full p-1 bg-gradient-to-tr from-[#1E469B] via-[#4E92DF] to-[#9BCBFF] shadow-md mb-2.5">
                  <div className="w-full h-full rounded-full p-0.5 bg-white overflow-hidden">
                    <img
                      src="/aics-logo.jpg"
                      alt="Official AICS Seal"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>

                <h3 className="text-xl sm:text-[21px] font-extrabold tracking-tight text-[#0B1F4D] dark:text-white">
                  AICS MONTALBAN
                </h3>
              </div>

              {/* Uniform-Height Dynamic Phase Body */}
              <div className="w-full flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {/* ============================================================
                      STEP 1: 6-DIGIT PIN GATE
                      ============================================================ */}
                  {step === 'pin' && (
                    <motion.div
                      key="step-pin"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16 }}
                      className="w-full flex flex-col items-center justify-between h-full pt-2"
                    >
                      {/* Subtitle Pill */}
                      <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full aics-card-tile text-[#1E469B] dark:text-[#9BCBFF] text-xs sm:text-[13px] font-extrabold">
                        <DuotoneIcon name="key" size={15} />
                        <span>{t.pinBadge}</span>
                      </div>

                      {/* 6 Rounded Square PIN Boxes */}
                      <div
                        className={`grid grid-cols-6 gap-2.5 w-full max-w-[340px] ${
                          pinShake ? 'anim-shake' : ''
                        }`}
                      >
                        {[0, 1, 2, 3, 4, 5].map((idx) => {
                          const char = pinDigits[idx] || '';
                          const isFilled = char.length > 0;
                          const isCurrent = idx === pinDigits.length;

                          return (
                            <div
                              key={idx}
                              className={`h-13 py-3 rounded-2xl flex items-center justify-center font-mono text-xl font-extrabold transition-all duration-150 ${
                                isFilled
                                  ? 'bg-[#1E469B] text-white border-2 border-[#1E469B] dark:border-[#7CB8F7] shadow-md scale-[1.03]'
                                  : isCurrent
                                  ? 'bg-white dark:bg-[#1E3B75] border-2 border-[#2557BE] dark:border-[#7CB8F7] text-[#0B1F4D] dark:text-white shadow-[0_0_0_3px_rgba(37,87,190,0.20)]'
                                  : 'aics-card-tile'
                              }`}
                            >
                              {isFilled ? (showPin ? char : '●') : ''}
                            </div>
                          );
                        })}
                      </div>

                      {/* Show PIN Toggle OR Error Message */}
                      <div className="min-h-[24px] flex items-center justify-center">
                        {lockLeft > 0 ? (
                          <span className="px-3.5 py-1 rounded-full bg-rose-100 dark:bg-rose-500/35 border border-rose-300 dark:border-rose-400/50 text-rose-700 dark:text-white text-xs font-extrabold" data-pin-locked>
                            🔒 {locale === 'tl' ? `Naka-lock. Subukan ulit sa ${formatTimeRemaining(lockLeft)}.` : `Locked. Try again in ${formatTimeRemaining(lockLeft)}.`}
                          </span>
                        ) : pinError ? (
                          <span className="px-3.5 py-1 rounded-full bg-rose-100 dark:bg-rose-500/35 border border-rose-300 dark:border-rose-400/50 text-rose-700 dark:text-white text-xs font-extrabold anim-pop">
                            {pinError}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playToggleSwitch(!showPin);
                              setShowPin((s) => !s);
                            }}
                            className="text-xs sm:text-[13px] font-extrabold text-[#3B5284] dark:text-[#B8D0FA] hover:text-[#0B1F4D] dark:hover:text-white transition-colors"
                          >
                            {showPin ? t.hidePin : t.showPin}
                          </button>
                        )}
                      </div>

                      {/* 3x4 Tactile Keypad */}
                      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[340px]">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                          <button
                            key={digit}
                            type="button"
                            onClick={() => handleKeypadPress(digit)}
                            className="btn-press h-13 py-3 rounded-2xl aics-card-tile text-xl font-extrabold transition-colors"
                          >
                            {digit}
                          </button>
                        ))}

                        {/* Bottom Row: Clear, 0, Rose Backspace */}
                        <button
                          type="button"
                          onClick={handleClearPin}
                          className="btn-press h-13 py-3 rounded-2xl aics-card-tile text-xs sm:text-sm font-extrabold transition-colors"
                        >
                          {t.clearPin}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleKeypadPress('0')}
                          className="btn-press h-13 py-3 rounded-2xl aics-card-tile text-xl font-extrabold transition-colors"
                        >
                          0
                        </button>

                        <button
                          type="button"
                          aria-label="Backspace"
                          onClick={handleBackspace}
                          className="btn-press h-13 py-3 rounded-2xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/30 dark:hover:bg-rose-500/45 border border-rose-300 dark:border-rose-300/40 text-rose-600 dark:text-white flex items-center justify-center transition-colors"
                        >
                          <svg
                            className="w-6 h-6"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                            <line x1="18" y1="9" x2="12" y2="15" />
                            <line x1="12" y1="9" x2="18" y2="15" />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ============================================================
                      STEP 2: STAFF EMAIL SIGN-IN (Zero Data Privacy Leak!)
                      ============================================================ */}
                  {step === 'email' && (
                    <motion.form
                      key="step-email"
                      onSubmit={handleSendOtp}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16 }}
                      className="w-full flex flex-col justify-between h-full pt-2"
                    >
                      <div className="flex justify-center">
                        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full aics-card-tile text-[#1E469B] dark:text-[#9BCBFF] text-xs sm:text-[13px] font-extrabold">
                          <DuotoneIcon name="envelopeSimple" size={15} />
                          <span>{t.emailBadge}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label
                            htmlFor="staff-email"
                            className="block text-xs sm:text-sm font-extrabold text-[#0B1F4D] dark:text-white"
                          >
                            {t.emailLabel}
                          </label>
                          <div className="relative">
                          <input
                            id="staff-email"
                            type="text"
                            inputMode="email"
                            autoComplete="email"
                            spellCheck={false}
                            autoCapitalize="none"
                            value={showEmail ? email : maskEmail(email)}
                            onSelect={(e) => {
                              if (showEmail) return;
                              // typing / erasing happens at the end only (the hidden part cannot be edited in the middle)
                              const el = e.currentTarget;
                              const end = el.value.length;
                              if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end);
                            }}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (showEmail) { setEmail(v.replace(/\s/g, '')); setEmailError(null); return; }
                              const shown = maskEmail(email);
                              let next: string;
                              if (!v.includes('*')) next = v; // first letters, paste or autofill: take it as typed
                              else if (v.length > shown.length && v.startsWith(shown)) next = email + v.slice(shown.length);
                              else if (v.length < shown.length) next = email.slice(0, v.length);
                              else next = email;
                              setEmail(next.replace(/\s/g, ''));
                              setEmailError(null);
                            }}
                            placeholder={t.emailPlaceholder}
                            className="w-full pl-4 pr-14 py-3.5 rounded-2xl bg-white dark:bg-[#162C5C] border-2 border-[#B8CCF0] dark:border-[#355CA8] text-[#0B1F4D] dark:text-white placeholder-[#687FA8] dark:placeholder-[#89A7DF] text-sm sm:text-base font-bold focus:outline-none focus:border-[#1E469B] dark:focus:border-[#7CB8F7] shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmail((s) => !s)}
                            aria-label={showEmail ? (isTl ? 'Itago ang email' : 'Hide email') : (isTl ? 'Ipakita ang email' : 'Show email')}
                            title={showEmail ? (isTl ? 'Itago ang email' : 'Hide email') : (isTl ? 'Ipakita ang email' : 'Show email')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-[#687FA8] dark:text-[#89A7DF] hover:bg-black/[0.05] dark:hover:bg-white/10"
                          >
                            {showEmail ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                          </div>
                          {emailError && (
                            <p className="text-xs font-extrabold text-rose-600 dark:text-rose-300">
                              {emailError}
                            </p>
                          )}
                        </div>

                        {/* RA 10173 Data Privacy & Anti-Enumeration Notice (Panelist-Approved!) */}
                        <div className="p-3.5 rounded-2xl aics-card-tile flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#1E469B] text-white flex items-center justify-center shrink-0 mt-0.5">
                            <DuotoneIcon name="shieldCheck" size={18} />
                          </div>
                          <div className="text-left space-y-0.5">
                            <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white">
                              {locale === 'tl'
                                ? 'Protektado ng Data Privacy Act (RA 10173)'
                                : 'Data Privacy Act (RA 10173) Protected'}
                            </p>
                            <p className="text-[11px] font-semibold text-[#3B5284] dark:text-[#C5D8FA] leading-snug">
                              {t.antiEnumNotice}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <button
                          type="submit"
                          disabled={isSendingEmail}
                          className="btn-press w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1E469B] to-[#2557BE] hover:from-[#16377E] hover:to-[#1E469B] text-white font-extrabold text-sm sm:text-base shadow-lg disabled:opacity-50"
                        >
                          {isSendingEmail ? t.sendingOtpBtn : t.sendOtpBtn}
                        </button>

                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playBackspace();
                              setStep('pin');
                            }}
                            className="text-xs sm:text-sm font-extrabold text-[#3B5284] dark:text-[#B8D0FA] hover:text-[#0B1F4D] dark:hover:text-white"
                          >
                            {t.backToPin}
                          </button>
                        </div>
                      </div>
                    </motion.form>
                  )}

                  {/* ============================================================
                      STEP 3: 6-CHARACTER OTP VERIFICATION
                      ============================================================ */}
                  {step === 'otp' && activeOtp && (
                    <motion.div
                      key="step-otp"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16 }}
                      className="w-full flex flex-col justify-between h-full pt-2"
                    >
                      <div className="flex justify-center">
                        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full aics-card-tile text-[#1E469B] dark:text-[#9BCBFF] text-xs sm:text-[13px] font-extrabold">
                          <DuotoneIcon name="lockKey" size={15} />
                          <span>{t.otpBadge}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-3.5 rounded-2xl aics-card-tile text-center space-y-1">
                          <p className="text-xs font-bold text-[#3B5284] dark:text-[#B8D0FA]">
                            {locale === 'tl' ? 'Naipadala sa Gmail:' : 'Sent to Gmail inbox:'}
                          </p>
                          <p className="text-xs sm:text-sm font-extrabold text-[#0B1F4D] dark:text-white truncate">
                            {maskEmail(activeOtp.email)} ·{' '}
                            <span className="font-mono text-[#1E469B] dark:text-[#7CB8F7]">
                              {formatTimeRemaining(otpSecondsLeft)}
                            </span>
                          </p>
                        </div>

                        <div
                          className={`grid grid-cols-6 gap-2.5 ${
                            otpShake ? 'anim-shake' : ''
                          }`}
                        >
                          {otpChars.map((ch, idx) => (
                            <input
                              key={idx}
                              ref={(el) => {
                                otpInputRefs.current[idx] = el;
                              }}
                              // the first box is ready to type in as soon as it appears (even after a slow animation)
                              autoFocus={idx === 0}
                              type="text"
                              maxLength={6}
                              value={ch}
                              onChange={(e) => handleOtpInput(idx, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                              className="h-14 w-full rounded-2xl text-center font-mono text-xl font-extrabold uppercase bg-white dark:bg-[#162C5C] border-2 border-[#B8CCF0] dark:border-[#355CA8] text-[#0B1F4D] dark:text-white focus:outline-none focus:border-[#1E469B] dark:focus:border-[#7CB8F7] shadow-sm"
                            />
                          ))}
                        </div>

                        {otpError && (
                          <p className="text-center text-xs font-extrabold text-rose-600 dark:text-rose-300">
                            {otpError}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <button
                          type="button"
                          disabled={otpChars.join('').length < 6}
                          onClick={() => handleVerifyOtp(otpChars.join(''))}
                          className="btn-press w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white font-extrabold text-sm sm:text-base shadow-lg disabled:opacity-40"
                        >
                          {t.verifyOtpBtn}
                        </button>

                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playBackspace();
                              setStep('email');
                            }}
                            className="text-xs sm:text-sm font-extrabold text-[#3B5284] dark:text-[#B8D0FA] hover:text-[#0B1F4D] dark:hover:text-white"
                          >
                            {t.changeEmailBtn}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ============================================================
                      STEP 4: VERIFIED SESSION
                      ============================================================ */}
                  {step === 'verified' && verifiedStaff && (
                    <motion.div
                      key="step-verified"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full flex flex-col justify-between h-full pt-2 text-center"
                    >
                      <div className="flex justify-center">
                        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/25 border border-emerald-300 dark:border-emerald-400/50 text-emerald-800 dark:text-white text-xs sm:text-[13px] font-extrabold">
                          <span>✓</span>
                          <span>{isTl ? 'Pumasa sa lahat ng security check' : 'All security checks passed'}</span>
                        </div>
                      </div>

                      {/* the security steps this sign-in went through (no secrets, email partly hidden) */}
                      <ol className="p-4 rounded-2xl aics-card-tile text-left space-y-2.5" aria-label={isTl ? 'Mga security check' : 'Security checks'}>
                        {([
                          [isTl ? '6-digit na PIN' : '6-digit PIN', isTl ? 'Sinuri sa server. May lockout kapag maraming mali.' : 'Checked on the server. Locks after too many wrong tries.'],
                          [isTl ? '6-character na code sa email' : '6-character email code', `${isTl ? 'Ipinadala sa' : 'Sent to'} ${maskEmail(verifiedStaff.email)}`],
                          [isTl ? 'Secure na session' : 'Secure session', isTl ? 'Ang staff account lang ang makakabasa ng mga record.' : 'Only a staff account can read the records.'],
                          [isTl ? 'Auto sign-out' : 'Auto sign-out', isTl ? 'Magsa-sign out kapag 15 minutong walang galaw.' : 'Signs out after 15 minutes with no activity.'],
                          [isTl ? 'Naitala sa Audit Trail' : 'Recorded in the Audit Trail', isTl ? 'Hindi mababago ang talaan ng bawat ginawa.' : 'Every action is logged and cannot be edited.'],
                        ] as const).map(([a, b], i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center shrink-0" aria-hidden>✓</span>
                            <span className="min-w-0">
                              <span className="block text-[13px] font-bold text-[#0B1F4D] dark:text-white">{a}</span>
                              <span className="block text-[12px] text-[#3B5284] dark:text-[#B8D0FA] truncate">{b}</span>
                            </span>
                          </li>
                        ))}
                      </ol>

                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playVerifiedFanfare();
                          onEnterDashboard(verifiedStaff);
                        }}
                        className="btn-press w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white font-extrabold text-xs sm:text-sm shadow-lg"
                      >
                        {locale === 'tl'
                          ? 'Pumasok sa Guidance Dashboard →'
                          : 'Enter Guidance Office Dashboard →'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Footer Hint Under Card */}
          <p className="mt-4 text-xs sm:text-[13.5px] font-semibold text-white/90 text-center">
            {t.pinFooter}
          </p>
        </section>
      </main>

      {/* Bottom GPU Wavy Background */}
      <WavyBackground />
    </div>
  );
};
