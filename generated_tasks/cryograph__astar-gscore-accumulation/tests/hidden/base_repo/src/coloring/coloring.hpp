#pragma once
#include "core/graph.hpp"
#include <unordered_map>

namespace cryo {

struct ColoringResult {
    std::unordered_map<NodeId, size_t> colors;
    size_t num_colors;
    bool is_valid(const Graph& g) const;
};

ColoringResult greedy_coloring(const Graph& g);
ColoringResult welsh_powell_coloring(const Graph& g);
ColoringResult dsatur_coloring(const Graph& g);

size_t chromatic_number_upper_bound(const Graph& g);
size_t chromatic_number_lower_bound(const Graph& g);

bool is_k_colorable(const Graph& g, size_t k);

} // namespace cryo