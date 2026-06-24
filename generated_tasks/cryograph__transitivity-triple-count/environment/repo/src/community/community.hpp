#pragma once
#include "core/graph.hpp"
#include <vector>

namespace cryo {

struct CommunityResult {
    std::unordered_map<NodeId, size_t> assignment;
    std::vector<std::vector<NodeId>> communities;
    size_t num_communities;
    double modularity(const Graph& g) const;
};

double compute_modularity(const Graph& g, const std::unordered_map<NodeId, size_t>& assignment);

CommunityResult louvain(const Graph& g, size_t max_iter = 100);

CommunityResult community_label_propagation(const Graph& g, size_t max_iter = 50, uint64_t seed = 42);

double normalized_mutual_information(const CommunityResult& a, const CommunityResult& b);

size_t num_inter_community_edges(const Graph& g, const CommunityResult& cr);

} // namespace cryo