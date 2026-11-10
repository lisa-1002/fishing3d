import * as THREE from "three";
import {
  addLights,
  aimCamera,
  bindResize,
  chime,
  farBehind,
  makeFigure,
  makeMarker,
  makeSky,
  paintTexture,
  pickByScreen,
  publishQA,
  setupRenderer,
  stepToward,
  valueNoise,
} from "../lib/kit.js";

const SPAWN = { x: 0, z: 7.15 };
const ATAO = { x: -0.72, z: 3.05 };
const ELDER = { x: 0.95, z: -5.35 };
const GOOD_SWORD = { x: -1.7, z: -6.15 };
const BAD_SWORD = { x: 2.12, z: -5.82 };
const ALTAR = { x: 0.05, z: -6.45 };
const LABELS = {
  n0: "场景一 · 云梯之下",
  n1: "场景一 · 石阶",
  n2_help: "场景二 · 石阶一扶",
  n2_rush: "场景二 · 抢先登台",
  n3_trust: "场景三 · 裂隙之前",
  n3_obsession: "场景三 · 裂隙之前",
};

function groundY(z) {
  return (7.55 - z) * 0.38;
}

const frame = document.getElementById("frame");
const view = document.getElementById("view");
const dialog = document.getElementById("dialog");
const choicesEl = document.getElementById("choices");
const toastEl = document.getElementById("toast");

const renderer = setupRenderer(THREE, view);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a2438, 0.028);
scene.add(makeSky(THREE, 0x0e1830, 0x243656, 0x1a2438));
const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.1, 160);
const lights = addLights(THREE, scene, {
  sky: 0xc5d4ef,
  ground: 0x1a2018,
  sun: 0xd7e4f8,
  sunIntensity: 1.25,
  ambient: 0x223048,
  ambientIntensity: 0.42,
  rim: 0xf0e2b0,
  rimIntensity: 0.42,
  sx: 8,
  sy: 20,
  sz: 6,
  shadow: 22,
});
scene.add(lights.sun.target);

const stoneTex = paintTexture(THREE, renderer, 128, (x, y) => {
  const n = valueNoise(x / 9, y / 9);
  const m = valueNoise(x / 3, y / 3);
  const g = 108 + n * 36 + m * 12;
  return [g, g - 4, g - 10];
}, 3);
const moss = paintTexture(THREE, renderer, 64, (x, y) => {
  const n = valueNoise(x / 8, y / 8);
  return [40 + n * 20, 58 + n * 24, 46 + n * 12];
}, 4);

const deck = new THREE.Mesh(
  new THREE.CircleGeometry(26, 32),
  new THREE.MeshStandardMaterial({ map: moss, color: 0x6a7a72, roughness: 1 })
);
deck.rotation.x = -Math.PI / 2;
deck.position.y = -0.4;
deck.receiveShadow = true;
scene.add(deck);

for (let z = 7.5; z >= -4.05; z -= 0.5) {
  const step = new THREE.Mesh(
    new THREE.BoxGeometry(4.3, 0.22, 0.5),
    new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xa4aab0, roughness: 0.9 })
  );
  step.position.set(0, groundY(z) - 0.08, z);
  step.castShadow = true;
  step.receiveShadow = true;
  scene.add(step);
}
const plaza = new THREE.Mesh(
  new THREE.BoxGeometry(7.8, 0.28, 3.6),
  new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x8a9298, roughness: 0.9 })
);
plaza.position.set(-0.35, groundY(-5.7) - 0.05, -5.7);
plaza.receiveShadow = true;
plaza.castShadow = true;
scene.add(plaza);

const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a4654, roughness: 0.96 });
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2 + 0.4;
  const peak = new THREE.Mesh(new THREE.ConeGeometry(2.2 + (i % 3) * 0.85, 8 + (i % 4) * 2.2, 7), rockMat);
  const radius = 13 + (i % 3) * 1.6;
  const x = Math.cos(a) * radius;
  const z = Math.sin(a) * radius - 4;
  if (Math.abs(x) < 6 && z > -8) continue;
  peak.position.set(x, 1.4, z);
  scene.add(peak);
}
const chasm = new THREE.Mesh(
  new THREE.BoxGeometry(6, 0.2, 8),
  new THREE.MeshStandardMaterial({ color: 0x07060c, roughness: 1 })
);
chasm.position.set(6.2, groundY(-5) - 1.4, -5.2);
scene.add(chasm);

