// 2.5D 透视俯视角渲染器：海水波浪倒影、道路斑马线、2.5D 挤出建筑、车头大灯、警灯、霓虹与爆炸粒子

import { PALETTE, WORLD } from './config.js';
import { MISSION_DEFS } from './missions.js';
import { BEACH_X, DOCK_WATER_Y, H_ROADS, OCEAN_X, V_ROADS } from './world.js';

/** 绘制海水与沙滩海岸线 */
function drawCoastAndOcean(ctx, state, camX, camY, viewW, viewH) {
  // 地面草坪/城市基底
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, OCEAN_X + 120, WORLD.height);

  // 金色沙滩
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(BEACH_X, 0, OCEAN_X - BEACH_X + 90, WORLD.height);

  // 海洋渐变
  const oceanGrad = ctx.createLinearGradient(OCEAN_X, 0, WORLD.width, 0);
  oceanGrad.addColorStop(0, PALETTE.oceanShallow);
  oceanGrad.addColorStop(0.45, PALETTE.oceanMid);
  oceanGrad.addColorStop(1, PALETTE.oceanDeep);
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(OCEAN_X, 0, WORLD.width - OCEAN_X, WORLD.height);

  // 南部码头海湾水域
  const dockGrad = ctx.createLinearGradient(1800, DOCK_WATER_Y, 1800, WORLD.height);
  dockGrad.addColorStop(0, PALETTE.oceanShallow);
  dockGrad.addColorStop(1, PALETTE.oceanDeep);
  ctx.fillStyle = dockGrad;
  ctx.fillRect(1800, DOCK_WATER_Y, WORLD.width - 1800, WORLD.height - DOCK_WATER_Y);

  // 动态浪花与水面霓虹反光
  const t = state.time;
  ctx.strokeStyle = PALETTE.foam;
  ctx.lineWidth = 3;
  const startY = Math.max(40, Math.floor((camY - viewH) / 140) * 140);
  const endY = Math.min(WORLD.height - 40, camY + viewH);
  for (let y = startY; y < endY; y += 70) {
    const waveX = OCEAN_X + Math.sin(y * 0.004) * 35 + Math.sin(t * 2.2 + y * 0.02) * 8;
    ctx.beginPath();
    ctx.moveTo(waveX - 6, y);
    ctx.lineTo(waveX + 14, y + 32);
    ctx.stroke();
  }

  // 海面日落倒影带
  ctx.fillStyle = 'rgba(255, 165, 95, 0.14)';
  for (let i = 0; i < 9; i += 1) {
    const wy = camY - 240 + i * 62 + Math.sin(t * 1.8 + i) * 6;
    const wx = OCEAN_X + 120 + (i % 3) * 70;
    if (wx < WORLD.width - 60) {
      ctx.fillRect(wx, wy, 140 - i * 6, 8);
    }
  }

  // 木质海滨栈桥与码头
  for (const p of state.map.piers) {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(p.x + 8, p.y + 8, p.w, p.h);
    ctx.fillStyle = '#7f5539';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#582f0e';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
}

