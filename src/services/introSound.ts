/**
 * Cinematic "commercial logo sting" for the desktop opening (AicsSplashLoader, ~3 s).
 * Pure Web Audio synthesis (no audio files). Everything is scheduled on the audio clock in
 * one call, so it stays in sync with the animation and costs nothing on the main thread.
 *
 *  0.00–0.52  riser (noise + rising tone) builds while the seal fades in
 *  0.52       BOOM impact as the seal lands (sub drop + punch + crack, with reverb)
 *  0.66       soft pulse tick
 *  0.85       stereo whoosh as the seal glides and the name appears
 *  0.95       bright logo chime arpeggio (bells)
 *  1.80       shimmer as the light passes through the letters
 *  2.70       final warm chord with a long reverb tail (as the splash fades into the app)
 */
export function playCinematicIntro(ctx: BaseAudioContext): void {
  const t0 = ctx.currentTime + 0.03;
  const at = (s: number) => t0 + s;

  // ---- Bus: dry + hall reverb → gentle compressor → output ----------------
  const out = ctx.createDynamicsCompressor();
  out.threshold.value = -14;
  out.knee.value = 12;
  out.ratio.value = 3;
  out.attack.value = 0.005;
  out.release.value = 0.25;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  out.connect(master);
  master.connect(ctx.destination);

  const dry = ctx.createGain();
  dry.connect(out);

  // Generated stereo hall impulse (2.6 s) — the "big commercial" space
  const reverb = ctx.createConvolver();
  {
    const len = Math.floor(ctx.sampleRate * 2.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    reverb.buffer = ir;
  }
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  reverb.connect(wet);
  wet.connect(out);

  const route = (node: AudioNode, reverbAmount = 0.5) => {
    node.connect(dry);
    const s = ctx.createGain();
    s.gain.value = reverbAmount;
    node.connect(s);
    s.connect(reverb);
  };

  const noiseSrc = (dur: number) => {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  };

  const env = (g: GainNode, start: number, attack: number, peak: number, end: number) => {
    g.gain.setValueAtTime(0.0001, at(start));
    g.gain.exponentialRampToValueAtTime(peak, at(start + attack));
    g.gain.exponentialRampToValueAtTime(0.0001, at(end));
  };

  // Bell-like tone (sine + soft inharmonic partial) for the chimes
  const bell = (freq: number, start: number, dur: number, peak: number, verb = 0.7) => {
    const g = ctx.createGain();
    env(g, start, 0.006, peak, start + dur);
    [1, 2.76].forEach((m, k) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq * m, at(start));
      const pg = ctx.createGain();
      pg.gain.value = k === 0 ? 1 : 0.18;
      o.connect(pg);
      pg.connect(g);
      o.start(at(start));
      o.stop(at(start + dur + 0.05));
    });
    route(g, verb);
  };

  // ---- 0.00–0.52 Riser -----------------------------------------------------
  {
    const n = noiseSrc(0.6);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(400, at(0));
    bp.frequency.exponentialRampToValueAtTime(6000, at(0.5));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(0));
    g.gain.exponentialRampToValueAtTime(0.09, at(0.48));
    g.gain.exponentialRampToValueAtTime(0.0001, at(0.54));
    n.connect(bp);
    bp.connect(g);
    route(g, 0.4);
    n.start(at(0));

    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, at(0));
    o.frequency.exponentialRampToValueAtTime(880, at(0.5));
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(600, at(0));
    lp.frequency.exponentialRampToValueAtTime(3000, at(0.5));
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, at(0));
    og.gain.exponentialRampToValueAtTime(0.035, at(0.48));
    og.gain.exponentialRampToValueAtTime(0.0001, at(0.53));
    o.connect(lp);
    lp.connect(og);
    route(og, 0.3);
    o.start(at(0));
    o.stop(at(0.56));
  }

  // ---- 0.52 BOOM impact ----------------------------------------------------
  {
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, at(0.52));
    sub.frequency.exponentialRampToValueAtTime(38, at(1.3));
    const sg = ctx.createGain();
    env(sg, 0.52, 0.008, 0.55, 1.6);
    sub.connect(sg);
    route(sg, 0.15);
    sub.start(at(0.52));
    sub.stop(at(1.65));

    const n = noiseSrc(0.3);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, at(0.52));
    lp.frequency.exponentialRampToValueAtTime(120, at(0.75));
    const ng = ctx.createGain();
    env(ng, 0.52, 0.003, 0.32, 0.8);
    n.connect(lp);
    lp.connect(ng);
    route(ng, 0.6);
    n.start(at(0.52));

    // Bright transient "crack" so the hit cuts through laptop speakers
    const c = noiseSrc(0.08);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const cg = ctx.createGain();
    env(cg, 0.52, 0.001, 0.12, 0.6);
    c.connect(hp);
    hp.connect(cg);
    route(cg, 0.9);
    c.start(at(0.52));
  }

  // ---- 0.66 Pulse tick -----------------------------------------------------
  bell(1318.51, 0.66, 0.25, 0.05, 0.5);

  // ---- 0.85 Stereo whoosh --------------------------------------------------
  {
    const n = noiseSrc(0.8);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(350, at(0.85));
    bp.frequency.exponentialRampToValueAtTime(4200, at(1.25));
    bp.frequency.exponentialRampToValueAtTime(1200, at(1.55));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(0.85));
    g.gain.exponentialRampToValueAtTime(0.16, at(1.15));
    g.gain.exponentialRampToValueAtTime(0.0001, at(1.6));
    n.connect(bp);
    bp.connect(g);
    if (typeof ctx.createStereoPanner === 'function') {
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.7, at(0.85));
      pan.pan.linearRampToValueAtTime(0.4, at(1.5));
      g.connect(pan);
      route(pan, 0.45);
    } else {
      route(g, 0.45);
    }
    n.start(at(0.85));
  }

  // ---- 0.95 Logo chime arpeggio (C6 E6 G6 C7) ------------------------------
  [1046.5, 1318.51, 1567.98, 2093.0].forEach((f, i) => bell(f, 0.95 + i * 0.08, 0.9, 0.07, 0.8));

  // ---- 1.80 Shimmer through the letters ------------------------------------
  {
    const n = noiseSrc(0.9);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 6;
    bp.frequency.setValueAtTime(3000, at(1.8));
    bp.frequency.exponentialRampToValueAtTime(9000, at(2.5));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(1.8));
    g.gain.exponentialRampToValueAtTime(0.06, at(2.15));
    g.gain.exponentialRampToValueAtTime(0.0001, at(2.6));
    n.connect(bp);
    bp.connect(g);
    route(g, 0.9);
    n.start(at(1.8));
    [2637.02, 3135.96, 3951.07].forEach((f, i) => bell(f, 1.85 + i * 0.11, 0.5, 0.03, 0.9));
  }

  // ---- 2.70 Final warm chord with a long tail (Cadd9) ----------------------
  {
    const g = ctx.createGain();
    env(g, 2.7, 0.12, 0.12, 4.6);
    [65.41, 130.81, 196.0, 261.63, 293.66, 392.0, 523.25].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i < 2 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(f, at(2.7));
      o.detune.setValueAtTime((i % 2 ? 1 : -1) * 4, at(2.7)); // tiny chorus
      const pg = ctx.createGain();
      pg.gain.value = i < 2 ? 0.9 : 0.35;
      o.connect(pg);
      pg.connect(g);
      o.start(at(2.7));
      o.stop(at(4.7));
    });
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5000, at(2.7));
    lp.frequency.exponentialRampToValueAtTime(900, at(4.6));
    g.connect(lp);
    route(lp, 0.6);
  }
}
