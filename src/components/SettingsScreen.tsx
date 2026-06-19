import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { AppSettings } from "@/settings/types";
import {
  hasValidationErrors,
  type AppSettingsValidationErrors,
  validateAppSettings,
} from "@/settings/validation";
import { useProjectStore } from "@/state/projectStore";
import { useSettingsStore } from "@/state/settingsStore";

interface SettingsScreenProps {
  onDone: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[10px] text-muted-foreground">{message}</p>;
}

function updateSocial(
  settings: AppSettings,
  key: keyof AppSettings["socials"],
  value: string,
): AppSettings {
  return {
    ...settings,
    socials: {
      ...settings.socials,
      [key]: value,
    },
  };
}

export function SettingsScreen({ onDone }: SettingsScreenProps) {
  const storedAppSettings = useSettingsStore((s) => s.appSettings);
  const saveAppSettings = useSettingsStore((s) => s.save);
  const projectName = useProjectStore((s) => s.project.name);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const projectSongName = useProjectStore((s) => s.project.songName);
  const setSongName = useProjectStore((s) => s.setSongName);

  const [appDraft, setAppDraft] = useState<AppSettings>(() => storedAppSettings);
  const [projectNameDraft, setProjectNameDraft] = useState(projectName);
  const [songNameDraft, setSongNameDraft] = useState(projectSongName);
  const [errors, setErrors] = useState<AppSettingsValidationErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(
    () =>
      JSON.stringify(appDraft) !== JSON.stringify(storedAppSettings) ||
      projectNameDraft !== projectName ||
      songNameDraft !== projectSongName,
    [appDraft, storedAppSettings, projectNameDraft, projectName, songNameDraft, projectSongName],
  );

  const save = async () => {
    const nextErrors = validateAppSettings(appDraft);
    setErrors(nextErrors);
    setSaveError(null);
    if (hasValidationErrors(nextErrors)) return;

    setSaving(true);
    try {
      await saveAppSettings(appDraft);
      setProjectName(projectNameDraft.trim() || "Untitled");
      setSongName(songNameDraft);
      onDone();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-widest">Settings</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              App settings persist across projects. Project settings only affect the current project.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onDone} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving || !dirty}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {saveError && <p className="rounded-sm border p-3 text-xs">{saveError}</p>}

        <section className="space-y-4 rounded-sm border bg-card p-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest">App Settings</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Identity and social defaults reused across projects.
            </p>
          </div>
          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="artist-name">Artist name</Label>
              <Input
                id="artist-name"
                value={appDraft.artistName}
                onChange={(event) => setAppDraft({ ...appDraft, artistName: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://example.com"
                value={appDraft.website}
                onChange={(event) => setAppDraft({ ...appDraft, website: event.target.value })}
              />
              <FieldError message={errors.website} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                placeholder="https://instagram.com/..."
                value={appDraft.socials.instagram}
                onChange={(event) =>
                  setAppDraft(updateSocial(appDraft, "instagram", event.target.value))
                }
              />
              <FieldError message={errors.instagram} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input
                id="tiktok"
                placeholder="https://tiktok.com/@..."
                value={appDraft.socials.tiktok}
                onChange={(event) => setAppDraft(updateSocial(appDraft, "tiktok", event.target.value))}
              />
              <FieldError message={errors.tiktok} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="snapchat">Snapchat</Label>
              <Input
                id="snapchat"
                placeholder="https://snapchat.com/add/..."
                value={appDraft.socials.snapchat}
                onChange={(event) =>
                  setAppDraft(updateSocial(appDraft, "snapchat", event.target.value))
                }
              />
              <FieldError message={errors.snapchat} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="x-profile">X</Label>
              <Input
                id="x-profile"
                placeholder="https://x.com/..."
                value={appDraft.socials.x}
                onChange={(event) => setAppDraft(updateSocial(appDraft, "x", event.target.value))}
              />
              <FieldError message={errors.x} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-message">Custom message</Label>
            <textarea
              id="custom-message"
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              value={appDraft.customMessage}
              onChange={(event) =>
                setAppDraft({ ...appDraft, customMessage: event.target.value })
              }
            />
          </div>
        </section>

        <section className="space-y-4 rounded-sm border bg-card p-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest">Current Project Settings</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Project labeling and song metadata for this project.
            </p>
          </div>
          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={projectNameDraft}
                onChange={(event) => setProjectNameDraft(event.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Used in the header, project browser, and export filenames.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="song-name">Song name</Label>
              <Input
                id="song-name"
                value={songNameDraft}
                onChange={(event) => setSongNameDraft(event.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Song metadata reserved for future render branding.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
