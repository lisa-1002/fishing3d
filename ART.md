# 美术方向

静湖垂钓要对齐的是「三角洲钓鱼」那种渔获特写：鱼在镜头前，鳞片和湿身能读出来。场景仍是静湖——午后、薄雾、木码头、远山——不是海战，也不是热带礁盘。

## 鱼（当前）

渔获、图鉴和跃水鱼由 `js/fish-gltf.js` 加载 `vendor/fish/real/` 的写实模型。这 8 个 GLB 都是 CC0，自带贴图。许可、AI 披露和原文件名见 `CREDITS.md` 与 `vendor/fish/real/CREDITS.md`。

| 文件 | 来源 | 映射到的鱼 |
|---|---|---|
| `real/koi.glb` | Polyy.AI Fish Pack | 红白锦鲤王 |
| `real/silver_arowana.glb` | 同上 | 鲤鱼、黄金鲤、草鱼、青鱼、鲢鱼、鳙鱼、鲮鱼、翘嘴、红尾鲌、白条、银鱼、金龙鱼 |
| `real/rainbow_trout.glb` | 同上 | 虹鳟、马口鱼、狗鱼、黑鱼 |
| `real/sockeye_salmon.glb` | 同上 | 哲罗鲑 |
| `real/channel_catfish.glb` | 同上 | 鲶鱼、黄颡鱼、千年鳇鱼、泥鳅 |
| `real/piranha.glb` | 同上 | 鲫鱼、罗非鱼、鳊鱼 |
| `real/largemouth_bass.glb` | 同上 | 鳜鱼 |
| `real/barramundi.glb` | Khronos BarramundiFish（Microsoft，CC0） | 鲈鱼、鳡鱼 |

乘色、去饱和和体高体宽在 `SPECIES_MAP` 里。没有列入的 **黄鳝** 和 **甲鱼** 仍是本项目的程序化网格。

进游戏前会把头转到 +X，并把体长缩放到 1，沿用原来的渔获缩放和跃水朝向。这些模型是静态网格，没有包内骨骼动画；摆尾用与程序化鱼相同的顶点着色器。某个 GLB 加载失败时，该外形回退到程序化网格。抛竿、咬口、搏鱼和鱼护不依赖某一种网格。

## 历史占位（不加载）

`vendor/fish/Koi.glb`、`Goldfish.glb`、`ArmoredCatfish.glb` 是 Quaternius Animated Cute Fish（CC0）的早期占位，留在仓库里作历史文件。当前默认不加载。写实外形已经由上一节的 `real/` 模型承担，不再把这三件可爱鱼当作现行方案。

## 场景

山和树仍是程序化剪影和实例化低模。照片级山体、树皮和树冠要另开一轮，这一轮不动地形。

水面使用 Three.js `Water` 和 `textures/waternormals.jpg`。该文件与 three.js 示例字节一致；作者是 Marianne Gagnon (Auria)，许可是 CC-BY-SA 3.0，说明见 `CREDITS.md`。

## 下一步

1. 山体和树木做照片级一轮。
2. 若微信商用希望水面许可更干净，把 `textures/waternormals.jpg` 换成自绘或 Kenney 等 CC0 法线，并改 `CREDITS.md`。
