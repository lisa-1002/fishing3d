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

const GOAL = 5;
const SPAWN = { x: 0, z: 5.55 };
const COTTAGE = { x: -4.2, z: -3.15, r: 1.58 };
const WALK_R = 7.2;
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
scene.fog = new THREE.FogExp2(0x2a3144, 0.026);
scene.add(makeSky(THREE, 0x6e7c9a, 0xc48b78, 0x2a3144));
const camera = new THREE.PerspectiveCamera(48, 9 / 16, 0.1, 120);
addLights(THREE, scene, {
  sky: 0xffd8c2,
  ground: 0x243024,
  sun: 0xffe0c4,
  sunIntensity: 1.35,
  ambient: 0x4a5568,
  rim: 0x88a0c8,
  sx: 7,
  sy: 16,
  sz: 8,
});

const grass = paintTexture(THREE, renderer, 128, (x, y, s) => {
  const n = valueNoise(x / 18, y / 18);
  const m = valueNoise(x / 6, y / 6);
  const r = 62 + n * 30 + m * 18;
  const g = 92 + n * 40 + m * 10;
  const b = 58 + n * 16;
  return [r, g, b];
}, 6);
const dirt = paintTexture(THREE, renderer, 128, (x, y) => {
  const n = valueNoise(x / 10, y / 10);
  return [92 + n * 40, 74 + n * 24, 48 + n * 16];
}, 3);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(18, 48),
  new THREE.MeshStandardMaterial({ map: grass, roughness: 0.96 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const clearing = new THREE.Mesh(
  new THREE.CircleGeometry(WALK_R + 0.4, 40),
  new THREE.MeshStandardMaterial({ map: grass, color: 0xd5e2c4, roughness: 0.94 })
);
clearing.rotation.x = -Math.PI / 2;
clearing.position.y = 0.015;
clearing.receiveShadow = true;
scene.add(clearing);
const path = new THREE.Mesh(
  new THREE.RingGeometry(2.1, 3.5, 40),
  new THREE.MeshStandardMaterial({ map: dirt, roughness: 1 })
);
path.rotation.x = -Math.PI / 2;
path.position.y = 0.03;
scene.add(path);
scene.add(makeHills(THREE, 0x3d4a58, 22));

for (let i = 0; i < 22; i++) {
  const a = (i / 22) * Math.PI * 2;
  const r = 8.4 + (i % 3) * 0.85;
  const tree = makePine(THREE, 0.9 + (i % 4) * 0.16, i % 2 ? 0x2c5a3c : 0x245038);
  tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  scene.add(tree);
}

const cottage = makeCottage(THREE, { wall: 0xe4d2b0, roof: 0x8d3a32 });
cottage.position.set(COTTAGE.x, 0, COTTAGE.z);
cottage.rotation.y = 0.7;
scene.add(cottage);

const hero = makeFigure(THREE, {
  dress: 0xf4f1ea,
  dressShape: "skirt",
  hairStyle: "bun",
  hair: 0x1a120f,
  bow: 0xc45c7a,
  sash: 0x7ec8cf,
});
scene.add(hero);

function makeMushroom(hue, x, z) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.2, 0.42, 8),
    new THREE.MeshStandardMaterial({ color: 0xf3e2cf, roughness: 0.7 })
  );
  stem.position.y = 0.21;
  stem.castShadow = true;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue, 0.5, 0.46), roughness: 0.68 })
  );
  cap.position.y = 0.42;
  cap.castShadow = true;
  g.add(stem, cap);
  g.position.set(x, 0, z);
  g.userData = { baseX: x, baseZ: z, phase: hue * 10 };
  scene.add(g);
  return g;
}
const helpers = [0.02, 0.08, 0.16, 0.32, 0.55, 0.72, 0.9].map((h, i) => {
  const a = (i / 7) * Math.PI * 2;
  return makeMushroom(h, Math.cos(a) * 3.3, Math.sin(a) * 3.1 - 0.4);
});

function makeApple(kind) {
  const sweet = kind === "sweet";
  const g = new THREE.Group();
  const fruit = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 12),
    new THREE.MeshStandardMaterial({
      color: sweet ? 0xd64545 : 0x6a2458,
      roughness: 0.38,
      metalness: 0.05,
      emissive: sweet ? 0x5a1014 : 0x2a0830,
      emissiveIntensity: 0.28,
    })
  );
  fruit.scale.set(1, 0.92, 1);
  fruit.castShadow = true;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.16, 5),
    new THREE.MeshStandardMaterial({ color: 0x3a2814 })
  );
  stem.position.y = 0.32;
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 4),
    new THREE.MeshStandardMaterial({ color: sweet ? 0x3e9a48 : 0x2a4a30 })
  );
  leaf.scale.set(1.5, 0.35, 0.7);
  leaf.position.set(0.08, 0.34, 0);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.4, 16),
    new THREE.MeshBasicMaterial({
      color: sweet ? 0xe07a4a : 0x7a3a88,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  g.add(fruit, stem, leaf, ring);
  return g;
}

const items = APPLES.map((spec) => {
  const mesh = makeApple(spec.kind);
  mesh.position.set(spec.x, 0.32, spec.z);
  scene.add(mesh);
  return { ...spec, y: 0.45, mesh, alive: true };
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
  } else {
    el.endIcon.textContent = "🌙";
    el.endBadge.textContent = "睡意结局";
    el.endTitle.textContent = "紫果入梦";
    el.endLead.textContent = "紫苹果的甜意太过浓烈。\n公主倚在树下沉沉睡去——\n直到林间传来轻轻的呼唤。";
    chime("bad");
  }
  el.end.classList.remove("hidden");
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
    item.mesh.position.set(item.x, 0.32, item.z);
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
    hero.userData.cloth.emissive.setHex(0x000000);
    hero.userData.cloth.emissiveIntensity = 0;
  }, 240);
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
  const p = ndcFromPointer(e);
  ndc.set(p.x, p.y);
  const screen = pickByScreen(camera, renderer.domElement, THREE, ndc, items, 84);
  if (screen) {
    const item = items.find((it) => it.id === screen.id);
    if (item && item.alive) {
      if (Math.hypot(hero.position.x - item.x, hero.position.z - item.z) < 1.15) collect(item);
      else seek(item);
      return;
    }
  }
  if (!groundHit(THREE, raycaster, camera, ndc, 0, hit)) return;
  if (farBehind(hero, hit.x, hit.z)) return;
  let best = null;
  let bestD = 1.55;
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
    h.position.x = u.baseX + Math.cos(t * 0.6 + u.phase) * 0.55;
    h.position.z = u.baseZ + Math.sin(t * 0.5 + u.phase) * 0.55;
    h.position.y = Math.abs(Math.sin(t * 3 + i)) * 0.05;
  });
  items.forEach((item) => {
    if (!item.alive) return;
    item.mesh.position.y = 0.32 + Math.sin(t * 2 + item.x) * 0.06;
    item.mesh.rotation.y += dt * 0.6;
  });

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
    const decision = resolveEnding({
      phase: state.phase,
      endLock: state.endLock,
      win: state.score >= GOAL,
      lose: state.lives <= 0,
    });
    if (decision) finish(decision);
  } else {
    state.moving = false;
  }

  hero.userData.animate(state.moving, t);
  aimCamera(camera, hero, dt, state.snap, { back: 8.2, height: 6.5, ahead: 4.6 });
  state.snap = false;
  if (state.phase === "start") {
    hero.position.set(SPAWN.x, 0, SPAWN.z);
    hero.rotation.y = Math.PI;
  }
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
        y: 0.45,
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
tick();
