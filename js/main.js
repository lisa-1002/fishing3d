// 静湖垂钓 3D —— 主程序：渲染、输入、钓鱼状态机、HUD
import * as THREE from 'three';
import { createWorld, DECK_Y, DOCK_END_Z } from './world.js';
import { SPECIES, RARITY, speciesById, buildFish, makeThumbnails } from './fish.js';
import { clamp, lerp, rand } from './util.js';

// ---------------- 画质 ----------------
const isMobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
let quality = localStorage.getItem('fishing3d_quality') || (isMobile ? 'low' : 'high');
const Q = quality === 'high'
  ? { pr: Math.min(devicePixelRatio, 2), shadow: 2048, waterRes: 1024, terrainSeg: 256, trees: 1400, reeds: 2200, aa: true }
  : { pr: Math.min(devicePixelRatio, 1.25), shadow: 1024, waterRes: 256, terrainSeg: 128, trees: 450, reeds: 700, aa: false };

// ---------------- 存档 ----------------
const SAVE_KEY = 'fishing3d_save_v1';
const save = Object.assign({ coins: 0, catches: 0, collection: {} }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'));
const persist = () => localStorage.setItem(SAVE_KEY, JSON.stringify(save));

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

// ---------------- 鱼竿（分段可弯曲） ----------------
const rodRig = new THREE.Group();
rodRig.position.set(0.42, -0.5, -0.5);
camera.add(rodRig);
const rodBase = new THREE.Group();
rodRig.add(rodBase);
const ROD_SEG = 14, ROD_LEN = 2.7;
const carbon = new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.28, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
const segs = [];
{
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.019, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0xb48f62, roughness: 0.95 }));
  cork.position.y = -0.2; rodBase.add(cork);
  const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }));
  butt.position.y = -0.47; rodBase.add(butt);
  // 纺车轮
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.25, clearcoat: 0.5 });
  const reel = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.08, 8), metal); stem.rotation.x = Math.PI / 2; stem.position.z = -0.04; reel.add(stem);
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 24), metal); spool.position.set(0, 0.02, -0.1); reel.add(spool);
  const lineOnSpool = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.035, 24), new THREE.MeshStandardMaterial({ color: 0xe8e8e0, roughness: 0.6 })); lineOnSpool.position.set(0, 0.03, -0.1); reel.add(lineOnSpool);
  const housing = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0x1f2a3a, metalness: 0.6, roughness: 0.3, clearcoat: 1 }));
  housing.scale.set(0.9, 0.9, 1.1); housing.position.set(0, -0.03, -0.1); reel.add(housing);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6), metal); handle.rotation.z = Math.PI / 2; handle.position.set(0.05, -0.03, -0.1); reel.add(handle);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.025, 10), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 })); knob.position.set(0.095, -0.03, -0.085); knob.rotation.x = Math.PI / 2; reel.add(knob);
  reel.position.y = 0.12; rodBase.add(reel);
  rodBase.userData.reelHandle = handle;

  let parent = rodBase;
  const segLen = ROD_LEN / ROD_SEG;
  for (let i = 0; i < ROD_SEG; i++) {
    const r0 = lerp(0.016, 0.0035, i / ROD_SEG), r1 = lerp(0.016, 0.0035, (i + 1) / ROD_SEG);
    const g = new THREE.Group(); g.position.y = i === 0 ? 0.05 : segLen;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, segLen, 10), carbon); m.position.y = segLen / 2; g.add(m);
    if (i % 3 === 1) { // 导环
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012 + r0, 0.0025, 6, 14), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 }));
      ring.rotation.x = Math.PI / 2; ring.position.set(0, segLen * 0.5, -0.02 - r0); g.add(ring);
    }
    parent.add(g); segs.push(g); parent = g;
  }
  const tip = new THREE.Object3D(); tip.position.y = segLen; parent.add(tip);
  rodBase.userData.tip = tip;
}
const rodTip = rodBase.userData.tip;
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
  const g = new THREE.LatheGeometry(pts, 24);
  const red = new THREE.MeshPhysicalMaterial({ color: 0xff2a10, roughness: 0.25, clearcoat: 1, emissive: 0x330000 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf8f8f8, roughness: 0.25, clearcoat: 1 });
  const top = new THREE.Mesh(g, red);
  const bottom = new THREE.Mesh(g, white); bottom.scale.set(1.001, 1, 1.001);
  // 用裁剪平面分色太复杂，改为上下两半
  top.geometry = new THREE.LatheGeometry(pts.slice(8), 24);
  bottom.geometry = new THREE.LatheGeometry(pts.slice(0, 9), 24);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.14, 8), new THREE.MeshPhysicalMaterial({ color: 0xffd400, emissive: 0x554400, roughness: 0.3 }));
  antenna.position.y = 0.13;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), red); cap.position.y = 0.2;
  bobber.add(top, bottom, antenna, cap);
  bobber.traverse(o => { if (o.isMesh) o.castShadow = true; });
}
scene.add(bobber);

