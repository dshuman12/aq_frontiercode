#include "test_framework.hpp"
#include "euler/euler.hpp"
#include "generator/generator.hpp"
using namespace cryo;
using namespace cryo_test;

CRYO_TEST(Euler, CircuitSquare) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(3, 0);
    assert_true(has_eulerian_circuit(g));
    auto c = eulerian_circuit(g);
    assert_eq(c.size(), (size_t)5);
    assert_eq(c.front(), c.back());
}

CRYO_TEST(Euler, PathExists) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    assert_true(has_eulerian_path(g));
    assert_false(has_eulerian_circuit(g));
    auto p = eulerian_path(g);
    assert_eq(p.size(), (size_t)4);
}

CRYO_TEST(Euler, NoPath) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(0, 2); g.add_edge(0, 3);
    assert_false(has_eulerian_path(g));
}

CRYO_TEST(Euler, DirectedCircuit) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    assert_true(has_eulerian_circuit(g));
    auto c = eulerian_circuit(g);
    assert_eq(c.size(), (size_t)4);
}

CRYO_TEST(Euler, Hamiltonian) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    assert_true(has_hamiltonian_path(g));
}

CRYO_TEST(Euler, HamiltonianNo) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(2, 3);
    assert_false(has_hamiltonian_path(g));
}

CRYO_TEST(Euler, GirthTriangle) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(0, 2);
    assert_eq(girth(g), (size_t)3);
}

CRYO_TEST(Euler, GirthTree) {
    GraphGenerator gen(42);
    auto g = gen.random_tree(10);
    assert_eq(girth(g), (size_t)0);
}

CRYO_TEST(Euler, FindCycle) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    auto c = find_cycle(g, 0);
    assert_ge(c.size(), (size_t)3);
}