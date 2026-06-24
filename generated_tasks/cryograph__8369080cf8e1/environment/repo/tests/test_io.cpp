#include "test_framework.hpp"
#include "io/serializer.hpp"
#include <sstream>
using namespace cryo;
using namespace cryo_test;

static Graph make_simple() {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1, 2.0); g.add_edge(1, 2, 3.0);
    g.add_edge(2, 3, 1.5); g.add_edge(0, 3, 7.0);
    return g;
}

CRYO_TEST(IO, BinaryRoundtrip) {
    auto g = make_simple();
    std::stringstream ss;
    GraphSerializer::write_binary(g, ss);
    auto g2 = GraphSerializer::read_binary(ss);
    assert_eq(g2.node_count(), g.node_count());
    assert_eq(g2.edge_count(), g.edge_count());
    assert_true(g2.has_edge(0, 1));
    assert_near(g2.get_edge(0, 1)->weight, 2.0);
}

CRYO_TEST(IO, BinaryUndirected) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0); g.add_node_with_id(1);
    g.add_edge(0, 1, 5.0);
    std::stringstream ss;
    GraphSerializer::write_binary(g, ss);
    auto g2 = GraphSerializer::read_binary(ss);
    assert_false(g2.is_directed());
    assert_true(g2.has_edge(0, 1));
    assert_true(g2.has_edge(1, 0));
}

CRYO_TEST(IO, BinaryBadMagic) {
    std::stringstream ss;
    uint32_t bad = 0xDEADBEEF;
    ss.write(reinterpret_cast<const char*>(&bad), 4);
    assert_throws([&]() { GraphSerializer::read_binary(ss); });
}

CRYO_TEST(IO, EdgeListRoundtrip) {
    auto g = make_simple();
    std::stringstream ss;
    GraphSerializer::write_edge_list(g, ss);
    auto g2 = GraphSerializer::read_edge_list(ss);
    assert_eq(g2.node_count(), (size_t)4);
    assert_true(g2.has_edge(0, 1));
}

CRYO_TEST(IO, EdgeListString) {
    auto g = make_simple();
    auto s = GraphSerializer::to_edge_list_string(g);
    assert_true(s.find("0 1") != std::string::npos);
}

CRYO_TEST(IO, AdjListRoundtrip) {
    auto g = make_simple();
    std::stringstream ss;
    GraphSerializer::write_adjacency_list(g, ss);
    auto g2 = GraphSerializer::read_adjacency_list(ss);
    assert_eq(g2.node_count(), (size_t)4);
    assert_true(g2.has_edge(0, 1));
}

CRYO_TEST(IO, DotExport) {
    auto g = make_simple();
    auto dot = GraphSerializer::to_dot_string(g, "TestGraph");
    assert_true(dot.find("digraph TestGraph") != std::string::npos);
    assert_true(dot.find("->") != std::string::npos);
}

CRYO_TEST(IO, DotUndirected) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0); g.add_node_with_id(1);
    g.add_edge(0, 1);
    auto dot = GraphSerializer::to_dot_string(g);
    assert_true(dot.find("graph G") != std::string::npos);
    assert_true(dot.find("--") != std::string::npos);
}

CRYO_TEST(IO, CsvExport) {
    auto g = make_simple();
    std::stringstream ss;
    GraphSerializer::write_csv(g, ss);
    std::string csv = ss.str();
    assert_true(csv.find("source,target,weight") != std::string::npos);
    assert_true(csv.find("0,1,2") != std::string::npos);
}

CRYO_TEST(IO, EmptyGraph) {
    Graph g(GraphType::Directed);
    std::stringstream ss;
    GraphSerializer::write_binary(g, ss);
    auto g2 = GraphSerializer::read_binary(ss);
    assert_eq(g2.node_count(), (size_t)0);
}

CRYO_TEST(IO, EdgeListComments) {
    std::stringstream ss;
    ss << "# comment\n0 1 2.5\n1 2 3.0\n";
    auto g = GraphSerializer::read_edge_list(ss);
    assert_eq(g.node_count(), (size_t)3);
    assert_eq(g.edge_count(), (size_t)2);
}