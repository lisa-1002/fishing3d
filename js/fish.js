// 鱼种数据 + 程序化写实鱼模型（平滑着色、侧扁鱼体、鳍、渐变体色、游动顶点动画）
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/addons/RoomEnvironment.js';
import { vnoise, hash, smooth } from './util.js';

export const RARITY = {
  common: { name: '普通', color: '#d5dde2', weight: 62 },
  rare:   { name: '稀有', color: '#4fc3f7', weight: 27 },
  epic:   { name: '史诗', color: '#c77dff', weight: 9 },
  legend: { name: '传说', color: '#ffb300', weight: 2 },
};

// height: 体高/体长；thick: 体宽/体高；diff: 难度 1-5；score: 基础分
export const SPECIES = [
  { id: 'crucian', name: '鲫鱼', rarity: 'common', w: [0.15, 0.9], score: 10, diff: 1.0, height: 0.42, thick: 0.45, top: 0x3e4030, belly: 0xd9d3b4, fin: 0x77694c, pattern: 'plain', metal: 0.45, tail: 'fork', desc: '湖里最常见的小鱼，肉质细嫩，新手的好朋友。' },
  { id: 'tilapia', name: '罗非鱼', rarity: 'common', w: [0.3, 1.6], score: 14, diff: 1.3, height: 0.44, thick: 0.42, top: 0x39433f, belly: 0xc3c7bb, fin: 0x55566a, pattern: 'stripes', metal: 0.3, tail: 'round', desc: '适应力极强，身上有隐约的竖纹。' },
  { id: 'carp', name: '鲤鱼', rarity: 'common', w: [0.8, 6], score: 20, diff: 1.8, height: 0.32, thick: 0.55, top: 0x4f4220, belly: 0xe3cc94, fin: 0x9a5530, pattern: 'plain', metal: 0.5, tail: 'fork', desc: '鳞片金黄，尾鳍带红，力气不小。' },
  { id: 'perch', name: '鲈鱼', rarity: 'rare', w: [0.5, 3.5], score: 40, diff: 2.4, height: 0.29, thick: 0.5, top: 0x34443a, belly: 0xebebe3, fin: 0x4a5048, pattern: 'spots', metal: 0.55, tail: 'fork', desc: '背部散布黑点的掠食者，咬钩凶猛。' },
  { id: 'mandarin', name: '鳜鱼', rarity: 'rare', w: [0.4, 2.5], score: 50, diff: 2.6, height: 0.36, thick: 0.45, top: 0x5c5222, belly: 0xeadfa6, fin: 0x6a5a30, pattern: 'blotch', metal: 0.25, tail: 'round', desc: '“桃花流水鳜鱼肥”，斑纹如豹。' },
  { id: 'trout', name: '虹鳟', rarity: 'rare', w: [0.6, 4], score: 55, diff: 2.8, height: 0.25, thick: 0.6, top: 0x3a4e46, belly: 0xf2f2ec, fin: 0x7a8070, pattern: 'rainbow', metal: 0.5, tail: 'fork', desc: '体侧一道玫瑰色彩虹带，冷水中的精灵。' },
  { id: 'goldcarp', name: '黄金鲤', rarity: 'epic', w: [2, 10], score: 120, diff: 3.4, height: 0.33, thick: 0.55, top: 0xc98a0c, belly: 0xffe58a, fin: 0xff9a2a, pattern: 'plain', metal: 0.85, tail: 'fork', desc: '通体金光闪闪，据说能带来好运。' },
  { id: 'arowana', name: '金龙鱼', rarity: 'epic', w: [2, 7], score: 150, diff: 3.8, height: 0.23, thick: 0.45, top: 0xa8821c, belly: 0xffe9a8, fin: 0xc27022, pattern: 'plain', metal: 0.9, tail: 'round', desc: '鳞大如币，游姿如龙。' },
  { id: 'koi', name: '红白锦鲤王', rarity: 'legend', w: [5, 15], score: 400, diff: 4.3, height: 0.32, thick: 0.6, top: 0xf6f2ea, belly: 0xffffff, fin: 0xf3eee6, pattern: 'koi', metal: 0.2, tail: 'fork', desc: '传说中的湖之守护者，红白分明，极为罕见。' },
  { id: 'sturgeon', name: '千年鳇鱼', rarity: 'legend', w: [40, 160], score: 600, diff: 5.0, height: 0.15, thick: 0.95, top: 0x383c3e, belly: 0xcbc6b8, fin: 0x3c4046, pattern: 'scutes', metal: 0.15, tail: 'shark', desc: '远古巨兽，体覆骨板，需要极大的耐心与技巧。' },
];
export const speciesById = Object.fromEntries(SPECIES.map(s => [s.id, s]));

