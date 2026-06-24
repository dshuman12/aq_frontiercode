#include "shortest_path/shortest_path.hpp"
#include <algorithm>
#include <cmath>
#include <queue>

namespace cryo {

std::vector<NodeId> PathResult::reconstruct(NodeId target) const {
    if (dist.find(target) == dist.end() || dist.at(target) == INF_WEIGHT)
        return {};
    std::vector<NodeId> path;
    NodeId cur = target;
    while (cur != INVALID_NODE) {
        path.push_back(cur);
        auto it = prev.find(cur);
        if (it == prev.end()) break;
        cur = it->second;
    }
    std::reverse(path.begin(), path.end());
    return path;
}

bool PathResult::reachable(NodeId target) const {
    auto it = dist.find(target);
    return it != dist.end() && it->second != INF_WEIGHT;
}

PathResult dijkstra(const Graph& g, NodeId src) {
    PathResult res;
    if (!g.has_node(src)) return res;

    auto ids = g.node_ids();
    for (auto nid : ids) res.dist[nid] = INF_WEIGHT;
    res.dist[src] = 0.0;
    res.prev[src] = INVALID_NODE;

    using PQEntry = std::pair<double, NodeId>;
    std::priority_queue<PQEntry, std::vector<PQEntry>, std::greater<PQEntry>> pq;
    pq.push({0.0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > res.dist[u]) continue;

        for (auto& e : g.out_edges(u)) {
            double nd = d + e.weight;
            if (nd < res.dist[e.dst]) {
                res.dist[e.dst] = nd;
                res.prev[e.dst] = u;
                pq.push({nd, e.dst});
            }
        }
    }
    return res;
}

PathResult bellman_ford(const Graph& g, NodeId src) {
    PathResult res;
    if (!g.has_node(src)) return res;

    auto ids = g.node_ids();
    for (auto nid : ids) res.dist[nid] = INF_WEIGHT;
    res.dist[src] = 0.0;
    res.prev[src] = INVALID_NODE;

    size_t n = ids.size();
    auto all_edges = g.all_edges();

    for (size_t i = 0; i < n - 1; i++) {
        bool changed = false;
        for (auto& e : all_edges) {
            if (res.dist[e.src] == INF_WEIGHT) continue;
            double nd = res.dist[e.src] + e.weight;
            if (nd < res.dist[e.dst]) {
                res.dist[e.dst] = nd;
                res.prev[e.dst] = e.src;
                changed = true;
            }
        }
        if (!changed) break;
    }

    for (auto& e : all_edges) {
        if (res.dist[e.src] == INF_WEIGHT) continue;
        if (res.dist[e.src] + e.weight < res.dist[e.dst]) {
            throw NegativeCycleError("Negative cycle detected in bellman_ford");
        }
    }

    return res;
}

PathResult astar(const Graph& g, NodeId src, NodeId goal, HeuristicFn h) {
    PathResult res;
    if (!g.has_node(src) || !g.has_node(goal)) return res;

    auto ids = g.node_ids();
    for (auto nid : ids) res.dist[nid] = INF_WEIGHT;
    res.dist[src] = 0.0;
    res.prev[src] = INVALID_NODE;

    using PQEntry = std::pair<double, NodeId>;
    std::priority_queue<PQEntry, std::vector<PQEntry>, std::greater<PQEntry>> open;
    open.push({h(src), src});

    std::unordered_set<NodeId> closed;

    while (!open.empty()) {
        auto [f, u] = open.top();
        open.pop();

        if (u == goal) break;
        if (!closed.insert(u).second) continue;

        for (auto& e : g.out_edges(u)) {
            if (closed.count(e.dst)) continue;
            double tentative = res.dist[u] + e.weight;
            if (tentative < res.dist[e.dst]) {
                res.dist[e.dst] = tentative;
                res.prev[e.dst] = u;
                open.push({tentative + h(e.dst), e.dst});
            }
        }
    }
    return res;
}

std::vector<NodeId> APSPResult::path(NodeId src, NodeId dst) const {
    auto dit = dist.find(src);
    if (dit == dist.end()) return {};
    auto dit2 = dit->second.find(dst);
    if (dit2 == dit->second.end() || dit2->second == INF_WEIGHT) return {};

    std::vector<NodeId> result;
    NodeId cur = src;
    while (cur != dst) {
        result.push_back(cur);
        auto nit = next.find(cur);
        if (nit == next.end()) return {};
        auto nxt = nit->second.find(dst);
        if (nxt == nit->second.end() || nxt->second == INVALID_NODE) return {};
        cur = nxt->second;
    }
    result.push_back(dst);
    return result;
}

bool APSPResult::reachable(NodeId src, NodeId dst) const {
    auto it = dist.find(src);
    if (it == dist.end()) return false;
    auto it2 = it->second.find(dst);
    return it2 != it->second.end() && it2->second != INF_WEIGHT;
}

APSPResult floyd_warshall(const Graph& g) {
    APSPResult res;
    auto ids = g.node_ids();
    size_t n = ids.size();
    if (n == 0) return res;

    // Build NodeId <-> index mapping for O(1) array access
    std::unordered_map<NodeId, size_t> id_to_idx;
    id_to_idx.reserve(n);
    for (size_t i = 0; i < n; i++) id_to_idx[ids[i]] = i;

    // Use flat 2D vectors instead of nested hash maps
    std::vector<double> dist(n * n, INF_WEIGHT);
    std::vector<NodeId> next(n * n, INVALID_NODE);

    for (size_t i = 0; i < n; i++) dist[i * n + i] = 0.0;

    for (size_t i = 0; i < n; i++) {
        for (auto& e : g.out_edges(ids[i])) {
            size_t j = id_to_idx[e.dst];
            if (e.weight < dist[i * n + j]) {
                dist[i * n + j] = e.weight;
                next[i * n + j] = e.dst;
            }
        }
    }

    for (size_t k = 0; k < n; k++) {
        for (size_t i = 0; i < n; i++) {
            double d_ik = dist[i * n + k];
            if (d_ik == INF_WEIGHT) continue;
            for (size_t j = 0; j < n; j++) {
                double d_kj = dist[k * n + j];
                if (d_kj == INF_WEIGHT) continue;
                double through_k = d_ik + d_kj;
                if (through_k < dist[i * n + j]) {
                    dist[i * n + j] = through_k;
                    next[i * n + j] = next[i * n + k];
                }
            }
        }
    }

    // Convert back to APSPResult hash maps
    for (size_t i = 0; i < n; i++) {
        auto& d_row = res.dist[ids[i]];
        auto& n_row = res.next[ids[i]];
        for (size_t j = 0; j < n; j++) {
            d_row[ids[j]] = dist[i * n + j];
            n_row[ids[j]] = next[i * n + j];
        }
    }
    return res;
}

double path_weight(const Graph& g, const std::vector<NodeId>& path) {
    if (path.size() < 2) return 0.0;
    double total = 0.0;
    for (size_t i = 0; i + 1 < path.size(); i++) {
        const Edge* e = g.get_edge(path[i], path[i+1]);
        if (!e) return INF_WEIGHT;
        total += e->weight;
    }
    return total;
}

size_t path_length(const std::vector<NodeId>& path) {
    return path.size() > 0 ? path.size() - 1 : 0;
}

PathResult dijkstra_target(const Graph& g, NodeId src, NodeId target) {
    PathResult res;
    if (!g.has_node(src) || !g.has_node(target)) return res;

    auto ids = g.node_ids();
    for (auto nid : ids) res.dist[nid] = INF_WEIGHT;
    res.dist[src] = 0.0;
    res.prev[src] = INVALID_NODE;

    using PQEntry = std::pair<double, NodeId>;
    std::priority_queue<PQEntry, std::vector<PQEntry>, std::greater<PQEntry>> pq;
    pq.push({0.0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (u == target) break;
        if (d > res.dist[u]) continue;

        for (auto& e : g.out_edges(u)) {
            double nd = d + e.weight;
            if (nd < res.dist[e.dst]) {
                res.dist[e.dst] = nd;
                res.prev[e.dst] = u;
                pq.push({nd, e.dst});
            }
        }
    }
    return res;
}

PathResult multi_source_dijkstra(const Graph& g, const std::vector<NodeId>& sources) {
    PathResult res;
    auto ids = g.node_ids();
    for (auto nid : ids) res.dist[nid] = INF_WEIGHT;

    using PQEntry = std::pair<double, NodeId>;
    std::priority_queue<PQEntry, std::vector<PQEntry>, std::greater<PQEntry>> pq;

    for (auto src : sources) {
        if (g.has_node(src)) {
            res.dist[src] = 0.0;
            res.prev[src] = INVALID_NODE;
            pq.push({0.0, src});
        }
    }

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > res.dist[u]) continue;

        for (auto& e : g.out_edges(u)) {
            double nd = d + e.weight;
            if (nd < res.dist[e.dst]) {
                res.dist[e.dst] = nd;
                res.prev[e.dst] = u;
                pq.push({nd, e.dst});
            }
        }
    }
    return res;
}

std::vector<NodeId> shortest_path(const Graph& g, NodeId src, NodeId dst) {
    auto res = dijkstra_target(g, src, dst);
    return res.reconstruct(dst);
}

double shortest_distance(const Graph& g, NodeId src, NodeId dst) {
    auto res = dijkstra_target(g, src, dst);
    auto it = res.dist.find(dst);
    return (it != res.dist.end()) ? it->second : INF_WEIGHT;
}

bool is_shortest_path(const Graph& g, const std::vector<NodeId>& path) {
    if (path.size() < 2) return true;
    double actual = path_weight(g, path);
    double optimal = shortest_distance(g, path.front(), path.back());
    return std::fabs(actual - optimal) < 1e-9;
}

} // namespace cryo