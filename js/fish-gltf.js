// Quaternius CC0 锦鲤 / 金鱼 / 甲鲶。体长归一化到 1、头朝 +X，与程序化鱼的渔获和跃水朝向一致。
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';
import { clone as cloneSkinned } from '../vendor/addons/SkeletonUtils.js';

const FILES = {
  koi: 'vendor/fish/Koi.glb',
  goldfish: 'vendor/fish/Goldfish.glb',
  catfish: 'vendor/fish/ArmoredCatfish.glb',
};

const SWIM_CLIP = 'Fish_Armature|Swimming_Normal';

/** @type {Record<string, { scene: THREE.Object3D, animations: THREE.AnimationClip[], yaw: number, offset: THREE.Vector3, scale: number }>} */
const assets = {};
let preloadPromise = null;

function modelKeyFor(id) {
  if (id === 'carp' || id === 'goldcarp') return 'goldfish';
  if (id === 'catfish' || id === 'yellowcat') return 'catfish';
  return 'koi';
}

function wettenMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const next = list.map((src) => {
      const name = src?.name || '';
      const isEye = /eye/i.test(name);
      const isFin = /fin/i.test(name);
      const col = src.color ? src.color.clone() : new THREE.Color(0xffffff);
      const sum = col.r + col.g + col.b;
      // 甲鲶 albedo 约 0.02，逆光下会糊成黑块。只抬这类近黑的身体色，眼睛不动。
      const lifted = !isEye && sum < 0.12;
      if (lifted) {
        col.r = Math.min(1, col.r * 6.5 + 0.05);
        col.g = Math.min(1, col.g * 6.5 + 0.045);
        col.b = Math.min(1, col.b * 6.5 + 0.03);
      }
      const dark = lifted;
      const m = new THREE.MeshPhysicalMaterial({
        name,
        color: col,
        map: src.map || null,
        // 原材质 metalness 0.4，低模平涂会发塑料。压低金属度，用清漆做湿身高光。
        roughness: isEye ? 0.16 : (dark ? 0.36 : 0.3),
        metalness: isEye ? 0.02 : 0.05,
        clearcoat: isEye ? 1 : (dark ? 0.4 : 0.48),
        clearcoatRoughness: isEye ? 0.06 : 0.24,
        sheen: isEye || dark ? 0 : 0.28,
        sheenColor: new THREE.Color(0xfff3e6),
        sheenRoughness: 0.45,
        envMapIntensity: isEye ? 1.15 : 0.8,
        side: isFin ? THREE.DoubleSide : THREE.FrontSide,
      });
      return m;
    });
    o.material = next.length === 1 ? next[0] : next;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
  });
}

function boneWorld(root, name) {
  let hit = null;
  root.traverse((o) => {
    if (!hit && o.isBone && o.name === name) hit = o;
  });
  return hit ? hit.getWorldPosition(new THREE.Vector3()) : null;
}

function eyesWorld(root) {
  const box = new THREE.Box3();
  let found = false;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (!mats.some((m) => /eye/i.test(m?.name || ''))) return;
    box.expandByObject(o);
    found = true;
  });
  return found ? box.getCenter(new THREE.Vector3()) : null;
}

/** 测量一次：头朝 +X，原点在包围盒中心，体长 = 1。 */
function measureFit(scene) {
  const probe = cloneSkinned(scene);
  const holder = new THREE.Group();
  holder.rotation.y = Math.PI / 2;
  holder.add(probe);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const center = box.getCenter(new THREE.Vector3());
  const head = eyesWorld(holder) || boneWorld(holder, 'Main1') || center.clone();
  let yaw = Math.PI / 2;
  if (head.x < center.x) yaw = -Math.PI / 2;
  if (yaw !== Math.PI / 2) {
    holder.rotation.y = yaw;
    holder.updateMatrixWorld(true);
  }
  const fitted = new THREE.Box3().setFromObject(holder);
  const fittedCenter = fitted.getCenter(new THREE.Vector3());
  const size = fitted.getSize(new THREE.Vector3());
  const length = Math.max(size.x, 1e-4);
  probe.removeFromParent();
  return { yaw, offset: fittedCenter.multiplyScalar(-1), scale: 1 / length, length, size };
}

function loadOne(loader, key, url) {
  return new Promise((resolve) => {
    loader.load(url, (gltf) => {
      wettenMaterials(gltf.scene);
      const fit = measureFit(gltf.scene);
      assets[key] = { scene: gltf.scene, animations: gltf.animations, ...fit };
      console.info(`[fish] ${key} ${url} 体长 ${fit.length.toFixed(2)} → 归一化 ${fit.scale.toFixed(3)} yaw ${fit.yaw.toFixed(2)}`);
      resolve(true);
    }, undefined, (err) => {
      console.warn('[fish] GLB 加载失败，该外形回退程序化网格', url, err);
      resolve(false);
    });
  });
}

export function preloadQuaterniusFish() {
  if (preloadPromise) return preloadPromise;
  const loader = new GLTFLoader();
  preloadPromise = Promise.all(
    Object.entries(FILES).map(([key, url]) => loadOne(loader, key, url)),
  ).then(() => Object.keys(assets));
  return preloadPromise;
}

export function quaterniusReady() {
  return !!assets.koi;
}

function playSwim(root, animations) {
  const mixer = new THREE.AnimationMixer(root);
  const clip = THREE.AnimationClip.findByName(animations, SWIM_CLIP) || animations[0];
  if (clip) {
    const action = mixer.clipAction(clip);
    action.play();
    mixer.update(0.35);
  }
  return mixer;
}

/** 已加载则返回与 buildFish 相同约定的 Group，否则 null。 */
export function buildQuaterniusFish(sp) {
  const entry = assets[modelKeyFor(sp.id)] || assets.koi;
  if (!entry) return null;
  const model = cloneSkinned(entry.scene);
  // 归一化放在内层。渔获/跃水会改外层 scale（0.5、0.62…），不能把体长缩放写在外层。
  const spin = new THREE.Group();
  spin.rotation.y = entry.yaw;
  spin.position.copy(entry.offset);
  spin.add(model);
  const fit = new THREE.Group();
  fit.scale.setScalar(entry.scale);
  fit.add(spin);
  const wrap = new THREE.Group();
  wrap.add(fit);
  const mixer = playSwim(model, entry.animations);
  const hero = sp.id === 'carp' || sp.id === 'goldcarp' || sp.id === 'koi';
  wrap.userData.uniforms = {
    uTime: { value: 0 },
    uAmp: { value: hero ? 0.048 : 0.055 },
    uSpeed: { value: hero ? 6.0 : 6.5 },
    uLeap: { value: 0 },
    uFin: { value: 1 },
  };
  wrap.userData.mixer = mixer;
  wrap.userData.isHeroCarp = hero;
  wrap.userData.fromGltf = true;
  wrap.userData.quaternius = modelKeyFor(sp.id);
  wrap.userData.dispose = () => {
    mixer.stopAllAction();
  };
  return wrap;
}

export function tickFishAnim(obj, dt) {
  const mixer = obj?.userData?.mixer;
  if (!mixer) return;
  const speed = obj.userData.uniforms?.uSpeed?.value ?? 6;
  mixer.timeScale = THREE.MathUtils.clamp(speed / 6, 0.35, 2.2);
  mixer.update(dt);
}
