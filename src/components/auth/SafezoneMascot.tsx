import React, { useState, useEffect } from 'react';

/**
 * Fun & Playful AICS Mascot Storyline Choreography
 * 
 * Stages:
 * 1. 'wave'   (0s - 3s)   : Nagwe-wave masigla ("Hi! Welcome CdMian/AICS!"), smiling eyes (^_^)
 * 2. 'run-r'  (3s - 5s)   : Masiglang tatakbo pakanan, dashing determined eyes (>> >>)
 * 3. 'run-l'  (5s - 7s)   : Tatakbo pakaliwa, playful wide eyes (O_O)
 * 4. 'trip'   (7s - 8.5s) : Nadapa nang cute! Dizzy swirl / closed eyes (>_<) na may tiny stars (💫)
 * 5. 'getup'  (8.5s - 10s): Tatayo, magkakamot ng ulo / nahihiya na may cute blush (^-^;)
 * 6. 'center' (10s - 14s) : Babalik sa gitna, masayang nagba-bounce at nag-aantay habang nagba-bop (Dancing ^_^)
 * Cycle restarts continuously!
 */

type MascotStage = 'wave' | 'run-right' | 'run-left' | 'trip' | 'getup' | 'happy-idle';

export const SafezoneMascot: React.FC = () => {
  const [stage, setStage] = useState<MascotStage>('wave');
  const [speechBubble, setSpeechBubble] = useState<string>('Hi! Welcome! 👋');

  useEffect(() => {
    let timer: any;

    const timeline = () => {
      // 1. Wave
      setStage('wave');
      setSpeechBubble('Hi! Kaya mo yan! 💙');

      timer = setTimeout(() => {
        // 2. Run Right
        setStage('run-right');
        setSpeechBubble('Whooosh! 🏃‍♂️💨');

        timer = setTimeout(() => {
          // 3. Run Left
          setStage('run-left');
          setSpeechBubble('Zoom zoom! 💨');

          timer = setTimeout(() => {
            // 4. Trip / Nadapa
            setStage('trip');
            setSpeechBubble('Aray ko po! 💫🙈');

            timer = setTimeout(() => {
              // 5. Get up & shake off
              setStage('getup');
              setSpeechBubble('Oks lang ako! Hehe 🌸');

              timer = setTimeout(() => {
                // 6. Happy Idle Bounce at Center
                setStage('happy-idle');
                setSpeechBubble('Safe ka dito palagi! ✨');

                timer = setTimeout(() => {
                  timeline(); // Loop choreography
                }, 4000);
              }, 1800);
            }, 1800);
          }, 2000);
        }, 2000);
      }, 3000);
    };

    timeline();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2 my-1 overflow-hidden w-full max-w-sm mx-auto h-[165px]">
      <style>{`
        /* Stage-based Root Movements */
        .stage-wave {
          transform: translateX(0px) translateY(0px);
          transition: transform 0.6s ease;
        }

        .stage-run-right {
          transform: translateX(65px) translateY(-4px) rotate(14deg);
          transition: transform 1.8s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .stage-run-left {
          transform: translateX(-65px) translateY(-4px) rotate(-14deg);
          transition: transform 1.8s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .stage-trip {
          transform: translateX(0px) translateY(18px) rotate(-35deg);
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .stage-getup {
          transform: translateX(0px) translateY(2px) rotate(4deg);
          transition: transform 0.8s ease;
        }

        .stage-happy-idle {
          transform: translateX(0px) translateY(0px);
          transition: transform 0.6s ease;
          animation: playfulBounce 1.2s ease-in-out infinite alternate;
        }

        @keyframes playfulBounce {
          0% { transform: translateY(0px) scale(1, 1); }
          100% { transform: translateY(-10px) scale(1.04, 0.96); }
        }

        @keyframes vigorousWave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-45deg); }
          75% { transform: rotate(25deg); }
        }

        @keyframes starSpin {
          0% { transform: rotate(0deg) scale(0.8); }
          50% { transform: rotate(180deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(0.8); }
        }

        .anim-wave-arm {
          transform-origin: 12px 14px;
          animation: vigorousWave 0.6s ease-in-out infinite;
        }

        .anim-trip-stars {
          animation: starSpin 1.4s linear infinite;
        }
      `}</style>

      {/* Floating Animated Speech Bubble */}
      <div className="z-30 mb-1 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-blue-400/40 shadow-lg flex items-center justify-center gap-1.5 transform transition-all duration-300">
        <span className="text-[11px] font-extrabold text-[#1E469B] dark:text-[#7CB8F7] whitespace-nowrap">
          {speechBubble}
        </span>
      </div>

      {/* Choreographed Character Body */}
      <div className={`relative flex flex-col items-center justify-center stage-${stage}`}>
        {/* Dizzy stars when tripped (Nadapa) */}
        {stage === 'trip' && (
          <div className="absolute -top-3 z-40 flex items-center gap-2 anim-trip-stars pointer-events-none">
            <span className="text-yellow-400 text-sm">💫</span>
            <span className="text-pink-400 text-xs">✨</span>
            <span className="text-yellow-300 text-sm">⭐</span>
          </div>
        )}

        {/* Mascot Head with Dynamic Eyes depending on stage */}
        <div className="relative z-20 flex items-center justify-center -mb-2 transition-transform duration-300">
          <div className="w-[80px] h-[68px] rounded-[38px] bg-gradient-to-b from-white via-[#F8FAFC] to-[#DDE5EE] border border-[#CBD5E1] shadow-[0_8px_16px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)] flex items-center justify-center p-2 relative">
            {/* Visor Screen */}
            <div className="w-[56px] h-[36px] rounded-[20px] bg-gradient-to-b from-[#0A1124] via-[#050B1A] to-[#02050E] border border-[#1E293B] shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2 relative overflow-hidden">
              <div className="absolute -top-3 -left-2 w-12 h-6 bg-sky-400/25 blur-[3px] rounded-full transform -rotate-12 pointer-events-none" />

              {/* DYNAMIC EYE EXPRESSIONS */}
              {/* 1. Smiling Eyes (^_^) during Wave and Happy-Idle */}
              {(stage === 'wave' || stage === 'happy-idle') && (
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-3 overflow-visible" viewBox="0 0 20 14" fill="none">
                    <path d="M 2 12 Q 10 1 18 12" stroke="#38BDF8" strokeWidth="3.8" strokeLinecap="round" />
                  </svg>
                  <svg className="w-4 h-3 overflow-visible" viewBox="0 0 20 14" fill="none">
                    <path d="M 2 12 Q 10 1 18 12" stroke="#38BDF8" strokeWidth="3.8" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {/* 2. Dashing / Running Eyes (>> >> or << <<) */}
              {stage === 'run-right' && (
                <div className="flex items-center gap-1.5 translate-x-1">
                  <span className="text-sky-400 font-black text-xs">▶</span>
                  <span className="text-sky-400 font-black text-xs">▶</span>
                </div>
              )}

              {stage === 'run-left' && (
                <div className="flex items-center gap-1.5 -translate-x-1">
                  <span className="text-sky-400 font-black text-xs">◀</span>
                  <span className="text-sky-400 font-black text-xs">◀</span>
                </div>
              )}

              {/* 3. Nadapa / Tripped Pain Eyes (> <) */}
              {stage === 'trip' && (
                <div className="flex items-center gap-2">
                  <span className="text-sky-300 font-black text-xs">&gt;</span>
                  <span className="text-sky-300 font-black text-xs">&lt;</span>
                </div>
              )}

              {/* 4. Shy / Getting Up Eyes (^-^;) */}
              {stage === 'getup' && (
                <div className="flex items-center gap-2">
                  <span className="text-sky-400 font-bold text-xs">^</span>
                  <span className="text-sky-400 font-bold text-xs">~</span>
                </div>
              )}

              {/* Cheerful pink blush spots */}
              <div className="absolute bottom-1 left-2 w-2 h-1 rounded-full bg-pink-500/60 blur-[0.5px]" />
              <div className="absolute bottom-1 right-2 w-2 h-1 rounded-full bg-pink-500/60 blur-[0.5px]" />
            </div>
          </div>
        </div>

        {/* Mascot Body & Limbs */}
        <div className="relative z-10 w-full flex items-center justify-center">
          {/* Left Arm */}
          <div className="w-3.5 h-8 rounded-full bg-gradient-to-b from-white to-[#D0DAE6] border border-[#CBD5E1] shadow-sm transform -rotate-12 translate-x-1.5 -translate-y-2" />

          {/* Torso Pod */}
          <div className="w-[48px] h-[58px] rounded-[24px] bg-gradient-to-b from-white via-[#F1F5F9] to-[#CAD6E2] border border-[#CBD5E1] shadow-[0_10px_20px_rgba(15,23,42,0.15)] flex flex-col items-center justify-start pt-2 relative">
            <div className="w-2 h-2 rounded-full bg-sky-400/50 shadow-[0_0_8px_rgba(56,189,248,0.7)] animate-pulse" />
          </div>

          {/* Right Arm (Waves during 'wave' & 'happy-idle', points when running) */}
          <div className={`relative w-8 h-11 -translate-x-1 -translate-y-2.5 ${stage === 'wave' || stage === 'happy-idle' ? 'anim-wave-arm' : ''}`}>
            <div className="w-3.5 h-9 rounded-full bg-gradient-to-b from-white to-[#D0DAE6] border border-[#CBD5E1] shadow-md transform rotate-12" />

            {/* Blossom flower in hand */}
            <div className="absolute -top-3 -right-2 flex flex-col items-center transform -rotate-12 pointer-events-none">
              <span className="text-sm select-none animate-bounce">🌸</span>
            </div>
          </div>
        </div>

        {/* Shadow Blob underneath */}
        <div className="w-14 h-2 rounded-full bg-slate-900/35 dark:bg-black/50 blur-[2px] mt-1" />
      </div>
    </div>
  );
};
