#include "test_framework.hpp"
#include "memory/pool.hpp"
#include <cstring>
#include <vector>
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(Arena, BasicAllocate) {
    ArenaAllocator arena(1024);
    void* p = arena.allocate(64);
    assert_true(p != nullptr);
    assert_gt(arena.bytes_used(), (size_t)0);
}

CRYO_TEST(Arena, MultipleAllocations) {
    ArenaAllocator arena(256);
    std::vector<void*> ptrs;
    for (int i = 0; i < 10; i++) {
        ptrs.push_back(arena.allocate(32));
    }
    for (auto* p : ptrs) assert_true(p != nullptr);
    for (size_t i = 1; i < ptrs.size(); i++) {
        assert_ne(ptrs[i], ptrs[i-1], "allocations should be distinct");
    }
}

CRYO_TEST(Arena, LargeAllocation) {
    ArenaAllocator arena(64);
    void* p = arena.allocate(512);
    assert_true(p != nullptr);
    assert_gt(arena.block_count(), (size_t)0);
}

CRYO_TEST(Arena, Reset) {
    ArenaAllocator arena(1024);
    arena.allocate(100);
    arena.allocate(200);
    assert_gt(arena.bytes_used(), (size_t)0);
    arena.reset();
    assert_eq(arena.bytes_used(), (size_t)0);
}

CRYO_TEST(Arena, Alignment) {
    ArenaAllocator arena(1024);
    arena.allocate(1);
    void* p = arena.allocate(8, 16);
    assert_eq(reinterpret_cast<uintptr_t>(p) % 16, (uintptr_t)0);
}

CRYO_TEST(Arena, CreateObject) {
    ArenaAllocator arena(1024);
    int* val = arena.create<int>(42);
    assert_eq(*val, 42);
    double* dbl = arena.create<double>(3.14);
    assert_near(*dbl, 3.14);
}

CRYO_TEST(Arena, Utilization) {
    ArenaAllocator arena(1024);
    assert_near(arena.utilization(), 0.0);
    arena.allocate(512);
    assert_gt(arena.utilization(), 0.0);
    assert_le(arena.utilization(), 1.0);
}

CRYO_TEST(Arena, MoveConstructor) {
    ArenaAllocator arena(1024);
    arena.allocate(100);
    size_t used = arena.bytes_used();
    ArenaAllocator arena2(std::move(arena));
    assert_eq(arena2.bytes_used(), used);
}

CRYO_TEST(Arena, ZeroSizeAllocation) {
    ArenaAllocator arena(1024);
    void* p = arena.allocate(0);
    assert_true(p != nullptr);
}

CRYO_TEST(Arena, MultipleBlocks) {
    ArenaAllocator arena(64);
    for (int i = 0; i < 20; i++) arena.allocate(32);
    assert_gt(arena.block_count(), (size_t)1);
}

CRYO_TEST(Arena, WriteRead) {
    ArenaAllocator arena(1024);
    char* buf = static_cast<char*>(arena.allocate(16));
    std::memcpy(buf, "hello", 6);
    assert_eq(std::string(buf), std::string("hello"));
}

CRYO_TEST(Pool, BasicAllocDealc) {
    PoolAllocator pool(sizeof(int), 16);
    void* p = pool.allocate();
    assert_true(p != nullptr);
    assert_eq(pool.used_count(), (size_t)1);
    pool.deallocate(p);
    assert_eq(pool.used_count(), (size_t)0);
}

CRYO_TEST(Pool, MultipleAllocs) {
    PoolAllocator pool(64, 8);
    std::vector<void*> ptrs;
    for (int i = 0; i < 10; i++) {
        ptrs.push_back(pool.allocate());
    }
    assert_eq(pool.used_count(), (size_t)10);
    for (auto* p : ptrs) pool.deallocate(p);
    assert_eq(pool.used_count(), (size_t)0);
}

CRYO_TEST(Pool, Reuse) {
    PoolAllocator pool(64, 4);
    void* p1 = pool.allocate();
    pool.deallocate(p1);
    void* p2 = pool.allocate();
    assert_eq(p1, p2);
}

CRYO_TEST(Pool, ChunkExpansion) {
    PoolAllocator pool(32, 2);
    for (int i = 0; i < 10; i++) pool.allocate();
    assert_gt(pool.chunk_count(), (size_t)1);
}

CRYO_TEST(Pool, Owns) {
    PoolAllocator pool(64, 8);
    void* p = pool.allocate();
    assert_true(pool.owns(p));
    int x = 0;
    assert_false(pool.owns(&x));
    pool.deallocate(p);
}

CRYO_TEST(Pool, DeallocateNull) {
    PoolAllocator pool(32, 4);
    pool.deallocate(nullptr);
    assert_eq(pool.used_count(), (size_t)0);
}

CRYO_TEST(Pool, ObjectSize) {
    PoolAllocator pool(128, 16);
    assert_eq(pool.object_size(), (size_t)128);
}

CRYO_TEST(Pool, StressTest) {
    PoolAllocator pool(16, 32);
    std::vector<void*> ptrs;
    for (int i = 0; i < 200; i++) ptrs.push_back(pool.allocate());
    assert_eq(pool.used_count(), (size_t)200);
    for (auto* p : ptrs) pool.deallocate(p);
    assert_eq(pool.used_count(), (size_t)0);
    assert_eq(pool.free_count(), pool.total_objects());
}

CRYO_TEST(Tracker, BasicTracking) {
    MemoryTracker tracker;
    tracker.track_allocation(100);
    assert_eq(tracker.current_usage(), (size_t)100);
    tracker.track_allocation(200);
    assert_eq(tracker.current_usage(), (size_t)300);
    assert_eq(tracker.peak_usage(), (size_t)300);
}

CRYO_TEST(Tracker, Deallocation) {
    MemoryTracker tracker;
    tracker.track_allocation(100);
    tracker.track_deallocation(50);
    assert_eq(tracker.current_usage(), (size_t)50);
    assert_eq(tracker.peak_usage(), (size_t)100);
}

CRYO_TEST(Tracker, LeakDetection) {
    MemoryTracker tracker;
    assert_false(tracker.has_leaks());
    tracker.track_allocation(100);
    assert_true(tracker.has_leaks());
    tracker.track_deallocation(100);
    assert_false(tracker.has_leaks());
}

CRYO_TEST(Tracker, Counters) {
    MemoryTracker tracker;
    tracker.track_allocation(10);
    tracker.track_allocation(20);
    tracker.track_deallocation(5);
    assert_eq(tracker.total_allocations(), (size_t)2);
    assert_eq(tracker.total_deallocations(), (size_t)1);
}

CRYO_TEST(Tracker, Report) {
    MemoryTracker tracker;
    tracker.track_allocation(100);
    std::string report = tracker.report();
    assert_true(report.find("LEAKS_DETECTED") != std::string::npos);
    tracker.track_deallocation(100);
    report = tracker.report();
    assert_true(report.find("clean") != std::string::npos);
}

CRYO_TEST(MemStats, ToString) {
    MemoryStats stats;
    stats.arena_bytes_allocated = 1024;
    stats.arena_bytes_used = 512;
    stats.pool_total_objects = 100;
    stats.pool_used_objects = 50;
    std::string s = stats.to_string();
    assert_true(s.find("512") != std::string::npos);
    assert_true(s.find("1024") != std::string::npos);
}