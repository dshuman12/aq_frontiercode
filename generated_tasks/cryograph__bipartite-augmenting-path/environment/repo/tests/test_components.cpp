#include "test_framework.hpp"
#include "components/components.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(CC, TwoComponents) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 6; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2);
    g.add_edge(3, 4); g.add_edge(4, 5);
    auto res = connected_components(g);
    assert_eq(res.count(), (size_t)2);
}

CRYO_TEST(CC, SingleComponent) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto res = connected_components(g);
    assert_eq(res.count(), (size_t)1);
}

CRYO_TEST(CC, IsolatedNodes) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    auto res = connected_components(g);
    assert_eq(res.count(), (size_t)5);
}

CRYO_TEST(CC, EmptyGraph) {
    Graph g(GraphType::Undirected);
    auto res = connected_components(g);
    assert_eq(res.count(), (size_t)0);
}

CRYO_TEST(CC, NodeMapping) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0); g.add_node_with_id(1); g.add_node_with_id(2);
    g.add_edge(0, 1);
    auto res = connected_components(g);
    assert_eq(res.node_to_component.at(0), res.node_to_component.at(1));
    assert_ne(res.node_to_component.at(0), res.node_to_component.at(2));
}

CRYO_TEST(SCC, BasicSCC) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    g.add_edge(3, 4);
    auto res = strongly_connected_components(g);
    bool found_cycle = false;
    for (auto& comp : res.components) {
        if (comp.size() == 3) found_cycle = true;
    }
    assert_true(found_cycle);
}

CRYO_TEST(SCC, DAGAllSingleton) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto res = strongly_connected_components(g);
    assert_eq(res.count(), (size_t)4);
    for (auto& comp : res.components) assert_eq(comp.size(), (size_t)1);
}

CRYO_TEST(SCC, TwoCycles) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 6; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    g.add_edge(3, 4); g.add_edge(4, 5); g.add_edge(5, 3);
    g.add_edge(2, 3);
    auto res = strongly_connected_components(g);
    assert_eq(res.count(), (size_t)2);
}

CRYO_TEST(SCC, SingleNode) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0);
    auto res = strongly_connected_components(g);
    assert_eq(res.count(), (size_t)1);
}

CRYO_TEST(Bridge, SimpleChain) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto bridges = find_bridges(g);
    assert_eq(bridges.size(), (size_t)3);
}

CRYO_TEST(Bridge, NoBridge) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    auto bridges = find_bridges(g);
    assert_eq(bridges.size(), (size_t)0);
}

CRYO_TEST(Bridge, MixedBridges) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    g.add_edge(2, 3); g.add_edge(3, 4);
    auto bridges = find_bridges(g);
    assert_eq(bridges.size(), (size_t)2);
}

CRYO_TEST(AP, SimpleAP) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    g.add_edge(2, 3); g.add_edge(3, 4);
    auto aps = find_articulation_points(g);
    assert_true(std::find(aps.begin(), aps.end(), 2) != aps.end());
    assert_true(std::find(aps.begin(), aps.end(), 3) != aps.end());
}

CRYO_TEST(AP, NoAP) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    auto aps = find_articulation_points(g);
    assert_eq(aps.size(), (size_t)0);
}

CRYO_TEST(Bipartite, BipartiteGraph) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(0, 3);
    g.add_edge(2, 1); g.add_edge(2, 3);
    assert_true(is_bipartite(g));
}

CRYO_TEST(Bipartite, NonBipartite) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    assert_false(is_bipartite(g));
}

CRYO_TEST(Bipartite, Coloring) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(2, 3);
    std::unordered_map<NodeId, int> coloring;
    assert_true(is_bipartite(g, coloring));
    assert_ne(coloring[0], coloring[1]);
}

CRYO_TEST(Bipartite, SingleNode) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0);
    assert_true(is_bipartite(g));
}

CRYO_TEST(Connected, ConnectedUndirected) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2);
    assert_true(is_connected(g));
}

CRYO_TEST(Connected, DisconnectedUndirected) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0); g.add_node_with_id(1);
    assert_false(is_connected(g));
}

CRYO_TEST(Connected, StronglyConnected) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0); g.add_node_with_id(1); g.add_node_with_id(2);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    assert_true(is_strongly_connected(g));
}

CRYO_TEST(Connected, NotStronglyConnected) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0); g.add_node_with_id(1);
    g.add_edge(0, 1);
    assert_false(is_strongly_connected(g));
}

CRYO_TEST(Condensation, Basic) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 6; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    g.add_edge(3, 4); g.add_edge(4, 5); g.add_edge(5, 3);
    g.add_edge(2, 3);
    auto cond = condensation(g);
    assert_eq(cond.node_count(), (size_t)2);
    assert_eq(cond.edge_count(), (size_t)1);
}

CRYO_TEST(Condensation, DAGUnchanged) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2);
    auto cond = condensation(g);
    assert_eq(cond.node_count(), (size_t)3);
    assert_eq(cond.edge_count(), (size_t)2);
}

// ── Dead code removal + directed CC with fast in_edges tests ───────────────

CRYO_TEST(ConnComp, DirectedWeakConnFast) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(2, 1); g.add_edge(3, 4);
    auto cc = connected_components(g);
    assert_eq(cc.count(), (size_t)2);
}

CRYO_TEST(ConnComp, DirectedChainWeak) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto cc = connected_components(g);
    assert_eq(cc.count(), (size_t)1);
}