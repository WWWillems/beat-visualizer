import { describe, expect, it } from "vitest";
import { normalizeAppSettings } from "@/settings/defaults";

describe("normalizeAppSettings", () => {
  it("fills missing Artist logo metadata for old settings", () => {
    const settings = normalizeAppSettings({
      artistName: "Artist",
      website: "",
      socials: {
        instagram: "",
        tiktok: "",
        snapchat: "",
        x: "",
      },
      customMessage: "",
    });

    expect(settings.artistLogo).toBeNull();
  });

  it("keeps Artist logo metadata when present", () => {
    const settings = normalizeAppSettings({
      artistLogo: {
        name: "logo.svg",
        mimeType: "image/svg+xml",
        size: 1234,
        updatedAt: 10,
      },
    });

    expect(settings.artistLogo).toEqual({
      name: "logo.svg",
      mimeType: "image/svg+xml",
      size: 1234,
      updatedAt: 10,
    });
  });
});
