import java.util.Optional;

public class Product implements Comparable<Product> {
    private final String sku;
    private String name;
    private int unitCents;
    private Category category;
    private String description; // null when the product has none
    private int stock;

    public Product(String sku, String name, int unitCents, Category category, int stock) {
        this.sku = sku;
        this.name = name;
        this.unitCents = unitCents;
        this.category = category;
        this.stock = stock;
    }

    public String getSku() { return sku; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getUnitCents() { return unitCents; }
    public void setUnitCents(int unitCents) { this.unitCents = unitCents; }
    public Category getCategory() { return category; }
    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }
    public Optional<String> getDescription() { return Optional.ofNullable(description); }
    public void setDescription(String description) { this.description = description; }

    /** A product is identified by its SKU alone; price and stock changes do not make a new product. */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Product)) return false;
        return sku.equals(((Product) o).sku);
    }

    @Override
    public int hashCode() {
        return sku.hashCode();
    }

    @Override
    public int compareTo(Product other) {
        return sku.compareTo(other.sku);
    }

    @Override
    public String toString() {
        return sku + " " + name;
    }
}
