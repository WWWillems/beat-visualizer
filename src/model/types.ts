/**
 * Core project model. All times are in seconds; all values are plain JSON
 * so projects can be persisted to IndexedDB and migrated across schema
 * versions. Binary media lives in separate asset records keyed by assetId.
 */

export const SCHEMA_VERSION = 4;

export type AspectRatioId = "16:9" | "9:16" | "1:1" | "4:5";

export interface AspectRatioSpec {
  id: AspectRatioId;
  width: number;
  height: number;
}

/** 1080p-class export dimensions per aspect ratio. */
export const ASPECT_RATIOS: Record<AspectRatioId, AspectRatioSpec> = {
  "16:9": { id: "16:9", width: 1920, height: 1080 },
  "9:16": { id: "9:16", width: 1080, height: 1920 },
  "1:1": { id: "1:1", width: 1080, height: 1080 },
  "4:5": { id: "4:5", width: 1080, height: 1350 },
};

export type MediaKind = "audio" | "image";

/** Metadata for an imported file; bytes are stored separately in IndexedDB. */
export interface MediaAssetRef {
  id: string;
  kind: MediaKind;
  name: string;
  mimeType: string;
  /** Audio only: duration in seconds, known after decode. */
  duration?: number;
  /** Image only: intrinsic pixel size. */
  width?: number;
  height?: number;
}

export type EasingMode = "linear" | "step" | "smooth";

export interface Keyframe {
  time: number;
  value: number;
  easing: EasingMode;
}

export type ModulationSource = "rms" | "bass" | "mid" | "high" | "beat" | "onset";

/**
 * Maps an audio analysis feature onto a visual parameter:
 * final = base(t) + amount * feature(t), clamped to the parameter range.
 */
export interface Modulation {
  id: string;
  param: string;
  source: ModulationSource;
  amount: number;
  /** 0..1, exponential smoothing applied to the feature signal. */
  smoothing: number;
}

export type BlendMode = "normal" | "add" | "screen" | "multiply";

export interface ClipBase {
  id: string;
  /** Timeline start, seconds. */
  start: number;
  /** Timeline duration, seconds. */
  duration: number;
}

export interface AudioClip extends ClipBase {
  type: "audio";
  assetId: string;
  /** Offset into the source audio, seconds. */
  sourceOffset: number;
  gain: number;
}

export type VisualPresetId =
  | "particleField"
  | "flowField"
  | "radialBurst"
  | "spectralSwarm"
  | "spectralHalo"
  | "spectralTerrain"
  | "fluidField"
  | "halftone"
  | "lattice"
  | "strokes"
  | "grainField"
  | "nebula";

export interface VisualClip extends ClipBase {
  type: "visual";
  presetId: VisualPresetId;
  /** Non-authoritative provenance for the last Look stamped onto this clip. */
  lookId?: string;
  /** Seed for deterministic preview/export parity. */
  seed: number;
  /** Base values for preset parameters, keyed by param key. */
  params: Record<string, number>;
  /** Keyframe lanes per parameter; sorted by time. */
  keyframes: Record<string, Keyframe[]>;
  modulations: Modulation[];
}

export type ImageFit = "contain" | "cover";

/** Per-aspect-ratio placement override for image clips. */
export interface ImageLayout {
  /** Normalized center offset from canvas center, -1..1. */
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface ImageClip extends ClipBase {
  type: "image";
  assetId: string;
  fit: ImageFit;
  opacity: number;
  layout: ImageLayout;
  /** Optional per-ratio overrides; falls back to `layout`. */
  layoutOverrides: Partial<Record<AspectRatioId, ImageLayout>>;
}

export type Clip = AudioClip | VisualClip | ImageClip;

export type TrackType = "audio" | "visual" | "image";

interface TrackBase {
  id: string;
  name: string;
  muted: boolean;
}

export interface AudioTrack extends TrackBase {
  type: "audio";
  clips: AudioClip[];
  gain: number;
}

export interface VisualTrack extends TrackBase {
  type: "visual";
  clips: VisualClip[];
  opacity: number;
  blendMode: BlendMode;
}

export interface ImageTrack extends TrackBase {
  type: "image";
  clips: ImageClip[];
  opacity: number;
  blendMode: BlendMode;
}

export type Track = AudioTrack | VisualTrack | ImageTrack;

/**
 * User-adjustable beat grid. Beat times derive from bpm + phase offset;
 * the editable grid is the correction mechanism for detection errors.
 */
export interface BeatGrid {
  bpm: number;
  /** Time of the first beat, seconds. */
  offset: number;
}

export interface Project {
  schemaVersion: number;
  id: string;
  name: string;
  /** Song metadata used for export naming and future branding/template defaults. */
  songName: string;
  createdAt: number;
  modifiedAt: number;
  /** Timeline duration in seconds; defaults to primary audio length. */
  duration: number;
  fps: number;
  aspectRatio: AspectRatioId;
  /** Render order: tracks[0] is the bottom layer. */
  tracks: Track[];
  assets: MediaAssetRef[];
  beatGrid: BeatGrid | null;
  /** Asset id of the audio used for analysis and export. */
  primaryAudioAssetId: string | null;
}
