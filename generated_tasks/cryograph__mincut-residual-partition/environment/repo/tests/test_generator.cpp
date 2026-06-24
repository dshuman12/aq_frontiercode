#include "test_framework.hpp"
#include "generator/generator.hpp"
#include "algo/traversal.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(GenER, GNPBasic) {
    GraphGenerator gen(123);
    auto g = gen.erdos_renyi_gnp(20, 0.3);
    assert_eq(g.node_count(), (size_t)20);
    assert_gt(g.edge_count(), (size_t)0);
}

CRYO_TEST(GenER, GNPEmpty) {
    GraphGenerator gen(42);
    auto g = gen.erdos_renyi_gnp(10, 0.0);
    assert_eq(g.node_count(), (size_t)10);
    assert_eq(g.edge_count(), (size_t)0);
}

CRYO_TEST(GenER, GNPComplete) {
    GraphGenerator gen(42);
    auto g = gen.erdos_renyi_gnp(5, 1.0);
    assert_eq(g.node_count(), (size_t)5);
    size_t expected = 5 * 4; // undirected: 10 edges stored as 20 directed
    assert_eq(g.edge_count(), expected);
}

CRYO_TEST(GenER, GNMBasic) {
    GraphGenerator gen(42);
    auto g = gen.erdos_renyi_gnm(20, 30);
    assert_eq(g.node_count(), (size_t)20);
}

CRYO_TEST(GenER, GNMDirected) {
    GraphGenerator gen(42);
    auto g = gen.erdos_renyi_gnm(10, 15, GraphType::Directed);
    assert_true(g.is_directed());
}

CRYO_TEST(GenER, Deterministic) {
    GraphGenerator g1(999), g2(999);
    auto a = g1.erdos_renyi_gnp(15, 0.4);
    auto b = g2.erdos_renyi_gnp(15, 0.4);
    assert_eq(a.edge_count(), b.edge_count());
}

CRYO_TEST(GenBA, Basic) {
    GraphGenerator gen(42);
    auto g = gen.barabasi_albert(30, 3, 2);
    assert_eq(g.node_count(), (size_t)30);
    assert_gt(g.edge_count(), (size_t)0);
}

CRYO_TEST(GenBA, ScaleFree) {
    GraphGenerator gen(42);
    auto g = gen.barabasi_albert(50, 3, 2);
    size_t max_deg = 0;
    for (auto nid : g.node_ids()) {
        max_deg = std::max(max_deg, g.degree(nid));
    }
    assert_gt(max_deg, (size_t)2);
}

CRYO_TEST(GenWS, Basic) {
    GraphGenerator gen(42);
    auto g = gen.watts_strogatz(20, 4, 0.3);
    assert_eq(g.node_count(), (size_t)20);
    assert_gt(g.edge_count(), (size_t)0);
}

CRYO_TEST(GenWS, NoBetaIsRing) {
    GraphGenerator gen(42);
    auto g = gen.watts_strogatz(10, 4, 0.0);
    assert_eq(g.node_count(), (size_t)10);
    for (auto nid : g.node_ids()) {
        assert_eq(g.degree(nid), (size_t)4);
    }
}

CRYO_TEST(GenComplete, UndirectedK5) {
    GraphGenerator gen;
    auto g = gen.complete(5);
    assert_eq(g.node_count(), (size_t)5);
    assert_eq(g.edge_count(), (size_t)20); // 10 undirected = 20 stored
    for (auto nid : g.node_ids()) assert_eq(g.degree(nid), (size_t)4);
}

CRYO_TEST(GenComplete, DirectedK4) {
    GraphGenerator gen;
    auto g = gen.complete(4, GraphType::Directed);
    assert_eq(g.edge_count(), (size_t)12);
}

CRYO_TEST(GenCycle, Basic) {
    GraphGenerator gen;
    auto g = gen.cycle(6);
    assert_eq(g.node_count(), (size_t)6);
    for (auto nid : g.node_ids()) assert_eq(g.degree(nid), (size_t)2);
}

CRYO_TEST(GenCycle, TooSmallThrows) {
    GraphGenerator gen;
    assert_throws([&]() { gen.cycle(2); });
}

CRYO_TEST(GenStar, Basic) {
    GraphGenerator gen;
    auto g = gen.star(6);
    assert_eq(g.node_count(), (size_t)6);
    assert_eq(g.degree(0), (size_t)5);
    for (size_t i = 1; i < 6; i++) assert_eq(g.degree(i), (size_t)1);
}

CRYO_TEST(GenPath, Basic) {
    GraphGenerator gen;
    auto g = gen.path(5);
    assert_eq(g.node_count(), (size_t)5);
    assert_eq(g.edge_count(), (size_t)4);
}

