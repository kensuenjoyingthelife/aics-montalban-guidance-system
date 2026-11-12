import React, { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { soundFX } from '../../services/soundEngine';

interface AicsSplashLoaderProps {
  visible: boolean;
  onComplete: () => void;
}

const WORD_TOP = 'AICS';
const WORD_BOTTOM = 'MONTALBAN';

/**
 * Desktop opening sequence (~2.8 s):
 *  glow → seal fades in from blur with a ripple → quick pulse →
 *  seal glides left while "AICS MONTALBAN" emerges from behind it letter by letter →
 *  subtitle + underline → light sweep over the wordmark → zoom-fade into the app.
 * Transform / opacity / clip-path only (GPU friendly). Honors prefers-reduced-motion.
 */
export const AicsSplashLoader: React.FC<AicsSplashLoaderProps> = ({ visible, onComplete }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const sealRef = useRef<HTMLDivElement | null>(null);
  const rippleRef = useRef<HTMLSpanElement | null>(null);
  const wordRef = useRef<HTMLDivElement | null>(null);
  const subRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLSpanElement | null>(null);
  const sweepRef = useRef<HTMLDivElement | null>(null);

  // Keep the latest callback without restarting the animation when the parent re-renders
  const doneRef = useRef(onComplete);
  useEffect(() => {
    doneRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    if (!visible || !rootRef.current) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Cancels the deferred start if this effect is cleaned up first (React StrictMode runs it twice)
    let cancelStart: () => void = () => {};

    let cancelled = false;
    const ctx = gsap.context(() => {
      const letters = gsap.utils.toArray<HTMLElement>('[data-letter]');
      // Hide everything right away so nothing flashes before the intro starts
      gsap.set([glowRef.current, sealRef.current, wordRef.current, subRef.current, sweepRef.current], { opacity: 0 });
      gsap.set(lineRef.current, { scaleX: 0 });

      // Wait for (1) the brand font, so the wordmark width is final and the seal lands exactly
      // centered, and (2) an idle main thread, since the app mounts behind the splash. Max ~1.2 s.
      const fontsReady = Promise.race([
        (document as Document & { fonts?: FontFaceSet }).fonts?.ready ?? Promise.resolve(),
        new Promise((r) => setTimeout(r, 1200)),
      ]);
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      fontsReady.then(() => {
        if (cancelled) return;
        if (w.requestIdleCallback) {
          const id = w.requestIdleCallback(() => ctx.add(build), { timeout: 300 });
          cancelStart = () => w.cancelIdleCallback?.(id);
        } else {
          const id = window.setTimeout(() => ctx.add(build), 60);
          cancelStart = () => window.clearTimeout(id);
        }
      });

      function build() {
        if (cancelled) return;
        const tl = gsap.timeline({ onComplete: () => doneRef.current() });
        // Score the intro (audio is scheduled on the audio clock, so it stays in sync)
        if (!reduce) soundFX.playOpeningIntro();

        if (reduce) {
          gsap.set([glowRef.current, sealRef.current, wordRef.current, subRef.current, ...letters], { opacity: 1 });
          gsap.set(lineRef.current, { scaleX: 1 });
          tl.to(rootRef.current, { opacity: 0, duration: 0.3, delay: 1.1 });
          return;
        }

        // Distance the seal travels so it starts perfectly centered on screen (measured after fonts load)
        const gap = 18;
        const shift = ((wordRef.current?.offsetWidth ?? 0) + gap) / 2;

        gsap.set(glowRef.current, { opacity: 0, scale: 0.6 });
        gsap.set(sealRef.current, { x: shift, scale: 0.55, opacity: 0, filter: 'blur(10px)' });
        gsap.set(rippleRef.current, { scale: 0.6, opacity: 0 });
        gsap.set(wordRef.current, { opacity: 1, x: -gap, clipPath: 'inset(0% 100% 0% 0%)' });
        gsap.set(letters, { opacity: 0, y: 8 });
        gsap.set(subRef.current, { opacity: 0, y: 8 });
        gsap.set(lineRef.current, { scaleX: 0 });
        gsap.set(sweepRef.current, { opacity: 0, '--shine-x': '140%' });

        tl
          // 1. Soft glow
          .to(glowRef.current, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 0)
          // 2. Seal fades in from blur, overshoots slightly, settles
          .to(sealRef.current, { opacity: 1, filter: 'blur(0px)', scale: 1.06, duration: 0.42, ease: 'power3.out' }, 0.1)
          .to(sealRef.current, { scale: 1, duration: 0.18, ease: 'power2.out' }, 0.52)
          // Ripple ring
          .to(rippleRef.current, { opacity: 0.55, scale: 1, duration: 0.2, ease: 'power1.out' }, 0.22)
          .to(rippleRef.current, { opacity: 0, scale: 1.9, duration: 0.6, ease: 'power2.out' }, 0.42)
          // 3. Quick pulse
          .to(sealRef.current, { scale: 0.9, duration: 0.14, ease: 'power2.in' }, 0.66)
          .to(sealRef.current, { scale: 1, duration: 0.22, ease: 'back.out(2.2)' }, 0.8)
          // 4. Seal glides left, wordmark emerges from behind it
          .to(sealRef.current, { x: 0, duration: 0.62, ease: 'expo.inOut' }, 0.85)
          .to(wordRef.current, { x: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.62, ease: 'expo.inOut' }, 0.85)
          .to(letters, { opacity: 1, y: 0, duration: 0.32, stagger: 0.035, ease: 'power2.out' }, 0.95)
          // 5. Subtitle + underline
          .to(lineRef.current, { scaleX: 1, duration: 0.5, ease: 'power3.inOut' }, 1.38)
          .to(subRef.current, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.45)
          // 6. Light sweep across the wordmark
          .to(sweepRef.current, { opacity: 1, duration: 0.01 }, 1.8)
          .to(sweepRef.current, { '--shine-x': '-40%', duration: 0.95, ease: 'sine.inOut' }, 1.75)
          .to(sweepRef.current, { opacity: 0, duration: 0.15 }, 2.68)
          // 7. Zoom-fade into the app
          .to(rowRef.current, { scale: 1.04, duration: 0.45, ease: 'power2.in' }, 2.75)
          .to(rootRef.current, { opacity: 0, duration: 0.45, ease: 'power2.in' }, 2.75);
      }
    }, rootRef);

    return () => {
      cancelled = true;
      cancelStart();
      ctx.revert();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label="AICS Montalban — Guidance Office Management System"
      className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden select-none bg-[radial-gradient(120%_120%_at_50%_45%,#132E6B_0%,#0B1F4D_45%,#06122B_100%)]"
    >
      {/* soft center glow */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="absolute w-[720px] h-[720px] rounded-full bg-[radial-gradient(circle,rgba(78,146,223,0.35)_0%,rgba(37,87,190,0.12)_40%,transparent_70%)]"
      />
      {/* faint concentric rings */}
      <div aria-hidden="true" className="absolute w-[520px] h-[520px] rounded-full border border-white/[0.04]" />
      <div aria-hidden="true" className="absolute w-[780px] h-[780px] rounded-full border border-white/[0.03]" />

      <div ref={rowRef} className="relative flex flex-col items-center">
        <div className="flex items-center gap-[18px]">
          {/* Seal */}
          <div ref={sealRef} className="relative shrink-0 will-change-transform">
            <span
              ref={rippleRef}
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-2 border-[#7CB8F7]"
            />
            <div className="w-[84px] h-[84px] rounded-full overflow-hidden bg-white ring-[3px] ring-white/90 shadow-[0_0_48px_rgba(124,184,247,0.55)]">
              {/* seal ring fills ~78% of the image → scale to fit the circle */}
              <img
                src={`${import.meta.env.BASE_URL}aics-logo.jpg`}
                alt="AICS seal"
                className="w-full h-full object-cover scale-[1.28]"
                draggable={false}
              />
            </div>
          </div>

          {/* Wordmark */}
          <div ref={wordRef} className="relative overflow-hidden will-change-transform">
            <p className="leading-none font-extrabold tracking-[0.04em] text-[#D6E2F6] text-[44px]">
              {WORD_TOP.split('').map((ch, i) => (
                <span key={`t${i}`} data-letter className="inline-block">
                  {ch}
                </span>
              ))}
            </p>
            <p className="mt-1 leading-none font-extrabold tracking-[0.32em] text-[19px] text-[#8FC2F8]">
              {WORD_BOTTOM.split('').map((ch, i) => (
                <span key={`b${i}`} data-letter className="inline-block">
                  {ch}
                </span>
              ))}
            </p>
            {/* Light sweep INSIDE the letters: an identical copy of the wordmark whose glowing
                gradient is clipped to the text shape, so the light passes over the words only (no box). */}
            <div
              ref={sweepRef}
              aria-hidden="true"
              className="splash-shine pointer-events-none absolute inset-0"
            >
              <p className="leading-none font-extrabold tracking-[0.04em] text-[44px]">
                {WORD_TOP.split('').map((ch, i) => (
                  <span key={`st${i}`} className="inline-block">
                    {ch}
                  </span>
                ))}
              </p>
              <p className="mt-1 leading-none font-extrabold tracking-[0.32em] text-[19px]">
                {WORD_BOTTOM.split('').map((ch, i) => (
                  <span key={`sb${i}`} className="inline-block">
                    {ch}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <span ref={lineRef} aria-hidden="true" className="mt-5 h-px w-64 origin-center bg-gradient-to-r from-transparent via-[#7CB8F7]/70 to-transparent" />
        <div ref={subRef} className="mt-3 text-center">
          <p className="text-[13px] font-bold text-white/90 tracking-wide">Guidance Office Management System</p>
          <p className="mt-1 text-[10px] font-extrabold tracking-[0.3em] text-[#7CB8F7]/80 uppercase">Est. 1996 · Excellence</p>
        </div>
      </div>
    </div>
  );
};
