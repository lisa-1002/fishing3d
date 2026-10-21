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

## three.js 与 vendor/addons（MIT）

| 路径 | 内容 |
|---|---|
| `vendor/three.module.js` | three.js r169 |
| `vendor/addons/` | 官方示例插件：`GLTFLoader.js`、`Water.js`、`Sky.js`、`BufferGeometryUtils.js`、`RoomEnvironment.js`、`SkeletonUtils.js` |

- 版权：Copyright 2010-2024 Three.js Authors
- 许可：MIT。`vendor/three.module.js` 文件头含 `SPDX-License-Identifier: MIT`。
- 上游：https://github.com/mrdoob/three.js （许可证全文：https://github.com/mrdoob/three.js/blob/dev/LICENSE）
- **须保留 MIT 通知。** 再分发时不要删掉 `vendor/three.module.js` 文件头里的版权与 SPDX 行，并保留本条说明。`vendor/addons` 与 three.js 示例同属 MIT；本仓库拷入时插件文件本身没有重复粘贴许可证全文，以 three.js 上游 LICENSE 与上述文件头为准。

`vendor/addons/Water.js` 的注释还指向 Flat mirror（Slayvin）、stemkoski 的水面着色器与 29a.ch 的 WebGL 水体制作说明。这些是着色器实现的参考，不是额外贴图。水面法线贴图的许可见下一节，不要把它当成 three.js 的 MIT。

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

## 历史鱼模型（默认不加载）

`vendor/fish/Koi.glb`、`Goldfish.glb`、`ArmoredCatfish.glb` 来自 Quaternius **Animated Cute Fish Pack**（CC0）。

- 包页面：https://quaternius.com/packs/cutefish.html
- 单件亦见于 Poly Pizza（Public Domain / CC0）：Koi、Goldfish、Armored Catfish

这三件是早期可爱占位，留在仓库里作历史文件。`js/fish-gltf.js` 现在只读 `vendor/fish/real/`，默认不加载它们。

## 水面法线 `textures/waternormals.jpg`（CC-BY-SA 3.0）

游戏水面（`js/world.js` 里的 three.js `Water`）使用这一张法线贴图。

- 本仓库文件与 three.js `examples/textures/waternormals.jpg` **字节完全一致**。
- SHA256：`add9912b158a4fe9c12421745babe68c44c8af75631ac4837236cb2a03bc373f`
- three.js 中的路径：https://github.com/mrdoob/three.js/blob/dev/examples/textures/waternormals.jpg
- 它随 three.js 的 Ocean / Water 示例一起分发。2014 年由 Joshua Koo 导入 [jbouny/ocean](https://github.com/jbouny/ocean)。
- jbouny/ocean **仓库**是 MIT。贴图自己的许可不等于仓库的 MIT，不能按 MIT 再分发这张图。

上游常见溯源是 SuperTuxKart 的纹理：

- 作者：**Marianne Gagnon (Auria)**
- 许可：**CC-BY-SA 3.0**（Creative Commons Attribution-ShareAlike 3.0 Unported）  
  https://creativecommons.org/licenses/by-sa/3.0/
- 依据：SuperTuxKart `textures/License.txt` 在 CC-BY-SA 3.0 一节写明 `purplenebula*`、`waternormals.jpg`、`waternormals2.jpg`、`sea2`（以及同段中的 `coniferous_tree`）by Marianne Gagnon (Auria)。可见副本：
  - https://github.com/Pttn/stk-assets/blob/main/textures/License.txt
  - http://svn.code.sf.net/p/supertuxkart/code/main/trunk/data/textures/License.txt

使用本贴图必须做到：

1. **署名。** 标明作者 Marianne Gagnon (Auria)、作品为该水面法线、许可为 CC-BY-SA 3.0，并给出上面的许可链接。本文件即随游戏分发的署名说明。
2. **ShareAlike 只约束这张贴图的衍生部分。** 若修改 `waternormals.jpg`，或用它做出新的法线/衍生贴图，该衍生部分须以 CC-BY-SA 3.0 提供，让接收者能在相同条款下使用。未改动的贴图保持 CC-BY-SA 3.0。这项义务不把本游戏的原创代码或程序化美术改成 CC-BY-SA。

**建议：** 微信小游戏若要做商用、并希望素材许可更干净，后续把这张图换成 CC0 水面法线（自行绘制，或使用 Kenney 等明确为 CC0 的来源）。换掉之后从本文件删除这一条 CC-BY-SA 义务，并写上新贴图的作者与许可。在替换之前，上架说明里保留 Marianne Gagnon (Auria) 与 CC-BY-SA 3.0。
