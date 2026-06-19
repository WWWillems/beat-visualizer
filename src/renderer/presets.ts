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

export interface LookDescriptor {
  id: string;
  presetId: VisualPresetId;
  label: string;
  seed: number;
  params: Record<string, number>;
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
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.8, modulatable: false },
  { key: "trail", label: "Trail", min: 0, max: 0.98, step: 0.01, defaultValue: 0.75, modulatable: false },
];

export const FLOW_FIELD_PARAMS: ParamDescriptor[] = [
  {
    key: "count",
    label: "Particles",
    min: 1000,
    max: 120000,
    step: 1000,
    defaultValue: 30000,
    modulatable: false,
  },
  { key: "size", label: "Size", min: 0.3, max: 7, step: 0.1, defaultValue: 1.1, modulatable: true },
  { key: "spread", label: "Spread", min: 0.2, max: 2.4, step: 0.01, defaultValue: 1.2, modulatable: true },
  { key: "speed", label: "Speed", min: 0, max: 3, step: 0.01, defaultValue: 0.75, modulatable: true },
  { key: "curl", label: "Curl", min: 0, max: 1, step: 0.01, defaultValue: 0.55, modulatable: true },
  { key: "length", label: "Length", min: 0, max: 1, step: 0.01, defaultValue: 0.45, modulatable: true },
  {
    key: "brightness",
    label: "Brightness",
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.7,
    modulatable: true,
  },
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.8, modulatable: false },
  { key: "trail", label: "Trail", min: 0, max: 0.98, step: 0.01, defaultValue: 0.82, modulatable: false },
];

export const RADIAL_BURST_PARAMS: ParamDescriptor[] = [
  {
    key: "count",
    label: "Particles",
    min: 1000,
    max: 100000,
    step: 1000,
    defaultValue: 22000,
    modulatable: false,
  },
  { key: "rays", label: "Rays", min: 3, max: 36, step: 1, defaultValue: 14, modulatable: false },
  { key: "radius", label: "Radius", min: 0.05, max: 1.5, step: 0.01, defaultValue: 0.85, modulatable: true },
  { key: "spread", label: "Spread", min: 0.02, max: 0.8, step: 0.01, defaultValue: 0.2, modulatable: true },
  { key: "spin", label: "Spin", min: -2, max: 2, step: 0.01, defaultValue: 0.35, modulatable: true },
  { key: "wobble", label: "Wobble", min: 0, max: 1, step: 0.01, defaultValue: 0.35, modulatable: true },
  { key: "burst", label: "Burst", min: 0, max: 1, step: 0.01, defaultValue: 0.2, modulatable: true },
  { key: "size", label: "Size", min: 0.3, max: 8, step: 0.1, defaultValue: 1.2, modulatable: true },
  {
    key: "brightness",
    label: "Brightness",
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.8,
    modulatable: true,
  },
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.85, modulatable: false },
  { key: "trail", label: "Trail", min: 0, max: 0.98, step: 0.01, defaultValue: 0.78, modulatable: false },
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
  flowField: {
    id: "flowField",
    label: "Flow Field",
    params: FLOW_FIELD_PARAMS,
    defaultModulations: [
      { param: "length", source: "onset", amount: 0.25, smoothing: 0.08 },
      { param: "curl", source: "mid", amount: 0.2, smoothing: 0.3 },
      { param: "brightness", source: "rms", amount: 0.2, smoothing: 0.25 },
      { param: "speed", source: "bass", amount: 0.15, smoothing: 0.35 },
    ],
  },
  radialBurst: {
    id: "radialBurst",
    label: "Radial Burst",
    params: RADIAL_BURST_PARAMS,
    defaultModulations: [
      { param: "burst", source: "beat", amount: 0.35, smoothing: 0.12 },
      { param: "radius", source: "bass", amount: 0.18, smoothing: 0.25 },
      { param: "wobble", source: "high", amount: 0.2, smoothing: 0.2 },
      { param: "brightness", source: "rms", amount: 0.18, smoothing: 0.25 },
    ],
  },
};

