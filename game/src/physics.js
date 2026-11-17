// 核心物理引擎与 AI 模拟：步行/驾驶/漂移、抢车、枪战、特技坡道、Chroma Garage、交通/行人/1-5星警察 AI

import {
  PLAYER_CFG,
  VEHICLE_TYPES,
  WANTED_THRESHOLDS,
  WEAPONS,
  WORLD,
} from './config.js';
import {
  addCrimeHeat,
  addFloatingText,
  applyPlayerDamage,
  createPed,
  createVehicle,
  spawnExplosion,
} from './entities.js';
import { updateMissions, writeSaveData } from './missions.js';
import {
  H_ROADS,
  V_ROADS,
  getDistrictAt,
  isWaterAt,
  resolveCircleBuildingCollisions,
} from './world.js';

/** 将角度归一化到 [-PI, PI] */
function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** 玩家开火逻辑 */
function fireWeapon(state, rand, audio) {
  const pl = state.player;
  const w = WEAPONS[pl.weaponIndex];
  if (pl.fireCooldown > 0) return;
  if (!w.infinite && pl.ammo[pl.weaponIndex] <= 0) return;

  pl.fireCooldown = w.fireRate;
  if (!w.infinite) pl.ammo[pl.weaponIndex] -= 1;

  state.events.shotsFired += 1;
  if (audio) audio.playGunshot(w.id);

  // 触发枪口火光粒子
  const muzzleX = pl.x + Math.cos(pl.angle) * 22;
  const muzzleY = pl.y + Math.sin(pl.angle) * 22;
  state.particles.push({
    kind: 'muzzle',
    x: muzzleX,
    y: muzzleY,
    vx: 0,
    vy: 0,
    radius: w.id === 'launcher' ? 14 : 9,
    life: 0.08,
    maxLife: 0.08,
    color: w.color,
  });

  // 惊吓附近行人
  for (let i = 0; i < state.peds.length; i += 1) {
    const p = state.peds[i];
    if (p.role === 'civilian' && p.state === 'wander') {
      if (Math.hypot(p.x - pl.x, p.y - pl.y) < 380) {
        p.state = 'flee';
        p.fleeTimer = 6;
      }
    }
  }

  addCrimeHeat(state, w.explosive ? 45 : 14, WANTED_THRESHOLDS);

  for (let i = 0; i < w.pellets; i += 1) {
    const spread = rand.range(-w.spread, w.spread);
    const ang = pl.angle + spread;
    state.projectiles.push({
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(ang) * w.speed,
      vy: Math.sin(ang) * w.speed,
      damage: w.damage,
      distLeft: w.range,
      color: w.color,
      owner: 'player',
      explosive: w.explosive,
      blastRadius: w.blastRadius || 0,
    });
  }
}

/** 玩家近战攻击 */
function doMelee(state, audio) {
  const pl = state.player;
  if (pl.meleeCooldown > 0) return;
  pl.meleeCooldown = PLAYER_CFG.meleeCooldown;
  pl.meleeSwing = 0.2;
  if (audio) audio.playMelee();

  for (let i = 0; i < state.peds.length; i += 1) {
    const p = state.peds[i];
    if (p.state === 'dead') continue;
    const dx = p.x - pl.x;
    const dy = p.y - pl.y;
    const d = Math.hypot(dx, dy);
    if (d < PLAYER_CFG.meleeRange) {
      p.hp -= PLAYER_CFG.meleeDamage;
      p.vx += (dx / (d || 1)) * 220;
      p.vy += (dy / (d || 1)) * 220;
      addCrimeHeat(state, 20, WANTED_THRESHOLDS);
    }
  }
}

