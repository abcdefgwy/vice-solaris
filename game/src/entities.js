// 实体管理与世界状态初始化：玩家、AI 车辆、行人、子弹、粒子、现金掉落与轮胎印

import { PLAYER_CFG, VEHICLE_TYPES, WEAPONS, WORLD } from './config.js';
import { H_ROADS, V_ROADS, buildCityMap, isWaterAt } from './world.js';

let nextEntityId = 1;

/** 创建车辆实体 */
export function createVehicle(typeId, x, y, angle, rand, options = {}) {
  const spec = VEHICLE_TYPES[typeId] || VEHICLE_TYPES.sports;
  const color = options.color || rand.pick(spec.colors);
  return {
    id: nextEntityId++,
    typeId,
    name: spec.name,
    x,
    y,
    z: 0,
    vz: 0,
    vx: 0,
    vy: 0,
    angle,
    speed: 0,
    w: spec.w,
    h: spec.h,
    radius: Math.max(spec.w, spec.h) * 0.44,
    hp: spec.hp,
    maxHp: spec.hp,
    color,
    driver: options.driver || 'none', // 'none' | 'player' | 'traffic' | 'police' | 'swat' | 'enemy'
    aiLaneAxis: options.aiLaneAxis || 'h',
    aiLaneDir: options.aiLaneDir || 1,
    aiTurnCooldown: 0,
    sirenOn: options.sirenOn || false,
    sirenPhase: rand.range(0, Math.PI * 2),
    drifting: false,
    burning: false,
    wrecked: false,
    wreckTimer: 0,
    missionTag: options.missionTag || null,
  };
}

/** 创建行人/敌对单位实体 */
export function createPed(x, y, rand, options = {}) {
  const shirtPalette = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8', '#f8f9fa', '#00cec9'];
  const role = options.role || 'civilian'; // 'civilian' | 'police' | 'swat' | 'gang'
  const hp = role === 'swat' ? 140 : role === 'police' ? 85 : role === 'gang' ? 95 : 45;
  return {
    id: nextEntityId++,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: rand.range(0, Math.PI * 2),
    radius: 12,
    hp,
    maxHp: hp,
    role,
    shirt: role === 'police' ? '#1c2b4a' : role === 'swat' ? '#161b22' : role === 'gang' ? '#d90429' : rand.pick(shirtPalette),
    hair: rand.pick(['#1a1a1a', '#4a3728', '#d4a373', '#b5651d']),
    state: options.state || 'wander', // 'wander' | 'flee' | 'attack' | 'dead'
    fleeTimer: 0,
    fireCooldown: rand.range(0.3, 1.0),
    walkPhase: rand.range(0, Math.PI * 2),
    deadTimer: 0,
    missionTag: options.missionTag || null,
  };
}

