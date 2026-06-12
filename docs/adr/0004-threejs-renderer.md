# ADR 0004: Three.js for the visual renderer

Status: accepted (2026-06-12)

## Context

The visual style (dense monochrome particles, trails, feedback, displacement)
needs WebGL. Options: raw WebGL2 with a homegrown pipeline, a thin wrapper
(regl/twgl), or Three.js.

## Decision

Three.js with custom shaders: ShaderMaterial particles, ping-pong
WebGLRenderTargets for trails, an orthographic composite pass for layer
stacking with blend modes. Canvas 2D was rejected as the substrate; it cannot
sustain this look at export resolution.

## Consequences

- Render targets, instancing, and color-space handling come for free;
  development is much faster than raw WebGL plumbing.
- Three.js works against OffscreenCanvas in a worker, which the export
  pipeline requires.
- Bundle size grows (~1.9 MB main chunk; Three.js is also duplicated in the
  export worker chunk). Acceptable for now; revisit if it hurts.
