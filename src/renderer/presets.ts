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

export const SPECTRAL_SWARM_PARAMS: ParamDescriptor[] = [
  {
    key: "count",
    label: "Particles",
    min: 1000,
    max: 150000,
    step: 1000,
    defaultValue: 42000,
    modulatable: false,
  },
  { key: "size", label: "Size", min: 0.4, max: 7, step: 0.1, defaultValue: 1.1, modulatable: true },
  { key: "spread", label: "Spread", min: 0.2, max: 2.4, step: 0.01, defaultValue: 1.0, modulatable: true },
  { key: "speed", label: "Speed", min: 0, max: 3, step: 0.01, defaultValue: 0.62, modulatable: true },
  {
    key: "brightness",
    label: "Brightness",
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.78,
    modulatable: true,
  },
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.88, modulatable: false },
  { key: "trail", label: "Trail", min: 0, max: 0.98, step: 0.01, defaultValue: 0.82, modulatable: false },
];

export const SPECTRAL_HALO_PARAMS: ParamDescriptor[] = [
  {
    key: "count",
    label: "Particles",
    min: 1000,
    max: 140000,
    step: 1000,
    defaultValue: 52000,
    modulatable: false,
  },
  { key: "radius", label: "Radius", min: 0.1, max: 1.5, step: 0.01, defaultValue: 0.74, modulatable: true },
  { key: "thickness", label: "Thickness", min: 0.02, max: 0.8, step: 0.01, defaultValue: 0.26, modulatable: true },
  { key: "spin", label: "Spin", min: -2, max: 2, step: 0.01, defaultValue: 0.24, modulatable: true },
  { key: "burst", label: "Burst", min: 0, max: 1, step: 0.01, defaultValue: 0.38, modulatable: true },
  { key: "size", label: "Size", min: 0.3, max: 8, step: 0.1, defaultValue: 1.0, modulatable: true },
  {
    key: "brightness",
    label: "Brightness",
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.86,
    modulatable: true,
  },
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.92, modulatable: false },
  { key: "trail", label: "Trail", min: 0, max: 0.98, step: 0.01, defaultValue: 0.76, modulatable: false },
];

export const SPECTRAL_TERRAIN_PARAMS: ParamDescriptor[] = [
  { key: "height", label: "Height", min: 0.05, max: 1.5, step: 0.01, defaultValue: 0.74, modulatable: true },
  { key: "depth", label: "Depth", min: 0.3, max: 1.8, step: 0.01, defaultValue: 1.05, modulatable: true },
  { key: "history", label: "History", min: 0.1, max: 3, step: 0.01, defaultValue: 1.4, modulatable: true },
  { key: "contrast", label: "Contrast", min: 0.5, max: 4, step: 0.01, defaultValue: 2.2, modulatable: true },
  {
    key: "brightness",
    label: "Brightness",
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.86,
    modulatable: true,
  },
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.82, modulatable: false },
];

export const FLUID_FIELD_PARAMS: ParamDescriptor[] = [
  { key: "flow", label: "Flow", min: 0, max: 2, step: 0.01, defaultValue: 0.6, modulatable: true },
  { key: "scale", label: "Scale", min: 0.5, max: 6, step: 0.01, defaultValue: 2.2, modulatable: true },
  { key: "warp", label: "Warp", min: 0, max: 3, step: 0.01, defaultValue: 1.4, modulatable: true },
  { key: "contrast", label: "Contrast", min: 0.5, max: 4, step: 0.01, defaultValue: 1.8, modulatable: true },
  { key: "bands", label: "Bands", min: 0, max: 1, step: 0.01, defaultValue: 0, modulatable: true },
  { key: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.85, modulatable: true },
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.8, modulatable: false },
];

export const HALFTONE_PARAMS: ParamDescriptor[] = [
  { key: "grid", label: "Grid", min: 8, max: 120, step: 1, defaultValue: 48, modulatable: false },
  { key: "dotScale", label: "Dot Size", min: 0.1, max: 0.7, step: 0.01, defaultValue: 0.45, modulatable: true },
  { key: "field", label: "Field", min: 0, max: 2, step: 0.01, defaultValue: 0.5, modulatable: true },
  { key: "spectrum", label: "Spectrum", min: 0, max: 1, step: 0.01, defaultValue: 0.5, modulatable: true },
  { key: "contrast", label: "Contrast", min: 0.5, max: 4, step: 0.01, defaultValue: 1.6, modulatable: true },
  { key: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.9, modulatable: true },
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.85, modulatable: false },
];

