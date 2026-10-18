// 开始 / 加载画面：水下光束 + 一群发光金鱼（2D canvas，轻量；开始界面隐藏后自动停止）
(function () {
  var cv = document.getElementById('startFx'), start = document.getElementById('start');
  if (!cv || !start || !cv.getContext) return;
  var c = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize() { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; c.setTransform(dpr, 0, 0, dpr, 0, 0); }
  resize(); addEventListener('resize', resize);
  // 预渲染光晕
  var glow = document.createElement('canvas'); glow.width = glow.height = 64;
  var g = glow.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(255,214,90,0.55)'); rg.addColorStop(0.4, 'rgba(255,170,40,0.18)'); rg.addColorStop(1, 'rgba(255,150,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  var N = W < 600 ? 18 : 28, fish = [], bubbles = [], i;
  for (i = 0; i < N; i++) fish.push({ ox: (Math.random() - 0.5) * 170, oy: (Math.random() - 0.5) * 70, x: W / 2, y: H / 2, vx: 0, vy: 0, s: 0.7 + Math.random() * 0.6, ph: Math.random() * 6.28, sp: 0.9 + Math.random() * 0.3 });
  for (i = 0; i < 40; i++) bubbles.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 2, v: 0.02 + Math.random() * 0.05 });
  function drawFish(f, ang, t) {
    var L = 16 * f.s * (W < 600 ? 1 : 1.25);
    c.save(); c.translate(f.x, f.y); c.rotate(ang);
    c.globalCompositeOperation = 'lighter';
    c.drawImage(glow, -L * 2.2, -L * 2.2, L * 4.4, L * 4.4);
    c.globalCompositeOperation = 'source-over';
    var wag = Math.sin(t * 9 * f.sp + f.ph) * 0.45;
    // 尾巴
    c.save(); c.translate(-L * 0.85, 0); c.rotate(wag);
    c.fillStyle = 'rgba(255,190,60,0.85)';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-L * 0.5, -L * 0.55, -L * 0.75, -L * 0.5); c.quadraticCurveTo(-L * 0.45, 0, -L * 0.75, L * 0.5); c.quadraticCurveTo(-L * 0.5, L * 0.55, 0, 0); c.fill();
    c.restore();
    // 身体
    var bg = c.createLinearGradient(0, -L * 0.4, 0, L * 0.4);
    bg.addColorStop(0, '#ffcf4a'); bg.addColorStop(0.5, '#ffe9a0'); bg.addColorStop(1, '#f0a020');
    c.fillStyle = bg;
    c.beginPath(); c.ellipse(0, 0, L, L * 0.38, 0, 0, 6.283); c.fill();
    c.fillStyle = 'rgba(20,20,30,0.8)'; c.beginPath(); c.arc(L * 0.6, -L * 0.08, L * 0.07, 0, 6.283); c.fill();
    c.restore();
  }
  var last = performance.now(), t = 0, running = true;
  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (start.classList.contains('hide') && t > 0.6) { // 开始后淡出完就停
      if (!frame.hideAt) frame.hideAt = t;
      if (t - frame.hideAt > 0.8) { running = false; c.clearRect(0, 0, W, H); return; }
    }
    c.clearRect(0, 0, W, H);
    // 浮游微粒 / 气泡
    c.fillStyle = 'rgba(200,240,255,0.35)';
    for (i = 0; i < bubbles.length; i++) {
      var b = bubbles[i]; b.y -= b.v * dt; if (b.y < -0.02) { b.y = 1.02; b.x = Math.random(); }
      c.beginPath(); c.arc(b.x * W + Math.sin(t + i) * 6, b.y * H, b.r, 0, 6.283); c.fill();
    }
    // 鱼群：领头点沿利萨如曲线游动，个体带偏移和弹簧跟随
    var lx = W * (0.5 + 0.36 * Math.sin(t * 0.23)), ly = H * (0.83 + 0.07 * Math.sin(t * 0.37 + 1)); // 鱼群在下方游，不压标题和按钮
    for (i = 0; i < fish.length; i++) {
      var f = fish[i];
      var tx = lx + f.ox + Math.sin(t * 0.8 + f.ph) * 18, ty = ly + f.oy + Math.cos(t * 0.6 + f.ph) * 12;
      f.vx += (tx - f.x) * dt * 1.6 * f.sp; f.vy += (ty - f.y) * dt * 1.6 * f.sp;
      f.vx *= 0.96; f.vy *= 0.96;
      f.x += f.vx * dt; f.y += f.vy * dt;
      drawFish(f, Math.atan2(f.vy, f.vx), t);
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  for (i = 0; i < fish.length; i++) { fish[i].x = W / 2 + fish[i].ox; fish[i].y = H * 0.83 + fish[i].oy; }
  requestAnimationFrame(frame);
})();
