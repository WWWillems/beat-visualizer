import { analyzeInWorker } from "@/audio/importAudio";
import { transport } from "@/audio/playback";
import { migrateProject } from "@/model/schema";
import type { Project } from "@/model/types";
import { generateAndStoreThumbnail } from "@/renderer/thumbnail";
import { useEditorStore } from "@/state/editorStore";
import { putBlob, putImageBitmap } from "@/state/mediaCache";
import { useProjectStore } from "@/state/projectStore";
import { useSettingsStore } from "@/state/settingsStore";
import { loadAssetBlob, loadCurrentProjectDoc, saveAssetBlob, saveProjectDoc } from "@/storage/db";

const SAVE_DEBOUNCE_MS = 800;
const THUMBNAIL_DEBOUNCE_MS = 2500;

/**
 * Restores the last open project from IndexedDB, then keeps saving project
 * changes (debounced). Media blobs are saved at import time; on load they are
 * restored into the runtime cache, audio is re-decoded, and analysis is
 * recomputed from the decoded samples (analysis is derived data and cheaper
 * to recompute than to version).
 */
export async function initPersistence(): Promise<void> {
  await restoreAppSettings();
  await restoreLastProject();

  let timer: ReturnType<typeof setTimeout> | null = null;
  let thumbnailTimer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let lastSaved: Project | null = useProjectStore.getState().project;

  const flush = () => {
    if (!dirty) return;
    dirty = false;
    if (timer) clearTimeout(timer);
    void saveProjectDoc(useProjectStore.getState().project);
  };

  useProjectStore.subscribe((state) => {
    if (state.project === lastSaved) return;
    lastSaved = state.project;
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DEBOUNCE_MS);

    // Regenerate the project thumbnail after edits settle.
    if (thumbnailTimer) clearTimeout(thumbnailTimer);
    thumbnailTimer = setTimeout(() => {
      void generateAndStoreThumbnail(
        useProjectStore.getState().project,
        useEditorStore.getState().analysis,
      );
    }, THUMBNAIL_DEBOUNCE_MS);
  });

  // Flush pending saves when the tab is hidden or closing so a quick reload
  // does not lose the latest edits.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("beforeunload", flush);
}

async function restoreAppSettings(): Promise<void> {
  try {
    await useSettingsStore.getState().load();
  } catch {
    // Storage can be blocked in private contexts; keep defaults in memory.
  }
}

/**
 * Loads a project's media from IndexedDB into the runtime cache, re-decodes
 * the primary audio, and recomputes analysis. Shared by startup restore and
 * opening a project from the browser.
 */
export async function restoreProjectMedia(project: Project): Promise<void> {
  for (const asset of project.assets) {
    const blob = await loadAssetBlob(asset.id);
    if (!blob) continue;
    putBlob(asset.id, blob);

    if (asset.kind === "image") {
      const bitmap = await createImageBitmap(blob);
      putImageBitmap(asset.id, bitmap);
    } else if (asset.kind === "audio" && asset.id === project.primaryAudioAssetId) {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const context = new AudioContext();
        const buffer = await context.decodeAudioData(arrayBuffer);
        void context.close();
        transport.setBuffer(buffer);
        useEditorStore.getState().setAudio(buffer);
        useEditorStore.getState().setAnalysisPending(true);
        const analysis = await analyzeInWorker(buffer);
        useEditorStore.getState().setAnalysis(analysis);
      } finally {
        useEditorStore.getState().setAnalysisPending(false);
      }
    }
  }
}

async function restoreLastProject(): Promise<void> {
  let raw: unknown | null = null;
  try {
    raw = await loadCurrentProjectDoc();
  } catch {
    return; // No storage available (e.g. blocked); run in-memory only.
  }
  if (!raw) return;

  let project: Project;
  try {
    project = migrateProject(raw);
  } catch {
    return; // Unreadable/newer project; start fresh rather than corrupting it.
  }

  useProjectStore.getState().loadProject(project);
  await restoreProjectMedia(project);
}

export { saveAssetBlob };
