# Polybow — a live trading system, reconstructed honestly

Polybow was a Python trading bot for short-duration Polymarket crypto prediction markets. It combined market discovery, Gamma/CLOB APIs, WebSocket order books, Chainlink/RTDS oracle capture, execution, monitoring, strategy research and post-trade reconciliation. This repository reconstructs the live experiment from an anonymized market-level ledger. It is a postmortem about data quality, probability, fee drag, risk concentration and operational controls—not evidence of a profitable strategy.

## The question

Polymarket's short-duration markets made a small price gap look attractive. At
$0.99, a winning share has only about one cent of gross upside before fees,
spread, latency and fillability. The actual problem was therefore not simply
predicting whether BTC would move up or down. The bot had to capture the right
opening oracle value, read a changing CLOB, find an executable price and record
what really happened after resolution.

## From the first loop to the failed edge

The system began with market discovery, Chainlink/RTDS opening-price capture,
probability checks, order-book reads, CLOB execution, resolution handling, a
monitor and a post-trade ledger. The first live version produced 108 fires and
showed that high-confidence favorite fills left little room after fees.

StratA and then StratB moved the search toward cheaper, asymmetric entries and a
larger gap between market price and the captured oracle move. The phase report
records 299 StratB rank4 fires and 99 wins. Polling was then replaced by an
event-driven WebSocket path so a book update could trigger evaluation sooner;
historical latency notes are context, not reproduced performance evidence.

The reconstructed ledger reached a $221.40 peak after market 347 from the
documented $18 starting-balance assumption. A separate liquid-balance audit
observed an approximate $210.22 peak. This was a concentrated run-up, not a
bankable profitability result, and the available artifacts cannot attribute
every winning fill to one bot.

The later test opened the $0.01-$0.20 cheap-fill path and exercised gap and
StratB variants. UC recorded 0/8. The overlapping fire counts are not one
deduplicated failure total. The evidence pointed to fee drag, oracle timing,
fillability and expanded exposure; the original edge was treated as dead.

## How AI was used

AI was used as an engineering multiplier around the system: to break hypotheses
into implementation tasks, iterate on code and variants, inspect traces, debug,
refactor and help organize the evidence. It was not the market oracle, did not
place trades and did not turn the peak into a prediction or profitability claim.
The final checks use the shipped ledger, regression tests, replay/analysis and
on-chain review. The public archive does not claim unaided authorship, customer
adoption or measured productivity gains.

## Verified result

The source audit reconciled 1,590 trade rows into 1,137 markets. The latest forensic review distinguishes the reported $18 starting balance, a reconstructed peak of **$221.40**, and an independently observed liquid peak of approximately **$210.22**. The theoretical market-ledger PnL was **-$5.53**; settled wallet cash was lower and the available artifacts do not isolate every fee, dust and settlement difference.

Under the documented **$18 starting-balance assumption**, the reconstructed balance reached **$221.40 after 347 markets**. The run-up concentrated in a small cluster of low-price BTC winners; attribution to a single bot is incomplete. The later increase in volume, parallel variants and exposure did not survive.

## What this demonstrates

- Reconciliation of API/on-chain activity into a market-level ledger
- Separation of authoritative records from incomplete bot-local histories
- Drawdown, exposure-band and phase analysis
- Honest treatment of selection bias and paper/live gaps
- Privacy-preserving publication: the market ledger contains no transaction-level identifiers or executable trading code. The public wallet is linked from the page separately so the live history can be inspected.

## Reproduce

```bash
python analyze.py
python -m unittest discover -s tests
node --test tests/ledger-ui.test.cjs
```

Open `index.html` through a local HTTP server to inspect the archive interface. It reads the same anonymized `data/market_ledger.csv` used by `analyze.py`; the visualization does not contain a separate result source.

The standard-library script reads `data/market_ledger.csv` and prints JSON. The anonymized rows retain only sequence, asset, duration, entry price, cost, payout, PnL, trade count and outcome.

The JavaScript regression executes the shipped ledger functions with a minimal DOM stand-in: empty SOL results, pagination, ETH filtering and pagination reset. It also checks the hidden-state CSS rule; browser rendering is a separate manual check, not proved by this test.

## Review boundaries

This is the source of the public postmortem and analysis, not the complete trading bot or its private capture history. The public ledger cannot independently prove wallet attribution or every fee. Historical latency notes are not reproduced here. No customer-adoption or production-reliability claim is made. No additional reuse license is granted; dependency licenses remain applicable.

## Main lesson

The account peak was concentrated in a small, high-variance segment. After the patch, the original edge was treated as dead and the same idea was tested through controlled variations to determine why: fee drag, oracle timing, fillability and expanded exposure.

This experiment could have lost the full live balance. Any renewed deployment would require current depth/fee/slippage calibration, hard loss limits and a separate out-of-sample validation.
