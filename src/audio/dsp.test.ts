import { describe, expect, it } from "vitest";
import { analyzeAudio } from "@/audio/analyze";
import {
  estimateTempo,
  fft,
  logSpectrogram,
  pickOnsets,
  spectralFlux,
  stft,
  waveformPeaks,
} from "@/audio/dsp";

const SAMPLE_RATE = 44100;

function sine(frequency: number, seconds: number, amplitude = 1): Float32Array {
  const out = new Float32Array(Math.floor(seconds * SAMPLE_RATE));
  for (let i = 0; i < out.length; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE);
  }
  return out;
}

/** Click track: short decaying noise bursts at the given BPM. */
function clickTrack(bpm: number, seconds: number, offset = 0): Float32Array {
  const out = new Float32Array(Math.floor(seconds * SAMPLE_RATE));
  const period = (60 / bpm) * SAMPLE_RATE;
  const burstLength = Math.floor(0.02 * SAMPLE_RATE);
  for (let beat = offset * SAMPLE_RATE; beat < out.length; beat += period) {
    const start = Math.floor(beat);
    for (let i = 0; i < burstLength && start + i < out.length; i++) {
      // Deterministic pseudo-noise so the test is reproducible.
      const noise = Math.sin(i * 12.9898) * 43758.5453;
      out[start + i] = (noise - Math.floor(noise) - 0.5) * Math.exp(-i / (burstLength / 4));
    }
  }
  return out;
}

describe("fft", () => {
  it("finds the dominant bin of a pure sine", () => {
    const n = 2048;
    const frequency = 440;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      re[i] = Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE);
    }
    fft(re, im);

    let peakBin = 0;
    let peakMag = 0;
    for (let bin = 1; bin < n / 2; bin++) {
      const mag = Math.hypot(re[bin], im[bin]);
      if (mag > peakMag) {
        peakMag = mag;
        peakBin = bin;
      }
    }
    const expectedBin = Math.round((frequency / SAMPLE_RATE) * n);
    expect(Math.abs(peakBin - expectedBin)).toBeLessThanOrEqual(1);
  });

  it("rejects non-power-of-two sizes", () => {
    expect(() => fft(new Float32Array(1000), new Float32Array(1000))).toThrow();
  });
});

describe("onset detection", () => {
  it("detects clicks of a 120 BPM click track at half-second intervals", () => {
    const samples = clickTrack(120, 4);
    const frames = stft(samples, 2048, 512);
    const flux = spectralFlux(frames);
    const onsets = pickOnsets(flux, SAMPLE_RATE / 512);

    expect(onsets.length).toBeGreaterThanOrEqual(6);
    // Every detected onset should sit close to a multiple of 0.5s.
    for (const onset of onsets) {
      const nearest = Math.round(onset / 0.5) * 0.5;
      expect(Math.abs(onset - nearest)).toBeLessThan(0.08);
    }
  });
});

describe("tempo estimation", () => {
  it("estimates 120 BPM within tolerance", () => {
    const samples = clickTrack(120, 8);
    const frames = stft(samples, 2048, 512);
    const flux = spectralFlux(frames);
    const tempo = estimateTempo(flux, SAMPLE_RATE / 512);
    // Accept the octave (60/240 would be wrong, 120 +/- 3 right).
    expect(Math.abs(tempo.bpm - 120)).toBeLessThan(3);
  });
});

describe("analyzeAudio", () => {
  it("is deterministic for identical input", () => {
    const samples = clickTrack(100, 3);
    const a = analyzeAudio(samples.slice(), SAMPLE_RATE);
    const b = analyzeAudio(samples.slice(), SAMPLE_RATE);
    expect(a.bpm).toBe(b.bpm);
    expect(a.onsets).toEqual(b.onsets);
    expect(Array.from(a.rms)).toEqual(Array.from(b.rms));
    expect(Array.from(a.spectrum)).toEqual(Array.from(b.spectrum));
  });

  it("normalizes band energies to 0..1 and reports duration", () => {
    const samples = sine(440, 2, 0.8);
    const analysis = analyzeAudio(samples, SAMPLE_RATE);
    expect(analysis.duration).toBeCloseTo(2, 2);
    const max = Math.max(...analysis.mid);
    expect(max).toBeLessThanOrEqual(1);
    expect(max).toBeGreaterThan(0.99);
  });
});

describe("logSpectrogram", () => {
  it("creates normalized log-spaced spectral frames", () => {
    const frames = stft(sine(440, 1), 2048, 512);
    const spectrum = logSpectrogram(frames, SAMPLE_RATE, 2048, 64);

    expect(spectrum.length).toBe(frames.frameCount * 64);
    expect(Math.max(...spectrum)).toBeLessThanOrEqual(1);
    expect(Math.max(...spectrum)).toBeGreaterThan(0.99);
  });
});

describe("waveformPeaks", () => {
  it("captures min/max pairs", () => {
    const samples = sine(10, 1);
    const peaks = waveformPeaks(samples, 16);
    expect(peaks.length).toBe(32);
    expect(Math.min(...peaks)).toBeLessThan(-0.9);
    expect(Math.max(...peaks)).toBeGreaterThan(0.9);
  });
});
