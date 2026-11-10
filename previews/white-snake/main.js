import * as THREE from "three";
import {
  aimCamera,
  bindResize,
  chime,
  farBehind,
  groundHit,
  pickByScreen,
  publishQA,
  resolveEnding,
  setupRenderer,
  stepToward,
} from "../lib/kit.js";
import { createScene } from "./scenery.js";

const GOAL = 5;
const SPAWN = { x: 0.2, z: 8.15 };
const FACING = Math.PI;
const BRIDGE = { x: 0, z: -7.55 };
const LAKE = { x: 0, z: 0.5, r: 5.02 };
const OUTER = 10.45;
const TOWER_POS = { x: 8.55, z: -3.35 };
const COLLECT_R = 0.58;
const PICK_PX = 34;
const MONK_PATROL = 0.62;
const MONK_CHASE = 1.35;
const MONK_AGGRO = 2.15;
const MONK_CATCH = 0.9;
const CAM = { back: 7.1, height: 5.15, ahead: 4.4, lookH: 1.05 };
const HERBS = [
  { id: "h1", kind: "herb", x: 6.35, z: 3.15 },
  { id: "h2", kind: "herb", x: 7.15, z: -0.45 },
  { id: "h3", kind: "herb", x: 5.75, z: -3.15 },
  { id: "h4", kind: "herb", x: -6.15, z: 2.35 },
  { id: "h5", kind: "herb", x: -6.75, z: -1.15 },
  { id: "h6", kind: "herb", x: 2.35, z: 6.75 },
  { id: "h7", kind: "herb", x: 4.15, z: 5.35 },
];

const frame = document.getElementById("frame");
const view = document.getElementById("view");
const el = {
  start: document.getElementById("start"),
  end: document.getElementById("end"),
  hud: document.getElementById("hud"),
  hint: document.getElementById("hint"),
  toast: document.getElementById("toast"),
  herbs: document.getElementById("herbs"),
  dist: document.getElementById("dist"),
  endIcon: document.getElementById("endIcon"),
  endBadge: document.getElementById("endBadge"),
  endTitle: document.getElementById("endTitle"),
  endLead: document.getElementById("endLead"),
};

const renderer = setupRenderer(THREE, view);
renderer.toneMappingExposure = 1.04;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, 9 / 16, 0.1, 160);
const look = createScene(THREE, renderer, scene, HERBS);
const hero = look.hero;
const monk = look.monk;
const marker = look.marker;

const items = HERBS.map((spec, index) => ({
  ...spec,
  y: 0.36,
  mesh: look.herbs[index],
  alive: true,
}));

