#include "test_framework.hpp"
#include "centrality/centrality.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

static Graph make_star5() {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(0, 2);
    g.add_edge(0, 3); g.add_edge(0, 4);
    return g;
}

CRYO_TEST(DegreeCent, StarCenter) {
    auto g = make_star5();
    auto cm = degree_centrality(g);
    assert_near(cm[0], 1.0);
    assert_near(cm[1], 0.25);
}

CRYO_TEST(DegreeCent, Complete) {
    GraphGenerator gen;
    auto g = gen.complete(4);
    auto cm = degree_centrality(g);
    for (auto& [nid, val] : cm) assert_near(val, 1.0);
}

CRYO_TEST(DegreeCent, Isolated) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0); g.add_node_with_id(1);
    auto cm = degree_centrality(g);
    assert_near(cm[0], 0.0);
}

CRYO_TEST(InOutDegree, DirectedStar) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(0, 2); g.add_edge(0, 3);
    auto out_cm = out_degree_centrality(g);
    auto in_cm = in_degree_centrality(g);
    assert_near(out_cm[0], 1.0);
    assert_near(in_cm[0], 0.0);
    assert_near(in_cm[1], 1.0/3.0);
}

CRYO_TEST(Betweenness, StarCenter) {
    auto g = make_star5();
    auto cm = betweenness_centrality(g, true);
    assert_gt(cm[0], cm[1]);
}

CRYO_TEST(Betweenness, LineGraph) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    for (int i = 0; i < 4; i++) g.add_edge(i, i+1);
    auto cm = betweenness_centrality(g, false);
    assert_gt(cm[2], cm[0]);
    assert_gt(cm[2], cm[4]);
}

CRYO_TEST(Betweenness, Triangle) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    auto cm = betweenness_centrality(g, false);
    assert_near(cm[0], cm[1], 1e-6);
    assert_near(cm[1], cm[2], 1e-6);
}

CRYO_TEST(Closeness, StarCenter) {
    auto g = make_star5();
    auto cm = closeness_centrality(g);
    assert_gt(cm[0], cm[1]);
}

CRYO_TEST(Closeness, Complete) {
    GraphGenerator gen;
    auto g = gen.complete(4);
    auto cm = closeness_centrality(g);
    for (auto& [nid, val] : cm) assert_near(val, 1.0, 1e-6);
}

CRYO_TEST(Closeness, Disconnected) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0); g.add_node_with_id(1);
    auto cm = closeness_centrality(g);
    assert_near(cm[0], 0.0);
}

CRYO_TEST(PageRank, Convergence) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2);
    g.add_edge(2, 0); g.add_edge(2, 3);
    auto pr = pagerank(g);
    double sum = 0.0;
    for (auto& [nid, val] : pr) sum += val;
    assert_near(sum, 1.0, 1e-4);
}

CRYO_TEST(PageRank, StarCenter) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(1, 0); g.add_edge(2, 0); g.add_edge(3, 0);
    auto pr = pagerank(g);
    assert_gt(pr[0], pr[1]);
}

CRYO_TEST(PageRank, DanglingNode) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0); g.add_node_with_id(1);
    g.add_edge(0, 1);
    auto pr = pagerank(g);
    double sum = 0.0;
    for (auto& [nid, val] : pr) sum += val;
    assert_near(sum, 1.0, 1e-4);
}

CRYO_TEST(PageRank, SingleNode) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0);
    auto pr = pagerank(g);
    assert_near(pr[0], 1.0, 1e-6);
}

CRYO_TEST(Eigenvector, LineGraph) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    for (int i = 0; i < 4; i++) g.add_edge(i, i+1);
    auto ec = eigenvector_centrality(g);
    assert_gt(ec[2], ec[0]);
}

CRYO_TEST(Eigenvector, Complete) {
    GraphGenerator gen;
    auto g = gen.complete(4);
    auto ec = eigenvector_centrality(g);
    double first = ec.begin()->second;
    for (auto& [nid, val] : ec) assert_near(val, first, 1e-4);
}

CRYO_TEST(Harmonic, StarCenter) {
    auto g = make_star5();
    auto hc = harmonic_centrality(g);
    assert_gt(hc[0], hc[1]);
}

CRYO_TEST(Harmonic, LineGraph) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2);
    auto hc = harmonic_centrality(g);
    assert_gt(hc[1], hc[0]);
}

CRYO_TEST(MaxCent, Basic) {
    auto g = make_star5();
    auto cm = degree_centrality(g);
    assert_eq(max_centrality_node(cm), (NodeId)0);
}