export const DEFAULT_TIMELINE_PX_PER_SECOND = 32;
export const MAX_TIMELINE_PX_PER_SECOND = 256;
export const MIN_TIMELINE_PX_PER_SECOND = 1;

const TARGET_TICK_SPACING_PX = 120;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

export function timelineMinPxPerSecond(duration: number, viewportWidth: number): number {
  if (duration <= 0 || viewportWidth <= 0) return MIN_TIMELINE_PX_PER_SECOND;
  return Math.min(
    DEFAULT_TIMELINE_PX_PER_SECOND,
    Math.max(MIN_TIMELINE_PX_PER_SECOND, viewportWidth / duration),
  );
}

export function clampTimelinePxPerSecond(
  pxPerSecond: number,
  duration: number,
  viewportWidth: number,
): number {
  return clamp(
    pxPerSecond,
    timelineMinPxPerSecond(duration, viewportWidth),
    MAX_TIMELINE_PX_PER_SECOND,
  );
}

export function clampTimelineScrollLeft(
  scrollLeft: number,
  duration: number,
  viewportWidth: number,
  pxPerSecond: number,
): number {
  const maxScrollLeft = Math.max(0, duration * pxPerSecond - viewportWidth);
  return clamp(scrollLeft, 0, maxScrollLeft);
}

export function zoomTimelineViewport({
  pxPerSecond,
  scrollLeft,
  cursorX,
  deltaY,
  duration,
  viewportWidth,
}: {
  pxPerSecond: number;
  scrollLeft: number;
  cursorX: number;
  deltaY: number;
  duration: number;
  viewportWidth: number;
}): { pxPerSecond: number; scrollLeft: number } {
  const timelineTimeAtCursor = (scrollLeft + cursorX) / pxPerSecond;
  const zoomFactor = 2 ** (-deltaY / 500);
  const nextPxPerSecond = clampTimelinePxPerSecond(
    pxPerSecond * zoomFactor,
    duration,
    viewportWidth,
  );
  const nextScrollLeft = clampTimelineScrollLeft(
    timelineTimeAtCursor * nextPxPerSecond - cursorX,
    duration,
    viewportWidth,
    nextPxPerSecond,
  );

  return { pxPerSecond: nextPxPerSecond, scrollLeft: nextScrollLeft };
}

export function adaptiveTimelineTickInterval(pxPerSecond: number): number {
  return niceCeil(TARGET_TICK_SPACING_PX / pxPerSecond);
}
