import React, { createContext, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { motion } from 'framer-motion';
import { soundFX } from '../services/soundEngine';
import { detectDeviceTier } from '../services/devicePerformance';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleThemeWithAura: (event?: React.MouseEvent<HTMLElement>) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'aics_guidance_theme_v1';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const spawnAuraRing = (x: number, y: number) => {
    const ring = document.createElement('div');
    ring.className = 'theme-aura-ring';
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    document.body.appendChild(ring);
    window.setTimeout(() => {
      ring.remove();
    }, 540);
  };

  const toggleThemeWithAura = (event?: React.MouseEvent<HTMLElement>) => {
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
    soundFX.playThemeAuraSweep(nextTheme === 'dark');

    // Low tier check: Instant switch with zero delay on low-spec devices
    const { isLowTier, prefersReducedMotion } = detectDeviceTier();
    if (isLowTier || prefersReducedMotion) {
      setTheme(nextTheme);
      return;
    }

    const x = event ? event.clientX : window.innerWidth - 120;
    const y = event ? event.clientY : 48;

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
    };

    if (!docWithVT.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    spawnAuraRing(x, y);

    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const root = document.documentElement;
    root.classList.add('theme-fading');

    try {
      const transition = docWithVT.startViewTransition(() => {
        flushSync(() => {
          setTheme(nextTheme);
        });
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${maxRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 440,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              pseudoElement: '::view-transition-new(root)',
            }
          );
        })
        .catch(() => {
          // Fallback if interrupted
        });

      transition.finished.finally(() => {
        root.classList.remove('theme-fading');
      });
    } catch {
      setTheme(nextTheme);
      root.classList.remove('theme-fading');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleThemeWithAura }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export const SkyThemePill: React.FC = () => {
  const { theme, toggleThemeWithAura } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={(e) => toggleThemeWithAura(e)}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'}
      className="btn-press relative inline-flex items-center w-[74px] h-[30px] rounded-full p-1 overflow-hidden border transition-colors select-none shadow-sm cursor-pointer"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #071128 0%, #132E6B 100%)'
          : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
        borderColor: isDark ? 'rgba(124, 184, 247, 0.4)' : 'rgba(255, 255, 255, 0.85)',
      }}
    >
      {!isDark ? (
        <span className="pointer-events-none absolute right-2 flex items-center gap-0.5 text-[10px] font-bold text-white/95">
          <span>☁</span>
          <span className="text-[8px] opacity-80">☁</span>
        </span>
      ) : (
        <span className="pointer-events-none absolute left-2.5 flex items-center gap-1 text-[10px] font-bold text-[#9BCBFF]">
          <span>✦</span>
          <span className="text-[8px] opacity-75">★</span>
        </span>
      )}

      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
        className={`z-10 flex items-center justify-center w-[22px] h-[22px] rounded-full shadow-md ${
          isDark
            ? 'ml-auto bg-[#0E1D3D] text-[#7CB8F7] ring-1 ring-[#7CB8F7]/60'
            : 'mr-auto bg-white text-[#F59E0B] ring-1 ring-white'
        }`}
      >
        {isDark ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="5" />
            <path
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
            />
          </svg>
        )}
      </motion.span>
    </button>
  );
};