CRYO_TEST(GenGrid, Basic3x3) {
    GraphGenerator gen;
    auto g = gen.grid(3, 3);
    assert_eq(g.node_count(), (size_t)9);
    assert_eq(g.degree(0), (size_t)2);
    assert_eq(g.degree(4), (size_t)4);
}

CRYO_TEST(GenGrid, Rectangular) {
    GraphGenerator gen;
    auto g = gen.grid(2, 4);
    assert_eq(g.node_count(), (size_t)8);
}

CRYO_TEST(GenBinTree, Depth2) {
    GraphGenerator gen;
    auto g = gen.binary_tree(2);
    assert_eq(g.node_count(), (size_t)7);
    assert_eq(g.out_degree(0), (size_t)2);
    assert_eq(g.out_degree(3), (size_t)0);
}

CRYO_TEST(GenRandTree, Basic) {
    GraphGenerator gen(42);
    auto g = gen.random_tree(20);
    assert_eq(g.node_count(), (size_t)20);
    assert_false(has_cycle(g));
}

CRYO_TEST(GenRandTree, Single) {
    GraphGenerator gen;
    auto g = gen.random_tree(1);
    assert_eq(g.node_count(), (size_t)1);
    assert_eq(g.edge_count(), (size_t)0);
}

CRYO_TEST(GenDAG, NoCycle) {
    GraphGenerator gen(42);
    auto g = gen.random_dag(20, 0.3);
    assert_false(has_cycle(g));
    assert_true(g.is_directed());
}

CRYO_TEST(GenDAG, TopoSortable) {
    GraphGenerator gen(42);
    auto g = gen.random_dag(15, 0.4);
    auto order = topological_sort(g);
    assert_eq(order.size(), (size_t)15);
}

CRYO_TEST(GenWeighted, Basic) {
    GraphGenerator gen(42);
    auto g = gen.random_weighted(10, 0.5, 1.0, 10.0);
    assert_eq(g.node_count(), (size_t)10);
    bool has_weighted = false;
    g.for_each_edge([&](const Edge& e) {
        if (e.weight >= 1.0 && e.weight <= 10.0) has_weighted = true;
    });
    assert_true(has_weighted);
}

CRYO_TEST(GenWeighted, Directed) {
    GraphGenerator gen(42);
    auto g = gen.random_weighted(8, 0.3, 0.1, 5.0, GraphType::Directed);
    assert_true(g.is_directed());
}

// ── Dense gnm optimization tests ──────────────────────────────────────────

CRYO_TEST(GenGNM, DenseUndirected) {
    GraphGenerator gen(42);
    size_t n = 10;
    size_t max_e = n * (n - 1) / 2;
    auto g = gen.erdos_renyi_gnm(n, max_e - 2, GraphType::Undirected);
    assert_eq(g.node_count(), n);
    assert_ge(g.unique_edge_count(), max_e - 3);
}

CRYO_TEST(GenGNM, DenseDirected) {
    GraphGenerator gen(42);
    size_t n = 8;
    size_t max_e = n * (n - 1);
    auto g = gen.erdos_renyi_gnm(n, max_e, GraphType::Directed);
    assert_eq(g.node_count(), n);
}

CRYO_TEST(GenWheel, Basic) {
    GraphGenerator gen(42);
    auto g = gen.wheel(6);
    assert_eq(g.node_count(), (size_t)6);
    assert_eq(g.out_degree(0), (size_t)5);
}

CRYO_TEST(GenLadder, Basic) {
    GraphGenerator gen(42);
    auto g = gen.ladder(4);
    assert_eq(g.node_count(), (size_t)8);
    assert_true(g.has_edge(0, 4));
}

CRYO_TEST(GenHypercube, Dim3) {
    GraphGenerator gen(42);
    auto g = gen.hypercube(3);
    assert_eq(g.node_count(), (size_t)8);
    for (int i = 0; i < 8; i++) assert_eq(g.out_degree(i), (size_t)3);
}

CRYO_TEST(GenFriendship, Basic) {
    GraphGenerator gen(42);
    auto g = gen.friendship(3);
    assert_eq(g.node_count(), (size_t)7);
    assert_eq(g.out_degree(0), (size_t)6);
}

CRYO_TEST(GenCircLadder, Basic) {
    GraphGenerator gen(42);
    auto g = gen.circular_ladder(4);
    assert_eq(g.node_count(), (size_t)8);
    for (int i = 0; i < 8; i++) assert_eq(g.out_degree(i), (size_t)3);
}