#pragma once
#include "core/graph.hpp"
#include <vector>

namespace cryo {

struct MatchingResult {
    std::vector<std::pair<NodeId, NodeId>> edges;
    size_t size() const { return edges.size(); }
    bool is_perfect(const Graph& g) const;
};

MatchingResult bipartite_matching(const Graph& g,
    const std::unordered_set<NodeId>& left,
    const std::unordered_set<NodeId>& right);

MatchingResult greedy_matching(const Graph& g);

MatchingResult max_weight_matching_greedy(const Graph& g);

bool has_perfect_matching(const Graph& g,
    const std::unordered_set<NodeId>& left,
    const std::unordered_set<NodeId>& right);

size_t matching_number(const Graph& g);

Graph matching_to_graph(const MatchingResult& m, GraphType type = GraphType::Undirected);

} // namespace cryo