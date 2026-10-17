// 静湖垂钓 3D v2 —— 渲染、输入、台钓/露亚双玩法状态机
import * as THREE from 'three';
import { createWorld, DECK_Y, DOCK_END_Z } from './world.js';
import { SPECIES, RARITY, speciesById, buildFish, makeThumbnails } from './fish.js';
import { RODS, LURES, BAITS } from './data.js';
import { loadSave } from './save.js';
import { createSystems } from './systems.js';
import { createUI } from './ui.js';
import { clamp, lerp, rand } from './util.js';

// ---------------- 画质 ----------------
const isMobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const quality = localStorage.getItem('fishing3d_quality') || (isMobile ? 'low' : 'high');
const Q = quality === 'high'
  ? { pr: Math.min(devicePixelRatio, 2), shadow: 2048, waterRes: 1024, terrainSeg: 256, trees: 1400, reeds: 2200, aa: true }
  : { pr: Math.min(devicePixelRatio, 1.25), shadow: 1024, waterRes: 256, terrainSeg: 128, trees: 450, reeds: 700, aa: false };

// ---------------- 存档 & 系统 ----------------
const { save, migrated } = loadSave();
let UI;
const S = createSystems(save, {
  levelUp: l => { UI && UI.toast(`升级！钓鱼等级 Lv.${l}，商店解锁新装备`, 2600); },
  questDone: t => { UI && setTimeout(() => UI.toast(`任务完成：${t}，去任务面板领取奖励`, 2600), 2700); },
  toast: m => UI && UI.toast(m),
  equipChanged: () => { applyGear(); UI && UI.refreshHud(); },
});
S.ensureDaily();

// ---------------- 渲染器 ----------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.aa, powerPreference: 'high-performance' });
renderer.setPixelRatio(Q.pr);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.12, 20000);
camera.rotation.order = 'YXZ';
const CAM_POS = new THREE.Vector3(0, DECK_Y + 1.65, DOCK_END_Z + 3.0);
camera.position.copy(CAM_POS);
scene.add(camera);
const world = createWorld(scene, renderer, Q);

// ---------------- 鱼竿（可换外观、分段弯曲） ----------------
const rodRig = new THREE.Group();
rodRig.position.set(0.42, -0.5, -0.5);
camera.add(rodRig);
const rodBase = new THREE.Group();
rodRig.add(rodBase);
const ROD_SEG = 14;
let segs = [], rodTip = new THREE.Object3D(), reelHandle = null, rodBuiltKey = '';
function buildRod(def) {
  const key = def.name; if (key === rodBuiltKey) return; rodBuiltKey = key;
  rodBase.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } });
  rodBase.clear(); segs = [];
  const isLure = def.type === 'lure';
  const blank = new THREE.MeshPhysicalMaterial({ color: def.color, roughness: def.type === 'float' && def.metal === 0 ? 0.55 : 0.28, metalness: def.metal, clearcoat: 1, clearcoatRoughness: 0.12 });
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.019, isLure ? 0.32 : 0.5, 16),
    new THREE.MeshStandardMaterial({ color: isLure ? 0x1a1a1a : 0xb48f62, roughness: isLure ? 0.7 : 0.95 }));
  grip.position.y = isLure ? -0.1 : -0.2; rodBase.add(grip);
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.25, clearcoat: 0.5 });
  reelHandle = null;
  if (isLure) { // 纺车轮（台钓竿为手竿，无渔轮）
    const reel = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.08, 8), metal); stem.rotation.x = Math.PI / 2; stem.position.z = -0.04; reel.add(stem);
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 24), metal); spool.position.set(0, 0.02, -0.1); reel.add(spool);
    const housing = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 14), new THREE.MeshPhysicalMaterial({ color: def.color, metalness: 0.6, roughness: 0.3, clearcoat: 1 }));
    housing.scale.set(0.9, 0.9, 1.1); housing.position.set(0, -0.03, -0.1); reel.add(housing);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6), metal); handle.rotation.z = Math.PI / 2; handle.position.set(0.05, -0.03, -0.1); reel.add(handle);
    reel.position.y = 0.05; rodBase.add(reel); reelHandle = reel;
  }
  let parent = rodBase;
  const segLen = def.len / ROD_SEG;
  for (let i = 0; i < ROD_SEG; i++) {
    const r0 = lerp(0.016, 0.0035, i / ROD_SEG), r1 = lerp(0.016, 0.0035, (i + 1) / ROD_SEG);
    const g = new THREE.Group(); g.position.y = i === 0 ? 0.05 : segLen;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, segLen, 10), blank); m.position.y = segLen / 2; g.add(m);
    if (def.type === 'float' && def.metal === 0 && i % 2 === 0) { // 竹节
      const node = new THREE.Mesh(new THREE.TorusGeometry(r0 * 1.02, r0 * 0.18, 6, 14), blank); node.rotation.x = Math.PI / 2; g.add(node);
    }
    if (isLure && i % 3 === 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012 + r0, 0.0025, 6, 14), metal);
      ring.rotation.x = Math.PI / 2; ring.position.set(0, segLen * 0.5, -0.02 - r0); g.add(ring);
    }
    parent.add(g); segs.push(g); parent = g;
  }
  rodTip = new THREE.Object3D(); rodTip.position.y = segLen; parent.add(rodTip);
}
const ROD_REST = -0.95;
const rod = { pitch: ROD_REST, yaw: 0.02, bend: 0.05 };
function updateRod() {
  rodBase.rotation.set(rod.pitch, 0, rod.yaw);
  segs.forEach((g, i) => { g.rotation.x = -rod.bend * Math.pow((i + 1) / ROD_SEG, 1.6) * 0.13; });
}

