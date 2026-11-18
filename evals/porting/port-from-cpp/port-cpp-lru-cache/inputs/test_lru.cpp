#include <cassert>
#include <iostream>

#include "lru.h"

using Cache = lru::LruCache<std::string, int>;
using Log = std::vector<std::string>;

class Recorder : public lru::EvictionListener<std::string, int> {
public:
    explicit Recorder(std::shared_ptr<Log> log) : log_(std::move(log)) {}
    void on_evict(const std::string& key, const int& value) override {
        log_->push_back(key + "=" + std::to_string(value));
    }

private:
    std::shared_ptr<Log> log_;
};

static Log keys_in_order(const Cache& c) {
    Log keys;
    for (const auto& e : c) keys.push_back(e.key);
    return keys;
}

static void test_eviction_order_and_stats() {
    Cache c(2);
    assert(c.put("a", 1) && c.put("b", 2));
    assert(c.get("a").value() == 1);  // a is now most recent
    c.put("c", 3);                    // evicts b
    assert(!c.contains("b") && !c.get("b").has_value());
    assert((keys_in_order(c) == Log{"c", "a"}));
    assert(c.stats().hits == 1 && c.stats().misses == 1 && c.stats().evictions == 1);
}

static void test_peek_does_not_promote_but_update_does() {
    Cache c(2);
    c.put("a", 1);
    c.put("b", 2);
    assert(c.contains("a") && *c.peek("a") == 1 && c.peek("zzz") == nullptr);
    c.put("c", 3);  // a was only peeked, so a is the victim
    assert(!c.contains("a") && c.contains("b"));
    assert(c.stats().hits == 0 && c.stats().misses == 0);
    c.put("b", 20);  // update at capacity: no eviction, b moves to front
    assert(c.stats().evictions == 1 && c.at("b") == 20);
    assert((keys_in_order(c) == Log{"b", "c"}));
}

static void test_zero_capacity() {
    Cache c(0);
    assert(!c.put("a", 1) && !c.put("b", 2));
    assert(c.size() == 0 && c.stats().rejected == 2 && c.stats().evictions == 0);
}

static void test_errors() {
    Cache c(1);
    try {
        c.at("nope");
        assert(false);
    } catch (const lru::KeyNotFound& e) {
        assert(std::string(e.what()) == "key not found");
    }
    try {
        c.resize(lru::kMaxCapacity + 1);
        assert(false);
    } catch (const lru::CacheError& e) {
        auto* cap = dynamic_cast<const lru::CapacityError*>(&e);
        assert(cap != nullptr && cap->requested() == lru::kMaxCapacity + 1);
        assert(std::string(e.what()) == "capacity 1048577 exceeds maximum 1048576");
    }
    assert(c.capacity() == 1);  // failed resize changed nothing
}

static void test_listener_resize_erase() {
    auto log = std::make_shared<Log>();
    Cache c(4);
    c.set_listener(std::make_unique<Recorder>(log));
    for (int i = 1; i <= 4; ++i) c.put("k" + std::to_string(i), i);
    c.get("k1");
    c.resize(2);  // evicts k2, then k3 (least recent first)
    assert((*log == Log{"k2=2", "k3=3"}));
    assert(c.erase("k4") && !c.erase("k4") && log->size() == 2);  // erase is not an eviction
    assert(c.take_listener() != nullptr && c.take_listener() == nullptr);
    c.put("k5", 5);
    c.put("k6", 6);  // evicts k1 with no listener attached
    assert(log->size() == 2 && c.stats().evictions == 3);
}

static void test_groups_and_batch() {
    Cache c(8);
    {
        Cache::Batch batch(c);
        batch.put("x", 1);
    }
    { Cache::Batch empty(c); }
    assert(c.stats().batches == 1);
    c.put("p", 1, "zeta");
    c.put("q", 2, "alpha");
    c.put("r", 3, "mid");
    for (const char* k : {"p", "q", "r", "r"}) c.get(k);
    auto top = c.top_groups(2);
    assert(top.size() == 2 && top[0].first == "mid" && top[0].second == 2);
    assert(top[1].first == "alpha");  // tie with zeta broken by name
    assert(c.group_hits().begin()->first == "alpha");
}

static void test_stats_arithmetic() {
    lru::Stats a, b;
    a.hits = UINT32_MAX - 1;
    b.hits = 5;
    b.misses = 3;
    lru::Stats sum = a + b;
    assert(sum.hits == UINT32_MAX && sum.misses == 3);
    assert(!(sum == a) && a == a);
    lru::Stats big;
    big.hits = big.misses = UINT32_MAX;
    assert(lru::Stats{}.hit_rate_permille() == 0 && big.hit_rate_permille() == 500);
    lru::Stats r;
    r.hits = 1;
    r.misses = 2;
    assert(r.hit_rate_permille() == 333);
    assert(r.to_string() == "hits=1 misses=2 evictions=0 rejected=0 batches=0");
}

int main() {
    test_eviction_order_and_stats();
    test_peek_does_not_promote_but_update_does();
    test_zero_capacity();
    test_errors();
    test_listener_resize_erase();
    test_groups_and_batch();
    test_stats_arithmetic();
    std::cout << "all tests passed\n";
    return 0;
}
