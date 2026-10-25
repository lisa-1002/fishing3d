# 写实鱼模型来源与许可

全部为 CC0 1.0（公有领域），可商用、可修改、可再分发，无需署名（此处仍注明来源）。

| 文件 | 原始模型 | 作者 / 来源 | 许可 |
|---|---|---|---|
| koi.glb | 06_koi.glb | Polyy.AI「[FREE] 3D Fish Pack」low-poly LOD，https://polyyai.itch.io/3d-fish-pack | CC0 1.0 |
| silver_arowana.glb | 25_silver_arowana.glb | 同上 | CC0 1.0 |
| rainbow_trout.glb | 10_rainbow_trout.glb | 同上 | CC0 1.0 |
| sockeye_salmon.glb | 11_sockeye_salmon.glb | 同上 | CC0 1.0 |
| channel_catfish.glb | 18_channel_catfish.glb | 同上 | CC0 1.0 |
| piranha.glb | 17_piranha.glb | 同上 | CC0 1.0 |
| largemouth_bass.glb | 09_largemouth_bass.glb | 同上 | CC0 1.0 |
| barramundi.glb | BarramundiFish.glb | Khronos glTF-Sample-Assets（Microsoft 贡献），https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/BarramundiFish | CC0 1.0 |

## ffish.asia / Sketchfab 扫描

作者：ffish.asia / floraZia.com，Sketchfab 用户 [`ffishAsia-and-floraZia`](https://sketchfab.com/ffishAsia-and-floraZia)。  
许可：CC0 1.0（http://creativecommons.org/publicdomain/zero/1.0/）。可商用、可修改、可再分发，无需署名（此处仍注明来源）。

这些是实鱼摄影测量，不是 Polyy 低模。游戏里一条扫描可能被两个物种共用，表里写的是扫描本身的俗名。

| 文件 | 俗名 | 原模型 | 来源 |
|---|---|---|---|
| scan_carp.glb | 鲤，Cyprinus carpio（コイ）。游戏用于鲤鱼、黄金鲤 | CC0 コイ 🐟 Carp, Cyprinus carpio | https://sketchfab.com/3d-models/cc0-carp-cyprinus-carpio-6b404d20bab34fa99fba848060c42ca7 |
| scan_crucian.glb | 日本白鲫，Carassius cuvieri（ゲンゴロウブナ）。游戏用于鲫鱼 | CC0 ゲンゴロウブナ 🐟 ♂ Japanese White Crucian Carp | https://sketchfab.com/3d-models/cc0-japanese-white-crucian-carp-7b0b3e4758554486ac00e5178a91056b |
| scan_amur_catfish.glb | 鲶，Silurus asotus（ナマズ）。游戏用于鲶鱼、黄颡鱼 | CC0 ナマズ 🐟 Amur Catfish, Silurus asotus | https://sketchfab.com/3d-models/cc0-amur-catfish-silurus-asotus-0b28048d20ea4883990b0a8de2166c6f |
| scan_snakehead.glb | 黑鱼，Channa argus（カムルチー） | CC0 カムルチー 🐟 Spotted Snakehead, Channa argus | https://sketchfab.com/3d-models/cc0-spotted-snakehead-channa-argus-f00d3f9e6f59431e9a438f5d7571645d |
| scan_horsemouth.glb | 宽鳍鱲 / 马口所用外形，Zacco platypus（オイカワ） | CC0 オイカワ 🐟 ♂ Pale Bleak, Zacco platypus | https://sketchfab.com/3d-models/cc0-pale-bleak-zacco-platypus-b1ddc3a76994493b91204b287bba569c |

处理：gltf-transform 贴图缩至 1024、转 WebP、网格量化（KHR_mesh_quantization）。**没有 Draco**，three.js 的 GLTFLoader 可直接读取。扫描件含多块网格（身体 / 鳍 / 眼，另有一个参照立方体在载入时丢弃）。

处理（Polyy / Khronos，上一节的 8 个文件）：gltf-transform 贴图缩至 1024、转 WebP(q80)、weld + KHR_mesh_quantization（three.js 原生支持，无需解码器）。
Polyy.AI 许可附注：素材包页面披露 **AI Assisted Graphics**。禁止原样转售该素材包；在游戏中使用、修改、再分发均允许。
仓库根目录 `CREDITS.md` 有完整第三方清单（含本目录与 Quaternius 历史文件）。水面法线是本项目原创 CC0，也记在该文件。