/** 初始化完整世界状态 */
export function createWorld(rand, savedData = null) {
  const map = buildCityMap(rand);

  const state = {
    time: 0,
    map,
    player: {
      x: 1020,
      y: 1790,
      vx: 0,
      vy: 0,
      angle: 0,
      radius: PLAYER_CFG.radius,
      hp: PLAYER_CFG.maxHp,
      maxHp: PLAYER_CFG.maxHp,
      armor: 50,
      maxArmor: PLAYER_CFG.maxArmor,
      cash: savedData?.cash ?? 1250,
      wantedStars: 0,
      wantedHeat: 0,
      wantedCooldown: 0,
      weaponIndex: 0,
      ammo: WEAPONS.map((w) => (w.infinite ? 999 : Math.floor(w.maxAmmo * 0.7))),
      fireCooldown: 0,
      meleeCooldown: 0,
      meleeSwing: 0,
      vehicleId: null,
      stamina: 100,
      walkPhase: 0,
      bustedOrWasted: null, // null | 'wasted' | 'busted'
      respawnTimer: 0,
      stats: {
        packagesCollected: savedData?.packagesCollected ?? 0,
        missionsCompleted: savedData?.missionsCompleted ?? 0,
        maxWanted: savedData?.maxWanted ?? 0,
        stuntsDone: savedData?.stuntsDone ?? 0,
      },
    },
    vehicles: [],
    peds: [],
    projectiles: [],
    particles: [],
    skidmarks: [],
    pickups: [],
    floatingTexts: [],
    camera: {
      x: 1020,
      y: 1790,
      zoom: 1,
      shake: 0,
    },
    mission: {
      activeId: null,
      stage: 0,
      timer: 0,
      targetsKilled: 0,
      targetsTotal: 0,
      checkpoints: [],
      checkpointIndex: 0,
      objectiveText: 'Explore Solmara Bay or approach a glowing Mission Beacon (E)',
      targetPos: null,
      completedIds: savedData?.completedIds ? [...savedData.completedIds] : [],
      bannerText: '',
      bannerTimer: 0,
    },
    policeSpawnTimer: 1.5,
    roadblockSpawnedStars: 0,
    districtNotice: { name: 'Palm Strip Boulevard', timer: 3.0 },
    lastDistrictId: 'palmstrip',
    events: {
      shotsFired: 0,
      explosions: 0,
      cashPicked: 0,
      missionState: null,
      stuntCash: 0,
    },
  };

  // 恢复已收集包裹状态
  if (savedData?.collectedPackageIds) {
    const set = new Set(savedData.collectedPackageIds);
    for (const pkg of state.map.packages) {
      if (set.has(pkg.id)) pkg.collected = true;
    }
  }

  // 在玩家出生点附近停放一辆帅气的 Solara GT 跑车与一辆 Vipera V8
  state.vehicles.push(createVehicle('sports', 1110, 1796, 0, rand, { color: '#ff3b9a', driver: 'none' }));
  state.vehicles.push(createVehicle('muscle', 920, 1690, Math.PI, rand, { color: '#ffd166', driver: 'none' }));
  state.vehicles.push(createVehicle('sports', 3850, 2240, -Math.PI / 2, rand, { color: '#29f0ff', driver: 'none' }));

  // 生成沿道路行驶的 AI 交通车辆
  const trafficTypes = ['sports', 'muscle', 'taxi', 'van', 'taxi', 'sports'];
  for (let i = 0; i < H_ROADS.length; i += 1) {
    const ry = H_ROADS[i];
    for (let k = 0; k < 5; k += 1) {
      const dir = k % 2 === 0 ? 1 : -1;
      const x = 350 + k * 740 + rand.range(-80, 80);
      const y = ry + dir * 36;
      if (isWaterAt(x, y, map.piers)) continue;
      state.vehicles.push(
        createVehicle(rand.pick(trafficTypes), x, y, dir === 1 ? 0 : Math.PI, rand, {
          driver: 'traffic',
          aiLaneAxis: 'h',
          aiLaneDir: dir,
        }),
      );
    }
  }
  for (let i = 0; i < V_ROADS.length; i += 1) {
    const rx = V_ROADS[i];
    for (let k = 0; k < 4; k += 1) {
      const dir = k % 2 === 0 ? 1 : -1;
      const y = 320 + k * 760 + rand.range(-70, 70);
      const x = rx - dir * 36;
      if (isWaterAt(x, y, map.piers)) continue;
      state.vehicles.push(
        createVehicle(rand.pick(trafficTypes), x, y, dir === 1 ? Math.PI / 2 : -Math.PI / 2, rand, {
          driver: 'traffic',
          aiLaneAxis: 'v',
          aiLaneDir: dir,
        }),
      );
    }
  }

  // 巡逻警车（平时在市中心与棕榈大道巡逻，不开警笛）
  state.vehicles.push(createVehicle('police', 1650, 1116, 0, rand, { driver: 'police', aiLaneAxis: 'h', aiLaneDir: 1 }));
  state.vehicles.push(createVehicle('police', 2116, 2000, -Math.PI / 2, rand, { driver: 'police', aiLaneAxis: 'v', aiLaneDir: 1 }));

  // 在人行道与海滩生成市民行人
  for (let i = 0; i < 65; i += 1) {
    let px = 0;
    let py = 0;
    if (i < 50) {
      const ry = rand.pick(H_ROADS);
      px = rand.range(240, 3860);
      py = ry + (rand() < 0.5 ? -94 : 94);
    } else {
      // 沙滩游客
      px = rand.range(3990, 4120);
      py = rand.range(450, 2950);
    }
    if (!isWaterAt(px, py, map.piers)) {
      state.peds.push(createPed(px, py, rand, { role: 'civilian' }));
    }
  }

  return state;
}

