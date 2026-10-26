// 场景环境：天空、太阳、PBR 环境光、水面、地形、树木、灌木、芦苇、码头、云
import * as THREE from 'three';
import { Water } from '../vendor/addons/Water.js';
import { Sky } from '../vendor/addons/Sky.js';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';
import { fbm, vnoise, smooth, rand } from './util.js';
import { buildLaoYu } from './npc-laoyu.js?v=16';

export const LAKE_CENTER = new THREE.Vector2(0, -320);
export const DECK_Y = 0.9;
export const DOCK_END_Z = -6;
const SHORE_R = 335;

export function heightAt(x, z) {
  const dx = x - LAKE_CENTER.x, dz = z - LAKE_CENTER.y;
  const d = Math.hypot(dx, dz);
  const ang = Math.atan2(dz, dx);
  let da = Math.abs(ang - Math.PI / 2); if (da > Math.PI) da = 2 * Math.PI - da;
  const irregular = (fbm(Math.cos(ang) * 2 + 7, Math.sin(ang) * 2 + 3, 4) - 0.5) * 160 * smooth(0.12, 0.7, da);
  const e = d - (SHORE_R + irregular);
  let h = -5 + 5.8 * smooth(-60, 25, e);
  const n = fbm(x * 0.004 + 10, z * 0.004 + 3, 5);
  h += smooth(10, 260, e) * (8 + 75 * n * n * 1.6);
  const m = fbm(x * 0.0016 + 50, z * 0.0016 + 80, 5);
  h += smooth(650, 1300, d) * (50 + 330 * m * m * 1.4);
  // 远山脊线起伏更明显
  const ridge = fbm(x * 0.0009 + 120, z * 0.0009 + 40, 4);
  h += smooth(900, 1600, d) * (40 + 180 * Math.pow(ridge, 1.6));
  h += (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 1.4 * smooth(-5, 30, e);
  return h;
}

/** 码头和岸边房子脚下的地面。换钓点时留着，避免人和屋子悬空。 */
function onPierPad(x, z) {
  return Math.abs(x) < 16 && z > -6 && z < 55;
}

/**
 * 视觉地形高度。heightAt 仍给码头、交互和植被落点用，玩法坐标不变。
 * 这里只改网格，让每个钓点的岸线剪影不一样。
 */
function landHeight(kind, x, z, y0) {
  if (!kind || kind === 'lake') return y0;
  if (onPierPad(x, z)) return y0;
  const dockD = Math.hypot(x, z + 3);
  const lakeD = Math.hypot(x - LAKE_CENTER.x, z - LAKE_CENTER.y);
  if (kind === 'coast') {
    // 港池：近岸削成一块几乎贴着水面的平地，远山压矮，防波堤才是剪影。
    let y = y0;
    if (y0 > -1.6) y = Math.min(y0, dockD < 180 ? 0.42 : 0.55 + Math.max(0, y0 - 0.55) * 0.08);
    if (lakeD > 780) y = Math.min(y, 10 + (lakeD - 780) * 0.012);
    return y;
  }
  if (kind === 'reef') {
    const n = fbm(x * 0.016 + 2.2, z * 0.016 - 1.1, 3);
    // 正前方留一条可抛竿的水道，两侧和中距离堆低沙丘、沙洲。
    if (dockD < 16 && Math.abs(x) < 4.5) return Math.min(y0, -1.35);
    if (y0 < -1.4) {
      const bar = n > 0.62 ? (n - 0.62) * 7.2 : 0;
      return Math.min(1.35, -0.55 + bar);
    }
    const dune = (n - 0.42) * 3.6;
    return Math.max(-0.4, Math.min(2.6, 0.25 + dune));
  }
  if (kind === 'offshore') {
    // 近处整片沉进水里，只剩道具岛。
    if (lakeD > 1700) {
      const n = fbm(x * 0.0035 + 4, z * 0.0035, 3);
      return -2.2 + n * 3;
    }
    return -5.5;
  }
  if (kind === 'stream') {
    if (lakeD > 880) return y0 * 1.18 + 4;
    return y0;
  }
  if (kind === 'marsh') {
    if (y0 > 0.35 && y0 < 48 && lakeD < 980) return 0.35 + (y0 - 0.35) * 0.42;
    return y0;
  }
  if (kind === 'night') {
    if (lakeD > 820) return y0 * 0.78;
    if (y0 < 1.2) return y0 - 0.55;
    return y0;
  }
  if (kind === 'dam') {
    const near = 1 - smooth(180, 980, dockD);
    if (y0 > 0.2 && lakeD < 1200) return y0 * (1 - 0.72 * near);
    return y0;
  }
  return y0;
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
function fbm2(x, y, o = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < o; i++) { s += a * noise2(x * f, y * f); n += a; f *= 2.03; a *= 0.5; }
  return s / n;
}

/** 可平铺的地表细节贴图：草 / 土 / 岩（画布噪声，启动快） */
function makeTerrainDetailMaps(quality) {
  const W = quality === 'low' ? 256 : 512;
  const albedo = document.createElement('canvas'); albedo.width = W; albedo.height = W;
  const bump = document.createElement('canvas'); bump.width = W; bump.height = W;
  const rough = document.createElement('canvas'); rough.width = W; rough.height = W;
  const ga = albedo.getContext('2d');
  const gb = bump.getContext('2d');
  const gr = rough.getContext('2d');
  // 底色：草地
  ga.fillStyle = '#4e6230'; ga.fillRect(0, 0, W, W);
  // 多层噪点斑块
  for (let i = 0; i < (quality === 'low' ? 900 : 2200); i++) {
    const x = Math.random() * W, y = Math.random() * W, r = rand(2, 14);
    const kind = Math.random();
    let col;
    if (kind < 0.55) col = `rgba(${60+Math.random()*50|0},${90+Math.random()*60|0},${35+Math.random()*30|0},${rand(0.15,0.45)})`;
    else if (kind < 0.8) col = `rgba(${90+Math.random()*50|0},${65+Math.random()*35|0},${35+Math.random()*25|0},${rand(0.2,0.5)})`;
    else col = `rgba(${100+Math.random()*50|0},${95+Math.random()*40|0},${85+Math.random()*35|0},${rand(0.2,0.55)})`;
    ga.fillStyle = col;
    ga.beginPath(); ga.ellipse(x, y, r, r * rand(0.5, 1.2), Math.random() * 3, 0, 7); ga.fill();
  }
  // 细草丝
  ga.strokeStyle = 'rgba(40,70,25,0.25)';
  for (let i = 0; i < (quality === 'low' ? 400 : 1200); i++) {
    const x = Math.random() * W, y = Math.random() * W;
    ga.beginPath(); ga.moveTo(x, y); ga.lineTo(x + rand(-3, 3), y - rand(4, 10)); ga.stroke();
  }
  // 岩裂
  ga.strokeStyle = 'rgba(40,35,30,0.35)';
  for (let i = 0; i < 40; i++) {
    ga.lineWidth = rand(0.5, 2);
    const x0 = Math.random() * W, y0 = Math.random() * W;
    ga.beginPath(); ga.moveTo(x0, y0);
    for (let k = 0; k < 5; k++) ga.lineTo(x0 + rand(-30, 30), y0 + rand(-30, 30));
    ga.stroke();
  }
  // bump / rough 从 albedo 派生
  const img = ga.getImageData(0, 0, W, W);
  const ib = gb.createImageData(W, W), ir = gr.createImageData(W, W);
  for (let i = 0; i < img.data.length; i += 4) {
    const lum = (img.data[i] * 0.3 + img.data[i+1] * 0.55 + img.data[i+2] * 0.15) / 255;
    const bv = (lum * 200 + 40) | 0;
    ib.data[i] = bv; ib.data[i+1] = bv; ib.data[i+2] = bv; ib.data[i+3] = 255;
    const rv = ((0.55 + (1 - lum) * 0.4) * 255) | 0;
    ir.data[i] = rv; ir.data[i+1] = rv; ir.data[i+2] = rv; ir.data[i+3] = 255;
  }
  gb.putImageData(ib, 0, 0); gr.putImageData(ir, 0, 0);
  const mk = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(90, 90);
    t.anisotropy = quality === 'low' ? 2 : 8;
    t.needsUpdate = true;
    return t;
  };
  return { map: mk(albedo, true), bumpMap: mk(bump, false), roughnessMap: mk(rough, false) };
}

