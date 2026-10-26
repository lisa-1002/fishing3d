// 存档：版本号 + 迁移，保证旧存档不丢失
const KEY = 'fishing3d_save';
const OLD_KEYS = ['fishing3d_save_v1'];
export const SAVE_VERSION = 7;

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
    keys: {}, // { stream: true, marsh: true, ... } 持有、尚未交给黑衣人的传说钥匙
    pity: {},     // { lake: 3, ... } 各钓点自上次传说以来的非传说渔获数（传说保底）
    legendAt: {}, // { lake: true } 该钓点是否已钓到过传说
    laoyuXp: 0,   // 卖给老余的累计金币，换算成交情等级（最高 20）
    cycle: 0,     // 轮回次数
    rainbow: false, // 已把虹桥钥匙交给黄衣人，彩虹路出现
    cleared: false, // 已打开宝箱，看过「通关了」
  };
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
    s.location = s.location || 'lake';
    s.unlockedLocations = s.unlockedLocations || { lake: true };
    s.version = 3;
  }
  // v4：废除金币/等级解锁钓点 → 传说钥匙 + 黑衣人。清进度，只保留湖湾
  if (s.version < 4) {
    s.unlockedLocations = { lake: true };
    s.location = 'lake';
    s.keys = {};
    s.version = 4;
  }
  const d = defaultSave();
  // v4.1：新增传说保底计数（向后兼容：旧存档补字段；老玩家若从未钓到传说，按已钓条数给一部分保底进度）
  if (!s.pity || typeof s.pity !== 'object') {
    s.pity = {};
    if (!(s.stats && s.stats.legend > 0) && (s.catches || 0) > 0) s.pity[s.location || 'lake'] = Math.min(s.catches, 10);
  }
  if (!s.legendAt || typeof s.legendAt !== 'object') s.legendAt = {};
  // v5：老余交情。旧档按已经卖出的金币记一笔，不重置钓点、金币或等级
  if (typeof s.laoyuXp !== 'number' || Number.isNaN(s.laoyuXp)) {
    s.laoyuXp = Math.max(0, (s.stats && s.stats.sold) || 0);
  }
  if ((s.version || 0) < 5) s.version = 5;
  // v6：通关 / 轮回标记。缺省补上，不改已有钓点、金币、等级
  if (typeof s.cycle !== 'number' || Number.isNaN(s.cycle)) s.cycle = 0;
  if (typeof s.rainbow !== 'boolean') s.rainbow = false;
  if (typeof s.cleared !== 'boolean') s.cleared = false;
  if ((s.version || 0) < 6) s.version = 6;
  // v7：钓点链延长到近海码头、热带礁盘、外海。已解锁的湖湾到大坝、钥匙和金币都保留。
  if ((s.version || 0) < 7) s.version = 7;
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  for (const k of ['owned', 'equip', 'stats', 'unlockedLocations', 'keys', 'pity', 'legendAt']) s[k] = Object.assign({}, d[k], s[k]);
  s.unlockedLocations.lake = true;
  s.version = SAVE_VERSION;
  return s;
}

export function loadSave() {
  let raw = localStorage.getItem(KEY), migrated = false;
  if (!raw) for (const k of OLD_KEYS) { raw = localStorage.getItem(k); if (raw) { migrated = true; break; } }
  let s;
  try { s = raw ? JSON.parse(raw) : defaultSave(); } catch (e) { console.warn('存档损坏，已重置', e); s = defaultSave(); }
  const before = s.version;
  s = migrate(s);
  if (before < 4) migrated = true;
  localStorage.setItem(KEY, JSON.stringify(s));
  return { save: s, migrated };
}
export function writeSave(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
