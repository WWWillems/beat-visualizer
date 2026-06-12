import { describe, expect, it } from "vitest";
import { createEmptyProject } from "@/model/defaults";
import { exportFileBaseName } from "@/export/exporter";

describe("exportFileBaseName", () => {
  it("prefers songName over project name", () => {
    const project = createEmptyProject("Project File");
    project.songName = "Night Drive";

    expect(exportFileBaseName(project)).toBe("night_drive");
  });

  it("falls back to project name when songName is blank", () => {
    const project = createEmptyProject("Project File");

    expect(exportFileBaseName(project)).toBe("project_file");
  });

  it("falls back to a generic name if everything sanitizes away", () => {
    const project = createEmptyProject("!!!");

    expect(exportFileBaseName(project)).toBe("beat_visualizer");
  });
});
