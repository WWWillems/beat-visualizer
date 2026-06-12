import { createId } from "@/model/defaults";
import type { Clip } from "@/model/types";

/**
 * Same-track clip interval rules (see CONTEXT.md, "Overwrite editing"):
 * normal drag/resize hard-collides at sibling clip edges and never shrinks
 * the edited clip; Option/Alt enters overwrite editing, where the edited
 * clip keeps its requested range and overlapped siblings are trimmed,
 * split, or deleted.
 */

export interface ClipSpan {
  id: string;
  start: number;
  duration: number;
}

export function clipEnd(clip: ClipSpan): number {
  return clip.start + clip.duration;
}

const EPSILON = 1e-9;

/**
 * Clamps a move so the clip stays inside its current gap: it can slide until
 * it touches the nearest sibling on either side of its original position,
 * but never passes through one.
 */
export function clampMoveStart(
  siblings: ClipSpan[],
  duration: number,
  desiredStart: number,
  originStart: number,
  projectDuration: number,
): number {
  let minStart = 0;
  let maxStart = Math.max(0, projectDuration - duration);
  const originEnd = originStart + duration;

  for (const sibling of siblings) {
    if (clipEnd(sibling) <= originStart + EPSILON) {
      minStart = Math.max(minStart, clipEnd(sibling));
    } else if (sibling.start >= originEnd - EPSILON) {
      maxStart = Math.min(maxStart, sibling.start - duration);
    }
    // Siblings already overlapping the origin (legacy state) don't bound.
  }

  if (maxStart < minStart) return originStart;
  return Math.min(maxStart, Math.max(minStart, desiredStart));
}

/** Clamps a left-edge resize against the previous sibling and clip end. */
export function clampResizeStart(
  siblings: ClipSpan[],
  originStart: number,
  originDuration: number,
  desiredStart: number,
  minDuration: number,
): { start: number; duration: number } {
  const end = originStart + originDuration;
  let minStart = 0;
  for (const sibling of siblings) {
    if (clipEnd(sibling) <= originStart + EPSILON) {
      minStart = Math.max(minStart, clipEnd(sibling));
    }
  }
  const start = Math.min(end - minDuration, Math.max(minStart, desiredStart));
  return { start, duration: end - start };
}

/** Clamps a right-edge resize against the next sibling and project end. */
export function clampResizeDuration(
  siblings: ClipSpan[],
  originStart: number,
  originDuration: number,
  desiredDuration: number,
  minDuration: number,
  projectDuration: number,
): { start: number; duration: number } {
  const originEnd = originStart + originDuration;
  let maxEnd = projectDuration;
  for (const sibling of siblings) {
    if (sibling.start >= originEnd - EPSILON) {
      maxEnd = Math.min(maxEnd, sibling.start);
    }
  }
  const maxDuration = Math.max(minDuration, maxEnd - originStart);
  return {
    start: originStart,
    duration: Math.min(maxDuration, Math.max(minDuration, desiredDuration)),
  };
}

/**
 * Applies an overwrite edit: the edited clip takes its requested range and
 * overlapped siblings are trimmed, split into left/right remainders, or
 * deleted when fully covered. The right remainder of a split is a new clip
 * segment (new id) that restarts at its own start. Remainders shorter than
 * `minDuration` are dropped.
 */
export function applyOverwriteEdit(
  clips: Clip[],
  editedId: string,
  newStart: number,
  newDuration: number,
  minDuration: number,
): Clip[] {
  const newEnd = newStart + newDuration;
  const result: Clip[] = [];

  for (const clip of clips) {
    if (clip.id === editedId) {
      result.push({ ...clip, start: newStart, duration: newDuration });
      continue;
    }

    const start = clip.start;
    const end = clipEnd(clip);
    const overlaps = newStart < end - EPSILON && newEnd > start + EPSILON;
    if (!overlaps) {
      result.push(clip);
      continue;
    }

    const leftRemainder = newStart - start;
    const rightRemainder = end - newEnd;
    const keepLeft = leftRemainder >= minDuration;
    const keepRight = rightRemainder >= minDuration;

    if (keepLeft) {
      result.push({ ...clip, duration: leftRemainder });
    }
    if (keepRight) {
      // A trim (only the right part survives) keeps the clip's identity;
      // a split's right half is a new segment with a new id.
      result.push({
        ...structuredClone(clip),
        id: keepLeft ? createId() : clip.id,
        start: newEnd,
        duration: rightRemainder,
      });
    }
  }

  return result;
}
