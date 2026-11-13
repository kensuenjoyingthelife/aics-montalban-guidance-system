import React, { useState, useEffect } from 'react';

/**
 * 3D EVE-Style AICS SafeZone Mascot Storyline:
 * 
 * Flow:
 * 1. 'mag-hi'        : "hi kumusta 👋" (masiglang bati)
 * 2. 'raise-hands'   : "welcome sa AICS SAFE ROOM 🎉✨" (itaas ang dalawang kamay na masaya)
 * 3. 'tara-laro'     : "tara laro tayo! 🎮🎈" (mag-hi ulit, i-wave ang kamay na totoong gumagalaw)
 * 4. 'run-right'     : "Whooosh! 🏃‍♂️💨" (tatakbo pakanan)
 * 5. 'run-left'      : "Zoom zoom! 💨" (tatakbo pakaliwa)
 * 6. 'trip'          : "Aray ko po! 💫🙈" (cute na nadapa na may umiikot na stars sa ulo)
 * 7. 'getup'         : "Oks lang ako! Hehe ✨" (tatayo, medyo nahihiya)
 * 8. 'safe-final'    : "Safe ka dito palagi! 💙" (Babalik sa center, permanente nang mag-i-stay dito na may nagbi-blink na mata at nagwa-wave na kamay)
 */

type MascotStage = 
  | 'mag-hi'
  | 'raise-hands'
  | 'tara-laro'
  | 'run-right'
  | 'run-left'
  | 'trip'
  | 'getup'
  | 'safe-final';

