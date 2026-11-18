import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class Cart {
    public record Receipt(long subtotalCents, Map<String, Long> discounts,
                          Map<Category, Long> categorySubtotals, long taxCents, long totalCents) {}

    private final Catalog catalog;
    private final Map<String, Integer> quantities = new LinkedHashMap<>();
    private final List<Discount> discounts = new ArrayList<>();

    public Cart(Catalog catalog) {
        this.catalog = catalog;
    }

    public void add(String sku, int qty) throws CartException {
        if (qty <= 0) {
            throw new CartException.InvalidQuantity(qty);
        }
        Product p = catalog.find(sku).orElseThrow(() -> new CartException.UnknownSku(sku));
        int already = quantities.getOrDefault(sku, 0);
        if (already + qty > p.getStock()) {
            throw new CartException.InsufficientStock(sku, qty, p.getStock() - already);
        }
        quantities.put(sku, already + qty);
    }

    public void addDiscount(Discount d) {
        discounts.add(d);
    }

    public int quantityOf(String sku) {
        return quantities.getOrDefault(sku, 0);
    }

    static long lineTotal(Product p, int qty) {
        return p.getUnitCents() * qty;
    }

    public Receipt checkout() {
        long subtotal = 0;
        long tax = 0;
        Map<Category, Long> byCategory = new TreeMap<>();
        for (Map.Entry<String, Integer> e : quantities.entrySet()) {
            Product p = catalog.find(e.getKey()).get();
            long line = lineTotal(p, e.getValue());
            subtotal += line;
            tax += p.getCategory().taxOn(line);
            byCategory.merge(p.getCategory(), line, Long::sum);
        }
        List<Discount> ordered = new ArrayList<>(discounts);
        ordered.sort(Comparator.comparingInt(Discount::getPriority));
        long running = subtotal;
        Map<String, Long> applied = new LinkedHashMap<>();
        for (Discount d : ordered) {
            long off = Math.min(d.amountOff(running, byCategory), running);
            running -= off;
            applied.merge(d.getName(), off, Long::sum);
        }
        return new Receipt(subtotal, applied, byCategory, tax, running + tax);
    }
}
