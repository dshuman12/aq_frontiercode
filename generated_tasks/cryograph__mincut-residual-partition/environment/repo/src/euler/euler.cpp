#include "euler/euler.hpp"
#include "components/components.hpp"
#include <algorithm>
#include <stack>
#include <queue>
#include <unordered_set>

namespace cryo {

bool has_eulerian_circuit(const Graph& g) {
    if (g.node_count() == 0) return false;
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

bool has_eulerian_path(const Graph& g) {
    if (g.node_count() == 0) return false;
    if (!is_connected(g)) return false;

    if (g.is_directed()) {
        int start_count = 0, end_count = 0;
        for (auto nid : g.node_ids()) {
            int diff = static_cast<int>(g.out_degree(nid)) - static_cast<int>(g.in_degree(nid));
            if (diff == 1) start_count++;
            else if (diff == -1) end_count++;
            else if (diff != 0) return false;
        }
        return (start_count == 0 && end_count == 0) || (start_count == 1 && end_count == 1);
    } else {
        int odd_count = 0;
        for (auto nid : g.node_ids()) {
            if (g.out_degree(nid) % 2 != 0) odd_count++;
        }
        return odd_count == 0 || odd_count == 2;
    }
}

std::vector<NodeId> eulerian_circuit(const Graph& g) {
    if (!has_eulerian_circuit(g)) return {};
    auto ids = g.node_ids();
    if (ids.empty()) return {};

    std::unordered_map<NodeId, std::vector<std::pair<NodeId, size_t>>> adj;
    std::vector<bool> used;
    size_t edge_idx = 0;

    for (auto nid : ids) adj[nid] = {};

    std::unordered_set<EdgeId> seen;
    g.for_each_edge([&](const Edge& e) {
        if (!g.is_directed() && e.src > e.dst) return;
        if (!seen.insert(e.id).second) return;
        size_t idx = edge_idx++;
        adj[e.src].push_back({e.dst, idx});
        if (!g.is_directed()) adj[e.dst].push_back({e.src, idx});
    });
    used.resize(edge_idx, false);

    std::vector<NodeId> circuit;
    std::stack<NodeId> stk;
    stk.push(ids[0]);

    std::unordered_map<NodeId, size_t> edge_ptr;
    for (auto nid : ids) edge_ptr[nid] = 0;

    while (!stk.empty()) {
        NodeId v = stk.top();
        bool found = false;
        while (edge_ptr[v] < adj[v].size()) {
            auto [w, idx] = adj[v][edge_ptr[v]];
            edge_ptr[v]++;
            if (!used[idx]) {
                used[idx] = true;
                stk.push(w);
                found = true;
                break;
            }
        }
        if (!found) {
            circuit.push_back(v);
            stk.pop();
        }
    }
    std::reverse(circuit.begin(), circuit.end());
    return circuit;
}

std::vector<NodeId> eulerian_path(const Graph& g) {
    if (!has_eulerian_path(g)) return {};
    if (has_eulerian_circuit(g)) return eulerian_circuit(g);

    auto ids = g.node_ids();
    NodeId start = ids[0];

    if (g.is_directed()) {
        for (auto nid : ids) {
            if (g.out_degree(nid) - g.in_degree(nid) == 1) { start = nid; break; }
        }
    } else {
        for (auto nid : ids) {
            if (g.out_degree(nid) % 2 != 0) { start = nid; break; }
        }
    }

    std::unordered_map<NodeId, std::vector<std::pair<NodeId, size_t>>> adj;
    std::vector<bool> used;
    size_t edge_idx = 0;

    std::unordered_set<EdgeId> seen;
    g.for_each_edge([&](const Edge& e) {
        if (!g.is_directed() && e.src > e.dst) return;
        if (!seen.insert(e.id).second) return;
        size_t idx = edge_idx++;
        adj[e.src].push_back({e.dst, idx});
        if (!g.is_directed()) adj[e.dst].push_back({e.src, idx});
    });
    used.resize(edge_idx, false);

    std::vector<NodeId> path;
    std::stack<NodeId> stk;
    stk.push(start);
    std::unordered_map<NodeId, size_t> edge_ptr;
    for (auto nid : ids) edge_ptr[nid] = 0;

    while (!stk.empty()) {
        NodeId v = stk.top();
        bool found = false;
        while (edge_ptr[v] < adj[v].size()) {
            auto [w, idx] = adj[v][edge_ptr[v]];
            edge_ptr[v]++;
            if (!used[idx]) {
                used[idx] = true;
                stk.push(w);
                found = true;
                break;
            }
        }
        if (!found) {
            path.push_back(v);
            stk.pop();
        }
    }
    std::reverse(path.begin(), path.end());
    return path;
}

bool has_hamiltonian_path(const Graph& g) {
    auto ids = g.node_ids();
    size_t n = ids.size();
    if (n <= 1) return true;
    if (n > 20) return false;

    std::unordered_map<NodeId, size_t> id_map;
    for (size_t i = 0; i < n; i++) id_map[ids[i]] = i;

    std::vector<std::vector<bool>> adj_mat(n, std::vector<bool>(n, false));
    g.for_each_edge([&](const Edge& e) {
        adj_mat[id_map[e.src]][id_map[e.dst]] = true;
        if (!g.is_directed()) adj_mat[id_map[e.dst]][id_map[e.src]] = true;
    });

    std::vector<std::vector<bool>> dp(1u << n, std::vector<bool>(n, false));
    for (size_t i = 0; i < n; i++) dp[1u << i][i] = true;

    for (uint32_t mask = 1; mask < (1u << n); mask++) {
        for (size_t u = 0; u < n; u++) {
            if (!dp[mask][u]) continue;
            for (size_t v = 0; v < n; v++) {
                if (mask & (1u << v)) continue;
                if (adj_mat[u][v]) {
                    dp[mask | (1u << v)][v] = true;
                }
            }
        }
    }

    uint32_t full = (1u << n) - 1;
    for (size_t i = 0; i < n; i++) {
        if (dp[full][i]) return true;
    }
    return false;
}

std::vector<NodeId> find_cycle(const Graph& g, NodeId start) {
    if (!g.has_node(start)) return {};
    std::unordered_map<NodeId, NodeId> parent;
    parent[start] = INVALID_NODE;
    std::queue<NodeId> q;
    q.push(start);

    while (!q.empty()) {
        NodeId cur = q.front(); q.pop();
        for (auto& e : g.out_edges(cur)) {
            if (e.dst == start && parent.size() > 1) {
                std::vector<NodeId> cycle;
                NodeId c = cur;
                while (c != INVALID_NODE) { cycle.push_back(c); c = parent[c]; }
                std::reverse(cycle.begin(), cycle.end());
                return cycle;
            }
            if (!parent.count(e.dst)) {
                parent[e.dst] = cur;
                q.push(e.dst);
            }
        }
    }
    return {};
}

size_t girth(const Graph& g) {
    auto ids = g.node_ids();
    size_t min_cycle = SIZE_MAX;

    for (auto start : ids) {
        std::unordered_map<NodeId, size_t> dist;
        std::unordered_map<NodeId, NodeId> parent;
        dist[start] = 0;
        parent[start] = INVALID_NODE;
        std::queue<NodeId> q;
        q.push(start);

        while (!q.empty()) {
            NodeId cur = q.front(); q.pop();
            for (auto& e : g.out_edges(cur)) {
                if (!dist.count(e.dst)) {
                    dist[e.dst] = dist[cur] + 1;
                    parent[e.dst] = cur;
                    q.push(e.dst);
                } else if (!g.is_directed() && e.dst != parent[cur]) {
                    size_t cycle_len = dist[cur] + dist[e.dst] + 1;
                    min_cycle = std::min(min_cycle, cycle_len);
                } else if (g.is_directed() && dist.count(e.dst)) {
                    size_t cycle_len = dist[cur] - dist[e.dst] + 1;
                    if (cycle_len > 1) min_cycle = std::min(min_cycle, cycle_len);
                }
            }
        }
    }
    return (min_cycle == SIZE_MAX) ? 0 : min_cycle;
}

} // namespace cryo