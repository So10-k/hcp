#!/usr/bin/env node
// Generates small WAV files used by the Remotion ad reel:
//   public/click.wav      — sharp UI click (~40ms)
//   public/pop.wav        — soft celebratory pop (~200ms)
//   public/ding.wav       — short chime (~600ms)
//   public/bg-pulse.wav   — 10s ambient bed, kick + pad
//
// Mono 16-bit PCM @ 44.1kHz.

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "..", "public");

const SR = 44100;

function writeWav(path, samples) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(clamped * 32000), 44 + i * 2);
  }
  writeFileSync(path, buf);
  console.log(`→ ${path}  (${(dataSize / 1024).toFixed(1)} KiB)`);
}

// ---------- click.wav — punchy UI click ------------------------------------
{
  const dur = 0.045;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const env = Math.exp(-t * 160);
    const tone = Math.sin(2 * Math.PI * 1700 * t);
    const noise = (Math.random() - 0.5) * 0.8;
    out[i] = (tone * 0.55 + noise * 0.45) * env * 0.85;
  }
  writeWav(resolve(publicDir, "click.wav"), out);
}

// ---------- pop.wav — soft rounded pop --------------------------------------
{
  const dur = 0.22;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    // pitch sweep from 820 Hz to 280 Hz
    const pitch = 820 * Math.exp(-t * 6) + 280 * (1 - Math.exp(-t * 6));
    const env = Math.pow(Math.max(0, 1 - t / dur), 1.4);
    const tone = Math.sin(2 * Math.PI * pitch * t);
    const sub = Math.sin(2 * Math.PI * (pitch / 2) * t) * 0.3;
    out[i] = (tone + sub) * env * 0.55;
  }
  writeWav(resolve(publicDir, "pop.wav"), out);
}

// ---------- ding.wav — bell-like two-tone chime -----------------------------
{
  const dur = 0.6;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  // Notes: C6 (1046.5) + E6 (1318.5) + G6 (1568) — bright major triad
  const freqs = [1046.5, 1318.5, 1568];
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const env = Math.exp(-t * 4.5);
    let s = 0;
    for (const f of freqs) s += Math.sin(2 * Math.PI * f * t);
    out[i] = (s / freqs.length) * env * 0.55;
  }
  writeWav(resolve(publicDir, "ding.wav"), out);
}

// ---------- bg-pulse.wav — 10s ambient bed: pad + soft kick ----------------
{
  const dur = 10;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);

  // Soft kick on each beat at 120 BPM (every 0.5s = 22050 samples).
  const beatSamples = SR / 2;
  const kick = (relSample) => {
    const t = relSample / SR;
    if (t > 0.25) return 0;
    const env = Math.exp(-t * 18);
    const pitch = 120 * Math.exp(-t * 12) + 55;
    return Math.sin(2 * Math.PI * pitch * t) * env * 0.4;
  };

  // Pad: slow chord swap every 5 seconds (Am → C).
  const chordAm = [220.0, 261.63, 329.63]; // A3 C4 E4
  const chordC = [261.63, 329.63, 392.0];  // C4 E4 G4
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const chord = t < 5 ? chordAm : chordC;
    let pad = 0;
    for (const f of chord) pad += Math.sin(2 * Math.PI * f * t);
    pad = (pad / chord.length) * 0.08;

    // gentle LFO amplitude
    pad *= 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.25 * t);

    const kickSample = kick(i % beatSamples);

    // Hi-hat tick on off-beats (every quarter).
    const quarter = SR / 4;
    const localQ = i % quarter;
    let hat = 0;
    if (localQ < SR * 0.015) {
      const env = Math.exp(-(localQ / SR) * 300);
      hat = (Math.random() - 0.5) * env * 0.06;
    }

    // Global fade in 0-0.5s, fade out 9.3-10s.
    let vol = 1;
    if (t < 0.5) vol = t / 0.5;
    if (t > 9.3) vol = Math.max(0, (10 - t) / 0.7);

    out[i] = (pad + kickSample + hat) * vol * 0.9;
  }
  writeWav(resolve(publicDir, "bg-pulse.wav"), out);
}

