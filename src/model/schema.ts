import { SCHEMA_VERSION, type Project } from "@/model/types";

/**
 * Versioned project migrations. Each entry upgrades a project document from
 * version N to N+1. Persisted projects run through every migration between
 * their stored version and SCHEMA_VERSION before being loaded.
 */
const migrations: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {
  1: (doc) => ({
    ...doc,
    songName: typeof doc.songName === "string" ? doc.songName : "",
    schemaVersion: 2,
  }),
};

export class UnsupportedSchemaError extends Error {
  constructor(version: number) {
    super(
      `Project schema version ${version} is newer than the supported version ${SCHEMA_VERSION}.`,
    );
    this.name = "UnsupportedSchemaError";
  }
}

export function migrateProject(raw: unknown): Project {
  let doc = raw as Record<string, unknown>;
  let version = typeof doc.schemaVersion === "number" ? doc.schemaVersion : 1;

  if (version > SCHEMA_VERSION) {
    throw new UnsupportedSchemaError(version);
  }

  while (version < SCHEMA_VERSION) {
    const migrate = migrations[version];
    if (!migrate) {
      throw new Error(`Missing migration from project schema version ${version}.`);
    }
    doc = migrate(doc);
    version = doc.schemaVersion as number;
  }

  return doc as unknown as Project;
}
