const STARTING_BALANCE = 18; // SOURCE: documented assumption in analyze.py and README.md.
const PAGE_SIZE = 80; // SOURCE: presentation-only pagination size; it does not affect any result.

const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const number = value => new Intl.NumberFormat("en-US").format(value);

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const parseLine = line => [...line.matchAll(/"([^"]*)"(?:,|$)/g)].map(match => match[1]);
  const headers = parseLine(lines.shift());
  return lines.map(line => Object.fromEntries(headers.map((header, index) => [header, parseLine(line)[index]]))).map(row => ({
    sequence: Number(row.sequence), asset: row.asset, duration: row.duration,
    avg_entry: Number(row.avg_entry), cost: Number(row.cost), payout: Number(row.payout),
    pnl: Number(row.pnl), trade_count: Number(row.trade_count), won: row.won.toLowerCase() === "true"
  }));
}

function summarize(rows) {
  let balance = STARTING_BALANCE;
  let peak = balance;
  let peakSequence = 0;
  const curve = [{ sequence: 0, balance }];
  for (const row of rows) {
    balance += row.pnl;
    curve.push({ sequence: row.sequence, balance });
    if (balance > peak) { peak = balance; peakSequence = row.sequence; }
  }
  return {
    markets: rows.length,
    trades: rows.reduce((sum, row) => sum + row.trade_count, 0),
    pnl: rows.reduce((sum, row) => sum + row.pnl, 0),
    totalVolume: rows.reduce((sum, row) => sum + row.cost, 0), // SOURCE: sum of ledger cost across all 1,590 trade rows.
    peak, peakSequence, final: balance, curve
  };
}

function groupStats(rows, keyFn) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const value = grouped.get(key) || { key, markets: 0, cost: 0, pnl: 0, wins: 0 };
    value.markets += 1; value.cost += row.cost; value.pnl += row.pnl; value.wins += row.won ? 1 : 0;
    grouped.set(key, value);
  }
  return [...grouped.values()];
}

function renderChart(curve, peakSequence) {
  const svg = document.getElementById("equityChart");
  const tooltip = document.getElementById("tooltip");
  const width = 1200, height = 500, pad = { l: 64, r: 24, t: 24, b: 44 };
  const min = Math.min(0, ...curve.map(point => point.balance));
  const max = Math.max(...curve.map(point => point.balance));
  const x = sequence => pad.l + (sequence / (curve.length - 1)) * (width - pad.l - pad.r);
  const y = balance => pad.t + (max - balance) / (max - min) * (height - pad.t - pad.b);
  const path = curve.map((point, index) => `${index ? "L" : "M"}${x(point.sequence).toFixed(2)},${y(point.balance).toFixed(2)}`).join(" ");
  const area = `${path} L${x(curve.at(-1).sequence)},${height-pad.b} L${x(0)},${height-pad.b} Z`;
  const grid = Array.from({length: 5}, (_, index) => {
    const value = min + (max - min) * (index / 4); const py = y(value);
    return `<line class="chart-grid" x1="${pad.l}" x2="${width-pad.r}" y1="${py}" y2="${py}"/><text class="chart-label" x="8" y="${py+4}">${money(value)}</text>`;
  }).join("");
  const peakX = x(peakSequence);
  svg.innerHTML = `${grid}<path class="equity-area" d="${area}"/><path class="equity-line" d="${path}"/><line class="peak-line" x1="${peakX}" x2="${peakX}" y1="${pad.t}" y2="${height-pad.b}"/><text class="chart-label" x="${peakX+7}" y="${pad.t+10}">PEAK / #${peakSequence}</text><rect class="chart-hit" x="${pad.l}" y="${pad.t}" width="${width-pad.l-pad.r}" height="${height-pad.t-pad.b}"/>`;
  svg.addEventListener("pointermove", event => {
    const rect = svg.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width * width;
    const index = Math.max(0, Math.min(curve.length - 1, Math.round((px - pad.l) / (width-pad.l-pad.r) * (curve.length - 1))));
    const point = curve[index];
    tooltip.hidden = false; tooltip.textContent = `MARKET ${point.sequence} / ${money(point.balance)}`;
    tooltip.style.left = `${event.clientX - rect.left}px`; tooltip.style.top = `${y(point.balance) / height * rect.height}px`;
  });
  svg.addEventListener("pointerleave", () => { tooltip.hidden = true; });
}

