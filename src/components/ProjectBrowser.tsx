import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { migrateProject } from "@/model/schema";
import type { Project } from "@/model/types";
import { ASPECT_RATIOS } from "@/model/types";
import { openProject } from "@/state/projectActions";
import { useProjectStore } from "@/state/projectStore";
import { deleteProjectDoc, listProjectDocs, loadThumbnail, saveProjectDoc } from "@/storage/db";

interface BrowserItem {
  project: Project;
  thumbnailUrl: string | null;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function loadBrowserItems(currentProject: Project): Promise<BrowserItem[]> {
  await saveProjectDoc(currentProject);

  const docs = await listProjectDocs();
  const items: BrowserItem[] = [];
  let hasCurrentProject = false;
  for (const raw of docs) {
    let project: Project;
    try {
      project = migrateProject(raw);
    } catch {
      continue; // Skip unreadable/newer documents rather than failing the list.
    }
    if (project.id === currentProject.id) hasCurrentProject = true;
    const blob = await loadThumbnail(project.id);
    items.push({ project, thumbnailUrl: blob ? URL.createObjectURL(blob) : null });
  }
  if (!hasCurrentProject) {
    items.push({ project: currentProject, thumbnailUrl: null });
  }
  return items.sort((a, b) => b.project.modifiedAt - a.project.modifiedAt);
}

interface ProjectBrowserProps {
  onOpened: () => void;
}

export function ProjectBrowser({ onOpened }: ProjectBrowserProps) {
  const currentProjectId = useProjectStore((s) => s.project.id);
  const [items, setItems] = useState<BrowserItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const refresh = useCallback(async () => {
    setItems(await loadBrowserItems(useProjectStore.getState().project));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Revoke object URLs when the list changes or the view unmounts.
  useEffect(() => {
    if (!items) return;
    const urls = items.map((i) => i.thumbnailUrl).filter((u): u is string => u !== null);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [items]);

  const open = async (projectId: string) => {
    if (busy) return;
    if (projectId !== currentProjectId) {
      setBusy(true);
      try {
        await openProject(projectId);
      } finally {
        setBusy(false);
      }
    }
    onOpened();
  };

  const remove = async (projectId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteProjectDoc(projectId);
      setItems((current) => current?.filter((item) => item.project.id !== projectId) ?? null);
      toast.success("Project deleted");
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-widest">Projects</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              All projects on this device, most recently edited first. Click a project to open it.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onOpened}>
            Editor
          </Button>
        </div>

        {items !== null && items.length === 0 && (
          <p className="text-xs text-muted-foreground">No stored projects yet.</p>
        )}
        {items === null && <p className="text-xs text-muted-foreground">Loading projects...</p>}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items?.map(({ project, thumbnailUrl }) => {
            const isCurrent = project.id === currentProjectId;
            const spec = ASPECT_RATIOS[project.aspectRatio];
            return (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                data-testid="project-card"
                aria-label={`Open project ${project.name}`}
                className={cn(
                  "group flex cursor-pointer flex-col overflow-hidden rounded-sm border bg-card text-left transition-colors hover:border-foreground/60",
                  isCurrent && "border-foreground ring-1 ring-foreground",
                )}
                onClick={() => void open(project.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void open(project.id);
                  }
                }}
              >
                <div
                  className="w-full bg-background"
                  style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
                >
                  {thumbnailUrl && (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  )}
                </div>
                <div className="flex items-start justify-between gap-2 border-t p-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold uppercase tracking-wider">
                        {project.songName.trim() || project.name}
                      </span>
                      {isCurrent && (
                        <span className="shrink-0 rounded-sm border px-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Created {formatDate(project.createdAt)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Edited {formatDate(project.modifiedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="delete-project"
                    className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Delete project ${project.name}`}
                    disabled={busy}
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDelete(project);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This will remove "{pendingDelete?.songName.trim() || pendingDelete?.name}" from the
              project browser. You can not undo this action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && void remove(pendingDelete.id)}
              disabled={busy}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
