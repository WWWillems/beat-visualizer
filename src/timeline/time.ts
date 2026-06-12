export function totalFramesForDuration(duration: number, fps: number): number {
  return Math.max(1, Math.ceil(duration * fps));
}

export function lastFrameTime(duration: number, fps: number): number {
  return (totalFramesForDuration(duration, fps) - 1) / fps;
}

/**
 * Converts a UI playhead time into the frame sample time used by the renderer.
 * The playhead may sit on the end boundary (duration), but the renderer must
 * show the final actual frame before that boundary.
 */
export function renderTimeForPlayhead(playhead: number, duration: number, fps: number): number {
  if (playhead >= duration) return lastFrameTime(duration, fps);
  return Math.max(0, playhead);
}

export function frameIndexAtTime(time: number, fps: number): number {
  // The small epsilon avoids showing 36:28 for values like 36.9666666664.
  return Math.max(0, Math.floor(time * fps + 1e-6));
}

export function formatTimecode(time: number, fps: number): string {
  const frameIndex = frameIndexAtTime(time, fps);
  const totalSeconds = Math.floor(frameIndex / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const frames = frameIndex % fps;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${frames.toString().padStart(2, "0")}`;
}
