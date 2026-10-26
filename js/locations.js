// 钓点 / 地图：视觉主题 + 鱼种权重 + 传说钥匙推进
// 解锁链：湖湾 → 溪流 → 湿地 → 夜钓 → 大坝 → 近海码头 → 热带礁盘 → 外海拖钓
// （当前图钓到传说 → 获得下一站钥匙 → 交给黑衣人开船）
import { SCAN_SPECIES, SCAN_SPOT } from './scan-catalog.js?v=15';

function withScans(locId, base) {
  const w = { ...base };
  for (const sp of SCAN_SPECIES) {
    if (!sp.places.includes(locId)) continue;
    if (w[sp.id] == null) w[sp.id] = SCAN_SPOT[sp.id] ?? 1;
  }
  return w;
}

export const LOCATION_ORDER = ['lake', 'stream', 'marsh', 'night', 'dam', 'coast', 'reef', 'offshore'];

export const LOCATIONS = [
  {
    id: 'lake',
    name: '宁静湖湾',
    tag: '新手',
    desc: '开阔湖面，水草丰美。适合台钓入门，鲤鲫草鲢都有机会。',
    keyName: null,
    nextId: 'stream',
    waitMul: 1.0,
    biteWin: 1.0,
    theme: {
      sunElev: 13.5, sunAz: 160, turbidity: 2.8, rayleigh: 2.2, mie: 0.004,
      haze: 0xb0c0ce, fogNear: 120, fogFar: 3200,
      water: 0x0e2a28, sunColor: 0xfff1d6, exposure: 0.5,
      hemiSky: 0xbcd4ff, hemiGround: 0x4a4030,
      terrainMul: [1, 1, 1], reedBoost: 1, night: false,
    },
    weights: withScans('lake', {
      crucian: 1.4, tilapia: 1.2, carp: 1.3, grass: 1.2, silvercarp: 1.1, bighead: 1.0, bream: 1.1, mudcarp: 1.2,
      perch: 1.0, mandarin: 0.9, goldcarp: 1.0, koi: 1.0, sturgeon: 0.7,
      horsemouth: 0.4, bleak: 0.6, loach: 0.5,
    }),
  },
  {
    id: 'stream',
    name: '溪流浅滩',
    tag: '清水',
    desc: '清澈见底的山溪浅滩，白条马口活跃，适合轻量露亚。',
    keyName: '溪流钥匙',
    nextId: 'marsh',
    waitMul: 0.75,
    biteWin: 1.15,
    theme: {
      sunElev: 22, sunAz: 140, turbidity: 1.6, rayleigh: 1.4, mie: 0.0025,
      haze: 0xc8d8e8, fogNear: 80, fogFar: 2200,
      water: 0x1a4a55, sunColor: 0xfff8e8, exposure: 0.58,
      hemiSky: 0xd0e8ff, hemiGround: 0x5a5040,
      terrainMul: [0.95, 1.05, 0.9], reedBoost: 0.35, night: false,
    },
    weights: withScans('stream', {
      horsemouth: 2.5, bleak: 2.2, crucian: 0.8, trout: 1.8, culter: 1.2,
      perch: 1.1, mandarin: 0.6, carp: 0.3, grass: 0.2, snakehead: 0.2,
      loach: 1.4, catfish: 0.3, stur: 0.4, tilapia: 0.5,
      gancyu: 0.5, arowana: 0.3,
    }),
  },
  {
    id: 'marsh',
    name: '芦苇湿地',
    tag: '浑水',
    desc: '芦苇丛生、水质浑浊。鲶鱼黄颡泥鳅出没，鲤草也多。',
    keyName: '湿地钥匙',
    nextId: 'night',
    waitMul: 1.25,
    biteWin: 0.9,
    theme: {
      sunElev: 28, sunAz: 175, turbidity: 4.5, rayleigh: 1.8, mie: 0.006,
      haze: 0xa8b090, fogNear: 60, fogFar: 1800,
      water: 0x1a2a18, sunColor: 0xffe8c0, exposure: 0.48,
      hemiSky: 0xc8d0a8, hemiGround: 0x3a3420,
      terrainMul: [0.85, 1.1, 0.75], reedBoost: 2.2, night: false,
    },
    weights: withScans('marsh', {
      carp: 1.6, grass: 1.3, catfish: 2.2, yellowcat: 2.0, loach: 2.0, eel: 1.6,
      snakehead: 1.8, softshell: 1.5, crucian: 1.2, bream: 1.0, tilapia: 0.8,
      mandarin: 1.1, goldcarp: 0.8, perch: 0.5, trout: 0.2, bleak: 0.3,
    }),
  },
  {
    id: 'night',
    name: '深潭夜钓',
    tag: '夜间',
    desc: '月色下的深潭。鲶鳝甲鱼活跃，偶遇大型夜行掠食者。',
    keyName: '夜潭钥匙',
    nextId: 'dam',
    waitMul: 1.4,
    biteWin: 0.85,
    theme: {
      sunElev: -8, sunAz: 200, turbidity: 1.2, rayleigh: 0.4, mie: 0.001,
      haze: 0x1a2230, fogNear: 40, fogFar: 1400,
      water: 0x061018, sunColor: 0xa0b8d8, exposure: 0.32,
      hemiSky: 0x304060, hemiGround: 0x1a1810,
      terrainMul: [0.55, 0.55, 0.65], reedBoost: 0.8, night: true, moon: true,
    },
    weights: withScans('night', {
      catfish: 2.4, eel: 2.2, softshell: 2.0, yellowcat: 1.8, snakehead: 1.6,
      carp: 1.0, loach: 1.2, mandarin: 1.3, perch: 0.8, stur: 1.5,
      sturgeon: 1.2, gancyu: 1.0, koi: 0.6, goldcarp: 0.5, arowana: 0.8,
      crucian: 0.4, bleak: 0.2, horsemouth: 0.1, trout: 0.3,
    }),
  },
  {
    id: 'dam',
    name: '水库大坝',
    tag: '巨物',
    desc: '高坝深水区，鲢鳙青鱼成群，大型掠食鱼潜伏。挑战最高。',
    keyName: '大坝钥匙',
    nextId: 'coast',
    waitMul: 1.15,
    biteWin: 0.95,
    theme: {
      sunElev: 16, sunAz: 110, turbidity: 3.2, rayleigh: 2.0, mie: 0.0045,
      haze: 0x9eb0c0, fogNear: 150, fogFar: 3800,
      water: 0x0a2838, sunColor: 0xffe0b0, exposure: 0.52,
      hemiSky: 0xb0c8e0, hemiGround: 0x4a4038,
      terrainMul: [0.9, 0.85, 1.05], reedBoost: 0.5, night: false,
    },
    weights: withScans('dam', {
      silvercarp: 2.0, bighead: 2.0, blackcarp: 2.2, grass: 1.4, carp: 1.0,
      culter: 1.6, redtail: 1.8, pike: 1.7, taimen: 1.5, gancyu: 1.4,
      sturgeon: 1.5, arowana: 1.0, perch: 1.0, mandarin: 0.8, trout: 0.6,
      icefish: 1.2, crucian: 0.5, horsemouth: 0.3, catfish: 0.8,
    }),
  },
  {
    id: 'coast',
    name: '近海码头',
    tag: '海钓',
    desc: '防波堤外的灰蓝海水。鲷、鲻、鲭和贴底的鲽都在码头灯下。',
    keyName: '近海钥匙',
    nextId: 'reef',
    waitMul: 1.05,
    biteWin: 0.95,
    closed: true,
    theme: {
      sunElev: 18, sunAz: 200, turbidity: 3.4, rayleigh: 1.6, mie: 0.005,
      haze: 0x9aa8b4, fogNear: 90, fogFar: 2600,
      water: 0x1c3e4e, sunColor: 0xffe6c4, exposure: 0.5,
      hemiSky: 0xb7c6d4, hemiGround: 0x6a6256,
      terrainMul: [0.95, 0.9, 0.82], reedBoost: 0.18, night: false,
      dress: 'coast', wave: 2.6,
    },
    weights: withScans('coast', {}),
  },
  {
    id: 'reef',
    name: '热带礁盘',
    tag: '清水',
    desc: '清澈的碧水和珊瑚沙。鹦嘴、狮子鱼、隆头鱼在礁头边转。',
    keyName: '礁盘钥匙',
    nextId: 'offshore',
    waitMul: 0.9,
    biteWin: 1.05,
    closed: true,
    theme: {
      sunElev: 38, sunAz: 150, turbidity: 1.3, rayleigh: 1.1, mie: 0.0018,
      haze: 0xb7e4ea, fogNear: 110, fogFar: 2800,
      water: 0x0b8f86, sunColor: 0xfff6df, exposure: 0.62,
      hemiSky: 0xc8f0ff, hemiGround: 0xc2a878,
      terrainMul: [1.15, 1.02, 0.72], reedBoost: 0.04, night: false,
      dress: 'reef', wave: 1.15, sunIntensity: 2.85,
    },
    weights: withScans('reef', {}),
  },
  {
    id: 'offshore',
    name: '外海拖钓',
    tag: '巨物',
    desc: '开阔的深色洋面，远处只剩岛的剪影。金枪、鲣和鲹从船边擦过。',
    keyName: '外海钥匙',
    nextId: null,
    waitMul: 1.2,
    biteWin: 0.9,
    closed: true,
    theme: {
      sunElev: 11, sunAz: 230, turbidity: 2.2, rayleigh: 1.2, mie: 0.003,
      haze: 0x6e8498, fogNear: 50, fogFar: 4600,
      water: 0x071826, sunColor: 0xffd8b0, exposure: 0.46,
      hemiSky: 0x8eacc4, hemiGround: 0x3a4048,
      terrainMul: [0.62, 0.66, 0.74], reedBoost: 0, night: false,
      dress: 'offshore', wave: 3.4, sunIntensity: 2.15,
    },
    weights: withScans('offshore', {}),
  },
];

export const locationById = Object.fromEntries(LOCATIONS.map(l => [l.id, l]));

/** 当前地图钓到传说时，掉落哪一把钥匙（下一站 id） */
export function nextKeyIdFrom(currentLocId) {
  const loc = locationById[currentLocId];
  return loc?.nextId || null;
}

export function mapStatus(loc, unlockedSet, keys) {
  if (unlockedSet && unlockedSet[loc.id]) return { state: 'owned', label: '已解锁' };
  if (loc.id === 'lake') return { state: 'owned', label: '已解锁' };
  if (keys && keys[loc.id]) return { state: 'hasKey', label: '已有钥匙 · 交给黑衣人' };
  return { state: 'locked', label: '需要传说钥匙 · 交给黑衣人' };
}
