# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| cryograph__boruvka-component-cut-edge | codex | openai/gpt-5.5 | high | 5 | 0.800 | 0.800 | 0.800 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| cryograph__boruvka-component-cut-edge | codex | openai/gpt-5.5 | high | 5 | 0.800 | 0.800 | 0.800 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| cryograph__boruvka-component-cut-edge | codex | openai/gpt-5.5 | high | cryograph__boruvka-component-cut__8tTCuiF | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | submitted_tests_fail_on_base |
| cryograph__boruvka-component-cut-edge | codex | openai/gpt-5.5 | high | cryograph__boruvka-component-cut__UacipxP | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| cryograph__boruvka-component-cut-edge | codex | openai/gpt-5.5 | high | cryograph__boruvka-component-cut__WCSdNaW | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| cryograph__boruvka-component-cut-edge | codex | openai/gpt-5.5 | high | cryograph__boruvka-component-cut__tn8Ygyd | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| cryograph__boruvka-component-cut-edge | codex | openai/gpt-5.5 | high | cryograph__boruvka-component-cut__wLb4R2c | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>cryograph__boruvka-component-cut__8tTCuiF: FAIL, score 0.000, criteria 19/20</summary>

- Task: `cryograph__boruvka-component-cut-edge`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
- Reward: 0.000
- Criteria: 19/20
- Categories: patch_specific 6/6, regular 13/14
- Blocker failures: `submitted_tests_fail_on_base`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 1.000 | yes |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 0
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
Submitted tests unexpectedly passed on the broken base snapshot.
submitted tests on base snapshot: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 0
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 0
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: src/mst/mst.cpp, tests/test_mst.cpp
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>cryograph__boruvka-component-cut__UacipxP: PASS, score 1.000, criteria 20/20</summary>

- Task: `cryograph__boruvka-component-cut-edge`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: yes
- Score: 1.000
- Reward: 1.000
- Criteria: 20/20
- Categories: patch_specific 6/6, regular 14/14
- Blocker failures: none

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 1.000 | yes |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 0
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 1
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 0
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: src/mst/mst.cpp, tests/test_mst.cpp
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>cryograph__boruvka-component-cut__WCSdNaW: PASS, score 1.000, criteria 20/20</summary>

- Task: `cryograph__boruvka-component-cut-edge`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: yes
- Score: 1.000
- Reward: 1.000
- Criteria: 20/20
- Categories: patch_specific 6/6, regular 14/14
- Blocker failures: none

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 1.000 | yes |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 0
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 1
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 0
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: src/mst/mst.cpp, tests/test_mst.cpp
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>cryograph__boruvka-component-cut__tn8Ygyd: PASS, score 1.000, criteria 20/20</summary>

- Task: `cryograph__boruvka-component-cut-edge`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: yes
- Score: 1.000
- Reward: 1.000
- Criteria: 20/20
- Categories: patch_specific 6/6, regular 14/14
- Blocker failures: none

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 1.000 | yes |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 0
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 1
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 0
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: src/mst/mst.cpp, tests/test_mst.cpp
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>cryograph__boruvka-component-cut__wLb4R2c: PASS, score 1.000, criteria 20/20</summary>

