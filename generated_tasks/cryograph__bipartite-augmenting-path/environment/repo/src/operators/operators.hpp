#pragma once
#include "core/graph.hpp"

namespace cryo {

Graph graph_union(const Graph& a, const Graph& b);
Graph graph_intersection(const Graph& a, const Graph& b);
Graph graph_difference(const Graph& a, const Graph& b);
Graph graph_symmetric_difference(const Graph& a, const Graph& b);

Graph line_graph(const Graph& g);
Graph edge_contraction(const Graph& g, NodeId u, NodeId v);

Graph reverse_graph(const Graph& g);

bool is_subgraph(const Graph& sub, const Graph& super);

Graph graph_power(const Graph& g, size_t k);
Graph graph_square(const Graph& g);

size_t graph_hash(const Graph& g);

struct GraphDiff {
    std::vector<NodeId> added_nodes;
    std::vector<NodeId> removed_nodes;
    std::vector<std::pair<NodeId, NodeId>> added_edges;
    std::vector<std::pair<NodeId, NodeId>> removed_edges;
    bool identical() const;
};

GraphDiff graph_diff(const Graph& a, const Graph& b);

} // namespace cryo