// 写实鱼模型（CC0）。来源与许可见 vendor/fish/real/CREDITS.md。
// 载入时把几何烘焙到统一坐标：头朝 +X、体长 = 1、原点在包围盒中心，
// 与程序化鱼约定一致，因此渔获卡、图鉴、跃水代码无需改动。
// 模型本身是静态网格，摆尾用与 fish.js 相同的顶点着色器波动实现。
// 扫描件没有 Draco，GLTFLoader 直接读 WebP + KHR_mesh_quantization。
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';
import { locationById } from './locations.js?v=16';
import { SCAN_MODELS, SCAN_SPECIES_MAP, SPECIES_PLACES } from './scan-catalog.js?v=16';

const BASE = 'vendor/fish/real/';
// axis：模型体长所在轴；head：头部在该轴的正(+1)或负(-1)方向。
// 扫描件的朝向在 scan-catalog.js。还没逐条看过的新扫模沿用近期批次：体长在 X，头朝 -X，载入时转到 +X。
const MODELS = {
  koi:        { file: 'koi.glb',             axis: 'z', head: 1 },
  arowana:    { file: 'silver_arowana.glb',  axis: 'z', head: 1 },
  trout:      { file: 'rainbow_trout.glb',   axis: 'z', head: 1 },
  salmon:     { file: 'sockeye_salmon.glb',  axis: 'z', head: 1 },
  catfish:    { file: 'channel_catfish.glb', axis: 'z', head: 1 },
  piranha:    { file: 'piranha.glb',         axis: 'z', head: 1 },
  // Polyy 大口黑鲈。鳜鱼和扫模鲈都不用这件，没有物种引用时不下载。
  bass:       { file: 'largemouth_bass.glb', axis: 'x', head: 1 },
  barramundi: { file: 'barramundi.glb',      axis: 'z', head: 1 },
  ...SCAN_MODELS,
};

// 物种 → 模型 + 色调(乘色) + 体高/体宽缩放。未列出的物种（甲鱼）走程序化网格。
export const SPECIES_MAP = {
  koi:        { m: 'koi' },
  carp:       { m: 'scan_carp' },
  goldcarp:   { m: 'scan_carp', tint: [1.18, 1.02, 0.62], glow: 0.06 },
  crucian:    { m: 'scan_crucian' },
  tilapia:    { m: 'scan_bluegill' },
  bream:      { m: 'piranha', tint: [1.0, 1.0, 0.97], desat: 0.95, h: 0.88, w: 0.75 },
  grass:      { m: 'arowana', tint: [0.72, 0.76, 0.5], h: 0.95 },
  blackcarp:  { m: 'arowana', tint: [0.42, 0.46, 0.46], h: 1.0 },
  silvercarp: { m: 'arowana', tint: [0.96, 0.97, 1.0], h: 1.15 },
  bighead:    { m: 'arowana', tint: [0.62, 0.6, 0.55], h: 1.15 },
  mudcarp:    { m: 'arowana', tint: [0.82, 0.84, 0.88], h: 1.0 },
  culter:     { m: 'scan_threelips' },
  redtail:    { m: 'arowana', tint: [0.95, 0.9, 0.88], h: 0.95 },
  bleak:      { m: 'arowana', tint: [1.0, 1.0, 1.0], h: 0.75, w: 0.8 },
  icefish:    { m: 'arowana', tint: [1.0, 1.0, 1.0], h: 0.6, w: 0.7 },
  arowana:    { m: 'arowana', tint: [1.0, 0.86, 0.42], glow: 0.08 },
  horsemouth: { m: 'scan_horsemouth' },
  trout:      { m: 'trout' },
  pike:       { m: 'trout', tint: [0.62, 0.8, 0.5], h: 0.8, w: 0.9 },
  snakehead:  { m: 'scan_snakehead' },
  taimen:     { m: 'salmon', tint: [0.72, 0.6, 0.5] },
  gancyu:     { m: 'barramundi', tint: [0.95, 0.9, 0.75], h: 0.8 },
  perch:      { m: 'barramundi' },
  mandarin:   { m: 'scan_bass' },
  catfish:    { m: 'scan_catfish' },
  yellowcat:  { m: 'scan_yellowcat' },
  sturgeon:   { m: 'catfish', tint: [0.68, 0.7, 0.74], h: 0.75, w: 0.85 },
  loach:      { m: 'scan_loach' },
  eel:        { m: 'scan_eel' },
  ...SCAN_SPECIES_MAP,
};

