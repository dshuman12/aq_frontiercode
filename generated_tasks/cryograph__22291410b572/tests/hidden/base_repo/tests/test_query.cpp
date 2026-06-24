#include "test_framework.hpp"
#include "query/query.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(Query, FilterNodes) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto high_deg = filter_nodes(g, [](NodeId nid, const Graph& g) {
        return g.out_degree(nid) > 0;
    });
    assert_eq(high_deg.size(), (size_t)3);
}

CRYO_TEST(Query, FilterEdges) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1, 5.0); g.add_edge(1, 2, 1.0);
    auto heavy = filter_edges(g, [](const Edge& e, const Graph&) {
        return e.weight > 3.0;
    });
    assert_eq(heavy.size(), (size_t)1);
}

CRYO_TEST(Query, InducedSubgraph) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(3, 4);
    auto sg = induced_subgraph(g, [](NodeId nid, const Graph&) {
        return nid <= 2;
    });
    assert_eq(sg.node_count(), (size_t)3);
    assert_true(sg.has_edge(0, 1));
    assert_false(sg.has_node(3));
}

CRYO_TEST(Query, Reachable) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2);
    assert_true(reachable(g, 0, 2));
    assert_false(reachable(g, 2, 0));
    assert_false(reachable(g, 0, 3));
}

CRYO_TEST(Query, ReachableSameNode) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0);
    assert_true(reachable(g, 0, 0));
}

CRYO_TEST(Query, FindPath) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto path = find_path(g, 0, 3);
    assert_eq(path.size(), (size_t)4);
    assert_eq(path.front(), (NodeId)0);
    assert_eq(path.back(), (NodeId)3);
}

CRYO_TEST(Query, FindPathNoPath) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0); g.add_node_with_id(1);
    auto path = find_path(g, 0, 1);
    assert_true(path.empty());
}

CRYO_TEST(Query, AllPaths) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(0, 2);
    g.add_edge(1, 3); g.add_edge(2, 3);
    auto paths = all_paths(g, 0, 3);
    assert_eq(paths.size(), (size_t)2);
}

CRYO_TEST(Query, CountPaths) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(0, 2);
    g.add_edge(1, 3); g.add_edge(2, 3);
    assert_eq(count_paths(g, 0, 3), (size_t)2);
}

CRYO_TEST(Query, CommonNeighbors) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 2); g.add_edge(0, 3);
    g.add_edge(1, 2); g.add_edge(1, 3);
    auto cn = common_neighbors(g, 0, 1);
    assert_eq(cn.size(), (size_t)2);
}

CRYO_TEST(Query, NoCommonNeighbors) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0); g.add_node_with_id(1);
    g.add_node_with_id(2); g.add_node_with_id(3);
    g.add_edge(0, 2); g.add_edge(1, 3);
    auto cn = common_neighbors(g, 0, 1);
    assert_eq(cn.size(), (size_t)0);
}

CRYO_TEST(Query, Triangles) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    g.add_edge(0, 3); g.add_edge(1, 3);
    auto res = find_triangles(g);
    assert_eq(res.triangle_count, (size_t)2);
}

CRYO_TEST(Query, NoTriangles) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(2, 3);
    auto res = find_triangles(g);
    assert_eq(res.triangle_count, (size_t)0);
}

CRYO_TEST(Query, KHopNeighbors) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(3, 4);
    auto n1 = k_hop_neighbors(g, 0, 1);
    assert_eq(n1.size(), (size_t)1);
    auto n2 = k_hop_neighbors(g, 0, 2);
    assert_eq(n2.size(), (size_t)2);
    auto n3 = k_hop_neighbors(g, 0, 4);
    assert_eq(n3.size(), (size_t)4);
}

CRYO_TEST(Query, KHopZero) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0); g.add_node_with_id(1);
    g.add_edge(0, 1);
    auto n = k_hop_neighbors(g, 0, 0);
    assert_eq(n.size(), (size_t)0);
}