// ---------------- 浮漂 ----------------
const bobber = new THREE.Group();
{
  const pts = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * 0.045 * (t < 0.5 ? 1 : 0.85), -0.06 + t * 0.12)); }
  const red = new THREE.MeshPhysicalMaterial({ color: 0xff2a10, roughness: 0.25, clearcoat: 1, emissive: 0x330000 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf8f8f8, roughness: 0.25, clearcoat: 1 });
  const top = new THREE.Mesh(new THREE.LatheGeometry(pts.slice(8), 24), red);
  const bottom = new THREE.Mesh(new THREE.LatheGeometry(pts.slice(0, 9), 24), white);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.14, 8), new THREE.MeshPhysicalMaterial({ color: 0xffd400, emissive: 0x554400, roughness: 0.3 }));
  antenna.position.y = 0.13;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), red); cap.position.y = 0.2;
  bobber.add(top, bottom, antenna, cap);
  bobber.traverse(o => { if (o.isMesh) o.castShadow = true; });
}
// ---------------- 路亚饵模型 ----------------
const lureModels = {};
{
  const mk = (geo, color, metal = 0.2, rough = 0.3) => new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color, metalness: metal, roughness: rough, clearcoat: 1 }));
  const spoon = new THREE.Group(); { const m = mk(new THREE.SphereGeometry(0.045, 16, 10), 0xe6e6e6, 1, 0.15); m.scale.set(1, 0.18, 0.55); spoon.add(m); const h = mk(new THREE.TorusGeometry(0.01, 0.002, 6, 12), 0xaaaaaa, 1); h.position.x = -0.05; spoon.add(h); }
  const minnow = new THREE.Group(); { const m = mk(new THREE.SphereGeometry(0.05, 16, 10), 0x3a8ac0, 0.5, 0.2); m.scale.set(1, 0.32, 0.26); minnow.add(m); const b = mk(new THREE.SphereGeometry(0.05, 16, 10), 0xf0f0f0, 0.6); b.scale.set(0.95, 0.2, 0.24); b.position.y = -0.006; minnow.add(b); const lip = mk(new THREE.BoxGeometry(0.02, 0.002, 0.016), 0xdddddd, 0, 0.05); lip.position.set(0.055, -0.008, 0); lip.rotation.z = -0.6; minnow.add(lip); }
  const worm = new THREE.Group(); { const m = mk(new THREE.TorusGeometry(0.03, 0.008, 8, 20, Math.PI * 1.2), 0x6a4a8a, 0, 0.5); worm.add(m); }
  const popper = new THREE.Group(); { const m = mk(new THREE.CylinderGeometry(0.018, 0.011, 0.07, 14), 0xe0d040, 0.2); m.rotation.z = Math.PI / 2; popper.add(m); const f = mk(new THREE.CircleGeometry(0.016, 14), 0xc03020); f.rotation.y = Math.PI / 2; f.position.x = 0.036; popper.add(f); }
  const frog = new THREE.Group(); { const m = mk(new THREE.SphereGeometry(0.03, 14, 10), 0x3a8a2a, 0, 0.5); m.scale.set(1.2, 0.6, 1); frog.add(m); for (const s of [1, -1]) { const l = mk(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6), 0x2a6a1a); l.rotation.set(Math.PI / 2, 0, 0.6 * s); l.position.set(-0.035, 0, 0.02 * s); frog.add(l); } }
  Object.assign(lureModels, { spoon, minnow, worm, popper, frog });
}
const tackle = new THREE.Group(); // 线末端：浮漂或路亚饵
scene.add(tackle);
tackle.add(bobber);
Object.values(lureModels).forEach(m => { m.visible = false; tackle.add(m); });

// 鱼影（露亚追饵）
const followShadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0x050a08, transparent: true, opacity: 0, depthWrite: false }));
followShadow.rotation.x = -Math.PI / 2; followShadow.scale.set(1, 0.3, 1); followShadow.renderOrder = 2; followShadow.visible = false;
scene.add(followShadow);

function applyGear() {
  buildRod(S.rod());
  const lureMode = save.equip.mode === 'lure';
  bobber.visible = !lureMode;
  const shape = S.lure().shape;
  for (const [k, m] of Object.entries(lureModels)) m.visible = lureMode && k === shape;
  updateRod();
}

// ---------------- 鱼线 ----------------
const LINE_PTS = 40;
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_PTS * 3), 3));
const fishLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xf2f2ea, transparent: true, opacity: 0.75 }));
fishLine.frustumCulled = false; scene.add(fishLine);
const _tip = new THREE.Vector3();
function updateLine(sag) {
  rodTip.getWorldPosition(_tip);
  const p = lineGeo.attributes.position, b = tackle.position;
  const topY = b.y + (save.equip.mode === 'lure' ? 0.02 : 0.2) * tackle.scale.y;
  for (let i = 0; i < LINE_PTS; i++) {
    const t = i / (LINE_PTS - 1);
    p.setXYZ(i, lerp(_tip.x, b.x, t), lerp(_tip.y, topY, t) - Math.sin(t * Math.PI) * sag, lerp(_tip.z, b.z, t));
  }
  p.needsUpdate = true;
}

// ---------------- 水花 & 涟漪 ----------------
const ripples = [];
{
  const rg = new THREE.RingGeometry(0.85, 1, 48); rg.rotateX(-Math.PI / 2);
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; scene.add(m); ripples.push({ m, life: 0, max: 1, size: 1 });
  }
}
let rippleIdx = 0;
function spawnRipple(pos, size = 1, life = 1.6) {
  const r = ripples.find(r => r.life <= 0) || ripples[(rippleIdx = (rippleIdx + 1) % ripples.length)];
  r.m.position.set(pos.x, 0.03, pos.z); r.life = r.max = life; r.size = size; r.m.visible = true;
}
const SPLASH_N = 200;
const splashGeo = new THREE.BufferGeometry();
splashGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPLASH_N * 3), 3));
const splashVel = new Float32Array(SPLASH_N * 3), splashLife = new Float32Array(SPLASH_N);
let splashHead = 0;
const splash = new THREE.Points(splashGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.85, depthWrite: false }));
splash.frustumCulled = false; scene.add(splash);
for (let i = 0; i < SPLASH_N; i++) splashGeo.attributes.position.setY(i, -100);
function spawnSplash(pos, n = 30, power = 1) {
  const p = splashGeo.attributes.position;
  for (let k = 0; k < n; k++) {
    const i = splashHead = (splashHead + 1) % SPLASH_N;
    p.setXYZ(i, pos.x + rand(-0.1, 0.1) * power, 0.05, pos.z + rand(-0.1, 0.1) * power);
    const a = Math.random() * 6.28, s = rand(0.5, 1.6) * power;
    splashVel[i * 3] = Math.cos(a) * s; splashVel[i * 3 + 1] = rand(1.5, 3.5) * power; splashVel[i * 3 + 2] = Math.sin(a) * s;
    splashLife[i] = 1;
  }
}
function updateFx(dt) {
  for (const r of ripples) if (r.life > 0) {
    r.life -= dt; const t = 1 - r.life / r.max;
    r.m.scale.setScalar(0.2 + t * 2.2 * r.size); r.m.material.opacity = (1 - t) * 0.55;
    if (r.life <= 0) r.m.visible = false;
  }
  const p = splashGeo.attributes.position;
  for (let i = 0; i < SPLASH_N; i++) if (splashLife[i] > 0) {
    splashVel[i * 3 + 1] -= 9.8 * dt;
    p.setXYZ(i, p.getX(i) + splashVel[i * 3] * dt, p.getY(i) + splashVel[i * 3 + 1] * dt, p.getZ(i) + splashVel[i * 3 + 2] * dt);
    if (p.getY(i) < 0) { splashLife[i] = 0; p.setY(i, -100); }
  }
  p.needsUpdate = true;
}

