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

console.log("Done generating audio.");
