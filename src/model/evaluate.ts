import type { EasingMode, Keyframe, Modulation, ModulationSource, VisualClip } from "@/model/types";

/**
 * Samples one audio analysis feature at an absolute timeline time.
 * Implementations must be pure with respect to time so preview and export
 * stay deterministic.
 */
export type FeatureSampler = (source: ModulationSource, time: number) => number;

export const ZERO_FEATURES: FeatureSampler = () => 0;

function applyEasing(mode: EasingMode, t: number): number {
  switch (mode) {
    case "linear":
      return t;
    case "step":
      return 0;
    case "smooth":
      return t * t * (3 - 2 * t);
    default: {
      const exhaustive: never = mode;
      throw new Error(`Unhandled easing mode: ${String(exhaustive)}`);
    }
  }
}

/** Evaluates a sorted keyframe lane at clip-local time. */
export function evaluateKeyframes(keyframes: Keyframe[], time: number, fallback: number): number {
  if (keyframes.length === 0) return fallback;
  if (time <= keyframes[0].time) return keyframes[0].value;
  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) return last.value;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (time >= a.time && time < b.time) {
      const span = b.time - a.time;
      const t = span > 0 ? (time - a.time) / span : 0;
      const eased = applyEasing(b.easing, t);
      return a.value + (b.value - a.value) * eased;
    }
  }
  return last.value;
}

function evaluateModulation(
  modulation: Modulation,
  timelineTime: number,
  features: FeatureSampler,
): number {
  // Exponential smoothing approximated by averaging a few recent samples at
  // fixed offsets, keeping evaluation pure/deterministic for any t.
  const raw = features(modulation.source, timelineTime);
  if (modulation.smoothing <= 0) return raw * modulation.amount;
  const window = modulation.smoothing * 0.25;
  const s1 = features(modulation.source, timelineTime - window);
  const s2 = features(modulation.source, timelineTime - window * 2);
  const smoothed = raw * 0.5 + s1 * 0.3 + s2 * 0.2;
  return smoothed * modulation.amount;
}

export interface ParamRange {
  min: number;
  max: number;
}

/**
 * Resolves a visual parameter's final value at an absolute timeline time:
 * keyframed base value plus the sum of all audio-reactive modulations,
 * clamped to the parameter range.
 */
export function evaluateParam(
  clip: VisualClip,
  param: string,
  timelineTime: number,
  range: ParamRange,
  fallback: number,
  features: FeatureSampler,
): number {
  const clipTime = timelineTime - clip.start;
  const base = evaluateKeyframes(clip.keyframes[param] ?? [], clipTime, clip.params[param] ?? fallback);
  let value = base;
  for (const modulation of clip.modulations) {
    if (modulation.param !== param) continue;
    value += evaluateModulation(modulation, timelineTime, features) * (range.max - range.min);
  }
  return Math.min(range.max, Math.max(range.min, value));
}
