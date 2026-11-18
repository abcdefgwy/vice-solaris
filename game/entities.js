/**
 * PELICAN KEY 3D: Sunset Syndicate
 * 3D 实体模型网格、刚体动力学物理与 AI 控制器
 */

import { Mat4, Vec3 } from './engine3d.js';

// ----------------------------------------------------
// 1. 3D 模型网格生成器 (全部由原生几何顶点拼装)
// ----------------------------------------------------

function createBoxHelper() {
  const v = [];
  const idx = [];
  let baseIndex = 0;

  function addVertex(x, y, z, nx, ny, nz, r, g, b, a = 1.0, u = 0, vCoord = 0) {
    v.push(x, y, z, nx, ny, nz, r, g, b, a, u, vCoord);
  }

  function addBox(x, y, z, w, h, d, r, g, b, a = 1.0) {
    const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
    const cx = x, cy = y + hh, cz = z;

    const faces = [
      { n: [0, 0, 1], p: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]] },
      { n: [0, 0, -1], p: [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]] },
      { n: [0, 1, 0], p: [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]] },
      { n: [0, -1, 0], p: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]] },
      { n: [1, 0, 0], p: [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]] },
      { n: [-1, 0, 0], p: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, -hh, -hd]] },
    ];

    for (const f of faces) {
      const start = baseIndex;
      for (let i = 0; i < 4; i++) {
        const pt = f.p[i];
        addVertex(cx + pt[0], cy + pt[1], cz + pt[2], f.n[0], f.n[1], f.n[2], r, g, b, a, (i === 1 || i === 2) ? 1 : 0, (i >= 2) ? 1 : 0);
      }
      idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
      baseIndex += 4;
    }
  }

  return { v, idx, addBox };
}

// 跑车 (Sunset Cheetah)
export function createSportsCarMesh(renderer, bodyColor = [0.95, 0.28, 0.18]) {
  const { v, idx, addBox } = createBoxHelper();

  // 车底阴影投影薄片 (微贴地)
  addBox(0, 0.04, 0, 2.3, 0.02, 4.6, 0.04, 0.03, 0.06, 0.85);

  // 下底盘 (黑色防护底壳)
  addBox(0, 0.22, 0, 2.05, 0.32, 4.3, 0.12, 0.12, 0.15);

  // 主车身 (流线型涂装)
  addBox(0, 0.45, -0.15, 2.1, 0.48, 4.2, bodyColor[0], bodyColor[1], bodyColor[2]);

  // 前引擎盖倾斜前铲
  addBox(0, 0.38, 1.6, 1.95, 0.26, 1.1, bodyColor[0] * 0.92, bodyColor[1] * 0.92, bodyColor[2] * 0.92);

  // 驾驶舱上部座舱与深色反光车窗
  addBox(0, 0.82, -0.35, 1.68, 0.46, 2.2, 0.1, 0.14, 0.22, 0.95);
  // 车顶面板
  addBox(0, 1.25, -0.4, 1.55, 0.08, 1.7, bodyColor[0], bodyColor[1], bodyColor[2]);

  // 后扰流板 (GT 尾翼)
  addBox(0, 1.18, -2.0, 1.85, 0.08, 0.45, 0.08, 0.08, 0.1);
  addBox(-0.7, 0.92, -1.98, 0.08, 0.32, 0.12, 0.15, 0.15, 0.15);
  addBox(0.7, 0.92, -1.98, 0.08, 0.32, 0.12, 0.15, 0.15, 0.15);

  // 4 个车轮 (带轮毂细节)
  const wheelZ = [1.35, -1.35];
  const wheelX = [-1.02, 1.02];
  for (const wz of wheelZ) {
    for (const wx of wheelX) {
      // 橡胶轮胎
      addBox(wx, 0.12, wz, 0.34, 0.68, 0.68, 0.12, 0.12, 0.14);
      // 银色轮毂
      addBox(wx > 0 ? wx + 0.04 : wx - 0.04, 0.24, wz, 0.12, 0.42, 0.42, 0.78, 0.8, 0.85);
    }
  }

  // 前大灯 (高亮白黄光)
  addBox(-0.75, 0.48, 2.16, 0.42, 0.18, 0.08, 1.0, 0.98, 0.75);
  addBox(0.75, 0.48, 2.16, 0.42, 0.18, 0.08, 1.0, 0.98, 0.75);

  // 后尾灯 (霓虹贯穿式刹车灯)
  addBox(0, 0.62, -2.26, 1.9, 0.14, 0.08, 1.0, 0.12, 0.15);

  // 双排气管
  addBox(-0.45, 0.28, -2.28, 0.16, 0.14, 0.16, 0.25, 0.25, 0.28);
  addBox(0.45, 0.28, -2.28, 0.16, 0.14, 0.16, 0.25, 0.25, 0.28);

  return renderer.createMesh(v, idx);
}

