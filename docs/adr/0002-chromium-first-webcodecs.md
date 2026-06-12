# ADR 0002: Chromium-first export via WebCodecs, H.264 + AAC

Status: accepted (2026-06-12)

## Context

"MP4" is a container; platform compatibility (YouTube/Instagram/TikTok)
requires H.264 video + AAC audio. Browser-side encoding options are WebCodecs
(hardware-accelerated, Chromium-first) or FFmpeg.wasm (universal but ~30 MB
and software-only).

## Decision

Target Chromium-based browsers using WebCodecs. A pre-export capability check
(`src/export/capability.ts`) blocks export with a clear message when H.264
encoding is unavailable, rather than producing a non-compliant file. When
native AAC encoding is missing, the `@mediabunny/aac-encoder` WASM fallback
registers automatically.

## Consequences

- Firefox/Safari can edit and preview but may not export; the failure is
  explicit, not silent.
- Export uses hardware encoders where available — much faster than WASM.
- 30 FPS first; 60 FPS/4K deferred until performance is measured.