function profile(u, sp) {
  const a = sp.tail === 'shark' ? 0.35 : 0.45, b = sp.tail === 'shark' ? 1.3 : 0.9;
  const um = a / (a + b), fmax = Math.pow(um, a) * Math.pow(1 - um, b);
  return (Math.pow(u, a) * Math.pow(1 - u, b)) / fmax * 0.92 + 0.09 * u;
}

function bodyColor(sp, u, yn, v, out, seed) {
  const top = new THREE.Color(sp.top), belly = new THREE.Color(sp.belly);
  out.copy(belly).lerp(top, smooth(-0.35, 0.6, yn));
  const sideN = vnoise(u * 30 + seed, v * 8) * 0.12;
  switch (sp.pattern) {
    case 'stripes': {
      const s = Math.sin(u * Math.PI * 2 * 7) > 0.35 && u > 0.18 && u < 0.85 && yn > -0.35;
      if (s) out.multiplyScalar(0.72); break; }
    case 'spots':
      if (yn > -0.1 && u > 0.12 && hash(Math.floor(u * 48), Math.floor(v * 9)) > 0.8) out.multiplyScalar(0.35); break;
    case 'blotch': {
      const n = vnoise(u * 9 + seed, v * 2.6 + 3);
      if (yn > -0.45 && n > 0.58) out.multiplyScalar(0.4);
      if (yn > -0.3 && hash(Math.floor(u * 60), Math.floor(v * 11)) > 0.88) out.multiplyScalar(0.5);
      break; }
    case 'rainbow': {
      const band = Math.exp(-Math.pow((yn - 0.02) / 0.2, 2)) * smooth(0.08, 0.25, u) * 0.75;
      out.lerp(new THREE.Color(0xd8607a), band);
      if (yn > 0.0 && hash(Math.floor(u * 70), Math.floor(v * 13)) > 0.82) out.multiplyScalar(0.35);
      break; }
    case 'koi': {
      const n = vnoise(u * 5.5 + seed * 3, v * 1.8 + seed);
      if (yn > -0.45 && n > 0.48 && u > 0.05 && u < 0.92) out.set(0xd42a12);
      break; }
    case 'scutes': {
      const rows = [0.98, 0.25, -0.5];
      for (const r of rows) if (Math.abs(yn - r) < 0.09 && Math.sin(u * 110) > 0.55 && u > 0.12) out.lerp(new THREE.Color(0xddd6c4), 0.75);
      break; }
  }
  // 侧线、鳃盖、头部加深、细微杂色
  out.multiplyScalar(1 - 0.18 * Math.exp(-Math.pow((yn - 0.18) / 0.05, 2)) * smooth(0.18, 0.3, u));
  out.multiplyScalar(1 - 0.35 * Math.exp(-Math.pow((u - 0.2 - 0.03 * yn) / 0.012, 2)) * (yn > -0.7 ? 1 : 0));
  out.multiplyScalar(1 - 0.18 * (1 - smooth(0.0, 0.18, u)) * smooth(-0.2, 0.6, yn));
  out.multiplyScalar(0.94 + sideN);
}

