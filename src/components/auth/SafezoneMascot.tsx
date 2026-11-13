import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ULTRA-SMOOTH 3D EVE-STYLE AICS SAFEZONE MASCOT
 * 
 * Continuous Seamless Story Loop (Without cutscenes, using Framer Motion spring physics):
 * 1. 'wave-start' : Masiglang bati & kumakaway nang masaya
 * 2. 'run-right'  : Dashing smoothly pakanan ("Whooosh! 🏃‍♂️💨")
 * 3. 'run-left'   : Dashing smoothly pakaliwa ("Zoom zoom! 💨")
 * 4. 'trip'       : Cute na madidiskaril at dadapa sa sahig na may dizzy stars ("Aray ko po! 💫🙈")
 * 5. 'getup'      : Banayad na tatayo at magtatagtag ng alikabok ("Oks lang ako! Hehe ✨")
 * 6. 'safe-center': Babalik sa gitna, lilutang na may kumakaway na kamay at nagbi-blink na cyan eyes ("Safe ka dito palagi! 💙")
 *                   -> Tuloy-tuloy na maglo-loop muli nang napakaswabe!
 */

type MascotStage = 'wave-start' | 'run-right' | 'run-left' | 'trip' | 'getup' | 'safe-center';

export const SafezoneMascot: React.FC = () => {
  const [stage, setStage] = useState<MascotStage>('wave-start');

  useEffect(() => {
    let timer: any;

    const runSmoothStory = () => {
      // 1. Initial greeting wave
      setStage('wave-start');

      timer = setTimeout(() => {
        // 2. Whooosh right
        setStage('run-right');

        timer = setTimeout(() => {
          // 3. Zoom zoom left
          setStage('run-left');

          timer = setTimeout(() => {
            // 4. Trip cute dapa
            setStage('trip');

            timer = setTimeout(() => {
              // 5. Get up
              setStage('getup');

              timer = setTimeout(() => {
                // 6. Safe Center floating
                setStage('safe-center');

                timer = setTimeout(() => {
                  runSmoothStory(); // Smooth continuous loop
                }, 3800);
              }, 1800);
            }, 1800);
          }, 2200);
        }, 2200);
      }, 2400);
    };

    runSmoothStory();
    return () => clearTimeout(timer);
  }, []);

  // Framer Motion continuous state configurations for zero-cut, buttery transitions
  const stageMotionProps = {
    'wave-start': {
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 120, damping: 14 },
    },
    'run-right': {
      x: 68,
      y: -6,
      rotate: 15,
      scale: 1,
      transition: { duration: 1.8, ease: [0.25, 1, 0.5, 1] },
    },
    'run-left': {
      x: -68,
      y: -6,
      rotate: -15,
      scale: 1,
      transition: { duration: 1.8, ease: [0.25, 1, 0.5, 1] },
    },
    'trip': {
      x: 0,
      y: 22,
      rotate: -38,
      scale: 0.96,
      transition: { type: 'spring', stiffness: 260, damping: 16 },
    },
    'getup': {
      x: 0,
      y: 4,
      rotate: 4,
      scale: 0.98,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
    'safe-center': {
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2 my-1 overflow-visible w-full max-w-sm mx-auto h-[170px]">
      <style>{`
        /* 3D Pearl Gloss Shaders based on user reference */
        .mascot-shell-head {
          background: radial-gradient(circle at 35% 25%, #FFFFFF 0%, #F8FAFC 35%, #E2E8F0 75%, #CBD5E1 100%);
          box-shadow: 
            inset -4px -4px 10px rgba(148, 163, 184, 0.45),
            inset 4px 4px 12px rgba(255, 255, 255, 1),
            0 14px 28px -6px rgba(15, 23, 42, 0.25);
        }

        .mascot-shell-body {
          background: radial-gradient(ellipse at 40% 20%, #FFFFFF 0%, #F1F5F9 40%, #E2E8F0 80%, #CBD5E1 100%);
          box-shadow: 
            inset -4px -4px 8px rgba(148, 163, 184, 0.4),
            inset 3px 3px 10px rgba(255, 255, 255, 0.95),
            0 12px 24px -4px rgba(15, 23, 42, 0.2);
        }

        .mascot-visor-glass {
          background: radial-gradient(ellipse at 50% 25%, #0F172A 0%, #030712 100%);
          box-shadow: 
            inset 0 3px 8px rgba(0, 0, 0, 0.9),
            0 2px 4px rgba(255, 255, 255, 0.6);
        }

        /* 3D Gentle Hover Float */
        @keyframes gentleHover3D {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }

        .mascot-3d-hover {
          animation: gentleHover3D 3.2s ease-in-out infinite;
        }

        /* Continuous Smooth Wave Hand */
        @keyframes continuousSmoothWave {
          0%, 100% { transform: rotate(18deg) translateY(0px); }
          50% { transform: rotate(-32deg) translateY(-4px); }
        }

        .anim-smooth-waving {
          transform-origin: 4px 8px;
          animation: continuousSmoothWave 1.2s ease-in-out infinite;
        }

        /* Eye Blinking */
        @keyframes gentleEyeBlink {
          0%, 90%, 100% { transform: scaleY(1); opacity: 1; }
          95% { transform: scaleY(0.12); opacity: 0.3; }
        }

        .anim-eye-blink {
          transform-origin: center;
          animation: gentleEyeBlink 3.6s ease-in-out infinite;
        }

        /* Dizzy Stars Rotation */
        @keyframes dizzyStarsSpin {
          0% { transform: rotate(0deg) scale(0.85); }
          50% { transform: rotate(180deg) scale(1.15); }
          100% { transform: rotate(360deg) scale(0.85); }
        }

        .anim-dizzy-stars {
          animation: dizzyStarsSpin 1.4s linear infinite;
        }
      `}</style>

      {/* Main Smooth Framer Motion Character Rigid Root */}
      <motion.div
        animate={stageMotionProps[stage]}
        className="relative flex flex-col items-center justify-center z-20"
      >
        {/* Dizzy stars when tripped (Nadapa) */}
        <AnimatePresence>
          {stage === 'trip' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -10 }}
              transition={{ duration: 0.3 }}
              className="absolute -top-4 z-40 flex items-center gap-2 anim-dizzy-stars pointer-events-none"
            >
              <span className="text-yellow-400 text-sm">💫</span>
              <span className="text-pink-400 text-xs">✨</span>
              <span className="text-yellow-300 text-sm">⭐</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3D Model Body Container */}
        <div className={`flex flex-col items-center ${stage === 'safe-center' || stage === 'wave-start' ? 'mascot-3d-hover' : ''}`}>
          
          {/* 3D EGG-SHAPED PEARL HEAD */}
          <div className="relative z-20 w-[94px] h-[78px] rounded-[48px] mascot-shell-head flex items-center justify-center p-2.5 -mb-2 transition-transform duration-500">
            {/* Specular Highlight glare on top-left of head */}
            <div className="absolute top-2 left-4 w-7 h-3.5 bg-white/80 rounded-full blur-[1px] transform -rotate-25 pointer-events-none" />

            {/* 3D VISOR (Deep Obsidian with Gloss Edge) */}
            <div className="relative w-[64px] h-[44px] rounded-[24px] mascot-visor-glass flex items-center justify-center gap-2.5 overflow-hidden">
              {/* Visor Glare Crescent */}
              <div className="absolute -top-3 -left-2 w-14 h-7 bg-white/20 blur-[2px] rounded-full transform -rotate-12 pointer-events-none" />

              {/* Dynamic Eyes per stage */}
              <AnimatePresence mode="wait">
                {(stage === 'wave-start' || stage === 'safe-center') && (
                  <motion.div
                    key="smiling-eyes"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 anim-eye-blink"
                  >
                    <svg className="w-4 h-3.5 overflow-visible" viewBox="0 0 20 14" fill="none">
                      <path
                        d="M 2 12 Q 10 1 18 12"
                        stroke="#38BDF8"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_6px_rgba(56,189,248,0.9)]"
                      />
                    </svg>
                    <svg className="w-4 h-3.5 overflow-visible" viewBox="0 0 20 14" fill="none">
                      <path
                        d="M 2 12 Q 10 1 18 12"
                        stroke="#38BDF8"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_6px_rgba(56,189,248,0.9)]"
                      />
                    </svg>
                  </motion.div>
                )}

                {stage === 'run-right' && (
                  <motion.div
                    key="run-right-eyes"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5 translate-x-1"
                  >
                    <span className="text-sky-400 font-black text-xs">▶</span>
                    <span className="text-sky-400 font-black text-xs">▶</span>
                  </motion.div>
                )}

                {stage === 'run-left' && (
                  <motion.div
                    key="run-left-eyes"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5 -translate-x-1"
                  >
                    <span className="text-sky-400 font-black text-xs">◀</span>
                    <span className="text-sky-400 font-black text-xs">◀</span>
                  </motion.div>
                )}

                {stage === 'trip' && (
                  <motion.div
                    key="trip-eyes"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-sky-300 font-black text-xs">&gt;</span>
                    <span className="text-sky-300 font-black text-xs">&lt;</span>
                  </motion.div>
                )}

                {stage === 'getup' && (
                  <motion.div
                    key="getup-eyes"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-sky-400 font-bold text-xs">^</span>
                    <span className="text-sky-400 font-bold text-xs">~</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cheerful Pink Cheeks Glow */}
              <div className="absolute bottom-1 left-2.5 w-2 h-1 rounded-full bg-pink-500/50 blur-[1px]" />
              <div className="absolute bottom-1 right-2.5 w-2 h-1 rounded-full bg-pink-500/50 blur-[1px]" />
            </div>
          </div>

          {/* 3D SLEEK FLOATING TORSO POD & SMOOTH ARMS */}
          <div className="relative z-10 flex items-center justify-center">
            {/* Left Sleek Wing / Fin */}
            <motion.div
              animate={{
                rotate: stage === 'trip' ? -42 : -18,
                y: stage === 'trip' ? 4 : -8,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-3.5 h-10 rounded-full mascot-shell-body opacity-95 translate-x-1.5"
            />

            {/* Main Floating Capsule Body */}
            <div className="w-[52px] h-[64px] rounded-b-[32px] rounded-t-[14px] mascot-shell-body flex flex-col items-center justify-start pt-2.5 relative">
              {/* Center Gentle Glow Dot */}
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400/60 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
              
              {/* Body inner accent arc */}
              <div className="w-7 h-5 mt-2 rounded-full border-b-2 border-slate-300/60" />
            </div>

            {/* Right Arm: Waving during greeting / safe, streamlined while running */}
            <motion.div
              className={`w-3.5 h-10 rounded-full mascot-shell-body opacity-95 -translate-x-1.5 -translate-y-2.5 ${
                stage === 'wave-start' || stage === 'safe-center' ? 'anim-smooth-waving' : ''
              }`}
              animate={{
                rotate: stage === 'run-right' ? 24 : stage === 'run-left' ? -10 : stage === 'trip' ? 50 : 16,
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          {/* 3D Soft Ambient Ground Shadow that stretches and tracks position */}
          <motion.div
            animate={{
              scaleX: stage === 'trip' ? 1.4 : stage === 'run-right' || stage === 'run-left' ? 1.15 : 1,
              opacity: stage === 'trip' ? 0.45 : 0.28,
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-16 h-2.5 rounded-full bg-slate-900/40 dark:bg-black/60 blur-[3px] mt-1"
          />
        </div>
      </motion.div>
    </div>
  );
};
