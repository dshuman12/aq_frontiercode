#include "partition/partitioner.hpp"
#include <algorithm>
#include <numeric>
#include <queue>
#include <random>
#include <set>

namespace cryo {

size_t PartitionResult::edge_cut(const Graph& g) const {
    size_t cut = 0;
    g.for_each_edge([&](const Edge& e) {
        auto it_s = assignment.find(e.src);
        auto it_d = assignment.find(e.dst);
        if (it_s != assignment.end() && it_d != assignment.end()) {
            if (it_s->second != it_d->second) cut++;
        }
    });
    if (!g.is_directed()) cut /= 2;
    return cut;
}

double PartitionResult::balance_ratio() const {
    if (parts.empty()) return 1.0;
    size_t max_size = 0, min_size = SIZE_MAX;
    for (auto& p : parts) {
        max_size = std::max(max_size, p.size());
        min_size = std::min(min_size, p.size());
    }
    if (max_size == 0) return 1.0;
    return static_cast<double>(min_size) / static_cast<double>(max_size);
}

PartitionResult bisect_bfs(const Graph& g) {
    PartitionResult res;
    res.parts.resize(2);
    auto ids = g.node_ids();
    if (ids.empty()) return res;

    NodeId start = ids[0];
    std::queue<NodeId> q;
    std::vector<NodeId> order;
    std::unordered_set<NodeId> visited;

    q.push(start);
    visited.insert(start);

    while (!q.empty()) {
        NodeId cur = q.front();
        q.pop();
        order.push_back(cur);
        for (auto& e : g.out_edges(cur)) {
            if (visited.insert(e.dst).second) q.push(e.dst);
        }
    }

    for (auto nid : ids) {
        if (!visited.count(nid)) order.push_back(nid);
    }

    size_t half = order.size() / 2;
    for (size_t i = 0; i < order.size(); i++) {
        size_t part = (i < half) ? 0 : 1;
        res.parts[part].insert(order[i]);
        res.assignment[order[i]] = part;
    }
    return res;
}

PartitionResult label_propagation(const Graph& g, size_t k, size_t max_iter,
                                   uint64_t seed) {
    PartitionResult res;
    res.parts.resize(k);
    auto ids = g.node_ids();
    if (ids.empty()) return res;

    std::mt19937_64 rng(seed);

    for (size_t i = 0; i < ids.size(); i++) {
        size_t label = i % k;
        res.assignment[ids[i]] = label;
    }

    for (size_t iter = 0; iter < max_iter; iter++) {
        bool changed = false;
        std::vector<NodeId> shuffled = ids;
        std::shuffle(shuffled.begin(), shuffled.end(), rng);

        for (auto nid : shuffled) {
            std::unordered_map<size_t, double> label_weight;
            for (auto& e : g.out_edges(nid)) {
                label_weight[res.assignment[e.dst]] += e.weight;
            }

            if (label_weight.empty()) continue;

            size_t best_label = res.assignment[nid];
            double best_weight = -1.0;
            for (auto& [label, w] : label_weight) {
                if (w > best_weight) {
                    best_weight = w;
                    best_label = label;
                }
            }

            if (best_label != res.assignment[nid]) {
                res.assignment[nid] = best_label;
                changed = true;
            }
        }
        if (!changed) break;
    }

    for (auto& p : res.parts) p.clear();
    for (auto& [nid, label] : res.assignment) {
        if (label < k) res.parts[label].insert(nid);
    }
    return res;
}

PartitionResult balanced_partition(const Graph& g, size_t k) {
    PartitionResult res;
    res.parts.resize(k);
    auto ids = g.node_ids();
    if (ids.empty() || k == 0) return res;

    std::vector<NodeId> order;
    std::unordered_set<NodeId> visited;
    std::queue<NodeId> q;

    for (auto start : ids) {
        if (visited.count(start)) continue;
        q.push(start);
        visited.insert(start);
        while (!q.empty()) {
            NodeId cur = q.front();
            q.pop();
            order.push_back(cur);
            for (auto& e : g.out_edges(cur)) {
                if (visited.insert(e.dst).second) q.push(e.dst);
            }
        }
    }

    for (size_t i = 0; i < order.size(); i++) {
        size_t part = i % k;
        res.parts[part].insert(order[i]);
        res.assignment[order[i]] = part;
    }
    return res;
}

size_t partition_edge_cut(const Graph& g, const PartitionResult& pr) {
    return pr.edge_cut(g);
}

} // namespace cryo