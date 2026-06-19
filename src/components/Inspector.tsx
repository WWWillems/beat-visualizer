import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { createId } from "@/model/defaults";
import type {
  ImageClip,
  ModulationSource,
  Project,
  Track,
  VisualClip,
} from "@/model/types";
import { looksForPreset, modulatableParams, PRESETS, type LookDescriptor } from "@/renderer/presets";
import { renderLookThumbnail } from "@/renderer/thumbnail";
import { useEditorStore } from "@/state/editorStore";
import { useProjectStore } from "@/state/projectStore";

const MODULATION_SOURCES: ModulationSource[] = ["rms", "bass", "mid", "high", "beat", "onset"];
const lookThumbnailCache = new Map<string, string>();

function findSelected(project: Project, trackId: string | null, clipId: string | null) {
  const track = project.tracks.find((t) => t.id === trackId);
  const clip = track?.clips.find((c) => c.id === clipId);
  return { track, clip };
}

function BeatGridSection() {
  const beatGrid = useProjectStore((s) => s.project.beatGrid);
  const setBeatGrid = useProjectStore((s) => s.setBeatGrid);
  if (!beatGrid) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Beat grid</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="bpm" className="text-[10px]">
            BPM
          </Label>
          <Input
            id="bpm"
            type="number"
            min={30}
            max={300}
            step={0.1}
            value={beatGrid.bpm}
            onChange={(e) =>
              setBeatGrid({ ...beatGrid, bpm: Number(e.target.value) || beatGrid.bpm })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="offset" className="text-[10px]">
            Offset (s)
          </Label>
          <Input
            id="offset"
            type="number"
            min={0}
            step={0.01}
            value={beatGrid.offset}
            onChange={(e) => setBeatGrid({ ...beatGrid, offset: Number(e.target.value) || 0 })}
          />
        </div>
      </div>
    </div>
  );
}

