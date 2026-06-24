#include "test_framework.hpp"
#include "metrics/metrics.hpp"
#include "generator/generator.hpp"
#include "shortest_path/shortest_path.hpp"
#include "centrality/centrality.hpp"
#include "mst/mst.hpp"
#include "components/components.hpp"
#include "io/serializer.hpp"
#include "partition/partitioner.hpp"
#include "query/query.hpp"
#include "algo/traversal.hpp"
#include "memory/pool.hpp"
using namespace cryo;
using namespace cryo_test;

// ── Metrics Tests ───────────────────────────────────────────────────────────

CRYO_TEST(Metrics, DensityComplete) {
    GraphGenerator gen;
    auto g = gen.complete(5);
    assert_near(graph_density(g), 1.0, 0.01);
}

CRYO_TEST(Metrics, DensityEmpty) {
    Graph g(GraphType::Undirected);
    g.add_node_with_id(0); g.add_node_with_id(1);
    assert_near(graph_density(g), 0.0);
}

CRYO_TEST(Metrics, AvgDegree) {
    GraphGenerator gen;
    auto g = gen.cycle(6);
    assert_near(average_degree(g), 2.0);
}

CRYO_TEST(Metrics, ClusteringTriangle) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    assert_near(local_clustering_coefficient(g, 0), 1.0);
    assert_near(global_clustering_coefficient(g), 1.0);
}

CRYO_TEST(Metrics, ClusteringStar) {
    GraphGenerator gen;
    auto g = gen.star(5);
    assert_near(local_clustering_coefficient(g, 0), 0.0);
}

CRYO_TEST(Metrics, AvgClustering) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    g.add_edge(2, 3);
    double ac = average_clustering_coefficient(g);
    assert_gt(ac, 0.0);
    assert_le(ac, 1.0);
}

CRYO_TEST(Metrics, DiameterPath) {
    GraphGenerator gen;
    auto g = gen.path(5, GraphType::Undirected);
    assert_eq(graph_diameter(g), (size_t)4);
}

CRYO_TEST(Metrics, RadiusCycle) {
    GraphGenerator gen;
    auto g = gen.cycle(6);
    assert_eq(graph_radius(g), (size_t)3);
}

CRYO_TEST(Metrics, Center) {
    GraphGenerator gen;
    auto g = gen.path(5, GraphType::Undirected);
    auto center = graph_center(g);
    assert_true(std::find(center.begin(), center.end(), 2) != center.end());
}

CRYO_TEST(Metrics, Periphery) {
    GraphGenerator gen;
    auto g = gen.path(5, GraphType::Undirected);
    auto per = graph_periphery(g);
    assert_true(std::find(per.begin(), per.end(), 0) != per.end());
    assert_true(std::find(per.begin(), per.end(), 4) != per.end());
}

CRYO_TEST(Metrics, Assortativity) {
    GraphGenerator gen;
    auto g = gen.complete(5);
    double r = degree_assortativity(g);
    assert_true(r >= -1.0);
    assert_le(r, 1.0);
}

CRYO_TEST(Metrics, Summary) {
    GraphGenerator gen;
    auto g = gen.cycle(6);
    auto s = summarize(g);
    assert_eq(s.nodes, (size_t)6);
    assert_gt(s.edges, (size_t)0);
    assert_eq(s.components, (size_t)1);
    auto str = s.to_string();
    assert_true(str.find("Nodes: 6") != std::string::npos);
}

// ── Integration Tests ───────────────────────────────────────────────────────

CRYO_TEST(Integration, GeneratorToDijkstra) {
    GraphGenerator gen(42);
    auto g = gen.random_weighted(10, 0.5, 1.0, 10.0);
    auto res = dijkstra(g, 0);
    for (auto nid : g.node_ids()) {
        assert_true(res.dist.count(nid) > 0);
    }
}

