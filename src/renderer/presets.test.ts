import { describe, expect, it } from "vitest";
import { defaultParams, paramDescriptor } from "@/renderer/presets";

describe("particle field preset", () => {
  it("defaults to audio-led reactivity without requiring a schema migration", () => {
    expect(paramDescriptor("particleField", "reactivity")?.defaultValue).toBe(0.8);
    expect(defaultParams("particleField").reactivity).toBe(0.8);
  });
});
