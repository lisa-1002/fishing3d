# 鱼类第三方资产说明

## 当前加载

`js/fish-gltf.js` 加载 `real/` 下 13 个写实 GLB（带贴图），映射到 28 个物种。黄鳝、甲鱼没有对应模型，仍用程序化网格。来源、AI 披露与许可见 [`real/CREDITS.md`](real/CREDITS.md) 与仓库根目录 [`CREDITS.md`](../../CREDITS.md)。

| 文件 | 来源 | 许可 |
|---|---|---|
| `real/scan_carp.glb`、`scan_crucian.glb`、`scan_amur_catfish.glb`、`scan_snakehead.glb`、`scan_horsemouth.glb` | ffish.asia / Sketchfab `ffishAsia-and-floraZia` 摄影测量扫描 | CC0 1.0 |
| `real/koi.glb`、`silver_arowana.glb`、`rainbow_trout.glb`、`sockeye_salmon.glb`、`channel_catfish.glb`、`piranha.glb`、`largemouth_bass.glb` | Polyy.AI「[FREE] 3D Fish Pack」 | CC0 1.0 |
| `real/barramundi.glb` | Khronos BarramundiFish（Microsoft） | CC0 1.0 |

扫描件对应：鲤与黄金鲤、鲫、鲶与黄颡、黑鱼、马口。泥鳅仍用 `channel_catfish.glb` 染色。载入时合并同一条鱼的多块网格（身体、鳍、眼），并丢掉扫描里的参照立方体。没有 Draco。

载入时把头转到 +X、体长缩放到 1。模型是静态网格，摆尾用顶点着色器。某个 GLB 加载失败时，该外形回退到 `js/fish.js` 的程序化鱼。

## 历史文件（默认不加载）

以下三件来自 Quaternius [Animated Cute Fish Pack](https://quaternius.com/packs/cutefish.html)（CC0）。早期曾作可爱占位，**当前游戏不加载**：

- `Koi.glb`
- `Goldfish.glb`
- `ArmoredCatfish.glb`

## 可选回退：`carp.glb`

默认路径不读取 `carp.glb`。写实 GLB 已经接管时不会用到它。只有写实模型没有加载成功、物种又是英雄鲤，并且手动打开下面的开关时，`js/fish-hero-carp.js` 才会尝试本目录的 `carp.glb`。自行放入的文件须为 CC0 或已获授权，并在根目录 `CREDITS.md` 补记。

```js
localStorage.setItem("fishing3d_carp_glb", "1"); location.reload();
```

## 检索记录（2026-10-17，历史）

当时为英雄鲤寻找鲤科 GLB，结论是继续用程序化管线。2026-10-20 起默认鱼模型改为 `real/`，下面只保留检索过程：

- Sketchfab **CC0 Carp, Cyprinus carpio**（ffish.asia）— 当时需登录才能下载，自动化环境未拉取。2026-10-25 已放入 `real/scan_carp.glb`，并一并加入鲫、鲶、黑鱼、马口四件同作者扫描。
- Quaternius / Poly Pizza **Koi (CC0)** — 页面存在，直链 403/404。三件可爱鱼后来另存为历史文件，见上节，默认不加载。
- Polyy.AI itch.io Fish Pack（含 koi，CC0）— 当时需人工下载。现已放入 `real/`。
- Khronos Sample **BarramundiFish** — 许可宽松，但是鲈形目，不用作英雄鲤。现以 `real/barramundi.glb` 用于鲈鱼、鳡鱼。

程序化贴图与几何为本项目原创（作者刘子峻）。
