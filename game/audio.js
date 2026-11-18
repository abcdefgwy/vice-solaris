/**
 * PELICAN KEY 3D: Sunset Syndicate
 * 纯原生 Web Audio 实时音效与车载电台合成引擎 (零外部音频依赖)
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.radioChannel = 0; // 0: Synthwave, 1: Vice Beats, 2: Sunset Chill, 3: Off
    this.channelNames = [
      '📻 FLASH FM: 80s Synthwave',
      '📻 WAVE 103: Vice Beats',
      '📻 EMOTION 98.3: Sunset Chill',
      '📻 RADIO OFF'
    ];

    // 引擎振荡器节点
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain = null;

    // 电台调度状态
    this.radioInterval = null;
    this.radioStep = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    this.startEngineSound();
    this.startRadio();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ----------------------------------------------------
  // 1. 车载电台合成器 (3 大经典电台频道)
  // ----------------------------------------------------

  startRadio() {
    if (!this.ctx) return;
    if (this.radioInterval) clearInterval(this.radioInterval);

    // 16分音符节拍调度 (BPM 120 = 每 125ms 一拍)
    this.radioInterval = setInterval(() => {
      if (this.radioChannel === 3 || this.isMuted) return;
      this.tickRadio();
      this.radioStep = (this.radioStep + 1) % 32;
    }, 125);
  }

  nextRadioStation() {
    this.radioChannel = (this.radioChannel + 1) % this.channelNames.length;
    this.playClickSound();
    return this.channelNames[this.radioChannel];
  }

  getCurrentStationName() {
    return this.channelNames[this.radioChannel];
  }

  tickRadio() {
    const t = this.ctx.currentTime;
    const step = this.radioStep;

    if (this.radioChannel === 0) {
      // FM 1: 80s Synthwave (F minor / Ab major 经典八分音符琶音)
      const bassNotes = [65.41, 65.41, 77.78, 77.78, 87.31, 87.31, 58.27, 58.27];
      if (step % 2 === 0) {
        const freq = bassNotes[Math.floor(step / 4) % bassNotes.length];
        this.synthBassNote(freq, t, 0.12, 'sawtooth');
      }
      // 底鼓 (四四拍)
      if (step % 4 === 0) this.synthKick(t);
      // 小军鼓 (第 4, 12, 20, 28 拍)
      if (step % 8 === 4) this.synthSnare(t);
      // 主音合成器旋律
      const melody = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25];
      if (step % 4 === 2 && Math.random() > 0.3) {
        const leadFreq = melody[Math.floor(Math.random() * melody.length)];
        this.synthLeadNote(leadFreq, t, 0.28);
      }
    } else if (this.radioChannel === 1) {
      // FM 2: Vice Beats (重低音 808 与切分军鼓)
      if (step === 0 || step === 10 || step === 16 || step === 26) {
        this.synth808Bass(43.65, t);
      }
      if (step % 8 === 4) {
        this.synthSnare(t, 0.18);
      }
      // 快速踩镲
      if (step % 2 === 0 || (step >= 28)) {
        this.synthHiHat(t);
      }
    } else if (this.radioChannel === 2) {
      // FM 3: Sunset Lo-Fi Chill (慵懒和弦电钢琴)
      if (step === 0) {
        this.synthElectricPianoChord([130.81, 164.81, 196.00, 246.94], t); // Cmaj7
      } else if (step === 16) {
        this.synthElectricPianoChord([110.00, 130.81, 164.81, 196.00], t); // Am7
      }
      if (step % 8 === 0) this.synthKick(t, 0.12);
      if (step % 8 === 4) this.synthSnare(t, 0.08);
    }
  }

  // 基础合成乐器构建块
  synthBassNote(freq, t, dur, type = 'sawtooth') {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + dur);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  }

  synthLeadNote(freq, t, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  synth808Bass(freq, t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.8, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  synthElectricPianoChord(notes, t) {
    for (const freq of notes) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 1.8);
    }
  }

  synthKick(t, vol = 0.35) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  synthSnare(t, vol = 0.22) {
    // 噪声军鼓
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  synthHiHat(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'highpass';
    osc.frequency.setValueAtTime(8000, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  // ----------------------------------------------------
  // 2. 跑车 V8 引擎与载具音效
  // ----------------------------------------------------

  startEngineSound() {
    if (!this.ctx) return;
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';

    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.engineGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineGain);
    this.engineOsc2.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  updateEngine(speed, isNos) {
    if (!this.ctx || !this.engineOsc1 || this.isMuted) return;
    const t = this.ctx.currentTime;
    const spd = Math.abs(speed);
    // 随车速调制频率 (45Hz ~ 260Hz)
    const baseFreq = 48 + spd * 3.8 + (isNos ? 65 : 0);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.02, t, 0.05);
    const targetGain = Math.min(0.18, 0.05 + spd * 0.0025);
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.05);
  }

  playDriftTireScreech() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.35;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(4.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  playNosBoost() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.35);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  playCrashSound(intensity = 1.0) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    // 冲击底音
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.3);
    gain.gain.setValueAtTime(0.5 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  // ----------------------------------------------------
  // 3. 枪声、警笛与直升机音效
  // ----------------------------------------------------

  playGunshot(weaponType = 'smg') {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(weaponType === 'shotgun' ? 1800 : 3500, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  playPoliceSiren(step = 0) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const freq = step % 2 === 0 ? 640 : 480;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  playMissionPassed() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    // 经典的 GTA 风格胜利三和弦 (C -> E -> G -> High C)
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.14);
      gain.gain.setValueAtTime(0.35, t + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.14 + 0.85);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.14);
      osc.stop(t + idx * 0.14 + 0.85);
    });
  }

  playClickSound() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(1200, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }
}
