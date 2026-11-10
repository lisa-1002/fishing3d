import * as THREE from "three";
import {
  aimCamera,
  bindResize,
  chime,
  farBehind,
  groundHit,
  makeMarker,
  pickByScreen,
  publishQA,
  resolveEnding,
  setupRenderer,
  stepToward,
} from "../lib/kit.js";
import { buildGlade, makeApple, makeMushroom, makePrincess } from "./art.js";

const GOAL = 5;
const REACH = 0.68;
const TAP_PX = 52;
const FOOT_SLOP = 1.05;
const SPAWN = { x: 0, z: 5.55 };
const COTTAGE = { x: -4.2, z: -3.15, r: 1.58 };
const WALK_R = 7.2;
const CAM = { back: 7.9, height: 5.7, ahead: 4.05, lookH: 0.95 };
const APPLES = [
  { id: "s1", kind: "sweet", x: -2.15, z: 1.85 },
  { id: "s2", kind: "sweet", x: 2.05, z: 1.05 },
  { id: "s3", kind: "sweet", x: -0.95, z: -1.45 },
  { id: "s4", kind: "sweet", x: 2.55, z: -2.35 },
  { id: "s5", kind: "sweet", x: 0.15, z: -3.55 },
  { id: "s6", kind: "sweet", x: -3.35, z: -0.35 },
  { id: "p1", kind: "poison", x: 3.35, z: 3.15 },
  { id: "p2", kind: "poison", x: -3.55, z: 3.35 },
  { id: "p3", kind: "poison", x: 1.35, z: -4.95 },
  { id: "p4", kind: "poison", x: -2.35, z: -3.75 },
];

const frame = document.getElementById("frame");
const view = document.getElementById("view");
const el = {
  start: document.getElementById("start"),
  end: document.getElementById("end"),
  hud: document.getElementById("hud"),
  hint: document.getElementById("hint"),
  toast: document.getElementById("toast"),
  score: document.getElementById("score"),
  lives: document.getElementById("lives"),
  endIcon: document.getElementById("endIcon"),
  endBadge: document.getElementById("endBadge"),
  endTitle: document.getElementById("endTitle"),
  endLead: document.getElementById("endLead"),
};

const renderer = setupRenderer(THREE, view);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, 9 / 16, 0.1, 140);
const glade = buildGlade(THREE, renderer, scene);

const cottage = glade.cottage;
cottage.position.set(COTTAGE.x, 0, COTTAGE.z);
cottage.rotation.y = Math.atan2(-COTTAGE.x, -COTTAGE.z);
scene.add(cottage);

const hero = makePrincess(THREE);
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.42, 18),
  new THREE.MeshBasicMaterial({ color: 0x0c1210, transparent: true, opacity: 0.32, depthWrite: false })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.03;
shadow.castShadow = false;
hero.add(shadow);
scene.add(hero);

function placeMushroom(hue, x, z) {
  const g = makeMushroom(THREE, hue);
  g.position.set(x, 0, z);
  g.userData = { baseX: x, baseZ: z, phase: hue * 10 };
  scene.add(g);
  return g;
}
const helpers = [0.02, 0.08, 0.16, 0.32, 0.55, 0.72, 0.9].map((hue, i) => {
  const a = (i / 7) * Math.PI * 2 + 0.35;
  return placeMushroom(hue, Math.cos(a) * 5.45, Math.sin(a) * 5.45);
});

const items = APPLES.map((spec) => {
  const mesh = makeApple(THREE, spec.kind);
  mesh.position.set(spec.x, 0, spec.z);
  scene.add(mesh);
  return { ...spec, y: 0.32, mesh, alive: true };
});

const marker = makeMarker(THREE, 0xf2d48a);
scene.add(marker);

