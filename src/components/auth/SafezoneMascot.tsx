import React, { useState, useEffect } from 'react';
import { AicsAkbayanDuo } from './AicsAkbayanDuo';

/**
 * Fun & Playful AICS Mascot Storyline Choreography
 * 
 * Stages:
 * 1. 'wave'       : Masiglang kumakaway ("Hi, kumusta! 👋")
 * 2. 'run-right'  : Tatakbo pakanan ("Whooosh! 🏃‍♂️💨")
 * 3. 'run-left'   : Tatakbo pakaliwa ("Zoom zoom! 💨")
 * 4. 'trip'       : Nadapa nang cute ("Aray ko po! 💫🙈")
 * 5. 'getup'      : Tatayo, medyo nahihiya ("Oks lang ako! Hehe ✨")
 * 6. 'happy-idle' : Masayang nagba-bounce sa gitna ("Safe ka dito palagi! 💙")
 */

type MascotStage = 'wave' | 'run-right' | 'run-left' | 'trip' | 'getup' | 'happy-idle';

export const SafezoneMascot: React.FC = () => {
  const [stage, setStage] = useState<MascotStage>('wave');
  const [speechBubble, setSpeechBubble] = useState<string>('Hi, kumusta! 👋');

  useEffect(() => {
    let timer: any;

    const timeline = () => {
      // 1. Wave - Kasama ang Akbayan duo
      setStage('wave');
      setSpeechBubble('Hi, kumusta! 👋');

      timer = setTimeout(() => {
        // 2. Run Right - Whoosh aalis ang duo
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
              setSpeechBubble('Oks lang ako! Hehe ✨');

              timer = setTimeout(() => {
                // 6. Happy Idle Bounce at Center - Babalik ang Akbayan duo sa "Safe ka dito palagi"
                setStage('happy-idle');
                setSpeechBubble('Safe ka dito palagi! 💙');

                timer = setTimeout(() => {
                  timeline(); // Loop choreography
                }, 4500);
              }, 1800);
            }, 1800);
          }, 2000);
        }, 2000);
      }, 3500);
    };

    timeline();
    return () => clearTimeout(timer);
  }, []);

  const showAkbayan = stage === 'wave' || stage === 'happy-idle';

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2 my-1 overflow-visible w-full max-w-sm mx-auto min-h-[220px]">
      <style>{`
        /* Stage-based Root Movements */
        .stage-wave {
          transform: translateX(0px) translateY(0px);
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .stage-run-right {
          transform: translateX(60px) translateY(-4px) rotate(14deg);
          transition: transform 1.8s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .stage-run-left {
          transform: translateX(-60px) translateY(-4px) rotate(-14deg);
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
          100% { transform: translateY(-8px) scale(1.04, 0.96); }
        }

        @keyframes vigorousWave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-50deg); }
          75% { transform: rotate(30deg); }
        }

        @keyframes starSpin {
          0% { transform: rotate(0deg) scale(0.8); }
          50% { transform: rotate(180deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(0.8); }
        }

        @keyframes cloudFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }

        .anim-wave-arm {
          transform-origin: 12px 14px;
          animation: vigorousWave 0.55s ease-in-out infinite;
        }

        .anim-trip-stars {
          animation: starSpin 1.4s linear infinite;
        }

        .cloud-bubble-anim {
          animation: cloudFloat 2s ease-in-out infinite;
        }
      `}</style>

      {/* Choreographed Character Body - THE SPEECH CLOUD MOVES DIRECTLY WITH HIS BODY! */}
      <div className={`relative flex flex-col items-center justify-center stage-${stage} z-20`}>
        
        {/* Floating Comic Cloud Speech Bubble (Sticks directly to mascot's head & follows him anywhere) */}
        <div className="cloud-bubble-anim -mb-1 z-30 flex flex-col items-center pointer-events-none">
          <div className="relative px-3.5 py-1.5 rounded-[18px] bg-white/95 dark:bg-slate-900/95 border-2 border-sky-400/60 shadow-xl shadow-sky-950/20 backdrop-blur-md flex items-center justify-center">
            {/* Cute cloud puffs styling */}
            <span className="text-[11px] font-black tracking-wide text-sky-900 dark:text-sky-200 whitespace-nowrap drop-shadow-xs">
              {speechBubble}
            </span>

            {/* Cloud tail pointing right to his head */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white dark:bg-slate-900 border-r-2 border-b-2 border-sky-400/60 transform rotate-45" />
          </div>
        </div>

        {/* Dizzy stars when tripped (Nadapa) */}
        {stage === 'trip' && (
          <div className="absolute -top-1 z-40 flex items-center gap-2 anim-trip-stars pointer-events-none">
            <span className="text-yellow-400 text-sm">💫</span>
            <span className="text-pink-400 text-xs">✨</span>
            <span className="text-yellow-300 text-sm">⭐</span>
          </div>
        )}

        {/* Mascot Head with Dynamic Eyes depending on stage */}
        <div className="relative z-20 flex items-center justify-center -mb-2 transition-transform duration-300 mt-1">
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

        {/* Mascot Body & Clean Limbs (NO FLOWER) */}
        <div className="relative z-10 w-full flex items-center justify-center">
          {/* Left Arm */}
          <div className="w-3.5 h-8 rounded-full bg-gradient-to-b from-white to-[#D0DAE6] border border-[#CBD5E1] shadow-sm transform -rotate-12 translate-x-1.5 -translate-y-2" />

          {/* Torso Pod */}
          <div className="w-[48px] h-[58px] rounded-[24px] bg-gradient-to-b from-white via-[#F1F5F9] to-[#CAD6E2] border border-[#CBD5E1] shadow-[0_10px_20px_rgba(15,23,42,0.15)] flex flex-col items-center justify-start pt-2 relative">
            <div className="w-2 h-2 rounded-full bg-sky-400/50 shadow-[0_0_8px_rgba(56,189,248,0.7)] animate-pulse" />
          </div>

          {/* Right Waving Arm (Clean without flower, purely waving greeting) */}
          <div className={`relative w-6 h-11 -translate-x-1 -translate-y-2.5 ${stage === 'wave' || stage === 'happy-idle' ? 'anim-wave-arm' : ''}`}>
            <div className="w-3.5 h-9 rounded-full bg-gradient-to-b from-white to-[#D0DAE6] border border-[#CBD5E1] shadow-md transform rotate-12" />
          </div>
        </div>

        {/* Shadow Blob underneath */}
        <div className="w-14 h-2 rounded-full bg-slate-900/35 dark:bg-black/50 blur-[2px] mt-1" />
      </div>

      {/* AICS Student Boy & Girl Akbayan Duo: Lalabas pag sinabing "Hi, kumusta" / "Safe ka dito palagi" then mag-wowowosh pag umalis */}
      <div className="w-full flex justify-center -mt-2">
        <AicsAkbayanDuo isVisible={showAkbayan} />
      </div>
    </div>
  );
};
