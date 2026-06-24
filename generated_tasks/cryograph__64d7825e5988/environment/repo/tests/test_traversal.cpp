#include "test_framework.hpp"
#include "algo/traversal.hpp"
using namespace cryo;
using namespace cryo_test;

static Graph make_dag() {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 6; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(0, 2);
    g.add_edge(1, 3); g.add_edge(2, 3);
    g.add_edge(3, 4); g.add_edge(4, 5);
    return g;
}

static Graph make_tree() {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 7; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(0, 2);
    g.add_edge(1, 3); g.add_edge(1, 4);
    g.add_edge(2, 5); g.add_edge(2, 6);
    return g;
}

CRYO_TEST(BFS, BasicOrder) {
    auto g = make_tree();
    auto res = bfs(g, 0);
    assert_eq(res.order.size(), (size_t)7);
    assert_eq(res.order[0], (NodeId)0);
}

CRYO_TEST(BFS, Depth) {
    auto g = make_tree();
    auto res = bfs(g, 0);
    assert_eq(res.depth.at(0), (size_t)0);
    assert_eq(res.depth.at(1), (size_t)1);
    assert_eq(res.depth.at(2), (size_t)1);
    assert_eq(res.depth.at(3), (size_t)2);
}

CRYO_TEST(BFS, Parent) {
    auto g = make_tree();
    auto res = bfs(g, 0);
    assert_eq(res.parent.at(0), INVALID_NODE);
    assert_eq(res.parent.at(1), (NodeId)0);
    assert_eq(res.parent.at(3), (NodeId)1);
}

CRYO_TEST(BFS, Disconnected) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0); g.add_node_with_id(1);
    g.add_node_with_id(2); g.add_node_with_id(3);
    g.add_edge(0, 1);
    auto res = bfs(g, 0);
    assert_eq(res.order.size(), (size_t)2);
}

CRYO_TEST(BFS, MultiSource) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 6; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(2, 3);
    g.add_edge(4, 5);
    auto res = bfs_multi(g, {0, 2, 4});
    assert_eq(res.order.size(), (size_t)6);
}

CRYO_TEST(BFS, VisitorEarlyStop) {
    auto g = make_tree();
    int count = 0;
    bfs_visit(g, 0, [&](NodeId, size_t) {
        count++;
        return count < 3;
    });
    assert_eq(count, 3);
}

CRYO_TEST(BFS, EmptyStart) {
    Graph g(GraphType::Directed);
    auto res = bfs(g, 99);
    assert_true(res.order.empty());
}

CRYO_TEST(BFS, SingleNode) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0);
    auto res = bfs(g, 0);
    assert_eq(res.order.size(), (size_t)1);
    assert_eq(res.depth.at(0), (size_t)0);
}

CRYO_TEST(DFS, PreOrder) {
    auto g = make_tree();
    auto res = dfs(g, 0);
    assert_eq(res.pre_order.size(), (size_t)7);
    assert_eq(res.pre_order[0], (NodeId)0);
}

CRYO_TEST(DFS, PostOrder) {
    auto g = make_tree();
    auto res = dfs(g, 0);
    assert_eq(res.post_order.size(), (size_t)7);
    NodeId last = res.post_order.back();
    assert_eq(last, (NodeId)0);
}

CRYO_TEST(DFS, DiscoverFinish) {
    auto g = make_dag();
    auto res = dfs(g, 0);
    for (auto nid : res.pre_order) {
        assert_lt(res.discover.at(nid), res.finish.at(nid));
    }
}

CRYO_TEST(DFS, FullGraph) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(2, 3);
    auto res = dfs_full(g);
    assert_eq(res.pre_order.size(), (size_t)4);
}

CRYO_TEST(DFS, VisitorCallbacks) {
    auto g = make_tree();
    std::vector<NodeId> discovered;
    std::vector<NodeId> finished;
    dfs_visit(g, 0,
        [&](NodeId n) { discovered.push_back(n); },
        [&](NodeId n) { finished.push_back(n); });
    assert_eq(discovered.size(), (size_t)7);
    assert_eq(finished.size(), (size_t)7);
}

