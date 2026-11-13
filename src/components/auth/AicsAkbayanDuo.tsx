import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Handsome AICS Boy & Beautiful Short-Haired Girl Companions
 * Posing together with a friendly arm around shoulder / akbayan
 * to represent safety, trust, and mental wellness.
 */
export const AicsAkbayanDuo: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: -25, transition: { duration: 0.45, ease: 'easeInOut' } }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="relative z-30 flex flex-col items-center justify-center my-1 select-none pointer-events-none"
        >
          {/* Reassuring Floating Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-1 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 backdrop-blur-md shadow-lg flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black tracking-wide text-emerald-200 uppercase">
              100% Ligtas Ka Dito · Magkasama Tayo
            </span>
          </motion.div>

          {/* SVG Canvas for the Akbayan Pair */}
          <div className="relative w-56 h-36 flex items-center justify-center drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]">
            <svg viewBox="0 0 240 180" className="w-full h-full overflow-visible" fill="none">
              <defs>
                {/* Skin Gradients */}
                <linearGradient id="akbayanSkin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FDE1D3" />
                  <stop offset="100%" stopColor="#E6BA9C" />
                </linearGradient>

                {/* Hair Gradients */}
                <linearGradient id="boyHairDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2D1F18" />
                  <stop offset="100%" stopColor="#140D0A" />
                </linearGradient>

                <linearGradient id="girlShortHair" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3A2820" />
                  <stop offset="100%" stopColor="#1C130E" />
                </linearGradient>

                {/* Uniform Gradients */}
                <linearGradient id="boyWhiteShirt" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="60%" stopColor="#F1F5F9" />
                  <stop offset="100%" stopColor="#D9E2EC" />
                </linearGradient>

                <linearGradient id="girlGrayBlouseDuo" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#D4DCE8" />
                  <stop offset="50%" stopColor="#BCC8DA" />
                  <stop offset="100%" stopColor="#A2B1C6" />
                </linearGradient>

                <linearGradient id="aicsRoyalBlue" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1E469B" />
                  <stop offset="100%" stopColor="#2557BE" />
                </linearGradient>
              </defs>

              {/* Ground Shadow */}
              <ellipse cx="120" cy="174" rx="70" ry="6" fill="#000000" opacity="0.3" />

              {/* ====================================================
                  GIRL STUDENT (Right side, leaning in sweetly)
                  ==================================================== */}
              <g transform="translate(112, 10)">
                {/* Blouse Body */}
                <path d="M22 68 L14 148 L76 148 L68 68 Z" fill="url(#girlGrayBlouseDuo)" stroke="#8A96A8" strokeWidth="0.8" />
                <path d="M42 68 L42 148" stroke="#8A96A8" strokeWidth="1.5" />

                {/* Royal Blue Lanyard */}
                <path d="M36 68 L39 104 M48 68 L45 104" stroke="url(#aicsRoyalBlue)" strokeWidth="2.2" strokeLinecap="round" />
                <rect x="38" y="104" width="8" height="11" rx="1.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.6" />
                <rect x="38" y="104" width="8" height="3" rx="1" fill="#1E469B" />

                {/* Neck */}
                <rect x="40" y="56" width="8" height="14" rx="2" fill="url(#akbayanSkin)" />

                {/* Beautiful Face */}
                <ellipse cx="44" cy="46" rx="14" ry="16" fill="url(#akbayanSkin)" />

                {/* Cute Pink Cheeks */}
                <ellipse cx="36" cy="49" rx="3.5" ry="1.8" fill="#F472B6" opacity="0.6" />
                <ellipse cx="52" cy="49" rx="3.5" ry="1.8" fill="#F472B6" opacity="0.6" />

                {/* Expressive Pretty Eyes & Smile */}
                <motion.g animate={{ scaleY: [1, 1, 0.15, 1, 1] }} transition={{ duration: 3.4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }} style={{ transformOrigin: '44px 44px' }}>
                  <ellipse cx="38.5" cy="43" rx="1.8" ry="2.4" fill="#1C130E" />
                  <ellipse cx="49.5" cy="43" rx="1.8" ry="2.4" fill="#1C130E" />
                  <circle cx="39" cy="42" r="0.7" fill="#FFFFFF" />
                  <circle cx="50" cy="42" r="0.7" fill="#FFFFFF" />
                </motion.g>
                <path d="M41 53 Q44 57 47 53" stroke="#9E2A2B" strokeWidth="1.5" strokeLinecap="round" fill="#D90429" />

                {/* CHIC SHORT BOB HAIR (Beautiful & Modern Filipina Style, Hindi Kalbo!) */}
                <path
                  d="M26 44 C26 24 35 16 45 16 C57 16 64 24 64 44 C64 56 62 64 58 66 C57 58 58 50 58 44 C56 32 50 28 44 28 C38 28 32 34 31 46 C30 52 31 60 28 66 C26 62 26 54 26 44 Z"
                  fill="url(#girlShortHair)"
                />
                {/* Soft Air Bangs */}
                <path d="M33 34 Q44 42 55 34 Q45 28 33 34 Z" fill="#24140D" />
                <path d="M38 36 Q42 42 46 38" stroke="#140B07" strokeWidth="0.8" fill="none" />

                {/* Right Arm waving slightly */}
                <path d="M68 68 L78 92 L70 94 L64 74 Z" fill="url(#girlGrayBlouseDuo)" stroke="#8A96A8" strokeWidth="0.8" />
                <path d="M74 92 C76 104 74 116 70 124" stroke="url(#akbayanSkin)" strokeWidth="6" strokeLinecap="round" />
              </g>

              {/* ====================================================
                  BOY STUDENT (Left side, handsome haircut, AKBAYAN ARM)
                  ==================================================== */}
              <g transform="translate(48, 8)">
                {/* Polo Shirt Body */}
                <path d="M24 70 L14 150 L78 150 L68 70 Z" fill="url(#boyWhiteShirt)" stroke="#CBD5E1" strokeWidth="0.8" />
                <path d="M46 70 L46 150" stroke="#CBD5E1" strokeWidth="1.8" />

                {/* Blue Lanyard */}
                <path d="M40 70 L43 106 M52 70 L49 106" stroke="url(#aicsRoyalBlue)" strokeWidth="2.2" strokeLinecap="round" />
                <rect x="42" y="106" width="8" height="11" rx="1.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.6" />
                <rect x="42" y="106" width="8" height="3" rx="1" fill="#1E469B" />

                {/* Left Arm relaxed */}
                <path d="M24 70 L14 94 L22 96 L28 76 Z" fill="url(#boyWhiteShirt)" stroke="#CBD5E1" strokeWidth="0.8" />
                <path d="M18 94 C15 106 18 118 22 126" stroke="url(#akbayanSkin)" strokeWidth="7" strokeLinecap="round" />

                {/* Neck */}
                <rect x="42" y="58" width="9" height="14" rx="2" fill="url(#akbayanSkin)" />

                {/* Handsome Face */}
                <ellipse cx="46" cy="46" rx="14.5" ry="16.5" fill="url(#akbayanSkin)" />

                {/* Handsome Eyes & Reassuring Warm Smile */}
                <motion.g animate={{ scaleY: [1, 1, 0.15, 1, 1] }} transition={{ duration: 3.8, repeat: Infinity, times: [0, 0.5, 0.55, 0.6, 1], delay: 0.3 }} style={{ transformOrigin: '46px 44px' }}>
                  <ellipse cx="40.5" cy="43" rx="1.8" ry="2.4" fill="#140D0A" />
                  <ellipse cx="51.5" cy="43" rx="1.8" ry="2.4" fill="#140D0A" />
                  <circle cx="41" cy="42" r="0.7" fill="#FFFFFF" />
                  <circle cx="52" cy="42" r="0.7" fill="#FFFFFF" />
                </motion.g>
                <path d="M43 54 Q46 58 50 54" stroke="#8E203C" strokeWidth="1.6" strokeLinecap="round" fill="#C2415C" />

                {/* HANDSOME K-STYLE TEXTURED TWO-BLOCK / SIDE-PART HAIR */}
                <path
                  d="M31 42 C30 24 40 16 50 16 C62 16 66 25 64 42 C62 34 56 28 48 27 C42 26 35 30 31 42 Z"
                  fill="url(#boyHairDark)"
                />
                <path d="M33 38 C36 31 42 27 50 27 C56 27 61 31 63 38 C59 34 53 32 47 33 C41 34 36 36 33 38 Z" fill="#3A2820" />

                {/* ====================================================
                    THE AKBAYAN ARM (Boy's Right Arm hugging Girl's shoulder)
                    ==================================================== */}
                {/* Shoulder joint & upper sleeve wrapping right */}
                <path d="M68 70 L92 68 L94 78 L72 82 Z" fill="url(#boyWhiteShirt)" stroke="#CBD5E1" strokeWidth="0.8" />
                {/* Arm resting over girl's upper shoulder with supportive hand */}
                <path d="M90 72 C102 70 114 74 122 80" stroke="url(#akbayanSkin)" strokeWidth="7.5" strokeLinecap="round" />
                {/* Gentle supportive hand resting on girl's shoulder */}
                <circle cx="122" cy="80" r="4.2" fill="url(#akbayanSkin)" />
                <path d="M124 78 L127 82 M122 82 L124 86" stroke="url(#akbayanSkin)" strokeWidth="1.8" strokeLinecap="round" />
              </g>
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
