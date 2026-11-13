import React, { useState, useEffect } from 'react';

/**
 * 3D EVE-Style AICS SafeZone Mascot (Based directly on user reference photo)
 * 
 * Choreography:
 * 1. 'wave'       : Masiglang babati ("Hi, welcome! 👋")
 * 2. 'run-right'  : Tatakbo pakanan ("Whooosh! 🏃‍♂️💨")
 * 3. 'run-left'   : Tatakbo pakaliwa ("Zoom zoom! 💨")
 * 4. 'trip'       : Nadapa nang cute ("Aray ko po! 💫🙈")
 * 5. 'getup'      : Tatayo, medyo nahihiya ("Oks lang ako! Hehe ✨")
 * 6. 'safe-final' : PERMANENTE NANG HUMINTO DITO ("Safe ka dito palagi! 💙")
 *                   - Hindi na uulitin ang takbo at dapa (NO LOOPING ng movements)
 *                   - Ang tanging natitirang movement:
 *                     1. Natural na nagbi-blink ang cute smiling cyan eyes
 *                     2. Dahan-dahang kumakaway/nagwa-wave ang kamay na nangangamusta
 *                     3. Banayad na 3D hover floating physics
 */

type MascotStage = 'wave' | 'run-right' | 'run-left' | 'trip' | 'getup' | 'safe-final';