export const LATTICE_PARAMS: ParamDescriptor[] = [
  { key: "cells", label: "Cells", min: 2, max: 10, step: 1, defaultValue: 6, modulatable: false },
  { key: "twist", label: "Twist", min: 0, max: 2, step: 0.01, defaultValue: 0, modulatable: true },
  { key: "displace", label: "Displace", min: 0, max: 1, step: 0.01, defaultValue: 0.25, modulatable: true },
  { key: "spin", label: "Spin", min: -2, max: 2, step: 0.01, defaultValue: 0.3, modulatable: true },
  { key: "depth", label: "Depth", min: 0, max: 1, step: 0.01, defaultValue: 0.5, modulatable: true },
  { key: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.8, modulatable: true },
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.82, modulatable: false },
  { key: "trail", label: "Trail", min: 0, max: 0.98, step: 0.01, defaultValue: 0.4, modulatable: false },
];

export const STROKES_PARAMS: ParamDescriptor[] = [
  { key: "count", label: "Strokes", min: 200, max: 6000, step: 100, defaultValue: 1400, modulatable: false },
  { key: "length", label: "Length", min: 0, max: 1.5, step: 0.01, defaultValue: 0.7, modulatable: true },
  { key: "curl", label: "Curl", min: 0, max: 3, step: 0.01, defaultValue: 1.2, modulatable: true },
  { key: "speed", label: "Speed", min: 0, max: 2, step: 0.01, defaultValue: 0.5, modulatable: true },
  { key: "spread", label: "Spread", min: 0.05, max: 1.5, step: 0.01, defaultValue: 0.5, modulatable: true },
  { key: "wobble", label: "Wobble", min: 0, max: 1, step: 0.01, defaultValue: 0.3, modulatable: true },
  { key: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.8, modulatable: true },
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.8, modulatable: false },
  { key: "trail", label: "Trail", min: 0, max: 0.98, step: 0.01, defaultValue: 0.7, modulatable: false },
];

export const GRAIN_FIELD_PARAMS: ParamDescriptor[] = [
  { key: "shape", label: "Shape", min: 0, max: 1, step: 1, defaultValue: 0, modulatable: false },
  { key: "size", label: "Size", min: 0.1, max: 0.9, step: 0.01, defaultValue: 0.46, modulatable: true },
  { key: "edge", label: "Edge", min: 0.004, max: 0.2, step: 0.001, defaultValue: 0.03, modulatable: true },
  { key: "grain", label: "Grain", min: 0, max: 1, step: 0.01, defaultValue: 0.55, modulatable: true },
  { key: "density", label: "Density", min: 1, max: 6, step: 0.1, defaultValue: 1.6, modulatable: true },
  { key: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.85, modulatable: true },
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.85, modulatable: false },
];

export const NEBULA_PARAMS: ParamDescriptor[] = [
  { key: "scale", label: "Scale", min: 1, max: 8, step: 0.1, defaultValue: 3.5, modulatable: true },
  { key: "cells", label: "Cells", min: 0, max: 1, step: 0.01, defaultValue: 0.6, modulatable: true },
  { key: "drift", label: "Drift", min: 0, max: 2, step: 0.01, defaultValue: 0.4, modulatable: true },
  { key: "contrast", label: "Contrast", min: 0.5, max: 4, step: 0.01, defaultValue: 2.0, modulatable: true },
  { key: "falloff", label: "Falloff", min: 0, max: 1, step: 0.01, defaultValue: 0.5, modulatable: true },
  { key: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.85, modulatable: true },
  { key: "reactivity", label: "Reactivity", min: 0, max: 1, step: 0.01, defaultValue: 0.82, modulatable: false },
];

