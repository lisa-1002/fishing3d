// 装备、鱼饵、路亚饵、等级、任务等静态数据
// 鱼竿外观复用同一套管模（颜色 / 长度 / 金属度），数值和名字拉开 1→20 的梯度。
export const RODS = {
  // type: float 台钓竿 / lure 露亚竿；strength 拉力，sens 灵敏度，cast 投远倍率
  bamboo:     { type: 'float', name: '竹制台钓竿', price: 0,     lvl: 1,  strength: 1.00, sens: 1.00, cast: 1.00, color: 0xc9a35a, len: 2.70, metal: 0.0, desc: '爷爷传下来的老竹竿，朴实耐用。' },
  carbon:     { type: 'float', name: '碳素台钓竿', price: 150,   lvl: 1,  strength: 1.15, sens: 1.20, cast: 1.10, color: 0x17181c, len: 3.00, metal: 0.3, desc: '轻盈的碳素竿，手感更灵敏。' },
  pro:        { type: 'float', name: '高碳竞技竿', price: 600,   lvl: 3,  strength: 1.35, sens: 1.40, cast: 1.20, color: 0x7a1020, len: 3.30, metal: 0.4, desc: '竞技级调性，中大型鱼也能从容应对。' },
  comp:       { type: 'float', name: '复合竞技竿', price: 1100,  lvl: 5,  strength: 1.48, sens: 1.50, cast: 1.26, color: 0x2a3344, len: 3.45, metal: 0.45, desc: '碳布混编，比高碳竿更有腰力。' },
  goldrod:    { type: 'float', name: '金龙台钓竿', price: 2200,  lvl: 6,  strength: 1.60, sens: 1.60, cast: 1.30, color: 0xc9a227, len: 3.60, metal: 0.9, desc: '金龙压身，中鱼时心里更稳。' },
  reservoir:  { type: 'float', name: '水库综合竿', price: 3800,  lvl: 8,  strength: 1.74, sens: 1.70, cast: 1.38, color: 0x1a4a6a, len: 3.70, metal: 0.5, desc: '守大水面的综合调，回鱼不慌。' },
  qing:       { type: 'float', name: '大物青鱼竿', price: 6200,  lvl: 10, strength: 1.88, sens: 1.80, cast: 1.46, color: 0x143028, len: 3.78, metal: 0.45, desc: '腰力下沉，专克青鱼、草鱼这类沉鱼。' },
  dragonf:    { type: 'float', name: '龙纹台钓竿', price: 9200,  lvl: 12, strength: 2.02, sens: 1.90, cast: 1.52, color: 0x8a1a28, len: 3.86, metal: 0.55, desc: '竿身压着暗纹，又轻又韧。' },
  ironf:      { type: 'float', name: '玄铁巨物竿', price: 13000, lvl: 14, strength: 2.16, sens: 2.00, cast: 1.58, color: 0x2c2c30, len: 3.92, metal: 0.75, desc: '又硬又沉，巨物转身也不怕。' },
  nightf:     { type: 'float', name: '夜战台钓竿', price: 17500, lvl: 16, strength: 2.30, sens: 2.08, cast: 1.64, color: 0x101820, len: 3.98, metal: 0.6, desc: '夜钓深潭的硬调竿，回鱼更快。' },
  redgold:    { type: 'float', name: '赤金战竿',   price: 23000, lvl: 18, strength: 2.44, sens: 2.16, cast: 1.70, color: 0xb8860b, len: 4.04, metal: 0.85, desc: '老钓手才配得上的赤金色战竿。' },
  lakegod:    { type: 'float', name: '湖神台钓竿', price: 30000, lvl: 20, strength: 2.60, sens: 2.26, cast: 1.78, color: 0xe8c85a, len: 4.10, metal: 0.95, desc: '静湖传说里的顶点鱼竿，拉力深不见底。' },

  lstarter:   { type: 'lure', name: '入门露亚竿', price: 120,   lvl: 1,  strength: 1.00, sens: 1.00, cast: 1.00, color: 0x22324e, len: 2.10, metal: 0.3, desc: '带纺车轮的直柄竿，主动寻找掠食鱼。' },
  lpro:       { type: 'lure', name: '碳素路亚竿', price: 520,   lvl: 3,  strength: 1.25, sens: 1.20, cast: 1.15, color: 0x1f4a32, len: 2.25, metal: 0.4, desc: '腰力强劲，抛投更远。' },
  lstep:      { type: 'lure', name: '进阶直柄竿', price: 980,   lvl: 4,  strength: 1.38, sens: 1.30, cast: 1.22, color: 0x2a3a28, len: 2.32, metal: 0.35, desc: '比入门竿多一截腰力，抛投更稳。' },
  lelite:     { type: 'lure', name: '大师枪柄竿', price: 1800,  lvl: 5,  strength: 1.50, sens: 1.40, cast: 1.30, color: 0x4a2266, len: 2.40, metal: 0.6, desc: '枪柄握感扎实，中型掠食鱼的好搭档。' },
  lfast:      { type: 'lure', name: '中快调枪柄', price: 3200,  lvl: 7,  strength: 1.64, sens: 1.50, cast: 1.38, color: 0x3a2a4a, len: 2.46, metal: 0.45, desc: '中快调，适合日常搜索。' },
  llong:      { type: 'lure', name: '远投路亚竿', price: 5200,  lvl: 9,  strength: 1.78, sens: 1.60, cast: 1.46, color: 0x1a3050, len: 2.52, metal: 0.5, desc: '竿稍更挺，饵能送得更远。' },
  lheavy:     { type: 'lure', name: '重型路亚竿', price: 7800,  lvl: 11, strength: 1.92, sens: 1.70, cast: 1.52, color: 0x4a1a22, len: 2.56, metal: 0.55, desc: '硬调重型，中大掠食鱼也能压住。' },
  lpower:     { type: 'lure', name: '雷强战斗竿', price: 11000, lvl: 13, strength: 2.06, sens: 1.80, cast: 1.58, color: 0x1a3a22, len: 2.60, metal: 0.5, desc: '雷强调性，黑鱼、狗鱼的克星。' },
  lgiant:     { type: 'lure', name: '巨物枪柄竿', price: 15000, lvl: 15, strength: 2.20, sens: 1.90, cast: 1.64, color: 0x3a2a18, len: 2.64, metal: 0.7, desc: '为鳡鱼、哲罗准备的重枪柄。' },
  lsea:       { type: 'lure', name: '海鲈路亚竿', price: 20000, lvl: 17, strength: 2.34, sens: 2.00, cast: 1.70, color: 0x163040, len: 2.68, metal: 0.6, desc: '借了海钓的腰力，淡水巨物也够用。' },
  lblack:     { type: 'lure', name: '黑金雷强竿', price: 26000, lvl: 19, strength: 2.48, sens: 2.10, cast: 1.76, color: 0x1a140c, len: 2.72, metal: 0.85, desc: '竿身黑金，专为炸水巨物而生。' },
  lgod:       { type: 'lure', name: '湖神路亚竿', price: 32000, lvl: 20, strength: 2.62, sens: 2.20, cast: 1.82, color: 0xc9a227, len: 2.76, metal: 0.95, desc: '和湖神台钓竿一对，路亚的尽头。' },
};
export const LINES = {
  nylon:      { name: '尼龙线',     price: 0,     lvl: 1,  max: 1.00, desc: '基础鱼线。' },
  fluoro:     { name: '碳素线',     price: 120,   lvl: 1,  max: 1.12, desc: '耐磨，断线张力 +12%。' },
  pe:         { name: 'PE 编织线',  price: 450,   lvl: 3,  max: 1.25, desc: '强韧，断线张力 +25%。' },
  titan:      { name: '钛合金线',   price: 1500,  lvl: 5,  max: 1.40, desc: '极限强度，断线张力 +40%。' },
  braid:      { name: '八编大力线', price: 2800,  lvl: 8,  max: 1.55, desc: '八编更圆润，断线张力 +55%。' },
  hfluoro:    { name: '高碳氟线',   price: 5200,  lvl: 11, max: 1.72, desc: '又硬又沉，断线张力 +72%。' },
  wire:       { name: '钢丝前导',   price: 9000,  lvl: 14, max: 1.90, desc: '防咬口，断线张力 +90%。' },
  dragonline: { name: '龙筋线',     price: 15000, lvl: 17, max: 2.10, desc: '巨物也难挣断，张力 +110%。' },
  godline:    { name: '湖神线',     price: 24000, lvl: 20, max: 2.32, desc: '湖神配线，断线张力 +132%。' },
};
export const NETS = {
  small: { name: '小号鱼护', price: 0,     lvl: 1,  cap: 12, desc: '能装 12 条鱼。' },
  mid:   { name: '中号鱼护', price: 200,   lvl: 2,  cap: 20, desc: '能装 20 条鱼。' },
  big:   { name: '大号鱼护', price: 700,   lvl: 4,  cap: 30, desc: '能装 30 条鱼。' },
  xl:    { name: '加厚鱼护', price: 1600,  lvl: 8,  cap: 40, desc: '能装 40 条鱼，挂得住。' },
  huge:  { name: '巨物鱼护', price: 4200,  lvl: 12, cap: 52, desc: '能装 52 条，巨物也不挤。' },
  hold:  { name: '船载鱼舱', price: 9000,  lvl: 16, cap: 68, desc: '能装 68 条，像小船的鱼舱。' },
  vault: { name: '湖神鱼仓', price: 18000, lvl: 20, cap: 88, desc: '能装 88 条，满满一仓。' },
};
// 台钓鱼饵（消耗品）：wait 等待时间倍率；attract 特定鱼种权重；rar 稀有度倍率；power 抬高非普通鱼权重
export const BAITS = {
  none:       { name: '无饵',     pack: 0,  price: 0,    lvl: 1,  wait: 1.35, power: 1,    attract: {}, rar: {}, desc: '空钩，鱼咬口慢。' },
  worm:       { name: '蚯蚓',     pack: 10, price: 20,   lvl: 1,  wait: 0.8,  power: 1,    attract: { crucian: 1.6, tilapia: 1.3, perch: 1.3, loach: 1.5, yellowcat: 1.4, mudcarp: 1.3 }, rar: {}, desc: '万能饵，咬口更快。' },
  corn:       { name: '玉米粒',   pack: 10, price: 30,   lvl: 1,  wait: 0.85, power: 1,    attract: { carp: 2.5, grass: 2.5, goldcarp: 2.2, blackcarp: 1.8, bream: 1.6, mudcarp: 1.8 }, rar: {}, desc: '鲤鱼、草鱼、黄金鲤最爱。' },
  shrimp:     { name: '活虾',     pack: 5,  price: 60,   lvl: 2,  wait: 0.75, power: 1,    attract: { mandarin: 2.5, perch: 2, trout: 1.6, arowana: 1.5, catfish: 2.0, eel: 1.8, softshell: 1.6, yellowcat: 1.7 }, rar: { rare: 1.4 }, desc: '吸引鳜鱼、鲈鱼等掠食鱼。' },
  secret:     { name: '秘制窝料', pack: 3,  price: 150,  lvl: 3,  wait: 0.5,  power: 1,    attract: {}, rar: { rare: 1.3, epic: 2.2, legend: 2.0 }, desc: '大幅提升史诗、传说鱼概率。' },
  koifood:    { name: '锦鲤灵饵', pack: 2,  price: 400,  lvl: 5,  wait: 0.8,  power: 1,    attract: { koi: 8 }, rar: { legend: 2.0 }, desc: '传说中能引来锦鲤王的灵饵。' },
  rice:       { name: '酒米',     pack: 8,  price: 50,   lvl: 7,  wait: 0.72, power: 1.12, attract: { crucian: 1.8, carp: 1.8, bream: 2.0, mudcarp: 1.6 }, rar: {}, desc: '酒香诱鲫、鲤、鳊，守得更稳。' },
  liver:      { name: '鸡肝',     pack: 5,  price: 180,  lvl: 10, wait: 0.68, power: 1.28, attract: { catfish: 2.4, eel: 2.2, yellowcat: 2.0, softshell: 1.8 }, rar: { rare: 1.25 }, desc: '夜钓腥饵，鲶、鳝、黄颡爱来。' },
  snail:      { name: '螺肉青饵', pack: 4,  price: 320,  lvl: 13, wait: 0.62, power: 1.4,  attract: { blackcarp: 3.2, carp: 1.6, goldcarp: 1.8 }, rar: { epic: 1.25 }, desc: '螺香专攻青鱼，黄金鲤也会凑过来。' },
  dragonbait: { name: '龙涎窝料', pack: 2,  price: 720,  lvl: 16, wait: 0.46, power: 1.65, attract: {}, rar: { epic: 1.8, legend: 1.65 }, desc: '比秘制窝更猛，史诗和传说都爱闻。' },
  godbait:    { name: '湖神灵饵', pack: 1,  price: 1400, lvl: 19, wait: 0.7,  power: 1.9,  attract: { koi: 6, sturgeon: 4.5 }, rar: { legend: 2.1 }, desc: '只为锦鲤王和千年鳇准备的一颗饵。' },
};
// 露亚饵（永久）：pref 最佳收线速度(0-1)，zone 区间半宽，twitch 抽竿加成，power 抬高非普通鱼
export const LURES = {
  spoon:    { name: '亮片',     price: 60,   lvl: 1,  pref: 0.55, zone: 0.20, twitch: 0.3, power: 1,    color: 0xd8d8d8, shape: 'spoon',  attract: { perch: 1.5, trout: 2, horsemouth: 2, bleak: 1.8, redtail: 1.4 }, rar: {}, desc: '中速匀收，闪光诱鱼。' },
  minnow:   { name: '米诺',     price: 150,  lvl: 2,  pref: 0.75, zone: 0.16, twitch: 0.8, power: 1,    color: 0x3a8ac0, shape: 'minnow', attract: { culter: 3, perch: 1.8, gancyu: 1.5, redtail: 2.2, pike: 1.5 }, rar: {}, desc: '快收 + 抽竿，翘嘴克星。' },
  softworm: { name: '软虫',     price: 250,  lvl: 3,  pref: 0.30, zone: 0.18, twitch: 0.4, power: 1,    color: 0x6a4a8a, shape: 'worm',   attract: { mandarin: 3, snakehead: 1.6 }, rar: {}, desc: '慢收贴底，鳜鱼最爱。' },
  popper:   { name: '波爬',     price: 350,  lvl: 4,  pref: 0.40, zone: 0.15, twitch: 1.0, power: 1,    color: 0xe0d040, shape: 'popper', attract: { snakehead: 3, culter: 1.5 }, rar: { epic: 1.3 }, desc: '水面系，抽竿“啵啵”作响，引黑鱼炸水。' },
  frog:     { name: '雷蛙',     price: 900,  lvl: 6,  pref: 0.25, zone: 0.15, twitch: 0.7, power: 1,    color: 0x3a8a2a, shape: 'frog',   attract: { snakehead: 4, gancyu: 2.5, pike: 2.0, taimen: 1.8 }, rar: { legend: 1.8 }, desc: '慢拖 + 轻抽，巨物杀手。' },
  crank:    { name: '摇摆饵',   price: 480,  lvl: 8,  pref: 0.62, zone: 0.16, twitch: 0.45, power: 1.25, color: 0xc45a28, shape: 'minnow', attract: { perch: 2.2, trout: 2.2, redtail: 2.0, culter: 1.4 }, rar: {}, desc: '舌板摇摆，鲈鱼和虹鳟追得很欢。' },
  pencil:   { name: '铅笔',     price: 1200, lvl: 11, pref: 0.42, zone: 0.14, twitch: 1.05, power: 1.4,  color: 0xe8e0c0, shape: 'popper', attract: { snakehead: 2.4, culter: 2.2, redtail: 1.8 }, rar: { epic: 1.25 }, desc: '水面之字抽，黑鱼和翘嘴爱炸。' },
  swimbait: { name: '软鱼',     price: 2400, lvl: 14, pref: 0.48, zone: 0.15, twitch: 0.55, power: 1.55, color: 0x6a8a48, shape: 'minnow', attract: { pike: 2.6, gancyu: 2.2, taimen: 2.0, perch: 1.5 }, rar: { epic: 1.35 }, desc: '像一条小鱼在逃，狗鱼、鳡鱼忍不住。' },
  magnum:   { name: '巨物米诺', price: 5200, lvl: 17, pref: 0.34, zone: 0.14, twitch: 0.7,  power: 1.75, color: 0xd0a030, shape: 'minnow', attract: { gancyu: 3.2, taimen: 3.0, pike: 2.4, snakehead: 1.8 }, rar: { legend: 1.5 }, desc: '大号米诺，专逗淡水里的老虎。' },
  godfrog:  { name: '金雷蛙',   price: 9600, lvl: 20, pref: 0.22, zone: 0.13, twitch: 0.85, power: 2.0,  color: 0xc9a227, shape: 'frog',   attract: { snakehead: 3.5, gancyu: 3.0, taimen: 2.8, pike: 2.2 }, rar: { legend: 1.75 }, desc: '金色雷蛙，慢拖也能把传说鱼请上来。' },
};
export const RARITY_BASE = {
  float: { common: 62, rare: 27, epic: 9, legend: 2 },
  lure:  { common: 42, rare: 40, epic: 14, legend: 4 },
};
// 传说保底：某钓点连续 N 条非传说后必出传说（钓到传说即重置）；新手湖湾的第一条传说更快
export const PITY = { normal: 25, first: 14 };
// 累计经验阈值：LEVEL_XP[i] = 达到 i+1 级所需。前 10 级与旧档相同，11–20 级逐渐变长。
export const LEVEL_XP = [
  0, 60, 160, 320, 560, 900, 1400, 2100, 3000, 4200,
  5700, 7500, 9700, 12300, 15400,
  19100, 23500, 28700, 34800, 42000,
];
export const MAX_LEVEL = LEVEL_XP.length;
// 老余交情：卖鱼给他累计的金币。LAOYU_XP[i] = 达到交情 i+1 级。
export const LAOYU_XP = [
  0, 80, 200, 420, 750, 1200, 1800, 2600, 3600, 4900,
  6500, 8500, 11000, 14000, 17600,
  21800, 26800, 32600, 39400, 47200,
];
export const LAOYU_MAX = LAOYU_XP.length;

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
  { id: 'm5', name: '图鉴新秀',   type: 'species',      target: 8,    text: '收集 8 种不同的鱼',        reward: { coins: 200, bait: { secret: 3 } } },
  { id: 'm6', name: '渐入佳境',   type: 'level',        target: 5,    text: '钓鱼等级达到 5 级',         reward: { coins: 400, net: 'mid' } },
  { id: 'm7', name: '巨物猎手',   type: 'max_weight',   target: 15,   text: '钓到一条超过 15 kg 的鱼',  reward: { coins: 600, bait: { koifood: 2 } } },
  { id: 'm8', name: '湖之传说',   type: 'legend',       target: 1,    text: '钓到任意一条传说鱼',        reward: { coins: 1000, line: 'pe' } },
  { id: 'm9', name: '图鉴达人',   type: 'species',      target: 20,   text: '收集 20 种不同的鱼',       reward: { coins: 1500, bait: { koifood: 2 } } },
  { id: 'm10', name: '图鉴大师',  type: 'species',      target: 30,   text: '收集全部 30 种鱼',         reward: { coins: 4000, rod: 'goldrod' } },
  { id: 'm11', name: '钥匙旅人',  type: 'locations',    target: 5,    text: '经黑衣人开船，踏足全部 5 个钓点', reward: { coins: 800, line: 'pe' } },
  { id: 'm12', name: '登堂入室',  type: 'level',        target: 10,   text: '钓鱼等级达到 10 级',        reward: { coins: 1600, rod: 'qing', line: 'braid' } },
  { id: 'm13', name: '炉火纯青',  type: 'level',        target: 15,   text: '钓鱼等级达到 15 级',        reward: { coins: 3200, rod: 'lgiant', lure: 'swimbait' } },
  { id: 'm14', name: '湖上宗师',  type: 'level',        target: 20,   text: '钓鱼等级达到 20 级',        reward: { coins: 8000, rod: 'lakegod', line: 'godline' } },
];
