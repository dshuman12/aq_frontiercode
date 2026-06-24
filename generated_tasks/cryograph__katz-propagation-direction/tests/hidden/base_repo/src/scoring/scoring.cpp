#include "scoring/scoring.hpp"
#include <algorithm>
#include <cmath>
#include <random>
#include <unordered_set>

namespace cryo {

HITSResult hits(const Graph& g, size_t max_iter, double tol) {
    HITSResult res;
    auto ids = g.node_ids();
    if (ids.empty()) return res;

    for (auto nid : ids) { res.authority[nid] = 1.0; res.hub[nid] = 1.0; }

    for (size_t iter = 0; iter < max_iter; iter++) {
        ScoreMap new_auth, new_hub;
        for (auto nid : ids) new_auth[nid] = 0.0;
        for (auto nid : ids) {
            for (auto& e : g.out_edges(nid)) {
                new_auth[e.dst] += res.hub[nid];
            }
        }
        double norm = 0;
        for (auto& [_, v] : new_auth) norm += v * v;
        norm = std::sqrt(norm);
        if (norm > 1e-15) for (auto& [_, v] : new_auth) v /= norm;

        for (auto nid : ids) new_hub[nid] = 0.0;
        for (auto nid : ids) {
            for (auto& e : g.out_edges(nid)) {
                new_hub[nid] += new_auth[e.dst];
            }
        }
        norm = 0;
        for (auto& [_, v] : new_hub) norm += v * v;
        norm = std::sqrt(norm);
        if (norm > 1e-15) for (auto& [_, v] : new_hub) v /= norm;

        double diff = 0;
        for (auto nid : ids) {
            diff += std::fabs(new_auth[nid] - res.authority[nid]);
            diff += std::fabs(new_hub[nid] - res.hub[nid]);
        }
        res.authority = std::move(new_auth);
        res.hub = std::move(new_hub);
        if (diff < tol) break;
    }
    return res;
}

ScoreMap katz_centrality(const Graph& g, double alpha, double beta,
                         size_t max_iter, double tol) {
    ScoreMap scores;
    auto ids = g.node_ids();
    for (auto nid : ids) scores[nid] = 0.0;

    ScoreMap prev = scores;
    for (size_t iter = 0; iter < max_iter; iter++) {
        ScoreMap next;
        for (auto nid : ids) next[nid] = beta;
        for (auto nid : ids) {
            for (auto& e : g.out_edges(nid)) {
                next[nid] += alpha * scores[e.dst];
            }
        }
        double diff = 0;
        for (auto nid : ids) diff += std::fabs(next[nid] - scores[nid]);
        scores = std::move(next);
        if (diff < tol) break;
    }
    return scores;
}

std::vector<NodeId> random_walk(const Graph& g, NodeId start, size_t steps, uint64_t seed) {
    std::vector<NodeId> walk;
    if (!g.has_node(start)) return walk;

    std::mt19937_64 rng(seed);
    walk.push_back(start);
    NodeId cur = start;

    for (size_t i = 0; i < steps; i++) {
        auto& edges = g.out_edges(cur);
        if (edges.empty()) break;
        std::uniform_int_distribution<size_t> dist(0, edges.size() - 1);
        cur = edges[dist(rng)].dst;
        walk.push_back(cur);
    }
    return walk;
}

ScoreMap random_walk_scores(const Graph& g, NodeId start, size_t steps, uint64_t seed) {
    auto walk = random_walk(g, start, steps, seed);
    ScoreMap scores;
    for (auto nid : walk) scores[nid]++;
    double total = static_cast<double>(walk.size());
    for (auto& [_, v] : scores) v /= total;
    return scores;
}

ScoreMap link_prediction_adamic_adar(const Graph& g, NodeId u) {
    ScoreMap scores;
    auto u_nbrs = g.neighbors(u);
    std::unordered_set<NodeId> u_set(u_nbrs.begin(), u_nbrs.end());

    for (auto nid : g.node_ids()) {
        if (nid == u || u_set.count(nid)) continue;
        double score = 0.0;
        auto v_nbrs = g.neighbors(nid);
        for (auto w : v_nbrs) {
            if (u_set.count(w)) {
                size_t deg = g.degree(w);
                if (deg > 1) score += 1.0 / std::log(static_cast<double>(deg));
            }
        }
        if (score > 1e-12) scores[nid] = score;
    }
    return scores;
}

ScoreMap link_prediction_preferential(const Graph& g, NodeId u) {
    ScoreMap scores;
    auto u_nbrs = g.neighbors(u);
    std::unordered_set<NodeId> u_set(u_nbrs.begin(), u_nbrs.end());
    double deg_u = static_cast<double>(g.degree(u));

    for (auto nid : g.node_ids()) {
        if (nid == u || u_set.count(nid)) continue;
        scores[nid] = deg_u * static_cast<double>(g.degree(nid));
    }
    return scores;
}

ScoreMap link_prediction_resource_alloc(const Graph& g, NodeId u) {
    ScoreMap scores;
    auto u_nbrs = g.neighbors(u);
    std::unordered_set<NodeId> u_set(u_nbrs.begin(), u_nbrs.end());

    for (auto nid : g.node_ids()) {
        if (nid == u || u_set.count(nid)) continue;
        double score = 0.0;
        auto v_nbrs = g.neighbors(nid);
        for (auto w : v_nbrs) {
            if (u_set.count(w)) {
                size_t deg = g.degree(w);
                if (deg > 0) score += 1.0 / static_cast<double>(deg);
            }
        }
        if (score > 1e-12) scores[nid] = score;
    }
    return scores;
}

double graph_reciprocity(const Graph& g) {
    if (!g.is_directed()) return 1.0;
    size_t mutual = 0, total = 0;
    g.for_each_edge([&](const Edge& e) {
        total++;
        if (g.has_edge(e.dst, e.src)) mutual++;
    });
    return total > 0 ? static_cast<double>(mutual) / total : 0.0;
}

} // namespace cryo