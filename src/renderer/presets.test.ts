import { describe, expect, it } from "vitest";
import {
  defaultLook,
  defaultParams,
  LOOKS,
  looksForPreset,
  paramDescriptor,
  PRESETS,
} from "@/renderer/presets";

describe("particle field preset", () => {
  it("defaults to audio-led reactivity without requiring a schema migration", () => {
    expect(paramDescriptor("particleField", "reactivity")?.defaultValue).toBe(0.8);
    expect(defaultParams("particleField").reactivity).toBe(0.8);
  });
});

describe("look library", () => {
  it("offers curated looks across every preset family", () => {
    expect(Object.keys(PRESETS)).toEqual([
      "particleField",
      "flowField",
      "radialBurst",
      "spectralSwarm",
      "spectralHalo",
      "spectralTerrain",
      "fluidField",
      "halftone",
      "lattice",
      "strokes",
      "grainField",
      "nebula",
    ]);
    expect(LOOKS).toHaveLength(25);
    expect(looksForPreset("particleField")).toHaveLength(2);
    expect(looksForPreset("flowField")).toHaveLength(2);
    expect(looksForPreset("radialBurst")).toHaveLength(4);
    expect(looksForPreset("spectralSwarm")).toHaveLength(1);
    expect(looksForPreset("spectralHalo")).toHaveLength(1);
    expect(looksForPreset("spectralTerrain")).toHaveLength(1);
    expect(looksForPreset("fluidField")).toHaveLength(3);
    expect(looksForPreset("halftone")).toHaveLength(2);
    expect(looksForPreset("lattice")).toHaveLength(3);
    expect(looksForPreset("strokes")).toHaveLength(2);
    expect(looksForPreset("grainField")).toHaveLength(2);
    expect(looksForPreset("nebula")).toHaveLength(2);
  });

  it("uses a particle field look as the default visual starting point", () => {
    const look = defaultLook();

    expect(look.id).toBe("particle-orbit-dust");
    expect(look.presetId).toBe("particleField");
    expect(look.params.reactivity).toBe(0.8);
    expect(look.defaultModulations.length).toBeGreaterThan(0);
  });
});