function makeGate() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.74 });
  const tile = new THREE.MeshStandardMaterial({ color: 0x1c6a60, roughness: 0.42, metalness: 0.18 });
  const tileDark = new THREE.MeshStandardMaterial({ color: 0x143e3c, roughness: 0.5, metalness: 0.12 });
  const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 2.7, 0.38), wood);
  pillarL.position.set(-1.35, 1.35, 0);
  pillarL.castShadow = true;
  const pillarR = pillarL.clone();
  pillarR.position.x = 1.35;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.28, 0.55), tileDark);
  beam.position.y = 2.65;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.16, 1.35), tile);
  roof.position.y = 2.95;
  const eave = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.08, 1.7), tileDark);
  eave.position.y = 2.78;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.78), tile);
  cap.position.y = 3.2;
  for (const x of [-1.85, 1.85]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 6), tile);
    horn.position.set(x, 3.05, 0.62);
    horn.rotation.z = x > 0 ? -0.7 : 0.7;
    g.add(horn);
  }
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.38, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.82 })
  );
  plaque.position.set(0, 2.2, 0.3);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe1a8, emissive: 0xffc56a, emissiveIntensity: 1 })
  );
  bulb.position.set(0, 2.05, 0.36);
  const light = new THREE.PointLight(0xffc58a, 6, 14, 2);
  light.position.set(0, 2.05, 0.5);
  g.add(pillarL, pillarR, beam, roof, eave, cap, plaque, bulb, light);
  return g;
}
const gate = makeGate();
gate.position.set(0, groundY(-6.4), -6.55);
scene.add(gate);

const riftMat = new THREE.MeshStandardMaterial({
  color: 0xd5e6ff,
  emissive: 0x9ecbff,
  emissiveIntensity: 0.35,
  transparent: true,
  opacity: 0.88,
  roughness: 0.2,
});
const rift = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 1.7), riftMat);
rift.position.set(0.15, groundY(-6.15) + 0.9, -6.15);
scene.add(rift);

for (const z of [6.2, 4.2, 1.4, -1.2]) {
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 1.1, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 0.8 })
  );
  post.position.set(1.7, groundY(z) + 0.5, z);
  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd7a2, emissive: 0xffb060, emissiveIntensity: 0.9 })
  );
  flame.position.set(1.7, groundY(z) + 1.15, z);
  const pl = new THREE.PointLight(0xffc58a, 1.1, 4.5, 2);
  pl.position.copy(flame.position);
  scene.add(post, flame, pl);
}

function makeSword(color, emissive) {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.2, 0.035),
    new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.7, roughness: 0.32, metalness: 0.2 })
  );
  blade.position.y = 0.75;
  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.06, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xd4b56a, roughness: 0.45 })
  );
  guard.position.y = 0.2;
  const hilt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.045, 0.28, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.7 })
  );
  hilt.position.y = 0.02;
  g.add(blade, guard, hilt);
  return g;
}
const goodSword = makeSword(0xd5efe4, 0x7ec9a8);
goodSword.position.set(GOOD_SWORD.x, groundY(GOOD_SWORD.z), GOOD_SWORD.z);
scene.add(goodSword);
const badSword = makeSword(0xe7c8d4, 0xa06078);
badSword.position.set(BAD_SWORD.x, groundY(BAD_SWORD.z), BAD_SWORD.z);
scene.add(badSword);
const altar = new THREE.Group();
const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(0.28, 0.36, 0.45, 8),
  new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 })
);
pedestal.position.y = 0.22;
const orb = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 10, 8),
  new THREE.MeshStandardMaterial({ color: 0xf0e2b0, emissive: 0xd4b56a, emissiveIntensity: 0.8 })
);
orb.position.y = 0.52;
altar.add(pedestal, orb);
altar.position.set(ALTAR.x, groundY(ALTAR.z), ALTAR.z);
altar.visible = false;
scene.add(altar);

