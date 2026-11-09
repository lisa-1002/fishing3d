import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("/tmp/pw/package.json");
const { chromium } = require("playwright-core");

const OUT = "/opt/cursor/artifacts/previews-qa";
const BASE = "http://127.0.0.1:8765";
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, touch: true, deviceScaleFactor: 2 },
  { name: "desktop", width: 1280, height: 800, touch: false, deviceScaleFactor: 1 },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickWorld(page, x, z, y, touch) {
  const pt = await page.evaluate(({ x, y, z }) => {
    const canvas = document.querySelector("#view canvas");
    const rect = canvas.getBoundingClientRect();
    const q = window.__qa;
    const inside = (p) => !p.behind
      && p.x >= rect.left + 6 && p.x <= rect.right - 6
      && p.y >= rect.top + 6 && p.y <= rect.bottom - 6;
    let p = q.project(x, y, z);
    if (!inside(p)) {
      for (let s = 0.75; s >= 0.2; s -= 0.15) {
        const p2 = q.project(q.x + (x - q.x) * s, y, q.z + (z - q.z) * s);
        if (inside(p2)) {
          p = p2;
          break;
        }
      }
    }
    return p;
  }, { x, y, z });
  if (touch) await page.touchscreen.tap(pt.x, pt.y);
  else await page.mouse.click(pt.x, pt.y);
}

async function waitUntil(page, fn, arg, timeout, label) {
  try {
    await page.waitForFunction(fn, arg, { timeout });
  } catch (err) {
    const snap = await page.evaluate(() => ({
      phase: window.__qa && window.__qa.phase,
      x: window.__qa && window.__qa.x,
      z: window.__qa && window.__qa.z,
      score: window.__qa && window.__qa.score,
      node: window.__qa && window.__qa.node,
      feedback: window.__qa && window.__qa.lastFeedback,
    })).catch(() => null);
    throw new Error(label + " " + JSON.stringify(snap));
  }
}

async function stillThere(page, id) {
  return page.evaluate((pickId) => {
    const q = window.__qa;
    if (q.phase === "end") return false;
    const found = q.pickups.find((p) => p.id === pickId);
    return !!(found && found.alive);
  }, id);
}

async function collectIds(page, ids, touch) {
  for (const id of ids) {
    const started = Date.now();
    let lastD = Infinity;
    while (await stillThere(page, id)) {
      if (Date.now() - started > 22000) {
        const snap = await page.evaluate(() => ({ x: window.__qa.x, z: window.__qa.z, score: window.__qa.score, fb: window.__qa.lastFeedback }));
        throw new Error("collect " + id + " " + JSON.stringify(snap));
      }
      const item = await page.evaluate((pickId) => {
        const q = window.__qa;
        const found = q.pickups.find((p) => p.id === pickId);
        return { x: found.x, y: found.y, z: found.z, d: Math.hypot(found.x - q.x, found.z - q.z) };
      }, id);
      if (item.d < lastD - 0.08) {
        lastD = item.d;
        await delay(280);
        continue;
      }
      await clickWorld(page, item.x, item.z, item.y || 0.4, touch);
      lastD = item.d;
      await delay(420);
    }
  }
}

async function collectKind(page, kind, count, touch) {
  let seen = 0;
  const started = Date.now();
  while (seen < count) {
    if (Date.now() - started > 40000) throw new Error("collect kind " + kind + " only " + seen);
    if ((await page.evaluate(() => window.__qa.phase)) === "end") return;
    const item = await page.evaluate((kindName) => {
      const q = window.__qa;
      const list = q.pickups.filter((p) => p.alive && p.kind === kindName);
      list.sort((a, b) => ((a.x - q.x) ** 2 + (a.z - q.z) ** 2) - ((b.x - q.x) ** 2 + (b.z - q.z) ** 2));
      return list[0] || null;
    }, kind);
    if (!item) break;
    const before = await page.evaluate((kindName) => window.__qa.pickups.filter((p) => p.alive && p.kind === kindName).length, kind);
    await clickWorld(page, item.x, item.z, item.y || 0.4, touch);
    await delay(500);
    const after = await page.evaluate((kindName) => window.__qa.pickups.filter((p) => p.alive && p.kind === kindName).length, kind);
    if (after < before) seen += before - after;
  }
}

