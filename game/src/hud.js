// 游戏 HUD 与 UI 覆盖层：左下角实时雷达小地图、右上角通缉星/现金/武器/街区、任务横幅、标题与暂停界面

import { PALETTE, WEAPONS, WORLD } from './config.js';
import { MISSION_DEFS } from './missions.js';
import { BEACH_X, H_ROADS, V_ROADS, getDistrictAt } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';

/** 绘制左下角实时雷达小地图 */
function drawMinimap(ctx, state, viewH) {
  const size = 168;
  const x0 = 20;
  const y0 = viewH - size - 20;
  const cx = x0 + size / 2;
  const cy = y0 + size / 2;
  const mapScale = 0.085; // 覆盖玩家周围约 2000px 视野

  ctx.save();
  // 外框与背景
  ctx.fillStyle = 'rgba(10, 15, 24, 0.86)';
  ctx.beginPath();
  ctx.roundRect(x0, y0, size, size, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(41, 240, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(x0 + 2, y0 + 2, size - 4, size - 4, 10);
  ctx.clip();

  const pl = state.player;
  const toMiniX = (wx) => cx + (wx - pl.x) * mapScale;
  const toMiniY = (wy) => cy + (wy - pl.y) * mapScale;

  // 海洋区域
  ctx.fillStyle = '#0c3e5e';
  const oceanMiniX = toMiniX(BEACH_X + 120);
  if (oceanMiniX < x0 + size) {
    ctx.fillRect(Math.max(x0, oceanMiniX), y0, x0 + size - Math.max(x0, oceanMiniX), size);
  }

  // 道路网
  ctx.strokeStyle = 'rgba(180, 195, 215, 0.35)';
  ctx.lineWidth = 6;
  for (const ry of H_ROADS) {
    const my = toMiniY(ry);
    ctx.beginPath();
    ctx.moveTo(x0, my);
    ctx.lineTo(x0 + size, my);
    ctx.stroke();
  }
  for (const rx of V_ROADS) {
    const mx = toMiniX(rx);
    ctx.beginPath();
    ctx.moveTo(mx, y0);
    ctx.lineTo(mx, y0 + size);
    ctx.stroke();
  }

  // 建筑轮廓
  ctx.fillStyle = 'rgba(65, 80, 108, 0.72)';
  for (let i = 0; i < state.map.buildings.length; i += 1) {
    const b = state.map.buildings[i];
    const mx = toMiniX(b.x);
    const my = toMiniY(b.y);
    const mw = b.w * mapScale;
    const mh = b.h * mapScale;
    if (mx + mw < x0 || mx > x0 + size || my + mh < y0 || my > y0 + size) continue;
    ctx.fillRect(mx, my, mw, mh);
  }

  // Chroma Garage 青色图标
  for (const g of state.map.garages) {
    const gx = Math.max(x0 + 8, Math.min(x0 + size - 8, toMiniX(g.x + g.w / 2)));
    const gy = Math.max(y0 + 8, Math.min(y0 + size - 8, toMiniY(g.y + g.h / 2)));
    ctx.fillStyle = '#29f0ff';
    ctx.fillRect(gx - 4, gy - 4, 8, 8);
  }

  // 任务标记点（夹紧在雷达边缘，便于导航）
  if (state.mission.targetPos) {
    const tx = Math.max(x0 + 10, Math.min(x0 + size - 10, toMiniX(state.mission.targetPos.x)));
    const ty = Math.max(y0 + 10, Math.min(y0 + size - 10, toMiniY(state.mission.targetPos.y)));
    ctx.fillStyle = PALETTE.neonGold;
    ctx.beginPath();
    ctx.arc(tx, ty, 5.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (const def of MISSION_DEFS) {
      const mx = toMiniX(def.x);
      const my = toMiniY(def.y);
      if (mx >= x0 && mx <= x0 + size && my >= y0 && my <= y0 + size) {
        ctx.fillStyle = state.mission.completedIds.includes(def.id) ? '#38ef7d' : '#ff3b9a';
        ctx.beginPath();
        ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 警察红蓝闪烁光点
  const copFlash = Math.sin(state.time * 16) > 0;
  for (let i = 0; i < state.vehicles.length; i += 1) {
    const v = state.vehicles[i];
    if ((v.driver === 'police' || v.driver === 'swat') && !v.wrecked) {
      const vx = toMiniX(v.x);
      const vy = toMiniY(v.y);
      if (vx >= x0 && vx <= x0 + size && vy >= y0 && vy <= y0 + size) {
        ctx.fillStyle = v.sirenOn ? (copFlash ? '#ff2a55' : '#2998ff') : '#5aa9ff';
        ctx.beginPath();
        ctx.arc(vx, vy, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 玩家中心箭头
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(pl.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/** 绘制右上角核心状态栏（通缉星、现金、武器弹药、血量护甲、街区名） */
function drawTopRightHud(ctx, state, viewW) {
  const pl = state.player;
  const dist = getDistrictAt(pl.x, pl.y);
  const wpn = WEAPONS[pl.weaponIndex];
  const ammo = wpn.infinite ? 'INF' : String(pl.ammo[pl.weaponIndex]);

  const panelW = 270;
  const x0 = viewW - panelW - 20;
  const y0 = 18;

  ctx.save();
  ctx.fillStyle = PALETTE.hudBg;
  ctx.beginPath();
  ctx.roundRect(x0, y0, panelW, 134, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 1-5 星通缉等级
  const starFlash = Math.sin(state.time * 12) > 0;
  for (let s = 1; s <= 5; s += 1) {
    const sx = x0 + 22 + (s - 1) * 28;
    const sy = y0 + 24;
    const active = s <= pl.wantedStars;
    ctx.fillStyle = active ? (starFlash ? '#ffd166' : '#ff3b9a') : 'rgba(255,255,255,0.16)';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', sx, sy);
  }

  // 现金显示
  ctx.fillStyle = PALETTE.neonGreen;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`$${pl.cash.toLocaleString()}`, x0 + panelW - 16, y0 + 28);

  // 生命值条
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(x0 + 16, y0 + 42, 114, 10);
  ctx.fillStyle = '#ff4d6d';
  ctx.fillRect(x0 + 16, y0 + 42, 114 * (pl.hp / pl.maxHp), 10);

  // 护甲条
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(x0 + 140, y0 + 42, 114, 10);
  ctx.fillStyle = '#29f0ff';
  ctx.fillRect(x0 + 140, y0 + 42, 114 * (pl.armor / pl.maxArmor), 10);

  // 武器与弹药
  ctx.fillStyle = '#f8f9fa';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`[${wpn.slot}] ${wpn.name}`, x0 + 16, y0 + 76);

  ctx.fillStyle = PALETTE.neonGold;
  ctx.textAlign = 'right';
  ctx.fillText(`AMMO ${ammo}`, x0 + panelW - 16, y0 + 76);

  // 街区名称与包裹进度
  ctx.fillStyle = dist.accent;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(dist.name.toUpperCase(), x0 + 16, y0 + 102);

  ctx.fillStyle = '#9aa5b1';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(
    `Missions ${pl.stats.missionsCompleted}/5  •  Packages ${pl.stats.packagesCollected}/10`,
    x0 + 16,
    y0 + 122,
  );
  ctx.restore();
}

/** 绘制顶部任务目标横幅与右下角车速/提示 */
function drawObjectiveAndControls(ctx, state, viewW, viewH) {
  const m = state.mission;
  // 顶部任务目标条
  const barW = Math.min(620, viewW - 360);
  const bx = viewW / 2 - barW / 2;
  ctx.save();
  ctx.fillStyle = PALETTE.hudBg;
  ctx.beginPath();
  ctx.roundRect(bx, 18, barW, 40, 10);
  ctx.fill();
  ctx.strokeStyle = m.activeId ? PALETTE.neonGold : 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = m.activeId ? PALETTE.neonGold : '#e2e8f0';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const timerSuffix = m.activeId ? `  [${Math.max(0, Math.ceil(m.timer))}s]` : '';
  ctx.fillText(`${m.objectiveText}${timerSuffix}`, viewW / 2, 43);

  // 居中大横幅（任务启动/完成）
  if (m.bannerTimer > 0) {
    ctx.fillStyle = 'rgba(10, 14, 24, 0.84)';
    ctx.beginPath();
    ctx.roundRect(viewW / 2 - 240, viewH * 0.2, 480, 56, 12);
    ctx.fill();
    ctx.fillStyle = m.bannerText.includes('PASSED') ? PALETTE.neonGreen : PALETTE.neonPink;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(m.bannerText, viewW / 2, viewH * 0.2 + 36);
  } else if (state.districtNotice.timer > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'italic bold 22px system-ui, sans-serif';
    ctx.fillText(state.districtNotice.name, viewW / 2, 92);
  }

  // 右下角车速表与控制说明
  const pl = state.player;
  if (pl.vehicleId !== null) {
    const car = state.vehicles.find((v) => v.id === pl.vehicleId);
    if (car) {
      const mph = Math.round(Math.abs(car.speed) * 0.22);
      ctx.fillStyle = PALETTE.hudBg;
      ctx.beginPath();
      ctx.roundRect(viewW - 210, viewH - 84, 190, 64, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.neonCyan;
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${mph} MPH`, viewW - 34, viewH - 46);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`${car.name} • SPACE Drift`, viewW - 34, viewH - 27);
    }
  }

  // 底部操作条
  ctx.fillStyle = 'rgba(12, 16, 26, 0.65)';
  ctx.beginPath();
  ctx.roundRect(viewW / 2 - 275, viewH - 42, 550, 26, 8);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'WASD Move/Drive • E/F Jack Car / Start Mission • 1-4 Weapons • LMB Fire • Space Drift • P Pause',
    viewW / 2,
    viewH - 24,
  );

  // Wasted / Busted 遮罩
  if (pl.bustedOrWasted) {
    ctx.fillStyle = 'rgba(15, 5, 12, 0.62)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = '#ff2a55';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText(pl.bustedOrWasted.toUpperCase(), viewW / 2, viewH / 2);
  }

  ctx.restore();
}

/** 绘制标题画面或暂停菜单 */
function drawMenuOverlay(ctx, screen, viewW, viewH) {
  ctx.save();
  ctx.fillStyle = screen === SCREEN_TITLE ? 'rgba(8, 12, 24, 0.56)' : 'rgba(8, 12, 24, 0.72)';
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.textAlign = 'center';
  if (screen === SCREEN_TITLE) {
    ctx.shadowColor = '#ff3b9a';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ff3b9a';
    ctx.font = 'italic 900 68px system-ui, sans-serif';
    ctx.fillText('VICE SOLARIS', viewW / 2, viewH * 0.34);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#29f0ff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('SOLMARA BAY  •  OPEN-WORLD ACTION & DRIVING', viewW / 2, viewH * 0.34 + 42);

    ctx.fillStyle = 'rgba(12, 18, 32, 0.85)';
    ctx.beginPath();
    ctx.roundRect(viewW / 2 - 220, viewH * 0.52, 440, 124, 14);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f8f9fa';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('Press SPACE, ENTER or CLICK to Enter Solmara Bay', viewW / 2, viewH * 0.52 + 44);
    ctx.fillStyle = '#9aa5b1';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('6 Districts • 5 Missions • 1-5 Star Heat • Drift & Stunt Jumps', viewW / 2, viewH * 0.52 + 80);
    ctx.fillText('Controls: WASD, E/F Enter Car, 1-4 Weapons, LMB Shoot, M Mute', viewW / 2, viewH * 0.52 + 102);
  } else if (screen === SCREEN_PAUSED) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.fillText('PAUSED', viewW / 2, viewH * 0.44);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Press P or ESC to Resume', viewW / 2, viewH * 0.44 + 46);
  }
  ctx.restore();
}

/** 绘制完整 HUD 层 */
export function renderHud(ctx, state, screen, viewW, viewH) {
  if (screen === SCREEN_TITLE) {
    drawMenuOverlay(ctx, screen, viewW, viewH);
    return;
  }
  drawMinimap(ctx, state, viewH);
  drawTopRightHud(ctx, state, viewW);
  drawObjectiveAndControls(ctx, state, viewW, viewH);
  if (screen === SCREEN_PAUSED) {
    drawMenuOverlay(ctx, screen, viewW, viewH);
  }
}
