import React from 'react';

/**
 * Original "profile scanning" illustration for the Masterlist import.
 * Two guidance staff in the AICS girls' uniform (gray blouse, blue piping, blue lanyard + ID)
 * scan a feed of student profile cards.
 *
 * Pure SVG + CSS keyframes (transform/opacity only → GPU, no layout work, no library).
 * Respects prefers-reduced-motion. Works in light and dark mode.
 */

type GirlProps = {
  x: number;
  y: number;
  flip?: boolean;
  hair: 'bob' | 'pony';
  skin: string;
  pose: 'point' | 'tablet';
};

const UNIFORM = '#A9B1BC';
const UNIFORM_SHADE = '#8F98A5';
const PIPING = '#1E4FA8';
const HAIR = '#2B1B14';

/** Girl in AICS uniform, drawn facing right (+x). Origin = between the feet. */
const Girl: React.FC<GirlProps> = ({ x, y, flip, hair, skin, pose }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1) translate(0 -150)`}>
    {/* ponytail behind the head */}
    {hair === 'pony' && (
      <path className="scan-pony" d="M-10 12 C-24 16 -26 34 -16 44 C-14 34 -12 24 -6 18 Z" fill={HAIR} />
    )}
    {/* bob hair back layer */}
    {hair === 'bob' && <path d="M-14 12 C-16 30 -14 34 -12 36 L12 36 C14 34 16 30 14 12 Z" fill={HAIR} />}

    {/* legs + shoes */}
    <rect x="-8.5" y="112" width="6" height="34" rx="3" fill={skin} />
    <rect x="2.5" y="112" width="6" height="34" rx="3" fill={skin} />
    <ellipse cx="-6" cy="148" rx="6" ry="2.6" fill="#111827" />
    <ellipse cx="6" cy="148" rx="6" ry="2.6" fill="#111827" />

    {/* skirt */}
    <path d="M-16 84 L16 84 L19 118 L-19 118 Z" className="fill-[#1C2A4A] dark:fill-[#3A5185]" />

    {/* back arm (resting) */}
    <path d="M-20 40 C-26 54 -26 70 -22 86" stroke={skin} strokeWidth="6" strokeLinecap="round" fill="none" />
    <circle cx="-22" cy="88" r="3.6" fill={skin} />

    {/* blouse */}
    <path d="M-19 36 C-19 33 -16 31 -12 31 L12 31 C16 31 19 33 19 36 L17 88 L-17 88 Z" fill={UNIFORM} />
    <path d="M10 31 C16 31 19 33 19 36 L17 88 L12 88 Z" fill={UNIFORM_SHADE} opacity="0.55" />
    {/* placket + buttons */}
    <line x1="0" y1="44" x2="0" y2="86" stroke={UNIFORM_SHADE} strokeWidth="1" />
    <circle cx="0" cy="56" r="0.9" fill="#E5E7EB" />
    <circle cx="0" cy="68" r="0.9" fill="#E5E7EB" />
    {/* sleeves with blue piping */}
    <path d="M-19 35 L-27 50 L-19 53 Z" fill={UNIFORM} />
    <line x1="-27" y1="50" x2="-19" y2="53" stroke={PIPING} strokeWidth="1.6" strokeLinecap="round" />
    <path d="M19 35 L27 50 L19 53 Z" fill={UNIFORM_SHADE} />
    <line x1="27" y1="50" x2="19" y2="53" stroke={PIPING} strokeWidth="1.6" strokeLinecap="round" />

    {/* neck */}
    <rect x="-3.5" y="24" width="7" height="9" rx="2" fill={skin} />
    {/* collar (convertible collar with blue piping) */}
    <path d="M-12 31 L-1.5 44 L-4 31 Z" fill="#C3CAD3" stroke={PIPING} strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M12 31 L1.5 44 L4 31 Z" fill="#C3CAD3" stroke={PIPING} strokeWidth="1.3" strokeLinejoin="round" />

    {/* blue lanyard + ID */}
    <path d="M-5 31 L-2 60 M5 31 L2 60" stroke={PIPING} strokeWidth="2" strokeLinecap="round" />
    <g className="scan-id">
      <rect x="-6.5" y="60" width="13" height="17" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.6" />
      <rect x="-6.5" y="60" width="13" height="5" rx="2" fill={PIPING} />
      {/* "AICS" on the ID band, like the real school ID */}
      <text
        transform={flip ? 'scale(-1 1)' : undefined}
        x="0"
        y="63.9"
        textAnchor="middle"
        fontSize="3.6"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        letterSpacing="0.3"
      >
        AICS
      </text>
      <circle cx="0" cy="69.5" r="2.3" fill="#CBD5E1" />
      <rect x="-4" y="73.4" width="8" height="1.4" rx="0.7" fill="#CBD5E1" />
    </g>

    {/* front arm: pointing at the cards, or holding a tablet */}
    {pose === 'point' ? (
      <g className="scan-point">
        <path d="M21 40 C30 34 38 26 44 16" stroke={skin} strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="45" cy="14" r="3.6" fill={skin} />
        <path d="M46 12 L50 5" stroke={skin} strokeWidth="2.2" strokeLinecap="round" />
      </g>
    ) : (
      <g className="scan-tablet">
        <path d="M21 40 C24 52 26 60 34 66" stroke={skin} strokeWidth="6" strokeLinecap="round" fill="none" />
        <rect x="30" y="52" width="18" height="24" rx="2.5" fill="#FFFFFF" stroke="#CBD5E1" transform="rotate(-12 39 64)" />
        <rect x="33" y="57" width="12" height="2" rx="1" fill={PIPING} transform="rotate(-12 39 64)" opacity="0.8" />
        <rect x="33" y="62" width="9" height="1.6" rx="0.8" fill="#CBD5E1" transform="rotate(-12 39 64)" />
        <rect x="33" y="66" width="11" height="1.6" rx="0.8" fill="#CBD5E1" transform="rotate(-12 39 64)" />
        <circle cx="36" cy="67" r="3.6" fill={skin} />
      </g>
    )}

    {/* head */}
    <circle cx="0" cy="14" r="11.5" fill={skin} />
    {/* hair front */}
    {hair === 'bob' ? (
      <path d="M-12.5 16 C-14 2 -6 -2 0 -2 C8 -2 14 3 12.5 16 C10 8 6 5 1 6 C-4 6 -9 9 -12.5 16 Z" fill={HAIR} />
    ) : (
      <path d="M-12 13 C-12 1 -5 -2 1 -2 C8 -2 13 3 12 13 C9 6 4 4 -2 5 C-7 6 -10 9 -12 13 Z" fill={HAIR} />
    )}
    {/* face */}
    <g className="scan-blink">
      <circle cx="-3.8" cy="15" r="1.2" fill="#1F2937" />
      <circle cx="4.2" cy="15" r="1.2" fill="#1F2937" />
    </g>
    <path d="M-2.5 19.5 Q0.5 22 3.5 19.5" stroke="#9A3E3E" strokeWidth="1" strokeLinecap="round" fill="none" />
    <circle cx="-6.5" cy="18.5" r="1.8" fill="#F28B82" opacity="0.35" />
    <circle cx="7" cy="18.5" r="1.8" fill="#F28B82" opacity="0.35" />
  </g>
);

/** One student profile card in the scanning feed. */
const ProfileCard: React.FC<{ y: number }> = ({ y }) => (
  <g transform={`translate(0 ${y})`}>
    <rect x="0" y="0" width="120" height="34" rx="7" className="fill-white dark:fill-[#14223E] stroke-[#CFD9F2] dark:stroke-[#2A4580]" strokeWidth="1" />
    <circle cx="17" cy="17" r="9" className="fill-[#E4ECFC] dark:fill-[#1E3A70]" />
    <circle cx="17" cy="14.5" r="3.2" className="fill-[#7CA3E6] dark:fill-[#5B86D6]" />
    <path d="M11 23 C12 19 22 19 23 23" className="fill-[#7CA3E6] dark:fill-[#5B86D6]" />
    <rect x="32" y="10" width="46" height="4" rx="2" className="fill-[#C9D6EE] dark:fill-[#2D4B85]" />
    <rect x="32" y="19" width="66" height="3" rx="1.5" className="fill-[#E2E9F5] dark:fill-[#22385F]" />
    <rect x="32" y="25" width="38" height="3" rx="1.5" className="fill-[#E2E9F5] dark:fill-[#22385F]" />
  </g>
);

export const ScanningScene: React.FC<{ done?: boolean; className?: string; title?: string }> = ({
  done = false,
  className = '',
  title = 'Scanning student profiles',
}) => (
  <svg
    viewBox="0 0 360 220"
    role="img"
    aria-label={title}
    className={`scan-scene ${done ? 'is-done' : ''} ${className}`}
  >
    <defs>
      <clipPath id="scan-feed-clip">
        <rect x="118" y="22" width="124" height="170" rx="10" />
      </clipPath>
      <linearGradient id="scan-beam" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#4E92DF" stopOpacity="0" />
        <stop offset="0.5" stopColor="#4E92DF" stopOpacity="0.55" />
        <stop offset="1" stopColor="#4E92DF" stopOpacity="0" />
      </linearGradient>
    </defs>

    {/* soft background blob */}
    <ellipse cx="180" cy="120" rx="150" ry="88" className="fill-[#E9F0FC] dark:fill-[#12213F]" />
    <ellipse cx="80" cy="204" rx="34" ry="5" className="fill-[#D5E0F3] dark:fill-[#0B1730]" />
    <ellipse cx="290" cy="204" rx="34" ry="5" className="fill-[#D5E0F3] dark:fill-[#0B1730]" />

    {/* floating dots */}
    <g className="scan-dots">
      <circle cx="104" cy="40" r="2.5" className="fill-[#7CB8F7]" />
      <circle cx="96" cy="50" r="1.6" className="fill-[#A8C8F5]" />
      <circle cx="262" cy="58" r="2.2" className="fill-[#7CB8F7]" />
    </g>

    {/* profile card feed (scrolls up through the scanner) */}
    <g clipPath="url(#scan-feed-clip)">
      <g transform="translate(120 0)">
        <g className="scan-feed">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ProfileCard key={i} y={18 + i * 42} />
          ))}
        </g>
      </g>
    </g>

    {/* scanner frame on the middle card */}
    <g transform="translate(114 98)">
      <rect x="0" y="0" width="132" height="42" rx="9" fill="none" strokeWidth="2" className="scan-frame stroke-[#2557BE] dark:stroke-[#7CB8F7]" />
      <g clipPath="url(#scan-frame-clip)">
        <clipPath id="scan-frame-clip">
          <rect x="2" y="2" width="128" height="38" rx="8" />
        </clipPath>
        <rect className="scan-beam" x="-40" y="2" width="40" height="38" fill="url(#scan-beam)" />
      </g>
      {/* "AICS SCAN" tab sitting on the top edge of the scanner, centered */}
      <g transform="translate(36 -11)">
        <rect x="0" y="0" width="60" height="12" rx="6" className="fill-[#1E469B] dark:fill-[#2557BE]" />
        <circle cx="8.5" cy="6" r="2" className="scan-led fill-[#34D399]" />
        <text x="34" y="8.6" textAnchor="middle" fontSize="6.4" fontWeight="800" fill="#FFFFFF"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif" letterSpacing="0.8">AICS SCAN</text>
      </g>
      {/* corner brackets */}
      <path d="M-4 10 V-4 H10 M122 -4 H136 V10 M136 32 V46 H122 M10 46 H-4 V32" strokeWidth="2.4" fill="none" strokeLinecap="round" className="stroke-[#2557BE] dark:stroke-[#7CB8F7]" />
      {/* check badge per scanned card */}
      <g className="scan-check">
        <circle cx="132" cy="0" r="9" fill="#10B981" />
        <path d="M127.5 0 L130.8 3.3 L136.5 -3" stroke="#FFFFFF" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>

    {/* staff */}
    <Girl x={80} y={204} hair="bob" skin="#F2C7A5" pose="point" />
    <Girl x={290} y={204} flip hair="pony" skin="#E3B08C" pose="tablet" />

    {/* done state: big check */}
    <g className="scan-done-badge">
      <circle cx="180" cy="119" r="26" fill="#10B981" />
      <path d="M168 119 L176.5 127.5 L192.5 111" stroke="#FFFFFF" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

export default ScanningScene;
