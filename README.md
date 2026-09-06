# Polybow / Development notes

A concise account of a Python trading experiment: Polybow → StratA → StratB →
UC, event-driven evaluation, a Dublin VPS and the live outcome.

[Website](https://polybow-archive.vercel.app/) · [Evidence and source map](EVIDENCE.md)

[Project walkthrough: signal path, dependencies and reproduction steps](https://coder058.github.io/profile/projects/polybow.html).

## What changed

The initial favorite-buying approach evolved into mid-price and then cheap-entry
experiments. WebSocket callbacks replaced waiting for the monitoring loop.
The hot-evaluation gate changed from 50 to 5 ms; metadata caching, prewarming,
parallel lookups and the Dublin execution setup reduced work before submission.

Polymarket separately moved production trading to CLOB V2 on April 28. Its
official migration material documents new exchange contracts, a rewritten CLOB
backend, pUSD collateral, changed signed-order fields, match-time fee handling
and cleared open orders. Polybow's own May 2 changes removed paper-state entry
and capital guards and replaced its simulator with a no-op. Those are distinct
events; their timing does not establish which one caused later performance.

Recomputed May 3 preparation-to-API-response medians were **35.35 ms for StratB**
(52 records) and **33.0 ms for UC** (22). These measure acknowledgements, not
fills. The earlier approximately 27-second oracle update interval is a different
metric, not a comparable execution baseline.

AI assisted implementation, experimentation and analysis. Actual fills and
wallet reconciliation provided checks on those outputs.

## Outcome

The July cash audit reports initial trading collateral of **$19.98**, an
observed liquid peak of **$210.22**, and lifetime settled trading cash P&L of
**−$13.70**. Gains were concentrated, bot attribution is incomplete, and the
wallet subsequently fell to dust.

The public CSV is a different calculation: gross market-resolution accounting
with an assumed $18 start, $221.40 peak and $12.47 end (−$5.53 P&L).
The site keeps that curve and ledger behind an expandable section.

Internal May 2 patches and later deterioration are documented. A later private
book audit found that the old stale-ask condition was no longer durable in late
June and early July, but its recordings lacked order sizes and August coverage.
A single patch causing the end of a proven edge is **not** established by the
evidence.

## Reproduce

```bash
python analyze.py
python -m unittest discover -s tests
node --test tests/ledger-ui.test.cjs
python -m http.server 8084 --bind 127.0.0.1
```

Open localhost:8084. The chart and Python analysis use the same anonymized CSV.
`latency.py` can reproduce the timing analysis when given the private source
logs; paths, hashes and limitations are in [EVIDENCE.md](EVIDENCE.md).

This repository publishes the case study and ledger analysis, not the private
trading bot, its raw captures or a current deployable strategy. No additional
reuse license is granted. The experiment did not establish durable profitability.
