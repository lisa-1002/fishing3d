// 鱼种数据 + 写实程序化鱼模型（比例、鳞片贴图、湿润高光、半透鳍、虹膜眼睛、脊柱游动）
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/addons/RoomEnvironment.js';
import { vnoise, hash, smooth } from './util.js';
import { buildHeroCarp, isHeroSpecies, heroVariantFor } from './fish-hero-carp.js';

export const RARITY = {
  common: { name: '普通', color: '#d5dde2', weight: 62 },
  rare:   { name: '稀有', color: '#4fc3f7', weight: 27 },
  epic:   { name: '史诗', color: '#c77dff', weight: 9 },
  legend: { name: '传说', color: '#ffb300', weight: 2 },
};

// height: 体高/体长；thick: 体宽/体高；shape: 轮廓形态；scale: 鳞片大小
export const SPECIES = [
  { id: 'crucian', name: '鲫鱼', rarity: 'common', method: 'float', w: [0.15, 0.9], price: 8, diff: 1.0, height: 0.46, thick: 0.42, shape: 'deep', scale: 1.1, top: 0x4a4c38, belly: 0xe8e0c0, fin: 0x8a7550, pattern: 'plain', metal: 0.35, tail: 'fork', desc: '湖里最常见的小鱼，肉质细嫩，新手的好朋友。' },
  { id: 'tilapia', name: '罗非鱼', rarity: 'common', method: 'float', w: [0.3, 1.6], price: 10, diff: 1.3, height: 0.44, thick: 0.40, shape: 'deep', scale: 1.0, top: 0x3a4440, belly: 0xc8ccc0, fin: 0x55566a, pattern: 'stripes', metal: 0.25, tail: 'round', desc: '适应力极强，身上有隐约的竖纹。' },
  { id: 'carp', name: '鲤鱼', rarity: 'common', method: 'float', w: [0.8, 6], price: 16, diff: 1.8, height: 0.38, thick: 0.52, shape: 'carp', scale: 1.35, top: 0xb07028, belly: 0xf0d090, fin: 0xc04820, pattern: 'carp', metal: 0.55, tail: 'fork', desc: '鳞片金黄，尾鳍带红，力气不小。玉米是它的最爱。' },
  { id: 'grass', name: '草鱼', rarity: 'common', method: 'float', w: [1, 8], price: 18, diff: 2.0, height: 0.26, thick: 0.58, shape: 'long', scale: 0.95, top: 0x505830, belly: 0xe0d8a8, fin: 0x6a6440, pattern: 'plain', metal: 0.35, tail: 'fork', desc: '体型修长的大块头，冲劲十足。' },
  { id: 'horsemouth', name: '马口鱼', rarity: 'common', method: 'lure', w: [0.05, 0.4], price: 12, diff: 1.2, height: 0.26, thick: 0.42, shape: 'stream', scale: 0.85, top: 0x3a5a6a, belly: 0xf4ece8, fin: 0xd06048, pattern: 'bars', metal: 0.45, tail: 'fork', desc: '溪流里的小霸王，体侧蓝色横斑，追饵积极。' },
  { id: 'perch', name: '鲈鱼', rarity: 'rare', method: 'both', w: [0.5, 3.5], price: 45, diff: 2.4, height: 0.30, thick: 0.48, shape: 'predator', scale: 0.9, top: 0x2e3c34, belly: 0xf0f0e8, fin: 0x4a5048, pattern: 'spots', metal: 0.5, tail: 'fork', predator: true, desc: '背部散布黑点的掠食者，咬钩凶猛。' },
  { id: 'mandarin', name: '鳜鱼', rarity: 'rare', method: 'both', w: [0.4, 2.5], price: 55, diff: 2.6, height: 0.40, thick: 0.40, shape: 'deep', scale: 1.0, top: 0x5c5222, belly: 0xf0e6a0, fin: 0x6a5a30, pattern: 'blotch', metal: 0.2, tail: 'round', predator: true, desc: '“桃花流水鳜鱼肥”，斑纹如豹，偏爱贴底的软虫。' },
  { id: 'trout', name: '虹鳟', rarity: 'rare', method: 'both', w: [0.6, 4], price: 50, diff: 2.8, height: 0.26, thick: 0.55, shape: 'stream', scale: 0.7, top: 0x3a5048, belly: 0xf6f6f0, fin: 0x7a8070, pattern: 'rainbow', metal: 0.45, tail: 'fork', predator: true, desc: '体侧一道玫瑰色彩虹带，冷水中的精灵。' },
  { id: 'culter', name: '翘嘴', rarity: 'rare', method: 'lure', w: [0.5, 5], price: 48, diff: 2.9, height: 0.20, thick: 0.36, shape: 'long', scale: 0.75, top: 0x5a6670, belly: 0xf8f8f4, fin: 0x8a8f96, pattern: 'silver', metal: 0.8, tail: 'fork', predator: true, desc: '嘴巴上翘的银色猎手，最爱追击快速游动的米诺。' },
  { id: 'goldcarp', name: '黄金鲤', rarity: 'epic', method: 'float', w: [2, 10], price: 160, diff: 3.4, height: 0.38, thick: 0.52, shape: 'carp', scale: 1.4, top: 0xe0a010, belly: 0xfff0a0, fin: 0xff8a20, pattern: 'gold', metal: 0.9, tail: 'fork', desc: '通体金光闪闪，据说能带来好运。' },
  { id: 'arowana', name: '金龙鱼', rarity: 'epic', method: 'both', w: [2, 7], price: 190, diff: 3.8, height: 0.22, thick: 0.40, shape: 'long', scale: 1.8, top: 0xb88818, belly: 0xfff0b0, fin: 0xc27022, pattern: 'bigscale', metal: 0.92, tail: 'round', predator: true, desc: '鳞大如币，游姿如龙。' },
  { id: 'snakehead', name: '黑鱼', rarity: 'epic', method: 'lure', w: [1, 8], price: 170, diff: 3.9, height: 0.18, thick: 0.92, shape: 'cyl', scale: 0.55, top: 0x2a3020, belly: 0xc0b898, fin: 0x30352a, pattern: 'snake', metal: 0.12, tail: 'round', predator: true, desc: '水草丛中的伏击者，常在水面炸水攻击波爬和雷蛙。' },
  { id: 'koi', name: '红白锦鲤王', rarity: 'legend', method: 'float', w: [5, 15], price: 650, diff: 4.3, height: 0.36, thick: 0.55, shape: 'carp', scale: 1.3, top: 0xf8f4ec, belly: 0xffffff, fin: 0xf0ece4, pattern: 'koi', metal: 0.18, tail: 'fork', desc: '传说中的湖之守护者，红白分明，极为罕见。' },
  { id: 'sturgeon', name: '千年鳇鱼', rarity: 'legend', method: 'float', w: [40, 160], price: 900, diff: 5.0, height: 0.14, thick: 1.05, shape: 'sturgeon', scale: 0.4, top: 0x3a3e40, belly: 0xd0c8b8, fin: 0x3c4046, pattern: 'scutes', metal: 0.12, tail: 'shark', desc: '远古巨兽，体覆骨板，需要极大的耐心与技巧。' },
  { id: 'gancyu', name: '鳡鱼', rarity: 'legend', method: 'lure', w: [10, 40], price: 750, diff: 4.8, height: 0.17, thick: 0.68, shape: 'long', scale: 0.8, top: 0x6a6440, belly: 0xf4e8b0, fin: 0xb08a3a, pattern: 'silver', metal: 0.55, tail: 'fork', predator: true, desc: '淡水鱼中的“水中老虎”，速度极快，冲刺凶猛。' },
];
export const speciesById = Object.fromEntries(SPECIES.map(s => [s.id, s]));

