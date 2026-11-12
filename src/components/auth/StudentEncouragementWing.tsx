import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AICS Senior High School Student Mental Health & Anti-Bullying Encouragement Wing
 * Expertly proportioned (anatomical scale & tailored school uniforms)
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
 * TAILORED & PROPORTIONATE:
 * - Natural shoulder width (54 to 106, rather than 44 to 116)
 * - Natural torso taper (width 40px at waist)
 * - Proportionate polo length (stops cleanly at waist/hip level ~148)
 * - Proportionate lanyard & badge (12x16px rather than huge 14x20)
 * - Athletic, realistic high-school student frame
 */
export const AicsBoyStudentSvg: React.FC<{ className?: string }> = ({ className = 'w-56 h-88' }) => (
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
        <stop offset="50%" stopColor="#F2F6FC" />
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
    <ellipse cx="80" cy="252" rx="34" ry="6" fill="#030A1C" opacity="0.35" />

    {/* 1. LOWER BODY: SHS Black Trousers (Waist at 144, clean proportion) */}
    <path d="M62 144 L63 248 L76 248 L78 160 L82 160 L84 248 L97 248 L98 144 Z" fill="url(#boyPants)" />
    {/* Black Leather Shoes */}
    <ellipse cx="70" cy="249" rx="8.5" ry="4" fill="#0A0E17" />
    <ellipse cx="91" cy="249" rx="8.5" ry="4" fill="#0A0E17" />

    {/* 2. NECK (Anatomical width 10px) */}
    <rect x="75" y="66" width="10" height="18" rx="2.5" fill="url(#boySkin)" />

    {/* 3. TAILORED SHIRT MAIN BODY (Natural shoulder width 54 to 106, tapers to waist at 148) */}
    <path
      d="M54 82 C62 79 71 78 80 78 C89 78 98 79 106 82 L101 148 C91 150 69 150 59 148 Z"
      fill="url(#boyShirt)"
      stroke="#CFD9EA"
      strokeWidth="0.9"
    />

    {/* Center Placket */}
    <line x1="80" y1="88" x2="80" y2="148" stroke="#CBD7EA" strokeWidth="2" />
    <circle cx="80" cy="106" r="1.5" fill="#A5B8D8" />
    <circle cx="80" cy="122" r="1.5" fill="#A5B8D8" />
    <circle cx="80" cy="138" r="1.5" fill="#A5B8D8" />

    {/* Proportionate Left Breast Pocket with AICS Seal */}
    <rect x="88" y="100" width="10" height="12" rx="1.5" fill="#F4F8FD" stroke="#CBD7EA" strokeWidth="0.8" />
    <circle cx="93" cy="106" r="3" fill="#1E469B" />
    <circle cx="93" cy="106" r="1.8" fill="#F4F8FD" />
    <circle cx="93" cy="106" r="0.8" fill="#1E469B" />

    {/* Proportionate Blue AICS Lanyard with Yellow Accent */}
    <path d="M74 82 L77 124 M86 82 L83 124" stroke="url(#lanyardBlue)" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="74.5" y1="88" x2="75.8" y2="108" stroke="#FBBF24" strokeWidth="1" />
    <line x1="85.5" y1="88" x2="84.2" y2="108" stroke="#FBBF24" strokeWidth="1" />
    {/* Hanging ID Badge (Realistic 10x15 size) */}
    <rect x="75" y="124" width="10" height="15" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.7" />
    <rect x="75" y="124" width="10" height="4" rx="1.2" fill="#1E469B" />
    <text x="80" y="127" textAnchor="middle" fontSize="2.5" fontWeight="800" fill="#FFFFFF" fontFamily="sans-serif">
      AICS
    </text>
    <circle cx="80" cy="132" r="1.8" fill="#94A3B8" />
    <rect x="77" y="135.5" width="6" height="1.2" rx="0.6" fill="#CBD5E1" />

    {/* Open Convertible Polo Collar (Neat & fitted around collarbone) */}
    <path d="M68 82 L80 96 L74 80 Z" fill="#FFFFFF" stroke="#CBD7EA" strokeWidth="1" />
    <path d="M92 82 L80 96 L86 80 Z" fill="#FFFFFF" stroke="#CBD7EA" strokeWidth="1" />

    {/* 4. SLEEVES & ARMS (Naturally proportioned sleeves) */}
    {/* Left Arm & Sleeve */}
    <path d="M54 82 L42 104 L52 108 L58 86 Z" fill="url(#boyShirt)" stroke="#CFD9EA" strokeWidth="0.9" />
    <motion.g
      animate={{ rotate: [0, 2, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '48px 106px' }}
    >
      <path d="M47 106 C43 120 45 134 50 146" stroke="url(#boySkin)" strokeWidth="8" strokeLinecap="round" />
      <circle cx="51" cy="148" r="4.5" fill="url(#boySkin)" />
    </motion.g>

    {/* Right Arm & Sleeve: ACTIVELY WAVING / GESTURING HAND */}
    <path d="M106 82 L118 104 L108 108 L102 86 Z" fill="url(#boyShirt)" stroke="#CFD9EA" strokeWidth="0.9" />
    <motion.g
      animate={{
        rotate: [0, -18, 4, -18, 0],
      }}
      transition={{
        duration: 2.2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ transformOrigin: '112px 106px' }}
    >
      <path d="M113 106 C120 112 125 116 122 128" stroke="url(#boySkin)" strokeWidth="8" strokeLinecap="round" />
      <circle cx="122" cy="130" r="4.5" fill="url(#boySkin)" />
      <path d="M120 127 L118 121 M122 126 L121 119 M124 127 L125 120 M126 129 L128 124" stroke="url(#boySkin)" strokeWidth="1.8" strokeLinecap="round" />
    </motion.g>

    {/* 5. HEAD & FACE */}
    <ellipse cx="80" cy="54" rx="15" ry="17.5" fill="url(#boySkin)" />
    <ellipse cx="64" cy="55" rx="3.2" ry="5.2" fill="url(#boySkin)" />
    <ellipse cx="96" cy="55" rx="3.2" ry="5.2" fill="url(#boySkin)" />

    {/* Eyebrows */}
    <path d="M69 46 Q73 44 77 47" stroke="#4A3B32" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M83 47 Q87 44 91 46" stroke="#4A3B32" strokeWidth="1.5" strokeLinecap="round" fill="none" />

    {/* Eyes with Blinking Animation */}
    <motion.g
      animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
      transition={{ duration: 3.6, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      style={{ transformOrigin: '80px 52px' }}
    >
      <ellipse cx="73.5" cy="52" rx="2" ry="2.4" fill="#1E1915" />
      <ellipse cx="86.5" cy="52" rx="2" ry="2.4" fill="#1E1915" />
      <circle cx="74" cy="51" r="0.7" fill="#FFFFFF" />
      <circle cx="87" cy="51" r="0.7" fill="#FFFFFF" />
    </motion.g>

    {/* Nose */}
    <path d="M80 53 L78.8 58 L81.2 58" stroke="#DDA888" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

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
      strokeWidth="1.7"
      strokeLinecap="round"
      fill="#6B1D2F"
    />

    {/* Modern Boy Side-Part Hair */}
    <path
      d="M64 50 C62 34 72 26 82 26 C94 26 99 35 96 50 C93 41 89 35 83 34 C76 33 68 37 64 50 Z"
      fill="url(#boyHair)"
    />
    <path d="M65 45 C67 38 73 34 81 34 C88 34 93 38 95 45 C91 41 86 39 80 40 C75 41 69 43 65 45 Z" fill="#3D302A" />
  </svg>
);

/**
 * Pure SVG AICS Girl Student Illustration
 * TAILORED & PROPORTIONATE:
 * - Natural feminine shoulder width (56 to 104)
 * - Natural waist tapering at 144
 * - Pleated skirt cleanly fitted to the waist (width 50px expanding to 80px hem)
 * - Beautiful flowing long hair, soft bangs (hindi kalbo!)
 * - Waving hand & animated talking mouth
 */
export const AicsGirlStudentSvg: React.FC<{ className?: string }> = ({ className = 'w-56 h-88' }) => (
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
    <ellipse cx="80" cy="252" rx="34" ry="6" fill="#030A1C" opacity="0.35" />

    {/* 1. DEEP BACK HAIR LAYER (LUSH, FLOWING DOWN PAST SHOULDERS) */}
    <path
      d="M52 50 C48 76 50 120 57 142 L103 142 C110 120 112 76 108 50 C106 30 96 20 80 20 C64 20 54 30 52 50 Z"
      fill="url(#girlHair)"
    />
    <path d="M49 70 C46 94 48 124 55 140 C57 135 57 115 54 88 Z" fill="#1C130E" />
    <path d="M111 70 C114 94 112 124 105 140 C103 135 103 115 106 88 Z" fill="#1C130E" />

    {/* 2. LOWER BODY: Legs & Clean Shoes */}
    <rect x="69" y="192" width="7" height="50" rx="3.5" fill="url(#girlSkin)" />
    <rect x="84" y="192" width="7" height="50" rx="3.5" fill="url(#girlSkin)" />
    <ellipse cx="72" cy="247" rx="8" ry="4" fill="#111827" />
    <ellipse cx="88" cy="247" rx="8" ry="4" fill="#111827" />

    {/* Tailored Pleated Skirt (Fitted at waist 60 to 100, flares naturally to hem 48 to 112) */}
    <path d="M60 144 L100 144 L110 194 L50 194 Z" fill="url(#girlBlueSkirt)" />
    <line x1="66" y1="145" x2="60" y2="194" stroke="#163473" strokeWidth="1.2" />
    <line x1="75" y1="145" x2="73" y2="194" stroke="#163473" strokeWidth="1.2" />
    <line x1="85" y1="145" x2="87" y2="194" stroke="#163473" strokeWidth="1.2" />
    <line x1="94" y1="145" x2="100" y2="194" stroke="#163473" strokeWidth="1.2" />

    {/* 3. NECK & TAILORED BLOUSE BODY (Fitted around the torso) */}
    <rect x="76" y="66" width="8" height="18" rx="2" fill="url(#girlSkin)" />
    <path
      d="M56 82 C64 79 72 78 80 78 C88 78 96 79 104 82 L99 144 C88 146 72 146 61 144 Z"
      fill="url(#girlGrayBlouse)"
      stroke="#94A3B8"
      strokeWidth="0.9"
    />
    {/* Center Placket */}
    <line x1="80" y1="88" x2="80" y2="144" stroke="#8A96A8" strokeWidth="1.8" />
    <circle cx="80" cy="104" r="1.4" fill="#FFFFFF" />
    <circle cx="80" cy="118" r="1.4" fill="#FFFFFF" />
    <circle cx="80" cy="132" r="1.4" fill="#FFFFFF" />

    {/* Left Breast Emblem (AICS Seal) */}
    <circle cx="91" cy="100" r="3.2" fill="#1E469B" />
    <circle cx="91" cy="100" r="2" fill="#FFFFFF" />
    <circle cx="91" cy="100" r="0.9" fill="#1E469B" />

    {/* Blue Lanyard + ID (Proportionate 10x15) */}
    <path d="M74 82 L77 122 M86 82 L83 122" stroke="url(#pipingBlue)" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="74.5" y1="88" x2="75.6" y2="108" stroke="#FBBF24" strokeWidth="1" />
    <line x1="85.5" y1="88" x2="84.4" y2="108" stroke="#FBBF24" strokeWidth="1" />
    <rect x="75" y="122" width="10" height="15" rx="1.8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.7" />
    <rect x="75" y="122" width="10" height="4" rx="1.2" fill="#1E469B" />
    <text x="80" y="125" textAnchor="middle" fontSize="2.5" fontWeight="800" fill="#FFFFFF" fontFamily="sans-serif">
      AICS
    </text>

    {/* Convertible Collar with Royal Blue Piping */}
    <path d="M68 82 L80 96 L74 80 Z" fill="#DCE2EA" stroke="url(#pipingBlue)" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M92 82 L80 96 L86 80 Z" fill="#DCE2EA" stroke="url(#pipingBlue)" strokeWidth="1.3" strokeLinejoin="round" />

    {/* 4. SLEEVES & ARMS */}
    {/* Left Arm: Waving / Reassuring Hand Gesture */}
    <path d="M56 82 L46 104 L55 108 L60 86 Z" fill="url(#girlGrayBlouse)" />
    <line x1="46" y1="104" x2="55" y2="108" stroke="url(#pipingBlue)" strokeWidth="2" strokeLinecap="round" />
    <motion.g
      animate={{
        rotate: [0, 16, -4, 16, 0],
      }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ transformOrigin: '50px 106px' }}
    >
      <path d="M50 106 C42 114 38 120 41 130" stroke="url(#girlSkin)" strokeWidth="7" strokeLinecap="round" />
      <circle cx="41" cy="132" r="4.2" fill="url(#girlSkin)" />
      <path d="M43 128 L45 123 M40 127 L41 121 M38 128 L37 122 M36 130 L34 125" stroke="url(#girlSkin)" strokeWidth="1.6" strokeLinecap="round" />
    </motion.g>

    {/* Right Arm: Holding notebook / comforting pose */}
    <path d="M104 82 L114 104 L105 108 L100 86 Z" fill="url(#girlGrayBlouse)" />
    <line x1="114" y1="104" x2="105" y2="108" stroke="url(#pipingBlue)" strokeWidth="2" strokeLinecap="round" />
    <path d="M109 106 C110 116 104 124 94 132" stroke="url(#girlSkin)" strokeWidth="7" strokeLinecap="round" />
    <rect x="74" y="122" width="22" height="18" rx="2" fill="#1E469B" stroke="#7CB8F7" strokeWidth="0.9" />
    <rect x="76" y="124" width="18" height="14" rx="1.2" fill="#FFFFFF" />
    <circle cx="94" cy="132" r="4" fill="url(#girlSkin)" />

    {/* 5. HEAD & FACE */}
    <ellipse cx="80" cy="54" rx="14" ry="16.5" fill="url(#girlSkin)" />

    {/* Eyebrows */}
    <path d="M70 47 Q73 45 77 48" stroke="#4A3B32" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    <path d="M83 48 Q87 45 90 47" stroke="#4A3B32" strokeWidth="1.3" strokeLinecap="round" fill="none" />

    {/* Eyes with Blinking Animation */}
    <motion.g
      animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
      transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.5, 0.55, 0.6, 1], delay: 0.8 }}
      style={{ transformOrigin: '80px 52px' }}
    >
      <ellipse cx="73.5" cy="52" rx="1.9" ry="2.3" fill="#1E1915" />
      <ellipse cx="86.5" cy="52" rx="1.9" ry="2.3" fill="#1E1915" />
      <circle cx="74" cy="51" r="0.7" fill="#FFFFFF" />
      <circle cx="87" cy="51" r="0.7" fill="#FFFFFF" />
    </motion.g>

    {/* Soft blush */}
    <ellipse cx="70" cy="56" rx="3.2" ry="1.8" fill="#F48FB1" opacity="0.45" />
    <ellipse cx="90" cy="56" rx="3.2" ry="1.8" fill="#F48FB1" opacity="0.45" />

    {/* Nose */}
    <circle cx="80" cy="56.5" r="0.8" fill="#DDA888" />

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
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="#8E203C"
    />

    {/* 6. FRONT HAIR CROWN & BANGS */}
    <path
      d="M58 50 C57 28 66 18 80 18 C94 18 103 28 102 50 C100 42 95 37 87 35 C80 34 73 35 66 41 C62 44 59 48 58 50 Z"
      fill="url(#girlHair)"
    />
    <path d="M58 48 C56 62 57 80 60 92 C61 92 62 76 62 62 C62 53 59 49 58 48 Z" fill="#2E1F18" />
    <path d="M102 48 C104 62 103 80 100 92 C99 92 98 76 98 62 C98 53 101 49 102 48 Z" fill="#2E1F18" />

    {/* Soft Korean/Filipina Bangs */}
    <path
      d="M65 42 Q72 49 78 45 Q84 49 95 42 Q86 36 80 36 Q74 36 65 42 Z"
      fill="#2A1B14"
    />
    <path d="M69 43 Q73 50 77 46" stroke="#1D120D" strokeWidth="0.9" fill="none" />
    <path d="M83 46 Q87 50 91 43" stroke="#1D120D" strokeWidth="0.9" fill="none" />
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
      <div className="flex flex-col items-center justify-end text-center space-y-3 w-64 xl:w-72 select-none">
        {/* Animated Speech Bubble (Boy) */}
        <div className="relative min-h-[85px] w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={boyIndex}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative px-5 py-3.5 rounded-2xl bg-blue-950/90 border-2 border-sky-400/50 text-white shadow-2xl shadow-blue-950/70 backdrop-blur-md text-xs sm:text-sm leading-snug font-bold text-center"
            >
              <p className="text-sky-100">
                &ldquo;{currentBoyMsg}&rdquo;
              </p>
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[9px] border-t-blue-950" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Boy Student SVG Illustration (Proportionate size) */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative pt-1"
        >
          <AicsBoyStudentSvg className="w-52 sm:w-56 xl:w-60 h-76 sm:h-84 xl:h-[360px]" />
        </motion.div>
      </div>
    ),

    girlWing: (
      <div className="flex flex-col items-center justify-end text-center space-y-3 w-64 xl:w-72 select-none">
        {/* Animated Speech Bubble (Girl) */}
        <div className="relative min-h-[85px] w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={girlIndex}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative px-5 py-3.5 rounded-2xl bg-indigo-950/90 border-2 border-teal-400/50 text-white shadow-2xl shadow-indigo-950/70 backdrop-blur-md text-xs sm:text-sm leading-snug font-bold text-center"
            >
              <p className="text-teal-100">
                &ldquo;{currentGirlMsg}&rdquo;
              </p>
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[9px] border-t-indigo-950" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Girl Student SVG Illustration (Proportionate size) */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          className="relative pt-1"
        >
          <AicsGirlStudentSvg className="w-52 sm:w-56 xl:w-60 h-76 sm:h-84 xl:h-[360px]" />
        </motion.div>
      </div>
    ),
  };
};
