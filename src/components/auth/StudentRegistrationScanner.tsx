import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AicsOfficialSvgLogo } from './AicsOfficialSvgLogo';
import { soundFX } from '../../services/soundEngine';

export interface ScanStage {
  id: string;
  label: string;
  durationMs: number;
  detail: string;
}

interface Props {
  isOpen: boolean;
  onComplete: () => void;
  onErrorDecline?: (errorMsg: string) => void;
  forcedError?: string | null;
  studentName?: string;
  studentNumber?: string;
  isTl?: boolean;
}

// Exactly 12 seconds total (within 10-15s specification)
const TOTAL_SCAN_STAGES: ScanStage[] = [
  {
    id: 'integrity',
    label: '1. CHECKING NETWORK CONNECTION & FORM INTEGRITY',
    durationMs: 2000,
    detail: 'Encrypted SHA-256 handshake established with AICS Montalban node...',
  },
  {
    id: 'identity',
    label: '2. SCANNING STUDENT IDENTITY & UPPERCASE SYNTAX',
    durationMs: 2000,
    detail: 'Verifying Last Name, First Name, and Middle Initial syntax guidelines...',
  },
  {
    id: 'contact',
    label: '3. VALIDATING OFFICIAL CONTACT & PHILIPPINE PREFIX',
    durationMs: 2000,
    detail: 'Checking 09XX-XXX-XXXX numeric format and email authenticity...',
  },
  {
    id: 'student_no',
    label: '4. CROSS-REFERENCING INSTITUTIONAL REGISTRY',
    durationMs: 2000,
    detail: 'Querying Montalban Campus Student Master Registry for duplicate entries...',
  },
  {
    id: 'id_docs',
    label: '5. NEURAL OCR & OFFICIAL PHOTO BIOMETRICS',
    durationMs: 2200,
    detail: 'Scanning Student ID & PhilSys photo image streams (JPG, PNG, WEBP)...',
  },
  {
    id: 'commit',
    label: '6. FINALIZING ACCOUNT ENCRYPTION & CLOUD PROVISIONING',
    durationMs: 1800,
    detail: 'Provisioning student account and generating credential keys...',
  },
];

