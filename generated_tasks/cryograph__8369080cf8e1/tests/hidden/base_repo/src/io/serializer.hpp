#pragma once
#include "core/graph.hpp"
#include <iostream>
#include <string>

namespace cryo {

class GraphSerializer {
public:
    static void write_binary(const Graph& g, std::ostream& out);
    static Graph read_binary(std::istream& in);

    static void write_edge_list(const Graph& g, std::ostream& out);
    static Graph read_edge_list(std::istream& in, GraphType type = GraphType::Directed);

    static void write_adjacency_list(const Graph& g, std::ostream& out);
    static Graph read_adjacency_list(std::istream& in, GraphType type = GraphType::Directed);

    static void write_dot(const Graph& g, std::ostream& out,
                          const std::string& name = "G");

    static void write_csv(const Graph& g, std::ostream& out);

    static std::string to_edge_list_string(const Graph& g);
    static std::string to_dot_string(const Graph& g, const std::string& name = "G");

    static size_t binary_size(const Graph& g);

    static constexpr uint32_t FORMAT_MAGIC = 0x43525947;
    static constexpr uint32_t FORMAT_VERSION = 1;
};

} // namespace cryo