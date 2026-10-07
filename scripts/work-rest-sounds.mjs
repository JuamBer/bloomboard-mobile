// Writes the Work/Rest clock's four cues to assets/sounds/*.wav.
//
// The web synthesises them with Web Audio at the moment they play
// (bloomboard-frontend src/widgets/tv/useWorkRestSound.ts + shared/lib/sound.ts).
// React Native has no Web Audio, so the same tones — frequencies, offsets,
// lengths and the short ramp at both ends — are rendered once into small WAV
// files that expo-audio plays. Re-tune a cue there and here, then run:
//
//   node scripts/work-rest-sounds.mjs
//
// Louder than the web's 0.18 gain: that drives a TV's speakers, where this
// plays through a phone's media volume, which the member already controls.

import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22_050;
const PEAK = 0.55;
const RAMP_IN = 0.012;

/** [frequency, start offset in seconds], each `duration` long. */
const CUES = {
  tick: { tones: [[880, 0]], duration: 0.09 },
  go: { tones: [[1318.5, 0]], duration: 0.3 },
  rest: {
    tones: [
      [659.3, 0],
      [523.3, 0.12],
    ],
    duration: 0.18,
  },
  finish: {
    tones: [
      [659.3, 0],
      [830.6, 0.13],
      [987.8, 0.26],
      [1318.5, 0.39],
    ],
    duration: 0.35,
  },
};

// Web Audio's exponentialRampToValueAtTime, from 0.0001 up to the peak and
// back down, so the shape (and the absence of a click) matches the web's.
function envelope(t, duration) {
  const floor = 0.0001;
  if (t < 0 || t > duration) return 0;
  if (t < RAMP_IN) return floor * (PEAK / floor) ** (t / RAMP_IN);
  const k = (t - RAMP_IN) / (duration - RAMP_IN);
  return PEAK * (floor / PEAK) ** k;
}

function render({ tones, duration }) {
  const length = Math.max(...tones.map(([, at]) => at)) + duration + 0.02;
  const samples = new Float32Array(Math.ceil(length * RATE));
  for (const [frequency, at] of tones) {
    for (let i = 0; i < samples.length; i++) {
      const t = i / RATE - at;
      const gain = envelope(t, duration);
      if (gain) samples[i] += gain * Math.sin(2 * Math.PI * frequency * t);
    }
  }
  return samples;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) =>
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32_767), i * 2),
  );
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const out = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'assets',
  'sounds',
);
mkdirSync(out, { recursive: true });
for (const [name, cue] of Object.entries(CUES)) {
  const file = join(out, `work-rest-${name}.wav`);
  writeFileSync(file, wav(render(cue)));
  console.log(file);
}
