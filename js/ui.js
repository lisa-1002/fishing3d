// 界面：HUD、鱼护、商店、任务、装备、图鉴
import { SPECIES, RARITY, speciesById, catchLevel } from './fish.js?v=9';
import { RODS, LINES, NETS, BAITS, LURES, MAIN_QUESTS } from './data.js?v=9';
import { LOCATIONS, mapStatus } from './locations.js';

const $ = id => document.getElementById(id);
const fmtW = w => (w >= 10 ? w.toFixed(1) : w.toFixed(2)) + 'kg';
const methodName = m => ({ float: '台钓', lure: '露亚', both: '台钓/露亚' })[m];

export function createUI(save, S, ctx) {
  const UI = {};
  const panel = $('panel'), pTitle = $('panelTitle'), pTabs = $('panelTabs'), pBody = $('panelBody'), pFoot = $('panelFoot');
  let current = null, tab = null, allowSell = false;

  let toastTimer = 0;
  UI.toast = (msg, ms = 1900) => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms); };

  UI.refreshHud = () => {
    $('coins').textContent = save.coins;
    $('lvl').textContent = S.level();
    $('xpFill').style.width = `${S.levelProgress() * 100}%`;
    $('netCount').textContent = `${save.net.length}/${S.netCap()}`;
    { const mn = document.getElementById('menuNet'); if (mn) mn.textContent = `鱼护 ${save.net.length}/${S.netCap()}`; }
    $('netBtn').classList.toggle('full', S.netFull());
    const n = S.claimableCount();
    $('questDot').textContent = n; $('questDot').style.display = n ? 'flex' : 'none';
    const lureOk = S.canLure();
    const mb = $('modeBtn');
    mb.innerHTML = save.equip.mode === 'lure' ? '<b>露亚</b><small>切换台钓</small>' : `<b>台钓</b><small>${lureOk ? '切换露亚' : '露亚未解锁'}</small>`;
    mb.classList.toggle('lure', save.equip.mode === 'lure');
    const rod = S.rod();
    $('gearInfo').textContent = save.equip.mode === 'lure'
      ? `${rod.name} · ${S.lure().name}`
      : `${rod.name} · ${S.bait().name}${S.baitId() !== 'none' ? '×' + save.bait[S.baitId()] : ''}`;
    const loc = S.location();
    const li = $('locInfo'); if (li) li.textContent = save.cycle ? `📍 ${loc.name} · 第 ${save.cycle} 次轮回` : `📍 ${loc.name}`;
    const pi = $('pityInfo');
    if (pi && S.pityInfo) {
      const p = S.pityInfo();
      pi.textContent = `🐉 传说保底 ${p.n}/${p.N}${p.left <= 3 ? ' · 快出了！' : ''}`;
      pi.title = `本钓点再钓 ${p.left} 条内必出传说鱼（钓到传说后重置）`;
    }
    if (current) UI.render();
  };

  UI.open = (name, t, opts = {}) => {
    if (!ctx.canOpenPanel()) { UI.toast('请先完成当前这一竿'); return; }
    if (name === 'shop' && !opts.fromNpc) {
      UI.toast('去房子商店'); return;
    }
    if (name === 'net') {
      allowSell = !!opts.allowSell;
      if (!allowSell && opts.fromNpc === false) {
        // HUD 鱼护：仅查看
      }
    } else {
      allowSell = false;
    }
    current = name; tab = t || ({ shop: 'rod', quest: 'daily', equip: 'gear' })[name] || null;
    panel.classList.add('show'); UI.render();
  };
  UI.openShop = () => UI.open('shop', 'rod', { fromNpc: true });
  UI.openSell = () => UI.open('net', null, { fromNpc: true, allowSell: true });
  UI.close = () => { current = null; panel.classList.remove('show'); };
  UI.isOpen = () => !!current;
  $('panelClose').addEventListener('click', UI.close);
  panel.addEventListener('click', e => { if (e.target === panel) UI.close(); });

  function tabs(list) {
    pTabs.innerHTML = list.map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('');
    pTabs.style.display = list.length ? 'flex' : 'none';
  }
  const thumb = id => `<img src="${ctx.thumbs()[id] || ''}" alt="">`;
  const rarTag = sp => `<span class="rtag" style="--rc:${RARITY[sp.rarity].color}">${RARITY[sp.rarity].name}</span>`;

  UI.render = () => {
    pFoot.innerHTML = '';
    if (current === 'net') renderNet();
    else if (current === 'shop') renderShop();
    else if (current === 'quest') renderQuests();
    else if (current === 'map') renderMap();
    else if (current === 'equip') renderEquip();
    else if (current === 'dex') renderDex();
  };

  // ---------- 鱼护 ----------
  function renderNet() {
    const ly = S.laoyuLevel();
    const bonus = Math.round(S.laoyuBonus() * 100);
    pTitle.innerHTML = allowSell
      ? `老余收购 <small>交情 Lv.${ly}${ly >= 20 ? ' 已满' : ''} · 加成 +${bonus}%</small>`
      : `鱼护 <small>${save.net.length} / ${S.netCap()}</small>`;
    tabs([]);
    if (!save.net.length) {
      pBody.innerHTML = allowSell
        ? '<div class="empty">鱼护空空，没有可卖的鱼。</div>'
        : '<div class="empty">鱼护空空如也，快去钓鱼吧！<br><small style="opacity:.7">出售请走到码头渔夫处</small></div>';
      return;
    }
    const list = [...save.net].sort((a, b) => S.price(b) - S.price(a));
    pBody.innerHTML = (allowSell ? '' : '<div class="sec">查看鱼获 · 出售请找码头渔夫</div>') + `<div class="list">${list.map(f => {
      const sp = speciesById[f.id];
      const sellBtn = allowSell
        ? `<button class="sell" data-act="sell" data-id="${f.uid}">出售 <b>${S.price(f)}</b></button>`
        : `<button class="sell ghost" disabled title="去找渔夫">—</button>`;
      return `<div class="row" style="--rc:${RARITY[sp.rarity].color}">
        <div class="thumb">${thumb(f.id)}</div>
        <div class="info"><div class="nm">${sp.name} ${rarTag(sp)} ${f.perfect ? '<span class="ptag">完美</span>' : ''}</div><div class="sub">${fmtW(f.w)} · Lv.${catchLevel(sp, f.w)}</div></div>
        <button class="keep ${f.keep ? 'on' : ''}" data-act="keep" data-id="${f.uid}">${f.keep ? '★ 保留' : '☆ 保留'}</button>
        ${sellBtn}
      </div>`;
    }).join('')}</div>`;
    if (allowSell) {
      const sellable = save.net.filter(f => !f.keep);
      const total = sellable.reduce((a, f) => a + S.price(f), 0);
      pFoot.innerHTML = `<button class="big" data-act="sellAll" ${sellable.length ? '' : 'disabled'}>全部出售（不含保留）<b>+${total} 金币</b></button>`;
    } else {
      pFoot.innerHTML = `<div class="sec" style="text-align:center;padding:8px">走到码头渔夫旁按 E 卖鱼</div>`;
    }
  }

  // ---------- 商店 ----------
  function shopItem(cat, id, d, extra, ownedFlag) {
    const lvlOk = S.level() >= d.lvl;
    const stats = extra;
    let btn;
    if (ownedFlag) btn = `<button disabled>已拥有</button>`;
    else if (!lvlOk) btn = `<button disabled>${d.lvl} 级解锁</button>`;
    else btn = `<button class="buy ${save.coins < d.price ? 'poor' : ''}" data-act="buy" data-cat="${cat}" data-id="${id}">${d.price ? `<span class="ico coin"></span>${d.price}` : '免费'}</button>`;
    return `<div class="row shop ${lvlOk ? '' : 'locked'}"><div class="info"><div class="nm">${d.name}${d.pack ? ` ×${d.pack}` : ''}</div><div class="sub">${d.desc}</div>${stats ? `<div class="stats">${stats}</div>` : ''}</div>${btn}</div>`;
  }
  const bar = (label, v, max) => `<span class="st"><i>${label}</i><em><u style="width:${Math.min(100, v / max * 100)}%"></u></em></span>`;
  const maxOf = (table, key) => Math.max(1e-6, ...Object.values(table).map(d => d[key] || 0));
  function renderShop() {
    pTitle.innerHTML = `房子商店 <small><span class="ico coin"></span>${save.coins}</small>`;
    tabs([['rod', '鱼竿'], ['line', '鱼线'], ['bait', '鱼饵'], ['lure', '路亚饵'], ['net', '鱼护']]);
    let html = '';
    if (tab === 'rod') {
      for (const type of ['float', 'lure']) {
        html += `<div class="sec">${type === 'float' ? '台钓竿 · 等漂、看口、提竿' : '露亚竿 · 抛投、收线、诱鱼攻击'}</div>`;
        const rs = maxOf(RODS, 'strength'), rn = maxOf(RODS, 'sens'), rc = maxOf(RODS, 'cast');
        for (const [id, d] of Object.entries(RODS)) if (d.type === type && d.price > 0)
          html += shopItem('rod', id, d, bar('拉力', d.strength, rs) + bar('灵敏', d.sens, rn) + bar('投远', d.cast, rc) + `<span class="have">Lv.${d.lvl} 解锁</span>`, save.owned.rods.includes(id));
      }
    } else if (tab === 'line') {
      const lm = maxOf(LINES, 'max');
      for (const [id, d] of Object.entries(LINES)) if (d.price > 0) html += shopItem('line', id, d, bar('强度', d.max, lm), save.owned.lines.includes(id));
    } else if (tab === 'bait') {
      html += '<div class="sec">台钓消耗品，每抛一竿消耗 1 个</div>';
      const bp = maxOf(BAITS, 'power');
      for (const [id, d] of Object.entries(BAITS)) if (d.price > 0) html += shopItem('bait', id, d, bar('效力', d.power || 1, bp) + `<span class="have">持有 ${save.bait[id] || 0}</span>`, false);
    } else if (tab === 'lure') {
      html += '<div class="sec">露亚竿专用，永久使用</div>';
      const lp = maxOf(LURES, 'power');
      for (const [id, d] of Object.entries(LURES)) html += shopItem('lure', id, d, bar('效力', d.power || 1, lp) + bar('最佳速度', d.pref, 1), save.owned.lures.includes(id));
    } else if (tab === 'net') {
      for (const [id, d] of Object.entries(NETS)) if (d.price > 0) html += shopItem('net', id, d, '', save.owned.nets.includes(id));
    }
    pBody.innerHTML = html;
  }

  // ---------- 任务 ----------
  function rewardHtml(r) { return `<div class="reward">奖励：${S.rewardText(r)}</div>`; }
  function questRow(text, name, prog, target, r, state, act, id) {
    const pct = Math.min(1, prog / target);
    const shown = target > 50 || !Number.isInteger(prog) ? `${Math.floor(Math.min(prog, target))}/${target}` : `${Math.min(prog, target)}/${target}`;
    const btn = state === 'claimed' ? '<button disabled>已领取</button>' : state === 'ready' ? `<button class="claim" data-act="${act}" data-id="${id}">领取</button>` : '<button disabled>进行中</button>';
    return `<div class="row quest ${state}"><div class="info"><div class="nm">${name ? `<b>${name}</b> · ` : ''}${text}</div>
      <div class="qbar"><u style="width:${pct * 100}%"></u><span>${shown}</span></div>${rewardHtml(r)}</div>${btn}</div>`;
  }
  function renderQuests() {
    pTitle.innerHTML = '任务';
    tabs([['daily', '每日任务'], ['main', '主线 / 成就']]);
    const p = S.pityInfo ? S.pityInfo() : null;
    const pityHtml = p ? `<div class="pity"><span>🐉 传说保底（${S.location().name}）</span><div class="qbar"><u style="width:${p.n / p.N * 100}%"></u><span>${p.n}/${p.N}</span></div><small>最多再钓 ${p.left} 条必出传说鱼${p.first ? '（新手湖湾首条传说加速）' : ''}，传说鱼带有下一钓点的钥匙</small></div>` : '';
    if (tab === 'daily') {
      const d = save.daily;
      const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const h = Math.floor((next - now) / 3600000), m = Math.floor((next - now) / 60000) % 60;
      pBody.innerHTML = pityHtml + `<div class="sec">每天 0 点刷新 · 剩余 ${h} 小时 ${m} 分</div>` + d.quests.map((q, i) =>
        questRow(q.text, '', q.progress, q.target, q.reward, q.claimed ? 'claimed' : q.progress >= q.target ? 'ready' : 'doing', 'claimDaily', i)).join('');
    } else {
      pBody.innerHTML = pityHtml + MAIN_QUESTS.map(q => {
        const v = S.mainValue(q);
        return questRow(q.text, q.name, q.type === 'max_weight' ? Math.round(v * 10) / 10 : v, q.target, q.reward, save.mainClaimed[q.id] ? 'claimed' : v >= q.target ? 'ready' : 'doing', 'claimMain', q.id);
      }).join('');
    }
  }

  // ---------- 装备 ----------
  function opt(kind, id, name, sub, on) {
    return `<button class="opt ${on ? 'on' : ''}" data-act="equip" data-kind="${kind}" data-id="${id}"><b>${name}</b><small>${sub}</small></button>`;
  }
  function renderEquip() {
    pTitle.innerHTML = '装备';
    tabs([]);
    const e = save.equip;
    let h = `<div class="sec">钓法</div><div class="opts">
      ${opt('mode', 'float', '台钓', '挂饵等漂，看准黑漂提竿', e.mode === 'float')}
      ${opt('mode', 'lure', '露亚', S.canLure() ? '主动收线，诱鱼攻击' : '完成主线「初次垂钓」或在商店购买露亚竿', e.mode === 'lure')}</div>`;
    h += `<div class="sec">台钓竿</div><div class="opts">${save.owned.rods.filter(id => RODS[id].type === 'float').map(id => opt('float', id, RODS[id].name, `拉力${RODS[id].strength} 灵敏${RODS[id].sens} 投远${RODS[id].cast}`, e.float === id)).join('')}</div>`;
    const lr = save.owned.rods.filter(id => RODS[id].type === 'lure');
    h += `<div class="sec">露亚竿</div><div class="opts">${lr.length ? lr.map(id => opt('lure', id, RODS[id].name, `拉力${RODS[id].strength} 灵敏${RODS[id].sens} 投远${RODS[id].cast}`, e.lure === id)).join('') : '<div class="empty small">尚未拥有</div>'}</div>`;
    h += `<div class="sec">鱼线</div><div class="opts">${save.owned.lines.map(id => opt('line', id, LINES[id].name, `断线张力 ×${LINES[id].max}`, e.line === id)).join('')}</div>`;
    h += `<div class="sec">鱼饵（台钓）</div><div class="opts">${opt('bait', 'none', '无饵', '咬口慢', S.baitId() === 'none')}${Object.keys(BAITS).filter(id => id !== 'none' && save.bait[id] > 0).map(id => opt('bait', id, `${BAITS[id].name} ×${save.bait[id]}`, BAITS[id].desc, S.baitId() === id)).join('')}</div>`;
    h += `<div class="sec">路亚饵（露亚）</div><div class="opts">${save.owned.lures.length ? save.owned.lures.map(id => opt('lureItem', id, LURES[id].name, LURES[id].desc, e.lureItem === id)).join('') : '<div class="empty small">尚未拥有</div>'}</div>`;
    h += `<div class="sec">鱼护</div><div class="opts">${save.owned.nets.map(id => opt('net', id, NETS[id].name, `容量 ${NETS[id].cap}`, e.net === id)).join('')}</div>`;
    pBody.innerHTML = h;
  }

  // ---------- 钓点 ----------
  function renderMap() {
    pTitle.innerHTML = '选择钓点';
    tabs([]);
    const keys = S.heldKeys();
    const keyNames = keys.map(id => {
      const L = LOCATIONS.find(l => l.id === id);
      return L ? L.keyName : (id === 'rainbow' ? '虹桥钥匙' : id);
    });
    const keeper = S.allMaps() ? '黄衣人' : '黑衣人';
    const keyLine = keys.length
      ? `持有钥匙：${keyNames.join('、')} · 交给码头${keeper}`
      : (S.allMaps()
        ? '五处都走过了。再钓一条传说鱼，把虹桥钥匙交给黄衣人'
        : '当前钓点钓到「传说」→ 钥匙 → 交给黑衣人开船');
    pBody.innerHTML = `<div class="sec">抛竿途中无法切换 · ${keyLine}</div><div class="mapGrid">` + LOCATIONS.map(loc => {
      const st = S.mapStatus(loc);
      const owned = st.state === 'owned';
      const cur = save.location === loc.id;
      let act = '';
      if (cur) act = `<span class="meta">当前钓点</span>`;
      else if (owned) act = `<button data-act="travel" data-id="${loc.id}" class="primary">开船前往</button>`;
      else if (st.state === 'hasKey') act = `<span class="meta">🔑 ${st.label}</span>`;
      else act = `<span class="meta">🔒 ${st.label}</span>`;
      const unlockMeta = loc.id === 'lake' ? '起点钓点' : (loc.keyName ? `需要「${loc.keyName}」` : '需要传说钥匙');
      return `<div class="mapCard ${cur ? 'on' : ''} ${owned ? '' : 'locked'} ${st.state === 'hasKey' ? 'haskey' : ''}">
        <span class="tag">${loc.tag}</span>
        <div><b>${loc.name}</b></div>
        <div class="desc">${loc.desc}</div>
        <div class="meta">${unlockMeta}</div>
        <div class="act">${act}</div>
      </div>`;
    }).join('') + '</div>';
    pFoot.innerHTML = '';
  }

  // ---------- 图鉴 ----------
  function renderDex() {
    const caught = SPECIES.filter(s => save.collection[s.id]).length;
    pTitle.innerHTML = `鱼类图鉴 <small>已收集 ${caught} / ${SPECIES.length}</small>`;
    tabs([]);
    pBody.innerHTML = `<div class="dex-legend">${Object.values(RARITY).map(r => `<i style="--rc:${r.color}">${r.name}</i>`).join('')}</div><div class="dexGrid">${SPECIES.map(s => {
      const c = save.collection[s.id], R = RARITY[s.rarity];
      return `<div class="dex-item ${c ? '' : 'locked'}" style="--rc:${R.color}">${thumb(s.id)}
        <div class="dex-name">${c ? s.name : '？？？'}</div><div class="dex-rar" style="color:${R.color}">${R.name} · ${methodName(s.method)}</div>
        <div class="dex-info">${c ? `难度 Lv.${s.diff} · 捕获 ${c.count} 次 · 最重 ${fmtW(c.maxW)}` : '尚未钓到'}</div></div>`;
    }).join('')}</div>`;
  }

  // ---------- 事件委托 ----------
  panel.addEventListener('click', e => {
    const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; UI.render(); return; }
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const { act, id, cat, kind } = b.dataset;
    if (act === 'sell') {
      if (!allowSell) { UI.toast('请走到码头渔夫处出售'); return; }
      const n = S.sell([+id]); UI.toast(`出售成功 +${n} 金币`); ctx.coinFx();
    }
    if (act === 'sellAll') {
      if (!allowSell) { UI.toast('请走到码头渔夫处出售'); return; }
      const n = S.sell(save.net.filter(f => !f.keep).map(f => f.uid)); UI.toast(`全部出售 +${n} 金币`); ctx.coinFx();
    }
    if (act === 'keep') S.toggleKeep(+id);
    if (act === 'buy') { const err = S.buy(cat, id); UI.toast(err || '购买成功！'); }
    if (act === 'claimDaily' || act === 'claimMain') {
      const got = act === 'claimDaily' ? S.claimDaily(+id) : S.claimMain(id);
      if (got) UI.toast(`获得：${got.join('、')}`, 2600);
    }
    if (act === 'equip') {
      if (kind === 'mode') { if (!S.setMode(id)) UI.toast('还没有露亚竿'); }
      else S.equip(kind, id);
    }
    if (act === 'travel') {
      if (ctx.travelTo) ctx.travelTo(id);
      else {
        const err = S.setLocation(id);
        if (err) UI.toast(err);
        else { UI.toast(`已抵达「${S.location().name}」`); ctx.onLocationChange && ctx.onLocationChange(); UI.close(); }
      }
    }
    UI.refreshHud();
  });
  return UI;
}
