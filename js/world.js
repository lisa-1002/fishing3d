// 场景环境：天空、太阳、PBR 环境光、水面、地形、树木、灌木、芦苇、码头、云
import * as THREE from 'three';
import { Water } from '../vendor/addons/Water.js';
import { Sky } from '../vendor/addons/Sky.js';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';
import { fbm, vnoise, smooth, rand } from './util.js';

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
  }

  // ---------- 远山剪影（低模脊线，加强大气纵深） ----------
  {
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
      scene.add(mesh);
    }
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
    scene.add(shrubs);
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
    bucket.position.set(0.85, DECK_Y + 0.19, endZ + 2.6); bucket.castShadow = true; dock.add(bucket);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 6, 24), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.4 }));
    band.rotation.x = Math.PI / 2; band.position.copy(bucket.position).add(new THREE.Vector3(0, 0.1, 0)); dock.add(band);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.3), new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.5, metalness: 0.1 }));
    box.position.set(-0.85, DECK_Y + 0.13, endZ + 3.4); box.rotation.y = 0.3; box.castShadow = true; dock.add(box);
    scene.add(dock);
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
    boat.position.set(-38, 0.15, -70); boat.rotation.y = 0.7;
    scene.add(boat); world.boat = boat;
  }

  // ---------- 云 ----------
  {
    const tex = makeCloudTexture();
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color().setHSL(0.08, 0.3, rand(0.9, 1.0)), transparent: true, opacity: rand(0.25, 0.5), fog: false, depthWrite: false });
      const sp = new THREE.Sprite(mat);
      const a = Math.PI + rand(-1.6, 1.6), d = rand(3000, 6500);
      sp.position.set(Math.sin(a) * d, rand(900, 1800), Math.cos(a) * d);
      const w = rand(1800, 3800); sp.scale.set(w, w * 0.35, 1);
      scene.add(sp);
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
    world.sun.position.copy(sunDir).multiplyScalar(80).add(new THREE.Vector3(0, 0, 10));
    world.sun.color.setHex(theme.sunColor);
    world.sun.intensity = theme.night ? 0.15 : 2.55;
    world.hemi.color.setHex(theme.hemiSky);
    world.hemi.groundColor.setHex(theme.hemiGround);
    world.hemi.intensity = theme.night ? 0.15 : 0.38;
    world.fillHaze.intensity = theme.night ? 0.08 : 0.35;
    if (world.moon) world.moon.intensity = theme.night ? 0.55 : 0;
    const haze = new THREE.Color(theme.haze);
    scene.fog.color.copy(haze);
    scene.fog.near = theme.fogNear;
    scene.fog.far = theme.fogFar;
    scene.background.copy(haze).multiplyScalar(theme.night ? 0.35 : 0.92);
    if (world.water) {
      world.water.material.uniforms.waterColor.value.setHex(theme.water);
      world.water.material.uniforms.sunColor.value.setHex(theme.sunColor);
      world.water.material.uniforms.sunDirection.value.copy(sunDir);
    }
    if (renderer && theme.exposure != null) renderer.toneMappingExposure = theme.exposure;
    // 地形色调
    if (world.terrain && world._terrainBaseColors) {
      const attr = world.terrain.geometry.attributes.color;
      const base = world._terrainBaseColors;
      const m = theme.terrainMul || [1, 1, 1];
      for (let i = 0; i < attr.count; i++) {
        attr.setXYZ(i, Math.min(1, base[i*3] * m[0]), Math.min(1, base[i*3+1] * m[1]), Math.min(1, base[i*3+2] * m[2]));
      }
      attr.needsUpdate = true;
    }
  };

  const _billDummy = new THREE.Object3D();
  let _billAcc = 0;
  world.update = (dt, t, camera) => {
    water.material.uniforms.time.value += dt * 0.55;
    if (world.boat) { world.boat.rotation.z = Math.sin(t * 0.8) * 0.03; world.boat.position.y = 0.12 + Math.sin(t * 1.1) * 0.04; }
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
