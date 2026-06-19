import { describe, expect, it } from "vitest";
import { DEFAULT_APP_SETTINGS } from "@/settings/defaults";
import {
  hasValidationErrors,
  validateAppSettings,
  validateArtistLogoFile,
} from "@/settings/validation";

describe("validateAppSettings", () => {
  it("allows empty optional URLs", () => {
    const errors = validateAppSettings(DEFAULT_APP_SETTINGS);
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it("allows http and https URLs", () => {
    const errors = validateAppSettings({
      ...DEFAULT_APP_SETTINGS,
      website: "https://example.com",
      socials: {
        instagram: "https://instagram.com/example",
        tiktok: "http://tiktok.com/@example",
        snapchat: "",
        x: "https://x.com/example",
      },
    });

    expect(errors).toEqual({});
  });

  it("rejects invalid and non-http URLs", () => {
    const errors = validateAppSettings({
      ...DEFAULT_APP_SETTINGS,
      website: "example.com",
      socials: {
        instagram: "ftp://instagram.com/example",
        tiktok: "not a url",
        snapchat: "",
        x: "",
      },
    });

    expect(errors.website).toBeDefined();
    expect(errors.instagram).toBeDefined();
    expect(errors.tiktok).toBeDefined();
    expect(hasValidationErrors(errors)).toBe(true);
  });
});

describe("validateArtistLogoFile", () => {
  it("allows PNG, JPG, and SVG logo files", () => {
    expect(validateArtistLogoFile(new File(["logo"], "logo.png", { type: "image/png" }))).toBeNull();
    expect(validateArtistLogoFile(new File(["logo"], "logo.jpg", { type: "image/jpeg" }))).toBeNull();
    expect(
      validateArtistLogoFile(new File(["<svg />"], "logo.svg", { type: "image/svg+xml" })),
    ).toBeNull();
  });

  it("rejects unsupported logo files", () => {
    const error = validateArtistLogoFile(new File(["logo"], "logo.gif", { type: "image/gif" }));

    expect(error).toContain("PNG, JPG, or SVG");
  });
});
