#include "test_framework.hpp"
#include "community/community.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(Community, LouvainDisconnected) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 6; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(0, 2);
    g.add_edge(3, 4); g.add_edge(4, 5); g.add_edge(3, 5);
    auto cr = louvain(g);
    assert_le(cr.num_communities, (size_t)6);
    assert_ge(cr.num_communities, (size_t)1);
}

CRYO_TEST(Community, LouvainComplete) {
    GraphGenerator gen(42);
    auto g = gen.complete(5);
    auto cr = louvain(g);
    assert_eq(cr.num_communities, (size_t)1);
}

CRYO_TEST(Community, LabelProp) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 6; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(0, 2);
    g.add_edge(3, 4); g.add_edge(4, 5); g.add_edge(3, 5);
    auto cr = community_label_propagation(g);
    assert_ge(cr.num_communities, (size_t)1);
}

CRYO_TEST(Community, Modularity) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(2, 3);
    std::unordered_map<NodeId, size_t> assign = {{0,0},{1,0},{2,1},{3,1}};
    double q = compute_modularity(g, assign);
    assert_gt(q, 0.0);
}

CRYO_TEST(Community, InterCommunityEdges) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    CommunityResult cr;
    cr.assignment = {{0,0},{1,0},{2,1},{3,1}};
    cr.num_communities = 2;
    assert_eq(num_inter_community_edges(g, cr), (size_t)1);
}

CRYO_TEST(Community, NMI) {
    CommunityResult a, b;
    a.assignment = {{0,0},{1,0},{2,1},{3,1}};
    a.communities = {{0,1},{2,3}};
    a.num_communities = 2;
    b = a;
    double nmi = normalized_mutual_information(a, b);
    assert_near(nmi, 1.0, 0.1);
}