const hero = makeFigure(THREE, {
  dress: 0x2c6a66,
  dressShape: "robe",
  hairStyle: "bun",
  hair: 0x16181c,
  prop: "sword",
  sash: 0x7eb8b0,
});
dressShenYan(hero);
scene.add(hero);
const atao = makeFigure(THREE, {
  dress: 0xf0d5c8,
  dressShape: "skirt",
  hairStyle: "long",
  hair: 0x2a160f,
  sash: 0xc46a6a,
});
atao.scale.setScalar(0.9);
atao.position.set(ATAO.x, groundY(ATAO.z), ATAO.z);
atao.rotation.y = 0.8;
scene.add(atao);
const seat = new THREE.Mesh(
  new THREE.DodecahedronGeometry(0.28, 0),
  new THREE.MeshStandardMaterial({ color: 0x6a655c, roughness: 1 })
);
seat.position.set(ATAO.x - 0.15, groundY(ATAO.z) + 0.12, ATAO.z + 0.05);
scene.add(seat);
const elder = makeFigure(THREE, {
  dress: 0xe7e2d8,
  dressShape: "robe",
  hairStyle: "long",
  hair: 0xded8d0,
  sash: 0xd4b56a,
});
elder.scale.setScalar(1.08);
elder.position.set(ELDER.x, groundY(ELDER.z), ELDER.z);
elder.rotation.y = Math.PI;
scene.add(elder);

const marker = makeMarker(THREE, 0xf0e2b0);
scene.add(marker);

new THREE.TextureLoader().load("./assets/sky-gate-night.png", (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  const skyPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 22),
    new THREE.MeshBasicMaterial({ map: tex, fog: false, depthWrite: true })
  );
  skyPlate.position.set(1.4, 12.4, -16);
  skyPlate.renderOrder = -1;
  scene.add(skyPlate);
});

const actors = [
  { id: "atao", x: ATAO.x, z: ATAO.z, alive: true },
  { id: "good", x: GOOD_SWORD.x, z: GOOD_SWORD.z, alive: true },
  { id: "bad", x: BAD_SWORD.x, z: BAD_SWORD.z, alive: true },
  { id: "altar", x: ALTAR.x, z: ALTAR.z, alive: false },
];

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
const slope = new THREE.Plane();
slope.setFromNormalAndCoplanarPoint(
  new THREE.Vector3(0, 1, 0.38).normalize(),
  new THREE.Vector3(0, groundY(0), 0)
);

const state = {
  phase: "boot",
  endLock: false,
  dialogue: false,
  nodeId: null,
  branch: null,
  needPlaza: false,
  pendingNode: null,
  trust: 0,
  tags: [],
  flags: {},
  kind: null,
  target: null,
  snap: true,
  moving: false,
  lastFeedback: "",
  toastT: 0,
  story: null,
  blockedT: 0,
};

function dressShenYan(figure) {
  const trim = new THREE.MeshStandardMaterial({ color: 0xd7ded8, roughness: 0.55 });
  const ribbon = new THREE.MeshStandardMaterial({
    color: 0x8ec4bc,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const cuffL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.12), trim);
  cuffL.position.set(-0.32, 0.96, 0.02);
  const cuffR = cuffL.clone();
  cuffR.position.x = 0.34;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 6, 14), trim);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.4;
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.028), trim);
  strap.position.set(0.02, 1.18, -0.1);
  strap.rotation.z = 0.85;
  const tailA = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.78), ribbon);
  tailA.position.set(-0.16, 0.7, -0.16);
  const tailB = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.64), ribbon);
  tailB.position.set(-0.3, 0.66, -0.12);
  tailB.rotation.z = 0.18;
  const tassel = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 0.18, 0.028),
    new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.45 })
  );
  tassel.position.set(0.28, 0.5, 0.08);
  for (const y of [0.22, 0.34]) {
    for (const x of [-0.12, 0.12]) {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 4, 8), trim);
      wrap.rotation.x = Math.PI / 2;
      wrap.position.set(x, y, 0);
      figure.add(wrap);
    }
  }
  figure.add(cuffL, cuffR, collar, strap, tailA, tailB, tassel);
  const previous = figure.userData.animate;
  figure.userData.animate = (moving, time) => {
    previous(moving, time);
    tailA.rotation.y = Math.sin(time * 1.7) * 0.2;
    tailB.rotation.y = Math.sin(time * 1.7 + 0.7) * 0.24;
  };
}

function walkable(x, z) {
  if (z <= -4.12 && z >= -7.15 && x >= -3.65 && x <= 2.5) return true;
  if (z > -4.12 && z <= 7.65 && x >= -2.0 && x <= 2.0) return true;
  return false;
}
function closest(x, z) {
  if (walkable(x, z)) return { x, z, clamped: false };
  const stairX = Math.max(-2, Math.min(2, x));
  const stairZ = Math.max(-4.05, Math.min(7.65, z));
  if (z > -3.6 && walkable(stairX, stairZ)) return { x: stairX, z: stairZ, clamped: true };
  const px = Math.max(-3.65, Math.min(2.5, x));
  const pz = Math.max(-7.15, Math.min(-4.12, z));
  if (walkable(px, pz)) return { x: px, z: pz, clamped: true };
  return { x: stairX, z: Math.max(-4.05, Math.min(7.65, z)), clamped: true };
}

