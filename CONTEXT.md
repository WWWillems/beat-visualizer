# Domain Language

The vocabulary of this codebase. Use these terms; don't invent parallel ones.

- **Project** — the persistable document: tracks, assets, beat grid, duration,
  fps, aspect ratio. Plain JSON, versioned (`SCHEMA_VERSION`). Defined in
  `src/model/types.ts`.
- **New project** — starts a fresh Project document from default tracks and
  clears the current editor state: media cache, derived analysis, playhead,
  selection, and undo history. Previously stored projects and their assets
  are preserved (the app is multi-project); App settings are preserved
  because they are cross-project.
- **Song name** — project-level metadata naming the current song, intended
  for future in-render branding/templates. Separate from the Project name.
- **Project name** — the label for the editor/project document. Shown in the
  editor header and project browser, and used for export filenames.
- **Project thumbnail** — a small deterministic render of the frame at 25%
  of the project timeline, regenerated (debounced) after edits and stored as
  a Blob keyed by project id. Shown in the project browser.
- **Project browser** — a view (File > Open) listing all stored projects
  with thumbnail, name, and created/edited dates, sorted by last edit. Cards
  open a project; projects other than the current one can be deleted.
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
- **Overwrite editing** — same-track edit mode where a moved or resized clip
  keeps its requested time range and cuts away overlapped portions of other
  clips. Fully covered clips are deleted; clips overlapped in the middle are
  split into left and right remainder clips. Split remainders are new clip
  segments that restart at their own starts rather than preserving absolute
  visual time. Normal drag/resize uses hard collision at same-track clip
  edges; holding Option/Alt enters overwrite editing and allows slicing.
  Current overwrite editing applies to visual and image clips; audio trimming
  and source-offset behavior are deferred. Normal collision never auto-shrinks
  a clip; if the target gap is too small, the clip clamps at the nearest
  blocking edge.
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
  from the user-correctable beat grid), `onset` (a decaying pulse derived
  from detected transient times in analysis).
- **Modulation** — a mapping on a visual clip: feature source → preset
  parameter, with amount and smoothing. Final value = keyframed base +
  modulation, clamped to the parameter range (`src/model/evaluate.ts`).
- **Preset** — a parameterized procedural visual instrument with its own
  renderer/control surface, described by `ParamDescriptor`s so the inspector
  renders generically (`src/renderer/presets.ts`). In the Look chooser, a
  Preset is also the user-visible family/category: each family should own a
  distinct visual grammar that remains recognizable at a glance.
- **Look** — a curated starting point belonging to exactly one Preset:
  params, default modulations, and seed values presented as selectable visual
  thumbnails; selecting one stamps concrete values onto a Visual Clip rather
  than creating a live dependency on the Look definition. A Visual Clip may
  remember the last selected Look as non-authoritative provenance.
- **Look thumbnail** — a deterministic gallery render of a Look using the real
  renderer at fixed sample time and synthetic audio features, so Looks can be
  compared independently of the current song.
- **Transport** — the playback clock (`src/audio/playback.ts`), driven by the
  Web Audio context. The preview render loop follows `transport.getTime()`;
  visuals never follow requestAnimationFrame timing.
- **Timeline viewport** — the editor-only view onto the Project timeline:
  zoom scale plus horizontal scroll position. It is not part of the Project
  document, not undoable, and not persisted with exports.
- **Proof / final export** — half-resolution fast export vs full-resolution
  (1080p-class) upload-ready MP4. Both H.264 + AAC at 30 FPS.
- **Aspect ratio layouts** — one project supports 16:9, 9:16, 1:1, 4:5;
  image clips can carry per-ratio layout overrides (`layoutOverrides`).
