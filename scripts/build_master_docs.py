"""Rebuilds `master-docs/`: ONE file, `00_ALL_IN_ONE.md`, holding ALL the documentation one document after another, for sharing in one go.

  python scripts/build_master_docs.py

The old contents of master-docs/ are deleted first. Sources: team-docs/, platform-docs/, and the root README.md, CONTRIBUTING.md and AGENTS.md
(only .md and .txt files are read; nothing secret). The UI sample pictures are NOT copied: they stay in team-docs/05-design/ui-samples/ and the file
lists their names so you know which pictures to attach when you share it."""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "master-docs"
TEXT = {".md", ".txt"}
PICS = {".webp", ".png", ".jpg", ".jpeg"}
START_HERE = ("team-docs/02-product/social-purpose.md", "team-docs/02-product/product-architecture.md", "team-docs/06-technical/ui-build-spec.md", "team-docs/01-vision/vision.md")


def sources() -> list[Path]:
    files = [ROOT / n for n in ("README.md", "CONTRIBUTING.md", "AGENTS.md") if (ROOT / n).exists()]
    for folder in ("team-docs", "platform-docs"):
        files += sorted(p for p in (ROOT / folder).rglob("*") if p.is_file() and p.suffix.lower() in TEXT)
    return files


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    docs = sources()
    parts = ["# Bricks: all documentation in one file\n", "Built by `scripts/build_master_docs.py`. Read the sections marked (start here) first.\n", "## Contents\n"]
    body = []
    for p in docs:
        rel = p.relative_to(ROOT).as_posix()
        parts.append(f"- `{rel}`" + (" (start here)" if rel in START_HERE else ""))
        body.append(f"\n\n---\n\n# FILE: {rel}\n\n{p.read_text(encoding='utf-8', errors='replace')}")
    pics = sorted(p.name for p in (ROOT / "team-docs" / "05-design" / "ui-samples").glob("*") if p.suffix.lower() in PICS)
    parts.append("\nUI sample pictures (kept in `team-docs/05-design/ui-samples/`, attach them separately): " + ", ".join(f"`{n}`" for n in pics) + "\n")
    (OUT / "00_ALL_IN_ONE.md").write_text("\n".join(parts) + "".join(body) + "\n", encoding="utf-8")
    print(f"master-docs rebuilt: ONE file with {len(docs)} documents")


if __name__ == "__main__":
    main()
