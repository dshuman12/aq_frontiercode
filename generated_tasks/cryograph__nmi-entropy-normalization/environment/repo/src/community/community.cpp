#include "community/community.hpp"
#include <algorithm>
#include <cmath>
#include <numeric>
#include <random>
#include <set>

namespace cryo {

double CommunityResult::modularity(const Graph& g) const {
    return compute_modularity(g, assignment);
}

double compute_modularity(const Graph& g, const std::unordered_map<NodeId, size_t>& assignment) {
    size_t m2 = 0;
    g.for_each_edge([&](const Edge&) { m2++; });
    if (m2 == 0) return 0.0;
    double m = static_cast<double>(m2) / (g.is_directed() ? 1.0 : 2.0);

    double Q = 0.0;
    g.for_each_edge([&](const Edge& e) {
        if (!g.is_directed() && e.src > e.dst) return;
        auto it_s = assignment.find(e.src);
        auto it_d = assignment.find(e.dst);
        if (it_s == assignment.end() || it_d == assignment.end()) return;
        if (it_s->second == it_d->second) {
            double ki = static_cast<double>(g.degree(e.src));
            double kj = static_cast<double>(g.degree(e.dst));
            Q += 1.0 - (ki * kj) / (2.0 * m);
        }
    });
    return Q / m;
}

CommunityResult louvain(const Graph& g, size_t max_iter) {
    CommunityResult res;
    auto ids = g.node_ids();
    if (ids.empty()) { res.num_communities = 0; return res; }

    for (auto nid : ids) res.assignment[nid] = nid;

    size_t m2 = 0;
    g.for_each_edge([&](const Edge&) { m2++; });
    double m = static_cast<double>(m2) / (g.is_directed() ? 1.0 : 2.0);
    if (m < 1e-12) {
        res.num_communities = ids.size();
        return res;
    }

    for (size_t iter = 0; iter < max_iter; iter++) {
        bool changed = false;
        for (auto nid : ids) {
            std::unordered_map<size_t, double> comm_weight;
            for (auto& e : g.out_edges(nid)) {
                comm_weight[res.assignment[e.dst]] += e.weight;
            }
            if (!g.is_directed()) {
                for (auto& e : g.in_edges(nid)) {
                    comm_weight[res.assignment[e.src]] += e.weight;
                }
            }

            size_t best_comm = res.assignment[nid];
            double best_gain = 0.0;
            for (auto& [comm, w] : comm_weight) {
                if (w > best_gain) {
                    best_gain = w;
                    best_comm = comm;
                }
            }
            if (best_comm != res.assignment[nid]) {
                res.assignment[nid] = best_comm;
                changed = true;
            }
        }
        if (!changed) break;
    }

    std::unordered_map<size_t, size_t> label_remap;
    size_t next = 0;
    for (auto& [nid, label] : res.assignment) {
        if (!label_remap.count(label)) label_remap[label] = next++;
        res.assignment[nid] = label_remap[label];
    }
    res.num_communities = next;
    res.communities.resize(next);
    for (auto& [nid, label] : res.assignment) {
        res.communities[label].push_back(nid);
    }
    for (auto& c : res.communities) std::sort(c.begin(), c.end());
    return res;
}

CommunityResult community_label_propagation(const Graph& g, size_t max_iter, uint64_t seed) {
    CommunityResult res;
    auto ids = g.node_ids();
    if (ids.empty()) { res.num_communities = 0; return res; }

    std::mt19937_64 rng(seed);
    for (size_t i = 0; i < ids.size(); i++) res.assignment[ids[i]] = i;

    for (size_t iter = 0; iter < max_iter; iter++) {
        bool changed = false;
        auto shuffled = ids;
        std::shuffle(shuffled.begin(), shuffled.end(), rng);

        for (auto nid : shuffled) {
            std::unordered_map<size_t, size_t> label_count;
            for (auto& e : g.out_edges(nid)) label_count[res.assignment[e.dst]]++;
            if (!g.is_directed()) {
                for (auto& e : g.in_edges(nid)) label_count[res.assignment[e.src]]++;
            }
            if (label_count.empty()) continue;

            size_t best_label = res.assignment[nid];
            size_t best_count = 0;
            for (auto& [l, c] : label_count) {
                if (c > best_count) { best_count = c; best_label = l; }
            }
            if (best_label != res.assignment[nid]) {
                res.assignment[nid] = best_label;
                changed = true;
            }
        }
        if (!changed) break;
    }

    std::unordered_map<size_t, size_t> remap;
    size_t next = 0;
    for (auto& [nid, l] : res.assignment) {
        if (!remap.count(l)) remap[l] = next++;
        res.assignment[nid] = remap[l];
    }
    res.num_communities = next;
    res.communities.resize(next);
    for (auto& [nid, l] : res.assignment) res.communities[l].push_back(nid);
    for (auto& c : res.communities) std::sort(c.begin(), c.end());
    return res;
}

double normalized_mutual_information(const CommunityResult& a, const CommunityResult& b) {
    if (a.communities.empty() || b.communities.empty()) return 0.0;
    size_t n = 0;
    for (auto& c : a.communities) n += c.size();
    if (n == 0) return 0.0;

    double ha = 0, hb = 0, hab = 0;
    for (auto& ca : a.communities) {
        double pa = static_cast<double>(ca.size()) / n;
        if (pa > 0) ha -= pa * std::log2(pa);
    }
    for (auto& cb : b.communities) {
        double pb = static_cast<double>(cb.size()) / n;
        if (pb > 0) hb -= pb * std::log2(pb);
    }

    for (auto& ca : a.communities) {
        std::unordered_set<NodeId> sa(ca.begin(), ca.end());
        for (auto& cb : b.communities) {
            size_t overlap = 0;
            for (auto nid : cb) { if (sa.count(nid)) overlap++; }
            if (overlap > 0) {
                double pab = static_cast<double>(overlap) / n;
                double pa = static_cast<double>(ca.size()) / n;
                double pb = static_cast<double>(cb.size()) / n;
                hab += pab * std::log2(pab / (pa * pb));
            }
        }
    }
    double denom = (ha + hb);
    return denom > 1e-12 ? hab / denom : 0.0;
}

size_t num_inter_community_edges(const Graph& g, const CommunityResult& cr) {
    size_t count = 0;
    g.for_each_edge([&](const Edge& e) {
        if (!g.is_directed() && e.src > e.dst) return;
        auto it_s = cr.assignment.find(e.src);
        auto it_d = cr.assignment.find(e.dst);
        if (it_s != cr.assignment.end() && it_d != cr.assignment.end()) {
            if (it_s->second != it_d->second) count++;
        }
    });
    return count;
}

} // namespace cryo