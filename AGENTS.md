# Agent Guide

Operational knowledge for working in this repository. Read `CONTEXT.md` for
the domain language and `docs/adr/` for why the architecture is the way it is.

## Toolchain

- Node v22.22.0 (`.nvmrc`), pnpm. Vite 8, React 19, TypeScript 6 (strict).
- `pnpm dev` — dev server on http://localhost:5173
- `pnpm test` — Vitest unit tests (DSP, model, store; run in Node)
- `pnpm test:e2e` — Playwright Chromium smoke tests (import → preview → export)
- `pnpm build` — type-check (`tsc -b`) + production build
- One-time before e2e on a fresh machine: `pnpm exec playwright install chromium`
- Regenerate the audio fixture: `node scripts/make-fixture.mjs`

## Conventions

- Strict black-and-white UI. All color flows through the CSS tokens in
  `src/index.css`; never hardcode colors in components.
- shadcn/ui primitives live in `src/components/ui/` (added via CLI; edit
  freely, they are owned by this repo).
- Switches over unions/enums must be exhaustive with a `never`-typed default
  case (see `applyBlendMode` in `src/renderer/engine.ts` for the pattern).
- Imports at the top of the module, never inline.
- Times are seconds everywhere. The project document (`src/model/types.ts`)
  is plain JSON — no class instances, no typed arrays — so it can persist
  and migrate. Binary/derived data lives outside it (media cache, analysis).

## Invariants that are easy to break

- **Preview/export parity is sacred.** The render engine
  (`src/renderer/engine.ts`) is shared by the live preview and the export
  worker. A frame must be a pure function of (project, time): seeded RNG
  only (`src/renderer/rng.ts`), no `Math.random()` in render paths, no
  delta-time state accumulation in presets (trails are the one exception and
  are frame-rate-normalized + warmup-resimulated on seek/pause). See ADR 0008.
- The engine must stay canvas-agnostic: it runs against an `HTMLCanvasElement`
  in the preview and an `OffscreenCanvas` inside the export worker. No DOM
  access in `src/renderer/` or anything the worker imports.
- Heavy work stays off the main thread: audio analysis and export encoding
  run in Web Workers (`src/audio/analysisWorker.ts`,
  `src/export/exportWorker.ts`).
- Undo history tracks only the project document (zundo `partialize`).
  Ephemeral state (playhead, decoded audio, selection, analysis) belongs in
  `src/state/editorStore.ts`, never in the project store.
- Schema changes to the project document require bumping `SCHEMA_VERSION`
  and adding a migration in `src/model/schema.ts`.

## Gotchas learned the hard way

- The Vite dev server's file watcher can die silently and keep serving stale
  module transforms. If the browser behavior contradicts the source code
  ("impossible" bugs), restart `pnpm dev` before debugging further. The
  Playwright suite boots its own server, so it always tests current code.
- Cursor sandbox runs can miss the existing Playwright browser cache and fail
  with "Executable doesn't exist" under a sandbox temp path. If e2e tests have
  worked before on this machine, rerun the same `pnpm test:e2e` outside the
  sandbox before suggesting `pnpm exec playwright install chromium`.
- WebCodecs, OffscreenCanvas, and WebGL only exist in a real browser. Don't
  try to unit-test them; that's what the e2e suite is for. Vitest runs in
  plain Node by design.
- `decodeAudioData` is main-thread only; decode there, analyze in the worker.
- H.264 requires even pixel dimensions; export rounds to multiples of 2.
- Playwright's bundled Chromium encodes H.264, and when native AAC is
  missing the `@mediabunny/aac-encoder` WASM fallback registers
  automatically — exports must keep working in both cases.