/** 抢车或上下车 */
function toggleVehicle(state, rand, audio) {
  const pl = state.player;
  if (pl.vehicleId !== null) {
    // 下车
    const car = state.vehicles.find((v) => v.id === pl.vehicleId);
    if (car) {
      car.driver = 'none';
      car.sirenOn = false;
      const sideX = -Math.sin(car.angle) * (car.h * 0.9 + 14);
      const sideY = Math.cos(car.angle) * (car.h * 0.9 + 14);
      pl.x = car.x + sideX;
      pl.y = car.y + sideY;
      pl.angle = car.angle;
    }
    pl.vehicleId = null;
    return;
  }

  // 寻找最近未报废的车辆
  let best = null;
  let bestDist = PLAYER_CFG.jackRadius;
  for (let i = 0; i < state.vehicles.length; i += 1) {
    const v = state.vehicles[i];
    if (v.wrecked) continue;
    const d = Math.hypot(v.x - pl.x, v.y - pl.y);
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  }

  if (!best) return;

  // 若车内有司机，将其拉出车外
  if (best.driver !== 'none') {
    const ejectedRole = best.driver === 'police' || best.driver === 'swat' ? 'police' : 'civilian';
    const ped = createPed(
      best.x + Math.sin(best.angle) * 34,
      best.y - Math.cos(best.angle) * 34,
      rand,
      { role: ejectedRole, state: ejectedRole === 'police' ? 'attack' : 'flee' },
    );
    ped.fleeTimer = 8;
    state.peds.push(ped);
    addCrimeHeat(state, ejectedRole === 'police' ? 95 : 42, WANTED_THRESHOLDS);
    addFloatingText(state, best.x, best.y - 25, 'CARJACKED!', '#ff3b9a');
  }

  best.driver = 'player';
  pl.vehicleId = best.id;
  pl.x = best.x;
  pl.y = best.y;
  if (audio) audio.playDoor();
}

/** 车辆物理步进 */
function stepVehiclePhysics(v, throttle, steer, handbrake, dt, state, rand, audio) {
  const spec = VEHICLE_TYPES[v.typeId] || VEHICLE_TYPES.sports;

  // 处理滞空特技（z > 0）
  if (v.z > 0 || v.vz > 0) {
    v.vz -= 420 * dt;
    v.z += v.vz * dt;
    if (v.z <= 0) {
      v.z = 0;
      v.vz = 0;
      state.camera.shake = Math.max(state.camera.shake, 7);
    }
  } else {
    // 检测特技坡道飞跃
    for (let i = 0; i < state.map.ramps.length; i += 1) {
      const r = state.map.ramps[i];
      if (v.x >= r.x && v.x <= r.x + r.w && v.y >= r.y && v.y <= r.y + r.h && Math.abs(v.speed) > 330) {
        v.vz = Math.min(240, Math.abs(v.speed) * 0.42);
        v.z = 2;
        if (v.driver === 'player') {
          const bonus = 250;
          state.player.cash += bonus;
          state.player.stats.stuntsDone += 1;
          state.events.stuntCash += bonus;
          addFloatingText(state, v.x, v.y - 30, `STUNT JUMP +$${bonus}`, '#29f0ff');
          if (audio) audio.playCash();
        }
        break;
      }
    }
  }

  const fwdX = Math.cos(v.angle);
  const fwdY = Math.sin(v.angle);
  const rightX = -fwdY;
  const rightY = fwdX;

  let forwardVel = v.vx * fwdX + v.vy * fwdY;
  let lateralVel = v.vx * rightX + v.vy * rightY;

  if (throttle > 0) {
    forwardVel += spec.accel * throttle * dt;
  } else if (throttle < 0) {
    if (forwardVel > 20) {
      forwardVel -= spec.brake * (-throttle) * dt;
    } else {
      forwardVel += spec.accel * 0.55 * throttle * dt;
    }
  } else {
    // 自然滑行阻力
    forwardVel *= Math.exp(-1.5 * dt);
  }

  forwardVel = Math.max(-spec.reverseSpeed, Math.min(spec.maxSpeed, forwardVel));

  // 转向灵敏度与速度相关
  const speedRatio = Math.min(1, Math.abs(forwardVel) / 140);
  const dirSign = forwardVel >= -5 ? 1 : -1;
  const turnMult = handbrake ? 1.28 : 1.0;
  v.angle = normalizeAngle(v.angle + steer * spec.turnRate * turnMult * speedRatio * dirSign * dt);

  // 漂移侧向摩擦力
  const grip = handbrake ? spec.driftGrip : spec.grip;
  lateralVel *= Math.exp(-grip * dt);
  if (handbrake) forwardVel *= Math.exp(-0.9 * dt);

  v.drifting = (handbrake && Math.abs(forwardVel) > 150) || Math.abs(lateralVel) > 95;

  // 生成轮胎印
  if (v.drifting && v.z <= 1) {
    const rearX = v.x - Math.cos(v.angle) * (v.w * 0.38);
    const rearY = v.y - Math.sin(v.angle) * (v.w * 0.38);
    state.skidmarks.push({
      x: rearX + rightX * (v.h * 0.32),
      y: rearY + rightY * (v.h * 0.32),
      x2: rearX - rightX * (v.h * 0.32),
      y2: rearY - rightY * (v.h * 0.32),
      angle: v.angle,
      life: 6.0,
    });
    if (state.skidmarks.length > 420) state.skidmarks.shift();
  }

  const newFwdX = Math.cos(v.angle);
  const newFwdY = Math.sin(v.angle);
  const newRightX = -newFwdY;
  const newRightY = newFwdX;

  v.vx = newFwdX * forwardVel + newRightX * lateralVel;
  v.vy = newFwdY * forwardVel + newRightY * lateralVel;
  v.speed = forwardVel;

  v.x += v.vx * dt;
  v.y += v.vy * dt;

  // 世界边界限制
  v.x = Math.max(40, Math.min(WORLD.width - 40, v.x));
  v.y = Math.max(40, Math.min(WORLD.height - 40, v.y));

  // 落水检测
  if (isWaterAt(v.x, v.y, state.map.piers) && v.z < 5) {
    v.hp = 0;
    if (v.driver === 'player') {
      applyPlayerDamage(state, 999);
    }
  }

  // 与建筑碰撞检测
  const prevX = v.x;
  const prevY = v.y;
  if (resolveCircleBuildingCollisions(v, state.map.buildings)) {
    const impact = Math.hypot(v.vx, v.vy);
    if (impact > 210) {
      v.hp -= (impact - 190) * 0.08;
      if (v.driver === 'player') {
        state.camera.shake = Math.max(state.camera.shake, 6);
        if (audio) audio.playCrash();
      }
    }
    v.vx *= 0.35;
    v.vy *= 0.35;
    if (Math.hypot(v.x - prevX, v.y - prevY) > 1) {
      v.speed *= 0.35;
    }
  }
}