// ---------- 体型轮廓（按种类定制） ----------
function profile(u, sp) {
  // u: 0=头 1=尾；返回体高系数
  let a = 0.45, b = 0.95, boost = 0.92, tip = 0.08;
  switch (sp.shape) {
    case 'deep':     a = 0.55; b = 0.85; boost = 1.0; tip = 0.06; break;   // 鲫/鳜：深体短头
    case 'carp':     a = 0.5;  b = 0.8;  boost = 1.05; tip = 0.07; break;  // 鲤/锦鲤：圆润
    case 'long':     a = 0.35; b = 1.15; boost = 0.88; tip = 0.1; break;   // 草/翘嘴/龙鱼
    case 'stream':   a = 0.4;  b = 1.0;  boost = 0.9; tip = 0.08; break;
    case 'predator': a = 0.42; b = 0.95; boost = 0.92; tip = 0.09; break;
    case 'cyl':      a = 0.3;  b = 1.2;  boost = 0.85; tip = 0.12; break;  // 黑鱼：近似圆柱
    case 'sturgeon': a = 0.28; b = 1.4;  boost = 0.8; tip = 0.15; break;  // 鲟：细长
  }
  const um = a / (a + b), fmax = Math.pow(um, a) * Math.pow(1 - um, b);
  return (Math.pow(Math.max(u, 1e-4), a) * Math.pow(Math.max(1 - u, 1e-4), b)) / fmax * boost + tip * u;
}

function thickAt(u, sp) {
  // 头尾更扁、中段更圆；黑鱼/鲟几乎全程圆
  const base = sp.thick;
  if (sp.shape === 'cyl') return base * (0.9 + 0.1 * Math.sin(u * Math.PI));
  if (sp.shape === 'sturgeon') return base * (0.85 + 0.15 * (1 - Math.abs(u - 0.35)));
  const mid = 1 - 0.35 * Math.pow(u - 0.35, 2) * 4;
  return base * (0.75 + 0.25 * mid) * (1 - 0.28 * u);
}