const keys = new Set();
window.addEventListener("keydown", (e) => {
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(e.code)) {
    keys.add(e.code);
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

function onBridge(x, z) {
  return Math.abs(x) < 1.48 && z <= -4.42 && z >= -9.22;
}
function walkable(x, z) {
  if (onBridge(x, z)) return true;
  const lakeD = Math.hypot(x - LAKE.x, z - LAKE.z);
  const outer = Math.hypot(x, z);
  return lakeD >= LAKE.r && outer <= OUTER && z > -9.3 && z < 9.15;
}
function closest(x, z) {
  if (walkable(x, z)) return { x, z, clamped: false, reason: null };
  const inLake = Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r - 0.05;
  if (z < -3.4 && Math.abs(x) < 2.6) {
    const px = Math.max(-1.35, Math.min(1.35, x));
    const pz = Math.max(-9.1, Math.min(-4.5, z));
    if (walkable(px, pz)) return { x: px, z: pz, clamped: true, reason: inLake ? "water" : "bound" };
  }
  const dx = x - LAKE.x;
  const dz = z - LAKE.z;
  const ld = Math.hypot(dx, dz) || 0.001;
  let px = LAKE.x + (dx / ld) * (LAKE.r + 0.12);
  let pz = LAKE.z + (dz / ld) * (LAKE.r + 0.12);
  const od = Math.hypot(px, pz);
  if (od > OUTER) {
    px = (px / od) * (OUTER - 0.05);
    pz = (pz / od) * (OUTER - 0.05);
  }
  pz = Math.max(-9.05, Math.min(9.0, pz));
  if (!walkable(px, pz)) {
    let best = null;
    let bd = Infinity;
    for (let a = 0; a < 48; a++) {
      const ang = (a / 48) * Math.PI * 2;
      for (let r = LAKE.r + 0.2; r <= OUTER - 0.1; r += 0.55) {
        const sx = Math.cos(ang) * r;
        const sz = Math.sin(ang) * r;
        if (!walkable(sx, sz)) continue;
        const dd = (sx - x) ** 2 + (sz - z) ** 2;
        if (dd < bd) {
          bd = dd;
          best = { x: sx, z: sz };
        }
      }
    }
    if (best) {
      px = best.x;
      pz = best.z;
    }
  }
  return { x: px, z: pz, clamped: true, reason: inLake ? "water" : "bound" };
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const hit = new THREE.Vector3();
const state = {
  phase: "start",
  endLock: false,
  herbs: 0,
  kind: null,
  target: null,
  grace: 0,
  snap: true,
  moving: false,
  pressure: 0,
  lastFeedback: "",
  toastT: 0,
  blockedT: 0,
  monkX: -6.7,
  monkZ: 3.4,
  bridgeWarn: 0,
};

function feedback(text, tone) {
  state.lastFeedback = text;
  el.toast.textContent = text;
  el.toast.classList.add("show");
  state.toastT = 1.5;
  chime(tone || "ok");
}
function footY(x, z) {
  return onBridge(x, z) ? 0.3 : 0;
}
function hud() {
  el.herbs.textContent = String(state.herbs);
  const d = Math.hypot(hero.position.x - BRIDGE.x, hero.position.z - BRIDGE.z);
  el.dist.textContent = d.toFixed(1);
}
function finish(kind) {
  if (state.phase !== "play" || state.endLock) return;
  state.endLock = true;
  state.phase = "end";
  state.kind = kind;
  state.target = null;
  marker.visible = false;
  el.hud.classList.remove("show");
  el.hint.classList.remove("show");
  el.end.dataset.kind = kind;
  if (kind === "good") {
    el.endIcon.textContent = "🌉";
    el.endBadge.textContent = "团圆结局";
    el.endTitle.textContent = "断桥暖灯";
    el.endLead.textContent = "草药入篮，烟雨里许仙的伞正好撑开。塔影远了——这一夜，西湖只记得你们并肩的脚步。";
    el.end.style.backgroundImage = "linear-gradient(180deg, rgba(8,16,22,.42), rgba(8,16,22,.9)), url('./assets/bg-bridge.jpg')";
    el.end.style.backgroundSize = "cover";
    el.end.style.backgroundPosition = "center";
    chime("good");
  } else {
    el.endIcon.textContent = "🗼";
    el.endBadge.textContent = "镇压结局";
    el.endTitle.textContent = "雷峰塔影";
    el.endLead.textContent = "锡杖叩地，白衣被压进砖影。草药散落石阶——来世若再遇，愿先避开这条近路。";
    el.end.style.backgroundImage = "linear-gradient(180deg, rgba(8,16,22,.48), rgba(8,16,22,.92)), url('./assets/bg-tower.jpg')";
    el.end.style.backgroundSize = "cover";
    el.end.style.backgroundPosition = "center";
    chime("bad");
  }
  el.end.classList.remove("hidden");
}
function placeSpawn() {
  hero.position.set(SPAWN.x, 0, SPAWN.z);
  hero.rotation.y = FACING;
  monk.position.set(state.monkX, footY(state.monkX, state.monkZ), state.monkZ);
}
function frameCamera(snap) {
  aimCamera(camera, hero, 0.016, snap, CAM);
}
function resetWorld() {
  state.phase = "play";
  state.endLock = false;
  state.herbs = 0;
  state.kind = null;
  state.target = null;
  state.grace = 0.85;
  state.snap = true;
  state.moving = false;
  state.pressure = 0;
  state.blockedT = 0;
  state.bridgeWarn = 0;
  state.monkX = -6.7;
  state.monkZ = 3.4;
  placeSpawn();
  frameCamera(true);
  items.forEach((item) => {
    item.alive = true;
    item.mesh.visible = true;
  });
  marker.visible = false;
  hud();
  el.start.classList.add("hidden");
  el.end.classList.add("hidden");
  el.end.style.backgroundImage = "";
  el.hud.classList.add("show");
  el.hint.classList.add("show");
  el.toast.classList.remove("show");
}
function collect(item) {
  if (!item.alive || state.phase !== "play") return;
  const dist = Math.hypot(hero.position.x - item.x, hero.position.z - item.z);
  if (dist > COLLECT_R) return;
  item.alive = false;
  item.mesh.visible = false;
  state.herbs = Math.min(GOAL, state.herbs + 1);
  feedback(state.herbs >= GOAL ? "草药齐了，去断桥" : "草药 +" + state.herbs);
  hud();
}
function segmentClear(a, b) {
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    if (!walkable(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
  }
  return true;
}
function route(from, goal) {
  if (segmentClear(from, goal)) return { x: goal.x, z: goal.z, id: goal.id || null, next: null };
  let best = null;
  let bestScore = Infinity;
  const d0 = Math.hypot(from.x - goal.x, from.z - goal.z);
  for (let a = 0; a < 28; a++) {
    const ang = (a / 28) * Math.PI * 2;
    for (const radius of [5.45, 6.4, 7.5, 8.7]) {
      const via = { x: Math.cos(ang) * radius, z: LAKE.z + Math.sin(ang) * radius };
      if (!walkable(via.x, via.z) || !segmentClear(from, via)) continue;
      const d1 = Math.hypot(via.x - goal.x, via.z - goal.z);
      if (d1 > d0 - 0.25) continue;
      const score = d1 + Math.hypot(via.x - from.x, via.z - from.z) * 0.2;
      if (score < bestScore) {
        bestScore = score;
        best = via;
      }
    }
  }
  if (!best) return { x: goal.x, z: goal.z, id: goal.id || null, next: null };
  return { x: best.x, z: best.z, id: null, next: { x: goal.x, z: goal.z, id: goal.id || null } };
}
function seek(item) {
  const spot = closest(item.x, item.z);
  state.target = route(hero.position, { x: spot.x, z: spot.z, id: item.id });
  marker.position.set(state.target.x, 0.06, state.target.z);
  marker.visible = true;
}
function onPointer(e) {
  if (state.phase !== "play") return;
  if (e.cancelable) e.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();
  const src = e.touches && e.touches.length ? e.touches[0] : e;
  ndc.set(((src.clientX - rect.left) / rect.width) * 2 - 1, -((src.clientY - rect.top) / rect.height) * 2 + 1);
  const screen = pickByScreen(camera, renderer.domElement, THREE, ndc, items, PICK_PX);
  if (screen) {
    const item = items.find((it) => it.id === screen.id && it.alive);
    if (item) {
      const dist = Math.hypot(hero.position.x - item.x, hero.position.z - item.z);
      if (dist <= COLLECT_R) collect(item);
      else seek(item);
      return;
    }
  }
  if (!groundHit(THREE, raycaster, camera, ndc, 0, hit)) return;
  if (farBehind(hero, hit.x, hit.z)) return;
  let best = null;
  let bestD = 1.05;
  for (const item of items) {
    if (!item.alive) continue;
    const d = Math.hypot(hit.x - item.x, hit.z - item.z);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  if (best) {
    seek(best);
    return;
  }
  const spot = closest(hit.x, hit.z);
  state.target = route(hero.position, { x: spot.x, z: spot.z, id: null });
  marker.position.set(state.target.x, footY(state.target.x, state.target.z) + 0.04, state.target.z);
  marker.visible = true;
  if (spot.reason === "water") feedback("水面走不过去", "warn");
  else if (spot.clamped) feedback("烟雨外面没有路", "warn");
}
renderer.domElement.addEventListener("pointerdown", onPointer, { passive: false });
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
document.getElementById("btnStart").addEventListener("click", resetWorld);
document.getElementById("btnReplay").addEventListener("click", resetWorld);
bindResize(renderer, camera, frame);

function keyVector() {
  let x = 0;
  let z = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) z -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) z += 1;
  return { x, z };
}
function moveActor(x, z, tx, tz, speed) {
  const dx = tx - x;
  const dz = tz - z;
  const dist = Math.hypot(dx, dz) || 0.001;
  const step = Math.min(speed, dist);
  const nx = x + (dx / dist) * step;
  const nz = z + (dz / dist) * step;
  if (walkable(nx, nz)) return { x: nx, z: nz };
  if (walkable(nx, z)) return { x: nx, z };
  if (walkable(x, nz)) return { x, z: nz };
  return { x, z };
}

function decideEnding(distM) {
  if (state.phase !== "play" || state.endLock) return null;
  const onWin = onBridge(hero.position.x, hero.position.z) && hero.position.z < -6.55 && state.herbs >= GOAL;
  const caught = state.grace <= 0 && distM < MONK_CATCH;
  const towerTrap = state.grace <= 0
    && state.pressure > 0.62
    && Math.hypot(hero.position.x - TOWER_POS.x, hero.position.z - TOWER_POS.z) < 1.65;
  return resolveEnding({
    phase: state.phase,
    endLock: state.endLock,
    win: onWin,
    lose: !onWin && (caught || towerTrap),
  });
}

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  look.update(t, dt, hero.position);
  if (state.toastT > 0) {
    state.toastT -= dt;
    if (state.toastT <= 0) el.toast.classList.remove("show");
  }
  items.forEach((item) => {
    if (!item.alive) return;
    item.mesh.position.y = 0.02 + Math.sin(t * 2.1 + item.x) * 0.04;
  });

  if (state.phase === "play") {
    state.grace = Math.max(0, state.grace - dt);
    const kv = keyVector();
    if (kv.x || kv.z) {
      const len = Math.hypot(kv.x, kv.z);
      const wish = closest(hero.position.x + (kv.x / len) * 1.3, hero.position.z + (kv.z / len) * 1.3);
      state.target = { x: wish.x, z: wish.z, id: null };
      marker.visible = false;
    }
    if (state.target) {
      const step = stepToward(hero.position, state.target, 4.35, dt, walkable);
      hero.position.x = step.x;
      hero.position.z = step.z;
      state.moving = step.moving;
      if (step.moving) hero.rotation.y = Math.atan2(state.target.x - step.x, state.target.z - step.z);
      if (step.blocked) {
        state.blockedT += dt;
        if (state.blockedT > 0.3) {
          state.target = null;
          marker.visible = false;
          state.blockedT = 0;
        }
      } else state.blockedT = 0;
      if (step.arrived) {
        const next = state.target.next;
        const id = state.target.id;
        if (next) {
          state.target = route(hero.position, next);
          marker.position.set(state.target.x, 0.06, state.target.z);
          marker.visible = true;
        } else {
          state.target = null;
          marker.visible = false;
          if (id) {
            const item = items.find((it) => it.id === id && it.alive);
            if (item) collect(item);
          }
        }
      }
    } else state.moving = false;
    hero.position.y = footY(hero.position.x, hero.position.z);

    let near = null;
    let nearD = COLLECT_R;
    for (const item of items) {
      if (!item.alive) continue;
      const d = Math.hypot(hero.position.x - item.x, hero.position.z - item.z);
      if (d < nearD) {
        nearD = d;
        near = item;
      }
    }
    if (near) collect(near);

    const mdx = hero.position.x - state.monkX;
    const mdz = hero.position.z - state.monkZ;
    const distM = Math.hypot(mdx, mdz);
    if (distM < MONK_AGGRO && state.grace <= 0) state.pressure = Math.min(1, state.pressure + dt * 0.2);
    else state.pressure = Math.max(0, state.pressure - dt * 0.075);
    const closing = state.grace <= 0 && (distM < 1.45 || state.pressure > 0.5);
    if (closing) {
      const moved = moveActor(state.monkX, state.monkZ, hero.position.x, hero.position.z, MONK_CHASE * dt);
      state.monkX = moved.x;
      state.monkZ = moved.z;
      monk.rotation.y = Math.atan2(mdx, mdz);
    } else {
      const px = -6.5;
      const pz = 1.4 + Math.sin(t * 0.22) * 2.1;
      const moved = moveActor(state.monkX, state.monkZ, px, pz, MONK_PATROL * dt);
      state.monkX = moved.x;
      state.monkZ = moved.z;
      monk.rotation.y = Math.sin(t * 0.22) >= 0 ? 0.4 : -2.4;
    }
    monk.position.set(state.monkX, footY(state.monkX, state.monkZ), state.monkZ);

    const onBridgeShort = onBridge(hero.position.x, hero.position.z) && hero.position.z < -6.55 && state.herbs < GOAL;
    if (onBridgeShort) {
      state.bridgeWarn += dt;
      if (state.bridgeWarn > 0.35 && state.toastT <= 0) feedback("草药还不够（" + state.herbs + "/5）", "warn");
    } else state.bridgeWarn = 0;
    const decision = decideEnding(distM);
    if (decision) finish(decision);
    hud();
  } else state.moving = false;

  if (state.phase === "start") {
    state.monkX = -6.7;
    state.monkZ = 3.4;
    placeSpawn();
  }
  hero.userData.animate(state.moving, t);
  frameCamera(state.snap || state.phase === "start");
  state.snap = false;
  look.sun.position.set(hero.position.x - 7, 15, hero.position.z + 9);
  look.sun.target.position.set(hero.position.x, 0.6, hero.position.z - 1.5);
  look.sun.target.updateMatrixWorld();
  publishQA(renderer.domElement, camera, THREE, {
    renderer,
    fields: {
      title: "断桥烟雨",
      ready: true,
      phase: state.phase,
      kind: state.kind,
      score: state.herbs,
      goal: GOAL,
      x: hero.position.x,
      y: hero.position.y,
      z: hero.position.z,
      yaw: hero.rotation.y,
      spawn: SPAWN,
      monk: { x: state.monkX, z: state.monkZ },
      lastFeedback: state.lastFeedback,
      endLock: state.endLock,
      pickups: items.map((item) => ({
        id: item.id,
        kind: item.kind,
        x: item.x,
        y: 0.36,
        z: item.z,
        alive: item.alive,
      })),
      walkable,
    },
  });
  renderer.render(scene, camera);
}

placeSpawn();
frameCamera(true);
tick();
