/**
 * Result of offline audio analysis. All arrays are sampled at `featureRate`
 * frames per second and normalized to 0..1, so they can be sampled cheaply
 * and deterministically at any timeline time.
 */
export interface AudioAnalysis {
  sampleRate: number;
  /** Source duration in seconds. */
  duration: number;
  /** Feature frames per second (sampleRate / hopSize). */
  featureRate: number;
  /** Per-frame RMS energy, normalized 0..1. */
  rms: Float32Array;
  /** Per-frame band energies, normalized 0..1. */
  bass: Float32Array;
  mid: Float32Array;
  high: Float32Array;
  /** Onset times in seconds (spectral-flux peaks). */
  onsets: number[];
  /** Estimated tempo. */
  bpm: number;
  /** Estimated time of the first beat, seconds. */
  beatOffset: number;
  /** Min/max waveform peaks for timeline drawing, interleaved [min, max]. */
  waveform: Float32Array;
  /** Number of [min, max] pairs in `waveform`. */
  waveformBuckets: number;
}

export interface AnalysisRequest {
  channelData: Float32Array;
  sampleRate: number;
}

export type AnalysisResponse =
  | { ok: true; analysis: AudioAnalysis }
  | { ok: false; error: string };