// ---------- 颜色与花纹（软边缘） ----------
function bodyColor(sp, u, yn, v, out, seed) {
  const top = new THREE.Color(sp.top), belly = new THREE.Color(sp.belly);
  // 背深腹浅：更平滑的过渡
  const grad = smooth(-0.55, 0.55, yn);
  out.copy(belly).lerp(top, grad);
  // 腹部微暖光
  if (yn < -0.2) out.lerp(new THREE.Color(0xfff8e8), (-yn - 0.2) * 0.18);

  switch (sp.pattern) {
    case 'carp': {
      // 金黄鲤：背部偏褐，鳞缘暗边靠贴图；体侧金色
      out.lerp(new THREE.Color(0xd4922a), smooth(-0.2, 0.5, yn) * 0.55);
      out.lerp(new THREE.Color(0x6a4010), smooth(0.35, 0.9, yn) * 0.4);
      break;
    }
    case 'gold': {
      out.lerp(new THREE.Color(0xffd040), 0.55);
      out.lerp(new THREE.Color(0xffa010), smooth(0.2, 0.8, yn) * 0.35);
      break;
    }
    case 'bigscale': {
      out.lerp(new THREE.Color(0xd4a020), 0.35);
      break;
    }
    case 'silver': {
      out.lerp(new THREE.Color(0xc8d0d8), 0.4 * (1 - Math.abs(yn)));
      break;
    }
    case 'stripes': {
      const band = Math.sin(u * Math.PI * 2 * 7.5);
      const m = smooth(0.15, 0.45, band) * smooth(0.12, 0.25, u) * smooth(0.15, 0.35, 1 - u) * smooth(-0.45, 0.1, yn);
      out.multiplyScalar(1 - 0.35 * m);
      break;
    }
    case 'spots': {
      // 鲈鱼：不规则小黑点（软边缘）
      for (let k = 0; k < 3; k++) {
        const cx = hash(Math.floor(u * 40 + k * 17), Math.floor(v * 8 + k * 9));
        const cy = hash(Math.floor(u * 40 + k * 17) + 3, Math.floor(v * 8 + k * 9) + 5);
        const px = (Math.floor(u * 40) + cx) / 40, py = ((Math.floor(v * 8) + cy) / 8) * 2 - 1;
        const d = Math.hypot((u - px) * 28, (yn - py * 0.7) * 6);
        if (d < 1.2 && yn > -0.25 && u > 0.1 && u < 0.88) out.multiplyScalar(1 - 0.55 * smooth(1.2, 0.2, d));
      }
      break;
    }
    case 'blotch': {
      // 鳜鱼豹斑：噪声软边大斑 + 小点
      const n = vnoise(u * 8 + seed, yn * 3.2 + seed * 0.3);
      const n2 = vnoise(u * 18 + 4, yn * 7 + 2);
      if (yn > -0.5 && u > 0.08 && u < 0.9) {
        out.multiplyScalar(1 - 0.55 * smooth(0.48, 0.72, n));
        out.multiplyScalar(1 - 0.35 * smooth(0.62, 0.8, n2));
      }
      break;
    }
    case 'rainbow': {
      // 虹鳟：玫瑰侧带 + 小黑点 + 橄榄背
      const band = Math.exp(-Math.pow((yn - 0.05) / 0.22, 2)) * smooth(0.06, 0.22, u) * smooth(0.08, 0.25, 1 - u);
      out.lerp(new THREE.Color(0xd85878), band * 0.85);
      out.lerp(new THREE.Color(0x88c060), band * 0.25); // 侧带外缘微绿
      const sx = hash(Math.floor(u * 72), Math.floor(v * 14));
      if (yn > -0.15 && u > 0.1 && sx > 0.78) {
        const soft = smooth(0.78, 0.95, sx);
        out.multiplyScalar(1 - 0.55 * soft);
      }
      break;
    }
    case 'bars': {
      const band = Math.sin(u * Math.PI * 2 * 8.5);
      const m = smooth(0.1, 0.55, band) * smooth(0.15, 0.3, u) * smooth(0.12, 0.28, 1 - u) * smooth(-0.35, 0.15, yn);
      out.lerp(new THREE.Color(0x2a5a9a), m * 0.7);
      if (yn < -0.05 && yn > -0.65) out.lerp(new THREE.Color(0xe07868), 0.28);
      break;
    }
    case 'snake': {
      // 黑鱼：不规则深色云斑
      const n = vnoise(u * 10 + seed, yn * 4 + seed);
      const n2 = vnoise(u * 22 + 7, yn * 9);
      if (yn > -0.6) {
        out.multiplyScalar(1 - 0.55 * smooth(0.42, 0.7, n));
        out.multiplyScalar(1 - 0.25 * smooth(0.55, 0.8, n2));
      }
      // 头部更深
      out.multiplyScalar(1 - 0.25 * (1 - smooth(0, 0.22, u)));
      break;
    }
    case 'koi': {
      // 红白锦鲤：大块红斑，噪声软边（非硬切）
      const n = vnoise(u * 4.2 + seed * 2.7, yn * 1.6 + seed);
      const n2 = vnoise(u * 7.5 + seed, yn * 2.8 + 3);
      const patch = smooth(0.38, 0.62, n) * smooth(0.2, 0.55, n2 + 0.3);
      const mask = patch * smooth(0.04, 0.12, u) * smooth(0.05, 0.15, 1 - u) * smooth(-0.55, 0.15, yn);
      out.lerp(new THREE.Color(0xd42018), mask);
      // 红斑边缘略深
      out.lerp(new THREE.Color(0x8a1008), mask * (1 - smooth(0.5, 0.85, patch)) * 0.4);
      break;
    }
    case 'scutes': {
      // 鲟骨板：五行菱形骨板
      const rows = [0.92, 0.35, 0.0, -0.35, -0.72];
      for (const r of rows) {
        const dy = Math.abs(yn - r);
        const along = Math.sin(u * Math.PI * 2 * 9 + r * 4);
        if (dy < 0.1 && along > 0.25 && u > 0.1 && u < 0.92) {
          const soft = smooth(0.1, 0.02, dy) * smooth(0.25, 0.7, along);
          out.lerp(new THREE.Color(0xe0d8c8), soft * 0.85);
        }
      }
      break;
    }
  }
  // 侧线
  out.multiplyScalar(1 - 0.16 * Math.exp(-Math.pow((yn - 0.12) / 0.045, 2)) * smooth(0.15, 0.28, u) * smooth(0.1, 0.25, 1 - u));
  // 鳃盖弧线
  const gill = Math.exp(-Math.pow((u - 0.18 - 0.02 * yn) / 0.014, 2));
  out.multiplyScalar(1 - 0.32 * gill * smooth(-0.6, 0.5, yn));
  // 头部略深
  out.multiplyScalar(1 - 0.16 * (1 - smooth(0.0, 0.2, u)) * smooth(-0.3, 0.55, yn));
  // 嘴部
  if (u < 0.04) out.lerp(new THREE.Color(0x2a2018), (1 - u / 0.04) * 0.5);
  // 细微杂色
  out.multiplyScalar(0.94 + vnoise(u * 28 + seed, yn * 10) * 0.12);
}

