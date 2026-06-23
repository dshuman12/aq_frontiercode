#pragma once
#include "core/graph.hpp"
#include <vector>

namespace cryo {

struct MSTResult {
    std::vector<Edge> edges;
    double total_weight;
    bool is_forest;

    Graph to_graph(size_t n) const;
};

class UnionFind {
public:
    explicit UnionFind(size_t n);
    size_t find(size_t x);
    bool unite(size_t x, size_t y);
    bool connected(size_t x, size_t y);
    size_t component_count() const { return components_; }

private:
    std::vector<size_t> parent_;
    std::vector<size_t> rank_;
    size_t components_;
};

MSTResult kruskal(const Graph& g);

MSTResult prim(const Graph& g, NodeId start = 0);

MSTResult boruvka(const Graph& g);

bool is_spanning_tree(const Graph& g, const MSTResult& mst);

double mst_weight_ratio(const Graph& g, const MSTResult& mst);

} // namespace cryo