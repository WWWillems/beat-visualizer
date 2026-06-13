import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMELINE_PX_PER_SECOND,
  MAX_TIMELINE_PX_PER_SECOND,
  adaptiveTimelineTickInterval,
  clampTimelineScrollLeft,
  timelineMinPxPerSecond,
  zoomTimelineViewport,
} from "@/timeline/viewport";

describe("timeline viewport helpers", () => {
  it("uses fit-to-project as the minimum zoom when it is below the default scale", () => {
    expect(timelineMinPxPerSecond(100, 800)).toBe(8);
    expect(timelineMinPxPerSecond(10, 800)).toBe(DEFAULT_TIMELINE_PX_PER_SECOND);
  });

  it("keeps the timeline time under the cursor fixed while zooming", () => {
    const result = zoomTimelineViewport({
      pxPerSecond: 32,
      scrollLeft: 320,
      cursorX: 160,
      deltaY: -100,
      duration: 60,
      viewportWidth: 800,
    });

    const before = (320 + 160) / 32;
    const after = (result.scrollLeft + 160) / result.pxPerSecond;
    expect(after).toBeCloseTo(before);
    expect(result.pxPerSecond).toBeGreaterThan(32);
  });

  it("clamps zoom and scroll to the available timeline range", () => {
    const result = zoomTimelineViewport({
      pxPerSecond: 32,
      scrollLeft: 0,
      cursorX: 400,
      deltaY: -10_000,
      duration: 30,
      viewportWidth: 800,
    });

    expect(result.pxPerSecond).toBe(MAX_TIMELINE_PX_PER_SECOND);
    expect(clampTimelineScrollLeft(10_000, 30, 800, 32)).toBe(160);
  });

  it("chooses readable ruler intervals from the current zoom scale", () => {
    expect(adaptiveTimelineTickInterval(256)).toBe(0.5);
    expect(adaptiveTimelineTickInterval(32)).toBe(5);
    expect(adaptiveTimelineTickInterval(1)).toBe(200);
  });
});
