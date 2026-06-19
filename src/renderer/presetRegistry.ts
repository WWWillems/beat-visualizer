import * as THREE from "three";
import type { FeatureSampler } from "@/model/evaluate";
import type { VisualClip, VisualPresetId } from "@/model/types";
import { FlowFieldInstance } from "@/renderer/flowField";
import { ParticleFieldInstance } from "@/renderer/particleField";
import { RadialBurstInstance } from "@/renderer/radialBurst";

export interface VisualPresetInstance {
  readonly texture: THREE.Texture;
  setSize: (width: number, height: number) => void;
  render: (
    renderer: THREE.WebGLRenderer,
    clip: VisualClip,
    timelineTime: number,
    dt: number,
    features: FeatureSampler,
  ) => void;
  reset: (renderer: THREE.WebGLRenderer) => void;
  dispose: () => void;
}

export function createPresetInstance(
  presetId: VisualPresetId,
  seed: number,
  width: number,
  height: number,
): VisualPresetInstance {
  switch (presetId) {
    case "particleField":
      return new ParticleFieldInstance(seed, width, height);
    case "flowField":
      return new FlowFieldInstance(seed, width, height);
    case "radialBurst":
      return new RadialBurstInstance(seed, width, height);
    default: {
      const exhaustive: never = presetId;
      throw new Error(`Unhandled visual preset: ${String(exhaustive)}`);
    }
  }
}
