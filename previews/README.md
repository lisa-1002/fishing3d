# previews

四则竖屏试玩，和静湖垂钓根目录分开。根目录的 `index.html`、`js/`、存档键都不在这里改。

| 名称 | 路径 |
|---|---|
| 试玩入口 | `/previews/` |
| 林间试炼 | `/previews/snow-white/` |
| 林间红帽 | `/previews/red-hood/` |
| 断桥烟雨 | `/previews/white-snake/` |
| 问剑云深 | `/previews/interactive-drama/` |

站点若从 `main` 根目录发布，合并后的地址是：

- https://lisa-1002.github.io/fishing3d/previews/
- https://lisa-1002.github.io/fishing3d/previews/snow-white/
- https://lisa-1002.github.io/fishing3d/previews/red-hood/
- https://lisa-1002.github.io/fishing3d/previews/white-snake/
- https://lisa-1002.github.io/fishing3d/previews/interactive-drama/

未合并前这些地址不会出现。不要把草稿分支上的文件当成已经上线。

每个游戏目录可以单独打包。`pack.py` 会把本地 `vendor/three.module.js` 和 `lib/` 放进 zip，并把引用改成包内相对路径。单包应小于 48MB。
