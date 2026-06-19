import * as THREE from "three";
import type { FeatureSampler } from "@/model/evaluate";
import type { ModulationSource } from "@/model/types";

export interface AudioGates {
  motion: number;
  brightness: number;
}

export interface FamilyAudioGates extends AudioGates {
  depth: number;
  accent: number;
  fine: number;
}

export const LOOK_HERO_FEATURES: Record<ModulationSource, number> = {
  rms: 0.76,
  bass: 0.96,
  mid: 0.68,
  high: 0.62,
  beat: 1,
  onset: 0.9,
};

export const DEPTH_FADE_GLSL = /* glsl */ `
float depthFade(float z, float depthAmount) {
  float normalized = smoothstep(-1.0, 1.0, z);
  return mix(1.0, 0.28 + normalized * 0.72, depthAmount);
}
`;

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function easedEnergy(value: number): number {
  const energy = clamp01(value);
  return clamp01(1 - (1 - energy) ** 2);
}

export function reactiveGates(visualEnergy: number, reactivity: number): AudioGates {
  const r = clamp01(reactivity);
  const calmness = (1 - r) ** 2;
  const motionFloor = 0.05 + calmness * 0.95;
  const brightnessFloor = 0.18 + calmness * 0.82;
  const energy = clamp01(visualEnergy);

  return {
    motion: motionFloor + (1 - motionFloor) * energy,
    brightness: brightnessFloor + (1 - brightnessFloor) * energy,
  };
}

export function particleVisualEnergy(features: FeatureSampler, time: number): number {
  const rms = features("rms", time);
  const bass = features("bass", time);
  const onset = features("onset", time);
  return easedEnergy(rms * 0.75 + bass * 0.2 + onset * 0.35);
}

export function particleFamilyGates(
  features: FeatureSampler,
  time: number,
  reactivity: number,
): FamilyAudioGates {
  const base = reactiveGates(particleVisualEnergy(features, time), reactivity);
  const bass = features("bass", time);
  const beat = features("beat", time);
  const onset = features("onset", time);

  return {
    ...base,
    depth: 0.25 + 0.45 * bass + 0.3 * beat,
    accent: clamp01(bass * 0.55 + onset * 0.45),
    fine: clamp01(features("high", time) * 0.35 + onset * 0.65),
  };
}

export function flowFamilyGates(
  features: FeatureSampler,
  time: number,
  reactivity: number,
): FamilyAudioGates {
  const rms = features("rms", time);
  const mid = features("mid", time);
  const high = features("high", time);
  const base = reactiveGates(easedEnergy(rms * 0.25 + mid * 0.65 + high * 0.25), reactivity);

  return {
    ...base,
    depth: 0.2 + 0.55 * mid + 0.2 * rms,
    accent: clamp01(mid * 0.7 + features("onset", time) * 0.3),
    fine: clamp01(high * 0.75 + mid * 0.2),
  };
}

export function radialFamilyGates(
  features: FeatureSampler,
  time: number,
  reactivity: number,
): FamilyAudioGates {
  const bass = features("bass", time);
  const beat = features("beat", time);
  const onset = features("onset", time);
  const base = reactiveGates(easedEnergy(bass * 0.55 + beat * 0.45 + onset * 0.35), reactivity);

  return {
    ...base,
    depth: 0.3 + 0.45 * bass + 0.2 * beat,
    accent: clamp01(beat * 0.45 + onset * 0.55),
    fine: clamp01(features("high", time) * 0.7 + onset * 0.25),
  };
}

export function configureDepthCamera(
  camera: THREE.PerspectiveCamera,
  aspect: number,
  time: number,
  depth: number,
  orbit: number,
): void {
  camera.aspect = aspect;
  camera.position.set(
    Math.sin(time * 0.22) * orbit,
    Math.sin(time * 0.17) * orbit * 0.45,
    2.1 + depth * 0.25,
  );
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
