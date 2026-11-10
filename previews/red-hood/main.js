import * as THREE from "three";
import {
  addLights,
  aimCamera,
  bindResize,
  chime,
  groundHit,
  makeCottage,
  makeFigure,
  makeHills,
  makeMarker,
  makePine,
  makeSky,
  paintTexture,
  farBehind,
  pickByScreen,
  publishQA,
  resolveEnding,
  setupRenderer,
  stepToward,
  valueNoise,
} from "../lib/kit.js";

const SPAWN = { x: 0.75, z: 7.15 };
const HOME = { x: 0, z: -8.55 };
const BERRIES = [
  { id: "b1", kind: "berry", x: 2.15, z: 5.15 },
  { id: "b2", kind: "berry", x: 2.25, z: 1.55 },
  { id: "b3", kind: "berry", x: 1.95, z: -1.35 },
  { id: "b4", kind: "berry", x: 2.3, z: -4.15 },
];

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
scene.fog = new THREE.FogExp2(0x3a3058, 0.02);
scene.add(makeSky(THREE, 0x3a3068, 0xc08098, 0x4a3a58));
const camera = new THREE.PerspectiveCamera(48, 9 / 16, 0.1, 120);
addLights(THREE, scene, {
  sky: 0xc4b4d8,
  ground: 0x1c241c,
  sun: 0xf0c8ea,
  sunIntensity: 0.85,
  ambient: 0x3a3050,
  ambientIntensity: 0.28,
  rim: 0xf0c27a,
  rimIntensity: 0.28,
  sx: -6,
  sy: 14,
  sz: 4,
  shadow: 18,
});

const grass = paintTexture(THREE, renderer, 128, (x, y) => {
  const n = valueNoise(x / 16, y / 16);
  return [58 + n * 28, 92 + n * 36, 62 + n * 18];
}, 7);
const dirt = paintTexture(THREE, renderer, 128, (x, y) => {
  const n = valueNoise(x / 9, y / 9);
  return [78 + n * 36, 62 + n * 22, 48 + n * 14];
}, 2);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(20, 40),
  new THREE.MeshStandardMaterial({ map: grass, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const road = new THREE.Mesh(
  new THREE.PlaneGeometry(2.4, 18.2),
  new THREE.MeshStandardMaterial({ map: dirt, roughness: 1 })
);
road.rotation.x = -Math.PI / 2;
road.position.set(0.35, 0.02, -0.6);
road.receiveShadow = true;
scene.add(road);
scene.add(makeHills(THREE, 0x3a3050, 24));

for (let i = 0; i < 18; i++) {
  const side = i % 2 === 0 ? -1 : 1;
  const tree = makePine(THREE, 1.05 + (i % 3) * 0.18, 0x1c3c2c);
  tree.position.set(side * (4.3 + (i % 3) * 0.7), 0, 7.2 - i * 0.95);
  scene.add(tree);
}

const cottage = makeCottage(THREE, { wall: 0xcbb892, roof: 0x6e342c });
cottage.position.set(HOME.x, 0, HOME.z);
scene.add(cottage);

const hero = makeFigure(THREE, {
  dress: 0xd62828,
  dressShape: "cape",
  hairStyle: "hood",
  prop: "basket",
  legs: 0x3a2a22,
});
scene.add(hero);

function makeWolf() {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x3c3e48, roughness: 0.78 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.62, 4, 8), fur);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.42;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), fur);
  head.position.set(0.5, 0.52, 0);
  head.castShadow = true;
  const snout = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.26, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2c34, roughness: 0.8 })
  );
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(0.72, 0.48, 0);
  const earMat = fur;
  const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 5), earMat);
  ear.position.set(0.42, 0.72, 0.08);
  const ear2 = ear.clone();
  ear2.position.z = -0.08;
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xe6c15a,
    emissive: 0xe6c15a,
    emissiveIntensity: 0.7,
  });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
  eye.position.set(0.62, 0.56, 0.08);
  const eye2 = eye.clone();
  eye2.position.z = -0.08;
  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.32, 5);
  const legs = [-0.2, 0.2].flatMap((x) => [-0.12, 0.12].map((z) => {
    const leg = new THREE.Mesh(legGeo, fur);
    leg.position.set(x, 0.16, z);
    leg.castShadow = true;
    return leg;
  }));
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.38, 5), fur);
  tail.rotation.z = Math.PI / 2.4;
  tail.position.set(-0.48, 0.5, 0);
  g.add(body, head, snout, ear, ear2, eye, eye2, tail, ...legs);
  return g;
}
const wolf = makeWolf();
scene.add(wolf);