export const PRESETS: Record<VisualPresetId, PresetDescriptor> = {
  particleField: {
    id: "particleField",
    label: "Particle Field",
    params: PARTICLE_FIELD_PARAMS,
    defaultModulations: [
      { param: "spread", source: "bass", amount: 0.18, smoothing: 0.28 },
      { param: "burst", source: "onset", amount: 0.36, smoothing: 0.05 },
      { param: "speed", source: "beat", amount: 0.18, smoothing: 0.16 },
      { param: "brightness", source: "high", amount: 0.16, smoothing: 0.2 },
    ],
  },
  flowField: {
    id: "flowField",
    label: "Flow Field",
    params: FLOW_FIELD_PARAMS,
    defaultModulations: [
      { param: "curl", source: "mid", amount: 0.28, smoothing: 0.32 },
      { param: "length", source: "onset", amount: 0.18, smoothing: 0.08 },
      { param: "speed", source: "bass", amount: 0.12, smoothing: 0.34 },
      { param: "brightness", source: "high", amount: 0.18, smoothing: 0.22 },
    ],
  },
  radialBurst: {
    id: "radialBurst",
    label: "Radial Burst",
    params: RADIAL_BURST_PARAMS,
    defaultModulations: [
      { param: "radius", source: "bass", amount: 0.24, smoothing: 0.24 },
      { param: "burst", source: "beat", amount: 0.32, smoothing: 0.12 },
      { param: "burst", source: "onset", amount: 0.24, smoothing: 0.05 },
      { param: "wobble", source: "high", amount: 0.18, smoothing: 0.2 },
    ],
  },
  spectralSwarm: {
    id: "spectralSwarm",
    label: "Spectral Swarm",
    params: SPECTRAL_SWARM_PARAMS,
    defaultModulations: [
      { param: "spread", source: "bass", amount: 0.16, smoothing: 0.28 },
      { param: "speed", source: "mid", amount: 0.18, smoothing: 0.32 },
      { param: "brightness", source: "high", amount: 0.18, smoothing: 0.2 },
    ],
  },
  spectralHalo: {
    id: "spectralHalo",
    label: "Spectral Halo",
    params: SPECTRAL_HALO_PARAMS,
    defaultModulations: [
      { param: "radius", source: "bass", amount: 0.16, smoothing: 0.26 },
      { param: "burst", source: "onset", amount: 0.28, smoothing: 0.06 },
      { param: "brightness", source: "rms", amount: 0.16, smoothing: 0.22 },
    ],
  },
  spectralTerrain: {
    id: "spectralTerrain",
    label: "Spectral Terrain",
    params: SPECTRAL_TERRAIN_PARAMS,
    defaultModulations: [
      { param: "height", source: "bass", amount: 0.18, smoothing: 0.28 },
      { param: "contrast", source: "mid", amount: 0.3, smoothing: 0.34 },
      { param: "brightness", source: "rms", amount: 0.14, smoothing: 0.25 },
    ],
  },
  fluidField: {
    id: "fluidField",
    label: "Fluid",
    params: FLUID_FIELD_PARAMS,
    defaultModulations: [
      { param: "flow", source: "rms", amount: 0.24, smoothing: 0.3 },
      { param: "warp", source: "mid", amount: 0.4, smoothing: 0.32 },
      { param: "brightness", source: "bass", amount: 0.16, smoothing: 0.26 },
    ],
  },
  halftone: {
    id: "halftone",
    label: "Halftone",
    params: HALFTONE_PARAMS,
    defaultModulations: [
      { param: "dotScale", source: "bass", amount: 0.18, smoothing: 0.22 },
      { param: "field", source: "mid", amount: 0.22, smoothing: 0.3 },
      { param: "brightness", source: "high", amount: 0.16, smoothing: 0.2 },
    ],
  },
  lattice: {
    id: "lattice",
    label: "Lattice",
    params: LATTICE_PARAMS,
    defaultModulations: [
      { param: "displace", source: "bass", amount: 0.26, smoothing: 0.24 },
      { param: "spin", source: "beat", amount: 0.16, smoothing: 0.18 },
      { param: "brightness", source: "high", amount: 0.16, smoothing: 0.22 },
    ],
  },
  strokes: {
    id: "strokes",
    label: "Strokes",
    params: STROKES_PARAMS,
    defaultModulations: [
      { param: "curl", source: "mid", amount: 0.3, smoothing: 0.3 },
      { param: "length", source: "onset", amount: 0.2, smoothing: 0.08 },
      { param: "brightness", source: "rms", amount: 0.16, smoothing: 0.24 },
    ],
  },
  grainField: {
    id: "grainField",
    label: "Grain",
    params: GRAIN_FIELD_PARAMS,
    defaultModulations: [
      { param: "grain", source: "high", amount: 0.24, smoothing: 0.12 },
      { param: "size", source: "bass", amount: 0.14, smoothing: 0.26 },
      { param: "brightness", source: "rms", amount: 0.16, smoothing: 0.22 },
    ],
  },
  nebula: {
    id: "nebula",
    label: "Nebula",
    params: NEBULA_PARAMS,
    defaultModulations: [
      { param: "drift", source: "rms", amount: 0.2, smoothing: 0.3 },
      { param: "scale", source: "bass", amount: 0.5, smoothing: 0.28 },
      { param: "brightness", source: "high", amount: 0.16, smoothing: 0.2 },
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
      { param: "spread", source: "bass", amount: 0.22, smoothing: 0.36 },
      { param: "size", source: "bass", amount: 0.16, smoothing: 0.4 },
      { param: "turbulence", source: "mid", amount: 0.16, smoothing: 0.35 },
      { param: "brightness", source: "rms", amount: 0.14, smoothing: 0.28 },
    ],
  },
  {
    id: "flow-smoke-veil",
    presetId: "flowField",
    label: "Smoke Ribbons",
    seed: 33017,
    params: {
      count: 42000,
      size: 1.45,
      spread: 1.08,
      speed: 0.38,
      curl: 0.78,
      length: 0.7,
      brightness: 0.56,
      reactivity: 0.7,
      trail: 0.9,
    },
    defaultModulations: PRESETS.flowField.defaultModulations,
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
  {
    id: "spectral-swarm-portrait",
    presetId: "spectralSwarm",
    label: "Spectral Swarm",
    seed: 51041,
    params: {
      count: 54000,
      size: 0.9,
      spread: 1.15,
      speed: 0.72,
      brightness: 0.82,
      reactivity: 0.9,
      trail: 0.86,
    },
    defaultModulations: PRESETS.spectralSwarm.defaultModulations,
  },
  {
    id: "spectral-halo-core",
    presetId: "spectralHalo",
    label: "Spectral Halo",
    seed: 62077,
    params: {
      count: 64000,
      radius: 0.62,
      thickness: 0.32,
      spin: 0.28,
      burst: 0.48,
      size: 0.85,
      brightness: 0.9,
      reactivity: 0.94,
      trail: 0.8,
    },
    defaultModulations: PRESETS.spectralHalo.defaultModulations,
  },
  {
    id: "spectral-terrain-ridges",
    presetId: "spectralTerrain",
    label: "Spectral Terrain",
    seed: 70419,
    params: {
      height: 0.82,
      depth: 1.18,
      history: 1.65,
      contrast: 2.45,
      brightness: 0.9,
      reactivity: 0.86,
    },
    defaultModulations: PRESETS.spectralTerrain.defaultModulations,
  },
  {
    id: "fluid-ink-bloom",
    presetId: "fluidField",
    label: "Ink Bloom",
    seed: 30142,
    params: { flow: 0.5, scale: 2.0, warp: 2.1, contrast: 2.4, bands: 0, brightness: 0.88, reactivity: 0.82 },
    defaultModulations: PRESETS.fluidField.defaultModulations,
  },
  {
    id: "fluid-liquid-bands",
    presetId: "fluidField",
    label: "Liquid Bands",
    seed: 30255,
    params: { flow: 0.7, scale: 2.6, warp: 1.0, contrast: 1.5, bands: 0.85, brightness: 0.8, reactivity: 0.78 },
    defaultModulations: [
      { param: "flow", source: "bass", amount: 0.22, smoothing: 0.3 },
      { param: "bands", source: "mid", amount: 0.16, smoothing: 0.32 },
      { param: "brightness", source: "rms", amount: 0.16, smoothing: 0.26 },
    ],
  },
  {
    id: "fluid-smoke-veil",
    presetId: "fluidField",
    label: "Smoke Veil",
    seed: 30388,
    params: { flow: 0.32, scale: 1.5, warp: 1.6, contrast: 2.0, bands: 0, brightness: 0.62, reactivity: 0.7 },
    defaultModulations: PRESETS.fluidField.defaultModulations,
  },
  {
    id: "halftone-dot-grid",
    presetId: "halftone",
    label: "Dot Grid",
    seed: 41011,
    params: { grid: 52, dotScale: 0.42, field: 0.45, spectrum: 0.4, contrast: 1.6, brightness: 0.9, reactivity: 0.85 },
    defaultModulations: PRESETS.halftone.defaultModulations,
  },
  {
    id: "halftone-pulse-matrix",
    presetId: "halftone",
    label: "Pulse Matrix",
    seed: 41124,
    params: { grid: 26, dotScale: 0.6, field: 0.35, spectrum: 0.75, contrast: 1.9, brightness: 0.92, reactivity: 0.9 },
    defaultModulations: [
      { param: "dotScale", source: "beat", amount: 0.24, smoothing: 0.16 },
      { param: "spectrum", source: "mid", amount: 0.2, smoothing: 0.28 },
      { param: "brightness", source: "high", amount: 0.18, smoothing: 0.2 },
    ],
  },
  {
    id: "lattice-wire-cube",
    presetId: "lattice",
    label: "Wire Cube",
    seed: 52017,
    params: { cells: 5, twist: 0, displace: 0.14, spin: 0.28, depth: 0.5, brightness: 0.82, reactivity: 0.8, trail: 0.35 },
    defaultModulations: PRESETS.lattice.defaultModulations,
  },
  {
    id: "lattice-coil",
    presetId: "lattice",
    label: "Coil",
    seed: 52130,
    params: { cells: 7, twist: 1.2, displace: 0.28, spin: 0.4, depth: 0.6, brightness: 0.8, reactivity: 0.84, trail: 0.45 },
    defaultModulations: [
      { param: "twist", source: "mid", amount: 0.22, smoothing: 0.34 },
      { param: "displace", source: "bass", amount: 0.26, smoothing: 0.24 },
      { param: "brightness", source: "high", amount: 0.16, smoothing: 0.22 },
    ],
  },
  {
    id: "lattice-cage",
    presetId: "lattice",
    label: "Cage",
    seed: 52243,
    params: { cells: 8, twist: 0.3, displace: 0.18, spin: 0.62, depth: 0.7, brightness: 0.78, reactivity: 0.82, trail: 0.55 },
    defaultModulations: PRESETS.lattice.defaultModulations,
  },
  {
    id: "strokes-brush-swirl",
    presetId: "strokes",
    label: "Brush Swirl",
    seed: 63019,
    params: { count: 900, length: 0.6, curl: 2.4, speed: 0.45, spread: 0.85, wobble: 0.32, brightness: 0.78, reactivity: 0.82, trail: 0.74 },
    defaultModulations: PRESETS.strokes.defaultModulations,
  },
  {
    id: "strokes-ink-fibers",
    presetId: "strokes",
    label: "Ink Fibers",
    seed: 63132,
    params: { count: 1600, length: 1.05, curl: 0.5, speed: 0.6, spread: 0.55, wobble: 0.5, brightness: 0.72, reactivity: 0.84, trail: 0.66 },
    defaultModulations: [
      { param: "length", source: "onset", amount: 0.26, smoothing: 0.07 },
      { param: "wobble", source: "high", amount: 0.22, smoothing: 0.18 },
      { param: "brightness", source: "rms", amount: 0.16, smoothing: 0.24 },
    ],
  },
  {
    id: "grain-static-square",
    presetId: "grainField",
    label: "Static Square",
    seed: 74015,
    params: { shape: 0, size: 0.24, edge: 0.028, grain: 0.55, density: 1.6, brightness: 0.88, reactivity: 0.85 },
    defaultModulations: PRESETS.grainField.defaultModulations,
  },
  {
    id: "grain-noise-ring",
    presetId: "grainField",
    label: "Noise Ring",
    seed: 74128,
    params: { shape: 1, size: 0.3, edge: 0.02, grain: 0.48, density: 2.0, brightness: 0.86, reactivity: 0.82 },
    defaultModulations: PRESETS.grainField.defaultModulations,
  },
  {
    id: "nebula-cell-cluster",
    presetId: "nebula",
    label: "Cell Cluster",
    seed: 85011,
    params: { scale: 4.2, cells: 0.82, drift: 0.45, contrast: 2.3, falloff: 0.9, brightness: 0.86, reactivity: 0.82 },
    defaultModulations: PRESETS.nebula.defaultModulations,
  },
  {
    id: "nebula-plasma-cloud",
    presetId: "nebula",
    label: "Plasma Cloud",
    seed: 85124,
    params: { scale: 2.6, cells: 0.2, drift: 0.35, contrast: 1.5, falloff: 0.45, brightness: 0.95, reactivity: 0.8 },
    defaultModulations: [
      { param: "drift", source: "rms", amount: 0.2, smoothing: 0.3 },
      { param: "contrast", source: "mid", amount: 0.4, smoothing: 0.32 },
      { param: "brightness", source: "bass", amount: 0.16, smoothing: 0.26 },
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
