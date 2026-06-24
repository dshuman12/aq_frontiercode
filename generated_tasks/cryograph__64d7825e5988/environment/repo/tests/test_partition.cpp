#include "test_framework.hpp"
#include "partition/partitioner.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(Partition, BisectBasic) {
    GraphGenerator gen;
    auto g = gen.path(10);
    auto res = bisect_bfs(g);
    assert_eq(res.k(), (size_t)2);
    assert_eq(res.parts[0].size() + res.parts[1].size(), (size_t)10);
}

CRYO_TEST(Partition, BisectBalance) {
    GraphGenerator gen;
    auto g = gen.complete(8);
    auto res = bisect_bfs(g);
    assert_gt(res.balance_ratio(), 0.5);
}

CRYO_TEST(Partition, BisectEdgeCut) {
    GraphGenerator gen;
    auto g = gen.path(6);
    auto res = bisect_bfs(g);
    size_t cut = res.edge_cut(g);
    assert_gt(cut, (size_t)0);
}

CRYO_TEST(Partition, LabelPropBasic) {
    GraphGenerator gen(42);
    auto g = gen.erdos_renyi_gnp(20, 0.3);
    auto res = label_propagation(g, 3);
    assert_eq(res.k(), (size_t)3);
    size_t total = 0;
    for (auto& p : res.parts) total += p.size();
    assert_eq(total, (size_t)20);
}

CRYO_TEST(Partition, LabelPropConverges) {
    GraphGenerator gen(42);
    auto g = gen.erdos_renyi_gnp(15, 0.4);
    auto res = label_propagation(g, 2, 100);
    assert_eq(res.k(), (size_t)2);
}

CRYO_TEST(Partition, BalancedBasic) {
    GraphGenerator gen;
    auto g = gen.grid(4, 4);
    auto res = balanced_partition(g, 4);
    assert_eq(res.k(), (size_t)4);
    for (auto& p : res.parts) assert_eq(p.size(), (size_t)4);
}

CRYO_TEST(Partition, BalancedOddNodes) {
    GraphGenerator gen;
    auto g = gen.path(7);
    auto res = balanced_partition(g, 3);
    assert_eq(res.k(), (size_t)3);
    size_t total = 0;
    for (auto& p : res.parts) total += p.size();
    assert_eq(total, (size_t)7);
}

CRYO_TEST(Partition, EmptyGraph) {
    Graph g(GraphType::Undirected);
    auto res = bisect_bfs(g);
    assert_eq(res.k(), (size_t)2);
    assert_eq(res.parts[0].size(), (size_t)0);
}