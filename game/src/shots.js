// 确定性截图场景生成器：?shot=cover|chase|onfoot|mission&seed=1
// 每个场景均运行真实的物理与 AI 模拟步进（stepWorld），确保同一种子输出完全一致的真实游玩画面

import { STEP, WANTED_THRESHOLDS } from './config.js';
import { addCrimeHeat, createVehicle } from './entities.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './hud.js';
import { MISSION_DEFS, startMission } from './missions.js';
import { stepWorld } from './physics.js';

const EMPTY_INPUT = {
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

/** 运行指定步数的真实模拟 */
function runSteps(state, steps, inputFn, rand) {
  for (let i = 0; i < steps; i += 1) {
    const inp = typeof inputFn === 'function' ? inputFn(i) : EMPTY_INPUT;
    stepWorld(state, STEP, inp, rand, null);
  }
}

/** 根据 ?shot= 名称构建对应游玩场景并推进模拟 */
export function stageShot(shotName, state, rand) {
  const mode = shotName === 'start' ? 'cover' : shotName === 'play' ? 'chase' : shotName === 'end' ? 'mission' : shotName;

  if (mode === 'chase') {
    // 场景 2：3 星通缉高速警匪漂移追逐
    const pl = state.player;
    pl.x = 1100;
    pl.y = 1740;
    runSteps(state, 5, (i) => ({ ...EMPTY_INPUT, enterVehicle: i === 0 }), rand);
    addCrimeHeat(state, 460, WANTED_THRESHOLDS); // 触发 3 星通缉

    // 在后方生成追击警车
    state.vehicles.push(createVehicle('police', 760, 1745, 0, rand, { driver: 'police', sirenOn: true }));
    state.vehicles.push(createVehicle('police', 830, 1785, -0.08, rand, { driver: 'police', sirenOn: true }));

    runSteps(
      state,
      110,
      (i) => ({
        ...EMPTY_INPUT,
        up: true,
        right: i > 72 && i < 100,
        handbrake: i > 78 && i < 96,
      }),
      rand,
    );
    return SCREEN_PLAY;
  }

  if (mode === 'onfoot') {
    // 场景 3：步行街头枪战与爆炸火光
    const pl = state.player;
    pl.x = 1280;
    pl.y = 1860;
    pl.weaponIndex = 3; // Hydra RPG 发射一发火箭弹制造震撼爆炸，再切 SMG 扫射
    addCrimeHeat(state, 260, WANTED_THRESHOLDS);

    const targetCar = createVehicle('police', 1520, 1860, Math.PI, rand, { driver: 'police', sirenOn: true });
    state.vehicles.push(targetCar);

    runSteps(
      state,
      65,
      (i) => ({
        ...EMPTY_INPUT,
        right: i > 20,
        fire: i === 2 || (i > 42 && i % 4 === 0),
        weaponSlot: i === 15 ? 1 : -1,
        aimAngle: 0.04,
      }),
      rand,
    );
    return SCREEN_PLAY;
  }

  if (mode === 'mission') {
    // 场景 4：Solmara Vault 金库大劫案任务进行中（4 星通缉突围）
    const pl = state.player;
    pl.x = 2080;
    pl.y = 1080;
    const escapeCar = createVehicle('muscle', 2080, 1080, Math.PI / 2, rand, { color: '#29f0ff' });
    state.vehicles.push(escapeCar);
    runSteps(state, 4, (i) => ({ ...EMPTY_INPUT, enterVehicle: i === 0 }), rand);

    const vaultDef = MISSION_DEFS.find((d) => d.id === 'solmara_vault');
    startMission(state, vaultDef, rand, null);

    state.vehicles.push(createVehicle('swat', 2080, 740, Math.PI / 2, rand, { driver: 'swat', sirenOn: true }));
    state.vehicles.push(createVehicle('police', 1940, 1080, 0, rand, { driver: 'police', sirenOn: true }));

    runSteps(
      state,
      105,
      (i) => ({
        ...EMPTY_INPUT,
        up: true,
        right: i > 60 && i < 82,
      }),
      rand,
    );
    return SCREEN_PLAY;
  }

  // 默认场景 1（cover）：Palm Strip Boulevard 海滨黄金时刻跑车巡航 + 标题叠加
  const pl = state.player;
  pl.x = 3420;
  pl.y = 2400;
  const heroCar = createVehicle('sports', 3420, 2400, 0, rand, { color: '#ff3b9a' });
  state.vehicles.push(heroCar);
  runSteps(state, 4, (i) => ({ ...EMPTY_INPUT, enterVehicle: i === 0 }), rand);
  runSteps(state, 90, () => ({ ...EMPTY_INPUT, up: true }), rand);
  return SCREEN_TITLE;
}