// ---------- whoosh.wav — short filtered-noise sweep for transitions ---------
{
  const dur = 0.42;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  // Simple one-pole low-pass with a rising cutoff to mimic a filter sweep.
  let lp = 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const cutoff = 0.04 + t * 0.55; // rising cutoff
    const noise = (Math.random() - 0.5) * 2;
    lp = lp + cutoff * (noise - lp);
    const env = Math.sin(Math.PI * Math.min(1, t / dur)); // hump env
    out[i] = lp * env * 0.55;
  }
  writeWav(resolve(publicDir, "whoosh.wav"), out);
}

// ---------- thud.wav — low impact ------------------------------------------
{
  const dur = 0.28;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const pitch = 90 * Math.exp(-t * 22) + 38;
    const env = Math.exp(-t * 8);
    const sine = Math.sin(2 * Math.PI * pitch * t);
    const noise = (Math.random() - 0.5) * 0.4 * Math.exp(-t * 40);
    out[i] = (sine * 0.85 + noise * 0.25) * env * 0.85;
  }
  writeWav(resolve(publicDir, "thud.wav"), out);
}

// ---------- spring-bed.wav — 30s musical bed --------------------------------
// Structure: 15 bars @ 120 BPM (2s each). Progression Am-F-C-G looping, with
// layers added per bar: intro pad → kick → hat → snare → lead melody → outro.
{
  const dur = 30;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  const BPM = 120;
  const secPerBeat = 60 / BPM;
  const secPerBar = secPerBeat * 4;

  const chords = [
    { bar: 0, notes: [220.0, 261.63, 329.63] },          // Am
    { bar: 1, notes: [220.0, 261.63, 329.63] },          // Am
    { bar: 2, notes: [174.61, 220.0, 261.63] },          // F
    { bar: 3, notes: [261.63, 329.63, 392.0] },          // C
    { bar: 4, notes: [196.0, 246.94, 293.66] },          // G
    { bar: 5, notes: [220.0, 261.63, 329.63] },          // Am
    { bar: 6, notes: [174.61, 220.0, 261.63] },          // F
    { bar: 7, notes: [261.63, 329.63, 392.0] },          // C
    { bar: 8, notes: [196.0, 246.94, 293.66] },          // G  (build)
    { bar: 9, notes: [220.0, 261.63, 329.63] },          // Am (drop)
    { bar: 10, notes: [174.61, 220.0, 261.63] },         // F
    { bar: 11, notes: [261.63, 329.63, 392.0] },         // C
    { bar: 12, notes: [196.0, 246.94, 293.66] },         // G
    { bar: 13, notes: [220.0, 261.63, 329.63] },         // Am  (outro)
    { bar: 14, notes: [174.61, 220.0, 261.63] }          // F held
  ];

  // Lead melody for bars 9-12 (the "hook"), pentatonic A minor.
  // Each entry: [barIndex, offsetInBeats, durationBeats, freq]
  const lead = [
    [9, 0, 0.5, 523.25], [9, 0.5, 0.5, 659.25], [9, 1, 1, 523.25],
    [9, 2, 0.5, 440.0], [9, 2.5, 1.5, 523.25],
    [10, 0, 0.5, 523.25], [10, 0.5, 0.5, 698.46], [10, 1, 1, 523.25],
    [10, 2, 0.5, 440.0], [10, 2.5, 1.5, 523.25],
    [11, 0, 0.5, 659.25], [11, 0.5, 0.5, 783.99], [11, 1, 1, 659.25],
    [11, 2, 0.5, 523.25], [11, 2.5, 1.5, 659.25],
    [12, 0, 0.5, 587.33], [12, 0.5, 0.5, 739.99], [12, 1, 1, 587.33],
    [12, 2, 0.5, 493.88], [12, 2.5, 1.5, 587.33]
  ];

  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const barIdx = Math.min(chords.length - 1, Math.floor(t / secPerBar));
    const barT = (t - barIdx * secPerBar) / secPerBar; // 0..1 within bar
    const beatT = ((t / secPerBeat) % 1); // 0..1 within beat
    const sixteenthT = ((t / (secPerBeat / 4)) % 1); // 0..1 within 16th

    // ---------- Pad (always on, slightly louder on drop) ----------
    const chord = chords[barIdx].notes;
    let pad = 0;
    for (const f of chord) pad += Math.sin(2 * Math.PI * f * t);
    pad = (pad / chord.length);
    // LFO breathing
    pad *= 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.2 * t);
    const padLevel = barIdx === 0 ? 0.12 : barIdx >= 9 && barIdx <= 12 ? 0.18 : 0.14;
    pad *= padLevel;

    // ---------- Sub bass (root of each chord) on drop bars ----------
    let sub = 0;
    if (barIdx >= 5 && barIdx <= 12) {
      const root = chord[0] / 2; // octave down
      sub = Math.sin(2 * Math.PI * root * t) * 0.18;
      // Sidechain-ish duck on each beat start
      const beatDuck = Math.min(1, beatT * 6);
      sub *= beatDuck;
    }

    // ---------- Kick on every beat from bar 1 onward ----------
    let kick = 0;
    if (barIdx >= 1 && barIdx <= 13) {
      const localBeat = (t % secPerBeat);
      if (localBeat < 0.22) {
        const kt = localBeat;
        const env = Math.exp(-kt * 22);
        const pitch = 95 * Math.exp(-kt * 14) + 45;
        kick = Math.sin(2 * Math.PI * pitch * kt) * env * 0.44;
      }
    }

    // ---------- Hat on every 8th from bar 2 onward ----------
    let hat = 0;
    if (barIdx >= 2 && barIdx <= 13) {
      const eighthPos = (t / (secPerBeat / 2)) % 1;
      const eighthStart = eighthPos * (secPerBeat / 2);
      if (eighthStart < 0.025) {
        const env = Math.exp(-(eighthStart) * 320);
        const openness = ((t / (secPerBeat / 2)) | 0) % 2 === 1 ? 0.7 : 0.35;
        hat = (Math.random() - 0.5) * env * 0.09 * openness;
      }
    }

    // ---------- Snare on beats 2 and 4 from bar 3 onward ----------
    let snare = 0;
    if (barIdx >= 3 && barIdx <= 12) {
      const localBeat = (t % secPerBeat);
      const beatInBar = Math.floor((t % secPerBar) / secPerBeat);
      if ((beatInBar === 1 || beatInBar === 3) && localBeat < 0.14) {
        const env = Math.exp(-localBeat * 28);
        const tone = Math.sin(2 * Math.PI * 220 * localBeat) * 0.3;
        const noise = (Math.random() - 0.5) * 0.8;
        snare = (tone + noise) * env * 0.18;
      }
    }

    // ---------- Riser on bar 8 (build) ----------
    let riser = 0;
    if (barIdx === 8) {
      const riseT = barT;
      const pitch = 200 + riseT * riseT * 1800;
      const env = riseT * 0.22;
      riser = Math.sin(2 * Math.PI * pitch * t) * env;
      // Noise sweep
      const noise = (Math.random() - 0.5);
      riser += noise * riseT * 0.08;
    }

    // ---------- Lead melody on drop (bars 9-12) ----------
    let leadOut = 0;
    for (const entry of lead) {
      const [lBar, lOffsetBeats, lDurBeats, lFreq] = entry;
      const lStart = lBar * secPerBar + lOffsetBeats * secPerBeat;
      const lEnd = lStart + lDurBeats * secPerBeat;
      if (t >= lStart && t < lEnd) {
        const lt = t - lStart;
        const env = Math.min(1, lt * 40) * Math.exp(-lt * 2.8); // attack + decay
        // Square-ish tone: sine + 3rd harmonic
        leadOut += (Math.sin(2 * Math.PI * lFreq * t) * 0.75 +
                    Math.sin(2 * Math.PI * lFreq * 2 * t) * 0.18) *
                   env * 0.18;
      }
    }

    // ---------- Outro fade on bar 14 ----------
    let master = 1;
    if (barIdx >= 13) {
      // fade out kicks/hats
      kick *= 1 - (t - 13 * secPerBar) / (2 * secPerBar);
      hat *= 1 - (t - 13 * secPerBar) / (2 * secPerBar);
    }
    if (barIdx === 14) {
      master = Math.max(0, 1 - (t - 14 * secPerBar) / secPerBar);
    }

    // Global fade in over 0.4s
    if (t < 0.4) master *= t / 0.4;

    out[i] = (pad + sub + kick + hat + snare + riser + leadOut) * master * 0.95;
  }

  writeWav(resolve(publicDir, "spring-bed.wav"), out);
}

