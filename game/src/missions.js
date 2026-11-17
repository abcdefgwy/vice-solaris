// Solmara Bay 5 大主线任务与存档系统（localStorage）

import { SAVE_KEY, WANTED_THRESHOLDS } from './config.js';
import { addCrimeHeat, addFloatingText, createPed, createVehicle } from './entities.js';

export const MISSION_DEFS = [
  {
    id: 'harbor_heist',
    title: 'Harbor Heist',
    subtitle: '海港劫案',
    district: 'Neon Docks',
    x: 2180,
    y: 2880,
    reward: 3500,
    description: 'Steal the armored Cargo Mule at Neon Docks and deliver it to Suncrest Villas.',
  },
  {
    id: 'neon_escape',
    title: 'Neon Escape',
    subtitle: '霓虹大逃亡',
    district: 'Palm Strip Boulevard',
    x: 1180,
    y: 1740,
    reward: 2800,
    description: 'Race through 4 coastal checkpoints along Palm Strip and Ocean Beach under 65s.',
  },
  {
    id: 'dockside_showdown',
    title: 'Dockside Showdown',
    subtitle: '码头对决',
    district: 'Neon Docks',
    x: 2660,
    y: 3110,
    reward: 3200,
    description: 'Eliminate all 6 cartel enforcers guarding the Neon Dock piers.',
  },
  {
    id: 'convoy_takedown',
    title: 'Convoy Takedown',
    subtitle: '车队拦截',
    district: 'Industrial Yard',
    x: 3420,
    y: 1080,
    reward: 4200,
    description: 'Intercept and destroy both syndicate vans moving through the Industrial Yard.',
  },
  {
    id: 'solmara_vault',
    title: 'Solmara Vault',
    subtitle: '索尔马拉金库',
    district: 'Downtown Towers',
    x: 2080,
    y: 920,
    reward: 8000,
    description: 'Crack the Downtown Vault (4-Star Heat) and respray at Chroma Garage to escape!',
  },
];