async function assertCanvas(page, label) {
  const sample = await page.evaluate(() => window.__qa.sample());
  if (!(sample && sample.avg > 18 && sample.max > 30 && sample.w > 10 && sample.h > 10)) {
    throw new Error(label + " webgl sample " + JSON.stringify(sample));
  }
  return sample;
}

async function shot(page, file) {
  await page.screenshot({ path: path.join(OUT, file) });
}

async function playSnow(page, touch, tag) {
  await page.locator("#btnStart").click();
  await waitUntil(page, () => window.__qa.phase === "play", null, 8000, "snow start");
  const sample = await assertCanvas(page, "snow");
  const face = await page.evaluate(() => window.__qa.camForward.z);
  if (!(face < -0.25)) throw new Error("snow camera " + face);
  const before = await page.evaluate(() => window.__qa.z);
  await clickWorld(page, 0.2, 3.2, 0.2, touch);
  await waitUntil(page, (z0) => window.__qa.z < z0 - 0.5, before, 8000, "snow move");
  await shot(page, `snow-white-${tag}-play.png`);
  await collectKind(page, "sweet", 5, touch);
  await waitUntil(page, () => window.__qa.phase === "end" && window.__qa.kind === "good", null, 8000, "snow good");
  const goodTitle = await page.locator("#endTitle").textContent();
  if (!goodTitle.includes("林光归途")) throw new Error(goodTitle);
  await shot(page, `snow-white-${tag}-good.png`);
  await page.locator("#btnReplay").click();
  await waitUntil(page, () => {
    const q = window.__qa;
    return q.phase === "play" && q.score === 0 && q.lives === 3 && Math.abs(q.z - q.spawn.z) < 0.4 && q.kind == null;
  }, null, 8000, "snow replay");
  await shot(page, `snow-white-${tag}-replay.png`);
  await collectKind(page, "poison", 3, touch);
  await waitUntil(page, () => window.__qa.phase === "end" && window.__qa.kind === "bad", null, 8000, "snow bad");
  const badTitle = await page.locator("#endTitle").textContent();
  if (!badTitle.includes("紫果入梦")) throw new Error(badTitle);
  await shot(page, `snow-white-${tag}-bad.png`);
  return { sample, goodTitle, badTitle };
}

async function playRed(page, touch, tag) {
  await page.locator("#btnStart").click();
  await waitUntil(page, () => window.__qa.phase === "play", null, 8000, "red start");
  const sample = await assertCanvas(page, "red");
  const face = await page.evaluate(() => window.__qa.camForward.z);
  if (!(face < -0.25)) throw new Error("red camera " + face);
  await collectIds(page, ["b1"], touch);
  const berries = await page.evaluate(() => window.__qa.score);
  if (berries < 1) throw new Error("red berry");
  const berryZ = await page.evaluate(() => window.__qa.z);
  if (!(berryZ < 6.4)) throw new Error("red move z=" + berryZ);
  await shot(page, `red-hood-${tag}-play.png`);
  const homeStart = Date.now();
  while ((await page.evaluate(() => window.__qa.phase)) === "play" && Date.now() - homeStart < 20000) {
    const z = await page.evaluate(() => window.__qa.z);
    await clickWorld(page, 0.55, Math.max(-8.4, z - 3.2), 0.2, touch);
    await delay(500);
  }
  await waitUntil(page, () => window.__qa.phase === "end" && window.__qa.kind === "good", null, 20000, "red good");
  const goodTitle = await page.locator("#endTitle").textContent();
  if (!goodTitle.includes("灯火到站")) throw new Error(goodTitle);
  await shot(page, `red-hood-${tag}-good.png`);
  await page.locator("#btnReplay").click();
  await waitUntil(page, () => {
    const q = window.__qa;
    return q.phase === "play" && q.score === 0 && Math.abs(q.z - q.spawn.z) < 0.45 && q.kind == null;
  }, null, 8000, "red replay");
  await shot(page, `red-hood-${tag}-replay.png`);
  for (let i = 0; i < 14; i++) {
    if ((await page.evaluate(() => window.__qa.phase)) === "end") break;
    const wolf = await page.evaluate(() => window.__qa.wolf);
    await clickWorld(page, wolf.x, wolf.z, 0.4, touch);
    await delay(500);
  }
  await waitUntil(page, () => window.__qa.phase === "end" && window.__qa.kind === "bad", null, 8000, "red bad");
  const badTitle = await page.locator("#endTitle").textContent();
  if (!badTitle.includes("狼影追上")) throw new Error(badTitle);
  await shot(page, `red-hood-${tag}-bad.png`);
  return { sample, goodTitle, badTitle, berries };
}

