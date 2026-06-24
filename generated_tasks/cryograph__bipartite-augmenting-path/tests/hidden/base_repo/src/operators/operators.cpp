#include "operators/operators.hpp"
#include <algorithm>
#include <queue>
#include <unordered_set>

namespace cryo {

Graph graph_union(const Graph& a, const Graph& b) {
    Graph g(a.type());
    for (auto nid : a.node_ids()) g.add_node_with_id(nid);
    for (auto nid : b.node_ids()) {
        if (!g.has_node(nid)) g.add_node_with_id(nid);
    }
    std::set<std::pair<NodeId, NodeId>> added;
    auto add_edges = [&](const Graph& src) {
        src.for_each_edge([&](const Edge& e) {
            if (!src.is_directed() && e.src > e.dst) return;
            if (added.insert({e.src, e.dst}).second) {
                g.add_edge(e.src, e.dst, e.weight);
            }
        });
    };
    add_edges(a);
    add_edges(b);
    return g;
}

Graph graph_intersection(const Graph& a, const Graph& b) {
    Graph g(a.type());
    for (auto nid : a.node_ids()) {
        if (b.has_node(nid)) g.add_node_with_id(nid);
    }
    std::set<std::pair<NodeId, NodeId>> added;
    a.for_each_edge([&](const Edge& e) {
        if (!a.is_directed() && e.src > e.dst) return;
        if (b.has_edge(e.src, e.dst) && g.has_node(e.src) && g.has_node(e.dst)) {
            if (added.insert({e.src, e.dst}).second) {
                g.add_edge(e.src, e.dst, e.weight);
            }
        }
    });
    return g;
}

Graph graph_difference(const Graph& a, const Graph& b) {
    Graph g(a.type());
    for (auto nid : a.node_ids()) g.add_node_with_id(nid);
    a.for_each_edge([&](const Edge& e) {
        if (!a.is_directed() && e.src > e.dst) return;
        if (!b.has_edge(e.src, e.dst)) {
            g.add_edge(e.src, e.dst, e.weight);
        }
    });
    return g;
}

Graph graph_symmetric_difference(const Graph& a, const Graph& b) {
    Graph g(a.type());
    for (auto nid : a.node_ids()) {
        if (!g.has_node(nid)) g.add_node_with_id(nid);
    }
    for (auto nid : b.node_ids()) {
        if (!g.has_node(nid)) g.add_node_with_id(nid);
    }
    std::set<std::pair<NodeId, NodeId>> added;
    a.for_each_edge([&](const Edge& e) {
        if (!a.is_directed() && e.src > e.dst) return;
        if (!b.has_edge(e.src, e.dst) && added.insert({e.src, e.dst}).second) {
            g.add_edge(e.src, e.dst, e.weight);
        }
    });
    b.for_each_edge([&](const Edge& e) {
        if (!b.is_directed() && e.src > e.dst) return;
        if (!a.has_edge(e.src, e.dst) && added.insert({e.src, e.dst}).second) {
            g.add_edge(e.src, e.dst, e.weight);
        }
    });
    return g;
}

Graph line_graph(const Graph& g) {
    Graph lg(g.type());
    std::vector<Edge> edges;
    std::unordered_set<EdgeId> seen;
    g.for_each_edge([&](const Edge& e) {
        if (!g.is_directed() && e.src > e.dst) return;
        if (seen.insert(e.id).second) edges.push_back(e);
    });

    for (size_t i = 0; i < edges.size(); i++) {
        lg.add_node_with_id(i);
    }

    for (size_t i = 0; i < edges.size(); i++) {
        for (size_t j = i + 1; j < edges.size(); j++) {
            bool share = (edges[i].src == edges[j].src ||
                         edges[i].src == edges[j].dst ||
                         edges[i].dst == edges[j].src ||
                         edges[i].dst == edges[j].dst);
            if (share) {
                if (g.is_directed()) {
                    if (edges[i].dst == edges[j].src) lg.add_edge(i, j);
                    if (edges[j].dst == edges[i].src) lg.add_edge(j, i);
                } else {
                    lg.add_edge(i, j);
                }
            }
        }
    }
    return lg;
}

Graph edge_contraction(const Graph& g, NodeId u, NodeId v) {
    if (!g.has_edge(u, v) && !g.has_edge(v, u)) return g;

    Graph result(g.type());
    for (auto nid : g.node_ids()) {
        if (nid != v) result.add_node_with_id(nid);
    }

    std::set<std::pair<NodeId, NodeId>> added;
    g.for_each_edge([&](const Edge& e) {
        if (!g.is_directed() && e.src > e.dst) return;
        NodeId s = (e.src == v) ? u : e.src;
        NodeId d = (e.dst == v) ? u : e.dst;
        if (s == d) return;
        if (added.insert({std::min(s, d), std::max(s, d)}).second) {
            result.add_edge(s, d, e.weight);
        }
    });
    return result;
}

Graph reverse_graph(const Graph& g) {
    return g.transpose();
}

bool is_subgraph(const Graph& sub, const Graph& super) {
    for (auto nid : sub.node_ids()) {
        if (!super.has_node(nid)) return false;
    }
    bool all_edges = true;
    sub.for_each_edge([&](const Edge& e) {
        if (!sub.is_directed() && e.src > e.dst) return;
        if (!super.has_edge(e.src, e.dst)) all_edges = false;
    });
    return all_edges;
}

Graph graph_power(const Graph& g, size_t k) {
    Graph result(g.type());
    auto ids = g.node_ids();
    for (auto nid : ids) result.add_node_with_id(nid);

    for (auto src : ids) {
        std::unordered_map<NodeId, size_t> dist;
        std::queue<NodeId> q;
        dist[src] = 0;
        q.push(src);
        while (!q.empty()) {
            NodeId cur = q.front(); q.pop();
            if (dist[cur] >= k) continue;
            for (auto& e : g.out_edges(cur)) {
                if (!dist.count(e.dst)) {
                    dist[e.dst] = dist[cur] + 1;
                    q.push(e.dst);
                }
            }
        }
        for (auto& [dst, d] : dist) {
            if (dst != src && d <= k) {
                if (!g.is_directed() && src > dst) continue;
                if (!result.has_edge(src, dst)) result.add_edge(src, dst);
            }
        }
    }
    return result;
}

Graph graph_square(const Graph& g) {
    return graph_power(g, 2);
}

size_t graph_hash(const Graph& g) {
    auto ids = g.node_ids();
    std::vector<size_t> node_hashes;
    for (auto nid : ids) {
        size_t h = std::hash<NodeId>{}(nid);
        auto nbrs = g.neighbors(nid);
        std::sort(nbrs.begin(), nbrs.end());
        for (auto n : nbrs) h ^= std::hash<NodeId>{}(n) + 0x9e3779b9 + (h << 6) + (h >> 2);
        node_hashes.push_back(h);
    }
    std::sort(node_hashes.begin(), node_hashes.end());
    size_t result = 0;
    for (auto h : node_hashes) result ^= h + 0x9e3779b9 + (result << 6) + (result >> 2);
    return result;
}

bool GraphDiff::identical() const {
    return added_nodes.empty() && removed_nodes.empty() &&
           added_edges.empty() && removed_edges.empty();
}

GraphDiff graph_diff(const Graph& a, const Graph& b) {
    GraphDiff d;
    auto ids_a = a.node_ids(), ids_b = b.node_ids();
    std::unordered_set<NodeId> sa(ids_a.begin(), ids_a.end());
    std::unordered_set<NodeId> sb(ids_b.begin(), ids_b.end());

    for (auto nid : ids_b) { if (!sa.count(nid)) d.added_nodes.push_back(nid); }
    for (auto nid : ids_a) { if (!sb.count(nid)) d.removed_nodes.push_back(nid); }

    std::set<std::pair<NodeId, NodeId>> ea, eb;
    a.for_each_edge([&](const Edge& e) {
        if (!a.is_directed() && e.src > e.dst) return;
        ea.insert({e.src, e.dst});
    });
    b.for_each_edge([&](const Edge& e) {
        if (!b.is_directed() && e.src > e.dst) return;
        eb.insert({e.src, e.dst});
    });

    for (auto& e : eb) { if (!ea.count(e)) d.added_edges.push_back(e); }
    for (auto& e : ea) { if (!eb.count(e)) d.removed_edges.push_back(e); }

    return d;
}

} // namespace cryo