"""Pure pricing rules for orders. No I/O, no imports from the rest of the app."""

TAX_BP = {"standard": 2000, "reduced": 500, "food": 0}

# (threshold, percent): quantity strictly above the threshold earns the discount.
BULK_TIERS = [(50, 10), (10, 5)]


class PricingError(Exception):
    pass


def bulk_percent(qty):
    for threshold, pct in BULK_TIERS:
        if qty > threshold:
            return pct
    return 0


def line_net(unit_cents, qty):
    if qty == 0:
        raise PricingError("quantity must not be zero")
    gross = unit_cents * qty
    discount = gross * bulk_percent(abs(qty)) // 100
    return gross - discount


def tax_cents(net_cents, category):
    try:
        bp = TAX_BP[category]
    except KeyError:
        raise PricingError("unknown tax category: %s" % category)
    return (net_cents * bp + 5000) // 10000


def split_shipping(total_cents, n):
    if n <= 0:
        raise PricingError("cannot split shipping over %d lines" % n)
    base, rem = divmod(total_cents, n)
    shares = [base] * n
    for i in range(n - rem, n):
        shares[i] += 1
    return shares


def legacy_flat_rate(weight_g):
    if weight_g <= 500:
        return 399
    if weight_g <= 2000:
        return 799
    return 799 + ((weight_g - 2000) // 1000) * 150


def price_order(lines, shipping_cents=0):
    if not lines:
        raise PricingError("order has no lines")
    shares = split_shipping(shipping_cents, len(lines))
    priced = []
    subtotal = tax_total = 0
    for line, ship in zip(lines, shares):
        net = line_net(line["unit_cents"], line["qty"])
        tax = tax_cents(net, line.get("category", "standard"))
        priced.append({"sku": line["sku"], "net": net, "tax": tax,
                       "shipping": ship, "total": net + tax + ship})
        subtotal += net
        tax_total += tax
    return {"lines": priced, "subtotal": subtotal, "tax": tax_total,
            "shipping": shipping_cents,
            "total": subtotal + tax_total + shipping_cents}
