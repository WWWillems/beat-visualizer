import {
  SCHEMA_VERSION,
  type AudioTrack,
  type ImageTrack,
  type Project,
  type VisualClip,
  type VisualTrack,
} from "@/model/types";
import { defaultLook, lookDescriptor, type LookDescriptor } from "@/renderer/presets";

export function createId(): string {
  return crypto.randomUUID();
}

export function createEmptyProject(name = "Untitled"): Project {
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: createId(),
    name,
    songName: "",
    createdAt: now,
    modifiedAt: now,
    duration: 30,
    fps: 30,
    aspectRatio: "16:9",
    tracks: [
      createVisualTrack("Visual 1"),
      createImageTrack("Image 1"),
      createAudioTrack("Audio 1"),
    ],
    assets: [],
    beatGrid: null,
    primaryAudioAssetId: null,
  };
}

export function createAudioTrack(name: string): AudioTrack {
  return { id: createId(), type: "audio", name, muted: false, clips: [], gain: 1 };
}

export function createVisualTrack(name: string): VisualTrack {
  return {
    id: createId(),
    type: "visual",
    name,
    muted: false,
    clips: [],
    opacity: 1,
    blendMode: "normal",
  };
}

export function createImageTrack(name: string): ImageTrack {
  return {
    id: createId(),
    type: "image",
    name,
    muted: false,
    clips: [],
    opacity: 1,
    blendMode: "normal",
  };
}

export function createVisualClip(
  start: number,
  duration: number,
  look: LookDescriptor = defaultLook(),
): VisualClip {
  return {
    id: createId(),
    type: "visual",
    presetId: look.presetId,
    lookId: look.id,
    start,
    duration,
    seed: look.seed,
    params: { ...look.params },
    keyframes: {},
    modulations: look.defaultModulations.map((modulation) => ({
      id: createId(),
      ...modulation,
    })),
  };
}

export function createVisualClipFromLook(
  start: number,
  duration: number,
  lookId: string,
): VisualClip {
  const look = lookDescriptor(lookId);
  if (!look) throw new Error(`Unknown Look: ${lookId}`);
  return createVisualClip(start, duration, look);
}