CRYO_TEST(DFS, SingleNode) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0);
    auto res = dfs(g, 0);
    assert_eq(res.pre_order.size(), (size_t)1);
    assert_eq(res.post_order.size(), (size_t)1);
}

CRYO_TEST(TopoSort, DAG) {
    auto g = make_dag();
    auto order = topological_sort(g);
    assert_eq(order.size(), (size_t)6);
    std::unordered_map<NodeId, size_t> pos;
    for (size_t i = 0; i < order.size(); i++) pos[order[i]] = i;
    assert_lt(pos[0], pos[1]);
    assert_lt(pos[0], pos[2]);
    assert_lt(pos[1], pos[3]);
    assert_lt(pos[3], pos[4]);
    assert_lt(pos[4], pos[5]);
}

CRYO_TEST(TopoSort, CycleThrows) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0); g.add_node_with_id(1); g.add_node_with_id(2);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    assert_throws([&]() { topological_sort(g); });
}

CRYO_TEST(TopoSort, UndirectedThrows) {
    Graph g(GraphType::Undirected);
    g.add_node();
    assert_throws([&]() { topological_sort(g); });
}

CRYO_TEST(TopoSort, LinearChain) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    for (int i = 0; i < 4; i++) g.add_edge(i, i+1);
    auto order = topological_sort(g);
    for (int i = 0; i < 5; i++) assert_eq(order[i], (NodeId)i);
}

CRYO_TEST(HasCycle, DirectedNoCycle) {
    auto g = make_dag();
    assert_false(has_cycle(g));
}

CRYO_TEST(HasCycle, DirectedWithCycle) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    assert_true(has_cycle(g));
}

CRYO_TEST(HasCycle, UndirectedNoCycle) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0); g.add_node_with_id(1); g.add_node_with_id(2);
    g.add_edge(0, 1); g.add_edge(1, 2);
    assert_false(has_cycle(g));
}

CRYO_TEST(HasCycle, UndirectedWithCycle) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0); g.add_node_with_id(1); g.add_node_with_id(2);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    assert_true(has_cycle(g));
}

CRYO_TEST(IDDFS, FindTarget) {
    auto g = make_dag();
    auto path = iddfs(g, 0, 5, 10);
    assert_false(path.empty());
    assert_eq(path.front(), (NodeId)0);
    assert_eq(path.back(), (NodeId)5);
}

CRYO_TEST(IDDFS, TargetNotReachable) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0); g.add_node_with_id(1);
    auto path = iddfs(g, 0, 1, 10);
    assert_true(path.empty());
}

CRYO_TEST(IDDFS, DepthLimit) {
    auto g = make_dag();
    auto path = iddfs(g, 0, 5, 2);
    assert_true(path.empty());
}

CRYO_TEST(IDDFS, SameStartTarget) {
    auto g = make_dag();
    auto path = iddfs(g, 0, 0, 0);
    assert_eq(path.size(), (size_t)1);
    assert_eq(path[0], (NodeId)0);
}

CRYO_TEST(LevelOrder, Basic) {
    auto g = make_tree();
    auto lo = level_order(g, 0);
    assert_eq(lo.levels.size(), (size_t)3);
    assert_eq(lo.levels[0].size(), (size_t)1);
    assert_eq(lo.levels[1].size(), (size_t)2);
    assert_eq(lo.levels[2].size(), (size_t)4);
}

CRYO_TEST(LevelOrder, SingleNode) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0);
    auto lo = level_order(g, 0);
    assert_eq(lo.levels.size(), (size_t)1);
    assert_eq(lo.levels[0].size(), (size_t)1);
}

CRYO_TEST(LevelOrder, EmptyGraph) {
    Graph g(GraphType::Directed);
    auto lo = level_order(g, 99);
    assert_true(lo.levels.empty());
}