from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import pandas as pd
except Exception as exc:  # pragma: no cover
    print(f"Missing pandas dependency: {exc}", file=sys.stderr)
    sys.exit(1)


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
OUTPUT_FILE = DATA_DIR / "product-catalog.json"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and pd.isna(value):
        return ""
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return ""
    return re.sub(r"\s+", " ", text)


def slugify(*parts: str) -> str:
    text = "-".join(part for part in parts if part).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "catalog-item"


def default_source_path() -> str:
    if not OUTPUT_FILE.exists():
        return ""

    try:
        payload = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        return str(payload.get("sourceFile") or "")
    except Exception:
        return ""


def resolve_source_path() -> Path:
    candidate = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("CATALOG_SOURCE_FILE", "")
    candidate = candidate or default_source_path()
    if not candidate:
        raise SystemExit("No source workbook provided. Pass a path or set CATALOG_SOURCE_FILE.")

    source = Path(candidate)
    if not source.exists():
        raise SystemExit(f"Workbook not found: {source}")
    return source


def build_items(source: Path) -> list[dict]:
    workbook = pd.ExcelFile(source)
    items: list[dict] = []
    seen_ids: set[str] = set()

    for sheet_name in workbook.sheet_names:
        frame = workbook.parse(sheet_name, header=None)
        if frame.empty:
            continue

        current_family = sheet_name

        for row_index in range(2, len(frame.index)):
            row = frame.iloc[row_index].tolist()
            sku = clean_text(row[0] if len(row) > 0 else "")
            brand = clean_text(row[1] if len(row) > 1 else "")
            description = clean_text(row[2] if len(row) > 2 else "")

            if not sku or sku.lower() == "product number":
                continue

            if sku and not brand and not description:
                current_family = sku
                continue

            item_id = slugify(sheet_name, sku, description)
            suffix = 2
            while item_id in seen_ids:
                item_id = f"{slugify(sheet_name, sku, description)}-{suffix}"
                suffix += 1

            seen_ids.add(item_id)
            items.append(
                {
                    "id": item_id,
                    "brand": brand or sheet_name,
                    "family": current_family,
                    "sku": sku,
                    "name": brand or sheet_name,
                    "description": description,
                    "sourceSheet": sheet_name,
                    "type": "print-consumable",
                    "channelTags": ["catalog"],
                }
            )

    return items


def main() -> None:
    source = resolve_source_path()
    items = build_items(source)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": utc_now_iso(),
        "sourceFile": str(source),
        "count": len(items),
        "items": items,
    }
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Imported {len(items)} catalog items from {source}")


if __name__ == "__main__":
    main()
