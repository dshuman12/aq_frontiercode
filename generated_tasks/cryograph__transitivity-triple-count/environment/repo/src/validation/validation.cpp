#include "validation/validation.hpp"
#include "components/components.hpp"
#include "algo/traversal.hpp"
#include <algorithm>
#include <sstream>
#include <set>

namespace cryo {

bool is_simple(const Graph& g) {
    for (auto nid : g.node_ids()) {
        std::set<NodeId> seen;
        for (auto& e : g.out_edges(nid)) {
            if (e.dst == nid) return false;
            if (!seen.insert(e.dst).second) return false;
        }
    }
    return true;
}

bool is_regular(const Graph& g) {
    size_t k;
    return is_regular(g, k);
}

bool is_regular(const Graph& g, size_t& k) {
    auto ids = g.node_ids();
    if (ids.empty()) { k = 0; return true; }
    k = g.degree(ids[0]);
    for (auto nid : ids) {
        if (g.degree(nid) != k) return false;
    }
    return true;
}

bool is_complete(const Graph& g) {
    size_t n = g.node_count();
    if (n <= 1) return true;
    size_t expected = g.is_directed() ? n * (n - 1) : n * (n - 1) / 2;
    return g.unique_edge_count() == expected;
}

bool is_planar_k33_k5_free(const Graph& g) {
    size_t n = g.node_count();
    size_t m = g.unique_edge_count();
    if (n < 3) return true;
    return m <= 3 * n - 6;
}

bool is_forest(const Graph& g) {
    if (g.is_directed()) return !has_cycle(g);
    return !has_cycle(g);
}

bool is_acyclic(const Graph& g) {
    return !has_cycle(g);
}

bool is_tournament(const Graph& g) {
    if (!g.is_directed()) return false;
    auto ids = g.node_ids();
    for (size_t i = 0; i < ids.size(); i++) {
        for (size_t j = i + 1; j < ids.size(); j++) {
            bool ij = g.has_edge(ids[i], ids[j]);
            bool ji = g.has_edge(ids[j], ids[i]);
            if (ij == ji) return false;
        }
    }
    return true;
}

bool is_eulerian(const Graph& g) {
    if (!is_connected(g)) return false;
    if (g.is_directed()) {
        for (auto nid : g.node_ids()) {
            if (g.in_degree(nid) != g.out_degree(nid)) return false;
        }
    } else {
        for (auto nid : g.node_ids()) {
            if (g.out_degree(nid) % 2 != 0) return false;
        }
    }
    return true;
}

ValidationReport validate(const Graph& g) {
    ValidationReport r;
    r.node_count = g.node_count();
    r.edge_count = g.edge_count();
    r.directed = g.is_directed();
    r.simple = is_simple(g);
    r.connected = is_connected(g);
    r.acyclic = is_acyclic(g);
    r.bipartite = is_bipartite(g);
    r.regular = is_regular(g);
    r.forest = is_forest(g) && !g.is_directed();
    r.tree = g.is_tree();
    r.components = component_count(g);
    return r;
}

std::string ValidationReport::to_string() const {
    std::ostringstream oss;
    oss << "Nodes: " << node_count << " | Edges: " << edge_count
        << " | " << (directed ? "Directed" : "Undirected")
        << " | Simple: " << (simple ? "yes" : "no")
        << " | Connected: " << (connected ? "yes" : "no")
        << " | Acyclic: " << (acyclic ? "yes" : "no")
        << " | Bipartite: " << (bipartite ? "yes" : "no")
        << " | Regular: " << (regular ? "yes" : "no")
        << " | Forest: " << (forest ? "yes" : "no")
        << " | Tree: " << (tree ? "yes" : "no")
        << " | Components: " << components;
    return oss.str();
}

bool is_isomorphic_degree_check(const Graph& a, const Graph& b) {
    if (a.node_count() != b.node_count()) return false;
    if (a.edge_count() != b.edge_count()) return false;

    auto ids_a = a.node_ids(), ids_b = b.node_ids();
    std::vector<size_t> degs_a, degs_b;
    for (auto nid : ids_a) degs_a.push_back(a.degree(nid));
    for (auto nid : ids_b) degs_b.push_back(b.degree(nid));
    std::sort(degs_a.begin(), degs_a.end());
    std::sort(degs_b.begin(), degs_b.end());
    return degs_a == degs_b;
}

} // namespace cryo