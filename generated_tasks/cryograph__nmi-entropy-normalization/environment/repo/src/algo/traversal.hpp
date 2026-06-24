#pragma once
#include "core/graph.hpp"
#include <functional>
#include <optional>
#include <vector>

namespace cryo {

using VisitorFn = std::function<bool(NodeId node, size_t depth)>;

struct BFSResult {
    std::vector<NodeId>                         order;
    std::unordered_map<NodeId, size_t>          depth;
    std::unordered_map<NodeId, NodeId>          parent;
};

struct DFSResult {
    std::vector<NodeId>                         pre_order;
    std::vector<NodeId>                         post_order;
    std::unordered_map<NodeId, size_t>          discover;
    std::unordered_map<NodeId, size_t>          finish;
    std::unordered_map<NodeId, NodeId>          parent;
};

BFSResult bfs(const Graph& g, NodeId start);
BFSResult bfs_multi(const Graph& g, const std::vector<NodeId>& starts);
void bfs_visit(const Graph& g, NodeId start, VisitorFn visitor);

DFSResult dfs(const Graph& g, NodeId start);
DFSResult dfs_full(const Graph& g);
void dfs_visit(const Graph& g, NodeId start,
               std::function<void(NodeId)> on_discover,
               std::function<void(NodeId)> on_finish);

std::vector<NodeId> topological_sort(const Graph& g);
bool has_cycle(const Graph& g);

std::vector<NodeId> iddfs(const Graph& g, NodeId start, NodeId target, size_t max_depth);

struct LevelOrder {
    std::vector<std::vector<NodeId>> levels;
};
LevelOrder level_order(const Graph& g, NodeId start);

size_t count_reachable(const Graph& g, NodeId start);

bool is_dag(const Graph& g);

std::vector<std::vector<NodeId>> topological_layers(const Graph& g);
std::vector<NodeId> longest_path_dag(const Graph& g);
size_t longest_path_length_dag(const Graph& g);

std::vector<NodeId> dfs_preorder(const Graph& g, NodeId start);
std::vector<NodeId> dfs_postorder(const Graph& g, NodeId start);

} // namespace cryo