// 警车 (Pelican Key Police Cruiser)
export function createPoliceCarMesh(renderer) {
  const { v, idx, addBox } = createBoxHelper();

  // 底盘与车身黑色部分
  addBox(0, 0.04, 0, 2.3, 0.02, 4.6, 0.04, 0.03, 0.06, 0.85);
  addBox(0, 0.22, 0, 2.05, 0.32, 4.3, 0.12, 0.12, 0.14);
  // 前后引擎盖黑色
  addBox(0, 0.46, 1.5, 2.1, 0.48, 1.5, 0.08, 0.08, 0.1);
  addBox(0, 0.46, -1.5, 2.1, 0.48, 1.5, 0.08, 0.08, 0.1);
  // 车门与车顶白色涂装
  addBox(0, 0.46, 0, 2.1, 0.48, 1.6, 0.92, 0.93, 0.95);
  addBox(0, 1.25, -0.3, 1.65, 0.08, 1.8, 0.92, 0.93, 0.95);

  // 车窗
  addBox(0, 0.82, -0.28, 1.72, 0.48, 2.2, 0.12, 0.15, 0.22);

  // 4 轮
  for (const wz of [1.35, -1.35]) {
    for (const wx of [-1.02, 1.02]) {
      addBox(wx, 0.12, wz, 0.34, 0.68, 0.68, 0.12, 0.12, 0.14);
      addBox(wx > 0 ? wx + 0.04 : wx - 0.04, 0.24, wz, 0.12, 0.38, 0.38, 0.65, 0.68, 0.72);
    }
  }

  // 车头防撞钢梁 (Push Bumper)
  addBox(0, 0.32, 2.28, 1.7, 0.42, 0.18, 0.15, 0.15, 0.18);

  // 车顶警灯架 (Lightbar)
  addBox(0, 1.33, -0.2, 1.4, 0.08, 0.28, 0.2, 0.2, 0.25);
  // 左红警灯
  addBox(-0.45, 1.41, -0.2, 0.45, 0.15, 0.24, 1.0, 0.1, 0.15);
  // 右蓝警灯
  addBox(0.45, 1.41, -0.2, 0.45, 0.15, 0.24, 0.15, 0.35, 1.0);
  // 中间高闪白灯
  addBox(0, 1.41, -0.2, 0.25, 0.15, 0.24, 1.0, 1.0, 0.95);

  return renderer.createMesh(v, idx);
}

// 警用直升机 (Pelican Air Support)
export function createHelicopterMesh(renderer) {
  const { v, idx, addBox } = createBoxHelper();

  // 机身主舱体 (水滴圆滑形分段)
  addBox(0, 1.2, 0.4, 2.2, 2.0, 4.0, 0.08, 0.1, 0.15);
  // 驾驶舱挡风全景大窗 (深色反光)
  addBox(0, 1.4, 1.8, 1.9, 1.4, 1.5, 0.15, 0.35, 0.55);

  // 尾部细长尾梁 (Tail Boom)
  addBox(0, 1.4, -3.2, 0.65, 0.7, 4.2, 0.15, 0.18, 0.22);
  // 尾翼横片与垂尾
  addBox(0, 1.8, -5.2, 0.25, 1.6, 0.8, 0.85, 0.88, 0.92);
  addBox(0, 1.5, -4.8, 2.0, 0.15, 0.6, 0.85, 0.88, 0.92);

  // 左右两侧起落架滑橇 (Skids)
  addBox(-1.3, 0.15, 0.3, 0.18, 0.15, 4.8, 0.3, 0.32, 0.35);
  addBox(1.3, 0.15, 0.3, 0.18, 0.15, 4.8, 0.3, 0.32, 0.35);
  // 滑橇支撑腿
  addBox(-1.0, 0.55, 1.4, 0.12, 0.75, 0.15, 0.25, 0.25, 0.28);
  addBox(1.0, 0.55, 1.4, 0.12, 0.75, 0.15, 0.25, 0.25, 0.28);
  addBox(-1.0, 0.55, -0.8, 0.12, 0.75, 0.15, 0.25, 0.25, 0.28);
  addBox(1.0, 0.55, -0.8, 0.12, 0.75, 0.15, 0.25, 0.25, 0.28);

  // 机顶主旋翼轴心塔
  addBox(0, 2.3, 0.3, 0.45, 0.65, 0.45, 0.25, 0.28, 0.3);

  // 探照灯吊舱 (Gimbal Spotlight 位于机腹前下方)
  addBox(0, 0.25, 1.8, 0.65, 0.65, 0.75, 0.2, 0.22, 0.25);
  // 发光透镜
  addBox(0, 0.2, 2.18, 0.5, 0.5, 0.12, 1.0, 0.98, 0.85);

  return renderer.createMesh(v, idx);
}

