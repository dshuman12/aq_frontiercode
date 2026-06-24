#include "flow/flow.hpp"
#include <algorithm>
#include <queue>
#include <limits>

namespace cryo {

FlowResult edmonds_karp(const Graph& g, NodeId source, NodeId sink) {
    FlowResult result;
    result.max_flow = 0.0;

    if (!g.has_node(source) || !g.has_node(sink) || source == sink)
        return result;

    auto ids = g.node_ids();
    size_t n = ids.size();
    std::unordered_map<NodeId, size_t> id_to_idx;
    for (size_t i = 0; i < n; i++) id_to_idx[ids[i]] = i;

    std::vector<std::vector<double>> capacity(n, std::vector<double>(n, 0.0));
    std::vector<std::vector<double>> flow(n, std::vector<double>(n, 0.0));

    g.for_each_edge([&](const Edge& e) {
        size_t u = id_to_idx[e.src], v = id_to_idx[e.dst];
        capacity[u][v] += e.weight;
    });

    size_t si = id_to_idx[source], ti = id_to_idx[sink];

    while (true) {
        std::vector<int> parent(n, -1);
        parent[si] = static_cast<int>(si);
        std::queue<size_t> q;
        q.push(si);

        while (!q.empty() && parent[ti] == -1) {
            size_t u = q.front();
            q.pop();
            for (size_t v = 0; v < n; v++) {
                if (parent[v] == -1 && capacity[u][v] - flow[u][v] > 1e-12) {
                    parent[v] = static_cast<int>(u);
                    q.push(v);
                }
            }
        }

        if (parent[ti] == -1) break;

        double path_flow = std::numeric_limits<double>::infinity();
        for (size_t v = ti; v != si; v = static_cast<size_t>(parent[v])) {
            size_t u = static_cast<size_t>(parent[v]);
            path_flow = std::min(path_flow, capacity[u][v] - flow[u][v]);
        }

        for (size_t v = ti; v != si; v = static_cast<size_t>(parent[v])) {
            size_t u = static_cast<size_t>(parent[v]);
            flow[u][v] += path_flow;
            flow[v][u] -= path_flow;
        }

        result.max_flow += path_flow;
    }

    g.for_each_edge([&](const Edge& e) {
        size_t u = id_to_idx[e.src], v = id_to_idx[e.dst];
        if (flow[u][v] > 1e-12) {
            result.edge_flow[e.id] = flow[u][v];
        }
    });

    return result;
}

MinCutResult min_cut(const Graph& g, NodeId source, NodeId sink) {
    MinCutResult result;
    if (!g.has_node(source) || !g.has_node(sink)) return result;

    auto ids = g.node_ids();
    size_t n = ids.size();
    std::unordered_map<NodeId, size_t> id_to_idx;
    for (size_t i = 0; i < n; i++) id_to_idx[ids[i]] = i;

    std::vector<std::vector<double>> capacity(n, std::vector<double>(n, 0.0));
    std::vector<std::vector<double>> flow(n, std::vector<double>(n, 0.0));

    g.for_each_edge([&](const Edge& e) {
        capacity[id_to_idx[e.src]][id_to_idx[e.dst]] += e.weight;
    });

    size_t si = id_to_idx[source], ti = id_to_idx[sink];
    result.cut_value = 0.0;

    while (true) {
        std::vector<int> parent(n, -1);
        parent[si] = static_cast<int>(si);
        std::queue<size_t> q;
        q.push(si);
        while (!q.empty() && parent[ti] == -1) {
            size_t u = q.front(); q.pop();
            for (size_t v = 0; v < n; v++) {
                if (parent[v] == -1 && capacity[u][v] - flow[u][v] > 1e-12) {
                    parent[v] = static_cast<int>(u);
                    q.push(v);
                }
            }
        }
        if (parent[ti] == -1) break;
        double pf = std::numeric_limits<double>::infinity();
        for (size_t v = ti; v != si; v = (size_t)parent[v])
            pf = std::min(pf, capacity[(size_t)parent[v]][v] - flow[(size_t)parent[v]][v]);
        for (size_t v = ti; v != si; v = (size_t)parent[v]) {
            flow[(size_t)parent[v]][v] += pf;
            flow[v][(size_t)parent[v]] -= pf;
        }
        result.cut_value += pf;
    }

    std::vector<bool> visited(n, false);
    std::queue<size_t> bfs;
    bfs.push(si);
    visited[si] = true;
    while (!bfs.empty()) {
        size_t u = bfs.front(); bfs.pop();
        result.source_side.insert(ids[u]);
        for (size_t v = 0; v < n; v++) {
            if (!visited[v] && capacity[u][v] > 1e-12) {
                visited[v] = true;
                bfs.push(v);
            }
        }
    }
    for (size_t i = 0; i < n; i++) {
        if (!visited[i]) result.sink_side.insert(ids[i]);
    }

    g.for_each_edge([&](const Edge& e) {
        if (result.source_side.count(e.src) && result.sink_side.count(e.dst)) {
            result.cut_edges.push_back(e);
        }
    });

    return result;
}

double max_flow_value(const Graph& g, NodeId source, NodeId sink) {
    return edmonds_karp(g, source, sink).max_flow;
}

} // namespace cryo