/** @type {Record<string, { parts: { geometry: THREE.BufferGeometry, material: THREE.Material }[] }>} */
const assets = {};
const loader = new GLTFLoader();
const inflight = new Map();
const queue = [];
let activeLoads = 0;
const MAX_LOADS = 3;

// 摄影测量贴图已经烘焙了光照。游戏曝光大约 0.5，这里把反照率抬一档，避免扫描鱼比 PBR 鱼暗一截。
const SCAN_GAIN = 1.75;

function toFloat(geom) {
  for (const name of Object.keys(geom.attributes)) {
    const a = geom.attributes[name];
    if (a.isInterleavedBufferAttribute || a.normalized || !(a.array instanceof Float32Array)) {
      const out = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
      geom.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
    }
  }
  return geom;
}

/** 鱼身网格。扫描件里常有一个 24 顶点的参照立方体，丢掉它；鳍、眼是另外的大网格，全部留下。 */
function fishMeshes(scene) {
  const meshes = [];
  scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const maxVerts = meshes.reduce((n, m) => Math.max(n, m.geometry.attributes.position.count), 0);
  const kept = meshes.filter((m) => m.geometry.attributes.position.count > 64 || maxVerts <= 64);
  return kept.length ? kept : meshes;
}

function manualRot(cfg) {
  const rot = new THREE.Matrix4();
  if (cfg.axis === 'z') rot.makeRotationY(cfg.head > 0 ? Math.PI / 2 : -Math.PI / 2);
  else if (cfg.axis === 'y') rot.makeRotationZ(cfg.head > 0 ? Math.PI / 2 : -Math.PI / 2);
  else if (cfg.head < 0) rot.makeRotationY(Math.PI);
  if (cfg.roll) rot.premultiply(new THREE.Matrix4().makeRotationX(Math.PI));
  return rot;
}

/** 把 glTF 里每一块鱼网格烘焙到同一套坐标（头朝 +X、体长 = 1）。多材质不合并，避免鳍和眼睛吃到身体贴图。 */
function bake(scene, cfg) {
  scene.updateMatrixWorld(true);
  const meshes = fishMeshes(scene);
  if (!meshes.length) return null;
  const geos = meshes.map((mesh) => {
    const g = toFloat(mesh.geometry.clone());
    poseSkinned(mesh, g);
    g.applyMatrix4(mesh.matrixWorld);
    return g;
  });
  const rot = manualRot(cfg);
  for (const g of geos) {
    g.applyMatrix4(rot);
    g.computeBoundingBox();
  }
  const box = new THREE.Box3();
  for (const g of geos) box.union(g.boundingBox);
  const c = box.getCenter(new THREE.Vector3());
  const len = box.max.x - box.min.x;
  if (!(len > 0)) return null;
  const parts = geos.map((g, i) => {
    g.translate(-c.x, -c.y, -c.z);
    g.scale(1 / len, 1 / len, 1 / len);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return { geometry: g, material: meshes[i].material };
  });
  return { parts };
}

const _skinPos = new THREE.Vector3();

/** 泥鳅扫描带骨骼。把当前姿势烘焙进顶点，后面的摆尾仍走静态网格着色器。 */
function poseSkinned(mesh, geometry) {
  if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
  mesh.skeleton.update();
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    _skinPos.fromBufferAttribute(pos, i);
    mesh.applyBoneTransform(i, _skinPos);
    pos.setXYZ(i, _skinPos.x, _skinPos.y, _skinPos.z);
  }
  geometry.deleteAttribute('skinIndex');
  geometry.deleteAttribute('skinWeight');
}

