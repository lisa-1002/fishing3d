import * as THREE from "three";
import {
  aimCamera,
  bindResize,
  chime,
  groundHit,
  makeMarker,
  farBehind,
  pickByScreen,
  publishQA,
  resolveEnding,
  setupRenderer,
  stepToward,
} from "../lib/kit.js";
import { createScenery } from "./look.js";
import {
  HOME,
  PLAYER_SPEED,
  REACH,
  SPAWN,
  WOLF_START,
  canCollect,
  endingChoice,
  stepWolf,
} from "./rules.js";

const BERRIES = [
  { id: "b1", kind: "berry", x: 2.15, z: 5.15 },
  { id: "b2", kind: "berry", x: 2.25, z: 1.55 },
  { id: "b3", kind: "berry", x: 1.95, z: -1.35 },
  { id: "b4", kind: "berry", x: 2.3, z: -4.15 },
];
const PICK_PX = 30;

const frame = document.getElementById("frame");
const view = document.getElementById("view");
const el = {
  start: document.getElementById("start"),
  end: document.getElementById("end"),
  hud: document.getElementById("hud"),
  hint: document.getElementById("hint"),
  toast: document.getElementById("toast"),
  berries: document.getElementById("berries"),
  dist: document.getElementById("dist"),
  endIcon: document.getElementById("endIcon"),
  endBadge: document.getElementById("endBadge"),
  endTitle: document.getElementById("endTitle"),
  endLead: document.getElementById("endLead"),
};

const renderer = setupRenderer(THREE, view);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 9 / 16, 0.1, 120);
const art = createScenery(THREE, renderer, scene, BERRIES);
const hero = art.hero;
const wolf = art.wolf;
scene.add(hero);
const items = BERRIES.map((spec, index) => ({
  ...spec,
  y: 0.35,
  mesh: art.berries[index],
  alive: true,
}));
const marker = makeMarker(THREE, 0xf0d0a0);
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
  berries: 0,
  boost: 1,
  boostT: 0,
  kind: null,
  target: null,
  grace: 0,
  snap: true,
  moving: false,
  alert: 0,
  lastFeedback: "",
  toastT: 0,
  blockedT: 0,
  wolfX: WOLF_START.x,
  wolfZ: WOLF_START.z,
};

