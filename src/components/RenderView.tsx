import { useEffect, useRef } from "react";
import { transport } from "@/audio/playback";
import { createFeatureSampler } from "@/audio/features";
import { ASPECT_RATIOS } from "@/model/types";
import { RenderEngine } from "@/renderer/engine";
import { useEditorStore } from "@/state/editorStore";
import { listImageBitmaps } from "@/state/mediaCache";
import { useProjectStore } from "@/state/projectStore";
import { renderTimeForPlayhead } from "@/timeline/time";

/** Preview resolution cap; export renders at full size separately. */
const PREVIEW_MAX_WIDTH = 1280;

export function RenderView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RenderEngine | null>(null);
  const aspectRatio = useProjectStore((s) => s.project.aspectRatio);
  const spec = ASPECT_RATIOS[aspectRatio];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scale = Math.min(1, PREVIEW_MAX_WIDTH / spec.width);
    const width = Math.round(spec.width * scale);
    const height = Math.round(spec.height * scale);
    canvas.width = width;
    canvas.height = height;

    const engine = new RenderEngine(canvas, width, height);
    engineRef.current = engine;

    let raf = 0;
    const registeredImages = new Set<string>();
    let lastRenderKey = "";

    const tick = () => {
      const { project } = useProjectStore.getState();
      const editor = useEditorStore.getState();

      // Lazily register imported images with the engine.
      for (const [assetId, bitmap] of listImageBitmaps()) {
        if (!registeredImages.has(assetId)) {
          engine.setImage(assetId, bitmap);
          registeredImages.add(assetId);
        }
      }

      let time = editor.playhead;
      if (transport.isPlaying) {
        time = transport.getTime();
        if (time >= project.duration) {
          transport.pause();
          editor.setIsPlaying(false);
          time = project.duration;
        }
        editor.setPlayhead(time);
      }

      // Skip redundant renders while paused with unchanged inputs; the
      // canvas keeps presenting the previous frame.
      const renderTime = renderTimeForPlayhead(time, project.duration, project.fps);
      const renderKey = `${renderTime}|${project.modifiedAt}|${registeredImages.size}|${editor.analysis ? 1 : 0}`;
      if (renderKey !== lastRenderKey) {
        lastRenderKey = renderKey;
        const features = createFeatureSampler(editor.analysis, project.beatGrid);
        engine.renderFrame({ project, time: renderTime, features });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      engine.dispose();
      engineRef.current = null;
    };
  }, [spec.width, spec.height]);

  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-background p-4">
      <canvas
        ref={canvasRef}
        className="max-h-full max-w-full border"
        style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
      />
    </div>
  );
}