// 直升机高速旋转主旋翼 (独立网格，便于实时动态旋转)
export function createRotorBladesMesh(renderer) {
  const { v, idx, addBox } = createBoxHelper();
  // 4 叶十字主旋翼，翼展 12 米
  addBox(0, 0, 0, 0.55, 0.08, 12.0, 0.12, 0.14, 0.18);
  addBox(0, 0, 0, 12.0, 0.08, 0.55, 0.12, 0.14, 0.18);
  // 中心旋翼帽
  addBox(0, 0.08, 0, 1.1, 0.18, 1.1, 0.85, 0.85, 0.9);
  return renderer.createMesh(v, idx);
}

// 角色 3D 人偶 (主角与行人)
export function createCharacterMesh(renderer, shirtColor = [0.15, 0.65, 0.85]) {
  const { v, idx, addBox } = createBoxHelper();

  // 脚底阴影
  addBox(0, 0.02, 0, 0.8, 0.02, 0.8, 0.04, 0.03, 0.06, 0.8);

  // 双腿 (深色牛仔裤)
  addBox(-0.18, 0.1, 0, 0.22, 0.75, 0.25, 0.15, 0.18, 0.28);
  addBox(0.18, 0.1, 0, 0.22, 0.75, 0.25, 0.15, 0.18, 0.28);

  // 躯干 (花衬衫/T恤)
  addBox(0, 0.85, 0, 0.58, 0.7, 0.32, shirtColor[0], shirtColor[1], shirtColor[2]);

  // 手臂
  addBox(-0.38, 0.78, 0, 0.18, 0.62, 0.2, shirtColor[0] * 0.9, shirtColor[1] * 0.9, shirtColor[2] * 0.9);
  addBox(0.38, 0.78, 0, 0.18, 0.62, 0.2, shirtColor[0] * 0.9, shirtColor[1] * 0.9, shirtColor[2] * 0.9);

  // 头部 (肤色与墨镜)
  addBox(0, 1.55, 0, 0.36, 0.38, 0.36, 0.92, 0.75, 0.62);
  // 头发
  addBox(0, 1.85, -0.05, 0.38, 0.18, 0.4, 0.15, 0.12, 0.1);
  // 墨镜
  addBox(0, 1.62, 0.18, 0.34, 0.12, 0.08, 0.05, 0.05, 0.08);

  // 武器 (微型冲锋枪)
  addBox(0.35, 0.75, 0.3, 0.12, 0.18, 0.55, 0.1, 0.12, 0.15);

  return renderer.createMesh(v, idx);
}

// 金色任务地标光柱 (Waypoint Beacon)
export function createWaypointMesh(renderer) {
  const { v, idx, addBox } = createBoxHelper();
  // 地面发光圆环底盘
  addBox(0, 0.05, 0, 3.6, 0.1, 3.6, 1.0, 0.85, 0.2);
  // 贯通天地的金色激光柱
  addBox(0, 1.0, 0, 1.2, 55.0, 1.2, 1.0, 0.78, 0.15, 0.9);
  // 顶部悬浮旋转棱锥标志
  addBox(0, 8.0, 0, 2.2, 2.2, 2.2, 1.0, 0.95, 0.35);
  return renderer.createMesh(v, idx);
}

