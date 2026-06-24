#pragma once
#include "core/graph.hpp"
#include <cstdint>
#include <random>

namespace cryo {

class GraphGenerator {
public:
    explicit GraphGenerator(uint64_t seed = 42);

    void set_seed(uint64_t seed);

    Graph erdos_renyi_gnp(size_t n, double p, GraphType type = GraphType::Undirected);
    Graph erdos_renyi_gnm(size_t n, size_t m, GraphType type = GraphType::Undirected);

    Graph barabasi_albert(size_t n, size_t m0, size_t m);

    Graph watts_strogatz(size_t n, size_t k, double beta);

    Graph complete(size_t n, GraphType type = GraphType::Undirected);
    Graph cycle(size_t n, GraphType type = GraphType::Undirected);
    Graph star(size_t n, GraphType type = GraphType::Undirected);
    Graph path(size_t n, GraphType type = GraphType::Directed);
    Graph grid(size_t rows, size_t cols, GraphType type = GraphType::Undirected);
    Graph binary_tree(size_t depth);
    Graph random_tree(size_t n);
    Graph random_dag(size_t n, double edge_prob);

    Graph random_weighted(size_t n, double edge_prob, double min_w, double max_w,
                          GraphType type = GraphType::Undirected);

    Graph bipartite(size_t n1, size_t n2, double edge_prob);
    Graph petersen();
    Graph wheel(size_t n);
    Graph ladder(size_t n);
    Graph hypercube(size_t dim);
    Graph friendship(size_t n);
    Graph circular_ladder(size_t n);

private:
    std::mt19937_64 rng_;
};

} // namespace cryo