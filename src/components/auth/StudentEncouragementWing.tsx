import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AICS Senior High School Student Mental Health & Anti-Bullying Encouragement Wing
 * Written with clinical empathy as Senior Mental Health Specialist / Adolescent Guidance Counselor.
 *
 * Left (Boy Student): Focused on encouraging students to open up, speak up about bullying, and break the silence.
 * Right (Girl Student): Focused on mental wellness, self-worth, emotional relief, validation, and healing.
 */

// Boy Student Messages: Breaking Silence, Anti-Bullying Courage, Speaking Up
export const BOY_ENCOURAGEMENTS = [
  {
    tl: 'Hindi mo kailangang sarilinin ang sakit. Ang pagsasabi ng totoo ay hindi karuwagan—ito ay tapang.',
    en: "You don't have to carry the burden alone. Speaking up is never weakness—it takes real courage.",
  },
  {
    tl: 'Kung nakaranas ka o ang kaibigan mo ng pambu-bully, ligtas ka rito. May mga guro at guidance na handang makinig.',
    en: 'If you or your friend are facing bullying, you are safe here. Our guidance counselors are ready to protect you.',
  },
  {
    tl: 'Ang pananahimik ay nagbibigay ng lakas sa nambu-bully. Putulin natin ang takot—ilapit mo ang iyong kwento.',
    en: 'Silence protects the bully, not you. Break the fear—share your experience in complete confidentiality.',
  },
  {
    tl: 'Hindi mo kasalanan ang ginawa nila sa iyo. Karapatan mong mag-aral nang mapayapa at may dignidad.',
    en: 'What happened to you was never your fault. You have the full right to study in peace and dignity.',
  },
  {
    tl: 'Maliit man o malaki ang nararanasan mong panunukso o pananakit, mahalaga ang boses mo sa amin.',
    en: 'Whether it feels small or overwhelming, your safety and your voice matter deeply to us.',
  },
  {
    tl: 'Walang makakaalam na ikaw ang nag-report. Ang iyong kaligtasan at tiwala ang aming unang tungkulin.',
    en: 'Your identity stays strictly protected. Your safety and peace of mind are our highest commitment.',
  },
];

// Girl Student Messages: Emotional Relief, Self-Worth, Healing & Mental Well-Being
export const GIRL_ENCOURAGEMENTS = [
  {
    tl: 'Huminga ka nang malalim. Valid ang lahat ng nararamdaman mo, at hindi ka nag-iisa sa laban na ito.',
    en: 'Take a gentle breath. Everything you feel is completely valid, and you do not have to fight alone.',
  },
  {
    tl: 'Walang sinumang salita o paninira ang makapagdidikta ng iyong tunay na halaga bilang tao.',
    en: 'No cruel words or judgments can ever define your genuine worth and potential as a human being.',
  },
  {
    tl: 'Gagaan din ang dibdib mo. Ang paghingi ng tulong sa guidance ay unang hakbang patungo sa paghilom.',
    en: 'Your heart will feel light again. Reaching out to guidance is the first empowering step toward healing.',
  },
  {
    tl: 'Magpahinga kung pagod, ngunit huwag susuko. May magandang kinabukasan na naghihintay sa iyo.',
    en: 'Rest when you are exhausted, but never give up. A brighter, safer tomorrow is waiting for you.',
  },
  {
    tl: 'Nandito kami hindi para humusga, kundi para makinig nang buong puso at gabayan ka nang ligtas.',
    en: 'We are here not to judge, but to listen with complete compassion and keep you protected.',
  },
  {
    tl: 'Mahalaga ka sa pamilya ng AICS. Karapatan mong maramdaman ang kaligtasan at pagmamalasakit araw-araw.',
    en: 'You are valued in our AICS family. You deserve to feel safe, respected, and cared for every single day.',
  },
];

