import { transport } from "@/audio/playback";
import { createEmptyProject } from "@/model/defaults";
import { useEditorStore } from "@/state/editorStore";
import { clearMediaCache } from "@/state/mediaCache";
import { useProjectStore } from "@/state/projectStore";
import { clearStoredProjectsAndAssets, saveProjectDoc } from "@/storage/db";

/**
 * Starts a fresh project while preserving App settings. Current project media,
 * analysis, playback, selection, persisted project docs/assets, and undo
 * history are cleared.
 */
export async function startNewProject(): Promise<void> {
  transport.setBuffer(null);
  clearMediaCache();
  useEditorStore.getState().resetForNewProject();

  const project = createEmptyProject();
  useProjectStore.getState().loadProject(project);

  await clearStoredProjectsAndAssets();
  await saveProjectDoc(project);
}
