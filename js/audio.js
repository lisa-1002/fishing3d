// 音效：全部用 WebAudio 实时合成，无外部音频文件。
// 首次用户手势后才创建/恢复 AudioContext（手机自动播放策略）；未解锁前所有调用都是安全的空操作。
const MUTE_KEY = 'fishing3d_muted';

export function createAudio() {
  const A = {};
  let ctx = null, master = null, sfx = null, amb = null, noiseBuf = null;
  let muted = localStorage.getItem(MUTE_KEY) === '1';
  let ambNodes = null, birdT = 0, lapT = 0, reelOn = false, reelT = 0, reelRate = 0;

  A.isMuted = () => muted;
  A.ready = () => !!ctx && ctx.state === 'running';

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    amb = ctx.createGain(); amb.gain.value = 0; amb.connect(master);
    // 2 秒白噪声缓冲，复用给风声、水花、甩竿等
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    startAmbient();
  }
  /** 在第一次 pointerdown / keydown / touchstart 里调用 */
  A.unlock = () => {
    try {
      init();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (e) { /* 忽略 */ }
  };
  A.setMuted = (m) => {
    muted = !!m; localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
  };
  A.toggleMute = () => { A.setMuted(!muted); return muted; };

  // ---------- 基础构件 ----------
  const now = () => ctx.currentTime;
  function noise(dur, { type = 'bandpass', f0 = 1000, f1 = f0, q = 1, gain = 0.5, attack = 0.005, out = sfx, when = 0 } = {}) {
    const t = now() + when;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, t); flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(out);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }
  function tone(dur, { type = 'sine', f0 = 440, f1 = f0, gain = 0.3, attack = 0.005, out = sfx, when = 0 } = {}) {
    const t = now() + when;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  const safe = fn => (...a) => { if (!ctx || ctx.state !== 'running') return; try { fn(...a); } catch (e) { /* 音效失败不影响游戏 */ } };

  // ---------- 环境：湖边风声 + 水波拍岸 + 偶尔鸟叫 ----------
  function startAmbient() {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.3;
    const g = ctx.createGain(); g.gain.value = 0.16;
    // 低频 LFO 让风声起伏
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.07;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(lp); lp.connect(g); g.connect(amb);
    src.start(); lfo.start();
    ambNodes = { src, lfo };
    amb.gain.setTargetAtTime(1, now(), 1.5);
  }
  function bird() {
    const base = 2200 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) tone(0.09 + Math.random() * 0.05, { f0: base * (1 + Math.random() * 0.15), f1: base * (1.25 + Math.random() * 0.3), gain: 0.035, out: amb, when: i * (0.11 + Math.random() * 0.05) });
  }
  function lap() { noise(0.5 + Math.random() * 0.4, { type: 'lowpass', f0: 700, f1: 180, gain: 0.07, attack: 0.12, out: amb }); }
  /** 每帧调用（dt 秒）：驱动鸟叫/水声与收线棘轮循环 */
  A.update = safe((dt) => {
    birdT -= dt; lapT -= dt;
    if (birdT <= 0) { birdT = 5 + Math.random() * 10; bird(); }
    if (lapT <= 0) { lapT = 1.8 + Math.random() * 2.5; lap(); }
    if (reelOn && reelRate > 0) {
      reelT -= dt;
      if (reelT <= 0) { reelT = 1 / reelRate; noise(0.025, { type: 'highpass', f0: 3500, gain: 0.12, attack: 0.001 }); tone(0.02, { type: 'square', f0: 1800, gain: 0.02, attack: 0.001 }); }
    }
  });

  // ---------- 事件音效 ----------
  A.cast = safe((power = 0.5) => { noise(0.35 + power * 0.15, { f0: 600, f1: 3200, q: 2.5, gain: 0.35, attack: 0.04 }); });
  A.splash = safe((size = 1) => {
    noise(0.25 + size * 0.25, { type: 'lowpass', f0: 2600, f1: 300, gain: Math.min(0.7, 0.28 + size * 0.22), attack: 0.004 });
    tone(0.12, { f0: 500, f1: 160, gain: 0.12 * size });
  });
  A.nibble = safe(() => { tone(0.06, { f0: 900, f1: 600, gain: 0.12, attack: 0.002 }); noise(0.05, { f0: 1800, q: 4, gain: 0.08, attack: 0.002 }); });
  A.bite = safe(() => {
    // 黑漂：沉闷的“咕咚”+ 两声上扬警示音
    tone(0.25, { f0: 320, f1: 90, gain: 0.35 });
    noise(0.3, { type: 'lowpass', f0: 1200, f1: 200, gain: 0.3 });
    tone(0.12, { type: 'triangle', f0: 880, gain: 0.22, when: 0.05 });
    tone(0.18, { type: 'triangle', f0: 1320, gain: 0.25, when: 0.19 });
  });
  A.hook = safe(() => { noise(0.18, { f0: 1500, f1: 400, q: 1.5, gain: 0.3 }); tone(0.1, { type: 'triangle', f0: 660, f1: 990, gain: 0.15 }); });
  A.reel = (on, rate = 12) => { reelOn = !!on; reelRate = rate; };
  A.catchFish = safe((rarity = 'common') => {
    A.splash(1.6);
    const notes = { common: [523, 659, 784], rare: [587, 740, 880, 1175], epic: [523, 659, 784, 1047, 1319], legend: [392, 523, 659, 784, 1047, 1319, 1568] }[rarity] || [523, 659, 784];
    const step = rarity === 'legend' ? 0.11 : 0.08;
    notes.forEach((f, i) => tone(rarity === 'common' ? 0.18 : 0.35, { type: rarity === 'common' ? 'sine' : 'triangle', f0: f, gain: rarity === 'common' ? 0.12 : 0.16, when: 0.15 + i * step }));
    if (rarity === 'epic' || rarity === 'legend') {
      // 稀有/传说：闪光颤音 + 低音铺底
      const end = 0.15 + notes.length * step;
      for (let i = 0; i < (rarity === 'legend' ? 14 : 8); i++) tone(0.12, { f0: 2093 + (i % 2) * 547, gain: 0.05, when: end + i * 0.05 });
      tone(rarity === 'legend' ? 1.6 : 0.9, { type: 'sawtooth', f0: notes[0] / 2, gain: 0.05, attack: 0.08, when: 0.15 });
      if (rarity === 'legend') [784, 988, 1175, 1568].forEach(f => tone(1.4, { type: 'triangle', f0: f, gain: 0.08, attack: 0.05, when: end + 0.2 }));
    }
  });
  A.fail = safe(() => { tone(0.25, { type: 'triangle', f0: 440, f1: 220, gain: 0.14 }); });
  A.coin = safe((n = 1) => {
    const k = Math.min(6, Math.max(1, Math.round(n)));
    for (let i = 0; i < k; i++) { const w = i * 0.07; tone(0.08, { type: 'square', f0: 1568, gain: 0.05, when: w }); tone(0.25, { type: 'sine', f0: 2093, gain: 0.09, when: w + 0.06 }); }
  });
  A.click = safe(() => { tone(0.04, { type: 'triangle', f0: 1200, gain: 0.06, attack: 0.002 }); });
  A.step = safe(() => { tone(0.25, { type: 'triangle', f0: 784, f1: 1046, gain: 0.1 }); });
  return A;
}
