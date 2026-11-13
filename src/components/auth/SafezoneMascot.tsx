import React, { useState, useEffect } from 'react';

/**
 * 3D EVE-Style AICS SafeZone Mascot (Based directly on user reference photo)
 * 
 * Features:
 * - 3D glossy smooth egg-shaped head with specular highlight
 * - Deep navy/black glossy visor with vibrant cyan curved smiling LED eyes
 * - Sleek 3D floating torso capsule with soft ambient shadow
 * - Gentle hover/floating physics
 * - Smooth transition from intro animation stopping permanently at "Safe ka dito palagi! 💙" (hindi na naglo-loop o nag-gi-gif)
 */

type MascotStage = 'intro' | 'safe-still';

export const SafezoneMascot: React.FC = () => {
  const [stage, setStage] = useState<MascotStage>('intro');
  const [speechBubble, setSpeechBubble] = useState<string>('Hi, welcome! 👋');

  useEffect(() => {
    // 1. Intro greeting
    setStage('intro');
    setSpeechBubble('Hi, welcome! 👋');

    // 2. Pagkatapos ng 2.8s, papasok sa "Safe ka dito palagi! 💙" at mahihinto na doon (walang looping / hindi nag-gif)
    const timer = setTimeout(() => {
      setStage('safe-still');
      setSpeechBubble('Safe ka dito palagi! 💙');
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2 my-1 overflow-visible w-full max-w-sm mx-auto h-[175px]">
      <style>{`
        /* Smooth subtle floating glow */
        @keyframes gentleFloat3D {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-5px) rotate(1deg);
          }
        }

        .mascot-3d-float {
          animation: gentleFloat3D 3.5s ease-in-out infinite;
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
          animation: shadowPulse3D 3.5s ease-in-out infinite;
        }

        /* 3D Pearl Gloss Shader */
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

        /* Floating comic cloud animation */
        @keyframes cloudFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }

        .cloud-bubble-anim {
          animation: cloudFloat 2.4s ease-in-out infinite;
        }
      `}</style>

      {/* 3D Character Composition */}
      <div className="relative flex flex-col items-center justify-center mascot-3d-float z-20">
        
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

        {/* 3D EGG-SHAPED PEARL HEAD */}
        <div className="relative z-20 w-[94px] h-[78px] rounded-[48px] mascot-shell-head flex items-center justify-center p-2.5 -mb-2 transition-transform duration-500">
          {/* Specular Highlight glare on top-left of head */}
          <div className="absolute top-2 left-4 w-7 h-3.5 bg-white/80 rounded-full blur-[1px] transform -rotate-25 pointer-events-none" />

          {/* 3D VISOR (Deep Obsidian with Gloss Edge) */}
          <div className="relative w-[64px] h-[44px] rounded-[24px] mascot-visor-glass flex items-center justify-center gap-2.5 overflow-hidden">
            {/* Visor Glare Crescent */}
            <div className="absolute -top-3 -left-2 w-14 h-7 bg-white/20 blur-[2px] rounded-full transform -rotate-12 pointer-events-none" />

            {/* VIBRANT CYAN 3D CURVED SMILING EYES (Katulad sa reference picture) */}
            <div className="flex items-center gap-3">
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

          {/* Right Sleek Wing / Fin */}
          <div className="w-3 h-9 rounded-full mascot-shell-body transform rotate-18 -translate-x-1.5 -translate-y-2 opacity-95" />
        </div>

        {/* 3D Soft Ambient Ground Shadow */}
        <div className="w-16 h-2.5 rounded-full bg-slate-900/40 dark:bg-black/60 blur-[3px] mt-1 mascot-3d-shadow" />
      </div>
    </div>
  );
};