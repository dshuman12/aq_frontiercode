#include "components/components.hpp"
#include <algorithm>
#include <queue>
#include <stack>
#include <stdexcept>

namespace cryo {

ComponentResult connected_components(const Graph& g) {
    ComponentResult res;
    std::unordered_set<NodeId> visited;
    auto ids = g.node_ids();

    for (auto start : ids) {
        if (visited.count(start)) continue;
        std::vector<NodeId> comp;
        std::queue<NodeId> q;
        q.push(start);
        visited.insert(start);

        while (!q.empty()) {
            NodeId cur = q.front();
            q.pop();
            comp.push_back(cur);
            for (auto& e : g.out_edges(cur)) {
                if (visited.insert(e.dst).second) q.push(e.dst);
            }
            if (g.is_directed()) {
                for (auto& [nid, edges] : std::unordered_map<NodeId, std::vector<Edge>>()) {}
                auto in = g.in_edges(cur);
                for (auto& e : in) {
                    if (visited.insert(e.src).second) q.push(e.src);
                }
            }
        }
        size_t idx = res.components.size();
        for (auto nid : comp) res.node_to_component[nid] = idx;
        std::sort(comp.begin(), comp.end());
        res.components.push_back(std::move(comp));
    }
    return res;
}

ComponentResult strongly_connected_components(const Graph& g) {
    ComponentResult res;
    auto ids = g.node_ids();
    size_t n = ids.size();
    if (n == 0) return res;

    std::unordered_map<NodeId, size_t> disc, low;
    std::unordered_map<NodeId, bool> on_stack;
    std::stack<NodeId> stk;
    size_t timer = 0;

    struct Frame {
        NodeId node;
        size_t edge_idx;
        bool returned;
    };

    for (auto nid : ids) {
        disc[nid] = SIZE_MAX;
        on_stack[nid] = false;
    }

    for (auto start : ids) {
        if (disc[start] != SIZE_MAX) continue;

        std::stack<Frame> call_stack;
        call_stack.push({start, 0, false});
        disc[start] = low[start] = timer++;
        stk.push(start);
        on_stack[start] = true;

        while (!call_stack.empty()) {
            auto& frame = call_stack.top();
            auto& edges = g.out_edges(frame.node);

            if (frame.returned) {
                NodeId child = edges[frame.edge_idx - 1].dst;
                low[frame.node] = std::min(low[frame.node], low[child]);
                frame.returned = false;
            }

            if (frame.edge_idx < edges.size()) {
                NodeId next = edges[frame.edge_idx].dst;
                frame.edge_idx++;

                if (disc[next] == SIZE_MAX) {
                    disc[next] = low[next] = timer++;
                    stk.push(next);
                    on_stack[next] = true;
                    call_stack.push({next, 0, false});
                } else if (on_stack[next]) {
                    low[frame.node] = std::min(low[frame.node], disc[next]);
                }
            } else {
                if (low[frame.node] == disc[frame.node]) {
                    std::vector<NodeId> comp;
                    while (true) {
                        NodeId w = stk.top();
                        stk.pop();
                        on_stack[w] = false;
                        comp.push_back(w);
                        if (w == frame.node) break;
                    }
                    size_t idx = res.components.size();
                    for (auto nid : comp) res.node_to_component[nid] = idx;
                    std::sort(comp.begin(), comp.end());
                    res.components.push_back(std::move(comp));
                }

                call_stack.pop();
                if (!call_stack.empty()) {
                    call_stack.top().returned = true;
                }
            }
        }
    }
    return res;
}

std::vector<std::pair<NodeId, NodeId>> find_bridges(const Graph& g) {
    std::vector<std::pair<NodeId, NodeId>> bridges;
    auto ids = g.node_ids();

    std::unordered_map<NodeId, size_t> disc, low;
    size_t timer = 0;

    struct Frame {
        NodeId node;
        NodeId parent;
        size_t edge_idx;
        bool returned;
    };

    for (auto nid : ids) disc[nid] = SIZE_MAX;

    for (auto start : ids) {
        if (disc[start] != SIZE_MAX) continue;

        std::stack<Frame> call_stack;
        disc[start] = low[start] = timer++;
        call_stack.push({start, INVALID_NODE, 0, false});

        while (!call_stack.empty()) {
            auto& frame = call_stack.top();
            auto& edges = g.out_edges(frame.node);

            if (frame.returned) {
                NodeId child = edges[frame.edge_idx - 1].dst;
                low[frame.node] = std::min(low[frame.node], low[child]);
                if (low[child] > disc[frame.node]) {
                    NodeId a = std::min(frame.node, child);
                    NodeId b = std::max(frame.node, child);
                    bridges.push_back({a, b});
                }
                frame.returned = false;
            }

            if (frame.edge_idx < edges.size()) {
                NodeId next = edges[frame.edge_idx].dst;
                frame.edge_idx++;

                if (disc[next] == SIZE_MAX) {
                    disc[next] = low[next] = timer++;
                    call_stack.push({next, frame.node, 0, false});
                } else if (next != frame.parent) {
                    low[frame.node] = std::min(low[frame.node], disc[next]);
                }
            } else {
                call_stack.pop();
                if (!call_stack.empty()) {
                    call_stack.top().returned = true;
                }
            }
        }
    }
    return bridges;
}

std::vector<NodeId> find_articulation_points(const Graph& g) {
    std::vector<NodeId> aps;
    auto ids = g.node_ids();
    std::unordered_map<NodeId, size_t> disc, low;
    std::unordered_set<NodeId> ap_set;
    size_t timer = 0;

    struct Frame {
        NodeId node;
        NodeId parent;
        size_t edge_idx;
        size_t children;
        bool returned;
    };

    for (auto nid : ids) disc[nid] = SIZE_MAX;

    for (auto start : ids) {
        if (disc[start] != SIZE_MAX) continue;

        std::stack<Frame> call_stack;
        disc[start] = low[start] = timer++;
        call_stack.push({start, INVALID_NODE, 0, 0, false});

        while (!call_stack.empty()) {
            auto& frame = call_stack.top();
            auto& edges = g.out_edges(frame.node);

            if (frame.returned) {
                NodeId child = edges[frame.edge_idx - 1].dst;
                low[frame.node] = std::min(low[frame.node], low[child]);
                frame.children++;

                if (frame.parent == INVALID_NODE && frame.children > 1) {
                    ap_set.insert(frame.node);
                }
                if (frame.parent != INVALID_NODE && low[child] >= disc[frame.node]) {
                    ap_set.insert(frame.node);
                }
                frame.returned = false;
            }

            if (frame.edge_idx < edges.size()) {
                NodeId next = edges[frame.edge_idx].dst;
                frame.edge_idx++;

                if (disc[next] == SIZE_MAX) {
                    disc[next] = low[next] = timer++;
                    call_stack.push({next, frame.node, 0, 0, false});
                } else if (next != frame.parent) {
                    low[frame.node] = std::min(low[frame.node], disc[next]);
                }
            } else {
                call_stack.pop();
                if (!call_stack.empty()) {
                    call_stack.top().returned = true;
                }
            }
        }
    }

    aps.assign(ap_set.begin(), ap_set.end());
    std::sort(aps.begin(), aps.end());
    return aps;
}

bool is_bipartite(const Graph& g) {
    std::unordered_map<NodeId, int> coloring;
    return is_bipartite(g, coloring);
}

bool is_bipartite(const Graph& g, std::unordered_map<NodeId, int>& coloring) {
    auto ids = g.node_ids();
    for (auto nid : ids) coloring[nid] = -1;

    for (auto start : ids) {
        if (coloring[start] != -1) continue;
        std::queue<NodeId> q;
        q.push(start);
        coloring[start] = 0;

        while (!q.empty()) {
            NodeId cur = q.front();
            q.pop();
            for (auto& e : g.out_edges(cur)) {
                if (coloring[e.dst] == -1) {
                    coloring[e.dst] = 1 - coloring[cur];
                    q.push(e.dst);
                } else if (coloring[e.dst] == coloring[cur]) {
                    return false;
                }
            }
        }
    }
    return true;
}

bool is_connected(const Graph& g) {
    if (g.node_count() <= 1) return true;
    auto ids = g.node_ids();
    std::unordered_set<NodeId> visited;
    std::queue<NodeId> q;
    q.push(ids[0]);
    visited.insert(ids[0]);

    while (!q.empty()) {
        NodeId cur = q.front();
        q.pop();
        for (auto& e : g.out_edges(cur)) {
            if (visited.insert(e.dst).second) q.push(e.dst);
        }
    }
    return visited.size() == g.node_count();
}

bool is_strongly_connected(const Graph& g) {
    if (g.node_count() <= 1) return true;
    auto scc = strongly_connected_components(g);
    return scc.count() == 1;
}

Graph condensation(const Graph& g) {
    auto scc = strongly_connected_components(g);
    Graph cond(GraphType::Directed);
    for (size_t i = 0; i < scc.count(); i++) {
        cond.add_node_with_id(i);
    }
    std::set<std::pair<size_t, size_t>> added;
    g.for_each_edge([&](const Edge& e) {
        size_t cs = scc.node_to_component.at(e.src);
        size_t cd = scc.node_to_component.at(e.dst);
        if (cs != cd && added.insert({cs, cd}).second) {
            cond.add_edge(cs, cd);
        }
    });
    return cond;
}

size_t largest_component_size(const Graph& g) {
    auto cc = connected_components(g);
    size_t max_size = 0;
    for (auto& c : cc.components) max_size = std::max(max_size, c.size());
    return max_size;
}

size_t component_count(const Graph& g) {
    return connected_components(g).count();
}

} // namespace cryo