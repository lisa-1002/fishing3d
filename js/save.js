// 存档：版本号 + 迁移，保证旧存档不丢失
const KEY = 'fishing3d_save';
const OLD_KEYS = ['fishing3d_save_v1'];
export const SAVE_VERSION = 2;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    coins: 50, catches: 0, xp: 0,
    collection: {},                       // { id: { count, maxW } }
    net: [],                              // 鱼护 [{ uid, id, w, perfect, keep, t }]
    owned: { rods: ['bamboo'], lines: ['nylon'], nets: ['small'], lures: [] },
    bait: { worm: 10 },
    equip: { mode: 'float', float: 'bamboo', lure: null, line: 'nylon', net: 'small', bait: 'worm', lureItem: null },
    stats: { sold: 0, lure: 0, perfect: 0, maxW: 0, legend: 0, rareUp: 0 },
    daily: null,                          // { date, quests: [...] }
    mainClaimed: {},
    uidSeq: 1,
  };
}

function migrate(s) {
  if (!s.version) {               // v1 → v2：只有 coins / catches / collection
    const d = defaultSave();
    d.coins = Math.max(d.coins, s.coins || 0);
    d.catches = s.catches || 0;
    d.collection = s.collection || {};
    d.xp = Math.round((s.catches || 0) * 8);   // 老玩家按渔获数折算经验
    d.stats.maxW = Math.max(0, ...Object.values(d.collection).map(c => c.maxW || 0));
    s = d;
  }
  // 以后的版本在此继续：if (s.version < 3) { ...; s.version = 3; }
  const d = defaultSave();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  for (const k of ['owned', 'equip', 'stats']) s[k] = Object.assign({}, d[k], s[k]);
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
