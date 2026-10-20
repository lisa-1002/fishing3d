// 老余（湖渔铺老板）——程序化 Three.js 角色：钓鱼马甲、渔夫帽、圆脸笑容、杆秤、保温箱
// 面朝本地 +Z 建模；全部几何低面数（约 3k 三角形），共享少量材质，适合手机。
import * as THREE from 'three';

const M = (color, rough = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

function labelTexture(lines, w = 256, h = 128, bg = null, fg = '#3a3a2a') {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); }
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fg;
  lines.forEach(([txt, size, y]) => { c.font = `bold ${size}px sans-serif`; c.fillText(txt, w / 2, y); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildLaoYu() {
  const mat = {
    skin: M(0xc58a62, 0.65), skinDark: M(0x8f5f42, 0.8), stubble: M(0x6e5848, 0.95),
    hair: M(0x2a2420, 0.9), eye: M(0x1a1410, 0.3), white: M(0xf2ece0, 0.5),
    tee: M(0x7d7f80, 0.95), vest: M(0x6b6a45, 0.9), vestDark: M(0x55553a, 0.92),
    orange: M(0xd9692a, 0.6), pants: M(0x5d5f3c, 0.92), boot: M(0x3c4232, 0.55),
    hat: M(0x8d8a62, 0.95), wood: M(0x6e4528, 0.7), metal: M(0x9a9a9a, 0.35, { metalness: 0.8 }),
    fish: M(0xa8a27a, 0.45, { metalness: 0.25 }), coolerW: M(0xe8e4d8, 0.55), coolerG: M(0x4d5a3a, 0.7),
  };
  const root = new THREE.Group(); root.name = 'LaoYu';
  const body = new THREE.Group(); root.add(body);          // 呼吸/摆动整体
  const add = (parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); parent.add(o); return o;
  };
  const cyl = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
  const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const sph = (r, w = 12, h = 10) => new THREE.SphereGeometry(r, w, h);

  // ---- 腿 + 雨靴 ----
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0.11 * s, 0.92, 0); body.add(leg);
    add(leg, cyl(0.095, 0.085, 0.5), mat.pants, 0, -0.25, 0);                  // 大腿
    add(leg, box(0.07, 0.13, 0.15), mat.pants, 0.09 * s, -0.3, 0.0);           // 侧边工装口袋
    add(leg, box(0.072, 0.02, 0.152), mat.orange, 0.09 * s, -0.235, 0.0);      // 袋盖橙边
    add(leg, cyl(0.085, 0.08, 0.2), mat.pants, 0, -0.55, 0);
    add(leg, cyl(0.075, 0.07, 0.32), mat.boot, 0, -0.76, 0);                   // 靴筒
    add(leg, cyl(0.082, 0.082, 0.03), mat.boot, 0, -0.6, 0);                   // 靴口
    add(leg, box(0.13, 0.08, 0.26), mat.boot, 0, -0.88, 0.04);                 // 靴底/脚
  }
  // ---- 躯干（呼吸时轻微缩放的胸腔）----
  const chest = new THREE.Group(); chest.position.y = 0.95; body.add(chest);
  add(chest, cyl(0.19, 0.18, 0.12, 12), mat.pants, 0, 0.0, 0, 0, 0, 0, 1.15, 1, 0.85); // 腰
  add(chest, box(0.4, 0.035, 0.27), mat.boot, 0, 0.05, 0);                              // 腰带
  add(chest, cyl(0.2, 0.19, 0.5, 12), mat.tee, 0, 0.32, 0, 0, 0, 0, 1.15, 1, 0.8);       // T恤
  add(chest, sph(0.2, 12, 8), mat.tee, 0, 0.55, 0, 0, 0, 0, 1.25, 0.55, 0.82);          // 肩
  // 马甲：两片前襟 + 背片，略大于躯干
  for (const s of [-1, 1]) {
    add(chest, box(0.17, 0.5, 0.06), mat.vest, 0.11 * s, 0.33, 0.145, 0, 0, 0);
    add(chest, box(0.06, 0.22, 0.04), mat.vest, 0.15 * s, 0.6, 0.11, -0.2, 0, -0.25 * s); // 肩带
    // 胸袋 + 下袋（各带橙色袋盖/拉环）
    for (const [py, ph] of [[0.42, 0.13], [0.2, 0.15]]) {
      add(chest, box(0.13, ph, 0.04), mat.vestDark, 0.11 * s, py, 0.185);
      add(chest, box(0.135, 0.035, 0.045), mat.vest, 0.11 * s, py + ph / 2 - 0.01, 0.19);
      add(chest, box(0.02, 0.03, 0.01), mat.orange, 0.11 * s, py + ph / 2 - 0.03, 0.214);
    }
    add(chest, box(0.05, 0.08, 0.02), mat.vestDark, 0.15 * s, 0.53, 0.18);       // 小工具袋
    add(chest, box(0.06, 0.48, 0.2), mat.vest, 0.215 * s, 0.33, 0.0);           // 侧片
  }
  add(chest, box(0.012, 0.48, 0.01), mat.orange, 0.0, 0.33, 0.18);              // 拉链橙线
  add(chest, box(0.42, 0.5, 0.05), mat.vest, 0, 0.33, -0.16);                   // 背片
  const backTag = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.16),
    new THREE.MeshStandardMaterial({ map: labelTexture([['湖渔铺', 68, 52], ['公平秤 · 讲诚信', 26, 104]], 256, 128, null, '#3b3b26'), transparent: true, roughness: 0.9 }));
  backTag.position.set(0, 0.45, -0.186); backTag.rotation.y = Math.PI; chest.add(backTag);
  // 胸前小鱼徽章
  add(chest, sph(0.025, 8, 6), mat.orange, 0.11, 0.5, 0.21, 0, 0, 0, 1.6, 0.8, 0.5);

  // ---- 手臂（可动关节）----
  const arms = {};
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.26 * s, 0.56, 0); chest.add(sh);
    add(sh, sph(0.075, 10, 8), mat.tee, 0, 0, 0);
    add(sh, cyl(0.072, 0.065, 0.16), mat.tee, 0, -0.08, 0);                   // 短袖
    add(sh, cyl(0.055, 0.05, 0.16), mat.skin, 0, -0.22, 0);                   // 上臂
    const el = new THREE.Group(); el.position.y = -0.28; sh.add(el);
    add(el, sph(0.05, 8, 6), mat.skin, 0, 0, 0);
    add(el, cyl(0.05, 0.04, 0.22), mat.skin, 0, -0.11, 0);                    // 前臂
    const hand = new THREE.Group(); hand.position.y = -0.24; el.add(hand);
    add(hand, box(0.075, 0.09, 0.04), mat.skin, 0, -0.03, 0);                 // 手掌
    for (let f = 0; f < 4; f++) add(hand, cyl(0.011, 0.01, 0.06, 5), mat.skin, -0.027 + f * 0.018, -0.1, 0.008);
    add(hand, cyl(0.012, 0.011, 0.05, 5), mat.skin, 0.045 * -s, -0.04, 0.02, 0.4, 0, 0.6 * s); // 拇指
    arms[s] = { sh, el, hand };
  }

  // ---- 头 ----
  const neck = new THREE.Group(); neck.position.y = 0.62; chest.add(neck);
  add(neck, cyl(0.06, 0.07, 0.1), mat.skin, 0, 0.04, 0);
  const head = new THREE.Group(); head.position.y = 0.21; head.scale.setScalar(1.14); neck.add(head);
  add(head, sph(0.12, 16, 12), mat.skin, 0, 0, 0, 0, 0, 0, 1.0, 1.06, 1.0);      // 头颅（略方圆的中年脸）
  add(head, sph(0.1, 12, 8, ), mat.skin, 0, -0.06, 0.02, 0, 0, 0, 1.08, 0.75, 1.0); // 下颌/腮
  add(head, sph(0.1, 12, 8), mat.stubble, 0, -0.085, 0.045, 0, 0, 0, 1.0, 0.5, 0.8); // 胡茬
  add(head, sph(0.085, 12, 8), mat.skin, 0, -0.04, 0.05, 0, 0, 0, 1.0, 0.55, 0.85);   // 盖住上唇区，留下胡茬阴影
  add(head, sph(0.123, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat.hair, 0, 0.005, -0.008, -0.25, 0, 0, 1.02, 1.0, 1.0); // 后发
  add(head, sph(0.1, 12, 8), mat.hair, 0, -0.035, -0.045, 0, 0, 0, 1.12, 0.8, 0.75); // 后脑短发
  for (const s of [-1, 1]) {
    add(head, sph(0.03, 8, 6), mat.skin, 0.115 * s, -0.005, -0.005, 0, 0, 0, 0.5, 1, 0.8);   // 耳
    add(head, sph(0.016, 8, 6), mat.white, 0.042 * s, 0.018, 0.108, 0, 0, 0, 1.3, 0.6, 0.6); // 眼白（眯眼笑）
    add(head, sph(0.01, 8, 6), mat.eye, 0.042 * s, 0.018, 0.116, 0, 0, 0, 1, 0.9, 0.6);                              // 瞳
    add(head, box(0.045, 0.012, 0.012), mat.hair, 0.043 * s, 0.045, 0.108, 0, 0, -0.15 * s);   // 眉
    add(head, box(0.03, 0.004, 0.005), mat.skinDark, 0.043 * s, 0.002, 0.113, 0, 0, 0.2 * s);  // 笑纹
    add(head, sph(0.02, 8, 6), M(0xbf805e, 0.7), 0.062 * s, -0.025, 0.088);                     // 腮红
  }
  add(head, cyl(0.009, 0.016, 0.04, 6), mat.skin, 0, -0.002, 0.118, 0.35, 0, 0);       // 鼻梁
  add(head, sph(0.014, 8, 6), mat.skin, 0, -0.024, 0.124, 0, 0, 0, 1.2, 1, 1);                              // 鼻头
  const smile = add(head, new THREE.TorusGeometry(0.032, 0.007, 5, 12, Math.PI), M(0x6a3a2a, 0.7), 0, -0.052, 0.118, 0, 0, Math.PI, 1, 0.65, 1);
  add(head, box(0.04, 0.009, 0.004), mat.white, 0, -0.058, 0.121);                      // 露齿
  // 渔夫帽：帽顶 + 宽檐 + 帽带 + 橙色小鱼徽 + 挂钩/羽毛饵
  const hat = new THREE.Group(); hat.position.set(0, 0.06, -0.005); hat.rotation.x = -0.08; head.add(hat);
  add(hat, cyl(0.11, 0.13, 0.1, 16), mat.hat, 0, 0.04, 0);
  add(hat, cyl(0.1, 0.11, 0.02, 16), mat.hat, 0, 0.095, 0);
  add(hat, cyl(0.135, 0.205, 0.035, 18), mat.hat, 0, -0.02, 0);
  add(hat, cyl(0.132, 0.132, 0.025, 16), mat.vestDark, 0, 0.005, 0);
  add(hat, sph(0.022, 8, 6), mat.orange, 0, 0.05, 0.12, 0, 0, 0, 1.8, 0.8, 0.4);
  add(hat, cyl(0.002, 0.002, 0.06, 4), mat.metal, 0.17, -0.06, 0.06);
  add(hat, new THREE.TorusGeometry(0.01, 0.002, 4, 8, Math.PI * 1.4), mat.metal, 0.17, -0.095, 0.06);
  add(hat, new THREE.ConeGeometry(0.012, 0.07, 5), mat.orange, 0.12, 0.06, 0.07, 0, 0, -1.0);
  add(hat, sph(0.015, 6, 5), mat.metal, 0.1, 0.06, 0.09, 0, 0, 0, 1.6, 1, 1);

  // ---- 杆秤（右手持，秤钩挂着一条鲤鱼）----
  const R = arms[-1];
  const steel = new THREE.Group(); steel.position.set(0, -0.08, 0.03); R.hand.add(steel);
  const beam = add(steel, cyl(0.012, 0.016, 0.85, 8), mat.wood, 0, 0, 0.0);
  beam.rotation.z = Math.PI / 2; beam.position.x = -0.12;
  for (let i = 0; i < 9; i++) add(steel, box(0.002, 0.026, 0.026), mat.metal, -0.4 + i * 0.07, 0, 0); // 秤星
  const poise = new THREE.Group(); poise.position.x = 0.2; steel.add(poise);    // 秤砣
  add(poise, cyl(0.002, 0.002, 0.08, 4), mat.metal, 0, -0.04, 0);
  add(poise, cyl(0.022, 0.03, 0.05, 8), M(0x2c2c2c, 0.5, { metalness: 0.6 }), 0, -0.1, 0);
  const hook = new THREE.Group(); hook.position.x = -0.5; steel.add(hook);     // 秤钩 + 鱼（单独摆动）
  for (let i = 0; i < 4; i++) add(hook, new THREE.TorusGeometry(0.014, 0.003, 4, 8), mat.metal, 0, -0.02 - i * 0.025, 0, 0, i % 2 ? Math.PI / 2 : 0, 0);
  add(hook, new THREE.TorusGeometry(0.018, 0.003, 4, 8, Math.PI * 1.3), mat.metal, 0, -0.13, 0);
  const fish = new THREE.Group(); fish.position.y = -0.33; fish.rotation.z = Math.PI / 2; hook.add(fish);
  add(fish, sph(0.1, 12, 8), mat.fish, 0, 0, 0, 0, 0, 0, 1.6, 0.55, 0.28);
  add(fish, new THREE.ConeGeometry(0.06, 0.1, 4), mat.fish, -0.2, 0, 0, 0, 0, Math.PI / 2, 1, 1, 0.25);
  add(fish, new THREE.ConeGeometry(0.03, 0.07, 3), M(0x8a6040, 0.6), 0.02, 0.06, 0, 0, 0, 0, 1, 1, 0.2);
  for (const s of [-1, 1]) add(fish, sph(0.012, 6, 5), mat.eye, 0.13, 0.015, 0.027 * s);

  // ---- 保温箱（脚边）----
  const cooler = new THREE.Group(); cooler.position.set(-0.55, 0, 0.12); cooler.rotation.y = 0.35; root.add(cooler);
  add(cooler, box(0.5, 0.06, 0.32), mat.coolerG, 0, 0.03, 0);
  add(cooler, box(0.5, 0.26, 0.32), mat.coolerW, 0, 0.19, 0);
  add(cooler, box(0.52, 0.05, 0.34), mat.coolerW, 0, 0.345, 0);
  add(cooler, box(0.3, 0.025, 0.05), mat.orange, 0, 0.38, 0);
  for (const s of [-1, 1]) add(cooler, box(0.04, 0.07, 0.02), mat.orange, 0.17 * s, 0.31, 0.17);
  const cLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15),
    new THREE.MeshStandardMaterial({ map: labelTexture([['🐟', 40, 40], ['湖渔铺', 44, 95]], 256, 128, null, '#2b2b22'), transparent: true, roughness: 0.6 }));
  cLabel.position.set(0, 0.19, 0.161); cooler.add(cLabel);

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  cLabel.castShadow = backTag.castShadow = false;

  // ---- 基础姿势 ----
  const L = arms[1];
  R.sh.rotation.set(-0.55, 0, -0.18); R.el.rotation.set(-0.9, 0, 0); R.hand.rotation.set(0, 0, 0);
  L.sh.rotation.set(0.05, 0, 0.12); L.el.rotation.set(-0.15, 0, 0);
  // 秤杆保持接近水平：抵消手臂旋转
  steel.rotation.set(1.45, 0.25, 0);

  // ---- 待机动画：呼吸、重心摆动、看向四周、偶尔挥手打招呼 ----
  let gestT = -1, nextGest = 4 + Math.random() * 4;
  const update = (dt, t) => {
    const br = Math.sin(t * 1.6);
    chest.scale.set(1 + br * 0.012, 1 + br * 0.008, 1 + br * 0.018);
    chest.position.y = 0.95 + br * 0.004;
    body.rotation.z = Math.sin(t * 0.45) * 0.015;
    body.position.x = Math.sin(t * 0.45) * 0.01;
    head.rotation.y = Math.sin(t * 0.3) * 0.25 + Math.sin(t * 0.83) * 0.05;
    head.rotation.x = Math.sin(t * 0.5) * 0.04;
    hook.rotation.z = Math.sin(t * 1.9) * 0.08; hook.rotation.x = Math.sin(t * 1.3) * 0.06;
    fish.rotation.y = Math.sin(t * 0.9) * 0.3;
    R.sh.rotation.x = -0.55 + br * 0.01;
    // 招手
    nextGest -= dt;
    if (gestT < 0 && nextGest <= 0) { gestT = 0; }
    if (gestT >= 0) {
      gestT += dt;
      const D = 2.2, k = Math.sin(Math.min(gestT / D, 1) * Math.PI);
      L.sh.rotation.z = 0.12 + k * 2.3; L.sh.rotation.x = 0.05 - k * 0.2;
      L.el.rotation.x = -0.15 - k * 0.5; L.el.rotation.z = k * Math.sin(gestT * 9) * 0.35;
      head.rotation.z = k * 0.08;
      if (gestT > D) { gestT = -1; nextGest = 6 + Math.random() * 8; L.el.rotation.z = 0; }
    } else {
      L.sh.rotation.z = 0.12 + br * 0.01;
    }
    smile.scale.y = 0.65 + Math.max(0, Math.sin(t * 0.7)) * 0.1;
  };
  root.userData.update = update;
  return root;
}
