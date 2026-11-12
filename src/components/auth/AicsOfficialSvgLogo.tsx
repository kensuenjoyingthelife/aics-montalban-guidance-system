import React from 'react';

interface Props {
  className?: string;
  size?: number;
}

/**
 * Official Asian Institute of Computer Studies (AICS) Seal & Logo
 * Features:
 * - AICS Deep Oxford Navy (#0B1F4D) outer ring
 * - AICS Royal Cobalt Blue (#1E469B) inner crest & shield
 * - AICS Sky Azure (#4E92DF / #7CB8F7) horizon waves & radiance
 * - AICS Silver-White (#F4F7FC / #FFFFFF) central badge with "1996"
 * - High-tech circuitry & data-ring nodes
 */
export const AicsOfficialSvgLogo: React.FC<Props> = ({ className = 'w-24 h-24', size = 120 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Core Blue Radial Glow */}
        <radialGradient id="aicsCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7CB8F7" stopOpacity="0.8" />
          <stop offset="45%" stopColor="#2557BE" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0B1F4D" stopOpacity="0" />
        </radialGradient>

        {/* Shield Metallic Gradient */}
        <linearGradient id="aicsShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E469B" />
          <stop offset="50%" stopColor="#132E6B" />
          <stop offset="100%" stopColor="#081534" />
        </linearGradient>

        {/* Gold/Silver Accent Edge */}
        <linearGradient id="aicsAccentEdge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CFD9F2" />
          <stop offset="50%" stopColor="#7CB8F7" />
          <stop offset="100%" stopColor="#2557BE" />
        </linearGradient>

        {/* Cyber Neon Sweep */}
        <linearGradient id="aicsNeonSweep" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#4E92DF" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4E92DF" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Outer Glow Halo */}
      <circle cx="120" cy="120" r="112" fill="url(#aicsCoreGlow)" />

      {/* Outer Orbit Ring with Ticks */}
      <circle
        cx="120"
        cy="120"
        r="104"
        stroke="url(#aicsAccentEdge)"
        strokeWidth="3.5"
        strokeDasharray="6 4"
        opacity="0.85"
      />

      {/* Solid Outer Ring */}
      <circle
        cx="120"
        cy="120"
        r="94"
        fill="#071434"
        stroke="#4E92DF"
        strokeWidth="2.5"
      />

      {/* Curvature Text: ASIAN INSTITUTE OF COMPUTER STUDIES */}
      <path
        id="aicsTextPathTop"
        d="M 38 120 A 82 82 0 0 1 202 120"
        fill="none"
      />
      <text
        fill="#FFFFFF"
        fontSize="10"
        fontWeight="800"
        letterSpacing="2.6"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
      >
        <textPath href="#aicsTextPathTop" startOffset="50%" textAnchor="middle">
          ASIAN INSTITUTE OF COMPUTER STUDIES
        </textPath>
      </text>

      {/* Curvature Text: MONTALBAN CAMPUS · 1996 */}
      <path
        id="aicsTextPathBottom"
        d="M 202 120 A 82 82 0 0 1 38 120"
        fill="none"
      />
      <text
        fill="#7CB8F7"
        fontSize="8.5"
        fontWeight="800"
        letterSpacing="3"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
      >
        <textPath href="#aicsTextPathBottom" startOffset="50%" textAnchor="middle">
          ★ MONTALBAN · EXCELLENCE ★
        </textPath>
      </text>

      {/* Inner Central Shield */}
      <g transform="translate(120 120)">
        {/* Shield Body */}
        <path
          d="M 0 -58 L 48 -32 L 48 18 C 48 48 0 66 0 66 C 0 66 -48 48 -48 18 L -48 -32 Z"
          fill="url(#aicsShieldGrad)"
          stroke="#7CB8F7"
          strokeWidth="3"
        />

        {/* 3 Tech Peaks / Waves inside Shield (Representing Computer Science & Studies) */}
        <path
          d="M -36 12 C -20 -10 -4 20 0 6 C 6 -10 24 16 36 10 C 38 28 0 52 0 52 C 0 52 -38 28 -36 12 Z"
          fill="#1E469B"
          opacity="0.8"
        />

        <path
          d="M -28 -12 L 0 -34 L 28 -12 L 18 -10 L 0 -24 L -18 -10 Z"
          fill="#4E92DF"
        />

        {/* Central Monogram: AICS */}
        <text
          x="0"
          y="-2"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="17"
          fontWeight="900"
          letterSpacing="1.5"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        >
          AICS
        </text>

        {/* Year of Foundation: 1996 Badge */}
        <rect
          x="-22"
          y="16"
          width="44"
          height="14"
          rx="7"
          fill="#0B1F4D"
          stroke="#7CB8F7"
          strokeWidth="1.5"
        />
        <text
          x="0"
          y="27"
          textAnchor="middle"
          fill="#9BCBFF"
          fontSize="9"
          fontWeight="800"
          letterSpacing="1.5"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        >
          1996
        </text>

        {/* Decorative Laurel / Circuit Stars */}
        <circle cx="-38" cy="-8" r="2" fill="#7CB8F7" />
        <circle cx="38" cy="-8" r="2" fill="#7CB8F7" />
        <circle cx="-32" cy="18" r="2" fill="#7CB8F7" />
        <circle cx="32" cy="18" r="2" fill="#7CB8F7" />
      </g>
    </svg>
  );
};
