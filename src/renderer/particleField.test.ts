import { describe, expect, it } from "vitest";
import { particleAudioGates, particleVisualEnergy } from "@/renderer/particleField";

describe("particleVisualEnergy", () => {
  it("uses rms as the main signal with bass and onset accents", () => {
    const silent = particleVisualEnergy(() => 0, 1);
    const energetic = particleVisualEnergy((source) => {
      switch (source) {
        case "rms":
          return 0.5;
        case "bass":
          return 0.4;
        case "onset":
          return 0.8;
        case "mid":
        case "high":
        case "beat":
          return 0;
        default: {
          const exhaustive: never = source;
          throw new Error(`Unhandled modulation source: ${String(exhaustive)}`);
        }
      }
    }, 1);

    expect(silent).toBe(0);
    expect(energetic).toBeGreaterThan(0.7);
  });
});

describe("particleAudioGates", () => {
  it("keeps default-reactive silence mostly still and dim", () => {
    const gates = particleAudioGates(0, 0.8);

    expect(gates.motion).toBeGreaterThanOrEqual(0.05);
    expect(gates.motion).toBeLessThanOrEqual(0.1);
    expect(gates.brightness).toBeGreaterThanOrEqual(0.15);
    expect(gates.brightness).toBeLessThanOrEqual(0.25);
  });

  it("preserves full motion and brightness on peaks", () => {
    const gates = particleAudioGates(1, 0.8);

    expect(gates.motion).toBe(1);
    expect(gates.brightness).toBe(1);
  });

  it("lets zero reactivity keep current autonomous behavior", () => {
    const gates = particleAudioGates(0, 0);

    expect(gates.motion).toBe(1);
    expect(gates.brightness).toBe(1);
  });
});
