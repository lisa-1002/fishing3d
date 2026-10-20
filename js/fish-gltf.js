// 写实鱼模型（CC0）。来源与许可见 vendor/fish/real/CREDITS.md。
// 载入时把几何烘焙到统一坐标：头朝 +X、体长 = 1、原点在包围盒中心，
// 与程序化鱼约定一致，因此渔获卡、图鉴、跃水代码无需改动。
// 模型本身是静态网格，摆尾用与 fish.js 相同的顶点着色器波动实现。
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';

const BASE = 'vendor/fish/real/';
// axis：模型体长所在轴；head：头部在该轴的正(+1)或负(-1)方向
const MODELS = {
  koi:        { file: 'koi.glb',             axis: 'z', head: 1 },
  arowana:    { file: 'silver_arowana.glb',  axis: 'z', head: 1 },
  trout:      { file: 'rainbow_trout.glb',   axis: 'z', head: 1 },
  salmon:     { file: 'sockeye_salmon.glb',  axis: 'z', head: 1 },
  catfish:    { file: 'channel_catfish.glb', axis: 'z', head: 1 },
  piranha:    { file: 'piranha.glb',         axis: 'z', head: 1 },
  bass:       { file: 'largemouth_bass.glb', axis: 'x', head: 1 },
  barramundi: { file: 'barramundi.glb',      axis: 'z', head: 1 },
};

// 物种 → 模型 + 色调(乘色) + 体高/体宽缩放。未列出的物种（黄鳝、甲鱼）走程序化网格。
const SPECIES_MAP = {
  koi:        { m: 'koi' },
  carp:       { m: 'arowana', tint: [1.0, 0.8, 0.5], h: 1.22, w: 1.15 },
  goldcarp:   { m: 'arowana', tint: [1.0, 0.74, 0.22], h: 1.22, w: 1.15, glow: 0.12 },
  crucian:    { m: 'piranha', tint: [0.86, 0.9, 0.74], desat: 0.92, h: 0.9 },
  tilapia:    { m: 'piranha', tint: [0.66, 0.72, 0.78], desat: 0.85, h: 0.95 },
  bream:      { m: 'piranha', tint: [1.0, 1.0, 0.97], desat: 0.95, h: 0.88, w: 0.75 },
  grass:      { m: 'arowana', tint: [0.72, 0.76, 0.5], h: 0.95 },
  blackcarp:  { m: 'arowana', tint: [0.42, 0.46, 0.46], h: 1.0 },
  silvercarp: { m: 'arowana', tint: [0.96, 0.97, 1.0], h: 1.15 },
  bighead:    { m: 'arowana', tint: [0.62, 0.6, 0.55], h: 1.15 },
  mudcarp:    { m: 'arowana', tint: [0.82, 0.84, 0.88], h: 1.0 },
  culter:     { m: 'arowana', tint: [0.98, 0.98, 1.0], h: 0.85, w: 0.85 },
  redtail:    { m: 'arowana', tint: [0.95, 0.9, 0.88], h: 0.95 },
  bleak:      { m: 'arowana', tint: [1.0, 1.0, 1.0], h: 0.75, w: 0.8 },
  icefish:    { m: 'arowana', tint: [1.0, 1.0, 1.0], h: 0.6, w: 0.7 },
  arowana:    { m: 'arowana', tint: [1.0, 0.86, 0.42], glow: 0.08 },
  horsemouth: { m: 'trout', tint: [0.95, 0.92, 0.95], h: 0.95 },
  trout:      { m: 'trout' },
  pike:       { m: 'trout', tint: [0.62, 0.8, 0.5], h: 0.8, w: 0.9 },
  snakehead:  { m: 'trout', tint: [0.42, 0.42, 0.36], h: 0.9 },
  taimen:     { m: 'salmon', tint: [0.72, 0.6, 0.5] },
  gancyu:     { m: 'barramundi', tint: [0.95, 0.9, 0.75], h: 0.8 },
  perch:      { m: 'barramundi' },
  mandarin:   { m: 'bass', tint: [1.0, 0.85, 0.6] },
  catfish:    { m: 'catfish' },
  yellowcat:  { m: 'catfish', tint: [1.0, 0.82, 0.38], h: 1.0 },
  sturgeon:   { m: 'catfish', tint: [0.68, 0.7, 0.74], h: 0.75, w: 0.85 },
  loach:      { m: 'catfish', tint: [0.75, 0.62, 0.45], h: 0.55, w: 0.6 },
};