// ---------- 程序化贴图（鳞片 / 鳍脉） ----------
const texCache = new Map();

function makeScaleMaps(sp, seed) {
  const key = `${sp.id}_${(seed * 10) | 0}`;
  if (texCache.has(key)) return texCache.get(key);
  const W = 256, H = 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // 底色中灰，方便与 vertexColors 相乘
  g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, W, H);

  const scaleSz = Math.max(6, Math.round(14 / (sp.scale || 1)));
  const rows = Math.ceil(H / (scaleSz * 0.72)) + 2;
  const cols = Math.ceil(W / scaleSz) + 2;
  const isScute = sp.pattern === 'scutes';
  const isBig = sp.pattern === 'bigscale' || sp.pattern === 'carp' || sp.pattern === 'gold' || sp.pattern === 'koi';

  for (let row = 0; row < rows; row++) {
    const y = row * scaleSz * 0.72;
    const off = (row % 2) * (scaleSz * 0.5);
    for (let col = -1; col < cols; col++) {
      const x = col * scaleSz + off;
      const sx = x + scaleSz * 0.5, sy = y + scaleSz * 0.55;
      // 鳞片明暗
      const shade = 0.82 + hash(row + seed, col + seed * 3) * 0.22;
      const edge = isScute ? 0.55 : 0.72;
      if (isScute) {
        // 菱形骨板
        g.fillStyle = `rgb(${(shade * 200) | 0},${(shade * 195) | 0},${(shade * 185) | 0})`;
        g.beginPath();
        g.moveTo(sx, sy - scaleSz * 0.45); g.lineTo(sx + scaleSz * 0.4, sy);
        g.lineTo(sx, sy + scaleSz * 0.45); g.lineTo(sx - scaleSz * 0.4, sy); g.closePath();
        g.fill();
        g.strokeStyle = `rgba(40,40,40,${0.35})`; g.lineWidth = 1.2; g.stroke();
      } else {
        // 圆鳞：径向渐变模拟立体感 + 暗边缘
        const r = scaleSz * (isBig ? 0.52 : 0.46);
        const grd = g.createRadialGradient(sx - r * 0.15, sy - r * 0.2, r * 0.1, sx, sy, r);
        const hi = Math.min(255, (shade * 255) | 0);
        const lo = Math.min(255, (shade * edge * 200) | 0);
        grd.addColorStop(0, `rgb(${hi},${hi},${hi})`);
        grd.addColorStop(0.55, `rgb(${(hi * 0.92) | 0},${(hi * 0.92) | 0},${(hi * 0.92) | 0})`);
        grd.addColorStop(0.85, `rgb(${lo},${lo},${lo})`);
        grd.addColorStop(1, `rgba(${(lo * 0.5) | 0},${(lo * 0.5) | 0},${(lo * 0.5) | 0},0.9)`);
        g.fillStyle = grd;
        g.beginPath(); g.ellipse(sx, sy, r, r * 0.85, 0, 0, Math.PI * 2); g.fill();
        // 鳞缘暗线
        g.strokeStyle = `rgba(20,15,10,${isBig ? 0.35 : 0.22})`;
        g.lineWidth = isBig ? 1.4 : 0.8;
        g.beginPath(); g.ellipse(sx, sy, r * 0.95, r * 0.8, 0, 0.15, Math.PI - 0.15); g.stroke();
      }
    }
  }
  // 细噪声
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 2;

  // bump：从同一画布取亮度作灰度
  const bc = document.createElement('canvas'); bc.width = W; bc.height = H;
  const bg = bc.getContext('2d'); bg.drawImage(c, 0, 0);
  const bump = new THREE.CanvasTexture(bc);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;

  const out = { map, bump };
  texCache.set(key, out);
  return out;
}

