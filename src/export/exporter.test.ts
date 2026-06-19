import { describe, expect, it } from "vitest";
import { createEmptyProject } from "@/model/defaults";
import { exportFileBaseName } from "@/export/exporter";

describe("exportFileBaseName", () => {
  it("uses project name even when songName is set", () => {
    const project = createEmptyProject("Project File");
    project.songName = "Night Drive";

    expect(exportFileBaseName(project)).toBe("project_file");
  });

  it("uses project name when songName is blank", () => {
    const project = createEmptyProject("Project File");

    expect(exportFileBaseName(project)).toBe("project_file");
  });

  it("falls back to a generic name if everything sanitizes away", () => {
    const project = createEmptyProject("!!!");

    expect(exportFileBaseName(project)).toBe("beat_visualizer");
  });
});
