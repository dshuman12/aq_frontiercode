#include "test_framework.hpp"
#include "decomposition/decomposition.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(KCore, TrianglePlusLeaf) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(0, 2); g.add_edge(2, 3);
    auto kc = k_core_decomposition(g);
    assert_eq(kc.coreness[0], (size_t)2);
    assert_eq(kc.coreness[1], (size_t)2);
    assert_eq(kc.coreness[2], (size_t)2);
    assert_eq(kc.coreness[3], (size_t)1);
    assert_eq(kc.max_k, (size_t)2);
}

CRYO_TEST(KCore, Path) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    for (int i = 0; i < 4; i++) g.add_edge(i, i + 1);
    auto kc = k_core_decomposition(g);
    for (int i = 0; i < 5; i++) assert_eq(kc.coreness[i], (size_t)1);
}

CRYO_TEST(KCore, Complete) {
    GraphGenerator gen(42);
    auto g = gen.complete(5);
    assert_eq(degeneracy(g), (size_t)4);
}

CRYO_TEST(KCore, Subgraph) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(0, 2); g.add_edge(2, 3);
    auto kc = k_core_decomposition(g);
    auto sg = kc.k_core_subgraph(g, 2);
    assert_eq(sg.node_count(), (size_t)3);
    assert_false(sg.has_node(3));
}

CRYO_TEST(KCore, Shell) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(0, 2); g.add_edge(2, 3);
    auto shell1 = k_shell(g, 1);
    assert_eq(shell1.size(), (size_t)1);
    assert_eq(shell1[0], (NodeId)3);
}

CRYO_TEST(DegSeq, Basic) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto ds = degree_sequence(g);
    assert_eq(ds.max_degree, (size_t)2);
    assert_eq(ds.min_degree, (size_t)1);
    assert_eq(ds.degree_sum, (size_t)6);
    assert_true(ds.is_graphical);
}

CRYO_TEST(DegSeq, Graphical) {
    assert_true(is_graphical_sequence({3, 3, 3, 3}));
    assert_true(is_graphical_sequence({2, 2, 2}));
    assert_false(is_graphical_sequence({3, 1, 1}));
}

CRYO_TEST(DegSeq, Degeneracy) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(0, 2);
    assert_eq(degeneracy(g), (size_t)2);
}

CRYO_TEST(VertexCover, ApproxValid) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto vc = vertex_cover_approx(g);
    assert_true(is_vertex_cover(g, vc));
    assert_le(vc.size(), (size_t)4);
}

CRYO_TEST(IndependentSet, GreedyValid) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(2, 3);
    auto is = independent_set_greedy(g);
    assert_true(is_independent_set(g, is));
    assert_ge(is.size(), (size_t)2);
}

CRYO_TEST(DominatingSet, GreedyValid) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(0, 2); g.add_edge(0, 3); g.add_edge(0, 4);
    auto ds = dominating_set_greedy(g);
    assert_true(is_dominating_set(g, ds));
    assert_le(ds.size(), (size_t)2);
}

CRYO_TEST(VertexCover, Complete) {
    GraphGenerator gen(42);
    auto g = gen.complete(5);
    auto vc = vertex_cover_approx(g);
    assert_true(is_vertex_cover(g, vc));
}