import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { normalizeAppSettings } from "@/settings/defaults";
import type { AppSettings, ArtistLogo } from "@/settings/types";
import {
  hasValidationErrors,
  type AppSettingsValidationErrors,
  validateArtistLogoFile,
  validateAppSettings,
} from "@/settings/validation";
import { useProjectStore } from "@/state/projectStore";
import { useSettingsStore } from "@/state/settingsStore";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[10px] text-muted-foreground">{message}</p>;
}

function logoMetadataFromFile(file: File): ArtistLogo {
  return {
    name: file.name,
    mimeType: file.type || (file.name.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "image/png"),
    size: file.size,
    updatedAt: Date.now(),
  };
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
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

interface SettingsScreenProps {
  onBackToEditor: () => void;
}

export function SettingsScreen({ onBackToEditor }: SettingsScreenProps) {
  const storedAppSettings = useSettingsStore((s) => s.appSettings);
  const storedArtistLogoBlob = useSettingsStore((s) => s.artistLogoBlob);
  const saveAppSettings = useSettingsStore((s) => s.save);
  const projectName = useProjectStore((s) => s.project.name);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const projectSongName = useProjectStore((s) => s.project.songName);
  const setSongName = useProjectStore((s) => s.setSongName);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [appDraft, setAppDraft] = useState<AppSettings>(() => storedAppSettings);
  const [artistLogoBlobDraft, setArtistLogoBlobDraft] = useState<Blob | null | undefined>(
    undefined,
  );
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [projectNameDraft, setProjectNameDraft] = useState(projectName);
  const [songNameDraft, setSongNameDraft] = useState(projectSongName);
  const [errors, setErrors] = useState<AppSettingsValidationErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currentLogoBlob =
    artistLogoBlobDraft === undefined ? storedArtistLogoBlob : artistLogoBlobDraft;

  useEffect(() => {
    if (!currentLogoBlob) {
      setLogoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(currentLogoBlob);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [currentLogoBlob]);

  const dirty = useMemo(
    () =>
      JSON.stringify(appDraft) !== JSON.stringify(storedAppSettings) ||
      artistLogoBlobDraft !== undefined ||
      projectNameDraft !== projectName ||
      songNameDraft !== projectSongName,
    [
      appDraft,
      storedAppSettings,
      artistLogoBlobDraft,
      projectNameDraft,
      projectName,
      songNameDraft,
      projectSongName,
    ],
  );

  const setArtistLogoError = (message?: string) => {
    setErrors((current) => {
      const next = { ...current };
      if (message) next.artistLogo = message;
      else delete next.artistLogo;
      return next;
    });
  };

  const selectArtistLogo = (file: File) => {
    const error = validateArtistLogoFile(file);
    if (error) {
      setArtistLogoError(error);
      return;
    }
    setAppDraft({ ...appDraft, artistLogo: logoMetadataFromFile(file) });
    setArtistLogoBlobDraft(file);
    setArtistLogoError();
  };

  const removeArtistLogo = () => {
    setAppDraft({ ...appDraft, artistLogo: null });
    setArtistLogoBlobDraft(null);
    setArtistLogoError();
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const cancel = () => {
    setAppDraft(storedAppSettings);
    setArtistLogoBlobDraft(undefined);
    setProjectNameDraft(projectName);
    setSongNameDraft(projectSongName);
    setErrors({});
    setSaveError(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const save = async () => {
    const nextErrors = validateAppSettings(appDraft);
    setErrors(nextErrors);
    setSaveError(null);
    if (hasValidationErrors(nextErrors)) return;

    setSaving(true);
    try {
      const normalizedAppDraft = normalizeAppSettings(appDraft);
      const nextProjectName = projectNameDraft.trim() || "Untitled";
      await saveAppSettings(normalizedAppDraft, artistLogoBlobDraft);
      setAppDraft(normalizedAppDraft);
      setArtistLogoBlobDraft(undefined);
      setProjectName(nextProjectName);
      setProjectNameDraft(nextProjectName);
      setSongName(songNameDraft);
      toast.success("Settings saved");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
        <div>
          <Button variant="outline" size="sm" onClick={onBackToEditor}>
            <ArrowLeft /> Back to editor
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-widest">Settings</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              App settings persist across projects. Project settings only affect the current project.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancel} disabled={saving || !dirty}>
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
            <h3 className="text-sm font-bold uppercase tracking-widest">Artist Brand Settings</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Artist identity and social defaults reused across projects.
            </p>
          </div>
          <Separator />

          <div className="grid gap-4 rounded-sm border p-3 md:grid-cols-[160px_1fr]">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-sm border bg-background">
              {logoPreviewUrl && appDraft.artistLogo ? (
                <img
                  src={logoPreviewUrl}
                  alt={`${appDraft.artistLogo.name} preview`}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="px-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                  No logo
                </span>
              )}
            </div>
            <div className="flex flex-col justify-between gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="artist-logo">Artist logo</Label>
                <p className="text-xs text-muted-foreground">
                  Brand logo reused across projects. It will not appear in renders until a project
                  places it as an image layer.
                </p>
                {appDraft.artistLogo ? (
                  <p className="text-[10px] text-muted-foreground">
                    {appDraft.artistLogo.name} - {formatFileSize(appDraft.artistLogo.size)} -{" "}
                    {appDraft.artistLogo.mimeType}
                  </p>
                ) : null}
                <FieldError message={errors.artistLogo} />
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={logoInputRef}
                  id="artist-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) selectArtistLogo(file);
                    event.currentTarget.value = "";
                  }}
                />
                <Button variant="outline" onClick={() => logoInputRef.current?.click()}>
                  {appDraft.artistLogo ? "Replace logo" : "Upload logo"}
                </Button>
                <Button
                  variant="outline"
                  onClick={removeArtistLogo}
                  disabled={!appDraft.artistLogo}
                >
                  Remove logo
                </Button>
              </div>
            </div>
          </div>

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