function makeBarkMaps(quality) {
  const W = quality === 'low' ? 256 : 512, H = W * 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#4a3424'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 180; i++) {
    const x0 = Math.random() * W, amp = rand(1, 5), f = rand(0.008, 0.03), ph = Math.random() * 6;
    g.strokeStyle = `rgba(${30 + Math.random() * 30|0},${18 + Math.random() * 20|0},${8 + Math.random() * 12|0},${rand(0.15, 0.55)})`;
    g.lineWidth = rand(0.8, 3);
    g.beginPath();
    for (let y = 0; y <= H; y += 6) {
      const x = x0 + Math.sin(y * f + ph) * amp;
      y === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  // 横纹裂缝
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * H;
    g.strokeStyle = `rgba(20,12,6,${rand(0.2, 0.5)})`;
    g.lineWidth = rand(0.5, 1.5);
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x * 0.1 + i) * 2);
    g.stroke();
  }
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 28;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function makeFoliageBillboard(quality) {
  const W = quality === 'low' ? 128 : 256;
  const c = document.createElement('canvas'); c.width = W; c.height = W;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, W);
  // 软边簇叶
  for (let i = 0; i < 28; i++) {
    const x = W * (0.2 + Math.random() * 0.6), y = W * (0.25 + Math.random() * 0.55);
    const r = W * (0.12 + Math.random() * 0.22);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const hue = 85 + Math.random() * 40;
    gr.addColorStop(0, `hsla(${hue},45%,28%,0.85)`);
    gr.addColorStop(0.55, `hsla(${hue},40%,22%,0.45)`);
    gr.addColorStop(1, `hsla(${hue},35%,18%,0)`);
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeWoodTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#7a5a3c'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 260; i++) {
    const x0 = Math.random() * 256, amp = rand(2, 9), f = rand(0.004, 0.02), ph = Math.random() * 6;
    g.strokeStyle = `rgba(${40 + Math.random() * 40|0},${25 + Math.random() * 25|0},${10 + Math.random() * 15|0},${rand(0.08, 0.35)})`;
    g.lineWidth = rand(0.5, 2.2);
    g.beginPath();
    for (let y = 0; y <= 512; y += 8) { const x = x0 + Math.sin(y * f + ph) * amp; y === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 256, y = Math.random() * 512, r = rand(3, 9);
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.5);
    gr.addColorStop(0, 'rgba(40,22,10,0.8)'); gr.addColorStop(1, 'rgba(40,22,10,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 1.4, r * 2.5, 0, 0, 7); g.fill();
  }
  const img = g.getImageData(0, 0, 256, 512);
  for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 22; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

function makeCloudTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 70; i++) {
    const x = 256 + (Math.random() - 0.5) * 340, y = 140 + (Math.random() - 0.5) * 70;
    const r = rand(25, 70) * (1 - Math.abs(x - 256) / 400);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildPineFoliage() {
  const layers = [];
  for (let k = 0; k < 6; k++) {
    const r = 2.1 - k * 0.28, h = 1.1 - k * 0.05;
    // 扁平椭球簇，而非尖锥
    const b = new THREE.SphereGeometry(1, 10, 7);
    const p = b.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      // 压扁 + 不规则
      x *= r * rand(0.82, 1.12);
      z *= r * rand(0.82, 1.12);
      y = y * h * 0.55 + (y > 0 ? y * h * 0.15 : 0);
      // 边缘软起伏
      const len = Math.hypot(x, z) + 1e-4;
      const edge = 1 + (hash2(i * 0.3 + k, k * 7) - 0.5) * 0.25;
      x *= edge; z *= edge;
      p.setXYZ(i, x, y, z);
    }
    b.translate(rand(-0.15, 0.15), 2.4 + k * 1.05, rand(-0.15, 0.15));
    layers.push(b.index ? b.toNonIndexed() : b);
  }
  const geo = mergeGeometries(layers);
  geo.computeVertexNormals();
  return geo;
}

function buildBroadleafFoliage() {
  const blobs = [];
  for (let k = 0; k < 7; k++) {
    const b = new THREE.IcosahedronGeometry(rand(1.2, 1.9), 1);
    const p = b.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setXYZ(i,
        p.getX(i) * rand(0.75, 1.2),
        p.getY(i) * rand(0.7, 1.15),
        p.getZ(i) * rand(0.75, 1.2));
    }
    b.translate(rand(-1.2, 1.2), 3.6 + rand(0, 2.2) + k * 0.25, rand(-1.2, 1.2));
    blobs.push(b.index ? b.toNonIndexed() : b);
  }
  const geo = mergeGeometries(blobs);
  geo.computeVertexNormals();
  return geo;
}

function buildShrubGeo() {
  const blobs = [];
  for (let k = 0; k < 5; k++) {
    const b = new THREE.SphereGeometry(rand(0.35, 0.55), 8, 6);
    const p = b.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setXYZ(i, p.getX(i) * rand(0.8, 1.2), p.getY(i) * rand(0.55, 0.9), p.getZ(i) * rand(0.8, 1.2));
    }
    b.translate(rand(-0.4, 0.4), 0.35 + rand(0, 0.25), rand(-0.4, 0.4));
    blobs.push(b.index ? b.toNonIndexed() : b);
  }
  const geo = mergeGeometries(blobs);
  geo.computeVertexNormals();
  return geo;
}