/** 绘制城市道路网、人行道与斑马线 */
function drawRoads(ctx) {
  const rw = WORLD.roadWidth;
  const sw = WORLD.sidewalkWidth;

  // 人行道基底
  ctx.fillStyle = PALETTE.sidewalk;
  for (const ry of H_ROADS) {
    ctx.fillRect(100, ry - rw / 2 - sw, 3860, rw + sw * 2);
  }
  for (const rx of V_ROADS) {
    ctx.fillRect(rx - rw / 2 - sw, 100, rw + sw * 2, 3160);
  }

  // 柏油路面
  ctx.fillStyle = PALETTE.asphalt;
  for (const ry of H_ROADS) {
    ctx.fillRect(120, ry - rw / 2, 3820, rw);
  }
  for (const rx of V_ROADS) {
    ctx.fillRect(rx - rw / 2, 120, rw, 3120);
  }

  // 道路标线
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.roadLineYellow;
  for (const ry of H_ROADS) {
    ctx.beginPath();
    ctx.moveTo(140, ry);
    ctx.lineTo(3920, ry);
    ctx.stroke();
  }
  for (const rx of V_ROADS) {
    ctx.beginPath();
    ctx.moveTo(rx, 140);
    ctx.lineTo(rx, 3220);
    ctx.stroke();
  }

  // 十字路口斑马线
  ctx.fillStyle = PALETTE.roadLineWhite;
  for (const rx of V_ROADS) {
    for (const ry of H_ROADS) {
      // 十字路口暗色中心块
      ctx.fillStyle = PALETTE.asphaltDark;
      ctx.fillRect(rx - rw / 2, ry - rw / 2, rw, rw);
      ctx.fillStyle = 'rgba(235, 240, 248, 0.72)';
      for (let s = -rw / 2 + 12; s < rw / 2 - 12; s += 22) {
        ctx.fillRect(rx + s, ry - rw / 2 - 14, 11, 10);
        ctx.fillRect(rx + s, ry + rw / 2 + 4, 11, 10);
        ctx.fillRect(rx - rw / 2 - 14, ry + s, 10, 11);
        ctx.fillRect(rx + rw / 2 + 4, ry + s, 10, 11);
      }
    }
  }
}

