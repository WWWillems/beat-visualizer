import { create } from "zustand";
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from "@/settings/defaults";
import type { AppSettings } from "@/settings/types";
import { loadAppSettings, saveAppSettings } from "@/storage/db";

interface SettingsState {
  appSettings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  save: (settings: AppSettings) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  appSettings: DEFAULT_APP_SETTINGS,
  loaded: false,

  load: async () => {
    const appSettings = await loadAppSettings();
    set({ appSettings, loaded: true });
  },

  save: async (settings) => {
    const normalized = normalizeAppSettings(settings);
    await saveAppSettings(normalized);
    set({ appSettings: normalized, loaded: true });
  },
}));
