import { Pause, Play, Redo2, SkipBack, SkipForward, Undo2 } from "lucide-react";
import { useCallback, useEffect } from "react";
import { transport } from "@/audio/playback";
import { Button } from "@/components/ui/button";
import { redo, undo, useProjectStore } from "@/state/projectStore";
import { useEditorStore } from "@/state/editorStore";
import { formatTimecode } from "@/timeline/time";

export function TransportBar() {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const playhead = useEditorStore((s) => s.playhead);
  const hasAudio = useEditorStore((s) => s.audioBuffer !== null);
  const duration = useProjectStore((s) => s.project.duration);
  const fps = useProjectStore((s) => s.project.fps);

  const togglePlay = useCallback(() => {
    const editor = useEditorStore.getState();
    if (transport.isPlaying) {
      const at = transport.pause();
      editor.setIsPlaying(false);
      editor.setPlayhead(at);
    } else {
      transport.play(editor.playhead >= duration ? 0 : editor.playhead);
      editor.setIsPlaying(true);
    }
  }, [duration]);

  const rewind = useCallback(() => {
    transport.seek(0);
    useEditorStore.getState().setPlayhead(0);
  }, []);

  const skipToLastFrame = useCallback(() => {
    if (transport.isPlaying) {
      transport.pause();
    }
    transport.seek(duration);
    const editor = useEditorStore.getState();
    editor.setIsPlaying(false);
    editor.setPlayhead(duration);
  }, [duration]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlay]);

  return (
    <div className="flex items-center gap-2 border-t px-3 py-2">
      <Button variant="ghost" size="icon" onClick={rewind} aria-label="Rewind">
        <SkipBack />
      </Button>
      <Button variant="ghost" size="icon" onClick={skipToLastFrame} aria-label="Skip to last frame">
        <SkipForward />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={togglePlay}
        disabled={!hasAudio}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause /> : <Play />}
      </Button>
      <span className="ml-2 tabular-nums text-sm text-muted-foreground">
        {formatTimecode(playhead, fps)} / {formatTimecode(duration, fps)}
      </span>
      <div className="flex-1" />
      <Button variant="ghost" size="icon" onClick={undo} aria-label="Undo">
        <Undo2 />
      </Button>
      <Button variant="ghost" size="icon" onClick={redo} aria-label="Redo">
        <Redo2 />
      </Button>
    </div>
  );
}
