import { FolderOpen, ImagePlus, Music, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorStore } from "@/state/editorStore";
import { importMediaFile } from "@/state/importActions";

/** Header import menu: audio (MP3/WAV) and image (PNG/JPG) pickers. */
export function ImportMenu() {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const analysisPending = useEditorStore((s) => s.analysisPending);
  const importError = useEditorStore((s) => s.importError);
  const setImportError = useEditorStore((s) => s.setImportError);

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
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={analysisPending}>
            <FolderOpen /> {analysisPending ? "Analyzing…" : "Import"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => audioInputRef.current?.click()}>
            <Music /> Audio (MP3, WAV)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => imageInputRef.current?.click()}>
            <ImagePlus /> Image (PNG, JPG)
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
