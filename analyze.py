"""Reproduce the public wallet-level postmortem for the Python trading bot."""

from __future__ import annotations

import csv
import json
from decimal import Decimal
from pathlib import Path

DATA_PATH = Path(__file__).parent / "data" / "market_ledger.csv"
STARTING_BALANCE = Decimal("18.00")  # SOURCE: documented user starting-balance assumption in CODEX_FORENSIC_AUDIT.md.
CENT = Decimal("0.01")  # SOURCE: USD results are reported to currency precision.


def money(value: Decimal) -> float:
    return float(value.quantize(CENT))


def load_rows(path: Path = DATA_PATH) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    for row in rows:
        for key in ("avg_entry", "cost", "payout", "pnl"):
            row[key] = Decimal(row[key])
        row["sequence"] = int(row["sequence"])
        row["trade_count"] = int(row["trade_count"])
        row["won"] = row["won"].lower() == "true"
    return rows


def summarize(rows: list[dict]) -> dict:
    balance = STARTING_BALANCE
    peak_balance = balance
    peak_sequence = 0
    for row in rows:
        balance += row["pnl"]
        if balance > peak_balance:
            peak_balance = balance
            peak_sequence = row["sequence"]

    total_cost = sum((row["cost"] for row in rows), Decimal("0"))
    total_payout = sum((row["payout"] for row in rows), Decimal("0"))
    total_pnl = sum((row["pnl"] for row in rows), Decimal("0"))

    return {
        "markets": len(rows),
        "trade_rows": sum(row["trade_count"] for row in rows),
        "market_cost": money(total_cost),
        "market_payout": money(total_payout),
        "realized_pnl": money(total_pnl),
        "starting_balance_assumption": money(STARTING_BALANCE),
        "peak_balance": money(peak_balance),
        "peak_after_market": peak_sequence,
        "final_balance": money(balance),
        "drawdown_from_peak": money(balance - peak_balance),
    }


if __name__ == "__main__":
    print(json.dumps(summarize(load_rows()), indent=2))
