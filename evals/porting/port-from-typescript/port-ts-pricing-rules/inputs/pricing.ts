// Cart pricing: applies discount rules to line items and produces a quote.

export type Currency = "USD" | "EUR";
export type Mode = "stack" | "best";

export type Rule =
  | { kind: "percent_off"; name: string; percent: number; category?: string | null }
  | { kind: "fixed_off"; name: string; cents: number; category?: string | null; minQty?: number }
  | { kind: "buy_x_get_y"; name: string; sku: string; buy: number; free: number };

export interface Item {
  readonly sku: string;
  readonly unitCents: number;
  readonly qty: number;
  readonly category?: string;
}

export interface LineQuote {
  sku: string;
  qty: number;
  base: number;
  discount: number;
  total: number;
}

export interface Quote {
  lines: LineQuote[];
  discountsByRule: Map<string, number>;
  subtotal: number;
  discount: number;
  total: number;
  average?: number;
  label: string;
}

export class PricingError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PricingError";
    this.code = code;
  }
}

export class InvalidRuleError extends PricingError {
  readonly index: number;
  constructor(index: number, reason: string) {
    super("invalid_rule", `rule #${index}: ${reason}`);
    this.index = index;
  }
}

export class DuplicateRuleError extends PricingError {
  readonly ruleName: string;
  constructor(ruleName: string) {
    super("duplicate_rule", `duplicate rule name '${ruleName}'`);
    this.ruleName = ruleName;
  }
}

export class InvalidItemError extends PricingError {
  readonly sku: string;
  constructor(sku: string, reason: string) {
    super("invalid_item", `item ${sku}: ${reason}`);
    this.sku = sku;
  }
}

export function groupBy<T, K>(items: readonly T[], key: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    const bucket = out.get(k);
    if (bucket) bucket.push(it);
    else out.set(k, [it]);
  }
  return out;
}

export function subtotalsByCategory(items: readonly Item[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const [cat, group] of groupBy(items, (i) => i.category ?? "(none)")) {
    out.set(cat, group.reduce((s, i) => s + i.unitCents * i.qty, 0));
  }
  return out;
}

export function parseRules(text: string): Rule[] {
  const raw = JSON.parse(text) as Record<string, unknown>[];
  const seen = new Set<string>();
  return raw.map((r, i): Rule => {
    const name = r.name;
    if (typeof name !== "string" || name === "") throw new InvalidRuleError(i, "missing name");
    if (seen.has(name)) throw new DuplicateRuleError(name);
    seen.add(name);
    const cat = r.category;
    if (cat !== undefined && cat !== null && typeof cat !== "string") {
      throw new InvalidRuleError(i, "category must be a string or null");
    }
    switch (r.kind) {
      case "percent_off": {
        const p = r.percent;
        if (typeof p !== "number" || !Number.isFinite(p) || p > 100 || p < -100) {
          throw new InvalidRuleError(i, "percent out of range");
        }
        return { kind: "percent_off", name, percent: p, category: cat };
      }
      case "fixed_off": {
        if (!Number.isInteger(r.cents) || (r.cents as number) < 0) {
          throw new InvalidRuleError(i, "cents must be a non-negative integer");
        }
        const minQty = r.minQty as number | undefined;
        return { kind: "fixed_off", name, cents: r.cents as number, category: cat, minQty };
      }
      case "buy_x_get_y": {
        const { sku, buy, free } = r;
        if (typeof sku !== "string" || !Number.isInteger(buy) || !Number.isInteger(free) ||
            (buy as number) < 1 || (free as number) < 1) {
          throw new InvalidRuleError(i, "bad buy_x_get_y fields");
        }
        return { kind: "buy_x_get_y", name, sku, buy: buy as number, free: free as number };
      }
      default:
        throw new InvalidRuleError(i, `unknown kind '${String(r.kind)}'`);
    }
  });
}

function matches(rule: Rule, item: Item): boolean {
  if (rule.kind === "buy_x_get_y") return rule.sku === item.sku;
  if (rule.category === undefined) return true;
  if (rule.category === null) return item.category === undefined;
  return rule.category === item.category;
}

function amountFor(rule: Rule, item: Item, base: number, remaining: number): number {
  switch (rule.kind) {
    case "percent_off":
      return Math.min(Math.round((base * rule.percent) / 100), remaining);
    case "fixed_off":
      return item.qty >= (rule.minQty ?? 1) ? Math.min(rule.cents, remaining) : 0;
    case "buy_x_get_y":
      return Math.floor(item.qty / (rule.buy + rule.free)) * rule.free * item.unitCents;
  }
}

export function formatMoney(cents: number, currency: Currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : "€";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (abs % 100).toString().padStart(2, "0");
  return `${cents < 0 ? "-" : ""}${symbol}${whole}.${frac}`;
}

export function priceCart(
  items: readonly Item[],
  rules: readonly Rule[],
  mode: Mode = "stack",
  currency: Currency = "USD",
): Quote {
  const discountsByRule = new Map<string, number>();
  const lines: LineQuote[] = items.map((item) => {
    if (!Number.isInteger(item.qty) || item.qty < 1) throw new InvalidItemError(item.sku, "bad qty");
    if (!Number.isInteger(item.unitCents) || item.unitCents < 0) {
      throw new InvalidItemError(item.sku, "bad price");
    }
    const base = item.unitCents * item.qty;
    let remaining = base;
    const applicable = rules.filter((r) => matches(r, item));
    const applied: [string, number][] = [];
    if (mode === "stack") {
      for (const rule of applicable) {
        const amount = amountFor(rule, item, base, remaining);
        remaining -= amount;
        applied.push([rule.name, amount]);
      }
    } else {
      let best: [string, number] | undefined;
      for (const rule of applicable) {
        const amount = amountFor(rule, item, base, base);
        if (amount > 0 && (best === undefined || amount > best[1])) best = [rule.name, amount];
      }
      if (best) applied.push(best);
    }
    let discount = 0;
    for (const [name, amount] of applied) {
      if (amount === 0) continue;
      discount += amount;
      discountsByRule.set(name, (discountsByRule.get(name) ?? 0) + amount);
    }
    return { sku: item.sku, qty: item.qty, base, discount, total: base - discount };
  });

  lines.sort((a, b) => b.total - a.total);
  const subtotal = lines.reduce((s, l) => s + l.base, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  const total = subtotal - discount;
  const quote: Quote = { lines, discountsByRule, subtotal, discount, total, label: "empty cart" };
  if (lines.length > 0) {
    quote.average = total / lines.length;
    const n = lines.length;
    quote.label =
      `${n} ${n === 1 ? "line" : "lines"}, total ${formatMoney(total, currency)}, ` +
      `avg ${(quote.average / 100).toFixed(1)}`;
  }
  return quote;
}

export function quoteToJson(q: Quote): string {
  return JSON.stringify({ ...q, discountsByRule: Object.fromEntries(q.discountsByRule) });
}
