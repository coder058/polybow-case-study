const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('SOL empty state, pagination and filter reset use the shipped ledger', () => {
  const source = readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  const csv = readFileSync(path.join(__dirname, '../data/market_ledger.csv'), 'utf8');
  const make = () => ({ innerHTML: '', hidden: false, listeners: {}, children: [],
    classList: { add() {}, remove() {} },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    append(child) { this.children.push(child); },
    replaceChildren(...children) { this.children = children; this.innerHTML = ''; }
  });
  const body = make(), more = make();
  const html = readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const buttons = [...html.matchAll(/data-filter="([^"]+)"/g)].map(([, asset]) => Object.assign(make(), { dataset: { filter: asset } }));
  const document = {
    getElementById: id => id === 'ledgerBody' ? body : more,
    createElement: make, querySelectorAll: () => buttons, querySelector: () => buttons[0]
  };
  // SOURCE: execute the actual ledger functions without booting the fetch/chart entrypoint.
  const context = vm.createContext({ document, Intl, console, testCsv: csv });
  vm.runInContext(source.slice(0, source.indexOf('\nstart().catch')) + '\ninitLedger(parseCsv(testCsv));', context);
  const count = () => (body.innerHTML.match(/<tr>/g) || []).length;
  // SOURCE: PAGE_SIZE in app.js is 80 presentation rows.
  assert.equal(count(), 80);
  more.listeners.click(); assert.equal(count(), 160);
  buttons[3].listeners.click();
  assert.equal(more.hidden, true);
  assert.match(body.children[0].children[0].textContent, /No SOL records/);
  buttons[2].listeners.click(); assert.equal(count(), 80); assert.equal(more.hidden, false);
  while (!more.hidden) more.listeners.click();
  // SOURCE: the checked-in CSV contains 327 ETH market rows.
  assert.equal(count(), 327);
  assert.match(readFileSync(path.join(__dirname, '../ledger-fixes.css'), 'utf8'), /\.show-more\[hidden\]\{display:none\}/);
});
