"""Summarize archived LAT_DETAIL records without exporting order identifiers.

Read-only: supply historical log paths; never imports or runs trading code.
"""
import argparse
from collections import Counter
from decimal import Decimal
import hashlib
import json
import math
from pathlib import Path
import re
import statistics


def summarize_log(path):
    rows = []
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for raw in stream:
            digest.update(raw)
            line = raw.decode("utf-8", errors="replace")
            if "[LAT_DETAIL]" not in line:
                continue
            fields = dict(re.findall(r"\b(build|post|total|status)=([^\s]+)", line))
            if not all(key in fields for key in ("build", "post", "total", "status")):
                continue
            rows.append({"timestamp": line[:23], "status": fields["status"],
                         **{key: Decimal(fields[key]) for key in ("build", "post", "total")}})
    if not rows:
        raise ValueError(f"No complete LAT_DETAIL records in {path}")
    metrics = {}
    for key in ("build", "post", "total"):
        values = sorted(row[key] for row in rows)
        # SOURCE: nearest-rank 95th percentile; median uses statistics.median.
        metrics[key + "_ms"] = {"median": float(statistics.median(values)),
                                "p95": float(values[math.ceil(len(values) * .95) - 1]),
                                "min": float(min(values)), "max": float(max(values))}
    return {"sha256": digest.hexdigest(), "records": len(rows),
            "first": min(row["timestamp"] for row in rows),
            "last": max(row["timestamp"] for row in rows),
            "statuses": dict(Counter(row["status"] for row in rows)), **metrics}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("logs", nargs="+")
    args = parser.parse_args()
    print(json.dumps([summarize_log(path) for path in args.logs], indent=2))