/** 更新 AI 交通车、敌对运钞车及警车 */
function stepVehicleAI(v, dt, state, rand) {
  const pl = state.player;
  if (v.driver === 'police' || v.driver === 'swat') {
    const activeChase = pl.wantedStars > 0 && !pl.bustedOrWasted;
    v.sirenOn = activeChase;
    if (activeChase) {
      // 追击玩家
      const dx = pl.x - v.x;
      const dy = pl.y - v.y;
      const dist = Math.hypot(dx, dy);
      const targetAngle = Math.atan2(dy, dx);
      const diff = normalizeAngle(targetAngle - v.angle);
      const steer = Math.max(-1, Math.min(1, diff * 2.4));
      const throttle = dist > 70 ? 1 : 0.35;

      // 如果玩家步行且警车贴近，警察下车开火
      if (pl.vehicleId === null && dist < 210 && Math.abs(v.speed) < 180 && rand() < 0.03) {
        const officer = createPed(v.x + 30, v.y + 30, rand, {
          role: v.driver === 'swat' ? 'swat' : 'police',
          state: 'attack',
        });
        state.peds.push(officer);
        v.driver = 'none';
        v.sirenOn = false;
      }
      return { throttle, steer, handbrake: Math.abs(diff) > 1.1 };
    }
  }

  if (v.driver === 'enemy') {
    // 敌对车队持续逃逸或绕行
    v.aiTurnCooldown -= dt;
    if (v.aiTurnCooldown <= 0) {
      v.aiTurnCooldown = rand.range(2.5, 5.0);
      v.aiLaneDir = rand() < 0.5 ? 1 : -1;
    }
    return { throttle: 0.72, steer: 0, handbrake: false };
  }

  // 普通交通车沿道路巡航，遇前方障碍刹车
  let obstacleAhead = false;
  const lookX = v.x + Math.cos(v.angle) * 95;
  const lookY = v.y + Math.sin(v.angle) * 95;
  for (let i = 0; i < state.vehicles.length; i += 1) {
    const other = state.vehicles[i];
    if (other.id === v.id) continue;
    if (Math.hypot(other.x - lookX, other.y - lookY) < 62) {
      obstacleAhead = true;
      break;
    }
  }

  // 到达城市边缘掉头
  if (v.x < 220 || v.x > 3880 || v.y < 220 || v.y > 3160) {
    v.angle = normalizeAngle(v.angle + Math.PI);
    v.x = Math.max(240, Math.min(3860, v.x));
    v.y = Math.max(240, Math.min(3140, v.y));
  }

  // 在十字路口随机转向
  v.aiTurnCooldown = Math.max(0, v.aiTurnCooldown - dt);
  if (v.aiTurnCooldown <= 0) {
    for (let hx = 0; hx < V_ROADS.length; hx += 1) {
      for (let hy = 0; hy < H_ROADS.length; hy += 1) {
        if (Math.hypot(v.x - V_ROADS[hx], v.y - H_ROADS[hy]) < 45) {
          v.aiTurnCooldown = 2.2;
          if (rand() < 0.38) {
            const turn = rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
            v.angle = normalizeAngle(v.angle + turn);
          }
          break;
        }
      }
    }
  }

  return {
    throttle: obstacleAhead ? -0.4 : 0.45,
    steer: 0,
    handbrake: false,
  };
}

