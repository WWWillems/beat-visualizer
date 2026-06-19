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
  it("keeps a reduced set of curated looks across all preset families", () => {
    expect(Object.keys(PRESETS)).toEqual([
      "particleField",
      "flowField",
      "radialBurst",
      "spectralSwarm",
      "spectralHalo",
      "spectralTerrain",
    ]);
    expect(LOOKS).toHaveLength(11);
    expect(looksForPreset("particleField")).toHaveLength(2);
    expect(looksForPreset("flowField")).toHaveLength(2);
    expect(looksForPreset("radialBurst")).toHaveLength(4);
    expect(looksForPreset("spectralSwarm")).toHaveLength(1);
    expect(looksForPreset("spectralHalo")).toHaveLength(1);
    expect(looksForPreset("spectralTerrain")).toHaveLength(1);
  });

  it("uses a particle field look as the default visual starting point", () => {
    const look = defaultLook();

    expect(look.id).toBe("particle-orbit-dust");
    expect(look.presetId).toBe("particleField");
    expect(look.params.reactivity).toBe(0.8);
    expect(look.defaultModulations.length).toBeGreaterThan(0);
  });
});
