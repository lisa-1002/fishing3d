// 游戏系统：经济（出售/商店）、经验等级、任务、选鱼
import { SPECIES, RARITY, speciesById } from './fish.js?v=14';
import { RODS, LINES, NETS, BAITS, LURES, RARITY_BASE, LEVEL_XP, MAX_LEVEL, LAOYU_XP, LAOYU_MAX, DAILY_TEMPLATES, MAIN_QUESTS, PITY, pullTalentBonus, pullTalentLabel } from './data.js?v=14';
import { writeSave } from './save.js?v=14';
import { LOCATIONS, LOCATION_ORDER, locationById, nextKeyIdFrom, mapStatus } from './locations.js';

export function createSystems(save, hooks = {}) {
  const S = {};
  const emit = (n, ...a) => hooks[n] && hooks[n](...a);
  S.persist = () => writeSave(save);

  // ---------- 等级 ----------
  S.level = () => { let l = 1; for (let i = 0; i < LEVEL_XP.length; i++) if (save.xp >= LEVEL_XP[i]) l = i + 1; return Math.min(l, MAX_LEVEL); };
  S.levelProgress = () => {
    const l = S.level();
    if (l >= MAX_LEVEL) return 1;
    const next = LEVEL_XP[l];
    const prev = LEVEL_XP[l - 1];
    if (next == null || next === prev) return 1;
    return Math.max(0, Math.min(1, (save.xp - prev) / (next - prev)));
  };
  S.addXp = (n) => { const before = S.level(); save.xp += n; const after = S.level(); if (after > before) emit('levelUp', after); };
  S.pullTalent = () => pullTalentBonus(S.level());
  S.pullTalentLabel = () => pullTalentLabel(S.level());
  // 搏鱼用的有效拉力：竿本身的 strength，再乘 41–50 级天赋（40 级及以下为 1）
  S.rodStrength = () => S.rod().strength * (1 + S.pullTalent());
  // 老余交情：只在玩家主动卖鱼时上涨，满级 20
  S.laoyuLevel = () => {
    let l = 1;
    const xp = save.laoyuXp || 0;
    for (let i = 0; i < LAOYU_XP.length; i++) if (xp >= LAOYU_XP[i]) l = i + 1;
    return Math.min(l, LAOYU_MAX);
  };
  S.laoyuProgress = () => {
    const l = S.laoyuLevel();
    if (l >= LAOYU_MAX) return 1;
    const next = LAOYU_XP[l], prev = LAOYU_XP[l - 1];
    if (next == null || next === prev) return 1;
    return Math.max(0, Math.min(1, ((save.laoyuXp || 0) - prev) / (next - prev)));
  };
  S.laoyuBonus = () => (S.laoyuLevel() - 1) / (LAOYU_MAX - 1) * 0.22;

  // ---------- 装备 ----------
  S.rod = () => RODS[save.equip.mode === 'lure' ? save.equip.lure : save.equip.float] || RODS.bamboo;
  S.line = () => LINES[save.equip.line] || LINES.nylon;
  S.netCap = () => (NETS[save.equip.net] || NETS.small).cap;
  S.bait = () => (save.equip.bait && (save.bait[save.equip.bait] || 0) > 0 ? BAITS[save.equip.bait] : BAITS.none);
  S.baitId = () => (save.equip.bait && (save.bait[save.equip.bait] || 0) > 0 ? save.equip.bait : 'none');
  S.lure = () => LURES[save.equip.lureItem] || LURES.spoon;
  S.canLure = () => !!save.equip.lure && save.owned.lures.length > 0;
  S.setMode = (m) => {
    if (m === 'lure' && !S.canLure()) return false;
    save.equip.mode = m; S.persist(); emit('equipChanged'); return true;
  };
  S.consumeBait = () => {
    const id = S.baitId(); if (id === 'none') return null;
    save.bait[id]--; if (save.bait[id] <= 0) { delete save.bait[id]; emit('toast', `${BAITS[id].name}用完了`); }
    S.persist(); return id;
  };
  S.equip = (kind, id) => {
    if (kind === 'float' || kind === 'lure') { if (!save.owned.rods.includes(id)) return; save.equip[kind] = id; }
    else if (kind === 'line') { if (!save.owned.lines.includes(id)) return; save.equip.line = id; }
    else if (kind === 'net') { if (!save.owned.nets.includes(id)) return; save.equip.net = id; }
    else if (kind === 'bait') save.equip.bait = id;
    else if (kind === 'lureItem') { if (!save.owned.lures.includes(id)) return; save.equip.lureItem = id; }
    S.persist(); emit('equipChanged');
  };

  // ---------- 发放物品（商店 / 奖励共用） ----------
  S.grant = (r) => {
    const got = [];
    if (r.coins) { save.coins += r.coins; got.push(`${r.coins} 金币`); }
    if (r.bait) for (const [id, n] of Object.entries(r.bait)) { save.bait[id] = (save.bait[id] || 0) + n; got.push(`${BAITS[id].name}×${n}`); }
    const own = (list, id, name, fallback) => {
      if (save.owned[list].includes(id)) { save.coins += fallback; got.push(`${name}（已拥有，折算 ${fallback} 金币）`); return false; }
      save.owned[list].push(id); got.push(name); return true;
    };
    if (r.rod) { const d = RODS[r.rod]; if (own('rods', r.rod, d.name, Math.round(d.price * 0.5))) { if (d.type === 'lure' && !save.equip.lure) save.equip.lure = r.rod; } }
    if (r.lure) { const d = LURES[r.lure]; if (own('lures', r.lure, d.name, Math.round(d.price * 0.5))) { if (!save.equip.lureItem) save.equip.lureItem = r.lure; } }
    if (r.line) own('lines', r.line, LINES[r.line].name, Math.round(LINES[r.line].price * 0.5));
    if (r.net) { if (own('nets', r.net, NETS[r.net].name, Math.round(NETS[r.net].price * 0.5)) && NETS[r.net].cap > S.netCap()) save.equip.net = r.net; }
    S.persist(); emit('equipChanged');
    return got;
  };
  S.rewardText = (r) => {
    const t = [];
    if (r.coins) t.push(`${r.coins}金币`);
    if (r.bait) for (const [id, n] of Object.entries(r.bait)) t.push(`${BAITS[id].name}×${n}`);
    if (r.rod) t.push(RODS[r.rod].name); if (r.lure) t.push(LURES[r.lure].name);
    if (r.line) t.push(LINES[r.line].name); if (r.net) t.push(NETS[r.net].name);
    return t.join(' + ');
  };

  // ---------- 商店 ----------
  S.buy = (cat, id) => {
    const tables = { rod: RODS, line: LINES, net: NETS, bait: BAITS, lure: LURES };
    const d = tables[cat][id];
    if (S.level() < d.lvl) return `需要等级 ${d.lvl}`;
    if (save.coins < d.price) return '金币不足';
    const owned = cat === 'rod' ? save.owned.rods : cat === 'line' ? save.owned.lines : cat === 'net' ? save.owned.nets : cat === 'lure' ? save.owned.lures : null;
    if (owned && owned.includes(id)) return '已拥有';
    save.coins -= d.price;
    if (cat === 'bait') { save.bait[id] = (save.bait[id] || 0) + d.pack; if (S.baitId() === 'none') save.equip.bait = id; }
    else {
      owned.push(id);
      if (cat === 'rod') save.equip[d.type] = id;     // 买了自动装备
      if (cat === 'line') save.equip.line = id;
      if (cat === 'net' && d.cap > S.netCap()) save.equip.net = id;
      if (cat === 'lure') save.equip.lureItem = id;
    }
    S.persist(); emit('equipChanged');
    return null;
  };

  // ---------- 鱼价 / 鱼护 / 出售 ----------
  S.price = (f) => {
    const sp = speciesById[f.id]; const avg = (sp.w[0] + sp.w[1]) / 2;
    const base = sp.price * Math.pow(f.w / avg, 0.85) * (f.perfect ? 1.1 : 1);
    return Math.max(1, Math.round(base * (1 + S.laoyuBonus())));
  };
  S.netFull = () => save.net.length >= S.netCap();
  S.keepFish = (f) => { if (S.netFull()) return false; save.net.push(f); S.persist(); return true; };
  S.sell = (uids) => {
    let total = 0;
    save.net = save.net.filter(f => { if (uids.includes(f.uid)) { total += S.price(f); return false; } return true; });
    S.sellCoins(total); return total;
  };
  S.sellCoins = (total) => {
    if (!total) return;
    const before = S.laoyuLevel();
    save.coins += total; save.stats.sold += total;
    save.laoyuXp = (save.laoyuXp || 0) + total;
    const after = S.laoyuLevel();
    if (after > before) emit('laoyuUp', after);
    S.progress('sell_coins', total); S.persist();
  };
  S.toggleKeep = (uid) => { const f = save.net.find(f => f.uid === uid); if (f) { f.keep = !f.keep; S.persist(); } };

  // ---------- 选鱼 ----------
  S.location = () => locationById[save.location] || LOCATIONS[0];
  S.unlockedCount = () => Object.keys(save.unlockedLocations || {}).filter(k => save.unlockedLocations[k]).length;
  S.allMaps = () => LOCATION_ORDER.every(id => !!(save.unlockedLocations && save.unlockedLocations[id]));
  S.hasKey = (id) => !!(save.keys && save.keys[id]);
  S.heldKeys = () => Object.keys(save.keys || {}).filter(k => save.keys[k]);
  /** 黑衣人收钥匙解锁钓点；返回 { ok, msg, locId } */
  S.deliverKey = (id) => {
    const loc = locationById[id];
    if (!loc) return { ok: false, msg: '未知水域' };
    if (save.unlockedLocations[id]) return { ok: false, msg: '已经去过那里了' };
    if (!S.hasKey(id)) return { ok: false, msg: '你还没有那把钥匙' };
    delete save.keys[id];
    save.unlockedLocations[id] = true;
    save.location = id;
    S.persist();
    return { ok: true, msg: `开船前往「${loc.name}」`, locId: id, loc };
  };
  /** 持有的第一把未解锁钥匙（给对话用） */
  S.nextDeliverableKey = () => {
    for (const id of S.heldKeys()) {
      if (id === 'rainbow') continue;
      if (!save.unlockedLocations[id]) return id;
    }
    return null;
  };
  /** 每轮回一次，传说鱼权重 ×2、普通鱼权重 ÷2，按 2^轮回次数 叠乘。稀有和史诗不改。 */
  const CYCLE_RARITY_STEP = 2;
  S.cycleWeight = (rarity) => {
    const n = Math.max(0, Math.floor(Number(save.cycle) || 0));
    const k = CYCLE_RARITY_STEP ** n;
    if (rarity === 'common') return 1 / k;
    if (rarity === 'legend') return k;
    return 1;
  };
  /** 轮回：钓点重新开始，等级、经验和装备留下。图鉴、老余交情，以及已领取的等级、鱼种成就也留下。 */
  S.rebirth = () => {
    const cycle = (save.cycle || 0) + 1;
    const collection = save.collection || {};
    const laoyuXp = save.laoyuXp || 0;
    const uidSeq = save.uidSeq || 1;
    const xp = save.xp || 0;
    const owned = {
      rods: [...(save.owned && save.owned.rods || ['bamboo'])],
      lines: [...(save.owned && save.owned.lines || ['nylon'])],
      nets: [...(save.owned && save.owned.nets || ['small'])],
      lures: [...(save.owned && save.owned.lures || [])],
    };
    const equip = { ...(save.equip || {}) };
    const bait = { ...(save.bait || {}) };
    const keptClaims = {};
    for (const q of MAIN_QUESTS) {
      if ((q.type === 'level' || q.type === 'species') && save.mainClaimed && save.mainClaimed[q.id]) keptClaims[q.id] = true;
    }
    save.coins = 50 + cycle * 40;
    save.catches = 0;
    save.xp = xp;
    save.collection = collection;
    save.net = [];
    save.owned = owned;
    save.bait = bait;
    save.equip = equip;
    save.stats = { sold: 0, lure: 0, perfect: 0, maxW: 0, legend: 0, rareUp: 0 };
    save.daily = null;
    save.mainClaimed = keptClaims;
    save.location = 'lake';
    save.unlockedLocations = { lake: true };
    save.keys = {};
    save.pity = {};
    save.legendAt = {};
    save.laoyuXp = laoyuXp;
    save.cycle = cycle;
    save.rainbow = false;
    save.cleared = false;
    save.uidSeq = uidSeq;
    S.ensureDaily();
    S.persist();
    return cycle;
  };
  S.setLocation = (id) => {
    if (!save.unlockedLocations[id]) return '尚未解锁：需传说钥匙交给黑衣人';
    save.location = id; S.persist(); return null;
  };
  S.mapStatus = (loc) => mapStatus(loc, save.unlockedLocations, save.keys);
  // ---------- 传说保底 ----------
  /** 当前钓点保底信息：n 已累计非传说条数，N 必出阈值 */
  S.pityInfo = (locId = save.location) => {
    const first = locId === 'lake' && !(save.legendAt && save.legendAt.lake) && !save.unlockedLocations.stream && !(save.keys && save.keys.stream);
    const N = first ? PITY.first : PITY.normal;
    const n = Math.min((save.pity && save.pity[locId]) || 0, N - 1);
    return { n, N, first, left: N - n };
  };
  /** 第 n+1 条鱼出传说的最低概率：前半段几乎不变，后段快速上升，第 N 条必出 */
  S.pityChance = (p0) => {
    const { n, N } = S.pityInfo();
    if (n >= N - 1) return 1;
    return Math.max(p0, p0 + (1 - p0) * Math.pow(n / (N - 1), 3));
  };
  S.pickFish = (mode, power, opts = {}) => {
    const base = RARITY_BASE[mode];
    const mod = mode === 'lure' ? S.lure() : S.bait();
    const loc = S.location();
    const rarMul = { common: 1.15 - power * 0.45, rare: 1 + power * 0.3, epic: 1 + power * 0.9, legend: 1 + power * 1.6 };
    const pool = SPECIES.filter(s => (s.method === mode || s.method === 'both') && (loc.weights[s.id] === undefined || loc.weights[s.id] > 0));
    const counts = {}; pool.forEach(s => counts[s.rarity] = (counts[s.rarity] || 0) + 1);
    const weights = pool.map(s => {
      const lw = loc.weights[s.id] !== undefined ? loc.weights[s.id] : 0.35; // 未点名的鱼少量出现
      const gearPow = s.rarity === 'common' ? 1 : (mod.power || 1);
      return base[s.rarity] / counts[s.rarity] * rarMul[s.rarity] * (mod.rar[s.rarity] || 1) * (mod.attract[s.id] || 1) * lw * gearPow * S.cycleWeight(s.rarity);
    });
    const total = weights.reduce((a, b) => a + b, 0);
    const legW = pool.reduce((a, s, i) => a + (s.rarity === 'legend' ? weights[i] : 0), 0);
    // 保底：先决定是否出传说，再在对应子池里按权重挑
    let wantLegend = null, pL = legW / total;
    if (legW > 0 && legW < total && !opts.noPity) {
      pL = S.pityChance(legW / total);
      wantLegend = Math.random() < pL;
    }
    const idx = pool.map((_, i) => i).filter(i => wantLegend === null || (pool[i].rarity === 'legend') === wantLegend);
    let r = Math.random() * idx.reduce((a, i) => a + weights[i], 0), sp = pool[idx[0]];
    for (const i of idx) { r -= weights[i]; if (r <= 0) { sp = pool[i]; break; } }
    // 保底强制触发的新手传说：偏向小个体，竹竿也有机会拉上来
    const forced = wantLegend && pL >= 0.5;
    const wf = Math.pow(Math.random(), forced ? 3.2 : 2.2);
    return { sp, weight: sp.w[0] + (sp.w[1] - sp.w[0]) * wf, wf, pity: forced };
  };

  // ---------- 渔获登记 ----------
  S.recordCatch = (sp, weight, { mode, perfect }) => {
    const prev = save.collection[sp.id];
    const isNew = !prev, isRecord = !!prev && weight > prev.maxW;
    save.collection[sp.id] = { count: (prev?.count || 0) + 1, maxW: Math.max(prev?.maxW || 0, weight) };
    save.catches++;
    save.stats.maxW = Math.max(save.stats.maxW, weight);
    if (mode === 'lure') save.stats.lure++;
    if (sp.rarity !== 'common') save.stats.rareUp++;
    if (sp.rarity === 'legend') save.stats.legend++;
    // 保底计数：非传说 +1；传说重置并记录该钓点已出过传说
    save.pity = save.pity || {}; save.legendAt = save.legendAt || {};
    if (sp.rarity === 'legend') { save.pity[save.location] = 0; save.legendAt[save.location] = true; }
    else save.pity[save.location] = (save.pity[save.location] || 0) + 1;
    let keyDrop = null;
    if (sp.rarity === 'legend') {
      const kid = nextKeyIdFrom(save.location);
      if (kid && !save.unlockedLocations[kid] && !save.keys[kid]) {
        save.keys[kid] = true;
        keyDrop = { id: kid, name: locationById[kid].keyName || '传说钥匙', dest: locationById[kid].name };
      } else if (kid && !save.unlockedLocations[kid] && save.keys[kid]) {
        keyDrop = { id: kid, name: locationById[kid].keyName || '传说钥匙', dest: locationById[kid].name, already: true };
      } else if (S.allMaps() && !save.rainbow && !save.cleared) {
        if (!save.keys.rainbow) {
          save.keys.rainbow = true;
          keyDrop = { id: 'rainbow', name: '虹桥钥匙', dest: '湖心', endgame: true };
        } else {
          keyDrop = { id: 'rainbow', name: '虹桥钥匙', dest: '湖心', endgame: true, already: true };
        }
      }
    }
    const fish = { uid: save.uidSeq++, id: sp.id, w: Math.round(weight * 100) / 100, perfect: !!perfect, keep: false, t: Date.now() };
    const value = S.price(fish);
    const bonus = Math.max(1, Math.round(value * 0.1));
    save.coins += bonus;
    const xp = Math.round((4 + sp.price * 0.25) * (1 + Math.max(0, sp.diff - 6) * 0.035) * (perfect ? 1.3 : 1));
    S.progress('catch', { sp, weight, mode });
    S.addXp(xp);
    S.persist();
    return { fish, value, bonus, xp, isNew, isRecord, keyDrop };
  };
  S.notePerfect = () => { save.stats.perfect++; S.progress('perfect', 1); S.persist(); };

  // ---------- 任务 ----------
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function seeded(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  S.ensureDaily = () => {
    const date = today();
    if (save.daily && save.daily.date === date) return false;
    const rnd = seeded('fish' + date);
    const tpls = [...DAILY_TEMPLATES].sort(() => rnd() - 0.5);
    const quests = [];
    for (const t of tpls) {
      if (quests.length >= 3) break;
      if (t.type === 'lure_catch' && !S.canLure() && quests.length < 2) continue;  // 还没有露亚竿时尽量不抽露亚任务
      const tierIdx = Math.min(t.tiers.length - 1, Math.floor(rnd() * t.tiers.length));
      const [target, reward] = t.tiers[tierIdx];
      let param = null;
      if (t.type === 'catch_species') {
        const pool = SPECIES.filter(s => s.rarity === 'common' && s.method !== 'lure').concat(S.canLure() ? [] : []);
        param = pool[Math.floor(rnd() * pool.length)].id;
      }
      quests.push({ type: t.type, target, param, reward, progress: 0, claimed: false, text: t.text(target, param ? speciesById[param].name : '') });
    }
    save.daily = { date, quests }; S.persist();
    return true;
  };
  S.progress = (type, v) => {
    if (!save.daily) return;
    for (const q of save.daily.quests) {
      if (q.claimed || q.progress >= q.target) continue;
      const before = q.progress;
      if (type === 'catch') {
        const { sp, weight, mode } = v;
        if (q.type === 'catch_n') q.progress++;
        if (q.type === 'catch_species' && sp.id === q.param) q.progress++;
        if (q.type === 'catch_weight' && weight >= q.target) q.progress = q.target;
        if (q.type === 'lure_catch' && mode === 'lure') q.progress++;
        if (q.type === 'rare_catch' && sp.rarity !== 'common') q.progress++;
      } else if (type === q.type) q.progress += v;
      q.progress = Math.min(q.progress, q.target);
      if (before < q.target && q.progress >= q.target) emit('questDone', q.text);
    }
  };
  S.mainValue = (q) => {
    switch (q.type) {
      case 'catch_n': return save.catches;
      case 'lure_catch': return save.stats.lure;
      case 'sell_coins': return save.stats.sold;
      case 'perfect': return save.stats.perfect;
      case 'species': return Object.keys(save.collection).length;
      case 'level': return S.level();
      case 'max_weight': return save.stats.maxW;
      case 'legend': return save.stats.legend;
      case 'locations': return S.unlockedCount();
    }
    return 0;
  };
  S.claimDaily = (i) => {
    const q = save.daily.quests[i]; if (!q || q.claimed || q.progress < q.target) return null;
    q.claimed = true; return S.grant(q.reward);
  };
  S.claimMain = (id) => {
    const q = MAIN_QUESTS.find(q => q.id === id);
    if (!q || save.mainClaimed[id] || S.mainValue(q) < q.target) return null;
    save.mainClaimed[id] = true; return S.grant(q.reward);
  };
  S.claimableCount = () =>
    (save.daily ? save.daily.quests.filter(q => !q.claimed && q.progress >= q.target).length : 0) +
    MAIN_QUESTS.filter(q => !save.mainClaimed[q.id] && S.mainValue(q) >= q.target).length;
  return S;
}