function makeBerryMesh() {
  const g = new THREE.Group();
  const fruit = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xd62828,
      roughness: 0.4,
      emissive: 0x6a1010,
      emissiveIntensity: 0.35,
    })
  );
  fruit.castShadow = true;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.32, 14),
    new THREE.MeshBasicMaterial({ color: 0xe07070, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  g.add(fruit, ring);
  return g;
}
const items = BERRIES.map((spec) => {
  const mesh = makeBerryMesh();
  mesh.position.set(spec.x, 0.24, spec.z);
  scene.add(mesh);
  return { ...spec, y: 0.35, mesh, alive: true };
});
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
  wolfX: -3.05,
  wolfZ: 2.4,
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
  } else {
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
  state.wolfX = -3.05;
  state.wolfZ = 2.4;
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
  feedback("红果，步子轻了");
  hud();
}
function seek(item) {
  state.target = { x: item.x, z: item.z, id: item.id };
  marker.position.set(item.x, 0.05, item.z);
  marker.visible = true;
}
function onPointer(e) {
  if (state.phase !== "play") return;
  if (e.cancelable) e.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();
  const src = e.touches && e.touches.length ? e.touches[0] : e;
  ndc.set(((src.clientX - rect.left) / rect.width) * 2 - 1, -((src.clientY - rect.top) / rect.height) * 2 + 1);
  const screen = pickByScreen(camera, renderer.domElement, THREE, ndc, items, 84);
  if (screen) {
    const item = items.find((it) => it.id === screen.id && it.alive);
    if (item) {
      if (Math.hypot(hero.position.x - item.x, hero.position.z - item.z) < 1.15) collect(item);
      else seek(item);
      return;
    }
  }
  if (!groundHit(THREE, raycaster, camera, ndc, 0, hit)) return;
  if (farBehind(hero, hit.x, hit.z)) return;
  let best = null;
  let bestD = 1.5;
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
    item.mesh.position.y = 0.24 + Math.sin(t * 2.4 + item.x) * 0.05;
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
    const speed = 4.7 * state.boost;
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
          if (item && Math.hypot(hero.position.x - item.x, hero.position.z - item.z) < 1.2) collect(item);
        }
      }
    } else state.moving = false;

    let near = null;
    let nearD = 0.72;
    for (const item of items) {
      if (!item.alive) continue;
      const d = Math.hypot(hero.position.x - item.x, hero.position.z - item.z);
      if (d < nearD) {
        nearD = d;
        near = item;
      }
    }
    if (near) collect(near);

    const dx = hero.position.x - state.wolfX;
    const dz = hero.position.z - state.wolfZ;
    const distW = Math.hypot(dx, dz);
    if (distW < 2.85 && state.grace <= 0) state.alert = Math.min(1, state.alert + dt * 0.7);
    else state.alert = Math.max(0, state.alert - dt * 0.45);
    if (state.alert > 0.4) {
      const len = Math.max(0.001, distW);
      const step = 2.45 * dt;
      let nx = state.wolfX + (dx / len) * step;
      let nz = state.wolfZ + (dz / len) * step;
      if (nz < -6.85) nz = -6.85;
      nx = Math.max(-3.35, Math.min(3.2, nx));
      state.wolfX = nx;
      state.wolfZ = nz;
      wolf.rotation.y = Math.atan2(dx, dz);
    } else {
      state.wolfX = -3.05;
      state.wolfZ = 2.3 + Math.sin(t * 0.42) * 2.3;
      wolf.rotation.y = Math.sin(t * 0.42) > 0 ? 0 : Math.PI;
    }
    wolf.position.set(state.wolfX, Math.abs(Math.sin(t * 8)) * 0.03, state.wolfZ);

    const homeD = Math.hypot(hero.position.x - HOME.x, hero.position.z - HOME.z);
    const caught = state.grace <= 0 && distW < 0.98 && hero.position.z > -7.3;
    const safe = homeD < 1.45 && hero.position.z < -7.45;
    const decision = resolveEnding({
      phase: state.phase,
      endLock: state.endLock,
      win: safe,
      lose: caught,
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
    wolf.position.set(-3.05, 0, 2.4);
  }
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
wolf.position.set(-3.05, 0, 2.4);
tick();
