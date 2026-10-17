// 英雄级鲤鱼模型 —— 对标三角洲行动收藏鱼写实度（程序化，免外部资产）
// 仅用于 carp / goldcarp / koi；其他鱼种仍走 fish.js 通用路径
import * as THREE from 'three';

const TEX_CACHE = new Map();

function qualityLevel() {
  return (localStorage.getItem('fishing3d_quality') || 'high') === 'low' ? 'low' : 'high';
}

function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < o; i++) { s += a * noise2(x * f, y * f); n += a; f *= 2.05; a *= 0.5; }
  return s / n;
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- 鲤鱼体型轮廓（深体、侧扁、厚尾柄） ----------
function carpProfile(u) {
  // u: 0 头端 → 1 尾端；返回体高半幅系数
  const a = 0.48, b = 0.78;
  const um = a / (a + b);
  const fmax = Math.pow(um, a) * Math.pow(1 - um, b);
  const base = (Math.pow(Math.max(u, 1e-4), a) * Math.pow(Math.max(1 - u, 1e-4), b)) / fmax;
  // 头略钝、中段隆起、尾柄加厚
  const head = 1 - 0.18 * Math.exp(-Math.pow(u / 0.12, 2));
  const mid = 1 + 0.12 * Math.sin(Math.PI * clamp((u - 0.15) / 0.55, 0, 1));
  const ped = 1 + 0.22 * smooth(0.72, 0.92, u); // 尾柄
  return base * 1.08 * head * mid * ped + 0.05 * u;
}
function carpThick(u) {
  // 相对体高的厚度比：头圆、中段侧扁、尾柄圆实
  const mid = 0.48 + 0.08 * Math.sin(u * Math.PI);
  const head = lerp(0.72, mid, smooth(0, 0.22, u));
  const tail = lerp(mid, 0.62, smooth(0.7, 1, u));
  return u < 0.35 ? head : tail;
}

// ---------- PBR 贴图生成 ----------
function variantPalette(variant) {
  // variant: 'carp' | 'gold' | 'koi'
  if (variant === 'gold') {
    return {
      top: [210, 140, 20], side: [255, 200, 60], belly: [255, 240, 180],
      scaleEdge: [120, 70, 10], fin: [255, 140, 40], accent: [255, 180, 40],
      koi: false, metal: 0.55,
    };
  }
  if (variant === 'koi') {
    return {
      top: [245, 240, 230], side: [255, 252, 248], belly: [255, 255, 255],
      scaleEdge: [180, 170, 160], fin: [240, 230, 220], accent: [210, 30, 25],
      koi: true, metal: 0.12,
    };
  }
  // 野生鲤：金褐背、琥珀侧、奶白腹、红尾
  return {
    top: [95, 58, 28], side: [196, 130, 48], belly: [242, 220, 170],
    scaleEdge: [55, 32, 14], fin: [180, 55, 30], accent: [210, 90, 35],
    koi: false, metal: 0.35,
  };
}

