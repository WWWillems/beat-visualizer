import type { Modulation, VisualPresetId } from "@/model/types";

export type ModulationTemplate = Omit<Modulation, "id">;

export interface ParamDescriptor {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  modulatable: boolean;
}

export interface PresetDescriptor {
  id: VisualPresetId;
  label: string;
  params: ParamDescriptor[];
  defaultModulations: ModulationTemplate[];
}

export const PARTICLE_FIELD_PARAMS: ParamDescriptor[] = [
  {
    key: "count",
    label: "Particles",
    min: 1000,
    max: 150000,
    step: 1000,
    defaultValue: 16000,
    modulatable: false,
  },
  { key: "size", label: "Size", min: 0.5, max: 8, step: 0.1, defaultValue: 1.4, modulatable: true },
  { key: "spread", label: "Spread", min: 0.1, max: 2, step: 0.01, defaultValue: 0.9, modulatable: true },
  { key: "speed", label: "Speed", min: 0, max: 3, step: 0.01, defaultValue: 0.5, modulatable: true },
  {
    key: "turbulence",
    label: "Turbulence",
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.35,
    modulatable: true,
  },
  { key: "burst", label: "Burst", min: 0, max: 1, step: 0.01, defaultValue: 0, modulatable: true },
  {
    key: "brightness",
    label: "Brightness",
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.8,
    modulatable: true,
  },
  { key: "trail", label: "Trail", min: 0, max: 0.98, step: 0.01, defaultValue: 0.75, modulatable: false },
];

export const PRESETS: Record<VisualPresetId, PresetDescriptor> = {
  particleField: {
    id: "particleField",
    label: "Particle Field",
    params: PARTICLE_FIELD_PARAMS,
    defaultModulations: [
      { param: "burst", source: "beat", amount: 0.35, smoothing: 0.15 },
      { param: "burst", source: "onset", amount: 0.45, smoothing: 0.05 },
      { param: "size", source: "bass", amount: 0.12, smoothing: 0.35 },
      { param: "brightness", source: "rms", amount: 0.15, smoothing: 0.25 },
    ],
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

export function modulatableParams(presetId: VisualPresetId): ParamDescriptor[] {
  return PRESETS[presetId].params.filter((p) => p.modulatable);
}

export function defaultModulationTemplates(presetId: VisualPresetId): ModulationTemplate[] {
  return PRESETS[presetId].defaultModulations.map((modulation) => ({ ...modulation }));
}
