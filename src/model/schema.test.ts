import { describe, expect, it } from "vitest";
import { createEmptyProject } from "@/model/defaults";
import { migrateProject, UnsupportedSchemaError } from "@/model/schema";
import { SCHEMA_VERSION } from "@/model/types";

describe("migrateProject", () => {
  it("passes a current-version project through unchanged", () => {
    const project = createEmptyProject("Test");
    const migrated = migrateProject(JSON.parse(JSON.stringify(project)));
    expect(migrated).toEqual(project);
  });

  it("rejects documents from a newer schema version", () => {
    const doc = { ...createEmptyProject(), schemaVersion: SCHEMA_VERSION + 1 };
    expect(() => migrateProject(doc)).toThrow(UnsupportedSchemaError);
  });

  it("survives a JSON serialization round trip", () => {
    const project = createEmptyProject("Round Trip");
    const roundTripped = migrateProject(JSON.parse(JSON.stringify(project)));
    expect(roundTripped.id).toBe(project.id);
    expect(roundTripped.tracks).toHaveLength(3);
  });

  it("migrates version 1 projects by adding songName", () => {
    const legacy = createEmptyProject("Legacy") as unknown as Record<string, unknown>;
    delete legacy.songName;
    legacy.schemaVersion = 1;

    const migrated = migrateProject(legacy);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.songName).toBe("");
  });
});
