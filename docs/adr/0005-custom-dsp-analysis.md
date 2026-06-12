# ADR 0005: Custom DSP for beat detection, no analysis libraries

Status: accepted (2026-06-12)

## Context

Audio analysis needs waveform, energy, frequency bands, onsets, and a tempo
estimate. Libraries like essentia.js add ~2 MB of WASM; small libraries only
do tempo.

## Decision

Implement the DSP ourselves in `src/audio/dsp.ts`: radix-2 FFT, Hann-windowed
STFT (2048/512), half-wave-rectified spectral flux with adaptive peak picking
for onsets, autocorrelation over the 60–180 BPM lag range for tempo, comb
alignment for beat phase. Runs in a Web Worker; deterministic; unit-tested
against synthetic fixtures (440 Hz sine, 120 BPM click track).

The user-editable beat grid (bpm + offset) is the correction mechanism for
the cases the detector gets wrong — detection does not need to be perfect.

## Consequences

- Zero analysis dependencies; analysis is reproducible and testable in Node.
- Quality ceiling is lower than essentia-class libraries; acceptable because
  the grid is editable. Revisit if users fight the grid editor in practice.
- Analysis is derived data: never persisted, recomputed from decoded audio on
  project load.