function pump() {
  while (activeLoads < MAX_LOADS && queue.length) {
    queue.sort((a, b) => b.priority - a.priority);
    const job = queue.shift();
    activeLoads++;
    loader.load(BASE + job.cfg.file, (gltf) => {
      const baked = bake(gltf.scene, job.cfg);
      if (baked) assets[job.key] = baked;
      finish(job, !!baked);
    }, undefined, (err) => {
      console.warn('[fish] GLB 加载失败，该外形回退程序化网格', job.cfg.file, err);
      finish(job, false);
    });
  }
}

function finish(job, ok) {
  inflight.delete(job.key);
  activeLoads--;
  job.resolve(ok);
  pump();
}

function requestLoad(key, priority) {
  if (assets[key]) return Promise.resolve(true);
  const cfg = MODELS[key];
  if (!cfg) return Promise.resolve(false);
  const existing = inflight.get(key);
  if (existing) {
    existing.priority = Math.max(existing.priority, priority);
    return existing.promise;
  }
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  const job = { key, cfg, priority, resolve, promise };
  inflight.set(key, job);
  queue.push(job);
  pump();
  return promise;
}

/** 当前钓场实际可能钓到的模型。封闭钓场只含权重大于 0 的鱼；新扫模还要 places 对得上。 */
export function modelKeysForLocation(locId) {
  const loc = locationById[locId];
  if (!loc) return [];
  const keys = new Set();
  for (const [id, spec] of Object.entries(SPECIES_MAP)) {
    const places = SPECIES_PLACES[id];
    const w = loc.weights[id];
    let spawn = false;
    if (places) spawn = places.includes(locId) && !(w <= 0);
    else if (loc.closed) spawn = w > 0;
    else spawn = w == null || w > 0;
    if (spawn && MODELS[spec.m]) keys.add(spec.m);
  }
  return [...keys];
}

function enqueueLocation(locId, priority) {
  return Promise.all(modelKeysForLocation(locId).map((key) => requestLoad(key, priority)));
}

let focusLoc = null;

/** 只下载这个钓场用得到的 GLB。邻场模型少的时候，下完再低优先级预热下一站。 */
export function preloadForLocation(locId, { warm = true } = {}) {
  focusLoc = locId;
  for (const job of queue) if (job.priority < 10) job.priority = -1;
  const done = enqueueLocation(locId, 1);
  if (warm) {
    const next = locationById[locId]?.nextId;
    if (next) {
      done.then(() => {
        if (focusLoc !== locId) return;
        const n = modelKeysForLocation(next).length;
        if (n > 0 && n <= 28) enqueueLocation(next, -1);
      });
    }
  }
  return done.then(() => Object.keys(assets));
}

/** 这条鱼的模型插到队列前面。咬钩到上岸之间通常够下完一件。 */
export function preloadSpeciesModel(sp) {
  if (!sp) return Promise.resolve(false);
  const spec = SPECIES_MAP[sp.id];
  if (!spec || !MODELS[spec.m]) return Promise.resolve(false);
  return requestLoad(spec.m, 10);
}

// 名称保留以兼容 main.js
export function preloadQuaterniusFish(locId = 'lake') {
  return preloadForLocation(locId);
}

export function quaterniusReady() {
  return Object.keys(assets).length > 0;
}

