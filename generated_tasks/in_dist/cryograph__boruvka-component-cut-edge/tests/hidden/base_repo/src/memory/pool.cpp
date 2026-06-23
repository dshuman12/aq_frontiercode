#include "memory/pool.hpp"
#include <algorithm>
#include <cstdlib>
#include <cstring>
#include <sstream>

namespace cryo {

// ── ArenaAllocator ──────────────────────────────────────────────────────────

ArenaAllocator::ArenaAllocator(size_t block_size)
    : block_size_(std::max(block_size, (size_t)64)) {}

ArenaAllocator::~ArenaAllocator() {
    for (auto& b : blocks_) std::free(b.data);
}

ArenaAllocator::ArenaAllocator(ArenaAllocator&& other) noexcept
    : block_size_(other.block_size_), blocks_(std::move(other.blocks_)),
      total_allocated_(other.total_allocated_), total_used_(other.total_used_) {
    other.total_allocated_ = 0;
    other.total_used_ = 0;
}

ArenaAllocator& ArenaAllocator::operator=(ArenaAllocator&& other) noexcept {
    if (this != &other) {
        for (auto& b : blocks_) std::free(b.data);
        block_size_ = other.block_size_;
        blocks_ = std::move(other.blocks_);
        total_allocated_ = other.total_allocated_;
        total_used_ = other.total_used_;
        other.total_allocated_ = 0;
        other.total_used_ = 0;
    }
    return *this;
}

void* ArenaAllocator::allocate(size_t size, size_t alignment) {
    if (size == 0) size = 1;

    if (!blocks_.empty()) {
        auto& cur = blocks_.back();
        size_t aligned_offset = (cur.offset + alignment - 1) & ~(alignment - 1);
        if (aligned_offset + size <= cur.size) {
            void* ptr = cur.data + aligned_offset;
            cur.offset = aligned_offset + size;
            total_used_ += size;
            return ptr;
        }
    }

    add_block(size + alignment);
    auto& cur = blocks_.back();
    size_t aligned_offset = (cur.offset + alignment - 1) & ~(alignment - 1);
    void* ptr = cur.data + aligned_offset;
    cur.offset = aligned_offset + size;
    total_used_ += size;
    return ptr;
}

void ArenaAllocator::reset() {
    for (auto& b : blocks_) b.offset = 0;
    total_used_ = 0;
}

double ArenaAllocator::utilization() const {
    if (total_allocated_ == 0) return 0.0;
    return static_cast<double>(total_used_) / static_cast<double>(total_allocated_);
}

void ArenaAllocator::add_block(size_t min_size) {
    size_t actual = std::max(block_size_, min_size);
    auto* data = static_cast<uint8_t*>(std::malloc(actual));
    if (!data) throw std::bad_alloc();
    blocks_.push_back({data, actual, 0});
    total_allocated_ += actual;
}

// ── PoolAllocator ───────────────────────────────────────────────────────────

PoolAllocator::PoolAllocator(size_t object_size, size_t objects_per_chunk)
    : object_size_(std::max(object_size, sizeof(FreeNode))),
      objects_per_chunk_(std::max(objects_per_chunk, (size_t)1)) {}

PoolAllocator::~PoolAllocator() {
    for (auto* chunk : chunks_) std::free(chunk);
}

void* PoolAllocator::allocate() {
    if (!free_list_) add_chunk();
    FreeNode* node = free_list_;
    free_list_ = node->next;
    free_count_--;
    return static_cast<void*>(node);
}

void PoolAllocator::deallocate(void* ptr) {
    if (!ptr) return;
    auto* node = static_cast<FreeNode*>(ptr);
    node->next = free_list_;
    free_list_ = node;
    free_count_++;
}

bool PoolAllocator::owns(void* ptr) const {
    auto* p = static_cast<uint8_t*>(ptr);
    for (auto* chunk : chunks_) {
        if (p >= chunk && p < chunk + object_size_ * objects_per_chunk_) return true;
    }
    return false;
}

void PoolAllocator::add_chunk() {
    size_t chunk_size = object_size_ * objects_per_chunk_;
    auto* chunk = static_cast<uint8_t*>(std::malloc(chunk_size));
    if (!chunk) throw std::bad_alloc();
    chunks_.push_back(chunk);

    for (size_t i = 0; i < objects_per_chunk_; i++) {
        auto* node = reinterpret_cast<FreeNode*>(chunk + i * object_size_);
        node->next = free_list_;
        free_list_ = node;
    }
    total_objects_ += objects_per_chunk_;
    free_count_ += objects_per_chunk_;
}

// ── MemoryStats ─────────────────────────────────────────────────────────────

std::string MemoryStats::to_string() const {
    std::ostringstream oss;
    oss << "Arena: " << arena_bytes_used << "/" << arena_bytes_allocated << " bytes"
        << " | Pool: " << pool_used_objects << "/" << pool_total_objects << " objects";
    return oss.str();
}

// ── MemoryTracker ───────────────────────────────────────────────────────────

void MemoryTracker::track_allocation(size_t size) {
    current_ += size;
    total_allocs_++;
    if (current_ > peak_) peak_ = current_;
}

void MemoryTracker::track_deallocation(size_t size) {
    current_ -= std::min(size, current_);
    total_deallocs_++;
}

void MemoryTracker::reset() {
    current_ = 0;
    peak_ = 0;
    total_allocs_ = 0;
    total_deallocs_ = 0;
}

std::string MemoryTracker::report() const {
    std::ostringstream oss;
    oss << "MemoryTracker: current=" << current_ << " peak=" << peak_
        << " allocs=" << total_allocs_ << " deallocs=" << total_deallocs_
        << (has_leaks() ? " LEAKS_DETECTED" : " clean");
    return oss.str();
}

} // namespace cryo