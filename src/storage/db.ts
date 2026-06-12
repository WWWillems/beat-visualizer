import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Project } from "@/model/types";
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from "@/settings/defaults";
import type { AppSettings } from "@/settings/types";

interface BeatVisualizerDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
  assets: {
    key: string;
    value: Blob;
  };
  meta: {
    key: string;
    value: string;
  };
  appSettings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = "beat-visualizer";
const DB_VERSION = 2;
const APP_SETTINGS_KEY = "current";

let dbPromise: Promise<IDBPDatabase<BeatVisualizerDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<BeatVisualizerDB>> {
  dbPromise ??= openDB<BeatVisualizerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects");
      if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets");
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("appSettings")) {
        db.createObjectStore("appSettings");
      }
    },
  });
  return dbPromise;
}

export async function saveProjectDoc(project: Project): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["projects", "meta"], "readwrite");
  await tx.objectStore("projects").put(project, project.id);
  await tx.objectStore("meta").put(project.id, "currentProjectId");
  await tx.done;
}

export async function loadCurrentProjectDoc(): Promise<unknown | null> {
  const db = await getDb();
  const currentId = await db.get("meta", "currentProjectId");
  if (!currentId) return null;
  return (await db.get("projects", currentId)) ?? null;
}

export async function clearStoredProjectsAndAssets(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["projects", "assets", "meta"], "readwrite");
  await tx.objectStore("projects").clear();
  await tx.objectStore("assets").clear();
  await tx.objectStore("meta").delete("currentProjectId");
  await tx.done;
}

export async function saveAssetBlob(assetId: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put("assets", blob, assetId);
}

export async function loadAssetBlob(assetId: string): Promise<Blob | null> {
  const db = await getDb();
  return (await db.get("assets", assetId)) ?? null;
}

export async function loadAppSettings(): Promise<AppSettings> {
  const db = await getDb();
  const stored = await db.get("appSettings", APP_SETTINGS_KEY);
  return stored ? normalizeAppSettings(stored) : DEFAULT_APP_SETTINGS;
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.put("appSettings", normalizeAppSettings(settings), APP_SETTINGS_KEY);
}
