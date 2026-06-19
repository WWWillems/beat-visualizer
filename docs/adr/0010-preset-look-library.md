# ADR 0010: Preset and Look library

Status: accepted (2026-06-19)

Visual clips need a gallery of selectable visuals without turning every thumbnail into a separate renderer or making old projects change when the gallery evolves. A **Preset** is a first-class procedural visual instrument with its own renderer/control surface; a **Look** belongs to one Preset and stamps concrete params, default modulations, and seed values onto a Visual Clip. Visual Clips may store the last selected `lookId` as non-authoritative provenance, but rendering must use the stamped clip values, not live Look definitions.

Look thumbnails are deterministic renders from the real renderer at a fixed sample time using synthetic audio features, so the chooser remains stable and preview/export parity stays aligned with ADR 0008. Gallery thumbnails may intentionally use a synthetic peak-beat hero state rather than an average playback moment: the thumbnail's job is to make the Look's silhouette and family identity legible in the chooser while still being produced by the real render path.

The first library pass targets three Preset families surfaced as a grouped thumbnail grid in the right sidebar. Each family owns a distinct visual grammar:

- `Particle Field` owns 3D point volumes and swarms.
- `Flow Field` owns directional ribbons and sheets.
- `Radial Burst` owns rings, rays, halos, and other radial silhouettes.

Looks are curated examples inside those families, not a guarantee that each named Look is its own renderer concept. A weak Look may be renamed or removed rather than forcing a family to support an object it cannot honestly render. Renderer improvements are allowed to change existing clips that use these Presets; the library is still early enough that stronger family identity is more valuable than preserving first-pass visual output behind compatibility modes.

Rejected alternatives: resolving clips live from `lookId` would make library edits silently alter existing projects; treating every thumbnail as a Preset would duplicate renderer concepts and clutter the inspector; forcing all examples through one particle system would hide genuinely different visual instruments behind overloaded controls.
