import { registerAacEncoder } from "@mediabunny/aac-encoder";
import { canEncodeAudio, canEncodeVideo } from "mediabunny";

export interface ExportCapability {
  ok: boolean;
  reasons: string[];
  /** True when the WASM AAC fallback encoder had to be registered. */
  usesAacFallback: boolean;
}

let aacFallbackRegistered = false;

/**
 * Pre-export capability check: H.264 video encoding must be available via
 * WebCodecs; AAC falls back to the bundled WASM encoder when the browser
 * lacks native support. Failing video support is a hard blocker.
 */
export async function checkExportCapability(width: number, height: number): Promise<ExportCapability> {
  const reasons: string[] = [];
  let usesAacFallback = false;

  if (typeof VideoEncoder === "undefined") {
    reasons.push(
      "This browser does not support WebCodecs video encoding. Use a Chromium-based browser (Chrome, Edge, Arc, Brave).",
    );
    return { ok: false, reasons, usesAacFallback };
  }

  const canVideo = await canEncodeVideo("avc", { width, height });
  if (!canVideo) {
    reasons.push(`This browser cannot encode H.264 video at ${width}x${height}.`);
  }

  const canAudio = await canEncodeAudio("aac");
  if (!canAudio) {
    if (!aacFallbackRegistered) {
      registerAacEncoder();
      aacFallbackRegistered = true;
    }
    usesAacFallback = true;
  }

  return { ok: reasons.length === 0, reasons, usesAacFallback };
}
