import unittest
from decimal import Decimal

from analyze import load_rows, summarize


class AnalysisTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = load_rows()
        cls.summary = summarize(cls.rows)

    def test_public_dataset_shape(self):
        self.assertEqual(len(self.rows), 1_137)  # SOURCE: corrected market ledger count.
        self.assertEqual(self.summary["trade_rows"], 1_590)  # SOURCE: authoritative API TRADE row count.

    def test_reconstructed_balance_path(self):
        self.assertEqual(Decimal(str(self.summary["realized_pnl"])), Decimal("-5.53"))
        self.assertEqual(Decimal(str(self.summary["peak_balance"])), Decimal("221.4"))
        self.assertEqual(self.summary["peak_after_market"], 347)
        self.assertEqual(Decimal(str(self.summary["final_balance"])), Decimal("12.47"))

    def test_dataset_contains_no_direct_identifiers(self):
        forbidden = {"wallet", "address", "tx_hash", "condition_id", "slug", "order_id", "private_key"}
        self.assertTrue(forbidden.isdisjoint(self.rows[0].keys()))


if __name__ == "__main__":
    unittest.main()
