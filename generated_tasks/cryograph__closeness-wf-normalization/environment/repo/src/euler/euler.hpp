#pragma once
#include "core/graph.hpp"
#include <vector>

namespace cryo {

bool has_eulerian_circuit(const Graph& g);
bool has_eulerian_path(const Graph& g);

std::vector<NodeId> eulerian_circuit(const Graph& g);
std::vector<NodeId> eulerian_path(const Graph& g);

bool has_hamiltonian_path(const Graph& g);

std::vector<NodeId> find_cycle(const Graph& g, NodeId start);
size_t girth(const Graph& g);

} // namespace cryo