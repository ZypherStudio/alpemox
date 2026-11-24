export type GameSfxType =
  | 'jump'
  | 'coin'
  | 'hit'
  | 'win'
  | 'bounce'
  | 'shoot'
  | 'dash'
  | 'checkpoint'
  | 'powerup';

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return AudioCtx ? new AudioCtx() : null;
  } catch {
    return null;
  }
}

export function playGameSfx(type: GameSfxType, muted = false): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const triggerNote = (
      freqStart: number,
      freqEnd: number,
      duration: number,
      delay = 0,
      wave: OscillatorType = 'sine',
      gainPeak = 0.13,
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freqStart, now + delay);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + delay + duration);
      gain.gain.setValueAtTime(gainPeak, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration + 0.02);
    };

    switch (type) {
      case 'jump':
        triggerNote(240, 520, 0.14, 0, 'triangle', 0.12);
        break;
      case 'bounce':
        triggerNote(220, 960, 0.24, 0, 'sine', 0.14);
        break;
      case 'dash':
        triggerNote(520, 180, 0.12, 0, 'sawtooth', 0.09);
        break;
      case 'shoot':
        triggerNote(880, 220, 0.11, 0, 'square', 0.07);
        break;
      case 'coin':
        triggerNote(880, 1320, 0.1, 0, 'sine', 0.14);
        triggerNote(1320, 1760, 0.12, 0.07, 'sine', 0.11);
        break;
      case 'powerup':
        triggerNote(440, 880, 0.12, 0, 'triangle', 0.13);
        triggerNote(660, 1320, 0.18, 0.09, 'triangle', 0.14);
        break;
      case 'checkpoint':
        triggerNote(587.33, 880, 0.16, 0, 'triangle', 0.12);
        triggerNote(880, 1174.66, 0.18, 0.1, 'triangle', 0.12);
        break;
      case 'hit':
        triggerNote(180, 65, 0.22, 0, 'sawtooth', 0.14);
        break;
      case 'win':
        triggerNote(523.25, 523.25, 0.14, 0, 'triangle', 0.14);
        triggerNote(659.25, 659.25, 0.14, 0.11, 'triangle', 0.14);
        triggerNote(783.99, 1046.5, 0.28, 0.22, 'triangle', 0.15);
        break;
    }

    window.setTimeout(() => {
      void ctx.close();
    }, 900);
  } catch {
    // Ignore WebAudio restrictions
  }
}

export class SynthMusicLoop {
  private timer: number | null = null;
  private ctx: AudioContext | null = null;
  private step = 0;

  start(): void {
    this.stop();
    const ctx = getAudioContext();
    if (!ctx) return;
    this.ctx = ctx;
    this.step = 0;

    // Upbeat minor-pentatonic arcade bass + arp sequence
    const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
    const leadNotes = [440, 523.25, 659.25, 523.25, 587.33, 659.25, 783.99, 659.25];

    this.timer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const idx = this.step % bassNotes.length;

      const bass = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bass.type = 'triangle';
      bass.frequency.setValueAtTime(bassNotes[idx], now);
      bGain.gain.setValueAtTime(0.055, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      bass.connect(bGain);
      bGain.connect(this.ctx.destination);
      bass.start(now);
      bass.stop(now + 0.2);

      if (this.step % 2 === 0) {
        const lead = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lead.type = 'square';
        lead.frequency.setValueAtTime(leadNotes[idx], now);
        lGain.gain.setValueAtTime(0.025, now);
        lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        lead.connect(lGain);
        lGain.connect(this.ctx.destination);
        lead.start(now);
        lead.stop(now + 0.16);
      }

      this.step += 1;
    }, 220);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
