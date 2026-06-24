#pragma once
#include "core/graph.hpp"

namespace cryo {

bool is_simple(const Graph& g);
bool is_regular(const Graph& g);
bool is_regular(const Graph& g, size_t& k);
bool is_complete(const Graph& g);
bool is_planar_k33_k5_free(const Graph& g);
bool is_forest(const Graph& g);
bool is_acyclic(const Graph& g);
bool is_tournament(const Graph& g);
bool is_eulerian(const Graph& g);

struct ValidationReport {
    size_t node_count;
    size_t edge_count;
    bool directed;
    bool simple;
    bool connected;
    bool acyclic;
    bool bipartite;
    bool regular;
    bool forest;
    bool tree;
    size_t components;
    std::string to_string() const;
};

ValidationReport validate(const Graph& g);

bool is_isomorphic_degree_check(const Graph& a, const Graph& b);

} // namespace cryo