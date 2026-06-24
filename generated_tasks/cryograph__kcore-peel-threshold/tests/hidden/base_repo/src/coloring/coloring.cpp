#include "coloring/coloring.hpp"
#include <algorithm>
#include <set>
#include <queue>

namespace cryo {

bool ColoringResult::is_valid(const Graph& g) const {
    bool valid = true;
    g.for_each_edge([&](const Edge& e) {
        auto it_s = colors.find(e.src);
        auto it_d = colors.find(e.dst);
        if (it_s != colors.end() && it_d != colors.end()) {
            if (it_s->second == it_d->second) valid = false;
        }
    });
    return valid;
}

ColoringResult greedy_coloring(const Graph& g) {
    ColoringResult res;
    res.num_colors = 0;
    auto ids = g.node_ids();

    for (auto nid : ids) {
        std::set<size_t> used;
        for (auto& e : g.out_edges(nid)) {
            auto it = res.colors.find(e.dst);
            if (it != res.colors.end()) used.insert(it->second);
        }
        if (!g.is_directed()) {
            for (auto& e : g.in_edges(nid)) {
                auto it = res.colors.find(e.src);
                if (it != res.colors.end()) used.insert(it->second);
            }
        }
        size_t color = 0;
        while (used.count(color)) color++;
        res.colors[nid] = color;
        res.num_colors = std::max(res.num_colors, color + 1);
    }
    return res;
}

ColoringResult welsh_powell_coloring(const Graph& g) {
    ColoringResult res;
    res.num_colors = 0;
    auto ids = g.node_ids();
    if (ids.empty()) return res;

    std::vector<std::pair<size_t, NodeId>> deg_nodes;
    for (auto nid : ids) deg_nodes.push_back({g.degree(nid), nid});
    std::sort(deg_nodes.begin(), deg_nodes.end(), std::greater<>());

    for (auto& [d, nid] : deg_nodes) {
        std::set<size_t> used;
        for (auto& e : g.out_edges(nid)) {
            auto it = res.colors.find(e.dst);
            if (it != res.colors.end()) used.insert(it->second);
        }
        if (!g.is_directed()) {
            for (auto& e : g.in_edges(nid)) {
                auto it = res.colors.find(e.src);
                if (it != res.colors.end()) used.insert(it->second);
            }
        }
        size_t color = 0;
        while (used.count(color)) color++;
        res.colors[nid] = color;
        res.num_colors = std::max(res.num_colors, color + 1);
    }
    return res;
}

ColoringResult dsatur_coloring(const Graph& g) {
    ColoringResult res;
    res.num_colors = 0;
    auto ids = g.node_ids();
    if (ids.empty()) return res;

    std::unordered_map<NodeId, std::set<size_t>> adj_colors;
    std::unordered_set<NodeId> uncolored(ids.begin(), ids.end());

    for (auto nid : ids) adj_colors[nid] = {};

    while (!uncolored.empty()) {
        NodeId best = *uncolored.begin();
        size_t best_sat = 0, best_deg = 0;
        for (auto nid : uncolored) {
            size_t sat = adj_colors[nid].size();
            size_t deg = g.degree(nid);
            if (sat > best_sat || (sat == best_sat && deg > best_deg)) {
                best = nid;
                best_sat = sat;
                best_deg = deg;
            }
        }

        std::set<size_t> used;
        for (auto& e : g.out_edges(best)) {
            auto it = res.colors.find(e.dst);
            if (it != res.colors.end()) used.insert(it->second);
        }
        if (!g.is_directed()) {
            for (auto& e : g.in_edges(best)) {
                auto it = res.colors.find(e.src);
                if (it != res.colors.end()) used.insert(it->second);
            }
        }

        size_t color = 0;
        while (used.count(color)) color++;
        res.colors[best] = color;
        res.num_colors = std::max(res.num_colors, color + 1);
        uncolored.erase(best);

        for (auto& e : g.out_edges(best)) {
            if (uncolored.count(e.dst)) adj_colors[e.dst].insert(color);
        }
        if (!g.is_directed()) {
            for (auto& e : g.in_edges(best)) {
                if (uncolored.count(e.src)) adj_colors[e.src].insert(color);
            }
        }
    }
    return res;
}

size_t chromatic_number_upper_bound(const Graph& g) {
    return dsatur_coloring(g).num_colors;
}

size_t chromatic_number_lower_bound(const Graph& g) {
    auto ids = g.node_ids();
    if (ids.empty()) return 0;
    size_t max_clique = 1;
    for (auto nid : ids) {
        auto nbrs = g.neighbors(nid);
        std::unordered_set<NodeId> ns(nbrs.begin(), nbrs.end());
        size_t clique_size = 1;
        for (auto u : nbrs) {
            bool connected_to_all = true;
            for (auto v : nbrs) {
                if (u >= v) continue;
                if (!ns.count(v)) { connected_to_all = false; break; }
            }
            if (connected_to_all) clique_size++;
        }
        max_clique = std::max(max_clique, clique_size);
    }
    return max_clique;
}

bool is_k_colorable(const Graph& g, size_t k) {
    return dsatur_coloring(g).num_colors <= k;
}

} // namespace cryo