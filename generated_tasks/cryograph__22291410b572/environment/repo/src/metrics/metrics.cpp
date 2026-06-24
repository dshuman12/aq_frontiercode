#include "metrics/metrics.hpp"
#include "components/components.hpp"
#include <algorithm>
#include <cmath>
#include <queue>
#include <sstream>
#include <unordered_set>

namespace cryo {

double graph_density(const Graph& g) {
    double n = static_cast<double>(g.node_count());
    if (n <= 1) return 0.0;
    double max_edges;
    if (g.is_directed()) {
        max_edges = n * (n - 1);
    } else {
        max_edges = n * (n - 1) / 2.0;
    }
    double actual = static_cast<double>(g.all_edges().size());
    if (!g.is_directed()) {
        std::unordered_set<EdgeId> seen;
        actual = 0;
        for (auto nid : g.node_ids()) {
            for (auto& e : g.out_edges(nid)) {
                if (e.src <= e.dst && seen.insert(e.id).second) actual++;
            }
        }
    }
    return actual / max_edges;
}

double average_degree(const Graph& g) {
    if (g.node_count() == 0) return 0.0;
    double total = 0;
    for (auto nid : g.node_ids()) total += g.degree(nid);
    return total / static_cast<double>(g.node_count());
}

double local_clustering_coefficient(const Graph& g, NodeId nid) {
    auto nbrs = g.neighbors(nid);
    size_t k = nbrs.size();
    if (k < 2) return 0.0;

    std::unordered_set<NodeId> nbr_set(nbrs.begin(), nbrs.end());
    size_t links = 0;

    for (auto u : nbrs) {
        for (auto& e : g.out_edges(u)) {
            if (e.dst != nid && nbr_set.count(e.dst)) links++;
        }
    }

    if (!g.is_directed()) links /= 2;

    double max_links = g.is_directed()
        ? static_cast<double>(k * (k - 1))
        : static_cast<double>(k * (k - 1)) / 2.0;

    return static_cast<double>(links) / max_links;
}

double global_clustering_coefficient(const Graph& g) {
    size_t triangles = 0;
    size_t triples = 0;
    auto ids = g.node_ids();

    for (auto v : ids) {
        auto nbrs = g.neighbors(v);
        size_t k = nbrs.size();
        if (k < 2) continue;

        std::unordered_set<NodeId> nbr_set(nbrs.begin(), nbrs.end());
        size_t links = 0;
        for (auto u : nbrs) {
            for (auto& e : g.out_edges(u)) {
                if (e.dst != v && nbr_set.count(e.dst)) links++;
            }
        }
        if (!g.is_directed()) links /= 2;

        triangles += links;
        triples += k * (k - 1) / 2;
    }

    if (triples == 0) return 0.0;
    return static_cast<double>(triangles) / static_cast<double>(triples);
}

double average_clustering_coefficient(const Graph& g) {
    auto ids = g.node_ids();
    if (ids.empty()) return 0.0;
    double sum = 0.0;
    for (auto nid : ids) sum += local_clustering_coefficient(g, nid);
    return sum / static_cast<double>(ids.size());
}

static std::unordered_map<NodeId, size_t> bfs_distances(const Graph& g, NodeId src) {
    std::unordered_map<NodeId, size_t> dist;
    std::queue<NodeId> q;
    q.push(src);
    dist[src] = 0;
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
    return dist;
}

size_t graph_diameter(const Graph& g) {
    size_t diam = 0;
    for (auto nid : g.node_ids()) {
        auto dists = bfs_distances(g, nid);
        for (auto& [_, d] : dists) {
            diam = std::max(diam, d);
        }
    }
    return diam;
}

size_t graph_radius(const Graph& g) {
    auto ids = g.node_ids();
    if (ids.empty()) return 0;
    size_t rad = SIZE_MAX;
    for (auto nid : ids) {
        auto dists = bfs_distances(g, nid);
        size_t ecc = 0;
        bool all_reachable = true;
        for (auto other : ids) {
            if (!dists.count(other)) { all_reachable = false; break; }
            ecc = std::max(ecc, dists[other]);
        }
        if (all_reachable) rad = std::min(rad, ecc);
    }
    return (rad == SIZE_MAX) ? 0 : rad;
}

std::vector<NodeId> graph_center(const Graph& g) {
    auto ids = g.node_ids();
    std::vector<NodeId> center;
    size_t rad = graph_radius(g);
    for (auto nid : ids) {
        auto dists = bfs_distances(g, nid);
        size_t ecc = 0;
        bool ok = true;
        for (auto other : ids) {
            if (!dists.count(other)) { ok = false; break; }
            ecc = std::max(ecc, dists[other]);
        }
        if (ok && ecc == rad) center.push_back(nid);
    }
    return center;
}

std::vector<NodeId> graph_periphery(const Graph& g) {
    auto ids = g.node_ids();
    std::vector<NodeId> periphery;
    size_t diam = graph_diameter(g);
    for (auto nid : ids) {
        auto dists = bfs_distances(g, nid);
        size_t ecc = 0;
        bool ok = true;
        for (auto other : ids) {
            if (!dists.count(other)) { ok = false; break; }
            ecc = std::max(ecc, dists[other]);
        }
        if (ok && ecc == diam) periphery.push_back(nid);
    }
    return periphery;
}

double degree_assortativity(const Graph& g) {
    auto edges = g.all_edges();
    if (edges.empty()) return 0.0;

    double sum_xy = 0, sum_x = 0, sum_y = 0, sum_x2 = 0, sum_y2 = 0;
    size_t m = 0;

    std::unordered_set<EdgeId> seen;
    for (auto& e : edges) {
        if (!g.is_directed() && e.src > e.dst) continue;
        if (!seen.insert(e.id).second) continue;

        double dx = static_cast<double>(g.degree(e.src));
        double dy = static_cast<double>(g.degree(e.dst));
        sum_xy += dx * dy;
        sum_x += dx;
        sum_y += dy;
        sum_x2 += dx * dx;
        sum_y2 += dy * dy;
        m++;
    }

    if (m == 0) return 0.0;
    double n = static_cast<double>(m);
    double num = n * sum_xy - sum_x * sum_y;
    double den = std::sqrt((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y));
    if (den < 1e-15) return 0.0;
    return num / den;
}

GraphSummary summarize(const Graph& g) {
    GraphSummary s;
    s.nodes = g.node_count();
    s.edges = g.edge_count();
    s.density = graph_density(g);
    s.avg_degree = average_degree(g);
    s.avg_clustering = average_clustering_coefficient(g);
    s.is_directed = g.is_directed();

    if (s.nodes <= 100) {
        s.diameter = graph_diameter(g);
        s.radius = graph_radius(g);
    } else {
        s.diameter = 0;
        s.radius = 0;
    }

    if (g.is_directed()) {
        s.components = strongly_connected_components(g).count();
    } else {
        s.components = connected_components(g).count();
    }
    return s;
}

double average_path_length(const Graph& g) {
    auto ids = g.node_ids();
    double total = 0.0;
    size_t pairs = 0;
    for (auto src : ids) {
        auto dists = bfs_distances(g, src);
        for (auto& [dst, d] : dists) {
            if (src != dst) {
                total += static_cast<double>(d);
                pairs++;
            }
        }
    }
    return pairs > 0 ? total / static_cast<double>(pairs) : 0.0;
}

std::string GraphSummary::to_string() const {
    std::ostringstream oss;
    oss << "Nodes: " << nodes
        << " | Edges: " << edges
        << " | Density: " << density
        << " | AvgDeg: " << avg_degree
        << " | Clustering: " << avg_clustering
        << " | Diameter: " << diameter
        << " | Radius: " << radius
        << " | Components: " << components
        << " | " << (is_directed ? "Directed" : "Undirected");
    return oss.str();
}

} // namespace cryo