function makeCarpMaps(variant, q) {
  const key = `hero2_${variant}_${q}`;
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key);

  const W = q === 'low' ? 512 : 1024;
  const H = q === 'low' ? 512 : 1024;
  const pal = variantPalette(variant);

  const albedoC = document.createElement('canvas'); albedoC.width = W; albedoC.height = H;
  const roughC = document.createElement('canvas'); roughC.width = W; roughC.height = H;
  const bumpC = document.createElement('canvas'); bumpC.width = W; bumpC.height = H;
  const aoC = document.createElement('canvas'); aoC.width = W; aoC.height = H;
  const ga = albedoC.getContext('2d', { willReadFrequently: true });
  const gr = roughC.getContext('2d', { willReadFrequently: true });
  const gb = bumpC.getContext('2d', { willReadFrequently: true });
  const go = aoC.getContext('2d', { willReadFrequently: true });

  // 先填基础背→腹渐变（V 方向：0 背 1 腹，沿环向展开时用噪声扰动）
  const imgA = ga.createImageData(W, H);
  const imgR = gr.createImageData(W, H);
  const imgB = gb.createImageData(W, H);
  const imgO = go.createImageData(W, H);

  // 鳞片参数：沿 U（体长）更密，环向交错
  const scaleU = q === 'low' ? 28 : 42; // 沿体长鳞列数
  const scaleV = q === 'low' ? 16 : 24;

  // 锦鲤红斑中心（软边）
  const koiPatches = variant === 'koi' ? [
    { u: 0.22, v: 0.35, r: 0.22 },
    { u: 0.48, v: 0.55, r: 0.28 },
    { u: 0.72, v: 0.32, r: 0.18 },
    { u: 0.38, v: 0.78, r: 0.14 },
  ] : [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;          // 0 头 → 1 尾
      const v = y / H;          // 环向
      // 背腹：v=0 与 v=1 靠近背，v=0.5 为腹
      const ang = v * Math.PI * 2;
      const belly = (1 - Math.cos(ang)) * 0.5; // 0 背 → 1 腹
      const dorsal = 1 - belly;

      let r = lerp(lerp(pal.top[0], pal.side[0], smooth(0.12, 0.5, belly)), pal.belly[0], smooth(0.4, 0.85, belly));
      let g = lerp(lerp(pal.top[1], pal.side[1], smooth(0.12, 0.5, belly)), pal.belly[1], smooth(0.4, 0.85, belly));
      let b = lerp(lerp(pal.top[2], pal.side[2], smooth(0.12, 0.5, belly)), pal.belly[2], smooth(0.4, 0.85, belly));

      const headDark = (1 - smooth(0.0, 0.18, u)) * dorsal * 0.38;
      r *= 1 - headDark; g *= 1 - headDark; b *= 1 - headDark;

      const lat = Math.exp(-Math.pow((belly - 0.4) / 0.028, 2)) * smooth(0.1, 0.22, u) * smooth(0.08, 0.22, 1 - u);
      r *= 1 - 0.25 * lat; g *= 1 - 0.25 * lat; b *= 1 - 0.2 * lat;

      if (pal.koi) {
        let red = 0;
        for (const p of koiPatches) {
          const du = (u - p.u) / p.r, dv = (belly - (p.v * 0.65 + 0.12)) / (p.r * 0.9);
          const d = Math.hypot(du, dv);
          const n = fbm(u * 6 + p.u * 10, belly * 5 + p.v * 8, 3);
          red = Math.max(red, smooth(1.05, 0.32, d + (n - 0.5) * 0.4));
        }
        r = lerp(r, pal.accent[0], red);
        g = lerp(g, pal.accent[1], red);
        b = lerp(b, pal.accent[2], red);
        const edge = red * (1 - red) * 4;
        r = lerp(r, 100, edge * 0.25); g = lerp(g, 20, edge * 0.25); b = lerp(b, 15, edge * 0.25);
      }

      // 圆鳞：噪声扰动网格，避免死板方阵
      const warp = (fbm(u * 4.5, v * 4.5, 3) - 0.5) * 0.35;
      const su = u * scaleU + warp;
      const sv = v * scaleV * 0.85 + warp * 0.8;
      const row = Math.floor(sv);
      const colOff = (row % 2) * 0.5;
      const col = Math.floor(su + colOff);
      const fu = (su + colOff) - col;
      const fv = sv - row;
      // 每鳞大小略抖
      const szJitter = 0.85 + hash2(col + 3, row + 7) * 0.3;
      const dx = (fu - 0.5) * 2 * szJitter;
      const dy = (fv - 0.5) * 2.15 * szJitter;
      const dist = Math.hypot(dx, dy * 0.92);
      const onBody = u > 0.05 && u < 0.95 && belly > 0.02 && belly < 0.98;
      const inScale = onBody && dist < 1.0;
      const scaleHi = inScale ? Math.pow(smooth(1.0, 0.12, dist), 1.2) * (0.5 + 0.5 * clamp(0.55 - dy, 0, 1)) : 0;
      const scaleEdge = inScale ? smooth(0.5, 1.0, dist) : 0;

      r = lerp(r, pal.scaleEdge[0], scaleEdge * 0.65);
      g = lerp(g, pal.scaleEdge[1], scaleEdge * 0.65);
      b = lerp(b, pal.scaleEdge[2], scaleEdge * 0.65);
      r = Math.min(255, r + scaleHi * 48);
      g = Math.min(255, g + scaleHi * 38);
      b = Math.min(255, b + scaleHi * 20);

      // 鳞间微色差
      const tone = (hash2(col, row) - 0.5) * 16;
      r = clamp(r + tone, 0, 255); g = clamp(g + tone * 0.85, 0, 255); b = clamp(b + tone * 0.6, 0, 255);

      const micro = (fbm(u * 90, v * 70, 3) - 0.5) * 14;
      r = clamp(r + micro, 0, 255); g = clamp(g + micro * 0.9, 0, 255); b = clamp(b + micro * 0.7, 0, 255);

      if (variant === 'carp' && u > 0.86) {
        const t = smooth(0.86, 1, u) * dorsal;
        r = lerp(r, 195, t * 0.4); g = lerp(g, 55, t * 0.4); b = lerp(b, 35, t * 0.4);
      }

      const i = (y * W + x) * 4;
      imgA.data[i] = r; imgA.data[i + 1] = g; imgA.data[i + 2] = b; imgA.data[i + 3] = 255;

      let rough = lerp(0.16, 0.45, belly) + scaleEdge * 0.28 - scaleHi * 0.14;
      rough += (fbm(u * 28, v * 22, 2) - 0.5) * 0.07;
      rough = clamp(rough, 0.07, 0.88);
      const rv = (rough * 255) | 0;
      imgR.data[i] = rv; imgR.data[i + 1] = rv; imgR.data[i + 2] = rv; imgR.data[i + 3] = 255;

      let bump = 0.42 + scaleHi * 0.55 - scaleEdge * 0.4 - lat * 0.45;
      bump = clamp(bump, 0, 1);
      const bv = (bump * 255) | 0;
      imgB.data[i] = bv; imgB.data[i + 1] = bv; imgB.data[i + 2] = bv; imgB.data[i + 3] = 255;

      let ao = 1 - scaleEdge * 0.4 - headDark * 0.45 - Math.pow(1 - Math.min(belly, 1 - belly) * 2, 2) * 0.08;
      ao = clamp(ao, 0.3, 1);
      const av = (ao * 255) | 0;
      imgO.data[i] = av; imgO.data[i + 1] = av; imgO.data[i + 2] = av; imgO.data[i + 3] = 255;
    }
  }
  ga.putImageData(imgA, 0, 0);
  gr.putImageData(imgR, 0, 0);
  gb.putImageData(imgB, 0, 0);
  go.putImageData(imgO, 0, 0);

  const mk = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = q === 'low' ? 2 : 4;
    t.needsUpdate = true;
    return t;
  };
  const out = {
    map: mk(albedoC, true),
    roughnessMap: mk(roughC, false),
    bumpMap: mk(bumpC, false),
    aoMap: mk(aoC, false),
    pal,
  };
  TEX_CACHE.set(key, out);
  return out;
}

