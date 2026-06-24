#pragma once
#include "core/graph.hpp"
#include <vector>

namespace cryo {

struct ComponentResult {
    std::vector<std::vector<NodeId>> components;
    std::unordered_map<NodeId, size_t> node_to_component;
    size_t count() const { return components.size(); }
};

ComponentResult connected_components(const Graph& g);

ComponentResult strongly_connected_components(const Graph& g);

std::vector<std::pair<NodeId, NodeId>> find_bridges(const Graph& g);

std::vector<NodeId> find_articulation_points(const Graph& g);

bool is_bipartite(const Graph& g);
bool is_bipartite(const Graph& g, std::unordered_map<NodeId, int>& coloring);

bool is_connected(const Graph& g);
bool is_strongly_connected(const Graph& g);

Graph condensation(const Graph& g);

size_t largest_component_size(const Graph& g);
size_t component_count(const Graph& g);

} // namespace cryo