function feedback(text, tone) {
  state.lastFeedback = text;
  toastEl.textContent = text;
  toastEl.classList.add("show");
  state.toastT = 1.6;
  chime(tone || "ok");
}
function hideDialog() {
  state.dialogue = false;
  dialog.hidden = true;
  choicesEl.innerHTML = "";
}
function showScreen(name) {
  for (const id of ["screen-start", "screen-play", "screen-end"]) {
    const node = document.getElementById(id);
    const on = id === "screen-" + name;
    node.hidden = !on;
  }
}
function applyMood(name) {
  document.getElementById("bg").className = "bg " + (name || "night");
  if (name === "rift") {
    scene.fog.color.set(0x1a2a40);
    riftMat.emissiveIntensity = 1.5;
    lights.sun.color.set(0xc5d8f0);
    lights.sun.intensity = 0.7;
  } else if (name === "dawn") {
    scene.fog.color.set(0x8a7a62);
    lights.sun.color.set(0xffe0b0);
    lights.sun.intensity = 1.35;
    riftMat.emissiveIntensity = 0.2;
  } else if (name === "abyss") {
    scene.fog.color.set(0x140814);
    lights.sun.intensity = 0.22;
    lights.rim.color.set(0x804080);
    lights.rim.intensity = 0.85;
    riftMat.emissiveIntensity = 0.15;
  } else {
    scene.fog.color.set(0x1a2438);
    lights.sun.color.set(0xd7e4f8);
    lights.sun.intensity = 0.95;
    lights.rim.color.set(0xf0e2b0);
    lights.rim.intensity = 0.42;
    riftMat.emissiveIntensity = 0.35;
  }
}
function syncTrust() {
  document.getElementById("trust-hint").textContent = state.trust ? "心绪：未负同门" : "";
  altar.visible = state.trust > 0;
  actors.find((a) => a.id === "altar").alive = state.trust > 0;
}

function showEnding(node) {
  if (state.endLock) return;
  state.endLock = true;
  state.phase = "end";
  state.dialogue = false;
  state.kind = state.nodeId === "end_feng" ? "bad" : "good";
  state.target = null;
  marker.visible = false;
  applyMood(node.bg);
  const end = document.getElementById("screen-end");
  end.dataset.kind = state.kind;
  document.getElementById("ending-title").textContent = node.title;
  document.getElementById("ending-body").textContent = node.text;
  const box = document.getElementById("end-tags");
  box.innerHTML = "";
  const tags = node.tags && node.tags.length ? node.tags : state.tags;
  tags.forEach((t) => {
    const s = document.createElement("span");
    s.className = "tag";
    s.textContent = t;
    box.appendChild(s);
  });
  showScreen("end");
  chime(state.kind === "good" ? "good" : "bad");
}

function openNode(id) {
  const node = state.story.nodes[id];
  if (!node) return;
  state.nodeId = id;
  applyMood(node.bg);
  if (node.end) {
    showEnding(node);
    return;
  }
  state.dialogue = true;
  document.getElementById("scene-label").textContent = LABELS[id] || "试剑";
  document.getElementById("speaker").textContent = node.speaker || "";
  document.getElementById("line").textContent = node.text || "";
  document.getElementById("progress").textContent = LABELS[id] ? LABELS[id].slice(0, 3) : "试剑中";
  choicesEl.innerHTML = "";
  (node.choices || []).forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.textContent = choice.label;
    button.addEventListener("click", () => choose(choice));
    choicesEl.appendChild(button);
  });
  dialog.hidden = false;
  showScreen("play");
}

