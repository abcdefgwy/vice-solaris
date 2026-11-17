// 纯 WebAudio API 程序化音频合成器（零外部资源）：引擎、漂移、枪声、警笛、爆炸、金钱与任务音效

export function createAudio() {
  let ctx = null;
  let muted = false;
  let unlocked = false;

  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenActive = false;

  function ensureContext() {
    if (muted || unlocked) return ctx;
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain.gain.value = 0;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;

      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
    }

    if (!sirenOsc) {
      sirenOsc = ctx.createOscillator();
      sirenGain = ctx.createGain();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 620;
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
    }

    unlocked = true;
    return ctx;
  }

  function playTone(freqStart, freqEnd, duration, type = 'sine', vol = 0.14) {
    if (muted || !ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playNoise(duration, filterFreq, vol = 0.16) {
    if (muted || !ctx) return;
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(now);
  }

  return {
    unlock() {
      ensureContext();
    },
    toggleMute() {
      muted = !muted;
      if (muted && engineGain) engineGain.gain.value = 0;
      if (muted && sirenGain) sirenGain.gain.value = 0;
      return muted;
    },
    isMuted() {
      return muted;
    },
    updateEngine(speed, drifting) {
      if (!ctx || !engineOsc || !engineGain || muted) return;
      if (speed <= 5) {
        engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        return;
      }
      const rpmFreq = 46 + Math.min(130, speed * 0.19);
      engineOsc.frequency.setTargetAtTime(rpmFreq, ctx.currentTime, 0.05);
      engineGain.gain.setTargetAtTime(0.045, ctx.currentTime, 0.08);
      if (drifting && Math.random() < 0.25) {
        playNoise(0.06, 1800, 0.035);
      }
    },
    setSiren(active) {
      sirenActive = active;
      if (!ctx || !sirenOsc || !sirenGain || muted) return;
      if (!sirenActive) {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        return;
      }
      const t = ctx.currentTime;
      const hiLo = Math.sin(t * 7.5) > 0 ? 780 : 540;
      sirenOsc.frequency.setTargetAtTime(hiLo, t, 0.04);
      sirenGain.gain.setTargetAtTime(0.032, t, 0.08);
    },
    playGunshot(weaponId) {
      if (weaponId === 'shotgun') {
        playNoise(0.22, 1100, 0.24);
        playTone(140, 42, 0.18, 'triangle', 0.2);
      } else if (weaponId === 'launcher') {
        playNoise(0.35, 700, 0.18);
        playTone(240, 85, 0.32, 'sawtooth', 0.16);
      } else if (weaponId === 'smg') {
        playNoise(0.07, 1900, 0.11);
        playTone(280, 90, 0.06, 'square', 0.07);
      } else {
        playNoise(0.1, 1600, 0.14);
        playTone(220, 75, 0.09, 'triangle', 0.12);
      }
    },
    playExplosion() {
      playNoise(0.55, 420, 0.32);
      playTone(110, 24, 0.5, 'sawtooth', 0.24);
    },
    playCrash() {
      playNoise(0.18, 650, 0.16);
    },
    playMelee() {
      playNoise(0.08, 900, 0.1);
    },
    playDoor() {
      playTone(180, 90, 0.07, 'square', 0.08);
    },
    playCash() {
      playTone(880, 1320, 0.12, 'sine', 0.12);
    },
    playMissionStart() {
      playTone(330, 440, 0.16, 'triangle', 0.12);
      setTimeout(() => playTone(440, 660, 0.22, 'triangle', 0.12), 140);
    },
    playMissionPass() {
      playTone(440, 554, 0.15, 'triangle', 0.14);
      setTimeout(() => playTone(554, 659, 0.15, 'triangle', 0.14), 120);
      setTimeout(() => playTone(659, 880, 0.28, 'triangle', 0.15), 240);
    },
  };
}
