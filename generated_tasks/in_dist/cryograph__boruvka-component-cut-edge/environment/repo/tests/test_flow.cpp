#include "test_framework.hpp"
#include "flow/flow.hpp"
using namespace cryo;
using namespace cryo_test;

static Graph make_flow_graph() {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 6; i++) g.add_node_with_id(i);
    g.add_edge(0, 1, 16); g.add_edge(0, 2, 13);
    g.add_edge(1, 2, 10); g.add_edge(1, 3, 12);
    g.add_edge(2, 1, 4);  g.add_edge(2, 4, 14);
    g.add_edge(3, 2, 9);  g.add_edge(3, 5, 20);
    g.add_edge(4, 3, 7);  g.add_edge(4, 5, 4);
    return g;
}

CRYO_TEST(Flow, EdmondsKarpBasic) {
    auto g = make_flow_graph();
    auto res = edmonds_karp(g, 0, 5);
    assert_near(res.max_flow, 23.0, 1e-6);
}

CRYO_TEST(Flow, SimplePath) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0); g.add_node_with_id(1); g.add_node_with_id(2);
    g.add_edge(0, 1, 5.0); g.add_edge(1, 2, 3.0);
    assert_near(max_flow_value(g, 0, 2), 3.0, 1e-6);
}

CRYO_TEST(Flow, ParallelPaths) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1, 5); g.add_edge(0, 2, 10);
    g.add_edge(1, 3, 5); g.add_edge(2, 3, 10);
    assert_near(max_flow_value(g, 0, 3), 15.0, 1e-6);
}

CRYO_TEST(Flow, NoPath) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0); g.add_node_with_id(1);
    assert_near(max_flow_value(g, 0, 1), 0.0, 1e-6);
}

CRYO_TEST(Flow, MinCutBasic) {
    auto g = make_flow_graph();
    auto mc = min_cut(g, 0, 5);
    assert_near(mc.cut_value, 23.0, 1e-6);
    assert_true(mc.source_side.count(0));
    assert_true(mc.sink_side.count(5));
    assert_true(!mc.cut_edges.empty());
}

CRYO_TEST(Flow, MinCutBottleneck) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1, 100); g.add_edge(1, 2, 1); g.add_edge(2, 3, 100);
    auto mc = min_cut(g, 0, 3);
    assert_near(mc.cut_value, 1.0, 1e-6);
}