#include "test_framework.hpp"
#include "validation/validation.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(Validation, SimpleGraph) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2);
    assert_true(is_simple(g));
}

CRYO_TEST(Validation, SelfLoop) {
    Graph g(GraphType::Directed);
    g.add_node_with_id(0);
    g.add_edge(0, 0);
    assert_false(is_simple(g));
}

CRYO_TEST(Validation, RegularComplete) {
    GraphGenerator gen(42);
    auto g = gen.complete(4);
    assert_true(is_regular(g));
    assert_true(is_complete(g));
}

CRYO_TEST(Validation, NotRegular) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1);
    assert_false(is_regular(g));
}

CRYO_TEST(Validation, Forest) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(2, 3);
    assert_true(is_forest(g));
    assert_true(is_acyclic(g));
}

CRYO_TEST(Validation, Tournament) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(0, 2);
    assert_true(is_tournament(g));
}

CRYO_TEST(Validation, Report) {
    GraphGenerator gen(42);
    auto g = gen.path(5);
    auto r = validate(g);
    assert_eq(r.node_count, (size_t)5);
    assert_true(r.simple);
    assert_true(r.connected);
}

CRYO_TEST(Validation, IsomorphicDegCheck) {
    GraphGenerator gen(42);
    auto a = gen.complete(4);
    auto b = gen.complete(4);
    assert_true(is_isomorphic_degree_check(a, b));
}

CRYO_TEST(Validation, PlanarBound) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(3, 0);
    assert_true(is_planar_k33_k5_free(g));
}