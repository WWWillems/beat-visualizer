import { current } from "immer";
import { temporal } from "zundo";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createEmptyProject } from "@/model/defaults";
import type {
  AspectRatioId,
  BeatGrid,
  Clip,
  MediaAssetRef,
  Project,
  Track,
} from "@/model/types";
import { applyOverwriteEdit } from "@/timeline/clips";

interface ProjectState {
  project: Project;
  /** Replaces the whole project (load, import). Clears undo history. */
  loadProject: (project: Project) => void;
  /** Applies an immer recipe to the project and bumps modifiedAt. */
  updateProject: (recipe: (project: Project) => void) => void;
  setProjectName: (name: string) => void;
  setAspectRatio: (ratio: AspectRatioId) => void;
  setDuration: (seconds: number) => void;
  setSongName: (songName: string) => void;
  setBeatGrid: (grid: BeatGrid | null) => void;
  addAsset: (asset: MediaAssetRef) => void;
  addClip: (trackId: string, clip: Clip) => void;
  moveClip: (trackId: string, clipId: string, start: number) => void;
  setClipTiming: (trackId: string, clipId: string, start: number, duration: number) => void;
  /**
   * Commits a drag/resize. With `overwrite` on a visual/image track, the
   * edited clip keeps its range and overlapped siblings are trimmed, split,
   * or deleted (see "Overwrite editing" in CONTEXT.md).
   */
  commitClipEdit: (
    trackId: string,
    clipId: string,
    start: number,
    duration: number,
    overwrite: boolean,
  ) => void;
  deleteClip: (trackId: string, clipId: string) => void;
}

function findTrack(project: Project, trackId: string): Track | undefined {
  return project.tracks.find((t) => t.id === trackId);
}

export const useProjectStore = create<ProjectState>()(
  temporal(
    immer((set) => ({
      project: createEmptyProject(),

      loadProject: (project) => {
        set((state) => {
          state.project = project;
        });
        useProjectStore.temporal.getState().clear();
      },

      updateProject: (recipe) =>
        set((state) => {
          recipe(state.project as Project);
          state.project.modifiedAt = Date.now();
        }),

      setProjectName: (name) =>
        set((state) => {
          state.project.name = name;
          state.project.modifiedAt = Date.now();
        }),

      setAspectRatio: (ratio) =>
        set((state) => {
          state.project.aspectRatio = ratio;
          state.project.modifiedAt = Date.now();
        }),

      setDuration: (seconds) =>
        set((state) => {
          state.project.duration = Math.max(1, seconds);
          state.project.modifiedAt = Date.now();
        }),

      setSongName: (songName) =>
        set((state) => {
          state.project.songName = songName;
          state.project.modifiedAt = Date.now();
        }),

      setBeatGrid: (grid) =>
        set((state) => {
          state.project.beatGrid = grid;
          state.project.modifiedAt = Date.now();
        }),

      addAsset: (asset) =>
        set((state) => {
          state.project.assets.push(asset);
          state.project.modifiedAt = Date.now();
        }),

      addClip: (trackId, clip) =>
        set((state) => {
          const track = findTrack(state.project as Project, trackId);
          if (!track) return;
          if (track.type !== clip.type) return;
          // Track/clip types are matched above; immer's draft typing can't
          // narrow the union, so push through a widened reference.
          (track.clips as Clip[]).push(clip);
          state.project.modifiedAt = Date.now();
        }),

      moveClip: (trackId, clipId, start) =>
        set((state) => {
          const track = findTrack(state.project as Project, trackId);
          const clip = track?.clips.find((c: Clip) => c.id === clipId);
          if (!clip) return;
          const maxStart = Math.max(0, state.project.duration - clip.duration);
          clip.start = Math.min(maxStart, Math.max(0, start));
          state.project.modifiedAt = Date.now();
        }),

      setClipTiming: (trackId, clipId, start, duration) =>
        set((state) => {
          const track = findTrack(state.project as Project, trackId);
          const clip = track?.clips.find((c: Clip) => c.id === clipId);
          if (!clip) return;
          clip.start = Math.max(0, start);
          clip.duration = Math.max(1 / state.project.fps, duration);
          state.project.modifiedAt = Date.now();
        }),

      commitClipEdit: (trackId, clipId, start, duration, overwrite) =>
        set((state) => {
          const track = findTrack(state.project as Project, trackId);
          const clip = track?.clips.find((c: Clip) => c.id === clipId);
          if (!track || !clip) return;
          const minDuration = 1 / state.project.fps;
          const clampedStart = Math.max(0, start);
          const clampedDuration = Math.max(minDuration, duration);

          if (overwrite && (track.type === "visual" || track.type === "image")) {
            // Unwrap drafts so overwrite slicing works on plain clip data.
            const clips = current(track).clips as Clip[];
            (track.clips as Clip[]) = applyOverwriteEdit(
              clips,
              clipId,
              clampedStart,
              clampedDuration,
              minDuration,
            );
          } else {
            clip.start = clampedStart;
            clip.duration = clampedDuration;
          }
          state.project.modifiedAt = Date.now();
        }),

      deleteClip: (trackId, clipId) =>
        set((state) => {
          const track = findTrack(state.project as Project, trackId);
          if (!track) return;
          (track.clips as Clip[]) = track.clips.filter((c: Clip) => c.id !== clipId);
          state.project.modifiedAt = Date.now();
        }),
    })),
    {
      partialize: (state) => ({ project: state.project }),
      limit: 200,
    },
  ),
);

export function undo() {
  useProjectStore.temporal.getState().undo();
}

export function redo() {
  useProjectStore.temporal.getState().redo();
}
