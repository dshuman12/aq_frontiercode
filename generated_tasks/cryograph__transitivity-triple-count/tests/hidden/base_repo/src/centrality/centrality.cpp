#include "centrality/centrality.hpp"
#include <algorithm>
#include <cmath>
#include <numeric>
#include <queue>
#include <stack>
#include <vector>

namespace cryo {

CentralityMap degree_centrality(const Graph& g) {
    CentralityMap cm;
    double n = static_cast<double>(g.node_count());
    double denom = (n > 1) ? n - 1.0 : 1.0;
    for (auto nid : g.node_ids()) {
        cm[nid] = static_cast<double>(g.degree(nid)) / denom;
    }
    return cm;
}

CentralityMap in_degree_centrality(const Graph& g) {
    CentralityMap cm;
    double n = static_cast<double>(g.node_count());
    double denom = (n > 1) ? n - 1.0 : 1.0;
    for (auto nid : g.node_ids()) {
        cm[nid] = static_cast<double>(g.in_degree(nid)) / denom;
    }
    return cm;
}

CentralityMap out_degree_centrality(const Graph& g) {
    CentralityMap cm;
    double n = static_cast<double>(g.node_count());
    double denom = (n > 1) ? n - 1.0 : 1.0;
    for (auto nid : g.node_ids()) {
        cm[nid] = static_cast<double>(g.out_degree(nid)) / denom;
    }
    return cm;
}

CentralityMap betweenness_centrality(const Graph& g, bool normalized) {
    CentralityMap cm;
    auto ids = g.node_ids();
    size_t n = ids.size();
    if (n == 0) return cm;

    // Build NodeId -> index mapping for O(1) vector access
    std::unordered_map<NodeId, size_t> id_to_idx;
    id_to_idx.reserve(n);
    for (size_t i = 0; i < n; i++) id_to_idx[ids[i]] = i;

    std::vector<double> bc(n, 0.0);

    // Reusable vectors to avoid per-source hash map allocation
    std::vector<double> sigma(n);
    std::vector<double> dist(n);
    std::vector<double> delta(n);
    std::vector<std::vector<size_t>> preds(n);

    for (size_t si = 0; si < n; si++) {
        NodeId s = ids[si];

        // Reset
        for (size_t i = 0; i < n; i++) {
            sigma[i] = 0.0;
            dist[i] = -1.0;
            delta[i] = 0.0;
            preds[i].clear();
        }
        sigma[si] = 1.0;
        dist[si] = 0.0;

        std::stack<size_t> order;
        std::queue<size_t> q;
        q.push(si);

        while (!q.empty()) {
            size_t vi = q.front();
            q.pop();
            order.push(vi);

            for (auto& e : g.out_edges(ids[vi])) {
                size_t wi = id_to_idx[e.dst];
                if (dist[wi] < 0) {
                    q.push(wi);
                    dist[wi] = dist[vi] + 1.0;
                }
                if (dist[wi] == dist[vi] + 1.0) {
                    sigma[wi] += sigma[vi];
                    preds[wi].push_back(vi);
                }
            }
        }

        while (!order.empty()) {
            size_t wi = order.top();
            order.pop();
            for (auto vi : preds[wi]) {
                delta[vi] += (sigma[vi] / sigma[wi]) * (1.0 + delta[wi]);
            }
            if (wi != si) bc[wi] += delta[wi];
        }
    }

    for (size_t i = 0; i < n; i++) cm[ids[i]] = bc[i];

    if (!g.is_directed()) {
        for (auto& [nid, val] : cm) val /= 2.0;
    }

    if (normalized) {
        double nd = static_cast<double>(n);
        double denom = (nd > 2) ? (nd - 1.0) * (nd - 2.0) : 1.0;
        if (!g.is_directed()) denom /= 2.0;
        for (auto& [nid, val] : cm) val /= denom;
    }

    return cm;
}

CentralityMap closeness_centrality(const Graph& g, bool normalized) {
    CentralityMap cm;
    auto ids = g.node_ids();

    for (auto s : ids) {
        std::unordered_map<NodeId, double> dist;
        for (auto v : ids) dist[v] = -1.0;
        dist[s] = 0.0;

        std::queue<NodeId> q;
        q.push(s);

        while (!q.empty()) {
            NodeId v = q.front();
            q.pop();
            for (auto& e : g.out_edges(v)) {
                if (dist[e.dst] < 0) {
                    dist[e.dst] = dist[v] + 1.0;
                    q.push(e.dst);
                }
            }
        }

        double total = 0.0;
        size_t reachable = 0;
        for (auto v : ids) {
            if (v != s && dist[v] > 0) {
                total += dist[v];
                reachable++;
            }
        }

        if (reachable > 0 && total > 0) {
            cm[s] = static_cast<double>(reachable) / total;
            if (normalized) {
                cm[s] *= static_cast<double>(reachable) / (ids.size() - 1.0);
            }
        } else {
            cm[s] = 0.0;
        }
    }
    return cm;
}

CentralityMap pagerank(const Graph& g, double damping,
                       size_t max_iter, double tol) {
    CentralityMap pr;
    auto ids = g.node_ids();
    size_t sz = ids.size();
    double n = static_cast<double>(sz);
    if (n == 0) return pr;

    // Cache out_degree for all nodes once
    std::vector<size_t> out_deg(sz);
    std::unordered_map<NodeId, size_t> id_to_idx;
    id_to_idx.reserve(sz);
    for (size_t i = 0; i < sz; i++) {
        id_to_idx[ids[i]] = i;
        out_deg[i] = g.out_degree(ids[i]);
    }

    // Use vectors for PR values
    std::vector<double> pr_vec(sz, 1.0 / n);
    std::vector<double> new_pr_vec(sz);

    for (size_t iter = 0; iter < max_iter; iter++) {
        double dangling_sum = 0.0;
        for (size_t i = 0; i < sz; i++) {
            if (out_deg[i] == 0) dangling_sum += pr_vec[i];
        }

        double base = (1.0 - damping + damping * dangling_sum) / n;
        for (size_t i = 0; i < sz; i++) new_pr_vec[i] = base;

        for (size_t i = 0; i < sz; i++) {
            if (out_deg[i] == 0) continue;
            double contrib = damping * pr_vec[i] / static_cast<double>(out_deg[i]);
            for (auto& e : g.out_edges(ids[i])) {
                new_pr_vec[id_to_idx[e.dst]] += contrib;
            }
        }

        double diff = 0.0;
        for (size_t i = 0; i < sz; i++) {
            diff += std::fabs(new_pr_vec[i] - pr_vec[i]);
        }
        std::swap(pr_vec, new_pr_vec);
        if (diff < tol) break;
    }

    for (size_t i = 0; i < sz; i++) pr[ids[i]] = pr_vec[i];
    return pr;
}

CentralityMap eigenvector_centrality(const Graph& g, size_t max_iter, double tol) {
    CentralityMap ec;
    auto ids = g.node_ids();
    if (ids.empty()) return ec;

    for (auto nid : ids) ec[nid] = 1.0;

    for (size_t iter = 0; iter < max_iter; iter++) {
        CentralityMap new_ec;
        for (auto nid : ids) new_ec[nid] = 0.0;

        for (auto nid : ids) {
            for (auto& e : g.out_edges(nid)) {
                new_ec[e.dst] += ec[nid];
            }
        }

        double norm = 0.0;
        for (auto& [nid, val] : new_ec) norm += val * val;
        norm = std::sqrt(norm);
        if (norm < 1e-15) break;

        double diff = 0.0;
        for (auto nid : ids) {
            new_ec[nid] /= norm;
            diff += std::fabs(new_ec[nid] - ec[nid]);
        }
        ec = std::move(new_ec);
        if (diff < tol) break;
    }
    return ec;
}

CentralityMap harmonic_centrality(const Graph& g) {
    CentralityMap cm;
    auto ids = g.node_ids();

    for (auto s : ids) {
        std::unordered_map<NodeId, double> dist;
        for (auto v : ids) dist[v] = -1.0;
        dist[s] = 0.0;

        std::queue<NodeId> q;
        q.push(s);

        while (!q.empty()) {
            NodeId v = q.front();
            q.pop();
            for (auto& e : g.out_edges(v)) {
                if (dist[e.dst] < 0) {
                    dist[e.dst] = dist[v] + 1.0;
                    q.push(e.dst);
                }
            }
        }

        double sum = 0.0;
        for (auto v : ids) {
            if (v != s && dist[v] > 0) {
                sum += 1.0 / dist[v];
            }
        }
        cm[s] = sum;
    }
    return cm;
}

NodeId max_centrality_node(const CentralityMap& cm) {
    NodeId best = INVALID_NODE;
    double best_val = -1.0;
    for (auto& [nid, val] : cm) {
        if (val > best_val) {
            best_val = val;
            best = nid;
        }
    }
    return best;
}

NodeId min_centrality_node(const CentralityMap& cm) {
    NodeId best = INVALID_NODE;
    double best_val = std::numeric_limits<double>::max();
    for (auto& [nid, val] : cm) {
        if (val < best_val) {
            best_val = val;
            best = nid;
        }
    }
    return best;
}

CentralityMap normalize_centrality(const CentralityMap& cm) {
    double max_val = 0.0;
    for (auto& [_, val] : cm) max_val = std::max(max_val, val);
    CentralityMap result;
    if (max_val < 1e-15) return cm;
    for (auto& [nid, val] : cm) result[nid] = val / max_val;
    return result;
}

CentralityMap load_centrality(const Graph& g) {
    CentralityMap cm;
    auto ids = g.node_ids();
    for (auto nid : ids) {
        size_t count = 0;
        for (auto& e : g.out_edges(nid)) {
            count += g.out_degree(e.dst);
        }
        cm[nid] = static_cast<double>(count);
    }
    return cm;
}

CentralityMap stress_centrality(const Graph& g) {
    CentralityMap cm;
    auto ids = g.node_ids();
    size_t n = ids.size();
    if (n == 0) return cm;

    std::unordered_map<NodeId, size_t> id_to_idx;
    for (size_t i = 0; i < n; i++) id_to_idx[ids[i]] = i;
    for (auto nid : ids) cm[nid] = 0.0;

    std::vector<double> sigma(n), dist(n);

    for (size_t si = 0; si < n; si++) {
        for (size_t i = 0; i < n; i++) { sigma[i] = 0; dist[i] = -1; }
        sigma[si] = 1; dist[si] = 0;

        std::stack<size_t> order;
        std::queue<size_t> q;
        q.push(si);

        while (!q.empty()) {
            size_t vi = q.front(); q.pop();
            order.push(vi);
            for (auto& e : g.out_edges(ids[vi])) {
                size_t wi = id_to_idx[e.dst];
                if (dist[wi] < 0) { q.push(wi); dist[wi] = dist[vi] + 1; }
                if (dist[wi] == dist[vi] + 1) sigma[wi] += sigma[vi];
            }
        }

        while (!order.empty()) {
            size_t wi = order.top(); order.pop();
            if (wi != si && sigma[wi] > 0) {
                cm[ids[wi]] += sigma[wi];
            }
        }
    }
    return cm;
}

CentralityMap current_flow_closeness_approx(const Graph& g) {
    return closeness_centrality(g, true);
}

std::unordered_map<EdgeId, double> edge_betweenness(const Graph& g) {
    std::unordered_map<EdgeId, double> eb;
    auto ids = g.node_ids();
    size_t n = ids.size();
    if (n == 0) return eb;

    std::unordered_map<NodeId, size_t> id_to_idx;
    for (size_t i = 0; i < n; i++) id_to_idx[ids[i]] = i;

    std::vector<double> sigma(n), dist(n), delta(n);
    std::vector<std::vector<size_t>> preds(n);

    for (size_t si = 0; si < n; si++) {
        for (size_t i = 0; i < n; i++) {
            sigma[i] = 0; dist[i] = -1; delta[i] = 0; preds[i].clear();
        }
        sigma[si] = 1; dist[si] = 0;

        std::stack<size_t> order;
        std::queue<size_t> q;
        q.push(si);

        while (!q.empty()) {
            size_t vi = q.front(); q.pop();
            order.push(vi);
            for (auto& e : g.out_edges(ids[vi])) {
                size_t wi = id_to_idx[e.dst];
                if (dist[wi] < 0) { q.push(wi); dist[wi] = dist[vi] + 1; }
                if (dist[wi] == dist[vi] + 1) { sigma[wi] += sigma[vi]; preds[wi].push_back(vi); }
            }
        }

        while (!order.empty()) {
            size_t wi = order.top(); order.pop();
            for (auto vi : preds[wi]) {
                double c = (sigma[vi] / sigma[wi]) * (1.0 + delta[wi]);
                delta[vi] += c;

                const Edge* edge = g.get_edge(ids[vi], ids[wi]);
                if (edge) eb[edge->id] += c;
            }
        }
    }

    if (!g.is_directed()) {
        for (auto& [_, v] : eb) v /= 2.0;
    }
    return eb;
}

double centralization(const CentralityMap& cm) {
    if (cm.size() <= 1) return 0.0;
    double max_val = -1;
    for (auto& [_, v] : cm) max_val = std::max(max_val, v);
    double sum_diff = 0;
    for (auto& [_, v] : cm) sum_diff += max_val - v;
    double n = static_cast<double>(cm.size());
    double max_possible = (n - 1) * max_val;
    return max_possible > 1e-15 ? sum_diff / max_possible : 0.0;
}

} // namespace cryo