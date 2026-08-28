import tempfile
from pathlib import Path
import unittest

from latency import summarize_log


class LatencyTest(unittest.TestCase):
    def test_metrics_ignore_partial_lines_and_preserve_statuses(self):
        # SOURCE: synthetic test fixtures, NOT measurements of a trading bot.
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.log"
            lines = ["ignored noise\n", "[LAT_DETAIL] metadata err: offline\n"]
            for value in range(1, 21):
                status = "matched" if value == 20 else "live"
                lines.append(f"2026-05-03 00:00:00,000 [LAT_DETAIL] "
                             f"build={value} post={value} total={value} status={status}\n")
            path.write_text("".join(lines), encoding="utf-8")
            result = summarize_log(path)
            self.assertEqual(result["records"], 20)
            self.assertEqual(result["total_ms"]["median"], 10.5)
            self.assertEqual(result["total_ms"]["p95"], 19)
            self.assertEqual(result["statuses"], {"live": 19, "matched": 1})

    def test_empty_log_is_not_a_zero_latency_claim(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "empty.log"
            path.touch()
            with self.assertRaisesRegex(ValueError, "No complete"):
                summarize_log(path)