// ---------------- UI ----------------
const $ = id => document.getElementById(id);
let thumbs = {};
UI = createUI(save, S, { thumbs: () => thumbs, canOpenPanel: () => G.state === 'idle', coinFx: () => { $('coinChip').classList.remove('pop'); void $('coinChip').offsetWidth; $('coinChip').classList.add('pop'); } });
const ui = {
  hint: $('hint'), power: $('powerWrap'), powerFill: $('powerFill'),
  reel: $('reelWrap'), tension: $('tensionFill'), progress: $('progressFill'), reelMsg: $('reelMsg'),
  lure: $('lureWrap'), speedFill: $('speedFill'), speedZone: $('speedZone'), attrFill: $('attrFill'), lureMsg: $('lureMsg'),
  bite: $('bitePrompt'), card: $('card'), action: $('actionBtn'), mark: $('bobMark'), strikeFx: $('strikeFx'),
};
function flashText(txt, color = '#ffe14a') { const el = ui.strikeFx; el.textContent = txt; el.style.color = color; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }

// ---------------- 状态机 ----------------
const G = {
  state: 'idle', t: 0, power: 0, powerDir: 1, aim: 0, holding: false, pressT: 0,
  castFrom: new THREE.Vector3(), castTo: new THREE.Vector3(), castDur: 1, castPower: 0.5, mode: 'float',
  waitT: 0, nibbleT: 0, dip: 0, nibbling: 0, biteWindow: 1, perfectWin: 0.3,
  fish: null, perfect: false,
  // 露亚
  lp: new THREE.Vector3(), speed: 0, attract: 0, twitches: [], follower: null, wakeT: 0, strikeChanceT: 0,
  // 搏鱼
  tension: 0.4, progress: 0, slackT: 0, overT: 0, evt: null, evtT: 2, jumpModel: null, jumpT: 0,
  retrieveFrom: new THREE.Vector3(), retrieveT: 0, shake: 0, catchModel: null, catchLight: null, catchInfo: null, pitch: -0.1,
};
const HINT = {
  idle: () => save.equip.mode === 'lure'
    ? (isMobile ? '露亚：按住蓄力，拖动瞄准，松开抛投' : '露亚：按住鼠标/空格蓄力，拖动或 A/D 瞄准，松开抛投')
    : (isMobile ? '台钓：按住蓄力，拖动瞄准，松开抛竿' : '台钓：按住鼠标/空格蓄力，拖动或 A/D 瞄准，松开抛竿'),
  charging: () => '松开抛竿！', casting: () => '',
  waiting: () => G.nibbling > 0 ? '有鱼在试口… 别急，等浮漂整个沉下去（黑漂）！' : '耐心等待… 小幅点动是试口，整个下沉再提竿',
  bite: () => '', strike: () => '',
  lure: () => isMobile ? '按住收线 · 松开停顿 · 轻点抽竿，让速度保持在绿色区' : '按住收线 · 松开停顿 · 轻点抽竿（空格同理），速度保持在绿色区',
  reeling: () => '按住收线，张力过高就松手；甩头、冲刺时注意卸力',
  caught: () => '', returning: () => '',
};
const ACTION = { idle: '按住抛竿', charging: '松开抛竿', casting: '…', waiting: '提竿', bite: '提竿！', strike: '刺鱼！', lure: '按住收线', reeling: '按住收线', caught: '…', returning: '…' };
function setState(s) {
  G.state = s; G.t = 0;
  ui.hint.textContent = HINT[s] ? HINT[s]() : '';
  ui.power.classList.toggle('show', s === 'charging');
  ui.reel.classList.toggle('show', s === 'reeling');
  ui.lure.classList.toggle('show', s === 'lure');
  if (s !== 'bite' && s !== 'strike') ui.bite.classList.remove('show');
  ui.action.textContent = ACTION[s];
  ui.action.classList.toggle('urgent', s === 'bite' || s === 'strike');
  ui.action.classList.toggle('hidden', s === 'caught');
  document.body.classList.toggle('busy', s !== 'idle');
}
const forward = () => new THREE.Vector3(-Math.sin(G.aim), 0, -Math.cos(G.aim));
const hangPos = (out) => { rodTip.getWorldPosition(_tip); return out.set(_tip.x, _tip.y - (save.equip.mode === 'lure' ? 0.25 : 0.75), _tip.z); };

