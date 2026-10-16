// 装备、鱼饵、路亚饵、等级、任务等静态数据
export const RODS = {
  // type: float 台钓竿 / lure 露亚竿；strength 拉力（降低鱼的拉扯、加快控鱼），sens 灵敏度（延长上钩/刺鱼窗口），cast 投远倍率
  bamboo:   { type: 'float', name: '竹制台钓竿', price: 0,    lvl: 1, strength: 1.0,  sens: 1.0,  cast: 1.0,  color: 0xc9a35a, len: 2.7, metal: 0.0, desc: '爷爷传下来的老竹竿，朴实耐用。' },
  carbon:   { type: 'float', name: '碳素台钓竿', price: 150,  lvl: 1, strength: 1.15, sens: 1.2,  cast: 1.1,  color: 0x17181c, len: 3.0, metal: 0.3, desc: '轻盈的碳素竿，手感更灵敏。' },
  pro:      { type: 'float', name: '高碳竞技竿', price: 600,  lvl: 3, strength: 1.35, sens: 1.4,  cast: 1.2,  color: 0x7a1020, len: 3.3, metal: 0.4, desc: '竞技级调性，中大型鱼也能从容应对。' },
  goldrod:  { type: 'float', name: '金龙台钓竿', price: 2200, lvl: 6, strength: 1.6,  sens: 1.6,  cast: 1.3,  color: 0xc9a227, len: 3.6, metal: 0.9, desc: '传说级鱼竿，专为巨物打造。' },
  lstarter: { type: 'lure',  name: '入门露亚竿', price: 120,  lvl: 1, strength: 1.0,  sens: 1.0,  cast: 1.0,  color: 0x22324e, len: 2.1, metal: 0.3, desc: '带纺车轮的直柄竿，主动寻找掠食鱼。' },
  lpro:     { type: 'lure',  name: '碳素路亚竿', price: 520,  lvl: 3, strength: 1.25, sens: 1.2,  cast: 1.15, color: 0x1f4a32, len: 2.25, metal: 0.4, desc: '腰力强劲，抛投更远。' },
  lelite:   { type: 'lure',  name: '大师枪柄竿', price: 1800, lvl: 5, strength: 1.5,  sens: 1.4,  cast: 1.3,  color: 0x4a2266, len: 2.4, metal: 0.6, desc: '顶级枪柄竿，搏击巨物的利器。' },
};
export const LINES = {
  nylon:  { name: '尼龙线',    price: 0,    lvl: 1, max: 1.0,  desc: '基础鱼线。' },
  fluoro: { name: '碳素线',    price: 120,  lvl: 1, max: 1.12, desc: '耐磨，断线张力 +12%。' },
  pe:     { name: 'PE 编织线', price: 450,  lvl: 3, max: 1.25, desc: '强韧，断线张力 +25%。' },
  titan:  { name: '钛合金线',  price: 1500, lvl: 5, max: 1.4,  desc: '极限强度，断线张力 +40%。' },
};
export const NETS = {
  small: { name: '小号鱼护', price: 0,   lvl: 1, cap: 8,  desc: '能装 8 条鱼。' },
  mid:   { name: '中号鱼护', price: 200, lvl: 2, cap: 16, desc: '能装 16 条鱼。' },
  big:   { name: '大号鱼护', price: 700, lvl: 4, cap: 30, desc: '能装 30 条鱼。' },
};
// 台钓鱼饵（消耗品）：wait 等待时间倍率；attract 特定鱼种权重倍率；rar 稀有度倍率
export const BAITS = {
  none:    { name: '无饵',     pack: 0,  price: 0,   lvl: 1, wait: 1.35, attract: {}, rar: {}, desc: '空钩，鱼咬口慢。' },
  worm:    { name: '蚯蚓',     pack: 10, price: 20,  lvl: 1, wait: 0.8,  attract: { crucian: 1.6, tilapia: 1.3, perch: 1.3 }, rar: {}, desc: '万能饵，咬口更快。' },
  corn:    { name: '玉米粒',   pack: 10, price: 30,  lvl: 1, wait: 0.85, attract: { carp: 2.5, grass: 2.5, goldcarp: 2.2 }, rar: {}, desc: '鲤鱼、草鱼、黄金鲤最爱。' },
  shrimp:  { name: '活虾',     pack: 5,  price: 60,  lvl: 2, wait: 0.75, attract: { mandarin: 2.5, perch: 2, trout: 1.6, arowana: 1.5 }, rar: { rare: 1.4 }, desc: '吸引鳜鱼、鲈鱼等掠食鱼。' },
  secret:  { name: '秘制窝料', pack: 3,  price: 150, lvl: 3, wait: 0.5,  attract: {}, rar: { rare: 1.3, epic: 2.2, legend: 2.0 }, desc: '大幅提升史诗、传说鱼概率。' },
  koifood: { name: '锦鲤灵饵', pack: 2,  price: 400, lvl: 5, wait: 0.8,  attract: { koi: 8 }, rar: { legend: 2.0 }, desc: '传说中能引来锦鲤王的灵饵。' },
};
// 露亚饵（永久）：pref 最佳收线速度(0-1)，zone 区间半宽，twitch 抽竿加成
export const LURES = {
  spoon:    { name: '亮片',   price: 60,  lvl: 1, pref: 0.55, zone: 0.2,  twitch: 0.3, color: 0xd8d8d8, shape: 'spoon',  attract: { perch: 1.5, trout: 2, horsemouth: 2 }, rar: {}, desc: '中速匀收，闪光诱鱼。' },
  minnow:   { name: '米诺',   price: 150, lvl: 2, pref: 0.75, zone: 0.16, twitch: 0.8, color: 0x3a8ac0, shape: 'minnow', attract: { culter: 3, perch: 1.8, gancyu: 1.5 }, rar: {}, desc: '快收 + 抽竿，翘嘴克星。' },
  softworm: { name: '软虫',   price: 250, lvl: 3, pref: 0.3,  zone: 0.18, twitch: 0.4, color: 0x6a4a8a, shape: 'worm',   attract: { mandarin: 3, snakehead: 1.6 }, rar: {}, desc: '慢收贴底，鳜鱼最爱。' },
  popper:   { name: '波爬',   price: 350, lvl: 4, pref: 0.4,  zone: 0.15, twitch: 1.0, color: 0xe0d040, shape: 'popper', attract: { snakehead: 3, culter: 1.5 }, rar: { epic: 1.3 }, desc: '水面系，抽竿“啵啵”作响，引黑鱼炸水。' },
  frog:     { name: '雷蛙',   price: 900, lvl: 6, pref: 0.25, zone: 0.15, twitch: 0.7, color: 0x3a8a2a, shape: 'frog',   attract: { snakehead: 4, gancyu: 2.5 }, rar: { legend: 1.8 }, desc: '慢拖 + 轻抽，巨物杀手。' },
};
export const RARITY_BASE = {
  float: { common: 62, rare: 27, epic: 9, legend: 2 },
  lure:  { common: 42, rare: 40, epic: 14, legend: 4 },
};
// 累计经验阈值：LEVEL_XP[i] = 达到 i+1 级所需
export const LEVEL_XP = [0, 60, 160, 320, 560, 900, 1400, 2100, 3000, 4200];
export const MAX_LEVEL = LEVEL_XP.length;

