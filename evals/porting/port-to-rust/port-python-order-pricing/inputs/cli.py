"""Command line entry point: price one stored order, a batch, or a JSON order on stdin."""
import json
import sys

import pricing
import report


def main(argv):
    if len(argv) < 2:
        print("usage: cli.py price <id> | batch | quote", file=sys.stderr)
        return 2
    cmd = argv[1]
    try:
        if cmd == "price":
            receipt = report.price_stored(argv[2])
            print(report.render(argv[2], receipt))
        elif cmd == "batch":
            print(report.batch_summary())
        elif cmd == "quote":
            order = json.load(sys.stdin)
            receipt = pricing.price_order(order["lines"], order.get("shipping_cents", 0))
            print(json.dumps(receipt, sort_keys=True))
        else:
            print("unknown command: %s" % cmd, file=sys.stderr)
            return 2
    except pricing.PricingError as e:
        print("error: %s" % e, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
