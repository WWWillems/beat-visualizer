# ADR 0009: Local-first persistence in IndexedDB

Status: accepted (2026-06-12)

## Context

A browser-only app still needs projects to survive reloads. Options: no
persistence (single-session), cloud accounts, or local-first storage.

## Decision

IndexedDB via `idb` (`src/storage/db.ts`): object stores for project
documents (JSON), asset blobs, and meta (current project id). Saves are
debounced (800 ms) and flushed on `visibilitychange`/`beforeunload` so quick
reloads never lose edits. Project documents carry `schemaVersion`; loads run
through migrations (`src/model/schema.ts`), and documents from a newer
schema are refused rather than corrupted.

Derived data is not persisted: audio is re-decoded from the stored blob and
analysis recomputed on load.

## Consequences

- Projects survive reloads with zero infrastructure; nothing leaves the
  user's machine.
- Any change to the project document shape requires a `SCHEMA_VERSION` bump
  and a migration.
- Cloud sync, multiple-project UI, and portable project bundles remain open
  for later; File System Access export is a natural extension.
