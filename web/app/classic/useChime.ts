"use client";

import { useRef } from "react";

// Synthesized Mac-style sounds via Web Audio (no asset files). The startup chord
// is a warm major swell; click/open are short blips. Created on first use so it
// only spins up after a user gesture (browsers block audio before that).
export function useChime() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ctx = (): AudioContext | null => {
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        ctxRef.current = new AC();
      }
      if (ctxRef.current.state === "suspended") ctxRef.current.resume();
      return ctxRef.current;
    } catch {
      return null;
    }
  };

  const startup = () => {
    const ac = ctx();
    if (!ac) return;
    const now = ac.currentTime;
    const master = ac.createGain();
    master.connect(ac.destination);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.55, now + 0.09);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

    // warm, bright major chord (the "bong")
    const freqs = [130.81, 164.81, 196.0, 261.63, 329.63, 392.0];
    freqs.forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = i < 2 ? "triangle" : "sine";
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.value = 0.16 / (i * 0.5 + 1);
      o.connect(g).connect(master);
      o.start(now);
      o.stop(now + 2.85);
    });
  };

  const blip = (freq = 220, dur = 0.05, type: OscillatorType = "square", vol = 0.07) => {
    const ac = ctx();
    if (!ac) return;
    const now = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(ac.destination);
    o.start(now);
    o.stop(now + dur + 0.01);
  };

  // short filtered noise burst (used for clicks / rustle)
  const burst = (dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = "bandpass") => {
    const ac = ctx();
    if (!ac) return;
    const now = ac.currentTime;
    const n = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(ac.destination);
    src.start(now);
  };

  return {
    startup,
    click: () => blip(180, 0.04, "square", 0.05),
    open: () => {
      blip(440, 0.05, "triangle", 0.06);
      setTimeout(() => blip(660, 0.06, "triangle", 0.05), 50);
    },
    close: () => blip(160, 0.06, "sine", 0.06),
    // ASMR mechanical key: bright click transient + low "thock", randomized
    keyTap: () => {
      burst(0.028, 1700 + Math.random() * 1500, 0.8, 0.2);
      blip(110 + Math.random() * 70, 0.045, "sine", 0.12);
    },
    // floppy insert: a soft mechanical chunk + whirr
    floppy: () => {
      burst(0.06, 900, 1.2, 0.16);
      setTimeout(() => burst(0.12, 400, 3, 0.1, "lowpass"), 70);
      blip(90, 0.18, "sawtooth", 0.05);
    },
    // leaf rustle: airy filtered noise
    rustle: () => burst(0.22, 5200, 0.6, 0.09, "highpass"),
  };
}
