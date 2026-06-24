#include "test_framework.hpp"
#include "operators/operators.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(GraphOps, Union) {
    Graph a(GraphType::Undirected), b(GraphType::Undirected);
    a.add_node_with_id(0); a.add_node_with_id(1); a.add_edge(0, 1);
    b.add_node_with_id(1); b.add_node_with_id(2); b.add_edge(1, 2);
    auto u = graph_union(a, b);
    assert_eq(u.node_count(), (size_t)3);
    assert_true(u.has_edge(0, 1));
    assert_true(u.has_edge(1, 2));
}

CRYO_TEST(GraphOps, Intersection) {
    Graph a(GraphType::Undirected), b(GraphType::Undirected);
    a.add_node_with_id(0); a.add_node_with_id(1); a.add_node_with_id(2);
    b.add_node_with_id(1); b.add_node_with_id(2); b.add_node_with_id(3);
    a.add_edge(0, 1); a.add_edge(1, 2);
    b.add_edge(1, 2); b.add_edge(2, 3);
    auto inter = graph_intersection(a, b);
    assert_eq(inter.node_count(), (size_t)2);
    assert_true(inter.has_edge(1, 2));
}

CRYO_TEST(GraphOps, Difference) {
    Graph a(GraphType::Undirected), b(GraphType::Undirected);
    a.add_node_with_id(0); a.add_node_with_id(1); a.add_node_with_id(2);
    b.add_node_with_id(0); b.add_node_with_id(1); b.add_node_with_id(2);
    a.add_edge(0, 1); a.add_edge(1, 2);
    b.add_edge(1, 2);
    auto d = graph_difference(a, b);
    assert_true(d.has_edge(0, 1));
    assert_false(d.has_edge(1, 2));
}

CRYO_TEST(GraphOps, SymDiff) {
    Graph a(GraphType::Undirected), b(GraphType::Undirected);
    a.add_node_with_id(0); a.add_node_with_id(1); a.add_node_with_id(2);
    b.add_node_with_id(0); b.add_node_with_id(1); b.add_node_with_id(2);
    a.add_edge(0, 1); a.add_edge(1, 2);
    b.add_edge(1, 2); b.add_edge(0, 2);
    auto sd = graph_symmetric_difference(a, b);
    assert_true(sd.has_edge(0, 1));
    assert_true(sd.has_edge(0, 2));
    assert_false(sd.has_edge(1, 2));
}

CRYO_TEST(GraphOps, LineGraph) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto lg = line_graph(g);
    assert_eq(lg.node_count(), (size_t)3);
    assert_true(lg.has_edge(0, 1));
    assert_true(lg.has_edge(1, 2));
}

CRYO_TEST(GraphOps, EdgeContraction) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto c = edge_contraction(g, 1, 2);
    assert_false(c.has_node(2));
    assert_true(c.has_node(1));
    assert_true(c.has_edge(0, 1));
    assert_true(c.has_edge(1, 3));
}

CRYO_TEST(GraphOps, IsSubgraph) {
    Graph a(GraphType::Undirected), b(GraphType::Undirected);
    a.add_node_with_id(0); a.add_node_with_id(1); a.add_edge(0, 1);
    b.add_node_with_id(0); b.add_node_with_id(1); b.add_node_with_id(2);
    b.add_edge(0, 1); b.add_edge(1, 2);
    assert_true(is_subgraph(a, b));
    assert_false(is_subgraph(b, a));
}

CRYO_TEST(GraphOps, ReverseGraph) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0); g.add_node_with_id(1);
    g.add_edge(0, 1);
    auto r = reverse_graph(g);
    assert_false(r.has_edge(0, 1));
    assert_true(r.has_edge(1, 0));
}

CRYO_TEST(GraphOps, GraphPower) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(3, 4);
    auto g2 = graph_power(g, 2);
    assert_true(g2.has_edge(0, 2));
    assert_true(g2.has_edge(1, 3));
    assert_false(g2.has_edge(0, 3));
}

CRYO_TEST(GraphOps, GraphSquare) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2);
    auto gs = graph_square(g);
    assert_true(gs.has_edge(0, 2));
}

CRYO_TEST(GraphOps, GraphHash) {
    GraphGenerator gen(42);
    auto g1 = gen.complete(5);
    auto g2 = gen.complete(5);
    assert_eq(graph_hash(g1), graph_hash(g2));
}

CRYO_TEST(GraphOps, GraphDiffIdentical) {
    Graph a(GraphType::Undirected), b(GraphType::Undirected);
    a.add_node_with_id(0); a.add_node_with_id(1); a.add_edge(0, 1);
    b.add_node_with_id(0); b.add_node_with_id(1); b.add_edge(0, 1);
    auto d = graph_diff(a, b);
    assert_true(d.identical());
}

CRYO_TEST(GraphOps, GraphDiffChanges) {
    Graph a(GraphType::Undirected), b(GraphType::Undirected);
    a.add_node_with_id(0); a.add_node_with_id(1); a.add_edge(0, 1);
    b.add_node_with_id(0); b.add_node_with_id(1); b.add_node_with_id(2);
    b.add_edge(0, 1); b.add_edge(1, 2);
    auto d = graph_diff(a, b);
    assert_false(d.identical());
    assert_eq(d.added_nodes.size(), (size_t)1);
    assert_eq(d.added_edges.size(), (size_t)1);
}