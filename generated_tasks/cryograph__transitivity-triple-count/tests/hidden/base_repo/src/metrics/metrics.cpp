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
        triples += k * (k - 1);
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

DegreeDistribution degree_distribution(const Graph& g) {
    DegreeDistribution dd;
    auto ids = g.node_ids();
    if (ids.empty()) { dd.entropy = 0; dd.variance = 0; dd.mode = 0; return dd; }

    double sum = 0, sum_sq = 0;
    for (auto nid : ids) {
        size_t d = g.degree(nid);
        dd.histogram[d]++;
        sum += d;
        sum_sq += d * d;
    }

    double n = static_cast<double>(ids.size());
    double mean = sum / n;
    dd.variance = sum_sq / n - mean * mean;

    dd.entropy = 0;
    for (auto& [d, cnt] : dd.histogram) {
        double p = static_cast<double>(cnt) / n;
        if (p > 0) dd.entropy -= p * std::log2(p);
    }

    dd.mode = 0;
    size_t mode_count = 0;
    for (auto& [d, cnt] : dd.histogram) {
        if (cnt > mode_count) { mode_count = cnt; dd.mode = d; }
    }
    return dd;
}

double transitivity(const Graph& g) {
    return global_clustering_coefficient(g);
}

double rich_club_coefficient(const Graph& g, size_t k) {
    auto ids = g.node_ids();
    std::unordered_set<NodeId> rich;
    for (auto nid : ids) {
        if (g.degree(nid) > k) rich.insert(nid);
    }
    if (rich.size() <= 1) return 0.0;

    size_t edges_among = 0;
    g.for_each_edge([&](const Edge& e) {
        if (!g.is_directed() && e.src > e.dst) return;
        if (rich.count(e.src) && rich.count(e.dst)) edges_among++;
    });

    double n_rich = static_cast<double>(rich.size());
    double max_edges = n_rich * (n_rich - 1);
    if (!g.is_directed()) max_edges /= 2.0;
    return max_edges > 0 ? static_cast<double>(edges_among) / max_edges : 0.0;
}

double efficiency(const Graph& g) {
    return global_efficiency(g);
}

double global_efficiency(const Graph& g) {
    auto ids = g.node_ids();
    if (ids.size() <= 1) return 0.0;
    double sum_inv = 0;
    size_t pairs = 0;
    for (auto src : ids) {
        auto dists = bfs_distances(g, src);
        for (auto& [dst, d] : dists) {
            if (src != dst && d > 0) {
                sum_inv += 1.0 / static_cast<double>(d);
                pairs++;
            }
        }
    }
    double n = static_cast<double>(ids.size());
    return sum_inv / (n * (n - 1));
}

MatrixResult adjacency_matrix(const Graph& g) {
    MatrixResult res;
    res.node_order = g.node_ids();
    size_t n = res.node_order.size();
    res.data.assign(n, std::vector<double>(n, 0.0));

    std::unordered_map<NodeId, size_t> idx;
    for (size_t i = 0; i < n; i++) idx[res.node_order[i]] = i;

    g.for_each_edge([&](const Edge& e) {
        res.data[idx[e.src]][idx[e.dst]] = e.weight;
    });
    return res;
}

MatrixResult laplacian_matrix(const Graph& g) {
    MatrixResult res;
    res.node_order = g.node_ids();
    size_t n = res.node_order.size();
    res.data.assign(n, std::vector<double>(n, 0.0));

    std::unordered_map<NodeId, size_t> idx;
    for (size_t i = 0; i < n; i++) idx[res.node_order[i]] = i;

    for (size_t i = 0; i < n; i++) {
        res.data[i][i] = static_cast<double>(g.degree(res.node_order[i]));
    }

    g.for_each_edge([&](const Edge& e) {
        res.data[idx[e.src]][idx[e.dst]] -= 1.0;
    });
    return res;
}

MatrixResult distance_matrix(const Graph& g) {
    MatrixResult res;
    res.node_order = g.node_ids();
    size_t n = res.node_order.size();
    res.data.assign(n, std::vector<double>(n, -1.0));

    std::unordered_map<NodeId, size_t> idx;
    for (size_t i = 0; i < n; i++) idx[res.node_order[i]] = i;

    for (size_t i = 0; i < n; i++) {
        res.data[i][i] = 0.0;
        auto dists = bfs_distances(g, res.node_order[i]);
        for (auto& [nid, d] : dists) {
            res.data[i][idx[nid]] = static_cast<double>(d);
        }
    }
    return res;
}

double spectral_radius_approx(const Graph& g, size_t max_iter) {
    auto ids = g.node_ids();
    size_t n = ids.size();
    if (n == 0) return 0.0;

    std::unordered_map<NodeId, size_t> idx;
    for (size_t i = 0; i < n; i++) idx[ids[i]] = i;

    std::vector<double> x(n, 1.0);
    double eigenvalue = 0.0;

    for (size_t iter = 0; iter < max_iter; iter++) {
        std::vector<double> y(n, 0.0);
        for (size_t i = 0; i < n; i++) {
            for (auto& e : g.out_edges(ids[i])) {
                y[idx[e.dst]] += x[i];
            }
        }
        double norm = 0;
        for (auto v : y) norm += v * v;
        norm = std::sqrt(norm);
        if (norm < 1e-15) break;
        eigenvalue = norm;
        for (size_t i = 0; i < n; i++) x[i] = y[i] / norm;
    }
    return eigenvalue;
}

double algebraic_connectivity_approx(const Graph& g) {
    if (g.node_count() <= 1) return 0.0;
    auto ids = g.node_ids();
    size_t n = ids.size();
    std::unordered_map<NodeId, size_t> idx;
    for (size_t i = 0; i < n; i++) idx[ids[i]] = i;

    std::vector<double> x(n);
    for (size_t i = 0; i < n; i++) x[i] = static_cast<double>(i) / n;

    for (size_t iter = 0; iter < 200; iter++) {
        std::vector<double> Lx(n, 0.0);
        for (size_t i = 0; i < n; i++) {
            Lx[i] = static_cast<double>(g.degree(ids[i])) * x[i];
            for (auto& e : g.out_edges(ids[i])) {
                Lx[i] -= x[idx[e.dst]];
            }
        }

        double mean = 0;
        for (auto v : Lx) mean += v;
        mean /= n;
        for (auto& v : Lx) v -= mean;

        double norm = 0;
        for (auto v : Lx) norm += v * v;
        norm = std::sqrt(norm);
        if (norm < 1e-15) return 0.0;
        for (size_t i = 0; i < n; i++) x[i] = Lx[i] / norm;
    }

    double numerator = 0, denominator = 0;
    std::vector<double> Lx(n, 0.0);
    for (size_t i = 0; i < n; i++) {
        Lx[i] = static_cast<double>(g.degree(ids[i])) * x[i];
        for (auto& e : g.out_edges(ids[i])) Lx[i] -= x[idx[e.dst]];
    }
    for (size_t i = 0; i < n; i++) {
        numerator += x[i] * Lx[i];
        denominator += x[i] * x[i];
    }
    return denominator > 1e-15 ? numerator / denominator : 0.0;
}

} // namespace cryo