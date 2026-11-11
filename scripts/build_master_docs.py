"""Rebuilds `master-docs/`: ALL the documentation in ONE flat folder (no sub-folders), plus one combined file, for sharing in one go.

  python scripts/build_master_docs.py

The old contents of master-docs/ are deleted first. Sources: team-docs/, platform-docs/, and the root README.md, CONTRIBUTING.md and AGENTS.md.
File names keep the original path: team-docs/02-product/social-purpose.md becomes team-docs__02-product__social-purpose.md.
00_ALL_IN_ONE.md holds every document one after another with a table of contents. The UI sample pictures are copied in as ui-sample__<name>.
Nothing secret is ever read: only .md, .txt and the sample pictures."""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "master-docs"
TEXT = {".md", ".txt"}
PICS = {".webp", ".png", ".jpg", ".jpeg"}


def sources() -> list[Path]:
    files = [ROOT / n for n in ("README.md", "CONTRIBUTING.md", "AGENTS.md") if (ROOT / n).exists()]
    for folder in ("team-docs", "platform-docs"):
        files += sorted(p for p in (ROOT / folder).rglob("*") if p.is_file() and p.suffix.lower() in TEXT)
    return files


def flat(p: Path) -> str:
    return "__".join(p.relative_to(ROOT).parts)


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    docs = sources()
    parts = ["# Bricks: all documentation in one file\n", "Built by `scripts/build_master_docs.py`. Start with the sections marked (start here).\n", "## Contents\n"]
    body = []
    for p in docs:
        name = flat(p)
        shutil.copyfile(p, OUT / name)
        rel = p.relative_to(ROOT).as_posix()
        mark = " (start here)" if rel in ("team-docs/02-product/social-purpose.md", "team-docs/02-product/product-architecture.md", "team-docs/06-technical/ui-build-spec.md", "team-docs/01-vision/vision.md") else ""
        parts.append(f"- `{rel}`{mark}")
        body.append(f"\n\n---\n\n# FILE: {rel}\n\n{p.read_text(encoding='utf-8', errors='replace')}")
    pics = sorted(p for p in (ROOT / "team-docs" / "05-design" / "ui-samples").glob("*") if p.suffix.lower() in PICS)
    for p in pics:
        shutil.copyfile(p, OUT / f"ui-sample__{p.name}")
    parts.append("\nUI sample pictures (copied beside this file): " + ", ".join(f"`ui-sample__{p.name}`" for p in pics) + "\n")
    (OUT / "00_ALL_IN_ONE.md").write_text("\n".join(parts) + "".join(body) + "\n", encoding="utf-8")
    (OUT / "README.md").write_text("# master-docs\n\nEverything, flat, for sharing. Open `00_ALL_IN_ONE.md` for the whole documentation in one file. Rebuild with `python scripts/build_master_docs.py` (this folder is overwritten each time; edit the originals in `team-docs/` and `platform-docs/`, never here).\n", encoding="utf-8")
    print(f"master-docs rebuilt: {len(docs)} documents, {len(pics)} sample pictures, flat, plus 00_ALL_IN_ONE.md")


if __name__ == "__main__":
    main()