export const SafezoneMascot: React.FC = () => {
  const [stage, setStage] = useState<MascotStage>('wave');
  const [speechBubble, setSpeechBubble] = useState<string>('Hi, welcome! 👋');

  useEffect(() => {
    let timer: any;

    // 1. Masiglang wave greeting
    setStage('wave');
    setSpeechBubble('Hi, welcome! 👋');

    timer = setTimeout(() => {
      // 2. Tatakbo pakanan
      setStage('run-right');
      setSpeechBubble('Whooosh! 🏃‍♂️💨');

      timer = setTimeout(() => {
        // 3. Tatakbo pakaliwa
        setStage('run-left');
        setSpeechBubble('Zoom zoom! 💨');

        timer = setTimeout(() => {
          // 4. Nadapa
          setStage('trip');
          setSpeechBubble('Aray ko po! 💫🙈');

          timer = setTimeout(() => {
            // 5. Tatayo
            setStage('getup');
            setSpeechBubble('Oks lang ako! Hehe ✨');

            timer = setTimeout(() => {
              // 6. FINAL SAFE STATE: Mahihinto na rito nang permanente!
              // Hindi na uulitin ang buong routine (No loop).
              setStage('safe-final');
              setSpeechBubble('Safe ka dito palagi! 💙');
            }, 1800);
          }, 1800);
        }, 2000);
      }, 2000);
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const isFinal = stage === 'safe-final';

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2 my-1 overflow-visible w-full max-w-sm mx-auto h-[178px]">
      <style>{`
        /* Stage-based Root Movements during intro routine */
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

        .stage-safe-final {
          transform: translateX(0px) translateY(0px) rotate(0deg);
          transition: transform 0.8s cubic-bezier(0.34, 1.2, 0.64, 1);
        }

        /* 3D Smooth Hover Floating */
        @keyframes gentleFloat3D {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        .mascot-3d-float {
          animation: gentleFloat3D 3s ease-in-out infinite;
        }

        /* Ambient ground shadow */
        @keyframes shadowPulse3D {
          0%, 100% {
            transform: scale(1);
            opacity: 0.35;
          }
          50% {
            transform: scale(0.9);
            opacity: 0.22;
          }
        }

        .mascot-3d-shadow {
          animation: shadowPulse3D 3s ease-in-out infinite;
        }

        /* 3D Pearl Gloss Shader (Reference Image Match) */
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

        /* 3D Visor Screen */
        .mascot-visor-glass {
          background: radial-gradient(ellipse at 50% 25%, #0F172A 0%, #030712 100%);
          box-shadow: 
            inset 0 3px 8px rgba(0, 0, 0, 0.9),
            0 2px 4px rgba(255, 255, 255, 0.6);
        }

        /* Wave Arm Motion: Friendly greeting / Nangangamusta */
        @keyframes friendlyWaveHand {
          0%, 100% {
            transform: rotate(15deg) translateY(0px);
          }
          50% {
            transform: rotate(-25deg) translateY(-3px);
          }
        }

        .anim-friendly-wave {
          transform-origin: 4px 8px;
          animation: friendlyWaveHand 1.4s ease-in-out infinite;
        }

        /* Eye Blinking Animation: Normal blinking sa cyan curved eyes */
        @keyframes gentleEyeBlink {
          0%, 90%, 100% {
            transform: scaleY(1);
            opacity: 1;
          }
          95% {
            transform: scaleY(0.1);
            opacity: 0.3;
          }
        }

        .anim-eye-blink {
          transform-origin: center;
          animation: gentleEyeBlink 3.8s ease-in-out infinite;
        }

        /* Dizzy stars spin */
        @keyframes starSpin {
          0% { transform: rotate(0deg) scale(0.8); }
          50% { transform: rotate(180deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(0.8); }
        }

        .anim-trip-stars {
          animation: starSpin 1.4s linear infinite;
        }

        /* Floating comic cloud */
        @keyframes cloudFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }

        .cloud-bubble-anim {
          animation: cloudFloat 2.4s ease-in-out infinite;
        }
      `}</style>

      {/* 3D Character Composition & Dynamic Movement Stage */}
      <div className={`relative flex flex-col items-center justify-center stage-${stage} z-20`}>
        
        {/* Floating Comic Cloud Speech Bubble (Sticks right above 3D mascot's head) */}
        <div className="cloud-bubble-anim -mb-1 z-30 flex flex-col items-center pointer-events-none">
          <div className="relative px-4 py-1.5 rounded-[20px] bg-white/95 dark:bg-slate-900/95 border-2 border-sky-400/60 shadow-xl shadow-sky-950/20 backdrop-blur-md flex items-center justify-center transition-all duration-500">
            <span className="text-[11px] font-black tracking-wide text-sky-950 dark:text-sky-100 whitespace-nowrap drop-shadow-xs">
              {speechBubble}
            </span>

            {/* Cloud tail pointing directly to the 3D head */}
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

        {/* Floating 3D Body Container */}
        <div className={isFinal ? 'mascot-3d-float flex flex-col items-center' : 'flex flex-col items-center'}>
          {/* 3D EGG-SHAPED PEARL HEAD */}
          <div className="relative z-20 w-[94px] h-[78px] rounded-[48px] mascot-shell-head flex items-center justify-center p-2.5 -mb-2 transition-transform duration-500">
            {/* Specular Highlight glare on top-left of head */}
            <div className="absolute top-2 left-4 w-7 h-3.5 bg-white/80 rounded-full blur-[1px] transform -rotate-25 pointer-events-none" />

            {/* 3D VISOR (Deep Obsidian with Gloss Edge) */}
            <div className="relative w-[64px] h-[44px] rounded-[24px] mascot-visor-glass flex items-center justify-center gap-2.5 overflow-hidden">
              {/* Visor Glare Crescent */}
              <div className="absolute -top-3 -left-2 w-14 h-7 bg-white/20 blur-[2px] rounded-full transform -rotate-12 pointer-events-none" />

              {/* DYNAMIC VISOR EYES:
                  - During intro: Nagpapakita ng iba't ibang expressions (kaway, takbo, dapa, tayo)
                  - Sa safe-final: CYAN SMILING EYES NA NAGBI-BLINK NALANG!
              */}
              {(stage === 'wave' || isFinal) && (
                <div className={`flex items-center gap-3 ${isFinal ? 'anim-eye-blink' : ''}`}>
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
                </div>
              )}

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

              {stage === 'trip' && (
                <div className="flex items-center gap-2">
                  <span className="text-sky-300 font-black text-xs">&gt;</span>
                  <span className="text-sky-300 font-black text-xs">&lt;</span>
                </div>
              )}

              {stage === 'getup' && (
                <div className="flex items-center gap-2">
                  <span className="text-sky-400 font-bold text-xs">^</span>
                  <span className="text-sky-400 font-bold text-xs">~</span>
                </div>
              )}

              {/* Cute Pink Cheeks Glow */}
              <div className="absolute bottom-1 left-2.5 w-2 h-1 rounded-full bg-pink-500/50 blur-[1px]" />
              <div className="absolute bottom-1 right-2.5 w-2 h-1 rounded-full bg-pink-500/50 blur-[1px]" />
            </div>
          </div>

          {/* 3D SLEEK FLOATING TORSO POD */}
          <div className="relative z-10 flex items-center justify-center">
            {/* Left Sleek Wing / Fin */}
            <div className="w-3 h-9 rounded-full mascot-shell-body transform -rotate-18 translate-x-1.5 -translate-y-2 opacity-95" />

            {/* Main Floating Capsule Body */}
            <div className="w-[52px] h-[64px] rounded-b-[32px] rounded-t-[14px] mascot-shell-body flex flex-col items-center justify-start pt-2.5 relative">
              {/* Center Gentle Glow Dot */}
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400/60 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
              
              {/* Body inner accent arc */}
              <div className="w-7 h-5 mt-2 rounded-full border-b-2 border-slate-300/60" />
            </div>

            {/* Right Sleek Wing / Fin: Kumakaway/Nangangamusta hand */}
            <div
              className={`w-3.5 h-10 rounded-full mascot-shell-body opacity-95 -translate-x-1.5 -translate-y-2.5 transition-all duration-300 ${
                stage === 'wave' || isFinal ? 'anim-friendly-wave' : 'transform rotate-18'
              }`}
            />
          </div>

          {/* 3D Soft Ambient Ground Shadow */}
          <div className="w-16 h-2.5 rounded-full bg-slate-900/40 dark:bg-black/60 blur-[3px] mt-1 mascot-3d-shadow" />
        </div>
      </div>
    </div>
  );
};