import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { soundFX } from '../services/soundEngine';

export type LocaleMode = 'en' | 'tl';

export const STAGE1_COPY = {
  en: {
    badge: 'OFFICIAL GUIDANCE SYSTEM OF AICS MONTALBAN',
    schoolLine1: 'ASIAN INSTITUTE OF',
    schoolLine2: 'Computer Studies · Montalban',
    campusAddress: 'Montalban Town Center, E. Rodriguez Highway, Rodriguez, Rizal 1860',
    estLine: 'Rodriguez, Rizal · Est. 1996 · Data Privacy Act (RA 10173) Protected',
    headlines: [
      'Student Discipline & Guidance Case Tracking.',
      'Real-Time Parent SMS & Email Follow-Ups.',
      'Safe & Confidential Student Concern Reporting.',
      'Counselor Queue for Serious and Repeated Cases.',
    ],
    pillars: {
      cases: 'Case Flow',
      casesSub: '9-Step Tracking',
      sms: 'Parent SMS',
      smsSub: 'Semaphore + Gmail',
      concerns: 'Concerns',
      concernsSub: 'Safe Referral',
      clearance: 'Counselor',
      clearanceSub: 'Referral queue',
    },
    cardTitle: 'AICS MONTALBAN',
    cardSubtitle: 'Guidance Office Security Gate',
    step1Label: '1. App PIN',
    step2Label: '2. Staff Email',
    step3Label: '3. 6-Char OTP',
    pinBadge: 'Enter your 6-digit access PIN',
    pinHint: 'Default initial PIN is 123456. You can type on your keyboard or click the keypad below.',
    showPin: 'Show PIN',
    hidePin: 'Hide PIN',
    clearPin: 'Clear',
    pinFooter: "Don't know the PIN? Ask the Guidance Associate or Head Admin.",
    pinError: 'Wrong PIN. {left} tries left before temporary lock.',
    pinLockedTitle: 'PIN Pad Temporarily Locked',
    pinLockedDesc: 'Too many wrong tries. Please wait {sec}s before trying again.',
    pinVerifiedToast: 'PIN accepted! Moving to Staff Email Sign-In...',
    emailBadge: 'Sign in with your Guidance Staff Email',
    emailLabel: 'Registered Staff Email Address',
    emailPlaceholder: 'name@gmail.com',
    emailReady: '✓ Ready',
    emailFormatHint: 'Please enter a valid email address (like name@gmail.com).',
    quickFillLabel: 'Quick-fill Official Account:',
    sendOtpBtn: 'Send 6-Character Sign-In Code',
    sendingOtpBtn: 'Generating & Sending Code...',
    antiEnumNotice:
      'If this email is registered in the AICS Guidance directory, we sent a 6-character sign-in code.',
    backToPin: '← Lock PIN Gate',
    otpBadge: 'Enter 6-character verification code',
    otpSentTo: 'Code sent for',
    otpExpiresIn: 'Expires in',
    otpExpired: 'Code expired. Please request a new code.',
    verifyOtpBtn: 'Verify & Enter Guidance System',
    resendOtpBtn: 'Resend New Code',
    resendCooldown: 'Resend available in {sec}s',
    changeEmailBtn: '← Use a different email',
    otpWrongError: 'That code doesn’t match. {left} tries left before this code locks.',
    otpLockedError: 'Too many wrong tries! This code is now locked. Please request a new code.',
    devPreviewTitle: 'Live OTP & Gmail Delivery Monitor (Testing Helper)',
    devPreviewSubtitle: 'Generated 6-Char Code (Excludes confusing 0/O/1/I):',
    autoFillOtpBtn: '1-Click Auto-Fill & Verify',
    copyOtpBtn: 'Copy Code',
    copiedOtpBtn: 'Copied!',
    sessionReadyBadge: 'STAGE 1 SECURITY GATE VERIFIED',
    sessionWelcome: 'Welcome back, Guidance Associate!',
    sessionDesc:
      'Your desktop session is authenticated and recorded in the tamper-evident Audit Trail.',
    sessionUserLabel: 'Signed-in Account',
    sessionRoleLabel: 'Assigned Role',
    sessionRoleValue: 'Guidance Associate & System Administrator',
    sessionModeLabel: 'Notification Engine',
    sessionModeValue: 'Semaphore SMS + Gmail SMTP (Dual-Channel Ready)',
    auditLogTitle: 'Recent Security Gate Audit Trail',
    testAgainBtn: 'Lock & Test Sign-In Flow Again',
    replaySplashBtn: 'Replay AICS Seal Splash',
    pillarModalClose: 'Got it, close preview',
  },
  tl: {
    badge: 'OPISYAL NA GUIDANCE SYSTEM NG AICS MONTALBAN',
    schoolLine1: 'ASIAN INSTITUTE OF',
    schoolLine2: 'Computer Studies · Montalban',
    campusAddress: 'Montalban Town Center, E. Rodriguez Highway, Rodriguez, Rizal 1860',
    estLine: 'Rodriguez, Rizal · Est. 1996 · Protektado ng Data Privacy Act (RA 10173)',
    headlines: [
      'Maayos na Student Discipline at Case Tracking.',
      'Mabilis na Parent SMS at Email Follow-Up.',
      'Ligtas at Confidential na Student Concern Reporting.',
      'Listahan para sa Counselor ng Malubha at Paulit-ulit na Kaso.',
    ],
    pillars: {
      cases: 'Case Flow',
      casesSub: '9-Step Tracking',
      sms: 'Parent SMS',
      smsSub: 'Semaphore + Gmail',
      concerns: 'Concerns',
      concernsSub: 'Safe Referral',
      clearance: 'Counselor',
      clearanceSub: 'Referral queue',
    },
    cardTitle: 'AICS MONTALBAN',
    cardSubtitle: 'Guidance Office Security Gate',
    step1Label: '1. App PIN',
    step2Label: '2. Staff Email',
    step3Label: '3. 6-Char OTP',
    pinBadge: 'Ilagay ang 6-digit access PIN',
    pinHint: 'Default initial PIN ay 123456. Pwedeng mag-type sa keyboard o pumindot sa keypad.',
    showPin: 'Ipakita ang PIN',
    hidePin: 'Itago ang PIN',
    clearPin: 'Burahin',
    pinFooter: 'Hindi alam ang PIN? Magtanong sa Guidance Associate o Head Admin.',
    pinError: 'Maling PIN. {left} subok na lang bago pansamantalang ma-lock.',
    pinLockedTitle: 'Pansamantalang Naka-Lock ang PIN Pad',
    pinLockedDesc: 'Sobra na ang maling subok. Maghintay ng {sec}s bago ulitin.',
    pinVerifiedToast: 'Tama ang PIN! Bubuksan na ang Staff Email Sign-In...',
    emailBadge: 'Mag-sign in gamit ang Guidance Staff Email',
    emailLabel: 'Rehistradong Staff Email Address',
    emailPlaceholder: 'pangalan@gmail.com',
    emailReady: '✓ Handa na',
    emailFormatHint: 'Maglagay ng tamang email address (hal. pangalan@gmail.com).',
    quickFillLabel: '1-Click Official Account:',
    sendOtpBtn: 'Magpadala ng 6-Character Code',
    sendingOtpBtn: 'Gumagawa at Nagpapadala ng Code...',
    antiEnumNotice:
      'Kung may account ang email na ito sa AICS Guidance directory, nagpadala kami ng 6-character code.',
    backToPin: '← I-lock ulit ang PIN Gate',
    otpBadge: 'Ilagay ang 6-character verification code',
    otpSentTo: 'Code para sa',
    otpExpiresIn: 'Mae-expire sa',
    otpExpired: 'Nag-expire na ang code. Humingi ulit ng bagong code.',
    verifyOtpBtn: 'I-verify at Pumasok sa System',
    resendOtpBtn: 'Magpadala ng Bagong Code',
    resendCooldown: 'Pwedeng ulitin sa loob ng {sec}s',
    changeEmailBtn: '← Gumamit ng ibang email',
    otpWrongError: 'Mali ang code na nailagay. {left} subok na lang bago ma-lock ang code na ito.',
    otpLockedError: 'Sobra na ang maling subok! Na-lock na ang code na ito. Humingi ng bago.',
    devPreviewTitle: 'Live OTP at Gmail Delivery Monitor (Pang-Test)',
    devPreviewSubtitle: 'Nabuo na 6-Char Code (Walang nakakalitong 0/O/1/I):',
    autoFillOtpBtn: '1-Click Auto-Fill at Verify',
    copyOtpBtn: 'Kopyahin',
    copiedOtpBtn: 'Nakopya na!',
    sessionReadyBadge: 'VERIFIED NA ANG STAGE 1 SECURITY GATE',
    sessionWelcome: 'Welcome back, Guidance Associate!',
    sessionDesc:
      'Verified na ang iyong desktop session at naitala na sa tamper-evident Audit Trail.',
    sessionUserLabel: 'Naka-Sign In na Account',
    sessionRoleLabel: 'Nakatalagang Role',
    sessionRoleValue: 'Guidance Associate & System Administrator',
    sessionModeLabel: 'Notification Engine',
    sessionModeValue: 'Semaphore SMS + Gmail SMTP (Handa sa Dual-Channel)',
    auditLogTitle: 'Pinakabagong Security Gate Audit Trail',
    testAgainBtn: 'I-lock at Subukan Ulit ang Sign-In Flow',
    replaySplashBtn: 'Ulitin ang AICS Seal Splash',
    pillarModalClose: 'Okay, isara ang preview',
  },
};

