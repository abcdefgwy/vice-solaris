/**
 * PELICAN KEY 3D: Sunset Syndicate
 * 纯原生 WebGL2 3D 渲染引擎 (零外部依赖 / 零 CDN)
 */

// ----------------------------------------------------
// 1. 高性能三维数学库 (Mat4 & Vec3)
// ----------------------------------------------------
export class Vec3 {
  static create(x = 0, y = 0, z = 0) {
    const out = new Float32Array(3);
    out[0] = x; out[1] = y; out[2] = z;
    return out;
  }
  static set(out, x, y, z) {
    out[0] = x; out[1] = y; out[2] = z;
    return out;
  }
  static copy(out, a) {
    out[0] = a[0]; out[1] = a[1]; out[2] = a[2];
    return out;
  }
  static add(out, a, b) {
    out[0] = a[0] + b[0]; out[1] = a[1] + b[1]; out[2] = a[2] + b[2];
    return out;
  }
  static sub(out, a, b) {
    out[0] = a[0] - b[0]; out[1] = a[1] - b[1]; out[2] = a[2] - b[2];
    return out;
  }
  static scale(out, a, s) {
    out[0] = a[0] * s; out[1] = a[1] * s; out[2] = a[2] * s;
    return out;
  }
  static length(a) {
    return Math.hypot(a[0], a[1], a[2]);
  }
  static dist(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }
  static normalize(out, a) {
    const len = Math.hypot(a[0], a[1], a[2]);
    if (len > 0.00001) {
      const inv = 1 / len;
      out[0] = a[0] * inv; out[1] = a[1] * inv; out[2] = a[2] * inv;
    }
    return out;
  }
  static dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  static cross(out, a, b) {
    const ax = a[0], ay = a[1], az = a[2];
    const bx = b[0], by = b[1], bz = b[2];
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
  }
  static lerp(out, a, b, t) {
    out[0] = a[0] + t * (b[0] - a[0]);
    out[1] = a[1] + t * (b[1] - a[1]);
    out[2] = a[2] + t * (b[2] - a[2]);
    return out;
  }
}

export class Mat4 {
  static create() {
    const out = new Float32Array(16);
    out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
    return out;
  }
  static identity(out) {
    out.fill(0);
    out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
    return out;
  }
  static copy(out, a) {
    out.set(a);
    return out;
  }
  static multiply(out, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  }
  static perspective(out, fovyRad, aspect, near, far) {
    const f = 1.0 / Math.tan(fovyRad / 2);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[11] = -1;
    const nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = 2 * far * near * nf;
    return out;
  }
  static lookAt(out, eye, center, up) {
    const eyex = eye[0], eyey = eye[1], eyez = eye[2];
    const upx = up[0], upy = up[1], upz = up[2];
    const centerx = center[0], centery = center[1], centerz = center[2];

    let z0 = eyex - centerx;
    let z1 = eyey - centery;
    let z2 = eyez - centerz;
    let len = Math.hypot(z0, z1, z2);
    if (len === 0) { z2 = 1; len = 1; }
    z0 /= len; z1 /= len; z2 /= len;

    let x0 = upy * z2 - upz * z1;
    let x1 = upz * z0 - upx * z2;
    let x2 = upx * z1 - upy * z0;
    len = Math.hypot(x0, x1, x2);
    if (len === 0) { x0 = 1; len = 1; }
    x0 /= len; x1 /= len; x2 /= len;

    const y0 = z1 * x2 - z2 * x1;
    const y1 = z2 * x0 - z0 * x2;
    const y2 = z0 * x1 - z1 * x0;

    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;
    return out;
  }
  static translate(out, a, v) {
    const x = v[0], y = v[1], z = v[2];
    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
      out.set(a);
      Mat4.translate(out, out, v);
    }
    return out;
  }
  static rotateY(out, a, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (a !== out) out.set(a);
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
  }
  static rotateX(out, a, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (a !== out) out.set(a);
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
  }
  static rotateZ(out, a, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    if (a !== out) out.set(a);
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
  }
  static scale(out, a, v) {
    const x = v[0], y = v[1], z = v[2];
    out[0] = a[0] * x; out[1] = a[1] * x; out[2] = a[2] * x; out[3] = a[3] * x;
    out[4] = a[4] * y; out[5] = a[5] * y; out[6] = a[6] * y; out[7] = a[7] * y;
    out[8] = a[8] * z; out[9] = a[9] * z; out[10] = a[10] * z; out[11] = a[11] * z;
    out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
    return out;
  }
}