export const SafezoneMascot: React.FC = () => {
  const [stage, setStage] = useState<MascotStage>('mag-hi');
  const [speechBubble, setSpeechBubble] = useState<string>('hi kumusta 👋');

  useEffect(() => {
    let timer: any;

    // 1. MAG HI: "hi kumusta 👋"
    setStage('mag-hi');
    setSpeechBubble('hi kumusta 👋');

    timer = setTimeout(() => {
      // 2. Itaas ang dalawang kamay na masaya: "welcome sa AICS SAFE ROOM"
      setStage('raise-hands');
      setSpeechBubble('welcome sa AICS SAFE ROOM 🎉✨');

      timer = setTimeout(() => {
        // 3. Mag hi ulet iwave ang kamay na totoong gumagalaw: "tara laro tayo"
        setStage('tara-laro');
        setSpeechBubble('tara laro tayo! 🎮🎈');

        timer = setTimeout(() => {
          // 4. Tatakbo Pakanan: "Whooosh! 🏃‍♂️💨"
          setStage('run-right');
          setSpeechBubble('Whooosh! 🏃‍♂️💨');

          timer = setTimeout(() => {
            // 5. Tatakbo Pakaliwa: "Zoom zoom! 💨"
            setStage('run-left');
            setSpeechBubble('Zoom zoom! 💨');

            timer = setTimeout(() => {
              // 6. Madadapa: "Aray ko po! 💫🙈"
              setStage('trip');
              setSpeechBubble('Aray ko po! 💫🙈');

              timer = setTimeout(() => {
                // 7. Tatayo: "Oks lang ako! Hehe ✨"
                setStage('getup');
                setSpeechBubble('Oks lang ako! Hehe ✨');

                timer = setTimeout(() => {
                  // 8. Babalik sa Center: "Safe ka dito palagi! 💙" (PERMANENTE DITO, NO MORE LOOPING)
                  setStage('safe-final');
                  setSpeechBubble('Safe ka dito palagi! 💙');
                }, 2000);
              }, 2000);
            }, 2200);
          }, 2200);
        }, 2800);
      }, 3000);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const isFinal = stage === 'safe-final';

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2 my-1 overflow-visible w-full max-w-sm mx-auto h-[178px]">
      <style>{`
        /* Root Position Translations per stage */
        .stage-mag-hi {
          transform: translateX(0px) translateY(0px);
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .stage-raise-hands {
          transform: translateX(0px) translateY(-6px) scale(1.05);
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          animation: happyJoyBounce 0.8s ease-in-out infinite alternate;
        }

        .stage-tara-laro {
          transform: translateX(0px) translateY(0px) scale(1);
          transition: transform 0.5s ease;
        }

        .stage-run-right {
          transform: translateX(65px) translateY(-4px) rotate(16deg);
          transition: transform 2s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .stage-run-left {
          transform: translateX(-65px) translateY(-4px) rotate(-16deg);
          transition: transform 2s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .stage-trip {
          transform: translateX(0px) translateY(20px) rotate(-38deg);
          transition: transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .stage-getup {
          transform: translateX(0px) translateY(2px) rotate(4deg);
          transition: transform 0.8s ease;
        }

        .stage-safe-final {
          transform: translateX(0px) translateY(0px) rotate(0deg);
          transition: transform 0.8s cubic-bezier(0.34, 1.2, 0.64, 1);
        }

        @keyframes happyJoyBounce {
          0% { transform: translateX(0px) translateY(-4px) scale(1.05); }
          100% { transform: translateX(0px) translateY(-10px) scale(1.08); }
        }

        /* 3D Smooth Hover Floating */
        @keyframes gentleFloat3D {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
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

        /* Vigorous Live Waving Hand Animation */
        @keyframes vigorousWaveLive {
          0%, 100% {
            transform: rotate(20deg) translateY(0px);
          }
          25% {
            transform: rotate(-45deg) translateY(-8px);
          }
          50% {
            transform: rotate(35deg) translateY(-2px);
          }
          75% {
            transform: rotate(-35deg) translateY(-6px);
          }
        }

        .anim-live-waving {
          transform-origin: 6px 14px;
          animation: vigorousWaveLive 0.6s ease-in-out infinite;
        }

        /* Steady friendly waving hand for safe-final */
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

        /* Both Hands Raised In Joy (welcome sa aics safe room) */
        @keyframes celebrateHandsLeft {
          0%, 100% { transform: rotate(-75deg) translateY(-14px) translateX(-4px); }
          50% { transform: rotate(-85deg) translateY(-18px) translateX(-6px); }
        }

        @keyframes celebrateHandsRight {
          0%, 100% { transform: rotate(75deg) translateY(-14px) translateX(4px); }
          50% { transform: rotate(85deg) translateY(-18px) translateX(6px); }
        }

        .anim-raised-arm-left {
          transform-origin: 10px 30px;
          animation: celebrateHandsLeft 0.5s ease-in-out infinite alternate;
        }

        .anim-raised-arm-right {
          transform-origin: 2px 30px;
          animation: celebrateHandsRight 0.5s ease-in-out infinite alternate;
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
          <div className="relative px-4 py-1.5 rounded-[20px] bg-white/95 dark:bg-slate-900/95 border-2 border-sky-400/60 shadow-xl shadow-sky-950/20 backdrop-blur-md flex items-center justify-center transition-all duration-500 max-w-[290px]">
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
                  - During mag-hi, raise-hands, tara-laro, safe-final: CYAN SMILING EYES
                  - Sa safe-final: CYAN SMILING EYES NA NAGBI-BLINK!
              */}
              {(stage === 'mag-hi' || stage === 'raise-hands' || stage === 'tara-laro' || isFinal) && (
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

          {/* 3D SLEEK FLOATING TORSO POD & DYNAMIC ARMS */}
          <div className="relative z-10 flex items-center justify-center">
            {/* Left Arm:
                - Kapag 'raise-hands' (welcome sa aics safe room): Itataas ang kaliwang kamay paitaas!
                - Normal: Relaxed sleek wing
            */}
            <div
              className={`w-3.5 h-10 rounded-full mascot-shell-body opacity-95 transition-all duration-300 ${
                stage === 'raise-hands'
                  ? 'anim-raised-arm-left'
                  : 'transform -rotate-18 translate-x-1.5 -translate-y-2'
              }`}
            />

            {/* Main Floating Capsule Body */}
            <div className="w-[52px] h-[64px] rounded-b-[32px] rounded-t-[14px] mascot-shell-body flex flex-col items-center justify-start pt-2.5 relative">
              {/* Center Gentle Glow Dot */}
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400/60 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
              
              {/* Body inner accent arc */}
              <div className="w-7 h-5 mt-2 rounded-full border-b-2 border-slate-300/60" />
            </div>

            {/* Right Arm:
                - Kapag 'raise-hands': Itataas ang kanang kamay paitaas (both hands raised!)
                - Kapag 'mag-hi' o 'tara-laro': Totoong kumakaway nang masigla (anim-live-waving)
                - Kapag 'safe-final': Friendly steady wave nangangamusta
                - Habang tumatakbo/nadapa: Sleek aligned wing
            */}
            <div
              className={`w-3.5 h-10 rounded-full mascot-shell-body opacity-95 transition-all duration-300 ${
                stage === 'raise-hands'
                  ? 'anim-raised-arm-right'
                  : stage === 'mag-hi' || stage === 'tara-laro'
                  ? 'anim-live-waving -translate-x-1 -translate-y-3'
                  : isFinal
                  ? 'anim-friendly-wave -translate-x-1.5 -translate-y-2.5'
                  : 'transform rotate-18 -translate-x-1.5 -translate-y-2'
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