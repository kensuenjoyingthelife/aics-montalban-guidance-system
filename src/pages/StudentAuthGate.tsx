import React, { useState, useMemo, useRef, useEffect } from 'react';
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

  // Privacy Terms & Conditions Modal State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  // ID & Photo Verification State
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [studentIdPreview, setStudentIdPreview] = useState<string | null>(null);

  // Live Camera / Webcam State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraErrorNotice, setCameraErrorNotice] = useState<string | null>(null);
  const [showNoWebcamConfirmation, setShowNoWebcamConfirmation] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  // Camera stream controls
  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const startCamera = async (facing: 'user' | 'environment' = 'user') => {
    setCameraErrorNotice(null);
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setShowNoWebcamConfirmation(true);
        return;
      }

      // Check available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      if (videoDevices.length === 0) {
        setShowNoWebcamConfirmation(true);
        return;
      }

      // Request live stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      stopCameraStream();
      setCameraStream(stream);
      setIsCameraOpen(true);
      setCameraFacingMode(facing);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      // If error is NotFoundError or DevicesNotFoundError, show no webcam confirmation
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setShowNoWebcamConfirmation(true);
      } else {
        setCameraErrorNotice(
          isTl
            ? 'Hindi ma-access ang camera. Pakisigurong binigyan mo ng camera permission ang browser o gamitin ang file picker.'
            : 'Unable to access camera. Please allow camera permissions in browser settings or proceed with file upload.'
        );
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `live_student_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setStudentIdFile(file);
      setStudentIdPreview(URL.createObjectURL(file));
      soundFX.playToggleSwitch(true);
      stopCameraStream();
      setIsCameraOpen(false);
    }, 'image/jpeg', 0.92);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

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

                {/* 3. STUDENT PHOTO & ID VERIFICATION (LIVE CAMERA / WEBCAM OR UPLOAD) */}
                <div className="space-y-4 p-5 rounded-2xl register-section-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-extrabold tracking-wider register-section-title uppercase">
                        {isTl ? '3. Live Verification & Litrato ng Estudyante' : '3. Live Student Verification & ID'}
                      </h3>
                      <p className="text-xs opacity-75 mt-0.5">
                        {isTl
                          ? 'Kumuha ng live na litrato gamit ang camera ng cellphone o webcam ng computer upang mapatunayang totoong estudyante ka.'
                          : 'Capture a live photo using your phone camera or computer webcam to prove genuine student identity.'}
                      </p>
                    </div>
                    <div>{renderBadge(studentIdStatus)}</div>
                  </div>

                  <div className="p-5 rounded-2xl register-inner-card space-y-4">
                    {studentIdPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-black/60 flex flex-col items-center justify-center p-3">
                        <img
                          src={studentIdPreview}
                          alt="Student Verification Preview"
                          className="max-h-72 w-full object-contain rounded-xl"
                        />
                        <div className="mt-3 flex items-center justify-between w-full px-2">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <span>✓</span> {isTl ? 'Litrato Handa Na' : 'Photo Captured & Ready'}
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
                            {isTl ? 'Palitan / Kumuha Uli' : 'Retake / Change Photo'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Option A: Live Camera / Webcam */}
                        <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 flex flex-col justify-between space-y-3 text-center">
                          <div className="space-y-1">
                            <span className="text-3xl block">📷</span>
                            <h4 className="text-sm font-extrabold text-sky-400">
                              {isTl ? 'Live Camera / Webcam Capture' : 'Live Camera / Webcam'}
                            </h4>
                            <p className="text-xs opacity-80">
                              {isTl
                                ? 'Mag-selfie o itapat ang mukha at ID gamit ang camera.'
                                : 'Take a live snapshot with your phone camera or PC webcam.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playToggleSwitch(true);
                              startCamera('user');
                            }}
                            className="btn-press w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2"
                          >
                            <span>📸</span>
                            <span>{isTl ? 'Buksan ang Camera / Webcam' : 'Open Camera / Webcam'}</span>
                          </button>
                        </div>

                        {/* Option B: File Upload (Fallback or Direct) */}
                        <div className="p-4 rounded-xl border border-white/15 bg-white/5 flex flex-col justify-between space-y-3 text-center">
                          <div className="space-y-1">
                            <span className="text-3xl block">📁</span>
                            <h4 className="text-sm font-extrabold text-slate-300">
                              {isTl ? 'Mag-upload Mula sa Device' : 'Upload From Device'}
                            </h4>
                            <p className="text-xs opacity-80">
                              {isTl
                                ? 'Kung walang nakasaksak na camera o may kopya ka na.'
                                : 'Upload your student ID photo directly if no webcam is available.'}
                            </p>
                          </div>
                          <label className="btn-press w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold border border-white/20 cursor-pointer flex items-center justify-center gap-2">
                            <span>📤</span>
                            <span>{isTl ? 'Pumili ng File' : 'Select Photo File'}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/jpg"
                              capture="user"
                              onChange={handleStudentIdUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {cameraErrorNotice && (
                      <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center justify-between">
                        <span>{cameraErrorNotice}</span>
                        <button
                          type="button"
                          onClick={() => setCameraErrorNotice(null)}
                          className="text-white hover:underline text-xs ml-2"
                        >
                          ✕
                        </button>
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

      {/* ====================================================
          DATA PRIVACY TERMS & CONDITIONS MODAL
          (Appears strictly before opening Create Account form)
          ==================================================== */}
      <AnimatePresence>
        {showPrivacyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#06122B]/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 340 }}
              className="w-full max-w-2xl rounded-3xl cosmic-glass-card p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 text-xl">
                    📜
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
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs sm:text-sm text-slate-300 dark:text-slate-300 register-inner-card p-4 sm:p-5 rounded-2xl leading-relaxed">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-400/30 text-blue-200 text-xs font-semibold">
                  🛡️ {isTl
                    ? 'Mahalaga: Ang portal na ito ay nilikha para protektahan ang iyong kaligtasan at kapakanan bilang mag-aaral ng AICS Montalban. Basahin ang sumusunod na kasunduan bago magparehistro.'
                    : 'Important: This portal is created to safeguard your well-being and privacy as an AICS Montalban student. Please review the following agreement prior to account creation.'}
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-2">
                    <span>1.</span>
                    <span>{isTl ? 'Proteksyon sa ilalim ng RA 10173 (Data Privacy Act)' : 'Protection under RA 10173 (Data Privacy Act)'}</span>
                  </h4>
                  <p className="text-xs opacity-90">
                    {isTl
                      ? 'Ang lahat ng personal na impormasyon (Pangalan, Contact Number, Student ID, at Larawan) na iyong ilalagay ay ituturing na mahigpit na kumpidensyal. Tanging ang lisensyadong Guidance Associate at Counseling Office lamang ang may pahintulot na humawak ng iyong datos.'
                      : 'All personal data provided (Name, Contact Number, Student ID, and Photo Uploads) will be treated with absolute confidentiality. Only authorized Guidance Associates and Counselors are granted access to your records.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-2">
                    <span>2.</span>
                    <span>{isTl ? 'Proteksyon Laban sa Retaliation o Pagganti' : 'Non-Retaliation & Safety Assurance'}</span>
                  </h4>
                  <p className="text-xs opacity-90">
                    {isTl
                      ? 'Ginawa ang sistema upang mapigilan ang anumang uri ng paghihiganti o harassment. Ang iyong isinumiteng reklamo o chat history ay HINDI kailanman ibubunyag sa inirereklamong kaklase, estudyante, o hindi awtorisadong kawani ng paaralan.'
                      : 'The system strictly prohibits retaliation. Your reports and counseling discussions will NEVER be disclosed to reported individuals, fellow students, or unauthorized school personnel.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-2">
                    <span>3.</span>
                    <span>{isTl ? 'Awtomatikong Pag-Logout para sa Iyong Kaligtasan' : 'Automatic Session Termination for Discretion'}</span>
                  </h4>
                  <p className="text-xs opacity-90">
                    {isTl
                      ? 'Para sa iyong seguridad sakaling maiwan mo ang iyong cellphone o computer na nakabukas sa silid-aralan o internet shop, awtomatikong magla-lock out ang iyong account pagkatapos ng 15 minuto ng walang aktibidad upang walang makakita ng iyong mga ulat.'
                      : 'To protect you in case you leave your device unattended in a classroom or computer laboratory, your session will automatically terminate after 15 minutes of inactivity so no evidence is left visible.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-2">
                    <span>4.</span>
                    <span>{isTl ? 'Tapat at Makatotohanang Pag-uulat' : 'Truthfulness of Information'}</span>
                  </h4>
                  <p className="text-xs opacity-90">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================
          LIVE CAMERA / WEBCAM CAPTURE MODAL
          ==================================================== */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#06122B]/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-[#0B1E48] border-2 border-sky-400 p-5 sm:p-6 text-white shadow-2xl flex flex-col space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📸</span>
                  <h3 className="text-base font-extrabold text-white">
                    {isTl ? 'Kumuha ng Live Litrato' : 'Live Camera / Webcam Viewfinder'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playBackspace();
                    stopCameraStream();
                    setIsCameraOpen(false);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Viewfinder Video Stream */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border border-sky-400/30">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                {/* Visual Target Frame */}
                <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-sky-400/50 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] font-mono tracking-wider bg-black/60 px-3 py-1 rounded-full text-sky-300">
                    {isTl ? 'Itapat ang mukha o Student ID rito' : 'Align face or Student ID here'}
                  </span>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playToggleSwitch(true);
                    const nextFacing = cameraFacingMode === 'user' ? 'environment' : 'user';
                    startCamera(nextFacing);
                  }}
                  className="btn-press px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center gap-1.5"
                  title="Switch Front/Back Camera"
                >
                  <span>🔄</span>
                  <span className="hidden sm:inline">{isTl ? 'Palitan ang Camera' : 'Flip Camera'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    capturePhoto();
                  }}
                  className="btn-press flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-extrabold shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2"
                >
                  <span className="w-4 h-4 rounded-full bg-white animate-pulse" />
                  <span>{isTl ? 'Kumuha ng Litrato (Capture)' : 'Capture Photo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.playBackspace();
                    stopCameraStream();
                    setIsCameraOpen(false);
                  }}
                  className="btn-press px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold"
                >
                  {isTl ? 'Kanselahin' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================
          CONFIRMATION DIALOG: NO WEBCAM DETECTED
          Graceful optional fallback without blocking the user
          ==================================================== */}
      <AnimatePresence>
        {showNoWebcamConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#06122B]/85 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-[#0B1E48] border-2 border-amber-400/70 p-6 text-white shadow-2xl space-y-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 mx-auto flex items-center justify-center text-2xl">
                📷
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-extrabold text-white">
                  {isTl ? 'Walang Nakitang Webcam o Camera' : 'No Webcam or Camera Detected'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {isTl
                    ? 'Wala kaming nakitang nakasaksak na webcam o camera sa iyong computer o browser. Maaari mong ipagpatuloy ang pagpaparehistro sa pamamagitan ng pag-upload ng litrato mula sa iyong computer files.'
                    : 'No webcam hardware was detected on this device. You may proceed with student registration by uploading a photo directly from your local storage.'}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playToggleSwitch(true);
                    setShowNoWebcamConfirmation(false);
                  }}
                  className="btn-press w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>✓</span>
                  <span>{isTl ? 'Sige, Mag-Upload ng File' : 'Proceed with File Upload'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
