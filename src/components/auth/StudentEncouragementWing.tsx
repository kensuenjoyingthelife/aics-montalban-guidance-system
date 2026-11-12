import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AICS Senior High School Student Mental Health & Anti-Bullying Encouragement Wing
 * Written with clinical empathy as Senior Mental Health Counselor for students.
 * Short, deep, 10-second Taglish messages with live animated characters (waving hands & talking mouths).
 */

// Boy Student Messages: Breaking Silence, Anti-Bullying Bravery, Speaking Up (Short & Deep Taglish)
export const BOY_ENCOURAGEMENTS = [
  'Huwag mong sarilinin. Ligtas ka rito at handa kaming makinig.',
  'Hindi karuwagan ang magsumbong. Protektado ka sa guidance.',
  'Kung may nambu-bully sa iyo o sa kaibigan mo, sabihin mo na.',
  'Hindi mo kasalanan ang ginawa nila. Karapatan mong maging ligtas.',
  'Walang makakaalam na ikaw ang nag-report. Safe ka dito.',
  'Tapang ang kailangan para magsalita. Nandito kami para sa iyo.',
];

// Girl Student Messages: Emotional Relief, Self-Worth, Mental Health Healing (Short & Deep Taglish)
export const GIRL_ENCOURAGEMENTS = [
  'Huminga ka nang malalim. Valid ang nararamdaman mo.',
  'Walang makakapagbawas sa halaga mo bilang tao. Kaya mo ito.',
  'Gagaan din ang dibdib mo. Nandito kami para tulungan ka.',
  'Okay lang mapagod, pero huwag susuko. May nagmamalasakit sa iyo.',
  'Walang manghuhusga sa iyo. Safe space mo ang portal na ito.',
  'Mahalaga ka sa AICS. Karapatan mong mag-aral nang payapa.',
];

/**
 * Pure SVG AICS Boy Student Illustration with:
 * - Animated Waving Hand / Gesticulating Arm (welcoming students to speak up)
 * - Animated Talking Mouth (organic speaking movement like an authentic character gif)
 * - Eye Blink Animation
 * - Official AICS White SHS Polo + Royal Blue Lanyard with Yellow Accent
 */