// ----------------------------------------------------
// 2. WebGL2 着色器源码 (带日落渐变雾、发光窗户、海面高光与直升机探照灯)
// ----------------------------------------------------
const MAIN_VS = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec4 aColor;
layout(location = 3) in vec2 aUV;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

out vec3 vWorldPos;
out vec3 vNormal;
out vec4 vColor;
out vec2 vUV;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = mat3(uModel) * aNormal;
  vColor = aColor;
  vUV = aUV;
  gl_Position = uProjection * uView * worldPos;
}
`;

const MAIN_FS = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec4 vColor;
in vec2 vUV;

uniform vec3 uCameraPos;
uniform vec3 uSunDir;
uniform vec3 uSpotlightPos;  // 直升机探照灯光源位置
uniform vec3 uSpotlightDir;  // 直升机探照灯朝向
uniform float uSpotlightCutoff; // 探照灯余弦角度 (例如 0.88)
uniform float uTime;
uniform int uMaterialType; // 0: 普通材质, 1: 摩天楼(发光窗格), 2: 水面(波纹高光), 3: 发光尾灯/车灯

out vec4 fragColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 L = normalize(uSunDir);

  // 1. 日落环境光与太阳主光 (暖金与紫红)
  vec3 skyAmbient = mix(vec3(0.28, 0.16, 0.38), vec3(0.55, 0.30, 0.22), max(N.y, 0.0));
  float NdotL = max(dot(N, L), 0.0);
  vec3 sunColor = vec3(1.0, 0.72, 0.45);
  vec3 diffuse = vColor.rgb * (skyAmbient + sunColor * NdotL * 1.35);

  // 2. 镜面高光 (暖金高光反射)
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 32.0);
  vec3 specular = sunColor * spec * 0.45;

  vec3 finalColor = diffuse + specular;

  // 3. 摩天大楼：程序化发光霓虹窗格与航空警示灯
  if (uMaterialType == 1) {
    vec2 grid = fract(vWorldPos.xz * 0.4 + vWorldPos.yy * 0.25);
    float win = step(0.22, grid.x) * step(0.22, grid.y) * step(grid.x, 0.88) * step(grid.y, 0.88);
    float noiseVal = fract(sin(dot(floor(vWorldPos.xz * 0.4 + vWorldPos.yy * 0.25), vec2(12.9898, 78.233))) * 43758.5453);
    if (win > 0.5 && noiseVal > 0.45 && abs(N.y) < 0.2) {
      vec3 winColor = mix(vec3(1.0, 0.88, 0.42), vec3(0.35, 0.85, 1.0), noiseVal);
      finalColor = mix(finalColor, winColor * 1.8, 0.85);
    }
    // 楼顶红色航空警示频闪
    if (vWorldPos.y > 60.0 && N.y > 0.8) {
      float blink = step(0.5, fract(uTime * 1.5));
      finalColor += vec3(1.0, 0.1, 0.1) * blink * 2.0;
    }
  }

  // 4. 海面水波与落日粼粼高光
  if (uMaterialType == 2) {
    float wave = sin(vWorldPos.x * 0.12 + uTime * 2.5) * cos(vWorldPos.z * 0.12 + uTime * 2.0);
    vec3 waveN = normalize(vec3(N.x + wave * 0.15, N.y, N.z + wave * 0.15));
    vec3 waveH = normalize(L + V);
    float waterSpec = pow(max(dot(waveN, waveH), 0.0), 64.0);
    finalColor = mix(vec3(0.08, 0.18, 0.35), vec3(1.0, 0.55, 0.2), waterSpec * 1.2);
  }

  // 5. 纯发光体 (尾灯、车灯、任务光柱)
  if (uMaterialType == 3) {
    finalColor = vColor.rgb * 2.2;
  }

  // 6. 直升机地面强力探照灯锥计算 (3星以上生效)
  if (uSpotlightPos.y > 5.0) {
    vec3 lightToPos = normalize(vWorldPos - uSpotlightPos);
    float spotAngle = dot(lightToPos, normalize(uSpotlightDir));
    if (spotAngle > uSpotlightCutoff) {
      float spotDist = length(vWorldPos - uSpotlightPos);
      float spotAtten = clamp(1.0 - (spotDist / 120.0), 0.0, 1.0);
      float spotEdge = smoothstep(uSpotlightCutoff, uSpotlightCutoff + 0.04, spotAngle);
      finalColor += vec3(0.9, 0.95, 1.0) * spotAtten * spotEdge * 1.6;
    }
  }

  // 7. 远景日落紫金渐变雾效 (Sunset Fog)
  float dist = length(uCameraPos - vWorldPos);
  float fogFactor = clamp((dist - 35.0) / 450.0, 0.0, 1.0);
  vec3 fogColor = mix(vec3(0.98, 0.52, 0.28), vec3(0.32, 0.15, 0.38), clamp((vWorldPos.y - 10.0) / 100.0, 0.0, 1.0));
  finalColor = mix(finalColor, fogColor, fogFactor * 0.88);

  fragColor = vec4(finalColor, vColor.a);
}
`;