// 每日任务模板（按日期种子随机抽 3 个不同类型）
export const DAILY_TEMPLATES = [
  { type: 'catch_n',       tiers: [[5, { coins: 40 }], [8, { coins: 70, bait: { worm: 10 } }], [12, { coins: 110, bait: { corn: 10 } }]], text: n => `钓到 ${n} 条鱼` },
  { type: 'catch_species', tiers: [[1, { coins: 60, bait: { worm: 10 } }]], text: (n, p) => `钓到一条「${p}」` },
  { type: 'catch_weight',  tiers: [[2, { coins: 80 }], [5, { coins: 150, bait: { shrimp: 5 } }]], text: n => `钓到一条超过 ${n} kg 的鱼` },
  { type: 'sell_coins',    tiers: [[100, { coins: 50, bait: { corn: 10 } }], [250, { coins: 100, bait: { shrimp: 5 } }]], text: n => `出售鱼获累计 ${n} 金币` },
  { type: 'lure_catch',    tiers: [[2, { coins: 100 }], [4, { coins: 180, bait: { secret: 1 } }]], text: n => `用露亚竿钓到 ${n} 条鱼` },
  { type: 'perfect',       tiers: [[3, { coins: 80, bait: { shrimp: 5 } }], [5, { coins: 140, bait: { secret: 2 } }]], text: n => `完美提竿 / 刺鱼 ${n} 次` },
  { type: 'rare_catch',    tiers: [[1, { coins: 120, bait: { shrimp: 5 } }], [2, { coins: 220, bait: { secret: 2 } }]], text: n => `钓到 ${n} 条稀有或以上的鱼` },
];
// 主线 / 成就
export const MAIN_QUESTS = [
  { id: 'm1', name: '初次垂钓',   type: 'catch_n',      target: 3,    text: '累计钓到 3 条鱼',          reward: { coins: 50, rod: 'lstarter', lure: 'spoon' } },
  { id: 'm2', name: '露亚初体验', type: 'lure_catch',   target: 1,    text: '用露亚竿钓到 1 条鱼',      reward: { coins: 80, lure: 'minnow' } },
  { id: 'm3', name: '小有收获',   type: 'sell_coins',   target: 300,  text: '累计出售 300 金币的鱼获',  reward: { coins: 100, line: 'fluoro' } },
  { id: 'm4', name: '眼明手快',   type: 'perfect',      target: 10,   text: '累计完美提竿 / 刺鱼 10 次', reward: { coins: 150, bait: { shrimp: 10 } } },
  { id: 'm5', name: '图鉴新秀',   type: 'species',      target: 6,    text: '收集 6 种不同的鱼',        reward: { coins: 200, bait: { secret: 3 } } },
  { id: 'm6', name: '渐入佳境',   type: 'level',        target: 5,    text: '钓鱼等级达到 5 级',         reward: { coins: 400, net: 'mid' } },
  { id: 'm7', name: '巨物猎手',   type: 'max_weight',   target: 15,   text: '钓到一条超过 15 kg 的鱼',  reward: { coins: 600, bait: { koifood: 2 } } },
  { id: 'm8', name: '湖之传说',   type: 'legend',       target: 1,    text: '钓到任意一条传说鱼',        reward: { coins: 1000, line: 'pe' } },
  { id: 'm9', name: '图鉴大师',   type: 'species',      target: 15,   text: '收集全部 15 种鱼',         reward: { coins: 3000, rod: 'goldrod' } },
];
