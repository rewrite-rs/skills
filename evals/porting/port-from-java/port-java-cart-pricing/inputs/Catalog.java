import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

public class Catalog {
    private final Map<String, Product> bySku = new LinkedHashMap<>();

    public static Catalog of(Product... products) {
        Catalog c = new Catalog();
        for (Product p : products) {
            c.bySku.put(p.getSku(), p);
        }
        return c;
    }

    public Optional<Product> find(String sku) {
        return Optional.ofNullable(bySku.get(sku));
    }

    public List<String> skus() {
        return new ArrayList<>(bySku.keySet());
    }

    /** Products with at most `threshold` units left, in natural (SKU) order. */
    public List<Product> lowStock(int threshold) {
        return bySku.values().stream()
                .filter(p -> p.getStock() <= threshold)
                .sorted()
                .collect(Collectors.toList());
    }
}
