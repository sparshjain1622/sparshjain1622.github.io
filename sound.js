// A gentle soundtrack made in the browser: a warm pad and soft plucked notes through a little reverb.
// Night plays slow and low in a minor mood; day plays brighter and lighter. Scrolling changes how much plays.

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// notes and chords for each mood (MIDI numbers)
const MOODS = {
  night: { scale: [57, 60, 62, 64, 67, 69, 72, 74, 76], chords: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]], gap: [0.9, 2.2], cutoff: 900, pluck: 0.13 },
  day:   { scale: [60, 62, 64, 67, 69, 72, 74, 76, 79], chords: [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 62]], gap: [0.45, 1.3], cutoff: 2200, pluck: 0.11 },
};

export function createSoundscape() {
  let ctx = null, master = null, wet = null, padBus = null, pluckBus = null, padFilter = null, timer = null, on = false;
  const state = { p: 0, keys: null, day: 0, chord: 0, nextChord: 0, nextNote: 0, pads: [] };

  function impulse(seconds) {
    const sr = ctx.sampleRate, len = sr * seconds, b = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    return b;
  }

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    const verb = ctx.createConvolver(); verb.buffer = impulse(3.2);
    wet = ctx.createGain(); wet.gain.value = 0.45; verb.connect(wet).connect(master);
    padFilter = ctx.createBiquadFilter(); padFilter.type = "lowpass"; padFilter.frequency.value = 900; padFilter.Q.value = 0.3;
    padBus = ctx.createGain(); padBus.gain.value = 0.0; padBus.connect(padFilter); padFilter.connect(master); padFilter.connect(verb);
    pluckBus = ctx.createGain(); pluckBus.gain.value = 0.0; pluckBus.connect(master); pluckBus.connect(verb);
    // four pad voices, two oscillators each, slowly retuned to each chord
    for (let i = 0; i < 4; i++) {
      const g = ctx.createGain(); g.gain.value = 0.05; g.connect(padBus);
      const a = ctx.createOscillator(), b = ctx.createOscillator(); a.type = "sine"; b.type = "triangle"; b.detune.value = 7;
      const bg = ctx.createGain(); bg.gain.value = 0.35; a.connect(g); b.connect(bg).connect(g); a.start(); b.start();
      // gentle swell on each voice so the pad breathes
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07 + i * 0.023; lg.gain.value = 0.02; lfo.connect(lg).connect(g.gain); lfo.start();
      state.pads.push({ a, b });
    }
    setChord(0, true);
  }

  function mood() { return state.day ? MOODS.day : MOODS.night; }

  function setChord(i, now) {
    const ch = mood().chords[i % 4];
    state.pads.forEach((v, k) => { const f = hz(ch[k]); v.a.frequency.setTargetAtTime(f, ctx.currentTime, now ? 0.01 : 1.2); v.b.frequency.setTargetAtTime(f * 2, ctx.currentTime, now ? 0.01 : 1.2); });
  }

  function pluck(midi, when, vel) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = "triangle"; o2.type = "sine"; o.frequency.value = hz(midi); o2.frequency.value = hz(midi) * 2;
    f.type = "lowpass"; f.frequency.value = state.day ? 3200 : 1800;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2).connect(g); g.connect(f).connect(pluckBus);
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vel, when + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, when + (state.day ? 1.6 : 2.6));
    o.start(when); o2.start(when); o.stop(when + 3); o2.stop(when + 3);
  }

  // how much music plays at each point of the trail
  function levels() {
    const K = state.keys || [0, 0.1, 0.2, 0.3, 0.45, 0.55, 0.62, 0.75, 0.85, 0.95], p = state.p;
    const journey = 1 - smooth(K[9], K[9] + 0.06, p);           // fades out when the story ends
    const reflective = smooth(K[4], K[6], p) * (1 - smooth(K[8], K[9], p)); // lake and thoughts: more notes
    const sky = smooth(K[7], K[8], p);
    return { pad: 0.55 + 0.25 * journey, notes: (0.35 + 0.65 * reflective + 0.3 * sky) * (0.4 + 0.6 * journey), high: sky };
  }

  function tick() {
    if (!ctx || !on) return;
    const now = ctx.currentTime, L = levels(), m = mood();
    padBus.gain.setTargetAtTime(L.pad * 0.9, now, 0.8);
    pluckBus.gain.setTargetAtTime(1, now, 0.5);
    padFilter.frequency.setTargetAtTime(m.cutoff, now, 1.5);
    if (now > state.nextChord) { state.chord = (state.chord + 1) % 4; setChord(state.chord); state.nextChord = now + (state.day ? 6 : 9); }
    while (state.nextNote < now + 0.3) {
      const t = Math.max(state.nextNote, now + 0.02);
      if (Math.random() < L.notes) {
        const sc = m.scale, idx = Math.floor(Math.random() * sc.length), up = L.high > 0.5 && Math.random() < 0.4 ? 12 : 0;
        pluck(sc[idx] + up, t, m.pluck * (0.6 + Math.random() * 0.4));
        if (state.day && Math.random() < 0.25) pluck(sc[Math.min(sc.length - 1, idx + 2)], t + 0.18, m.pluck * 0.5);
      }
      const [a, b] = m.gap; state.nextNote = t + a + Math.random() * (b - a);
    }
  }

  return {
    setOn(v) {
      on = v;
      if (v && !ctx) build();
      if (!ctx) return;
      if (v) { ctx.resume(); state.nextNote = ctx.currentTime + 0.4; state.nextChord = ctx.currentTime + 6; if (!timer) timer = setInterval(tick, 100); }
      master.gain.setTargetAtTime(v ? 0.75 : 0, ctx.currentTime, v ? 0.8 : 0.25);
    },
    update(p, keys) { state.p = p; if (keys) state.keys = keys; },
    setDay(d) { const was = state.day; state.day = d ? 1 : 0; if (ctx && was !== state.day) setChord(state.chord); },
    levels() { return ctx ? { state: ctx.state, day: state.day, ...levels() } : null; },
  };
}