async function playSnake(page, touch, tag) {
  await page.locator("#btnStart").click();
  await waitUntil(page, () => window.__qa.phase === "play", null, 8000, "snake start");
  const sample = await assertCanvas(page, "snake");
  const face = await page.evaluate(() => window.__qa.camForward.z);
  if (!(face < -0.25)) throw new Error("snake camera " + face);
  const bounds = await page.evaluate(() => ({
    water: window.__qa.walkable(0, 0.5),
    spawn: window.__qa.walkable(0.2, 8.15),
    bridge: window.__qa.walkable(0, -7.5),
    outside: window.__qa.walkable(20, 20),
  }));
  if (bounds.water || !bounds.spawn || !bounds.bridge || bounds.outside) {
    throw new Error("snake bounds " + JSON.stringify(bounds));
  }
  const startBg = await page.evaluate(() => getComputedStyle(document.getElementById("start")).backgroundImage);
  if (!startBg.includes("kv-9x16.jpg")) throw new Error("snake kv " + startBg);
  await clickWorld(page, 0, 0.4, 0.1, touch);
  await delay(900);
  const wet = await page.evaluate(() => {
    const q = window.__qa;
    return { ok: q.walkable(q.x, q.z), lake: Math.hypot(q.x, q.z - 0.5), feedback: q.lastFeedback };
  });
  if (!wet.ok || wet.lake < 4.9) throw new Error("snake water " + JSON.stringify(wet));
  await shot(page, `white-snake-${tag}-play.png`);
  await collectIds(page, ["h6", "h7", "h1", "h2", "h3"], touch);
  const score = await page.evaluate(() => window.__qa.score);
  if (score < 5) throw new Error("snake herbs " + score);
  const bridgeStart = Date.now();
  while ((await page.evaluate(() => window.__qa.phase)) === "play" && Date.now() - bridgeStart < 24000) {
    const pos = await page.evaluate(() => ({ x: window.__qa.x, z: window.__qa.z }));
    const tx = pos.z > -4.2 ? 5.5 : 0;
    const tz = pos.z > -4.2 ? pos.z - 2.8 : -7.5;
    await clickWorld(page, tx, tz, 0.45, touch);
    await delay(550);
  }
  await waitUntil(page, () => window.__qa.phase === "end" && window.__qa.kind === "good", null, 8000, "snake good");
  const goodTitle = await page.locator("#endTitle").textContent();
  const goodBg = await page.evaluate(() => getComputedStyle(document.getElementById("end")).backgroundImage);
  if (!goodTitle.includes("断桥暖灯")) throw new Error(goodTitle);
  if (!goodBg.includes("bg-bridge.jpg")) throw new Error(goodBg);
  await shot(page, `white-snake-${tag}-good.png`);
  await page.locator("#btnReplay").click();
  await waitUntil(page, () => {
    const q = window.__qa;
    return q.phase === "play" && q.score === 0 && Math.abs(q.z - q.spawn.z) < 0.45 && q.kind == null;
  }, null, 8000, "snake replay");
  await shot(page, `white-snake-${tag}-replay.png`);
  for (let i = 0; i < 16; i++) {
    if ((await page.evaluate(() => window.__qa.phase)) === "end") break;
    const monk = await page.evaluate(() => window.__qa.monk);
    await clickWorld(page, monk.x, monk.z, 0.4, touch);
    await delay(450);
  }
  await waitUntil(page, () => window.__qa.phase === "end" && window.__qa.kind === "bad", null, 8000, "snake bad");
  const badTitle = await page.locator("#endTitle").textContent();
  const badBg = await page.evaluate(() => getComputedStyle(document.getElementById("end")).backgroundImage);
  if (!badTitle.includes("雷峰塔影")) throw new Error(badTitle);
  if (!badBg.includes("bg-tower.jpg")) throw new Error(badBg);
  await shot(page, `white-snake-${tag}-bad.png`);
  return { sample, goodTitle, badTitle, wet };
}

