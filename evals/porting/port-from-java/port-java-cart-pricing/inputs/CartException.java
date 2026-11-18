public abstract class CartException extends Exception {
    private final String code;

    protected CartException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }

    public static class UnknownSku extends CartException {
        private final String sku;

        public UnknownSku(String sku) {
            super("UNKNOWN_SKU", "no such product: " + sku);
            this.sku = sku;
        }

        public String getSku() { return sku; }
    }

    public static class InsufficientStock extends CartException {
        private final String sku;
        private final int requested;
        private final int available;

        public InsufficientStock(String sku, int requested, int available) {
            super("OUT_OF_STOCK", "only " + available + " of " + sku + " left, wanted " + requested);
            this.sku = sku;
            this.requested = requested;
            this.available = available;
        }

        public String getSku() { return sku; }

        public int getRequested() { return requested; }

        public int getAvailable() { return available; }
    }

    public static class InvalidQuantity extends CartException {
        private final int quantity;

        public InvalidQuantity(int quantity) {
            super("BAD_QUANTITY", "quantity must be positive: " + quantity);
            this.quantity = quantity;
        }

        public int getQuantity() { return quantity; }
    }
}
