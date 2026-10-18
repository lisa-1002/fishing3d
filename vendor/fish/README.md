# 鱼类模型（Quaternius，CC0）

游戏渔获、图鉴缩略图和掠食鱼跃水使用下列 GLB。许可为 **CC0 1.0**（公有领域）。CC0 不要求署名，这里留一行。

- 作者：Quaternius
- 包：Animated Cute Fish / Poly Pizza Animated Fish Bundle
- https://quaternius.com/packs/cutefish.html
- https://poly.pizza/bundle/Animated-Fish-Bundle-44zhHN1UbT

| 文件 | 对应鱼种 |
|---|---|
| `Koi.glb` | 默认（鲫鱼、锦鲤王，以及未单独指定的鱼种） |
| `Goldfish.glb` | 鲤鱼、黄金鲤 |
| `ArmoredCatfish.glb` | 鲶鱼、黄颡鱼 |

加载与朝向见 `js/fish-gltf.js`。源模型头朝 +Z、节点缩放 100、体长约 5.2–5.8；运行时绕 Y 转到头朝 +X，再按体长归一化到 1。

GLB 加载失败时，`js/fish.js` 回退到程序化网格（英雄鲤见 `js/fish-hero-carp.js`）。
