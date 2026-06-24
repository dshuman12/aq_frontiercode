#include "test_framework.hpp"
#include "core/graph.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(Core, AddNode) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    assert_eq(g.node_count(), (size_t)2);
    assert_true(g.has_node(a));
    assert_true(g.has_node(b));
}

CRYO_TEST(Core, AddNodeWithId) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(10);
    g.add_node_with_id(20);
    assert_true(g.has_node(10));
    assert_true(g.has_node(20));
    assert_false(g.has_node(0));
}

CRYO_TEST(Core, DuplicateNodeThrows) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(5);
    assert_throws([&]() { g.add_node_with_id(5); });
}

CRYO_TEST(Core, AddEdgeDirected) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    g.add_edge(a, b, 3.5);
    assert_eq(g.edge_count(), (size_t)1);
    assert_true(g.has_edge(a, b));
    assert_false(g.has_edge(b, a));
}

CRYO_TEST(Core, AddEdgeUndirected) {
    Graph g(GraphType::Undirected);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    g.add_edge(a, b, 2.0);
    assert_true(g.has_edge(a, b));
    assert_true(g.has_edge(b, a));
}

CRYO_TEST(Core, RemoveNode) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    NodeId c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(b, c);
    g.add_edge(a, c);
    g.remove_node(b);
    assert_eq(g.node_count(), (size_t)2);
    assert_false(g.has_node(b));
    assert_true(g.has_edge(a, c));
    assert_false(g.has_edge(a, b));
}

CRYO_TEST(Core, RemoveEdge) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    EdgeId eid = g.add_edge(a, b);
    assert_true(g.has_edge(a, b));
    g.remove_edge(eid);
    assert_false(g.has_edge(a, b));
    assert_eq(g.edge_count(), (size_t)0);
}

CRYO_TEST(Core, RemoveEdgeBetween) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    g.add_edge(a, b);
    g.remove_edge_between(a, b);
    assert_false(g.has_edge(a, b));
}

CRYO_TEST(Core, GetEdge) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    g.add_edge(a, b, 7.5);
    const Edge* e = g.get_edge(a, b);
    assert_true(e != nullptr);
    assert_near(e->weight, 7.5);
    assert_true(g.get_edge(b, a) == nullptr);
}

CRYO_TEST(Core, OutEdges) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    NodeId c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(a, c);
    auto edges = g.out_edges(a);
    assert_eq(edges.size(), (size_t)2);
}

CRYO_TEST(Core, InEdges) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    NodeId c = g.add_node();
    g.add_edge(a, c);
    g.add_edge(b, c);
    auto edges = g.in_edges(c);
    assert_eq(edges.size(), (size_t)2);
}

CRYO_TEST(Core, Neighbors) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    NodeId c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(a, c);
    auto nbrs = g.neighbors(a);
    assert_eq(nbrs.size(), (size_t)2);
}

CRYO_TEST(Core, Predecessors) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    NodeId c = g.add_node();
    g.add_edge(a, c);
    g.add_edge(b, c);
    auto preds = g.predecessors(c);
    assert_eq(preds.size(), (size_t)2);
}

CRYO_TEST(Core, OutDegree) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    NodeId c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(a, c);
    assert_eq(g.out_degree(a), (size_t)2);
    assert_eq(g.out_degree(b), (size_t)0);
}

CRYO_TEST(Core, InDegree) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    g.add_edge(a, b);
    assert_eq(g.in_degree(b), (size_t)1);
    assert_eq(g.in_degree(a), (size_t)0);
}

CRYO_TEST(Core, DegreeUndirected) {
    Graph g(GraphType::Undirected);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    NodeId c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(a, c);
    assert_eq(g.degree(a), (size_t)2);
    assert_eq(g.degree(b), (size_t)1);
}

CRYO_TEST(Core, NodeProperties) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    g.set_node_property(a, "name", std::string("alpha"));
    g.set_node_property(a, "rank", int64_t(42));
    auto* name = g.get_node_property(a, "name");
    assert_true(name != nullptr);
    assert_eq(std::get<std::string>(*name), std::string("alpha"));
    auto* rank = g.get_node_property(a, "rank");
    assert_eq(std::get<int64_t>(*rank), int64_t(42));
}

CRYO_TEST(Core, NodePropertyMissing) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    assert_true(g.get_node_property(a, "nope") == nullptr);
    assert_true(g.get_node_property(999, "nope") == nullptr);
}

CRYO_TEST(Core, EdgeProperty) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    EdgeId eid = g.add_edge(a, b);
    g.set_edge_property(eid, "label", std::string("road"));
    auto& edges = g.out_edges(a);
    assert_eq(edges.size(), (size_t)1);
    auto it = edges[0].props.find("label");
    assert_true(it != edges[0].props.end());
    assert_eq(std::get<std::string>(it->second), std::string("road"));
}