export function createWorld(scene, renderer, Q) {
  const world = {};
  const qLevel = Q.terrainSeg >= 200 ? 'high' : 'low';

  // ---------- 天空 & 太阳 ----------
  const sky = new Sky();
  sky.scale.setScalar(10000);
  const su = sky.material.uniforms;
  su.turbidity.value = 3.4; su.rayleigh.value = 2.0; su.mieCoefficient.value = 0.005; su.mieDirectionalG.value = 0.8;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 12), THREE.MathUtils.degToRad(158));
  su.sunPosition.value.copy(sunDir);
  world.sunDir = sunDir;
  world.sky = sky;
  world._su = su;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky);
  const envRT = pmrem.fromScene(envScene);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.72;
  scene.add(sky);
  pmrem.dispose();

  // 大气霾：近清远雾，色调偏蓝灰与远山融合
  const hazeColor = new THREE.Color(0xb0c0ce);
  scene.fog = new THREE.Fog(hazeColor, 120, 3200);
  scene.background = hazeColor.clone().multiplyScalar(0.92);
  world._hazeColor = hazeColor;

  const sun = new THREE.DirectionalLight(0xffdcb0, 2.55);
  sun.position.copy(sunDir).multiplyScalar(80).add(new THREE.Vector3(0, 0, 10));
  sun.target.position.set(0, 0, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(Q.shadow, Q.shadow);
  const sc = sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 200;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x4a4030, 0.38);
  scene.add(hemi);
  world.sun = sun; world.hemi = hemi;
  // 远山补光（冷调）
  const fillHaze = new THREE.DirectionalLight(0xa8c0d8, 0.35);
  fillHaze.position.set(-40, 30, -80);
  scene.add(fillHaze);
  world.fillHaze = fillHaze;
  // 月光（夜钓）
  const moon = new THREE.DirectionalLight(0xa0c0ff, 0);
  moon.position.set(-20, 40, -30);
  scene.add(moon);
  world.moon = moon;

  // ---------- 水面 ----------
  const normals = new THREE.TextureLoader().load('textures/waternormals.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
  const water = new Water(new THREE.PlaneGeometry(5000, 5000), {
    textureWidth: Q.waterRes, textureHeight: Q.waterRes,
    waterNormals: normals, sunDirection: sunDir.clone(), sunColor: 0xfff1d6,
    waterColor: 0x0e2a28, distortionScale: 2.2, fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(LAKE_CENTER.x, 0, LAKE_CENTER.y);
  water.material.uniforms.size.value = 2.2;
  // 主题可改反射占比：礁盘让水色透出来，外海压住天光，近海多留碎浪反光。
  water.material.fragmentShader = water.material.fragmentShader
    .replace('uniform vec3 waterColor;', 'uniform vec3 waterColor;\n\t\t\t\tuniform float reflectance;')
    .replace('float rf0 = 0.3;', 'float rf0 = reflectance;');
  water.material.uniforms.reflectance = { value: 0.3 };
  water.material.needsUpdate = true;
  scene.add(water);
  world.water = water;

  // ---------- 地形（细节贴图 + 顶点色生物群系） ----------
  {
    const seg = Q.terrainSeg;
    const tg = new THREE.PlaneGeometry(4600, 4600, seg, seg);
    tg.rotateX(-Math.PI / 2);
    tg.translate(LAKE_CENTER.x, 0, LAKE_CENTER.y);
    const pos = tg.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    tg.computeVertexNormals();
    // UV：世界 XZ 平铺
    const uvs = tg.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uvs.setXY(i, pos.getX(i) * 0.012, pos.getZ(i) * 0.012);
    }
    const nrm = tg.attributes.normal;
    const cols = new Float32Array(pos.count * 3);
    const C = {
      mud: new THREE.Color(0x3b3426), sand: new THREE.Color(0xa8946c), grass: new THREE.Color(0x5a6a32),
      grass2: new THREE.Color(0x7a7238), forest: new THREE.Color(0x2e3a1f), rock: new THREE.Color(0x7a7468),
      rock2: new THREE.Color(0x9a9284), snow: new THREE.Color(0xd8e0e8), cliff: new THREE.Color(0x5a5650),
    };
    const col = new THREE.Color(), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ny = nrm.getY(i);
      const n1 = fbm(x * 0.02, z * 0.02, 3), n2 = vnoise(x * 0.2, z * 0.2);
      const n3 = fbm(x * 0.006 + 3, z * 0.006, 3);
      col.copy(C.mud);
      col.lerp(C.sand, smooth(-0.6, 0.4, y));
      tmp.copy(C.grass).lerp(C.grass2, smooth(0.35, 0.7, n1)).lerp(C.forest, smooth(0.5, 0.8, n3));
      col.lerp(tmp, smooth(1.0, 2.6, y + n2 * 0.8));
      // 陡坡 / 高山 → 岩
      const slopeRock = Math.max(smooth(0.86, 0.68, ny), smooth(120, 220, y) * 0.7);
      tmp.copy(C.rock).lerp(C.rock2, n1).lerp(C.cliff, smooth(0.75, 0.55, ny));
      col.lerp(tmp, slopeRock);
      // 雪线
      col.lerp(C.snow, smooth(280, 420, y) * smooth(0.55, 0.95, ny));
      // 微色差
      col.multiplyScalar(0.82 + n2 * 0.28 + n1 * 0.08);
      cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const detail = makeTerrainDetailMaps(qLevel);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: detail.map,
      bumpMap: detail.bumpMap,
      bumpScale: qLevel === 'low' ? 0.8 : 1.6,
      roughnessMap: detail.roughnessMap,
      roughness: 0.92,
      metalness: 0,
      vertexColors: true,
    });
    const terrain = new THREE.Mesh(tg, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);
    world.terrain = terrain;
    world._terrainBaseColors = cols.slice();
    const baseY = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) baseY[i] = pos.getY(i);
    world._terrainBaseY = baseY;
    world._terrainMaps = { map: detail.map, bumpMap: detail.bumpMap, roughnessMap: detail.roughnessMap };
  }

  // ---------- 远山剪影（低模脊线，加强大气纵深） ----------
  {
    const ridges = new THREE.Group();
    ridges.name = 'ridges';
    const ridgeMat = new THREE.MeshStandardMaterial({
      color: 0x6a7888, roughness: 1, metalness: 0, flatShading: true,
      fog: true,
    });
    for (let ring = 0; ring < 3; ring++) {
      const R = 1400 + ring * 550;
      const segs = qLevel === 'low' ? 36 : 64;
      const positions = [];
      const indices = [];
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        const jitter0 = fbm(Math.cos(a0) * 4 + ring * 11, Math.sin(a0) * 4, 3);
        const jitter1 = fbm(Math.cos(a1) * 4 + ring * 11, Math.sin(a1) * 4, 3);
        const r0 = R + (jitter0 - 0.5) * (100 + ring * 50);
        const r1 = R + (jitter1 - 0.5) * (100 + ring * 50);
        const h0 = 140 + ring * 100 + Math.pow(jitter0, 1.4) * (260 + ring * 100);
        const h1 = 140 + ring * 100 + Math.pow(jitter1, 1.4) * (260 + ring * 100);
        const x0 = Math.cos(a0) * r0, z0 = Math.sin(a0) * r0 + LAKE_CENTER.y;
        const x1 = Math.cos(a1) * r1, z1 = Math.sin(a1) * r1 + LAKE_CENTER.y;
        // 内侧略低
        const xi0 = Math.cos(a0) * (r0 - 180), zi0 = Math.sin(a0) * (r0 - 180) + LAKE_CENTER.y;
        const xi1 = Math.cos(a1) * (r1 - 180), zi1 = Math.sin(a1) * (r1 - 180) + LAKE_CENTER.y;
        const base = positions.length / 3;
        // 外峰顶、外脚、内脚
        positions.push(x0, h0, z0, x0, 40 + ring * 20, z0, xi0, 30, zi0);
        positions.push(x1, h1, z1, x1, 40 + ring * 20, z1, xi1, 30, zi1);
        // 两三角面
        indices.push(base, base + 1, base + 3, base + 1, base + 4, base + 3);
        indices.push(base, base + 3, base + 2, base + 2, base + 3, base + 5);
        indices.push(base + 1, base + 2, base + 4, base + 2, base + 5, base + 4);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, ridgeMat.clone());
      mesh.material.color.setHSL(0.58, 0.12, 0.42 - ring * 0.06);
      mesh.material.transparent = true;
      mesh.material.opacity = 0.85 - ring * 0.15;
      mesh.frustumCulled = false;
      mesh.userData.baseColor = mesh.material.color.getHex();
      mesh.userData.baseOpacity = mesh.material.opacity;
      ridges.add(mesh);
    }
    scene.add(ridges);
    world.ridges = ridges;
  }

  // ---------- 树木（树皮 + 簇叶体 + 远距软边广告牌） ----------
  {
    const barkTex = makeBarkMaps(qLevel);
    const pineGeo = buildPineFoliage();
    const leafGeo = buildBroadleafFoliage();
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.32, 4.2, qLevel === 'low' ? 6 : 10);
    trunkGeo.translate(0, 2.1, 0);
    // UV 拉伸树皮
    {
      const uv = trunkGeo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 2.2);
    }
    const N = Q.trees;
    const pineMat = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, flatShading: false });
    const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0 });
    const trunkMat = new THREE.MeshStandardMaterial({
      map: barkTex, bumpMap: barkTex, bumpScale: 0.6, color: 0xffffff, roughness: 0.95,
    });
    const pines = new THREE.InstancedMesh(pineGeo, pineMat, N);
    const leafs = new THREE.InstancedMesh(leafGeo, leafMat, Math.floor(N * 0.5));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, N + leafs.count);
    pines.castShadow = leafs.castShadow = trunks.castShadow = true;
    pines.receiveShadow = leafs.receiveShadow = trunks.receiveShadow = true;

    // 远距软边广告牌（少实例、大尺度）
    const billTex = makeFoliageBillboard(qLevel);
    const billMat = new THREE.MeshBasicMaterial({
      map: billTex, transparent: true, alphaTest: 0.15, depthWrite: false,
      side: THREE.DoubleSide, fog: true,
    });
    const billN = qLevel === 'low' ? 80 : 220;
    const billGeo = new THREE.PlaneGeometry(8, 10);
    const bills = new THREE.InstancedMesh(billGeo, billMat, billN);

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const pineCols = [0x1e3218, 0x273c20, 0x1a2c1a, 0x304828, 0x243618];
    const leafCols = [0x6e5a26, 0x7d6229, 0x55642a, 0x7a4a24, 0x4c5a26, 0x5a4820];
    let np = 0, nl = 0, nt = 0, nb = 0, tries = 0;
    while ((np < pines.count || nl < leafs.count) && tries++ < 80000) {
      const a = Math.random() * Math.PI * 2, d = 345 + Math.pow(Math.random(), 1.35) * 950;
      const x = LAKE_CENTER.x + Math.cos(a) * d, z = LAKE_CENTER.y + Math.sin(a) * d;
      if (Math.abs(x) < 14 && z > -12 && z < 70) continue;
      if (Math.hypot(x, z - 5) < 18) continue;
      const y = heightAt(x, z);
      if (y < 1.4 || y > 170) continue;
      if (fbm(x * 0.012 + 9, z * 0.012, 3) < 0.42) continue;
      const sc2 = rand(0.85, 1.95) * (d > 700 ? 1.55 : 1) * (d > 1000 ? 1.25 : 1);
      p.set(x, y - 0.25, z); q.setFromAxisAngle(up, Math.random() * 6.28); s.set(sc2, sc2 * rand(0.88, 1.3), sc2);
      m.compose(p, q, s);
      // 远距用广告牌代替部分实体树
      if (d > 900 && nb < bills.count && Math.random() < 0.35) {
        const bq = new THREE.Quaternion(); // 后面 update 里可朝向相机，先固定
        const bs = new THREE.Vector3(sc2 * 1.4, sc2 * 1.6, 1);
        const bp = new THREE.Vector3(x, y + sc2 * 3.5, z);
        m.compose(bp, bq, bs);
        bills.setMatrixAt(nb, m);
        bills.setColorAt(nb++, new THREE.Color(pineCols[(Math.random() * 5) | 0]));
        continue;
      }
      const usePine = Math.random() < 0.58 ? np < pines.count : nl >= leafs.count;
      if (usePine && np < pines.count) {
        pines.setMatrixAt(np, m);
        pines.setColorAt(np++, new THREE.Color(pineCols[(Math.random() * 5) | 0]));
      } else if (nl < leafs.count) {
        leafs.setMatrixAt(nl, m);
        leafs.setColorAt(nl++, new THREE.Color(leafCols[(Math.random() * 6) | 0]));
      } else continue;
      trunks.setMatrixAt(nt++, m);
    }
    pines.count = np; leafs.count = nl; trunks.count = nt; bills.count = nb;
    [pines, leafs, trunks, bills].forEach(o => {
      o.instanceMatrix.needsUpdate = true;
      if (o.instanceColor) o.instanceColor.needsUpdate = true;
      o.frustumCulled = false;
      scene.add(o);
    });
    world.treeBills = bills;
    world._veg = [pines, leafs, trunks, bills];
    for (const mesh of world._veg) mesh.userData.fullCount = mesh.count;
  }

  // ---------- 灌木（近岸 / 林下） ----------
  {
    const shrubN = qLevel === 'low' ? 180 : 520;
    const shrubGeo = buildShrubGeo();
    const shrubMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
    const shrubs = new THREE.InstancedMesh(shrubGeo, shrubMat, shrubN);
    shrubs.castShadow = true; shrubs.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const cols = [0x4a5a28, 0x5c4820, 0x3a4a22, 0x6a5a30, 0x455828];
    let n = 0, tries = 0;
    while (n < shrubs.count && tries++ < 50000) {
      const a = Math.random() * Math.PI * 2;
      const d = 320 + Math.pow(Math.random(), 0.8) * 280;
      const x = LAKE_CENTER.x + Math.cos(a) * d, z = LAKE_CENTER.y + Math.sin(a) * d;
      if (Math.abs(x) < 10 && z > -8 && z < 40) continue;
      const y = heightAt(x, z);
      if (y < 0.3 || y > 45) continue;
      if (fbm(x * 0.03 + 2, z * 0.03, 2) < 0.38) continue;
      const sc = rand(0.7, 1.6);
      p.set(x, y - 0.05, z);
      q.setFromAxisAngle(up, Math.random() * 6.28);
      s.set(sc * rand(0.9, 1.2), sc * rand(0.7, 1.1), sc * rand(0.9, 1.2));
      m.compose(p, q, s);
      shrubs.setMatrixAt(n, m);
      shrubs.setColorAt(n++, new THREE.Color(cols[(Math.random() * 5) | 0]));
    }
    shrubs.count = n;
    shrubs.instanceMatrix.needsUpdate = true;
    shrubs.instanceColor.needsUpdate = true;
    shrubs.frustumCulled = false;
    shrubs.userData.fullCount = shrubs.count;
    scene.add(shrubs);
    world._veg.push(shrubs);
  }

  // ---------- 芦苇 ----------
  {
    const blade = new THREE.ConeGeometry(0.025, 1.9, 3, 1); blade.translate(0, 0.95, 0);
    const reeds = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0x8a8448, roughness: 0.85 }), Q.reeds);
    const m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let n = 0, tries = 0;
    while (n < reeds.count && tries++ < 40000) {
      const cx = rand(-160, 160), cz = rand(-40, 40);
      if (Math.abs(cx) < 6) continue;
      const y = heightAt(cx, cz);
      if (y < -0.9 || y > 0.9) continue;
      const k = (8 + Math.random() * 20) | 0;
      for (let j = 0; j < k && n < reeds.count; j++) {
        const x = cx + rand(-1.5, 1.5), z = cz + rand(-1.5, 1.5);
        e.set(rand(-0.25, 0.25), 0, rand(-0.25, 0.25)); q.setFromEuler(e);
        const h = rand(0.6, 1.4); s.set(1, h, 1); p.set(x, heightAt(x, z) - 0.1, z);
        m.compose(p, q, s); reeds.setMatrixAt(n, m);
        reeds.setColorAt(n++, new THREE.Color().setHSL(0.15 + rand(-0.03, 0.03), 0.35, rand(0.25, 0.45)));
      }
    }
    reeds.count = n; reeds.instanceMatrix.needsUpdate = true; reeds.instanceColor.needsUpdate = true;
    scene.add(reeds);
    world.reeds = reeds;
    world._reedFull = n;

    // 湿地再铺一层，平时关掉。芦苇总数在生成时已经顶满，单靠 reedBoost 变不密。
    const extra = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0x6f7a38, roughness: 0.85 }), Math.max(200, Math.floor(Q.reeds * 0.85)));
    let en = 0, et = 0;
    while (en < extra.count && et++ < 40000) {
      const cx = rand(-190, 190), cz = rand(-55, 55);
      if (Math.abs(cx) < 5) continue;
      const y = heightAt(cx, cz);
      if (y < -1.15 || y > 1.35) continue;
      const k = (10 + Math.random() * 18) | 0;
      for (let j = 0; j < k && en < extra.count; j++) {
        const x = cx + rand(-1.8, 1.8), z = cz + rand(-1.8, 1.8);
        e.set(rand(-0.3, 0.3), 0, rand(-0.3, 0.3)); q.setFromEuler(e);
        const h = rand(0.9, 2.1); s.set(1.15, h, 1.15); p.set(x, heightAt(x, z) - 0.05, z);
        m.compose(p, q, s); extra.setMatrixAt(en, m);
        extra.setColorAt(en++, new THREE.Color().setHSL(0.18 + rand(-0.04, 0.05), 0.42, rand(0.22, 0.4)));
      }
    }
    extra.count = en;
    extra.instanceMatrix.needsUpdate = true;
    extra.instanceColor.needsUpdate = true;
    extra.visible = false;
    extra.frustumCulled = false;
    scene.add(extra);
    world.reedsExtra = extra;
  }

  // ---------- 木码头 ----------
  {
    const wood = makeWoodTexture();
    const plankMat = new THREE.MeshStandardMaterial({ map: wood, bumpMap: wood, bumpScale: 1.2, roughness: 0.88, metalness: 0 });
    const beamMat = new THREE.MeshStandardMaterial({ map: wood, color: 0x9a8a7a, roughness: 0.92 });
    const postMat = new THREE.MeshStandardMaterial({ map: wood, color: 0x6a5a4e, roughness: 0.95 });
    const dock = new THREE.Group();
    const startZ = 32, endZ = DOCK_END_Z, W = 2.6;
    const plankGeo = new THREE.BoxGeometry(W, 0.06, 0.2);
    const uv = plankGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * 0.4, uv.getX(i) * 2.5);
    const nPl = Math.floor((startZ - endZ) / 0.215);
    const planks = new THREE.InstancedMesh(plankGeo, plankMat, nPl);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    for (let i = 0; i < nPl; i++) {
      e.set(rand(-0.01, 0.01), rand(-0.012, 0.012), rand(-0.012, 0.012)); q.setFromEuler(e);
      p.set(rand(-0.03, 0.03), DECK_Y - 0.03 + rand(-0.008, 0.008), endZ + 0.1 + i * 0.215);
      s.set(rand(0.97, 1.02), 1, 1); m.compose(p, q, s); planks.setMatrixAt(i, m);
      const g = rand(0.72, 1.08); planks.setColorAt(i, new THREE.Color(g, g * rand(0.95, 1.0), g * rand(0.88, 0.98)));
    }
    planks.castShadow = planks.receiveShadow = true; dock.add(planks);
    for (const x of [-0.9, 0, 0.9]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, startZ - endZ), beamMat);
      b.position.set(x, DECK_Y - 0.16, (startZ + endZ) / 2); b.castShadow = b.receiveShadow = true; dock.add(b);
    }
    const postGeo = new THREE.CylinderGeometry(0.11, 0.13, 1, 10);
    for (let z = endZ + 0.15; z < startZ; z += 2.6) {
      for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) {
        const ground = heightAt(x, z) - 0.6, top = DECK_Y + (z < endZ + 1 ? 0.22 : 0.02);
        const post = new THREE.Mesh(postGeo, postMat);
        post.scale.y = top - ground; post.position.set(x, (top + ground) / 2, z);
        post.rotation.y = Math.random() * 6; post.castShadow = post.receiveShadow = true; dock.add(post);
      }
      const cross = new THREE.Mesh(new THREE.BoxGeometry(W, 0.16, 0.12), beamMat);
      cross.position.set(0, DECK_Y - 0.3, z); dock.add(cross);
    }
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.38, 20, 1, true),
      new THREE.MeshStandardMaterial({ map: wood, color: 0x8a7a66, roughness: 0.9, side: THREE.DoubleSide }));
    const lakeProps = new THREE.Group();
    lakeProps.name = 'lake-props';
    bucket.position.set(0.85, DECK_Y + 0.19, endZ + 2.6); bucket.castShadow = true; lakeProps.add(bucket);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 6, 24), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.4 }));
    band.rotation.x = Math.PI / 2; band.position.copy(bucket.position).add(new THREE.Vector3(0, 0.1, 0)); lakeProps.add(band);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.3), new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.5, metalness: 0.1 }));
    box.position.set(-0.85, DECK_Y + 0.13, endZ + 3.4); box.rotation.y = 0.3; box.castShadow = true; lakeProps.add(box);
    dock.add(lakeProps);
    scene.add(dock);
    world.lakeProps = lakeProps;
  }

  // ---------- 岸边小屋（商店）+ 渔夫（出售）----------
  {
    const wood = makeWoodTexture();
    const house = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ map: wood, color: 0xc4a574, roughness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ map: wood, color: 0x5a4030, roughness: 0.92 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x6a3030, roughness: 0.85 });
    const hx = 7.5, hz = 36;
    const hy = Math.max(DECK_Y, heightAt(hx, hz)) + 0.05;
    // 墙体
    const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, 4.2), wallMat);
    base.position.set(hx, hy + 1.3, hz); base.castShadow = base.receiveShadow = true; house.add(base);
    // 屋顶
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.6, 4), roofMat);
    roof.position.set(hx, hy + 3.4, hz); roof.rotation.y = Math.PI / 4; roof.castShadow = true; house.add(roof);
    // 门（交互点）
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.12), darkMat);
    door.position.set(hx - 0.2, hy + 0.95, hz - 2.15); door.castShadow = true; house.add(door);
    // 门框亮色提示
    const doorTrim = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x8a6038, roughness: 0.8 }));
    doorTrim.position.set(hx - 0.2, hy + 0.95, hz - 2.1); house.add(doorTrim);
    // 窗户
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.08), new THREE.MeshStandardMaterial({ color: 0x88c8e8, roughness: 0.3, metalness: 0.2 }));
    win.position.set(hx + 1.5, hy + 1.5, hz - 2.12); house.add(win);
    // 门口木阶
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.7), darkMat);
    step.position.set(hx - 0.2, hy + 0.05, hz - 2.6); house.add(step);
    // 挂牌
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.06), new THREE.MeshStandardMaterial({ color: 0xd8b070, roughness: 0.7 }));
    sign.position.set(hx - 0.2, hy + 2.5, hz - 2.18); house.add(sign);
    scene.add(house);

    // 头顶名牌（远处也能认出 NPC；手机竖屏视野窄尤其需要）
    const makeNameTag = (text, sub, color) => {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
      const c = cv.getContext('2d');
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      spr.scale.set(0.9, 0.34, 1); spr.renderOrder = 10;
      const paint = (t, s, col) => {
        c.clearRect(0, 0, 256, 96);
        c.fillStyle = 'rgba(10,20,26,0.72)';
        if (c.roundRect) { c.beginPath(); c.roundRect(8, 8, 240, 80, 22); c.fill(); } else c.fillRect(8, 8, 240, 80);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = col; c.font = 'bold 36px sans-serif'; c.fillText(t, 128, s ? 36 : 48);
        if (s) { c.fillStyle = '#ffffff'; c.font = '22px sans-serif'; c.fillText(s, 128, 68); }
        tex.needsUpdate = true;
      };
      paint(text, sub, color);
      spr.userData.setLabel = paint;
      return spr;
    };

    const hTag = makeNameTag('房子商店', '买竿 · 买饵', '#81d4fa');
    hTag.position.set(hx - 0.2, hy + 4.7, hz - 2.2); hTag.scale.set(1.5, 0.56, 1); scene.add(hTag);

    // 渔夫：站在码头尽头左侧，抛竿位就在交互范围内，开局就能看到并直接卖鱼
    // （旧位置 x=-2.2,z=14 在码头外的水面上且位于出生点身后，手机上转不过身、也很难走进交互半径）
    // v6：程序化「老余」角色（马甲、渔夫帽、杆秤、保温箱），见 npc-laoyu.js
    // v4：手机竖屏视野窄，旧位置（抛竿位正前方偏左 0.75m）会挡住左侧 1/3 画面、名牌被切。
    // 改为站在抛竿位左后方约 3m 的码头边缘：开局不挡视线，转身能看到完整的人和名牌；交互半径 4m 覆盖抛竿位，「卖鱼给渔夫」按钮一直可点。
    const fx = -1.1, fz = DOCK_END_Z + 6.0;
    const fy = DECK_Y;
    const fisher = buildLaoYu();
    fisher.position.set(fx, fy, fz);
    fisher.rotation.y = Math.PI - 0.6; // 侧身朝向码头中央 / 抛竿位
    const fTag = makeNameTag('老余', '交情 Lv.1', '#ffd54f'); fTag.position.set(0, 2.15, 0); fisher.add(fTag);
    scene.add(fisher);
    world.fisher = fisher;
    world.setLaoYuLevel = (lv) => {
      const n = Math.max(1, Math.min(20, lv | 0));
      const sub = n >= 20 ? `至交 Lv.${n}` : n >= 10 ? `熟客 Lv.${n}` : `交情 Lv.${n}`;
      fTag.userData.setLabel('老余', sub, n >= 20 ? '#ffe082' : '#ffd54f');
    };

    // 黑衣神秘人（钥匙 / 开船）
    const stranger = new THREE.Group();
    const coat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.92 });
    const hood = new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.95 });
    const shadowFace = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1 });
    const sx = 0.95, sz = 22; // 码头上（旧 x=2.8 在码头外）
    const sy = DECK_Y;
    const storso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.0, 10), coat);
    storso.position.set(0, 1.15, 0); stranger.add(storso);
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 10), coat);
    skirt.position.set(0, 0.55, 0); skirt.rotation.x = Math.PI; stranger.add(skirt);
    const shead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), shadowFace);
    shead.position.set(0, 1.75, 0); stranger.add(shead);
    const shood = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hood);
    shood.position.set(0, 1.78, 0); stranger.add(shood);
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.08), coat);
    cape.position.set(0, 1.2, 0.22); cape.rotation.x = 0.15; stranger.add(cape);
    const armSL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.6, 8), coat);
    armSL.position.set(-0.38, 1.15, 0); armSL.rotation.z = 0.25; stranger.add(armSL);
    const armSR = armSL.clone(); armSR.position.x = 0.38; armSR.rotation.z = -0.25; stranger.add(armSR);
    stranger.position.set(sx, sy, sz);
    stranger.rotation.y = -0.6;
    const sTag = makeNameTag('黑衣人', '钥匙 · 开船', '#b39ddb'); sTag.position.set(0, 2.3, 0); stranger.add(sTag);
    stranger.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(stranger);
    world.stranger = stranger;
    world.setStrangerGold = (gold) => {
      const on = !!gold;
      coat.color.setHex(on ? 0xf0c84a : 0x1a1a22);
      hood.color.setHex(on ? 0xe6b422 : 0x121218);
      coat.roughness = on ? 0.48 : 0.92;
      coat.metalness = on ? 0.42 : 0;
      hood.roughness = on ? 0.5 : 0.95;
      hood.metalness = on ? 0.28 : 0;
      sTag.userData.setLabel(on ? '黄衣人' : '黑衣人', on ? '最后的钥匙' : '钥匙 · 开船', on ? '#ffe082' : '#b39ddb');
      world.strangerGold = on;
      if (world.interact && world.interact.stranger) {
        world.interact.stranger.label = on ? '按 E / 点击 与黄衣人交谈' : '按 E / 点击 与黑衣人交谈';
      }
    };

    // 通关虹桥：码头尽头向前铺一段彩虹路，尽头一只宝箱（默认隐藏）
    const rainbow = new THREE.Group();
    rainbow.name = 'RainbowPath';
    rainbow.visible = false;
    const pathColors = [0xff4d6a, 0xff8a2a, 0xffe14a, 0x5dcc4a, 0x3ec8ff, 0x6a78ff, 0xd56bff];
    const pathZ0 = DOCK_END_Z - 0.4;
    const pathTiles = [];
    for (let i = 0; i < 14; i++) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.1, 1.45),
        new THREE.MeshBasicMaterial({ color: pathColors[i % pathColors.length], transparent: true, opacity: 0.92, fog: false })
      );
      tile.position.set(0, DECK_Y + 0.08, pathZ0 - i * 1.45);
      rainbow.add(tile);
      pathTiles.push(tile);
    }
    const chestZ = pathZ0 - 13 * 1.45;
    const chest = new THREE.Group();
    chest.position.set(0, DECK_Y, chestZ);
    const chestWood = new THREE.MeshStandardMaterial({ color: 0x8a4e22, roughness: 0.7 });
    const chestGold = new THREE.MeshStandardMaterial({ color: 0xf0c84a, roughness: 0.35, metalness: 0.7, emissive: 0x5a3a08, emissiveIntensity: 0.35 });
    const chestBody = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 0.52), chestWood);
    chestBody.position.y = 0.24; chest.add(chestBody);
    const chestBand = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.54), chestGold);
    chestBand.position.y = 0.28; chest.add(chestBand);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.16, 0.56), chestWood);
    lid.position.set(0, 0.5, -0.22); lid.rotation.x = -0.55; chest.add(lid);
    const lidBand = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.12), chestGold);
    lidBand.position.set(0, 0.5, 0.02); chest.add(lidBand);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), chestGold);
    lock.position.set(0, 0.28, 0.28); chest.add(lock);
    const cTag = makeNameTag('宝箱', '走到跟前打开', '#ffe082');
    cTag.position.set(0, 1.35, 0); cTag.scale.set(1.15, 0.44, 1); chest.add(cTag);
    chest.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    cTag.castShadow = false;
    rainbow.add(chest);
    scene.add(rainbow);
    world.rainbow = rainbow;
    world.rainbowEnd = { x: 0, z: chestZ };
    world.setRainbow = (on) => {
      rainbow.visible = !!on;
      if (world.interact && world.interact.chest) world.interact.chest.hidden = !on;
    };
    world._pathTiles = pathTiles;

    world.interact = {
      shop: { x: hx - 0.2, z: hz - 2.7, r: 3.2, label: '按 E / 点击 进入房子商店', kind: 'shop' },
      sell: { x: fx, z: fz, r: 4.0, label: '按 E / 点击 找老余卖鱼', kind: 'sell' },
      stranger: { x: sx, z: sz, r: 3.0, label: '按 E / 点击 与黑衣人交谈', kind: 'stranger' },
      chest: { x: 0, z: chestZ, r: 2.2, label: '按 E / 点击 打开宝箱', kind: 'chest', hidden: true },
    };
  }

  // ---------- 小船 ----------
  {
    const shape = new THREE.Shape();
    shape.moveTo(-2.2, 0); shape.quadraticCurveTo(-2.2, -0.9, 0, -0.95); shape.quadraticCurveTo(2.2, -0.9, 2.4, 0); shape.lineTo(-2.2, 0);
    const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.3, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.2, bevelSegments: 3, curveSegments: 16 });
    hullGeo.translate(0, 0, -0.65);
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: 0x7c3a28, roughness: 0.7 }));
    hull.scale.set(1, 0.6, 1); hull.position.y = 0.25;
    const boat = new THREE.Group(); boat.add(hull);
    boat.position.set(-12, 0.15, -18); boat.rotation.y = 0.9; world.boatHome = boat.position.clone();
    scene.add(boat); world.boat = boat;
  }

  // 钓点布置。尺寸按抛竿机位（约 x=0,z=-3，朝 -Z）摆进画面，不靠新的场景 GLB。
  {
    const coast = new THREE.Group();
    coast.name = 'dress-coast';
    const concrete = new THREE.MeshStandardMaterial({ color: 0xb7c0c6, roughness: 0.9 });
    const concreteDark = new THREE.MeshStandardMaterial({ color: 0x6d767c, roughness: 0.94 });
    const concreteWet = new THREE.MeshStandardMaterial({ color: 0x4e5c64, roughness: 0.62 });
    const addBox = (parent, w, h, d, x, y, z, mat) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    // 两侧沉箱防波堤，夹出一条港池。近端收进画面，避免整排贴在镜头外面。
    const layCaissons = (x0, z0, x1, z1, pieces, h0) => {
      for (let i = 0; i < pieces; i++) {
        const t = pieces === 1 ? 0 : i / (pieces - 1);
        const x = x0 + (x1 - x0) * t;
        const z = z0 + (z1 - z0) * t;
        const h = h0 + (i % 3) * 0.55;
        addBox(coast, 6.6, h, 6.4, x, h * 0.5 - 0.85, z, i % 2 ? concrete : concreteDark);
        addBox(coast, 6.9, 0.45, 6.7, x, h - 0.95, z, concrete);
        addBox(coast, 6.8, 0.85, 6.6, x, 0.2, z, concreteWet);
      }
    };
    layCaissons(-4.8, -9, -13.5, -64, 8, 5.4);
    layCaissons(5.6, -10, 14.5, -58, 7, 4.8);
    const buoys = [];
    const buoyOrange = new THREE.MeshStandardMaterial({ color: 0xe25a1c, roughness: 0.4 });
    const buoyWhite = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.35 });
    [[0.4, -16], [-1.2, -28], [1.6, -42], [-0.6, -56]].forEach(([x, z], i) => {
      const g = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 14), i % 2 ? buoyOrange : buoyWhite);
      ball.scale.y = 0.82;
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.12, 8, 18), i % 2 ? buoyWhite : buoyOrange);
      stripe.rotation.x = Math.PI / 2;
      g.add(ball, stripe);
      g.position.set(x, 0.7, z);
      coast.add(g);
      buoys.push({ mesh: g, base: 0.7, phase: i * 1.3 });
    });
    const beacon = (x, z, color) => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 9.2, 8), concreteDark);
      pole.position.y = 4.5;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.55, 8), buoyWhite);
      band.position.y = 7.6;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 12), new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 1.6, roughness: 0.3,
      }));
      lamp.position.y = 9.15;
      pole.castShadow = band.castShadow = lamp.castShadow = true;
      g.add(pole, band, lamp);
      g.position.set(x, 0, z);
      coast.add(g);
    };
    beacon(-4.4, -13, 0xff2430);
    beacon(5.3, -14.5, 0x2ee06a);
    // 堤脚消波块，离抛点近，第一眼就能看见。
    [[-2.2, -18], [3.1, -22], [-3.4, -34], [2.4, -40]].forEach(([x, z], i) => {
      const g = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.6, 0.85), k === 1 ? concrete : concreteDark);
        leg.rotation.set(0.4, i + k, (k - 1) * 0.85);
        leg.castShadow = true;
        g.add(leg);
      }
      g.position.set(x, 0.7, z);
      coast.add(g);
    });
    coast.visible = false;
    scene.add(coast);

    const reef = new THREE.Group();
    reef.name = 'dress-reef';
    const coralMat = [0xff5d73, 0xff8a2a, 0xff4fd8, 0x3ddea0, 0xffd23a, 0x7cf0ff].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62 }));
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xf0d7a4, roughness: 0.95 });
    const trunk = new THREE.MeshStandardMaterial({ color: 0x6b4428, roughness: 0.9 });
    const leaf = new THREE.MeshStandardMaterial({ color: 0x1c9a48, roughness: 0.62 });
    const addSand = (x, z, rx, rz) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), sandMat);
      m.scale.set(rx, 0.7, rz);
      m.position.set(x, 0.05, z);
      m.castShadow = m.receiveShadow = true;
      reef.add(m);
    };
    [[-5.2, -18, 6.5, 4.6], [4.6, -27, 7.2, 5.2], [-2.2, -40, 8.4, 5.6], [6.2, -50, 6.2, 4.4], [0.4, -62, 9, 6]].forEach(([x, z, rx, rz]) => addSand(x, z, rx, rz));
    const addCoral = (x, z, scale, seed) => {
      const clump = new THREE.Group();
      for (let k = 0; k < 7; k++) {
        const branch = (seed + k) % 2 === 0;
        const geo = branch
          ? new THREE.ConeGeometry((0.34 + (k % 3) * 0.1) * scale, (1.5 + (k % 4) * 0.38) * scale, 6)
          : new THREE.SphereGeometry((0.5 + (k % 3) * 0.16) * scale, 10, 8);
        const mesh = new THREE.Mesh(geo, coralMat[(seed + k) % coralMat.length]);
        mesh.position.set((k - 3) * 0.62 * scale, 0.55 * scale + (k % 3) * 0.28 * scale, ((k % 3) - 1) * 0.45 * scale);
        if (branch) mesh.rotation.z = ((k % 5) - 2) * 0.38;
        mesh.castShadow = mesh.receiveShadow = true;
        clump.add(mesh);
      }
      clump.position.set(x, 0.35, z);
      clump.rotation.y = seed * 0.7;
      reef.add(clump);
    };
    [[-4.2, -17, 1.35, 1], [3.6, -24, 1.55, 2], [0.2, -33, 1.7, 3], [-5.5, -39, 1.25, 4], [5.4, -46, 1.45, 5], [-1.4, -54, 1.6, 6], [2.8, -20, 1.15, 7]].forEach(([x, z, sc, seed]) => addCoral(x, z, sc, seed));
    const addPalm = (x, z, scale, lean) => {
      const g = new THREE.Group();
      const h = 8.4 * scale;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.38 * scale, h, 7), trunk);
      stem.position.y = h * 0.5;
      stem.castShadow = true;
      g.add(stem);
      for (let k = 0; k < 8; k++) {
        const geo = new THREE.ConeGeometry(0.2 * scale, 4.6 * scale, 4);
        geo.translate(0, 2.05 * scale, 0);
        const frond = new THREE.Mesh(geo, leaf);
        frond.position.y = h * 0.92;
        frond.rotation.order = 'YXZ';
        frond.rotation.y = (k / 8) * Math.PI * 2;
        frond.rotation.z = 1.08;
        frond.castShadow = true;
        g.add(frond);
      }
      g.position.set(x, 0.35, z);
      g.rotation.z = lean;
      reef.add(g);
    };
    [[-6.4, -14, 1.05, -0.12], [7.2, -16, 1.15, 0.14], [-7.6, -30, 0.95, -0.08], [8.4, -34, 1.2, 0.1], [-5.2, -48, 1.0, 0.06], [6.8, -56, 1.1, -0.1]].forEach(([x, z, sc, lean]) => addPalm(x, z, sc, lean));
    reef.visible = false;
    scene.add(reef);

    const offshore = new THREE.Group();
    offshore.name = 'dress-offshore';
    const isleMat = new THREE.MeshStandardMaterial({ color: 0x1c2832, roughness: 1, flatShading: true });
    const isleFar = new THREE.MeshStandardMaterial({ color: 0x243644, roughness: 1, flatShading: true });
    const surfMat = new THREE.MeshStandardMaterial({ color: 0xd5e4ee, roughness: 0.45, transparent: true, opacity: 0.82 });
    const addIsland = (x, z, radius, height, mat) => {
      const g = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.ConeGeometry(1, 1.25, 8), mat);
      rock.scale.set(radius, height, radius * 0.8);
      rock.position.y = height * 0.4;
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat);
      shoulder.scale.set(radius * 1.08, height * 0.32, radius * 0.88);
      shoulder.position.y = height * 0.1;
      const surf = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.9, Math.max(1.4, radius * 0.05), 6, 24), surfMat);
      surf.rotation.x = Math.PI / 2;
      surf.position.y = 0.4;
      rock.castShadow = shoulder.castShadow = true;
      g.add(rock, shoulder, surf);
      g.position.set(x, 0, z);
      offshore.add(g);
    };
    // 岛放在抛竿方向的中远景，压过原来的湖山剪影。
    addIsland(26, -175, 42, 36, isleMat);
    addIsland(-48, -250, 58, 52, isleMat);
    addIsland(72, -390, 36, 28, isleFar);
    addIsland(-8, -520, 78, 46, isleFar);
    offshore.visible = false;
    scene.add(offshore);

    const dam = new THREE.Group();
    dam.name = 'dress-dam';
    const damFace = new THREE.Mesh(new THREE.BoxGeometry(5.2, 13.5, 78), concrete);
    damFace.position.set(-12.4, 5.6, -46);
    damFace.castShadow = damFace.receiveShadow = true;
    dam.add(damFace);
    const damCap = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.7, 78), concreteDark);
    damCap.position.set(-12.4, 12.2, -46);
    damCap.castShadow = true;
    dam.add(damCap);
    const damWet = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 76), concreteWet);
    damWet.position.set(-9.7, 1.5, -46);
    dam.add(damWet);
    for (let i = 0; i < 9; i++) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 12.4, 0.35), concreteDark);
      seam.position.set(-9.65, 5.8, -14 - i * 8);
      dam.add(seam);
    }
    dam.visible = false;
    scene.add(dam);

    world._buoys = buoys;
    world._dress = { coast, reef, offshore, dam };
  }

  // ---------- 云 ----------
  {
    const tex = makeCloudTexture();
    world._clouds = [];
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color().setHSL(0.08, 0.3, rand(0.9, 1.0)), transparent: true, opacity: rand(0.25, 0.5), fog: false, depthWrite: false });
      const sp = new THREE.Sprite(mat);
      const a = Math.PI + rand(-1.6, 1.6), d = rand(3000, 6500);
      sp.position.set(Math.sin(a) * d, rand(900, 1800), Math.cos(a) * d);
      const w = rand(1800, 3800); sp.scale.set(w, w * 0.35, 1);
      sp.userData.baseOpacity = mat.opacity;
      scene.add(sp);
      world._clouds.push(sp);
    }
  }


  world.applyTheme = (theme, renderer) => {
    if (!theme) return;
    const elev = theme.sunElev;
    const az = theme.sunAz;
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), THREE.MathUtils.degToRad(az));
    world.sunDir.copy(sunDir);
    if (world._su) {
      world._su.sunPosition.value.copy(sunDir);
      world._su.turbidity.value = theme.turbidity;
      world._su.rayleigh.value = theme.rayleigh;
      world._su.mieCoefficient.value = theme.mie;
    }
    const night = !!theme.night;
    world.sun.position.copy(sunDir).multiplyScalar(80).add(new THREE.Vector3(0, 0, 10));
    world.sun.color.setHex(theme.sunColor);
    world.sun.intensity = theme.sunIntensity != null ? theme.sunIntensity : (night ? 0.15 : 2.55);
    world.hemi.color.setHex(theme.hemiSky);
    world.hemi.groundColor.setHex(theme.hemiGround);
    world.hemi.intensity = theme.hemiIntensity != null ? theme.hemiIntensity : (night ? 0.15 : 0.38);
    world.fillHaze.intensity = theme.fill != null ? theme.fill : (night ? 0.08 : 0.35);
    if (world.moon) world.moon.intensity = night ? 0.42 : 0;
    const haze = new THREE.Color(theme.haze);
    scene.fog.color.copy(haze);
    scene.fog.near = theme.fogNear;
    scene.fog.far = theme.fogFar;
    scene.background.copy(haze).multiplyScalar(night ? 0.22 : 0.92);
    if (theme.env != null) scene.environmentIntensity = theme.env;
    if (world.water) {
      const u = world.water.material.uniforms;
      u.waterColor.value.setHex(theme.water);
      u.sunColor.value.setHex(theme.sunColor);
      u.sunDirection.value.copy(sunDir);
      if (u.distortionScale) u.distortionScale.value = theme.wave == null ? 2.2 : theme.wave;
      if (u.size) u.size.value = theme.waveSize == null ? 2.2 : theme.waveSize;
      if (u.reflectance) u.reflectance.value = theme.reflectance == null ? 0.3 : theme.reflectance;
      world._waveSpeed = theme.waveSpeed == null ? 0.55 : theme.waveSpeed;
    }
    if (world.reeds) {
      const full = world._reedFull || world.reeds.count;
      const boost = theme.reedBoost == null ? 1 : theme.reedBoost;
      const n = Math.max(0, Math.min(full, Math.round(full * boost)));
      world.reeds.count = n;
      world.reeds.visible = n > 0;
    }
    if (world.reedsExtra) world.reedsExtra.visible = (theme.reedBoost || 1) >= 1.6;
    if (world._veg) {
      const veg = theme.veg == null ? 1 : theme.veg;
      for (const mesh of world._veg) {
        const full = mesh.userData.fullCount || 0;
        const n = Math.max(0, Math.min(full, Math.round(full * veg)));
        mesh.count = n;
        mesh.visible = n > 0;
      }
    }
    if (world.ridges) {
      const mount = theme.mount == null ? 1 : theme.mount;
      world.ridges.visible = mount > 0.03;
      world.ridges.scale.y = Math.max(mount, 0.03);
      world.ridges.traverse(o => {
        if (!o.isMesh || !o.material) return;
        if (theme.mountColor == null) o.material.color.setHex(o.userData.baseColor ?? 0x6a7888);
        else o.material.color.setHex(theme.mountColor);
        o.material.opacity = theme.mountOpacity == null ? (o.userData.baseOpacity ?? 1) : theme.mountOpacity;
      });
    }
    if (world._dress) {
      const dress = theme.dress || '';
      for (const [k, g] of Object.entries(world._dress)) g.visible = k === dress;
    }
    const marine = theme.dress === 'coast' || theme.dress === 'reef' || theme.dress === 'offshore';
    world._hideBoat = marine;
    if (world.lakeProps) world.lakeProps.visible = !marine;
    if (world.boat) world.boat.visible = !marine;
    if (world._clouds) {
      const tint = new THREE.Color(theme.cloud == null ? 0xffffff : theme.cloud);
      const mul = theme.cloudMul == null ? 1 : theme.cloudMul;
      for (const sp of world._clouds) {
        sp.material.color.copy(tint);
        sp.material.opacity = (sp.userData.baseOpacity ?? 0.35) * mul;
      }
    }
    if (renderer && theme.exposure != null) renderer.toneMappingExposure = theme.exposure;
    if (world.terrain && world._terrainBaseY && world._terrainBaseColors) {
      const pos = world.terrain.geometry.attributes.position;
      const colAttr = world.terrain.geometry.attributes.color;
      const baseC = world._terrainBaseColors;
      const baseY = world._terrainBaseY;
      const mul = theme.terrainMul || [1, 1, 1];
      const tint = theme.terrainTint != null ? new THREE.Color(theme.terrainTint) : null;
      const amt = theme.terrainTintAmt || 0;
      const kind = theme.land || 'lake';
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, landHeight(kind, pos.getX(i), pos.getZ(i), baseY[i]));
        let r = baseC[i * 3], g = baseC[i * 3 + 1], b = baseC[i * 3 + 2];
        if (tint && amt) {
          r += (tint.r - r) * amt;
          g += (tint.g - g) * amt;
          b += (tint.b - b) * amt;
        }
        colAttr.setXYZ(i, Math.min(1, r * mul[0]), Math.min(1, g * mul[1]), Math.min(1, b * mul[2]));
      }
      pos.needsUpdate = true;
      colAttr.needsUpdate = true;
      world.terrain.geometry.computeVertexNormals();
      const maps = world._terrainMaps;
      const flat = kind === 'coast' || kind === 'reef' || kind === 'dam' || kind === 'offshore';
      if (maps) {
        world.terrain.material.map = flat ? null : maps.map;
        world.terrain.material.bumpMap = flat ? null : maps.bumpMap;
        world.terrain.material.roughnessMap = flat ? null : maps.roughnessMap;
        world.terrain.material.needsUpdate = true;
      }
      world.terrain.material.color.setHex(theme.groundTint || 0xffffff);
    }
  };


  world.playBoatTravel = (duration = 2.2) => {
    if (!world.boat) return Promise.resolve();
    const boat = world.boat;
    boat.visible = true;
    const start = boat.position.clone();
    const mid = start.clone().add(new THREE.Vector3(-25, 0, -40));
    const t0 = performance.now();
    return new Promise(resolve => {
      const step = () => {
        const u = Math.min(1, (performance.now() - t0) / (duration * 1000));
        const e = u * u * (3 - 2 * u);
        boat.position.lerpVectors(start, mid, e);
        boat.rotation.z = Math.sin(e * Math.PI * 4) * 0.06;
        boat.rotation.y = 0.9 + e * 0.4;
        if (u < 1) requestAnimationFrame(step);
        else {
          // 驶回停泊点
          const t1 = performance.now();
          const back = () => {
            const v = Math.min(1, (performance.now() - t1) / 900);
            boat.position.lerpVectors(mid, world.boatHome || start, v);
            boat.rotation.y = 0.9;
            if (v < 1) requestAnimationFrame(back);
            else resolve();
          };
          requestAnimationFrame(back);
        }
      };
      requestAnimationFrame(step);
    });
  };

  const _billDummy = new THREE.Object3D();
  let _billAcc = 0;
  world.update = (dt, t, camera) => {
    water.material.uniforms.time.value += dt * (world._waveSpeed == null ? 0.55 : world._waveSpeed);
    if (world.fisher) world.fisher.userData.update(dt, t);
    if (world.rainbow && world.rainbow.visible && world._pathTiles) {
      for (let i = 0; i < world._pathTiles.length; i++) {
        const tile = world._pathTiles[i];
        tile.material.opacity = 0.78 + Math.sin(t * 2.1 + i * 0.55) * 0.18;
        tile.position.y = DECK_Y + 0.08 + Math.sin(t * 1.3 + i * 0.45) * 0.035;
      }
    }
    if (world.boat) { world.boat.rotation.z = Math.sin(t * 0.8) * 0.03; world.boat.position.y = 0.12 + Math.sin(t * 1.1) * 0.04; }
    if (world._buoys && world._dress && world._dress.coast.visible) {
      for (const b of world._buoys) {
        b.mesh.position.y = b.base + Math.sin(t * 1.3 + b.phase) * 0.12;
        b.mesh.rotation.z = Math.sin(t * 0.9 + b.phase) * 0.12;
      }
    }
    // 远距树广告牌朝向相机（限频）
    _billAcc += dt;
    if (_billAcc > 0.4 && world.treeBills && camera && world.treeBills.count > 0) {
      _billAcc = 0;
      const bills = world.treeBills;
      const mx = new THREE.Matrix4();
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
      for (let i = 0; i < bills.count; i++) {
        bills.getMatrixAt(i, mx);
        mx.decompose(pos, quat, scl);
        _billDummy.position.copy(pos);
        _billDummy.scale.copy(scl);
        _billDummy.lookAt(camera.position.x, pos.y, camera.position.z);
        _billDummy.updateMatrix();
        bills.setMatrixAt(i, _billDummy.matrix);
      }
      bills.instanceMatrix.needsUpdate = true;
    }
  };
  return world;
}
