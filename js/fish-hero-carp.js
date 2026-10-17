// 英雄级鲤鱼 v3 —— 高规格程序化（可选加载 vendor/fish/carp.glb）
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';

const TEX_CACHE = new Map();
let gltfTemplate = null; // 可选外部网格
let gltfTried = false;

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

/** 启动时尝试加载本地 CC0 网格（不存在则静默失败） */
export function preloadHeroAssets() {
  if (gltfTried) return Promise.resolve(!!gltfTemplate);
  gltfTried = true;
  // 仅当手动放入 carp.glb 且 localStorage.fishing3d_carp_glb === '1' 时加载，避免 404 污染控制台
  if (localStorage.getItem('fishing3d_carp_glb') !== '1') return Promise.resolve(false);
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load('vendor/fish/carp.glb', (gltf) => {
      gltfTemplate = gltf.scene;
      gltfTemplate.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      console.info('[hero-carp] 已加载 vendor/fish/carp.glb');
      resolve(true);
    }, undefined, () => resolve(false));
  });
}

function carpProfile(u) {
  const a = 0.48, b = 0.78;
  const um = a / (a + b);
  const fmax = Math.pow(um, a) * Math.pow(1 - um, b);
  const base = (Math.pow(Math.max(u, 1e-4), a) * Math.pow(Math.max(1 - u, 1e-4), b)) / fmax;
  const head = 1 - 0.22 * Math.exp(-Math.pow(u / 0.11, 2));
  const mid = 1 + 0.14 * Math.sin(Math.PI * clamp((u - 0.12) / 0.55, 0, 1));
  const ped = 1 + 0.28 * smooth(0.7, 0.93, u);
  return base * 1.1 * head * mid * ped + 0.045 * u;
}
function carpThick(u) {
  const mid = 0.46 + 0.06 * Math.sin(u * Math.PI);
  if (u < 0.2) return lerp(0.78, mid, smooth(0, 0.2, u));
  return lerp(mid, 0.68, smooth(0.68, 1, u));
}

function variantPalette(variant) {
  if (variant === 'gold') {
    return { top: [185, 120, 18], side: [255, 195, 55], belly: [255, 238, 175],
      scaleEdge: [110, 65, 8], fin: [255, 120, 35], accent: [255, 170, 40], koi: false, metal: 0.62 };
  }
  if (variant === 'koi') {
    return { top: [248, 244, 236], side: [255, 252, 248], belly: [255, 255, 255],
      scaleEdge: [170, 160, 150], fin: [235, 225, 215], accent: [200, 28, 22], koi: true, metal: 0.1 };
  }
  return { top: [78, 48, 24], side: [188, 118, 42], belly: [245, 228, 185],
    scaleEdge: [42, 24, 10], fin: [175, 48, 28], accent: [200, 85, 32], koi: false, metal: 0.32 };
}