/** 绘制 Chroma Garage、特技坡道、隐藏包裹与任务触发圈 */
function drawWorldMarkers(ctx, state) {
  const t = state.time;

  // Chroma Garage 喷漆修车店
  for (const g of state.map.garages) {
    ctx.fillStyle = 'rgba(15, 20, 32, 0.9)';
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = g.accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(g.x, g.y, g.w, g.h);

    ctx.fillStyle = g.accent;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHROMA GARAGE', g.x + g.w / 2, g.y + g.h / 2 - 4);
    ctx.fillStyle = '#dfe5ec';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('RESPRAY & CLEAR HEAT', g.x + g.w / 2, g.y + g.h / 2 + 14);
  }

  // 特技坡道
  for (const r of state.map.ramps) {
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.fillStyle = '#33415c';
    ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
    ctx.strokeStyle = PALETTE.neonGold;
    ctx.lineWidth = 3;
    ctx.strokeRect(-r.w / 2, -r.h / 2, r.w, r.h);
    ctx.fillStyle = PALETTE.neonGold;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('>>>', 0, 5);
    ctx.restore();
  }

  // 隐藏包裹
  for (const pkg of state.map.packages) {
    if (pkg.collected) continue;
    const pulse = 1 + Math.sin(t * 5 + pkg.id) * 0.2;
    ctx.save();
    ctx.translate(pkg.x, pkg.y);
    ctx.rotate(t * 2 + pkg.id);
    ctx.fillStyle = PALETTE.neonCyan;
    ctx.shadowColor = PALETTE.neonCyan;
    ctx.shadowBlur = 12;
    ctx.fillRect(-8 * pulse, -8 * pulse, 16 * pulse, 16 * pulse);
    ctx.restore();
  }

  // 现金拾取物
  for (const pk of state.pickups) {
    ctx.save();
    ctx.translate(pk.x, pk.y);
    ctx.fillStyle = PALETTE.neonGreen;
    ctx.fillRect(-9, -6, 18, 12);
    ctx.strokeStyle = '#0f3d21';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-9, -6, 18, 12);
    ctx.restore();
  }

  // 任务触发光圈 / 检查点
  if (!state.mission.activeId) {
    for (const def of MISSION_DEFS) {
      const done = state.mission.completedIds.includes(def.id);
      const col = done ? '#38ef7d' : '#ff3b9a';
      const r = 34 + Math.sin(t * 4) * 5;
      ctx.beginPath();
      ctx.arc(def.x, def.y, r, 0, Math.PI * 2);
      ctx.fillStyle = done ? 'rgba(56, 239, 125, 0.16)' : 'rgba(255, 59, 154, 0.22)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = col;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(def.title.toUpperCase(), def.x, def.y - r - 8);
    }
  } else if (state.mission.targetPos) {
    const tp = state.mission.targetPos;
    const r = 38 + Math.sin(t * 6) * 6;
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = PALETTE.neonGold;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

/** 绘制单个行人或玩家 */
function drawPerson(ctx, x, y, angle, shirt, hair, walkPhase, isPlayer, meleeSwing) {
  ctx.save();
  ctx.translate(x, y);

  // 地面阴影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(3, 5, 13, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(angle);

  // 双脚摆动
  const stride = Math.sin(walkPhase) * 6;
  ctx.fillStyle = '#1b1f2a';
  ctx.fillRect(-4 + stride, -9, 7, 5);
  ctx.fillRect(-4 - stride, 4, 7, 5);

  // 躯干与肩膀
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.roundRect(-8, -11, 16, 22, 5);
  ctx.fill();

  // 头部与头发
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath();
  ctx.arc(2, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(-1, 0, 6.5, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();

  // 武器或近战挥拳效果
  if (isPlayer) {
    ctx.fillStyle = '#111';
    ctx.fillRect(6, 3, 14, 4);
    if (meleeSwing > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(6, 0, 22, -0.9, 0.9);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** 绘制车辆（含阴影、大灯、警灯闪烁、起火/报废状态） */
function drawVehicle(ctx, v, time) {
  ctx.save();
  const zLift = v.z * 0.65;
  ctx.translate(v.x, v.y - zLift);

  // 车辆投影
  ctx.save();
  ctx.translate(6 + v.z * 0.3, 8 + v.z * 0.45);
  ctx.rotate(v.angle);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.roundRect(-v.w / 2, -v.h / 2, v.w, v.h, 7);
  ctx.fill();
  ctx.restore();

  ctx.rotate(v.angle);
  const scale = 1 + v.z * 0.0025;
  ctx.scale(scale, scale);

  // 车头大灯锥形光束
  if (!v.wrecked && (v.driver !== 'none' || v.sirenOn)) {
    const beam = ctx.createLinearGradient(v.w / 2, 0, v.w / 2 + 125, 0);
    beam.addColorStop(0, 'rgba(255, 244, 194, 0.34)');
    beam.addColorStop(1, 'rgba(255, 244, 194, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(v.w / 2 - 2, -v.h * 0.35);
    ctx.lineTo(v.w / 2 + 125, -v.h * 1.15);
    ctx.lineTo(v.w / 2 + 125, v.h * 1.15);
    ctx.lineTo(v.w / 2 - 2, v.h * 0.35);
    ctx.closePath();
    ctx.fill();
  }

  // 车身主体
  ctx.fillStyle = v.wrecked ? '#2a2d34' : v.color;
  ctx.beginPath();
  ctx.roundRect(-v.w / 2, -v.h / 2, v.w, v.h, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 警车白色车门条纹
  if ((v.typeId === 'police' || v.typeId === 'swat') && !v.wrecked) {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(-v.w * 0.16, -v.h / 2 + 1, v.w * 0.32, v.h - 2);
  }

  // 前后挡风玻璃
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.roundRect(-v.w * 0.24, -v.h * 0.36, v.w * 0.48, v.h * 0.72, 4);
  ctx.fill();

  // 车顶
  ctx.fillStyle = v.wrecked ? '#1f2228' : v.color;
  ctx.fillRect(-v.w * 0.14, -v.h * 0.3, v.w * 0.28, v.h * 0.6);

  // 警车红蓝警灯闪烁
  if ((v.typeId === 'police' || v.typeId === 'swat') && v.sirenOn && !v.wrecked) {
    const flash = Math.sin(time * 18 + v.sirenPhase) > 0;
    ctx.fillStyle = flash ? '#ff2a55' : '#2998ff';
    ctx.shadowColor = flash ? '#ff2a55' : '#2998ff';
    ctx.shadowBlur = 18;
    ctx.fillRect(-4, -v.h * 0.28, 8, v.h * 0.28);
    ctx.fillStyle = flash ? '#2998ff' : '#ff2a55';
    ctx.fillRect(-4, 0, 8, v.h * 0.28);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

/** 绘制 2.5D 透视挤出建筑（按距相机远近排序） */
function drawBuildings25D(ctx, buildings, camX, camY, viewW, viewH) {
  const margin = 360;
  const visible = [];
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i];
    if (
      b.x + b.w > camX - viewW / 2 - margin &&
      b.x < camX + viewW / 2 + margin &&
      b.y + b.h > camY - viewH / 2 - margin &&
      b.y < camY + viewH / 2 + margin
    ) {
      visible.push(b);
    }
  }

  // 离相机更远的先画，近处的后画，避免 2.5D 屋顶遮挡穿帮
  visible.sort((a, b) => {
    const da = Math.hypot(a.x + a.w / 2 - camX, a.y + a.h / 2 - camY);
    const db = Math.hypot(b.x + b.w / 2 - camX, b.y + b.h / 2 - camY);
    return db - da;
  });

  const parallaxScale = 0.00052;
  for (let i = 0; i < visible.length; i += 1) {
    const b = visible[i];
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const offX = (cx - camX) * b.height * parallaxScale;
    const offY = (cy - camY) * b.height * parallaxScale;
    const rx = b.x + offX;
    const ry = b.y + offY;

    // 地面投影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.fillRect(b.x + 14, b.y + 16, b.w, b.h);

    // 侧面立面连接多边形
    ctx.fillStyle = b.wallColor;
    // 顶/底面侧墙
    ctx.beginPath();
    if (offY >= 0) {
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + b.w, b.y);
      ctx.lineTo(rx + b.w, ry);
      ctx.lineTo(rx, ry);
    } else {
      ctx.moveTo(b.x, b.y + b.h);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.lineTo(rx + b.w, ry + b.h);
      ctx.lineTo(rx, ry + b.h);
    }
    ctx.closePath();
    ctx.fill();

    // 左/右侧墙
    ctx.fillStyle = '#121622';
    ctx.beginPath();
    if (offX >= 0) {
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x, b.y + b.h);
      ctx.lineTo(rx, ry + b.h);
      ctx.lineTo(rx, ry);
    } else {
      ctx.moveTo(b.x + b.w, b.y);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.lineTo(rx + b.w, ry + b.h);
      ctx.lineTo(rx + b.w, ry);
    }
    ctx.closePath();
    ctx.fill();

    // 屋顶面
    ctx.fillStyle = b.roofColor;
    ctx.fillRect(rx, ry, b.w, b.h);
    ctx.strokeStyle = b.neonColor || 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = b.neonColor ? 2.4 : 1.2;
    ctx.strokeRect(rx, ry, b.w, b.h);

    // 屋顶停机坪或别墅泳池细节
    if (b.hasHelipad) {
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx + b.w / 2, ry + b.h / 2, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 209, 102, 0.75)';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('H', rx + b.w / 2, ry + b.h / 2 + 6);
    } else if (b.hasPool) {
      ctx.fillStyle = '#29f0ff';
      ctx.fillRect(rx + 14, ry + 14, Math.min(44, b.w * 0.4), Math.min(26, b.h * 0.35));
    }
  }
}

/** 绘制热带棕榈树（含随风摆动树冠） */
function drawPalms(ctx, palms, time, camX, camY, viewW, viewH) {
  for (let i = 0; i < palms.length; i += 1) {
    const p = palms[i];
    if (Math.abs(p.x - camX) > viewW || Math.abs(p.y - camY) > viewH) continue;
    const sway = Math.sin(time * 1.9 + p.phase) * 3.5;

    // 阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(p.x + 10, p.y + 12, p.size * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // 树冠叶片
    ctx.save();
    ctx.translate(p.x + sway, p.y);
    for (let f = 0; f < 6; f += 1) {
      ctx.save();
      ctx.rotate((f * Math.PI) / 3 + p.phase);
      ctx.fillStyle = f % 2 === 0 ? '#2b9348' : '#55a630';
      ctx.beginPath();
      ctx.ellipse(p.size * 0.55, 0, p.size * 0.6, p.size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#38b000';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** 渲染完整游戏世界一帧 */
export function renderWorld(ctx, state, canvasWidth, canvasHeight) {
  const cam = state.camera;
  const shakeX = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake : 0;
  const shakeY = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake : 0;

  ctx.save();
  ctx.fillStyle = PALETTE.oceanDeep;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.translate(canvasWidth / 2 + shakeX, canvasHeight / 2 + shakeY);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  const viewW = canvasWidth / cam.zoom;
  const viewH = canvasHeight / cam.zoom;

  drawCoastAndOcean(ctx, state, cam.x, cam.y, viewW, viewH);
  drawRoads(ctx);

  // 轮胎漂移印
  ctx.strokeStyle = 'rgba(15, 17, 22, 0.52)';
  ctx.lineWidth = 4;
  for (let i = 0; i < state.skidmarks.length; i += 1) {
    const s = state.skidmarks[i];
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(s.angle) * 7, s.y + Math.sin(s.angle) * 7);
    ctx.moveTo(s.x2, s.y2);
    ctx.lineTo(s.x2 + Math.cos(s.angle) * 7, s.y2 + Math.sin(s.angle) * 7);
    ctx.stroke();
  }

  drawWorldMarkers(ctx, state);

  // 行人
  for (let i = 0; i < state.peds.length; i += 1) {
    const p = state.peds[i];
    if (Math.abs(p.x - cam.x) > viewW || Math.abs(p.y - cam.y) > viewH) continue;
    if (p.state === 'dead') {
      ctx.fillStyle = 'rgba(140, 12, 24, 0.55)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    drawPerson(ctx, p.x, p.y, p.angle, p.shirt, p.hair, p.walkPhase, false, 0);
  }

  // 玩家（步行时绘制）
  const pl = state.player;
  if (pl.vehicleId === null && !pl.bustedOrWasted) {
    drawPerson(ctx, pl.x, pl.y, pl.angle, '#ff3b9a', '#1b1b1e', pl.walkPhase, true, pl.meleeSwing);
  }

  // 车辆
  for (let i = 0; i < state.vehicles.length; i += 1) {
    const v = state.vehicles[i];
    if (Math.abs(v.x - cam.x) > viewW && Math.abs(v.y - cam.y) > viewH) continue;
    drawVehicle(ctx, v, state.time);
  }

  // 投射物弹道
  for (let i = 0; i < state.projectiles.length; i += 1) {
    const b = state.projectiles[i];
    ctx.strokeStyle = b.color;
    ctx.lineWidth = b.explosive ? 5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022);
    ctx.stroke();
  }

  // 2.5D 建筑与棕榈树冠
  drawBuildings25D(ctx, state.map.buildings, cam.x, cam.y, viewW, viewH);
  drawPalms(ctx, state.map.palms, state.time, cam.x, cam.y, viewW, viewH);

  // 粒子特效（爆炸冲击波、火焰、浓烟、枪口焰）
  for (let i = 0; i < state.particles.length; i += 1) {
    const pt = state.particles[i];
    const alpha = Math.max(0, pt.life / pt.maxLife);
    if (pt.kind === 'shockwave') {
      const r = pt.maxRadius * (1 - alpha);
      ctx.strokeStyle = `rgba(255, 190, 80, ${alpha * 0.85})`;
      ctx.lineWidth = 6 * alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // 漂浮奖励/提示文字
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < state.floatingTexts.length; i += 1) {
    const ft = state.floatingTexts[i];
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // 黄金时刻日落暖光氛围叠加
  const sunGrad = ctx.createRadialGradient(
    canvasWidth * 0.82,
    canvasHeight * 0.14,
    30,
    canvasWidth * 0.6,
    canvasHeight * 0.4,
    canvasWidth * 0.85,
  );
  sunGrad.addColorStop(0, PALETTE.sunGlow);
  sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}