function choose(choice) {
  if (state.phase === "end" || state.endLock) return;
  (choice.tags || []).forEach((tag) => {
    if (!state.tags.includes(tag)) state.tags.push(tag);
  });
  (choice.flags || []).forEach((flag) => {
    state.flags[flag] = true;
  });
  if (state.flags.trust) state.trust = 1;
  syncTrust();
  const next = choice.next;
  if (next === "n1") {
    hideDialog();
    state.nodeId = "free";
    document.getElementById("move-hint").textContent = "走向阿桃，或从她右侧绕上去";
    document.getElementById("scene-label").textContent = "石阶";
    return;
  }
  if (next === "n2_help" || next === "n2_rush") {
    state.branch = next === "n2_help" ? "help" : "rush";
    openNode(next);
    return;
  }
  if (next === "n3_trust" || next === "n3_obsession") {
    hideDialog();
    state.needPlaza = true;
    state.pendingNode = next;
    state.nodeId = "climb";
    document.getElementById("move-hint").textContent = "登上试剑台，走向发光的剑";
    document.getElementById("scene-label").textContent = "云梯上行";
    feedback("登上试剑台");
    return;
  }
  openNode(next);
}

function resetPlay() {
  state.phase = "play";
  state.endLock = false;
  state.dialogue = false;
  state.nodeId = null;
  state.branch = null;
  state.needPlaza = false;
  state.pendingNode = null;
  state.trust = 0;
  state.tags = [];
  state.flags = {};
  state.kind = null;
  state.target = null;
  state.snap = true;
  state.moving = false;
  hero.position.set(SPAWN.x, groundY(SPAWN.z), SPAWN.z);
  hero.rotation.y = Math.PI;
  marker.visible = false;
  syncTrust();
  applyMood("night");
  document.getElementById("move-hint").textContent = "点按石阶行走 · 也可 WASD";
  showScreen("play");
  openNode(state.story.start || "n0");
}

function resetToTitle() {
  state.phase = "start";
  state.endLock = false;
  state.dialogue = false;
  state.nodeId = null;
  state.branch = null;
  state.needPlaza = false;
  state.pendingNode = null;
  state.trust = 0;
  state.tags = [];
  state.flags = {};
  state.kind = null;
  state.target = null;
  state.snap = true;
  hero.position.set(SPAWN.x, groundY(SPAWN.z), SPAWN.z);
  hero.rotation.y = Math.PI;
  marker.visible = false;
  hideDialog();
  syncTrust();
  applyMood("night");
  showScreen("start");
}

function resolveActor(id) {
  if (id === "atao") {
    if (state.branch || state.dialogue) return;
    if (state.nodeId === "n0") return;
    openNode("n1");
    return;
  }
  const ready = state.nodeId === "n3_trust" || state.nodeId === "n3_obsession";
  if (!ready) {
    feedback("先把石阶上的事问完", "warn");
    return;
  }
  if (id === "good") choose({ label: "取向山门的影剑——以护道为锋", next: "end_xin", tags: ["护道"] });
  else if (id === "bad") choose({ label: "取向深渊的影剑——以己欲为锋", next: "end_feng", tags: ["捷径"] });
  else if (id === "altar" && state.trust) choose({ label: "把影剑推回：可有第三路？", next: "end_xin_plus", tags: ["问心"] });
}

function canMoveNow() {
  if (state.phase !== "play") return false;
  if (!state.dialogue) return true;
  return state.nodeId === "n3_trust" || state.nodeId === "n3_obsession";
}

function onPointer(e) {
  if (!canMoveNow()) return;
  if (e.cancelable) e.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();
  const src = e.touches && e.touches.length ? e.touches[0] : e;
  ndc.set(((src.clientX - rect.left) / rect.width) * 2 - 1, -((src.clientY - rect.top) / rect.height) * 2 + 1);
  actors.forEach((actor) => {
    actor.y = groundY(actor.z) + 1;
  });
  const picked = pickByScreen(camera, renderer.domElement, THREE, ndc, actors, 78);
  if (picked) {
    const actor = actors.find((item) => item.id === picked.id);
    const stand = closest(actor.x, actor.z + (actor.id === "atao" ? 0.85 : 0.7));
    if (Math.hypot(hero.position.x - actor.x, hero.position.z - actor.z) < 1.45) resolveActor(actor.id);
    else {
      state.target = { x: stand.x, z: stand.z, id: actor.id };
      marker.position.set(stand.x, groundY(stand.z) + 0.05, stand.z);
      marker.visible = true;
    }
    return;
  }
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(slope, hit)) return;
  if (farBehind(hero, hit.x, hit.z)) return;
  const spot = closest(hit.x, hit.z);
  state.target = { x: spot.x, z: spot.z, id: null };
  marker.position.set(spot.x, groundY(spot.z) + 0.05, spot.z);
  marker.visible = true;
  if (spot.clamped) feedback("石阶外面是深涧", "warn");
}