// ---------------- 鱼线 ----------------
const LINE_PTS = 40;
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_PTS * 3), 3));
const fishLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xf2f2ea, transparent: true, opacity: 0.75 }));
fishLine.frustumCulled = false;
scene.add(fishLine);
const _tip = new THREE.Vector3();
function updateLine(sag) {
  rodTip.getWorldPosition(_tip);
  const p = lineGeo.attributes.position, b = bobber.position;
  const top = new THREE.Vector3(b.x, b.y + 0.2 * bobber.scale.y, b.z);
  for (let i = 0; i < LINE_PTS; i++) {
    const t = i / (LINE_PTS - 1);
    p.setXYZ(i, lerp(_tip.x, top.x, t), lerp(_tip.y, top.y, t) - Math.sin(t * Math.PI) * sag, lerp(_tip.z, top.z, t));
  }
  p.needsUpdate = true;
}

// ---------------- 水花 & 涟漪 ----------------
const ripples = [];
{
  const rg = new THREE.RingGeometry(0.85, 1, 48); rg.rotateX(-Math.PI / 2);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: true }));
    m.visible = false; scene.add(m); ripples.push({ m, life: 0, max: 1, size: 1 });
  }
}
function spawnRipple(pos, size = 1, life = 1.6) {
  const r = ripples.find(r => r.life <= 0) || ripples[0];
  r.m.position.set(pos.x, 0.03, pos.z); r.life = r.max = life; r.size = size; r.m.visible = true;
}
const SPLASH_N = 160;
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
const ui = {
  coins: $('coins'), catches: $('catches'), hint: $('hint'), power: $('powerWrap'), powerFill: $('powerFill'),
  reel: $('reelWrap'), tension: $('tensionFill'), tensionMark: $('tensionMark'), progress: $('progressFill'), reelMsg: $('reelMsg'),
  bite: $('bitePrompt'), toast: $('toast'), card: $('card'), action: $('actionBtn'), dex: $('dex'), mark: $('bobMark'), dexGrid: $('dexGrid'), dexCount: $('dexCount'),
};
let thumbs = {};
function refreshHud() { ui.coins.textContent = save.coins; ui.catches.textContent = save.catches; }
let toastTimer = 0;
function toast(msg, ms = 1800) { ui.toast.textContent = msg; ui.toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove('show'), ms); }
function renderDex() {
  const caught = SPECIES.filter(s => save.collection[s.id]).length;
  ui.dexCount.textContent = `已收集 ${caught} / ${SPECIES.length}`;
  ui.dexGrid.innerHTML = SPECIES.map(s => {
    const c = save.collection[s.id], R = RARITY[s.rarity];
    return `<div class="dex-item ${c ? '' : 'locked'}" style="--rc:${R.color}">
      <img src="${thumbs[s.id] || ''}" alt="">
      <div class="dex-name">${c ? s.name : '？？？'}</div>
      <div class="dex-rar" style="color:${R.color}">${R.name}</div>
      <div class="dex-info">${c ? `捕获 ${c.count} 次 · 最重 ${c.maxW.toFixed(2)}kg` : '尚未钓到'}</div>
    </div>`;
  }).join('');
}

