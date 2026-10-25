# 版权与致谢 / Credits

游戏：**静湖垂钓 3D**（Quiet Lake Fishing 3D）  
作者：**刘子峻**

原创代码与程序化美术的版权见根目录 `LICENSE`。本文件列出随游戏分发的第三方素材。分发 itch.io 构建或微信小游戏包时请带上 `LICENSE` 与本文件。

## 作者与程序化原创

作者：刘子峻。

以下内容为本项目原创，未使用第三方模型或贴图：

- 场景：湖岸、远山、树木、芦苇、码头与木纹等程序化几何和贴图（`js/world.js` 等）。山和树仍是程序化的。
- 界面：开始屏、HUD、渔获卡等（`index.html`、`style.css`、`js/ui.js`）。
- 黄鳝、甲鱼：程序化网格。它们没有对应的 `vendor/fish/real/` 模型。
- NPC「老余」（渔具店老板）：`js/npc-laoyu.js` 全程序化 Three.js 几何（钓鱼马甲、渔夫帽、圆脸、杆秤、保温箱）。The 老余 character (`js/npc-laoyu.js`) is fully procedural Three.js geometry written for this project; no third-party model or texture assets are used.
- 水面法线 `textures/waternormals.jpg`：本项目原创程序化贴图，以 CC0 提供。详见文末。

## three.js 与 vendor/addons（MIT）

| 路径 | 内容 |
|---|---|
| `vendor/three.module.js` | three.js r169 |
| `vendor/addons/` | 官方示例插件：`GLTFLoader.js`、`Water.js`、`Sky.js`、`BufferGeometryUtils.js`、`RoomEnvironment.js`、`SkeletonUtils.js` |

- 版权：Copyright 2010-2024 Three.js Authors
- 许可：MIT。`vendor/three.module.js` 文件头含 `SPDX-License-Identifier: MIT`。
- 上游：https://github.com/mrdoob/three.js （许可证全文：https://github.com/mrdoob/three.js/blob/dev/LICENSE）
- **须保留 MIT 通知。** 再分发时不要删掉 `vendor/three.module.js` 文件头里的版权与 SPDX 行，并保留本条说明。`vendor/addons` 与 three.js 示例同属 MIT；本仓库拷入时插件文件本身没有重复粘贴许可证全文，以 three.js 上游 LICENSE 与上述文件头为准。

`vendor/addons/Water.js` 的注释还指向 Flat mirror（Slayvin）、stemkoski 的水面着色器与 29a.ch 的 WebGL 水体制作说明。这些是着色器实现的参考，不是额外贴图。水面法线不是 three.js 自带素材，也不在 MIT 之内；当前文件是本项目原创，见文末「水面法线」。

## 写实鱼模型 `vendor/fish/real/*.glb`

全部为 CC0 1.0，可商用、可修改、可再分发，不强制署名（此处仍写来源）。逐文件对照与贴图压缩说明见 `vendor/fish/real/CREDITS.md`。当前由 `js/fish-gltf.js` 加载。

### Polyy.AI「[FREE] 3D Fish Pack」

- 页面：https://polyyai.itch.io/3d-fish-pack
- 许可：CC0 1.0
- 作者披露：**AI Assisted Graphics**（素材包页面标明图形由 AI 辅助制作）
- 限制：禁止把该素材包原样转售。放进游戏里使用、修改、随游戏再分发是允许的。

本仓库使用其中的 low-poly 模型（已压缩贴图，见 `real/CREDITS.md`）：

| 文件 | 包内原名 |
|---|---|
| `koi.glb` | 06_koi.glb |
| `silver_arowana.glb` | 25_silver_arowana.glb |
| `rainbow_trout.glb` | 10_rainbow_trout.glb |
| `sockeye_salmon.glb` | 11_sockeye_salmon.glb |
| `channel_catfish.glb` | 18_channel_catfish.glb |
| `piranha.glb` | 17_piranha.glb |
| `largemouth_bass.glb` | 09_largemouth_bass.glb |

### Khronos BarramundiFish

| 文件 | 来源 | 许可 |
|---|---|---|
| `barramundi.glb` | Khronos glTF-Sample-Assets 的 BarramundiFish，Microsoft 贡献。https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/BarramundiFish | CC0 1.0 |

### ffish.asia / Sketchfab 扫描

作者：ffish.asia / floraZia.com（Sketchfab [`ffishAsia-and-floraZia`](https://sketchfab.com/ffishAsia-and-floraZia)）。许可 CC0 1.0。实鱼摄影测量，无 Draco。逐文件俗名与模型页见 `vendor/fish/real/CREDITS.md`。

| 文件 | 游戏中的鱼 | 扫描俗名 |
|---|---|---|
| `scan_carp.glb` | 鲤鱼、黄金鲤 | コイ Carp, Cyprinus carpio |
| `scan_crucian.glb` | 鲫鱼 | ゲンゴロウブナ Japanese White Crucian Carp |
| `scan_amur_catfish.glb` | 鲶鱼、黄颡鱼 | ナマズ Amur Catfish, Silurus asotus |
| `scan_snakehead.glb` | 黑鱼 | カムルチー Spotted Snakehead, Channa argus |
| `scan_horsemouth.glb` | 马口鱼 | オイカワ Pale Bleak, Zacco platypus |
| `scan_threelips.glb` | 翘嘴 | ハス Three-lips, Opsariichthys uncirostris |
| `scan_loach.glb` | 泥鳅 | ドジョウ Japanese Common Loach |
| `scan_bluegill.glb` | 罗非鱼（图鉴无太阳鱼） | ブルーギル Bluegill, Lepomis macrochirus |
| `scan_bass.glb` | 鳜鱼 | オオクチバス Micropterus sp. |
| `scan_ayu.glb` | 不加载（图鉴无香鱼） | アユ Ayu Sweetfish |

## 历史鱼模型（默认不加载）

`vendor/fish/Koi.glb`、`Goldfish.glb`、`ArmoredCatfish.glb` 来自 Quaternius **Animated Cute Fish Pack**（CC0）。

- 包页面：https://quaternius.com/packs/cutefish.html
- 单件亦见于 Poly Pizza（Public Domain / CC0）：Koi、Goldfish、Armored Catfish

这三件是早期可爱占位，留在仓库里作历史文件。`js/fish-gltf.js` 现在只读 `vendor/fish/real/`，默认不加载它们。

## 水面法线 `textures/waternormals.jpg`（CC0）

`js/world.js` 里的 three.js `Water` 仍加载 `textures/waternormals.jpg`。当前这一张是本项目原创的程序化水面法线：分层正弦高度场，再用有限差分求切线法线，导出为 1024×1024 JPEG。作者：刘子峻。本项目将其以 CC0 / 公有领域贡献提供，可商用、可修改、可再分发，无需署名。

SHA256：`7417230ea3b449bcc6a1c2b96b6d08ab3dacd6bf2b0d58d78474b44e00483704`

旧的 three.js 示例水面法线（与 SuperTuxKart 那张纹理字节相同）已不再随本游戏分发。微信小游戏与商用打包不再依赖该第三方贴图。
