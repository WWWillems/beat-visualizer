import type { AudioAnalysis } from "@/audio/analysisTypes";
import {
  bandEnergy,
  estimateTempo,
  normalize,
  pickOnsets,
  rmsEnergy,
  spectralFlux,
  stft,
  waveformPeaks,
} from "@/audio/dsp";

const FFT_SIZE = 2048;
const HOP_SIZE = 512;
const WAVEFORM_BUCKETS = 2048;

/**
 * Full offline analysis of a mono signal. Pure and deterministic: the same
 * samples always produce the same analysis.
 */
export function analyzeAudio(channelData: Float32Array, sampleRate: number): AudioAnalysis {
  const duration = channelData.length / sampleRate;
  const featureRate = sampleRate / HOP_SIZE;

  const frames = stft(channelData, FFT_SIZE, HOP_SIZE);
  const flux = spectralFlux(frames);
  const onsets = pickOnsets(flux, featureRate);
  const tempo = estimateTempo(flux, featureRate);

  return {
    sampleRate,
    duration,
    featureRate,
    rms: normalize(rmsEnergy(channelData, frames.frameCount, HOP_SIZE, FFT_SIZE)),
    bass: normalize(bandEnergy(frames, sampleRate, FFT_SIZE, 20, 250)),
    mid: normalize(bandEnergy(frames, sampleRate, FFT_SIZE, 250, 2000)),
    high: normalize(bandEnergy(frames, sampleRate, FFT_SIZE, 2000, 8000)),
    onsets,
    bpm: tempo.bpm,
    beatOffset: tempo.offset,
    waveform: waveformPeaks(channelData, WAVEFORM_BUCKETS),
    waveformBuckets: WAVEFORM_BUCKETS,
  };
}
