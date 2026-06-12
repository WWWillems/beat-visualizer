# ADR 0007: Layer-stack timeline, preset-based visual clips

Status: accepted (2026-06-12)

## Context

The timeline needed a composition model (node graph vs single-active-visual
vs layer stack) and a definition of what a "visual" is (uploaded video vs
global style vs procedural clips).

## Decision

- Layer-stack compositing: audio tracks mix to the audio output; image and
  visual tracks composite bottom-to-top by track order with per-track
  opacity and blend mode (normal/add/screen/multiply).
- Visual clips are preset-based procedural instruments: preset id + base
  params + keyframe lanes + audio-reactive modulations + seed. Animation =
  keyframes plus modulation, not baked media.
- One primary audio track for analysis/export in the current slice; the
  model already supports multiple audio tracks for later mixing.
- Project duration defaults to the audio length, is user-adjustable, and
  timeline gaps render pure black.
- Current interactions: place/move/delete clips. Trimming, snapping, and
  multi-select are deliberately deferred.

## Consequences

- The mental model matches conventional video editors while keeping visuals
  editable and re-renderable at any resolution.
- New visual looks are added as presets (`src/renderer/presets.ts` +
  implementation in `src/renderer/`), not as new timeline concepts.