/** 警察增援与 SWAT 路障生成 */
function managePoliceSpawns(state, dt, rand) {
  const pl = state.player;
  if (pl.wantedStars <= 0 || pl.bustedOrWasted) {
    state.roadblockSpawnedStars = 0;
    return;
  }

  // 清除过远的旧警车，保持流畅度
  const activePolice = state.vehicles.filter((v) => (v.driver === 'police' || v.driver === 'swat') && !v.wrecked);
  const desiredCount = Math.min(7, pl.wantedStars * 2);

  state.policeSpawnTimer -= dt;
  if (state.policeSpawnTimer <= 0 && activePolice.length < desiredCount) {
    state.policeSpawnTimer = Math.max(1.8, 5.2 - pl.wantedStars * 0.7);
    const spawnDist = 720;
    const ang = rand.range(0, Math.PI * 2);
    const sx = Math.max(240, Math.min(3850, pl.x + Math.cos(ang) * spawnDist));
    const sy = Math.max(240, Math.min(3100, pl.y + Math.sin(ang) * spawnDist));
    if (!isWaterAt(sx, sy, state.map.piers)) {
      const type = pl.wantedStars >= 4 && rand() < 0.45 ? 'swat' : 'police';
      const cruiser = createVehicle(type, sx, sy, Math.atan2(pl.y - sy, pl.x - sx), rand, {
        driver: type,
        sirenOn: true,
      });
      state.vehicles.push(cruiser);
    }
  }

  // 3 星及以上触发路障 SWAT 小队
  if (pl.wantedStars >= 3 && state.roadblockSpawnedStars < pl.wantedStars) {
    state.roadblockSpawnedStars = pl.wantedStars;
    const aheadX = Math.max(280, Math.min(3800, pl.x + Math.cos(pl.angle) * 560));
    const aheadY = Math.max(280, Math.min(3050, pl.y + Math.sin(pl.angle) * 560));
    if (!isWaterAt(aheadX, aheadY, state.map.piers)) {
      state.vehicles.push(
        createVehicle(pl.wantedStars >= 5 ? 'swat' : 'police', aheadX, aheadY, pl.angle + Math.PI / 2, rand, {
          driver: 'none',
          sirenOn: true,
        }),
      );
      state.peds.push(
        createPed(aheadX + 45, aheadY, rand, {
          role: pl.wantedStars >= 4 ? 'swat' : 'police',
          state: 'attack',
        }),
      );
    }
  }
}

