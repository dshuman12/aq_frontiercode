#include "io/serializer.hpp"
#include <cstring>
#include <sstream>
#include <algorithm>

namespace cryo {

static const uint32_t MAGIC = 0x43525947; // "CRYG"
static const uint32_t VERSION = 1;

void GraphSerializer::write_binary(const Graph& g, std::ostream& out) {
    out.write(reinterpret_cast<const char*>(&MAGIC), 4);
    out.write(reinterpret_cast<const char*>(&VERSION), 4);

    uint8_t directed = g.is_directed() ? 1 : 0;
    out.write(reinterpret_cast<const char*>(&directed), 1);

    uint64_t nc = g.node_count();
    out.write(reinterpret_cast<const char*>(&nc), 8);

    auto ids = g.node_ids();
    for (auto nid : ids) {
        out.write(reinterpret_cast<const char*>(&nid), 8);
    }

    auto edges = g.all_edges();
    std::vector<Edge> unique_edges;
    if (!g.is_directed()) {
        std::unordered_set<EdgeId> seen;
        for (auto& e : edges) {
            if (e.src <= e.dst && seen.insert(e.id).second) {
                unique_edges.push_back(e);
            }
        }
    } else {
        unique_edges = edges;
    }

    uint64_t ec = unique_edges.size();
    out.write(reinterpret_cast<const char*>(&ec), 8);

    for (auto& e : unique_edges) {
        out.write(reinterpret_cast<const char*>(&e.src), 8);
        out.write(reinterpret_cast<const char*>(&e.dst), 8);
        out.write(reinterpret_cast<const char*>(&e.weight), 8);
    }
}

Graph GraphSerializer::read_binary(std::istream& in) {
    uint32_t magic, version;
    in.read(reinterpret_cast<char*>(&magic), 4);
    in.read(reinterpret_cast<char*>(&version), 4);
    if (magic != MAGIC) throw std::runtime_error("Invalid binary format: bad magic");

    uint8_t directed;
    in.read(reinterpret_cast<char*>(&directed), 1);
    GraphType type = directed ? GraphType::Directed : GraphType::Undirected;
    Graph g(type);

    uint64_t nc;
    in.read(reinterpret_cast<char*>(&nc), 8);
    for (uint64_t i = 0; i < nc; i++) {
        NodeId nid;
        in.read(reinterpret_cast<char*>(&nid), 8);
        g.add_node_with_id(nid);
    }

    uint64_t ec;
    in.read(reinterpret_cast<char*>(&ec), 8);
    for (uint64_t i = 0; i < ec; i++) {
        NodeId src, dst;
        double weight;
        in.read(reinterpret_cast<char*>(&src), 8);
        in.read(reinterpret_cast<char*>(&dst), 8);
        in.read(reinterpret_cast<char*>(&weight), 8);
        g.add_edge(src, dst, weight);
    }

    return g;
}

void GraphSerializer::write_edge_list(const Graph& g, std::ostream& out) {
    auto edges = g.all_edges();
    std::unordered_set<EdgeId> seen;
    for (auto& e : edges) {
        if (!g.is_directed() && e.src > e.dst) continue;
        if (seen.insert(e.id).second) {
            out << e.src << " " << e.dst << " " << e.weight << "\n";
        }
    }
}

Graph GraphSerializer::read_edge_list(std::istream& in, GraphType type) {
    Graph g(type);
    NodeId src, dst;
    double weight;
    std::unordered_set<NodeId> nodes;

    std::string line;
    while (std::getline(in, line)) {
        if (line.empty() || line[0] == '#') continue;
        std::istringstream iss(line);
        if (!(iss >> src >> dst)) continue;
        if (!(iss >> weight)) weight = 1.0;

        if (nodes.insert(src).second) g.add_node_with_id(src);
        if (nodes.insert(dst).second) g.add_node_with_id(dst);
        g.add_edge(src, dst, weight);
    }
    return g;
}

void GraphSerializer::write_adjacency_list(const Graph& g, std::ostream& out) {
    auto ids = g.node_ids();
    for (auto nid : ids) {
        out << nid << ":";
        bool first = true;
        for (auto& e : g.out_edges(nid)) {
            if (!first) out << ",";
            out << e.dst;
            if (e.weight != 1.0) out << "(" << e.weight << ")";
            first = false;
        }
        out << "\n";
    }
}

Graph GraphSerializer::read_adjacency_list(std::istream& in, GraphType type) {
    Graph g(type);
    std::unordered_set<NodeId> nodes;
    std::string line;

    while (std::getline(in, line)) {
        if (line.empty() || line[0] == '#') continue;
        auto colon = line.find(':');
        if (colon == std::string::npos) continue;

        NodeId src = std::stoull(line.substr(0, colon));
        if (nodes.insert(src).second) g.add_node_with_id(src);

        std::string rest = line.substr(colon + 1);
        if (rest.empty()) continue;

        std::istringstream iss(rest);
        std::string token;
        while (std::getline(iss, token, ',')) {
            double weight = 1.0;
            auto paren = token.find('(');
            NodeId dst;
            if (paren != std::string::npos) {
                dst = std::stoull(token.substr(0, paren));
                weight = std::stod(token.substr(paren + 1));
            } else {
                dst = std::stoull(token);
            }
            if (nodes.insert(dst).second) g.add_node_with_id(dst);
            g.add_edge(src, dst, weight);
        }
    }
    return g;
}

void GraphSerializer::write_dot(const Graph& g, std::ostream& out,
                                 const std::string& name) {
    std::string edge_op = g.is_directed() ? " -> " : " -- ";
    std::string graph_type = g.is_directed() ? "digraph" : "graph";

    out << graph_type << " " << name << " {\n";
    for (auto nid : g.node_ids()) {
        out << "  " << nid << ";\n";
    }

    std::unordered_set<EdgeId> seen;
    for (auto nid : g.node_ids()) {
        for (auto& e : g.out_edges(nid)) {
            if (!g.is_directed() && e.src > e.dst) continue;
            if (seen.insert(e.id).second) {
                out << "  " << e.src << edge_op << e.dst;
                if (e.weight != 1.0) out << " [weight=" << e.weight << "]";
                out << ";\n";
            }
        }
    }
    out << "}\n";
}

void GraphSerializer::write_csv(const Graph& g, std::ostream& out) {
    out << "source,target,weight\n";
    std::unordered_set<EdgeId> seen;
    for (auto nid : g.node_ids()) {
        for (auto& e : g.out_edges(nid)) {
            if (!g.is_directed() && e.src > e.dst) continue;
            if (seen.insert(e.id).second) {
                out << e.src << "," << e.dst << "," << e.weight << "\n";
            }
        }
    }
}

std::string GraphSerializer::to_edge_list_string(const Graph& g) {
    std::ostringstream oss;
    write_edge_list(g, oss);
    return oss.str();
}

std::string GraphSerializer::to_dot_string(const Graph& g, const std::string& name) {
    std::ostringstream oss;
    write_dot(g, oss, name);
    return oss.str();
}

size_t GraphSerializer::binary_size(const Graph& g) {
    size_t header = 4 + 4 + 1 + 8;
    size_t nodes = g.node_count() * 8;
    size_t ec = g.edge_count();
    if (!g.is_directed()) ec /= 2;
    size_t edges = 8 + ec * 24;
    return header + nodes + edges;
}

void GraphSerializer::write_json(const Graph& g, std::ostream& out) {
    out << "{\n";
    out << "  \"directed\": " << (g.is_directed() ? "true" : "false") << ",\n";
    out << "  \"nodes\": [";
    auto ids = g.node_ids();
    for (size_t i = 0; i < ids.size(); i++) {
        if (i > 0) out << ", ";
        out << ids[i];
    }
    out << "],\n";
    out << "  \"edges\": [\n";

    std::unordered_set<EdgeId> seen;
    bool first = true;
    for (auto nid : ids) {
        for (auto& e : g.out_edges(nid)) {
            if (!g.is_directed() && e.src > e.dst) continue;
            if (!seen.insert(e.id).second) continue;
            if (!first) out << ",\n";
            out << "    {\"src\": " << e.src << ", \"dst\": " << e.dst
                << ", \"weight\": " << e.weight << "}";
            first = false;
        }
    }
    out << "\n  ]\n}\n";
}

Graph GraphSerializer::read_json(std::istream& in) {
    std::string content((std::istreambuf_iterator<char>(in)),
                         std::istreambuf_iterator<char>());

    bool directed = content.find("\"directed\": true") != std::string::npos;
    Graph g(directed ? GraphType::Directed : GraphType::Undirected);

    auto extract_array = [&](const std::string& key) -> std::string {
        auto pos = content.find("\"" + key + "\"");
        if (pos == std::string::npos) return "";
        auto start = content.find('[', pos);
        if (start == std::string::npos) return "";
        int depth = 1;
        size_t end = start + 1;
        while (end < content.size() && depth > 0) {
            if (content[end] == '[') depth++;
            else if (content[end] == ']') depth--;
            end++;
        }
        return content.substr(start + 1, end - start - 2);
    };

    std::string nodes_str = extract_array("nodes");
    std::istringstream nss(nodes_str);
    std::string token;
    while (std::getline(nss, token, ',')) {
        try {
            NodeId nid = std::stoull(token);
            if (!g.has_node(nid)) g.add_node_with_id(nid);
        } catch (...) {}
    }

    std::string edges_str = extract_array("edges");
    size_t pos = 0;
    while ((pos = edges_str.find("{", pos)) != std::string::npos) {
        auto end = edges_str.find("}", pos);
        if (end == std::string::npos) break;
        std::string obj = edges_str.substr(pos, end - pos + 1);

        auto extract_num = [&](const std::string& field) -> double {
            auto fp = obj.find("\"" + field + "\"");
            if (fp == std::string::npos) return 0;
            auto cp = obj.find(':', fp);
            if (cp == std::string::npos) return 0;
            return std::stod(obj.substr(cp + 1));
        };

        NodeId src = static_cast<NodeId>(extract_num("src"));
        NodeId dst = static_cast<NodeId>(extract_num("dst"));
        double weight = extract_num("weight");
        if (weight == 0) weight = 1.0;

        if (g.has_node(src) && g.has_node(dst)) g.add_edge(src, dst, weight);
        pos = end + 1;
    }

    return g;
}

std::string GraphSerializer::to_json_string(const Graph& g) {
    std::ostringstream oss;
    write_json(g, oss);
    return oss.str();
}

void GraphSerializer::write_graphml(const Graph& g, std::ostream& out,
                                     const std::string& name) {
    out << "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    out << "<graphml xmlns=\"http://graphml.graphstruct.org/graphml\">\n";
    out << "  <key id=\"weight\" for=\"edge\" attr.name=\"weight\" attr.type=\"double\">\n";
    out << "    <default>1.0</default>\n";
    out << "  </key>\n";
    std::string edge_default = g.is_directed() ? "directed" : "undirected";
    out << "  <graph id=\"" << name << "\" edgedefault=\"" << edge_default << "\">\n";

    for (auto nid : g.node_ids()) {
        out << "    <node id=\"n" << nid << "\"/>\n";
    }

    std::unordered_set<EdgeId> seen;
    size_t eid = 0;
    for (auto nid : g.node_ids()) {
        for (auto& e : g.out_edges(nid)) {
            if (!g.is_directed() && e.src > e.dst) continue;
            if (!seen.insert(e.id).second) continue;
            out << "    <edge id=\"e" << eid++ << "\" source=\"n" << e.src
                << "\" target=\"n" << e.dst << "\">\n";
            if (e.weight != 1.0) {
                out << "      <data key=\"weight\">" << e.weight << "</data>\n";
            }
            out << "    </edge>\n";
        }
    }

    out << "  </graph>\n</graphml>\n";
}

} // namespace cryo