export const StudentRegistrationScanner: React.FC<Props> = ({
  isOpen,
  onComplete,
  onErrorDecline,
  forcedError,
  studentName = 'STUDENT',
  studentNumber = '2025-XXXXX',
  isTl = false,
}) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [scanStatus, setScanStatus] = useState<'scanning' | 'passed' | 'declined'>('scanning');
  const [logLines, setLogLines] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStageIdx(0);
      setElapsedSeconds(0);
      setScanStatus('scanning');
      setLogLines([]);
      return;
    }

    let isMounted = true;
    let pulseInterval: any;

    // 1. Audio Radar Pulse Interval (Soft periodic sonar beep)
    pulseInterval = setInterval(() => {
      if (scanStatus === 'scanning') {
        soundFX.playScanningPulse(1 + (elapsedSeconds % 4) * 0.1);
      }
    }, 1100);

    // 2. Clock ticker (0 to 12 seconds)
    const secondTimer = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= 12) return 12;
        return prev + 1;
      });
    }, 1000);

    // 3. Sequential Stage Progression (~12 seconds total)
    let cumulative = 0;
    TOTAL_SCAN_STAGES.forEach((stage, idx) => {
      cumulative += stage.durationMs;
      setTimeout(() => {
        if (!isMounted) return;

        // If forced error at any point, stop and decline!
        if (forcedError && idx === 3) {
          setScanStatus('declined');
          soundFX.playDeclinedSound();
          if (onErrorDecline) onErrorDecline(forcedError);
          return;
        }

        setCurrentStageIdx(idx + 1);
        soundFX.playScanStepSuccess();
        setLogLines((prev) => [
          ...prev.slice(-3),
          `✓ ${stage.label} [VERIFIED 200 OK]`,
        ]);
      }, cumulative);
    });

    // 4. Final Completion at 12 seconds
    const finalTimeout = setTimeout(() => {
      if (!isMounted) return;
      if (forcedError) {
        setScanStatus('declined');
        soundFX.playDeclinedSound();
        if (onErrorDecline) onErrorDecline(forcedError);
      } else {
        setScanStatus('passed');
        soundFX.playVerifiedFanfare();
        setTimeout(() => {
          if (isMounted) onComplete();
        }, 1100);
      }
    }, 12000);

    return () => {
      isMounted = false;
      clearInterval(pulseInterval);
      clearInterval(secondTimer);
      clearTimeout(finalTimeout);
    };
  }, [isOpen, forcedError]);

  if (!isOpen) return null;

  const currentStage = TOTAL_SCAN_STAGES[Math.min(currentStageIdx, TOTAL_SCAN_STAGES.length - 1)];
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / 12) * 100));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#040C1E]/90 backdrop-blur-xl select-none"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-2xl rounded-3xl overflow-hidden border border-white/20 bg-gradient-to-b from-[#091C44]/95 via-[#061433]/98 to-[#030B1C]/99 shadow-2xl p-6 sm:p-10 text-center space-y-6"
        >
          {/* Futuristic Corner HUD Markers */}
          <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-[#60A5FA]/80 pointer-events-none" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[#60A5FA]/80 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-[#60A5FA]/80 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[#60A5FA]/80 pointer-events-none" />

          {/* Top Live HUD Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span className="font-extrabold tracking-wider uppercase">AICS BIOMETRIC & FORM VALIDATOR</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-[#9BCBFF] font-bold">
              ⏱ {elapsedSeconds}s / 12s
            </div>
          </div>

          {/* Central Animated AICS SVG Logo with Radar Scanning Line */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 mx-auto flex items-center justify-center my-2">
            {/* Pulsing Back Halo */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.4, 0.75, 0.4],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-blue-500/25 blur-xl pointer-events-none"
            />

            {/* Rotating Tech Circuit Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-[#7CB8F7]/50 pointer-events-none"
            />

            {/* Counter-rotating Inner Orbit Ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-4 rounded-full border border-dotted border-white/40 pointer-events-none"
            />

            {/* The SVG Logo */}
            <div className="relative z-10">
              <AicsOfficialSvgLogo size={180} className="w-40 h-40 sm:w-44 sm:h-44 drop-shadow-[0_0_25px_rgba(78,146,223,0.65)]" />
            </div>

            {/* Sci-Fi Vertical Scanning Laser Sweep Line */}
            <motion.div
              animate={{
                top: ['0%', '100%', '0%'],
                opacity: [0.3, 0.95, 0.3],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent shadow-[0_0_15px_#38BDF8] pointer-events-none z-20"
            />
          </div>

          {/* Target Info Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/15 text-xs text-[#CFD9F2] uppercase">
            <span>👤 TARGET:</span>
            <span className="font-extrabold text-white">{studentName}</span>
            <span className="text-white/40">·</span>
            <span className="font-mono text-cyan-300 font-bold">{studentNumber}</span>
          </div>

          {/* Status Message & Subtitle */}
          <div className="space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2 uppercase">
              {scanStatus === 'scanning' && (
                <>
                  <span className="text-cyan-400">⚡</span>
                  <span>{isTl ? 'SINUSURI ANG MGA DATOS NG ESTUDYANTE...' : 'VERIFYING STUDENT INFORMATION...'}</span>
                </>
              )}
              {scanStatus === 'passed' && (
                <span className="text-emerald-400 flex items-center gap-2">
                  <span>✓</span>
                  <span>{isTl ? 'LAHAT NG DATOS AY WASTO AT NAAPRUBAHAN!' : 'ALL INFORMATION VERIFIED & APPROVED!'}</span>
                </span>
              )}
              {scanStatus === 'declined' && (
                <span className="text-rose-400 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{isTl ? 'MAY MALI SA DATOS O KONEKSYON' : 'VERIFICATION DECLINED'}</span>
                </span>
              )}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-[#9BCBFF] min-h-[20px] uppercase">
              {currentStage?.detail || 'Contacting institutional registrar node...'}
            </p>
          </div>

          {/* Progress Bar with Glowing Head */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-white/70 uppercase">
              <span className="truncate pr-2">{currentStage?.label}</span>
              <span className="font-mono text-cyan-300 text-sm">{progressPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-900/80 border border-white/10 overflow-hidden relative p-0.5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#1E469B] via-[#38BDF8] to-emerald-400 relative"
                style={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-white blur-[2px] rounded-full animate-pulse" />
              </motion.div>
            </div>
          </div>

          {/* Terminal Log Console */}
          <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 text-left font-mono text-[11px] sm:text-xs text-emerald-400 space-y-1 h-20 overflow-hidden">
            <div className="text-slate-500 font-bold flex items-center justify-between border-b border-white/10 pb-1 uppercase">
              <span>SYSTEM EVENT LOG</span>
              <span className="text-cyan-400">NODE: AICS-MONTALBAN-01</span>
            </div>
            {logLines.length === 0 ? (
              <div className="text-slate-400 animate-pulse uppercase">Initializing security verification handshake...</div>
            ) : (
              logLines.map((log, i) => (
                <div key={i} className="truncate uppercase">
                  <span className="text-slate-500 mr-2">&gt;</span>
                  {log}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
