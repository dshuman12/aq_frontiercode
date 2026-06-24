#pragma once
#include "core/graph.hpp"
#include <functional>
#include <vector>

namespace cryo {

using NodePredicate = std::function<bool(NodeId, const Graph&)>;
using EdgePredicate = std::function<bool(const Edge&, const Graph&)>;

std::vector<NodeId> filter_nodes(const Graph& g, NodePredicate pred);
std::vector<Edge> filter_edges(const Graph& g, EdgePredicate pred);

Graph induced_subgraph(const Graph& g, NodePredicate pred);

bool reachable(const Graph& g, NodeId src, NodeId dst);

std::vector<std::vector<NodeId>> all_paths(const Graph& g, NodeId src, NodeId dst,
                                            size_t max_depth = 20);

std::vector<NodeId> find_path(const Graph& g, NodeId src, NodeId dst);

size_t count_paths(const Graph& g, NodeId src, NodeId dst, size_t max_depth = 20);

std::vector<NodeId> common_neighbors(const Graph& g, NodeId a, NodeId b);

struct MotifResult {
    size_t triangle_count;
    std::vector<std::tuple<NodeId, NodeId, NodeId>> triangles;
};

MotifResult find_triangles(const Graph& g, size_t max_results = 1000);

std::vector<NodeId> k_hop_neighbors(const Graph& g, NodeId src, size_t k);

double jaccard_similarity(const Graph& g, NodeId a, NodeId b);

size_t graph_diameter_approx(const Graph& g, size_t samples = 10);

} // namespace cryo