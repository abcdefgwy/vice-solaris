// Vice Solaris 主入口与固定步长游戏循环
// 支持正常交互游玩以及 ?shot=cover|chase|onfoot|mission&seed=1 确定性截图预览模式

import { createAudio } from './audio.js';
import { STEP } from './config.js';
import { createWorld } from './entities.js';
import { SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, renderHud } from './hud.js';
import { createInput } from './input.js';
import { loadSaveData } from './missions.js';
import { stepWorld } from './physics.js';
import { createRandom } from './random.js';
import { renderWorld } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 42019;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const rand = createRandom(seed);
const saved = shot ? null : loadSaveData();
const state = createWorld(rand, saved);
const audio = createAudio();

let viewW = window.innerWidth;
let viewH = window.innerHeight;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewW = Math.max(320, window.innerWidth);
  viewH = Math.max(240, window.innerHeight);
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function drawFrame(screen) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderWorld(ctx, state, viewW, viewH);
  renderHud(ctx, state, screen, viewW, viewH);
}

function runShotMode(shotName) {
  const screen = stageShot(shotName, state, rand);
  let painted = 0;
  function paint() {
    drawFrame(screen);
    painted += 1;
    if (painted < 2) {
      requestAnimationFrame(paint);
    } else {
      window.__shotReady = true;
    }
  }
  requestAnimationFrame(paint);
}

function runInteractiveGame() {
  const input = createInput(canvas, audio);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let lastTime = performance.now();

  function announce(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - lastTime) / 1000, MAX_FRAME);
    lastTime = now;

    const actions = input.takeSystemActions();
    if (actions.mute) {
      const m = audio.toggleMute();
      announce(m ? 'Audio muted.' : 'Audio unmuted.');
    }

    if (screen === SCREEN_TITLE && actions.confirm) {
      screen = SCREEN_PLAY;
      announce('Welcome to Solmara Bay. Vice Solaris.');
    } else if (actions.pause) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        audio.updateEngine(0, false);
        audio.setSiren(false);
        announce('Game paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Game resumed.');
      }
    }

    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        const sampled = input.sample(state.camera, viewW, viewH, state.player);
        stepWorld(state, STEP, sampled, rand, audio);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_TITLE) {
      // 标题界面背景城市保持轻度实时车流运转
      while (accumulator >= STEP) {
        const idle = {
          up: false,
          down: false,
          left: false,
          right: false,
          sprint: false,
          handbrake: false,
          fire: false,
          aimAngle: null,
          enterVehicle: false,
          melee: false,
          weaponSlot: -1,
        };
        stepWorld(state, STEP, idle, rand, null);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }

    drawFrame(screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.updateEngine(0, false);
      audio.setSiren(false);
    }
  });

  announce('Vice Solaris — Solmara Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShotMode(shot);
else runInteractiveGame();
