import { beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject, createVisualClip } from "@/model/defaults";
import { redo, undo, useProjectStore } from "@/state/projectStore";

function visualTrackId(): string {
  const track = useProjectStore.getState().project.tracks.find((t) => t.type === "visual");
  if (!track) throw new Error("No visual track");
  return track.id;
}

describe("projectStore", () => {
  beforeEach(() => {
    useProjectStore.getState().loadProject(createEmptyProject("Store Test"));
  });

  it("adds, moves, and deletes clips", () => {
    const trackId = visualTrackId();
    const clip = createVisualClip(0, 5, {});
    const store = useProjectStore.getState();

    store.addClip(trackId, clip);
    let track = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(track?.clips).toHaveLength(1);

    store.moveClip(trackId, clip.id, 7.5);
    track = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(track?.clips[0].start).toBe(7.5);

    store.deleteClip(trackId, clip.id);
    track = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(track?.clips).toHaveLength(0);
  });

  it("rejects clips whose type does not match the track", () => {
    const trackId = visualTrackId();
    const store = useProjectStore.getState();
    store.addClip(trackId, {
      id: "bad",
      type: "audio",
      assetId: "a",
      start: 0,
      duration: 1,
      sourceOffset: 0,
      gain: 1,
    });
    const track = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(track?.clips).toHaveLength(0);
  });

  it("supports undo and redo of clip edits", () => {
    const trackId = visualTrackId();
    const clip = createVisualClip(0, 5, {});
    useProjectStore.getState().addClip(trackId, clip);
    useProjectStore.getState().moveClip(trackId, clip.id, 10);

    undo();
    let track = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(track?.clips[0].start).toBe(0);

    redo();
    track = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(track?.clips[0].start).toBe(10);

    undo();
    undo();
    track = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(track?.clips).toHaveLength(0);
  });

  it("updates clip timing with a minimum duration", () => {
    const trackId = visualTrackId();
    const clip = createVisualClip(0, 5, {});

    useProjectStore.getState().addClip(trackId, clip);
    useProjectStore.getState().setClipTiming(trackId, clip.id, 2, 4);

    let track = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(track?.clips[0].start).toBe(2);
    expect(track?.clips[0].duration).toBe(4);

    useProjectStore.getState().setClipTiming(trackId, clip.id, 1, 0);
    track = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(track?.clips[0].start).toBe(1);
    expect(track?.clips[0].duration).toBeCloseTo(1 / 30);
  });

  it("commits an overwrite edit that slices same-track siblings", () => {
    const trackId = visualTrackId();
    const store = useProjectStore.getState();
    const long = createVisualClip(0, 12, {});
    const moved = createVisualClip(20, 4, {});
    store.addClip(trackId, long);
    store.addClip(trackId, moved);

    store.commitClipEdit(trackId, moved.id, 4, 4, true);

    const track = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(track?.clips).toHaveLength(3);
    expect(track?.clips.find((c) => c.id === long.id)?.duration).toBe(4);
    expect(track?.clips.find((c) => c.id === moved.id)?.start).toBe(4);
    const remainder = track?.clips.find((c) => c.id !== long.id && c.id !== moved.id);
    expect(remainder?.start).toBe(8);
    expect(remainder?.duration).toBe(4);

    // The whole overwrite is one undo step.
    undo();
    const reverted = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(reverted?.clips).toHaveLength(2);
    expect(reverted?.clips.find((c) => c.id === long.id)?.duration).toBe(12);
  });

  it("commits a plain edit without slicing when overwrite is off", () => {
    const trackId = visualTrackId();
    const store = useProjectStore.getState();
    const a = createVisualClip(0, 6, {});
    const b = createVisualClip(8, 4, {});
    store.addClip(trackId, a);
    store.addClip(trackId, b);

    store.commitClipEdit(trackId, b.id, 5, 4, false);

    const track = useProjectStore.getState().project.tracks.find((t) => t.id === trackId);
    expect(track?.clips).toHaveLength(2);
    expect(track?.clips.find((c) => c.id === a.id)?.duration).toBe(6);
    expect(track?.clips.find((c) => c.id === b.id)?.start).toBe(5);
  });

  it("clears undo history when loading a project", () => {
    const trackId = visualTrackId();
    useProjectStore.getState().addClip(trackId, createVisualClip(0, 5, {}));
    useProjectStore.getState().loadProject(createEmptyProject("Fresh"));
    undo();
    expect(useProjectStore.getState().project.name).toBe("Fresh");
  });

  it("sets the song name as an undoable project edit", () => {
    useProjectStore.getState().setSongName("Night Drive");
    expect(useProjectStore.getState().project.songName).toBe("Night Drive");

    undo();
    expect(useProjectStore.getState().project.songName).toBe("");

    redo();
    expect(useProjectStore.getState().project.songName).toBe("Night Drive");
  });
});
