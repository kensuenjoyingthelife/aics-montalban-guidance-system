import React, { createContext, useContext, useState, useEffect } from 'react';
import { playCinematicIntro } from './introSound';

/**
 * ZERO-LAG WEB AUDIO API SYNTHESIZER FOR COMPUTER STUDIES / TECH UI
 * - 0 KB external audio files, 0ms decoding delay, runs on native audio thread.
 * - Inspired by Creamy Mechanical Keyboards + PS5 / Futuristic Sci-Fi UI + macOS Audio.
 */
class TechSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private lastHoverTime: number = 0;

  constructor() {
    try {
      const saved = localStorage.getItem('aics_sound_enabled_v1');
      if (saved === 'false') this.enabled = false;
    } catch {
      // ignore
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    try {
      localStorage.setItem('aics_sound_enabled_v1', String(val));
    } catch {
      // ignore
    }
    if (val) {
      this.playToggleSwitch(true);
    }
  }

  /**
   * 1. HOVER SOUND — Disabled per UX ergonomics (no sound on mouse hover)
   */
  public playHover(): void {
    // Intentionally silent: mouse hover sound removed across the workspace
    void this.lastHoverTime;
  }

  /**
   * 1B. SUCCESS CHECK CONFIRMATION SOUND (Played when the Centered Mini Confirmation Card appears)
   * Crisp, satisfying 2-note emerald check chime (G5 -> D6 with warm harmonic pop)
   */
  public playSuccessCheck(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 783.99, delay: 0, duration: 0.11, gain: 0.11 }, // G5 crisp check start
      { freq: 1174.66, delay: 0.065, duration: 0.26, gain: 0.13 }, // D6 bright confirmation lock
    ];

    notes.forEach(({ freq, delay, duration, gain: peakGain }) => {
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, t + duration);

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(freq * 0.5, t);

      gain.gain.setValueAtTime(peakGain, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      subOsc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      subOsc.start(t);
      osc.stop(t + duration + 0.01);
      subOsc.stop(t + duration + 0.01);
    });
  }

  /**
   * 2. MECHANICAL KEY / PIN PAD CLICK (Creamy Tactile Switch + Harmonic Note)
   * Plays a warm mechanical "thock" + ascending crystal note per digit/key!
   */
  public playKeyClick(pitchStep: number = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Layer A: Warm Mechanical Switch "Thock" Body (Creamy & tactile)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(210, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(75, now + 0.038);

    bodyGain.gain.setValueAtTime(0.14, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.042);

    // Layer B: Pleasant Soft Click / Harmonic Tech Pluck
    const scaleFreqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
    const freq = scaleFreqs[Math.abs(pitchStep) % scaleFreqs.length];

    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(freq, now);
    chimeOsc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.05);

    chimeGain.gain.setValueAtTime(0.08, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chimeOsc.start(now);
    chimeOsc.stop(now + 0.058);
  }

  /**
   * 3. BACKSPACE / CLEAR SOUND (Snappy downward cyber-pop)
   */
  public playBackspace(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(155, now + 0.055);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.058);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * 4. UI BUTTON / PILL SWITCH CLICK (Lively dual-pop for Language, Show PIN, Pillars)
   */
  public playToggleSwitch(upward: boolean = true): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = upward ? 587.33 : 880;
    const endFreq = upward ? 880 : 587.33;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.setValueAtTime(endFreq, now + 0.035);

    gain.gain.setValueAtTime(0.085, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * 5. THEME AURA TRANSITION SOUND (Futuristic shimmer chord when toggling Day/Night Sky)
   */
  public playThemeAuraSweep(toDark: boolean): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = toDark ? [783.99, 659.25, 523.25] : [523.25, 659.25, 987.77];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  /**
   * 6. STEP UNLOCK CHIME (Played when 6-digit PIN is accepted or OTP is sent)
   * Joyful Major-7th Cyber Arpeggio (C5 -> E5 -> G5 -> B5)
   */
  public playStepUnlock(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 987.77];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.048;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.095, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.23);
    });
  }

  /**
   * 7. FULL VERIFIED FANFARE (Played when OTP is verified)
   */
  public playVerifiedFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.055;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.11, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.34);
    });
  }

  /**
   * 8. ERROR / WRONG PIN BUZZ (Soft tactile double bass thud)
   */
  public playError(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [180, 135].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.075;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.075);
    });
  }

  /**
   * 9. DESKTOP OPENING INTRO — cinematic logo sting (see services/introSound.ts).
   * Returns false when muted or when the browser blocks audio before any click (autoplay policy).
   */

  /**
   * 10. SCANNING RADAR TICK & CHIRP (High-tech server ping)
   */
  public playScanningPulse(pitchMultiplier = 1): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 880 * pitchMultiplier;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.05);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  /**
   * 11. SCAN STEP VERIFIED (Crisp cyber blip per field)
   */
  public playScanStepSuccess(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1046.5, now); // C6
    osc.frequency.setValueAtTime(1318.51, now + 0.04); // E6

    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * 12. DECLINE / REJECT CHIME (Dull low descending alert)
   */
  public playDeclinedSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [260, 180, 120].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.08;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.14);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  public playOpeningIntro(): boolean {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return false;
    playCinematicIntro(ctx);
    return true;
  }
}

