// 钓点 / 地图：视觉主题 + 鱼种权重 + 解锁条件
export const LOCATIONS = [
  {
    id: 'lake',
    name: '宁静湖湾',
    tag: '新手',
    desc: '开阔湖面，水草丰美。适合台钓入门，鲤鲫草鲢都有机会。',
    unlock: { lvl: 1, coins: 0 },
    waitMul: 1.0,
    biteWin: 1.0,
    theme: {
      sunElev: 13.5, sunAz: 160, turbidity: 2.8, rayleigh: 2.2, mie: 0.004,
      haze: 0xb0c0ce, fogNear: 120, fogFar: 3200,
      water: 0x0e2a28, sunColor: 0xfff1d6, exposure: 0.5,
      hemiSky: 0xbcd4ff, hemiGround: 0x4a4030,
      terrainMul: [1, 1, 1], reedBoost: 1, night: false,
    },
    // 权重倍率（未列出的默认 1；0 = 该点不出现）
    weights: {
      crucian: 1.4, tilapia: 1.2, carp: 1.3, grass: 1.2, silvercarp: 1.1, bighead: 1.0, bream: 1.1, mudcarp: 1.2,
      perch: 1.0, mandarin: 0.9, goldcarp: 1.0, koi: 1.0, sturgeon: 0.7,
      horsemouth: 0.4, bleak: 0.6, loach: 0.5,
    },
  },
  {
    id: 'stream',
    name: '溪流浅滩',
    tag: '清水',
    desc: '清澈见底的山溪浅滩，白条马口活跃，适合轻量露亚。',
    unlock: { lvl: 2, coins: 80 },
    waitMul: 0.75,
    biteWin: 1.15,
    theme: {
      sunElev: 22, sunAz: 140, turbidity: 1.6, rayleigh: 1.4, mie: 0.0025,
      haze: 0xc8d8e8, fogNear: 80, fogFar: 2200,
      water: 0x1a4a55, sunColor: 0xfff8e8, exposure: 0.58,
      hemiSky: 0xd0e8ff, hemiGround: 0x5a5040,
      terrainMul: [0.95, 1.05, 0.9], reedBoost: 0.35, night: false,
    },
    weights: {
      horsemouth: 2.5, bleak: 2.2, crucian: 0.8, trout: 1.8, culter: 1.2,
      perch: 1.1, mandarin: 0.6, carp: 0.3, grass: 0.2, snakehead: 0.2,
      loach: 1.4, catfish: 0.3, pike: 0.4, tilapia: 0.5,
      gancyu: 0.5, arowana: 0.3,
    },
  },
  {
    id: 'marsh',
    name: '芦苇湿地',
    tag: '浑水',
    desc: '芦苇丛生、水质浑浊。鲶鱼黄颡泥鳅出没，鲤草也多。',
    unlock: { lvl: 3, coins: 200 },
    waitMul: 1.25,
    biteWin: 0.9,
    theme: {
      sunElev: 28, sunAz: 175, turbidity: 4.5, rayleigh: 1.8, mie: 0.006,
      haze: 0xa8b090, fogNear: 60, fogFar: 1800,
      water: 0x1a2a18, sunColor: 0xffe8c0, exposure: 0.48,
      hemiSky: 0xc8d0a8, hemiGround: 0x3a3420,
      terrainMul: [0.85, 1.1, 0.75], reedBoost: 2.2, night: false,
    },
    weights: {
      carp: 1.6, grass: 1.3, catfish: 2.2, yellowcat: 2.0, loach: 2.0, eel: 1.6,
      snakehead: 1.8, softshell: 1.5, crucian: 1.2, bream: 1.0, tilapia: 0.8,
      mandarin: 1.1, goldcarp: 0.8, perch: 0.5, trout: 0.2, bleak: 0.3,
      softshell: 1.5,
    },
  },
  {
    id: 'night',
    name: '深潭夜钓',
    tag: '夜间',
    desc: '月色下的深潭。鲶鳝甲鱼活跃，偶遇大型夜行掠食者。',
    unlock: { lvl: 4, coins: 450 },
    waitMul: 1.4,
    biteWin: 0.85,
    theme: {
      sunElev: -8, sunAz: 200, turbidity: 1.2, rayleigh: 0.4, mie: 0.001,
      haze: 0x1a2230, fogNear: 40, fogFar: 1400,
      water: 0x061018, sunColor: 0xa0b8d8, exposure: 0.32,
      hemiSky: 0x304060, hemiGround: 0x1a1810,
      terrainMul: [0.55, 0.55, 0.65], reedBoost: 0.8, night: true, moon: true,
    },
    weights: {
      catfish: 2.4, eel: 2.2, softshell: 2.0, yellowcat: 1.8, snakehead: 1.6,
      carp: 1.0, loach: 1.2, mandarin: 1.3, perch: 0.8, stur: 1.5,
      sturgeon: 1.2, gancyu: 1.0, koi: 0.6, goldcarp: 0.5, arowana: 0.8,
      crucian: 0.4, bleak: 0.2, horsemouth: 0.1, trout: 0.3,
    },
  },
  {
    id: 'dam',
    name: '水库大坝',
    tag: '巨物',
    desc: '高坝深水区，鲢鳙青鱼成群，大型掠食鱼潜伏。挑战最高。',
    unlock: { lvl: 5, coins: 900 },
    waitMul: 1.15,
    biteWin: 0.95,
    theme: {
      sunElev: 16, sunAz: 110, turbidity: 3.2, rayleigh: 2.0, mie: 0.0045,
      haze: 0x9eb0c0, fogNear: 150, fogFar: 3800,
      water: 0x0a2838, sunColor: 0xffe0b0, exposure: 0.52,
      hemiSky: 0xb0c8e0, hemiGround: 0x4a4038,
      terrainMul: [0.9, 0.85, 1.05], reedBoost: 0.5, night: false,
    },
    weights: {
      silvercarp: 2.0, bighead: 2.0, blackcarp: 2.2, grass: 1.4, carp: 1.0,
      culter: 1.6, redtail: 1.8, pike: 1.7, taimen: 1.5, gancyu: 1.4,
      sturgeon: 1.5, arowana: 1.0, perch: 1.0, mandarin: 0.8, trout: 0.6,
      icefish: 1.2, crucian: 0.5, horsemouth: 0.3, catfish: 0.8,
    },
  },
];

export const locationById = Object.fromEntries(LOCATIONS.map(l => [l.id, l]));

export function isLocationUnlocked(loc, level, coins, unlockedSet) {
  if (unlockedSet && unlockedSet[loc.id]) return true;
  const u = loc.unlock;
  return level >= u.lvl && coins >= 0; // 购买用 coins 另算
}

export function canAffordUnlock(loc, level, coins, unlockedSet) {
  if (unlockedSet && unlockedSet[loc.id]) return { ok: true, reason: 'owned' };
  const u = loc.unlock;
  if (level < u.lvl) return { ok: false, reason: `需达到 Lv.${u.lvl}` };
  if (coins < u.coins) return { ok: false, reason: `需 ${u.coins} 金币` };
  return { ok: true, reason: 'buy' };
}