CRYO_TEST(Integration, GeneratorToMST) {
    GraphGenerator gen(42);
    auto g = gen.random_weighted(15, 0.6, 1.0, 20.0);
    auto km = kruskal(g);
    auto pm = prim(g, 0);
    assert_near(km.total_weight, pm.total_weight, 1e-6);
}

CRYO_TEST(Integration, GeneratorToComponents) {
    GraphGenerator gen(42);
    auto g = gen.erdos_renyi_gnp(20, 0.05);
    auto cc = connected_components(g);
    assert_gt(cc.count(), (size_t)0);
    size_t total = 0;
    for (auto& c : cc.components) total += c.size();
    assert_eq(total, (size_t)20);
}

CRYO_TEST(Integration, GeneratorToCentralityToIO) {
    GraphGenerator gen(42);
    auto g = gen.barabasi_albert(20, 3, 2);
    auto pr = pagerank(g);
    double sum = 0;
    for (auto& [_, v] : pr) sum += v;
    assert_near(sum, 1.0, 1e-3);

    std::stringstream ss;
    GraphSerializer::write_binary(g, ss);
    auto g2 = GraphSerializer::read_binary(ss);
    assert_eq(g2.node_count(), g.node_count());
}

CRYO_TEST(Integration, DAGPipeline) {
    GraphGenerator gen(42);
    auto g = gen.random_dag(15, 0.3);
    assert_false(has_cycle(g));
    auto order = topological_sort(g);
    assert_eq(order.size(), (size_t)15);
    auto scc = strongly_connected_components(g);
    assert_eq(scc.count(), (size_t)15);
}

CRYO_TEST(Integration, PartitionQueryReachability) {
    GraphGenerator gen(42);
    auto g = gen.grid(4, 4);
    auto part = balanced_partition(g, 4);
    for (auto& p : part.parts) {
        assert_gt(p.size(), (size_t)0);
    }
    assert_true(reachable(g, 0, 15));
}

CRYO_TEST(Integration, MSTSubgraphMetrics) {
    GraphGenerator gen(42);
    auto g = gen.random_weighted(12, 0.6, 1.0, 10.0);
    auto mst = kruskal(g);
    auto mg = mst.to_graph(12);
    double dens = graph_density(mg);
    assert_lt(dens, graph_density(g) + 0.01);
}

CRYO_TEST(Integration, SerializeDeserializeFull) {
    GraphGenerator gen(42);
    auto g = gen.watts_strogatz(20, 4, 0.2);
    std::stringstream ss;
    GraphSerializer::write_binary(g, ss);
    auto g2 = GraphSerializer::read_binary(ss);
    assert_eq(g2.node_count(), g.node_count());
    auto s1 = summarize(g);
    auto s2 = summarize(g2);
    assert_eq(s1.nodes, s2.nodes);
}

CRYO_TEST(Integration, TriangleAndClustering) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0); g.add_edge(2, 3);
    auto tri = find_triangles(g);
    assert_eq(tri.triangle_count, (size_t)1);
    double gcc = global_clustering_coefficient(g);
    assert_gt(gcc, 0.0);
}

CRYO_TEST(Integration, MemoryPoolWithGraphOps) {
    ArenaAllocator arena(4096);
    int* nodes = arena.create<int>(100);
    assert_eq(*nodes, 100);
    GraphGenerator gen(42);
    auto g = gen.erdos_renyi_gnp(10, 0.3);
    auto bfs_res = bfs(g, 0);
    assert_gt(bfs_res.order.size(), (size_t)0);
    assert_gt(arena.bytes_used(), (size_t)0);
}