export const AicsBoyStudentSvg: React.FC<{ className?: string }> = ({ className = 'w-48 h-72' }) => (
  <svg
    viewBox="0 0 160 260"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)] ${className}`}
  >
    <defs>
      <linearGradient id="boySkin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F9D7BE" />
        <stop offset="100%" stopColor="#E5BFA3" />
      </linearGradient>
      <linearGradient id="boyShirt" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#F0F4FA" />
        <stop offset="100%" stopColor="#DDE6F5" />
      </linearGradient>
      <linearGradient id="boyPants" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1E232E" />
        <stop offset="100%" stopColor="#0D1117" />
      </linearGradient>
      <linearGradient id="boyHair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2D231E" />
        <stop offset="100%" stopColor="#17120F" />
      </linearGradient>
      <linearGradient id="lanyardBlue" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#1E469B" />
        <stop offset="100%" stopColor="#2557BE" />
      </linearGradient>
    </defs>

    {/* Ground Shadow */}
    <ellipse cx="80" cy="252" rx="36" ry="6" fill="#030A1C" opacity="0.4" />

    {/* SHS Black Trousers */}
    <path d="M58 168 L60 248 L76 248 L79 178 L82 178 L85 248 L101 248 L103 168 Z" fill="url(#boyPants)" />
    {/* Clean black leather shoes */}
    <ellipse cx="68" cy="249" rx="10" ry="4.5" fill="#0A0E17" />
    <ellipse cx="93" cy="249" rx="10" ry="4.5" fill="#0A0E17" />

    {/* Left Arm (Relaxed at side, subtle sway) */}
    <motion.g
      animate={{ rotate: [0, 2.5, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '48px 94px' }}
    >
      <path d="M48 94 C42 115 42 135 48 152" stroke="url(#boySkin)" strokeWidth="10" strokeLinecap="round" />
      <circle cx="49" cy="155" r="5.5" fill="url(#boySkin)" />
    </motion.g>

    {/* Right Arm: ACTIVELY WAVING / GESTURING HAND (Inviting the student to open up) */}
    <motion.g
      animate={{
        rotate: [0, -18, 4, -18, 0],
      }}
      transition={{
        duration: 2.2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ transformOrigin: '112px 94px' }}
    >
      {/* Arm upper & forearm */}
      <path d="M112 94 C124 105 132 112 128 128" stroke="url(#boySkin)" strokeWidth="9.5" strokeLinecap="round" />
      {/* Waving Open Hand with fingers */}
      <circle cx="128" cy="130" r="5.2" fill="url(#boySkin)" />
      <path d="M125 127 L122 121 M128 126 L127 119 M131 127 L132 120 M133 129 L136 124" stroke="url(#boySkin)" strokeWidth="2.2" strokeLinecap="round" />
    </motion.g>

    {/* White AICS SHS Polo Body */}
    <path
      d="M48 88 L112 88 L116 172 L44 172 Z"
      fill="url(#boyShirt)"
      stroke="#CFD9EA"
      strokeWidth="0.8"
    />
    {/* Center Placket */}
    <line x1="80" y1="96" x2="80" y2="170" stroke="#CBD7EA" strokeWidth="2" />
    <circle cx="80" cy="116" r="1.6" fill="#A5B8D8" />
    <circle cx="80" cy="134" r="1.6" fill="#A5B8D8" />
    <circle cx="80" cy="152" r="1.6" fill="#A5B8D8" />

    {/* Short Sleeves */}
    <path d="M48 88 L35 118 L50 122 L57 95 Z" fill="url(#boyShirt)" stroke="#CFD9EA" strokeWidth="0.8" />
    <path d="M112 88 L125 118 L110 122 L103 95 Z" fill="url(#boyShirt)" stroke="#CFD9EA" strokeWidth="0.8" />

    {/* Left Breast Pocket with AICS Round Seal */}
    <rect x="91" y="112" width="14" height="16" rx="2" fill="#F4F8FD" stroke="#CBD7EA" strokeWidth="0.8" />
    <circle cx="98" cy="120" r="4.2" fill="#1E469B" />
    <circle cx="98" cy="120" r="2.8" fill="#F4F8FD" />
    <circle cx="98" cy="120" r="1.2" fill="#1E469B" />

    {/* Blue AICS Lanyard with Yellow Accent */}
    <path d="M72 82 L77 142 M88 82 L83 142" stroke="url(#lanyardBlue)" strokeWidth="3.2" strokeLinecap="round" />
    <line x1="72.8" y1="90" x2="74.5" y2="114" stroke="#FBBF24" strokeWidth="1.2" />
    <line x1="87.2" y1="90" x2="85.5" y2="114" stroke="#FBBF24" strokeWidth="1.2" />
    {/* Hanging ID Badge */}
    <rect x="73" y="142" width="14" height="20" rx="2.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
    <rect x="73" y="142" width="14" height="5" rx="2" fill="#1E469B" />
    <text x="80" y="145.8" textAnchor="middle" fontSize="3.2" fontWeight="800" fill="#FFFFFF" fontFamily="sans-serif">
      AICS
    </text>
    <circle cx="80" cy="151.5" r="2.4" fill="#94A3B8" />
    <rect x="76" y="156" width="8" height="1.5" rx="0.7" fill="#CBD5E1" />

    {/* Open Convertible Polo Collar */}
    <path d="M66 84 L80 102 L70 82 Z" fill="#FFFFFF" stroke="#CBD7EA" strokeWidth="0.9" />
    <path d="M94 84 L80 102 L90 82 Z" fill="#FFFFFF" stroke="#CBD7EA" strokeWidth="0.9" />

    {/* Neck */}
    <rect x="74" y="66" width="12" height="18" rx="3" fill="url(#boySkin)" />

    {/* Head & Face */}
    <ellipse cx="80" cy="54" rx="16" ry="19" fill="url(#boySkin)" />

    {/* Ears */}
    <ellipse cx="63" cy="55" rx="3.5" ry="5.5" fill="url(#boySkin)" />
    <ellipse cx="97" cy="55" rx="3.5" ry="5.5" fill="url(#boySkin)" />

    {/* Eyebrows */}
    <path d="M68 45 Q73 43 77 46" stroke="#4A3B32" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M83 46 Q87 43 92 45" stroke="#4A3B32" strokeWidth="1.5" strokeLinecap="round" fill="none" />

    {/* Eyes with Blinking Animation */}
    <motion.g
      animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
      transition={{ duration: 3.6, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      style={{ transformOrigin: '80px 51px' }}
    >
      <ellipse cx="73" cy="51" rx="2.2" ry="2.6" fill="#1E1915" />
      <ellipse cx="87" cy="51" rx="2.2" ry="2.6" fill="#1E1915" />
      <circle cx="74" cy="50" r="0.8" fill="#FFFFFF" />
      <circle cx="88" cy="50" r="0.8" fill="#FFFFFF" />
    </motion.g>

    {/* Nose */}
    <path d="M80 52 L78.5 58 L81.5 58" stroke="#DDA888" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

    {/* ANIMATED TALKING MOUTH (Simulates natural speech articulation / gif effect) */}
    <motion.path
      animate={{
        d: [
          'M76 63 Q80 66 84 63', // smile
          'M77 62 Q80 68 83 62', // open o
          'M75 64 Q80 65 85 64', // wider
          'M76 62 Q80 67 84 62', // talking
          'M76 63 Q80 66 84 63', // smile
        ],
      }}
      transition={{
        duration: 0.85,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      stroke="#9E4D40"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="#6B1D2F"
    />

    {/* Modern Boy Side-Part Hair */}
    <path
      d="M63 50 C61 34 72 26 82 26 C95 26 100 35 97 50 C94 40 91 35 84 34 C76 33 68 37 63 50 Z"
      fill="url(#boyHair)"
    />
    <path d="M64 45 C66 38 72 34 80 34 C88 34 94 38 96 46 C92 42 86 40 80 41 C74 42 68 44 64 45 Z" fill="#3D302A" />
  </svg>
);

/**
 * Pure SVG AICS Girl Student Illustration with:
 * - Animated Comforting Waving / Gesturing Hand (warm welcoming motion)
 * - Animated Talking Mouth (organic conversational cadence like a live gif)
 * - Eye Blink Animation
 * - Official AICS Signature Gray Blouse with Royal Blue Piping + Pleated Skirt
 */
export const AicsGirlStudentSvg: React.FC<{ className?: string }> = ({ className = 'w-48 h-72' }) => (
  <svg
    viewBox="0 0 160 260"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)] ${className}`}
  >
    <defs>
      <linearGradient id="girlSkin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FAE0D0" />
        <stop offset="100%" stopColor="#ECCBB6" />
      </linearGradient>
      <linearGradient id="girlGrayBlouse" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#CBD3DD" />
        <stop offset="50%" stopColor="#B3BDCC" />
        <stop offset="100%" stopColor="#9AA5B6" />
      </linearGradient>
      <linearGradient id="girlBlueSkirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2557BE" />
        <stop offset="100%" stopColor="#123680" />
      </linearGradient>
      <linearGradient id="girlHair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2F211B" />
        <stop offset="100%" stopColor="#1A120E" />
      </linearGradient>
      <linearGradient id="pipingBlue" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#1E469B" />
        <stop offset="100%" stopColor="#2557BE" />
      </linearGradient>
    </defs>

    {/* Ground Shadow */}
    <ellipse cx="80" cy="252" rx="36" ry="6" fill="#030A1C" opacity="0.4" />

    {/* Hair Layer (Back) */}
    <path d="M57 56 C52 82 56 120 62 135 L98 135 C104 120 108 82 103 56 Z" fill="url(#girlHair)" />

    {/* Legs with clean black school shoes */}
    <rect x="67" y="195" width="8" height="48" rx="4" fill="url(#girlSkin)" />
    <rect x="85" y="195" width="8" height="48" rx="4" fill="url(#girlSkin)" />
    <ellipse cx="70" cy="247" rx="8.5" ry="4" fill="#111827" />
    <ellipse cx="90" cy="247" rx="8.5" ry="4" fill="#111827" />

    {/* Royal Blue AICS SHS Skirt (Pleated) */}
    <path d="M57 146 L103 146 L112 198 L48 198 Z" fill="url(#girlBlueSkirt)" />
    <line x1="64" y1="147" x2="59" y2="198" stroke="#163473" strokeWidth="1.2" />
    <line x1="75" y1="147" x2="73" y2="198" stroke="#163473" strokeWidth="1.2" />
    <line x1="85" y1="147" x2="87" y2="198" stroke="#163473" strokeWidth="1.2" />
    <line x1="96" y1="147" x2="101" y2="198" stroke="#163473" strokeWidth="1.2" />

    {/* Left Arm: ACTIVELY WAVING / GENTLE REASSURING HAND GESTURE */}
    <motion.g
      animate={{
        rotate: [0, 16, -4, 16, 0],
      }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ transformOrigin: '52px 94px' }}
    >
      <path d="M52 94 C38 106 30 114 34 128" stroke="url(#girlSkin)" strokeWidth="8.5" strokeLinecap="round" />
      <circle cx="34" cy="130" r="5" fill="url(#girlSkin)" />
      <path d="M36 126 L39 120 M33 125 L34 118 M30 126 L29 119 M28 128 L25 123" stroke="url(#girlSkin)" strokeWidth="2" strokeLinecap="round" />
    </motion.g>

    {/* Right Arm: Holding notebook / comforting pose */}
    <path d="M108 94 C114 114 108 132 96 140" stroke="url(#girlSkin)" strokeWidth="8.5" strokeLinecap="round" />
    {/* Notebook / folder */}
    <rect x="74" y="128" width="28" height="24" rx="2.5" fill="#1E469B" stroke="#7CB8F7" strokeWidth="1" />
    <rect x="77" y="131" width="22" height="18" rx="1.5" fill="#FFFFFF" />
    <circle cx="95" cy="140" r="4.5" fill="url(#girlSkin)" />

    {/* AICS Gray Blouse Body */}
    <path
      d="M52 88 L108 88 L104 148 L56 148 Z"
      fill="url(#girlGrayBlouse)"
      stroke="#94A3B8"
      strokeWidth="0.8"
    />
    {/* Center Placket */}
    <line x1="80" y1="96" x2="80" y2="148" stroke="#8A96A8" strokeWidth="1.6" />
    <circle cx="80" cy="112" r="1.4" fill="#FFFFFF" />
    <circle cx="80" cy="126" r="1.4" fill="#FFFFFF" />
    <circle cx="80" cy="140" r="1.4" fill="#FFFFFF" />

    {/* Blouse Sleeves with Blue Piping */}
    <path d="M52 88 L40 114 L52 118 L58 94 Z" fill="url(#girlGrayBlouse)" />
    <line x1="40" y1="114" x2="52" y2="118" stroke="url(#pipingBlue)" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M108 88 L120 114 L108 118 L102 94 Z" fill="url(#girlGrayBlouse)" />
    <line x1="120" y1="114" x2="108" y2="118" stroke="url(#pipingBlue)" strokeWidth="2.2" strokeLinecap="round" />

    {/* Left Breast Emblem (AICS Seal) */}
    <circle cx="94" cy="110" r="3.8" fill="#1E469B" />
    <circle cx="94" cy="110" r="2.4" fill="#FFFFFF" />
    <circle cx="94" cy="110" r="1.1" fill="#1E469B" />

    {/* Blue Lanyard + ID */}
    <path d="M73 82 L77 122 M87 82 L83 122" stroke="url(#pipingBlue)" strokeWidth="2.8" strokeLinecap="round" />
    <line x1="73.8" y1="90" x2="75" y2="108" stroke="#FBBF24" strokeWidth="1" />
    <line x1="86.2" y1="90" x2="85" y2="108" stroke="#FBBF24" strokeWidth="1" />
    <rect x="74" y="122" width="12" height="17" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
    <rect x="74" y="122" width="12" height="4.5" rx="1.5" fill="#1E469B" />
    <text x="80" y="125.5" textAnchor="middle" fontSize="2.8" fontWeight="800" fill="#FFFFFF" fontFamily="sans-serif">
      AICS
    </text>

    {/* Convertible Collar with Royal Blue Piping */}
    <path d="M68 84 L80 100 L72 82 Z" fill="#DCE2EA" stroke="url(#pipingBlue)" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M92 84 L80 100 L88 82 Z" fill="#DCE2EA" stroke="url(#pipingBlue)" strokeWidth="1.4" strokeLinejoin="round" />

    {/* Neck */}
    <rect x="75" y="66" width="10" height="18" rx="2.5" fill="url(#girlSkin)" />

    {/* Head & Face */}
    <ellipse cx="80" cy="54" rx="14.5" ry="17.5" fill="url(#girlSkin)" />

    {/* Eyebrows */}
    <path d="M69 46 Q73 44 77 47" stroke="#4A3B32" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    <path d="M83 47 Q87 44 91 46" stroke="#4A3B32" strokeWidth="1.3" strokeLinecap="round" fill="none" />

    {/* Eyes with Blinking Animation */}
    <motion.g
      animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
      transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.5, 0.55, 0.6, 1], delay: 0.8 }}
      style={{ transformOrigin: '80px 52px' }}
    >
      <ellipse cx="73" cy="52" rx="2" ry="2.4" fill="#1E1915" />
      <ellipse cx="87" cy="52" rx="2" ry="2.4" fill="#1E1915" />
      <circle cx="74" cy="51" r="0.7" fill="#FFFFFF" />
      <circle cx="88" cy="51" r="0.7" fill="#FFFFFF" />
    </motion.g>

    {/* Soft blush */}
    <ellipse cx="69" cy="56" rx="3.5" ry="2" fill="#F48FB1" opacity="0.45" />
    <ellipse cx="91" cy="56" rx="3.5" ry="2" fill="#F48FB1" opacity="0.45" />

    {/* Nose */}
    <circle cx="80" cy="57" r="0.9" fill="#DDA888" />

    {/* ANIMATED TALKING MOUTH (Simulates natural speech articulation / gif effect) */}
    <motion.path
      animate={{
        d: [
          'M76 62 Q80 66 84 62', // gentle smile
          'M77 61 Q80 67 83 61', // open gentle o
          'M75 63 Q80 65 85 63', // wider speech
          'M76 61 Q80 66 84 61', // talking
          'M76 62 Q80 66 84 62', // smile
        ],
      }}
      transition={{
        duration: 0.9,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: 0.2,
      }}
      stroke="#C2415C"
      strokeWidth="1.7"
      strokeLinecap="round"
      fill="#8E203C"
    />

    {/* Girl Hair Front Layer */}
    <path
      d="M62 48 C63 32 72 26 80 26 C88 26 97 32 98 48 C94 40 88 38 80 38 C72 38 66 40 62 48 Z"
      fill="url(#girlHair)"
    />
    <path d="M68 40 Q75 48 80 43 Q85 48 92 40 Z" fill="#241914" />
  </svg>
);

