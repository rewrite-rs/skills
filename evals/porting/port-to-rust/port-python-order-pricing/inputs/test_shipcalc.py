import json
import os
import subprocess
import sys
import tempfile
import unittest

import pricing
import report
import store


class PricingTests(unittest.TestCase):
    def test_bulk_boundaries(self):
        self.assertEqual(pricing.bulk_percent(10), 0)
        self.assertEqual(pricing.bulk_percent(11), 5)
        self.assertEqual(pricing.bulk_percent(50), 5)
        self.assertEqual(pricing.bulk_percent(51), 10)

    def test_line_net_discount_floors(self):
        self.assertEqual(pricing.line_net(333, 11), 3663 - 183)
        self.assertEqual(pricing.line_net(100, 10), 1000)

    def test_tax_rounds_half_up(self):
        self.assertEqual(pricing.tax_cents(25, "standard"), 5)
        self.assertEqual(pricing.tax_cents(22, "reduced"), 1)
        self.assertEqual(pricing.tax_cents(1000, "food"), 0)

    def test_split_shipping_remainder_goes_last(self):
        self.assertEqual(pricing.split_shipping(10, 3), [3, 3, 4])
        self.assertEqual(pricing.split_shipping(9, 3), [3, 3, 3])

    def test_errors(self):
        with self.assertRaises(pricing.PricingError):
            pricing.tax_cents(100, "luxury")
        with self.assertRaises(pricing.PricingError):
            pricing.split_shipping(5, 0)
        with self.assertRaises(pricing.PricingError):
            pricing.price_order([])
        with self.assertRaises(pricing.PricingError):
            pricing.line_net(100, 0)

    def test_price_order(self):
        r = pricing.price_order([
            {"sku": "A", "unit_cents": 250, "qty": 2},
            {"sku": "B", "unit_cents": 100, "qty": 12, "category": "food"},
        ], 101)
        self.assertEqual(r["subtotal"], 500 + 1140)
        self.assertEqual(r["tax"], 100)
        self.assertEqual([l["shipping"] for l in r["lines"]], [50, 51])
        self.assertEqual(r["total"], 1640 + 100 + 101)


class ReportTests(unittest.TestCase):
    def test_money(self):
        self.assertEqual(money_of(5), "$0.05")
        self.assertEqual(money_of(-1234), "-$12.34")

    def test_stored_roundtrip(self):
        with tempfile.TemporaryDirectory() as d:
            store.DATA_DIR = d
            with open(os.path.join(d, "order-7.json"), "w") as f:
                json.dump({"lines": [{"sku": "A", "unit_cents": 100, "qty": 3}],
                           "shipping_cents": 5}, f)
            r = report.price_stored("7")
            self.assertEqual(r["total"], 300 + 60 + 5)
            self.assertTrue(os.path.exists(os.path.join(d, "receipt-7.json")))
            self.assertIn("7 $3.65", report.batch_summary())


def money_of(c):
    return report.money(c)


class CliTests(unittest.TestCase):
    def run_cli(self, *args, stdin=""):
        return subprocess.run([sys.executable, "cli.py", *args], input=stdin,
                              capture_output=True, text=True)

    def test_quote(self):
        p = self.run_cli("quote", stdin=json.dumps(
            {"lines": [{"sku": "A", "unit_cents": 100, "qty": 1}]}))
        self.assertEqual(p.returncode, 0)
        self.assertEqual(json.loads(p.stdout)["total"], 120)

    def test_quote_error_exit_code(self):
        p = self.run_cli("quote", stdin=json.dumps({"lines": []}))
        self.assertEqual(p.returncode, 1)
        self.assertIn("error:", p.stderr)


if __name__ == "__main__":
    unittest.main()
