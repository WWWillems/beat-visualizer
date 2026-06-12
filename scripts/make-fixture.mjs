// Generates e2e/fixtures/beat120.wav: 8 seconds of 120 BPM kick-style pulses
// with a 440 Hz tone bed, 16-bit PCM mono WAV. Deterministic.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44100;
const SECONDS = 8;
const BPM = 120;

const sampleCount = SAMPLE_RATE * SECONDS;
const samples = new Float32Array(sampleCount);

// Tone bed.
for (let i = 0; i < sampleCount; i++) {
  samples[i] = 0.12 * Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE);
}

// Kick pulses: 60 Hz sine with fast exponential decay on every beat.
const period = (60 / BPM) * SAMPLE_RATE;
const kickLength = Math.floor(0.15 * SAMPLE_RATE);
for (let beat = 0; beat < sampleCount; beat += period) {
  const start = Math.floor(beat);
  for (let i = 0; i < kickLength && start + i < sampleCount; i++) {
    const envelope = Math.exp(-i / (kickLength / 6));
    samples[start + i] += 0.8 * envelope * Math.sin((2 * Math.PI * 60 * i) / SAMPLE_RATE);
  }
}

// Encode 16-bit PCM WAV.
const dataSize = sampleCount * 2;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);
for (let i = 0; i < sampleCount; i++) {
  const clamped = Math.max(-1, Math.min(1, samples[i]));
  buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
}

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "e2e", "fixtures", "beat120.wav");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath} (${buffer.length} bytes)`);
