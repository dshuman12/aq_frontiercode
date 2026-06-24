#pragma once
#include "core/graph.hpp"
#include <functional>
#include <vector>

namespace cryo {

struct PathResult {
    std::unordered_map<NodeId, double> dist;
    std::unordered_map<NodeId, NodeId> prev;

    std::vector<NodeId> reconstruct(NodeId target) const;
    bool reachable(NodeId target) const;
};

PathResult dijkstra(const Graph& g, NodeId src);
PathResult bellman_ford(const Graph& g, NodeId src);

struct NegativeCycleError : std::runtime_error {
    using std::runtime_error::runtime_error;
};

using HeuristicFn = std::function<double(NodeId)>;
PathResult astar(const Graph& g, NodeId src, NodeId goal, HeuristicFn h);

struct APSPResult {
    std::unordered_map<NodeId, std::unordered_map<NodeId, double>> dist;
    std::unordered_map<NodeId, std::unordered_map<NodeId, NodeId>> next;

    std::vector<NodeId> path(NodeId src, NodeId dst) const;
    bool reachable(NodeId src, NodeId dst) const;
};

APSPResult floyd_warshall(const Graph& g);

double path_weight(const Graph& g, const std::vector<NodeId>& path);
size_t path_length(const std::vector<NodeId>& path);

} // namespace cryo