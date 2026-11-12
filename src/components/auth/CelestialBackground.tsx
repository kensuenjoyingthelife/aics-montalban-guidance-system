import React, { useMemo, useEffect, useState } from 'react';
import { detectDeviceTier } from '../../services/devicePerformance';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

interface Meteor {
  id: number;
  top: number;
  left: number;
  duration: number;
  delay: number;
}

/**
 * Adaptive Zero-Lag GPU-Composited Celestial + Computer Studies Background:
 * - Rich cosmic elements:
 *   1. Saturn / Ringed Planet with Digital Latitude/Longitude rings
 *   2. Spiral Galaxy with glowing core
 *   3. Cosmic Nebula cloud
 *   4. Holographic Laptop / Code IDE Terminal with </> brackets
 *   5. CPU Microchip / Neural Core with glowing pins
 *   6. Desktop PC Monitor & Workstation
 *   7. Ringed Cyber Moon & Satellite
 *   8. Computer RAM Memory Stick
 *   9. Floating Ethernet / Network Cloud Node
 *   10. Shooting Meteors & Star Dust
 *
 * - Adaptive Low-End Protection:
 *   If detected on a low-end phone or low-spec PC (<=4 cores or prefers-reduced-motion):
 *   - Reduces star count from 52 to 14
 *   - Completely pauses heavy CSS 3D transforms & infinite loops
 *   - Renders lightweight, crisp static SVGs so CPU/GPU load is virtually 0%
 */
