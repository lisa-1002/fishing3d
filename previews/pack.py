#!/usr/bin/env python3
"""Pack each preview into a standalone zip. Rewrites site-relative imports."""
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREV = ROOT / "previews"
VENDOR = ROOT / "vendor" / "three.module.js"
OUT = Path("/opt/cursor/artifacts/previews-qa")
DIST = PREV / "dist"

GAMES = [
    ("snow-white", "林间试炼"),
    ("red-hood", "林间红帽"),
    ("white-snake", "断桥烟雨"),
    ("interactive-drama", "问剑云深"),
]


def rewrite(text: str) -> str:
    return (
        text.replace("../../vendor/three.module.js", "./vendor/three.module.js")
        .replace("../lib/kit.js", "./lib/kit.js")
        .replace("../lib/ui.css", "./lib/ui.css")
    )


def pack_one(folder: str, title: str) -> Path:
    src = PREV / folder
    stage = DIST / "_stage" / folder
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir(parents=True)
    for path in src.rglob("*"):
        if not path.is_file():
            continue
        if path.name.endswith(".zip"):
            continue
        rel = path.relative_to(src)
        dest = stage / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if path.suffix in {".html", ".js", ".css"}:
            dest.write_text(rewrite(path.read_text(encoding="utf-8")), encoding="utf-8")
        else:
            shutil.copy2(path, dest)
    (stage / "vendor").mkdir(exist_ok=True)
    shutil.copy2(VENDOR, stage / "vendor" / "three.module.js")
    lib = stage / "lib"
    lib.mkdir(exist_ok=True)
    kit = (PREV / "lib" / "kit.js").read_text(encoding="utf-8")
    (lib / "kit.js").write_text(kit, encoding="utf-8")
    ui = (PREV / "lib" / "ui.css").read_text(encoding="utf-8")
    (lib / "ui.css").write_text(ui, encoding="utf-8")
    # Drop unused shared files from games that don't reference them? Keep both; harmless.
    OUT.mkdir(parents=True, exist_ok=True)
    DIST.mkdir(parents=True, exist_ok=True)
    zip_path = DIST / f"{folder}.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in stage.rglob("*"):
            if path.is_file():
                zf.write(path, path.relative_to(stage).as_posix())
    shutil.copy2(zip_path, OUT / f"{title}.zip")
    size = zip_path.stat().st_size
    if size > 48 * 1024 * 1024:
        raise SystemExit(f"{title} zip is {size} bytes, over 48MB")
    print(f"{title}\t{folder}.zip\t{size / 1024 / 1024:.2f} MB")
    return zip_path


def main() -> None:
    if DIST.joinpath("_stage").exists():
        shutil.rmtree(DIST / "_stage")
    for folder, title in GAMES:
        pack_one(folder, title)
    if DIST.joinpath("_stage").exists():
        shutil.rmtree(DIST / "_stage")


if __name__ == "__main__":
    main()
