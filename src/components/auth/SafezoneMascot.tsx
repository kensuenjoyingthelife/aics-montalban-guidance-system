import React from 'react';

/**
 * Animated EVE-style SafeZone Companion Mascot
 * High-performance pure CSS keyframed character with layered rigging.
 * 
 * Features:
 * - Happy glowing curved eyes (^_^) that visibly blink & smile
 * - Real arm waving vigorously saying "Hi!" while holding a flower
 * - Gentle head tilt & torso floating hover
 * - Motivational floating sparkle bursts around the mascot
 */
export const SafezoneMascot: React.FC = () => {
  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2 my-1">
      <style>{`
        @keyframes mascotHover {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1.5deg); }
        }

        @keyframes mascotShadow {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(0.75); opacity: 0.18; }
        }

        @keyframes mascotWaveArm {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(-32deg); }
          30% { transform: rotate(18deg); }
          45% { transform: rotate(-30deg); }
          60% { transform: rotate(14deg); }
          75% { transform: rotate(-22deg); }
          90% { transform: rotate(6deg); }
        }

        @keyframes mascotEyeBlink {
          0%, 90%, 100% { transform: scaleY(1); opacity: 1; filter: drop-shadow(0 0 6px #38bdf8); }
          93% { transform: scaleY(0.1); opacity: 0.4; filter: none; }
          96% { transform: scaleY(1); opacity: 1; filter: drop-shadow(0 0 6px #38bdf8); }
        }

        @keyframes mascotHeadTilt {
          0%, 100% { transform: rotate(0deg) translateY(0px); }
          25% { transform: rotate(-4deg) translateY(-1px); }
          75% { transform: rotate(4deg) translateY(1px); }
        }

        @keyframes mascotSparkle {
          0%, 100% { transform: scale(0.8) translateY(0px); opacity: 0.3; }
          50% { transform: scale(1.3) translateY(-6px); opacity: 1; }
        }

        .mascot-hover-container {
          animation: mascotHover 3s ease-in-out infinite;
        }

        .mascot-shadow-blob {
          animation: mascotShadow 3s ease-in-out infinite;
        }

        .mascot-waving-arm {
          transform-origin: 12px 14px;
          animation: mascotWaveArm 2.2s ease-in-out infinite;
        }

        .mascot-eye-anim {
          transform-origin: center center;
          animation: mascotEyeBlink 3.2s infinite;
        }

        .mascot-head-tilt {
          transform-origin: center bottom;
          animation: mascotHeadTilt 4s ease-in-out infinite;
        }

        .mascot-sparkle-1 {
          animation: mascotSparkle 2s ease-in-out infinite;
        }

        .mascot-sparkle-2 {
          animation: mascotSparkle 2.6s ease-in-out infinite 0.7s;
        }
      `}</style>

      {/* Floating Sparkles & Heart particles (Motivation cues) */}
      <div className="absolute -top-1 right-6 text-sm mascot-sparkle-1 pointer-events-none drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]">
        ✨
      </div>
      <div className="absolute -top-2 left-6 text-xs mascot-sparkle-2 pointer-events-none drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">
        💙
      </div>

      {/* Hovering Character Root */}
      <div className="mascot-hover-container relative w-28 h-32 flex flex-col items-center justify-center">
        {/* Layer 1: Head with Tilt */}
        <div className="mascot-head-tilt relative z-20 flex items-center justify-center -mb-2">
          {/* Egg-shaped Smooth White Head */}
          <div className="w-[84px] h-[72px] rounded-[42px] bg-gradient-to-b from-white via-[#F8FAFC] to-[#DDE5EE] border border-[#CBD5E1] shadow-[0_8px_16px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)] flex items-center justify-center p-2 relative">
            {/* Dark Visor Face Screen */}
            <div className="w-[58px] h-[38px] rounded-[22px] bg-gradient-to-b from-[#0A1124] via-[#050B1A] to-[#02050E] border border-[#1E293B] shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2.5 relative overflow-hidden">
              {/* Glass Glare Reflection */}
              <div className="absolute -top-3 -left-2 w-12 h-6 bg-sky-400/25 blur-[3px] rounded-full transform -rotate-12 pointer-events-none" />

              {/* Glowing Curved Smiling Eyes (^_^) */}
              <div className="mascot-eye-anim flex items-center gap-2.5">
                {/* Left Smiling Eye Arc */}
                <svg className="w-5 h-3.5 overflow-visible" viewBox="0 0 20 14" fill="none">
                  <path
                    d="M 2 12 Q 10 1 18 12"
                    stroke="#38BDF8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Right Smiling Eye Arc */}
                <svg className="w-5 h-3.5 overflow-visible" viewBox="0 0 20 14" fill="none">
                  <path
                    d="M 2 12 Q 10 1 18 12"
                    stroke="#38BDF8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Cute Pink Blush Spots on cheeks */}
              <div className="absolute bottom-1 left-2 w-2 h-1 rounded-full bg-pink-500/50 blur-[0.5px]" />
              <div className="absolute bottom-1 right-2 w-2 h-1 rounded-full bg-pink-500/50 blur-[0.5px]" />
            </div>
          </div>
        </div>

        {/* Layer 2: Torso & Limbs */}
        <div className="relative z-10 w-full flex items-center justify-center">
          {/* Left Resting Arm */}
          <div className="w-4 h-9 rounded-full bg-gradient-to-b from-white to-[#D0DAE6] border border-[#CBD5E1] shadow-sm transform -rotate-12 translate-x-1.5 -translate-y-2" />

          {/* Torso Capsule Pod */}
          <div className="w-[52px] h-[64px] rounded-[26px] bg-gradient-to-b from-white via-[#F1F5F9] to-[#CAD6E2] border border-[#CBD5E1] shadow-[0_10px_20px_rgba(15,23,42,0.15)] flex flex-col items-center justify-start pt-2 relative">
            {/* Center Gentle Accent Light */}
            <div className="w-2 h-2 rounded-full bg-sky-400/40 shadow-[0_0_8px_rgba(56,189,248,0.6)] animate-pulse" />
          </div>

          {/* Right Waving Arm & Flower */}
          <div className="mascot-waving-arm relative w-8 h-12 -translate-x-1 -translate-y-3">
            {/* Sleek Arm */}
            <div className="w-4 h-10 rounded-full bg-gradient-to-b from-white to-[#D0DAE6] border border-[#CBD5E1] shadow-md transform rotate-12" />

            {/* Blossom Flower of Care in Hand */}
            <div className="absolute -top-3 -right-2 flex flex-col items-center transform -rotate-12 pointer-events-none">
              {/* Petals */}
              <div className="relative w-6 h-6 flex items-center justify-center animate-spin" style={{ animationDuration: '10s' }}>
                <span className="text-base select-none">🌸</span>
              </div>
              {/* Stem */}
              <div className="w-0.5 h-3 bg-emerald-500 rounded-full -mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Ground Shadow Blob */}
      <div className="mascot-shadow-blob w-16 h-2.5 rounded-full bg-slate-900/35 dark:bg-black/50 blur-[2px] mt-1" />
    </div>
  );
};
