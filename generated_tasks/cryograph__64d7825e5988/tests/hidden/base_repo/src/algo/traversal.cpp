#include "algo/traversal.hpp"
#include <algorithm>
#include <queue>
#include <stack>
#include <stdexcept>
#include <unordered_set>

namespace cryo {

BFSResult bfs(const Graph& g, NodeId start) {
    BFSResult res;
    if (!g.has_node(start)) return res;

    std::queue<NodeId> q;
    std::unordered_set<NodeId> visited;
    q.push(start);
    visited.insert(start);
    res.depth[start] = 0;
    res.parent[start] = INVALID_NODE;

    while (!q.empty()) {
        NodeId cur = q.front();
        q.pop();
        res.order.push_back(cur);
        size_t d = res.depth[cur];

        for (auto& e : g.out_edges(cur)) {
            if (visited.insert(e.dst).second) {
                res.depth[e.dst] = d + 1;
                res.parent[e.dst] = cur;
                q.push(e.dst);
            }
        }
    }
    return res;
}

BFSResult bfs_multi(const Graph& g, const std::vector<NodeId>& starts) {
    BFSResult res;
    std::queue<NodeId> q;
    std::unordered_set<NodeId> visited;

    for (auto s : starts) {
        if (g.has_node(s) && visited.insert(s).second) {
            q.push(s);
            res.depth[s] = 0;
            res.parent[s] = INVALID_NODE;
        }
    }

    while (!q.empty()) {
        NodeId cur = q.front();
        q.pop();
        res.order.push_back(cur);
        size_t d = res.depth[cur];

        for (auto& e : g.out_edges(cur)) {
            if (visited.insert(e.dst).second) {
                res.depth[e.dst] = d + 1;
                res.parent[e.dst] = cur;
                q.push(e.dst);
            }
        }
    }
    return res;
}

void bfs_visit(const Graph& g, NodeId start, VisitorFn visitor) {
    if (!g.has_node(start)) return;
    std::queue<std::pair<NodeId, size_t>> q;
    std::unordered_set<NodeId> visited;
    q.push({start, 0});
    visited.insert(start);

    while (!q.empty()) {
        auto [cur, depth] = q.front();
        q.pop();
        if (!visitor(cur, depth)) return;
        for (auto& e : g.out_edges(cur)) {
            if (visited.insert(e.dst).second) {
                q.push({e.dst, depth + 1});
            }
        }
    }
}

DFSResult dfs(const Graph& g, NodeId start) {
    DFSResult res;
    if (!g.has_node(start)) return res;

    size_t timer = 0;
    std::unordered_set<NodeId> visited;

    struct Frame {
        NodeId node;
        size_t edge_idx;
    };

    std::stack<Frame> stk;
    stk.push({start, 0});
    visited.insert(start);
    res.discover[start] = timer++;
    res.pre_order.push_back(start);
    res.parent[start] = INVALID_NODE;

    while (!stk.empty()) {
        auto& frame = stk.top();
        auto& edges = g.out_edges(frame.node);

        if (frame.edge_idx < edges.size()) {
            NodeId next = edges[frame.edge_idx].dst;
            frame.edge_idx++;
            if (visited.insert(next).second) {
                res.discover[next] = timer++;
                res.pre_order.push_back(next);
                res.parent[next] = frame.node;
                stk.push({next, 0});
            }
        } else {
            res.finish[frame.node] = timer++;
            res.post_order.push_back(frame.node);
            stk.pop();
        }
    }
    return res;
}

DFSResult dfs_full(const Graph& g) {
    DFSResult res;
    size_t timer = 0;
    std::unordered_set<NodeId> visited;

    struct Frame {
        NodeId node;
        size_t edge_idx;
    };

    auto ids = g.node_ids();
    for (auto start : ids) {
        if (visited.count(start)) continue;

        std::stack<Frame> stk;
        stk.push({start, 0});
        visited.insert(start);
        res.discover[start] = timer++;
        res.pre_order.push_back(start);
        res.parent[start] = INVALID_NODE;

        while (!stk.empty()) {
            auto& frame = stk.top();
            auto& edges = g.out_edges(frame.node);

            if (frame.edge_idx < edges.size()) {
                NodeId next = edges[frame.edge_idx].dst;
                frame.edge_idx++;
                if (visited.insert(next).second) {
                    res.discover[next] = timer++;
                    res.pre_order.push_back(next);
                    res.parent[next] = frame.node;
                    stk.push({next, 0});
                }
            } else {
                res.finish[frame.node] = timer++;
                res.post_order.push_back(frame.node);
                stk.pop();
            }
        }
    }
    return res;
}

void dfs_visit(const Graph& g, NodeId start,
               std::function<void(NodeId)> on_discover,
               std::function<void(NodeId)> on_finish) {
    if (!g.has_node(start)) return;

    struct Frame {
        NodeId node;
        size_t edge_idx;
    };

    std::unordered_set<NodeId> visited;
    std::stack<Frame> stk;
    stk.push({start, 0});
    visited.insert(start);
    if (on_discover) on_discover(start);

    while (!stk.empty()) {
        auto& frame = stk.top();
        auto& edges = g.out_edges(frame.node);

        if (frame.edge_idx < edges.size()) {
            NodeId next = edges[frame.edge_idx].dst;
            frame.edge_idx++;
            if (visited.insert(next).second) {
                if (on_discover) on_discover(next);
                stk.push({next, 0});
            }
        } else {
            if (on_finish) on_finish(frame.node);
            stk.pop();
        }
    }
}

std::vector<NodeId> topological_sort(const Graph& g) {
    if (!g.is_directed()) {
        throw std::runtime_error("Topological sort requires a directed graph");
    }

    std::unordered_map<NodeId, size_t> in_deg;
    auto ids = g.node_ids();
    for (auto nid : ids) in_deg[nid] = 0;
    for (auto nid : ids) {
        for (auto& e : g.out_edges(nid)) {
            in_deg[e.dst]++;
        }
    }

    std::queue<NodeId> q;
    for (auto& [nid, deg] : in_deg) {
        if (deg == 0) q.push(nid);
    }

    std::vector<NodeId> result;
    result.reserve(ids.size());

    while (!q.empty()) {
        NodeId cur = q.front();
        q.pop();
        result.push_back(cur);

        for (auto& e : g.out_edges(cur)) {
            if (--in_deg[e.dst] == 0) q.push(e.dst);
        }
    }

    if (result.size() != ids.size()) {
        throw std::runtime_error("Graph contains a cycle — topological sort impossible");
    }
    return result;
}

bool has_cycle(const Graph& g) {
    if (!g.is_directed()) {
        std::unordered_set<NodeId> visited;
        auto ids = g.node_ids();
        for (auto start : ids) {
            if (visited.count(start)) continue;
            std::stack<std::pair<NodeId, NodeId>> stk;
            stk.push({start, INVALID_NODE});
            visited.insert(start);
            while (!stk.empty()) {
                auto [cur, par] = stk.top();
                stk.pop();
                for (auto& e : g.out_edges(cur)) {
                    if (!visited.count(e.dst)) {
                        visited.insert(e.dst);
                        stk.push({e.dst, cur});
                    } else if (e.dst != par) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    enum Color { WHITE, GRAY, BLACK };
    std::unordered_map<NodeId, Color> color;
    auto ids = g.node_ids();
    for (auto nid : ids) color[nid] = WHITE;

    struct Frame {
        NodeId node;
        size_t edge_idx;
    };

    for (auto start : ids) {
        if (color[start] != WHITE) continue;
        std::stack<Frame> stk;
        stk.push({start, 0});
        color[start] = GRAY;

        while (!stk.empty()) {
            auto& frame = stk.top();
            auto& edges = g.out_edges(frame.node);

            if (frame.edge_idx < edges.size()) {
                NodeId next = edges[frame.edge_idx].dst;
                frame.edge_idx++;
                if (color[next] == GRAY) return true;
                if (color[next] == WHITE) {
                    color[next] = GRAY;
                    stk.push({next, 0});
                }
            } else {
                color[frame.node] = BLACK;
                stk.pop();
            }
        }
    }
    return false;
}

std::vector<NodeId> iddfs(const Graph& g, NodeId start, NodeId target, size_t max_depth) {
    if (!g.has_node(start)) return {};
    if (start == target) return {start};

    for (size_t limit = 0; limit <= max_depth; limit++) {
        struct Frame {
            NodeId node;
            size_t edge_idx;
            size_t depth;
        };

        std::stack<Frame> stk;
        stk.push({start, 0, 0});
        std::unordered_map<NodeId, NodeId> parent;
        parent[start] = INVALID_NODE;

        while (!stk.empty()) {
            auto& frame = stk.top();

            if (frame.node == target) {
                std::vector<NodeId> path;
                NodeId cur = target;
                while (cur != INVALID_NODE) {
                    path.push_back(cur);
                    cur = parent[cur];
                }
                std::reverse(path.begin(), path.end());
                return path;
            }

            auto& edges = g.out_edges(frame.node);
            if (frame.edge_idx < edges.size() && frame.depth < limit) {
                NodeId next = edges[frame.edge_idx].dst;
                frame.edge_idx++;
                if (!parent.count(next) || next == target) {
                    parent[next] = frame.node;
                    stk.push({next, 0, frame.depth + 1});
                }
            } else {
                stk.pop();
            }
        }
    }
    return {};
}

LevelOrder level_order(const Graph& g, NodeId start) {
    LevelOrder result;
    if (!g.has_node(start)) return result;

    std::queue<NodeId> q;
    std::unordered_set<NodeId> visited;
    q.push(start);
    visited.insert(start);

    while (!q.empty()) {
        size_t level_size = q.size();
        std::vector<NodeId> level;
        level.reserve(level_size);

        for (size_t i = 0; i < level_size; i++) {
            NodeId cur = q.front();
            q.pop();
            level.push_back(cur);

            for (auto& e : g.out_edges(cur)) {
                if (visited.insert(e.dst).second) {
                    q.push(e.dst);
                }
            }
        }
        result.levels.push_back(std::move(level));
    }
    return result;
}

size_t count_reachable(const Graph& g, NodeId start) {
    auto res = bfs(g, start);
    return res.order.size();
}

bool is_dag(const Graph& g) {
    return g.is_directed() && !has_cycle(g);
}

} // namespace cryo