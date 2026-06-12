# Beat Visualizer

A browser-only editor for generating monochrome, audio-reactive beat visuals
from MP3/WAV files and exporting them as upload-ready MP4 videos (H.264 +
AAC) for YouTube, Instagram, and TikTok.

Everything runs client-side: audio analysis, WebGL rendering, video encoding,
and project storage. There is no backend.

## Features

- Import an MP3 or WAV file; offline analysis (in a Web Worker) computes
  waveform, RMS energy, frequency bands, onsets, and a tempo estimate.
- Editable beat grid (BPM + phase offset) to correct detection errors.
- Layered timeline with three track types: audio, procedural visual, and
  image (PNG/JPG) overlay.
- Procedural "Particle Field" visual preset rendered with Three.js: seeded,
  deterministic, with trails, turbulence, and beat bursts.
- Keyframes plus audio-reactive parameter modulation (RMS / bass / mid /
  high / beat pulse mapped onto any preset parameter).
- Synchronized playback transport driven by the Web Audio clock.
- Undo/redo (Cmd+Z / Shift+Cmd+Z) backed by snapshot history.
- Local-first persistence: projects and media stored in IndexedDB, restored
  on reload.
- Aspect ratios: 16:9, 9:16, 1:1, 4:5 (1080p-class export dimensions).
- MP4 export in a Web Worker with OffscreenCanvas + WebCodecs, muxed by
  [Mediabunny](https://mediabunny.dev), with proof (half-res) and final
  quality presets, progress, and cancellation. AAC encoding falls back to a
  bundled WASM encoder when the browser lacks native support.

## Browser support

Chromium-first (Chrome, Edge, Arc, Brave). MP4 export requires WebCodecs H.264
video encoding; a pre-export capability check reports unsupported browsers
instead of producing a broken file. AAC audio uses the browser encoder when
available and falls back to the bundled WASM encoder when needed.

## Development

Requires Node v22.22.0 (see `.nvmrc`) and pnpm.

```bash
pnpm install
pnpm exec playwright install chromium
```

Available scripts:

```bash
pnpm dev         # start the Vite dev server
pnpm build       # type-check and production build
pnpm preview     # preview the production build
pnpm test        # Vitest unit tests
pnpm test:watch  # Vitest watch mode
pnpm test:e2e    # Playwright Chromium smoke tests
pnpm typecheck   # TypeScript check without emitting
```

The e2e fixture (`e2e/fixtures/beat120.wav`) is deterministic and can be
regenerated with:

```bash
node scripts/make-fixture.mjs
```

## Keyboard shortcuts

- Space - play/pause.
- Cmd+Z / Ctrl+Z - undo.
- Shift+Cmd+Z / Shift+Ctrl+Z - redo.
- Delete / Backspace - remove the selected clip.

## Architecture

- `src/model/` — project document (tracks, clips, keyframes, modulations,
  beat grid), schema versioning/migrations, parameter evaluation.
- `src/audio/` — decode, worker-based DSP analysis (FFT, spectral flux,
  autocorrelation tempo), feature sampling, playback transport.
- `src/renderer/` — shared deterministic Three.js engine used by both the
  live preview and the export worker (seeded RNG, time-based simulation,
  canvas-agnostic, works with OffscreenCanvas).
- `src/export/` — capability checks, export worker (render → WebCodecs →
  Mediabunny MP4 mux), orchestration.
- `src/state/` — Zustand stores: undoable project document (zundo) and
  ephemeral editor state.
- `src/storage/` — IndexedDB persistence for project documents and media
  blobs.
- `src/components/` — shadcn/ui + Tailwind editor interface (render view,
  timeline, inspector, transport, export dialog) in a strict
  black-and-white theme.
- `src/lib/` — shared UI utilities.

## Documentation

- [`CONTEXT.md`](CONTEXT.md) — the domain language (project, track, clip,
  beat grid, modulation, feature sampler, preset, transport).
- [`docs/adr/`](docs/adr/) — architecture decision records with the
  reasoning behind the browser-only/WebCodecs/Mediabunny/Three.js stack and
  the deterministic-renderer contract.
- [`AGENTS.md`](AGENTS.md) — operational guide for AI agents: commands,
  conventions, invariants, and known gotchas.
