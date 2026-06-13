import { ImagePlus, Music, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type WheelEvent } from "react";
import { transport } from "@/audio/playback";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Clip, Track } from "@/model/types";
import { useEditorStore } from "@/state/editorStore";
import { addVisualClipAt, importAudioFile, importImageFile } from "@/state/importActions";
import { useProjectStore } from "@/state/projectStore";
import { clampMoveStart, clampResizeDuration, clampResizeStart } from "@/timeline/clips";
import {
  DEFAULT_TIMELINE_PX_PER_SECOND,
  adaptiveTimelineTickInterval,
  clampTimelinePxPerSecond,
  clampTimelineScrollLeft,
  zoomTimelineViewport,
} from "@/timeline/viewport";

const TRACK_HEADER_WIDTH = 160;
const ROW_HEIGHT = 56;

function secondsToPx(seconds: number, pxPerSecond: number): number {
  return seconds * pxPerSecond;
}

function pxToSeconds(px: number, pxPerSecond: number): number {
  return px / pxPerSecond;
}

function formatRulerTime(seconds: number): string {
  if (seconds < 60) {
    return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function PlayheadLine({ pxPerSecond }: { pxPerSecond: number }) {
  const playhead = useEditorStore((s) => s.playhead);
  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-foreground"
      style={{ left: secondsToPx(playhead, pxPerSecond) }}
    />
  );
}

function Ruler({ duration, pxPerSecond }: { duration: number; pxPerSecond: number }) {
  const beatGrid = useProjectStore((s) => s.project.beatGrid);
  const seek = useSeek();
  const ticks: number[] = [];
  const tickInterval = adaptiveTimelineTickInterval(pxPerSecond);
  for (let t = 0; t <= duration; t += tickInterval) ticks.push(Number(t.toFixed(3)));

  const beats: number[] = [];
  if (beatGrid && beatGrid.bpm > 0) {
    const period = 60 / beatGrid.bpm;
    for (let t = beatGrid.offset; t <= duration; t += period) beats.push(t);
  }

  return (
    <div
      className="relative h-8 cursor-crosshair border-b bg-card select-none"
      style={{ width: secondsToPx(duration, pxPerSecond) }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        seek(pxToSeconds(event.clientX - rect.left, pxPerSecond));
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        // Drag-scrub: keep seeking while the pointer is held down.
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const rect = event.currentTarget.getBoundingClientRect();
        seek(Math.min(duration, pxToSeconds(event.clientX - rect.left, pxPerSecond)));
      }}
    >
      {beats.map((t, i) => (
        <div
          key={`b${i}`}
          className="absolute bottom-0 h-1.5 w-px bg-muted-foreground/40"
          style={{ left: secondsToPx(t, pxPerSecond) }}
        />
      ))}
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute top-0 h-full"
          style={{ left: secondsToPx(t, pxPerSecond) }}
        >
          <div className="h-2 w-px bg-border" />
          <span className="pl-1 text-[10px] text-muted-foreground">{formatRulerTime(t)}</span>
        </div>
      ))}
    </div>
  );
}

function useSeek() {
  return useCallback((seconds: number) => {
    const clamped = Math.max(0, seconds);
    transport.seek(clamped);
    useEditorStore.getState().setPlayhead(clamped);
  }, []);
}

function AudioWaveform({ width }: { width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysis = useEditorStore((s) => s.analysis);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analysis) return;
    const height = ROW_HEIGHT - 18;
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, height);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const mid = height / 2;
    const buckets = analysis.waveformBuckets;
    for (let x = 0; x < canvas.width; x++) {
      const bucket = Math.floor((x / canvas.width) * buckets);
      const min = analysis.waveform[bucket * 2];
      const max = analysis.waveform[bucket * 2 + 1];
      const top = mid + min * mid;
      const bottom = mid + max * mid;
      ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
    }
  }, [analysis, width]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}

type ClipInteraction =
  | { kind: "move"; pointerId: number; originX: number; originStart: number }
  | {
      kind: "resize-left" | "resize-right";
      pointerId: number;
      originX: number;
      originStart: number;
      originDuration: number;
    };