renderer.domElement.addEventListener("pointerdown", onPointer, { passive: false });
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
document.getElementById("btn-start").addEventListener("click", () => {
  if (!state.story || state.phase === "boot") return;
  resetPlay();
});
document.getElementById("btn-replay").addEventListener("click", resetToTitle);
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
  const time = clock.elapsedTime;
  if (state.toastT > 0) {
    state.toastT -= dt;
    if (state.toastT <= 0) toastEl.classList.remove("show");
  }
  rift.position.y = groundY(-6.15) + 0.9 + Math.sin(time * 1.6) * 0.05;
  goodSword.rotation.y = Math.sin(time * 0.8) * 0.15;
  badSword.rotation.y = Math.sin(time * 0.8 + 1) * 0.15;

  if (canMoveNow()) {
    const kv = keyVector();
    if (kv.x || kv.z) {
      const len = Math.hypot(kv.x, kv.z);
      const wish = closest(hero.position.x + (kv.x / len) * 1.2, hero.position.z + (kv.z / len) * 1.2);
      state.target = { x: wish.x, z: wish.z, id: null };
      marker.visible = false;
    }
    if (state.target) {
      const step = stepToward(hero.position, state.target, 4.2, dt, walkable);
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
        const id = state.target.id;
        state.target = null;
        marker.visible = false;
        if (id) resolveActor(id);
      }
    } else state.moving = false;

    const dAtao = Math.hypot(hero.position.x - ATAO.x, hero.position.z - ATAO.z);
    if (!state.branch && state.nodeId !== "n0" && state.nodeId !== null && dAtao < 1.28) {
      openNode("n1");
    } else if (!state.branch && state.nodeId !== "n0" && state.nodeId !== null && hero.position.z < 1.42 && dAtao > 1.62) {
      state.branch = "rush";
      state.flags.obsession = true;
      if (!state.tags.includes("抢先")) state.tags.push("抢先");
      openNode("n2_rush");
    } else if (state.needPlaza && hero.position.z < -3.35) {
      state.needPlaza = false;
      openNode(state.pendingNode);
    }
  } else state.moving = false;

  hero.position.y = groundY(hero.position.z);
  atao.position.y = groundY(ATAO.z);
  elder.position.y = groundY(ELDER.z);
  hero.userData.animate(state.moving, time);
  atao.userData.animate(false, time);
  elder.userData.animate(false, time + 1);
  aimCamera(camera, hero, dt, state.snap || state.phase !== "play", {
    back: 7.2,
    height: 4.5,
    ahead: 6.6,
    lookH: 2.35,
  });
  state.snap = false;
  if (state.phase === "start" || state.phase === "boot") {
    hero.position.set(SPAWN.x, groundY(SPAWN.z), SPAWN.z);
    hero.rotation.y = Math.PI;
  }
  lights.sun.target.position.set(hero.position.x, hero.position.y, hero.position.z - 2);
  publishQA(renderer.domElement, camera, THREE, {
    renderer,
    fields: {
      title: "问剑云深",
      ready: !!state.story,
      phase: state.phase,
      kind: state.kind,
      node: state.nodeId,
      trust: state.trust,
      branch: state.branch,
      dialogue: state.dialogue,
      x: hero.position.x,
      y: hero.position.y,
      z: hero.position.z,
      yaw: hero.rotation.y,
      spawn: SPAWN,
      lastFeedback: state.lastFeedback,
      endLock: state.endLock,
      pickups: actors.map((actor) => ({
        id: actor.id,
        kind: actor.id,
        x: actor.x,
        y: groundY(actor.z) + 1,
        z: actor.z,
        alive: actor.alive,
      })),
      walkable,
    },
  });
  renderer.render(scene, camera);
}

async function boot() {
  hero.position.set(SPAWN.x, groundY(SPAWN.z), SPAWN.z);
  hero.rotation.y = Math.PI;
  tick();
  try {
    const res = await fetch("./story.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    state.story = await res.json();
  } catch (err) {
    document.getElementById("subtitle").textContent = "剧本加载失败：请用本地服务器打开本目录。";
    state.phase = "boot";
    return;
  }
  document.getElementById("brand").textContent = state.story.brand || "古装仙侠 · 互动剧";
  document.getElementById("title").textContent = state.story.title || "问剑云深";
  document.getElementById("subtitle").textContent = state.story.subtitle || "";
  document.title = state.story.title || "问剑云深";
  state.phase = "start";
}
boot();
