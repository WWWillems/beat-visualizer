import { describe, expect, it } from "vitest";
import { halftoneDotRadius } from "@/renderer/halftone";

describe("halftoneDotRadius", () => {
  it("grows monotonically with field amplitude", () => {
    const low = halftoneDotRadius(0.1, 0.45, 0);
    const mid = halftoneDotRadius(0.5, 0.45, 0);
    const high = halftoneDotRadius(0.9, 0.45, 0);

    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });

  it("clamps amplitude so out-of-range input cannot blow up the radius", () => {
    const max = halftoneDotRadius(1, 0.5, 0);
    expect(halftoneDotRadius(5, 0.5, 0)).toBeCloseTo(max);
    expect(halftoneDotRadius(-2, 0.5, 0)).toBeCloseTo(halftoneDotRadius(0, 0.5, 0));
  });

  it("lets bass swell the dot radius", () => {
    expect(halftoneDotRadius(0.5, 0.45, 1)).toBeGreaterThan(halftoneDotRadius(0.5, 0.45, 0));
  });
});