- Task: `cryograph__boruvka-component-cut-edge`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: yes
- Score: 1.000
- Reward: 1.000
- Criteria: 20/20
- Categories: patch_specific 6/6, regular 14/14
- Blocker failures: none

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 1.000 | yes |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 0
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 1
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests` exited 0
STDOUT:

=== DegreeCent ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Isolated

=== InOutDegree ===
  [PASS] DirectedStar

=== Betweenness ===
  [PASS] StarCenter
  [PASS] LineGraph
  [PASS] Triangle

=== Closeness ===
  [PASS] StarCenter
  [PASS] Complete
  [PASS] Disconnected

=== PageRank ===
  [PASS] Convergence
  [PASS] StarCenter
  [PASS] DanglingNode
  [PASS] SingleNode

=== Eigenvector ===
  [PASS] LineGraph
  [PASS] Complete

=== Harmonic ===
  [PASS] StarCenter
  [PASS] LineGraph

=== MaxCent ===
  [PASS] Basic

=== Betweenness ===
  [PASS] VectorOptPath
  [PASS] VectorOptComplete

=== PageRank ===
  [PASS] VectorOptConvergence

=== Centrality ===
  [PASS] LoadCentrality
  [PASS] StressCentrality
  [PASS] EdgeBetweenness
  [PASS] Centralization

=== PageRank ===
  [PASS] VectorOptDangling

=== Coloring ===
  [PASS] GreedyPath
  [PASS] GreedyComplete
  [PASS] WelshPowell
  [PASS] DSatur
  [PASS] DSaturBipartite
  [PASS] ChromaticBounds
  [PASS] IsKColorable
  [PASS] EmptyGraph

=== Community ===
  [PASS] LouvainDisconnected
  [PASS] LouvainComplete
  [PASS] LabelProp
  [PASS] Modularity
  [PASS] InterCommunityEdges
  [PASS] NMI

=== CC ===
  [PASS] TwoComponents
  [PASS] SingleComponent
  [PASS] IsolatedNodes
  [PASS] EmptyGraph
  [PASS] NodeMapping

=== SCC ===
  [PASS] BasicSCC
  [PASS] DAGAllSingleton
  [PASS] TwoCycles
  [PASS] SingleNode

=== Bridge ===
  [PASS] SimpleChain
  [PASS] NoBridge
  [PASS] MixedBridges

=== AP ===
  [PASS] SimpleAP
  [PASS] NoAP

=== Bipartite ===
  [PASS] BipartiteGraph
  [PASS] NonBipartite
  [PASS] Coloring
  [PASS] SingleNode

=== Connected ===
  [PASS] ConnectedUndirected
  [PASS] DisconnectedUndirected
  [PASS] StronglyConnected
  [PASS] NotStronglyConnected

=== Condensation ===
  [PASS] Basic
  [PASS] DAGUnchanged

=== ConnComp ===
  [PASS] DirectedWeakConnFast
  [PASS] DirectedChainWeak

=== Core ===
  [PASS] AddNode
  [PASS] AddNodeWithId
  [PASS] DuplicateNodeThrows
  [PASS] AddEdgeDirected
  [PASS] AddEdgeUndirected
  [PASS] RemoveNode
  [PASS] RemoveEdge
  [PASS] RemoveEdgeBetween
  [PASS] GetEdge
  [PASS] OutEdges
  [PASS] InEdges
  [PASS] Neighbors
  [PASS] Predecessors
  [PASS] OutDegree
  [PASS] InDegree
  [PASS] DegreeUndirected
  [PASS] NodeProperties
  [PASS] NodePropertyMissing
  [PASS] EdgeProperty
  [PASS] NodeIds
  [PASS] AllEdges
  [PASS] Transpose
  [PASS] SubgraphDirected
  [PASS] Clear
  [PASS] ForEachNode
  [PASS] ForEachEdge
  [PASS] CopyConstructor
  [PASS] MoveConstructor
  [PASS] SelfLoop
  [PASS] MultiEdge
  [PASS] AddEdgeInvalidNode
  [PASS] LargeGraph
  [PASS] UndirectedRemoveEdge
  [PASS] EmptyGraphOperations
  [PASS] InEdgesDirected
  [PASS] InEdgesUndirected
  [PASS] PredecessorsDirected
  [PASS] DegreeDirected
  [PASS] RemoveNodeRadj
  [PASS] RemoveEdgeRadj
  [PASS] RemoveEdgeBetweenRadj
  [PASS] NodeIdsCacheConsistency
  [PASS] CopyPreservesRadj
  [PASS] MovePreservesRadj
  [PASS] TransposeRadj
  [PASS] BatchAddNodes
  [PASS] BatchAddEdges
  [PASS] BatchRemoveNodes
  [PASS] FilterByWeight
  [PASS] FilterByDegree
  [PASS] RemoveNodeUndirectedRadj

=== KCore ===
  [PASS] TrianglePlusLeaf
  [PASS] Path
  [PASS] Complete
  [PASS] Subgraph
  [PASS] Shell

=== DegSeq ===
  [PASS] Basic
  [PASS] Graphical
  [PASS] Degeneracy

=== VertexCover ===
  [PASS] ApproxValid

=== IndependentSet ===
  [PASS] GreedyValid

=== DominatingSet ===
  [PASS] GreedyValid

=== VertexCover ===
  [PASS] Complete

=== Euler ===
  [PASS] CircuitSquare
  [PASS] PathExists
  [PASS] NoPath
  [PASS] DirectedCircuit
  [PASS] Hamiltonian
  [PASS] HamiltonianNo
  [PASS] GirthTriangle
  [PASS] GirthTree
  [PASS] FindCycle

=== Flow ===
  [PASS] EdmondsKarpBasic
  [PASS] SimplePath
  [PASS] ParallelPaths
  [PASS] NoPath
  [PASS] MinCutBasic
  [PASS] MinCutBottleneck

=== GenER ===
  [PASS] GNPBasic
  [PASS] GNPEmpty
  [PASS] GNPComplete
  [PASS] GNMBasic
  [PASS] GNMDirected
  [PASS] Deterministic

=== GenBA ===
  [PASS] Basic
  [PASS] ScaleFree

=== GenWS ===
  [PASS] Basic
  [PASS] NoBetaIsRing

=== GenComplete ===
  [PASS] UndirectedK5
  [PASS] DirectedK4

=== GenCycle ===
  [PASS] Basic
  [PASS] TooSmallThrows

=== GenStar ===
  [PASS] Basic

=== GenPath ===
  [PASS] Basic

=== GenGrid ===
  [PASS] Basic3x3
  [PASS] Rectangular

=== GenBinTree ===
  [PASS] Depth2

=== GenRandTree ===
  [PASS] Basic
  [PASS] Single

=== GenDAG ===
  [PASS] NoCycle
  [PASS] TopoSortable

=== GenWeighted ===
  [PASS] Basic
  [PASS] Directed

=== GenGNM ===
  [PASS] DenseUndirected
  [PASS] DenseDirected

=== GenWheel ===
  [PASS] Basic

=== GenLadder ===
  [PASS] Basic

=== GenHypercube ===
  [PASS] Dim3

=== GenFriendship ===
  [PASS] Basic

=== GenCircLadder ===
  [PASS] Basic

=== IO ===
  [PASS] BinaryRoundtrip
  [PASS] BinaryUndirected
  [PASS] BinaryBadMagic
  [PASS] EdgeListRoundtrip
  [PASS] EdgeListString
  [PASS] AdjListRoundtrip
  [PASS] DotExport
  [PASS] DotUndirected
  [PASS] CsvExport
  [PASS] EmptyGraph
  [PASS] EdgeListComments
  [PASS] JsonRoundTrip
  [PASS] JsonUndirected
  [PASS] GraphMLOutput

=== Matching ===
  [PASS] BipartiteBasic
  [PASS] BipartitePartial
  [PASS] GreedyBasic
  [PASS] MaxWeightGreedy
  [PASS] PerfectCheck
  [PASS] ToGraph

=== Arena ===
  [PASS] BasicAllocate
  [PASS] MultipleAllocations
  [PASS] LargeAllocation
  [PASS] Reset
  [PASS] Alignment
  [PASS] CreateObject
  [PASS] Utilization
  [PASS] MoveConstructor
  [PASS] ZeroSizeAllocation
  [PASS] MultipleBlocks
  [PASS] WriteRead

=== Pool ===
  [PASS] BasicAllocDealc
  [PASS] MultipleAllocs
  [PASS] Reuse
  [PASS] ChunkExpansion
  [PASS] Owns
  [PASS] DeallocateNull
  [PASS] ObjectSize
  [PASS] StressTest

=== Tracker ===
  [PASS] BasicTracking
  [PASS] Deallocation
  [PASS] LeakDetection
  [PASS] Counters
  [PASS] Report

=== MemStats ===
  [PASS] ToString

=== Metrics ===
  [PASS] DensityComplete
  [PASS] DensityEmpty
  [PASS] AvgDegree
  [PASS] ClusteringTriangle
  [PASS] ClusteringStar
  [PASS] AvgClustering
  [PASS] DiameterPath
  [PASS] RadiusCycle
  [PASS] Cente
...<truncated>...
STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: src/mst/mst.cpp, tests/test_mst.cpp
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