function startCast() {
  G.mode = save.equip.mode;
  const rodDef = S.rod();
  const p = G.power;
  const dist = (8 + p * 47) * rodDef.cast * (G.mode === 'lure' ? 1.05 : 1);
  rodTip.getWorldPosition(G.castFrom);
  const f = forward();
  G.castTo.set(CAM_POS.x + f.x * dist + rand(-1, 1), 0, CAM_POS.z + f.z * dist + rand(-1, 1));
  G.castDur = 0.7 + dist * 0.018; G.castPower = p;
  if (G.mode === 'float') G.baitUsed = S.consumeBait() || 'none';
  UI.refreshHud();
  setState('casting');
}
function startReturn(msg) {
  if (msg) UI.toast(msg);
  G.fish = null; G.follower = null; followShadow.visible = false;
  if (G.jumpModel) { scene.remove(G.jumpModel); G.jumpModel.userData.dispose(); G.jumpModel = null; }
  G.retrieveFrom.copy(tackle.position); G.retrieveT = 0;
  setState('returning');
}
function hookFish(perfect) {
  G.perfect = perfect;
  if (perfect) { S.notePerfect(); flashText(G.mode === 'lure' ? '完美刺鱼！' : '完美提竿！'); } else flashText('中鱼！', '#ffffff');
  setState('reeling');
  G.tension = 0.45; G.progress = perfect ? 0.15 : 0; G.slackT = 0; G.overT = 0; G.evt = null; G.evtT = rand(0.8, 1.8);
  G.holding = true;
  followShadow.visible = false;
  spawnSplash(tackle.position, 25, 0.8);
  if (G.fish.sp.predator) {
    const m = buildFish(G.fish.sp); const L = clamp(0.42 * Math.cbrt(G.fish.weight), 0.15, 2.4);
    m.scale.setScalar(L); m.visible = false; scene.add(m); G.jumpModel = m;
  }
  if (navigator.vibrate) navigator.vibrate(40);
}
function landFish() {
  const { sp, weight } = G.fish;
  const info = S.recordCatch(sp, weight, { mode: G.mode, perfect: G.perfect });
  G.catchInfo = info;
  if (G.jumpModel) { scene.remove(G.jumpModel); G.jumpModel.userData.dispose(); G.jumpModel = null; }
  spawnSplash(tackle.position, 60, 1.3); spawnRipple(tackle.position, 1.5);
  const m = buildFish(sp);
  const hero = !!m.userData.isHeroCarp;
  m.scale.setScalar(sp.id === 'sturgeon' || sp.id === 'gancyu' ? 0.72 : (hero ? 0.62 : 0.5));
  m.position.set(0, innerWidth < innerHeight ? 0.14 : 0.08, hero ? -0.95 : -1.05);
  m.rotation.y = hero ? -0.55 : 0;
  m.userData.uniforms.uAmp.value = hero ? 0.055 : 0.08;
  m.userData.uniforms.uSpeed.value = hero ? 5.8 : 7.5;
  if (m.userData.uniforms.uFin) m.userData.uniforms.uFin.value = 1;
  camera.add(m); G.catchModel = m;
  // 英雄鱼：补一盏近距轮廓光，突出鳞片湿润高光
  if (hero) {
    if (G.catchLight) { camera.remove(G.catchLight); G.catchLight.dispose?.(); }
    const rim = new THREE.PointLight(0xffe0b0, 1.6, 3.5, 1.5);
    rim.position.set(-0.35, 0.35, -0.4);
    const fill = new THREE.PointLight(0xa0c8ff, 0.55, 3.5, 1.5);
    fill.position.set(0.5, -0.1, -0.6);
    const wrap = new THREE.Group(); wrap.add(rim, fill); camera.add(wrap);
    G.catchLight = wrap;
  }
  const R = RARITY[sp.rarity], c = ui.card;
  c.style.setProperty('--rc', R.color);
  c.querySelector('.c-rar').textContent = R.name;
  c.querySelector('.c-name').textContent = sp.name;
  c.querySelector('.c-weight').textContent = weight >= 10 ? `${weight.toFixed(1)} kg` : `${weight.toFixed(2)} kg`;
  c.querySelector('.c-value').textContent = `估价 ${info.value} 金币`;
  c.querySelector('.c-bonus').textContent = `渔获奖励 +${info.bonus} 金币 · +${info.xp} 经验${G.perfect ? '（完美加成）' : ''}`;
  c.querySelector('.c-desc').textContent = sp.desc;
  c.querySelector('.c-tag').textContent = info.isNew ? '★ 新鱼种！已收入图鉴' : info.isRecord ? '▲ 刷新最重纪录！' : `第 ${save.collection[sp.id].count} 次捕获`;
  const full = S.netFull();
  $('cardKeep').disabled = full;
  $('cardKeep').textContent = full ? '鱼护已满' : `放入鱼护 (${save.net.length}/${S.netCap()})`;
  $('cardSell').innerHTML = `直接出售 <b>+${info.value}</b>`;
  c.classList.add('show');
  if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
  UI.refreshHud();
  setState('caught');
}
function closeCard(action) {
  const info = G.catchInfo; if (!info) return;
  if (action === 'keep' && !S.keepFish(info.fish)) action = 'sell';
  if (action === 'keep') UI.toast(`${speciesById[info.fish.id].name} 已放入鱼护`);
  if (action === 'sell') { S.sellCoins(info.value); UI.toast(`出售 +${info.value} 金币`); }
  if (action === 'release') { S.addXp(3); S.persist(); UI.toast('放生了，功德 +1（经验 +3）'); }
  ui.card.classList.remove('show');
  if (G.catchModel) { camera.remove(G.catchModel); G.catchModel.userData.dispose(); G.catchModel = null; }
  if (G.catchLight) { camera.remove(G.catchLight); G.catchLight = null; }
  G.fish = null; G.catchInfo = null;
  UI.refreshHud();
  setState('idle');
}

// 露亚：抽竿
function twitch() {
  const now = performance.now();
  G.twitches = G.twitches.filter(t => now - t < 2000); G.twitches.push(now);
  const toCam = new THREE.Vector3().subVectors(CAM_POS, G.lp).setY(0).normalize();
  G.lp.addScaledVector(toCam, 0.5);
  G.speed = Math.min(1, G.speed + 0.25);
  spawnRipple(G.lp, 0.4, 0.8);
  if (S.lure().shape === 'popper' || S.lure().shape === 'frog') spawnSplash(G.lp, 8, 0.4);
  if (G.twitches.length > 5) { G.attract = Math.max(0, G.attract - 0.35); UI.toast('抽得太猛，鱼被吓到了'); G.twitches = []; }
  else G.attract = Math.min(1, G.attract + 0.08 * S.lure().twitch);
  rod.pitch += 0.12;
}

