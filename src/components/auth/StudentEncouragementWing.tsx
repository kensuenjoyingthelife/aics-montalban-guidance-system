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
 * Pure SVG AICS Boy Student Illustration
 * Scale & Viewport tuned for prominent, balanced stature beside the login card
 */
export const AicsBoyStudentSvg: React.FC<{ className?: string }> = ({ className = 'w-64 h-96' }) => (
  <svg
    viewBox="0 0 160 260"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.35)] ${className}`}
  >
    <defs>
      <linearGradient id="boySkin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FAD8C2" />
        <stop offset="100%" stopColor="#E5BFA3" />
      </linearGradient>
      <linearGradient id="boyShirt" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#F0F4FA" />
        <stop offset="100%" stopColor="#DCE6F5" />
      </linearGradient>
      <linearGradient id="boyPants" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#222834" />
        <stop offset="100%" stopColor="#0F131A" />
      </linearGradient>
      <linearGradient id="boyHair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#30241E" />
        <stop offset="100%" stopColor="#18120E" />
      </linearGradient>
      <linearGradient id="lanyardBlue" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#1E469B" />
        <stop offset="100%" stopColor="#2557BE" />
      </linearGradient>
    </defs>

    {/* Ground Shadow */}
    <ellipse cx="80" cy="252" rx="42" ry="7" fill="#030A1C" opacity="0.35" />

    {/* SHS Black Trousers */}
    <path d="M57 168 L59 248 L76 248 L79 178 L82 178 L85 248 L102 248 L104 168 Z" fill="url(#boyPants)" />
    {/* Clean black shoes */}
    <ellipse cx="67" cy="249" rx="11" ry="5" fill="#0A0E17" />
    <ellipse cx="94" cy="249" rx="11" ry="5" fill="#0A0E17" />

    {/* Left Arm (Relaxed at side, subtle sway) */}
    <motion.g
      animate={{ rotate: [0, 2.5, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '48px 94px' }}
    >
      <path d="M48 94 C42 115 42 135 48 152" stroke="url(#boySkin)" strokeWidth="10.5" strokeLinecap="round" />
      <circle cx="49" cy="155" r="5.8" fill="url(#boySkin)" />
    </motion.g>

    {/* Right Arm: ACTIVELY WAVING / GESTURING HAND */}
    <motion.g
      animate={{
        rotate: [0, -20, 5, -20, 0],
      }}
      transition={{
        duration: 2.2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ transformOrigin: '112px 94px' }}
    >
      <path d="M112 94 C124 105 133 112 129 128" stroke="url(#boySkin)" strokeWidth="10" strokeLinecap="round" />
      <circle cx="129" cy="130" r="5.5" fill="url(#boySkin)" />
      <path d="M126 127 L123 120 M129 126 L128 118 M132 127 L133 119 M134 129 L137 123" stroke="url(#boySkin)" strokeWidth="2.4" strokeLinecap="round" />
    </motion.g>

    {/* White AICS SHS Polo Body */}
    <path
      d="M48 88 L112 88 L116 172 L44 172 Z"
      fill="url(#boyShirt)"
      stroke="#CFD9EA"
      strokeWidth="0.9"
    />
    {/* Center Placket */}
    <line x1="80" y1="96" x2="80" y2="170" stroke="#CBD7EA" strokeWidth="2.2" />
    <circle cx="80" cy="116" r="1.8" fill="#A5B8D8" />
    <circle cx="80" cy="134" r="1.8" fill="#A5B8D8" />
    <circle cx="80" cy="152" r="1.8" fill="#A5B8D8" />

    {/* Short Sleeves */}
    <path d="M48 88 L35 118 L50 122 L57 95 Z" fill="url(#boyShirt)" stroke="#CFD9EA" strokeWidth="0.9" />
    <path d="M112 88 L125 118 L110 122 L103 95 Z" fill="url(#boyShirt)" stroke="#CFD9EA" strokeWidth="0.9" />

    {/* Left Breast Pocket with AICS Round Seal */}
    <rect x="91" y="112" width="14" height="16" rx="2" fill="#F4F8FD" stroke="#CBD7EA" strokeWidth="0.9" />
    <circle cx="98" cy="120" r="4.4" fill="#1E469B" />
    <circle cx="98" cy="120" r="3" fill="#F4F8FD" />
    <circle cx="98" cy="120" r="1.3" fill="#1E469B" />

    {/* Blue AICS Lanyard with Yellow Accent */}
    <path d="M72 82 L77 142 M88 82 L83 142" stroke="url(#lanyardBlue)" strokeWidth="3.4" strokeLinecap="round" />
    <line x1="72.8" y1="90" x2="74.5" y2="114" stroke="#FBBF24" strokeWidth="1.3" />
    <line x1="87.2" y1="90" x2="85.5" y2="114" stroke="#FBBF24" strokeWidth="1.3" />
    {/* Hanging ID Badge */}
    <rect x="73" y="142" width="14" height="20" rx="2.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.9" />
    <rect x="73" y="142" width="14" height="5" rx="2" fill="#1E469B" />
    <text x="80" y="145.8" textAnchor="middle" fontSize="3.3" fontWeight="800" fill="#FFFFFF" fontFamily="sans-serif">
      AICS
    </text>
    <circle cx="80" cy="151.5" r="2.5" fill="#94A3B8" />
    <rect x="76" y="156" width="8" height="1.6" rx="0.8" fill="#CBD5E1" />

    {/* Open Convertible Polo Collar */}
    <path d="M66 84 L80 102 L70 82 Z" fill="#FFFFFF" stroke="#CBD7EA" strokeWidth="1" />
    <path d="M94 84 L80 102 L90 82 Z" fill="#FFFFFF" stroke="#CBD7EA" strokeWidth="1" />

    {/* Neck */}
    <rect x="73" y="66" width="14" height="18" rx="3" fill="url(#boySkin)" />

    {/* Head & Face */}
    <ellipse cx="80" cy="54" rx="16.5" ry="19.5" fill="url(#boySkin)" />

    {/* Ears */}
    <ellipse cx="63" cy="55" rx="3.6" ry="5.8" fill="url(#boySkin)" />
    <ellipse cx="97" cy="55" rx="3.6" ry="5.8" fill="url(#boySkin)" />

    {/* Eyebrows */}
    <path d="M68 45 Q73 43 77 46" stroke="#4A3B32" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M83 46 Q87 43 92 45" stroke="#4A3B32" strokeWidth="1.6" strokeLinecap="round" fill="none" />

    {/* Eyes with Blinking Animation */}
    <motion.g
      animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
      transition={{ duration: 3.6, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      style={{ transformOrigin: '80px 51px' }}
    >
      <ellipse cx="73" cy="51" rx="2.3" ry="2.7" fill="#1E1915" />
      <ellipse cx="87" cy="51" rx="2.3" ry="2.7" fill="#1E1915" />
      <circle cx="74" cy="50" r="0.9" fill="#FFFFFF" />
      <circle cx="88" cy="50" r="0.9" fill="#FFFFFF" />
    </motion.g>

    {/* Nose */}
    <path d="M80 52 L78.5 58 L81.5 58" stroke="#DDA888" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

    {/* ANIMATED TALKING MOUTH */}
    <motion.path
      animate={{
        d: [
          'M76 63 Q80 66 84 63',
          'M77 62 Q80 68 83 62',
          'M75 64 Q80 65 85 64',
          'M76 62 Q80 67 84 62',
          'M76 63 Q80 66 84 63',
        ],
      }}
      transition={{
        duration: 0.85,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      stroke="#9E4D40"
      strokeWidth="1.9"
      strokeLinecap="round"
      fill="#6B1D2F"
    />

    {/* Modern Boy Side-Part Hair */}
    <path
      d="M62 50 C60 33 71 25 82 25 C96 25 101 34 98 50 C95 40 91 34 84 33 C76 32 67 36 62 50 Z"
      fill="url(#boyHair)"
    />
    <path d="M63 45 C65 37 72 33 81 33 C89 33 95 37 97 45 C93 41 87 39 81 40 C75 41 68 43 63 45 Z" fill="#3D302A" />
  </svg>
);

/**
 * Pure SVG AICS Girl Student Illustration
 * FIXED & ENHANCED:
 * - Rich, lush, natural long hair with voluminous crown, flowing side locks down past shoulders, and full bangs (hindi kalbo!)
 * - Signature AICS Gray Blouse with Royal Blue piping & AICS Blue pleated skirt
 * - Waving hand & animated talking mouth
 */
export const AicsGirlStudentSvg: React.FC<{ className?: string }> = ({ className = 'w-64 h-96' }) => (
  <svg
    viewBox="0 0 160 260"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.35)] ${className}`}
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
        <stop offset="0%" stopColor="#3A2820" />
        <stop offset="50%" stopColor="#271B15" />
        <stop offset="100%" stopColor="#17100D" />
      </linearGradient>
      <linearGradient id="pipingBlue" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#1E469B" />
        <stop offset="100%" stopColor="#2557BE" />
      </linearGradient>
    </defs>

    {/* Ground Shadow */}
    <ellipse cx="80" cy="252" rx="42" ry="7" fill="#030A1C" opacity="0.35" />

    {/* 1. DEEP BACK HAIR LAYER (LUSH, FULL, REACHING PAST SHOULDERS) */}
    <path
      d="M50 50 C44 76 46 122 55 146 L105 146 C114 122 116 76 110 50 C108 30 98 20 80 20 C62 20 52 30 50 50 Z"
      fill="url(#girlHair)"
    />
    {/* Cascading shoulder locks behind blouse */}
    <path d="M47 70 C43 96 46 130 54 148 C56 142 56 120 52 90 Z" fill="#1C130E" />
    <path d="M113 70 C117 96 114 130 106 148 C104 142 104 120 108 90 Z" fill="#1C130E" />

    {/* Legs with clean black school shoes */}
    <rect x="67" y="195" width="8.5" height="48" rx="4" fill="url(#girlSkin)" />
    <rect x="85" y="195" width="8.5" height="48" rx="4" fill="url(#girlSkin)" />
    <ellipse cx="70" cy="247" rx="9.5" ry="4.5" fill="#111827" />
    <ellipse cx="90" cy="247" rx="9.5" ry="4.5" fill="#111827" />

    {/* Royal Blue AICS SHS Skirt (Pleated) */}
    <path d="M57 146 L103 146 L112 198 L48 198 Z" fill="url(#girlBlueSkirt)" />
    <line x1="64" y1="147" x2="59" y2="198" stroke="#163473" strokeWidth="1.3" />
    <line x1="75" y1="147" x2="73" y2="198" stroke="#163473" strokeWidth="1.3" />
    <line x1="85" y1="147" x2="87" y2="198" stroke="#163473" strokeWidth="1.3" />
    <line x1="96" y1="147" x2="101" y2="198" stroke="#163473" strokeWidth="1.3" />

    {/* Left Arm: ACTIVELY WAVING / GENTLE REASSURING HAND GESTURE */}
    <motion.g
      animate={{
        rotate: [0, 18, -4, 18, 0],
      }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ transformOrigin: '52px 94px' }}
    >
      <path d="M52 94 C38 106 30 114 34 128" stroke="url(#girlSkin)" strokeWidth="9" strokeLinecap="round" />
      <circle cx="34" cy="130" r="5.2" fill="url(#girlSkin)" />
      <path d="M36 126 L39 120 M33 125 L34 117 M30 126 L29 118 M28 128 L25 122" stroke="url(#girlSkin)" strokeWidth="2.2" strokeLinecap="round" />
    </motion.g>

    {/* Right Arm: Holding notebook / comforting pose */}
    <path d="M108 94 C114 114 108 132 96 140" stroke="url(#girlSkin)" strokeWidth="9" strokeLinecap="round" />
    {/* Notebook / folder */}
    <rect x="74" y="128" width="28" height="24" rx="2.5" fill="#1E469B" stroke="#7CB8F7" strokeWidth="1" />
    <rect x="77" y="131" width="22" height="18" rx="1.5" fill="#FFFFFF" />
    <circle cx="95" cy="140" r="4.8" fill="url(#girlSkin)" />

    {/* AICS Gray Blouse Body */}
    <path
      d="M52 88 L108 88 L104 148 L56 148 Z"
      fill="url(#girlGrayBlouse)"
      stroke="#94A3B8"
      strokeWidth="0.9"
    />
    {/* Center Placket */}
    <line x1="80" y1="96" x2="80" y2="148" stroke="#8A96A8" strokeWidth="1.8" />
    <circle cx="80" cy="112" r="1.5" fill="#FFFFFF" />
    <circle cx="80" cy="126" r="1.5" fill="#FFFFFF" />
    <circle cx="80" cy="140" r="1.5" fill="#FFFFFF" />

    {/* Blouse Sleeves with Blue Piping */}
    <path d="M52 88 L40 114 L52 118 L58 94 Z" fill="url(#girlGrayBlouse)" />
    <line x1="40" y1="114" x2="52" y2="118" stroke="url(#pipingBlue)" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M108 88 L120 114 L108 118 L102 94 Z" fill="url(#girlGrayBlouse)" />
    <line x1="120" y1="114" x2="108" y2="118" stroke="url(#pipingBlue)" strokeWidth="2.4" strokeLinecap="round" />

    {/* Left Breast Emblem (AICS Seal) */}
    <circle cx="94" cy="110" r="4" fill="#1E469B" />
    <circle cx="94" cy="110" r="2.6" fill="#FFFFFF" />
    <circle cx="94" cy="110" r="1.2" fill="#1E469B" />

    {/* Blue Lanyard + ID */}
    <path d="M73 82 L77 122 M87 82 L83 122" stroke="url(#pipingBlue)" strokeWidth="3" strokeLinecap="round" />
    <line x1="73.8" y1="90" x2="75" y2="108" stroke="#FBBF24" strokeWidth="1.2" />
    <line x1="86.2" y1="90" x2="85" y2="108" stroke="#FBBF24" strokeWidth="1.2" />
    <rect x="74" y="122" width="12" height="17" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.9" />
    <rect x="74" y="122" width="12" height="4.5" rx="1.5" fill="#1E469B" />
    <text x="80" y="125.5" textAnchor="middle" fontSize="2.9" fontWeight="800" fill="#FFFFFF" fontFamily="sans-serif">
      AICS
    </text>

    {/* Convertible Collar with Royal Blue Piping */}
    <path d="M68 84 L80 100 L72 82 Z" fill="#DCE2EA" stroke="url(#pipingBlue)" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M92 84 L80 100 L88 82 Z" fill="#DCE2EA" stroke="url(#pipingBlue)" strokeWidth="1.5" strokeLinejoin="round" />

    {/* Neck */}
    <rect x="75" y="66" width="11" height="18" rx="2.5" fill="url(#girlSkin)" />

    {/* Head & Face */}
    <ellipse cx="80" cy="54" rx="15" ry="18" fill="url(#girlSkin)" />

    {/* Eyebrows */}
    <path d="M69 46 Q73 44 77 47" stroke="#4A3B32" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    <path d="M83 47 Q87 44 91 46" stroke="#4A3B32" strokeWidth="1.4" strokeLinecap="round" fill="none" />

    {/* Eyes with Blinking Animation */}
    <motion.g
      animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
      transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.5, 0.55, 0.6, 1], delay: 0.8 }}
      style={{ transformOrigin: '80px 52px' }}
    >
      <ellipse cx="73" cy="52" rx="2.2" ry="2.6" fill="#1E1915" />
      <ellipse cx="87" cy="52" rx="2.2" ry="2.6" fill="#1E1915" />
      <circle cx="74" cy="51" r="0.8" fill="#FFFFFF" />
      <circle cx="88" cy="51" r="0.8" fill="#FFFFFF" />
    </motion.g>

    {/* Soft blush */}
    <ellipse cx="69" cy="56" rx="3.6" ry="2.2" fill="#F48FB1" opacity="0.45" />
    <ellipse cx="91" cy="56" rx="3.6" ry="2.2" fill="#F48FB1" opacity="0.45" />

    {/* Nose */}
    <circle cx="80" cy="57" r="1" fill="#DDA888" />

    {/* ANIMATED TALKING MOUTH */}
    <motion.path
      animate={{
        d: [
          'M76 62 Q80 66 84 62',
          'M77 61 Q80 67 83 61',
          'M75 63 Q80 65 85 63',
          'M76 61 Q80 66 84 61',
          'M76 62 Q80 66 84 62',
        ],
      }}
      transition={{
        duration: 0.9,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: 0.2,
      }}
      stroke="#C2415C"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="#8E203C"
    />

    {/* 2. FRONT HAIR CROWN, SOFT BANGS & FRONT STRANDS (FULL & NATURAL) */}
    {/* Full Top Hair Volume (Generously covers forehead & sides so she is never bald) */}
    <path
      d="M57 52 C56 28 66 18 80 18 C94 18 104 28 103 52 C101 44 96 38 88 36 C80 34 72 35 65 42 C60 46 58 50 57 52 Z"
      fill="url(#girlHair)"
    />
    {/* Side locks framing cheeks */}
    <path d="M57 48 C55 64 56 86 60 98 C61 98 62 80 62 65 C62 55 59 50 57 48 Z" fill="#2E1F18" />
    <path d="M103 48 C105 64 104 86 100 98 C99 98 98 80 98 65 C98 55 101 50 103 48 Z" fill="#2E1F18" />

    {/* Stylish Soft Korean/Filipina Bangs */}
    <path
      d="M64 42 Q72 50 78 45 Q84 50 96 42 Q87 36 80 36 Q73 36 64 42 Z"
      fill="#2A1B14"
    />
    <path d="M68 43 Q73 51 77 46" stroke="#1D120D" strokeWidth="1" fill="none" />
    <path d="M83 46 Q87 51 92 43" stroke="#1D120D" strokeWidth="1" fill="none" />
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
    // 10 SECONDS INTERVAL
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
      <div className="flex flex-col items-center justify-end text-center space-y-3 w-72 xl:w-80 select-none">
        {/* Animated Speech Bubble (Boy) */}
        <div className="relative min-h-[85px] w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={boyIndex}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative px-5 py-3.5 rounded-2xl bg-blue-950/90 border-2 border-sky-400/50 text-white shadow-2xl shadow-blue-950/70 backdrop-blur-md text-sm leading-snug font-bold text-center"
            >
              <p className="text-sky-100">
                &ldquo;{currentBoyMsg}&rdquo;
              </p>

              {/* Chat bubble tail */}
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[9px] border-t-blue-950" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Prominent Boy Student SVG Illustration (Larger scale, lifelike presence) */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative pt-1"
        >
          <AicsBoyStudentSvg className="w-56 sm:w-64 xl:w-72 h-80 sm:h-96 xl:h-[420px]" />
        </motion.div>
      </div>
    ),

    girlWing: (
      <div className="flex flex-col items-center justify-end text-center space-y-3 w-72 xl:w-80 select-none">
        {/* Animated Speech Bubble (Girl) */}
        <div className="relative min-h-[85px] w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={girlIndex}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative px-5 py-3.5 rounded-2xl bg-indigo-950/90 border-2 border-teal-400/50 text-white shadow-2xl shadow-indigo-950/70 backdrop-blur-md text-sm leading-snug font-bold text-center"
            >
              <p className="text-teal-100">
                &ldquo;{currentGirlMsg}&rdquo;
              </p>

              {/* Chat bubble tail */}
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[9px] border-t-indigo-950" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Prominent Girl Student SVG Illustration (Larger scale, full lush hair, lifelike presence) */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          className="relative pt-1"
        >
          <AicsGirlStudentSvg className="w-56 sm:w-64 xl:w-72 h-80 sm:h-96 xl:h-[420px]" />
        </motion.div>
      </div>
    ),
  };
};
