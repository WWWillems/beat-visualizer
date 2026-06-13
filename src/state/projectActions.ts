import { transport } from "@/audio/playback";
import { createEmptyProject } from "@/model/defaults";
import { migrateProject } from "@/model/schema";
import { useEditorStore } from "@/state/editorStore";
import { clearMediaCache } from "@/state/mediaCache";
import { useProjectStore } from "@/state/projectStore";
import { loadProjectDoc, saveProjectDoc } from "@/storage/db";
import { restoreProjectMedia } from "@/storage/persistence";

/** Clears playback, media cache, and ephemeral editor state before switching projects. */
function resetEditorRuntime(): void {
  transport.setBuffer(null);
  clearMediaCache();
  useEditorStore.getState().resetForNewProject();
}

/**
 * Starts a fresh project while preserving App settings and all previously
 * stored projects (the app is multi-project; see CONTEXT.md).
 */
export async function startNewProject(): Promise<void> {
  await saveProjectDoc(useProjectStore.getState().project);
  resetEditorRuntime();

  const project = createEmptyProject();
  useProjectStore.getState().loadProject(project);

  await saveProjectDoc(project);
}

/** Opens a stored project from the project browser and makes it current. */
export async function openProject(projectId: string): Promise<void> {
  await saveProjectDoc(useProjectStore.getState().project);

  const raw = await loadProjectDoc(projectId);
  if (!raw) return;
  const project = migrateProject(raw);

  resetEditorRuntime();
  useProjectStore.getState().loadProject(project);

  // Mark it current for the next app start, then bring its media back.
  await saveProjectDoc(project);
  await restoreProjectMedia(project);
}
