import { describe, expect, it } from "vitest";
import {
  formatTimecode,
  frameIndexAtTime,
  lastFrameTime,
  renderTimeForPlayhead,
  totalFramesForDuration,
} from "@/timeline/time";

describe("timeline time helpers", () => {
  it("computes the final visible frame for an integer-second duration", () => {
    expect(totalFramesForDuration(37, 30)).toBe(1110);
    expect(lastFrameTime(37, 30)).toBeCloseTo(36 + 29 / 30);
    expect(formatTimecode(lastFrameTime(37, 30), 30)).toBe("00:36.29");
    expect(formatTimecode(37, 30)).toBe("00:37.00");
    expect(renderTimeForPlayhead(37, 37, 30)).toBe(lastFrameTime(37, 30));
  });

  it("matches export frame indexing for non-frame-aligned durations", () => {
    const duration = 37.01;
    const fps = 30;
    const totalFrames = totalFramesForDuration(duration, fps);
    const lastFrameIndex = totalFrames - 1;

    expect(frameIndexAtTime(lastFrameTime(duration, fps), fps)).toBe(lastFrameIndex);
    expect(lastFrameTime(duration, fps)).toBe(lastFrameIndex / fps);
  });

  it("keeps at least one frame for very short durations", () => {
    expect(totalFramesForDuration(0, 30)).toBe(1);
    expect(lastFrameTime(0, 30)).toBe(0);
  });
});
