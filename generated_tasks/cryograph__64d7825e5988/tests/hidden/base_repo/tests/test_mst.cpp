#include "test_framework.hpp"
#include "mst/mst.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

static Graph make_weighted_undirected() {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1, 2.0); g.add_edge(0, 3, 6.0);
    g.add_edge(1, 2, 3.0); g.add_edge(1, 3, 8.0);
    g.add_edge(1, 4, 5.0); g.add_edge(2, 4, 7.0);
    g.add_edge(3, 4, 9.0);
    return g;
}

CRYO_TEST(UnionFind, BasicOps) {
    UnionFind uf(5);
    assert_eq(uf.component_count(), (size_t)5);
    assert_true(uf.unite(0, 1));
    assert_eq(uf.component_count(), (size_t)4);
    assert_true(uf.connected(0, 1));
    assert_false(uf.connected(0, 2));
}

CRYO_TEST(UnionFind, TransitiveMerge) {
    UnionFind uf(4);
    uf.unite(0, 1);
    uf.unite(2, 3);
    uf.unite(1, 2);
    assert_true(uf.connected(0, 3));
    assert_eq(uf.component_count(), (size_t)1);
}

CRYO_TEST(UnionFind, AlreadyConnected) {
    UnionFind uf(3);
    uf.unite(0, 1);
    assert_false(uf.unite(0, 1));
}

CRYO_TEST(Kruskal, BasicMST) {
    auto g = make_weighted_undirected();
    auto mst = kruskal(g);
    assert_eq(mst.edges.size(), (size_t)4);
    assert_near(mst.total_weight, 16.0); // 2+3+5+6
}

CRYO_TEST(Kruskal, IsSpanning) {
    auto g = make_weighted_undirected();
    auto mst = kruskal(g);
    assert_true(is_spanning_tree(g, mst));
}

CRYO_TEST(Kruskal, SingleNode) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0);
    auto mst = kruskal(g);
    assert_eq(mst.edges.size(), (size_t)0);
}

CRYO_TEST(Kruskal, Disconnected) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1, 1.0); g.add_edge(2, 3, 2.0);
    auto mst = kruskal(g);
    assert_eq(mst.edges.size(), (size_t)2);
    assert_true(mst.is_forest);
}

CRYO_TEST(Kruskal, CompleteGraph) {
    GraphGenerator gen;
    auto g = gen.random_weighted(8, 1.0, 1.0, 10.0);
    auto mst = kruskal(g);
    assert_eq(mst.edges.size(), (size_t)7);
    assert_true(is_spanning_tree(g, mst));
}

CRYO_TEST(Kruskal, ToGraph) {
    auto g = make_weighted_undirected();
    auto mst = kruskal(g);
    auto mg = mst.to_graph(5);
    assert_eq(mg.node_count(), (size_t)5);
}

CRYO_TEST(Prim, BasicMST) {
    auto g = make_weighted_undirected();
    auto mst = prim(g, 0);
    assert_eq(mst.edges.size(), (size_t)4);
    assert_near(mst.total_weight, 16.0);
}

CRYO_TEST(Prim, IsSpanning) {
    auto g = make_weighted_undirected();
    auto mst = prim(g, 0);
    assert_true(is_spanning_tree(g, mst));
}

CRYO_TEST(Prim, MatchesKruskal) {
    GraphGenerator gen(42);
    auto g = gen.random_weighted(10, 0.6, 1.0, 100.0);
    auto km = kruskal(g);
    auto pm = prim(g, 0);
    assert_near(km.total_weight, pm.total_weight, 1e-6);
}

CRYO_TEST(Prim, SingleNode) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0);
    auto mst = prim(g, 0);
    assert_eq(mst.edges.size(), (size_t)0);
}

CRYO_TEST(Prim, InvalidStart) {
    Graph g(GraphType::Undirected);
    auto mst = prim(g, 99);
    assert_eq(mst.edges.size(), (size_t)0);
}

CRYO_TEST(Boruvka, BasicMST) {
    auto g = make_weighted_undirected();
    auto mst = boruvka(g);
    assert_eq(mst.edges.size(), (size_t)4);
    assert_near(mst.total_weight, 16.0);
}

CRYO_TEST(Boruvka, MatchesKruskal) {
    GraphGenerator gen(123);
    auto g = gen.random_weighted(10, 0.7, 1.0, 50.0);
    auto km = kruskal(g);
    auto bm = boruvka(g);
    assert_near(km.total_weight, bm.total_weight, 1e-6);
}

CRYO_TEST(Boruvka, Disconnected) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1, 1.0); g.add_edge(2, 3, 2.0);
    auto mst = boruvka(g);
    assert_eq(mst.edges.size(), (size_t)2);
    assert_true(mst.is_forest);
}

CRYO_TEST(MST, AllThreeAgree) {
    GraphGenerator gen(77);
    auto g = gen.random_weighted(12, 0.5, 1.0, 20.0);
    auto km = kruskal(g);
    auto pm = prim(g, 0);
    auto bm = boruvka(g);
    assert_near(km.total_weight, pm.total_weight, 1e-6);
    assert_near(km.total_weight, bm.total_weight, 1e-6);
}