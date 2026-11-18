#include "lru.h"

namespace lru {

namespace {
std::uint32_t sat_add(std::uint32_t a, std::uint32_t b) {
    std::uint32_t sum = a + b;
    return sum < a ? UINT32_MAX : sum;
}
}  // namespace

CapacityError::CapacityError(std::size_t requested)
    : CacheError("capacity " + std::to_string(requested) + " exceeds maximum " +
                 std::to_string(kMaxCapacity)),
      requested_(requested) {}

Stats& Stats::operator+=(const Stats& other) {
    hits = sat_add(hits, other.hits);
    misses = sat_add(misses, other.misses);
    evictions = sat_add(evictions, other.evictions);
    rejected = sat_add(rejected, other.rejected);
    batches = sat_add(batches, other.batches);
    return *this;
}

bool Stats::operator==(const Stats& other) const {
    return hits == other.hits && misses == other.misses && evictions == other.evictions &&
           rejected == other.rejected && batches == other.batches;
}

std::uint32_t Stats::hit_rate_permille() const {
    std::uint64_t lookups = static_cast<std::uint64_t>(hits) + misses;
    if (lookups == 0) return 0;
    return static_cast<std::uint32_t>(static_cast<std::uint64_t>(hits) * 1000 / lookups);
}

std::string Stats::to_string() const {
    return "hits=" + std::to_string(hits) + " misses=" + std::to_string(misses) +
           " evictions=" + std::to_string(evictions) + " rejected=" + std::to_string(rejected) +
           " batches=" + std::to_string(batches);
}

}  // namespace lru
