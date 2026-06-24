#pragma once
#include "core/graph.hpp"
#include <vector>

namespace cryo {

struct KCoreResult {
    std::unordered_map<NodeId, size_t> coreness;
    size_t max_k;
    Graph k_core_subgraph(const Graph& g, size_t k) const;
};

KCoreResult k_core_decomposition(const Graph& g);

struct DegreeSequence {
    std::vector<size_t> sequence;
    bool is_graphical;
    size_t max_degree;
    size_t min_degree;
    double mean_degree;
    size_t degree_sum;
};

DegreeSequence degree_sequence(const Graph& g);
bool is_graphical_sequence(std::vector<size_t> seq);

Graph k_degenerate_ordering(const Graph& g, std::vector<NodeId>& order);

size_t degeneracy(const Graph& g);

std::vector<NodeId> k_shell(const Graph& g, size_t k);

// Vertex cover, independent set, dominating set
std::vector<NodeId> vertex_cover_approx(const Graph& g);
std::vector<NodeId> independent_set_greedy(const Graph& g);
std::vector<NodeId> dominating_set_greedy(const Graph& g);
bool is_vertex_cover(const Graph& g, const std::vector<NodeId>& cover);
bool is_independent_set(const Graph& g, const std::vector<NodeId>& iset);
bool is_dominating_set(const Graph& g, const std::vector<NodeId>& dset);

} // namespace cryo