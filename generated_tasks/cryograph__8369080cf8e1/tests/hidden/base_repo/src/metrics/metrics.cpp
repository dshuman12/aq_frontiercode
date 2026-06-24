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
    size_t actual_count = 0;
    if (g.is_directed()) {
        g.for_each_edge([&](const Edge&) { actual_count++; });
    } else {
        g.for_each_edge([&](const Edge& e) {
            if (e.src <= e.dst) actual_count++;
        });
    }
    return static_cast<double>(actual_count) / max_edges;
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

    // Pre-compute neighbor sets to avoid redundant allocations
    std::unordered_map<NodeId, std::unordered_set<NodeId>> nbr_cache;
    for (auto nid : ids) {
        auto nbrs = g.neighbors(nid);
        nbr_cache[nid] = std::unordered_set<NodeId>(nbrs.begin(), nbrs.end());
    }

    double sum = 0.0;
    for (auto nid : ids) {
        auto& nbr_set = nbr_cache[nid];
        size_t k = nbr_set.size();
        if (k < 2) continue;
        size_t links = 0;
        for (auto u : nbr_set) {
            for (auto& e : g.out_edges(u)) {
                if (e.dst != nid && nbr_set.count(e.dst)) links++;
            }
        }
        if (!g.is_directed()) links /= 2;
        double max_links = g.is_directed()
            ? static_cast<double>(k * (k - 1))
            : static_cast<double>(k * (k - 1)) / 2.0;
        sum += static_cast<double>(links) / max_links;
    }
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

EccentricityResult compute_eccentricities(const Graph& g) {
    EccentricityResult res;
    res.diameter = 0;
    res.radius = SIZE_MAX;

    auto ids = g.node_ids();
    if (ids.empty()) {
        res.radius = 0;
        return res;
    }

    for (auto nid : ids) {
        auto dists = bfs_distances(g, nid);
        size_t ecc = 0;
        bool all_reachable = true;
        for (auto other : ids) {
            if (!dists.count(other)) { all_reachable = false; break; }
            ecc = std::max(ecc, dists[other]);
        }
        if (all_reachable) {
            res.eccentricity[nid] = ecc;
            res.diameter = std::max(res.diameter, ecc);
            res.radius = std::min(res.radius, ecc);
        }
    }

    if (res.radius == SIZE_MAX) res.radius = 0;

    for (auto& [nid, ecc] : res.eccentricity) {
        if (ecc == res.radius) res.center.push_back(nid);
        if (ecc == res.diameter) res.periphery.push_back(nid);
    }
    std::sort(res.center.begin(), res.center.end());
    std::sort(res.periphery.begin(), res.periphery.end());
    return res;
}

size_t graph_diameter(const Graph& g) {
    return compute_eccentricities(g).diameter;
}

size_t graph_radius(const Graph& g) {
    return compute_eccentricities(g).radius;
}

std::vector<NodeId> graph_center(const Graph& g) {
    return compute_eccentricities(g).center;
}

std::vector<NodeId> graph_periphery(const Graph& g) {
    return compute_eccentricities(g).periphery;
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
        auto ecc = compute_eccentricities(g);
        s.diameter = ecc.diameter;
        s.radius = ecc.radius;
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