export const CelestialBackground: React.FC = () => {
  const [isLowTier, setIsLowTier] = useState<boolean>(false);

  useEffect(() => {
    const tier = detectDeviceTier();
    setIsLowTier(tier.isLowTier);
  }, []);

  // Stars: 52 on high-end, only 14 on low-end
  const stars: Star[] = useMemo(() => {
    const count = isLowTier ? 14 : 52;
    const list: Star[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        x: (i * 19.3 + 4) % 98,
        y: (i * 17.7 + 6) % 92,
        size: i % 5 === 0 ? 3.0 : i % 2 === 0 ? 2.0 : 1.4,
        duration: 3.0 + (i % 5) * 0.8,
        delay: (i % 6) * 0.5,
      });
    }
    return list;
  }, [isLowTier]);

  // Meteors: 5 on high-end, only 1 on low-end
  const meteors: Meteor[] = useMemo(() => {
    if (isLowTier) {
      return [{ id: 1, top: 12, left: 40, duration: 8.0, delay: 1.0 }];
    }
    return [
      { id: 1, top: 8, left: 24, duration: 5.2, delay: 0.6 },
      { id: 2, top: 19, left: 78, duration: 6.8, delay: 2.2 },
      { id: 3, top: 34, left: 52, duration: 6.0, delay: 4.1 },
      { id: 4, top: 62, left: 18, duration: 7.2, delay: 3.5 },
      { id: 5, top: 78, left: 68, duration: 6.4, delay: 5.3 },
    ];
  }, [isLowTier]);

  const floatAnimClass = isLowTier ? '' : 'anim-float-slow';
  const floatReverseClass = isLowTier ? '' : 'anim-float-reverse';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none" aria-hidden="true">
      {/* 1. Deep Cosmic Nebula Glow (Radial Gradients - GPU composited) */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(30,58,138,0.15) 50%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full pointer-events-none opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(30,27,75,0.15) 50%, transparent 70%)',
        }}
      />

      {/* 2. Twinkling Star Drops */}
      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            boxShadow: `0 0 ${star.size * 3}px rgba(186, 230, 253, 0.9)`,
            animation: isLowTier
              ? 'none'
              : `twinkleGlow ${star.duration}s ease-in-out ${star.delay}s infinite alternate`,
          }}
        />
      ))}

      {/* 3. Shooting Meteor Streaks */}
      {!isLowTier &&
        meteors.map((m) => (
          <span
            key={m.id}
            className="meteor-streak absolute h-[1.8px] rounded-full pointer-events-none"
            style={{
              top: `${m.top}%`,
              left: `${m.left}%`,
              width: '140px',
              animation: `meteorFly ${m.duration}s linear ${m.delay}s infinite`,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(147,197,253,0.7) 40%, transparent 100%)',
            }}
          />
        ))}

      {/* ====================================================================
          4. COSMIC PLANETS, GALAXIES & COMPUTER HARDWARE SVG ELEMENTS
          ==================================================================== */}

      {/* Element 1: Giant Ringed Saturn / Cyber Planet (Top-Left) */}
      <div
        className={`absolute top-[8%] left-[4%] w-32 h-32 sm:w-44 sm:h-44 opacity-30 dark:opacity-40 ${floatAnimClass}`}
      >
        <svg viewBox="0 0 160 160" fill="none" className="w-full h-full">
          <defs>
            <radialGradient id="planetSaturnGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="40%" stopColor="#60A5FA" />
              <stop offset="85%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>
            <linearGradient id="saturnRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#E0F2FE" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="42" fill="url(#planetSaturnGrad)" />
          {/* Digital Grid Meridian Lines */}
          <ellipse cx="80" cy="80" rx="20" ry="42" stroke="#E0F2FE" strokeOpacity="0.35" strokeWidth="1.2" />
          <line x1="38" y1="80" x2="122" y2="80" stroke="#E0F2FE" strokeOpacity="0.4" strokeWidth="1.2" />
          <line x1="45" y1="62" x2="115" y2="62" stroke="#E0F2FE" strokeOpacity="0.25" strokeWidth="1" />
          <line x1="45" y1="98" x2="115" y2="98" stroke="#E0F2FE" strokeOpacity="0.25" strokeWidth="1" />
          {/* Outer Luminous Ring */}
          <ellipse
            cx="80"
            cy="80"
            rx="74"
            ry="22"
            transform="rotate(-24 80 80)"
            stroke="url(#saturnRingGrad)"
            strokeWidth="4"
          />
          <circle cx="145" cy="54" r="4" fill="#E0F2FE" />
        </svg>
      </div>

      {/* Element 2: Spiral Galaxy Swirl (Top-Center-Right) */}
      <div
        className={`absolute top-[6%] right-[32%] hidden md:block w-32 h-32 opacity-20 dark:opacity-30 ${floatReverseClass}`}
      >
        <svg viewBox="0 0 140 140" fill="none" className="w-full h-full">
          <defs>
            <radialGradient id="galaxyCenter" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#93C5FD" />
              <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <circle cx="70" cy="70" r="14" fill="url(#galaxyCenter)" />
          {/* Spiral Arms */}
          <path
            d="M70 70 C85 60, 105 70, 115 85 C122 96, 118 112, 105 120"
            stroke="#93C5FD"
            strokeWidth="2.2"
            strokeOpacity="0.6"
            strokeLinecap="round"
          />
          <path
            d="M70 70 C55 80, 35 70, 25 55 C18 44, 22 28, 35 20"
            stroke="#93C5FD"
            strokeWidth="2.2"
            strokeOpacity="0.6"
            strokeLinecap="round"
          />
          <circle cx="115" cy="85" r="2.5" fill="#FFFFFF" />
          <circle cx="25" cy="55" r="2.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Element 3: Floating Microchip / Neural CPU Node (Top-Right) */}
      <div
        className={`absolute top-[14%] right-[6%] hidden sm:block w-24 h-24 opacity-25 dark:opacity-35 ${floatAnimClass}`}
      >
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
          {/* Chip Body */}
          <rect
            x="26"
            y="26"
            width="48"
            height="48"
            rx="10"
            stroke="#93C5FD"
            strokeWidth="2.5"
            fill="rgba(59, 130, 246, 0.14)"
          />
          <rect x="37" y="37" width="26" height="26" rx="5" stroke="#E0F2FE" strokeWidth="2" fill="rgba(147, 197, 253, 0.2)" />
          {/* Circuit Grid inside CPU */}
          <line x1="44" y1="50" x2="56" y2="50" stroke="#E0F2FE" strokeWidth="2" strokeLinecap="round" />
          <line x1="50" y1="44" x2="50" y2="56" stroke="#E0F2FE" strokeWidth="2" strokeLinecap="round" />
          {/* Hardware Pins */}
          <path
            d="M38 14V26M50 14V26M62 14V26M38 74V86M50 74V86M62 74V86M14 38H26M14 50H26M14 62H26M74 38H86M74 50H86M74 62H86"
            stroke="#93C5FD"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Element 4: Floating Holographic Laptop / Code Terminal (Top-Center) */}
      <div
        className={`absolute top-[12%] left-[44%] hidden lg:block w-24 h-24 opacity-22 dark:opacity-30 ${floatReverseClass}`}
      >
        <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
          {/* Screen */}
          <rect
            x="24"
            y="24"
            width="72"
            height="48"
            rx="8"
            stroke="#BAE6FD"
            strokeWidth="2.5"
            fill="rgba(30, 64, 175, 0.16)"
          />
          {/* Code Brackets </> */}
          <path
            d="M48 40L40 48L48 56M72 40L80 48L72 56M63 37L57 59"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Laptop Base */}
          <path d="M14 74H106L98 84H22L14 74Z" fill="#BAE6FD" fillOpacity="0.85" />
        </svg>
      </div>

      {/* Element 5: Desktop Workstation & Monitor (Mid-Left) */}
      <div
        className={`absolute top-[48%] left-[2.5%] hidden lg:block w-24 h-24 opacity-22 dark:opacity-30 ${floatAnimClass}`}
      >
        <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
          <rect
            x="22"
            y="22"
            width="76"
            height="52"
            rx="9"
            stroke="#BAE6FD"
            strokeWidth="2.4"
            fill="rgba(30, 58, 138, 0.18)"
          />
          {/* Prompt lines */}
          <line x1="34" y1="38" x2="56" y2="38" stroke="#E0F2FE" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="34" y1="48" x2="78" y2="48" stroke="#93C5FD" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="34" y1="58" x2="68" y2="58" stroke="#93C5FD" strokeWidth="2.2" strokeLinecap="round" />
          {/* Stand */}
          <path d="M52 74L48 88H72L68 74" stroke="#BAE6FD" strokeWidth="2.2" />
          <line x1="40" y1="88" x2="80" y2="88" stroke="#BAE6FD" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      </div>

      {/* Element 6: Computer RAM Memory Stick (Mid-Right) */}
      <div
        className={`absolute top-[46%] right-[3%] hidden xl:block w-28 h-20 opacity-20 dark:opacity-28 ${floatReverseClass}`}
      >
        <svg viewBox="0 0 140 80" fill="none" className="w-full h-full">
          {/* RAM PCB Board */}
          <rect x="15" y="20" width="110" height="40" rx="5" stroke="#93C5FD" strokeWidth="2" fill="rgba(30, 58, 138, 0.15)" />
          {/* Memory IC Chips */}
          <rect x="25" y="27" width="16" height="24" rx="2" fill="#BAE6FD" fillOpacity="0.5" />
          <rect x="48" y="27" width="16" height="24" rx="2" fill="#BAE6FD" fillOpacity="0.5" />
          <rect x="71" y="27" width="16" height="24" rx="2" fill="#BAE6FD" fillOpacity="0.5" />
          <rect x="94" y="27" width="16" height="24" rx="2" fill="#BAE6FD" fillOpacity="0.5" />
          {/* Golden Pin Contacts at bottom */}
          <line x1="20" y1="60" x2="120" y2="60" stroke="#FBBF24" strokeWidth="2.5" strokeDasharray="3 2" />
        </svg>
      </div>

      {/* Element 7: Ringed Cyber Moon & Satellite (Bottom-Right) */}
      <div
        className={`absolute bottom-[10%] right-[5%] w-32 h-32 sm:w-36 sm:h-36 opacity-30 dark:opacity-40 ${floatAnimClass}`}
      >
        <svg viewBox="0 0 140 140" fill="none" className="w-full h-full">
          <defs>
            <radialGradient id="planetGradMoon" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="90%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0B1528" />
            </radialGradient>
          </defs>
          <circle cx="70" cy="70" r="32" fill="url(#planetGradMoon)" />
          {/* Ring */}
          <ellipse
            cx="70"
            cy="70"
            rx="58"
            ry="16"
            transform="rotate(26 70 70)"
            stroke="#BAE6FD"
            strokeOpacity="0.75"
            strokeWidth="3.2"
          />
          {/* Little Orbiting Satellite */}
          <circle cx="24" cy="40" r="5" fill="#E0F2FE" />
          <line x1="24" y1="40" x2="30" y2="44" stroke="#E0F2FE" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Element 8: Cloud Database Node / Network Server (Bottom-Left) */}
      <div
        className={`absolute bottom-[12%] left-[6%] hidden sm:block w-24 h-24 opacity-22 dark:opacity-30 ${floatReverseClass}`}
      >
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
          {/* Stacked Database Discs */}
          <ellipse cx="50" cy="30" rx="30" ry="10" stroke="#93C5FD" strokeWidth="2.2" fill="rgba(59, 130, 246, 0.15)" />
          <path d="M20 30V48C20 53.5 33.4 58 50 58C66.6 58 80 53.5 80 48V30" stroke="#93C5FD" strokeWidth="2.2" />
          <path d="M20 48V66C20 71.5 33.4 76 50 76C66.6 76 80 71.5 80 66V48" stroke="#93C5FD" strokeWidth="2.2" />
          {/* LED Status Blinkers */}
          <circle cx="70" cy="30" r="2" fill="#34D399" />
          <circle cx="70" cy="48" r="2" fill="#34D399" />
          <circle cx="70" cy="66" r="2" fill="#34D399" />
        </svg>
      </div>
    </div>
  );
};
