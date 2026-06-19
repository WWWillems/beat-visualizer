import { describe, expect, it } from "vitest";
import { spectralTerrainRidge } from "@/renderer/spectralTerrain";

describe("spectralTerrainRidge", () => {
  it("preserves peak ordering under high contrast instead of hard-clipping", () => {
    const mid = spectralTerrainRidge(0.5, 2.5);
    const high = spectralTerrainRidge(0.8, 2.5);
    const peak = spectralTerrainRidge(1, 2.5);

    expect(mid).toBeLessThan(high);
    expect(high).toBeLessThan(peak);
  });
});
