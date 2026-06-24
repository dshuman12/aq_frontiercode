#pragma once
#include <cstdint>
#include <limits>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

namespace cryo {

using NodeId = uint64_t;
using EdgeId = uint64_t;

constexpr NodeId INVALID_NODE = std::numeric_limits<NodeId>::max();
constexpr double INF_WEIGHT = std::numeric_limits<double>::infinity();
constexpr double DEFAULT_WEIGHT = 1.0;

using PropertyValue = std::variant<int64_t, double, std::string, bool>;
using PropertyMap = std::unordered_map<std::string, PropertyValue>;

enum class GraphType { Directed, Undirected };

inline const char* graph_type_str(GraphType t) {
    return t == GraphType::Directed ? "directed" : "undirected";
}

struct Edge {
    EdgeId   id;
    NodeId   src;
    NodeId   dst;
    double   weight;
    PropertyMap props;

    Edge() : id(0), src(INVALID_NODE), dst(INVALID_NODE), weight(1.0) {}

    Edge(EdgeId eid, NodeId s, NodeId d, double w = 1.0)
        : id(eid), src(s), dst(d), weight(w) {}

    bool operator==(const Edge& o) const {
        return id == o.id && src == o.src && dst == o.dst;
    }

    bool operator<(const Edge& o) const {
        return weight < o.weight;
    }

    bool operator!=(const Edge& o) const {
        return !(*this == o);
    }
};

struct NodeData {
    NodeId      id;
    PropertyMap props;
    explicit NodeData(NodeId nid = INVALID_NODE) : id(nid) {}

    bool has_property(const std::string& key) const {
        return props.count(key) > 0;
    }
};

} // namespace cryo