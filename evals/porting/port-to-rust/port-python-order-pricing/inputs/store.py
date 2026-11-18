"""File-backed order storage. Reads and writes the data directory."""
import json
import os

DATA_DIR = os.environ.get("SHIPCALC_DATA", "data")


def order_path(order_id):
    return os.path.join(DATA_DIR, "order-%s.json" % order_id)


def load_order(order_id):
    path = order_path(order_id)
    if not os.path.exists(path):
        raise FileNotFoundError("no such order: %s" % order_id)
    with open(path) as f:
        order = json.load(f)
    for line in order.get("lines", []):
        if "sku" not in line or "unit_cents" not in line or "qty" not in line:
            raise ValueError("malformed line in order %s" % order_id)
    return order


def save_receipt(order_id, receipt):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, "receipt-%s.json" % order_id)
    with open(path, "w") as f:
        json.dump(receipt, f, indent=2)
    return path


def list_orders():
    names = sorted(os.listdir(DATA_DIR)) if os.path.isdir(DATA_DIR) else []
    return [n[6:-5] for n in names if n.startswith("order-") and n.endswith(".json")]