// ---------------- 输入 ----------------
let pointerX = null, started = false;
function onPress() {
  if (!started || UI.isOpen()) return;
  G.pressT = performance.now();
  switch (G.state) {
    case 'idle': G.power = 0; G.powerDir = 1; setState('charging'); break;
    case 'waiting': startReturn(G.dip > 0.12 ? '提早了！鱼只是在试口，被吓跑了' : '还没有鱼咬钩，鱼被惊走了'); break;
    case 'bite': hookFish(G.t <= G.perfectWin); break;
    case 'strike': hookFish(G.t <= G.perfectWin); break;
    case 'lure': G.holding = true; break;
    case 'reeling': G.holding = true; break;
  }
}
function onRelease() {
  if (G.state === 'charging') startCast();
  else if (G.state === 'reeling') G.holding = false;
  else if (G.state === 'lure') { G.holding = false; if (performance.now() - G.pressT < 180) twitch(); }
}
canvas.addEventListener('pointerdown', e => { pointerX = e.clientX; onPress(); });
ui.action.addEventListener('pointerdown', e => { e.stopPropagation(); pointerX = e.clientX; onPress(); });
addEventListener('pointerup', () => { pointerX = null; onRelease(); });
addEventListener('pointercancel', () => { pointerX = null; onRelease(); });
addEventListener('pointermove', e => {
  if (pointerX !== null && G.state === 'charging') { G.aim = clamp(G.aim - (e.clientX - pointerX) * 0.004, -0.6, 0.6); pointerX = e.clientX; }
});
const keys = {};
addEventListener('keydown', e => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'Escape' && UI.isOpen()) UI.close();
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (G.state === 'caught') closeCard(S.netFull() ? 'sell' : 'keep'); else onPress();
  }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space' || e.code === 'Enter') onRelease(); });
addEventListener('contextmenu', e => e.preventDefault());
$('cardKeep').addEventListener('click', () => closeCard('keep'));
$('cardSell').addEventListener('click', () => closeCard('sell'));
$('cardRelease').addEventListener('click', () => closeCard('release'));
for (const [btn, name] of [['netBtn', 'net'], ['shopBtn', 'shop'], ['questBtn', 'quest'], ['equipBtn', 'equip'], ['dexBtn', 'dex']])
  $(btn).addEventListener('click', () => UI.open(name));
$('modeBtn').addEventListener('click', () => {
  if (G.state !== 'idle') { UI.toast('请先完成当前这一竿'); return; }
  const target = save.equip.mode === 'lure' ? 'float' : 'lure';
  if (!S.setMode(target)) UI.toast('还没有露亚竿：完成主线「初次垂钓」或去商店购买');
  else { UI.toast(target === 'lure' ? `切换为露亚：${S.rod().name} + ${S.lure().name}` : `切换为台钓：${S.rod().name}`); setState('idle'); }
});
const qBtn = $('qualityBtn');
qBtn.textContent = `画质：${quality === 'high' ? '高' : '低'}`;
qBtn.addEventListener('click', () => { localStorage.setItem('fishing3d_quality', quality === 'high' ? 'low' : 'high'); location.reload(); });

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 68 : 55;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  rodRig.position.x = camera.aspect < 1 ? 0.26 : 0.42;
  G.pitch = camera.aspect < 1 ? -0.15 : -0.1;
}
addEventListener('resize', onResize); onResize();

