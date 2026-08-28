# Polybow: source notes

Reviewed 2026-08-29. This is a condensed source map, not a claim to have read
every capture event or rerun a live bot. The investigation covered the original
Polybow reports, StratA/B lineage, archived VPS code and logs, latency patches,
fill audits and the later wallet cash reconciliation. No bot was started,
restarted or allowed to place an order during this review.

## Development history

Paths below identify the owner's private source archive; those files are not
included in this public repository. Summaries distinguish historical reports,
inspected code and newly recomputed log statistics.

| Claim | Source | What it establishes |
|---|---|---|
| Early oracle updates approximately every 27 seconds | `polybowtwo/POLYBOW_REPORT.md`, chapters 1–2 | Historical observation of a data-source update interval, not an end-to-end execution benchmark. The early report also explicitly rejects theoretical-price simulation profits. |
| Polybow → StratA → StratB → cheap variants | `polybow-live/_analysis/stratb_lineage_edge_report.md`, Lineage | Original favorite entries; StratA's $0.40–$0.72 / 11–15-second band; broader StratB configurations; subsequent cheap-fill experiments. |
| Branches overlap | `polybow-live/ALL_SESSIONS_ANALYSIS.md`, generated April 22 | Polybow, StratA and StratB coexisted. Do not describe their chronology as four isolated, sequential trials. Its local P&L is not used as wallet truth. |
| Event-driven hot evaluation | `archived_vps_polybow/_staging/polybow_stratB/patch_event_driven.py`; corresponding `live_monitor.py` | Priority book callbacks invoke evaluation; a nonblocking lock coordinates the main loop and callback. Original 50 ms throttle; archived monitor line 1319 sets 5 ms. That is a gate, not measured latency. |
| Dublin execution stack | `polybow-live/CLAUDE.md`, order-execution notes; archived monitor/order helper | Historical notes specify AWS Dublin, HTTP/2, coincurve signing. Notes quote about 80 ms POST and 0.55 ms per signature, but contain no raw benchmark sample. These are not displayed as newly verified results. |
| Metadata and connection work | `_optimize_latency.py`, `_patch_prewarm_cache.py`, archived `live_orders.py` | Startup warmup, dedicated HTTP/2 keepalive client, token cache and parallel metadata fetch. The keepalive uses a separate client: it does not by itself prove reuse of the order client's socket. |
| UC maker/taker experiment | `_patch_latency_maker.py`, `_patch_uc_stack.py` | Maker bids below the ask; April 28 patch attempts a second taker leg. This can increase exposure; it is not evidence of profitable fills. |
| May 2 internal changes | `_remove_all_simulator_checks.py`, `_stub_simulator.py`; archived monitor | Removal of paper-state per-market/capital guards; replacement of the simulator by a no-op. These are our code changes, not an identified exchange patch. |

The archived StratB monitor also retains different price-source paths: its hot
path uses drift-corrected Binance first, while the main-loop section disables
Binance. The archive does not support describing the entire deployment as one
uniform, fully validated signal path.

## Recomputed execution timings

Read-only extraction with `latency.py`, from every complete `[LAT_DETAIL]` row
in each of the following files. No wins, fills or fast rows were selected.

Base: `polybow-live/archived_vps_polybow/_staging/`.

| Log | UTC range on 2026-05-03 | Rows | API response statuses |
|---|---|---:|---|
| `polybow_stratB/live.log` | 00:44:50.931–04:54:53.632 | 52 | 51 live/resting; 1 matched |
| `polybow_stratB_ultracheap/live.log` | 00:44:50.914–01:59:55.816 | 22 | 22 live/resting |

| Milliseconds | StratB median | StratB p95 | UC median | UC p95 |
|---|---:|---:|---:|---:|
| Build order | 1.7 | 7.4 | 1.9 | 5.0 |
| POST response | 32.85 | 292.2 | 29.45 | 287.6 |
| Preparation + response | 35.35 | 298.0 | 33.0 | 289.2 |

Median uses exact decimal inputs; p95 uses nearest rank. Displayed one-decimal
values round half up. The total includes metadata preparation, order building
and the API response. It excludes upstream feed delay, earlier decision time,
matching and on-chain settlement. Component medians do not add to the median
total. StratB's maximum total was 521.4 ms; UC's was 293.0 ms.

These are May 3 samples from this lineage, not a current production benchmark or
an exhaustive search for the newest timing in later unrelated experiments.
They are not a controlled before/after test against the early feed's 27-second
update interval. The Dublin deployment was not rebenchmarked on August 29.

`_analysis/stratb_lifetime_live_trade_audit.md` reports that the May 3 “matched”
row could not be verified through the Data API/RPC. It is retained in the
latency statistics because an API response was timed, not counted as a fill.

SHA-256 of the input logs:

```text
StratB 7422551524adb3afd3ce50e2fd484cc4d7456b8fc7049cd1e5503b8b93a5ca34
UC     d3c072eea406e0fcf04f775cf4d9f3673c0a82eda291148287332b93a482377e
```

Reproduce if you have those private source files:

```bash
python latency.py /path/to/polybow_stratB/live.log /path/to/polybow_stratB_ultracheap/live.log
```

The raw logs are not published because they contain order-level identifiers.
Hashes identify inputs; they are not a substitute for public access to them.

## Cash outcome and the patch claim

The source of the cash figures is
`polybow-live/WALLET_RUNUP_FULL_FORENSIC_20260715.md`. It supersedes earlier
cash interpretations in the June audits and forensic PDFs:

- Observed initial trading collateral: $19.979317 USDC.e.
- Maximum observed liquid stablecoins: $210.215219 on May 2 at 18:41:54 UTC.
- Lifetime activity-linked settled trading cash P&L: −$13.700515.
- Separate, non-activity contract transfers: $6.25 out. Their purpose is
  unresolved; they are not silently classified as trading losses.
- Stablecoin dust at the July audit: $0.038307, including native USDC.

The public CSV instead reconstructs gross market-resolution P&L: −$5.53,
with an assumed $18 start, $221.40 peak and $12.47 end. Those are not liquid
wallet balances. The public chart and its calculations remain unchanged and
are now secondary to the corrected cash interpretation.

The July audit attributes most gains to a small cluster of low-price BTC
winners; 90.06% of reconstructed run-up profit lacks reliable single-bot
attribution. After the peak, the next 17 markets with average entry below $0.10
had no wins. More frequent trading and larger average positions followed.

The files establish internal patches and subsequent poor outcomes. They do not
establish one exchange patch, its deployment time, or a controlled causal link
between a patch and loss of edge. Accordingly, the page no longer states that
a specific patch definitively killed an otherwise proven strategy, or that
Dublin latency alone caused the profitable cluster.

This was a real-money experiment followed by loss of the run-up, not evidence
of durable profitability.
