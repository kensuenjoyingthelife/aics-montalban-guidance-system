import React, { useEffect, useState, useRef } from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import { recordSecurityAudit } from '../../services/securityEngine';

interface InactivityShieldProps {
  timeoutMinutes?: number;
  onTimeout: () => void;
  children: React.ReactNode;
}

export const InactivityShield: React.FC<InactivityShieldProps> = ({
  timeoutMinutes = 15,
  onTimeout,
  children,
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef<any>(null);
  const checkTimerRef = useRef<any>(null);

  const resetActivity = () => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setSecondsLeft(60);
    }
  };

  useEffect(() => {
    // Listen to user interactions
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleUserInteraction = () => resetActivity();

    events.forEach((evt) => window.addEventListener(evt, handleUserInteraction, { passive: true }));

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = timeoutMs - 60 * 1000; // 1 minute warning before logout

    checkTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= timeoutMs) {
        // Time is up -> Log out
        recordSecurityAudit('AUTO_LOGOUT');
        setShowWarning(false);
        onTimeout();
      } else if (elapsed >= warningMs && !showWarning) {
        setShowWarning(true);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserInteraction));
      clearInterval(checkTimerRef.current);
      clearInterval(warningTimerRef.current);
    };
  }, [timeoutMinutes, onTimeout, showWarning]);

  // Warning countdown ticker
  useEffect(() => {
    if (!showWarning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showWarning]);

  return (
    <>
      {children}

      {/* Inactivity Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-amber-500/60 p-6 shadow-2xl text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-black text-white mb-1">
              Inactivity Security Notice
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Dahil sa data privacy ng iyong guidance report, mag-o-auto logout ang portal sa loob ng:
            </p>
            <div className="text-3xl font-mono font-black text-amber-400 mb-5 tracking-widest px-4 py-2 rounded-xl bg-black/50 border border-amber-500/30">
              00:{secondsLeft < 10 ? '0' : ''}{secondsLeft}
            </div>
            <div className="flex gap-2.5 w-full">
              <button
                type="button"
                onClick={() => {
                  recordSecurityAudit('AUTO_LOGOUT');
                  onTimeout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out Now</span>
              </button>
              <button
                type="button"
                onClick={resetActivity}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-950/50 transition-all"
              >
                I'm Still Here ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
