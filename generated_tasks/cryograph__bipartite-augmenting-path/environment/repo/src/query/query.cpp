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
    if (!g.has_node(src) || !g.has_node(dst)) return 0;
    if (src == dst) return 1;

    size_t count = 0;
    struct Frame {
        NodeId node;
        size_t edge_idx;
    };

    std::stack<Frame> stk;
    std::unordered_set<NodeId> on_path;
    stk.push({src, 0});
    on_path.insert(src);

    while (!stk.empty()) {
        auto& frame = stk.top();
        auto& edges = g.out_edges(frame.node);

        if (frame.edge_idx < edges.size() && stk.size() <= max_depth) {
            NodeId next = edges[frame.edge_idx].dst;
            frame.edge_idx++;

            if (next == dst) {
                count++;
                if (count >= 1000) break;
            } else if (!on_path.count(next)) {
                on_path.insert(next);
                stk.push({next, 0});
            }
        } else {
            on_path.erase(frame.node);
            stk.pop();
        }
    }
    return count;
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

    // Pre-compute sorted neighbor lists for binary search intersection
    std::unordered_map<NodeId, std::vector<NodeId>> sorted_nbrs;
    for (auto nid : ids) {
        auto nbrs = g.neighbors(nid);
        std::sort(nbrs.begin(), nbrs.end());
        sorted_nbrs[nid] = std::move(nbrs);
    }

    for (size_t i = 0; i < ids.size(); i++) {
        NodeId u = ids[i];
        auto& u_nbrs = sorted_nbrs[u];

        for (auto v : u_nbrs) {
            if (v <= u) continue;
            auto& v_nbrs = sorted_nbrs[v];
            // Set intersection using sorted lists
            size_t ai = 0, bi = 0;
            while (ai < u_nbrs.size() && bi < v_nbrs.size()) {
                NodeId a = u_nbrs[ai], b = v_nbrs[bi];
                if (a == b) {
                    if (a > v) {
                        result.triangle_count++;
                        if (result.triangles.size() < max_results) {
                            result.triangles.push_back({u, v, a});
                        }
                    }
                    ai++; bi++;
                } else if (a < b) {
                    ai++;
                } else {
                    bi++;
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
        // BFS to find actual max distance from this node
        std::unordered_map<NodeId, size_t> dist;
        std::queue<NodeId> q;
        q.push(ids[i]);
        dist[ids[i]] = 0;
        while (!q.empty()) {
            NodeId cur = q.front();
            q.pop();
            for (auto& e : g.out_edges(cur)) {
                if (!dist.count(e.dst)) {
                    dist[e.dst] = dist[cur] + 1;
                    q.push(e.dst);
                }
            }
        }
        for (auto& [_, d] : dist) {
            max_dist = std::max(max_dist, d);
        }
    }
    return max_dist;
}

NeighborhoodProfile neighborhood_profile(const Graph& g, NodeId src) {
    NeighborhoodProfile np;
    np.effective_diameter = 0;
    np.avg_expansion_rate = 0.0;

    if (!g.has_node(src)) return np;

    std::unordered_map<NodeId, size_t> dist;
    std::queue<NodeId> q;
    dist[src] = 0;
    q.push(src);

    while (!q.empty()) {
        NodeId cur = q.front(); q.pop();
        for (auto& e : g.out_edges(cur)) {
            if (!dist.count(e.dst)) {
                dist[e.dst] = dist[cur] + 1;
                q.push(e.dst);
            }
        }
    }

    size_t max_dist = 0;
    for (auto& [_, d] : dist) max_dist = std::max(max_dist, d);

    np.expansion.resize(max_dist + 1, 0);
    for (auto& [_, d] : dist) np.expansion[d]++;

    size_t total = dist.size();
    size_t ninety = static_cast<size_t>(total * 0.9);
    size_t cumulative = 0;
    for (size_t i = 0; i < np.expansion.size(); i++) {
        cumulative += np.expansion[i];
        if (cumulative >= ninety && np.effective_diameter == 0) {
            np.effective_diameter = i;
        }
    }

    if (np.expansion.size() > 1) {
        double rate_sum = 0;
        size_t count = 0;
        size_t prev = np.expansion[0];
        for (size_t i = 1; i < np.expansion.size(); i++) {
            if (prev > 0) {
                rate_sum += static_cast<double>(np.expansion[i]) / prev;
                count++;
            }
            prev = np.expansion[i];
        }
        np.avg_expansion_rate = count > 0 ? rate_sum / count : 0.0;
    }

    return np;
}

std::vector<NodeId> closed_neighborhood(const Graph& g, NodeId nid) {
    auto nbrs = g.neighbors(nid);
    nbrs.push_back(nid);
    std::sort(nbrs.begin(), nbrs.end());
    return nbrs;
}

double neighborhood_overlap(const Graph& g, NodeId u, NodeId v) {
    auto nu = g.neighbors(u);
    auto nv = g.neighbors(v);
    std::unordered_set<NodeId> su(nu.begin(), nu.end());
    su.erase(v);
    std::unordered_set<NodeId> sv(nv.begin(), nv.end());
    sv.erase(u);

    size_t intersect = 0;
    for (auto n : su) { if (sv.count(n)) intersect++; }
    size_t union_sz = su.size() + sv.size() - intersect;
    return union_sz > 0 ? static_cast<double>(intersect) / union_sz : 0.0;
}

Graph ego_graph(const Graph& g, NodeId center, size_t radius) {
    auto nbrs = k_hop_neighbors(g, center, radius);
    std::unordered_set<NodeId> keep(nbrs.begin(), nbrs.end());
    keep.insert(center);
    return g.subgraph(keep);
}

std::vector<std::pair<NodeId, NodeId>> non_edges(const Graph& g, size_t max_count) {
    std::vector<std::pair<NodeId, NodeId>> result;
    auto ids = g.node_ids();
    for (size_t i = 0; i < ids.size() && result.size() < max_count; i++) {
        for (size_t j = i + 1; j < ids.size() && result.size() < max_count; j++) {
            if (!g.has_edge(ids[i], ids[j]) && !g.has_edge(ids[j], ids[i])) {
                result.push_back({ids[i], ids[j]});
            }
        }
    }
    return result;
}

} // namespace cryo