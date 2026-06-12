import { useState } from "react";
import { ExportDialog } from "@/components/ExportDialog";
import { ImportDropZone } from "@/components/ImportDropZone";
import { ImportMenu } from "@/components/ImportMenu";
import { Inspector } from "@/components/Inspector";
import { RenderView } from "@/components/RenderView";
import { SettingsScreen } from "@/components/SettingsScreen";
import { Timeline } from "@/components/Timeline";
import { TransportBar } from "@/components/TransportBar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AspectRatioId } from "@/model/types";
import { ASPECT_RATIOS } from "@/model/types";
import { useProjectStore } from "@/state/projectStore";

type AppView = "editor" | "settings";

export default function App() {
  const [view, setView] = useState<AppView>("editor");
  const aspectRatio = useProjectStore((s) => s.project.aspectRatio);
  const setAspectRatio = useProjectStore((s) => s.setAspectRatio);
  const name = useProjectStore((s) => s.project.name);

  return (
    <ImportDropZone>
      <header className="flex items-center gap-3 border-b px-3 py-2">
        <h1 className="text-sm font-bold uppercase tracking-widest">Beat Visualizer</h1>
        <span className="text-xs text-muted-foreground">{name}</span>
        <div className="flex-1" />
        <ImportMenu />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView((current) => (current === "settings" ? "editor" : "settings"))}
        >
          {view === "settings" ? "Editor" : "Settings"}
        </Button>
        <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as AspectRatioId)}>
          <SelectTrigger size="sm" className="w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ASPECT_RATIOS).map((spec) => (
              <SelectItem key={spec.id} value={spec.id}>
                {spec.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExportDialog />
      </header>

      {view === "settings" ? (
        <SettingsScreen onDone={() => setView("editor")} />
      ) : (
        <>
          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="min-h-0 flex-1">
                <RenderView />
              </div>
              <TransportBar />
            </div>
            <Inspector />
          </div>

          <div className="h-56 shrink-0">
            <Timeline />
          </div>
        </>
      )}
    </ImportDropZone>
  );
}