function ClipView({
  track,
  clip,
  projectDuration,
  fps,
  pxPerSecond,
}: {
  track: Track;
  clip: Clip;
  projectDuration: number;
  fps: number;
  pxPerSecond: number;
}) {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const moveClip = useProjectStore((s) => s.moveClip);
  const commitClipEdit = useProjectStore((s) => s.commitClipEdit);
  const [previewTiming, setPreviewTiming] = useState<{ start: number; duration: number } | null>(null);
  const interaction = useRef<ClipInteraction | null>(null);
  // Tracks Option/Alt during the drag; the value at release decides
  // collision vs overwrite (see "Overwrite editing" in CONTEXT.md).
  const overwriteHeld = useRef(false);
  // Last pointer position, so toggling Alt mid-gesture can recompute the
  // preview without waiting for the next pointer move.
  const lastClientX = useRef(0);

  const minDuration = 1 / fps;
  const canResize = clip.type === "visual" || clip.type === "image";
  const collides = clip.type === "visual" || clip.type === "image";
  const displayStart = previewTiming?.start ?? clip.start;
  const displayDuration = previewTiming?.duration ?? clip.duration;
  const left = secondsToPx(displayStart, pxPerSecond);
  const width = secondsToPx(displayDuration, pxPerSecond);
  const selected = selectedClipId === clip.id;

  const calculateTiming = (state: ClipInteraction, deltaSeconds: number, overwrite: boolean) => {
    const siblings = track.clips.filter((c) => c.id !== clip.id);
    const useCollision = collides && !overwrite;
    switch (state.kind) {
      case "move": {
        const desired = state.originStart + deltaSeconds;
        if (useCollision) {
          return {
            start: clampMoveStart(siblings, clip.duration, desired, state.originStart, projectDuration),
            duration: clip.duration,
          };
        }
        const maxStart = Math.max(0, projectDuration - clip.duration);
        return {
          start: Math.min(maxStart, Math.max(0, desired)),
          duration: clip.duration,
        };
      }
      case "resize-left": {
        const desired = state.originStart + deltaSeconds;
        if (useCollision) {
          return clampResizeStart(siblings, state.originStart, state.originDuration, desired, minDuration);
        }
        const end = state.originStart + state.originDuration;
        const start = Math.min(end - minDuration, Math.max(0, desired));
        return { start, duration: end - start };
      }
      case "resize-right": {
        const desired = state.originDuration + deltaSeconds;
        if (useCollision) {
          return clampResizeDuration(
            siblings,
            state.originStart,
            state.originDuration,
            desired,
            minDuration,
            projectDuration,
          );
        }
        const maxDuration = Math.max(minDuration, projectDuration - state.originStart);
        return {
          start: state.originStart,
          duration: Math.min(maxDuration, Math.max(minDuration, desired)),
        };
      }
      default: {
        const exhaustive: never = state;
        throw new Error(`Unhandled clip interaction: ${String(exhaustive)}`);
      }
    }
  };

  // While a gesture is active, toggling Option/Alt re-renders the preview
  // immediately: pressing it shows the free (overwrite) timing, releasing it
  // snaps back to the collision-clamped timing.
  const dragging = previewTiming !== null;
  useEffect(() => {
    if (!dragging) return;
    const onAltToggle = (event: KeyboardEvent) => {
      if (event.key !== "Alt" || event.repeat) return;
      const state = interaction.current;
      if (!state) return;
      event.preventDefault();
      const overwrite = event.type === "keydown";
      overwriteHeld.current = overwrite;
      setPreviewTiming(
        calculateTiming(
          state,
          pxToSeconds(lastClientX.current - state.originX, pxPerSecond),
          overwrite,
        ),
      );
    };
    window.addEventListener("keydown", onAltToggle);
    window.addEventListener("keyup", onAltToggle);
    return () => {
      window.removeEventListener("keydown", onAltToggle);
      window.removeEventListener("keyup", onAltToggle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gesture inputs are stable while dragging
  }, [dragging]);

  return (
    <div
      className={cn(
        "absolute top-1 bottom-1 cursor-grab overflow-hidden rounded-sm border bg-secondary",
        selected && "border-foreground ring-1 ring-foreground",
        previewTiming !== null && "cursor-grabbing opacity-80",
      )}
      style={{ left, width }}
      onPointerDown={(event) => {
        event.stopPropagation();
        useEditorStore.getState().selectClip(track.id, clip.id);
        overwriteHeld.current = event.altKey;
        lastClientX.current = event.clientX;
        interaction.current = {
          kind: "move",
          pointerId: event.pointerId,
          originX: event.clientX,
          originStart: clip.start,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const state = interaction.current;
        if (!state || state.pointerId !== event.pointerId) return;
        overwriteHeld.current = event.altKey;
        lastClientX.current = event.clientX;
        setPreviewTiming(
          calculateTiming(
            state,
            pxToSeconds(event.clientX - state.originX, pxPerSecond),
            event.altKey,
          ),
        );
      }}
      onPointerUp={(event) => {
        const state = interaction.current;
        interaction.current = null;
        setPreviewTiming(null);
        if (state && Math.abs(event.clientX - state.originX) > 2) {
          const overwrite = overwriteHeld.current && collides;
          const next = calculateTiming(
            state,
            pxToSeconds(event.clientX - state.originX, pxPerSecond),
            overwrite,
          );
          if (collides) {
            commitClipEdit(track.id, clip.id, next.start, next.duration, overwrite);
          } else if (state.kind === "move") {
            moveClip(track.id, clip.id, next.start);
          }
        }
        overwriteHeld.current = false;
      }}
    >
      {canResize && (
        <div
          className="absolute top-0 bottom-0 left-0 z-10 w-2 cursor-ew-resize border-l-2 border-foreground/70"
          aria-hidden="true"
          onPointerDown={(event) => {
            event.stopPropagation();
            useEditorStore.getState().selectClip(track.id, clip.id);
            overwriteHeld.current = event.altKey;
            lastClientX.current = event.clientX;
            interaction.current = {
              kind: "resize-left",
              pointerId: event.pointerId,
              originX: event.clientX,
              originStart: clip.start,
              originDuration: clip.duration,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
        />
      )}
      <div className="truncate px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {clip.type === "visual" ? "Particle Field" : clip.type}
      </div>
      {clip.type === "audio" && <AudioWaveform width={width} />}
      {canResize && (
        <div
          className="absolute top-0 right-0 bottom-0 z-10 w-2 cursor-ew-resize border-r-2 border-foreground/70"
          aria-hidden="true"
          onPointerDown={(event) => {
            event.stopPropagation();
            useEditorStore.getState().selectClip(track.id, clip.id);
            overwriteHeld.current = event.altKey;
            lastClientX.current = event.clientX;
            interaction.current = {
              kind: "resize-right",
              pointerId: event.pointerId,
              originX: event.clientX,
              originStart: clip.start,
              originDuration: clip.duration,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
        />
      )}
    </div>
  );
}

function TrackRow({
  track,
  duration,
  fps,
  pxPerSecond,
}: {
  track: Track;
  duration: number;
  fps: number;
  pxPerSecond: number;
}) {
  const seek = useSeek();
  return (
    <div
      className="relative border-b bg-background"
      style={{ height: ROW_HEIGHT, width: secondsToPx(duration, pxPerSecond) }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        seek(pxToSeconds(event.clientX - rect.left, pxPerSecond));
        useEditorStore.getState().selectClip(null, null);
      }}
    >
      {track.clips.map((clip) => (
        <ClipView
          key={clip.id}
          track={track}
          clip={clip}
          projectDuration={duration}
          fps={fps}
          pxPerSecond={pxPerSecond}
        />
      ))}
    </div>
  );
}

function TrackHeader({ track }: { track: Track }) {
  const playhead = useEditorStore((s) => s.playhead);
  const analysisPending = useEditorStore((s) => s.analysisPending);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined, kind: "audio" | "image") => {
    if (!file) return;
    setError(null);
    try {
      if (kind === "audio") {
        await importAudioFile(file);
      } else {
        await importImageFile(file);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div
      className="flex shrink-0 flex-col justify-center gap-1 border-r border-b bg-card px-2"
      style={{ height: ROW_HEIGHT, width: TRACK_HEADER_WIDTH }}
    >
      <span className="truncate text-xs uppercase tracking-wider">{track.name}</span>
      <div className="flex items-center gap-1">
        {track.type === "visual" && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Add visual clip at playhead"
            onClick={() => addVisualClipAt(playhead, 8)}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
        {track.type === "audio" && (
          <>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0], "audio")}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label="Import audio"
              disabled={analysisPending}
              onClick={() => audioInputRef.current?.click()}
            >
              <Music className="size-3.5" />
            </Button>
            {analysisPending && (
              <span className="text-[10px] text-muted-foreground">analyzing…</span>
            )}
          </>
        )}
        {track.type === "image" && (
          <>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0], "image")}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label="Import image"
              onClick={() => imageInputRef.current?.click()}
            >
              <ImagePlus className="size-3.5" />
            </Button>
          </>
        )}
      </div>
      {error && <span className="truncate text-[10px] text-muted-foreground">{error}</span>}
    </div>
  );
}

export function Timeline() {
  const projectId = useProjectStore((s) => s.project.id);
  const tracks = useProjectStore((s) => s.project.tracks);
  const duration = useProjectStore((s) => s.project.duration);
  const fps = useProjectStore((s) => s.project.fps);
  const deleteClip = useProjectStore((s) => s.deleteClip);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [pxPerSecond, setPxPerSecond] = useState(DEFAULT_TIMELINE_PX_PER_SECOND);

  // Display top render layer first; audio tracks at the bottom.
  const displayTracks = [
    ...tracks.filter((t) => t.type !== "audio").reverse(),
    ...tracks.filter((t) => t.type === "audio"),
  ];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (event.key === "Delete" || event.key === "Backspace") {
        const { selectedTrackId, selectedClipId, selectClip } = useEditorStore.getState();
        if (selectedTrackId && selectedClipId) {
          deleteClip(selectedTrackId, selectedClipId);
          selectClip(null, null);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteClip]);

  useEffect(() => {
    setPxPerSecond(DEFAULT_TIMELINE_PX_PER_SECOND);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [projectId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const syncViewportBounds = () => {
      setPxPerSecond((current) => {
        const next = clampTimelinePxPerSecond(current, duration, container.clientWidth);
        container.scrollLeft = clampTimelineScrollLeft(
          container.scrollLeft,
          duration,
          container.clientWidth,
          next,
        );
        return next;
      });
    };

    syncViewportBounds();
    const resizeObserver = new ResizeObserver(syncViewportBounds);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [duration]);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.deltaY === 0) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const next = zoomTimelineViewport({
        pxPerSecond,
        scrollLeft: event.currentTarget.scrollLeft,
        cursorX: event.clientX - rect.left,
        deltaY: event.deltaY,
        duration,
        viewportWidth: event.currentTarget.clientWidth,
      });

      setPxPerSecond(next.pxPerSecond);
      event.currentTarget.scrollLeft = next.scrollLeft;
    },
    [duration, pxPerSecond],
  );

  return (
    <div className="flex h-full min-h-0 border-t">
      <div className="flex shrink-0 flex-col" style={{ width: TRACK_HEADER_WIDTH }}>
        <div className="h-8 border-r border-b bg-card" />
        {displayTracks.map((track) => (
          <TrackHeader key={track.id} track={track} />
        ))}
      </div>
      <div
        ref={scrollContainerRef}
        className="relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
        onWheel={handleWheel}
      >
        <div className="relative" style={{ width: secondsToPx(duration, pxPerSecond) }}>
          <Ruler duration={duration} pxPerSecond={pxPerSecond} />
          {displayTracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              duration={duration}
              fps={fps}
              pxPerSecond={pxPerSecond}
            />
          ))}
          <PlayheadLine pxPerSecond={pxPerSecond} />
        </div>
      </div>
    </div>
  );
}
