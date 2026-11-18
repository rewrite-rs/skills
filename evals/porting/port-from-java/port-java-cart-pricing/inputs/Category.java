import java.math.BigDecimal;
import java.math.RoundingMode;

public enum Category {
    GROCERY("Grocery", "0"),
    BOOKS("Books", "0.05"),
    ELECTRONICS("Electronics", "0.075");

    private final String label;
    private final BigDecimal taxRate;

    Category(String label, String taxRate) {
        this.label = label;
        this.taxRate = new BigDecimal(taxRate);
    }

    public String label() {
        return label;
    }

    /** Sales tax on an amount in cents, rounded half-up to a whole cent. */
    public long taxOn(long cents) {
        return BigDecimal.valueOf(cents).multiply(taxRate).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }
}
