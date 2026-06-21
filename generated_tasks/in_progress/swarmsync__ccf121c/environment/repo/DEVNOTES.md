# SwarmSync — Developer Notes

## Overview

SwarmSync is a gossip protocol and CRDT library for building eventually-consistent distributed systems in Go. It provides production-ready primitives: vector clocks, CRDTs, gossip protocol, SWIM membership, Merkle trees, consistent hashing, Bloom filters, transport codec, priority queues, and a network simulator.

**Language**: Go 1.22  
**Build**: `go build ./cmd/swarmsync/`  
**Test**: `go test ./...`  
**External dependencies**: None (stdlib only)  
**Dockerfile**: `environment/Dockerfile` (FROM golang:1.22.3-bookworm)

## Project Stats

| Metric | Value |
|---|---|
| Total LOC | ~7,750 |
| Source files | 34 |
| Test count | 274 |
| Packages | 10 + cmd |
| Commits | 25+ |

## Module Reference

### pkg/clock — Logical Clocks (545 LOC)

| File | Lines | Description |
|---|---|---|
| `types.go` | 31 | Clock/Timestamp interfaces, Ordering enum |
| `vector.go` | 200 | VectorTimestamp (per-node counters, merge, compare, serialize), VectorClock (thread-safe wrapper) |
| `hlc.go` | 209 | HLCTimestamp (wall+logical+nodeID), HybridLogicalClock (configurable physical clock, max drift tolerance) |
| `errors.go` | 4 | Shared error values |
| `clock_test.go` | 573 | 30 tests: ordering, serialization roundtrip, concurrency, merge properties |

**Key algorithms**: Element-wise max merge for vector clocks. HLC Tick/Witness algorithm preserving causal ordering with backward-clock protection.

### pkg/crdt — Conflict-Free Replicated Data Types (1,178 LOC)

| File | Lines | Description |
|---|---|---|
| `counter.go` | 152 | GCounter (grow-only), PNCounter (increment/decrement via dual G-Counters) |
| `register.go` | 147 | LWWRegister (timestamp + nodeID tie-breaking), MVRegister (multi-value with per-node counter superseding) |
| `set.go` | 173 | GSet (grow-only union), ORSet (observed-remove with unique add-tags) |
| `ormap.go` | 106 | ORMap (ORSet keys + LWW register values) |
| `crdt_test.go` | 601 | 45 tests: merge semantics, commutativity, idempotency, concurrency |

**Cross-cutting**: All CRDTs use per-node counters/timestamps that relate to clock module. ORSet tags affect transport serialization size.

### pkg/gossip — Push-Pull Gossip Protocol (843 LOC)

| File | Lines | Description |
|---|---|---|
| `state.go` | 232 | StateStore (versioned KV with tombstones, digest/diff/apply, SHA-256 hash, tombstone purge) |
| `protocol.go` | 210 | Protocol (push-pull exchange), RandomPeerSelector (Fisher-Yates), Cluster (multi-node simulation) |
| `gossip_test.go` | 401 | 24 tests: state operations, peer selection, convergence, delete propagation |

**Cross-cutting**: Digest format affects transport encoding. State versions interact with merkle tree sync. Peer selection uses membership list.

### pkg/membership — SWIM Failure Detection (783 LOC)

| File | Lines | Description |
|---|---|---|
| `member.go` | 265 | Member state machine (Alive→Suspect→Dead→Left), MemberList with incarnation-based transitions |
| `swim.go` | 208 | SWIMDetector: direct/indirect probing, suspicion timer, dead declaration |
| `membership_test.go` | 310 | 24 tests: state transitions, self-refutation, probe rounds, indirect acks |

**Cross-cutting**: Member state changes affect gossip peer selection and hash ring membership. Incarnation numbers interact with clock ordering.

### pkg/merkle — Merkle Tree Anti-Entropy (704 LOC)

| File | Lines | Description |
|---|---|---|
| `tree.go` | 405 | Binary SHA-256 Merkle tree, Diff (flat comparison), FastDiff (recursive subtree pruning), Proof generation/verification, serialization |
| `errors.go` | 4 | Error values |
| `merkle_test.go` | 295 | 21 tests: tree ops, diff algorithms, proof verification, serialization |