// ---------------- 状态机 ----------------
const G = {
  state: 'idle', t: 0, power: 0, powerDir: 1, aim: 0, holding: false,
  castFrom: new THREE.Vector3(), castTo: new THREE.Vector3(), castT: 0, castDur: 1,
  waitT: 0, biteT: 0, nibbleT: 0, dip: 0,
  fish: null, weight: 0, tension: 0.4, progress: 0, slackT: 0, overT: 0, surge: 0, nextSurge: 2, retrieveFrom: new THREE.Vector3(), retrieveT: 0,
  shake: 0, catchModel: null, pitch: -0.1,
};
const HINTS = {
  idle: isMobile ? '按住屏幕蓄力，左右拖动瞄准，松开抛竿' : '按住鼠标 / 空格蓄力，拖动或 A/D 瞄准，松开抛竿',
  charging: '松开抛竿！',
  casting: '',
  waiting: '耐心等待… 浮漂下沉时再收竿',
  bite: '',
  reeling: isMobile ? '按住收线，张力过高就松手' : '按住鼠标 / 空格收线，张力过高就松开',
  caught: '', retrieve: '',
};
const ACTION_LABEL = { idle: '按住抛竿', charging: '松开抛竿', casting: '…', waiting: '收竿', bite: '收竿！', reeling: '按住收线', caught: '…', retrieve: '…' };
function setState(s) {
  G.state = s; G.t = 0;
  ui.hint.textContent = HINTS[s] || '';
  ui.power.classList.toggle('show', s === 'charging');
  ui.reel.classList.toggle('show', s === 'reeling');
  ui.bite.classList.toggle('show', s === 'bite');
  ui.action.textContent = ACTION_LABEL[s];
  ui.action.classList.toggle('urgent', s === 'bite');
  ui.action.classList.toggle('hidden', s === 'caught');
}

function forward() { return new THREE.Vector3(-Math.sin(G.aim), 0, -Math.cos(G.aim)); }

function pickFish(power) {
  const w = { common: RARITY.common.weight * (1.15 - power * 0.45), rare: RARITY.rare.weight * (1 + power * 0.3), epic: RARITY.epic.weight * (1 + power * 0.9), legend: RARITY.legend.weight * (1 + power * 1.6) };
  let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0), rar = 'common';
  for (const k in w) { r -= w[k]; if (r <= 0) { rar = k; break; } }
  const pool = SPECIES.filter(s => s.rarity === rar);
  const sp = pool[(Math.random() * pool.length) | 0];
  const wf = Math.pow(Math.random(), 2.2);
  return { sp, weight: sp.w[0] + (sp.w[1] - sp.w[0]) * wf, wf };
}

function startCast() {
  const p = G.power;
  const dist = 8 + p * 47;
  rodTip.getWorldPosition(G.castFrom);
  const f = forward();
  G.castTo.set(CAM_POS.x + f.x * dist + rand(-1, 1), 0, CAM_POS.z + f.z * dist + rand(-1, 1));
  G.castDur = 0.7 + dist * 0.018; G.castPower = p;
  setState('casting');
}
function startRetrieve(msg) {
  if (msg) toast(msg);
  G.retrieveFrom.copy(bobber.position); G.retrieveT = 0;
  setState('retrieve');
}
function hookFish() {
  setState('reeling');
  G.tension = 0.45; G.progress = 0; G.slackT = 0; G.overT = 0; G.surge = 0; G.nextSurge = rand(0.8, 2);
  G.holding = true;
  spawnSplash(bobber.position, 25, 0.8);
  if (navigator.vibrate) navigator.vibrate(40);
}
function landFish() {
  const { sp, weight } = G.fish;
  const avg = (sp.w[0] + sp.w[1]) / 2;
  const score = Math.round(sp.score * (0.6 + 0.4 * weight / avg) * (1 + (sp.diff - 1) * 0.1));
  const prev = save.collection[sp.id];
  const isNew = !prev, isRecord = prev && weight > prev.maxW;
  save.collection[sp.id] = { count: (prev?.count || 0) + 1, maxW: Math.max(prev?.maxW || 0, weight) };
  save.coins += score; save.catches += 1; persist(); refreshHud();
  spawnSplash(bobber.position, 60, 1.3); spawnRipple(bobber.position, 1.5);
  // 3D 展示鱼
  const m = buildFish(sp);
  const len = sp.id === 'sturgeon' ? 0.75 : 0.5;
  m.scale.setScalar(len);
  m.position.set(0, innerWidth < innerHeight ? 0.1 : 0.06, -1.05);
  m.userData.uniforms.uAmp.value = 0.12; m.userData.uniforms.uSpeed.value = 11;
  camera.add(m); G.catchModel = m;
  const R = RARITY[sp.rarity];
  ui.card.style.setProperty('--rc', R.color);
  ui.card.querySelector('.c-rar').textContent = R.name;
  ui.card.querySelector('.c-name').textContent = sp.name;
  ui.card.querySelector('.c-weight').textContent = weight >= 10 ? `${weight.toFixed(1)} kg` : `${weight.toFixed(2)} kg`;
  ui.card.querySelector('.c-score').textContent = `+${score} 金币`;
  ui.card.querySelector('.c-desc').textContent = sp.desc;
  ui.card.querySelector('.c-tag').textContent = isNew ? '★ 新鱼种！已收入图鉴' : isRecord ? '▲ 刷新最重纪录！' : `第 ${save.collection[sp.id].count} 次捕获`;
  ui.card.classList.add('show');
  if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
  setState('caught');
}
function closeCard() {
  ui.card.classList.remove('show');
  if (G.catchModel) { camera.remove(G.catchModel); G.catchModel.userData.dispose(); G.catchModel = null; }
  G.fish = null;
  setState('idle');
}

