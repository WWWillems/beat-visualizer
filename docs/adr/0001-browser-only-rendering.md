# ADR 0001: Entirely in-browser rendering and export

Status: accepted (2026-06-12)

## Context

The app generates beat visuals and must export upload-ready MP4s. Server-side
rendering (FFmpeg/Remotion-style) is easier to control but requires a backend,
upload bandwidth, and infrastructure.

## Decision

All processing happens client-side: audio analysis, WebGL rendering, video
encoding, muxing, and storage. There is no backend; the app deploys as a
static site.

## Consequences

- Browser capability becomes a product constraint (see ADR 0002).
- Export performance is bounded by the user's machine; a worker-based
  pipeline keeps exports running in background tabs.
- Projects and media persist locally (see ADR 0009); nothing leaves the
  user's machine.