/** 主模拟步进函数（固定 dt = 1/60） */
export function stepWorld(state, dt, inputState, rand, audio) {
  state.time += dt;
  state.events.shotsFired = 0;
  state.events.explosions = 0;
  state.events.cashPicked = 0;
  state.events.missionState = null;
  state.events.stuntCash = 0;

  const pl = state.player;

  // 处理 Wasted / Busted 重生倒计时
  if (pl.bustedOrWasted) {
    pl.respawnTimer -= dt;
    if (pl.respawnTimer <= 0) {
      pl.bustedOrWasted = null;
      pl.hp = pl.maxHp;
      pl.armor = 50;
      pl.wantedStars = 0;
      pl.wantedHeat = 0;
      pl.cash = Math.max(0, pl.cash - 200);
      pl.x = 1020;
      pl.y = 1790;
      pl.vehicleId = null;
      addFloatingText(state, pl.x, pl.y - 30, 'HOSPITAL RELEASE (-$200)', '#ff3b9a');
    }
    return;
  }

  // 通缉热度随时间缓慢衰减（若未被警车近距离锁定）
  if (pl.wantedStars > 0) {
    const nearCop = state.vehicles.some(
      (v) => (v.driver === 'police' || v.driver === 'swat') && !v.wrecked && Math.hypot(v.x - pl.x, v.y - pl.y) < 420,
    );
    if (!nearCop) {
      pl.wantedCooldown -= dt;
      if (pl.wantedCooldown <= 0) {
        pl.wantedHeat = Math.max(0, pl.wantedHeat - 35 * dt);
        if (pl.wantedHeat < WANTED_THRESHOLDS[pl.wantedStars]) {
          pl.wantedStars = Math.max(0, pl.wantedStars - 1);
          pl.wantedCooldown = 4;
        }
      }
    } else {
      pl.wantedCooldown = 10;
    }
  }

  // 武器切换 1 - 4
  if (inputState.weaponSlot >= 0 && inputState.weaponSlot < WEAPONS.length) {
    pl.weaponIndex = inputState.weaponSlot;
  }

  // 抢车 / 上下车 / 任务触发（E/F）
  if (inputState.enterVehicle) {
    // 优先检查是否在任务光圈内触发任务
    let nearMission = false;
    if (!state.mission.activeId) {
      updateMissions(state, 0, true, rand, audio);
      nearMission = state.mission.activeId !== null;
    }
    if (!nearMission) {
      toggleVehicle(state, rand, audio);
    }
  }

  pl.fireCooldown = Math.max(0, pl.fireCooldown - dt);
  pl.meleeCooldown = Math.max(0, pl.meleeCooldown - dt);
  pl.meleeSwing = Math.max(0, pl.meleeSwing - dt);

  // 玩家更新：驾驶 vs 步行
  if (pl.vehicleId !== null) {
    const car = state.vehicles.find((v) => v.id === pl.vehicleId);
    if (car && !car.wrecked) {
      const throttle = (inputState.up ? 1 : 0) - (inputState.down ? 1 : 0);
      const steer = (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
      stepVehiclePhysics(car, throttle, steer, inputState.handbrake, dt, state, rand, audio);
      pl.x = car.x;
      pl.y = car.y;
      pl.angle = car.angle;
      if (audio) audio.updateEngine(Math.abs(car.speed), car.drifting);

      // 检测 Chroma Garage 喷漆洗白
      for (const g of state.map.garages) {
        if (car.x >= g.x && car.x <= g.x + g.w && car.y >= g.y && car.y <= g.y + g.h) {
          if (car.hp < car.maxHp || pl.wantedStars > 0) {
            const spec = VEHICLE_TYPES[car.typeId] || VEHICLE_TYPES.sports;
            car.color = rand.pick(spec.colors);
            car.hp = car.maxHp;
            car.burning = false;
            pl.wantedStars = 0;
            pl.wantedHeat = 0;
            addFloatingText(state, car.x, car.y - 36, 'CHROMA RESPRAY! WANTED CLEARED', '#29f0ff');
            if (audio) audio.playMissionPass();
          }
        }
      }
    } else {
      pl.vehicleId = null;
    }
  } else {
    if (audio) audio.updateEngine(0, false);

    // 步行移动与冲刺
    const mx = (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
    const my = (inputState.down ? 1 : 0) - (inputState.up ? 1 : 0);
    const mag = Math.hypot(mx, my);
    const sprinting = inputState.sprint && pl.stamina > 5 && mag > 0;
    if (sprinting) pl.stamina = Math.max(0, pl.stamina - 28 * dt);
    else pl.stamina = Math.min(100, pl.stamina + 18 * dt);

    const moveSpeed = sprinting ? PLAYER_CFG.sprintSpeed : PLAYER_CFG.walkSpeed;
    if (mag > 0) {
      pl.vx = (mx / mag) * moveSpeed;
      pl.vy = (my / mag) * moveSpeed;
      pl.walkPhase += dt * (sprinting ? 14 : 9);
    } else {
      pl.vx = 0;
      pl.vy = 0;
    }

    pl.x = Math.max(30, Math.min(WORLD.width - 30, pl.x + pl.vx * dt));
    pl.y = Math.max(30, Math.min(WORLD.height - 30, pl.y + pl.vy * dt));
    resolveCircleBuildingCollisions(pl, state.map.buildings);

    // 涉水减速或溺水伤害
    if (isWaterAt(pl.x, pl.y, state.map.piers)) {
      applyPlayerDamage(state, 28 * dt);
    }

    // 鼠标瞄准角度
    if (inputState.aimAngle !== null) {
      pl.angle = inputState.aimAngle;
    } else if (mag > 0) {
      pl.angle = Math.atan2(my, mx);
    }

    if (inputState.fire) fireWeapon(state, rand, audio);
    if (inputState.melee) doMelee(state, audio);
  }

  // 更新其他所有车辆
  for (let i = 0; i < state.vehicles.length; i += 1) {
    const v = state.vehicles[i];
    if (v.id === pl.vehicleId) continue;

    if (v.wrecked) {
      v.wreckTimer += dt;
      v.vx *= Math.exp(-3 * dt);
      v.vy *= Math.exp(-3 * dt);
      continue;
    }

    if (v.hp <= 0) {
      v.wrecked = true;
      v.driver = 'none';
      v.sirenOn = false;
      spawnExplosion(state, v.x, v.y, 145, rand, audio);
      continue;
    }

    if (v.hp < v.maxHp * 0.35 && rand() < 0.3) {
      v.burning = true;
      state.particles.push({
        kind: 'smoke',
        x: v.x + Math.cos(v.angle) * 20,
        y: v.y + Math.sin(v.angle) * 20,
        vx: rand.range(-15, 15),
        vy: rand.range(-25, -5),
        radius: rand.range(7, 13),
        life: 0.6,
        maxLife: 0.6,
        color: '#343a40',
      });
    }

    if (v.driver !== 'none') {
      const ai = stepVehicleAI(v, dt, state, rand);
      stepVehiclePhysics(v, ai.throttle, ai.steer, ai.handbrake, dt, state, rand, audio);
    } else {
      stepVehiclePhysics(v, 0, 0, false, dt, state, rand, audio);
    }
  }

  // 车与车碰撞物理与伤害
  for (let i = 0; i < state.vehicles.length; i += 1) {
    const a = state.vehicles[i];
    for (let j = i + 1; j < state.vehicles.length; j += 1) {
      const b = state.vehicles[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minD = a.radius + b.radius;
      if (dist > 0.1 && dist < minD) {
        const overlap = (minD - dist) * 0.5;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const relSpeed = Math.hypot(a.vx - b.vx, a.vy - b.vy);
        if (relSpeed > 150) {
          a.hp -= relSpeed * 0.045;
          b.hp -= relSpeed * 0.045;
          if (a.driver === 'player' && (b.driver === 'police' || b.driver === 'swat')) {
            addCrimeHeat(state, 35, WANTED_THRESHOLDS);
          }
          if (a.driver === 'player' || b.driver === 'player') {
            state.camera.shake = Math.max(state.camera.shake, 5);
            if (audio) audio.playCrash();
          }
        }
        a.vx -= nx * 60;
        a.vy -= ny * 60;
        b.vx += nx * 60;
        b.vy += ny * 60;
      }
    }
  }

  // 更新行人 & 敌对单位 AI
  for (let i = 0; i < state.peds.length; i += 1) {
    const p = state.peds[i];
    if (p.state === 'dead') {
      p.deadTimer += dt;
      continue;
    }

    if (p.hp <= 0) {
      p.state = 'dead';
      // 掉落现金拾取物
      const dropVal = p.role === 'gang' ? rand.int(80, 180) : rand.int(25, 75);
      state.pickups.push({
        kind: 'cash',
        x: p.x,
        y: p.y,
        value: dropVal,
        life: 30,
      });
      if (p.role === 'police' || p.role === 'swat') {
        addCrimeHeat(state, 90, WANTED_THRESHOLDS);
      }
      continue;
    }

    // 车辆高速撞击行人
    for (let vi = 0; vi < state.vehicles.length; vi += 1) {
      const v = state.vehicles[vi];
      if (Math.abs(v.speed) > 95 && Math.hypot(v.x - p.x, v.y - p.y) < v.radius + p.radius) {
        p.hp = 0;
        if (v.driver === 'player') {
          addCrimeHeat(state, 45, WANTED_THRESHOLDS);
        }
        break;
      }
    }

    if (p.state === 'attack') {
      const dx = pl.x - p.x;
      const dy = pl.y - p.y;
      const dist = Math.hypot(dx, dy);
      p.angle = Math.atan2(dy, dx);
      if (dist > 140 && dist < 600) {
        p.x += (dx / dist) * 125 * dt;
        p.y += (dy / dist) * 125 * dt;
        p.walkPhase += dt * 8;
      }
      p.fireCooldown -= dt;
      if (p.fireCooldown <= 0 && dist < 480) {
        p.fireCooldown = p.role === 'swat' ? 0.45 : 0.95;
        const spread = rand.range(-0.12, 0.12);
        const ang = p.angle + spread;
        state.projectiles.push({
          x: p.x + Math.cos(ang) * 16,
          y: p.y + Math.sin(ang) * 16,
          vx: Math.cos(ang) * 820,
          vy: Math.sin(ang) * 820,
          damage: p.role === 'swat' ? 14 : 9,
          distLeft: 520,
          color: '#ff6b6b',
          owner: 'enemy',
          explosive: false,
          blastRadius: 0,
        });
      }
    } else if (p.state === 'flee') {
      p.fleeTimer -= dt;
      const ang = Math.atan2(p.y - pl.y, p.x - pl.x);
      p.angle = ang;
      p.x += Math.cos(ang) * 175 * dt;
      p.y += Math.sin(ang) * 175 * dt;
      p.walkPhase += dt * 11;
      if (p.fleeTimer <= 0) p.state = 'wander';
    } else {
      // 普通漫步
      if (rand() < 0.01) p.angle += rand.range(-0.9, 0.9);
      p.x += Math.cos(p.angle) * 42 * dt;
      p.y += Math.sin(p.angle) * 42 * dt;
      p.walkPhase += dt * 4;
    }

    p.x = Math.max(40, Math.min(WORLD.width - 40, p.x));
    p.y = Math.max(40, Math.min(WORLD.height - 40, p.y));
    resolveCircleBuildingCollisions(p, state.map.buildings);
  }

  // 投射物更新与命中检测
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const b = state.projectiles[i];
    const stepX = b.vx * dt;
    const stepY = b.vy * dt;
    b.x += stepX;
    b.y += stepY;
    b.distLeft -= Math.hypot(stepX, stepY);

    let hit = b.distLeft <= 0;

    // 命中建筑
    for (let bi = 0; bi < state.map.buildings.length && !hit; bi += 1) {
      const bd = state.map.buildings[bi];
      if (b.x >= bd.x && b.x <= bd.x + bd.w && b.y >= bd.y && b.y <= bd.y + bd.h) {
        hit = true;
      }
    }

    // 命中车辆
    for (let vi = 0; vi < state.vehicles.length && !hit; vi += 1) {
      const v = state.vehicles[vi];
      if (b.owner === 'player' && v.id === pl.vehicleId) continue;
      if (Math.hypot(b.x - v.x, b.y - v.y) < v.radius) {
        v.hp -= b.damage;
        hit = true;
        if (b.owner === 'player' && (v.driver === 'police' || v.driver === 'swat')) {
          addCrimeHeat(state, 30, WANTED_THRESHOLDS);
        }
      }
    }

    // 命中行人或玩家
    if (!hit && b.owner === 'player') {
      for (let pi = 0; pi < state.peds.length; pi += 1) {
        const p = state.peds[pi];
        if (p.state === 'dead') continue;
        if (Math.hypot(b.x - p.x, b.y - p.y) < p.radius + 4) {
          p.hp -= b.damage;
          hit = true;
          break;
        }
      }
    } else if (!hit && b.owner === 'enemy' && pl.vehicleId === null) {
      if (Math.hypot(b.x - pl.x, b.y - pl.y) < pl.radius + 4) {
        applyPlayerDamage(state, b.damage);
        hit = true;
      }
    }

    if (hit) {
      if (b.explosive) {
        spawnExplosion(state, b.x, b.y, b.blastRadius, rand, audio);
      } else {
        state.particles.push({
          kind: 'spark',
          x: b.x,
          y: b.y,
          vx: rand.range(-80, 80),
          vy: rand.range(-80, 80),
          radius: 4,
          life: 0.16,
          maxLife: 0.16,
          color: '#ffd166',
        });
      }
      state.projectiles.splice(i, 1);
    }
  }

  // 拾取现金 & 隐藏包裹
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pk = state.pickups[i];
    pk.life -= dt;
    if (pk.life <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }
    if (Math.hypot(pk.x - pl.x, pk.y - pl.y) < 34) {
      pl.cash += pk.value;
      state.events.cashPicked += pk.value;
      addFloatingText(state, pk.x, pk.y - 16, `+$${pk.value}`, '#38ef7d');
      if (audio) audio.playCash();
      state.pickups.splice(i, 1);
    }
  }

  for (const pkg of state.map.packages) {
    if (!pkg.collected && Math.hypot(pkg.x - pl.x, pkg.y - pl.y) < 36) {
      pkg.collected = true;
      pl.stats.packagesCollected += 1;
      pl.cash += 500;
      pl.armor = pl.maxArmor;
      addFloatingText(state, pkg.x, pkg.y - 24, `PACKAGE ${pl.stats.packagesCollected}/10 +$500`, '#29f0ff');
      if (audio) audio.playCash();
      writeSaveData(state);
    }
  }

  // 更新粒子、轮胎印、漂浮文字
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const pt = state.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.skidmarks.length - 1; i >= 0; i -= 1) {
    state.skidmarks[i].life -= dt;
    if (state.skidmarks[i].life <= 0) state.skidmarks.splice(i, 1);
  }
  for (let i = state.floatingTexts.length - 1; i >= 0; i -= 1) {
    const ft = state.floatingTexts[i];
    ft.life -= dt;
    ft.y -= 28 * dt;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }

  // 清理过期死亡行人与报废车辆
  state.peds = state.peds.filter((p) => p.state !== 'dead' || p.deadTimer < 10);
  state.vehicles = state.vehicles.filter((v) => !v.wrecked || v.wreckTimer < 16);

  // 街区切换提示
  const dist = getDistrictAt(pl.x, pl.y);
  if (dist.id !== state.lastDistrictId) {
    state.lastDistrictId = dist.id;
    state.districtNotice = { name: dist.name, timer: 3.2 };
  }
  if (state.districtNotice.timer > 0) {
    state.districtNotice.timer = Math.max(0, state.districtNotice.timer - dt);
  }

  // 警车增援 & 任务状态更新
  managePoliceSpawns(state, dt, rand);
  updateMissions(state, dt, false, rand, audio);

  // 相机平滑跟随 + 车速动态缩放 + 震屏衰减
  const car = pl.vehicleId !== null ? state.vehicles.find((v) => v.id === pl.vehicleId) : null;
  const targetZoom = car ? Math.max(0.76, 1.0 - Math.abs(car.speed) / 1900) : 1.05;
  state.camera.zoom += (targetZoom - state.camera.zoom) * Math.min(1, dt * 4);
  state.camera.x += (pl.x - state.camera.x) * Math.min(1, dt * 8);
  state.camera.y += (pl.y - state.camera.y) * Math.min(1, dt * 8);
  state.camera.shake = Math.max(0, state.camera.shake - 38 * dt);

  // 警笛音效状态
  if (audio) {
    const sirenNear = pl.wantedStars > 0 && state.vehicles.some(
      (v) => v.sirenOn && Math.hypot(v.x - pl.x, v.y - pl.y) < 750,
    );
    audio.setSiren(sirenNear);
  }
}
