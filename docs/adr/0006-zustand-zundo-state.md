# ADR 0006: Zustand + zundo for state, split project/editor stores

Status: accepted (2026-06-12)

## Context

An editor needs undo/redo from day one (painful to retrofit) and a state
layer that tolerates 60 Hz playhead updates without churning React or undo
history.

## Decision

Two stores:

- `src/state/projectStore.ts` — the project document, wrapped in zundo's
  `temporal` middleware (snapshot undo, `partialize` to the project only,
  immer for ergonomic updates). Undo/redo = Cmd+Z / Shift+Cmd+Z.
- `src/state/editorStore.ts` — ephemeral state: playhead, isPlaying,
  decoded AudioBuffer, analysis, selection. Never undoable, never persisted.

## Consequences

- Every project mutation is automatically undoable; history capped at 200.
- The playhead can update at render rate without polluting undo history.
- Anything non-serializable (AudioBuffer, ImageBitmap, Blob) must stay out of
  the project store — media lives in `src/state/mediaCache.ts`.
- Drag interactions commit once on pointer-up so a drag is one undo step.
