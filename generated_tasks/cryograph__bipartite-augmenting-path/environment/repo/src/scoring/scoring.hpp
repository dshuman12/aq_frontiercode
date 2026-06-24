#pragma once
#include "core/graph.hpp"
#include <unordered_map>

namespace cryo {

struct HITSResult {
    std::unordered_map<NodeId, double> authority;
    std::unordered_map<NodeId, double> hub;
};

HITSResult hits(const Graph& g, size_t max_iter = 100, double tol = 1e-8);

using ScoreMap = std::unordered_map<NodeId, double>;

ScoreMap katz_centrality(const Graph& g, double alpha = 0.1, double beta = 1.0,
                         size_t max_iter = 100, double tol = 1e-8);

ScoreMap random_walk_scores(const Graph& g, NodeId start, size_t steps, uint64_t seed = 42);

std::vector<NodeId> random_walk(const Graph& g, NodeId start, size_t steps, uint64_t seed = 42);

ScoreMap link_prediction_adamic_adar(const Graph& g, NodeId u);
ScoreMap link_prediction_preferential(const Graph& g, NodeId u);
ScoreMap link_prediction_resource_alloc(const Graph& g, NodeId u);

double graph_reciprocity(const Graph& g);

} // namespace cryo