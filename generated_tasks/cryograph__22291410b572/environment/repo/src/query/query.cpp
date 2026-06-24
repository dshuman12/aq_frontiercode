#include "query/query.hpp"
#include <algorithm>
#include <queue>
#include <stack>
#include <unordered_set>

namespace cryo {

std::vector<NodeId> filter_nodes(const Graph& g, NodePredicate pred) {
    std::vector<NodeId> result;
    for (auto nid : g.node_ids()) {
        if (pred(nid, g)) result.push_back(nid);
    }
    return result;
}

std::vector<Edge> filter_edges(const Graph& g, EdgePredicate pred) {
    std::vector<Edge> result;
    g.for_each_edge([&](const Edge& e) {
        if (pred(e, g)) result.push_back(e);
    });
    return result;
}

Graph induced_subgraph(const Graph& g, NodePredicate pred) {
    std::unordered_set<NodeId> keep;
    for (auto nid : g.node_ids()) {
        if (pred(nid, g)) keep.insert(nid);
    }
    return g.subgraph(keep);
}

bool reachable(const Graph& g, NodeId src, NodeId dst) {
    if (src == dst) return g.has_node(src);
    if (!g.has_node(src) || !g.has_node(dst)) return false;

    std::queue<NodeId> q;
    std::unordered_set<NodeId> visited;
    q.push(src);
    visited.insert(src);

    while (!q.empty()) {
        NodeId cur = q.front();
        q.pop();
        for (auto& e : g.out_edges(cur)) {
            if (e.dst == dst) return true;
            if (visited.insert(e.dst).second) q.push(e.dst);
        }
    }
    return false;
}

std::vector<std::vector<NodeId>> all_paths(const Graph& g, NodeId src, NodeId dst,
                                            size_t max_depth) {
    std::vector<std::vector<NodeId>> result;
    if (!g.has_node(src) || !g.has_node(dst)) return result;

    struct Frame {
        NodeId node;
        size_t edge_idx;
    };

    std::stack<Frame> stk;
    std::vector<NodeId> current_path;
    std::unordered_set<NodeId> on_path;

    stk.push({src, 0});
    current_path.push_back(src);
    on_path.insert(src);

    while (!stk.empty()) {
        auto& frame = stk.top();
        auto& edges = g.out_edges(frame.node);

        if (frame.node == dst && frame.node != src) {
            result.push_back(current_path);
            current_path.pop_back();
            on_path.erase(frame.node);
            stk.pop();
            continue;
        }

        if (frame.edge_idx < edges.size() && current_path.size() <= max_depth) {
            NodeId next = edges[frame.edge_idx].dst;
            frame.edge_idx++;

            if (!on_path.count(next)) {
                stk.push({next, 0});
                current_path.push_back(next);
                on_path.insert(next);
            }
        } else {
            current_path.pop_back();
            on_path.erase(frame.node);
            stk.pop();
        }

        if (result.size() >= 1000) break;
    }
    return result;
}

std::vector<NodeId> find_path(const Graph& g, NodeId src, NodeId dst) {
    if (src == dst && g.has_node(src)) return {src};
    if (!g.has_node(src) || !g.has_node(dst)) return {};

    std::queue<NodeId> q;
    std::unordered_map<NodeId, NodeId> parent;
    q.push(src);
    parent[src] = INVALID_NODE;

    while (!q.empty()) {
        NodeId cur = q.front();
        q.pop();
        for (auto& e : g.out_edges(cur)) {
            if (parent.count(e.dst)) continue;
            parent[e.dst] = cur;
            if (e.dst == dst) {
                std::vector<NodeId> path;
                NodeId c = dst;
                while (c != INVALID_NODE) {
                    path.push_back(c);
                    c = parent[c];
                }
                std::reverse(path.begin(), path.end());
                return path;
            }
            q.push(e.dst);
        }
    }
    return {};
}

size_t count_paths(const Graph& g, NodeId src, NodeId dst, size_t max_depth) {
    auto paths = all_paths(g, src, dst, max_depth);
    return paths.size();
}

std::vector<NodeId> common_neighbors(const Graph& g, NodeId a, NodeId b) {
    auto na = g.neighbors(a);
    auto nb = g.neighbors(b);
    std::unordered_set<NodeId> nb_set(nb.begin(), nb.end());
    std::vector<NodeId> result;
    for (auto nid : na) {
        if (nb_set.count(nid)) result.push_back(nid);
    }
    std::sort(result.begin(), result.end());
    return result;
}

MotifResult find_triangles(const Graph& g, size_t max_results) {
    MotifResult result;
    result.triangle_count = 0;
    auto ids = g.node_ids();

    for (size_t i = 0; i < ids.size(); i++) {
        NodeId u = ids[i];
        auto u_nbrs = g.neighbors(u);
        std::unordered_set<NodeId> u_set(u_nbrs.begin(), u_nbrs.end());

        for (auto v : u_nbrs) {
            if (v <= u) continue;
            for (auto w : g.neighbors(v)) {
                if (w <= v) continue;
                if (u_set.count(w)) {
                    result.triangle_count++;
                    if (result.triangles.size() < max_results) {
                        result.triangles.push_back({u, v, w});
                    }
                }
            }
        }

        if (result.triangle_count > max_results * 10) break;
    }
    return result;
}

std::vector<NodeId> k_hop_neighbors(const Graph& g, NodeId src, size_t k) {
    if (!g.has_node(src)) return {};
    std::unordered_set<NodeId> visited;
    std::queue<std::pair<NodeId, size_t>> q;
    q.push({src, 0});
    visited.insert(src);

    std::vector<NodeId> result;
    while (!q.empty()) {
        auto [cur, depth] = q.front();
        q.pop();
        if (depth > 0) result.push_back(cur);
        if (depth >= k) continue;
        for (auto& e : g.out_edges(cur)) {
            if (visited.insert(e.dst).second) {
                q.push({e.dst, depth + 1});
            }
        }
    }
    std::sort(result.begin(), result.end());
    return result;
}

double jaccard_similarity(const Graph& g, NodeId a, NodeId b) {
    auto na = g.neighbors(a);
    auto nb = g.neighbors(b);
    std::unordered_set<NodeId> sa(na.begin(), na.end());
    std::unordered_set<NodeId> sb(nb.begin(), nb.end());
    size_t intersect = 0;
    for (auto n : sa) {
        if (sb.count(n)) intersect++;
    }
    size_t union_size = sa.size() + sb.size() - intersect;
    if (union_size == 0) return 0.0;
    return static_cast<double>(intersect) / static_cast<double>(union_size);
}

size_t graph_diameter_approx(const Graph& g, size_t samples) {
    auto ids = g.node_ids();
    if (ids.size() <= 1) return 0;
    size_t max_dist = 0;
    size_t step = std::max((size_t)1, ids.size() / samples);
    for (size_t i = 0; i < ids.size(); i += step) {
        auto nhood = k_hop_neighbors(g, ids[i], ids.size());
        max_dist = std::max(max_dist, nhood.size());
    }
    return max_dist;
}

} // namespace cryo