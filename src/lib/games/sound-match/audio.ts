// src/lib/games/sound-match/audio.ts
'use client';

class SoundMatchAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterVolume = 0.8;
  private activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private sequenceTimeouts: NodeJS.Timeout[] = [];

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  /**
   * Stop any actively playing tones immediately with a tiny 10ms micro-fade to prevent pops.
   */
  public stopAll() {
    this.sequenceTimeouts.forEach((t) => clearTimeout(t));
    this.sequenceTimeouts = [];

    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    for (const { osc, gain } of this.activeNodes) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.015);
        osc.stop(now + 0.02);
      } catch {}
    }
    this.activeNodes = [];
  }

  /**
   * Plays a pitch tone for a specified duration with smooth envelope.
   */
  public playTone(
    frequency: number,
    durationSeconds = 1.2,
    waveform: OscillatorType = 'sine'
  ): Promise<void> {
    if (this.muted) return Promise.resolve();
    const ctx = this.getContext();
    if (!ctx) return Promise.resolve();

    this.stopAll();

    return new Promise((resolve) => {
      try {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = waveform;
        osc.frequency.setValueAtTime(frequency, t);

        const peakGain = 0.3 * this.masterVolume;

        // Anti-click attack and smooth exponential decay
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(peakGain, t + 0.025);
        gain.gain.setValueAtTime(peakGain, t + durationSeconds - 0.08);
        gain.gain.linearRampToValueAtTime(0.0001, t + durationSeconds);

        osc.connect(gain);
        gain.connect(ctx.destination);

        const nodeItem = { osc, gain };
        this.activeNodes.push(nodeItem);

        osc.start(t);
        osc.stop(t + durationSeconds);

        osc.onended = () => {
          this.activeNodes = this.activeNodes.filter((n) => n !== nodeItem);
          resolve();
        };

        // Fallback resolution
        const timeout = setTimeout(resolve, durationSeconds * 1000 + 50);
        this.sequenceTimeouts.push(timeout);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Plays A/B comparison: Target tone, brief pause, then Guess tone.
   */
  public async playComparisonSequence(
    targetFreq: number,
    guessFreq: number,
    toneDuration = 1.0,
    gapMs = 250
  ): Promise<void> {
    if (this.muted) return;
    this.stopAll();

    await this.playTone(targetFreq, toneDuration, 'sine');
    await new Promise((r) => {
      const t = setTimeout(r, gapMs);
      this.sequenceTimeouts.push(t);
    });
    await this.playTone(guessFreq, toneDuration, 'sine');
  }

  /**
   * Ascending pleasant chime for high scores or round reveals.
   */
  public playCelebrationChime() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, idx) => {
        const start = t + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        const peak = 0.22 * this.masterVolume;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(peak, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch {}
  }
}

export const soundAudio = new SoundMatchAudioEngine();