async function playDrama(page, touch, tag) {
  const resources = await page.evaluate(() => performance.getEntriesByType("resource").map((r) => r.name));
  const joined = resources.join("\n");
  for (const needle of ["story.json", "styles.css", "app.js", "three.module.js", "kv-9x16.jpg"]) {
    if (!joined.includes(needle)) throw new Error("drama missing " + needle);
  }
  await page.locator("#btn-start").click();
  await waitUntil(page, () => window.__qa.phase === "play" && window.__qa.node === "n0", null, 8000, "drama start");
  const sample = await assertCanvas(page, "drama");
  const face = await page.evaluate(() => window.__qa.camForward.z);
  if (!(face < -0.2)) throw new Error("drama camera " + face);
  await shot(page, `interactive-drama-${tag}-opening.png`);
  await page.getByRole("button", { name: "上前：弟子想知道自己配不配握真剑" }).click();
  const z0 = await page.evaluate(() => window.__qa.z);
  const helpStart = Date.now();
  while ((await page.getByRole("button", { name: "先扶阿桃到石亭" }).count()) === 0 && Date.now() - helpStart < 12000) {
    const z = await page.evaluate(() => window.__qa.z);
    const tz = Math.max(3.7, z - 1.8);
    await clickWorld(page, -0.2, tz, (7.55 - tz) * 0.38 + 0.5, touch);
    await delay(400);
  }
  const moved = await page.evaluate((z) => window.__qa.z < z - 0.45, z0);
  if (!moved) throw new Error("drama move");
  await page.getByRole("button", { name: "先扶阿桃到石亭" }).click({ timeout: 8000 });
  await page.getByRole("button", { name: "机缘若不等人，便不算机缘" }).click();
  await shot(page, `interactive-drama-${tag}-play.png`);
  const goodClimb = Date.now();
  while ((await page.getByRole("button", { name: "取向山门的影剑——以护道为锋" }).count()) === 0 && Date.now() - goodClimb < 18000) {
    const z = await page.evaluate(() => window.__qa.z);
    const tz = Math.max(-6.2, z - 2.2);
    await clickWorld(page, 0.05, tz, (7.55 - tz) * 0.38 + 0.45, touch);
    await delay(450);
  }
  await page.getByRole("button", { name: "取向山门的影剑——以护道为锋" }).click({ timeout: 12000 });
  await waitUntil(page, () => window.__qa.phase === "end" && window.__qa.kind === "good", null, 8000, "drama good");
  const goodTitle = await page.locator("#ending-title").textContent();
  if (!goodTitle.includes("剑心未钝")) throw new Error(goodTitle);
  await shot(page, `interactive-drama-${tag}-good.png`);
  await page.locator("#btn-replay").click();
  await waitUntil(page, () => {
    const q = window.__qa;
    return q.phase === "start" && q.trust === 0 && q.kind == null && Math.abs(q.z - q.spawn.z) < 0.4;
  }, null, 8000, "drama replay");
  await shot(page, `interactive-drama-${tag}-replay.png`);
  await page.locator("#btn-start").click();
  await page.getByRole("button", { name: "上前：弟子想知道自己配不配握真剑" }).click();
  const rushStart = Date.now();
  while ((await page.getByRole("button", { name: "压抑心惊，走上台心" }).count()) === 0 && Date.now() - rushStart < 14000) {
    const z = await page.evaluate(() => window.__qa.z);
    const tz = Math.max(0.9, z - 2.0);
    await clickWorld(page, 1.65, tz, (7.55 - tz) * 0.38 + 0.45, touch);
    await delay(400);
  }
  await page.getByRole("button", { name: "压抑心惊，走上台心" }).click({ timeout: 8000 });
  const badClimb = Date.now();
  while ((await page.getByRole("button", { name: "取向深渊的影剑——以己欲为锋" }).count()) === 0 && Date.now() - badClimb < 18000) {
    const z = await page.evaluate(() => window.__qa.z);
    const tz = Math.max(-6.2, z - 2.2);
    await clickWorld(page, 0.2, tz, (7.55 - tz) * 0.38 + 0.45, touch);
    await delay(450);
  }
  await page.getByRole("button", { name: "取向深渊的影剑——以己欲为锋" }).click({ timeout: 12000 });
  await waitUntil(page, () => window.__qa.phase === "end" && window.__qa.kind === "bad", null, 8000, "drama bad");
  const badTitle = await page.locator("#ending-title").textContent();
  if (!badTitle.includes("锋吞其人")) throw new Error(badTitle);
  await shot(page, `interactive-drama-${tag}-bad.png`);
  return { sample, goodTitle, badTitle };
}

