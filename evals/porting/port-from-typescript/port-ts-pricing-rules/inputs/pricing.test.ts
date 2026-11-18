import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DuplicateRuleError, InvalidItemError, InvalidRuleError, PricingError,
  formatMoney, groupBy, parseRules, priceCart, quoteToJson, subtotalsByCategory,
} from "./pricing.ts";
import type { Item } from "./pricing.ts";

const items: Item[] = [
  { sku: "pen", unitCents: 250, qty: 4, category: "office" },
  { sku: "mug", unitCents: 1000, qty: 1 },
  { sku: "ink", unitCents: 250, qty: 4, category: "office" },
];

test("category scope: missing key means any, null means uncategorized only", () => {
  const rules = parseRules(JSON.stringify([
    { kind: "percent_off", name: "any", percent: 10 },
    { kind: "percent_off", name: "none", percent: 50, category: null },
    { kind: "percent_off", name: "office", percent: 20, category: "office" },
  ]));
  const q = priceCart(items, rules);
  assert.deepEqual([...q.discountsByRule], [["any", 300], ["office", 400], ["none", 500]]);
  assert.equal(q.total, 3000 - 1200);
});

test("parseRules keeps absent and null distinct", () => {
  const [a, b] = parseRules('[{"kind":"percent_off","name":"a","percent":5},' +
    '{"kind":"percent_off","name":"b","percent":5,"category":null}]');
  assert.equal(a.kind === "percent_off" && a.category, undefined);
  assert.equal(b.kind === "percent_off" && b.category, null);
});

test("stack applies rules to the remainder; best picks one", () => {
  const rules = parseRules(JSON.stringify([
    { kind: "fixed_off", name: "five", cents: 500 },
    { kind: "percent_off", name: "half", percent: 50 },
  ]));
  const cart: Item[] = [{ sku: "a", unitCents: 800, qty: 2 }];
  const stacked = priceCart(cart, rules, "stack");
  assert.deepEqual([...stacked.discountsByRule], [["five", 500], ["half", 800]]);
  const best = priceCart(cart, rules, "best");
  assert.deepEqual([...best.discountsByRule], [["half", 800]]);
});

test("best mode: a tie goes to the first rule", () => {
  const rules = parseRules(JSON.stringify([
    { kind: "fixed_off", name: "first", cents: 100 },
    { kind: "fixed_off", name: "second", cents: 100 },
  ]));
  const q = priceCart([{ sku: "a", unitCents: 500, qty: 1 }], rules, "best");
  assert.deepEqual([...q.discountsByRule.keys()], ["first"]);
});

test("negative percent is a surcharge and rounds half toward +infinity", () => {
  const rules = parseRules('[{"kind":"percent_off","name":"fee","percent":-2.5}]');
  const q = priceCart([{ sku: "a", unitCents: 100, qty: 1 }], rules);
  assert.equal(q.lines[0].discount, -2);
  assert.equal(q.total, 102);
  assert.equal(formatMoney(q.discount), "-$0.02");
});

test("fixed_off honours minQty (0 is not defaulted) and clamps to the line", () => {
  const rules = parseRules(JSON.stringify([
    { kind: "fixed_off", name: "big", cents: 5000, minQty: 0 },
    { kind: "fixed_off", name: "bulk", cents: 1, minQty: 3 },
  ]));
  const q = priceCart([{ sku: "a", unitCents: 300, qty: 2 }], rules);
  assert.equal(q.lines[0].discount, 600);
  assert.deepEqual([...q.discountsByRule], [["big", 600]]);
});

test("buy_x_get_y gives whole groups free", () => {
  const rules = parseRules('[{"kind":"buy_x_get_y","name":"b2g1","sku":"a","buy":2,"free":1}]');
  assert.equal(priceCart([{ sku: "a", unitCents: 400, qty: 7 }], rules).discount, 800);
  assert.equal(priceCart([{ sku: "b", unitCents: 400, qty: 7 }], rules).discount, 0);
});

test("lines sort by total descending and ties keep input order", () => {
  const q = priceCart(items, []);
  assert.deepEqual(q.lines.map((l) => l.sku), ["pen", "mug", "ink"]);
  const cheaper = priceCart([{ sku: "x", unitCents: 1, qty: 1 }, ...items], []);
  assert.deepEqual(cheaper.lines.map((l) => l.sku), ["pen", "mug", "ink", "x"]);
});

test("empty cart has no average key and the empty label", () => {
  const q = priceCart([], parseRules("[]"));
  assert.equal("average" in q, false);
  assert.equal(q.label, "empty cart");
  assert.equal(quoteToJson(q),
    '{"lines":[],"discountsByRule":{},"subtotal":0,"discount":0,"total":0,"label":"empty cart"}');
});

test("average label uses toFixed, which rounds exact ties up", () => {
  const rules = parseRules('[{"kind":"fixed_off","name":"x","cents":25}]');
  const cart: Item[] = [{ sku: "a", unitCents: 50, qty: 1 }, { sku: "b", unitCents: 50, qty: 1 }];
  const q = priceCart(cart, rules);
  assert.equal(q.average, 25);
  assert.equal(q.label, "2 lines, total $0.50, avg 0.3");
  assert.equal(priceCart([cart[0]], []).label, "1 line, total $0.50, avg 0.5");
});

test("errors carry their fields", () => {
  assert.throws(() => parseRules('[{"kind":"percent_off","name":"a","percent":5},{"kind":"nope","name":"b"}]'),
    (e: unknown) => e instanceof InvalidRuleError && e.index === 1 && e.code === "invalid_rule");
  assert.throws(() => parseRules('[{"kind":"percent_off","name":"a","percent":101}]'), InvalidRuleError);
  assert.throws(() => parseRules('[{"kind":"fixed_off","name":"a","cents":1},{"kind":"fixed_off","name":"a","cents":2}]'),
    (e: unknown) => e instanceof DuplicateRuleError && e.ruleName === "a" && e instanceof PricingError);
  assert.throws(() => priceCart([{ sku: "z", unitCents: 5, qty: 0 }], []),
    (e: unknown) => e instanceof InvalidItemError && e.sku === "z");
  assert.throws(() => parseRules("{oops"), SyntaxError);
});

test("groupBy and subtotalsByCategory keep first-seen order", () => {
  assert.deepEqual([...groupBy([1, 2, 3, 4, 5], (n) => n % 2)], [[1, [1, 3, 5]], [0, [2, 4]]]);
  assert.deepEqual([...subtotalsByCategory(items)], [["office", 2000], ["(none)", 1000]]);
});

test("formatMoney groups thousands and picks the symbol", () => {
  assert.equal(formatMoney(123456789), "$1,234,567.89");
  assert.equal(formatMoney(5, "EUR"), "€0.05");
});
