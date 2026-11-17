// Solmara Bay 开放世界地图生成：路网、海岸线、6 大街区建筑、棕榈树、Chroma Garage、特技坡道与隐藏包裹

import { DISTRICTS, WORLD } from './config.js';

// 主干道中心线坐标（右侧通行）
export const H_ROADS = [420, 1080, 1740, 2400, 3060];
export const V_ROADS = [480, 1280, 2080, 2880, 3680];

// 海岸线与海滩边界
export const BEACH_X = 3980;
export const OCEAN_X = 4180;
export const DOCK_WATER_Y = 3260;

/** 查询坐标所属街区 */
export function getDistrictAt(x, y) {
  for (let i = 0; i < DISTRICTS.length; i += 1) {
    const d = DISTRICTS[i];
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) {
      return d;
    }
  }
  return DISTRICTS[5];
}

/** 判断坐标是否在海洋水域内（排除木质栈桥） */
export function isWaterAt(x, y, piers) {
  for (let i = 0; i < piers.length; i += 1) {
    const p = piers[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return false;
  }
  const waveOffset = Math.sin(y * 0.004) * 35;
  if (x > OCEAN_X + waveOffset) return true;
  if (y > DOCK_WATER_Y + Math.sin(x * 0.005) * 20 && x > 1800) return true;
  return false;
}

/** 判断坐标是否在任意道路沥青面上 */
export function isOnRoad(x, y) {
  const half = WORLD.roadWidth / 2;
  for (let i = 0; i < H_ROADS.length; i += 1) {
    if (Math.abs(y - H_ROADS[i]) <= half && x >= 120 && x <= 3940) return true;
  }
  for (let i = 0; i < V_ROADS.length; i += 1) {
    if (Math.abs(x - V_ROADS[i]) <= half && y >= 120 && y <= 3240) return true;
  }
  return false;
}

/** 判断矩形是否与任意道路冲突 */
function overlapsRoad(rx, ry, rw, rh, pad = 34) {
  const half = WORLD.roadWidth / 2 + pad;
  for (let i = 0; i < H_ROADS.length; i += 1) {
    const ryRoad = H_ROADS[i];
    if (ry < ryRoad + half && ry + rh > ryRoad - half) return true;
  }
  for (let i = 0; i < V_ROADS.length; i += 1) {
    const rxRoad = V_ROADS[i];
    if (rx < rxRoad + half && rx + rw > rxRoad - half) return true;
  }
  return false;
}

/** 生成 Solmara Bay 静态世界几何数据 */
export function buildCityMap(rand) {
  const buildings = [];
  const palms = [];
  const lamps = [];

  // 木质海滨栈桥与游艇码头
  const piers = [
    { x: 4120, y: 2100, w: 340, h: 72, label: 'Solaris Pier' },
    { x: 2240, y: 3180, w: 80, h: 280, label: 'Neon Dock A' },
    { x: 2640, y: 3180, w: 80, h: 280, label: 'Neon Dock B' },
  ];

  // Chroma Garage 喷漆修车店（全城 2 家）
  const garages = [
    { id: 'garage_palm', name: 'Chroma Garage - Palm Strip', x: 870, y: 1960, w: 150, h: 110, accent: '#ff3b9a' },
    { id: 'garage_ind', name: 'Chroma Garage - Industrial', x: 3180, y: 700, w: 150, h: 110, accent: '#29f0ff' },
  ];

  // 特技飞跃坡道
  const ramps = [
    { id: 'ramp_beach', x: 3810, y: 2480, w: 72, h: 120, angle: 0, dirX: 1, dirY: 0, label: 'Beach Jump' },
    { id: 'ramp_ind', x: 3250, y: 1260, w: 120, h: 72, angle: Math.PI / 2, dirX: 0, dirY: 1, label: 'Yard Stunt' },
    { id: 'ramp_docks', x: 2420, y: 2940, w: 120, h: 72, angle: -Math.PI / 2, dirX: 0, dirY: -1, label: 'Dock Leap' },
  ];

  // 10 个霓虹隐藏包裹
  const packageCoords = [
    [220, 220], [1050, 180], [2480, 180], [3420, 210], [4040, 620],
    [240, 2680], [1560, 2760], [2300, 3410], [4400, 2136], [3920, 1480],
  ];
  const packages = packageCoords.map(([x, y], idx) => ({
    id: idx + 1,
    x,
    y,
    collected: false,
  }));

  // 街区地块划分（道路之间形成规则可建造街区）
  const xBands = [
    [130, 360],
    [600, 1160],
    [1400, 1960],
    [2200, 2760],
    [3000, 3560],
    [3800, 3960],
  ];
  const yBands = [
    [130, 300],
    [540, 960],
    [1200, 1620],
    [1860, 2280],
    [2520, 2940],
  ];

  const roofPalettes = {
    suncrest: ['#f2d7b6', '#e6b89c', '#d8a48f', '#f4e8d1'],
    downtown: ['#2a324b', '#33415c', '#1f283d', '#3e4c6b'],
    industrial: ['#4b4e57', '#5c5346', '#3d405b', '#6d5959'],
    palmstrip: ['#3d2b56', '#4a2c5a', '#2c365e', '#f0a6ca'],
    neondocks: ['#2b2d42', '#3a2e4a', '#264653', '#43284f'],
    oceanbeach: ['#f4d35e', '#ee964b', '#e07a5f', '#f6bd60'],
  };

  const wallPalettes = {
    suncrest: '#d9b99b',
    downtown: '#182032',
    industrial: '#373a40',
    palmstrip: '#291c3a',
    neondocks: '#1d2230',
    oceanbeach: '#c9a679',
  };

  // 在每个街区地块内生成建筑，避开 Chroma Garage 与坡道
  for (let xi = 0; xi < xBands.length; xi += 1) {
    for (let yi = 0; yi < yBands.length; yi += 1) {
      const [bx0, bx1] = xBands[xi];
      const [by0, by1] = yBands[yi];
      const bw = bx1 - bx0;
      const bh = by1 - by0;
      if (bw < 130 || bh < 130) continue;

      const cx = (bx0 + bx1) / 2;
      const cy = (by0 + by1) / 2;
      const dist = getDistrictAt(cx, cy);

      // 保留一部分公园或广场空地，增加城市呼吸感
      if (xi === 1 && yi === 2) {
        // 中央棕榈广场
        for (let p = 0; p < 6; p += 1) {
          palms.push({
            x: bx0 + 55 + (p % 3) * 190 + rand.range(-18, 18),
            y: by0 + 70 + Math.floor(p / 3) * 210 + rand.range(-18, 18),
            size: rand.range(24, 34),
            phase: rand.range(0, Math.PI * 2),
          });
        }
        continue;
      }

      // 判断是否包含车库或坡道
      let blocked = false;
      for (const g of garages) {
        if (bx0 < g.x + g.w + 40 && bx1 > g.x - 40 && by0 < g.y + g.h + 40 && by1 > g.y - 40) {
          blocked = true;
        }
      }
      for (const r of ramps) {
        if (bx0 < r.x + r.w + 30 && bx1 > r.x - 30 && by0 < r.y + r.h + 30 && by1 > r.y - 30) {
          blocked = true;
        }
      }
      if (blocked) continue;

      // 将较大地块分割成 2-3 栋建筑
      const cols = bw > 360 ? 2 : 1;
      const rows = bh > 280 ? 2 : 1;
      const cellW = bw / cols;
      const cellH = bh / rows;

      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          if (rand() < 0.14) continue; // 留出巷道或停车场空位
          const padX = rand.range(14, 28);
          const padY = rand.range(14, 26);
          const w = Math.max(72, cellW - padX * 2);
          const h = Math.max(72, cellH - padY * 2);
          const x = bx0 + c * cellW + padX;
          const y = by0 + r * cellH + padY;

          if (overlapsRoad(x, y, w, h)) continue;

          const isDowntown = dist.id === 'downtown';
          const isPalm = dist.id === 'palmstrip';
          const height = isDowntown
            ? rand.range(110, 230)
            : isPalm
              ? rand.range(65, 135)
              : dist.id === 'suncrest'
                ? rand.range(38, 68)
                : rand.range(50, 105);

          const hasNeon = isPalm || isDowntown || dist.id === 'neondocks' || rand() < 0.35;
          const neonColors = ['#ff3b9a', '#29f0ff', '#ffd166', '#9d4edd', '#38ef7d'];

          buildings.push({
            x,
            y,
            w,
            h,
            height,
            districtId: dist.id,
            roofColor: rand.pick(roofPalettes[dist.id] || roofPalettes.palmstrip),
            wallColor: wallPalettes[dist.id] || '#252936',
            neonColor: hasNeon ? rand.pick(neonColors) : null,
            hasHelipad: isDowntown && w > 140 && h > 120 && rand() < 0.45,
            hasPool: dist.id === 'suncrest' && rand() < 0.55,
          });
        }
      }
    }
  }

  // 沿着 Palm Strip、Ocean Beach 与 Suncrest 道路旁种植棕榈树
  for (let i = 0; i < H_ROADS.length; i += 1) {
    const ry = H_ROADS[i];
    for (let x = 220; x < 3900; x += 260) {
      if (isOnRoad(x, ry - 102)) continue;
      if (rand() < 0.65) {
        palms.push({
          x: x + rand.range(-16, 16),
          y: ry - 104,
          size: rand.range(22, 30),
          phase: rand.range(0, Math.PI * 2),
        });
      }
      if (ry < 2800 && rand() < 0.55) {
        lamps.push({ x: x + 120, y: ry + 96 });
      }
    }
  }

  // 沙滩棕榈树
  for (let y = 300; y < 3100; y += 210) {
    palms.push({
      x: BEACH_X + rand.range(25, 115),
      y: y + rand.range(-25, 25),
      size: rand.range(24, 34),
      phase: rand.range(0, Math.PI * 2),
    });
  }

  return {
    buildings,
    palms,
    lamps,
    piers,
    garages,
    ramps,
    packages,
  };
}

/** 检测圆形实体与建筑碰撞并推回 */
export function resolveCircleBuildingCollisions(entity, buildings) {
  let collided = false;
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i];
    const nearX = Math.max(b.x, Math.min(entity.x, b.x + b.w));
    const nearY = Math.max(b.y, Math.min(entity.y, b.y + b.h));
    const dx = entity.x - nearX;
    const dy = entity.y - nearY;
    const distSq = dx * dx + dy * dy;
    const r = entity.radius;
    if (distSq < r * r) {
      collided = true;
      const dist = Math.sqrt(distSq) || 0.001;
      const overlap = r - dist;
      if (distSq > 0.0001) {
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
      } else {
        entity.y -= r;
      }
    }
  }
  return collided;
}