CRYO_TEST(Integration, EndToEndPipeline) {
    GraphGenerator gen(42);
    auto g = gen.erdos_renyi_gnp(15, 0.4);

    auto cc = connected_components(g);
    auto pr = pagerank(g);
    auto bc = betweenness_centrality(g);
    auto hub = max_centrality_node(pr);
    assert_true(g.has_node(hub));

    auto dij = dijkstra(g, hub);
    auto mst_res = kruskal(g);
    auto part = label_propagation(g, 3);

    auto summary = summarize(g);
    assert_eq(summary.nodes, (size_t)15);

    std::stringstream ss;
    GraphSerializer::write_binary(g, ss);
    auto g2 = GraphSerializer::read_binary(ss);
    assert_eq(g2.node_count(), (size_t)15);
}

// ── Eccentricity unification + density + clustering optimization tests ─────

CRYO_TEST(Metrics, ComputeEccentricities) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(3, 4);
    auto ecc = compute_eccentricities(g);
    assert_eq(ecc.diameter, (size_t)4);
    assert_eq(ecc.radius, (size_t)2);
    assert_eq(ecc.eccentricity[2], (size_t)2);
    assert_true(ecc.center.size() >= 1);
    assert_true(ecc.periphery.size() >= 1);
}

CRYO_TEST(Metrics, EccentricityComplete) {
    GraphGenerator gen(42);
    auto g = gen.complete(5);
    auto ecc = compute_eccentricities(g);
    assert_eq(ecc.diameter, (size_t)1);
    assert_eq(ecc.radius, (size_t)1);
}

CRYO_TEST(Metrics, DensityNoDoubleCount) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    double d = graph_density(g);
    assert_near(d, 3.0 / 6.0, 1e-6);
}

CRYO_TEST(Metrics, DensityDirected) {
    Graph g(GraphType::Directed);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 0);
    double d = graph_density(g);
    assert_near(d, 3.0 / 6.0, 1e-6);
}

CRYO_TEST(Metrics, AvgClusteringOptimized) {
    GraphGenerator gen(42);
    auto g = gen.complete(5);
    double cc = average_clustering_coefficient(g);
    assert_near(cc, 1.0, 1e-6);
}

CRYO_TEST(Metrics, DegreeDistribution) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto dd = degree_distribution(g);
    assert_eq(dd.histogram[1], (size_t)2);
    assert_eq(dd.histogram[2], (size_t)2);
    assert_gt(dd.entropy, 0.0);
}

CRYO_TEST(Metrics, RichClub) {
    GraphGenerator gen(42);
    auto g = gen.complete(5);
    double rc = rich_club_coefficient(g, 2);
    assert_near(rc, 1.0, 1e-6);
}

CRYO_TEST(Metrics, GlobalEfficiency) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(0, 2);
    double eff = global_efficiency(g);
    assert_gt(eff, 0.5);
}

CRYO_TEST(Metrics, AdjacencyMatrix) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2);
    auto m = adjacency_matrix(g);
    assert_eq(m.rows(), (size_t)3);
    assert_near(m.at(0, 1), 1.0);
    assert_near(m.at(1, 0), 1.0);
    assert_near(m.at(0, 2), 0.0);
}

CRYO_TEST(Metrics, LaplacianMatrix) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 3; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2);
    auto L = laplacian_matrix(g);
    assert_near(L.at(1, 1), 2.0);
    assert_near(L.at(0, 1), -1.0);
}

CRYO_TEST(Metrics, DistanceMatrix) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 4; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3);
    auto D = distance_matrix(g);
    assert_near(D.at(0, 3), 3.0);
    assert_near(D.at(0, 0), 0.0);
}

CRYO_TEST(Metrics, SpectralRadius) {
    GraphGenerator gen(42);
    auto g = gen.complete(4);
    double sr = spectral_radius_approx(g);
    assert_gt(sr, 2.5);
}

CRYO_TEST(Metrics, SummarizeSingleEccComputation) {
    Graph g(GraphType::Undirected);
    for (int i = 0; i < 5; i++) g.add_node_with_id(i);
    g.add_edge(0, 1); g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(3, 4);
    auto s = summarize(g);
    assert_eq(s.diameter, (size_t)4);
    assert_eq(s.radius, (size_t)2);
}