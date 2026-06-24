#include "decomposition/decomposition.hpp"
#include <algorithm>
#include <queue>
#include <set>
#include <numeric>

namespace cryo {

Graph KCoreResult::k_core_subgraph(const Graph& g, size_t k) const {
    std::unordered_set<NodeId> keep;
    for (auto& [nid, c] : coreness) {
        if (c >= k) keep.insert(nid);
    }
    return g.subgraph(keep);
}

KCoreResult k_core_decomposition(const Graph& g) {
    KCoreResult res;
    res.max_k = 0;
    auto ids = g.node_ids();
    if (ids.empty()) return res;

    std::unordered_map<NodeId, size_t> deg;
    for (auto nid : ids) deg[nid] = g.out_degree(nid);

    std::unordered_set<NodeId> removed;

    using PQEntry = std::pair<size_t, NodeId>;
    std::priority_queue<PQEntry, std::vector<PQEntry>, std::greater<PQEntry>> pq;
    for (auto nid : ids) pq.push({deg[nid], nid});

    while (!pq.empty()) {
        auto [d, nid] = pq.top();
        pq.pop();
        if (removed.count(nid)) continue;
        if (d != deg[nid]) continue;

        res.coreness[nid] = d;
        res.max_k = std::max(res.max_k, d);
        removed.insert(nid);

        for (auto& e : g.out_edges(nid)) {
            if (!removed.count(e.dst)) {
                if (deg[e.dst] >= d) {
                    deg[e.dst]--;
                    pq.push({deg[e.dst], e.dst});
                }
            }
        }
    }
    return res;
}

DegreeSequence degree_sequence(const Graph& g) {
    DegreeSequence ds;
    auto ids = g.node_ids();
    ds.sequence.reserve(ids.size());
    for (auto nid : ids) {
        ds.sequence.push_back(g.out_degree(nid));
    }
    std::sort(ds.sequence.begin(), ds.sequence.end(), std::greater<size_t>());

    ds.max_degree = ds.sequence.empty() ? 0 : ds.sequence.front();
    ds.min_degree = ds.sequence.empty() ? 0 : ds.sequence.back();
    ds.degree_sum = std::accumulate(ds.sequence.begin(), ds.sequence.end(), (size_t)0);
    ds.mean_degree = ids.empty() ? 0.0 : static_cast<double>(ds.degree_sum) / ids.size();
    ds.is_graphical = is_graphical_sequence(ds.sequence);
    return ds;
}

bool is_graphical_sequence(std::vector<size_t> seq) {
    if (seq.empty()) return true;
    size_t sum = 0;
    for (auto d : seq) sum += d;
    if (sum % 2 != 0) return false;

    size_t n = seq.size();
    std::sort(seq.begin(), seq.end(), std::greater<size_t>());

    for (size_t k = 1; k <= n; k++) {
        size_t lhs = 0;
        for (size_t i = 0; i < k; i++) lhs += seq[i];
        size_t rhs = k * (k - 1);
        for (size_t i = k; i < n; i++) rhs += std::min(seq[i], k);
        if (lhs > rhs) return false;
    }
    return true;
}

Graph k_degenerate_ordering(const Graph& g, std::vector<NodeId>& order) {
    auto kc = k_core_decomposition(g);
    order.clear();
    std::vector<std::pair<size_t, NodeId>> items;
    for (auto& [nid, c] : kc.coreness) items.push_back({c, nid});
    std::sort(items.begin(), items.end());
    for (auto& [c, nid] : items) order.push_back(nid);
    return kc.k_core_subgraph(g, 0);
}

size_t degeneracy(const Graph& g) {
    return k_core_decomposition(g).max_k;
}

std::vector<NodeId> k_shell(const Graph& g, size_t k) {
    auto kc = k_core_decomposition(g);
    std::vector<NodeId> result;
    for (auto& [nid, c] : kc.coreness) {
        if (c == k) result.push_back(nid);
    }
    std::sort(result.begin(), result.end());
    return result;
}

std::vector<NodeId> vertex_cover_approx(const Graph& g) {
    std::unordered_set<NodeId> cover;
    std::unordered_set<EdgeId> seen;
    g.for_each_edge([&](const Edge& e) {
        if (!g.is_directed() && e.src > e.dst) return;
        if (!seen.insert(e.id).second) return;
        if (!cover.count(e.src) && !cover.count(e.dst)) {
            cover.insert(e.src);
            cover.insert(e.dst);
        }
    });
    std::vector<NodeId> result(cover.begin(), cover.end());
    std::sort(result.begin(), result.end());
    return result;
}

std::vector<NodeId> independent_set_greedy(const Graph& g) {
    auto ids = g.node_ids();
    std::vector<std::pair<size_t, NodeId>> deg_nodes;
    for (auto nid : ids) deg_nodes.push_back({g.degree(nid), nid});
    std::sort(deg_nodes.begin(), deg_nodes.end());

    std::unordered_set<NodeId> iset, excluded;
    for (auto& [d, nid] : deg_nodes) {
        if (excluded.count(nid)) continue;
        iset.insert(nid);
        for (auto& e : g.out_edges(nid)) excluded.insert(e.dst);
        if (!g.is_directed()) {
            for (auto& e : g.in_edges(nid)) excluded.insert(e.src);
        }
    }
    std::vector<NodeId> result(iset.begin(), iset.end());
    std::sort(result.begin(), result.end());
    return result;
}

std::vector<NodeId> dominating_set_greedy(const Graph& g) {
    auto ids = g.node_ids();
    std::unordered_set<NodeId> dominated, dset;

    while (dominated.size() < ids.size()) {
        NodeId best = INVALID_NODE;
        size_t best_gain = 0;
        for (auto nid : ids) {
            if (dset.count(nid)) continue;
            size_t gain = dominated.count(nid) ? 0 : 1;
            for (auto& e : g.out_edges(nid)) {
                if (!dominated.count(e.dst)) gain++;
            }
            if (!g.is_directed()) {
                for (auto& e : g.in_edges(nid)) {
                    if (!dominated.count(e.src)) gain++;
                }
            }
            if (gain > best_gain) { best_gain = gain; best = nid; }
        }
        if (best == INVALID_NODE) break;
        dset.insert(best);
        dominated.insert(best);
        for (auto& e : g.out_edges(best)) dominated.insert(e.dst);
        if (!g.is_directed()) {
            for (auto& e : g.in_edges(best)) dominated.insert(e.src);
        }
    }
    std::vector<NodeId> result(dset.begin(), dset.end());
    std::sort(result.begin(), result.end());
    return result;
}

bool is_vertex_cover(const Graph& g, const std::vector<NodeId>& cover) {
    std::unordered_set<NodeId> cs(cover.begin(), cover.end());
    bool valid = true;
    g.for_each_edge([&](const Edge& e) {
        if (!g.is_directed() && e.src > e.dst) return;
        if (!cs.count(e.src) && !cs.count(e.dst)) valid = false;
    });
    return valid;
}

bool is_independent_set(const Graph& g, const std::vector<NodeId>& iset) {
    std::unordered_set<NodeId> s(iset.begin(), iset.end());
    for (auto nid : iset) {
        for (auto& e : g.out_edges(nid)) {
            if (s.count(e.dst)) return false;
        }
    }
    return true;
}

bool is_dominating_set(const Graph& g, const std::vector<NodeId>& dset) {
    std::unordered_set<NodeId> dominated(dset.begin(), dset.end());
    for (auto nid : dset) {
        for (auto& e : g.out_edges(nid)) dominated.insert(e.dst);
        if (!g.is_directed()) {
            for (auto& e : g.in_edges(nid)) dominated.insert(e.src);
        }
    }
    return dominated.size() == g.node_count();
}

} // namespace cryo