/**
 * Animated Interactive Student Support Wing Hook
 * Cycles clean, short, deep Taglish messages every 10 seconds.
 */
export const useStudentEncouragementWings = () => {
  const [boyIndex, setBoyIndex] = useState(0);
  const [girlIndex, setGirlIndex] = useState(0);

  useEffect(() => {
    // 10 SECONDS INTERVAL per user request
    const timer = setInterval(() => {
      setBoyIndex((prev) => (prev + 1) % BOY_ENCOURAGEMENTS.length);
      setGirlIndex((prev) => (prev + 1) % GIRL_ENCOURAGEMENTS.length);
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  const currentBoyMsg = BOY_ENCOURAGEMENTS[boyIndex];
  const currentGirlMsg = GIRL_ENCOURAGEMENTS[girlIndex];

  return {
    boyWing: (
      <div className="flex flex-col items-center justify-end text-center space-y-2 w-60 xl:w-68 select-none">
        {/* Animated Speech Bubble (Boy - Clean, Short Taglish, No unneeded headers) */}
        <div className="relative min-h-[78px] w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={boyIndex}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative px-4 py-3 rounded-2xl bg-blue-950/85 border border-sky-400/40 text-white shadow-xl shadow-blue-950/60 backdrop-blur-md text-xs sm:text-[13px] leading-snug font-semibold text-center"
            >
              <p className="text-sky-100">
                &ldquo;{currentBoyMsg}&rdquo;
              </p>

              {/* Chat bubble tail */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-blue-950/90" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Boy Student SVG Illustration with animated waving hand & talking mouth */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <AicsBoyStudentSvg className="w-44 sm:w-48 h-60 sm:h-68" />
        </motion.div>
      </div>
    ),

    girlWing: (
      <div className="flex flex-col items-center justify-end text-center space-y-2 w-60 xl:w-68 select-none">
        {/* Animated Speech Bubble (Girl - Clean, Short Taglish, No unneeded headers) */}
        <div className="relative min-h-[78px] w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={girlIndex}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative px-4 py-3 rounded-2xl bg-indigo-950/85 border border-teal-400/40 text-white shadow-xl shadow-indigo-950/60 backdrop-blur-md text-xs sm:text-[13px] leading-snug font-semibold text-center"
            >
              <p className="text-teal-100">
                &ldquo;{currentGirlMsg}&rdquo;
              </p>

              {/* Chat bubble tail */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-indigo-950/90" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Girl Student SVG Illustration with animated waving hand & talking mouth */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          className="relative"
        >
          <AicsGirlStudentSvg className="w-44 sm:w-48 h-60 sm:h-68" />
        </motion.div>
      </div>
    ),
  };
};
