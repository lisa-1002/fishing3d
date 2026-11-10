import * as THREE from "three";
import {
  addLights,
  aimCamera,
  bindResize,
  chime,
  groundHit,
  makeFigure,
  makeHills,
  makeMarker,
  makeSky,
  makeWillow,
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
const SPAWN = { x: 0.2, z: 8.15 };
const BRIDGE = { x: 0, z: -7.55 };
const LAKE = { x: 0, z: 0.5, r: 5.02 };
const OUTER = 10.45;
const TOWER_POS = { x: 8.55, z: -3.35 };
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
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x8ea4b4, 0.028);
scene.add(makeSky(THREE, 0x9aabba, 0xb7c6d2, 0x8ea4b4));
const camera = new THREE.PerspectiveCamera(48, 9 / 16, 0.1, 140);
const lights = addLights(THREE, scene, {
  sky: 0xd5e4ee,
  ground: 0x3a4a44,
  sun: 0xf4efe4,
  sunIntensity: 0.72,
  ambient: 0x6a7c88,
  ambientIntensity: 0.32,
  rim: 0xc5d8e4,
  rimIntensity: 0.4,
  sx: 4,
  sy: 18,
  sz: 6,
  shadow: 20,
});

const shoreTex = paintTexture(THREE, renderer, 128, (x, y) => {
  const n = valueNoise(x / 14, y / 14);
  const m = valueNoise(x / 5, y / 5);
  return [78 + n * 30 + m * 10, 86 + n * 24, 78 + n * 16];
}, 5);
const stoneTex = paintTexture(THREE, renderer, 128, (x, y) => {
  const n = valueNoise(x / 8, y / 8);
  const g = 90 + n * 40;
  return [g + 8, g + 6, g];
}, 2);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(22, 48),
  new THREE.MeshStandardMaterial({ map: shoreTex, roughness: 0.96 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const waterMat = new THREE.ShaderMaterial({
  transparent: true,
  fog: false,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 p = position;
      p.z += sin(p.x * 1.6 + uTime * 1.3) * cos(p.y * 1.4 + uTime) * 0.05;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float rip = sin(vUv.x * 46.0 + uTime * 2.0) * sin(vUv.y * 38.0 - uTime * 1.5);
      vec3 deep = vec3(0.16, 0.30, 0.38);
      vec3 lite = vec3(0.48, 0.64, 0.72);
      vec3 c = mix(deep, lite, clamp(rip * 0.5 + 0.5, 0.0, 1.0));
      gl_FragColor = vec4(c, 0.94);
    }
  `,
});
const lake = new THREE.Mesh(new THREE.CircleGeometry(4.55, 48), waterMat);
lake.rotation.x = -Math.PI / 2;
lake.position.set(LAKE.x, 0.03, LAKE.z);
scene.add(lake);
const curb = new THREE.Mesh(
  new THREE.TorusGeometry(4.72, 0.1, 6, 40),
  new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.85 })
);
curb.rotation.x = Math.PI / 2;
curb.position.set(LAKE.x, 0.08, LAKE.z);
scene.add(curb);

const bridge = new THREE.Group();
const deck = new THREE.Mesh(
  new THREE.BoxGeometry(2.5, 0.22, 4.6),
  new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.82 })
);
deck.position.set(0, 0.16, -0.2);
deck.castShadow = true;
deck.receiveShadow = true;
bridge.add(deck);
const railMat = new THREE.MeshStandardMaterial({ color: 0x6e6458, roughness: 0.8 });
for (const side of [-1, 1]) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 4.3), railMat);
  rail.position.set(side * 1.15, 0.42, -0.2);
  rail.castShadow = true;
  bridge.add(rail);
  for (let i = 0; i < 4; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), railMat);
    post.position.set(side * 1.15, 0.4, -1.8 + i * 1.15);
    bridge.add(post);
  }
}
const lampPost = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.08, 1.15, 6),
  new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.8 })
);
lampPost.position.set(0.85, 0.7, 1.5);
bridge.add(lampPost);
const glow = new THREE.Mesh(
  new THREE.SphereGeometry(0.16, 10, 8),
  new THREE.MeshStandardMaterial({ color: 0xf0d48a, emissive: 0xf0d48a, emissiveIntensity: 0.9 })
);
glow.position.set(0.85, 1.28, 1.5);
bridge.add(glow);
bridge.add(new THREE.PointLight(0xffd7a2, 2.2, 8, 2));
bridge.children[bridge.children.length - 1].position.set(0.85, 1.3, 1.5);
bridge.position.set(0, 0, -7.15);
scene.add(bridge);

const tower = new THREE.Group();
const brick = new THREE.MeshStandardMaterial({ color: 0x6b3e2e, roughness: 0.88 });
const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.45, 8), brick);
base.position.y = 0.22;
base.castShadow = true;
tower.add(base);
for (let i = 0; i < 5; i++) {
  const tier = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72 - i * 0.09, 0.9 - i * 0.08, 0.62, 8),
    brick
  );
  tier.position.y = 0.7 + i * 0.58;
  tier.castShadow = true;
  tower.add(tier);
  const eave = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95 - i * 0.1, 0.95 - i * 0.1, 0.08, 8),
    new THREE.MeshStandardMaterial({ color: 0x3e342c, roughness: 0.7 })
  );
  eave.position.y = 0.98 + i * 0.58;
  tower.add(eave);
}
tower.position.set(TOWER_POS.x, 0, TOWER_POS.z);
scene.add(tower);
scene.add(makeHills(THREE, 0x7f92a0, 26));

for (let i = 0; i < 14; i++) {
  const a = (i / 14) * Math.PI * 2;
  const r = 8.6 + (i % 3) * 0.5;
  const tree = makeWillow(THREE, 0.85 + (i % 3) * 0.12);
  const x = Math.cos(a) * r;
  const z = Math.sin(a) * r * 0.92 + 0.4;
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < 6.2) continue;
  tree.position.set(x, 0, z);
  scene.add(tree);
}

const hero = makeFigure(THREE, {
  dress: 0xf2f4f7,
  dressShape: "robe",
  hairStyle: "long",
  hair: 0x1a1210,
  sash: 0x7eb8b0,
});
scene.add(hero);

function makeMonk() {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 1.35, 8),
    new THREE.MeshStandardMaterial({ color: 0x2c2632, roughness: 0.82 })
  );
  robe.position.y = 0.78;
  robe.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.7 })
  );
  head.position.y = 1.52;
  head.castShadow = true;
  const staff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.7, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a5030, roughness: 0.7 })
  );
  staff.position.set(0.38, 0.95, 0);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.02, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0xd4b56a, metalness: 0.4, roughness: 0.4 })
  );
  ring.position.set(0.38, 1.75, 0);
  g.add(robe, head, staff, ring);
  return g;
}
const monk = makeMonk();
scene.add(monk);

const rainN = 380;
const rainGeo = new THREE.BufferGeometry();
const rainArr = new Float32Array(rainN * 3);
for (let i = 0; i < rainN; i++) {
  rainArr[i * 3] = (Math.random() - 0.5) * 22;
  rainArr[i * 3 + 1] = Math.random() * 14;
  rainArr[i * 3 + 2] = (Math.random() - 0.5) * 22;
}
rainGeo.setAttribute("position", new THREE.BufferAttribute(rainArr, 3));
const rain = new THREE.Points(
  rainGeo,
  new THREE.PointsMaterial({ color: 0xd5e2ec, size: 0.05, transparent: true, opacity: 0.45, depthWrite: false })
);
scene.add(rain);

function makeHerbMesh() {
  const g = new THREE.Group();
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x7eb8b0, emissive: 0x1c4a40, emissiveIntensity: 0.35, roughness: 0.5 })
  );
  leaf.scale.set(1.15, 0.45, 0.8);
  leaf.castShadow = true;
  const bud = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xe6d39a, emissive: 0xd4b56a, emissiveIntensity: 0.45 })
  );
  bud.position.y = 0.12;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.3, 14),
    new THREE.MeshBasicMaterial({ color: 0x9ad0c6, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  g.add(leaf, bud, ring);
  return g;
}
const items = HERBS.map((spec) => {
  const mesh = makeHerbMesh();
  mesh.position.set(spec.x, 0.16, spec.z);
  scene.add(mesh);
  return { ...spec, y: 0.3, mesh, alive: true };
});
const marker = makeMarker(THREE, 0xf0e2b0);
scene.add(marker);

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
  return onBridge(x, z) ? 0.28 : 0;
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
  hero.position.set(SPAWN.x, 0, SPAWN.z);
  hero.rotation.y = Math.PI;
  monk.position.set(state.monkX, 0, state.monkZ);
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
  const screen = pickByScreen(camera, renderer.domElement, THREE, ndc, items, 86);
  if (screen) {
    const item = items.find((it) => it.id === screen.id && it.alive);
    if (item) {
      if (Math.hypot(hero.position.x - item.x, hero.position.z - item.z) < 1.2) collect(item);
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

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  waterMat.uniforms.uTime.value = t;
  const arr = rainGeo.attributes.position.array;
  for (let i = 0; i < rainN; i++) {
    arr[i * 3 + 1] -= dt * 9;
    if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 13;
  }
  rainGeo.attributes.position.needsUpdate = true;
  rain.position.z = hero.position.z * 0.2;
  if (state.toastT > 0) {
    state.toastT -= dt;
    if (state.toastT <= 0) el.toast.classList.remove("show");
  }
  items.forEach((item) => {
    if (!item.alive) return;
    item.mesh.position.y = 0.16 + Math.sin(t * 2.1 + item.x) * 0.04;
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
            if (item && Math.hypot(hero.position.x - item.x, hero.position.z - item.z) < 1.25) collect(item);
          }
        }
      }
    } else state.moving = false;
    hero.position.y = footY(hero.position.x, hero.position.z);

    let near = null;
    let nearD = 0.75;
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
    if (distM < 3.25 && state.grace <= 0) state.pressure = Math.min(1, state.pressure + dt * 0.45);
    else state.pressure = Math.max(0, state.pressure - dt * 0.35);
    if (state.pressure > 0.45) {
      const moved = moveActor(state.monkX, state.monkZ, hero.position.x, hero.position.z, 2.35 * dt);
      state.monkX = moved.x;
      state.monkZ = moved.z;
      monk.rotation.y = Math.atan2(mdx, mdz);
    } else {
      const px = -6.65;
      const pz = 1.6 + Math.sin(t * 0.38) * 2.5;
      if (walkable(px, pz)) {
        state.monkX = px;
        state.monkZ = pz;
      }
      monk.rotation.y = Math.sin(t * 0.38) >= 0 ? 0.4 : -2.4;
    }
    monk.position.set(state.monkX, footY(state.monkX, state.monkZ), state.monkZ);

    const onWin = onBridge(hero.position.x, hero.position.z) && hero.position.z < -6.55 && state.herbs >= GOAL;
    const onBridgeShort = onBridge(hero.position.x, hero.position.z) && hero.position.z < -6.55 && state.herbs < GOAL;
    if (onBridgeShort) {
      state.bridgeWarn += dt;
      if (state.bridgeWarn > 0.35 && state.toastT <= 0) feedback("草药还不够（" + state.herbs + "/5）", "warn");
    } else state.bridgeWarn = 0;
    const caught = state.grace <= 0 && distM < 1.02;
    const towerTrap = state.grace <= 0
      && state.pressure > 0.62
      && Math.hypot(hero.position.x - TOWER_POS.x, hero.position.z - TOWER_POS.z) < 1.65;
    const decision = resolveEnding({
      phase: state.phase,
      endLock: state.endLock,
      win: onWin,
      lose: !onWin && (caught || towerTrap),
    });
    if (decision) finish(decision);
    hud();
  } else state.moving = false;

  hero.userData.animate(state.moving, t);
  aimCamera(camera, hero, dt, state.snap || state.phase === "start", { back: 8.3, height: 6.6, ahead: 5.1 });
  state.snap = false;
  if (state.phase === "start") {
    hero.position.set(SPAWN.x, 0, SPAWN.z);
    hero.rotation.y = Math.PI;
    monk.position.set(-6.7, 0, 3.4);
  }
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
        y: 0.3,
        z: item.z,
        alive: item.alive,
      })),
      walkable,
    },
  });
  renderer.render(scene, camera);
  lights.sun.target.position.set(hero.position.x, 0, hero.position.z);
  lights.sun.target.updateMatrixWorld();
}
hero.position.set(SPAWN.x, 0, SPAWN.z);
hero.rotation.y = Math.PI;
monk.position.set(-6.7, 0, 3.4);
tick();