function makeFinTexture(finColor) {
  const key = 'fin_' + finColor.toString(16);
  if (texCache.has(key)) return texCache.get(key);
  const W = 128, H = 128;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const col = new THREE.Color(finColor);
  // 半透明底
  g.fillStyle = `rgba(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0},0.55)`;
  g.fillRect(0, 0, W, H);
  // 鳍脉：从左向右放射
  g.strokeStyle = `rgba(${(col.r * 80) | 0},${(col.g * 80) | 0},${(col.b * 80) | 0},0.55)`;
  g.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    const y0 = 10 + i * 12;
    g.beginPath(); g.moveTo(4, H * 0.5);
    g.quadraticCurveTo(W * 0.4, y0, W - 4, y0 + (i - 4) * 2);
    g.stroke();
  }
  // 边缘加深
  const grd = g.createLinearGradient(0, 0, W, 0);
  grd.addColorStop(0, 'rgba(0,0,0,0.15)');
  grd.addColorStop(0.7, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  // alpha 图
  const ac = document.createElement('canvas'); ac.width = W; ac.height = H;
  const ag = ac.getContext('2d');
  ag.fillStyle = '#fff'; ag.fillRect(0, 0, W, H);
  // 边缘羽化
  const fade = ag.createLinearGradient(0, 0, W, 0);
  fade.addColorStop(0, '#ffffff'); fade.addColorStop(0.75, '#e0e0e0'); fade.addColorStop(1, '#606060');
  ag.fillStyle = fade; ag.fillRect(0, 0, W, H);
  const alpha = new THREE.CanvasTexture(ac);
  const out = { map, alpha };
  texCache.set(key, out);
  return out;
}

// ---------- 游泳着色器：脊柱弯曲 + 鳍颤动 ----------
function addSwim(mat, uniforms, isFin = false) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uAmp = uniforms.uAmp;
    sh.uniforms.uSpeed = uniforms.uSpeed;
    sh.uniforms.uLeap = uniforms.uLeap;
    const finFlag = isFin ? '1.0' : '0.0';
    sh.vertexShader = `uniform float uTime;\nuniform float uAmp;\nuniform float uSpeed;\nuniform float uLeap;\n` +
      sh.vertexShader.replace('#include <begin_vertex>',
        `#include <begin_vertex>
        // 头朝 +x，尾在 -x；t=0 在头，t≈1 在尾
        float t = clamp(0.5 - position.x, 0.0, 1.2);
        float wave = sin(uTime * uSpeed - t * 5.8);
        float wave2 = sin(uTime * uSpeed * 1.7 - t * 9.0);
        float spine = uAmp * (0.02 + t * t * 0.95);
        // 主脊柱左右摆 + 轻微上下
        transformed.z += wave * spine;
        transformed.y += wave2 * spine * 0.12;
        // 跃水时加大身体弧度（弓背）
        transformed.y += uLeap * sin(t * 3.14159) * 0.08;
        transformed.z += uLeap * wave * t * 0.04;
        // 鳍额外高频颤动
        float finMul = ${finFlag};
        transformed.z += wave2 * uAmp * 0.35 * finMul * (0.3 + t);
        transformed.y += sin(uTime * uSpeed * 2.4 + position.y * 20.0) * uAmp * 0.18 * finMul;`);
  };
  mat.customProgramCacheKey = () => 'fishSwim_v3_' + (isFin ? 'fin' : 'body');
  return mat;
}

