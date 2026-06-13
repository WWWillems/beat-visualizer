import { Upload } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { useEditorStore } from "@/state/editorStore";
import { importMediaFile } from "@/state/importActions";

/**
 * Full-app drop target: drag MP3/WAV (or PNG/JPG) files anywhere in the
 * window to import them. Shows an overlay while a file is dragged over.
 */
export function ImportDropZone({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState(false);
  // dragenter/dragleave fire for every child element; a depth counter keeps
  // the overlay stable while moving across the window.
  const depth = useRef(0);

  const handleDrop = useCallback(async (files: FileList) => {
    const setImportError = useEditorStore.getState().setImportError;
    setImportError(null);
    for (const file of Array.from(files)) {
      try {
        await importMediaFile(file);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : String(error));
      }
    }
  }, []);

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden overscroll-none"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (event.dataTransfer.files.length > 0) {
          void handleDrop(event.dataTransfer.files);
        }
      }}
    >
      {children}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-foreground bg-background/80">
          <div className="flex flex-col items-center gap-2">
            <Upload className="size-8" />
            <p className="text-sm uppercase tracking-widest">Drop audio or image files</p>
            <p className="text-xs text-muted-foreground">MP3, WAV, PNG, JPG</p>
          </div>
        </div>
      )}
    </div>
  );
}
