#pragma once
#include <cstddef>
#include <cstdint>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace cryo {

class ArenaAllocator {
public:
    explicit ArenaAllocator(size_t block_size = 65536);
    ~ArenaAllocator();

    ArenaAllocator(const ArenaAllocator&) = delete;
    ArenaAllocator& operator=(const ArenaAllocator&) = delete;
    ArenaAllocator(ArenaAllocator&& other) noexcept;
    ArenaAllocator& operator=(ArenaAllocator&& other) noexcept;

    void* allocate(size_t size, size_t alignment = alignof(std::max_align_t));

    template<typename T, typename... Args>
    T* create(Args&&... args) {
        void* mem = allocate(sizeof(T), alignof(T));
        return new (mem) T(std::forward<Args>(args)...);
    }

    void reset();
    size_t bytes_allocated() const { return total_allocated_; }
    size_t bytes_used() const { return total_used_; }
    size_t block_count() const { return blocks_.size(); }
    double utilization() const;

private:
    struct Block {
        uint8_t* data;
        size_t   size;
        size_t   offset;
    };

    size_t block_size_;
    std::vector<Block> blocks_;
    size_t total_allocated_ = 0;
    size_t total_used_ = 0;

    void add_block(size_t min_size);
};

class PoolAllocator {
public:
    explicit PoolAllocator(size_t object_size, size_t objects_per_chunk = 256);
    ~PoolAllocator();

    PoolAllocator(const PoolAllocator&) = delete;
    PoolAllocator& operator=(const PoolAllocator&) = delete;

    void* allocate();
    void deallocate(void* ptr);

    size_t object_size() const { return object_size_; }
    size_t total_objects() const { return total_objects_; }
    size_t free_count() const { return free_count_; }
    size_t used_count() const { return total_objects_ - free_count_; }
    size_t chunk_count() const { return chunks_.size(); }

    bool owns(void* ptr) const;

private:
    struct FreeNode {
        FreeNode* next;
    };

    size_t object_size_;
    size_t objects_per_chunk_;
    std::vector<uint8_t*> chunks_;
    FreeNode* free_list_ = nullptr;
    size_t total_objects_ = 0;
    size_t free_count_ = 0;

    void add_chunk();
};

struct MemoryStats {
    size_t arena_bytes_allocated = 0;
    size_t arena_bytes_used = 0;
    size_t pool_total_objects = 0;
    size_t pool_used_objects = 0;

    std::string to_string() const;
};

class MemoryTracker {
public:
    void track_allocation(size_t size);
    void track_deallocation(size_t size);

    size_t current_usage() const { return current_; }
    size_t peak_usage() const { return peak_; }
    size_t total_allocations() const { return total_allocs_; }
    size_t total_deallocations() const { return total_deallocs_; }

    bool has_leaks() const { return current_ > 0; }
    size_t leaked_bytes() const { return current_; }
    std::string report() const;
    void reset();

private:
    size_t current_ = 0;
    size_t peak_ = 0;
    size_t total_allocs_ = 0;
    size_t total_deallocs_ = 0;
};

} // namespace cryo