function useLookThumbnail(look: LookDescriptor): string | null {
  const [src, setSrc] = useState<string | null>(() => lookThumbnailCache.get(look.id) ?? null);

  useEffect(() => {
    const cached = lookThumbnailCache.get(look.id);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    void renderLookThumbnail(look).then((blob) => {
      if (cancelled || !blob) return;
      const url = URL.createObjectURL(blob);
      lookThumbnailCache.set(look.id, url);
      setSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [look]);

  return src;
}

function LookCard({
  look,
  selected,
  onSelect,
}: {
  look: LookDescriptor;
  selected: boolean;
  onSelect: (look: LookDescriptor) => void;
}) {
  const thumbnail = useLookThumbnail(look);

  return (
    <button
      type="button"
      className={[
        "group overflow-hidden rounded-sm border bg-card text-left transition-colors hover:bg-accent",
        selected ? "border-foreground" : "border-border",
      ].join(" ")}
      onClick={() => onSelect(look)}
    >
      <div className="aspect-square bg-black">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
            Rendering
          </div>
        )}
      </div>
      <div className="space-y-0.5 p-1.5">
        <div className="truncate text-[10px] font-medium">{look.label}</div>
        <div className="truncate text-[9px] text-muted-foreground">{PRESETS[look.presetId].label}</div>
      </div>
    </button>
  );
}

function LookChooser({
  selectedLookId,
  onSelect,
}: {
  selectedLookId?: string;
  onSelect: (look: LookDescriptor) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Looks</h3>
        <p className="text-[10px] text-muted-foreground">
          Selecting a Look replaces this clip&apos;s visual settings.
        </p>
      </div>
      {Object.values(PRESETS).map((preset) => (
        <div key={preset.id} className="space-y-1.5">
          <div className="text-[10px] font-medium uppercase tracking-wider">{preset.label}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {looksForPreset(preset.id).map((look) => (
              <LookCard
                key={look.id}
                look={look}
                selected={selectedLookId === look.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VisualClipSection({ track, clip }: { track: Track; clip: VisualClip }) {
  const updateProject = useProjectStore((s) => s.updateProject);
  const preset = PRESETS[clip.presetId];
  const modulationParams = modulatableParams(clip.presetId);
  const defaultModulationParam = modulationParams[0]?.key ?? preset.params[0]?.key;

  const updateClip = (recipe: (draft: VisualClip) => void) => {
    updateProject((project) => {
      const t = project.tracks.find((x) => x.id === track.id);
      const c = t?.clips.find((x) => x.id === clip.id);
      if (c && c.type === "visual") recipe(c);
    });
  };

  const applyLook = (look: LookDescriptor) => {
    updateClip((draft) => {
      draft.presetId = look.presetId;
      draft.lookId = look.id;
      draft.seed = look.seed;
      draft.params = { ...look.params };
      draft.keyframes = {};
      draft.modulations = look.defaultModulations.map((modulation) => ({
        id: createId(),
        ...modulation,
      }));
    });
  };

  return (
    <div className="space-y-4">
      <LookChooser selectedLookId={clip.lookId} onSelect={applyLook} />
      <Separator />
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">{preset.label}</h3>
      {preset.params.map((param) => (
        <div key={param.key} className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <Label>{param.label}</Label>
            <span className="tabular-nums text-muted-foreground">
              {(clip.params[param.key] ?? param.defaultValue).toFixed(2)}
            </span>
          </div>
          <Slider
            min={param.min}
            max={param.max}
            step={param.step}
            value={[clip.params[param.key] ?? param.defaultValue]}
            onValueChange={([value]) =>
              updateClip((draft) => {
                draft.params[param.key] = value;
              })
            }
          />
        </div>
      ))}

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Modulation</h3>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px]"
            disabled={!defaultModulationParam}
            onClick={() =>
              updateClip((draft) => {
                if (!defaultModulationParam) return;
                draft.modulations.push({
                  id: createId(),
                  param: defaultModulationParam,
                  source: "beat",
                  amount: 0.5,
                  smoothing: 0.2,
                });
              })
            }
          >
            Add
          </Button>
        </div>
        {clip.modulations.map((mod) => {
          const legacyParam = preset.params.find((p) => p.key === mod.param);
          const targetParams = modulationParams.some((p) => p.key === mod.param)
            ? modulationParams
            : legacyParam
              ? [legacyParam, ...modulationParams]
              : modulationParams;

          return (
            <div key={mod.id} className="space-y-2 rounded-sm border p-2">
              <div className="flex items-center gap-1.5">
                <Select
                  value={mod.param}
                  onValueChange={(value) =>
                    updateClip((draft) => {
                      const m = draft.modulations.find((x) => x.id === mod.id);
                      if (m) m.param = value;
                    })
                  }
                >
                  <SelectTrigger size="sm" className="h-7 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {targetParams.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground">from</span>
                <Select
                  value={mod.source}
                  onValueChange={(value) =>
                    updateClip((draft) => {
                      const m = draft.modulations.find((x) => x.id === mod.id);
                      if (m) m.source = value as ModulationSource;
                    })
                  }
                >
                  <SelectTrigger size="sm" className="h-7 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULATION_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label="Remove modulation"
                  onClick={() =>
                    updateClip((draft) => {
                      draft.modulations = draft.modulations.filter((x) => x.id !== mod.id);
                    })
                  }
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <Label>Amount</Label>
                  <span className="tabular-nums text-muted-foreground">{mod.amount.toFixed(2)}</span>
                </div>
                <Slider
                  min={-1}
                  max={1}
                  step={0.01}
                  value={[mod.amount]}
                  onValueChange={([value]) =>
                    updateClip((draft) => {
                      const m = draft.modulations.find((x) => x.id === mod.id);
                      if (m) m.amount = value;
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <Label>Smoothing</Label>
                  <span className="tabular-nums text-muted-foreground">
                    {mod.smoothing.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[mod.smoothing]}
                  onValueChange={([value]) =>
                    updateClip((draft) => {
                      const m = draft.modulations.find((x) => x.id === mod.id);
                      if (m) m.smoothing = value;
                    })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImageClipSection({ track, clip }: { track: Track; clip: ImageClip }) {
  const updateProject = useProjectStore((s) => s.updateProject);

  const updateClip = (recipe: (draft: ImageClip) => void) => {
    updateProject((project) => {
      const t = project.tracks.find((x) => x.id === track.id);
      const c = t?.clips.find((x) => x.id === clip.id);
      if (c && c.type === "image") recipe(c);
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Image</h3>
      <div className="space-y-1">
        <Label className="text-[10px]">Fit</Label>
        <Select
          value={clip.fit}
          onValueChange={(value) =>
            updateClip((draft) => {
              draft.fit = value as ImageClip["fit"];
            })
          }
        >
          <SelectTrigger size="sm" className="w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="cover">Cover</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <Label>Opacity</Label>
          <span className="tabular-nums text-muted-foreground">{clip.opacity.toFixed(2)}</span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[clip.opacity]}
          onValueChange={([value]) =>
            updateClip((draft) => {
              draft.opacity = value;
            })
          }
        />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <Label>Scale</Label>
          <span className="tabular-nums text-muted-foreground">{clip.layout.scale.toFixed(2)}</span>
        </div>
        <Slider
          min={0.1}
          max={3}
          step={0.01}
          value={[clip.layout.scale]}
          onValueChange={([value]) =>
            updateClip((draft) => {
              draft.layout.scale = value;
            })
          }
        />
      </div>
    </div>
  );
}

export function Inspector() {
  const selectedTrackId = useEditorStore((s) => s.selectedTrackId);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const project = useProjectStore((s) => s.project);
  const { track, clip } = findSelected(project, selectedTrackId, selectedClipId);

  return (
    <div className="flex h-full w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l p-3">
      <BeatGridSection />
      <Separator />
      {track && clip ? (
        clip.type === "visual" ? (
          <VisualClipSection track={track} clip={clip} />
        ) : clip.type === "image" ? (
          <ImageClipSection track={track} clip={clip} />
        ) : (
          <p className="text-xs text-muted-foreground">Audio clip selected.</p>
        )
      ) : (
        <p className="text-xs text-muted-foreground">Select a clip to edit its settings.</p>
      )}
    </div>
  );
}
