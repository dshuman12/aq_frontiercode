#pragma once
#include "core/graph.hpp"

namespace cryo {

double graph_density(const Graph& g);

double average_degree(const Graph& g);

double local_clustering_coefficient(const Graph& g, NodeId nid);
double global_clustering_coefficient(const Graph& g);
double average_clustering_coefficient(const Graph& g);

struct EccentricityResult {
    std::unordered_map<NodeId, size_t> eccentricity;
    size_t diameter;
    size_t radius;
    std::vector<NodeId> center;
    std::vector<NodeId> periphery;
};

EccentricityResult compute_eccentricities(const Graph& g);

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

struct DegreeDistribution {
    std::unordered_map<size_t, size_t> histogram;
    double entropy;
    double variance;
    size_t mode;
};

DegreeDistribution degree_distribution(const Graph& g);

double transitivity(const Graph& g);
double rich_club_coefficient(const Graph& g, size_t k);
double efficiency(const Graph& g);
double global_efficiency(const Graph& g);

struct MatrixResult {
    std::vector<std::vector<double>> data;
    std::vector<NodeId> node_order;
    size_t rows() const { return data.size(); }
    size_t cols() const { return data.empty() ? 0 : data[0].size(); }
    double at(size_t i, size_t j) const { return data[i][j]; }
};

MatrixResult adjacency_matrix(const Graph& g);
MatrixResult laplacian_matrix(const Graph& g);
MatrixResult distance_matrix(const Graph& g);

double spectral_radius_approx(const Graph& g, size_t max_iter = 100);
double algebraic_connectivity_approx(const Graph& g);

} // namespace cryo