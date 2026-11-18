/**
 * PELICAN KEY 3D: Sunset Syndicate
 * 3D 城市世界生成器 (网格几何/道路/建筑/棕榈树/海滨)
 */

export function buildCityWorld(renderer) {
  const v = [];
  const idx = [];
  let baseIndex = 0;

  // 辅助函数：添加顶点
  function addVertex(x, y, z, nx, ny, nz, r, g, b, a = 1.0, u = 0, vCoord = 0) {
    v.push(x, y, z, nx, ny, nz, r, g, b, a, u, vCoord);
  }

  // 辅助函数：添加长方体
  function addBox(x, y, z, w, h, d, r, g, b, a = 1.0) {
    const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
    const cx = x, cy = y + hh, cz = z;

    const faces = [
      // 前 (Z+)
      { n: [0, 0, 1], p: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]] },
      // 后 (Z-)
      { n: [0, 0, -1], p: [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]] },
      // 上 (Y+)
      { n: [0, 1, 0], p: [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]] },
      // 下 (Y-)
      { n: [0, -1, 0], p: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]] },
      // 右 (X+)
      { n: [1, 0, 0], p: [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]] },
      // 左 (X-)
      { n: [-1, 0, 0], p: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]] },
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

  // 1. 生成海面与沙滩 (Coast & Ocean)
  // 水面位于 X < -70 的区域
  const waterV = [];
  const waterIdx = [];
  let wBaseIdx = 0;
  function addWaterPlane() {
    const minX = -450, maxX = -70, minZ = -450, maxZ = 450;
    waterV.push(
      minX, -0.4, minZ, 0, 1, 0, 0.1, 0.35, 0.6, 0.95, 0, 0,
      maxX, -0.4, minZ, 0, 1, 0, 0.1, 0.35, 0.6, 0.95, 1, 0,
      maxX, -0.4, maxZ, 0, 1, 0, 0.1, 0.35, 0.6, 0.95, 1, 1,
      minX, -0.4, maxZ, 0, 1, 0, 0.1, 0.35, 0.6, 0.95, 0, 1,
    );
    waterIdx.push(wBaseIdx, wBaseIdx + 1, wBaseIdx + 2, wBaseIdx, wBaseIdx + 2, wBaseIdx + 3);
    wBaseIdx += 4;
  }
  addWaterPlane();

  // 2. 陆地与沙滩基底 (Golden Beach)
  addBox(140, -1.0, 0, 440, 2.0, 900, 0.22, 0.22, 0.24); // 城市主陆地
  addBox(-45, -0.8, 0, 60, 1.8, 900, 0.88, 0.76, 0.52);  // 黄金细沙海滩带

  // 3. 道路系统 (Road Grid: 双向四车道 + 黄色中线 + 白色车道虚线)
  // 主干道：南北向滨海大道 (Ocean Boulevard, X = 0)
  addBox(0, 0.02, 0, 26, 0.05, 880, 0.12, 0.12, 0.14); // 沥青路面
  // 黄色双实线中线
  addBox(-0.35, 0.05, 0, 0.25, 0.02, 880, 1.0, 0.82, 0.1);
  addBox(0.35, 0.05, 0, 0.25, 0.02, 880, 1.0, 0.82, 0.1);

  // 南北向内陆大道 (Pelican Avenue, X = 120)
  addBox(120, 0.02, 0, 26, 0.05, 880, 0.12, 0.12, 0.14);
  addBox(119.65, 0.05, 0, 0.25, 0.02, 880, 1.0, 0.82, 0.1);
  addBox(120.35, 0.05, 0, 0.25, 0.02, 880, 1.0, 0.82, 0.1);

  // 南北向高速公路 (Bay Freeway, X = 240)
  addBox(240, 0.02, 0, 28, 0.05, 880, 0.12, 0.12, 0.14);
  addBox(239.65, 0.05, 0, 0.25, 0.02, 880, 1.0, 0.82, 0.1);
  addBox(240.35, 0.05, 0, 0.25, 0.02, 880, 1.0, 0.82, 0.1);

  // 东西向横贯干道 (Street 1 to 5: Z = -300, -150, 0, 150, 300)
  const crossStreets = [-300, -150, 0, 150, 300];
  for (const z of crossStreets) {
    addBox(120, 0.025, z, 270, 0.05, 22, 0.12, 0.12, 0.14);
    addBox(120, 0.055, z - 0.35, 270, 0.02, 0.25, 1.0, 0.82, 0.1);
    addBox(120, 0.055, z + 0.35, 270, 0.02, 0.25, 1.0, 0.82, 0.1);

    // 人行横道斑马线 (Crosswalks)
    for (let x = -8; x <= 8; x += 1.8) {
      addBox(x, 0.06, z - 13, 0.9, 0.015, 3.2, 0.95, 0.95, 0.95);
      addBox(x, 0.06, z + 13, 0.9, 0.015, 3.2, 0.95, 0.95, 0.95);
    }
  }

  // 沿海大道白色车道虚线 (Dashed lines)
  for (let z = -430; z < 430; z += 12) {
    addBox(-6.0, 0.05, z, 0.3, 0.015, 6.0, 0.9, 0.9, 0.9);
    addBox(6.0, 0.05, z, 0.3, 0.015, 6.0, 0.9, 0.9, 0.9);
    addBox(114.0, 0.05, z, 0.3, 0.015, 6.0, 0.9, 0.9, 0.9);
    addBox(126.0, 0.05, z, 0.3, 0.015, 6.0, 0.9, 0.9, 0.9);
    addBox(233.0, 0.05, z, 0.3, 0.015, 6.0, 0.9, 0.9, 0.9);
    addBox(247.0, 0.05, z, 0.3, 0.015, 6.0, 0.9, 0.9, 0.9);
  }

  // 人行道与道牙石 (Sidewalks)
  addBox(-15, 0.18, 0, 4.0, 0.3, 880, 0.45, 0.45, 0.48); // 滨海大道西侧观海步道
  addBox(15, 0.18, 0, 4.0, 0.3, 880, 0.45, 0.45, 0.48);
  addBox(105, 0.18, 0, 4.0, 0.3, 880, 0.45, 0.45, 0.48);
  addBox(135, 0.18, 0, 4.0, 0.3, 880, 0.45, 0.45, 0.48);
  addBox(223, 0.18, 0, 4.0, 0.3, 880, 0.45, 0.45, 0.48);
  addBox(257, 0.18, 0, 4.0, 0.3, 880, 0.45, 0.45, 0.48);

  // 4. 沿海棕榈树林 (Palm Trees along the Boulevard)
  function addPalmTree(px, pz) {
    // 弯曲树干 (Trunk segments)
    let curX = px, curY = 0, curZ = pz;
    const trunkH = 9.5;
    const segs = 5;
    for (let s = 0; s < segs; s++) {
      const nY = curY + trunkH / segs;
      const nX = curX + (s * 0.28);
      const nZ = curZ + Math.sin(s * 0.8) * 0.15;
      addBox((curX + nX) * 0.5, curY, (curZ + nZ) * 0.5, 0.65 - s * 0.08, trunkH / segs, 0.65 - s * 0.08, 0.45, 0.30, 0.18);
      curX = nX; curY = nY; curZ = nZ;
    }
    // 绿冠扇叶 (Palm Fronds)
    const frondAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    for (const ang of frondAngles) {
      const rad = (ang * Math.PI) / 180;
      const fx = curX + Math.cos(rad) * 2.8;
      const fz = curZ + Math.sin(rad) * 2.8;
      addBox((curX + fx) * 0.5, curY - 0.3, (curZ + fz) * 0.5, 3.2, 0.2, 1.2, 0.18, 0.62, 0.25);
    }
  }

  // 沿海大道每隔 24 米种一棵棕榈树
  for (let z = -400; z <= 400; z += 24) {
    addPalmTree(-15.2, z);
    addPalmTree(15.2, z + 12);
  }

  // 5. 现代化摩天大楼与发光建筑网格 (Skyscrapers: 30+ 栋)
  const buildings = [];
  // 街区 1: X: [35..85], Z: 各街区
  const bldgConfigs = [
    // [x, z, w, h, d, color]
    // 滨海第一排 (豪奢酒店与商务中心)
    [60, -370, 40, 75, 45, [0.22, 0.30, 0.42]],
    [60, -225, 36, 110, 50, [0.25, 0.22, 0.38]], // 鹈鹕帝国大厦 (110米)
    [60, -75, 38, 65, 42, [0.32, 0.28, 0.25]],
    [60, 75, 42, 95, 48, [0.18, 0.28, 0.35]],
    [60, 225, 35, 85, 44, [0.28, 0.22, 0.30]],
    [60, 370, 44, 70, 50, [0.20, 0.32, 0.40]],

    // 商业中心排 (X = 180, 包含银行与赌场)
    [180, -370, 45, 60, 45, [0.30, 0.30, 0.32]],
    [180, -225, 52, 135, 52, [0.15, 0.25, 0.38]], // 鹈鹕第一银行总部大厦 (135米，任务 4 目标)
    [180, -75, 40, 80, 45, [0.35, 0.22, 0.26]],
    [180, 75, 48, 120, 48, [0.22, 0.28, 0.34]],  // 日落海景赌场度假村
    [180, 225, 42, 68, 40, [0.28, 0.30, 0.32]],
    [180, 370, 46, 90, 46, [0.20, 0.24, 0.35]],

    // 东侧工业与科技园区 (X = 295, 包含车库与黑市)
    [295, -370, 50, 35, 55, [0.32, 0.32, 0.35]],
    [295, -225, 55, 40, 60, [0.38, 0.35, 0.30]], // 改装喷漆修车厂 (Pay 'n' Spray)
    [295, -75, 45, 55, 45, [0.24, 0.28, 0.32]],
    [295, 75, 50, 45, 50, [0.30, 0.25, 0.28]],
    [295, 225, 48, 60, 45, [0.22, 0.26, 0.30]],
    [295, 370, 52, 38, 55, [0.35, 0.35, 0.38]],
  ];

  const bldgMeshV = [];
  const bldgMeshIdx = [];
  let bldgBaseIdx = 0;

  function addBuildingBox(x, y, z, w, h, d, col) {
    const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
    const cx = x, cy = y + hh, cz = z;

    const faces = [
      { n: [0, 0, 1], p: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]] },
      { n: [0, 0, -1], p: [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]] },
      { n: [0, 1, 0], p: [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]] },
      { n: [0, -1, 0], p: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]] },
      { n: [1, 0, 0], p: [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]] },
      { n: [-1, 0, 0], p: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]] },
    ];

    for (const f of faces) {
      const start = bldgBaseIdx;
      for (let i = 0; i < 4; i++) {
        const pt = f.p[i];
        bldgMeshV.push(
          cx + pt[0], cy + pt[1], cz + pt[2],
          f.n[0], f.n[1], f.n[2],
          col[0], col[1], col[2], 1.0,
          (i === 1 || i === 2) ? 1 : 0, (i >= 2) ? 1 : 0
        );
      }
      bldgMeshIdx.push(start, start + 1, start + 2, start, start + 2, start + 3);
      bldgBaseIdx += 4;
    }

    buildings.push({
      minX: x - hw - 1.0,
      maxX: x + hw + 1.0,
      minZ: z - hd - 1.0,
      maxZ: z + hd + 1.0,
      height: h,
    });
  }

  for (const b of bldgConfigs) {
    addBuildingBox(b[0], 0, b[1], b[2], b[3], b[4], b[5]);
    // 楼顶配电室/避雷针塔
    addBuildingBox(b[0], b[3], b[1], b[2] * 0.35, 8.0, b[4] * 0.35, [0.15, 0.15, 0.18]);
  }

  // 6. 码头区域与集装箱 (Port Pelican: 位于西南 X: [-60..-10], Z: [260..420])
  // 码头栈桥
  addBox(-35, 0.3, 340, 50, 1.2, 140, 0.38, 0.38, 0.40);
  // 码头彩色集装箱群 (Cargo Containers)
  const containerColors = [
    [0.85, 0.22, 0.22], // 红色
    [0.22, 0.45, 0.85], // 蓝色
    [0.92, 0.72, 0.18], // 黄色
    [0.18, 0.65, 0.32], // 绿色
  ];
  for (let cz = 290; cz <= 390; cz += 22) {
    for (let cx = -50; cx <= -22; cx += 14) {
      const cCol = containerColors[Math.abs(Math.floor(cx + cz)) % containerColors.length];
      addBox(cx, 0.9, cz, 6.0, 5.2, 14.0, cCol[0], cCol[1], cCol[2]);
      // 偶数堆叠第二层
      if ((cx + cz) % 4 === 0) {
        addBox(cx, 6.1, cz, 6.0, 5.2, 14.0, cCol[0] * 0.9, cCol[1] * 0.9, cCol[2] * 0.9);
      }
    }
  }

  // 7. 改装车库高光外框 (Pay 'n' Spray Garage Marker, 位于 X = 268, Z = -225)
  // 金色地面发光感应光圈
  addBox(268, 0.12, -225, 16.0, 0.1, 16.0, 1.0, 0.78, 0.15);

  // 编译生成各个 VAO
  const cityMesh = renderer.createMesh(v, idx);
  const waterMesh = renderer.createMesh(waterV, waterIdx);
  const buildingMesh = renderer.createMesh(bldgMeshV, bldgMeshIdx);

  return {
    cityMesh,
    waterMesh,
    buildingMesh,
    buildings,
    garagePos: [268, 0, -225],
    bankPos: [180, 0, -225],
    docksPos: [-35, 0, 340],
    airportHeliPos: [290, 0, 380],
  };
}
