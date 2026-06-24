#include "generator/generator.hpp"
#include <algorithm>
#include <numeric>
#include <stdexcept>

namespace cryo {

GraphGenerator::GraphGenerator(uint64_t seed) : rng_(seed) {}

void GraphGenerator::set_seed(uint64_t seed) {
    rng_.seed(seed);
}

Graph GraphGenerator::erdos_renyi_gnp(size_t n, double p, GraphType type) {
    Graph g(type);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);

    std::uniform_real_distribution<double> dist(0.0, 1.0);
    for (size_t i = 0; i < n; i++) {
        size_t start = (type == GraphType::Undirected) ? i + 1 : 0;
        for (size_t j = start; j < n; j++) {
            if (i == j) continue;
            if (dist(rng_) < p) {
                g.add_edge(i, j);
            }
        }
    }
    return g;
}

Graph GraphGenerator::erdos_renyi_gnm(size_t n, size_t m, GraphType type) {
    Graph g(type);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);

    size_t max_edges;
    if (type == GraphType::Undirected) {
        max_edges = n * (n - 1) / 2;
    } else {
        max_edges = n * (n - 1);
    }
    m = std::min(m, max_edges);

    // For dense graphs (m > 50% of max), enumerate all edges and shuffle
    if (m > max_edges / 2) {
        std::vector<std::pair<size_t, size_t>> all_possible;
        all_possible.reserve(max_edges);
        for (size_t i = 0; i < n; i++) {
            size_t start = (type == GraphType::Undirected) ? i + 1 : 0;
            for (size_t j = start; j < n; j++) {
                if (i != j) all_possible.push_back({i, j});
            }
        }
        std::shuffle(all_possible.begin(), all_possible.end(), rng_);
        for (size_t i = 0; i < m; i++) {
            g.add_edge(all_possible[i].first, all_possible[i].second);
        }
    } else {
        // Sparse: rejection sampling
        std::uniform_int_distribution<size_t> dist(0, n - 1);
        size_t added = 0;
        size_t max_attempts = m * 20 + 1000;
        size_t attempts = 0;

        while (added < m && attempts < max_attempts) {
            size_t u = dist(rng_);
            size_t v = dist(rng_);
            if (u != v && !g.has_edge(u, v)) {
                g.add_edge(u, v);
                added++;
            }
            attempts++;
        }
    }
    return g;
}

Graph GraphGenerator::barabasi_albert(size_t n, size_t m0, size_t m) {
    if (m0 < 1) m0 = 1;
    if (m > m0) m = m0;
    if (n <= m0) n = m0 + 1;

    Graph g(GraphType::Undirected);
    for (size_t i = 0; i < m0; i++) g.add_node_with_id(i);
    for (size_t i = 0; i < m0; i++) {
        for (size_t j = i + 1; j < m0; j++) {
            g.add_edge(i, j);
        }
    }

    std::vector<NodeId> degree_list;
    for (size_t i = 0; i < m0; i++) {
        for (size_t d = 0; d < g.degree(i); d++) {
            degree_list.push_back(i);
        }
    }

    for (size_t i = m0; i < n; i++) {
        g.add_node_with_id(i);
        std::unordered_set<NodeId> targets;
        size_t safety = 0;

        while (targets.size() < m && safety < m * 100) {
            safety++;
            if (degree_list.empty()) break;
            std::uniform_int_distribution<size_t> pick(0, degree_list.size() - 1);
            NodeId chosen = degree_list[pick(rng_)];
            if (chosen != i) targets.insert(chosen);
        }

        for (auto t : targets) {
            g.add_edge(i, t);
            degree_list.push_back(i);
            degree_list.push_back(t);
        }
        if (targets.empty() && !degree_list.empty()) {
            degree_list.push_back(i);
        }
    }
    return g;
}

