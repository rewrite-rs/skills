"""Receipt rendering and batch reports. Ties pricing and storage together."""
import pricing
import store


def money(cents):
    sign = "-" if cents < 0 else ""
    cents = abs(cents)
    return "%s$%d.%02d" % (sign, cents // 100, cents % 100)


def render(order_id, receipt):
    out = ["Order %s" % order_id]
    for line in receipt["lines"]:
        out.append("  %-10s net %9s  tax %8s  ship %8s" % (
            line["sku"], money(line["net"]), money(line["tax"]), money(line["shipping"])))
    out.append("  subtotal %s  tax %s  shipping %s" % (
        money(receipt["subtotal"]), money(receipt["tax"]), money(receipt["shipping"])))
    out.append("  TOTAL %s" % money(receipt["total"]))
    return "\n".join(out)


def price_stored(order_id):
    order = store.load_order(order_id)
    receipt = pricing.price_order(order["lines"], order.get("shipping_cents", 0))
    store.save_receipt(order_id, receipt)
    return receipt


def batch_summary():
    grand = 0
    rows = []
    for order_id in store.list_orders():
        receipt = price_stored(order_id)
        grand += receipt["total"]
        rows.append("%s %s" % (order_id, money(receipt["total"])))
    rows.append("grand total %s" % money(grand))
    return "\n".join(rows)
