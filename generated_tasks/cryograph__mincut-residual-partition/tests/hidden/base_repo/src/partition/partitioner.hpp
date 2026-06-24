#pragma once
#include "core/graph.hpp"
#include <vector>

namespace cryo {

struct PartitionResult {
    std::vector<std::unordered_set<NodeId>> parts;
    std::unordered_map<NodeId, size_t> assignment;

    size_t k() const { return parts.size(); }
    size_t edge_cut(const Graph& g) const;
    double balance_ratio() const;
};

PartitionResult bisect_bfs(const Graph& g);

PartitionResult label_propagation(const Graph& g, size_t k, size_t max_iter = 50,
                                   uint64_t seed = 42);

PartitionResult balanced_partition(const Graph& g, size_t k);

size_t partition_edge_cut(const Graph& g, const PartitionResult& pr);

} // namespace cryo