// ----------------------------------------------------
// 2. 载具物理动力学与 AI 控制器
// ----------------------------------------------------

export class Vehicle {
  constructor(x, z, yaw = 0, type = 'sports', color = [0.95, 0.28, 0.18]) {
    this.pos = Vec3.create(x, 0, z);
    this.yaw = yaw; // 弧度
    this.speed = 0; // 米/秒
    this.angularVel = 0;
    this.steer = 0;
    this.type = type; // 'sports', 'police', 'sedan', 'van'
    this.color = color;

    this.health = 100;
    this.maxHealth = 100;
    this.nos = 100; // 氮气百分比 0..100
    this.isNosActive = false;
    this.isDrifting = false;
    this.sirenTimer = 0;
    this.modelMatrix = Mat4.create();

    // 性能参数配置
    this.maxSpeed = type === 'sports' ? 52.0 : type === 'police' ? 46.0 : 32.0;
    this.accelRate = type === 'sports' ? 34.0 : 26.0;
    this.brakeRate = 38.0;
    this.steerSpeed = 2.4;
  }

  update(dt, input = null, buildings = []) {
    if (this.health <= 0) {
      this.speed *= Math.pow(0.2, dt);
      this.updateMatrix();
      return;
    }

    if (input) {
      // 玩家驾驶输入处理
      const throttle = input.forward ? 1 : input.backward ? -0.6 : 0;
      const turn = input.left ? 1 : input.right ? -1 : 0;
      const handbrake = input.handbrake;
      const nosTrigger = input.nos && this.nos > 0 && throttle > 0;

      // 氮气加速逻辑
      if (nosTrigger) {
        this.isNosActive = true;
        this.nos = Math.max(0, this.nos - dt * 35.0);
      } else {
        this.isNosActive = false;
        this.nos = Math.min(100, this.nos + dt * 10.0);
      }

      const activeMaxSpeed = this.isNosActive ? this.maxSpeed * 1.45 : this.maxSpeed;
      const activeAccel = this.isNosActive ? this.accelRate * 1.8 : this.accelRate;

      // 加速与倒车
      if (throttle > 0) {
        this.speed = Math.min(activeMaxSpeed, this.speed + activeAccel * dt);
      } else if (throttle < 0) {
        if (this.speed > 0.5) {
          this.speed = Math.max(0, this.speed - this.brakeRate * dt);
        } else {
          this.speed = Math.max(-14.0, this.speed - this.accelRate * 0.7 * dt);
        }
      } else {
        // 自然减速阻力
        this.speed *= Math.pow(0.96, dt * 60);
      }

      // 手刹漂移机制
      this.isDrifting = handbrake && Math.abs(this.speed) > 12.0 && Math.abs(turn) > 0.1;
      let turnFactor = this.isDrifting ? 1.7 : 1.0;
      const gripLoss = this.isDrifting ? 0.94 : 0.985;
      this.speed *= Math.pow(gripLoss, dt * 60);

      // 转向响应随速度平滑调制
      const speedNorm = Math.min(1.0, Math.abs(this.speed) / 15.0);
      const targetAngular = turn * this.steerSpeed * speedNorm * turnFactor * (this.speed >= 0 ? 1 : -1);
      this.yaw += targetAngular * dt;
    } else {
      // 自然滑动衰减
      this.speed *= Math.pow(0.92, dt * 60);
    }

    // 更新位置
    this.pos[0] += Math.sin(this.yaw) * this.speed * dt;
    this.pos[2] += Math.cos(this.yaw) * this.speed * dt;

    // 简易城市建筑物外框碰撞检测
    this.checkBuildingCollision(buildings);

    // 警车警灯循环计时
    if (this.type === 'police') {
      this.sirenTimer += dt * 8.0;
    }

    this.updateMatrix();
  }

