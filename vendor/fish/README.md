# 鱼类第三方资产说明

本目录预留用于托管 CC0 / 公有领域的鲤鱼或锦鲤 GLB 与贴图。

## 检索结果（2026-10-17）
已检索并尝试下载：
- Sketchfab **CC0 Carp, Cyprinus carpio**（ffish.asia）— 许可证符合，但需登录 Sketchfab 才能下载 GLB，自动化环境无法拉取。
- Quaternius / Poly Pizza **Koi (CC0)** — 页面存在，直链 403/404。
- Polyy.AI itch.io Fish Pack（含 koi，CC0）— 需人工从 itch 下载。
- Khronos Sample **BarramundiFish** — 可下载且许可宽松，但是**鲈形目**而非鲤科，外形不符，未采用。

因此英雄鲤仍使用 `js/fish-hero-carp.js` 的高规格程序化管线。若你手动下载了 CC0 鲤/锦鲤 `.glb`，可放到本目录并命名 `carp.glb`，游戏会优先尝试加载（见 fish-hero-carp.js）。

## 许可
程序化贴图与几何为本项目原创。若将来放入第三方 GLB，请在此文件注明作者、链接与许可证。


## 启用外部网格
将 `carp.glb` 放到本目录后，在浏览器控制台执行：
```js
localStorage.setItem("fishing3d_carp_glb", "1"); location.reload();
```