function makeCarpMaps(variant, q) {
  const key = `hero3_${variant}_${q}`;
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key);
  const W = q === 'low' ? 384 : 768;
  const H = W;
  const pal = variantPalette(variant);
  const albedoC = document.createElement('canvas'); albedoC.width = W; albedoC.height = H;
  const roughC = document.createElement('canvas'); roughC.width = W; roughC.height = H;
  const bumpC = document.createElement('canvas'); bumpC.width = W; bumpC.height = H;
  const aoC = document.createElement('canvas'); aoC.width = W; aoC.height = H;
  const ga = albedoC.getContext('2d', { willReadFrequently: true });
  const gr = roughC.getContext('2d', { willReadFrequently: true });
  const gb = bumpC.getContext('2d', { willReadFrequently: true });
  const go = aoC.getContext('2d', { willReadFrequently: true });
  const imgA = ga.createImageData(W, H);
  const imgR = gr.createImageData(W, H);
  const imgB = gb.createImageData(W, H);
  const imgO = go.createImageData(W, H);

  // 鳞列数：沿体长更多，环向随体高变化感靠 UV 曲率
  const scaleU = q === 'low' ? 36 : 56;
  const scaleV = q === 'low' ? 20 : 32;
  const koiPatches = variant === 'koi' ? [
    { u: 0.2, v: 0.32, r: 0.2 }, { u: 0.45, v: 0.55, r: 0.3 },
    { u: 0.7, v: 0.3, r: 0.17 }, { u: 0.36, v: 0.78, r: 0.13 }, { u: 0.58, v: 0.22, r: 0.12 },
  ] : [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const ang = v * Math.PI * 2;
      const belly = (1 - Math.cos(ang)) * 0.5;
      const dorsal = 1 - belly;

      // 基础背→侧→腹
      let r = lerp(lerp(pal.top[0], pal.side[0], smooth(0.1, 0.48, belly)), pal.belly[0], smooth(0.38, 0.88, belly));
      let g = lerp(lerp(pal.top[1], pal.side[1], smooth(0.1, 0.48, belly)), pal.belly[1], smooth(0.38, 0.88, belly));
      let b = lerp(lerp(pal.top[2], pal.side[2], smooth(0.1, 0.48, belly)), pal.belly[2], smooth(0.38, 0.88, belly));

      // 藻斑（高画质）
      if (q !== 'low') {
        const algae = fbm(u * 7 + 2, v * 5, 3);
        if (algae > 0.62 && belly < 0.55 && u > 0.15 && u < 0.85) {
          const t = smooth(0.62, 0.85, algae) * 0.18 * dorsal;
          r = lerp(r, 70, t); g = lerp(g, 85, t); b = lerp(b, 40, t);
        }
      }

      // 吻部 / 头部：平滑皮肤区（减弱鳞）
      const headMask = 1 - smooth(0.0, 0.16, u);
      const snoutSmooth = headMask * (0.55 + 0.45 * dorsal);

      // 头部加深 + 眼眶暗影
      r *= 1 - headMask * dorsal * 0.32;
      g *= 1 - headMask * dorsal * 0.32;
      b *= 1 - headMask * dorsal * 0.28;

      // 侧线 + 侧线孔
      const lat = Math.exp(-Math.pow((belly - 0.4) / 0.025, 2)) * smooth(0.12, 0.22, u) * smooth(0.08, 0.2, 1 - u);
      r *= 1 - 0.28 * lat; g *= 1 - 0.28 * lat; b *= 1 - 0.22 * lat;
      const pore = Math.sin(u * Math.PI * 55) * lat;
      if (pore > 0.7) { r *= 0.75; g *= 0.75; b *= 0.75; }

      // 鼻孔区微暗
      if (u < 0.07 && Math.abs(belly - 0.35) < 0.08) {
        const nd = 1 - Math.hypot((u - 0.04) / 0.03, (belly - 0.35) / 0.06);
        if (nd > 0) { r *= 1 - nd * 0.45; g *= 1 - nd * 0.45; b *= 1 - nd * 0.4; }
      }

      // 嘴裂
      if (u < 0.045 && belly > 0.45 && belly < 0.75) {
        const m = smooth(0.045, 0.01, u) * smooth(0.45, 0.55, belly) * smooth(0.75, 0.6, belly);
        r = lerp(r, 40, m); g = lerp(g, 22, m); b = lerp(b, 18, m);
      }

      if (pal.koi) {
        let red = 0;
        for (const p of koiPatches) {
          const du = (u - p.u) / p.r, dv = (belly - (p.v * 0.65 + 0.12)) / (p.r * 0.95);
          const d = Math.hypot(du, dv);
          const n = fbm(u * 5.5 + p.u * 9, belly * 4.5 + p.v * 7, 4);
          red = Math.max(red, smooth(1.1, 0.28, d + (n - 0.5) * 0.45));
        }
        r = lerp(r, pal.accent[0], red);
        g = lerp(g, pal.accent[1], red);
        b = lerp(b, pal.accent[2], red);
        const edge = red * (1 - red) * 4;
        r = lerp(r, 90, edge * 0.3); g = lerp(g, 18, edge * 0.3); b = lerp(b, 12, edge * 0.3);
      }

      // —— 不规则叠鳞：扰动网格 + 椭圆鳞 + 曲率拉伸 ——
      // 环向按体高“拉伸”：腹侧鳞略大
      const curveStretch = 0.85 + belly * 0.35;
      const warpU = q === 'low' ? 0 : (fbm(u * 3.5, v * 3.2, 2) - 0.5) * 0.45;
      const warpV = q === 'low' ? 0 : (fbm(u * 3.2 + 9, v * 3.5 + 4, 2) - 0.5) * 0.4;
      const su = u * scaleU + warpU;
      const sv = v * scaleV * curveStretch + warpV;
      const row = Math.floor(sv);
      const colOff = (row % 2) * 0.5;
      const col = Math.floor(su + colOff);
      const fu = (su + colOff) - col;
      const fv = sv - row;
      const szJ = 0.78 + hash2(col + 2, row + 5) * 0.4;
      // 头部缩小鳞片 / 吻部几乎无鳞
      const scaleAmt = (1 - snoutSmooth * 0.95) * smooth(0.04, 0.12, u) * smooth(0.04, 0.12, 1 - u);
      const dx = (fu - 0.5) * 2.05 * szJ;
      const dy = (fv - 0.5) * 2.25 * szJ;
      const dist = Math.hypot(dx, dy * 0.88);
      const inScale = scaleAmt > 0.15 && dist < 1.0;
      const scaleHi = inScale ? Math.pow(smooth(1.0, 0.1, dist), 1.35) * (0.45 + 0.55 * clamp(0.55 - dy, 0, 1)) * scaleAmt : 0;
      const scaleEdge = inScale ? smooth(0.42, 1.0, dist) * scaleAmt : 0;

      r = lerp(r, pal.scaleEdge[0], scaleEdge * 0.72);
      g = lerp(g, pal.scaleEdge[1], scaleEdge * 0.72);
      b = lerp(b, pal.scaleEdge[2], scaleEdge * 0.72);
      r = Math.min(255, r + scaleHi * 55);
      g = Math.min(255, g + scaleHi * 42);
      b = Math.min(255, b + scaleHi * 22);

      const tone = (hash2(col, row) - 0.5) * 14 * scaleAmt;
      r = clamp(r + tone, 0, 255); g = clamp(g + tone * 0.85, 0, 255); b = clamp(b + tone * 0.55, 0, 255);
      if (q !== 'low') {
        const micro = (fbm(u * 110, v * 90, 2) - 0.5) * 12;
        r = clamp(r + micro, 0, 255); g = clamp(g + micro * 0.9, 0, 255); b = clamp(b + micro * 0.65, 0, 255);
      }

      if (variant === 'carp' && u > 0.86) {
        const t = smooth(0.86, 1, u) * dorsal;
        r = lerp(r, 200, t * 0.45); g = lerp(g, 52, t * 0.45); b = lerp(b, 32, t * 0.45);
      }

      const i = (y * W + x) * 4;
      imgA.data[i] = r; imgA.data[i + 1] = g; imgA.data[i + 2] = b; imgA.data[i + 3] = 255;

      let rough = lerp(0.14, 0.48, belly) + scaleEdge * 0.32 - scaleHi * 0.16 + snoutSmooth * 0.08;
      rough += (fbm(u * 30, v * 24, 2) - 0.5) * 0.06;
      rough = clamp(rough, 0.06, 0.9);
      const rv = (rough * 255) | 0;
      imgR.data[i] = rv; imgR.data[i + 1] = rv; imgR.data[i + 2] = rv; imgR.data[i + 3] = 255;

      let bump = 0.4 + scaleHi * 0.58 - scaleEdge * 0.42 - lat * 0.5 - snoutSmooth * 0.25;
      bump = clamp(bump, 0, 1);
      const bv = (bump * 255) | 0;
      imgB.data[i] = bv; imgB.data[i + 1] = bv; imgB.data[i + 2] = bv; imgB.data[i + 3] = 255;

      let ao = 1 - scaleEdge * 0.45 - headMask * dorsal * 0.35 - Math.pow(1 - Math.min(belly, 1 - belly) * 2, 2) * 0.1;
      ao = clamp(ao, 0.28, 1);
      const av = (ao * 255) | 0;
      imgO.data[i] = av; imgO.data[i + 1] = av; imgO.data[i + 2] = av; imgO.data[i + 3] = 255;
    }
  }
  ga.putImageData(imgA, 0, 0); gr.putImageData(imgR, 0, 0); gb.putImageData(imgB, 0, 0); go.putImageData(imgO, 0, 0);

  // 头部平滑贴图（快速渐变）
  const headC = document.createElement('canvas'); headC.width = 256; headC.height = 256;
  const hg = headC.getContext('2d');
  const grd = hg.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, `rgb(${pal.belly[0]},${pal.belly[1]},${pal.belly[2]})`);
  grd.addColorStop(0.45, `rgb(${pal.side[0]},${pal.side[1]},${pal.side[2]})`);
  grd.addColorStop(1, `rgb(${(pal.top[0]*0.82)|0},${(pal.top[1]*0.82)|0},${(pal.top[2]*0.8)|0})`);
  hg.fillStyle = grd; hg.fillRect(0, 0, 256, 256);
  // 轻噪
  const himg = hg.getImageData(0, 0, 256, 256);
  for (let i = 0; i < himg.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 12;
    himg.data[i] = clamp(himg.data[i] + n, 0, 255);
    himg.data[i+1] = clamp(himg.data[i+1] + n, 0, 255);
    himg.data[i+2] = clamp(himg.data[i+2] + n, 0, 255);
  }
  hg.putImageData(himg, 0, 0);

  const mk = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = q === 'low' ? 2 : 8;
    t.needsUpdate = true;
    return t;
  };
  const out = {
    map: mk(albedoC, true), roughnessMap: mk(roughC, false),
    bumpMap: mk(bumpC, false), aoMap: mk(aoC, false),
    headMap: mk(headC, true), pal,
  };
  TEX_CACHE.set(key, out);
  return out;
}

