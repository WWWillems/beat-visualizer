/**
 * Playback transport driven by the Web Audio clock. The render loop asks the
 * transport for the current time every frame, so visuals stay locked to the
 * audio rather than to requestAnimationFrame timing.
 */
export class PlaybackTransport {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private buffer: AudioBuffer | null = null;
  private contextStartTime = 0;
  private playheadAtStart = 0;
  private pausedAt = 0;
  private playing = false;
  private endedCallback: (() => void) | null = null;

  setBuffer(buffer: AudioBuffer | null): void {
    this.stopSource();
    this.buffer = buffer;
    this.pausedAt = 0;
    this.playing = false;
  }

  setGain(gain: number): void {
    if (this.gainNode) this.gainNode.gain.value = gain;
  }

  onEnded(callback: (() => void) | null): void {
    this.endedCallback = callback;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Current playhead in seconds, valid whether playing or paused. */
  getTime(): number {
    if (!this.playing || !this.context) return this.pausedAt;
    return this.playheadAtStart + (this.context.currentTime - this.contextStartTime);
  }

  play(fromSeconds?: number): void {
    if (!this.buffer) return;
    const startAt = fromSeconds ?? this.pausedAt;
    this.stopSource();

    this.context ??= new AudioContext();
    void this.context.resume();
    this.gainNode ??= this.context.createGain();
    this.gainNode.connect(this.context.destination);

    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.gainNode);
    source.onended = () => {
      // Only fires for natural end or stop(); ignore if we already restarted.
      if (this.source === source) {
        this.pausedAt = this.getTime();
        this.playing = false;
        this.endedCallback?.();
      }
    };

    const clamped = Math.min(Math.max(0, startAt), this.buffer.duration);
    source.start(0, clamped);
    this.source = source;
    this.contextStartTime = this.context.currentTime;
    this.playheadAtStart = clamped;
    this.playing = true;
  }

  pause(): number {
    if (!this.playing) return this.pausedAt;
    this.pausedAt = this.getTime();
    this.stopSource();
    this.playing = false;
    return this.pausedAt;
  }

  seek(seconds: number): void {
    const wasPlaying = this.playing;
    this.pausedAt = Math.max(0, seconds);
    if (wasPlaying) {
      this.play(this.pausedAt);
    }
  }

  private stopSource(): void {
    if (this.source) {
      const source = this.source;
      this.source = null;
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
      source.disconnect();
    }
  }
}

export const transport = new PlaybackTransport();