  checkBuildingCollision(buildings) {
    const px = this.pos[0];
    const pz = this.pos[2];
    const carRadius = 1.6;

    for (const b of buildings) {
      const minX = b[0] - b[2] * 0.5 - carRadius;
      const maxX = b[0] + b[2] * 0.5 + carRadius;
      const minZ = b[1] - b[4] * 0.5 - carRadius;
      const maxZ = b[1] + b[4] * 0.5 + carRadius;

      if (px > minX && px < maxX && pz > minZ && pz < maxZ) {
        // 发生碰撞，反弹并削减生命
        const impactSpeed = Math.abs(this.speed);
        if (impactSpeed > 6.0) {
          this.health = Math.max(0, this.health - impactSpeed * 0.85);
        }
        this.speed = -this.speed * 0.35;
        // 简单位置推离
        const dx1 = Math.abs(px - minX), dx2 = Math.abs(px - maxX);
        const dz1 = Math.abs(pz - minZ), dz2 = Math.abs(pz - maxZ);
        const minVal = Math.min(dx1, dx2, dz1, dz2);
        if (minVal === dx1) this.pos[0] = minX - 0.1;
        else if (minVal === dx2) this.pos[0] = maxX + 0.1;
        else if (minVal === dz1) this.pos[2] = minZ - 0.1;
        else this.pos[2] = maxZ + 0.1;
        break;
      }
    }
  }

  updateMatrix() {
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, this.pos);
    Mat4.rotateY(this.modelMatrix, this.modelMatrix, this.yaw);
  }
}

// ----------------------------------------------------
// 3. 警用直升机控制器 (3星以上出动)
// ----------------------------------------------------

export class PoliceHelicopter {
  constructor(x, z) {
    this.pos = Vec3.create(x, 38.0, z);
    this.yaw = 0;
    this.rotorAngle = 0;
    this.speed = 28.0;
    this.target = Vec3.create(0, 0, 0);
    this.spotlightDir = Vec3.create(0, -1, 0);
    this.modelMatrix = Mat4.create();
    this.rotorMatrix = Mat4.create();
  }

  update(dt, playerPos) {
    Vec3.copy(this.target, playerPos);

    // 计算朝向玩家的水平均匀方向
    const dx = this.target[0] - this.pos[0];
    const dz = this.target[2] - this.pos[2];
    const dist = Math.hypot(dx, dz);

    // 盘旋追逐算法：保持距离玩家 18~35 米并在空中盘旋
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - this.yaw;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.yaw += diff * Math.min(1.0, dt * 1.8);

    if (dist > 25.0) {
      this.pos[0] += Math.sin(this.yaw) * this.speed * dt;
      this.pos[2] += Math.cos(this.yaw) * this.speed * dt;
    } else {
      // 围绕玩家盘旋
      const sideAngle = this.yaw + Math.PI * 0.45;
      this.pos[0] += Math.sin(sideAngle) * (this.speed * 0.7) * dt;
      this.pos[2] += Math.cos(sideAngle) * (this.speed * 0.7) * dt;
    }

    // 高度平滑上下悬浮
    this.pos[1] = 36.0 + Math.sin(performance.now() * 0.002) * 2.2;

    // 旋转旋翼
    this.rotorAngle += dt * 38.0;

    // 计算探照灯方向向量：从直升机机头探照灯指向玩家地面坐标
    const spotOriginX = this.pos[0] + Math.sin(this.yaw) * 1.8;
    const spotOriginY = this.pos[1] - 1.2;
    const spotOriginZ = this.pos[2] + Math.cos(this.yaw) * 1.8;

    this.spotlightDir[0] = this.target[0] - spotOriginX;
    this.spotlightDir[1] = 0.0 - spotOriginY;
    this.spotlightDir[2] = this.target[2] - spotOriginZ;
    Vec3.normalize(this.spotlightDir, this.spotlightDir);

    // 更新机身矩阵
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, this.pos);
    Mat4.rotateY(this.modelMatrix, this.modelMatrix, this.yaw);
    // 飞行动力俯仰微倾角 (Tilt)
    Mat4.rotateX(this.modelMatrix, this.modelMatrix, dist > 25 ? 0.16 : 0.06);

    // 更新旋翼矩阵
    Mat4.copy(this.rotorMatrix, this.modelMatrix);
    Mat4.translate(this.rotorMatrix, this.rotorMatrix, [0, 2.35, 0.3]);
    Mat4.rotateY(this.rotorMatrix, this.rotorMatrix, this.rotorAngle);
  }
}