function makeFinMaps(finRgb, q) {
  const key = `herofin3_${finRgb.join('_')}_${q}`;
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key);
  const W = q === 'low' ? 256 : 512, H = W;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  // 半透膜
  const grd = g.createLinearGradient(0, 0, W, 0);
  grd.addColorStop(0, `rgba(${finRgb[0]},${finRgb[1]},${finRgb[2]},0.92)`);
  grd.addColorStop(0.7, `rgba(${finRgb[0]},${finRgb[1]},${finRgb[2]},0.55)`);
  grd.addColorStop(1, `rgba(${finRgb[0]},${finRgb[1]},${finRgb[2]},0.15)`);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // 软鳍条
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const y1 = H * (0.06 + t * 0.88);
    g.strokeStyle = `rgba(${(finRgb[0]*0.3)|0},${(finRgb[1]*0.3)|0},${(finRgb[2]*0.3)|0},${0.25 + t * 0.35})`;
    g.lineWidth = 1.2 + (1 - t) * 1.5;
    g.beginPath();
    g.moveTo(W * 0.03, H * 0.5);
    g.quadraticCurveTo(W * 0.4, y1, W * 0.97, y1 + (t - 0.5) * 10);
    g.stroke();
  }
  // 横膜
  g.strokeStyle = 'rgba(20,8,5,0.1)';
  for (let i = 0; i < 8; i++) {
    const x = W * (0.15 + i * 0.1);
    g.beginPath(); g.moveTo(x, H * 0.12); g.lineTo(x + 8, H * 0.88); g.stroke();
  }
  const ac = document.createElement('canvas'); ac.width = W; ac.height = H;
  const ag = ac.getContext('2d');
  const a1 = ag.createLinearGradient(0, 0, W, 0);
  a1.addColorStop(0, '#ffffff'); a1.addColorStop(0.5, '#f4f4f4'); a1.addColorStop(0.85, '#a0a0a0'); a1.addColorStop(1, '#202020');
  ag.fillStyle = a1; ag.fillRect(0, 0, W, H);
  const a2 = ag.createLinearGradient(0, 0, 0, H);
  a2.addColorStop(0, 'rgba(0,0,0,0.55)'); a2.addColorStop(0.1, 'rgba(0,0,0,0)');
  a2.addColorStop(0.9, 'rgba(0,0,0,0)'); a2.addColorStop(1, 'rgba(0,0,0,0.55)');
  ag.globalCompositeOperation = 'multiply';
  ag.fillStyle = a2; ag.fillRect(0, 0, W, H);

  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const alpha = new THREE.CanvasTexture(ac);
  const out = { map, alpha };
  TEX_CACHE.set(key, out);
  return out;
}

