import type { VisualPresetId } from "@/model/types";

export interface ParamDescriptor {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface PresetDescriptor {
  id: VisualPresetId;
  label: string;
  params: ParamDescriptor[];
}

export const PARTICLE_FIELD_PARAMS: ParamDescriptor[] = [
  { key: "count", label: "Particles", min: 1000, max: 150000, step: 1000, defaultValue: 16000 },
  { key: "size", label: "Size", min: 0.5, max: 8, step: 0.1, defaultValue: 1.4 },
  { key: "spread", label: "Spread", min: 0.1, max: 2, step: 0.01, defaultValue: 0.9 },
  { key: "speed", label: "Speed", min: 0, max: 3, step: 0.01, defaultValue: 0.5 },
  { key: "turbulence", label: "Turbulence", min: 0, max: 1, step: 0.01, defaultValue: 0.35 },
  { key: "burst", label: "Burst", min: 0, max: 1, step: 0.01, defaultValue: 0 },
  { key: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.8 },
  { key: "trail", label: "Trail", min: 0, max: 0.98, step: 0.01, defaultValue: 0.75 },
];

export const PRESETS: Record<VisualPresetId, PresetDescriptor> = {
  particleField: {
    id: "particleField",
    label: "Particle Field",
    params: PARTICLE_FIELD_PARAMS,
  },
};

export function defaultParams(presetId: VisualPresetId): Record<string, number> {
  return Object.fromEntries(
    PRESETS[presetId].params.map((p) => [p.key, p.defaultValue]),
  );
}

export function paramDescriptor(presetId: VisualPresetId, key: string): ParamDescriptor | undefined {
  return PRESETS[presetId].params.find((p) => p.key === key);
}
