# Domain Language

The vocabulary of this codebase. Use these terms; don't invent parallel ones.

- **Project** — the persistable document: tracks, assets, beat grid, duration,
  fps, aspect ratio. Plain JSON, versioned (`SCHEMA_VERSION`). Defined in
  `src/model/types.ts`.
- **Song name** — project-level metadata naming the current song. Separate
  from the Project name, which labels the editor/project document.
- **App settings** — local-first settings that persist across projects, such
  as producer/artist identity, website, social profile URLs, and a reusable
  custom message. Stored outside the Project document.
- **Track** — an ordered layer in the timeline. Three types: `audio` (mixes
  to output), `visual` (procedural preset clips), `image` (PNG/JPG overlays).
  `tracks[0]` is the bottom render layer; image/visual tracks composite with
  opacity and blend mode.
- **Clip** — a time-bounded item on a track (`start`, `duration`, seconds).
  Audio clips reference an asset; visual clips carry a preset + params +
  keyframes + modulations + seed; image clips carry fit/opacity/layout.
- **Asset** — imported media. Metadata (`MediaAssetRef`) lives in the project
  document; bytes live in IndexedDB and the runtime media cache
  (`src/state/mediaCache.ts`), keyed by asset id.
- **Beat grid** — user-correctable `{ bpm, offset }` describing where beats
  fall. Seeded by analysis, edited in the inspector. The correction mechanism
  for imperfect detection.
- **Analysis** — derived data computed offline from the primary audio in a
  worker: waveform peaks, RMS, bass/mid/high band energies, onsets, tempo
  estimate (`src/audio/analyze.ts`). Never persisted; recomputed on load.
- **Feature sampler** — deterministic function `(source, time) → 0..1`
  bridging analysis/beat grid to the renderer (`src/audio/features.ts`).
  Sources: `rms`, `bass`, `mid`, `high`, `beat` (a decaying pulse derived
  from the beat grid).
- **Modulation** — a mapping on a visual clip: feature source → preset
  parameter, with amount and smoothing. Final value = keyframed base +
  modulation, clamped to the parameter range (`src/model/evaluate.ts`).
- **Preset** — a parameterized procedural visual ("instrument"), described by
  `ParamDescriptor`s so the inspector renders generically
  (`src/renderer/presets.ts`). First preset: `particleField`.
- **Transport** — the playback clock (`src/audio/playback.ts`), driven by the
  Web Audio context. The preview render loop follows `transport.getTime()`;
  visuals never follow requestAnimationFrame timing.
- **Proof / final export** — half-resolution fast export vs full-resolution
  (1080p-class) upload-ready MP4. Both H.264 + AAC at 30 FPS.
- **Aspect ratio layouts** — one project supports 16:9, 9:16, 1:1, 4:5;
  image clips can carry per-ratio layout overrides (`layoutOverrides`).
