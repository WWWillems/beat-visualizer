# ADR 0003: Mediabunny over FFmpeg.wasm for MP4 muxing

Status: accepted (2026-06-12)

## Context

Encoded WebCodecs chunks are not a file; something must mux them into MP4.
Candidates: Mediabunny (TypeScript media toolkit built on WebCodecs) and
FFmpeg.wasm (full FFmpeg compiled to WASM). Evaluated before implementation.

## Decision

Use Mediabunny (`mediabunny` + `@mediabunny/aac-encoder`).

Evidence from the evaluation:

- Tree-shakable 5–69 KB vs ~30 MB WASM download.
- Delegates encoding to hardware-accelerated WebCodecs instead of software
  encoding; FFmpeg.wasm cannot use the GPU.
- First-class MP4 muxing API: `CanvasSource.add(timestamp, duration)` for
  frames, `AudioSampleSource.add(AudioSample)` for audio, `fastStart:
  "in-memory"` for streamable files.
- Built-in `canEncodeVideo`/`canEncodeAudio` capability checks.
- Official WASM AAC-LC fallback package for browsers lacking native AAC.
- Worker-compatible; zero dependencies.

## Consequences

- Export pipeline: render to OffscreenCanvas → WebCodecs encode → Mediabunny
  mux → Blob download (`src/export/exportWorker.ts`).
- We accept Chromium-first support as a consequence (ADR 0002).
