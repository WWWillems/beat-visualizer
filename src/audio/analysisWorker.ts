import { analyzeAudio } from "@/audio/analyze";
import type { AnalysisRequest, AnalysisResponse } from "@/audio/analysisTypes";

self.onmessage = (event: MessageEvent<AnalysisRequest>) => {
  const { channelData, sampleRate } = event.data;
  try {
    const analysis = analyzeAudio(channelData, sampleRate);
    const response: AnalysisResponse = { ok: true, analysis };
    self.postMessage(response, {
      transfer: [
        analysis.rms.buffer,
        analysis.bass.buffer,
        analysis.mid.buffer,
        analysis.high.buffer,
        analysis.waveform.buffer,
      ],
    });
  } catch (error) {
    const response: AnalysisResponse = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
