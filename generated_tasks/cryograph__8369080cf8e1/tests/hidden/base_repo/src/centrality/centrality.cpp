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
    for (auto nid : ids) cm[nid] = 0.0;

    for (auto s : ids) {
        std::stack<NodeId> order;
        std::unordered_map<NodeId, std::vector<NodeId>> predecessors;
        std::unordered_map<NodeId, double> sigma;
        std::unordered_map<NodeId, double> dist;

        for (auto v : ids) {
            sigma[v] = 0.0;
            dist[v] = -1.0;
        }
        sigma[s] = 1.0;
        dist[s] = 0.0;

        std::queue<NodeId> q;
        q.push(s);

        while (!q.empty()) {
            NodeId v = q.front();
            q.pop();
            order.push(v);

            for (auto& e : g.out_edges(v)) {
                NodeId w = e.dst;
                if (dist[w] < 0) {
                    q.push(w);
                    dist[w] = dist[v] + 1.0;
                }
                if (dist[w] == dist[v] + 1.0) {
                    sigma[w] += sigma[v];
                    predecessors[w].push_back(v);
                }
            }
        }

        std::unordered_map<NodeId, double> delta;
        for (auto v : ids) delta[v] = 0.0;

        while (!order.empty()) {
            NodeId w = order.top();
            order.pop();
            for (auto v : predecessors[w]) {
                delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w]);
            }
            if (w != s) cm[w] += delta[w];
        }
    }

    if (!g.is_directed()) {
        for (auto& [nid, val] : cm) val /= 2.0;
    }

    if (normalized) {
        double n = static_cast<double>(ids.size());
        double denom = (n > 2) ? (n - 1.0) * (n - 2.0) : 1.0;
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
    double n = static_cast<double>(ids.size());
    if (n == 0) return pr;

    double init_val = 1.0 / n;
    for (auto nid : ids) pr[nid] = init_val;

    for (size_t iter = 0; iter < max_iter; iter++) {
        CentralityMap new_pr;
        double dangling_sum = 0.0;

        for (auto nid : ids) {
            if (g.out_degree(nid) == 0) {
                dangling_sum += pr[nid];
            }
        }

        double base = (1.0 - damping + damping * dangling_sum) / n;

        for (auto nid : ids) new_pr[nid] = base;

        for (auto nid : ids) {
            double contrib = damping * pr[nid] / static_cast<double>(g.out_degree(nid));
            if (g.out_degree(nid) == 0) continue;
            for (auto& e : g.out_edges(nid)) {
                new_pr[e.dst] += contrib;
            }
        }

        double diff = 0.0;
        for (auto nid : ids) {
            diff += std::fabs(new_pr[nid] - pr[nid]);
        }
        pr = std::move(new_pr);
        if (diff < tol) break;
    }
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

} // namespace cryo