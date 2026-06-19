import type { AppSettings } from "@/settings/types";

export type AppSettingsValidationErrors = Partial<
  Record<"website" | "instagram" | "tiktok" | "snapchat" | "x" | "artistLogo", string>
>;

export const MAX_ARTIST_LOGO_FILE_BYTES = 25 * 1024 * 1024;

function isHttpUrl(value: string): boolean {
  if (value.trim() === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateAppSettings(settings: AppSettings): AppSettingsValidationErrors {
  const errors: AppSettingsValidationErrors = {};

  if (!isHttpUrl(settings.website)) {
    errors.website = "Use a valid http:// or https:// URL.";
  }
  if (!isHttpUrl(settings.socials.instagram)) {
    errors.instagram = "Use a valid http:// or https:// URL.";
  }
  if (!isHttpUrl(settings.socials.tiktok)) {
    errors.tiktok = "Use a valid http:// or https:// URL.";
  }
  if (!isHttpUrl(settings.socials.snapchat)) {
    errors.snapchat = "Use a valid http:// or https:// URL.";
  }
  if (!isHttpUrl(settings.socials.x)) {
    errors.x = "Use a valid http:// or https:// URL.";
  }

  return errors;
}

export function isSupportedArtistLogoFile(file: File): boolean {
  return (
    /^image\/(png|jpeg|svg\+xml)$/.test(file.type) ||
    /\.(png|jpe?g|svg)$/i.test(file.name)
  );
}

export function validateArtistLogoFile(file: File): string | null {
  if (!isSupportedArtistLogoFile(file)) {
    return "Use a PNG, JPG, or SVG logo.";
  }
  if (file.size > MAX_ARTIST_LOGO_FILE_BYTES) {
    return `Logo is ${(file.size / 1024 / 1024).toFixed(0)} MB; the limit is ${MAX_ARTIST_LOGO_FILE_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

export function hasValidationErrors(errors: AppSettingsValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