// ---------------- 输入 ----------------
let pointerX = null;
function onPress() {
  if (!started) return;
  switch (G.state) {
    case 'idle': G.power = 0; G.powerDir = 1; setState('charging'); break;
    case 'waiting': startRetrieve('太早了，鱼还没咬钩～'); break;
    case 'bite': hookFish(); break;
    case 'reeling': G.holding = true; break;
  }
}
function onRelease() {
  if (G.state === 'charging') startCast();
  else if (G.state === 'reeling') G.holding = false;
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
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (G.state === 'caught' && ui.card.classList.contains('show')) closeCard(); else onPress();
  }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space' || e.code === 'Enter') onRelease(); });
addEventListener('contextmenu', e => e.preventDefault());
$('cardBtn').addEventListener('click', closeCard);
$('dexBtn').addEventListener('click', () => { renderDex(); ui.dex.classList.add('show'); });
$('dexClose').addEventListener('click', () => ui.dex.classList.remove('show'));
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

// ---------------- 主循环 ----------------
let started = false;
const clock = new THREE.Clock();
let ambientT = rand(3, 8);
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
  G.t += dt;
  world.update(dt, time);
  const s = G.state;
  const f = forward();

  if (keys.KeyA || keys.ArrowLeft) G.aim = clamp(G.aim + dt * 0.6, -0.6, 0.6);
  if (keys.KeyD || keys.ArrowRight) G.aim = clamp(G.aim - dt * 0.6, -0.6, 0.6);

  // 镜头：轻微呼吸 + 抖动
  G.shake = Math.max(0, G.shake - dt * 2);
  camera.position.set(CAM_POS.x + Math.sin(time * 0.7) * 0.01, CAM_POS.y + Math.sin(time * 1.3) * 0.012, CAM_POS.z);
  camera.rotation.y = G.aim + (Math.random() - 0.5) * G.shake * 0.01;
  camera.rotation.x = G.pitch + (Math.random() - 0.5) * G.shake * 0.01;

  let sag = 0.15;
  const bobScale = clamp(bobber.position.distanceTo(CAM_POS) / 7, 1, 6);
  const waveY = Math.sin(time * 2.1 + bobber.position.x) * 0.015 + Math.sin(time * 3.3 + bobber.position.z) * 0.01;

  if (s === 'idle' || s === 'charging') {
    if (s === 'charging') {
      G.power += G.powerDir * dt * 0.85;
      if (G.power >= 1) { G.power = 1; G.powerDir = -1; } else if (G.power <= 0) { G.power = 0; G.powerDir = 1; }
      ui.powerFill.style.width = `${G.power * 100}%`;
      rod.pitch = lerp(rod.pitch, ROD_REST + 0.85 * G.power + 0.15, 1 - Math.exp(-dt * 10));
    } else rod.pitch = lerp(rod.pitch, ROD_REST, 1 - Math.exp(-dt * 6));
    rod.bend = lerp(rod.bend, 0.08, dt * 5);
    updateRod();
    rodTip.getWorldPosition(_tip);
    bobber.position.set(_tip.x + Math.sin(time * 1.7) * 0.03, _tip.y - 0.75, _tip.z + Math.cos(time * 1.3) * 0.03);
    bobber.scale.setScalar(1); bobber.rotation.set(Math.sin(time * 1.7) * 0.1, 0, 0);
    sag = 0;
  } else if (s === 'casting') {
    const k = clamp(G.t / G.castDur, 0, 1);
    rod.pitch = lerp(rod.pitch, ROD_REST - 0.35, 1 - Math.exp(-dt * 14)); rod.bend = lerp(rod.bend, 0.35, dt * 8); updateRod();
    const apex = 3 + G.castFrom.distanceTo(G.castTo) * 0.22;
    bobber.position.lerpVectors(G.castFrom, G.castTo, k);
    bobber.position.y = lerp(G.castFrom.y, 0, k) + Math.sin(k * Math.PI) * apex;
    bobber.rotation.x += dt * 8; bobber.scale.setScalar(bobScale);
    sag = 0.02;
    if (k >= 1) {
      bobber.rotation.set(0, 0, 0);
      spawnSplash(G.castTo, 30, 0.9); spawnRipple(G.castTo, 1.2);
      G.waitT = rand(2.5, 7.5); G.nibbleT = rand(0.8, 2);
      setState('waiting');
    }
  } else if (s === 'waiting' || s === 'bite') {
    rod.pitch = lerp(rod.pitch, ROD_REST, dt * 4); rod.bend = lerp(rod.bend, 0.1, dt * 3); updateRod();
    G.dip = Math.max(0, G.dip - dt * 3);
    if (s === 'waiting') {
      G.nibbleT -= dt;
      if (G.nibbleT <= 0) { G.dip = 0.25; G.nibbleT = rand(1, 2.5); spawnRipple(bobber.position, 0.5, 1); } // 试探性轻啄
      if (G.t >= G.waitT) {
        G.fish = pickFish(G.castPower || 0.5);
        G.biteWindow = 1.45 - G.fish.sp.diff * 0.08;
        spawnSplash(bobber.position, 18, 0.6); spawnRipple(bobber.position, 1.1, 1.2);
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
        setState('bite');
      }
    } else {
      G.dip = 0.9 + Math.sin(G.t * 22) * 0.1;
      if (Math.random() < dt * 4) spawnRipple(bobber.position, 0.8, 1);
      if (G.t > G.biteWindow) { G.fish = null; startRetrieve('鱼跑了… 反应慢了一点'); }
    }
    bobber.position.set(G.castTo.x, waveY - G.dip * 0.16, G.castTo.z);
    bobber.scale.setScalar(bobScale);
    sag = 0.35;
  } else if (s === 'reeling') {
    const sp = G.fish.sp, wf = G.fish.wf;
    const strength = 0.16 + sp.diff * 0.075 + wf * 0.1;
    // 鱼的挣扎节奏
    if (G.surge > 0) { G.surge -= dt; if (G.surge <= 0) G.nextSurge = rand(1.2, 3.2) / (0.7 + sp.diff * 0.12); }
    else { G.nextSurge -= dt; if (G.nextSurge <= 0) { G.surge = rand(0.5, 1.0) + sp.diff * 0.12; G.shake = 1; spawnSplash(bobber.position, 20, 0.8); } }
    const surging = G.surge > 0;
    const pull = strength * (surging ? 2.1 : 0.55) + Math.sin(time * 3) * 0.04;
    const target = G.holding ? 0.33 + pull : pull * 0.45;
    G.tension = clamp(G.tension + (target - G.tension) * (1 - Math.exp(-dt * 2.6)), 0, 1.05);
    if (G.holding) G.progress += dt * (0.17 / (0.6 + sp.diff * 0.25 + wf * 0.4)) * (G.tension > 0.85 ? 0.5 : 1);
    else G.progress -= dt * (surging ? 0.06 : 0.015);
    G.progress = clamp(G.progress, 0, 1);
    if (G.tension > 0.96) G.overT += dt; else G.overT = Math.max(0, G.overT - dt * 2);
    if (G.tension < 0.15) G.slackT += dt; else G.slackT = Math.max(0, G.slackT - dt);
    ui.tension.style.width = `${clamp(G.tension, 0, 1) * 100}%`;
    ui.tension.className = G.tension > 0.85 ? 'danger' : G.tension < 0.2 ? 'slack' : 'safe';
    ui.progress.style.width = `${G.progress * 100}%`;
    ui.reelMsg.textContent = G.tension > 0.85 ? '张力过高！快松手！' : G.slackT > 0.8 ? '线太松了，快收线！' : surging ? '鱼在拼命挣扎！' : '保持张力在绿色区域';
    rod.bend = lerp(rod.bend, 0.2 + G.tension * 1.6, dt * 8); rod.pitch = lerp(rod.pitch, ROD_REST + 0.25 + G.tension * 0.15, dt * 5); updateRod();
    rodBase.userData.reelHandle.rotation.x += G.holding ? dt * 25 : 0;
    const end = new THREE.Vector3(CAM_POS.x + f.x * 3.5, 0, CAM_POS.z + f.z * 3.5);
    const along = G.progress;
    const lat = new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(Math.sin(time * (surging ? 3.5 : 1.2)) * (surging ? 2.2 : 0.8) * (1 - along * 0.7));
    const tgt = new THREE.Vector3().lerpVectors(G.castTo, end, along).add(lat);
    bobber.position.x = lerp(bobber.position.x, tgt.x, dt * 3); bobber.position.z = lerp(bobber.position.z, tgt.z, dt * 3);
    bobber.position.y = waveY - 0.12 - (surging ? 0.08 : 0);
    bobber.scale.setScalar(bobScale);
    if (Math.random() < dt * (surging ? 10 : 3)) spawnRipple(bobber.position, 0.7, 0.9);
    if (surging && Math.random() < dt * 8) spawnSplash(bobber.position, 6, 0.6);
    sag = Math.max(0, 0.3 - G.tension * 0.32);
    if (G.overT > 0.35) { G.fish = null; G.shake = 1.5; if (navigator.vibrate) navigator.vibrate(120); startRetrieve('线断了！张力过大'); }
    else if (G.slackT > 2.6) { G.fish = null; startRetrieve('鱼脱钩了！线太松了'); }
    else if (G.progress >= 1) landFish();
  } else if (s === 'retrieve') {
    G.retrieveT += dt;
    const k = clamp(G.retrieveT / 0.8, 0, 1);
    rodTip.getWorldPosition(_tip);
    bobber.position.lerpVectors(G.retrieveFrom, new THREE.Vector3(_tip.x, _tip.y - 0.75, _tip.z), k);
    bobber.position.y += Math.sin(k * Math.PI) * 2;
    bobber.scale.setScalar(lerp(bobber.scale.x, 1, k));
    rod.pitch = lerp(rod.pitch, ROD_REST + 0.3, dt * 6); rod.bend = lerp(rod.bend, 0.1, dt * 6); updateRod();
    sag = 0.05;
    if (k >= 1) setState('idle');
  } else if (s === 'caught') {
    rod.pitch = lerp(rod.pitch, ROD_REST + 0.35, dt * 4); rod.bend = lerp(rod.bend, 0.4, dt * 4); updateRod();
    if (G.catchModel) {
      const u = G.catchModel.userData.uniforms; u.uTime.value += dt;
      u.uAmp.value = lerp(u.uAmp.value, 0.05, dt * 0.5);
      G.catchModel.rotation.y = Math.sin(time * 0.8) * 0.5;
      G.catchModel.rotation.z = Math.sin(time * 1.3) * 0.08;
      rodTip.getWorldPosition(_tip);
      const fp = new THREE.Vector3(); G.catchModel.getWorldPosition(fp);
      bobber.position.lerp(fp.add(new THREE.Vector3(0, 0.25, 0)), dt * 6); bobber.scale.setScalar(1);
    }
    sag = 0.02;
  }
  updateLine(sag);
  updateFx(dt);
  // 远距离浮漂指示标记
  const showMark = (s === 'waiting' || s === 'bite' || s === 'reeling') && bobber.position.distanceTo(CAM_POS) > 10;
  if (showMark) {
    const v = bobber.position.clone(); v.y += 0.35 * bobber.scale.y; v.project(camera);
    ui.mark.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px)`;
  }
  ui.mark.classList.toggle('show', showMark);
  ui.mark.classList.toggle('alert', s === 'bite');

  // 远处随机“鱼跃”
  ambientT -= dt;
  if (ambientT <= 0) {
    ambientT = rand(4, 10);
    const a = rand(-0.8, 0.8) + G.aim, d = rand(15, 70);
    const p = new THREE.Vector3(CAM_POS.x - Math.sin(a) * d, 0, CAM_POS.z - Math.cos(a) * d);
    spawnRipple(p, 1.3, 2.2); spawnSplash(p, 12, 0.6);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// ---------------- 启动 ----------------
refreshHud();
setState('idle');
updateRod();
requestAnimationFrame(tick);
setTimeout(() => {
  try { thumbs = makeThumbnails(); } catch (e) { console.warn('缩略图生成失败', e); }
  document.body.classList.add('ready');
  const sb = $('startBtn'); sb.disabled = false; sb.textContent = '开始钓鱼';
}, 50);
$('startBtn').addEventListener('click', () => { started = true; $('start').classList.add('hide'); });
window.__game = { G, save, setPower: p => { G.power = p; }, startCast, onPress, onRelease, hookFish, landFish, pickFish, setState };