Graph GraphGenerator::watts_strogatz(size_t n, size_t k, double beta) {
    if (k % 2 != 0) k--;
    if (k < 2) k = 2;
    if (n <= k) throw std::runtime_error("watts_strogatz: n must be > k");

    Graph g(GraphType::Undirected);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);

    for (size_t i = 0; i < n; i++) {
        for (size_t j = 1; j <= k / 2; j++) {
            size_t target = (i + j) % n;
            if (!g.has_edge(i, target)) g.add_edge(i, target);
        }
    }

    std::uniform_real_distribution<double> prob(0.0, 1.0);
    std::uniform_int_distribution<size_t> node_dist(0, n - 1);

    for (size_t i = 0; i < n; i++) {
        for (size_t j = 1; j <= k / 2; j++) {
            if (prob(rng_) < beta) {
                size_t old_target = (i + j) % n;
                g.remove_edge_between(i, old_target);
                size_t new_target = node_dist(rng_);
                size_t tries = 0;
                while ((new_target == i || g.has_edge(i, new_target)) && tries < n * 2) {
                    new_target = node_dist(rng_);
                    tries++;
                }
                if (new_target != i && !g.has_edge(i, new_target)) {
                    g.add_edge(i, new_target);
                }
            }
        }
    }
    return g;
}

Graph GraphGenerator::complete(size_t n, GraphType type) {
    Graph g(type);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);
    for (size_t i = 0; i < n; i++) {
        size_t start = (type == GraphType::Undirected) ? i + 1 : 0;
        for (size_t j = start; j < n; j++) {
            if (i != j) g.add_edge(i, j);
        }
    }
    return g;
}

Graph GraphGenerator::cycle(size_t n, GraphType type) {
    if (n < 3) throw std::runtime_error("cycle: n must be >= 3");
    Graph g(type);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);
    for (size_t i = 0; i < n; i++) g.add_edge(i, (i + 1) % n);
    return g;
}

Graph GraphGenerator::star(size_t n, GraphType type) {
    if (n < 2) throw std::runtime_error("star: n must be >= 2");
    Graph g(type);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);
    for (size_t i = 1; i < n; i++) g.add_edge(0, i);
    return g;
}

Graph GraphGenerator::path(size_t n, GraphType type) {
    Graph g(type);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);
    for (size_t i = 0; i + 1 < n; i++) g.add_edge(i, i + 1);
    return g;
}

Graph GraphGenerator::grid(size_t rows, size_t cols, GraphType type) {
    Graph g(type);
    for (size_t r = 0; r < rows; r++) {
        for (size_t c = 0; c < cols; c++) {
            g.add_node_with_id(r * cols + c);
        }
    }
    for (size_t r = 0; r < rows; r++) {
        for (size_t c = 0; c < cols; c++) {
            NodeId cur = r * cols + c;
            if (c + 1 < cols) g.add_edge(cur, cur + 1);
            if (r + 1 < rows) g.add_edge(cur, cur + cols);
        }
    }
    return g;
}

Graph GraphGenerator::binary_tree(size_t depth) {
    Graph g(GraphType::Directed);
    size_t n = (1u << (depth + 1)) - 1;
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);
    for (size_t i = 0; i < n; i++) {
        size_t left = 2 * i + 1;
        size_t right = 2 * i + 2;
        if (left < n) g.add_edge(i, left);
        if (right < n) g.add_edge(i, right);
    }
    return g;
}

Graph GraphGenerator::random_tree(size_t n) {
    Graph g(GraphType::Undirected);
    if (n == 0) return g;
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);
    for (size_t i = 1; i < n; i++) {
        std::uniform_int_distribution<size_t> dist(0, i - 1);
        g.add_edge(i, dist(rng_));
    }
    return g;
}

Graph GraphGenerator::random_dag(size_t n, double edge_prob) {
    Graph g(GraphType::Directed);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);
    std::uniform_real_distribution<double> dist(0.0, 1.0);
    for (size_t i = 0; i < n; i++) {
        for (size_t j = i + 1; j < n; j++) {
            if (dist(rng_) < edge_prob) {
                g.add_edge(i, j);
            }
        }
    }
    return g;
}

