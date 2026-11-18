import java.util.Map;

public abstract class Discount {
    private final String name;
    private final int priority;

    protected Discount(String name, int priority) {
        this.name = name;
        this.priority = priority;
    }

    public String getName() { return name; }
    public int getPriority() { return priority; }

    /** Cents taken off, given the running total so far and the original per-category subtotals. */
    public abstract long amountOff(long running, Map<Category, Long> subtotals);

    public static Discount percent(String name, int priority, int pct) {
        checkPct(pct);
        return new Discount(name, priority) {
            @Override
            public long amountOff(long running, Map<Category, Long> subtotals) {
                return running * pct / 100;
            }
        };
    }

    public static Discount fixed(String name, int priority, long cents) {
        return new Discount(name, priority) {
            @Override
            public long amountOff(long running, Map<Category, Long> subtotals) {
                return Math.min(cents, running);
            }
        };
    }

    public static Discount onCategory(String name, int priority, Category category, int pct) {
        checkPct(pct);
        return new Discount(name, priority) {
            @Override
            public long amountOff(long running, Map<Category, Long> subtotals) {
                long base = subtotals.getOrDefault(category, 0L);
                return Math.min(base * pct / 100, running);
            }
        };
    }

    private static void checkPct(int pct) {
        if (pct < 1 || pct > 100) {
            throw new IllegalArgumentException("percent out of range: " + pct);
        }
    }
}