export const LOOKS: LookDescriptor[] = [
  {
    id: "particle-orbit-dust",
    presetId: "particleField",
    label: "Orbit Dust",
    seed: 14011,
    params: {
      count: 18000,
      size: 1.25,
      spread: 0.9,
      speed: 0.55,
      turbulence: 0.28,
      burst: 0.1,
      brightness: 0.74,
      reactivity: 0.8,
      trail: 0.75,
    },
    defaultModulations: PRESETS.particleField.defaultModulations,
  },
  {
    id: "particle-soft-cloud",
    presetId: "particleField",
    label: "Soft Cloud",
    seed: 91827,
    params: {
      count: 36000,
      size: 2.4,
      spread: 0.62,
      speed: 0.24,
      turbulence: 0.6,
      burst: 0.05,
      brightness: 0.52,
      reactivity: 0.68,
      trail: 0.88,
    },
    defaultModulations: [
      { param: "size", source: "bass", amount: 0.16, smoothing: 0.4 },
      { param: "turbulence", source: "mid", amount: 0.12, smoothing: 0.35 },
      { param: "brightness", source: "rms", amount: 0.18, smoothing: 0.28 },
    ],
  },
  {
    id: "particle-cube-drift",
    presetId: "particleField",
    label: "Cube Drift",
    seed: 51203,
    params: {
      count: 22000,
      size: 0.9,
      spread: 1.15,
      speed: 0.32,
      turbulence: 0.12,
      burst: 0.03,
      brightness: 0.66,
      reactivity: 0.62,
      trail: 0.92,
    },
    defaultModulations: [
      { param: "burst", source: "beat", amount: 0.22, smoothing: 0.2 },
      { param: "brightness", source: "rms", amount: 0.16, smoothing: 0.25 },
    ],
  },
  {
    id: "particle-spark-swarm",
    presetId: "particleField",
    label: "Spark Swarm",
    seed: 77291,
    params: {
      count: 52000,
      size: 0.7,
      spread: 1.45,
      speed: 1.05,
      turbulence: 0.42,
      burst: 0.28,
      brightness: 0.92,
      reactivity: 0.96,
      trail: 0.58,
    },
    defaultModulations: [
      { param: "burst", source: "onset", amount: 0.55, smoothing: 0.04 },
      { param: "speed", source: "beat", amount: 0.22, smoothing: 0.12 },
      { param: "brightness", source: "high", amount: 0.25, smoothing: 0.18 },
    ],
  },
  {
    id: "flow-smoke-veil",
    presetId: "flowField",
    label: "Smoke Veil",
    seed: 33017,
    params: {
      count: 46000,
      size: 1.6,
      spread: 1.25,
      speed: 0.34,
      curl: 0.72,
      length: 0.62,
      brightness: 0.52,
      reactivity: 0.7,
      trail: 0.9,
    },
    defaultModulations: PRESETS.flowField.defaultModulations,
  },
  {
    id: "flow-turbulent-sheet",
    presetId: "flowField",
    label: "Turbulent Sheet",
    seed: 69154,
    params: {
      count: 72000,
      size: 0.8,
      spread: 1.85,
      speed: 0.52,
      curl: 0.9,
      length: 0.5,
      brightness: 0.68,
      reactivity: 0.88,
      trail: 0.84,
    },
    defaultModulations: [
      { param: "curl", source: "bass", amount: 0.28, smoothing: 0.22 },
      { param: "length", source: "onset", amount: 0.28, smoothing: 0.08 },
      { param: "brightness", source: "rms", amount: 0.18, smoothing: 0.25 },
    ],
  },
  {
    id: "flow-brush-stroke",
    presetId: "flowField",
    label: "Brush Stroke",
    seed: 44026,
    params: {
      count: 28000,
      size: 2.3,
      spread: 0.78,
      speed: 0.74,
      curl: 0.42,
      length: 0.92,
      brightness: 0.82,
      reactivity: 0.8,
      trail: 0.72,
    },
    defaultModulations: [
      { param: "length", source: "beat", amount: 0.26, smoothing: 0.14 },
      { param: "speed", source: "onset", amount: 0.24, smoothing: 0.08 },
      { param: "brightness", source: "rms", amount: 0.16, smoothing: 0.25 },
    ],
  },
  {
    id: "flow-wave-wisps",
    presetId: "flowField",
    label: "Wave Wisps",
    seed: 81388,
    params: {
      count: 34000,
      size: 1.1,
      spread: 1.35,
      speed: 0.9,
      curl: 0.35,
      length: 0.58,
      brightness: 0.7,
      reactivity: 0.86,
      trail: 0.86,
    },
    defaultModulations: [
      { param: "curl", source: "mid", amount: 0.22, smoothing: 0.32 },
      { param: "speed", source: "beat", amount: 0.18, smoothing: 0.18 },
      { param: "brightness", source: "high", amount: 0.18, smoothing: 0.22 },
    ],
  },
  {
    id: "radial-starburst",
    presetId: "radialBurst",
    label: "Starburst",
    seed: 26031,
    params: {
      count: 26000,
      rays: 18,
      radius: 0.95,
      spread: 0.08,
      spin: 0.18,
      wobble: 0.18,
      burst: 0.42,
      size: 0.7,
      brightness: 0.9,
      reactivity: 0.92,
      trail: 0.68,
    },
    defaultModulations: PRESETS.radialBurst.defaultModulations,
  },
  {
    id: "radial-ring-pulse",
    presetId: "radialBurst",
    label: "Ring Pulse",
    seed: 19044,
    params: {
      count: 38000,
      rays: 28,
      radius: 0.62,
      spread: 0.24,
      spin: -0.22,
      wobble: 0.38,
      burst: 0.24,
      size: 1.4,
      brightness: 0.74,
      reactivity: 0.88,
      trail: 0.82,
    },
    defaultModulations: [
      { param: "radius", source: "beat", amount: 0.3, smoothing: 0.16 },
      { param: "burst", source: "bass", amount: 0.24, smoothing: 0.24 },
      { param: "brightness", source: "rms", amount: 0.18, smoothing: 0.25 },
    ],
  },
  {
    id: "radial-spoked-tunnel",
    presetId: "radialBurst",
    label: "Spoked Tunnel",
    seed: 73119,
    params: {
      count: 44000,
      rays: 12,
      radius: 1.08,
      spread: 0.14,
      spin: 0.82,
      wobble: 0.24,
      burst: 0.18,
      size: 0.8,
      brightness: 0.78,
      reactivity: 0.78,
      trail: 0.9,
    },
    defaultModulations: [
      { param: "spin", source: "mid", amount: 0.18, smoothing: 0.32 },
      { param: "burst", source: "onset", amount: 0.22, smoothing: 0.06 },
      { param: "brightness", source: "rms", amount: 0.14, smoothing: 0.25 },
    ],
  },
  {
    id: "radial-shattered-halo",
    presetId: "radialBurst",
    label: "Shattered Halo",
    seed: 88207,
    params: {
      count: 32000,
      rays: 9,
      radius: 0.72,
      spread: 0.42,
      spin: -0.48,
      wobble: 0.76,
      burst: 0.34,
      size: 1.0,
      brightness: 0.86,
      reactivity: 0.94,
      trail: 0.76,
    },
    defaultModulations: [
      { param: "wobble", source: "high", amount: 0.26, smoothing: 0.18 },
      { param: "burst", source: "onset", amount: 0.38, smoothing: 0.05 },
      { param: "radius", source: "bass", amount: 0.18, smoothing: 0.24 },
    ],
  },
];

export const DEFAULT_LOOK_ID = "particle-orbit-dust";

export function defaultParams(presetId: VisualPresetId): Record<string, number> {
  return Object.fromEntries(
    PRESETS[presetId].params.map((p) => [p.key, p.defaultValue]),
  );
}

export function looksForPreset(presetId: VisualPresetId): LookDescriptor[] {
  return LOOKS.filter((look) => look.presetId === presetId);
}

export function lookDescriptor(lookId: string): LookDescriptor | undefined {
  return LOOKS.find((look) => look.id === lookId);
}

export function defaultLook(): LookDescriptor {
  const look = lookDescriptor(DEFAULT_LOOK_ID);
  if (!look) throw new Error(`Missing default Look: ${DEFAULT_LOOK_ID}`);
  return look;
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
