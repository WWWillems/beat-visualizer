import {
  SCHEMA_VERSION,
  type AudioTrack,
  type ImageTrack,
  type Project,
  type VisualClip,
  type VisualTrack,
} from "@/model/types";
import { defaultModulationTemplates } from "@/renderer/presets";

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
  params: Record<string, number>,
): VisualClip {
  return {
    id: createId(),
    type: "visual",
    presetId: "particleField",
    start,
    duration,
    seed: Math.floor(Math.random() * 2 ** 31),
    params,
    keyframes: {},
    modulations: defaultModulationTemplates("particleField").map((modulation) => ({
      id: createId(),
      ...modulation,
    })),
  };
}
