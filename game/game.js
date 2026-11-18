/**
 * PELICAN KEY 3D: Sunset Syndicate
 * 游戏主逻辑、任务状态机、警力 AI、粒子系统与跟随相机
 */

import { Mat4, Vec3 } from './engine3d.js';
import {
  Vehicle,
  PoliceHelicopter,
  createSportsCarMesh,
  createPoliceCarMesh,
  createHelicopterMesh,
  createRotorBladesMesh,
  createCharacterMesh,
  createWaypointMesh,
} from './entities.js';

export class GameManager {
  constructor(renderer, world, audio) {
    this.renderer = renderer;
    this.world = world;
    this.audio = audio;

    // 编译动态实体网格
    this.meshes = {
      playerCar: createSportsCarMesh(renderer, [0.95, 0.28, 0.18]),
      policeCar: createPoliceCarMesh(renderer),
      heliBody: createHelicopterMesh(renderer),
      heliRotor: createRotorBladesMesh(renderer),
      character: createCharacterMesh(renderer),
      waypoint: createWaypointMesh(renderer),
    };

    // 玩家状态
    this.inCar = true;
    this.cash = 125000;
    this.health = 100;
    this.armor = 100;
    this.wantedStars = 0;
    this.wantedTimer = 0;
    this.currentWeapon = 'SMG';
    this.ammo = 180;

    // 载具与实体列表
    this.playerCar = new Vehicle(0, 0, 0, 'sports', [0.95, 0.28, 0.18]);
    this.playerCharPos = Vec3.create(0, 0, 0);
    this.playerCharYaw = 0;

    this.policeCars = [];
    this.helicopter = null;

    // 相机追踪状态
    this.cameraPos = Vec3.create(0, 5, -12);
    this.cameraTarget = Vec3.create(0, 1.2, 0);
    this.cameraYaw = 0;
    this.cameraPitch = 0.25;
    this.cameraDist = 8.5;
    this.cameraFov = 65;

    // 6 个连贯剧情任务定义
    this.missions = [
      {
        id: 1,
        title: 'MISSION 1: 码头夺取走私货箱',
        objective: '驾车前往 Pelican 港口码头栈桥 (金色地标)',
        targetPos: [-35, 0, 340],
        reward: 25000,
        targetStars: 1,
        desc: '黑市掮客有一批高价值货物刚抵达码头栈桥，在巡逻队赶到前迅速截获！'
      },
      {
        id: 2,
        title: 'MISSION 2: 霓虹大道 2 星极速甩警',
        objective: '踩足油门并甩开警车围捕，逃入改装车库消星',
        targetPos: [268, 0, -225], // 改装车库
        reward: 40000,
        targetStars: 2,
        desc: '码头走私惊动了警署，甩脱 2 辆高速拦截警车，将车辆开进喷漆车库！'
      },
      {
        id: 3,
        title: 'MISSION 3: 黄金海岸黑市劫车',
        objective: '前往中央商业区抢夺改装跑车',
        targetPos: [150, 0, 120],
        reward: 60000,
        targetStars: 2,
        desc: '敌对帮派在商业街停靠了一辆特调跑车，去将其据为己有！'
      },
      {
        id: 4,
        title: 'MISSION 4: 突袭联邦储备金库',
        objective: '突入中央金库并取走现金箱',
        targetPos: [180, 0, -225], // 银行
        reward: 100000,
        targetStars: 3,
        desc: '高风险大动作：抢劫金库引发 3 星最高通缉，呼叫了空中直升机！'
      },
      {
        id: 5,
        title: 'MISSION 5: 拦截装甲押运车',
        objective: '在主干道截停重装护送车队',
        targetPos: [-12, 0, -180],
        reward: 150000,
        targetStars: 4,
        desc: '在警用直升机探照灯的锁死追逐下，高速撞击拦截装甲车！'
      },
      {
        id: 6,
        title: 'MISSION 6: 终极海岸大逃亡',
        objective: '全速冲向空港海岸跳板，飞跃直升机封锁线！',
        targetPos: [290, 0, 380], // 空港海岸
        reward: 300000,
        targetStars: 5,
        desc: '5 星终极围捕！全城警力与警用直升机探照灯倾巢而出，向着日落海岸极限飞跃！'
      }
    ];
    this.currentMissionIdx = 0;
    this.missionPassedBannerTimer = 0;
    this.lastPassedReward = 0;

    // 粒子系统
    this.particles = [];

    // 输入捕获状态
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      handbrake: false,
      nos: false,
      fire: false,
    };

