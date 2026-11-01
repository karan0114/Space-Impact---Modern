/**
 * Authentic Nokia 3310-inspired monophonic & 8-bit sound synthesizer
 * Built entirely with browser Web Audio API — zero external audio assets.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    // Loaded lazily on first user interaction
    const savedMute = localStorage.getItem('space_impact_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.28;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public unlock() {
    this.initContext();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('space_impact_muted', String(this.isMuted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.28, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Helper to play square wave tone with envelope
   */
  private playTone(freq: number, duration: number, type: OscillatorType = 'square', freqEnd?: number) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(freq, now);

      if (freqEnd !== undefined && freqEnd !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqEnd), now + duration);
      }

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Procedural filtered white noise for explosions
   */
  private playNoise(duration: number, cutoffStart: number = 800, cutoffEnd: number = 80) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const now = this.ctx.currentTime;
      filter.frequency.setValueAtTime(cutoffStart, now);
      filter.frequency.exponentialRampToValueAtTime(cutoffEnd, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      whiteNoise.start(now);
      whiteNoise.stop(now + duration);
    } catch {
      // Fallback
    }
  }

  // --- Game SFX ---

  public laser() {
    // Classic Nokia high-pitch chirp sweep
    this.playTone(950, 0.08, 'square', 240);
  }

  public twinLaser() {
    this.playTone(1100, 0.09, 'square', 320);
  }

  public plasmaBeam() {
    this.playTone(480, 0.12, 'sawtooth', 720);
  }

  public homingMissile() {
    this.playTone(300, 0.15, 'triangle', 900);
  }

  public nuke() {
    // Massive rumbling explosion
    this.playNoise(0.9, 1400, 40);
    this.playTone(150, 0.8, 'sawtooth', 30);
  }

  public enemyLaser() {
    this.playTone(650, 0.07, 'square', 180);
  }

  public hitEnemy() {
    this.playTone(220, 0.04, 'square', 120);
  }

  public playerHit() {
    this.playNoise(0.2, 500, 50);
    this.playTone(140, 0.22, 'sawtooth', 40);
  }

  public explosion() {
    this.playNoise(0.25, 900, 60);
  }

  public bossExplosion() {
    this.playNoise(0.7, 1200, 30);
    this.playTone(100, 0.5, 'square', 25);
  }

  public powerUp() {
    // Classic Nokia cheerful 4-note arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.08, 'square');
      }, idx * 60);
    });
  }

  public bossAlarm() {
    // Dual emergency warble
    const freqs = [880, 440, 880, 440, 880];
    freqs.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.12, 'square');
      }, idx * 110);
    });
  }

  public stageClear() {
    // Triumphant 8-bit fanfare
    const melody = [
      { f: 523.25, d: 0.1 }, // C5
      { f: 659.25, d: 0.1 }, // E5
      { f: 783.99, d: 0.1 }, // G5
      { f: 1046.5, d: 0.25 } // C6
    ];
    let time = 0;
    melody.forEach((note) => {
      setTimeout(() => {
        this.playTone(note.f, note.d, 'square');
      }, time);
      time += note.d * 1000 + 40;
    });
  }

  public gameOver() {
    // Classic 4-note descending melancholy melody
    const notes = [587.33, 523.25, 466.16, 392.0];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'square');
      }, idx * 180);
    });
  }

  public menuClick() {
    this.playTone(880, 0.03, 'square');
  }

  public menuSelect() {
    this.playTone(660, 0.05, 'square', 990);
  }
}

export const soundEngine = new SoundEngine();