/** 读取本地存档 */
export function loadSaveData() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** 写入本地存档 */
export function writeSaveData(state) {
  try {
    const collectedPackageIds = state.map.packages.filter((p) => p.collected).map((p) => p.id);
    const payload = {
      cash: state.player.cash,
      packagesCollected: state.player.stats.packagesCollected,
      missionsCompleted: state.player.stats.missionsCompleted,
      maxWanted: state.player.stats.maxWanted,
      stuntsDone: state.player.stats.stuntsDone,
      completedIds: state.mission.completedIds,
      collectedPackageIds,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // 隐私模式或无存储权限时忽略
  }
}

/** 清理旧任务残留标签实体 */
function clearMissionEntities(state) {
  state.peds = state.peds.filter((p) => !p.missionTag);
  state.vehicles = state.vehicles.filter((v) => !v.missionTag || v.id === state.player.vehicleId);
}

/** 启动指定任务 */
export function startMission(state, def, rand, audio) {
  clearMissionEntities(state);
  const m = state.mission;
  m.activeId = def.id;
  m.stage = 0;
  m.targetsKilled = 0;
  m.targetsTotal = 0;
  m.checkpoints = [];
  m.checkpointIndex = 0;
  m.bannerText = `MISSION: ${def.title.toUpperCase()}`;
  m.bannerTimer = 3.2;
  if (audio) audio.playMissionStart();

  if (def.id === 'harbor_heist') {
    const truck = createVehicle('van', 2520, 3060, Math.PI, rand, {
      color: '#ffd166',
      driver: 'none',
      missionTag: 'heist_truck',
    });
    state.vehicles.push(truck);
    for (let i = 0; i < 3; i += 1) {
      state.peds.push(
        createPed(2480 + i * 45, 2990, rand, {
          role: 'gang',
          state: 'attack',
          missionTag: 'heist_guard',
        }),
      );
    }
    m.timer = 120;
    m.objectiveText = 'Hijack the Gold Cargo Mule at Neon Docks';
    m.targetPos = { x: truck.x, y: truck.y };
  } else if (def.id === 'neon_escape') {
    m.checkpoints = [
      { x: 1280, y: 2400 },
      { x: 2080, y: 2400 },
      { x: 3680, y: 2400 },
      { x: 3680, y: 1080 },
    ];
    m.checkpointIndex = 0;
    m.timer = 65;
    addCrimeHeat(state, 120, WANTED_THRESHOLDS);
    m.objectiveText = `Reach Checkpoint 1/${m.checkpoints.length} before time runs out!`;
    m.targetPos = m.checkpoints[0];
  } else if (def.id === 'dockside_showdown') {
    const spots = [
      [2280, 3260], [2280, 3360], [2680, 3250],
      [2680, 3360], [2480, 3100], [2820, 3080],
    ];
    for (const [gx, gy] of spots) {
      state.peds.push(
        createPed(gx, gy, rand, {
          role: 'gang',
          state: 'attack',
          missionTag: 'showdown_target',
        }),
      );
    }
    m.targetsTotal = spots.length;
    m.timer = 150;
    m.objectiveText = `Eliminate Cartel Enforcers (0/${spots.length})`;
    m.targetPos = { x: spots[0][0], y: spots[0][1] };
  } else if (def.id === 'convoy_takedown') {
    const v1 = createVehicle('van', 3680, 1450, -Math.PI / 2, rand, {
      color: '#e63946',
      driver: 'enemy',
      aiLaneAxis: 'v',
      aiLaneDir: -1,
      missionTag: 'convoy_van',
    });
    const v2 = createVehicle('van', 3680, 1650, -Math.PI / 2, rand, {
      color: '#e63946',
      driver: 'enemy',
      aiLaneAxis: 'v',
      aiLaneDir: -1,
      missionTag: 'convoy_van',
    });
    state.vehicles.push(v1, v2);
    m.targetsTotal = 2;
    m.timer = 140;
    m.objectiveText = 'Destroy Syndicate Convoy Vans (0/2)';
    m.targetPos = { x: v1.x, y: v1.y };
  } else if (def.id === 'solmara_vault') {
    addCrimeHeat(state, 760, WANTED_THRESHOLDS); // 直接触发 4 星通缉
    m.timer = 150;
    m.objectiveText = '4-STAR HEAT! Respray at Chroma Garage to clear your wanted level!';
    m.targetPos = { x: state.map.garages[0].x + 75, y: state.map.garages[0].y + 55 };
  }
}

/** 完成当前任务 */
function completeMission(state, def, audio) {
  const m = state.mission;
  state.player.cash += def.reward;
  state.player.stats.missionsCompleted += 1;
  if (!m.completedIds.includes(def.id)) {
    m.completedIds.push(def.id);
  }
  m.activeId = null;
  m.targetPos = null;
  m.objectiveText = 'Explore Solmara Bay or approach a glowing Mission Beacon (E)';
  m.bannerText = `MISSION PASSED! +$${def.reward}`;
  m.bannerTimer = 3.8;
  state.events.missionState = 'passed';
  addFloatingText(state, state.player.x, state.player.y - 30, `+$${def.reward}`, '#38ef7d');
  if (audio) audio.playMissionPass();
  clearMissionEntities(state);
  writeSaveData(state);
}

/** 任务失败 */
export function failMission(state, reason) {
  const m = state.mission;
  if (!m.activeId) return;
  m.activeId = null;
  m.targetPos = null;
  m.objectiveText = 'Explore Solmara Bay or approach a glowing Mission Beacon (E)';
  m.bannerText = `MISSION FAILED: ${reason}`;
  m.bannerTimer = 3.5;
  state.events.missionState = 'failed';
  clearMissionEntities(state);
}

/** 每帧更新任务进度与触发检测 */
export function updateMissions(state, dt, triggerPressed, rand, audio) {
  const m = state.mission;
  if (m.bannerTimer > 0) m.bannerTimer = Math.max(0, m.bannerTimer - dt);

  const px = state.player.x;
  const py = state.player.y;

  // 若无激活任务，检测是否走进任务标记圈触发
  if (!m.activeId) {
    if (triggerPressed) {
      for (const def of MISSION_DEFS) {
        if (Math.hypot(px - def.x, py - def.y) < 75) {
          startMission(state, def, rand, audio);
          return;
        }
      }
    }
    return;
  }

  const def = MISSION_DEFS.find((d) => d.id === m.activeId);
  if (!def) return;

  if (state.player.bustedOrWasted) {
    failMission(state, state.player.bustedOrWasted === 'busted' ? 'Busted' : 'Wasted');
    return;
  }

  m.timer -= dt;
  if (m.timer <= 0) {
    failMission(state, 'Time Expired');
    return;
  }

  if (def.id === 'harbor_heist') {
    const truck = state.vehicles.find((v) => v.missionTag === 'heist_truck');
    if (!truck || truck.wrecked) {
      failMission(state, 'Cargo Destroyed');
      return;
    }
    if (m.stage === 0) {
      m.targetPos = { x: truck.x, y: truck.y };
      if (state.player.vehicleId === truck.id) {
        m.stage = 1;
        addCrimeHeat(state, 160, WANTED_THRESHOLDS);
        m.objectiveText = 'Deliver the Cargo Mule to Suncrest Safehouse!';
        m.targetPos = { x: 650, y: 420 };
      }
    } else {
      m.targetPos = { x: 650, y: 420 };
      if (state.player.vehicleId === truck.id && Math.hypot(truck.x - 650, truck.y - 420) < 95) {
        completeMission(state, def, audio);
      }
    }
  } else if (def.id === 'neon_escape') {
    const cp = m.checkpoints[m.checkpointIndex];
    m.targetPos = cp;
    if (Math.hypot(px - cp.x, py - cp.y) < 95) {
      m.checkpointIndex += 1;
      if (audio) audio.playCash();
      if (m.checkpointIndex >= m.checkpoints.length) {
        completeMission(state, def, audio);
      } else {
        m.objectiveText = `Reach Checkpoint ${m.checkpointIndex + 1}/${m.checkpoints.length}!`;
      }
    }
  } else if (def.id === 'dockside_showdown') {
    const alive = state.peds.filter((p) => p.missionTag === 'showdown_target' && p.state !== 'dead');
    m.targetsKilled = m.targetsTotal - alive.length;
    m.objectiveText = `Eliminate Cartel Enforcers (${m.targetsKilled}/${m.targetsTotal})`;
    if (alive.length === 0) {
      completeMission(state, def, audio);
    } else {
      m.targetPos = { x: alive[0].x, y: alive[0].y };
    }
  } else if (def.id === 'convoy_takedown') {
    const aliveVans = state.vehicles.filter((v) => v.missionTag === 'convoy_van' && !v.wrecked);
    m.targetsKilled = m.targetsTotal - aliveVans.length;
    m.objectiveText = `Destroy Syndicate Convoy Vans (${m.targetsKilled}/${m.targetsTotal})`;
    if (aliveVans.length === 0) {
      completeMission(state, def, audio);
    } else {
      m.targetPos = { x: aliveVans[0].x, y: aliveVans[0].y };
    }
  } else if (def.id === 'solmara_vault') {
    // 最近车库指引
    let bestG = state.map.garages[0];
    let bestD = Infinity;
    for (const g of state.map.garages) {
      const d = Math.hypot(px - (g.x + g.w / 2), py - (g.y + g.h / 2));
      if (d < bestD) {
        bestD = d;
        bestG = g;
      }
    }
    m.targetPos = { x: bestG.x + bestG.w / 2, y: bestG.y + bestG.h / 2 };
    if (state.player.wantedStars === 0) {
      completeMission(state, def, audio);
    }
  }
}