/**
 * Pure SVG AICS Boy Student Illustration
 * Based on the official AICS Senior High School uniform reference:
 * - Crisp White/Pale-Sky polo with open convertible collar & crisp short sleeves
 * - Royal Blue AICS neck lanyard with yellow ID accent ("AICS SENIOR HIGH SCHOOL")
 * - Left breast pocket with circular AICS institutional seal badge
 * - Smart black SHS trousers & neat youthful hairstyle
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

    {/* Soft subtle ground shadow */}
    <ellipse cx="80" cy="252" rx="36" ry="6" fill="#030A1C" opacity="0.4" />

    {/* SHS Black Trousers */}
    <path d="M58 168 L60 248 L76 248 L79 178 L82 178 L85 248 L101 248 L103 168 Z" fill="url(#boyPants)" />
    {/* Clean black leather shoes */}
    <ellipse cx="68" cy="249" rx="10" ry="4.5" fill="#0A0E17" />
    <ellipse cx="93" cy="249" rx="10" ry="4.5" fill="#0A0E17" />

    {/* Arms & Hands (Supportive / Welcoming Open Posture) */}
    {/* Left Arm (Relaxed at side) */}
    <path d="M48 94 C42 115 42 135 48 152" stroke="url(#boySkin)" strokeWidth="10" strokeLinecap="round" />
    <circle cx="49" cy="155" r="5.5" fill="url(#boySkin)" />

    {/* Right Arm (Hand gesturing gently to heart / encouragement) */}
    <path d="M112 94 C120 114 116 130 102 140" stroke="url(#boySkin)" strokeWidth="10" strokeLinecap="round" />
    <circle cx="100" cy="141" r="5.5" fill="url(#boySkin)" />

    {/* White AICS SHS Polo Body */}
    <path
      d="M48 88 L112 88 L116 172 L44 172 Z"
      fill="url(#boyShirt)"
      stroke="#CFD9EA"
      strokeWidth="0.8"
    />
    {/* Shirt Placket (Center button line) */}
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

    {/* Blue AICS Lanyard with Yellow Accent Text */}
    <path d="M72 82 L77 142 M88 82 L83 142" stroke="url(#lanyardBlue)" strokeWidth="3.2" strokeLinecap="round" />
    {/* Yellow lanyard text stripe */}
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

    {/* Kind, Empathetic Facial Expression */}
    {/* Eyebrows */}
    <path d="M68 45 Q73 43 77 46" stroke="#4A3B32" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M83 46 Q87 43 92 45" stroke="#4A3B32" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Eyes (Warm & attentive) */}
    <ellipse cx="73" cy="51" rx="2.2" ry="2.6" fill="#1E1915" />
    <ellipse cx="87" cy="51" rx="2.2" ry="2.6" fill="#1E1915" />
    <circle cx="74" cy="50" r="0.8" fill="#FFFFFF" />
    <circle cx="88" cy="50" r="0.8" fill="#FFFFFF" />
    {/* Nose */}
    <path d="M80 52 L78.5 58 L81.5 58" stroke="#DDA888" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Gentle, Reassuring Smile */}
    <path d="M75 63 Q80 67 85 63" stroke="#9E4D40" strokeWidth="1.6" strokeLinecap="round" fill="none" />

    {/* Modern Boy Side-Part Hair */}
    <path
      d="M63 50 C61 34 72 26 82 26 C95 26 100 35 97 50 C94 40 91 35 84 34 C76 33 68 37 63 50 Z"
      fill="url(#boyHair)"
    />
    <path d="M64 45 C66 38 72 34 80 34 C88 34 94 38 96 46 C92 42 86 40 80 41 C74 42 68 44 64 45 Z" fill="#3D302A" />
  </svg>
);

/**
 * Pure SVG AICS Girl Student Illustration
 * Based on the official AICS Senior High School uniform reference:
 * - AICS Signature Gray Blouse with Royal Blue piping along collar, front, & sleeves
 * - Royal Blue AICS neck lanyard with yellow ID accent
 * - Left breast badge with official AICS seal
 * - AICS Royal Blue pleated SHS skirt
 * - Warm, attentive, compassionate counseling expression
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

    {/* Soft ground shadow */}
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
    {/* Pleat Lines */}
    <line x1="64" y1="147" x2="59" y2="198" stroke="#163473" strokeWidth="1.2" />
    <line x1="75" y1="147" x2="73" y2="198" stroke="#163473" strokeWidth="1.2" />
    <line x1="85" y1="147" x2="87" y2="198" stroke="#163473" strokeWidth="1.2" />
    <line x1="96" y1="147" x2="101" y2="198" stroke="#163473" strokeWidth="1.2" />

    {/* Arms holding school notebook / clipboard gently */}
    {/* Left Arm */}
    <path d="M52 94 C46 114 52 132 64 140" stroke="url(#girlSkin)" strokeWidth="8.5" strokeLinecap="round" />
    {/* Right Arm */}
    <path d="M108 94 C114 114 108 132 96 140" stroke="url(#girlSkin)" strokeWidth="8.5" strokeLinecap="round" />

    {/* School Portfolio / Diary in Hands */}
    <rect x="62" y="128" width="36" height="26" rx="3" fill="#1E469B" stroke="#7CB8F7" strokeWidth="1" />
    <rect x="65" y="131" width="30" height="20" rx="1.5" fill="#FFFFFF" />
    <line x1="70" y1="137" x2="88" y2="137" stroke="#94A3B8" strokeWidth="1.2" />
    <line x1="70" y1="142" x2="84" y2="142" stroke="#94A3B8" strokeWidth="1.2" />

    {/* Hands overlapping the notebook */}
    <circle cx="65" cy="140" r="4.8" fill="url(#girlSkin)" />
    <circle cx="95" cy="140" r="4.8" fill="url(#girlSkin)" />

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

    {/* Blouse Sleeves with Blue Piping at cuff */}
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

    {/* Gentle Warm Facial Features */}
    {/* Eyebrows */}
    <path d="M69 46 Q73 44 77 47" stroke="#4A3B32" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    <path d="M83 47 Q87 44 91 46" stroke="#4A3B32" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    {/* Soft, Caring Eyes */}
    <ellipse cx="73" cy="52" rx="2" ry="2.4" fill="#1E1915" />
    <ellipse cx="87" cy="52" rx="2" ry="2.4" fill="#1E1915" />
    <circle cx="74" cy="51" r="0.7" fill="#FFFFFF" />
    <circle cx="88" cy="51" r="0.7" fill="#FFFFFF" />
    {/* Gentle blush */}
    <ellipse cx="69" cy="56" rx="3.5" ry="2" fill="#F48FB1" opacity="0.45" />
    <ellipse cx="91" cy="56" rx="3.5" ry="2" fill="#F48FB1" opacity="0.45" />
    {/* Nose & Warm, Comforting Smile */}
    <circle cx="80" cy="57" r="0.9" fill="#DDA888" />
    <path d="M75 62 Q80 66 85 62" stroke="#C2415C" strokeWidth="1.6" strokeLinecap="round" fill="none" />

    {/* Girl Hair Front Layer (Soft Bangs & Long Straight Cut) */}
    <path
      d="M62 48 C63 32 72 26 80 26 C88 26 97 32 98 48 C94 40 88 38 80 38 C72 38 66 40 62 48 Z"
      fill="url(#girlHair)"
    />
    {/* Soft Bangs */}
    <path d="M68 40 Q75 48 80 43 Q85 48 92 40 Z" fill="#241914" />
  </svg>
);

