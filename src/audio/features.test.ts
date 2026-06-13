import { describe, expect, it } from "vitest";
import type { AudioAnalysis } from "@/audio/analysisTypes";
import { createFeatureSampler } from "@/audio/features";

function analysis(overrides: Partial<AudioAnalysis> = {}): AudioAnalysis {
  return {
    sampleRate: 44100,
    duration: 2,
    featureRate: 10,
    rms: new Float32Array([0, 0.5, 1]),
    bass: new Float32Array([0, 0, 0]),
    mid: new Float32Array([0, 0, 0]),
    high: new Float32Array([0, 0, 0]),
    onsets: [0.25, 1],
    bpm: 120,
    beatOffset: 0,
    waveform: new Float32Array(),
    waveformBuckets: 0,
    ...overrides,
  };
}

describe("createFeatureSampler", () => {
  it("samples continuous analysis features by interpolation", () => {
    const features = createFeatureSampler(analysis(), null);

    expect(features("rms", 0.15)).toBeCloseTo(0.75);
  });

  it("keeps beat pulses derived from the editable beat grid", () => {
    const features = createFeatureSampler(analysis({ onsets: [0.3] }), { bpm: 60, offset: 0.1 });

    expect(features("beat", 0.1)).toBeCloseTo(1);
    expect(features("beat", 0.3)).toBeLessThan(1);
    expect(features("onset", 0.3)).toBeCloseTo(1);
  });

  it("returns an onset pulse from detected transient times", () => {
    const features = createFeatureSampler(analysis(), null);

    expect(features("onset", 0.24)).toBe(0);
    expect(features("onset", 0.25)).toBeCloseTo(1);
    expect(features("onset", 0.5)).toBeLessThan(0.01);
  });
});
