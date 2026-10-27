// 钓点 / 地图：视觉主题 + 鱼种权重 + 传说钥匙推进
// 解锁链：湖湾 → 溪流 → 湿地 → 夜钓 → 大坝 → 近海码头 → 热带礁盘 → 外海拖钓
// （当前图钓到传说 → 获得下一站钥匙 → 交给黑衣人开船）
import { SCAN_SPECIES, SCAN_SPOT } from './scan-catalog.js?v=17';

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
      sunElev: 34, sunAz: 125, turbidity: 1.7, rayleigh: 2.6, mie: 0.0016,
      haze: 0xd4ecf8, fogNear: 70, fogFar: 2800,
      water: 0x1f9eb8, sunColor: 0xfff7ea, exposure: 0.64,
      hemiSky: 0xd8f0ff, hemiGround: 0x6a6048,
      terrainMul: [0.92, 1.08, 0.95], reedBoost: 0.18, night: false,
      land: 'stream', veg: 0.8, mount: 1.12,
      wave: 0.85, waveSize: 3.4, waveSpeed: 0.9,
      hemiIntensity: 0.48, env: 0.85,
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
      sunElev: 32, sunAz: 168, turbidity: 6.5, rayleigh: 1.15, mie: 0.009,
      haze: 0xb7b48a, fogNear: 28, fogFar: 1100,
      water: 0x4a5a28, sunColor: 0xf0e0b0, exposure: 0.42,
      hemiSky: 0xd5d2a4, hemiGround: 0x3a3418,
      terrainMul: [0.78, 0.82, 0.55], reedBoost: 2.4, night: false,
      land: 'marsh', veg: 1, mount: 0.55, mountColor: 0x8a9070, mountOpacity: 0.55,
      terrainTint: 0x6d6840, terrainTintAmt: 0.28,
      wave: 0.6, waveSize: 2.8, waveSpeed: 0.35,
      hemiIntensity: 0.32, cloud: 0xe4e2c8, cloudMul: 1.3,
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
      sunElev: -12, sunAz: 210, turbidity: 1.4, rayleigh: 0.25, mie: 0.0006,
      haze: 0x101820, fogNear: 28, fogFar: 1100,
      water: 0x040c16, sunColor: 0x8aa0c0, exposure: 0.22,
      hemiSky: 0x24344e, hemiGround: 0x12100c,
      terrainMul: [0.4, 0.42, 0.5], reedBoost: 0.55, night: true, moon: true,
      land: 'night', veg: 0.75, mount: 0.85, mountColor: 0x1a2230, mountOpacity: 0.85,
      sunIntensity: 0.07, hemiIntensity: 0.1, env: 0.24, fill: 0.04,
      wave: 0.45, waveSize: 1.6, waveSpeed: 0.22,
      cloud: 0x1a2433, cloudMul: 0.25,
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
      sunElev: 20, sunAz: 100, turbidity: 3.8, rayleigh: 1.3, mie: 0.006,
      haze: 0x8ea0b0, fogNear: 80, fogFar: 2400,
      water: 0x1a4a62, sunColor: 0xf0f2f4, exposure: 0.48,
      hemiSky: 0xb7c4d0, hemiGround: 0x6a6e72,
      terrainMul: [0.7, 0.72, 0.75], reedBoost: 0.22, night: false,
      land: 'dam', dress: 'dam', veg: 0.28, mount: 0.62,
      mountColor: 0x7d8b98, mountOpacity: 0.7,
      terrainTint: 0x9aa3ab, terrainTintAmt: 0.62, groundTint: 0xd5d8dc,
      wave: 1.3, waveSize: 2.4, waveSpeed: 0.4,
      hemiIntensity: 0.36, env: 0.6, cloud: 0xdfe4ea, cloudMul: 1.15,
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
      sunElev: 28, sunAz: 190, turbidity: 9.5, rayleigh: 0.55, mie: 0.02,
      haze: 0x8b949c, fogNear: 36, fogFar: 980,
      water: 0x6e8796, sunColor: 0xdfe6ec, exposure: 0.56,
      hemiSky: 0xb0b8c0, hemiGround: 0x6a6e70,
      terrainMul: [0.82, 0.84, 0.86], reedBoost: 0, night: false,
      land: 'coast', dress: 'coast', veg: 0, mount: 0.22,
      mountColor: 0x8e98a2, mountOpacity: 0.35,
      terrainTint: 0xa8b0b4, terrainTintAmt: 0.82, groundTint: 0xe4e8ea,
      wave: 7.2, waveSize: 5.6, waveSpeed: 1.35, reflectance: 0.48,
      sunIntensity: 2.05, hemiIntensity: 0.5, env: 0.55, fill: 0.28,
      cloud: 0xc5ccd2, cloudMul: 1.7,
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
      sunElev: 48, sunAz: 155, turbidity: 1.7, rayleigh: 2.35, mie: 0.001,
      haze: 0x5ec8e4, fogNear: 160, fogFar: 4200,
      water: 0x00d8c4, sunColor: 0xfff6dc, exposure: 0.58,
      hemiSky: 0x9cdcff, hemiGround: 0xf0d7a4,
      terrainMul: [1.2, 1.05, 0.72], reedBoost: 0, night: false,
      land: 'reef', dress: 'reef', veg: 0, mount: 0,
      terrainTint: 0xf0d7a2, terrainTintAmt: 0.88, groundTint: 0xfff3d4,
      wave: 0.42, waveSize: 1.15, waveSpeed: 0.28, reflectance: 0.1,
      sunIntensity: 2.45, hemiIntensity: 0.55, env: 0.9, fill: 0.18,
      cloud: 0xffffff, cloudMul: 0.35,
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
      sunElev: 7, sunAz: 250, turbidity: 2.8, rayleigh: 0.45, mie: 0.004,
      haze: 0x243848, fogNear: 70, fogFar: 2400,
      water: 0x021018, sunColor: 0xb7c6d4, exposure: 0.32,
      hemiSky: 0x6d8498, hemiGround: 0x12181e,
      terrainMul: [0.4, 0.45, 0.55], reedBoost: 0, night: false,
      land: 'offshore', dress: 'offshore', veg: 0, mount: 0,
      terrainTint: 0x243038, terrainTintAmt: 0.5,
      wave: 8.5, waveSize: 1.15, waveSpeed: 0.85, reflectance: 0.08,
      sunIntensity: 0.95, hemiIntensity: 0.18, env: 0.28, fill: 0.06,
      cloud: 0x8ea0b0, cloudMul: 0.55,
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