Graph GraphGenerator::random_weighted(size_t n, double edge_prob,
                                       double min_w, double max_w,
                                       GraphType type) {
    Graph g(type);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);
    std::uniform_real_distribution<double> prob(0.0, 1.0);
    std::uniform_real_distribution<double> weight(min_w, max_w);
    for (size_t i = 0; i < n; i++) {
        size_t start = (type == GraphType::Undirected) ? i + 1 : 0;
        for (size_t j = start; j < n; j++) {
            if (i != j && prob(rng_) < edge_prob) {
                g.add_edge(i, j, weight(rng_));
            }
        }
    }
    return g;
}

Graph GraphGenerator::bipartite(size_t n1, size_t n2, double edge_prob) {
    Graph g(GraphType::Undirected);
    for (size_t i = 0; i < n1 + n2; i++) g.add_node_with_id(i);
    std::uniform_real_distribution<double> dist(0.0, 1.0);
    for (size_t i = 0; i < n1; i++) {
        for (size_t j = n1; j < n1 + n2; j++) {
            if (dist(rng_) < edge_prob) g.add_edge(i, j);
        }
    }
    return g;
}

Graph GraphGenerator::petersen() {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 10; i++) g.add_node_with_id(i);
    // Outer cycle
    for (int i = 0; i < 5; i++) g.add_edge(i, (i + 1) % 5);
    // Inner pentagram
    for (int i = 0; i < 5; i++) g.add_edge(5 + i, 5 + (i + 2) % 5);
    // Spokes
    for (int i = 0; i < 5; i++) g.add_edge(i, i + 5);
    return g;
}

Graph GraphGenerator::wheel(size_t n) {
    if (n < 4) throw std::runtime_error("wheel: n must be >= 4");
    Graph g(GraphType::Undirected);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);
    for (size_t i = 1; i < n; i++) g.add_edge(0, i);
    for (size_t i = 1; i < n - 1; i++) g.add_edge(i, i + 1);
    g.add_edge(n - 1, 1);
    return g;
}

Graph GraphGenerator::ladder(size_t n) {
    Graph g(GraphType::Undirected);
    for (size_t i = 0; i < 2 * n; i++) g.add_node_with_id(i);
    for (size_t i = 0; i < n - 1; i++) {
        g.add_edge(i, i + 1);
        g.add_edge(n + i, n + i + 1);
    }
    for (size_t i = 0; i < n; i++) g.add_edge(i, n + i);
    return g;
}

Graph GraphGenerator::hypercube(size_t dim) {
    size_t n = 1u << dim;
    Graph g(GraphType::Undirected);
    for (size_t i = 0; i < n; i++) g.add_node_with_id(i);
    for (size_t i = 0; i < n; i++) {
        for (size_t d = 0; d < dim; d++) {
            size_t j = i ^ (1u << d);
            if (i < j) g.add_edge(i, j);
        }
    }
    return g;
}

Graph GraphGenerator::friendship(size_t n) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0);
    for (size_t i = 0; i < n; i++) {
        size_t a = 2 * i + 1, b = 2 * i + 2;
        g.add_node_with_id(a);
        g.add_node_with_id(b);
        g.add_edge(0, a);
        g.add_edge(0, b);
        g.add_edge(a, b);
    }
    return g;
}

Graph GraphGenerator::circular_ladder(size_t n) {
    if (n < 3) throw std::runtime_error("circular_ladder: n must be >= 3");
    Graph g(GraphType::Undirected);
    for (size_t i = 0; i < 2 * n; i++) g.add_node_with_id(i);
    for (size_t i = 0; i < n; i++) {
        g.add_edge(i, (i + 1) % n);
        g.add_edge(n + i, n + ((i + 1) % n));
        g.add_edge(i, n + i);
    }
    return g;
}

} // namespace cryo