function makeFinMaps(finRgb, q) {
  const key = `herofin_${finRgb.join('_')}_${q}`;
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key);
  const W = q === 'low' ? 256 : 512, H = W;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // 半透明底色
  g.fillStyle = `rgba(${finRgb[0]},${finRgb[1]},${finRgb[2]},0.75)`;
  g.fillRect(0, 0, W, H);
  // 鳍条（从左根部放射）
  g.lineWidth = q === 'low' ? 1.5 : 2;
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const y1 = H * (0.08 + t * 0.84);
    g.strokeStyle = `rgba(${(finRgb[0] * 0.35) | 0},${(finRgb[1] * 0.35) | 0},${(finRgb[2] * 0.35) | 0},${0.35 + t * 0.25})`;
    g.beginPath();
    g.moveTo(W * 0.04, H * 0.5);
    g.quadraticCurveTo(W * 0.45, y1, W * 0.96, y1 + (t - 0.5) * 8);
    g.stroke();
    // 横膜纹
    if (i % 2 === 0) {
      g.strokeStyle = `rgba(20,10,5,0.12)`;
      g.beginPath();
      g.moveTo(W * 0.2, H * 0.5);
      g.lineTo(W * 0.85, y1);
      g.stroke();
    }
  }
  // 边缘加深
  const grd = g.createLinearGradient(0, 0, W, 0);
  grd.addColorStop(0, 'rgba(0,0,0,0.1)');
  grd.addColorStop(0.7, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);

  const ac = document.createElement('canvas'); ac.width = W; ac.height = H;
  const ag = ac.getContext('2d');
  const fade = ag.createLinearGradient(0, 0, W, 0);
  fade.addColorStop(0, '#ffffff'); fade.addColorStop(0.55, '#f0f0f0'); fade.addColorStop(1, '#505050');
  ag.fillStyle = fade; ag.fillRect(0, 0, W, H);
  // 上下羽化
  const fadeV = ag.createLinearGradient(0, 0, 0, H);
  fadeV.addColorStop(0, 'rgba(0,0,0,0.5)'); fadeV.addColorStop(0.12, 'rgba(0,0,0,0)');
  fadeV.addColorStop(0.88, 'rgba(0,0,0,0)'); fadeV.addColorStop(1, 'rgba(0,0,0,0.5)');
  ag.fillStyle = fadeV; ag.fillRect(0, 0, W, H);

  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const alpha = new THREE.CanvasTexture(ac);
  const out = { map, alpha };
  TEX_CACHE.set(key, out);
  return out;
}

