import { describe, expect, it } from "vitest";
import { buildLatticePositions } from "@/renderer/lattice";

describe("buildLatticePositions", () => {
  it("emits the expected number of axis-aligned segments for an NxNxN grid", () => {
    const n = 4;
    const positions = buildLatticePositions(n, 1234);
    // 3 axes, each contributing n*n*(n-1) segments; 2 endpoints * 3 floats.
    const segments = 3 * n * n * (n - 1);
    expect(positions.length).toBe(segments * 2 * 3);
  });

  it("is deterministic for a given seed (preview/export parity)", () => {
    const a = buildLatticePositions(5, 4242);
    const b = buildLatticePositions(5, 4242);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("changes the jittered node layout when the seed changes", () => {
    const a = buildLatticePositions(5, 1);
    const b = buildLatticePositions(5, 2);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});
