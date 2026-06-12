import { Download } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkExportCapability, type ExportCapability } from "@/export/capability";
import {
  downloadBlob,
  exportFileBaseName,
  ExportCancelledError,
  startExport,
  type ExportHandle,
  type ExportQuality,
} from "@/export/exporter";
import { ASPECT_RATIOS } from "@/model/types";
import { useEditorStore } from "@/state/editorStore";
import { useProjectStore } from "@/state/projectStore";

type Phase = "idle" | "checking" | "exporting" | "error";

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [quality, setQuality] = useState<ExportQuality>("final");
  const [phase, setPhase] = useState<Phase>("idle");
  const [capability, setCapability] = useState<ExportCapability | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<ExportHandle | null>(null);
  const hasAudio = useEditorStore((s) => s.audioBuffer !== null);
  const aspectRatio = useProjectStore((s) => s.project.aspectRatio);
  const spec = ASPECT_RATIOS[aspectRatio];

  useEffect(() => {
    if (!open) return;
    setPhase("checking");
    setError(null);
    setProgress(0);
    void checkExportCapability(spec.width, spec.height).then((result) => {
      setCapability(result);
      setPhase("idle");
    });
  }, [open, spec.width, spec.height]);

  const runExport = useCallback(async () => {
    const project = useProjectStore.getState().project;
    setPhase("exporting");
    setError(null);
    setProgress(0);
    try {
      const handle = await startExport(project, quality, ({ frame, totalFrames }) => {
        setProgress(Math.round((frame / totalFrames) * 100));
      });
      handleRef.current = handle;
      const blob = await handle.done;
      const safeName = exportFileBaseName(project);
      downloadBlob(blob, `${safeName}_${aspectRatio.replace(":", "x")}_${quality}.mp4`);
      setPhase("idle");
      setOpen(false);
    } catch (e) {
      if (e instanceof ExportCancelledError) {
        setPhase("idle");
      } else {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    } finally {
      handleRef.current = null;
    }
  }, [quality, aspectRatio]);

  const blocked = capability !== null && !capability.ok;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && phase === "exporting") {
          handleRef.current?.cancel();
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!hasAudio}>
          <Download /> Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export MP4</DialogTitle>
          <DialogDescription>
            H.264 + AAC MP4, ready for YouTube, Instagram, and TikTok.
          </DialogDescription>
        </DialogHeader>

        {phase === "checking" && (
          <p className="text-xs text-muted-foreground">Checking encoder support…</p>
        )}

        {blocked && (
          <div className="space-y-1 rounded-sm border p-3 text-xs">
            {capability.reasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        )}

        {!blocked && phase !== "checking" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Quality</span>
              <Select
                value={quality}
                onValueChange={(v) => setQuality(v as ExportQuality)}
                disabled={phase === "exporting"}
              >
                <SelectTrigger size="sm" className="w-56 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="final">
                    Final — {spec.width}x{spec.height} 30 FPS
                  </SelectItem>
                  <SelectItem value="proof">
                    Proof — {spec.width / 2}x{spec.height / 2} 30 FPS
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {capability?.usesAacFallback && (
              <p className="text-[10px] text-muted-foreground">
                Native AAC encoding is unavailable; using the bundled encoder.
              </p>
            )}

            {phase === "exporting" && (
              <div className="space-y-1.5">
                <Progress value={progress} />
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  Rendering… {progress}%
                </p>
              </div>
            )}

            {error && <p className="text-xs">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {phase === "exporting" ? (
            <Button variant="outline" size="sm" onClick={() => handleRef.current?.cancel()}>
              Cancel
            </Button>
          ) : (
            <Button size="sm" disabled={blocked || phase === "checking"} onClick={() => void runExport()}>
              Export {quality === "final" ? "1080p" : "proof"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