**Cross-cutting**: Used by sim module for anti-entropy sync between gossip stores. Tree structure depends on key ordering from state store.

### pkg/hash — Consistent Hashing (477 LOC)

| File | Lines | Description |
|---|---|---|
| `ring.go` | 208 | SHA-256 hash ring with virtual nodes, Lookup/LookupN, distribution analysis, TransferKeys for rebalancing |
| `hash_test.go` | 262 | 20 tests: consistency, minimal disruption, distribution uniformity |

**Cross-cutting**: Ring membership mirrors membership module. Key assignment affects gossip routing decisions.

### pkg/transport — Binary Message Codec (695 LOC)

| File | Lines | Description |
|---|---|---|
| `message.go` | 63 | Header/Envelope types, 15 MsgType constants, Address |
| `codec.go` | 207 | Encode/Decode with CRC-32C checksums, varint (LEB128), zigzag, length-prefixed string/bytes |
| `channel.go` | 120 | In-memory channel transport for simulation |
| `transport_test.go` | 325 | 28 tests: roundtrip, corruption detection, encoding schemes, channel semantics |

**Cross-cutting**: All inter-module messages use this codec. Changing wire format affects gossip, membership, and merkle modules.

### pkg/bloom — Bloom Filter Variants (633 LOC)

| File | Lines | Description |
|---|---|---|
| `filter.go` | 375 | Standard (double-hash, optimal sizing), CountingFilter (4-bit counters, removal), ScalableFilter (auto-growing slices) |
| `bloom_test.go` | 258 | 25 tests: membership, FP rate, counting semantics, scaling |

**Cross-cutting**: Used by gossip for set membership during digest exchange.

### pkg/queue — Queue Data Structures (742 LOC)

| File | Lines | Description |
|---|---|---|
| `priority.go` | 117 | Binary min-heap priority queue |
| `bounded.go` | 129 | Ring buffer FIFO with backpressure/overwrite modes |
| `deque.go` | 152 | Work-stealing deque + WorkStealingPool |
| `queue_test.go` | 344 | 30 tests: heap ordering, FIFO, work stealing |

**Cross-cutting**: Priority queue used by gossip for message scheduling. Bounded queue used by transport channel.

### pkg/sim — Network Simulator (541 LOC)

| File | Lines | Description |
|---|---|---|
| `network.go` | 334 | Discrete-event simulator with gossip rounds, merkle sync, partitions, packet loss, event logging |
| `sim_test.go` | 207 | 11 tests: convergence, partitions, heal, drop rate, split-brain recovery |

**Cross-cutting**: Integrates gossip, merkle, and state stores. Tests cluster behavior under adversarial network conditions.

### cmd/swarmsync — CLI Demo (127 LOC)

| File | Lines | Description |
|---|---|---|
| `main.go` | 127 | Interactive demo exercising all modules |

## Dependency Chain

```
sim → gossip → (uses state store)
sim → merkle → (builds trees from state)
gossip → membership → (peer selection from alive members)
gossip → transport → (message encoding)
membership → clock → (incarnation ordering)
crdt → clock → (timestamp-based merge)
hash → membership → (ring mirrors member list)
bloom → gossip → (set membership queries)
queue → gossip → (message scheduling)
queue → transport → (channel backpressure)
```

Changing `clock.VectorTimestamp` format → affects crdt, gossip, transport, sim  
Changing `transport.Codec` wire format → affects gossip, membership, merkle  
Changing `gossip.StateEntry` → affects merkle sync, sim convergence  
Changing `membership.MemberState` → affects gossip peer selection, hash ring

## Task Writing Notes

