import { describe, expect, it } from "vitest";
import { createVisualClip } from "@/model/defaults";
import type { Clip, VisualClip } from "@/model/types";
import {
  applyOverwriteEdit,
  clampMoveStart,
  clampResizeDuration,
  clampResizeStart,
} from "@/timeline/clips";

const MIN = 1 / 30;

function visual(start: number, duration: number): VisualClip {
  return createVisualClip(start, duration, {});
}

describe("clampMoveStart (hard collision)", () => {
  // Track layout: [0..4] [10..14], dragged clip originally at 5..8.
  const siblings = [visual(0, 4), visual(10, 4)];

  it("allows free movement inside the gap", () => {
    expect(clampMoveStart(siblings, 3, 6, 5, 60)).toBe(6);
  });

  it("collides against the left neighbor", () => {
    expect(clampMoveStart(siblings, 3, 1, 5, 60)).toBe(4);
  });

  it("collides against the right neighbor", () => {
    expect(clampMoveStart(siblings, 3, 9, 5, 60)).toBe(7);
  });

  it("clamps at the blocking edge without shrinking when the gap is too small", () => {
    // Gap is 4..10 (6s wide); a 6s clip exactly fits, a 7s clip stays put.
    expect(clampMoveStart(siblings, 6, 2, 4, 60)).toBe(4);
    expect(clampMoveStart([visual(0, 4)], 3, -5, 5, 60)).toBe(4);
  });

  it("clamps to the project bounds when there are no siblings", () => {
    expect(clampMoveStart([], 3, -2, 5, 60)).toBe(0);
    expect(clampMoveStart([], 3, 100, 5, 60)).toBe(57);
  });
});

describe("clampResize (hard collision)", () => {
  it("stops a left-edge resize at the previous sibling", () => {
    const result = clampResizeStart([visual(0, 4)], 6, 3, 1, MIN);
    expect(result.start).toBe(4);
    expect(result.duration).toBe(5);
  });

  it("stops a right-edge resize at the next sibling", () => {
    const result = clampResizeDuration([visual(10, 4)], 5, 3, 20, MIN, 60);
    expect(result.start).toBe(5);
    expect(result.duration).toBe(5);
  });

  it("respects the project duration when there is no next sibling", () => {
    const result = clampResizeDuration([], 5, 3, 100, MIN, 30);
    expect(result.duration).toBe(25);
  });
});

describe("applyOverwriteEdit", () => {
  it("trims the right side of a left-overlapped sibling", () => {
    const a = visual(0, 6);
    const b = visual(8, 4);
    const clips: Clip[] = [a, b];

    const result = applyOverwriteEdit(clips, b.id, 4, 4, MIN);

    const trimmed = result.find((c) => c.id === a.id);
    expect(trimmed?.start).toBe(0);
    expect(trimmed?.duration).toBe(4);
    expect(result.find((c) => c.id === b.id)?.start).toBe(4);
  });

  it("trims the left side of a right-overlapped sibling", () => {
    const a = visual(0, 4);
    const b = visual(6, 6);
    const clips: Clip[] = [a, b];

    const result = applyOverwriteEdit(clips, a.id, 2, 6, MIN);

    const trimmed = result.find((c) => c.id === b.id);
    expect(trimmed?.start).toBe(8);
    expect(trimmed?.duration).toBe(4);
  });

  it("deletes fully covered siblings", () => {
    const a = visual(4, 2);
    const b = visual(0, 2);
    const clips: Clip[] = [a, b];

    const result = applyOverwriteEdit(clips, b.id, 3, 5, MIN);

    expect(result.find((c) => c.id === a.id)).toBeUndefined();
    expect(result).toHaveLength(1);
  });

  it("splits a middle-overlapped sibling into restarting remainders", () => {
    const long = visual(0, 12);
    long.keyframes = { burst: [{ time: 0, value: 0, easing: "linear" }] };
    const dropped = visual(20, 4);
    const clips: Clip[] = [long, dropped];

    const result = applyOverwriteEdit(clips, dropped.id, 4, 4, MIN);

    expect(result).toHaveLength(3);
    const left = result.find((c) => c.id === long.id);
    expect(left?.start).toBe(0);
    expect(left?.duration).toBe(4);

    const right = result.find((c) => c.id !== long.id && c.id !== dropped.id);
    expect(right).toBeDefined();
    expect(right?.start).toBe(8);
    expect(right?.duration).toBe(4);
    // The right remainder is a new segment with duplicated metadata.
    expect(right?.type).toBe("visual");
    if (right?.type === "visual" && left?.type === "visual") {
      expect(right.seed).toBe(long.seed);
      expect(right.keyframes).toEqual(long.keyframes);
      expect(right.keyframes).not.toBe(left.keyframes);
    }
  });

  it("drops remainders shorter than the minimum duration", () => {
    const a = visual(0, 4.01);
    const b = visual(8, 4);
    const clips: Clip[] = [a, b];

    const result = applyOverwriteEdit(clips, b.id, 4, 4, MIN);

    // Left remainder would be 4s (kept); right remainder 0.01s (dropped).
    expect(result.find((c) => c.id === a.id)?.duration).toBe(4);
    expect(result).toHaveLength(2);
  });

  it("leaves non-overlapping siblings untouched", () => {
    const a = visual(0, 2);
    const b = visual(10, 2);
    const clips: Clip[] = [a, b];

    const result = applyOverwriteEdit(clips, b.id, 5, 2, MIN);

    expect(result.find((c) => c.id === a.id)).toEqual(a);
  });
});