function makeMaterial(src, spec, uniforms) {
  const tint = spec.tint ? new THREE.Color(...spec.tint) : new THREE.Color(1, 1, 1);
  const desat = spec.desat || 0;
  // KHR_materials_unlit → MeshBasicMaterial。再套一层物理光照会把摄影测量的明暗乘第二遍。
  const unlit = src.isMeshBasicMaterial === true;
  const gain = unlit ? SCAN_GAIN : 1;
  const color = (desat ? new THREE.Color(1, 1, 1) : tint).multiplyScalar(gain);
  let m;
  if (unlit) {
    m = new THREE.MeshBasicMaterial({
      color,
      map: src.map || null,
      side: THREE.DoubleSide,
    });
  } else {
    m = new THREE.MeshPhysicalMaterial({
      // desat>0 时在片元里先去色再乘色调，用来抹掉原贴图的特征色（如食人鱼红腹）
      color,
      map: src.map || null,
      roughnessMap: src.roughnessMap || null,
      metalnessMap: src.metalnessMap || null,
      roughness: src.roughnessMap ? 0.85 : 0.4,
      metalness: src.metalnessMap ? 0.5 : 0.05,
      clearcoat: 0.45,
      clearcoatRoughness: 0.25,
      envMapIntensity: 0.9,
      side: THREE.DoubleSide,
    });
    if (spec.glow) { m.emissive = tint.clone(); m.emissiveMap = src.map || null; m.emissiveIntensity = spec.glow; }
  }
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uAmp = uniforms.uAmp;
    sh.uniforms.uSpeed = uniforms.uSpeed;
    sh.uniforms.uLeap = uniforms.uLeap;
    sh.vertexShader = 'uniform float uTime;\nuniform float uAmp;\nuniform float uSpeed;\nuniform float uLeap;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float t = clamp(0.32 - position.x, 0.0, 1.2);
        float wave = sin(uTime * uSpeed - t * 5.8);
        float spine = uAmp * (t * t * 1.6);
        transformed.z += wave * spine;
        transformed.y += uLeap * sin((0.5 - position.x) * 3.14159) * 0.06;
        transformed.z += uLeap * wave * t * 0.04;`);
    if (desat) {
      sh.uniforms.uDesat = { value: desat };
      sh.uniforms.uTintC = { value: tint };
      sh.fragmentShader = 'uniform float uDesat;\nuniform vec3 uTintC;\n' +
        sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          diffuseColor.rgb = mix(diffuseColor.rgb * uTintC, vec3(l * 1.08) * uTintC, uDesat); }`);
    } else if (unlit && spec.glow) {
      sh.uniforms.uGlow = { value: spec.glow };
      sh.fragmentShader = 'uniform float uGlow;\n' +
        sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb *= (1.0 + uGlow);`);
    }
  };
  m.customProgramCacheKey = () => `realfish-${unlit ? 'u' : 'p'}-${desat ? 'd' : 'c'}-${spec.glow ? 1 : 0}`;
  return m;
}

/** 已加载则返回与 buildFish 相同约定的 Group，否则 null（回退程序化网格）。 */
export function buildQuaterniusFish(sp) {
  const spec = SPECIES_MAP[sp.id];
  if (!spec) return null;
  const entry = assets[spec.m];
  if (!entry) return null;
  const hero = sp.id === 'carp' || sp.id === 'goldcarp' || sp.id === 'koi';
  const uniforms = {
    uTime: { value: Math.random() * 10 },
    uAmp: { value: hero ? 0.048 : 0.055 },
    uSpeed: { value: hero ? 6.0 : 6.5 },
    uLeap: { value: 0 },
    uFin: { value: 1 },
  };
  const made = [];
  const fit = new THREE.Group();
  fit.scale.set(1, spec.h || 1, spec.w || 1);
  for (const part of entry.parts) {
    const srcs = Array.isArray(part.material) ? part.material : [part.material];
    const mats = srcs.map((src) => makeMaterial(src, spec, uniforms));
    made.push(...mats);
    const mesh = new THREE.Mesh(part.geometry, mats.length === 1 ? mats[0] : mats);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    fit.add(mesh);
  }
  const wrap = new THREE.Group();
  wrap.add(fit);
  wrap.userData.uniforms = uniforms;
  wrap.userData.isHeroCarp = hero;
  wrap.userData.fromGltf = true;
  wrap.userData.quaternius = spec.m;
  wrap.userData.dispose = () => { for (const mat of made) mat.dispose(); };
  return wrap;
}

// 静态网格无骨骼动画；摆尾由调用方累加的 uTime 驱动着色器完成。保留导出以兼容 main.js。
export function tickFishAnim() {}
