import type { AppSettings } from "@/settings/types";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  artistName: "",
  website: "",
  socials: {
    instagram: "",
    tiktok: "",
    snapchat: "",
    x: "",
  },
  customMessage: "",
};

export function normalizeAppSettings(settings: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    artistName: settings?.artistName ?? "",
    website: settings?.website ?? "",
    socials: {
      instagram: settings?.socials?.instagram ?? "",
      tiktok: settings?.socials?.tiktok ?? "",
      snapchat: settings?.socials?.snapchat ?? "",
      x: settings?.socials?.x ?? "",
    },
    customMessage: settings?.customMessage ?? "",
  };
}
