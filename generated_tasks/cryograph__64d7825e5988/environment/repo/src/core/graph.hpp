#pragma once
#include "core/types.hpp"
#include <algorithm>
#include <functional>
#include <set>
#include <stdexcept>
#include <unordered_set>

namespace cryo {

class Graph {
public:
    explicit Graph(GraphType type = GraphType::Directed);
    Graph(const Graph& other);
    Graph& operator=(const Graph& other);
    Graph(Graph&& other) noexcept;
    Graph& operator=(Graph&& other) noexcept;

    GraphType type() const { return type_; }
    bool is_directed() const { return type_ == GraphType::Directed; }
    size_t node_count() const { return nodes_.size(); }
    size_t edge_count() const { return edge_count_; }

    NodeId add_node();
    NodeId add_node_with_id(NodeId id);
    void remove_node(NodeId id);
    bool has_node(NodeId id) const;

    EdgeId add_edge(NodeId src, NodeId dst, double weight = 1.0);
    void remove_edge(EdgeId eid);
    void remove_edge_between(NodeId src, NodeId dst);
    bool has_edge(NodeId src, NodeId dst) const;
    const Edge* get_edge(NodeId src, NodeId dst) const;

    const std::vector<Edge>& out_edges(NodeId id) const;
    const std::vector<Edge>& in_edges(NodeId id) const;
    std::vector<NodeId> neighbors(NodeId id) const;
    std::vector<NodeId> predecessors(NodeId id) const;

    size_t out_degree(NodeId id) const;
    size_t in_degree(NodeId id) const;
    size_t degree(NodeId id) const;

    void set_node_property(NodeId id, const std::string& key, PropertyValue val);
    const PropertyValue* get_node_property(NodeId id, const std::string& key) const;
    void set_edge_property(EdgeId eid, const std::string& key, PropertyValue val);

    std::vector<NodeId> node_ids() const;
    std::vector<Edge> all_edges() const;

    Graph transpose() const;
    Graph subgraph(const std::unordered_set<NodeId>& node_set) const;

    void clear();

    void for_each_node(std::function<void(NodeId)> fn) const;
    void for_each_edge(std::function<void(const Edge&)> fn) const;

    double total_weight() const;
    std::vector<NodeId> leaf_nodes() const;
    std::vector<NodeId> root_nodes() const;
    bool is_empty() const { return nodes_.empty(); }
    bool is_tree() const;
    size_t max_degree() const;
    size_t min_degree() const;
    Graph complement() const;

private:
    GraphType type_;
    std::unordered_map<NodeId, NodeData> nodes_;
    std::unordered_map<NodeId, std::vector<Edge>> adj_;
    std::unordered_map<NodeId, std::vector<Edge>> radj_;
    std::unordered_map<EdgeId, std::pair<NodeId, NodeId>> edge_index_;
    NodeId next_node_id_ = 0;
    EdgeId next_edge_id_ = 0;
    size_t edge_count_ = 0;

    mutable std::vector<NodeId> cached_ids_;
    mutable bool ids_dirty_ = true;
    void invalidate_ids() const { ids_dirty_ = true; }
    void rebuild_ids() const;

    static const std::vector<Edge> empty_edges_;
};

} // namespace cryo