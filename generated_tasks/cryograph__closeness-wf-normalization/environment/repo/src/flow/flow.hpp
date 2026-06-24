#pragma once
#include "core/graph.hpp"
#include <unordered_map>
#include <vector>

namespace cryo {

struct FlowResult {
    double max_flow;
    std::unordered_map<EdgeId, double> edge_flow;
};

struct MinCutResult {
    double cut_value;
    std::unordered_set<NodeId> source_side;
    std::unordered_set<NodeId> sink_side;
    std::vector<Edge> cut_edges;
};

FlowResult edmonds_karp(const Graph& g, NodeId source, NodeId sink);

MinCutResult min_cut(const Graph& g, NodeId source, NodeId sink);

double max_flow_value(const Graph& g, NodeId source, NodeId sink);

} // namespace cryo