interface LanguageContextValue {
  locale: LocaleMode;
  setLocale: (mode: LocaleMode) => void;
  t: typeof STAGE1_COPY.en;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'aics_guidance_locale_v1';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<LocaleMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'tl' ? 'tl' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLocale = (mode: LocaleMode) => {
    soundFX.playToggleSwitch(mode === 'tl');
    setLocaleState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale === 'tl' ? 'tl-PH' : 'en';
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: STAGE1_COPY[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

export const LocaleSwitchPill: React.FC = () => {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language Switcher"
      className="relative inline-flex items-center p-0.5 sm:p-1 rounded-full bg-[#E4ECFC]/90 dark:bg-[#142852]/90 border border-[#CFD9F2] dark:border-[#233F78] shadow-inner select-none h-[28px] sm:h-[30px]"
    >
      {(['en', 'tl'] as const).map((item) => {
        const active = locale === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => setLocale(item)}
            className={`relative z-10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wide transition-colors duration-150 flex items-center justify-center leading-none ${
              active
                ? 'text-white'
                : 'text-[#1E469B] dark:text-[#B4C6EC] hover:text-[#0B1F4D] dark:hover:text-white'
            }`}
          >
            {active && (
              <motion.span
                layoutId="aics-locale-pill"
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-[#1E469B] to-[#2557BE] shadow-[0_2px_8px_rgba(30,70,155,0.45)] -z-10"
              />
            )}
            {/* Sa mobile: short label (EN / TL) para kapantay at compact sa light/dark toggle; Sa desktop: buong label */}
            <span className="sm:hidden">{item.toUpperCase()}</span>
            <span className="hidden sm:inline">{item === 'en' ? 'EN · English' : 'TL · Taglish'}</span>
          </button>
        );
      })}
    </div>
  );
};
