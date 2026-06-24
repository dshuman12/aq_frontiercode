#include "matching/matching.hpp"
#include <algorithm>
#include <queue>

namespace cryo {

bool MatchingResult::is_perfect(const Graph& g) const {
    return edges.size() * 2 == g.node_count();
}

static bool bpm_dfs(NodeId u, const Graph& g,
                    const std::unordered_set<NodeId>& right,
                    std::unordered_map<NodeId, NodeId>& match_r,
                    std::unordered_set<NodeId>& visited) {
    for (auto& e : g.out_edges(u)) {
        if (!right.count(e.dst) || visited.count(e.dst)) continue;
        visited.insert(e.dst);
        if (!match_r.count(e.dst)) {
            match_r[e.dst] = u;
            return true;
        }
    }
    return false;
}

MatchingResult bipartite_matching(const Graph& g,
    const std::unordered_set<NodeId>& left,
    const std::unordered_set<NodeId>& right) {
    MatchingResult res;
    std::unordered_map<NodeId, NodeId> match_r;

    for (auto u : left) {
        std::unordered_set<NodeId> visited;
        bpm_dfs(u, g, right, match_r, visited);
    }

    for (auto& [r, l] : match_r) {
        res.edges.push_back({l, r});
    }
    std::sort(res.edges.begin(), res.edges.end());
    return res;
}

MatchingResult greedy_matching(const Graph& g) {
    MatchingResult res;
    std::unordered_set<NodeId> matched;
    std::unordered_set<EdgeId> seen;

    g.for_each_edge([&](const Edge& e) {
        if (!g.is_directed() && e.src > e.dst) return;
        if (seen.count(e.id)) return;
        seen.insert(e.id);
        if (!matched.count(e.src) && !matched.count(e.dst)) {
            res.edges.push_back({e.src, e.dst});
            matched.insert(e.src);
            matched.insert(e.dst);
        }
    });
    return res;
}

MatchingResult max_weight_matching_greedy(const Graph& g) {
    MatchingResult res;
    std::vector<Edge> sorted_edges;
    std::unordered_set<EdgeId> seen;
    g.for_each_edge([&](const Edge& e) {
        if (!g.is_directed() && e.src > e.dst) return;
        if (seen.insert(e.id).second) sorted_edges.push_back(e);
    });
    std::sort(sorted_edges.begin(), sorted_edges.end(),
        [](const Edge& a, const Edge& b) { return a.weight > b.weight; });

    std::unordered_set<NodeId> matched;
    for (auto& e : sorted_edges) {
        if (!matched.count(e.src) && !matched.count(e.dst)) {
            res.edges.push_back({e.src, e.dst});
            matched.insert(e.src);
            matched.insert(e.dst);
        }
    }
    return res;
}

bool has_perfect_matching(const Graph& g,
    const std::unordered_set<NodeId>& left,
    const std::unordered_set<NodeId>& right) {
    auto m = bipartite_matching(g, left, right);
    return m.size() == std::min(left.size(), right.size());
}

size_t matching_number(const Graph& g) {
    return greedy_matching(g).size();
}

Graph matching_to_graph(const MatchingResult& m, GraphType type) {
    Graph g(type);
    std::unordered_set<NodeId> nodes;
    for (auto& [u, v] : m.edges) {
        if (!nodes.count(u)) { g.add_node_with_id(u); nodes.insert(u); }
        if (!nodes.count(v)) { g.add_node_with_id(v); nodes.insert(v); }
        g.add_edge(u, v);
    }
    return g;
}

} // namespace cryo