// ---------- 构建鱼 ----------
export function buildFish(sp, seed = Math.random() * 100) {
  if (isHeroSpecies(sp.id)) return buildHeroCarp(heroVariantFor(sp.id), seed);
  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.055 },
    uSpeed: { value: 6.5 },
    uLeap: { value: 0 },
  };
  const group = new THREE.Group();
  const H = sp.height;
  // 几何分辨率：兼顾写实与手机性能
  const U = 96, V = 48;
  const verts = [], colors = [], uvs = [], idx = [];
  const c = new THREE.Color();

  for (let i = 0; i <= U; i++) {
    const u = i / U, x = 0.5 - u;
    const h = H * profile(u, sp);
    const w = h * thickAt(u, sp);
    // 鲟：背略抬；鲤：中段更鼓
    let yc = 0;
    if (sp.shape === 'sturgeon') yc = h * 0.12 * u;
    else if (sp.shape === 'carp') yc = h * 0.04 * Math.sin(u * Math.PI);
    for (let j = 0; j <= V; j++) {
      const v = (j / V) * Math.PI * 2;
      const sy = Math.sin(v), cz = Math.cos(v);
      // 背部略尖、腹部略圆
      const ys = sy > 0 ? (sp.shape === 'cyl' ? 0.5 : 0.54) : (sp.shape === 'cyl' ? 0.5 : 0.46);
      const zs = sp.shape === 'cyl' || sp.shape === 'sturgeon' ? 0.52 : 0.48;
      verts.push(x, yc + sy * h * ys, cz * w * zs);
      bodyColor(sp, u, sy, j / V * 4, c, seed);
      colors.push(c.r, c.g, c.b);
      // UV：沿体长 × 环向，鳞片贴图平铺
      uvs.push(u * 4.5 * (sp.scale || 1), (j / V) * 3.2 * (sp.scale || 1));
    }
  }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
    const a = i * (V + 1) + j, b = a + V + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const scales = makeScaleMaps(sp, seed);
  const wetMetal = Math.min(0.95, sp.metal * 0.55);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    map: scales.map,
    bumpMap: scales.bump,
    bumpScale: sp.pattern === 'scutes' ? 0.018 : (sp.pattern === 'bigscale' ? 0.014 : 0.009),
    roughness: 0.22 + (1 - sp.metal) * 0.2,
    metalness: wetMetal,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    sheen: 0.55,
    sheenColor: new THREE.Color(0xfff5e6),
    sheenRoughness: 0.35,
    envMapIntensity: 0.9,
  });
  bodyMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uAmp = uniforms.uAmp;
    sh.uniforms.uSpeed = uniforms.uSpeed;
    sh.uniforms.uLeap = uniforms.uLeap;
    sh.vertexShader = `uniform float uTime;\nuniform float uAmp;\nuniform float uSpeed;\nuniform float uLeap;\n` +
      sh.vertexShader.replace('#include <begin_vertex>',
        `#include <begin_vertex>
        float t = clamp(0.5 - position.x, 0.0, 1.2);
        float wave = sin(uTime * uSpeed - t * 5.8);
        float wave2 = sin(uTime * uSpeed * 1.7 - t * 9.0);
        float spine = uAmp * (0.02 + t * t * 0.95);
        transformed.z += wave * spine;
        transformed.y += wave2 * spine * 0.12;
        transformed.y += uLeap * sin(t * 3.14159) * 0.08;
        transformed.z += uLeap * wave * t * 0.04;`);
  };
  bodyMat.customProgramCacheKey = () => 'fishBody_v4';

  const body = new THREE.Mesh(geo, bodyMat);
  group.add(body);

  // ---------- 鳍 ----------
  // 浅色鳍略加深，避免在白/金色鱼身上“消失”
  const finCol = new THREE.Color(sp.fin);
  if (finCol.r + finCol.g + finCol.b > 2.2) finCol.multiplyScalar(0.72);
  const finTex = makeFinTexture(finCol.getHex());
  const finMat = addSwim(new THREE.MeshPhysicalMaterial({
    map: finTex.map,
    alphaMap: finTex.alpha,
    color: finCol,
    roughness: 0.32,
    metalness: 0.05,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    clearcoat: 0.65,
    clearcoatRoughness: 0.22,
    depthWrite: true,
    alphaTest: 0.08,
  }), uniforms, true);

  const hAt = u => H * profile(u, sp);
  const addFin = (shape, transform, segs = 20) => {
    const fg = new THREE.ShapeGeometry(shape, segs);
    // UV 已由 ShapeGeometry 生成
    if (transform) fg.applyMatrix4(transform);
    const m = new THREE.Mesh(fg, finMat);
    group.add(m);
    return m;
  };

  // 尾鳍
  const tx = -0.5 + 0.012, th = Math.max(H * 1.05, 0.17);
  const tail = new THREE.Shape();
  if (sp.tail === 'fork') {
    tail.moveTo(tx, 0.04 * H);
    tail.quadraticCurveTo(tx - 0.1, 0.25 * th, tx - 0.22, 0.62 * th);
    tail.quadraticCurveTo(tx - 0.14, 0.18 * th, tx - 0.1, 0);
    tail.quadraticCurveTo(tx - 0.14, -0.18 * th, tx - 0.22, -0.62 * th);
    tail.quadraticCurveTo(tx - 0.1, -0.25 * th, tx, -0.04 * H);
  } else if (sp.tail === 'round') {
    tail.moveTo(tx, 0.04 * H);
    tail.bezierCurveTo(tx - 0.1, 0.5 * th, tx - 0.24, 0.38 * th, tx - 0.22, 0);
    tail.bezierCurveTo(tx - 0.24, -0.38 * th, tx - 0.1, -0.5 * th, tx, -0.04 * H);
  } else {
    // 鲟歪尾（上叶更长）
    tail.moveTo(tx, 0.06 * H);
    tail.quadraticCurveTo(tx - 0.12, 0.9 * H, tx - 0.22, 1.55 * H);
    tail.quadraticCurveTo(tx - 0.14, 0.55 * H, tx - 0.06, 0.04 * H);
    tail.quadraticCurveTo(tx - 0.1, -0.45 * H, tx - 0.12, -0.7 * H);
    tail.lineTo(tx, -0.05 * H);
  }
  addFin(tail);

  // 背鳍
  const dorsal = new THREE.Shape();
  let d0 = 0.28, d1 = 0.62, dh = H * 0.45;
  if (sp.tail === 'shark') { d0 = 0.6; d1 = 0.78; dh = 0.09; }
  else if (sp.shape === 'cyl') { d0 = 0.25; d1 = 0.7; dh = H * 0.55; } // 黑鱼长背鳍
  else if (sp.shape === 'deep') { dh = H * 0.38; }
  dorsal.moveTo(0.5 - d0, hAt(d0) * 0.52);
  dorsal.quadraticCurveTo(0.5 - d0 - 0.03, hAt(d0) * 0.52 + dh * 1.05, 0.5 - d0 - 0.1, hAt(d0 + 0.1) * 0.52 + dh);
  dorsal.quadraticCurveTo(0.5 - (d0 + d1) / 2, hAt((d0 + d1) / 2) * 0.52 + dh * 0.4, 0.5 - d1, hAt(d1) * 0.52);
  dorsal.lineTo(0.5 - d1 + 0.01, hAt(d1) * 0.5);
  addFin(dorsal);

  // 臀鳍
  const anal = new THREE.Shape();
  const a0 = sp.shape === 'cyl' ? 0.45 : 0.62, a1 = 0.82;
  anal.moveTo(0.5 - a0, -hAt(a0) * 0.48);
  anal.quadraticCurveTo(0.5 - a0 - 0.04, -hAt(a0) * 0.5 - H * 0.32, 0.5 - a1, -hAt(a1) * 0.5 - H * 0.18);
  anal.lineTo(0.5 - a1, -hAt(a1) * 0.46);
  addFin(anal);

  // 脂鳍（虹鳟）
  if (sp.pattern === 'rainbow') {
    const ad = new THREE.Shape();
    ad.moveTo(0.5 - 0.72, hAt(0.72) * 0.5);
    ad.quadraticCurveTo(0.5 - 0.76, hAt(0.76) * 0.5 + H * 0.12, 0.5 - 0.82, hAt(0.82) * 0.5 + H * 0.06);
    ad.lineTo(0.5 - 0.8, hAt(0.8) * 0.48);
    addFin(ad);
  }

  // 胸鳍、腹鳍
  for (const sgn of [1, -1]) {
    for (const [u0, yf, len, ang] of [[0.2, -0.08, 0.15, 0.55], [0.42, -0.4, 0.11, 0.35]]) {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.quadraticCurveTo(-len * 0.45, len * 0.4, -len, len * 0.12);
      s.quadraticCurveTo(-len * 0.55, -len * 0.12, 0, -0.008);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(0.5 - u0, hAt(u0) * yf, sgn * hAt(u0) * thickAt(u0, sp) * 0.5 * Math.sqrt(Math.max(0.05, 1 - yf * yf))),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(sgn * ang, sgn * 0.55, -0.4)),
        new THREE.Vector3(1, 1, 1));
      addFin(s, m);
    }
  }

  // ---------- 眼睛：巩膜 + 虹膜 + 瞳孔 + 湿润高光 ----------
  const eu = sp.shape === 'sturgeon' ? 0.055 : (sp.shape === 'cyl' ? 0.07 : 0.09);
  const er = Math.max(0.011, H * (sp.shape === 'deep' ? 0.07 : 0.065));
  const irisCol = sp.pattern === 'koi' ? 0x1a1a1a : (sp.pattern === 'snake' ? 0xc8a040 : 0xc9a24a);
  const scleraMat = new THREE.MeshPhysicalMaterial({ color: 0xf2efe6, roughness: 0.35, clearcoat: 0.8 });
  const irisMat = new THREE.MeshPhysicalMaterial({ color: irisCol, roughness: 0.25, metalness: 0.25, clearcoat: 1 });
  const pupilMat = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.05, clearcoat: 1 });
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (const sgn of [1, -1]) {
    const eye = new THREE.Group();
    const ex = 0.5 - eu, ey = hAt(eu) * (sp.shape === 'cyl' ? 0.22 : 0.12);
    const ez = sgn * hAt(eu) * thickAt(eu, sp) * 0.5 * 0.9;
    eye.position.set(ex, ey, ez);
    // 眼睛朝外（±Z）
    eye.rotation.y = sgn * 0.15;

    // 巩膜只露出一圈细环，主体是虹膜
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(er * 1.02, 14, 10), addSwim(scleraMat.clone(), uniforms));
    sclera.scale.set(0.55, 0.9, 0.35);
    eye.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(er * 0.92, 16, 12), addSwim(irisMat.clone(), uniforms));
    iris.scale.set(0.55, 0.95, 0.42);
    iris.position.z = sgn * er * 0.28;
    eye.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(er * 0.42, 12, 10), addSwim(pupilMat.clone(), uniforms));
    pupil.scale.set(0.55, 0.95, 0.35);
    pupil.position.z = sgn * er * 0.48;
    eye.add(pupil);

    // 角膜高光
    const hi = new THREE.Mesh(new THREE.SphereGeometry(er * 0.16, 8, 6), highlightMat);
    hi.position.set(er * 0.18, er * 0.28, sgn * er * 0.62);
    eye.add(hi);
    const hi2 = new THREE.Mesh(new THREE.SphereGeometry(er * 0.07, 6, 5), highlightMat);
    hi2.position.set(-er * 0.05, -er * 0.08, sgn * er * 0.58);
    eye.add(hi2);

    group.add(eye);
  }

  // 翘嘴：略上翘的下颌暗示（小凸起）
  if (sp.id === 'culter') {
    const jaw = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 10, 8),
      addSwim(new THREE.MeshPhysicalMaterial({ color: 0xe8e8e0, roughness: 0.4, clearcoat: 0.5 }), uniforms));
    jaw.scale.set(1.4, 0.45, 0.7);
    jaw.position.set(0.48, -hAt(0.02) * 0.35, 0);
    group.add(jaw);
  }

  group.userData.uniforms = uniforms;
  group.userData.dispose = () => {
    group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      // 材质贴图由缓存共享，不在此 dispose 贴图
      if (o.material && !o.material.map) o.material.dispose();
      else if (o.material) o.material.dispose();
    });
  };
  return group;
}

