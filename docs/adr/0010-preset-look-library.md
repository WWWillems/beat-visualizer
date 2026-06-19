# ADR 0010: Preset and Look library

Status: accepted (2026-06-19)

Visual clips need a gallery of selectable visuals without turning every thumbnail into a separate renderer or making old projects change when the gallery evolves. A **Preset** is a first-class procedural visual instrument with its own renderer/control surface; a **Look** belongs to one Preset and stamps concrete params, default modulations, and seed values onto a Visual Clip. Visual Clips may store the last selected `lookId` as non-authoritative provenance, but rendering must use the stamped clip values, not live Look definitions.

Look thumbnails are deterministic renders from the real renderer at a fixed sample time using synthetic audio features, so the chooser remains stable and preview/export parity stays aligned with ADR 0008. The first library pass targets three Presets (`Particle Field`, `Flow Field`, `Radial Burst`) with four Looks each, surfaced as a grouped thumbnail grid in the right sidebar.

Rejected alternatives: resolving clips live from `lookId` would make library edits silently alter existing projects; treating every thumbnail as a Preset would duplicate renderer concepts and clutter the inspector; forcing all examples through one particle system would hide genuinely different visual instruments behind overloaded controls.
