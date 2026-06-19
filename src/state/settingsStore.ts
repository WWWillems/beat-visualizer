import { create } from "zustand";
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from "@/settings/defaults";
import type { AppSettings } from "@/settings/types";
import {
  deleteArtistLogoBlob,
  loadAppSettings,
  loadArtistLogoBlob,
  saveAppSettings,
  saveArtistLogoBlob,
} from "@/storage/db";

interface SettingsState {
  appSettings: AppSettings;
  artistLogoBlob: Blob | null;
  loaded: boolean;
  load: () => Promise<void>;
  save: (settings: AppSettings, artistLogoBlob?: Blob | null) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  appSettings: DEFAULT_APP_SETTINGS,
  artistLogoBlob: null,
  loaded: false,

  load: async () => {
    const appSettings = await loadAppSettings();
    const artistLogoBlob = appSettings.artistLogo ? await loadArtistLogoBlob() : null;
    set({ appSettings, artistLogoBlob, loaded: true });
  },

  save: async (settings, artistLogoBlob) => {
    const normalized = normalizeAppSettings(settings);
    if (artistLogoBlob instanceof Blob) {
      await saveArtistLogoBlob(artistLogoBlob);
    } else if (artistLogoBlob === null) {
      await deleteArtistLogoBlob();
    }
    await saveAppSettings(normalized);
    set((state) => ({
      appSettings: normalized,
      artistLogoBlob: artistLogoBlob === undefined ? state.artistLogoBlob : artistLogoBlob,
      loaded: true,
    }));
  },
}));