// ---------- 英雄游泳着色器：脊柱 S 弯 + 分区鳍颤 + 鳃盖 ----------
function patchHeroSwim(mat, uniforms, kind) {
  // kind: 'body' | 'fin' | 'gill' | 'eye'
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uAmp = uniforms.uAmp;
    sh.uniforms.uSpeed = uniforms.uSpeed;
    sh.uniforms.uLeap = uniforms.uLeap;
    sh.uniforms.uFin = uniforms.uFin;
    const isFin = kind === 'fin' ? '1.0' : '0.0';
    const isGill = kind === 'gill' ? '1.0' : '0.0';
    sh.vertexShader = `
      uniform float uTime; uniform float uAmp; uniform float uSpeed; uniform float uLeap; uniform float uFin;
    ` + sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float t = clamp(0.5 - position.x, 0.0, 1.25);
      float wave = sin(uTime * uSpeed - t * 5.2);
      float wave2 = sin(uTime * uSpeed * 1.65 - t * 8.5);
      float spine = uAmp * (0.015 + pow(t, 1.7) * 1.05);
      // 主脊柱左右 + 轻微上下起伏
      transformed.z += wave * spine;
      transformed.y += wave2 * spine * 0.1;
      // 跃水弓背
      transformed.y += uLeap * sin(t * 3.14159) * 0.1;
      transformed.z += uLeap * wave * t * 0.05;
      // 鳍：胸鳍划水感 + 背鳍波动 + 尾鳍大力
      float finK = ${isFin};
      float caudal = smoothstep(0.55, 1.0, t);
      transformed.z += sin(uTime * uSpeed * 2.2 - t * 10.0) * uAmp * uFin * 0.55 * finK * (0.4 + caudal * 1.2);
      transformed.y += sin(uTime * uSpeed * 2.8 + position.y * 18.0) * uAmp * uFin * 0.22 * finK;
      // 鳃盖开合
      float gillK = ${isGill};
      float gill = sin(uTime * 3.2) * 0.5 + 0.5;
      transformed.z += gillK * gill * 0.012 * sign(position.z);
      transformed.x += gillK * gill * -0.004;
    `);
  };
  mat.customProgramCacheKey = () => 'heroCarp_' + kind + '_v2';
  return mat;
}

function mixCol(a, b, t) {
  return [
    (a[0] + (b[0] - a[0]) * t) | 0,
    (a[1] + (b[1] - a[1]) * t) | 0,
    (a[2] + (b[2] - a[2]) * t) | 0,
  ];
}

/**
 * 构建英雄级鲤科鱼。variant: 'carp' | 'gold' | 'koi'
 * 体长归一化为 1，头朝 +x，背朝 +y。
 */
export function buildHeroCarp(variant = 'carp', seed = 7) {
  const q = qualityLevel();
  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.05 },
    uSpeed: { value: 6.2 },
    uLeap: { value: 0 },
    uFin: { value: 1 },
  };
  const group = new THREE.Group();
  const maps = makeCarpMaps(variant, q);
  const pal = maps.pal;

  // ---------- 高密度身体 ----------
  const U = q === 'low' ? 96 : 160;
  const V = q === 'low' ? 48 : 72;
  const H0 = 0.40; // 最大体高/体长
  const verts = [], uvs = [], idx = [];

  for (let i = 0; i <= U; i++) {
    const u = i / U;
    const x = 0.5 - u;
    const h = H0 * carpProfile(u);
    const thick = carpThick(u);
    const w = h * thick;
    // 背略尖、腹更圆；鲤背中段微隆
    const yBias = 0.03 * Math.sin(u * Math.PI) * h;
    for (let j = 0; j <= V; j++) {
      const th = (j / V) * Math.PI * 2;
      const sy = Math.sin(th), cz = Math.cos(th);
      const ys = sy > 0 ? 0.56 : 0.44; // 背高腹圆
      const zs = 0.50;
      // 头部侧向略收（吻部）
      const nose = u < 0.08 ? smooth(0, 0.08, u) * 0.55 + 0.45 : 1;
      verts.push(x, yBias + sy * h * ys, cz * w * zs * nose);
      // UV：u 体长，v 环向 0..1（0/1=背脊附近经左右回到腹）
      uvs.push(u, j / V);
    }
  }
  for (let i = 0; i < U; i++) {
    for (let j = 0; j < V; j++) {
      const a = i * (V + 1) + j, b = a + V + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('uv2', new THREE.Float32BufferAttribute(uvs, 2)); // AO
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: maps.map,
    roughnessMap: maps.roughnessMap,
    bumpMap: maps.bumpMap,
    bumpScale: q === 'low' ? 0.016 : 0.028,
    aoMap: maps.aoMap,
    aoMapIntensity: 0.85,
    roughness: 0.28,
    metalness: pal.metal * 0.45,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
    sheen: 0.65,
    sheenColor: new THREE.Color(0xffe8c8),
    sheenRoughness: 0.3,
    iridescence: variant === 'koi' ? 0.15 : 0.35,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [120, 380],
    envMapIntensity: 1.0,
  });
  patchHeroSwim(bodyMat, uniforms, 'body');
  const body = new THREE.Mesh(geo, bodyMat);
  group.add(body);

  // ---------- 鳃盖（可动） ----------
  const gillMat = bodyMat.clone();
  patchHeroSwim(gillMat, uniforms, 'gill');
  for (const sgn of [1, -1]) {
    const gill = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 14, 10, 0, Math.PI * 0.9, 0.2, Math.PI * 0.7),
      gillMat
    );
    gill.scale.set(0.7, 1.1, 0.45);
    gill.rotation.y = sgn * 0.4;
    gill.position.set(0.28, 0.01, sgn * 0.095);
    group.add(gill);
  }

  // ---------- 鳍 ----------
  const finMaps = makeFinMaps(pal.fin, q);
  const finMat = new THREE.MeshPhysicalMaterial({
    map: finMaps.map,
    alphaMap: finMaps.alpha,
    color: new THREE.Color(pal.fin[0] / 255, pal.fin[1] / 255, pal.fin[2] / 255),
    roughness: 0.28,
    metalness: 0.05,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    clearcoat: 0.7,
    clearcoatRoughness: 0.2,
    depthWrite: true,
    alphaTest: 0.06,
  });
  patchHeroSwim(finMat, uniforms, 'fin');

  const hAt = (u) => H0 * carpProfile(u);
  const addFin = (shape, matrix, segs = 28) => {
    const fg = new THREE.ShapeGeometry(shape, segs);
    if (matrix) fg.applyMatrix4(matrix);
    const m = new THREE.Mesh(fg, finMat);
    group.add(m);
    return m;
  };

  // 尾鳍（叉形，较大，带红感靠材质色）
  {
    const tx = -0.5 + 0.01, th = 0.38;
    const tail = new THREE.Shape();
    tail.moveTo(tx, 0.03);
    tail.quadraticCurveTo(tx - 0.12, 0.22, tx - 0.26, 0.42);
    tail.quadraticCurveTo(tx - 0.16, 0.14, tx - 0.11, 0);
    tail.quadraticCurveTo(tx - 0.16, -0.14, tx - 0.26, -0.42);
    tail.quadraticCurveTo(tx - 0.12, -0.22, tx, -0.03);
    addFin(tail);
  }
  // 背鳍
  {
    const d = new THREE.Shape();
    const d0 = 0.26, d1 = 0.58;
    d.moveTo(0.5 - d0, hAt(d0) * 0.55);
    d.quadraticCurveTo(0.5 - d0 - 0.04, hAt(d0) * 0.55 + 0.2, 0.5 - 0.38, hAt(0.38) * 0.55 + 0.195);
    d.quadraticCurveTo(0.5 - 0.48, hAt(0.48) * 0.55 + 0.08, 0.5 - d1, hAt(d1) * 0.52);
    d.lineTo(0.5 - d1 + 0.01, hAt(d1) * 0.48);
    addFin(d);
  }
  // 臀鳍
  {
    const a = new THREE.Shape();
    a.moveTo(0.5 - 0.58, -hAt(0.58) * 0.45);
    a.quadraticCurveTo(0.5 - 0.64, -hAt(0.64) * 0.5 - 0.14, 0.5 - 0.78, -hAt(0.78) * 0.48 - 0.08);
    a.lineTo(0.5 - 0.76, -hAt(0.76) * 0.42);
    addFin(a);
  }
  // 胸鳍 / 腹鳍
  for (const sgn of [1, -1]) {
    for (const [u0, yf, len, ang] of [[0.18, -0.05, 0.17, 0.6], [0.4, -0.42, 0.12, 0.35]]) {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.quadraticCurveTo(-len * 0.4, len * 0.45, -len, len * 0.15);
      s.quadraticCurveTo(-len * 0.5, -len * 0.1, 0, -0.006);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(0.5 - u0, hAt(u0) * yf, sgn * hAt(u0) * carpThick(u0) * 0.48),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(sgn * ang, sgn * 0.6, -0.45)),
        new THREE.Vector3(1, 1, 1)
      );
      addFin(s, m);
    }
  }

  // ---------- 两对口须（鲤鱼特征） ----------
  const barbMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(pal.side[0] / 255, pal.side[1] / 255, pal.side[2] / 255).multiplyScalar(0.7),
    roughness: 0.55, clearcoat: 0.3,
  });
  patchHeroSwim(barbMat, uniforms, 'body');
  for (const [sgn, pair] of [[1, 0], [-1, 0], [1, 1], [-1, 1]]) {
    const len = pair === 0 ? 0.07 : 0.045;
    const barb = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.0015, len, 6), barbMat);
    barb.geometry.translate(0, -len / 2, 0);
    barb.position.set(0.46 - pair * 0.02, -0.04 - pair * 0.015, sgn * (0.035 + pair * 0.012));
    barb.rotation.z = 0.9 + pair * 0.25;
    barb.rotation.y = sgn * 0.35;
    group.add(barb);
  }

  // ---------- 眼睛（角膜高光） ----------
  const er = 0.028;
  for (const sgn of [1, -1]) {
    const eye = new THREE.Group();
    eye.position.set(0.38, 0.045, sgn * 0.1);
    eye.rotation.y = sgn * 0.35;
    const sclera = new THREE.Mesh(
      new THREE.SphereGeometry(er * 1.05, 16, 12),
      patchHeroSwim(new THREE.MeshPhysicalMaterial({ color: 0xf5f0e6, roughness: 0.35, clearcoat: 0.9 }), uniforms, 'eye')
    );
    sclera.scale.set(0.5, 0.9, 0.35);
    eye.add(sclera);
    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(er * 0.85, 16, 12),
      patchHeroSwim(new THREE.MeshPhysicalMaterial({
        color: variant === 'koi' ? 0x1a1a1a : 0xc9a030,
        roughness: 0.2, metalness: 0.3, clearcoat: 1,
      }), uniforms, 'eye')
    );
    iris.scale.set(0.45, 0.95, 0.4);
    iris.position.z = sgn * er * 0.25;
    eye.add(iris);
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(er * 0.4, 12, 10),
      patchHeroSwim(new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.05, clearcoat: 1 }), uniforms, 'eye')
    );
    pupil.scale.set(0.45, 0.95, 0.35);
    pupil.position.z = sgn * er * 0.42;
    eye.add(pupil);
    // 角膜高光
    const hi = new THREE.Mesh(new THREE.SphereGeometry(er * 0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi.position.set(er * 0.12, er * 0.22, sgn * er * 0.55);
    eye.add(hi);
    const hi2 = new THREE.Mesh(new THREE.SphereGeometry(er * 0.06, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi2.position.set(-er * 0.06, -er * 0.1, sgn * er * 0.5);
    eye.add(hi2);
    group.add(eye);
  }

  // ---------- 嘴唇微凸 ----------
  const lip = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 12, 8),
    patchHeroSwim(new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(pal.belly[0] / 255, pal.belly[1] / 255, pal.belly[2] / 255).multiplyScalar(0.85),
      roughness: 0.45, clearcoat: 0.4,
    }), uniforms, 'body')
  );
  lip.scale.set(1.2, 0.55, 0.85);
  lip.position.set(0.495, -0.025, 0);
  group.add(lip);

  group.userData.uniforms = uniforms;
  group.userData.isHeroCarp = true;
  group.userData.variant = variant;
  group.userData.dispose = () => {
    group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  };
  return group;
}

export function isHeroSpecies(id) {
  return id === 'carp' || id === 'goldcarp' || id === 'koi';
}

export function heroVariantFor(id) {
  if (id === 'goldcarp') return 'gold';
  if (id === 'koi') return 'koi';
  return 'carp';
}
