import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class CartTest {
    static Catalog catalog() {
        return Catalog.of(
                new Product("G-1", "Apple", 199, Category.GROCERY, 5),
                new Product("B-2", "Pen", 60, Category.BOOKS, 10),
                new Product("E-3", "Cable", 999, Category.ELECTRONICS, 2),
                new Product("E-9", "Server", 300_000_000, Category.ELECTRONICS, 20));
    }

    static Cart cartWith(String... skuQty) throws CartException {
        Cart cart = new Cart(catalog());
        for (int i = 0; i < skuQty.length; i += 2) cart.add(skuQty[i], Integer.parseInt(skuQty[i + 1]));
        return cart;
    }

    static void eq(Object expected, Object actual, String msg) {
        if (!expected.equals(actual)) throw new AssertionError(msg + ": expected " + expected + " but was " + actual);
    }

    static List<String> keys(java.util.Map<String, Long> m) { return new ArrayList<>(m.keySet()); }

    static void testCheckoutTotals() throws Exception {
        Cart.Receipt r = cartWith("G-1", "2", "B-2", "1", "E-3", "1").checkout();
        eq(398L + 60 + 999, r.subtotalCents(), "subtotal");
        eq(78L, r.taxCents(), "tax");
        eq(1535L, r.totalCents(), "total");
    }

    static void testTaxRoundsHalfUp() throws Exception {
        eq(5L, Category.BOOKS.taxOn(100), "5% of 100");
        eq(5L, Category.ELECTRONICS.taxOn(60), "7.5% of 60 is 4.5, rounds up");
        eq(0L, Category.GROCERY.taxOn(12345), "grocery untaxed");
    }

    static void testDiscountsApplyInPriorityOrder() throws Exception {
        Cart a = cartWith("E-3", "1", "G-1", "1");
        a.addDiscount(Discount.percent("ten", 2, 10));
        a.addDiscount(Discount.fixed("five", 1, 500));
        Cart.Receipt r = a.checkout();
        eq(500L, r.discounts().get("five"), "fixed first");
        eq(69L, r.discounts().get("ten"), "percent of 698 truncates 69.8");
        eq(List.of("five", "ten"), keys(r.discounts()), "application order");
    }

    static void testEqualPriorityKeepsInsertionOrder() throws Exception {
        Cart c = cartWith("E-3", "1");
        c.addDiscount(Discount.fixed("first", 5, 300));
        c.addDiscount(Discount.percent("second", 5, 50));
        c.addDiscount(Discount.fixed("third", 5, 400));
        Cart.Receipt r = c.checkout();
        eq(List.of("first", "second", "third"), keys(r.discounts()), "stable");
        eq(349L, r.discounts().get("second"), "50% of 699");
        eq(350L, r.discounts().get("third"), "fixed capped at what is left");
        eq(75L, r.totalCents(), "only tax remains");
    }

    static void testCategoryDiscountUsesOriginalSubtotal() throws Exception {
        Cart c = cartWith("E-3", "1", "B-2", "5");
        c.addDiscount(Discount.fixed("coupon", 1, 800));
        c.addDiscount(Discount.onCategory("books", 2, Category.BOOKS, 50));
        eq(150L, c.checkout().discounts().get("books"), "50% of 300, not of what is left");
    }

    static void testOrderingIsObservable() throws Exception {
        Cart.Receipt r = cartWith("E-3", "1", "G-1", "1", "B-2", "1").checkout();
        eq(List.of(Category.GROCERY, Category.BOOKS, Category.ELECTRONICS),
                new ArrayList<>(r.categorySubtotals().keySet()), "enum order");
        eq(List.of("G-1", "B-2", "E-3", "E-9"), catalog().skus(), "catalog insertion order");
        eq("E-3 Cable,G-1 Apple", String.join(",", catalog().lowStock(5).stream().map(Product::toString).toList()), "low stock sorted by sku");
    }

    static void testLineTotalWrapsLikeInt() throws Exception {
        eq(-1_294_967_296L, cartWith("E-9", "10").checkout().subtotalCents(), "300_000_000 * 10 wraps at 32 bits");
    }

    static void testErrorsCarryData() throws Exception {
        Cart c = cartWith("E-3", "1");
        try { c.add("E-3", 2); throw new AssertionError("expected stock error"); }
        catch (CartException.InsufficientStock e) {
            eq("OUT_OF_STOCK 2 1", e.getCode() + " " + e.getRequested() + " " + e.getAvailable(), "available counts what the cart holds");
        }
        try { c.add("X-0", 1); throw new AssertionError("expected unknown"); }
        catch (CartException.UnknownSku e) { eq("X-0", e.getSku(), "sku"); }
        try { c.add("G-1", 0); throw new AssertionError("expected bad quantity"); }
        catch (CartException e) { eq("BAD_QUANTITY", e.getCode(), "code"); }
        eq(1, c.quantityOf("E-3"), "failed add changes nothing");
    }

    static void testProductIdentityAndNulls() {
        Product a = new Product("S-1", "Old", 100, Category.BOOKS, 1);
        Product b = new Product("S-1", "New", 900, Category.GROCERY, 7);
        Set<Product> set = new HashSet<>(List.of(a));
        set.add(b);
        eq(1, set.size(), "equal by sku");
        eq(0, a.compareTo(b), "compare by sku");
        eq(true, a.getDescription().isEmpty() && catalog().find("nope").isEmpty(), "absent values");
        a.setDescription("x");
        eq("x", a.getDescription().get(), "present description");
    }

    public static void main(String[] args) {
        String[] names = {"CheckoutTotals", "TaxRoundsHalfUp", "DiscountsApplyInPriorityOrder",
                "EqualPriorityKeepsInsertionOrder", "CategoryDiscountUsesOriginalSubtotal",
                "OrderingIsObservable", "LineTotalWrapsLikeInt", "ErrorsCarryData", "ProductIdentityAndNulls"};
        int failed = 0;
        for (String n : names) {
            try {
                CartTest.class.getDeclaredMethod("test" + n).invoke(null);
                System.out.println("PASS " + n);
            } catch (Throwable t) {
                failed++;
                System.out.println("FAIL " + n + ": " + (t.getCause() != null ? t.getCause() : t));
            }
        }
        if (failed > 0) { System.out.println(failed + " failed"); System.exit(1); }
        System.out.println("all passed");
    }
}
