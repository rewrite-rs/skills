#pragma once
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <list>
#include <map>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace lru {

constexpr std::size_t kMaxCapacity = 1u << 20;

class CacheError : public std::runtime_error {
public:
    explicit CacheError(const std::string& what) : std::runtime_error(what) {}
};

class CapacityError : public CacheError {
public:
    explicit CapacityError(std::size_t requested);
    std::size_t requested() const { return requested_; }

private:
    std::size_t requested_;
};

class KeyNotFound : public CacheError {
public:
    KeyNotFound() : CacheError("key not found") {}
};

// Counters saturate instead of wrapping.
struct Stats {
    std::uint32_t hits = 0;
    std::uint32_t misses = 0;
    std::uint32_t evictions = 0;
    std::uint32_t rejected = 0;
    std::uint32_t batches = 0;

    Stats& operator+=(const Stats& other);
    friend Stats operator+(Stats a, const Stats& b) {
        a += b;
        return a;
    }
    bool operator==(const Stats& other) const;
    // hits per 1000 lookups, rounded down; 0 when there were no lookups.
    std::uint32_t hit_rate_permille() const;
    std::string to_string() const;
};

template <typename K, typename V>
class EvictionListener {
public:
    virtual ~EvictionListener() = default;
    virtual void on_evict(const K& key, const V& value) = 0;
};

template <typename K, typename V>
class LruCache {
public:
    struct Entry {
        K key;
        V value;
        std::string group;
    };
    using const_iterator = typename std::list<Entry>::const_iterator;

    explicit LruCache(std::size_t capacity) : capacity_(capacity) { check_capacity(capacity); }

    std::size_t size() const { return entries_.size(); }
    std::size_t capacity() const { return capacity_; }
    const Stats& stats() const { return stats_; }
    const std::map<std::string, std::size_t>& group_hits() const { return group_hits_; }

    // Inserts or updates; either way the entry becomes most recent.
    // Returns false (and counts a rejection) when capacity is 0.
    bool put(const K& key, V value, const std::string& group = "default") {
        auto found = index_.find(key);
        if (found != index_.end()) {
            found->second->value = std::move(value);
            found->second->group = group;
            entries_.splice(entries_.begin(), entries_, found->second);
            return true;
        }
        if (capacity_ == 0) {
            sat_inc(stats_.rejected);
            return false;
        }
        if (entries_.size() == capacity_) evict_one();
        entries_.push_front(Entry{key, std::move(value), group});
        index_[key] = entries_.begin();
        return true;
    }

    // A hit refreshes recency and counts against the entry's group.
    std::optional<V> get(const K& key) {
        auto found = index_.find(key);
        if (found == index_.end()) {
            sat_inc(stats_.misses);
            return std::nullopt;
        }
        sat_inc(stats_.hits);
        ++group_hits_[found->second->group];
        entries_.splice(entries_.begin(), entries_, found->second);
        return found->second->value;
    }

    // Look without touching recency or stats.
    const V* peek(const K& key) const {
        auto found = index_.find(key);
        return found == index_.end() ? nullptr : &found->second->value;
    }
    bool contains(const K& key) const { return index_.count(key) != 0; }

    const V& at(const K& key) const {
        const V* value = peek(key);
        if (value == nullptr) throw KeyNotFound();
        return *value;
    }

    // Explicit removal is not an eviction: no listener call, no stat.
    bool erase(const K& key) {
        auto found = index_.find(key);
        if (found == index_.end()) return false;
        entries_.erase(found->second);
        index_.erase(found);
        return true;
    }

    // Shrinking evicts least-recent first.
    void resize(std::size_t capacity) {
        check_capacity(capacity);
        capacity_ = capacity;
        while (entries_.size() > capacity_) evict_one();
    }

    void set_listener(std::unique_ptr<EvictionListener<K, V>> listener) {
        listener_ = std::move(listener);
    }
    std::unique_ptr<EvictionListener<K, V>> take_listener() { return std::move(listener_); }

    // Groups by hit count, highest first; equal counts stay in name order.
    std::vector<std::pair<std::string, std::size_t>> top_groups(std::size_t n) const {
        std::vector<std::pair<std::string, std::size_t>> all(group_hits_.begin(), group_hits_.end());
        std::stable_sort(all.begin(), all.end(),
                         [](const auto& a, const auto& b) { return a.second > b.second; });
        if (all.size() > n) all.resize(n);
        return all;
    }

    // Most recent first.
    const_iterator begin() const { return entries_.begin(); }
    const_iterator end() const { return entries_.end(); }

    // Scoped bulk loader: counts one batch on destruction if it stored anything.
    class Batch {
    public:
        explicit Batch(LruCache& cache) : cache_(cache) {}
        Batch(const Batch&) = delete;
        Batch& operator=(const Batch&) = delete;
        ~Batch() {
            if (puts_ > 0) sat_inc(cache_.stats_.batches);
        }
        bool put(const K& key, V value) {
            bool stored = cache_.put(key, std::move(value));
            if (stored) ++puts_;
            return stored;
        }

    private:
        LruCache& cache_;
        std::size_t puts_ = 0;
    };

private:
    static void sat_inc(std::uint32_t& counter) {
        if (counter != UINT32_MAX) ++counter;
    }
    static void check_capacity(std::size_t capacity) {
        if (capacity > kMaxCapacity) throw CapacityError(capacity);
    }
    void evict_one() {
        Entry& victim = entries_.back();
        if (listener_) listener_->on_evict(victim.key, victim.value);
        index_.erase(victim.key);
        entries_.pop_back();
        sat_inc(stats_.evictions);
    }

    std::size_t capacity_;
    std::list<Entry> entries_;
    std::unordered_map<K, typename std::list<Entry>::iterator> index_;
    std::map<std::string, std::size_t> group_hits_;
    std::unique_ptr<EvictionListener<K, V>> listener_;
    Stats stats_;
};

}  // namespace lru