// ---------------- 搏鱼 ----------------
function updateFight(dt, time, f) {
  const sp = G.fish.sp, wf = G.fish.wf, rodDef = S.rod(), lineMax = S.line().max;
  const lureMode = G.mode === 'lure';
  const strength = (0.16 + sp.diff * 0.075 + wf * 0.1) * (lureMode ? 1.12 : 1) / Math.pow(rodDef.strength, 0.7);
  // 事件：挣扎 surge / 甩头 shake / 冲刺 run / 跃水 jump
  if (G.evt) { G.evt.t += dt; if (G.evt.t >= G.evt.dur) { if (G.evt.type === 'jump' && G.jumpModel) G.jumpModel.visible = false; G.evt = null; G.evtT = rand(1.0, 2.8) / (0.7 + sp.diff * 0.12) / (lureMode ? 1.25 : 1); } }
  else {
    G.evtT -= dt;
    if (G.evtT <= 0) {
      const opts = [['surge', 1], ['shake', lureMode || sp.predator ? 1.3 : 0.25], ['run', sp.diff >= 2.4 || wf > 0.5 ? 0.7 : 0.15], ['jump', sp.predator && G.jumpModel ? (lureMode ? 0.7 : 0.35) : 0]];
      let r = Math.random() * opts.reduce((a, o) => a + o[1], 0), type = 'surge';
      for (const [k, w] of opts) { r -= w; if (r <= 0) { type = k; break; } }
      const dur = { surge: rand(0.5, 1.0) + sp.diff * 0.12, shake: 0.8, run: rand(1.3, 2.2), jump: 1.0 }[type];
      G.evt = { type, t: 0, dur, slack: 0 };
      G.shake = type === 'shake' ? 1.4 : 1;
      spawnSplash(tackle.position, type === 'jump' ? 40 : 18, type === 'jump' ? 1.2 : 0.8);
      if (type === 'jump' && G.jumpModel) { G.jumpModel.visible = true; G.jumpFrom = tackle.position.clone(); }
    }
  }
  const e = G.evt?.type;
  let pull = strength * 0.55 + Math.sin(time * 3) * 0.04;
  if (e === 'surge') pull = strength * 2.1;
  if (e === 'shake') pull = strength * 0.7 + 0.6 * Math.max(0, Math.sin(G.evt.t * 24));
  if (e === 'run') pull = strength * 1.8;
  if (e === 'jump') pull = strength * 0.3;
  const target = G.holding ? 0.33 + pull : pull * 0.45;
  G.tension = clamp(G.tension + (target - G.tension) * (1 - Math.exp(-dt * (e === 'shake' ? 6 : 2.6))), 0, 1.6);
  const eff = G.tension / lineMax;
  if (G.holding && e !== 'run') G.progress += dt * (0.17 / (0.6 + sp.diff * 0.25 + wf * 0.4)) * (0.85 + 0.15 * rodDef.strength) * (eff > 0.85 ? 0.5 : 1);
  else G.progress -= dt * (e === 'run' ? 0.07 : e === 'surge' ? 0.06 : 0.015);
  G.progress = clamp(G.progress, 0, 1);
  if (eff > 0.96) G.overT += dt; else G.overT = Math.max(0, G.overT - dt * 2);
  if (eff < 0.15) G.slackT += dt; else G.slackT = Math.max(0, G.slackT - dt);
  if (e === 'jump' && eff < 0.22) G.evt.slack += dt;

  ui.tension.style.width = `${clamp(eff, 0, 1) * 100}%`;
  ui.tension.className = eff > 0.85 ? 'danger' : eff < 0.2 ? 'slack' : 'safe';
  ui.progress.style.width = `${G.progress * 100}%`;
  ui.reelMsg.textContent = eff > 0.85 ? '张力过高！快松手！'
    : e === 'shake' ? '鱼在甩头！稳住，别硬拉！' : e === 'run' ? '鱼在冲刺！松线卸力！' : e === 'jump' ? '鱼跃出水面！保持张力别松线！'
    : G.slackT > 0.8 ? '线太松了，快收线！' : e === 'surge' ? '鱼在拼命挣扎！' : '保持张力在绿色区域';
  rod.bend = lerp(rod.bend, 0.2 + eff * 1.6, dt * 8); rod.pitch = lerp(rod.pitch, ROD_REST + 0.25 + eff * 0.15, dt * 5); updateRod();
  if (reelHandle && G.holding) reelHandle.children[3] && (reelHandle.children[3].rotation.x += dt * 25);
  const end = new THREE.Vector3(CAM_POS.x + f.x * 3.5, 0, CAM_POS.z + f.z * 3.5);
  const wild = e === 'surge' || e === 'run' || e === 'shake';
  const lat = new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(Math.sin(time * (wild ? 3.5 : 1.2)) * (wild ? 2.2 : 0.8) * (1 - G.progress * 0.7));
  const tgt = new THREE.Vector3().lerpVectors(G.castTo, end, G.progress).add(lat);
  tackle.position.x = lerp(tackle.position.x, tgt.x, dt * 3); tackle.position.z = lerp(tackle.position.z, tgt.z, dt * 3);
  tackle.position.y = -0.12 - (wild ? 0.08 : 0);
  if (Math.random() < dt * (wild ? 10 : 3)) spawnRipple(tackle.position, 0.7, 0.9);
  if (wild && Math.random() < dt * 8) spawnSplash(tackle.position, 6, 0.6);
  // 跃水动画
  if (e === 'jump' && G.jumpModel) {
    const k = G.evt.t / G.evt.dur, m = G.jumpModel, L = m.scale.x;
    // 真实跃水：抛物线升高 + 入水前鼻尖下压，身体S形扭动
    const height = Math.sin(k * Math.PI) * (0.55 + L * 1.1);
    const forwardJump = Math.sin(k * Math.PI) * 0.35;
    const dir = f.clone().normalize();
    m.position.set(
      tackle.position.x + dir.x * forwardJump,
      height - 0.05,
      tackle.position.z + dir.z * forwardJump
    );
    // pitch：出水抬头 → 顶点水平 → 入水扎头
    const pitch = (0.5 - k) * 2.6;
    const yaw = Math.atan2(dir.x, dir.z) + Math.PI / 2 + Math.sin(k * Math.PI * 2) * 0.25;
    const roll = Math.sin(k * Math.PI * 3) * 0.45;
    m.rotation.set(pitch, yaw, roll);
    const u = m.userData.uniforms;
    u.uTime.value += dt;
    u.uAmp.value = 0.18;
    u.uSpeed.value = 18;
    u.uLeap.value = Math.sin(k * Math.PI); // 弓背
    if (k > 0.08 && k < 0.2 && !G.evt.splashOut) { G.evt.splashOut = true; spawnSplash(tackle.position, 50, 1.4); spawnRipple(tackle.position, 1.6); }
    if (k > 0.88 && !G.evt.splashed) { G.evt.splashed = true; spawnSplash(m.position, 55, 1.5); spawnRipple(m.position, 1.8); u.uLeap.value = 0; }
  }
  if (G.overT > 0.35) { G.shake = 1.5; if (navigator.vibrate) navigator.vibrate(120); startReturn('线断了！张力过大（升级鱼线可提高上限）'); return 0; }
  if (e === 'jump' && G.evt.slack > 0.35) { startReturn('鱼跃水甩钩了！跃水时要保持张力'); return 0; }
  if (G.slackT > 2.6) { startReturn('鱼脱钩了！线太松了'); return 0; }
  if (G.progress >= 1) { landFish(); return 0; }
  return Math.max(0, 0.3 - eff * 0.32);
}