/**
 * Animated Interactive Student Support Wing Hook / Component
 * Placed on Left and Right sides of the Login card.
 * Cycles inspiring, clinically thoughtful counseling messages every 5 seconds.
 */
export const useStudentEncouragementWings = ({ isTl = true }: { isTl?: boolean }) => {
  const [boyIndex, setBoyIndex] = useState(0);
  const [girlIndex, setGirlIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBoyIndex((prev) => (prev + 1) % BOY_ENCOURAGEMENTS.length);
      setGirlIndex((prev) => (prev + 1) % GIRL_ENCOURAGEMENTS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const currentBoyMsg = BOY_ENCOURAGEMENTS[boyIndex];
  const currentGirlMsg = GIRL_ENCOURAGEMENTS[girlIndex];

  return {
    boyWing: (
      <div className="flex flex-col items-center justify-end text-center space-y-3 w-64 xl:w-72 select-none">
        {/* Animated Speech Bubble (Boy - Anti-Bullying Courage) */}
        <div className="relative min-h-[110px] w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={boyIndex}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative p-4 rounded-2xl bg-blue-950/80 border border-blue-400/40 text-blue-100 shadow-xl shadow-blue-950/60 backdrop-blur-md text-xs leading-relaxed font-semibold text-center"
            >
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-300 font-extrabold mb-1.5">
                <span>🛡️</span>
                <span>{isTl ? 'Lakas ng Loob at Katotohanan' : 'Courage to Speak Up'}</span>
              </div>
              <p className="text-white/95">
                &ldquo;{isTl ? currentBoyMsg.tl : currentBoyMsg.en}&rdquo;
              </p>

              {/* Chat bubble tail pointing downward to student */}
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-blue-950/90" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Boy Student SVG Illustration with gentle hovering breathing animation */}
        <motion.div
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 4.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative pt-2"
        >
          <AicsBoyStudentSvg className="w-48 sm:w-52 h-64 sm:h-72" />
          <div className="mt-1 text-[11px] font-extrabold tracking-wide uppercase text-blue-300/80">
            AICS SHS Peer Advocate
          </div>
        </motion.div>
      </div>
    ),

    girlWing: (
      <div className="flex flex-col items-center justify-end text-center space-y-3 w-64 xl:w-72 select-none">
        {/* Animated Speech Bubble (Girl - Mental Health & Relief) */}
        <div className="relative min-h-[110px] w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={girlIndex}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative p-4 rounded-2xl bg-indigo-950/80 border border-teal-400/40 text-teal-100 shadow-xl shadow-indigo-950/60 backdrop-blur-md text-xs leading-relaxed font-semibold text-center"
            >
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-teal-300 font-extrabold mb-1.5">
                <span>🌱</span>
                <span>{isTl ? 'Kagalingan at Halaga Mo' : 'Healing & Mental Wellness'}</span>
              </div>
              <p className="text-white/95">
                &ldquo;{isTl ? currentGirlMsg.tl : currentGirlMsg.en}&rdquo;
              </p>

              {/* Chat bubble tail pointing downward to student */}
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-indigo-950/90" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Girl Student SVG Illustration with gentle hovering breathing animation */}
        <motion.div
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 4.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
          className="relative pt-2"
        >
          <AicsGirlStudentSvg className="w-48 sm:w-52 h-64 sm:h-72" />
          <div className="mt-1 text-[11px] font-extrabold tracking-wide uppercase text-teal-300/80">
            AICS Peer Wellness Ally
          </div>
        </motion.div>
      </div>
    ),
  };
};