// ---------- tutorial-bed.wav — 25s warm instructional bed ------------------
// Gentle pad progression C → Am → F → G → C with a soft heartbeat kick and
// bell hits at each step transition. No drop, no snare — this plays *under*
// an explainer so it can't fight for attention.
{
  const dur = 25;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);

  const chordAt = (t) => {
    if (t < 6) return [261.63, 329.63, 392.0];      // C
    if (t < 12) return [220.0, 261.63, 329.63];     // Am
    if (t < 18) return [174.61, 220.0, 261.63];     // F
    if (t < 22) return [196.0, 246.94, 293.66];     // G
    return [261.63, 329.63, 392.0];                 // C (resolve)
  };

  // Bell chimes on hook + each step + outro.
  const bells = [
    { at: 0.4, freq: 659.25, dur: 1.6 },   // E5 — hook
    { at: 3.0, freq: 523.25, dur: 1.6 },   // C5 — enter step 1
    { at: 9.0, freq: 440.0, dur: 1.6 },    // A4 — step 2
    { at: 15.0, freq: 392.0, dur: 1.6 },   // G4 — step 3
    { at: 21.0, freq: 659.25, dur: 2.5 },  // E5 — outro resolution
    { at: 22.2, freq: 783.99, dur: 2.0 }   // G5 — outro harmony
  ];

  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const chord = chordAt(t);

    // Warm pad (three stacked sines)
    let pad = 0;
    for (const f of chord) pad += Math.sin(2 * Math.PI * f * t);
    pad = (pad / chord.length) * 0.16;
    pad *= 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.22 * t); // slow breath

    // Soft heartbeat kick every 0.75s, fades out in outro
    const kickPeriod = 0.75;
    const localK = t % kickPeriod;
    let kick = 0;
    if (localK < 0.2 && t < 23) {
      const env = Math.exp(-localK * 14);
      const pitch = 80 * Math.exp(-localK * 10) + 48;
      kick = Math.sin(2 * Math.PI * pitch * localK) * env * 0.2;
    }

    // Bells
    let bell = 0;
    for (const b of bells) {
      if (t >= b.at && t < b.at + b.dur) {
        const bt = t - b.at;
        const env = Math.exp(-bt * 2.4);
        bell += (
          Math.sin(2 * Math.PI * b.freq * t) * 0.55 +
          Math.sin(2 * Math.PI * b.freq * 2 * t) * 0.16 +
          Math.sin(2 * Math.PI * b.freq * 3 * t) * 0.06
        ) * env * 0.14;
      }
    }

    // Sub bass (root / 2) sustain on beat 1 of each 6s section
    let sub = 0;
    if ((t > 0.1 && t < 23)) {
      const root = chord[0] / 2;
      sub = Math.sin(2 * Math.PI * root * t) * 0.09;
      sub *= 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.35 * t);
    }

    // Master envelope: fade in 0-0.5s, fade out 24-25s
    let master = 1;
    if (t < 0.5) master = t / 0.5;
    if (t > 24) master = Math.max(0, (25 - t) / 1);

    out[i] = (pad + kick + bell + sub) * master * 0.95;
  }

  writeWav(resolve(publicDir, "tutorial-bed.wav"), out);
}

console.log("Done generating audio.");