// 天空盒背景 Shader (全屏四边形，程序化日落天穹与太阳圆盘)
const SKY_VS = `#version 300 es
layout(location = 0) in vec2 aPosition;
out vec2 vUV;
void main() {
  vUV = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.9999, 1.0);
}
`;

const SKY_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform mat4 uInvViewProj;
uniform vec3 uSunDir;
out vec4 fragColor;

void main() {
  vec4 ndc = vec4(vUV * 2.0 - 1.0, 1.0, 1.0);
  vec4 world = uInvViewProj * ndc;
  vec3 dir = normalize(world.xyz / world.w);

  // 天顶到地平线颜色渐变
  float y = dir.y;
  vec3 zenith = vec3(0.12, 0.08, 0.28);  // 深靛蓝夜空顶
  vec3 midSky = vec3(0.85, 0.28, 0.42);  // 玫瑰粉紫中空
  vec3 horizon = vec3(1.0, 0.62, 0.25); // 金橙日落地平线
  vec3 below = vec3(0.08, 0.14, 0.25);   // 海平面

  vec3 sky = y > 0.0 ? (y < 0.22 ? mix(horizon, midSky, y / 0.22) : mix(midSky, zenith, (y - 0.22) / 0.78)) : below;

  // 耀眼落日圆盘与光晕
  float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
  float sunDisc = smoothstep(0.997, 0.999, sunDot);
  float sunGlow = pow(sunDot, 12.0) * 0.65;
  sky += vec3(1.0, 0.85, 0.5) * (sunDisc * 2.5 + sunGlow);

  fragColor = vec4(sky, 1.0);
}
`;

// ----------------------------------------------------
// 3. WebGL2 渲染器核心类
// ----------------------------------------------------
export class WebGL2Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
      depth: true,
      stencil: false,
    });
    if (!gl) {
      throw new Error('当前浏览器不支持 WebGL2');
    }
    this.gl = gl;

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // 编译主场景着色器
    this.mainProgram = this.createProgram(MAIN_VS, MAIN_FS);
    this.mainUniforms = {
      projection: gl.getUniformLocation(this.mainProgram, 'uProjection'),
      view: gl.getUniformLocation(this.mainProgram, 'uView'),
      model: gl.getUniformLocation(this.mainProgram, 'uModel'),
      cameraPos: gl.getUniformLocation(this.mainProgram, 'uCameraPos'),
      sunDir: gl.getUniformLocation(this.mainProgram, 'uSunDir'),
      spotlightPos: gl.getUniformLocation(this.mainProgram, 'uSpotlightPos'),
      spotlightDir: gl.getUniformLocation(this.mainProgram, 'uSpotlightDir'),
      spotlightCutoff: gl.getUniformLocation(this.mainProgram, 'uSpotlightCutoff'),
      time: gl.getUniformLocation(this.mainProgram, 'uTime'),
      materialType: gl.getUniformLocation(this.mainProgram, 'uMaterialType'),
    };

    // 编译天空穹顶着色器
    this.skyProgram = this.createProgram(SKY_VS, SKY_FS);
    this.skyUniforms = {
      invViewProj: gl.getUniformLocation(this.skyProgram, 'uInvViewProj'),
      sunDir: gl.getUniformLocation(this.skyProgram, 'uSunDir'),
    };

    // 全屏四边形缓冲
    this.skyVAO = gl.createVertexArray();
    gl.bindVertexArray(this.skyVAO);
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // 全局矩阵缓存
    this.projMat = Mat4.create();
    this.viewMat = Mat4.create();
    this.modelMat = Mat4.create();
    this.viewProjMat = Mat4.create();
    this.invViewProjMat = Mat4.create();
    this.sunDir = Vec3.create(0.7, 0.28, -0.65);
    Vec3.normalize(this.sunDir, this.sunDir);

    // 直升机探照灯参数
    this.spotlightPos = Vec3.create(0, -100, 0);
    this.spotlightDir = Vec3.create(0, -1, 0);
    this.spotlightCutoff = 0.92;

    this.resize();
  }

  setSpotlight(pos, dir, cutoff = 0.88) {
    Vec3.copy(this.spotlightPos, pos);
    Vec3.copy(this.spotlightDir, dir);
    this.spotlightCutoff = cutoff;
  }

  clearSpotlight() {
    Vec3.set(this.spotlightPos, 0, -100, 0);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  createShader(type, src) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile failure: ${info}`);
    }
    return shader;
  }

  createProgram(vsSrc, fsSrc) {
    const gl = this.gl;
    const vs = this.createShader(gl.VERTEX_SHADER, vsSrc);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error(`Program link failure: ${info}`);
    }
    return prog;
  }

  // 绑定网格数据对象 (VAO)
  createMesh(vertices, indices) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // layout: pos(3) + normal(3) + color(4) + uv(2) = 12 floats (48 bytes)
    const stride = 12 * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 6 * 4);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 10 * 4);

    gl.bindVertexArray(null);

    return { vao, count: indices.length };
  }

  beginFrame(cameraPos, cameraTarget, fovDeg = 65) {
    this.resize();
    const gl = this.gl;
    gl.clearColor(0.2, 0.1, 0.25, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = this.canvas.width / this.canvas.height;
    Mat4.perspective(this.projMat, (fovDeg * Math.PI) / 180, aspect, 0.4, 750);
    Mat4.lookAt(this.viewMat, cameraPos, cameraTarget, [0, 1, 0]);

    // 绘制全屏日落天空穹顶
    gl.depthMask(false);
    gl.useProgram(this.skyProgram);
    Mat4.multiply(this.viewProjMat, this.projMat, this.viewMat);
    this.invertMatrix(this.invViewProjMat, this.viewProjMat);
    gl.uniformMatrix4fv(this.skyUniforms.invViewProj, false, this.invViewProjMat);
    gl.uniform3fv(this.skyUniforms.sunDir, this.sunDir);
    gl.bindVertexArray(this.skyVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.depthMask(true);

    // 启用主场景着色器
    gl.useProgram(this.mainProgram);
    gl.uniformMatrix4fv(this.mainUniforms.projection, false, this.projMat);
    gl.uniformMatrix4fv(this.mainUniforms.view, false, this.viewMat);
    gl.uniform3fv(this.mainUniforms.cameraPos, cameraPos);
    gl.uniform3fv(this.mainUniforms.sunDir, this.sunDir);
    gl.uniform3fv(this.mainUniforms.spotlightPos, this.spotlightPos);
    gl.uniform3fv(this.mainUniforms.spotlightDir, this.spotlightDir);
    gl.uniform1f(this.mainUniforms.spotlightCutoff, this.spotlightCutoff);
    gl.uniform1f(this.mainUniforms.time, performance.now() * 0.001);
  }

  drawMesh(mesh, modelMatrix, materialType = 0) {
    const gl = this.gl;
    gl.uniformMatrix4fv(this.mainUniforms.model, false, modelMatrix);
    gl.uniform1i(this.mainUniforms.materialType, materialType);
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  invertMatrix(out, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }
}
export { WebGL2Renderer as WebGLRenderer };
