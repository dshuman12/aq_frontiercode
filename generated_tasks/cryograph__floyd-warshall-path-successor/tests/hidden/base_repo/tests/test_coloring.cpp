#include "test_framework.hpp"
#include "coloring/coloring.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(Coloring, GreedyPath) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    for (int i = 0; i < 4; i++) g.add_edge(i, i + 1);
    auto c = greedy_coloring(g);
    assert_true(c.is_valid(g));
    assert_le(c.num_colors, (size_t)2);
}

CRYO_TEST(Coloring, GreedyComplete) {
    GraphGenerator gen(42);
    auto g = gen.complete(5);
    auto c = greedy_coloring(g);
    assert_true(c.is_valid(g));
    assert_eq(c.num_colors, (size_t)5);
}

CRYO_TEST(Coloring, WelshPowell) {
    GraphGenerator gen(42);
    auto g = gen.cycle(6);
    auto c = welsh_powell_coloring(g);
    assert_true(c.is_valid(g));
    assert_le(c.num_colors, (size_t)3);
}

CRYO_TEST(Coloring, DSatur) {
    GraphGenerator gen(42);
    auto g = gen.complete(4);
    auto c = dsatur_coloring(g);
    assert_true(c.is_valid(g));
    assert_eq(c.num_colors, (size_t)4);
}

CRYO_TEST(Coloring, DSaturBipartite) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(0, 3); g.add_edge(2, 1); g.add_edge(2, 3);
    auto c = dsatur_coloring(g);
    assert_true(c.is_valid(g));
    assert_eq(c.num_colors, (size_t)2);
}

CRYO_TEST(Coloring, ChromaticBounds) {
    GraphGenerator gen(42);
    auto g = gen.complete(5);
    size_t lb = chromatic_number_lower_bound(g);
    size_t ub = chromatic_number_upper_bound(g);
    assert_le(lb, ub);
    assert_ge(lb, (size_t)1);
}

CRYO_TEST(Coloring, IsKColorable) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(0, 2);
    assert_false(is_k_colorable(g, 2));
    assert_true(is_k_colorable(g, 3));
}

CRYO_TEST(Coloring, EmptyGraph) {
    Graph g(GraphType::Undirected);
    auto c = greedy_coloring(g);
    assert_eq(c.num_colors, (size_t)0);
}