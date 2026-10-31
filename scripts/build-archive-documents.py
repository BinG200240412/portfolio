#!/usr/bin/env python3
"""Render the approved archive PDFs into lightweight, page-by-page WebP.

Requires PyMuPDF and Pillow. Originals are read only. By default the script reads
PDFs already in this checkout; --source-root can supply the same relative paths
from a full checkout when this one is sparse. No personal folders are scanned.

    python3 scripts/build-archive-documents.py
    python3 scripts/build-archive-documents.py --source-root /path/to/full/checkout

Two independent processes are used rather than threads: each process owns its
PyMuPDF document and rendering state. --workers 1 runs serially.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ProcessPoolExecutor
import json
from pathlib import Path
import subprocess

import fitz
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[1]
ARCHIVE_DIR = Path("assets/works/more")
PAGE_WIDTH = 1440
BOARD_WIDTH = 1280
COVER_WIDTH = 960
WEBP_QUALITY = 75
WEBP_METHOD = 4

DOCUMENTS = (
    {
        "id": "portfolio-2024",
        "title": {"zh": "作品集 2021–2024", "en": "Portfolio 2021–2024"},
        "group": "portfolio",
        "pdf": "assets/works/more/portfolio-2024.pdf",
    },
    {
        "id": "portfolio-2025",
        "title": {"zh": "物哀手帖 · 2025", "en": "Mono no Aware · Portfolio 2025"},
        "group": "portfolio",
        "pdf": "assets/works/more/portfolio-2025.pdf",
    },
    {
        "id": "qianli",
        "title": {"zh": "千里江山", "en": "A Thousand Li of Rivers and Mountains"},
        "group": "project",
        "pdf": "assets/works/qianli/qianli.pdf",
    },
    {
        "id": "gogo",
        "title": {"zh": "狗GO · 设计展板", "en": "GouGO · Design Board"},
        "group": "project",
        "pdf": "assets/works/xr/gogo.pdf",
        "board": True,
    },
    {
        "id": "liangzhu-ai3d",
        "title": {"zh": "良渚 AI 3D · 工作流展板", "en": "Liangzhu AI 3D · Workflow Board"},
        "group": "project",
        "pdf": "assets/works/ai3d/liangzhu-3d.pdf",
        "board": True,
    },
    {
        "id": "drift",
        "title": {"zh": "漂移之屋 · 设计展板", "en": "Drifting House · Design Board"},
        "group": "project",
        "pdf": "assets/works/drift/drift.pdf",
        "board": True,
    },
)


def render_image(page: fitz.Page, width: int, clip: fitz.Rect | None = None) -> Image.Image:
    """Keep every original page intact; only covers may receive a top crop."""
    rect = clip if clip is not None else page.rect
    scale = width / rect.width
    pixmap = page.get_pixmap(
        matrix=fitz.Matrix(scale, scale),
        colorspace=fitz.csRGB,
        alpha=False,
        clip=clip,
    )
    image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
    expected_size = (width, max(1, round(rect.height * scale)))
    if image.size != expected_size:
        image = image.resize(expected_size, Image.Resampling.LANCZOS)
    return image


def write_webp(image: Image.Image, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".webp.tmp")
    image.save(temporary, format="WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
    temporary.replace(target)


def verify_borrowed_pdf(source: Path, relative: str) -> None:
    """A sparse checkout may borrow only the exact PDF already in its HEAD."""
    expected = subprocess.check_output(
        ["git", "rev-parse", "HEAD:" + relative], cwd=REPO_ROOT, text=True,
    ).strip()
    actual = subprocess.check_output(
        ["git", "hash-object", str(source)], cwd=REPO_ROOT, text=True,
    ).strip()
    if actual != expected:
        raise ValueError(f"Fallback PDF differs from published HEAD: {relative}")


def render_document(job: tuple[dict, str, str]) -> tuple[dict, int]:
    spec, input_name, output_name = job
    source = Path(input_name)
    output_root = Path(output_name)
    page_dir = ARCHIVE_DIR / "pages" / spec["id"]
    cover_path = ARCHIVE_DIR / "covers" / f"{spec['id']}.webp"
    pages = []
    generated_bytes = 0

    with fitz.open(source) as document:
        if document.needs_pass or len(document) == 0:
            raise ValueError(f"Cannot render approved PDF: {spec['id']}")
        for index, page in enumerate(document):
            image = render_image(page, BOARD_WIDTH if spec.get("board") else PAGE_WIDTH)
            relative = page_dir / f"{index + 1:03d}.webp"
            target = output_root / relative
            write_webp(image, target)
            pages.append({
                "src": "../" + relative.as_posix(),
                "width": image.width,
                "height": image.height,
            })
            generated_bytes += target.stat().st_size

        first = document[0]
        cover_clip = None
        if spec.get("board"):
            rect = first.rect
            cover_clip = fitz.Rect(
                rect.x0, rect.y0, rect.x1,
                min(rect.y1, rect.y0 + rect.width * 3 / 4),
            )
        cover = render_image(first, COVER_WIDTH, cover_clip)
        write_webp(cover, output_root / cover_path)
        generated_bytes += (output_root / cover_path).stat().st_size

    # Remove only obsolete numeric page previews from this generated directory.
    valid_pages = {f"{number:03d}.webp" for number in range(1, len(pages) + 1)}
    for old_page in (output_root / page_dir).glob("*.webp"):
        if old_page.stem.isdigit() and old_page.name not in valid_pages:
            old_page.unlink()

    entry = {
        "id": spec["id"],
        "title": spec["title"],
        "group": spec["group"],
        "pdf": "../" + spec["pdf"],
        "sizeBytes": source.stat().st_size,
        "pages": pages,
        "cover": "../" + cover_path.as_posix(),
        "coverWidth": cover.width,
        "coverHeight": cover.height,
    }
    print(f"{spec['id']}: {len(pages)} pages, {generated_bytes:,} preview bytes", flush=True)
    return entry, generated_bytes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-root", type=Path,
        help="Optional full checkout containing the same approved PDF paths.",
    )
    parser.add_argument("--workers", type=int, choices=(1, 2), default=2)
    args = parser.parse_args()

    jobs = []
    for spec in DOCUMENTS:
        source = REPO_ROOT / spec["pdf"]
        borrowed = False
        if not source.is_file() and args.source_root is not None:
            source = args.source_root.resolve() / spec["pdf"]
            borrowed = True
        if not source.is_file():
            parser.error(f"Missing approved input PDF: {spec['pdf']}")
        if borrowed:
            verify_borrowed_pdf(source, spec["pdf"])
        jobs.append((spec, str(source), str(REPO_ROOT)))

    if args.workers == 1:
        results = [render_document(job) for job in jobs]
    else:
        with ProcessPoolExecutor(max_workers=args.workers) as executor:
            results = list(executor.map(render_document, jobs))

    catalog = {"documents": [entry for entry, _ in results]}
    destination = REPO_ROOT / ARCHIVE_DIR / "archive-catalog.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(destination)
    print(
        f"Wrote {len(results)} documents / "
        f"{sum(len(entry['pages']) for entry, _ in results)} pages / "
        f"{sum(size for _, size in results):,} preview bytes to "
        f"{destination.relative_to(REPO_ROOT)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
