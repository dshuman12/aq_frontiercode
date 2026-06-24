#include "core/graph.hpp"
#include <algorithm>
#include <stdexcept>

namespace cryo {

const std::vector<Edge> Graph::empty_edges_;

Graph::Graph(GraphType type) : type_(type) {}

Graph::Graph(const Graph& other)
    : type_(other.type_), nodes_(other.nodes_), adj_(other.adj_),
      radj_(other.radj_),
      edge_index_(other.edge_index_), next_node_id_(other.next_node_id_),
      next_edge_id_(other.next_edge_id_), edge_count_(other.edge_count_) {}

Graph& Graph::operator=(const Graph& other) {
    if (this != &other) {
        type_ = other.type_;
        nodes_ = other.nodes_;
        adj_ = other.adj_;
        radj_ = other.radj_;
        edge_index_ = other.edge_index_;
        next_node_id_ = other.next_node_id_;
        next_edge_id_ = other.next_edge_id_;
        edge_count_ = other.edge_count_;
        ids_dirty_ = true;
    }
    return *this;
}

Graph::Graph(Graph&& other) noexcept
    : type_(other.type_), nodes_(std::move(other.nodes_)),
      adj_(std::move(other.adj_)), radj_(std::move(other.radj_)),
      edge_index_(std::move(other.edge_index_)),
      next_node_id_(other.next_node_id_), next_edge_id_(other.next_edge_id_),
      edge_count_(other.edge_count_) {
    other.edge_count_ = 0;
}

Graph& Graph::operator=(Graph&& other) noexcept {
    if (this != &other) {
        type_ = other.type_;
        nodes_ = std::move(other.nodes_);
        adj_ = std::move(other.adj_);
        radj_ = std::move(other.radj_);
        edge_index_ = std::move(other.edge_index_);
        next_node_id_ = other.next_node_id_;
        next_edge_id_ = other.next_edge_id_;
        edge_count_ = other.edge_count_;
        other.edge_count_ = 0;
        ids_dirty_ = true;
    }
    return *this;
}

NodeId Graph::add_node() {
    NodeId id = next_node_id_++;
    nodes_.emplace(id, NodeData(id));
    adj_[id];
    radj_[id];
    invalidate_ids();
    return id;
}

NodeId Graph::add_node_with_id(NodeId id) {
    if (nodes_.count(id)) {
        throw std::runtime_error("Node already exists: " + std::to_string(id));
    }
    nodes_.emplace(id, NodeData(id));
    adj_[id];
    radj_[id];
    if (id >= next_node_id_) next_node_id_ = id + 1;
    invalidate_ids();
    return id;
}

void Graph::remove_node(NodeId id) {
    if (!nodes_.count(id)) return;

    // Remove outgoing edges and clean their reverse entries
    for (auto& e : adj_[id]) {
        edge_index_.erase(e.id);
        edge_count_--;
        auto rit = radj_.find(e.dst);
        if (rit != radj_.end()) {
            auto& rv = rit->second;
            rv.erase(std::remove_if(rv.begin(), rv.end(),
                [&e](const Edge& re) { return re.id == e.id; }), rv.end());
        }
    }
    adj_.erase(id);

    // Remove incoming edges using radj_ and clean their forward entries
    auto rit = radj_.find(id);
    if (rit != radj_.end()) {
        for (auto& e : rit->second) {
            edge_index_.erase(e.id);
            edge_count_--;
            auto ait = adj_.find(e.src);
            if (ait != adj_.end()) {
                auto& av = ait->second;
                av.erase(std::remove_if(av.begin(), av.end(),
                    [&e](const Edge& ae) { return ae.id == e.id; }), av.end());
            }
        }
    }
    radj_.erase(id);

    nodes_.erase(id);
    invalidate_ids();
}

bool Graph::has_node(NodeId id) const {
    return nodes_.count(id) > 0;
}

EdgeId Graph::add_edge(NodeId src, NodeId dst, double weight) {
    if (!nodes_.count(src))
        throw std::runtime_error("Source node does not exist: " + std::to_string(src));
    if (!nodes_.count(dst))
        throw std::runtime_error("Destination node does not exist: " + std::to_string(dst));

    EdgeId eid = next_edge_id_++;
    Edge e(eid, src, dst, weight);
    adj_[src].push_back(e);
    radj_[dst].push_back(e);
    edge_index_[eid] = {src, dst};
    edge_count_++;

    if (!is_directed() && src != dst) {
        EdgeId reid = next_edge_id_++;
        Edge re(reid, dst, src, weight);
        adj_[dst].push_back(re);
        radj_[src].push_back(re);
        edge_index_[reid] = {dst, src};
        edge_count_++;
    }

    return eid;
}

void Graph::remove_edge(EdgeId eid) {
    auto it = edge_index_.find(eid);
    if (it == edge_index_.end()) return;

    NodeId src = it->second.first;
    NodeId dst = it->second.second;

    auto& edges = adj_[src];
    edges.erase(
        std::remove_if(edges.begin(), edges.end(),
            [eid](const Edge& e) { return e.id == eid; }),
        edges.end());

    auto& redges = radj_[dst];
    redges.erase(
        std::remove_if(redges.begin(), redges.end(),
            [eid](const Edge& e) { return e.id == eid; }),
        redges.end());

    edge_index_.erase(it);
    edge_count_--;
}

void Graph::remove_edge_between(NodeId src, NodeId dst) {
    auto adj_it = adj_.find(src);
    if (adj_it == adj_.end()) return;

    // Collect edge IDs to remove from radj_
    std::vector<EdgeId> removed_ids;
    auto& edges = adj_it->second;
    edges.erase(
        std::remove_if(edges.begin(), edges.end(),
            [dst, this, &removed_ids](const Edge& e) {
                if (e.dst == dst) {
                    removed_ids.push_back(e.id);
                    edge_index_.erase(e.id);
                    edge_count_--;
                    return true;
                }
                return false;
            }),
        edges.end());

    // Clean radj_[dst]
    auto& rev_dst = radj_[dst];
    rev_dst.erase(
        std::remove_if(rev_dst.begin(), rev_dst.end(),
            [&removed_ids](const Edge& e) {
                for (auto eid : removed_ids) { if (e.id == eid) return true; }
                return false;
            }),
        rev_dst.end());

    if (!is_directed()) {
        auto radj_it = adj_.find(dst);
        if (radj_it == adj_.end()) return;

        std::vector<EdgeId> rev_removed_ids;
        auto& redges = radj_it->second;
        redges.erase(
            std::remove_if(redges.begin(), redges.end(),
                [src, this, &rev_removed_ids](const Edge& e) {
                    if (e.dst == src) {
                        rev_removed_ids.push_back(e.id);
                        edge_index_.erase(e.id);
                        edge_count_--;
                        return true;
                    }
                    return false;
                }),
            redges.end());

        // Clean radj_[src]
        auto& rev_src = radj_[src];
        rev_src.erase(
            std::remove_if(rev_src.begin(), rev_src.end(),
                [&rev_removed_ids](const Edge& e) {
                    for (auto eid : rev_removed_ids) { if (e.id == eid) return true; }
                    return false;
                }),
            rev_src.end());
    }
}

bool Graph::has_edge(NodeId src, NodeId dst) const {
    auto it = adj_.find(src);
    if (it == adj_.end()) return false;
    for (auto& e : it->second) {
        if (e.dst == dst) return true;
    }
    return false;
}

const Edge* Graph::get_edge(NodeId src, NodeId dst) const {
    auto it = adj_.find(src);
    if (it == adj_.end()) return nullptr;
    for (auto& e : it->second) {
        if (e.dst == dst) return &e;
    }
    return nullptr;
}

const std::vector<Edge>& Graph::out_edges(NodeId id) const {
    auto it = adj_.find(id);
    if (it == adj_.end()) return empty_edges_;
    return it->second;
}

const std::vector<Edge>& Graph::in_edges(NodeId id) const {
    auto it = radj_.find(id);
    if (it == radj_.end()) return empty_edges_;
    return it->second;
}

std::vector<NodeId> Graph::neighbors(NodeId id) const {
    std::vector<NodeId> result;
    auto it = adj_.find(id);
    if (it == adj_.end()) return result;
    std::unordered_set<NodeId> seen;
    for (auto& e : it->second) {
        if (seen.insert(e.dst).second) result.push_back(e.dst);
    }
    return result;
}

std::vector<NodeId> Graph::predecessors(NodeId id) const {
    std::vector<NodeId> result;
    std::unordered_set<NodeId> seen;
    for (auto& e : in_edges(id)) {
        if (seen.insert(e.src).second) {
            result.push_back(e.src);
        }
    }
    return result;
}

size_t Graph::out_degree(NodeId id) const {
    auto it = adj_.find(id);
    if (it == adj_.end()) return 0;
    return it->second.size();
}

size_t Graph::in_degree(NodeId id) const {
    auto it = radj_.find(id);
    if (it == radj_.end()) return 0;
    return it->second.size();
}

size_t Graph::degree(NodeId id) const {
    if (is_directed()) return out_degree(id) + in_degree(id);
    return out_degree(id);
}

void Graph::set_node_property(NodeId id, const std::string& key, PropertyValue val) {
    auto it = nodes_.find(id);
    if (it == nodes_.end())
        throw std::runtime_error("Node does not exist: " + std::to_string(id));
    it->second.props[key] = std::move(val);
}

const PropertyValue* Graph::get_node_property(NodeId id, const std::string& key) const {
    auto nit = nodes_.find(id);
    if (nit == nodes_.end()) return nullptr;
    auto pit = nit->second.props.find(key);
    if (pit == nit->second.props.end()) return nullptr;
    return &pit->second;
}

void Graph::set_edge_property(EdgeId eid, const std::string& key, PropertyValue val) {
    auto it = edge_index_.find(eid);
    if (it == edge_index_.end())
        throw std::runtime_error("Edge does not exist: " + std::to_string(eid));
    NodeId src = it->second.first;
    NodeId dst = it->second.second;
    for (auto& e : adj_[src]) {
        if (e.id == eid) {
            e.props[key] = val;
            break;
        }
    }
    for (auto& e : radj_[dst]) {
        if (e.id == eid) {
            e.props[key] = std::move(val);
            break;
        }
    }
}

void Graph::rebuild_ids() const {
    cached_ids_.clear();
    cached_ids_.reserve(nodes_.size());
    for (auto& [id, _] : nodes_) cached_ids_.push_back(id);
    std::sort(cached_ids_.begin(), cached_ids_.end());
    ids_dirty_ = false;
}

std::vector<NodeId> Graph::node_ids() const {
    if (ids_dirty_) rebuild_ids();
    return cached_ids_;
}

std::vector<Edge> Graph::all_edges() const {
    std::vector<Edge> result;
    std::unordered_set<EdgeId> seen;
    for (auto& [nid, edges] : adj_) {
        for (auto& e : edges) {
            if (seen.insert(e.id).second) result.push_back(e);
        }
    }
    return result;
}

size_t Graph::unique_edge_count() const {
    if (is_directed()) return edge_count_;
    return edge_count_ / 2;
}

Graph Graph::transpose() const {
    Graph g(type_);
    for (auto& [id, data] : nodes_) {
        g.add_node_with_id(id);
        g.nodes_[id].props = data.props;
    }
    for (auto& [nid, edges] : adj_) {
        for (auto& e : edges) {
            g.add_edge(e.dst, e.src, e.weight);
        }
    }
    return g;
}

Graph Graph::subgraph(const std::unordered_set<NodeId>& node_set) const {
    Graph g(type_);
    for (auto nid : node_set) {
        if (nodes_.count(nid)) {
            g.add_node_with_id(nid);
            g.nodes_[nid].props = nodes_.at(nid).props;
        }
    }
    for (auto& [nid, edges] : adj_) {
        if (!node_set.count(nid)) continue;
        for (auto& e : edges) {
            if (node_set.count(e.dst)) {
                if (is_directed() || e.src < e.dst) {
                    g.add_edge(e.src, e.dst, e.weight);
                }
            }
        }
    }
    return g;
}

void Graph::clear() {
    nodes_.clear();
    adj_.clear();
    radj_.clear();
    edge_index_.clear();
    edge_count_ = 0;
    invalidate_ids();
}

void Graph::for_each_node(std::function<void(NodeId)> fn) const {
    for (auto& [id, _] : nodes_) fn(id);
}

void Graph::for_each_edge(std::function<void(const Edge&)> fn) const {
    for (auto& [nid, edges] : adj_) {
        for (auto& e : edges) fn(e);
    }
}

double Graph::total_weight() const {
    double total = 0.0;
    for (auto& [nid, edges] : adj_) {
        for (auto& e : edges) total += e.weight;
    }
    if (!is_directed()) total /= 2.0;
    return total;
}

std::vector<NodeId> Graph::leaf_nodes() const {
    std::vector<NodeId> leaves;
    for (auto& [nid, edges] : adj_) {
        if (edges.empty()) leaves.push_back(nid);
    }
    std::sort(leaves.begin(), leaves.end());
    return leaves;
}

std::vector<NodeId> Graph::root_nodes() const {
    std::vector<NodeId> roots;
    for (auto& [nid, _] : nodes_) {
        if (in_degree(nid) == 0) roots.push_back(nid);
    }
    std::sort(roots.begin(), roots.end());
    return roots;
}

bool Graph::is_tree() const {
    if (is_directed()) return false;
    if (node_count() == 0) return true;
    size_t unique_edges = 0;
    std::unordered_set<EdgeId> seen;
    for (auto& [nid, edges] : adj_) {
        for (auto& e : edges) {
            if (e.src <= e.dst && seen.insert(e.id).second) unique_edges++;
        }
    }
    return unique_edges == node_count() - 1;
}

size_t Graph::max_degree() const {
    size_t max_d = 0;
    for (auto& [nid, _] : nodes_) max_d = std::max(max_d, degree(nid));
    return max_d;
}

size_t Graph::min_degree() const {
    if (nodes_.empty()) return 0;
    size_t min_d = SIZE_MAX;
    for (auto& [nid, _] : nodes_) min_d = std::min(min_d, degree(nid));
    return min_d;
}

void Graph::add_nodes(size_t count) {
    for (size_t i = 0; i < count; i++) add_node();
}

void Graph::add_edges_batch(const std::vector<std::tuple<NodeId, NodeId, double>>& edges) {
    for (auto& [src, dst, w] : edges) add_edge(src, dst, w);
}

void Graph::remove_nodes(const std::vector<NodeId>& nodes) {
    for (auto nid : nodes) remove_node(nid);
}

Graph Graph::filter_by_weight(double min_weight, double max_weight) const {
    Graph g(type_);
    for (auto& [id, data] : nodes_) g.add_node_with_id(id);
    for_each_edge([&](const Edge& e) {
        if (!is_directed() && e.src > e.dst) return;
        if (e.weight >= min_weight && e.weight <= max_weight) {
            g.add_edge(e.src, e.dst, e.weight);
        }
    });
    return g;
}

Graph Graph::filter_by_degree(size_t min_deg, size_t max_deg) const {
    std::unordered_set<NodeId> keep;
    for (auto& [id, _] : nodes_) {
        size_t d = degree(id);
        if (d >= min_deg && d <= max_deg) keep.insert(id);
    }
    return subgraph(keep);
}

Graph Graph::complement() const {
    Graph g(type_);
    for (auto& [id, data] : nodes_) {
        g.add_node_with_id(id);
    }
    auto ids = node_ids();
    for (size_t i = 0; i < ids.size(); i++) {
        size_t start = is_directed() ? 0 : i + 1;
        for (size_t j = start; j < ids.size(); j++) {
            if (ids[i] != ids[j] && !has_edge(ids[i], ids[j])) {
                g.add_edge(ids[i], ids[j]);
            }
        }
    }
    return g;
}

} // namespace cryo