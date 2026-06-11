"use client";

// ============================================================================
// Market Bubble Macintosh — sound engine (WebAudio, no samples)
// Recreates the useChime voice: startup chord, clicks, window pops, key taps,
// plus game/trade blips. All synthesized so the site ships zero audio files.
// Exposed as MacSound. Every method is safe to call before user gesture
// (it just no-ops until the context is allowed to start).
// ============================================================================
function __initMacSound() {
  let ctx = null;
  let muted = false;
  let master = null;
  let volume = 1;
  let amb = null; // ambient loop handle
  try { volume = Math.min(1, Math.max(0, parseFloat(localStorage.getItem("mbmac.volume") ?? "1"))); } catch (e) {}

  function ac() {
    if (muted) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      return ctx.state === "running" || ctx.state === "suspended" ? ctx : null;
    } catch (e) {
      return null;
    }
  }

  // master gain — the Control Panel's speaker-volume knob
  function out(c) {
    if (!master) {
      master = c.createGain();
      master.gain.value = volume;
      master.connect(c.destination);
    }
    return master;
  }

  // one enveloped oscillator note
  function note(freq, { t = 0, dur = 0.18, type = "sine", gain = 0.16, glide = 0 } = {}) {
    const c = ac();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    const start = c.currentTime + t;
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + glide), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(out(c));
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  // short filtered noise burst (clicks, taps)
  function noise({ t = 0, dur = 0.05, gain = 0.1, freq = 2200, q = 1.2 } = {}) {
    const c = ac();
    if (!c) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.value = gain;
    const start = c.currentTime + t;
    src.connect(f).connect(g).connect(out(c));
    src.start(start);
  }

  // soft low-passed noise breath (ASMR-grade: bassy, tactile, never hissy)
  function breath({ t = 0, dur = 0.3, gain = 0.03, freq = 800, q = 0.5, glide = 0 } = {}) {
    const c = ac();
    if (!c) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.sin((i / len) * Math.PI); // smooth swell in & out
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    const start = c.currentTime + t;
    f.frequency.setValueAtTime(freq, start);
    if (glide) f.frequency.linearRampToValueAtTime(Math.max(120, freq + glide), start + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(out(c));
    src.start(start);
  }

  const MacSound = {
    // the boot chord — a warm C-major bloom, very "1991 Macintosh"
    startup() {
      [261.63, 329.63, 392.0, 523.25].forEach((f, i) =>
        note(f, { t: i * 0.012, dur: 1.5, type: "triangle", gain: 0.11 })
      );
      note(1046.5, { t: 0.05, dur: 1.1, type: "sine", gain: 0.035 });
    },
    click() {
      noise({ dur: 0.03, gain: 0.08, freq: 3200 });
    },
    open() {
      note(660, { dur: 0.09, type: "triangle", gain: 0.07 });
      note(880, { t: 0.06, dur: 0.1, type: "triangle", gain: 0.06 });
    },
    close() {
      note(880, { dur: 0.09, type: "triangle", gain: 0.06 });
      note(587, { t: 0.055, dur: 0.11, type: "triangle", gain: 0.06 });
    },
    keyTap() {
      // varied pitch so a flurry of keys sounds mechanical, not sampled
      const f = 1500 + Math.random() * 900;
      noise({ dur: 0.03, gain: 0.1, freq: f, q: 0.9 });
      noise({ t: 0.012, dur: 0.022, gain: 0.06, freq: f * 2.2 });
      note(120 + Math.random() * 40, { dur: 0.03, type: "square", gain: 0.02 });
    },
    // ---- desk-prop voices ----
    // cat: a soft amplitude-modulated rumble (~1.1s)
    purr() {
      const c = ac();
      if (!c) return;
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = 46;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 240;
      const g = c.createGain();
      const t0 = c.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.12);
      g.gain.setValueAtTime(0.05, t0 + 0.85);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.15);
      // flutter (the purr itself)
      const lfo = c.createOscillator();
      lfo.frequency.value = 24;
      const lg = c.createGain();
      lg.gain.value = 0.028;
      lfo.connect(lg).connect(g.gain);
      o.connect(lp).connect(g).connect(out(c));
      o.start(t0);
      lfo.start(t0);
      o.stop(t0 + 1.2);
      lfo.stop(t0 + 1.2);
    },
    // plant: the faintest brush of leaves — felt more than heard
    rustle() {
      breath({ dur: 0.4, gain: 0.014, freq: 1100, glide: -300 });
      breath({ t: 0.18, dur: 0.32, gain: 0.009, freq: 1400, glide: -500 });
    },
    // mug: a real sip — gentle draw in, tiny swallow, warm exhale
    sip() {
      breath({ dur: 0.42, gain: 0.05, freq: 500, glide: 600 });       // the draw
      note(140, { t: 0.46, dur: 0.1, type: "sine", gain: 0.045, glide: -45 }); // swallow
      note(95, { t: 0.56, dur: 0.07, type: "sine", gain: 0.025 });
      breath({ t: 0.7, dur: 0.5, gain: 0.022, freq: 700, glide: -350 }); // soft “ahh”
    },
    // pen cup: soft ceramic-and-wood tumble — low, round, satisfying
    rattle() {
      const taps = [
        [0, 340, 0.05], [0.07, 520, 0.04], [0.16, 290, 0.055], [0.26, 430, 0.035], [0.38, 360, 0.025],
      ];
      for (const [t, f, g] of taps) {
        note(f, { t, dur: 0.09, type: "triangle", gain: g });
        breath({ t, dur: 0.06, gain: 0.02, freq: 900 });
      }
    },
    // mouse: one soft, low micro-switch tick
    mouseClick() {
      noise({ dur: 0.02, gain: 0.07, freq: 1400, q: 2 });
    },
    // floppy stack: plastic shells settling — two low clacks and a slide
    floppyClack() {
      note(310, { dur: 0.045, type: "square", gain: 0.035 });
      breath({ dur: 0.08, gain: 0.03, freq: 1200 });
      note(240, { t: 0.09, dur: 0.05, type: "square", gain: 0.028 });
      breath({ t: 0.1, dur: 0.12, gain: 0.022, freq: 800, glide: -300 });
    },
    // newspaper: a dry page shuffle
    paper() {
      noise({ dur: 0.16, gain: 0.03, freq: 1500, q: 0.4 });
      noise({ t: 0.09, dur: 0.12, gain: 0.022, freq: 2300, q: 0.5 });
    },
    // lamp: pull-chain — two mechanical ticks + a faint filament ping
    chain() {
      noise({ dur: 0.025, gain: 0.09, freq: 2600, q: 2.5 });
      noise({ t: 0.09, dur: 0.03, gain: 0.11, freq: 1900, q: 2 });
      note(1750, { t: 0.1, dur: 0.18, type: "sine", gain: 0.018 });
    },
    // cash-register-ish: buy/sell fills
    trade(up = true) {
      note(up ? 523 : 392, { dur: 0.08, type: "square", gain: 0.05 });
      note(up ? 784 : 523, { t: 0.07, dur: 0.12, type: "square", gain: 0.05 });
      noise({ t: 0.02, dur: 0.04, gain: 0.05, freq: 5200 });
    },
    coin() {
      note(988, { dur: 0.06, type: "square", gain: 0.045 });
      note(1319, { t: 0.05, dur: 0.12, type: "square", gain: 0.045 });
    },
    // sad trombone-ish error / bomb / margin call
    error() {
      note(220, { dur: 0.3, type: "sawtooth", gain: 0.07, glide: -60 });
      note(110, { t: 0.02, dur: 0.32, type: "square", gain: 0.045, glide: -30 });
    },
    eject() {
      noise({ dur: 0.16, gain: 0.07, freq: 900, q: 0.7 });
      note(140, { t: 0.03, dur: 0.18, type: "triangle", gain: 0.05, glide: 60 });
    },
    setMuted(v) {
      muted = !!v;
    },
    get muted() {
      return muted;
    },
    setVolume(v) {
      volume = Math.min(1, Math.max(0, v));
      if (master) master.gain.value = volume;
      try { localStorage.setItem("mbmac.volume", String(volume)); } catch (e) {}
    },
    get volume() {
      return volume;
    },
    // ---- ambient room tone: lo-fi chord pad + vinyl crackle, very quiet ----
    startAmbient() {
      const c = ac();
      if (!c || amb) return;
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out(c));
      // slow lo-fi chord cycle — Cmaj7 → Am7 → Fmaj7 → G6, one bar each
      const chords = [
        [261.63, 329.63, 392.0, 493.88],
        [220.0, 261.63, 329.63, 415.3],
        [174.61, 220.0, 261.63, 349.23],
        [196.0, 246.94, 293.66, 392.0],
      ];
      let bar = 0;
      const playBar = () => {
        if (muted) return;
        const ch = chords[bar % chords.length];
        bar++;
        ch.forEach((f, i) => note(f / 2, { t: 0.04 * i, dur: 3.9, type: "sine", gain: 0.016 }));
        note(ch[0] / 4, { dur: 3.6, type: "triangle", gain: 0.02 });
        if (Math.random() < 0.65) {
          const f = ch[Math.floor(Math.random() * ch.length)] * (Math.random() < 0.5 ? 1 : 2);
          note(f, { t: 1.6 + Math.random() * 1.4, dur: 0.6, type: "triangle", gain: 0.011 });
        }
      };
      playBar();
      const timer = setInterval(playBar, 4000);
      amb = { timer, g };
      try { localStorage.setItem("mbmac.ambient", "1"); } catch (e) {}
    },
    stopAmbient() {
      if (!amb) return;
      clearInterval(amb.timer);
      try { amb.g.disconnect(); } catch (e) {}
      amb = null;
      try { localStorage.setItem("mbmac.ambient", "0"); } catch (e) {}
    },
    get ambientOn() {
      return !!amb;
    },
    get ambientWanted() {
      try { return localStorage.getItem("mbmac.ambient") === "1"; } catch (e) { return false; }
    },
  };

  return MacSound;
}
export const MacSound = __initMacSound();