CRYO_TEST(Core, NodeIds) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(5);
    g.add_node_with_id(2);
    g.add_node_with_id(8);
    auto ids = g.node_ids();
    assert_eq(ids.size(), (size_t)3);
    assert_eq(ids[0], (NodeId)2);
    assert_eq(ids[1], (NodeId)5);
    assert_eq(ids[2], (NodeId)8);
}

CRYO_TEST(Core, AllEdges) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    NodeId c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(b, c);
    g.add_edge(a, c);
    auto edges = g.all_edges();
    assert_eq(edges.size(), (size_t)3);
}

CRYO_TEST(Core, Transpose) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    g.add_edge(a, b, 3.0);
    Graph t = g.transpose();
    assert_false(t.has_edge(a, b));
    assert_true(t.has_edge(b, a));
    assert_near(t.get_edge(b, a)->weight, 3.0);
}

CRYO_TEST(Core, SubgraphDirected) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    NodeId c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(b, c);
    g.add_edge(a, c);
    std::unordered_set<NodeId> keep{a, c};
    Graph sg = g.subgraph(keep);
    assert_eq(sg.node_count(), (size_t)2);
    assert_true(sg.has_edge(a, c));
    assert_false(sg.has_node(b));
}

CRYO_TEST(Core, Clear) {
    Graph g(GraphType::Directed);
    g.add_node(); g.add_node();
    g.add_edge(0, 1);
    g.clear();
    assert_eq(g.node_count(), (size_t)0);
    assert_eq(g.edge_count(), (size_t)0);
}

CRYO_TEST(Core, ForEachNode) {
    Graph g(GraphType::Directed);
    g.add_node(); g.add_node(); g.add_node();
    int count = 0;
    g.for_each_node([&](NodeId) { count++; });
    assert_eq(count, 3);
}

CRYO_TEST(Core, ForEachEdge) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    g.add_edge(a, b);
    g.add_edge(b, a);
    int count = 0;
    g.for_each_edge([&](const Edge&) { count++; });
    assert_eq(count, 2);
}

CRYO_TEST(Core, CopyConstructor) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    g.add_edge(a, b, 5.0);
    Graph g2(g);
    assert_eq(g2.node_count(), (size_t)2);
    assert_true(g2.has_edge(a, b));
    assert_near(g2.get_edge(a, b)->weight, 5.0);
}

CRYO_TEST(Core, MoveConstructor) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    g.add_edge(a, b);
    Graph g2(std::move(g));
    assert_eq(g2.node_count(), (size_t)2);
    assert_true(g2.has_edge(a, b));
}

CRYO_TEST(Core, SelfLoop) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    g.add_edge(a, a, 1.0);
    assert_true(g.has_edge(a, a));
    assert_eq(g.out_degree(a), (size_t)1);
}

CRYO_TEST(Core, MultiEdge) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    g.add_edge(a, b, 1.0);
    g.add_edge(a, b, 2.0);
    assert_eq(g.out_degree(a), (size_t)2);
}

CRYO_TEST(Core, AddEdgeInvalidNode) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node();
    assert_throws([&]() { g.add_edge(a, 999); });
    assert_throws([&]() { g.add_edge(999, a); });
}

CRYO_TEST(Core, LargeGraph) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 1000; i++) g.add_node();
    for (int i = 0; i < 999; i++) g.add_edge(i, i+1);
    assert_eq(g.node_count(), (size_t)1000);
    assert_eq(g.edge_count(), (size_t)999);
}

CRYO_TEST(Core, UndirectedRemoveEdge) {
    Graph g(GraphType::Undirected);
    NodeId a = g.add_node();
    NodeId b = g.add_node();
    g.add_edge(a, b);
    assert_true(g.has_edge(a, b));
    assert_true(g.has_edge(b, a));
    g.remove_edge_between(a, b);
    assert_false(g.has_edge(a, b));
    assert_false(g.has_edge(b, a));
}

CRYO_TEST(Core, EmptyGraphOperations) {
    Graph g(GraphType::Directed);
    assert_eq(g.node_count(), (size_t)0);
    assert_eq(g.edge_count(), (size_t)0);
    auto ids = g.node_ids();
    assert_true(ids.empty());
    auto edges = g.all_edges();
    assert_true(edges.empty());
}

// ── Reverse adjacency + node_ids cache tests ───────────────────────────────

CRYO_TEST(Core, InEdgesDirected) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node(), b = g.add_node(), c = g.add_node();
    g.add_edge(a, c, 1.0);
    g.add_edge(b, c, 2.0);
    auto& in = g.in_edges(c);
    assert_eq(in.size(), (size_t)2);
    assert_eq(g.in_degree(c), (size_t)2);
    assert_eq(g.in_degree(a), (size_t)0);
}

CRYO_TEST(Core, InEdgesUndirected) {
    Graph g(GraphType::Undirected);
    NodeId a = g.add_node(), b = g.add_node(), c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(b, c);
    assert_eq(g.in_degree(b), (size_t)2);
    assert_eq(g.in_degree(a), (size_t)1);
}

