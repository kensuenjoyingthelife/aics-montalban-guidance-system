import React from 'react';
import { motion } from 'framer-motion';

/**
 * Animated EVE-style SafeZone Companion Mascot
 * Replaces the static AICS logo above "AICS SAFEZONE".
 * Features:
 * - Happy glowing curved cyan eyes (smiling eyes ^_^) that blink and pulse
 * - Smooth hovering body motion with soft shadow breathing below
 * - Waving greeting arm that says "Hi!" with friendly hand tilt
 * - Holding a sweet blossom flower of care
 * - Sparkling motivation bursts around the head that kids love
 */
export const SafezoneMascot: React.FC = () => {
  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1">
      {/* Floating Sparkles & Heart particles (Motivation cues) */}
      <motion.div
        animate={{
          scale: [0.8, 1.2, 0.8],
          opacity: [0.4, 1, 0.4],
          y: [-2, -8, -2],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-2 right-4 text-xs font-bold text-pink-400 pointer-events-none drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]"
      >
        ✨
      </motion.div>
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.3, 0.9, 0.3],
          y: [-4, -10, -4],
        }}
        transition={{ duration: 2.6, repeat: Infinity, delay: 0.6, ease: 'easeInOut' }}
        className="absolute -top-3 left-6 text-[10px] font-bold text-sky-400 pointer-events-none drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
      >
        💙
      </motion.div>

      {/* Main Hovering EVE Robot Container */}
      <motion.div
        animate={{
          y: [0, -6, 0],
          rotate: [0, 1.5, -1.5, 0],
        }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative w-24 h-28 flex items-center justify-center"
      >
        <svg
          viewBox="0 0 160 190"
          className="w-full h-full overflow-visible drop-shadow-[0_12px_20px_rgba(14,165,233,0.3)]"
        >
          <defs>
            {/* Glossy White Gradients for Body & Head */}
            <linearGradient id="eveWhite" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#D8E2EE" />
            </linearGradient>

            <linearGradient id="eveHighlight" x1="30%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
            </linearGradient>

            {/* Glowing Visor Gradient */}
            <radialGradient id="eveVisor" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#0B132B" />
              <stop offset="70%" stopColor="#050C1F" />
              <stop offset="100%" stopColor="#020612" />
            </radialGradient>

            {/* Cyan Eye Glow Filter */}
            <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Shadow beneath body */}
            <radialGradient id="eveShadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ====================================================
              LOWER TORSO / EGG POD (Floats softly)
              ==================================================== */}
          <g transform="translate(0, 10)">
            {/* Main sleek body pod */}
            <path
              d="M 52 74 C 52 68, 108 68, 108 74 C 114 100, 108 140, 80 162 C 52 140, 46 100, 52 74 Z"
              fill="url(#eveWhite)"
              stroke="#CFD9E8"
              strokeWidth="1.2"
            />
            {/* Soft inner core shadow indentation */}
            <path
              d="M 57 80 C 57 76, 68 78, 68 86 C 68 114, 62 136, 80 152 C 58 136, 54 104, 57 80 Z"
              fill="#BAC7DA"
              opacity="0.35"
            />
            {/* Glossy light rim curve */}
            <path
              d="M 56 78 C 65 72, 95 72, 104 78 C 100 110, 92 145, 80 158"
              fill="none"
              stroke="url(#eveHighlight)"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Left resting hand pointing softly */}
            <motion.path
              animate={{ rotate: [-2, 3, -2] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '56px 85px' }}
              d="M 56 82 C 42 92, 38 114, 52 118 C 62 118, 66 100, 56 82 Z"
              fill="url(#eveWhite)"
              stroke="#CFD9E8"
              strokeWidth="0.8"
            />
          </g>

          {/* ====================================================
              WAVING GREETING RIGHT ARM & FLOWER ("NAG HI-HI")
              ==================================================== */}
          <motion.g
            animate={{
              rotate: [0, -18, 8, -16, 6, 0],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '104px 92px' }}
          >
            {/* Right Arm waving */}
            <path
              d="M 104 88 C 122 84, 138 98, 134 114 C 124 122, 106 104, 104 88 Z"
              fill="url(#eveWhite)"
              stroke="#CFD9E8"
              strokeWidth="0.8"
            />

            {/* Pink Blossom Flower of Care held in hand */}
            <g transform="translate(132, 104)">
              {/* Green stem & leaf */}
              <path d="M 0 4 Q -1 16 0 22" stroke="#16A34A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M 0 12 Q 5 10 6 13 Q 3 16 0 14" fill="#22C55E" />

              {/* Pink floral petals with gentle pulse */}
              <motion.g
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <circle cx="0" cy="0" r="4.5" fill="#FB7185" />
                <circle cx="-5" cy="-2" r="3.8" fill="#F472B6" />
                <circle cx="5" cy="-2" r="3.8" fill="#F472B6" />
                <circle cx="-3" cy="5" r="3.8" fill="#FDA4AF" />
                <circle cx="3" cy="5" r="3.8" fill="#FDA4AF" />
                <circle cx="0" cy="-6" r="3.8" fill="#FB7185" />
                <circle cx="0" cy="0" r="2.2" fill="#FEF08A" />
              </motion.g>
            </g>
          </motion.g>

          {/* ====================================================
              HEAD & GLOWING HAPPY SMILING EYES (^_^)
              ==================================================== */}
          <motion.g
            animate={{
              rotate: [0, -2, 2, 0],
              y: [0, -1.5, 0],
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '80px 48px' }}
          >
            {/* White Oval Egg-shaped Head */}
            <ellipse
              cx="80"
              cy="48"
              rx="44"
              ry="38"
              fill="url(#eveWhite)"
              stroke="#CFD9E8"
              strokeWidth="1.2"
            />
            {/* Soft gloss highlight on top of head */}
            <path
              d="M 52 32 C 60 20, 100 20, 108 32 C 98 25, 62 25, 52 32 Z"
              fill="#FFFFFF"
              opacity="0.8"
            />

            {/* Dark Visor Display Screen */}
            <ellipse
              cx="80"
              cy="48"
              rx="30"
              ry="20"
              fill="url(#eveVisor)"
              stroke="#1E293B"
              strokeWidth="0.8"
            />
            {/* Visor glass reflection */}
            <path
              d="M 56 42 Q 78 35 104 42 Q 78 38 56 42 Z"
              fill="#38BDF8"
              opacity="0.25"
            />

            {/* Glowing Happy Smiling Eyes (^_^) */}
            <g filter="url(#eyeGlow)">
              {/* Left Eye: Happy Arc ^ */}
              <motion.path
                d="M 64 51 Q 71 42 77 50"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="4"
                strokeLinecap="round"
                animate={{
                  scaleY: [1, 0.15, 1, 1, 1],
                  opacity: [0.95, 0.4, 0.95, 1, 0.95],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  times: [0, 0.05, 0.1, 0.8, 1],
                }}
                style={{ transformOrigin: '71px 48px' }}
              />

              {/* Right Eye: Happy Arc ^ */}
              <motion.path
                d="M 83 50 Q 89 42 96 51"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="4"
                strokeLinecap="round"
                animate={{
                  scaleY: [1, 0.15, 1, 1, 1],
                  opacity: [0.95, 0.4, 0.95, 1, 0.95],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  times: [0, 0.05, 0.1, 0.8, 1],
                }}
                style={{ transformOrigin: '89px 48px' }}
              />
            </g>

            {/* Cute pink cheek blushes for warmth & friendliness */}
            <ellipse cx="61" cy="55" rx="3.5" ry="1.8" fill="#F472B6" opacity="0.6" />
            <ellipse cx="99" cy="55" rx="3.5" ry="1.8" fill="#F472B6" opacity="0.6" />
          </motion.g>
        </svg>

        {/* Dynamic Soft Shadow beneath robot that breathes with hovering */}
        <motion.div
          animate={{
            scaleX: [1, 0.75, 1],
            opacity: [0.35, 0.18, 0.35],
          }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-2 w-14 h-2.5 rounded-full bg-slate-900/40 blur-[2px] pointer-events-none"
        />
      </motion.div>
    </div>
  );
};