function patchHeroSwim(mat, uniforms, kind) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uAmp = uniforms.uAmp;
    sh.uniforms.uSpeed = uniforms.uSpeed;
    sh.uniforms.uLeap = uniforms.uLeap;
    sh.uniforms.uFin = uniforms.uFin;
    const isFin = kind === 'fin' ? '1.0' : '0.0';
    const isGill = kind === 'gill' ? '1.0' : '0.0';
    const isBarb = kind === 'barb' ? '1.0' : '0.0';
    sh.vertexShader = `uniform float uTime; uniform float uAmp; uniform float uSpeed; uniform float uLeap; uniform float uFin;\n` +
      sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float t = clamp(0.5 - position.x, 0.0, 1.25);
      float wave = sin(uTime * uSpeed - t * 5.2);
      float wave2 = sin(uTime * uSpeed * 1.65 - t * 8.5);
      float spine = uAmp * (0.015 + pow(t, 1.7) * 1.05);
      transformed.z += wave * spine;
      transformed.y += wave2 * spine * 0.1;
      transformed.y += uLeap * sin(t * 3.14159) * 0.1;
      transformed.z += uLeap * wave * t * 0.05;
      float finK = ${isFin};
      float caudal = smoothstep(0.55, 1.0, t);
      transformed.z += sin(uTime * uSpeed * 2.2 - t * 10.0) * uAmp * uFin * 0.55 * finK * (0.4 + caudal * 1.2);
      transformed.y += sin(uTime * uSpeed * 2.8 + position.y * 18.0) * uAmp * uFin * 0.22 * finK;
      float gillK = ${isGill};
      float gill = sin(uTime * 3.2) * 0.5 + 0.5;
      transformed.z += gillK * gill * 0.014 * sign(position.z);
      transformed.x += gillK * gill * -0.005;
      float barbK = ${isBarb};
      transformed.y += barbK * sin(uTime * 4.5 + position.y * 30.0) * 0.006;
      transformed.z += barbK * sin(uTime * 3.8) * 0.004 * sign(position.z);
    `);
  };
  mat.customProgramCacheKey = () => 'heroCarp3_' + kind;
  return mat;
}

function fromGltf(variant, uniforms) {
  const root = gltfTemplate.clone(true);
  const pal = variantPalette(variant);
  const col = new THREE.Color(pal.side[0] / 255, pal.side[1] / 255, pal.side[2] / 255);
  root.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material.clone();
    if (variant === 'gold') { m.color = new THREE.Color(0xffc030); m.metalness = 0.55; m.roughness = 0.25; }
    else if (variant === 'koi') { m.color = new THREE.Color(0xfff8f0); m.metalness = 0.1; m.roughness = 0.35; }
    else { m.color = col; m.metalness = 0.25; m.roughness = 0.3; }
    if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
      m.clearcoat = 0.9; m.clearcoatRoughness = 0.1;
    }
    patchHeroSwim(m, uniforms, 'body');
    o.material = m;
  });
  // 归一化到体长 ≈ 1，头朝 +x
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  root.position.sub(center);
  const s = 1 / Math.max(size.x, size.y, size.z);
  root.scale.setScalar(s);
  const wrap = new THREE.Group();
  wrap.add(root);
  wrap.userData.uniforms = uniforms;
  wrap.userData.isHeroCarp = true;
  wrap.userData.variant = variant;
  wrap.userData.fromGltf = true;
  wrap.userData.dispose = () => wrap.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return wrap;
}

export function buildHeroCarp(variant = 'carp', seed = 7) {
  const q = qualityLevel();
  const uniforms = {
    uTime: { value: 0 }, uAmp: { value: 0.048 }, uSpeed: { value: 6.0 },
    uLeap: { value: 0 }, uFin: { value: 1 },
  };
  if (gltfTemplate) return fromGltf(variant, uniforms);

  const group = new THREE.Group();
  const maps = makeCarpMaps(variant, q);
  const pal = maps.pal;
  const U = q === 'low' ? 72 : 140;
  const V = q === 'low' ? 40 : 64;
  const H0 = 0.41;
  const verts = [], uvs = [], idx = [];

  for (let i = 0; i <= U; i++) {
    const u = i / U, x = 0.5 - u;
    const h = H0 * carpProfile(u);
    const thick = carpThick(u);
    const w = h * thick;
    const yBias = 0.035 * Math.sin(u * Math.PI) * h;
    for (let j = 0; j <= V; j++) {
      const th = (j / V) * Math.PI * 2;
      const sy = Math.sin(th), cz = Math.cos(th);
      const ys = sy > 0 ? 0.57 : 0.43;
      const nose = u < 0.09 ? smooth(0, 0.09, u) * 0.5 + 0.5 : 1;
      verts.push(x, yBias + sy * h * ys, cz * w * 0.5 * nose);
      uvs.push(u, j / V);
    }
  }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
    const a = i * (V + 1) + j, b = a + V + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('uv2', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: maps.map, roughnessMap: maps.roughnessMap, bumpMap: maps.bumpMap,
    bumpScale: q === 'low' ? 0.02 : 0.034, aoMap: maps.aoMap, aoMapIntensity: 0.9,
    roughness: 0.26, metalness: pal.metal * 0.42,
    clearcoat: 1.0, clearcoatRoughness: 0.06,
    sheen: 0.7, sheenColor: new THREE.Color(0xffd8b0), sheenRoughness: 0.28,
    iridescence: variant === 'koi' ? 0.12 : 0.4, iridescenceIOR: 1.45,
    iridescenceThicknessRange: [100, 420], envMapIntensity: 1.05,
  });
  patchHeroSwim(bodyMat, uniforms, 'body');
  group.add(new THREE.Mesh(geo, bodyMat));

  // 头部覆盖层（平滑吻部）—— 短截网格
  {
    const HU = 24, HV = 36;
    const hv = [], hu = [], hi = [];
    for (let i = 0; i <= HU; i++) {
      const u = (i / HU) * 0.14;
      const x = 0.5 - u;
      const h = H0 * carpProfile(u) * 1.02;
      const w = h * carpThick(u);
      for (let j = 0; j <= HV; j++) {
        const th = (j / HV) * Math.PI * 2;
        const sy = Math.sin(th), cz = Math.cos(th);
        const ys = sy > 0 ? 0.56 : 0.44;
        const nose = smooth(0, 0.09, u) * 0.5 + 0.5;
        hv.push(x, sy * h * ys * 1.01, cz * w * 0.5 * nose * 1.01);
        hu.push(u / 0.14, j / HV);
      }
    }
    for (let i = 0; i < HU; i++) for (let j = 0; j < HV; j++) {
      const a = i * (HV + 1) + j, b = a + HV + 1;
      hi.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.Float32BufferAttribute(hv, 3));
    hg.setAttribute('uv', new THREE.Float32BufferAttribute(hu, 2));
    hg.setIndex(hi); hg.computeVertexNormals();
    const headMat = new THREE.MeshPhysicalMaterial({
      map: maps.headMap, roughness: 0.38, metalness: 0.08,
      clearcoat: 0.85, clearcoatRoughness: 0.12,
      sheen: 0.5, sheenColor: new THREE.Color(0xffe0c0), transparent: true, opacity: 0.92,
    });
    patchHeroSwim(headMat, uniforms, 'body');
    group.add(new THREE.Mesh(hg, headMat));
  }

  // 鳃盖
  const gillMat = bodyMat.clone();
  patchHeroSwim(gillMat, uniforms, 'gill');
  for (const sgn of [1, -1]) {
    const gill = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12, 0, Math.PI * 0.95, 0.15, Math.PI * 0.75), gillMat);
    gill.scale.set(0.65, 1.15, 0.42);
    gill.rotation.y = sgn * 0.45;
    gill.position.set(0.27, 0.01, sgn * 0.1);
    group.add(gill);
  }

  // 鳍
  const finMaps = makeFinMaps(pal.fin, q);
  const finMat = new THREE.MeshPhysicalMaterial({
    map: finMaps.map, alphaMap: finMaps.alpha,
    color: new THREE.Color(pal.fin[0] / 255, pal.fin[1] / 255, pal.fin[2] / 255),
    roughness: 0.22, metalness: 0.04, transparent: true, opacity: 0.88,
    side: THREE.DoubleSide, clearcoat: 0.75, clearcoatRoughness: 0.18,
    transmission: 0.15, thickness: 0.05, attenuationColor: new THREE.Color(0xff6633),
    attenuationDistance: 0.4, depthWrite: false, alphaTest: 0.04,
  });
  patchHeroSwim(finMat, uniforms, 'fin');
  const hAt = (u) => H0 * carpProfile(u);
  const addFin = (shape, matrix, segs = 32) => {
    const fg = new THREE.ShapeGeometry(shape, segs);
    if (matrix) fg.applyMatrix4(matrix);
    group.add(new THREE.Mesh(fg, finMat));
  };
  {
    const tx = -0.5 + 0.01, th = 0.4;
    const tail = new THREE.Shape();
    tail.moveTo(tx, 0.025);
    tail.quadraticCurveTo(tx - 0.13, 0.24, tx - 0.28, 0.45);
    tail.quadraticCurveTo(tx - 0.17, 0.14, tx - 0.11, 0);
    tail.quadraticCurveTo(tx - 0.17, -0.14, tx - 0.28, -0.45);
    tail.quadraticCurveTo(tx - 0.13, -0.24, tx, -0.025);
    addFin(tail);
  }
  {
    const d = new THREE.Shape();
    d.moveTo(0.5 - 0.24, hAt(0.24) * 0.55);
    d.quadraticCurveTo(0.5 - 0.28, hAt(0.24) * 0.55 + 0.22, 0.5 - 0.38, hAt(0.38) * 0.55 + 0.2);
    d.quadraticCurveTo(0.5 - 0.5, hAt(0.5) * 0.55 + 0.07, 0.5 - 0.6, hAt(0.6) * 0.5);
    d.lineTo(0.5 - 0.58, hAt(0.58) * 0.46);
    addFin(d);
  }
  {
    const a = new THREE.Shape();
    a.moveTo(0.5 - 0.56, -hAt(0.56) * 0.44);
    a.quadraticCurveTo(0.5 - 0.62, -hAt(0.62) * 0.5 - 0.15, 0.5 - 0.8, -hAt(0.8) * 0.46 - 0.08);
    a.lineTo(0.5 - 0.78, -hAt(0.78) * 0.4);
    addFin(a);
  }
  for (const sgn of [1, -1]) {
    for (const [u0, yf, len, ang] of [[0.17, -0.04, 0.18, 0.62], [0.4, -0.42, 0.125, 0.38]]) {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.quadraticCurveTo(-len * 0.4, len * 0.48, -len, len * 0.14);
      s.quadraticCurveTo(-len * 0.5, -len * 0.1, 0, -0.005);
      addFin(s, new THREE.Matrix4().compose(
        new THREE.Vector3(0.5 - u0, hAt(u0) * yf, sgn * hAt(u0) * carpThick(u0) * 0.48),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(sgn * ang, sgn * 0.62, -0.48)),
        new THREE.Vector3(1, 1, 1)));
    }
  }

  // 口须（锥管 + 摆动）
  const barbMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(pal.side[0] / 255, pal.side[1] / 255, pal.side[2] / 255).multiplyScalar(0.65),
    roughness: 0.55, clearcoat: 0.35,
  });
  patchHeroSwim(barbMat, uniforms, 'barb');
  for (const [sgn, pair] of [[1, 0], [-1, 0], [1, 1], [-1, 1]]) {
    const len = pair === 0 ? 0.085 : 0.055;
    const barb = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.0012, len, 7), barbMat);
    barb.geometry.translate(0, -len / 2, 0);
    barb.position.set(0.455 - pair * 0.018, -0.042 - pair * 0.016, sgn * (0.038 + pair * 0.014));
    barb.rotation.z = 1.0 + pair * 0.28;
    barb.rotation.y = sgn * 0.4;
    group.add(barb);
  }

  // 眼睛：巩膜 + 虹膜 + 瞳孔 + 角膜球
  const er = 0.03;
  for (const sgn of [1, -1]) {
    const eye = new THREE.Group();
    eye.position.set(0.375, 0.048, sgn * 0.105);
    eye.rotation.y = sgn * 0.4;
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(er * 1.08, 18, 14),
      patchHeroSwim(new THREE.MeshPhysicalMaterial({ color: 0xf3eee4, roughness: 0.32, clearcoat: 0.95 }), uniforms, 'body'));
    sclera.scale.set(0.48, 0.92, 0.32); eye.add(sclera);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(er * 0.88, 18, 14),
      patchHeroSwim(new THREE.MeshPhysicalMaterial({
        color: variant === 'koi' ? 0x151515 : 0xc8a028, roughness: 0.18, metalness: 0.35, clearcoat: 1,
      }), uniforms, 'body'));
    iris.scale.set(0.42, 0.95, 0.38); iris.position.z = sgn * er * 0.26; eye.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(er * 0.4, 12, 10),
      patchHeroSwim(new THREE.MeshPhysicalMaterial({ color: 0x030303, roughness: 0.04, clearcoat: 1 }), uniforms, 'body'));
    pupil.scale.set(0.42, 0.95, 0.32); pupil.position.z = sgn * er * 0.44; eye.add(pupil);
    // 角膜（略大的透明球）
    const cornea = new THREE.Mesh(new THREE.SphereGeometry(er * 1.05, 16, 12),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff, roughness: 0.05, transmission: 0.65, thickness: 0.02,
        transparent: true, opacity: 0.35, clearcoat: 1, clearcoatRoughness: 0.02,
      }));
    cornea.scale.set(0.5, 0.95, 0.4); cornea.position.z = sgn * er * 0.15; eye.add(cornea);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(er * 0.15, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi.position.set(er * 0.14, er * 0.24, sgn * er * 0.58); eye.add(hi);
    const hi2 = new THREE.Mesh(new THREE.SphereGeometry(er * 0.06, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi2.position.set(-er * 0.08, -er * 0.1, sgn * er * 0.52); eye.add(hi2);
    group.add(eye);
  }

  // 唇 + 口腔暗部
  const lip = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 10),
    patchHeroSwim(new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(pal.belly[0] / 255, pal.belly[1] / 255, pal.belly[2] / 255).multiplyScalar(0.8),
      roughness: 0.5, clearcoat: 0.45,
    }), uniforms, 'body'));
  lip.scale.set(1.25, 0.5, 0.9); lip.position.set(0.498, -0.028, 0); group.add(lip);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a0e0a, roughness: 0.9 }));
  mouth.scale.set(0.7, 0.35, 0.55); mouth.position.set(0.505, -0.03, 0); group.add(mouth);

  group.userData.uniforms = uniforms;
  group.userData.isHeroCarp = true;
  group.userData.variant = variant;
  group.userData.dispose = () => group.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
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