CRYO_TEST(Core, PredecessorsDirected) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node(), b = g.add_node(), c = g.add_node();
    g.add_edge(a, c);
    g.add_edge(b, c);
    auto preds = g.predecessors(c);
    assert_eq(preds.size(), (size_t)2);
}

CRYO_TEST(Core, DegreeDirected) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node(), b = g.add_node(), c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(c, b);
    assert_eq(g.degree(b), (size_t)2);
    assert_eq(g.out_degree(b), (size_t)0);
    assert_eq(g.in_degree(b), (size_t)2);
}

CRYO_TEST(Core, RemoveNodeRadj) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node(), b = g.add_node(), c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(b, c);
    g.add_edge(a, c);
    g.remove_node(b);
    assert_eq(g.node_count(), (size_t)2);
    assert_true(g.has_edge(a, c));
    assert_false(g.has_node(b));
    assert_eq(g.in_degree(c), (size_t)1);
}

CRYO_TEST(Core, RemoveEdgeRadj) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node(), b = g.add_node();
    EdgeId eid = g.add_edge(a, b);
    assert_eq(g.in_degree(b), (size_t)1);
    g.remove_edge(eid);
    assert_eq(g.in_degree(b), (size_t)0);
}

CRYO_TEST(Core, RemoveEdgeBetweenRadj) {
    Graph g(GraphType::Undirected);
    NodeId a = g.add_node(), b = g.add_node(), c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(b, c);
    assert_eq(g.in_degree(b), (size_t)2);
    g.remove_edge_between(a, b);
    assert_eq(g.in_degree(b), (size_t)1);
    assert_eq(g.in_degree(a), (size_t)0);
}

CRYO_TEST(Core, NodeIdsCacheConsistency) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(10);
    g.add_node_with_id(5);
    auto ids1 = g.node_ids();
    assert_eq(ids1[0], (NodeId)5);
    assert_eq(ids1[1], (NodeId)10);
    g.add_node_with_id(1);
    auto ids2 = g.node_ids();
    assert_eq(ids2.size(), (size_t)3);
    assert_eq(ids2[0], (NodeId)1);
    g.remove_node(5);
    auto ids3 = g.node_ids();
    assert_eq(ids3.size(), (size_t)2);
}

CRYO_TEST(Core, CopyPreservesRadj) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node(), b = g.add_node();
    g.add_edge(a, b);
    Graph g2(g);
    assert_eq(g2.in_degree(b), (size_t)1);
    auto& in = g2.in_edges(b);
    assert_eq(in.size(), (size_t)1);
    assert_eq(in[0].src, a);
}

CRYO_TEST(Core, MovePreservesRadj) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node(), b = g.add_node();
    g.add_edge(a, b);
    Graph g2(std::move(g));
    assert_eq(g2.in_degree(b), (size_t)1);
}

CRYO_TEST(Core, TransposeRadj) {
    Graph g(GraphType::Directed);
    NodeId a = g.add_node(), b = g.add_node();
    g.add_edge(a, b);
    Graph t = g.transpose();
    assert_eq(t.in_degree(a), (size_t)1);
    assert_eq(t.in_degree(b), (size_t)0);
}

CRYO_TEST(Core, BatchAddNodes) {
    Graph g(GraphType::Directed);
    g.add_nodes(5);
    assert_eq(g.node_count(), (size_t)5);
}

CRYO_TEST(Core, BatchAddEdges) {
    Graph g(GraphType::Directed);
    g.add_nodes(3);
    g.add_edges_batch({{0,1,1.0},{1,2,2.0},{0,2,3.0}});
    assert_eq(g.edge_count(), (size_t)3);
    assert_near(g.get_edge(0,2)->weight, 3.0);
}

CRYO_TEST(Core, BatchRemoveNodes) {
    Graph g(GraphType::Directed);
    g.add_nodes(5);
    g.add_edge(0, 1); g.add_edge(2, 3);
    g.remove_nodes({1, 3});
    assert_eq(g.node_count(), (size_t)3);
}

CRYO_TEST(Core, FilterByWeight) {
    Graph g(GraphType::Undirected);
    g.add_nodes(3);
    g.add_edge(0, 1, 5.0); g.add_edge(1, 2, 1.0);
    auto f = g.filter_by_weight(3.0, 10.0);
    assert_true(f.has_edge(0, 1));
    assert_false(f.has_edge(1, 2));
}

CRYO_TEST(Core, FilterByDegree) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(0, 2); g.add_edge(0, 3);
    auto f = g.filter_by_degree(2);
    assert_true(f.has_node(0));
    assert_eq(f.node_count(), (size_t)1);
}

CRYO_TEST(Core, RemoveNodeUndirectedRadj) {
    Graph g(GraphType::Undirected);
    NodeId a = g.add_node(), b = g.add_node(), c = g.add_node();
    g.add_edge(a, b);
    g.add_edge(b, c);
    g.remove_node(b);
    assert_eq(g.node_count(), (size_t)2);
    assert_eq(g.in_degree(a), (size_t)0);
    assert_eq(g.in_degree(c), (size_t)0);
}