/** 添加爆炸粒子与火焰冲击波 */
export function spawnExplosion(state, x, y, radius, rand, audio) {
  state.camera.shake = Math.max(state.camera.shake, 16);
  state.events.explosions += 1;
  if (audio) audio.playExplosion();

  // 冲击波光环
  state.particles.push({
    kind: 'shockwave',
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 12,
    maxRadius: radius * 1.15,
    life: 0.35,
    maxLife: 0.35,
    color: '#ffae42',
  });

  // 火焰与浓烟粒子
  for (let i = 0; i < 28; i += 1) {
    const ang = rand.range(0, Math.PI * 2);
    const spd = rand.range(40, 280);
    const isSmoke = i > 16;
    state.particles.push({
      kind: isSmoke ? 'smoke' : 'fire',
      x: x + rand.range(-10, 10),
      y: y + rand.range(-10, 10),
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      radius: isSmoke ? rand.range(12, 24) : rand.range(8, 18),
      life: isSmoke ? rand.range(0.6, 1.2) : rand.range(0.25, 0.55),
      maxLife: isSmoke ? 1.2 : 0.55,
      color: isSmoke ? '#2b2d42' : rand.pick(['#ff5400', '#ffbd00', '#ff0054']),
    });
  }

  // 对范围内车辆与行人造成伤害
  for (let i = 0; i < state.vehicles.length; i += 1) {
    const v = state.vehicles[i];
    if (v.wrecked) continue;
    const dist = Math.hypot(v.x - x, v.y - y);
    if (dist < radius) {
      const dmg = (1 - dist / radius) * 220;
      v.hp -= dmg;
      v.vx += ((v.x - x) / (dist || 1)) * 220;
      v.vy += ((v.y - y) / (dist || 1)) * 220;
    }
  }

  for (let i = 0; i < state.peds.length; i += 1) {
    const p = state.peds[i];
    if (p.state === 'dead') continue;
    const dist = Math.hypot(p.x - x, p.y - y);
    if (dist < radius) {
      p.hp -= (1 - dist / radius) * 180;
    } else if (dist < radius * 2.5 && p.role === 'civilian') {
      p.state = 'flee';
      p.fleeTimer = 5;
    }
  }

  // 玩家若在步行且靠近爆炸点也会受伤
  if (state.player.vehicleId === null && !state.player.bustedOrWasted) {
    const dist = Math.hypot(state.player.x - x, state.player.y - y);
    if (dist < radius * 0.85) {
      const dmg = (1 - dist / (radius * 0.85)) * 70;
      applyPlayerDamage(state, dmg);
    }
  }
}

/** 对玩家施加伤害（优先消耗护甲） */
export function applyPlayerDamage(state, amount) {
  const pl = state.player;
  if (pl.bustedOrWasted) return;
  let rem = amount;
  if (pl.armor > 0) {
    const absorbed = Math.min(pl.armor, rem * 0.75);
    pl.armor -= absorbed;
    rem -= absorbed;
  }
  pl.hp = Math.max(0, pl.hp - rem);
  if (pl.hp <= 0) {
    pl.bustedOrWasted = 'wasted';
    pl.respawnTimer = 3.2;
    pl.vehicleId = null;
  }
}

/** 增加通缉热度并更新 1-5 星级 */
export function addCrimeHeat(state, amount, thresholds) {
  const pl = state.player;
  pl.wantedHeat = Math.min(1300, pl.wantedHeat + amount);
  pl.wantedCooldown = 14;
  let stars = 0;
  for (let s = 1; s < thresholds.length; s += 1) {
    if (pl.wantedHeat >= thresholds[s]) stars = s;
  }
  pl.wantedStars = Math.max(pl.wantedStars, stars);
  if (pl.wantedStars > pl.stats.maxWanted) {
    pl.stats.maxWanted = pl.wantedStars;
  }
}

/** 添加浮动提示文字 */
export function addFloatingText(state, x, y, text, color = '#ffd166') {
  state.floatingTexts.push({
    x,
    y,
    text,
    color,
    life: 1.5,
    maxLife: 1.5,
  });
}