const RUNNERS = {
  "snow-white": playSnow,
  "red-hood": playRed,
  "white-snake": playSnake,
  "interactive-drama": playDrama,
};

async function run() {
  const server = spawn("python3", ["-m", "http.server", "8765", "--directory", "/workspace", "--bind", "127.0.0.1"], {
    stdio: "ignore",
  });
  await delay(300);
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--disable-dev-shm-usage",
      "--no-sandbox",
    ],
  });
  const results = [];
  try {
    for (const vp of VIEWPORTS) {
      for (const id of Object.keys(RUNNERS)) {
        const record = { id, viewport: vp.name, ok: false };
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          hasTouch: vp.touch,
          deviceScaleFactor: vp.deviceScaleFactor,
          isMobile: vp.touch,
        });
        const page = await context.newPage();
        const external = [];
        const failed = [];
        const errors = [];
        page.on("pageerror", (err) => errors.push(String(err)));
        page.on("request", (req) => {
          const url = req.url();
          if (url.startsWith("data:") || url.startsWith("blob:")) return;
          try {
            const host = new URL(url).hostname;
            if (host !== "127.0.0.1" && host !== "localhost") external.push(url);
          } catch (err) {
            external.push(url);
          }
        });
        page.on("response", (res) => {
          if (res.status() >= 400) failed.push(res.status() + " " + res.url());
        });
        try {
          await page.goto(`${BASE}/previews/${id}/index.html?qa=1`, { waitUntil: "domcontentloaded", timeout: 20000 });
          await waitUntil(page, () => window.__qa && window.__qa.ready && (window.__qa.phase === "start" || window.__qa.phase === "boot"), null, 15000, id + " boot");
          await waitUntil(page, () => window.__qa.phase === "start", null, 15000, id + " title");
          await shot(page, `${id}-${vp.name}-start.png`);
          record.detail = await RUNNERS[id](page, vp.touch, vp.name);
          if (external.length) throw new Error("external " + external.join(", "));
          if (failed.length) throw new Error("http " + failed.join(", "));
          if (errors.length) throw new Error("pageerror " + errors.join(" | "));
          record.ok = true;
        } catch (err) {
          record.ok = false;
          record.error = String(err && err.stack ? err.stack : err);
          record.pageErrors = errors;
          record.external = external;
          record.failed = failed;
          try {
            await shot(page, `${id}-${vp.name}-FAIL.png`);
          } catch (shotErr) {
            record.shotError = String(shotErr);
          }
        }
        await context.close();
        results.push(record);
        console.log((record.ok ? "PASS " : "FAIL ") + id + " " + vp.name);
        if (!record.ok) console.log(record.error.split("\n").slice(0, 8).join("\n"));
      }
    }
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