function renderDataRows(target, rows, firstLabel) {
  target.innerHTML = `<div class="data-row header"><span>${firstLabel}</span><span>MARKETS</span><span>COST</span><span>PNL</span></div>` + rows.map(row => `<div class="data-row"><strong>${row.key}</strong><span>${number(row.markets)}</span><span>${money(row.cost)}</span><span class="${row.pnl < 0 ? "negative" : "positive"}">${money(row.pnl)}</span></div>`).join("");
}

function entryBand(value) {
  if (value < .25) return "0.00–0.25";
  if (value < .5) return "0.25–0.50";
  if (value < .75) return "0.50–0.75";
  return "0.75–1.00";
}

function initLedger(rows) {
  let filter = "all", visible = PAGE_SIZE;
  const body = document.getElementById("ledgerBody");
  const more = document.getElementById("showMore");
  const render = () => {
    const selected = filter === "all" ? rows : rows.filter(row => row.asset === filter);
    body.innerHTML = selected.slice(0, visible).map(row => `<tr><td>${row.sequence}</td><td>${row.asset.toUpperCase()}</td><td>${row.duration}</td><td>${row.avg_entry.toFixed(3)}</td><td>${money(row.cost)}</td><td>${money(row.payout)}</td><td class="${row.pnl < 0 ? "negative" : "positive"}">${money(row.pnl)}</td><td>${row.won ? "WON" : "LOST"}</td></tr>`).join("");
    more.hidden = visible >= selected.length;
    if (!selected.length) {
      const cell = document.createElement("td");
      cell.colSpan = 8; // SOURCE: eight columns in the ledger header.
      cell.textContent = `No ${filter.toUpperCase()} records in this published ledger.`;
      const row = document.createElement("tr");
      row.append(cell);
      body.replaceChildren(row);
    }
  };
  document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach(item => {
      item.classList.remove("active");
      item.setAttribute("aria-pressed", String(item === button));
    });
    button.classList.add("active");
    filter = button.dataset.filter; visible = PAGE_SIZE; render();
  }));
  more.addEventListener("click", () => { visible += PAGE_SIZE; render(); });
  render();
}

async function start() {
  const response = await fetch("data/market_ledger.csv");
  if (!response.ok) throw new Error(`Ledger unavailable (${response.status})`);
  const rows = parseCsv(await response.text());
  const summary = summarize(rows);
  // SOURCE: full public ledger, computed with the documented starting-balance assumption.
  document.getElementById("ledgerOutcome").textContent = `The ledger ends at ${money(summary.final)}, with a total result of ${money(summary.pnl)} from the ${money(STARTING_BALANCE)} starting-balance assumption.`;
  document.getElementById("markets").textContent = number(summary.markets);
  document.getElementById("trades").textContent = number(summary.trades);
  document.getElementById("starting").textContent = money(STARTING_BALANCE);
  document.getElementById("peak").textContent = money(summary.peak);
  document.getElementById("volume").textContent = money(summary.totalVolume);
  renderChart(summary.curve, summary.peakSequence);
  renderDataRows(document.getElementById("phaseTable"), groupStats(rows, row => row.sequence <= summary.peakSequence ? "BEFORE PEAK" : "AFTER PEAK"), "PHASE");
  const bandOrder = ["0.00–0.25", "0.25–0.50", "0.50–0.75", "0.75–1.00"];
  renderDataRows(document.getElementById("bandTable"), groupStats(rows, row => entryBand(row.avg_entry)).sort((a,b) => bandOrder.indexOf(a.key)-bandOrder.indexOf(b.key)), "AVG ENTRY");
  initLedger(rows);
}

start().catch(error => {
  document.getElementById("equityChart").outerHTML = `<p class="negative">${error.message}</p>`;
});