const keys = new Set();
window.addEventListener("keydown", (e) => {
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(e.code)) {
    keys.add(e.code);
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const hit = new THREE.Vector3();
const state = {
  phase: "start",
  endLock: false,
  score: 0,
  lives: 3,
  kind: null,
  target: null,
  grace: 0,
  snap: true,
  moving: false,
  lastFeedback: "",
  toastT: 0,
  blockedT: 0,
};

function walkable(x, z) {
  if (Math.hypot(x, z) > WALK_R) return false;
  if (Math.hypot(x - COTTAGE.x, z - COTTAGE.z) < COTTAGE.r) return false;
  return true;
}

function closest(x, z) {
  let px = x;
  let pz = z;
  const pushOut = () => {
    const dx = px - COTTAGE.x;
    const dz = pz - COTTAGE.z;
    const d = Math.hypot(dx, dz);
    if (d < COTTAGE.r) {
      const a = d < 0.001 ? 0 : Math.atan2(dz, dx);
      px = COTTAGE.x + Math.cos(a) * (COTTAGE.r + 0.06);
      pz = COTTAGE.z + Math.sin(a) * (COTTAGE.r + 0.06);
    }
  };
  pushOut();
  const r = Math.hypot(px, pz);
  if (r > WALK_R) {
    px = (px / r) * WALK_R;
    pz = (pz / r) * WALK_R;
  }
  pushOut();
  return { x: px, z: pz, clamped: Math.hypot(px - x, pz - z) > 0.28 };
}

function distTo(item) {
  return Math.hypot(hero.position.x - item.x, hero.position.z - item.z);
}

function feedback(text, tone) {
  state.lastFeedback = text;
  el.toast.textContent = text;
  el.toast.classList.add("show");
  state.toastT = 1.5;
  chime(tone || "ok");
}

function hud() {
  el.score.textContent = String(state.score);
  el.lives.textContent = String(state.lives);
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
    el.endIcon.textContent = "✨";
    el.endBadge.textContent = "安全结局";
    el.endTitle.textContent = "林光归途";
    el.endLead.textContent = "你采齐了甜红苹果，蘑菇伙伴们点起灯火。\n白衣公主穿过暮色，醒来时只记得甜香与笑声。";
    chime("good");
  } else if (kind === "bad") {
    el.endIcon.textContent = "🌙";
    el.endBadge.textContent = "睡意结局";
    el.endTitle.textContent = "紫果入梦";
    el.endLead.textContent = "紫苹果的甜意太过浓烈。\n公主倚在树下沉沉睡去——\n直到林间传来轻轻的呼唤。";
    chime("bad");
  } else {
    const unexpected = kind;
    throw new Error("Unknown ending: " + unexpected);
  }
  el.end.classList.remove("hidden");
}

function settleEnding() {
  if (state.phase !== "play" || state.endLock) return;
  const decision = resolveEnding({
    phase: state.phase,
    endLock: state.endLock,
    win: state.score >= GOAL,
    lose: state.lives <= 0,
  });
  if (decision) finish(decision);
}

function resetWorld() {
  state.phase = "play";
  state.endLock = false;
  state.score = 0;
  state.lives = 3;
  state.kind = null;
  state.target = null;
  state.grace = 0.4;
  state.snap = true;
  state.moving = false;
  state.blockedT = 0;
  hero.position.set(SPAWN.x, 0, SPAWN.z);
  hero.rotation.y = Math.PI;
  items.forEach((item) => {
    item.alive = true;
    item.mesh.visible = true;
    item.mesh.position.set(item.x, 0, item.z);
  });
  marker.visible = false;
  hud();
  el.start.classList.add("hidden");
  el.end.classList.add("hidden");
  el.hud.classList.add("show");
  el.hint.classList.add("show");
  el.toast.classList.remove("show");
}

function collect(item) {
  if (!item.alive || state.phase !== "play" || state.endLock) return;
  if (distTo(item) > REACH) return;
  item.alive = false;
  item.mesh.visible = false;
  if (item.kind === "sweet") {
    state.score += 1;
    feedback("甜红 +1");
    hero.userData.cloth.emissive.setHex(0x2a6a68);
  } else {
    state.lives -= 1;
    feedback("毒红，眼皮发沉", "warn");
    hero.userData.cloth.emissive.setHex(0x5a2068);
  }
  hero.userData.cloth.emissiveIntensity = 0.5;
  setTimeout(() => {
    if (!hero.userData.cloth) return;
    hero.userData.cloth.emissive.setHex(0x000000);
    hero.userData.cloth.emissiveIntensity = 0;
  }, 240);
  hud();
  if (state.target && state.target.id === item.id) {
    state.target = null;
    marker.visible = false;
  }
  settleEnding();
}

function seek(item) {
  state.target = { x: item.x, z: item.z, id: item.id };
  marker.position.set(item.x, 0.05, item.z);
  marker.visible = true;
}

function nearestItem(x, z, radius) {
  let best = null;
  let bestD = radius;
  for (const item of items) {
    if (!item.alive) continue;
    const d = Math.hypot(x - item.x, z - item.z);
    if (!best || d < bestD - 1e-4 || (Math.abs(d - bestD) <= 1e-4 && item.id < best.id)) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

function onPointer(e) {
  if (state.phase !== "play") return;
  if (e.cancelable) e.preventDefault();
  const p = ndcFromPointer(e);
  ndc.set(p.x, p.y);
  const screen = pickByScreen(camera, renderer.domElement, THREE, ndc, items, TAP_PX);
  if (screen) {
    const item = items.find((it) => it.id === screen.id && it.alive);
    if (item) {
      if (distTo(item) <= REACH) collect(item);
      else seek(item);
      return;
    }
  }
  if (!groundHit(THREE, raycaster, camera, ndc, 0, hit)) return;
  if (farBehind(hero, hit.x, hit.z)) return;
  const foot = nearestItem(hit.x, hit.z, FOOT_SLOP);
  if (foot) {
    if (distTo(foot) <= REACH) collect(foot);
    else seek(foot);
    return;
  }
  const spot = closest(hit.x, hit.z);
  state.target = { x: spot.x, z: spot.z, id: null };
  marker.position.set(spot.x, 0.05, spot.z);
  marker.visible = true;
  if (spot.clamped) feedback("林子外面没有路", "warn");
}

function ndcFromPointer(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  const src = e.touches && e.touches.length ? e.touches[0] : e;
  return {
    x: ((src.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((src.clientY - rect.top) / rect.height) * 2 + 1,
  };
}

renderer.domElement.addEventListener("pointerdown", onPointer, { passive: false });
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
document.getElementById("btnStart").addEventListener("click", resetWorld);
document.getElementById("btnReplay").addEventListener("click", resetWorld);
bindResize(renderer, camera, frame);

const clock = new THREE.Clock();
function keyVector() {
  let x = 0;
  let z = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) z -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) z += 1;
  return { x, z };
}

function approachCollect() {
  if (state.target && state.target.id) {
    const item = items.find((it) => it.id === state.target.id && it.alive);
    if (item && distTo(item) <= REACH) return item;
    return null;
  }
  return nearestItem(hero.position.x, hero.position.z, REACH);
}

function frameCamera(dt) {
  const snap = state.snap || state.phase === "start";
  aimCamera(camera, hero, dt, snap, CAM);
  state.snap = false;
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (state.toastT > 0) {
    state.toastT -= dt;
    if (state.toastT <= 0) el.toast.classList.remove("show");
  }
  helpers.forEach((h, i) => {
    const u = h.userData;
    h.position.x = u.baseX + Math.cos(t * 0.6 + u.phase) * 0.28;
    h.position.z = u.baseZ + Math.sin(t * 0.5 + u.phase) * 0.28;
    h.position.y = Math.abs(Math.sin(t * 3 + i)) * 0.03;
  });
  items.forEach((item) => {
    if (!item.alive) return;
    item.mesh.position.y = Math.sin(t * 2 + item.x) * 0.02;
    item.mesh.rotation.y += dt * 0.45;
  });
  glade.update(t);

  if (state.phase === "play") {
    state.grace = Math.max(0, state.grace - dt);
    const kv = keyVector();
    if (kv.x || kv.z) {
      const len = Math.hypot(kv.x, kv.z);
      const wish = closest(hero.position.x + (kv.x / len) * 1.2, hero.position.z + (kv.z / len) * 1.2);
      state.target = { x: wish.x, z: wish.z, id: null };
      marker.visible = false;
    }
    if (state.target) {
      const step = stepToward(hero.position, state.target, 4.5, dt, walkable);
      hero.position.x = step.x;
      hero.position.z = step.z;
      state.moving = step.moving;
      if (step.moving) {
        const dx = state.target.x - step.x;
        const dz = state.target.z - step.z;
        if (Math.hypot(dx, dz) > 0.05) hero.rotation.y = Math.atan2(dx, dz);
      }
      if (step.blocked) {
        state.blockedT += dt;
        if (state.blockedT > 0.35) {
          state.target = null;
          marker.visible = false;
          state.blockedT = 0;
        }
      } else state.blockedT = 0;
      if (step.arrived) {
        state.target = null;
        marker.visible = false;
      }
    } else state.moving = false;

    const near = approachCollect();
    if (near) collect(near);
    else settleEnding();
  } else if (state.phase === "start") {
    state.moving = false;
    hero.position.set(SPAWN.x, 0, SPAWN.z);
    hero.rotation.y = Math.PI;
  } else {
    state.moving = false;
  }

  hero.userData.animate(state.moving, t);
  frameCamera(dt);
  publishQA(renderer.domElement, camera, THREE, {
    renderer,
    fields: {
      title: "林间试炼",
      ready: true,
      phase: state.phase,
      kind: state.kind,
      score: state.score,
      lives: state.lives,
      goal: GOAL,
      x: hero.position.x,
      y: hero.position.y,
      z: hero.position.z,
      yaw: hero.rotation.y,
      spawn: SPAWN,
      lastFeedback: state.lastFeedback,
      endLock: state.endLock,
      pickups: items.map((item) => ({
        id: item.id,
        kind: item.kind,
        x: item.x,
        y: item.y,
        z: item.z,
        alive: item.alive,
      })),
      walkable,
    },
  });
  renderer.render(scene, camera);
}

hero.position.set(SPAWN.x, 0, SPAWN.z);
hero.rotation.y = Math.PI;
frameCamera(0);
tick();