function addSwim(mat, uniforms) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime; sh.uniforms.uAmp = uniforms.uAmp; sh.uniforms.uSpeed = uniforms.uSpeed;
    sh.vertexShader = 'uniform float uTime;\nuniform float uAmp;\nuniform float uSpeed;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
      float tt = clamp(0.5 - position.x, 0.0, 1.3);
      transformed.z += sin(uTime * uSpeed - tt * 5.5) * uAmp * (0.025 + tt * tt * 0.9);`);
  };
  return mat;
}

// 构建一条体长 = 1 的鱼，头朝 +x，背朝 +y
export function buildFish(sp, seed = Math.random() * 100) {
  const uniforms = { uTime: { value: 0 }, uAmp: { value: 0.06 }, uSpeed: { value: 7 } };
  const group = new THREE.Group();
  const H = sp.height;
  const U = 90, V = 40;
  const verts = [], colors = [], idx = [];
  const c = new THREE.Color();
  for (let i = 0; i <= U; i++) {
    const u = i / U, x = 0.5 - u;
    const h = H * profile(u, sp);
    const w = h * sp.thick * (1 - 0.25 * u);
    const yc = sp.tail === 'shark' ? h * 0.1 * u : 0;
    for (let j = 0; j <= V; j++) {
      const v = (j / V) * Math.PI * 2;
      const sy = Math.sin(v), cz = Math.cos(v);
      const ys = sy > 0 ? 0.52 : 0.48; // 背部略高
      verts.push(x, yc + sy * h * ys, cz * w * 0.5);
      bodyColor(sp, u, sy, j / V * 4, c, seed);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
    const a = i * (V + 1) + j, b = a + V + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const bodyMat = addSwim(new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.32, metalness: sp.metal * 0.6, clearcoat: 0.8, clearcoatRoughness: 0.15,
    sheen: 0.4, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.4,
  }), uniforms);
  const body = new THREE.Mesh(g, bodyMat);
  group.add(body);

  const finMat = addSwim(new THREE.MeshPhysicalMaterial({
    color: sp.fin, roughness: 0.45, metalness: 0.05, transparent: true, opacity: 0.82, side: THREE.DoubleSide, clearcoat: 0.4, depthWrite: true,
  }), uniforms);
  const hAt = u => H * profile(u, sp);
  const addFin = (shape, transform) => {
    const fg = new THREE.ShapeGeometry(shape, 16);
    if (transform) fg.applyMatrix4(transform);
    const m = new THREE.Mesh(fg, finMat); group.add(m); return m;
  };
  // 尾鳍
  const tx = -0.5 + 0.015, th = Math.max(H * 1.0, 0.16);
  const tail = new THREE.Shape();
  if (sp.tail === 'fork') {
    tail.moveTo(tx, 0.05 * H); tail.quadraticCurveTo(tx - 0.08, 0.2 * th, tx - 0.2, 0.55 * th);
    tail.quadraticCurveTo(tx - 0.16, 0.2 * th, tx - 0.12, 0); tail.quadraticCurveTo(tx - 0.16, -0.2 * th, tx - 0.2, -0.55 * th);
    tail.quadraticCurveTo(tx - 0.08, -0.2 * th, tx, -0.05 * H);
  } else if (sp.tail === 'round') {
    tail.moveTo(tx, 0.05 * H); tail.bezierCurveTo(tx - 0.08, 0.45 * th, tx - 0.22, 0.35 * th, tx - 0.2, 0);
    tail.bezierCurveTo(tx - 0.22, -0.35 * th, tx - 0.08, -0.45 * th, tx, -0.05 * H);
  } else { // 鲟类歪尾
    tail.moveTo(tx, 0.08 * H); tail.quadraticCurveTo(tx - 0.1, 0.7 * H, tx - 0.2, 1.4 * H);
    tail.quadraticCurveTo(tx - 0.12, 0.5 * H, tx - 0.07, 0.05 * H); tail.quadraticCurveTo(tx - 0.08, -0.4 * H, tx - 0.1, -0.65 * H); tail.lineTo(tx, -0.06 * H);
  }
  addFin(tail);
  // 背鳍
  const dorsal = new THREE.Shape();
  const d0 = sp.tail === 'shark' ? 0.62 : 0.3, d1 = sp.tail === 'shark' ? 0.75 : 0.62;
  const dh = sp.tail === 'shark' ? 0.08 : H * 0.42;
  dorsal.moveTo(0.5 - d0, hAt(d0) * 0.5 - 0.01);
  dorsal.quadraticCurveTo(0.5 - d0 - 0.02, hAt(d0) * 0.5 + dh * 1.0, 0.5 - d0 - 0.08, hAt(d0 + 0.08) * 0.5 + dh);
  dorsal.quadraticCurveTo(0.5 - (d0 + d1) / 2, hAt((d0 + d1) / 2) * 0.5 + dh * 0.45, 0.5 - d1 - 0.03, hAt(d1) * 0.5 + 0.005);
  dorsal.lineTo(0.5 - d1, hAt(d1) * 0.5 - 0.01);
  addFin(dorsal);
  // 臀鳍
  const anal = new THREE.Shape();
  anal.moveTo(0.5 - 0.66, -hAt(0.66) * 0.48 + 0.01); anal.quadraticCurveTo(0.5 - 0.7, -hAt(0.7) * 0.5 - H * 0.28, 0.5 - 0.8, -hAt(0.8) * 0.5 - H * 0.16);
  anal.lineTo(0.5 - 0.8, -hAt(0.8) * 0.48 + 0.005);
  addFin(anal);
  // 胸鳍、腹鳍（左右）
  for (const sgn of [1, -1]) {
    for (const [u0, yf, len] of [[0.22, -0.12, 0.13], [0.45, -0.42, 0.1]]) {
      const s = new THREE.Shape();
      s.moveTo(0, 0); s.quadraticCurveTo(-len * 0.5, len * 0.35, -len, len * 0.1); s.quadraticCurveTo(-len * 0.6, -len * 0.15, 0, -0.01);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(0.5 - u0, hAt(u0) * yf, sgn * hAt(u0) * sp.thick * 0.48 * Math.sqrt(1 - yf * yf)),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(sgn * 0.5, sgn * 0.5, -0.35)), new THREE.Vector3(1, 1, 1));
      addFin(s, m);
    }
  }
  // 眼睛
  const eu = sp.tail === 'shark' ? 0.06 : 0.085;
  const er = Math.max(0.012, H * 0.075);
  const irisMat = new THREE.MeshPhysicalMaterial({ color: sp.pattern === 'koi' ? 0x222222 : 0xc9a24a, roughness: 0.2, metalness: 0.3, clearcoat: 1 });
  const pupilMat = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.05, clearcoat: 1 });
  for (const sgn of [1, -1]) {
    const ex = 0.5 - eu, ey = hAt(eu) * 0.12, ez = sgn * hAt(eu) * sp.thick * 0.5 * 0.86;
    const ig = new THREE.SphereGeometry(er, 16, 12); ig.scale(1, 1, 0.5); ig.translate(ex, ey, ez);
    const pg = new THREE.SphereGeometry(er * 0.55, 12, 10); pg.scale(1, 1, 0.5); pg.translate(ex, ey, ez + sgn * er * 0.3);
    group.add(new THREE.Mesh(ig, addSwim(irisMat.clone(), uniforms)), new THREE.Mesh(pg, addSwim(pupilMat.clone(), uniforms)));
  }
  group.userData.uniforms = uniforms;
  group.userData.dispose = () => group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return group;
}

// 生成图鉴缩略图（独立的离屏渲染器，完成后释放）
export function makeThumbnails() {
  const W = 240, Hh = 150;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(W, Hh); r.setPixelRatio(1);
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.75; r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.set(1, 2, 3); scene.add(dl);
  const cam = new THREE.PerspectiveCamera(30, W / Hh, 0.1, 10); cam.position.set(0, 0.05, 2.25); cam.lookAt(0, 0, 0);
  const out = {};
  for (const sp of SPECIES) {
    const f = buildFish(sp, 7);
    f.position.x = 0.1; f.rotation.y = -0.25;
    f.userData.uniforms.uTime.value = 0.4;
    scene.add(f);
    r.render(scene, cam);
    out[sp.id] = r.domElement.toDataURL('image/png');
    scene.remove(f); f.userData.dispose();
  }
  pm.dispose(); r.dispose(); r.forceContextLoss();
  return out;
}
