// 存档：版本号 + 迁移，保证旧存档不丢失
const KEY = 'fishing3d_save';
const OLD_KEYS = ['fishing3d_save_v1'];
export const SAVE_VERSION = 3;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    coins: 50, catches: 0, xp: 0,
    collection: {},
    net: [],
    owned: { rods: ['bamboo'], lines: ['nylon'], nets: ['small'], lures: [] },
    bait: { worm: 10 },
    equip: { mode: 'float', float: 'bamboo', lure: null, line: 'nylon', net: 'small', bait: 'worm', lureItem: null },
    stats: { sold: 0, lure: 0, perfect: 0, maxW: 0, legend: 0, rareUp: 0 },
    daily: null,
    mainClaimed: {},
    uidSeq: 1,
    location: 'lake',
    unlockedLocations: { lake: true },
  };
}

function levelFromXp(xp) {
  const LEVEL_XP = [0, 60, 160, 320, 560, 900, 1400, 2100, 3000, 4200];
  let l = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) if ((xp || 0) >= LEVEL_XP[i]) l = i + 1;
  return l;
}

function grantLocationsByLevel(s) {
  s.unlockedLocations = s.unlockedLocations || { lake: true };
  s.unlockedLocations.lake = true;
  const lvl = levelFromXp(s.xp);
  const auto = { stream: 2, marsh: 3, night: 4, dam: 5 };
  for (const [id, need] of Object.entries(auto)) {
    if (lvl >= need) s.unlockedLocations[id] = true;
  }
  if (!s.location) s.location = 'lake';
}

function migrate(s) {
  if (!s.version) {
    const d = defaultSave();
    d.coins = Math.max(d.coins, s.coins || 0);
    d.catches = s.catches || 0;
    d.collection = s.collection || {};
    d.xp = Math.round((s.catches || 0) * 8);
    d.stats.maxW = Math.max(0, ...Object.values(d.collection).map(c => c.maxW || 0));
    d.version = 2;
    s = d;
  }
  if (s.version < 3) {
    grantLocationsByLevel(s);
    s.version = 3;
  }
  const d = defaultSave();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  for (const k of ['owned', 'equip', 'stats', 'unlockedLocations']) s[k] = Object.assign({}, d[k], s[k]);
  grantLocationsByLevel(s); // 等级提升后补发（不扣金币）
  s.version = SAVE_VERSION;
  return s;
}

export function loadSave() {
  let raw = localStorage.getItem(KEY), migrated = false;
  if (!raw) for (const k of OLD_KEYS) { raw = localStorage.getItem(k); if (raw) { migrated = true; break; } }
  let s;
  try { s = raw ? JSON.parse(raw) : defaultSave(); } catch (e) { console.warn('存档损坏，已重置', e); s = defaultSave(); }
  s = migrate(s);
  localStorage.setItem(KEY, JSON.stringify(s));
  return { save: s, migrated };
}
export function writeSave(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
