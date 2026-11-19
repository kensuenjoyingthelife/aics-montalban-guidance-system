/**
 * "Christmas lights" tune for the login screen (website + mobile), made in code with Web Audio:
 * no music file (0 KB), no new library. Short square-wave beeps like the tune boxes of
 * Christmas lights. Songs are public domain: Jingle Bells (1857) and Silent Night (1818).
 *
 * Plays only when: Christmas theme is on, SFX is on, the user has tapped/typed once
 * (browser rule), and the tab is visible. Very low volume. Loops until stop().
 */

type Note = [string, number]; // [note name or '-' for rest, beats]

const FREQ: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
};

// Jingle Bells (chorus), in C
const JINGLE: Note[] = [
  ['E4', 1], ['E4', 1], ['E4', 2], ['E4', 1], ['E4', 1], ['E4', 2],
  ['E4', 1], ['G4', 1], ['C4', 1.5], ['D4', 0.5], ['E4', 4],
  ['F4', 1], ['F4', 1], ['F4', 1.5], ['F4', 0.5], ['F4', 1], ['E4', 1], ['E4', 1], ['E4', 0.5], ['E4', 0.5],
  ['E4', 1], ['D4', 1], ['D4', 1], ['E4', 1], ['D4', 2], ['G4', 2],
  ['E4', 1], ['E4', 1], ['E4', 2], ['E4', 1], ['E4', 1], ['E4', 2],
  ['E4', 1], ['G4', 1], ['C4', 1.5], ['D4', 0.5], ['E4', 4],
  ['F4', 1], ['F4', 1], ['F4', 1.5], ['F4', 0.5], ['F4', 1], ['E4', 1], ['E4', 1], ['E4', 0.5], ['E4', 0.5],
  ['G4', 1], ['G4', 1], ['F4', 1], ['D4', 1], ['C4', 4], ['-', 2],
];

// Silent Night, in C
const SILENT: Note[] = [
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['D5', 2], ['D5', 1], ['B4', 3],
  ['C5', 2], ['C5', 1], ['G4', 3],
  ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['D5', 2], ['D5', 1], ['F5', 1.5], ['D5', 0.5], ['B4', 1],
  ['C5', 3], ['E5', 3],
  ['C5', 1.5], ['G4', 0.5], ['E4', 1], ['G4', 1.5], ['F4', 0.5], ['D4', 1],
  ['C4', 6], ['-', 3],
];

// We Wish You a Merry Christmas (traditional), in C
const WEWISH: Note[] = [
  ['G4', 1], ['C5', 1], ['C5', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 1], ['A4', 1],
  ['A4', 1], ['D5', 1], ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 1], ['G4', 1],
  ['G4', 1], ['E5', 1], ['E5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 1],
  ['G4', 0.5], ['G4', 0.5], ['A4', 1], ['D5', 1], ['B4', 1], ['C5', 3], ['-', 1],
];

// Deck the Halls (traditional Welsh), in C
const DECK: Note[] = [
  ['G4', 1.5], ['F4', 0.5], ['E4', 1], ['D4', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['C4', 1],
  ['D4', 0.5], ['E4', 0.5], ['F4', 0.5], ['D4', 0.5], ['E4', 1.5], ['D4', 0.5], ['C4', 2],
  ['G4', 1.5], ['F4', 0.5], ['E4', 1], ['D4', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['C4', 1],
  ['D4', 0.5], ['E4', 0.5], ['F4', 0.5], ['D4', 0.5], ['E4', 1.5], ['D4', 0.5], ['C4', 2], ['-', 1],
];

// Joy to the World (Handel / Watts, 1719), in C
const JOY: Note[] = [
  ['C5', 2], ['B4', 1.5], ['A4', 0.5], ['G4', 3], ['F4', 1], ['E4', 2], ['D4', 2], ['C4', 3], ['G4', 1],
  ['A4', 3], ['A4', 1], ['B4', 3], ['B4', 1], ['C5', 6], ['-', 2],
];

const SONGS: { notes: Note[]; beat: number }[] = [
  { notes: JINGLE, beat: 0.3 },
  { notes: WEWISH, beat: 0.32 },
  { notes: SILENT, beat: 0.34 },
  { notes: DECK, beat: 0.3 },
  { notes: JOY, beat: 0.3 },
];

class ChristmasMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private song = 0;
  private idx = 0;
  private nextAt = 0;
  private playing = false;
  private onVis = () => {
    if (!this.ctx) return;
    if (document.visibilityState === 'hidden') void this.ctx.suspend().catch(() => {});
    else if (this.playing) void this.ctx.resume().catch(() => {});
  };

  get isPlaying(): boolean {
    return this.playing;
  }

  start(): void {
    if (this.playing || typeof window === 'undefined') return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = this.ctx ?? new AC();
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      // soft fade-in so it never starts loud
      this.master.gain.linearRampToValueAtTime(0.045, this.ctx.currentTime + 1.2);
      this.playing = true;
      this.nextAt = this.ctx.currentTime + 0.15;
      document.addEventListener('visibilitychange', this.onVis);
      // look-ahead scheduler: light on the CPU (one check every 120 ms)
      this.timer = window.setInterval(() => this.schedule(), 120);
      this.schedule();
    } catch {
      this.stop();
    }
  }

  stop(): void {
    this.playing = false;
    if (this.timer != null) window.clearInterval(this.timer);
    this.timer = null;
    document.removeEventListener('visibilitychange', this.onVis);
    const ctx = this.ctx;
    const m = this.master;
    if (ctx && m) {
      try {
        m.gain.cancelScheduledValues(ctx.currentTime);
        m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
        m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
      } catch {
        /* closed */
      }
      window.setTimeout(() => {
        try { m.disconnect(); } catch { /* done */ }
      }, 320);
    }
    this.master = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const out = this.master;
    if (!ctx || !out || !this.playing) return;
    while (this.nextAt < ctx.currentTime + 0.4) {
      const s = SONGS[this.song];
      const [name, beats] = s.notes[this.idx];
      const len = beats * s.beat;
      if (name !== '-' && beats > 0) this.beep(FREQ[name], this.nextAt, Math.max(0.06, len * 0.88), out);
      this.nextAt += len;
      this.idx += 1;
      if (this.idx >= s.notes.length) {
        this.idx = 0;
        this.song = (this.song + 1) % SONGS.length;
      }
    }
  }

  /** one "Christmas lights" beep: square wave with a quick decay */
  private beep(freq: number, at: number, dur: number, out: GainNode): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(freq * 2, at); // one octave up: thin, toy-like
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.6, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(out);
    o.start(at);
    o.stop(at + dur + 0.02);
  }
}

export const christmasMusic = new ChristmasMusic();