- **clock/vector.go:67-95**: Compare() uses all-keys union — changing this affects transitivity guarantees in crdt merges
- **crdt/set.go:87-103**: ORSet.Add() generates unique tags via per-node counters — counter scheme must stay monotonic
- **gossip/state.go:90-112**: Diff() computes missing entries — performance depends on digest format
- **membership/swim.go:84-130**: RunProbeRound() orchestrates direct→indirect→suspect flow — timing affects false positive rate
- **merkle/tree.go:118-170**: FastDiff uses collectDirtyLeaves to avoid full tree traversal — pruning correctness depends on hash computation
- **hash/ring.go:72-85**: Lookup uses binary search on sorted ring — ring must stay sorted after Add/Remove
- **transport/codec.go:48-72**: Encode wire format is version+type+sender+seqNum+body+CRC — any field change breaks backward compatibility
- **bloom/filter.go:60-80**: doubleHash generates k hash positions from SHA-256 — h2 must be nonzero to avoid degenerate patterns
## New Modules (Post-Initial)

### pkg/ratelimit — Rate Limiting (416 LOC)
- TokenBucket: refill rate, burst capacity, dynamic rate adjustment
- SlidingWindow: interpolated window for smooth limiting
- FixedWindow: simple per-interval counter

### pkg/retry — Retry Policies (243 LOC)
- ExponentialBackoff with jitter and configurable multiplier
- ConstantBackoff, LinearBackoff variants
- Do/DoWithValue for automatic retry execution

### pkg/circuit — Circuit Breaker (310 LOC)
- Three-state machine: Closed → Open → HalfOpen → Closed
- Configurable thresholds, timeout, half-open concurrency limit
- OnStateChange callback, Counts tracking

### pkg/idgen — Distributed ID Generation (216 LOC)
- Snowflake: 64-bit time-ordered IDs with node/sequence components
- ULID: 128-bit lexicographically sortable IDs, Crockford Base32

### pkg/ttlmap — TTL Map (210 LOC)
- Per-key TTL with lazy expiration on read
- Active cleanup sweep, touch to extend TTL
- Eviction callback notifications

### pkg/lru — LRU Cache (253 LOC)
- Fixed-capacity with automatic LRU eviction
- Hit/miss stats, HitRate calculation
- Peek without recency update, eviction callbacks

### pkg/skiplist — Skip List (237 LOC)
- Probabilistic O(log n) insert/search/delete
- Range queries with inclusive bounds
- Min/Max accessors, sorted key enumeration

### pkg/rendezvous — Rendezvous Hashing (187 LOC)
- Highest Random Weight (HRW) hashing
- No virtual nodes needed, perfect load balance
- LookupN for replication, distribution analysis

### pkg/wal — Write-Ahead Log (210 LOC)
- Append-only with LSN-based ordering
- CRC-32 integrity on encode/decode
- Replay from position, truncation
- Transaction ID per entry

### pkg/election — Leader Election (254 LOC)
- BullyElection: highest alive node wins
- RingElection: ring-based with ordered set
- Dynamic peer management, round tracking

### pkg/shard — Shard Manager (213 LOC)
- Hash-space range partitioning
- Rebalance across nodes, transfer tracking
- Distribution analysis

### pkg/metrics — Metrics Collection (223 LOC)
- Atomic Counter, Gauge, Histogram
- Registry for named metric creation
- Snapshot export as flat map

### pkg/dag — Directed Acyclic Graph (302 LOC)
- Cycle detection on edge addition
- Topological sort, ancestors/descendants
- Roots, leaves identification

### pkg/bitmap — Bitmap (246 LOC)
- Dense uint64 word array with dynamic growth
- AND, OR, XOR, ANDNOT set operations
- Population count, clone, bit enumeration

### pkg/consistent — Bounded-Load Hashing (160 LOC)
- Consistent hashing with per-node load caps
- Keys routed to nearest node under load limit
- Release tracking for load management

### Existing Module Enhancements
- **crdt**: Added EWFlag (enable-wins flag) and RGA (replicated growable array)
- **gossip**: Added Stats tracker, HealthMonitor, AntiEntropyScheduler
- **merkle**: Added GenerateProof, BatchVerify, HashLeaf
- **membership**: Added ScaledConfig with log2 scaling, ClusterSizeEstimator
- **transport**: Added Mux message type multiplexer

## Updated Stats

| Metric | Value |
|---|---|
| Total LOC | ~13,100 |
| Source files | 60+ |
| Test count | 498 |
| Packages | 25 + cmd |
| Commits | 78+ |
