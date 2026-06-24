#pragma once
#include "core/graph.hpp"

namespace cryo {

double graph_density(const Graph& g);

double average_degree(const Graph& g);

double local_clustering_coefficient(const Graph& g, NodeId nid);
double global_clustering_coefficient(const Graph& g);
double average_clustering_coefficient(const Graph& g);

size_t graph_diameter(const Graph& g);
size_t graph_radius(const Graph& g);
std::vector<NodeId> graph_center(const Graph& g);
std::vector<NodeId> graph_periphery(const Graph& g);

double degree_assortativity(const Graph& g);

struct GraphSummary {
    size_t nodes;
    size_t edges;
    double density;
    double avg_degree;
    double avg_clustering;
    size_t diameter;
    size_t radius;
    size_t components;
    bool is_directed;

    std::string to_string() const;
};

GraphSummary summarize(const Graph& g);

double average_path_length(const Graph& g);

} // namespace cryo