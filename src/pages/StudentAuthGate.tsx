import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CelestialBackground } from '../components/auth/CelestialBackground';
import { WavyBackground } from '../components/auth/WavyBackground';
import { StudentRegistrationScanner } from '../components/auth/StudentRegistrationScanner';
import { SoundTogglePill, soundFX } from '../services/soundEngine';
import { SkyThemePill } from '../context/ThemeContext';
import { LocaleSwitchPill, useLanguage } from '../context/LanguageContext';
import {
  StudentPortalUser,
  registerStudentPortalAccount,
  loginStudentPortal,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
} from '../services/studentAuthService';

export type PortalAuthMode = 'login' | 'register' | 'forgot';

interface StudentAuthGateProps {
  onLoginSuccess: (user: StudentPortalUser) => void;
}

export const StudentAuthGate: React.FC<StudentAuthGateProps> = ({
  onLoginSuccess,
}) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';

  const [mode, setMode] = useState<PortalAuthMode>('login');

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

  // ID Files
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [studentIdPreview, setStudentIdPreview] = useState<string | null>(null);
  const [nationalIdPreview, setNationalIdPreview] = useState<string | null>(null);

  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [show20sScanner, setShow20sScanner] = useState(false);
  const [scanPendingAccount, setScanPendingAccount] = useState<any>(null);
  const [scanForcedError, setScanForcedError] = useState<string | null>(null);

  // Success Modal State
  const [successData, setSuccessData] = useState<{
    username: string;
    passwordPlain: string;
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

  // 6. Uploaded IDs
  const studentIdStatus = useMemo(() => {
    if (!studentIdFile) return { type: 'not_input', label: 'Not Uploaded' };
    return { type: 'correct', label: 'Uploaded ✓' };
  }, [studentIdFile]);

  const nationalIdStatus = useMemo(() => {
    if (!nationalIdFile) return { type: 'not_input', label: 'Not Uploaded' };
    return { type: 'correct', label: 'Uploaded ✓' };
  }, [nationalIdFile]);

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
    nationalIdStatus.type === 'correct' &&
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

  const handleNationalIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') || file.type.includes('pdf')) {
        soundFX.playError();
        setRegError('BAWAL ANG PDF O VIDEO: Tanging totoong litrato (JPG/PNG) lamang ng National ID ang tinatanggap.');
        return;
      }
      setNationalIdFile(file);
      const url = URL.createObjectURL(file);
      setNationalIdPreview(url);
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
    setScanForcedError(null);
    setShow20sScanner(true);

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
        nationalIdFile,
      });

      setRegLoading(false);

      if (!res.success || !res.account) {
        setScanForcedError(res.error || 'Failed to create account.');
      } else {
        setScanPendingAccount({
          username: res.account.studentNumber,
          passwordPlain: regPassword,
          account: res.account,
        });
      }
    } catch (err: any) {
      setRegLoading(false);
      setScanForcedError(err?.message || 'Network error encountered during registration.');
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
      <CelestialBackground />
      <WavyBackground />

      {/* Top Header Bar */}
      <header className="relative z-20 w-full px-4 sm:px-8 py-3.5 sm:py-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 student-portal-header bg-[#0B1E48]/80 backdrop-blur-md safe-area-top">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <img
            src="/aics-logo.jpg"
            alt="AICS Logo"
            className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-white/40 bg-white p-0.5 shadow-xl shrink-0"
          />
          <div>
            <h1 className="text-xs sm:text-base font-extrabold tracking-tight text-white dark:text-white">
              <span>AICS MONTALBAN</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-[#9BCBFF] font-semibold truncate max-w-[200px] sm:max-w-none">
              Safe & Confidential Concern Reporting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto">
          <SoundTogglePill />
          <LocaleSwitchPill />
          <SkyThemePill />
        </div>
      </header>

      {/* Main Glassmorphic Container (Spacious width para straight-line ang Last Name, First Name, at M.I.) */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-3 sm:p-8 my-2 sm:my-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`w-full ${
            mode === 'register' ? 'max-w-5xl' : 'max-w-xl'
          } cosmic-glass-card p-5 sm:p-12 space-y-6 sm:space-y-8`}
        >
          {/* ====================================================
              MODE: LOGIN SCREEN
              ==================================================== */}
          {mode === 'login' && (
            <div className="space-y-7">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/40 shadow-lg shadow-blue-500/20 text-blue-300">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight card-title-text">
                  {isTl ? 'Student Portal Sign-In' : 'Student Portal Sign-In'}
                </h2>
                <p className="text-sm font-semibold card-subtitle-text">
                  {isTl
                    ? 'Mag-sign in gamit ang iyong Student ID Number at Password'
                    : 'Sign in with your Student ID Number and Password'}
                </p>
              </div>

              {loginError && (
                <div className="p-4 rounded-2xl bg-rose-500/25 border border-rose-500/50 text-rose-200 text-sm font-semibold flex items-center gap-3">
                  <span className="text-base">⚠️</span>
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-extrabold register-label flex items-center justify-between">
                    <span>Student ID Number</span>
                    <span className="text-xs card-subtitle-text font-normal">hal. 2025-11098</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 text-base pointer-events-none">
                      👤
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
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 text-base pointer-events-none">
                      🔒
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
                      {showLoginPassword ? '🙈' : '👁️'}
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
                    setMode('register');
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
                  <p className="text-sm font-semibold mt-1 card-subtitle-text">
                    {isTl
                      ? 'Awtomatikong aprubado kapag nakumpleto ang mga kinakailangang impormasyon'
                      : 'Automatic approved upon completing required identity and security fields'}
                  </p>
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
                  <span className="text-base">⚠️</span>
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

                {/* 3. UPLOAD IDENTIFICATION (LARGE CARDS) */}
                <div className="space-y-3 p-5 rounded-2xl register-section-card">
                  <h3 className="text-xs font-extrabold tracking-wider register-section-title uppercase">
                    {isTl ? '3. Kinakailangang Opisyal na ID Verification (Mag-upload ng Litrato)' : '3. Required Official ID Verification (Upload Photos)'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Student ID Card */}
                    <div className="p-4 rounded-2xl register-inner-card space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold register-label flex items-center gap-2">
                          <span>📷</span> {isTl ? 'Litrato ng Student ID' : 'Student ID Photo'}
                        </span>
                        {renderBadge(studentIdStatus)}
                      </div>
                      {studentIdPreview ? (
                        <div className="relative h-32 rounded-xl overflow-hidden border border-white/20 bg-black/50 flex items-center justify-center">
                          <img
                            src={studentIdPreview}
                            alt="Student ID Preview"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setStudentIdFile(null);
                              setStudentIdPreview(null);
                            }}
                            className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-black/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
                          >
                            {isTl ? 'Palitan ang Litrato' : 'Change Photo'}
                          </button>
                        </div>
                      ) : (
                        <label className="btn-press flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed upload-dropzone cursor-pointer text-center p-3 transition-colors">
                          <span className="text-2xl">📤</span>
                          <span className="text-xs font-extrabold register-label mt-1.5">
                            {isTl ? 'Pindutin para i-upload ang Student ID' : 'Click to Upload Student ID'}
                          </span>
                          <span className="text-[11px] opacity-70">{isTl ? 'TOTOONG LITRATO LAMANG (JPG, PNG)' : 'REAL PHOTO ONLY (JPG, PNG)'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            onChange={handleStudentIdUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* National ID Card */}
                    <div className="p-4 rounded-2xl register-inner-card space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold register-label flex items-center gap-2">
                          <span>🪪</span> {isTl ? 'Litrato ng National ID' : 'National ID Photo'}
                        </span>
                        {renderBadge(nationalIdStatus)}
                      </div>
                      {nationalIdPreview ? (
                        <div className="relative h-32 rounded-xl overflow-hidden border border-white/20 bg-black/50 flex items-center justify-center">
                          <img
                            src={nationalIdPreview}
                            alt="National ID Preview"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setNationalIdFile(null);
                              setNationalIdPreview(null);
                            }}
                            className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-black/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
                          >
                            {isTl ? 'Palitan ang Litrato' : 'Change Photo'}
                          </button>
                        </div>
                      ) : (
                        <label className="btn-press flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed upload-dropzone cursor-pointer text-center p-3 transition-colors">
                          <span className="text-2xl">📤</span>
                          <span className="text-xs font-extrabold register-label mt-1.5">
                            {isTl ? 'Pindutin para i-upload ang National ID' : 'Click to Upload National ID'}
                          </span>
                          <span className="text-[11px] opacity-70">{isTl ? 'TOTOONG LITRATO LAMANG (JPG, PNG)' : 'REAL PHOTO ONLY (JPG, PNG)'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            onChange={handleNationalIdUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
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
                          {showRegPassword ? '🙈' : '👁️'}
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
                          {showRegConfirmPassword ? '🙈' : '👁️'}
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
                          {showForgotNewPassword ? '🙈' : '👁️'}
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
                          {showForgotConfirmPassword ? '🙈' : '👁️'}
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
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 text-center text-xs text-[#9BCBFF]/75 border-t border-white/10 bg-[#0B1E48]/50">
        Official Student Concern & Peer Referral Portal · Asian Institute of Computer Studies – Montalban (RA 10173 Protected)
      </footer>

      {/* ====================================================
          20-SECOND HIGH-TECH BIOMETRIC SCANNING OVERLAY
          ==================================================== */}
      <StudentRegistrationScanner
        isOpen={show20sScanner}
        studentName={`${regLastName}, ${regFirstName} ${regMiddleInitial}`.trim()}
        studentNumber={regStudentNumber || '2025-XXXXX'}
        isTl={isTl}
        forcedError={scanForcedError}
        onErrorDecline={(msg) => {
          setRegError(msg);
          setShow20sScanner(false);
        }}
        onComplete={() => {
          setShow20sScanner(false);
          if (scanPendingAccount) {
            setSuccessData(scanPendingAccount);
          }
        }}
      />

      {/* ====================================================
          SUCCESSFUL REGISTRATION MODAL
          ==================================================== */}
      <AnimatePresence>
        {successData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#06122B]/85 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 350 }}
              className="w-full max-w-lg rounded-3xl bg-[#0B1E48] border-2 border-emerald-400 p-8 text-center shadow-2xl space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/40">
                <svg
                  className="w-10 h-10 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div className="space-y-1.5">
                <span className="px-4 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-extrabold uppercase tracking-wide">
                  ✓ Automatic Approved
                </span>
                <h3 className="text-2xl font-extrabold text-white pt-2">
                  Account Created Successfully!
                </h3>
                <p className="text-sm text-[#9BCBFF]">
                  Welcome to AICS Student Concern & Safe Reporting Portal
                </p>
              </div>

              {/* Exact Credentials Highlight Box */}
              <div className="p-5 rounded-2xl bg-black/50 border border-white/20 text-left space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-sm">
                  <span className="text-white/70 font-bold">Your Username:</span>
                  <span className="font-mono font-extrabold text-emerald-300 text-base">
                    {successData.username}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 font-bold">Your Password:</span>
                  <span className="font-mono font-extrabold text-amber-300 text-base">
                    {successData.passwordPlain}
                  </span>
                </div>
                <p className="text-xs text-white/60 pt-1">
                  💡 <strong>Important:</strong> Your username is the Student Number you provided, and your password is the password you created.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundFX.playSuccessCheck();
                  onLoginSuccess(successData.account);
                }}
                className="btn-press w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-extrabold text-base shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5"
              >
                <span>Proceed to Student Dashboard</span>
                <span>→</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
