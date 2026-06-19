import { type KeyboardEvent, useEffect, useState } from "react";
import { ExportDialog } from "@/components/ExportDialog";
import { FileMenu } from "@/components/FileMenu";
import { ImportDropZone } from "@/components/ImportDropZone";
import { ImportMenu } from "@/components/ImportMenu";
import { Inspector } from "@/components/Inspector";
import { ProjectBrowser } from "@/components/ProjectBrowser";
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

type AppView = "editor" | "settings" | "projects";

function normalizedProjectName(name: string): string {
  return name.trim() || "Untitled";
}

function ProjectTitle() {
  const name = useProjectStore((s) => s.project.name);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [editing, name]);

  const commit = () => {
    const nextName = normalizedProjectName(draft);
    setDraft(nextName);
    setEditing(false);
    if (nextName !== name) {
      setProjectName(nextName);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDraft(name);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        aria-label="Project name"
        autoFocus
        className="h-7 w-44 rounded-sm border bg-transparent px-2 text-xs text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        value={draft}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.target.select()}
        onKeyDown={onKeyDown}
      />
    );
  }

  return (
    <button
      type="button"
      className="max-w-56 truncate rounded-sm px-1 py-0.5 text-left text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      title={name}
      onClick={() => setEditing(true)}
    >
      {name}
    </button>
  );
}

export default function App() {
  const [view, setView] = useState<AppView>("editor");
  const aspectRatio = useProjectStore((s) => s.project.aspectRatio);
  const setAspectRatio = useProjectStore((s) => s.setAspectRatio);

  return (
    <ImportDropZone>
      <header className="flex items-center gap-3 border-b px-3 py-2">
        <h1 className="text-sm font-bold uppercase tracking-widest">Beat Visualizer</h1>
        <ProjectTitle />
        <div className="flex-1" />
        <FileMenu onNewProject={() => setView("editor")} onOpenBrowser={() => setView("projects")} />
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
      ) : view === "projects" ? (
        <ProjectBrowser onOpened={() => setView("editor")} />
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
