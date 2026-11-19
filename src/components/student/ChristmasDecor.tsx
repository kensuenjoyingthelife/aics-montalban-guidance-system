import React from 'react';
import { christmasOn } from '../../config/seasonalTheme';

// every part below is drawn only when the ONE switch says so (src/config/seasonalTheme.ts)

const BULBS = ['#FF3B30', '#FFCC00', '#34C759', '#0A84FF', '#FF9500', '#FF2D55'];

/**
 * Christmas lights on a sagging wire. Drawn on a wide canvas and cropped (never stretched),
 * so the bulbs keep their shape on a phone or a wide monitor. Twinkle = opacity only.
 */
export const ChristmasLights: React.FC<{ className?: string }> = ({ className = '' }) => {
  if (!christmasOn()) return null;
  const w = 1800;
  const gap = 34;
  const n = Math.floor(w / gap);
  const wy = (x: number) => 4 + 7 * Math.abs(Math.sin((x / 170) * Math.PI));
  const wire = Array.from({ length: 181 }, (_, i) => `${i * 10},${wy(i * 10).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} 28`} preserveAspectRatio="xMidYMin slice" aria-hidden="true" className={`xmas-lights pointer-events-none ${className}`}>
      <polyline points={wire} fill="none" stroke="#2F4F2F" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      {Array.from({ length: n }, (_, i) => {
        const x = gap / 2 + i * gap;
        const y = wy(x);
        const c = BULBS[i % BULBS.length];
        return (
          <g key={i} transform={`translate(${x} ${y.toFixed(1)})`}>
            <rect x="-2" y="-1" width="4" height="4" rx="1" fill="#3A3A3C" />
            <ellipse cx="0" cy="8" rx="4.2" ry="6" fill={c} className="xmas-bulb" style={{ animationDelay: `${(i % 4) * 0.45}s` }} />
            <ellipse cx="-1.4" cy="6" rx="1.2" ry="2" fill="#FFFFFF" opacity="0.55" />
          </g>
        );
      })}
    </svg>
  );
};

/** Small holly sprig for a corner (phone header). */
export const HollySprig: React.FC<{ className?: string }> = ({ className = '' }) => {
  if (!christmasOn()) return null;
  return (
    <svg viewBox="0 0 48 32" aria-hidden="true" className={`pointer-events-none ${className}`}>
      <path d="M22 18 C14 6 6 8 2 4 C6 10 4 14 8 18 C10 14 14 16 16 20 C18 16 20 18 22 18Z" fill="#1F8A3A" />
      <path d="M26 18 C34 6 42 8 46 4 C42 10 44 14 40 18 C38 14 34 16 32 20 C30 16 28 18 26 18Z" fill="#2BA84A" />
      <circle cx="20" cy="22" r="4" fill="#E0242B" />
      <circle cx="28" cy="22" r="4" fill="#FF3B30" />
      <circle cx="24" cy="27" r="4" fill="#C81D25" />
      <circle cx="18.8" cy="20.8" r="1.1" fill="#FFFFFF" opacity="0.7" />
      <circle cx="26.8" cy="20.8" r="1.1" fill="#FFFFFF" opacity="0.7" />
    </svg>
  );
};

/**
 * Parol: the Filipino Christmas star lantern (5-point star in a ring, with two tails).
 * Hangs from a thin string. The glow breathes with opacity only.
 */
export const Parol: React.FC<{ className?: string; color?: 'red' | 'gold' | 'blue' | 'green'; delay?: number }> = ({ className = '', color = 'red', delay = 0 }) => {
  if (!christmasOn()) return null;
  const pal = {
    red: ['#FF3B30', '#FFD60A'],
    gold: ['#FFCC00', '#FF3B30'],
    blue: ['#0A84FF', '#FFD60A'],
    green: ['#34C759', '#FF3B30'],
  }[color];
  // 5-point star around (32, 40), outer 20, inner 8.5
  const star = (R: number, r: number) =>
    Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? R : r;
      return `${(32 + rad * Math.cos(a)).toFixed(2)},${(40 + rad * Math.sin(a)).toFixed(2)}`;
    }).join(' ');
  return (
    <svg viewBox="0 0 64 104" aria-hidden="true" className={`pointer-events-none ${className}`}>
      <line x1="32" y1="0" x2="32" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <circle cx="32" cy="40" r="25" fill={pal[0]} opacity="0.18" className="xmas-glow" style={{ animationDelay: `${delay}s` }} />
      <circle cx="32" cy="40" r="22.5" fill="none" stroke={pal[1]} strokeWidth="2.2" />
      <polygon points={star(21, 9)} fill={pal[0]} stroke={pal[1]} strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points={star(10, 4.2)} fill={pal[1]} opacity="0.9" />
      <circle cx="32" cy="40" r="2.6" fill="#FFFFFF" />
      {/* tails */}
      <path d="M26 62 C 24 72 28 80 22 92" fill="none" stroke={pal[0]} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M38 62 C 40 72 36 80 42 92" fill="none" stroke={pal[1]} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M32 63 C 32 74 32 84 32 100" fill="none" stroke={pal[0]} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
};

/** "Maligayang Pasko!" greeting pill. */
export const PaskoGreeting: React.FC<{ className?: string; isTl?: boolean }> = ({ className = '', isTl = false }) => {
  if (!christmasOn()) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[13px] font-semibold text-white bg-gradient-to-r from-[#C81D25] to-[#E0242B] shadow-[0_6px_16px_-8px_rgba(200,29,37,0.8)] ${className}`}>
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" aria-hidden="true"><polygon points="12,2 14.6,9 22,9 16,13.6 18.2,21 12,16.6 5.8,21 8,13.6 2,9 9.4,9" fill="#FFD60A" /></svg>
      Maligayang Pasko!<span className="font-normal opacity-90">· {paskoCountdown(isTl)}</span>
    </span>
  );
};

/** Days left to Christmas, or the Simbang Gabi night (Dec 16–24 = nights 1–9). */
export const paskoCountdown = (isTl: boolean, now = new Date()): string => {
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const xmas = new Date(y, 11, 25);
  const m = now.getMonth();
  const d = now.getDate();
  if (m === 11 && d >= 16 && d <= 24) return isTl ? `Simbang Gabi: gabi ${d - 15} ng 9` : `Simbang Gabi: night ${d - 15} of 9`;
  if (m === 11 && d === 25) return isTl ? 'Pasko na!' : 'It is Christmas!';
  if (now > xmas) return isTl ? 'Manigong Bagong Taon!' : 'Happy New Year!';
  const days = Math.ceil((xmas.getTime() - new Date(now.getFullYear(), m, d).getTime()) / 86400000);
  return isTl ? `${days} araw na lang bago mag-Pasko` : `${days} days to Christmas`;
};

/** Small chip with the countdown (phone Home). */
export const PaskoChip: React.FC<{ isTl: boolean; className?: string }> = ({ isTl, className = '' }) => {
  if (!christmasOn()) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12.5px] font-semibold text-white bg-gradient-to-r from-[#C81D25] to-[#E0242B] ${className}`}>
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" aria-hidden="true"><polygon points="12,2 14.6,9 22,9 16,13.6 18.2,21 12,16.6 5.8,21 8,13.6 2,9 9.4,9" fill="#FFD60A" /></svg>
      {paskoCountdown(isTl)}
    </span>
  );
};

/** Holly for a card corner: sits on the rounded corner, never over the text. */
export const CardHolly: React.FC<{ className?: string }> = ({ className = '' }) => (
  <HollySprig className={`absolute -top-2.5 -left-1.5 w-10 h-7 z-[3] drop-shadow-sm ${className}`} />
);
