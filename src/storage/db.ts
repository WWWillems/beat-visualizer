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
  appAssets: {
    key: string;
    value: Blob;
  };
  thumbnails: {
    key: string;
    value: Blob;
  };
}

const DB_NAME = "beat-visualizer";
const DB_VERSION = 5;
const APP_SETTINGS_KEY = "current";
const ARTIST_LOGO_KEY = "artistLogo";
const REQUIRED_STORES = [
  "projects",
  "assets",
  "meta",
  "appSettings",
  "appAssets",
  "thumbnails",
] as const;

let dbPromise: Promise<IDBPDatabase<BeatVisualizerDB>> | null = null;

function createMissingStores(db: IDBPDatabase<BeatVisualizerDB>): void {
  if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects");
  if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets");
  if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
  if (!db.objectStoreNames.contains("appSettings")) db.createObjectStore("appSettings");
  if (!db.objectStoreNames.contains("appAssets")) db.createObjectStore("appAssets");
  if (!db.objectStoreNames.contains("thumbnails")) db.createObjectStore("thumbnails");
}

function openBeatVisualizerDb(version: number): Promise<IDBPDatabase<BeatVisualizerDB>> {
  return openDB<BeatVisualizerDB>(DB_NAME, version, {
    upgrade(db) {
      createMissingStores(db);
    },
  });
}

function hasRequiredStores(db: IDBPDatabase<BeatVisualizerDB>): boolean {
  return REQUIRED_STORES.every((store) => db.objectStoreNames.contains(store));
}

export async function getDb(): Promise<IDBPDatabase<BeatVisualizerDB>> {
  dbPromise ??= openBeatVisualizerDb(DB_VERSION);
  const db = await dbPromise;

  // During development/HMR an older open connection can survive after the
  // schema changes. If that happens, repair by reopening with a higher version
  // so IndexedDB gets an upgrade transaction and can create the missing store.
  if (!hasRequiredStores(db)) {
    const repairVersion = db.version + 1;
    db.close();
    dbPromise = openBeatVisualizerDb(repairVersion);
    return dbPromise;
  }

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

export async function loadProjectDoc(projectId: string): Promise<unknown | null> {
  const db = await getDb();
  return (await db.get("projects", projectId)) ?? null;
}

export async function listProjectDocs(): Promise<unknown[]> {
  const db = await getDb();
  return db.getAll("projects");
}

/** Removes a project document, its thumbnail, and the media blobs referenced by the project. */
export async function deleteProjectDoc(projectId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["projects", "thumbnails", "assets"], "readwrite");
  const project = await tx.objectStore("projects").get(projectId);
  await tx.objectStore("projects").delete(projectId);
  await tx.objectStore("thumbnails").delete(projectId);
  for (const asset of project?.assets ?? []) {
    await tx.objectStore("assets").delete(asset.id);
  }
  await tx.done;
}

export async function saveThumbnail(projectId: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put("thumbnails", blob, projectId);
}

export async function loadThumbnail(projectId: string): Promise<Blob | null> {
  const db = await getDb();
  return (await db.get("thumbnails", projectId)) ?? null;
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

export async function loadArtistLogoBlob(): Promise<Blob | null> {
  const db = await getDb();
  return (await db.get("appAssets", ARTIST_LOGO_KEY)) ?? null;
}

export async function saveArtistLogoBlob(blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put("appAssets", blob, ARTIST_LOGO_KEY);
}

export async function deleteArtistLogoBlob(): Promise<void> {
  const db = await getDb();
  await db.delete("appAssets", ARTIST_LOGO_KEY);
}
