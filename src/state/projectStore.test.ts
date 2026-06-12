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
