import { FilePlus2, FolderOpen, ImagePlus, Music, Settings, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorStore } from "@/state/editorStore";
import { importMediaFile } from "@/state/importActions";
import { startNewProject } from "@/state/projectActions";

interface ProjectMenuProps {
  onNewProject: () => void;
  onOpenBrowser: () => void;
  onToggleSettings: () => void;
}

/** Header project menu: project lifecycle actions, imports, and settings. */
export function ProjectMenu({ onNewProject, onOpenBrowser, onToggleSettings }: ProjectMenuProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const analysisPending = useEditorStore((s) => s.analysisPending);
  const importError = useEditorStore((s) => s.importError);
  const setImportError = useEditorStore((s) => s.setImportError);

  const newProject = async () => {
    setBusy(true);
    try {
      await startNewProject();
      onNewProject();
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    try {
      await importMediaFile(file);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <>
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Project
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={busy} onSelect={() => void newProject()}>
            <FilePlus2 /> New
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenBrowser}>
            <FolderOpen /> Open
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={analysisPending}>
              <FolderOpen /> Import
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => audioInputRef.current?.click()}>
                <Music /> Audio
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => imageInputRef.current?.click()}>
                <ImagePlus /> Image
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onToggleSettings}>
            <Settings /> Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {importError && (
        <div className="flex items-center gap-1 text-xs">
          <span className="max-w-72 truncate" title={importError}>
            {importError}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-5"
            aria-label="Dismiss error"
            onClick={() => setImportError(null)}
          >
            <X className="size-3" />
          </Button>
        </div>
      )}
    </>
  );
}
