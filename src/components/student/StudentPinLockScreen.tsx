import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, LogOut, ArrowRight, ShieldCheck, Delete } from 'lucide-react';
import { StudentPortalUser, verifyStudentQuickPin } from '../../services/studentAuthService';
import { soundFX } from '../../services/soundEngine';
import { CelestialBackground } from '../auth/CelestialBackground';
import { SafezoneMascot } from '../auth/SafezoneMascot';

interface StudentPinLockScreenProps {
  user: StudentPortalUser;
  onUnlock: (user: StudentPortalUser) => void;
  onSwitchAccount: () => void;
  isTl?: boolean;
}

export const StudentPinLockScreen: React.FC<StudentPinLockScreenProps> = ({
  user,
  onUnlock,
  onSwitchAccount,
  isTl = true,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleKeypadPress = useCallback(
    (digit: string) => {
      soundFX.playKeyClick();
      setErrorMsg(null);
      setPin((prev) => {
        if (prev.length >= 5) return prev;
        return prev + digit;
      });
    },
    []
  );

  const handleBackspace = useCallback(() => {
    soundFX.playBackspace();
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    soundFX.playBackspace();
    setErrorMsg(null);
    setPin('');
  }, []);

  // Physical keyboard support for laptop / desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeypadPress, handleBackspace, handleClear]);

  // Automatically trigger verification when 5th digit is entered
  useEffect(() => {
    if (pin.length === 5) {
      let isMounted = true;
      const verify = async () => {
        setIsVerifying(true);
        setErrorMsg(null);

        const res = await verifyStudentQuickPin(user.studentNumber, pin);

        if (!isMounted) return;
        setIsVerifying(false);

        if (res.success && res.account) {
          soundFX.playSuccessCheck();
          localStorage.removeItem('student_pin_locked');
          onUnlock(res.account);
        } else {
          soundFX.playError();
          setErrorMsg(res.error || (isTl ? 'Maling 5-digit PIN. Pakisubukang muli.' : 'Incorrect 5-digit PIN. Please try again.'));
          setPin('');
        }
      };

      verify();
      return () => {
        isMounted = false;
      };
    }
  }, [pin, user.studentNumber, onUnlock, isTl]);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Dynamic Background */}
      <CelestialBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm cosmic-glass-card p-6 sm:p-8 rounded-3xl relative z-10 shadow-2xl flex flex-col items-center text-center space-y-5"
      >
        {/* Mascot Shield */}
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-white/5 border border-blue-400/30 flex items-center justify-center shadow-inner">
          <SafezoneMascot />
        </div>

        {/* Header & Student Identity */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isTl ? 'Safezone Quick Unlock' : 'Safezone Quick Unlock'}</span>
          </div>
          <h2 className="text-xl font-black card-title-text mt-1">{user.fullName}</h2>
          <p className="text-xs font-semibold card-subtitle-text">
            ID: {user.studentNumber} • {user.gradeSection || 'Student'}
          </p>
        </div>

        {/* 5-Digit PIN Indicators */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            {isTl ? 'Ilagay ang iyong 5-digit PIN' : 'Enter your 5-digit PIN'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3, 4].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    isFilled
                      ? 'bg-blue-600 dark:bg-cyan-400 scale-110 shadow-md shadow-blue-500/50'
                      : 'bg-slate-300 dark:bg-white/20 border border-slate-400 dark:border-white/30'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Error Feedback */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30"
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3x4 Tactile Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying}
              onClick={() => handleKeypadPress(digit)}
              className="btn-press h-13 py-3 rounded-2xl aics-card-tile text-xl font-black transition-colors disabled:opacity-40"
            >
              {digit}
            </button>
          ))}

          {/* Bottom Row: Clear, 0, Backspace */}
          <button
            type="button"
            disabled={isVerifying || pin.length === 0}
            onClick={handleClear}
            className="btn-press h-13 py-3 rounded-2xl aics-card-tile text-xs font-bold transition-colors disabled:opacity-30"
          >
            {isTl ? 'Bura' : 'Clear'}
          </button>

          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleKeypadPress('0')}
            className="btn-press h-13 py-3 rounded-2xl aics-card-tile text-xl font-black transition-colors disabled:opacity-40"
          >
            0
          </button>

          <button
            type="button"
            disabled={isVerifying || pin.length === 0}
            aria-label="Backspace"
            onClick={handleBackspace}
            className="btn-press h-13 py-3 rounded-2xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/25 dark:hover:bg-rose-500/40 border border-rose-300 dark:border-rose-400/40 text-rose-600 dark:text-rose-200 flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Switch Account / Password Login Fallback */}
        <div className="pt-2 border-t border-slate-200 dark:border-white/10 w-full flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              soundFX.playToggleSwitch(false);
              onSwitchAccount();
            }}
            className="btn-press text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300 flex items-center justify-center gap-1.5 py-2 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isTl ? 'Mag-login gamit ang Password' : 'Log in with Password instead'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playToggleSwitch(false);
              localStorage.removeItem('student_portal_user');
              localStorage.removeItem('student_pin_locked');
              onSwitchAccount();
            }}
            className="btn-press text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center gap-1 py-1 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isTl ? 'Magpalit ng ibang estudyante' : 'Switch student account'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
