# ADR 0008: Deterministic shared renderer (preview/export parity)

Status: accepted (2026-06-12)

## Context

Users tune visuals against the live preview; the exported MP4 must look the
same. Preview runs at vsync with possible frame skips; export steps fixed
frames (i / fps). Any frame-rate-dependent or random state breaks parity.

## Decision

One render engine (`src/renderer/engine.ts`) serves both paths, with a hard
contract: **a frame is a pure function of (project document, time)**.

- Randomness only via seeded RNG (`src/renderer/rng.ts`); each visual clip
  carries a seed. `Math.random()` is forbidden in render paths.
- Particle motion is stateless — position computed in the shader from
  (seed attributes, time) — not integrated frame to frame.
- Trails are the single stateful exception: ping-pong feedback buffers with
  frame-rate-normalized decay (`trail` is the per-frame keep factor at
  30 FPS, raised to `dt * 30`), plus additive-energy compensation by trail
  length and particle count so dense fields don't clip to white.
- Seeks and paused frames cannot reuse stale accumulation: the engine resets
  and re-simulates a short fixed-step warmup (8 frames) so stills are
  deterministic and representative.
- The engine is canvas-agnostic (HTMLCanvasElement or OffscreenCanvas) and
  renders sRGB output.

## Consequences

- Export renders frame-by-frame at fixed fps and matches what the user saw,
  up to trail approximation differences below perceptual relevance.
- Any new preset must follow the same contract; review for hidden
  accumulated state or unseeded randomness.
- Verified by unit tests (analysis determinism, param evaluation) and the
  Playwright export smoke test.