/** @type {Record<string, { geometry: THREE.BufferGeometry, material: THREE.Material }>} */
const assets = {};
let preloadPromise = null;

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

/** 把整个 glTF 场景合成一个已归一化的几何体（每个文件只有一个网格/材质）。 */
function bake(scene, cfg) {
  scene.updateMatrixWorld(true);
  let mesh = null;
  scene.traverse((o) => { if (!mesh && o.isMesh) mesh = o; });
  if (!mesh) return null;
  const g = toFloat(mesh.geometry.clone());
  g.applyMatrix4(mesh.matrixWorld);
  // 体长轴转到 +X，头朝 +X
  const rot = new THREE.Matrix4();
  if (cfg.axis === 'z') rot.makeRotationY(cfg.head > 0 ? Math.PI / 2 : -Math.PI / 2);
  else if (cfg.head < 0) rot.makeRotationY(Math.PI);
  g.applyMatrix4(rot);
  g.computeBoundingBox();
  const c = g.boundingBox.getCenter(new THREE.Vector3());
  const len = g.boundingBox.max.x - g.boundingBox.min.x;
  g.translate(-c.x, -c.y, -c.z);
  g.scale(1 / len, 1 / len, 1 / len);
  g.computeBoundingBox(); g.computeBoundingSphere();
  return { geometry: g, material: mesh.material };
}

function loadOne(loader, key, cfg) {
  return new Promise((resolve) => {
    loader.load(BASE + cfg.file, (gltf) => {
      const b = bake(gltf.scene, cfg);
      if (b) assets[key] = b;
      resolve(!!b);
    }, undefined, (err) => {
      console.warn('[fish] GLB 加载失败，该外形回退程序化网格', cfg.file, err);
      resolve(false);
    });
  });
}

// 名称保留以兼容 main.js
export function preloadQuaterniusFish() {
  if (preloadPromise) return preloadPromise;
  const loader = new GLTFLoader();
  preloadPromise = Promise.all(
    Object.entries(MODELS).map(([key, cfg]) => loadOne(loader, key, cfg)),
  ).then(() => Object.keys(assets));
  return preloadPromise;
}

export function quaterniusReady() {
  return Object.keys(assets).length > 0;
}

function makeMaterial(src, spec, uniforms) {
  const tint = spec.tint ? new THREE.Color(...spec.tint) : new THREE.Color(1, 1, 1);
  const desat = spec.desat || 0;
  const m = new THREE.MeshPhysicalMaterial({
    // desat>0 时在片元里先去色再乘色调，用来抹掉原贴图的特征色（如食人鱼红腹）
    color: desat ? new THREE.Color(1, 1, 1) : tint,
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
    }
  };
  m.customProgramCacheKey = () => (desat ? 'realfish-d' : 'realfish');
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
  const mat = makeMaterial(entry.material, spec, uniforms);
  const mesh = new THREE.Mesh(entry.geometry, mat);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  const fit = new THREE.Group();
  fit.scale.set(1, spec.h || 1, spec.w || 1);
  fit.add(mesh);
  const wrap = new THREE.Group();
  wrap.add(fit);
  wrap.userData.uniforms = uniforms;
  wrap.userData.isHeroCarp = hero;
  wrap.userData.fromGltf = true;
  wrap.userData.quaternius = spec.m;
  wrap.userData.dispose = () => { mat.dispose(); };
  return wrap;
}

// 静态网格无骨骼动画；摆尾由调用方累加的 uTime 驱动着色器完成。保留导出以兼容 main.js。
export function tickFishAnim() {}