// ---------------- 主循环 ----------------
const clock = new THREE.Clock();
let ambientT = rand(3, 8), dailyCheckT = 0;
const tmpV = new THREE.Vector3();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
  G.t += dt;
  world.update(dt, time);
  const s = G.state, f = forward();
  if (keys.KeyA || keys.ArrowLeft) G.aim = clamp(G.aim + dt * 0.6, -0.6, 0.6);
  if (keys.KeyD || keys.ArrowRight) G.aim = clamp(G.aim - dt * 0.6, -0.6, 0.6);

  G.shake = Math.max(0, G.shake - dt * 2);
  camera.position.set(CAM_POS.x + Math.sin(time * 0.7) * 0.01, CAM_POS.y + Math.sin(time * 1.3) * 0.012, CAM_POS.z);
  camera.rotation.y = G.aim + (Math.random() - 0.5) * G.shake * 0.01;
  camera.rotation.x = G.pitch + (Math.random() - 0.5) * G.shake * 0.01;

  let sag = 0.15;
  const tackleScale = clamp(tackle.position.distanceTo(CAM_POS) / 7, 1, 6) * (G.mode === 'lure' && s !== 'idle' && s !== 'charging' ? 1.4 : 1);
  const waveY = Math.sin(time * 2.1 + tackle.position.x) * 0.015 + Math.sin(time * 3.3 + tackle.position.z) * 0.01;

  if (s === 'idle' || s === 'charging') {
    if (s === 'charging') {
      G.power += G.powerDir * dt * 0.85;
      if (G.power >= 1) { G.power = 1; G.powerDir = -1; } else if (G.power <= 0) { G.power = 0; G.powerDir = 1; }
      ui.powerFill.style.width = `${G.power * 100}%`;
      rod.pitch = lerp(rod.pitch, ROD_REST + 0.85 * G.power + 0.15, 1 - Math.exp(-dt * 10));
    } else rod.pitch = lerp(rod.pitch, ROD_REST, 1 - Math.exp(-dt * 6));
    rod.bend = lerp(rod.bend, 0.08, dt * 5); updateRod();
    hangPos(tackle.position); tackle.position.x += Math.sin(time * 1.7) * 0.03; tackle.position.z += Math.cos(time * 1.3) * 0.03;
    tackle.scale.setScalar(1); tackle.rotation.set(Math.sin(time * 1.7) * 0.1, G.aim, 0);
    sag = 0;
  } else if (s === 'casting') {
    const k = clamp(G.t / G.castDur, 0, 1);
    rod.pitch = lerp(rod.pitch, ROD_REST - 0.35, 1 - Math.exp(-dt * 14)); rod.bend = lerp(rod.bend, 0.35, dt * 8); updateRod();
    const apex = 3 + G.castFrom.distanceTo(G.castTo) * 0.22;
    tackle.position.lerpVectors(G.castFrom, G.castTo, k);
    tackle.position.y = lerp(G.castFrom.y, 0, k) + Math.sin(k * Math.PI) * apex;
    tackle.rotation.x += dt * 8; tackle.scale.setScalar(tackleScale);
    sag = 0.02;
    if (k >= 1) {
      tackle.rotation.set(0, Math.atan2(f.x, f.z) + Math.PI / 2, 0);
      spawnSplash(G.castTo, 30, 0.9); spawnRipple(G.castTo, 1.2);
      if (G.mode === 'float') {
        G.waitT = rand(3, 8) * BAITS[G.baitUsed || 'none'].wait; G.nibbleT = rand(0.8, 2); G.nibbling = 0; G.dip = 0;
        setState('waiting');
      } else {
        G.lp.copy(G.castTo); G.speed = 0; G.attract = 0.05; G.twitches = []; G.follower = null; G.holding = false;
        const L = S.lure();
        ui.speedZone.style.left = `${(L.pref - L.zone) * 100}%`; ui.speedZone.style.width = `${L.zone * 200}%`;
        setState('lure');
      }
    }
  } else if (s === 'waiting' || s === 'bite') {
    rod.pitch = lerp(rod.pitch, ROD_REST, dt * 4); rod.bend = lerp(rod.bend, 0.1, dt * 3); updateRod();
    if (s === 'waiting') {
      G.dip = Math.max(0, G.dip - dt * 2.5);
      G.nibbleT -= dt;
      const remain = G.waitT - G.t;
      if (G.nibbleT <= 0) {
        G.dip = rand(0.18, 0.32); G.nibbling = 3; G.nibbleT = rand(0.6, 1.6) * (remain < 2 ? 0.6 : 1.3);
        spawnRipple(tackle.position, 0.45, 0.9); ui.hint.textContent = HINT.waiting();
      }
      G.nibbling = Math.max(0, G.nibbling - dt);
      if (G.t >= G.waitT) {
        G.fish = S.pickFish('float', G.castPower);
        const sens = S.rod().sens;
        G.perfectWin = 0.32 * sens;
        G.biteWindow = G.perfectWin + (1.15 - G.fish.sp.diff * 0.06) * sens;
        spawnSplash(tackle.position, 14, 0.5); spawnRipple(tackle.position, 1.1, 1.2);
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
        setState('bite');
      }
    } else {
      G.dip = lerp(G.dip, 1.25, dt * 14);   // 黑漂：整个浮漂被拖入水中
      if (G.t > G.perfectWin && !ui.bite.classList.contains('show')) { ui.bite.textContent = '鱼上钩了！点击收竿'; ui.bite.classList.add('show'); }
      if (Math.random() < dt * 4) spawnRipple(tackle.position, 0.8, 1);
      if (G.t > G.biteWindow) startReturn('鱼跑了… 反应慢了一点');
    }
    tackle.position.set(G.castTo.x, waveY - G.dip * 0.16, G.castTo.z);
    tackle.scale.setScalar(tackleScale);
    sag = 0.35;
  } else if (s === 'lure' || s === 'strike') {
    const L = S.lure();
    if (s === 'lure') {
      G.speed = clamp(G.speed + ((G.holding ? 1 : 0) - G.speed) * (1 - Math.exp(-dt * 2.2)), 0, 1);
      const toCam = tmpV.subVectors(CAM_POS, G.lp).setY(0); const dist = toCam.length(); toCam.normalize();
      G.lp.addScaledVector(toCam, G.speed * 2.4 * dt);
      const inZone = Math.abs(G.speed - L.pref) < L.zone;
      G.attract = clamp(G.attract + dt * (inZone ? 0.3 : -0.18) * (inZone ? S.rod().sens : 1), 0, 1);
      ui.speedFill.style.width = `${G.speed * 100}%`;
      ui.speedFill.className = inZone ? 'good' : '';
      ui.attrFill.style.width = `${G.attract * 100}%`;
      // 鱼追饵
      if (!G.follower && G.attract > 0.35) {
        G.follower = { fish: S.pickFish('lure', G.castPower), off: 2.5 };
        followShadow.visible = true; UI.toast('有鱼在追饵！保持节奏', 1400);
      }
      if (G.follower) {
        const fl = G.follower; fl.off = lerp(fl.off, 0.9, dt * 0.8);
        const back = tmpV.subVectors(G.lp, CAM_POS).setY(0).normalize();
        followShadow.position.set(G.lp.x + back.x * fl.off + Math.sin(time * 6) * 0.08, 0.02, G.lp.z + back.z * fl.off);
        followShadow.rotation.z = -Math.atan2(back.z, back.x);
        const len = clamp(0.42 * Math.cbrt(fl.fish.weight), 0.2, 2.2) * 1.3 * clamp(dist / 15, 1, 3.5);
        followShadow.scale.set(len, len * 0.32, 1);
        followShadow.material.opacity = 0.35 + G.attract * 0.3;
        if (Math.random() < dt * 2) spawnRipple(followShadow.position, 0.35, 0.8);
        ui.lureMsg.textContent = `有鱼在追！诱鱼值越高越容易攻击`;
        if (G.attract < 0.12) { G.follower = null; followShadow.visible = false; UI.toast('鱼失去兴趣游走了', 1400); }
        else if (Math.random() < dt * G.attract * G.attract * 1.6) {
          G.fish = G.follower.fish; G.follower = null; followShadow.visible = false;
          const sens = S.rod().sens;
          G.perfectWin = 0.3 * sens; G.biteWindow = G.perfectWin + (0.75 - G.fish.sp.diff * 0.04) * sens;
          spawnSplash(G.lp, 45, 1.2); spawnRipple(G.lp, 1.4, 1.2);
          ui.bite.textContent = '咬饵了！点击刺鱼！'; ui.bite.classList.add('show');
          if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
          setState('strike');
        }
      } else ui.lureMsg.textContent = inZone ? '速度合适，鱼正在被吸引…' : G.speed > L.pref ? '收得太快了' : '收得太慢了';
      if (s === 'lure' && G.state === 'lure') {
        G.wakeT -= dt; if (G.speed > 0.2 && G.wakeT <= 0) { G.wakeT = 0.25; spawnRipple(G.lp, 0.25 + G.speed * 0.3, 0.8); }
        if (dist < 4.5) startReturn(G.follower ? '鱼跟到脚下没有攻击… 再试一次' : '没有鱼咬饵，换个节奏再试试');
      }
      rod.pitch = lerp(rod.pitch, ROD_REST + 0.1, dt * 5); rod.bend = lerp(rod.bend, 0.12 + G.speed * 0.25, dt * 5); updateRod();
      if (reelHandle && G.holding && reelHandle.children[3]) reelHandle.children[3].rotation.x += dt * 20;
    } else {
      if (Math.random() < dt * 6) spawnRipple(G.lp, 0.8, 0.8);
      if (G.t > G.biteWindow) startReturn('鱼吐饵了… 刺鱼要快！');
    }
    const surface = L.shape === 'popper' || L.shape === 'frog';
    tackle.position.set(G.lp.x, surface ? 0.0 + waveY * 0.5 : -0.02 + waveY * 0.3, G.lp.z);
    tackle.rotation.set(0, Math.atan2(f.x, f.z) + Math.PI / 2 + Math.sin(time * 9) * 0.25 * G.speed, 0);
    tackle.scale.setScalar(tackleScale);
    sag = 0.12 * (1 - G.speed);
  } else if (s === 'reeling') {
    tackle.scale.setScalar(tackleScale);
    sag = updateFight(dt, time, f);
  } else if (s === 'returning') {
    G.retrieveT += dt;
    const k = clamp(G.retrieveT / 0.8, 0, 1);
    tackle.position.lerpVectors(G.retrieveFrom, hangPos(tmpV), k);
    tackle.position.y += Math.sin(k * Math.PI) * 2;
    tackle.scale.setScalar(lerp(tackle.scale.x, 1, k));
    rod.pitch = lerp(rod.pitch, ROD_REST + 0.3, dt * 6); rod.bend = lerp(rod.bend, 0.1, dt * 6); updateRod();
    sag = 0.05;
    if (k >= 1) setState('idle');
  } else if (s === 'caught') {
    rod.pitch = lerp(rod.pitch, ROD_REST + 0.35, dt * 4); rod.bend = lerp(rod.bend, 0.4, dt * 4); updateRod();
    if (G.catchModel) {
      const u = G.catchModel.userData.uniforms; u.uTime.value += dt;
      u.uAmp.value = lerp(u.uAmp.value, G.catchModel.userData.isHeroCarp ? 0.04 : 0.045, dt * 0.4);
      u.uSpeed.value = lerp(u.uSpeed.value, G.catchModel.userData.isHeroCarp ? 5.5 : 6.5, dt * 0.5);
      if (u.uFin) u.uFin.value = 1;
      const baseY = G.catchModel.userData.isHeroCarp ? -0.55 : 0;
      G.catchModel.rotation.y = baseY + Math.sin(time * 0.65) * (G.catchModel.userData.isHeroCarp ? 0.35 : 0.55);
      G.catchModel.rotation.x = Math.sin(time * 0.9) * 0.06;
      G.catchModel.rotation.z = Math.sin(time * 1.1) * 0.1;
      const fp = new THREE.Vector3(); G.catchModel.getWorldPosition(fp);
      tackle.position.lerp(fp.add(new THREE.Vector3(0, 0.25, 0)), dt * 6); tackle.scale.setScalar(1);
    }
    sag = 0.02;
  }
  updateLine(sag);
  updateFx(dt);

  // 远距离标记
  const showMark = ['waiting', 'bite', 'reeling', 'lure', 'strike'].includes(G.state) && tackle.position.distanceTo(CAM_POS) > 10;
  if (showMark) {
    const v = tackle.position.clone(); v.y += 0.35 * tackle.scale.y; v.project(camera);
    ui.mark.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px)`;
  }
  ui.mark.classList.toggle('show', showMark);
  ui.mark.classList.toggle('alert', G.state === 'bite' || G.state === 'strike');

  ambientT -= dt;
  if (ambientT <= 0) {
    ambientT = rand(4, 10);
    const a = rand(-0.8, 0.8) + G.aim, d = rand(15, 70);
    const p = new THREE.Vector3(CAM_POS.x - Math.sin(a) * d, 0, CAM_POS.z - Math.cos(a) * d);
    spawnRipple(p, 1.3, 2.2); spawnSplash(p, 12, 0.6);
  }
  dailyCheckT -= dt;
  if (dailyCheckT <= 0) { dailyCheckT = 30; if (S.ensureDaily()) { UI.toast('新的一天，每日任务已刷新！'); UI.refreshHud(); } }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// ---------------- 启动 ----------------
applyGear();
UI.refreshHud();
setState('idle');
requestAnimationFrame(tick);
setTimeout(() => {
  try { thumbs = makeThumbnails(); } catch (e) { console.warn('缩略图生成失败', e); }
  document.body.classList.add('ready');
  const sb = $('startBtn'); sb.disabled = false; sb.textContent = save.catches ? '继续钓鱼' : '开始钓鱼';
}, 50);
$('startBtn').addEventListener('click', () => {
  started = true; $('start').classList.add('hide');
  if (migrated) UI.toast('已从旧版本迁移存档，欢迎回来！', 2600);
  else if (!save.catches) UI.toast('新手提示：先用台钓钓 3 条鱼，完成主线可获得露亚竿', 3200);
});
// 调试 / 自动化测试接口
window.__game = { G, save, S, UI, startCast, onPress, onRelease, hookFish, landFish, setState, closeCard, twitch, speciesById, buildFish, SPECIES };