    // 载入 localStorage 存档
    this.loadSaveGame();
    // 初始化警车
    this.spawnPoliceCars(2);
  }

  loadSaveGame() {
    try {
      const data = localStorage.getItem('PELICAN_KEY_SAVE');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.cash) this.cash = parsed.cash;
        if (parsed.missionIdx !== undefined) this.currentMissionIdx = parsed.missionIdx % this.missions.length;
      }
    } catch {
      // 容错
    }
  }

  saveGame() {
    try {
      const data = {
        cash: this.cash,
        missionIdx: this.currentMissionIdx,
      };
      localStorage.setItem('PELICAN_KEY_SAVE', JSON.stringify(data));
    } catch {
      // 容错
    }
  }

  spawnPoliceCars(count) {
    this.policeCars = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = this.playerCar.pos[0] + Math.cos(angle) * (85 + i * 25);
      const z = this.playerCar.pos[2] + Math.sin(angle) * (85 + i * 25);
      const cop = new Vehicle(x, z, angle, 'police', [0.1, 0.1, 0.12]);
      this.policeCars.push(cop);
    }
  }

  triggerWanted(stars) {
    if (stars > this.wantedStars) {
      this.wantedStars = stars;
      if (this.wantedStars >= 3 && !this.helicopter) {
        // 出动警用直升机
        this.helicopter = new PoliceHelicopter(this.playerCar.pos[0] + 60, this.playerCar.pos[2] + 60);
      }
      this.spawnPoliceCars(Math.min(5, 2 + this.wantedStars));
    }
  }

  clearWanted() {
    this.wantedStars = 0;
    this.helicopter = null;
    this.policeCars = [];
    this.renderer.clearSpotlight();
  }

  update(dt) {
    const playerPos = this.inCar ? this.playerCar.pos : this.playerCharPos;

    // 1. 玩家载具更新
    if (this.inCar) {
      this.playerCar.update(dt, this.input, this.world.buildings);
      Vec3.copy(this.playerCharPos, this.playerCar.pos);

      // 音效同步
      this.audio.updateEngine(this.playerCar.speed, this.playerCar.isNosActive);
      if (this.playerCar.isDrifting) {
        this.audio.playDriftTireScreech();
        this.emitParticles(this.playerCar.pos, 3, [0.85, 0.85, 0.9, 0.4], 1.2);
      }
      if (this.playerCar.isNosActive) {
        this.emitParticles(this.playerCar.pos, 4, [0.2, 0.6, 1.0, 0.8], 2.2);
      }
    }

    // 2. 警车 AI 与碰撞阻截
    for (const cop of this.policeCars) {
      if (this.wantedStars > 0) {
        // 计算驶向玩家的转向
        const dx = playerPos[0] - cop.pos[0];
        const dz = playerPos[2] - cop.pos[2];
        const dist = Math.hypot(dx, dz);
        const targetYaw = Math.atan2(dx, dz);

        let diff = targetYaw - cop.yaw;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const fakeInput = {
          forward: dist > 6.0,
          backward: dist < 3.0,
          left: diff > 0.08,
          right: diff < -0.08,
          handbrake: false,
          nos: dist > 40.0,
        };
        cop.update(dt, fakeInput, this.world.buildings);

        if (dist < 4.5 && Math.abs(cop.speed) > 15.0) {
          // 警车撞击玩家
          this.playerCar.health = Math.max(0, this.playerCar.health - 6.0);
          this.audio.playCrashSound(0.8);
        }
      } else {
        cop.update(dt, null, this.world.buildings);
      }
    }

    // 3. 警用直升机与地面探照灯追捕 (3星以上)
    if (this.helicopter && this.wantedStars >= 3) {
      this.helicopter.update(dt, playerPos);
      // 将直升机探照灯映射至主着色器
      this.renderer.setSpotlight(this.helicopter.pos, this.helicopter.spotlightDir, 0.88);
    } else {
      this.renderer.clearSpotlight();
    }

    // 4. 改装喷漆车库检查 (消星 + 修车)
    const garageDist = Vec3.dist(playerPos, this.world.garagePos);
    if (garageDist < 12.0) {
      if (this.playerCar.health < 100 || this.wantedStars > 0) {
        this.playerCar.health = 100;
        this.clearWanted();
        // 随机换涂装
        this.playerCar.color = [Math.random() * 0.8 + 0.2, Math.random() * 0.8 + 0.2, Math.random() * 0.8 + 0.2];
        this.audio.playClickSound();
      }
    }

    // 5. 任务目标检测
    const currentMission = this.missions[this.currentMissionIdx];
    if (currentMission) {
      const distToObjective = Vec3.dist(playerPos, currentMission.targetPos);
      if (distToObjective < 15.0) {
        // 完成任务！
        this.cash += currentMission.reward;
        this.lastPassedReward = currentMission.reward;
        this.missionPassedBannerTimer = 5.0; // 展示 5 秒通关横幅
        this.audio.playMissionPassed();
        this.saveGame();

        // 推进下一个任务
        this.currentMissionIdx = (this.currentMissionIdx + 1) % this.missions.length;
        this.triggerWanted(this.missions[this.currentMissionIdx].targetStars);
      }
    }

    // 6. 粒子更新
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.pos[0] += p.vel[0] * dt;
      p.pos[1] += p.vel[1] * dt;
      p.pos[2] += p.vel[2] * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.missionPassedBannerTimer > 0) {
      this.missionPassedBannerTimer -= dt;
    }

    // 7. 第三人称跟随相机 (Chase Cam)
    this.updateCamera(dt);
  }

  updateCamera(dt) {
    if (this.inCar) {
      // 追尾视角：紧随车身朝向与速度动态拉伸
      const targetDist = this.cameraDist + (this.playerCar.isNosActive ? 3.5 : 0);
      const targetHeight = 3.6;

      const targetX = this.playerCar.pos[0] - Math.sin(this.playerCar.yaw) * targetDist;
      const targetY = this.playerCar.pos[1] + targetHeight;
      const targetZ = this.playerCar.pos[2] - Math.cos(this.playerCar.yaw) * targetDist;

      // 弹性平滑跟随 (Smooth Damp)
      const smoothFactor = Math.min(1.0, dt * 7.5);
      this.cameraPos[0] += (targetX - this.cameraPos[0]) * smoothFactor;
      this.cameraPos[1] += (targetY - this.cameraPos[1]) * smoothFactor;
      this.cameraPos[2] += (targetZ - this.cameraPos[2]) * smoothFactor;

      // 视线注视车头前方
      this.cameraTarget[0] = this.playerCar.pos[0] + Math.sin(this.playerCar.yaw) * 4.0;
      this.cameraTarget[1] = this.playerCar.pos[1] + 1.2;
      this.cameraTarget[2] = this.playerCar.pos[2] + Math.cos(this.playerCar.yaw) * 4.0;

      // 氮气加速拉大视野 (Dynamic FOV 65 -> 78)
      const targetFov = this.playerCar.isNosActive ? 78.0 : 65.0;
      this.cameraFov += (targetFov - this.cameraFov) * dt * 5.0;
    }
  }

  emitParticles(origin, count, color, speed) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        pos: Vec3.create(origin[0] + (Math.random() - 0.5) * 1.2, origin[1] + 0.3, origin[2] + (Math.random() - 0.5) * 1.2),
        vel: Vec3.create((Math.random() - 0.5) * speed, Math.random() * speed * 0.8, (Math.random() - 0.5) * speed),
        color,
        life: 0.6 + Math.random() * 0.4,
      });
    }
  }

  render() {
    // 1. 开始帧与日落天空穹顶绘制
    this.renderer.beginFrame(this.cameraPos, this.cameraTarget, this.cameraFov);

    const identityMat = Mat4.create();

    // 2. 绘制城市道路、人行道与棕榈树 (材质 0)
    this.renderer.drawMesh(this.world.cityMesh, identityMat, 0);

    // 3. 绘制动态反光海面 (材质 2)
    this.renderer.drawMesh(this.world.waterMesh, identityMat, 2);

    // 4. 绘制摩天大楼与发光窗格 (材质 1)
    this.renderer.drawMesh(this.world.buildingMesh, identityMat, 1);

    // 5. 绘制当前任务的金色光柱地标 (材质 3)
    const currentMission = this.missions[this.currentMissionIdx];
    if (currentMission) {
      const waypointMat = Mat4.create();
      Mat4.translate(waypointMat, waypointMat, currentMission.targetPos);
      this.renderer.drawMesh(this.meshes.waypoint, waypointMat, 3);
    }

    // 6. 绘制玩家跑车 (材质 0)
    if (this.inCar) {
      this.renderer.drawMesh(this.meshes.playerCar, this.playerCar.modelMatrix, 0);
    } else {
      const charMat = Mat4.create();
      Mat4.translate(charMat, charMat, this.playerCharPos);
      Mat4.rotateY(charMat, charMat, this.playerCharYaw);
      this.renderer.drawMesh(this.meshes.character, charMat, 0);
      // 绘制停在旁边的跑车
      this.renderer.drawMesh(this.meshes.playerCar, this.playerCar.modelMatrix, 0);
    }

    // 7. 绘制警车 (材质 0)
    for (const cop of this.policeCars) {
      this.renderer.drawMesh(this.meshes.policeCar, cop.modelMatrix, 0);
    }

    // 8. 绘制 3D 警用直升机 (机身 + 旋转旋翼)
    if (this.helicopter && this.wantedStars >= 3) {
      this.renderer.drawMesh(this.meshes.heliBody, this.helicopter.modelMatrix, 0);
      this.renderer.drawMesh(this.meshes.heliRotor, this.helicopter.rotorMatrix, 0);
    }
  }
}