export const soundFX = new TechSoundEngine();

interface SoundContextValue {
  soundEnabled: boolean;
  toggleSound: () => void;
}

const SoundContext = createContext<SoundContextValue>({
  soundEnabled: true,
  toggleSound: () => {},
});

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundFX.isEnabled());

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.setEnabled(next);
  };

  // Global lightweight typing sound listener for Desktop Keyboard AND Mobile Virtual Keyboards
  useEffect(() => {
    let lastKeyStep = 0;

    // A. Physical / Standard Keydown Event (Desktop & external keyboards)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!soundFX.isEnabled()) return;
      const target = e.target as HTMLElement | null;
      if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return;

      // Handle Backspace / Delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        soundFX.playBackspace();
        return;
      }

      // Handle Enter
      if (e.key === 'Enter') {
        soundFX.playToggleSwitch(true);
        return;
      }

      // Standard character typing (letters, numbers, space, symbols)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        lastKeyStep = (lastKeyStep + 1) % 8;
        soundFX.playKeyClick(lastKeyStep);
      }
    };

    // B. Mobile Virtual Keyboard / On-screen Keypad Input Event (`beforeinput`)
    // Android (Gboard, Samsung Keyboard) & iOS Safari fire `beforeinput` with inputType
    const handleBeforeInput = (e: InputEvent) => {
      if (!soundFX.isEnabled()) return;
      const target = e.target as HTMLElement | null;
      if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return;

      // If user taps backspace on mobile keyboard
      if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward' || e.inputType.startsWith('delete')) {
        soundFX.playBackspace();
        return;
      }

      // If user types any text, character, or space
      if (e.inputType === 'insertText' || e.inputType === 'insertCompositionText' || (e.data && e.data.length > 0)) {
        lastKeyStep = (lastKeyStep + 1) % 8;
        soundFX.playKeyClick(lastKeyStep);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('beforeinput', handleBeforeInput as EventListener, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeinput', handleBeforeInput as EventListener);
    };
  }, []);

  return React.createElement(
    SoundContext.Provider,
    { value: { soundEnabled, toggleSound } },
    children
  );
};

export const useSound = () => useContext(SoundContext);

export const SoundTogglePill: React.FC = () => {
  const { soundEnabled, toggleSound } = useSound();

  return React.createElement(
    'button',
    {
      type: 'button',
      onClick: toggleSound,
      title: soundEnabled ? 'UI Sounds: ON (Click to Mute)' : 'UI Sounds: MUTED',
      className:
        'btn-press inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 border border-white/20 dark:border-white/10 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer',
    },
    soundEnabled
      ? React.createElement(
          'svg',
          {
            className: 'w-3.5 h-3.5 text-sky-200',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            viewBox: '0 0 24 24',
          },
          React.createElement('polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }),
          React.createElement('path', { d: 'M15.54 8.46a5 5 0 0 1 0 7.07' }),
          React.createElement('path', { d: 'M19.07 4.93a10 10 0 0 1 0 14.14' })
        )
      : React.createElement(
          'svg',
          {
            className: 'w-3.5 h-3.5 text-white/50',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            viewBox: '0 0 24 24',
          },
          React.createElement('polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }),
          React.createElement('line', { x1: '23', y1: '9', x2: '17', y2: '15' }),
          React.createElement('line', { x1: '17', y1: '9', x2: '23', y2: '15' })
        ),
    React.createElement(
      'span',
      { className: 'hidden sm:inline text-white/90 font-bold' },
      soundEnabled ? 'SFX' : 'Muted'
    )
  );
};
