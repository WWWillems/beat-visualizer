import type { AppSettings } from "@/settings/types";

export type AppSettingsValidationErrors = Partial<
  Record<"website" | "instagram" | "tiktok" | "snapchat" | "x", string>
>;

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

export function hasValidationErrors(errors: AppSettingsValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