// ---------- 图鉴缩略图 ----------
export function makeThumbnails() {
  const W = 280, Hh = 168;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(W, Hh); r.setPixelRatio(1);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.85;
  r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;
  const dl = new THREE.DirectionalLight(0xfff2dd, 1.8); dl.position.set(2, 3, 4); scene.add(dl);
  const fill = new THREE.DirectionalLight(0xa0c0ff, 0.45); fill.position.set(-2, 1, -1); scene.add(fill);
  const hemi = new THREE.HemisphereLight(0xd0e8ff, 0x403020, 0.4); scene.add(hemi);
  const cam = new THREE.PerspectiveCamera(28, W / Hh, 0.1, 10);
  cam.position.set(0.15, 0.08, 2.15); cam.lookAt(0.05, 0, 0);
  const out = {};
  for (const sp of SPECIES) {
    const f = buildFish(sp, 7);
    f.position.set(0.05, 0, 0);
    f.rotation.y = -0.35;
    f.rotation.z = 0.05;
    f.userData.uniforms.uTime.value = 0.55;
    f.userData.uniforms.uAmp.value = 0.04;
    scene.add(f);
    r.render(scene, cam);
    out[sp.id] = r.domElement.toDataURL('image/png');
    scene.remove(f); f.userData.dispose();
  }
  pm.dispose(); r.dispose(); r.forceContextLoss();
  return out;
}
