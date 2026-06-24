#pragma once
#include "core/graph.hpp"
#include <unordered_map>

namespace cryo {

using CentralityMap = std::unordered_map<NodeId, double>;

CentralityMap degree_centrality(const Graph& g);

CentralityMap in_degree_centrality(const Graph& g);
CentralityMap out_degree_centrality(const Graph& g);

CentralityMap betweenness_centrality(const Graph& g, bool normalized = true);

CentralityMap closeness_centrality(const Graph& g, bool normalized = true);

CentralityMap pagerank(const Graph& g, double damping = 0.85,
                       size_t max_iter = 100, double tol = 1e-8);

CentralityMap eigenvector_centrality(const Graph& g, size_t max_iter = 100,
                                     double tol = 1e-8);

CentralityMap harmonic_centrality(const Graph& g);

NodeId max_centrality_node(const CentralityMap& cm);
NodeId min_centrality_node(const CentralityMap& cm);

CentralityMap normalize_centrality(const CentralityMap& cm);

} // namespace cryo