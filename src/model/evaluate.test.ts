import { describe, expect, it } from "vitest";
import { evaluateKeyframes, evaluateParam, ZERO_FEATURES } from "@/model/evaluate";
import type { Keyframe, VisualClip } from "@/model/types";

function clip(overrides: Partial<VisualClip> = {}): VisualClip {
  return {
    id: "c1",
    type: "visual",
    presetId: "particleField",
    start: 10,
    duration: 8,
    seed: 42,
    params: { burst: 0.2 },
    keyframes: {},
    modulations: [],
    ...overrides,
  };
}

describe("evaluateKeyframes", () => {
  const lane: Keyframe[] = [
    { time: 0, value: 0, easing: "linear" },
    { time: 2, value: 1, easing: "linear" },
    { time: 4, value: 1, easing: "step" },
  ];

  it("returns fallback for an empty lane", () => {
    expect(evaluateKeyframes([], 1, 0.7)).toBe(0.7);
  });

  it("clamps before the first and after the last keyframe", () => {
    expect(evaluateKeyframes(lane, -5, 0)).toBe(0);
    expect(evaluateKeyframes(lane, 99, 0)).toBe(1);
  });

  it("interpolates linearly between keyframes", () => {
    expect(evaluateKeyframes(lane, 1, 0)).toBeCloseTo(0.5);
  });

  it("holds the previous value with step easing", () => {
    expect(evaluateKeyframes(lane, 3, 0)).toBe(1);
  });
});

describe("evaluateParam", () => {
  const range = { min: 0, max: 1 };

  it("uses base params when no keyframes or modulations exist", () => {
    const value = evaluateParam(clip(), "burst", 12, range, 0, ZERO_FEATURES);
    expect(value).toBeCloseTo(0.2);
  });

  it("adds audio-reactive modulation scaled by the param range", () => {
    const modulated = clip({
      modulations: [{ id: "m1", param: "burst", source: "rms", amount: 0.5, smoothing: 0 }],
    });
    const features = () => 0.8;
    const value = evaluateParam(modulated, "burst", 12, range, 0, features);
    expect(value).toBeCloseTo(0.2 + 0.8 * 0.5);
  });

  it("clamps the final value to the param range", () => {
    const modulated = clip({
      modulations: [{ id: "m1", param: "burst", source: "rms", amount: 1, smoothing: 0 }],
    });
    const features = () => 1;
    const value = evaluateParam(modulated, "burst", 12, range, 0, features);
    expect(value).toBe(1);
  });

  it("evaluates keyframes in clip-local time", () => {
    const keyframed = clip({
      keyframes: {
        burst: [
          { time: 0, value: 0, easing: "linear" },
          { time: 4, value: 1, easing: "linear" },
        ],
      },
    });
    // Timeline time 12 = clip-local time 2 (clip starts at 10).
    const value = evaluateParam(keyframed, "burst", 12, range, 0, ZERO_FEATURES);
    expect(value).toBeCloseTo(0.5);
  });
});
