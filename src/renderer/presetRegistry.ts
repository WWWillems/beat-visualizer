import * as THREE from "three";
import type { SpectralSampler } from "@/audio/features";
import type { FeatureSampler } from "@/model/evaluate";
import type { VisualClip, VisualPresetId } from "@/model/types";
import { FlowFieldInstance } from "@/renderer/flowField";
import { FluidFieldInstance } from "@/renderer/fluidField";
import { GrainFieldInstance } from "@/renderer/grainField";
import { HalftoneInstance } from "@/renderer/halftone";
import { LatticeInstance } from "@/renderer/lattice";
import { NebulaInstance } from "@/renderer/nebula";
import { ParticleFieldInstance } from "@/renderer/particleField";
import { RadialBurstInstance } from "@/renderer/radialBurst";
import { SpectralHaloInstance } from "@/renderer/spectralHalo";
import { SpectralSwarmInstance } from "@/renderer/spectralSwarm";
import { SpectralTerrainInstance } from "@/renderer/spectralTerrain";
import { StrokesInstance } from "@/renderer/strokes";

export interface VisualPresetInstance {
  readonly texture: THREE.Texture;
  setSize: (width: number, height: number) => void;
  render: (
    renderer: THREE.WebGLRenderer,
    clip: VisualClip,
    timelineTime: number,
    dt: number,
    features: FeatureSampler,
    spectrum: SpectralSampler,
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
    case "spectralSwarm":
      return new SpectralSwarmInstance(seed, width, height);
    case "spectralHalo":
      return new SpectralHaloInstance(seed, width, height);
    case "spectralTerrain":
      return new SpectralTerrainInstance(seed, width, height);
    case "fluidField":
      return new FluidFieldInstance(seed, width, height);
    case "halftone":
      return new HalftoneInstance(seed, width, height);
    case "lattice":
      return new LatticeInstance(seed, width, height);
    case "strokes":
      return new StrokesInstance(seed, width, height);
    case "grainField":
      return new GrainFieldInstance(seed, width, height);
    case "nebula":
      return new NebulaInstance(seed, width, height);
    default: {
      const exhaustive: never = presetId;
      throw new Error(`Unhandled visual preset: ${String(exhaustive)}`);
    }
  }
}
