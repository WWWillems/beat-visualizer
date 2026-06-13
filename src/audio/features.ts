import type { AudioAnalysis } from "@/audio/analysisTypes";
import type { FeatureSampler } from "@/model/evaluate";
import type { BeatGrid, ModulationSource } from "@/model/types";

/** How long the beat pulse takes to decay back to zero, in seconds. */
const BEAT_PULSE_DECAY = 0.3;
/** Detected transients should feel snappier than the musical beat grid. */
const ONSET_PULSE_DECAY = 0.16;

function sampleArray(values: Float32Array, featureRate: number, time: number): number {
  if (values.length === 0 || time < 0) return 0;
  const position = time * featureRate;
  const index = Math.floor(position);
  if (index >= values.length - 1) return values[values.length - 1] ?? 0;
  const frac = position - index;
  return values[index] * (1 - frac) + values[index + 1] * frac;
}

/**
 * The "beat" feature is a pulse that jumps to 1 on each grid beat and decays
 * exponentially. Derived purely from (time, grid), so it is deterministic.
 */
function beatPulse(grid: BeatGrid | null, time: number): number {
  if (!grid || grid.bpm <= 0) return 0;
  const period = 60 / grid.bpm;
  const sinceFirst = time - grid.offset;
  if (sinceFirst < 0) return 0;
  const sinceBeat = sinceFirst % period;
  return Math.exp((-sinceBeat / BEAT_PULSE_DECAY) * 4);
}

function previousOnset(onsets: number[], time: number): number | null {
  let low = 0;
  let high = onsets.length - 1;
  let match: number | null = null;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const onset = onsets[mid];
    if (onset <= time) {
      match = onset;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return match;
}

function onsetPulse(analysis: AudioAnalysis | null, time: number): number {
  if (!analysis || time < 0) return 0;
  const onset = previousOnset(analysis.onsets, time);
  if (onset === null) return 0;
  const sinceOnset = time - onset;
  return Math.exp((-sinceOnset / ONSET_PULSE_DECAY) * 4);
}

/**
 * Builds the deterministic feature sampler used by both preview and export.
 */
export function createFeatureSampler(
  analysis: AudioAnalysis | null,
  beatGrid: BeatGrid | null,
): FeatureSampler {
  return (source: ModulationSource, time: number): number => {
    switch (source) {
      case "rms":
        return analysis ? sampleArray(analysis.rms, analysis.featureRate, time) : 0;
      case "bass":
        return analysis ? sampleArray(analysis.bass, analysis.featureRate, time) : 0;
      case "mid":
        return analysis ? sampleArray(analysis.mid, analysis.featureRate, time) : 0;
      case "high":
        return analysis ? sampleArray(analysis.high, analysis.featureRate, time) : 0;
      case "beat":
        return beatPulse(beatGrid, time);
      case "onset":
        return onsetPulse(analysis, time);
      default: {
        const exhaustive: never = source;
        throw new Error(`Unhandled modulation source: ${String(exhaustive)}`);
      }
    }
  };
}
