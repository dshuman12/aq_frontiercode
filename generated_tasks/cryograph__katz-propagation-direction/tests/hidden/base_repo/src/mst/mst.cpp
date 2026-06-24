#include "mst/mst.hpp"
#include <algorithm>
#include <queue>
#include <unordered_set>

namespace cryo {

Graph MSTResult::to_graph(size_t n) const {
    Graph g(GraphType::Undirected);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);
    for (auto& e : edges) g.add_edge(e.src, e.dst, e.weight);
    return g;
}

UnionFind::UnionFind(size_t n) : parent_(n), rank_(n, 0), components_(n) {
    for (size_t i = 0; i < n; i++) parent_[i] = i;
}

size_t UnionFind::find(size_t x) {
    while (parent_[x] != x) {
        parent_[x] = parent_[parent_[x]];
        x = parent_[x];
    }
    return x;
}

bool UnionFind::unite(size_t x, size_t y) {
    size_t rx = find(x), ry = find(y);
    if (rx == ry) return false;
    if (rank_[rx] < rank_[ry]) std::swap(rx, ry);
    parent_[ry] = rx;
    if (rank_[rx] == rank_[ry]) rank_[rx]++;
    components_--;
    return true;
}

bool UnionFind::connected(size_t x, size_t y) {
    return find(x) == find(y);
}

MSTResult kruskal(const Graph& g) {
    MSTResult result;
    result.total_weight = 0.0;
    result.is_forest = false;

    auto ids = g.node_ids();
    if (ids.empty()) return result;

    std::unordered_map<NodeId, size_t> id_map;
    for (size_t i = 0; i < ids.size(); i++) id_map[ids[i]] = i;

    std::vector<Edge> all_edges;
    std::unordered_set<EdgeId> seen;
    for (auto nid : ids) {
        for (auto& e : g.out_edges(nid)) {
            if (seen.insert(e.id).second) {
                if (!g.is_directed() && e.src > e.dst) continue;
                all_edges.push_back(e);
            }
        }
    }

    std::sort(all_edges.begin(), all_edges.end(),
        [](const Edge& a, const Edge& b) { return a.weight < b.weight; });

    UnionFind uf(ids.size());

    for (auto& e : all_edges) {
        size_t u = id_map[e.src], v = id_map[e.dst];
        if (uf.unite(u, v)) {
            result.edges.push_back(e);
            result.total_weight += e.weight;
        }
    }

    result.is_forest = (uf.component_count() > 1);
    return result;
}

MSTResult prim(const Graph& g, NodeId start) {
    MSTResult result;
    result.total_weight = 0.0;
    result.is_forest = false;

    if (!g.has_node(start)) return result;

    using PQEntry = std::pair<double, std::pair<NodeId, NodeId>>;
    std::priority_queue<PQEntry, std::vector<PQEntry>, std::greater<PQEntry>> pq;
    std::unordered_set<NodeId> in_mst;

    in_mst.insert(start);
    for (auto& e : g.out_edges(start)) {
        pq.push({e.weight, {e.src, e.dst}});
    }

    while (!pq.empty()) {
        auto [w, endpoints] = pq.top();
        pq.pop();
        auto [u, v] = endpoints;

        if (in_mst.count(v)) continue;
        in_mst.insert(v);

        Edge mst_edge;
        mst_edge.src = u;
        mst_edge.dst = v;
        mst_edge.weight = w;
        result.edges.push_back(mst_edge);
        result.total_weight += w;

        for (auto& e : g.out_edges(v)) {
            if (!in_mst.count(e.dst)) {
                pq.push({e.weight, {e.src, e.dst}});
            }
        }
    }

    result.is_forest = (in_mst.size() < g.node_count());
    return result;
}

MSTResult boruvka(const Graph& g) {
    MSTResult result;
    result.total_weight = 0.0;
    result.is_forest = false;

    auto ids = g.node_ids();
    if (ids.empty()) return result;

    std::unordered_map<NodeId, size_t> id_map;
    for (size_t i = 0; i < ids.size(); i++) id_map[ids[i]] = i;

    UnionFind uf(ids.size());

    // Build edge list once instead of rebuilding every iteration
    std::vector<Edge> all_edges;
    {
        std::unordered_set<EdgeId> seen;
        for (auto nid : ids) {
            for (auto& e : g.out_edges(nid)) {
                if (seen.insert(e.id).second) {
                    if (!g.is_directed() && e.src > e.dst) continue;
                    all_edges.push_back(e);
                }
            }
        }
    }

    bool progress = true;
    while (progress && uf.component_count() > 1) {
        progress = false;

        std::vector<int> cheapest(ids.size(), -1);

        for (size_t i = 0; i < all_edges.size(); i++) {
            auto& e = all_edges[i];
            size_t cu = uf.find(id_map[e.src]);
            size_t cv = uf.find(id_map[e.dst]);
            if (cu == cv) continue;

            if (cheapest[cu] == -1 || all_edges[cheapest[cu]].weight > e.weight)
                cheapest[cu] = static_cast<int>(i);
            if (cheapest[cv] == -1 || all_edges[cheapest[cv]].weight > e.weight)
                cheapest[cv] = static_cast<int>(i);
        }

        for (size_t i = 0; i < ids.size(); i++) {
            if (cheapest[i] == -1) continue;
            auto& e = all_edges[cheapest[i]];
            size_t u = id_map[e.src], v = id_map[e.dst];
            if (uf.unite(u, v)) {
                result.edges.push_back(e);
                result.total_weight += e.weight;
                progress = true;
            }
        }
    }

    result.is_forest = (uf.component_count() > 1);
    return result;
}

bool is_spanning_tree(const Graph& g, const MSTResult& mst) {
    if (g.node_count() == 0) return mst.edges.empty();
    return mst.edges.size() == g.node_count() - 1 && !mst.is_forest;
}

double mst_weight_ratio(const Graph& g, const MSTResult& mst) {
    double total = g.total_weight();
    if (total < 1e-15) return 0.0;
    return mst.total_weight / total;
}

} // namespace cryo