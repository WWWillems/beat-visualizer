/**
 * Pure DSP primitives for offline audio analysis. Everything here is
 * deterministic and dependency-free so it can run in a worker and be unit
 * tested in Node against fixture signals.
 */

/** In-place iterative radix-2 FFT. `re`/`im` length must be a power of two. */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if ((n & (n - 1)) !== 0) throw new Error("FFT size must be a power of two");

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const aRe = re[i + j];
        const aIm = im[i + j];
        const bRe = re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm;
        const bIm = re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe;
        re[i + j] = aRe + bRe;
        im[i + j] = aIm + bIm;
        re[i + j + len / 2] = aRe - bRe;
        im[i + j + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

export function hannWindow(size: number): Float32Array {
  const win = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return win;
}

export interface StftFrames {
  /** Magnitude spectra, frames x (fftSize / 2) flattened. */
  magnitudes: Float32Array;
  frameCount: number;
  binCount: number;
}

export function stft(samples: Float32Array, fftSize: number, hopSize: number): StftFrames {
  const binCount = fftSize / 2;
  const frameCount = Math.max(0, Math.floor((samples.length - fftSize) / hopSize) + 1);
  const magnitudes = new Float32Array(frameCount * binCount);
  const window = hannWindow(fftSize);
  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);

  for (let frame = 0; frame < frameCount; frame++) {
    const offset = frame * hopSize;
    for (let i = 0; i < fftSize; i++) {
      re[i] = samples[offset + i] * window[i];
      im[i] = 0;
    }
    fft(re, im);
    const out = frame * binCount;
    for (let bin = 0; bin < binCount; bin++) {
      magnitudes[out + bin] = Math.hypot(re[bin], im[bin]);
    }
  }

  return { magnitudes, frameCount, binCount };
}

/** Per-frame RMS energy over the raw signal. */
export function rmsEnergy(samples: Float32Array, frameCount: number, hopSize: number, fftSize: number): Float32Array {
  const rms = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame++) {
    const offset = frame * hopSize;
    let sum = 0;
    for (let i = 0; i < fftSize; i++) {
      const s = samples[offset + i] ?? 0;
      sum += s * s;
    }
    rms[frame] = Math.sqrt(sum / fftSize);
  }
  return rms;
}

/** Sums spectral magnitude over a frequency range for every frame. */
export function bandEnergy(
  frames: StftFrames,
  sampleRate: number,
  fftSize: number,
  lowHz: number,
  highHz: number,
): Float32Array {
  const hzPerBin = sampleRate / fftSize;
  const lowBin = Math.max(0, Math.floor(lowHz / hzPerBin));
  const highBin = Math.min(frames.binCount - 1, Math.ceil(highHz / hzPerBin));
  const out = new Float32Array(frames.frameCount);
  for (let frame = 0; frame < frames.frameCount; frame++) {
    const base = frame * frames.binCount;
    let sum = 0;
    for (let bin = lowBin; bin <= highBin; bin++) {
      sum += frames.magnitudes[base + bin];
    }
    out[frame] = sum;
  }
  return out;
}

/** Half-wave-rectified spectral flux per frame. */
export function spectralFlux(frames: StftFrames): Float32Array {
  const flux = new Float32Array(frames.frameCount);
  for (let frame = 1; frame < frames.frameCount; frame++) {
    const cur = frame * frames.binCount;
    const prev = cur - frames.binCount;
    let sum = 0;
    for (let bin = 0; bin < frames.binCount; bin++) {
      const diff = frames.magnitudes[cur + bin] - frames.magnitudes[prev + bin];
      if (diff > 0) sum += diff;
    }
    flux[frame] = sum;
  }
  return flux;
}

/** Normalizes an array to 0..1 by its maximum (no-op for silent signals). */
export function normalize(values: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > max) max = values[i];
  }
  if (max <= 0) return values;
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) {
    out[i] = values[i] / max;
  }
  return out;
}

/**
 * Picks onset frames from a flux envelope using a moving mean + deviation
 * threshold and local-maximum test.
 */
export function pickOnsets(flux: Float32Array, featureRate: number): number[] {
  const onsets: number[] = [];
  const meanWindow = Math.round(featureRate * 0.5);
  const minGap = Math.round(featureRate * 0.1);
  let lastOnset = -minGap;

  for (let i = 1; i < flux.length - 1; i++) {
    if (flux[i] <= flux[i - 1] || flux[i] < flux[i + 1]) continue;

    const from = Math.max(0, i - meanWindow);
    const to = Math.min(flux.length, i + meanWindow);
    let sum = 0;
    for (let j = from; j < to; j++) sum += flux[j];
    const mean = sum / (to - from);
    let dev = 0;
    for (let j = from; j < to; j++) dev += Math.abs(flux[j] - mean);
    dev /= to - from;

    if (flux[i] > mean + 1.5 * dev && i - lastOnset >= minGap) {
      onsets.push(i / featureRate);
      lastOnset = i;
    }
  }
  return onsets;
}

export interface TempoEstimate {
  bpm: number;
  /** Time of the first beat in seconds. */
  offset: number;
}

/**
 * Estimates tempo by autocorrelating the flux envelope across the 60-180 BPM
 * lag range, then finds the beat phase that best aligns with the envelope.
 */
export function estimateTempo(flux: Float32Array, featureRate: number): TempoEstimate {
  const minBpm = 60;
  const maxBpm = 180;
  const minLag = Math.floor((60 / maxBpm) * featureRate);
  const maxLag = Math.ceil((60 / minBpm) * featureRate);

  let bestLag = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0;
    for (let i = 0; i + lag < flux.length; i++) {
      score += flux[i] * flux[i + lag];
    }
    // Slight bias toward faster tempos to counter harmonic doubling.
    score /= Math.sqrt(lag);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  const bpm = (60 * featureRate) / bestLag;

  // Phase: try every offset within one beat period, score envelope energy at
  // the resulting comb positions.
  let bestOffset = 0;
  let bestPhaseScore = -Infinity;
  for (let phase = 0; phase < bestLag; phase++) {
    let score = 0;
    for (let i = phase; i < flux.length; i += bestLag) {
      score += flux[i];
    }
    if (score > bestPhaseScore) {
      bestPhaseScore = score;
      bestOffset = phase;
    }
  }

  return { bpm: Math.round(bpm * 10) / 10, offset: bestOffset / featureRate };
}

/** Min/max peak pairs for waveform drawing. */
export function waveformPeaks(samples: Float32Array, buckets: number): Float32Array {
  const out = new Float32Array(buckets * 2);
  const bucketSize = samples.length / buckets;
  for (let b = 0; b < buckets; b++) {
    const from = Math.floor(b * bucketSize);
    const to = Math.min(samples.length, Math.floor((b + 1) * bucketSize));
    let min = 0;
    let max = 0;
    for (let i = from; i < to; i++) {
      if (samples[i] < min) min = samples[i];
      if (samples[i] > max) max = samples[i];
    }
    out[b * 2] = min;
    out[b * 2 + 1] = max;
  }
  return out;
}
