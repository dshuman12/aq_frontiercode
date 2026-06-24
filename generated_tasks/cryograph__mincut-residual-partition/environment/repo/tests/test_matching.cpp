#include "test_framework.hpp"
#include "matching/matching.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(Matching, BipartiteBasic) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 6; i++) g.add_node_with_id(i);
    g.add_edge(0, 3); g.add_edge(0, 4); g.add_edge(1, 3);
    g.add_edge(1, 5); g.add_edge(2, 4); g.add_edge(2, 5);
    std::unordered_set<NodeId> left{0, 1, 2}, right{3, 4, 5};
    auto m = bipartite_matching(g, left, right);
    assert_eq(m.size(), (size_t)3);
}

CRYO_TEST(Matching, BipartitePartial) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 2); g.add_edge(1, 2);
    std::unordered_set<NodeId> left{0, 1}, right{2, 3};
    auto m = bipartite_matching(g, left, right);
    assert_eq(m.size(), (size_t)1);
}

CRYO_TEST(Matching, GreedyBasic) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(2, 3);
    auto m = greedy_matching(g);
    assert_eq(m.size(), (size_t)2);
}

CRYO_TEST(Matching, MaxWeightGreedy) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1, 10); g.add_edge(0, 2, 1); g.add_edge(2, 3, 1);
    auto m = max_weight_matching_greedy(g);
    assert_ge(m.size(), (size_t)1);
    assert_eq(m.edges[0].first, (NodeId)0);
    assert_eq(m.edges[0].second, (NodeId)1);
}

CRYO_TEST(Matching, PerfectCheck) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 6; i++) g.add_node_with_id(i);
    g.add_edge(0, 3); g.add_edge(1, 4); g.add_edge(2, 5);
    std::unordered_set<NodeId> left{0, 1, 2}, right{3, 4, 5};
    assert_true(has_perfect_matching(g, left, right));
}

CRYO_TEST(Matching, ToGraph) {
    MatchingResult m;
    m.edges = {{0, 1}, {2, 3}};
    auto g = matching_to_graph(m);
    assert_eq(g.node_count(), (size_t)4);
    assert_true(g.has_edge(0, 1));
}