function walkable(x, z) {
  return x >= -3.4 && x <= 3.4 && z <= 8.05 && z >= -9.2;
}
function closest(x, z) {
  const px = Math.max(-3.4, Math.min(3.4, x));
  const pz = Math.max(-9.2, Math.min(8.05, z));
  return { x: px, z: pz, clamped: Math.hypot(px - x, pz - z) > 0.28 };
}
function feedback(text, tone) {
  state.lastFeedback = text;
  el.toast.textContent = text;
  el.toast.classList.add("show");
  state.toastT = 1.4;
  chime(tone || "ok");
}
function hud() {
  el.berries.textContent = String(state.berries);
  const d = Math.hypot(hero.position.x - HOME.x, hero.position.z - HOME.z);
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
    el.endIcon.textContent = "🏠";
    el.endBadge.textContent = "安全结局";
    el.endTitle.textContent = "灯火到站";
    el.endLead.textContent = "餐篮安放在窗台。小屋暖光里，红斗篷摘下帽子——密林的脚步声，终于落在门外。";
    chime("good");
  } else if (kind === "bad") {
    el.endIcon.textContent = "🌑";
    el.endBadge.textContent = "危机结局";
    el.endTitle.textContent = "狼影追上";
    el.endLead.textContent = "枯枝断裂的一声里，你回头看见金色的眼。篮还在，路却断了——下次，或许该少采一颗分心的果。";
    chime("bad");
  }
  el.end.classList.remove("hidden");
}
function resetWorld() {
  state.phase = "play";
  state.endLock = false;
  state.berries = 0;
  state.boost = 1;
  state.boostT = 0;
  state.kind = null;
  state.target = null;
  state.grace = 0.85;
  state.snap = true;
  state.moving = false;
  state.alert = 0;
  state.blockedT = 0;
  state.wolfX = WOLF_START.x;
  state.wolfZ = WOLF_START.z;
  hero.position.set(SPAWN.x, 0, SPAWN.z);
  hero.rotation.y = Math.PI;
  wolf.position.set(state.wolfX, 0, state.wolfZ);
  wolf.rotation.y = 0;
  items.forEach((item) => {
    item.alive = true;
    item.mesh.visible = true;
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
  if (!item.alive || state.phase !== "play") return;
  item.alive = false;
  item.mesh.visible = false;
  state.berries += 1;
  state.boost = 1.45;
  state.boostT = 3.1;
  if (state.target && state.target.id === item.id) {
    state.target = null;
    marker.visible = false;
  }
  feedback("红果，步子轻了");
  hud();
}
function tryCollect(item) {
  if (!item || !item.alive) return false;
  const dist = Math.hypot(hero.position.x - item.x, hero.position.z - item.z);
  if (!canCollect(dist)) return false;
  collect(item);
  return true;
}
function approachTarget(item) {
  const dx = hero.position.x - item.x;
  const dz = hero.position.z - item.z;
  const dist = Math.hypot(dx, dz) || 1;
  const stop = REACH * 0.72;
  const spot = closest(item.x + (dx / dist) * stop, item.z + (dz / dist) * stop);
  return { x: spot.x, z: spot.z, id: item.id };
}
function seek(item) {
  if (tryCollect(item)) return;
  state.target = approachTarget(item);
  marker.position.set(item.x, 0.05, item.z);
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
      seek(item);
      return;
    }
  }
  if (!groundHit(THREE, raycaster, camera, ndc, 0, hit)) return;
  if (farBehind(hero, hit.x, hit.z)) return;
  let best = null;
  let bestD = 0.42;
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
  state.target = { x: spot.x, z: spot.z, id: null };
  marker.position.set(spot.x, 0.05, spot.z);
  marker.visible = true;
  if (spot.clamped) feedback("树墙外面没有路", "warn");
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

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (state.toastT > 0) {
    state.toastT -= dt;
    if (state.toastT <= 0) el.toast.classList.remove("show");
  }
  items.forEach((item) => {
    if (!item.alive) return;
    item.mesh.position.y = 0.22 + Math.sin(t * 2.4 + item.x) * 0.05;
  });

  if (state.phase === "play") {
    state.grace = Math.max(0, state.grace - dt);
    if (state.boostT > 0) {
      state.boostT -= dt;
      if (state.boostT <= 0) state.boost = 1;
    }
    const kv = keyVector();
    if (kv.x || kv.z) {
      const len = Math.hypot(kv.x, kv.z);
      const wish = closest(hero.position.x + (kv.x / len) * 1.2, hero.position.z + (kv.z / len) * 1.2);
      state.target = { x: wish.x, z: wish.z, id: null };
      marker.visible = false;
    }
    const speed = PLAYER_SPEED * state.boost;
    if (state.target) {
      const step = stepToward(hero.position, state.target, speed, dt, walkable);
      hero.position.x = step.x;
      hero.position.z = step.z;
      state.moving = step.moving;
      if (step.moving) {
        hero.rotation.y = Math.atan2(state.target.x - step.x, state.target.z - step.z);
      }
      if (step.blocked) {
        state.blockedT += dt;
        if (state.blockedT > 0.3) {
          state.target = null;
          marker.visible = false;
          state.blockedT = 0;
        }
      } else state.blockedT = 0;
      if (step.arrived) {
        const id = state.target.id;
        state.target = null;
        marker.visible = false;
        if (id) {
          const item = items.find((it) => it.id === id && it.alive);
          tryCollect(item);
        }
      }
    } else state.moving = false;

    let near = null;
    let nearD = REACH;
    for (const item of items) {
      if (!item.alive) continue;
      const d = Math.hypot(hero.position.x - item.x, hero.position.z - item.z);
      if (d <= nearD) {
        nearD = d;
        near = item;
      }
    }
    if (near) tryCollect(near);

    const stepped = stepWolf({
      x: state.wolfX,
      z: state.wolfZ,
      alert: state.alert,
      heroX: hero.position.x,
      heroZ: hero.position.z,
      t,
      dt,
      grace: state.grace,
    });
    state.wolfX = stepped.x;
    state.wolfZ = stepped.z;
    state.alert = stepped.alert;
    wolf.rotation.y = stepped.yaw;
    wolf.position.set(state.wolfX, Math.abs(Math.sin(t * 8)) * 0.03, state.wolfZ);

    const homeD = Math.hypot(hero.position.x - HOME.x, hero.position.z - HOME.z);
    const choice = endingChoice({
      grace: state.grace,
      distW: stepped.dist,
      z: hero.position.z,
      homeD,
    });
    const decision = resolveEnding({
      phase: state.phase,
      endLock: state.endLock,
      win: choice.win,
      lose: choice.lose,
    });
    if (decision) finish(decision);
    hud();
  } else state.moving = false;

  hero.userData.animate(state.moving, t);
  aimCamera(camera, hero, dt, state.snap || state.phase === "start", { back: 7.2, height: 5.2, ahead: 6.2, lookH: 0.35 });
  state.snap = false;
  if (state.phase === "start") {
    hero.position.set(SPAWN.x, 0, SPAWN.z);
    hero.rotation.y = Math.PI;
    wolf.position.set(WOLF_START.x, 0, WOLF_START.z);
  }
  art.update(t);
  publishQA(renderer.domElement, camera, THREE, {
    renderer,
    fields: {
      title: "林间红帽",
      ready: true,
      phase: state.phase,
      kind: state.kind,
      score: state.berries,
      x: hero.position.x,
      y: hero.position.y,
      z: hero.position.z,
      yaw: hero.rotation.y,
      spawn: SPAWN,
      wolf: { x: state.wolfX, z: state.wolfZ },
      lastFeedback: state.lastFeedback,
      endLock: state.endLock,
      pickups: items.map((item) => ({
        id: item.id,
        kind: item.kind,
        x: item.x,
        y: 0.35,
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
wolf.position.set(WOLF_START.x, 0, WOLF_START.z);
tick();
