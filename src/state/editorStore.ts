import { create } from "zustand";
import type { AudioAnalysis } from "@/audio/analysisTypes";

/**
 * Ephemeral editor state. Deliberately separate from the project document:
 * nothing in here is undoable or persisted, and the playhead updates at
 * render rate without polluting undo history.
 */
interface EditorState {
  /** Playhead position in seconds. */
  playhead: number;
  isPlaying: boolean;
  /** Decoded primary audio, kept in memory for playback and export. */
  audioBuffer: AudioBuffer | null;
  analysis: AudioAnalysis | null;
  analysisPending: boolean;
  selectedClipId: string | null;
  selectedTrackId: string | null;
  /** Last import error, shown in the header until dismissed or replaced. */
  importError: string | null;

  setPlayhead: (seconds: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setAudio: (buffer: AudioBuffer | null) => void;
  setAnalysis: (analysis: AudioAnalysis | null) => void;
  setAnalysisPending: (pending: boolean) => void;
  selectClip: (trackId: string | null, clipId: string | null) => void;
  setImportError: (message: string | null) => void;
  resetForNewProject: () => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  playhead: 0,
  isPlaying: false,
  audioBuffer: null,
  analysis: null,
  analysisPending: false,
  selectedClipId: null,
  selectedTrackId: null,
  importError: null,

  setPlayhead: (seconds) => set({ playhead: Math.max(0, seconds) }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setAudio: (buffer) => set({ audioBuffer: buffer }),
  setAnalysis: (analysis) => set({ analysis }),
  setAnalysisPending: (pending) => set({ analysisPending: pending }),
  selectClip: (trackId, clipId) => set({ selectedTrackId: trackId, selectedClipId: clipId }),
  setImportError: (message) => set({ importError: message }),
  resetForNewProject: () =>
    set({
      playhead: 0,
      isPlaying: false,
      audioBuffer: null,
      analysis: null,
      analysisPending: false,
      selectedClipId: null,
      selectedTrackId: null,
      importError: null,
    }),
}));
