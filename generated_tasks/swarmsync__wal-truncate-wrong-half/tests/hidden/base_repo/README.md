# SwarmSync

A gossip protocol and CRDT library for building eventually-consistent distributed systems in Go.

## Overview

SwarmSync provides production-ready primitives for distributed systems that need to converge state across multiple nodes without strong coordination. It implements:

- **CRDTs**: G-Counter, PN-Counter, LWW-Register, MV-Register, G-Set, OR-Set, OR-Map, EWFlag, RGA
- **Gossip Protocol**: Push-pull epidemic protocol with anti-entropy scheduling and health monitoring
- **SWIM Membership**: Scalable failure detection with protocol period scaling
- **Merkle Trees**: Hash-tree anti-entropy sync with proof generation and batch verification
- **Consistent Hashing**: Virtual-node partitioning and bounded-load consistent hashing
- **Rendezvous Hashing**: Highest random weight (HRW) hashing for minimal disruption
- **Bloom Filters**: Standard, counting, and scalable Bloom filter variants
- **Transport Layer**: Binary codec with CRC checksums and message type multiplexer
- **Priority Queues**: Min-heaps, bounded ring buffers, work-stealing deques
- **Rate Limiting**: Token bucket, sliding window, and fixed window rate limiters
- **Circuit Breaker**: Three-state circuit breaker for fault tolerance
- **Retry Policies**: Exponential backoff with jitter, constant, and linear strategies
- **Distributed IDs**: Snowflake and ULID generators for unique time-ordered identifiers
- **TTL Map**: Key-value store with per-key expiration and eviction callbacks
- **LRU Cache**: Fixed-capacity cache with hit/miss tracking and eviction callbacks
- **Skip List**: Probabilistic sorted data structure with range queries
- **Write-Ahead Log**: Append-only log with CRC integrity, replay, and truncation
- **Leader Election**: Bully and ring-based leader election algorithms
- **Shard Manager**: Range-based partitioning with rebalancing and migration
- **Metrics**: Counter, gauge, histogram with registry and snapshot export
- **DAG**: Directed acyclic graph with cycle detection and topological sort
- **Bitmap**: Thread-safe bitmap with AND/OR/XOR/ANDNOT set operations
- **Network Simulator**: Discrete-event simulation with partitions, latency, and packet loss

## Installation

```bash
go get github.com/Mustafa4ngin/SwarmSync
```

## Quick Start

```go
package main

import (
    "fmt"
    "github.com/Mustafa4ngin/SwarmSync/pkg/crdt"
    "github.com/Mustafa4ngin/SwarmSync/pkg/clock"
)

func main() {
    // Create a PN-Counter on two nodes
    c1 := crdt.NewPNCounter("node-1")
    c2 := crdt.NewPNCounter("node-2")

    c1.Increment("node-1", 5)
    c2.Increment("node-2", 3)
    c2.Decrement("node-2", 1)

    // Merge replicas
    c1.Merge(c2)
    fmt.Println("Merged value:", c1.Value()) // 7
}
```

## Architecture

```
SwarmSync/
├── pkg/
│   ├── bitmap/       # Thread-safe bitmap with set operations
│   ├── bloom/        # Bloom filter variants (standard, counting, scalable)
│   ├── circuit/      # Circuit breaker pattern
│   ├── clock/        # Vector clocks, hybrid logical clocks
│   ├── consistent/   # Bounded-load consistent hashing
│   ├── crdt/         # CRDTs (counters, registers, sets, maps, RGA, EWFlag)
│   ├── dag/          # Directed acyclic graph with topo sort
│   ├── election/     # Leader election (bully, ring)
│   ├── gossip/       # Push-pull gossip with anti-entropy and stats
│   ├── hash/         # Consistent hashing with virtual nodes
│   ├── idgen/        # Distributed ID generation (Snowflake, ULID)
│   ├── lru/          # LRU cache with eviction callbacks
│   ├── membership/   # SWIM failure detection with scaling
│   ├── merkle/       # Merkle tree with proof generation
│   ├── metrics/      # Counter, gauge, histogram, registry
│   ├── queue/        # Priority queues, bounded queues, work-stealing
│   ├── ratelimit/    # Token bucket, sliding window, fixed window
│   ├── rendezvous/   # HRW (rendezvous) hashing
│   ├── retry/        # Exponential backoff retry policies
│   ├── shard/        # Range-based shard manager
│   ├── sim/          # Network simulator for testing
│   ├── skiplist/     # Concurrent skip list with range queries
│   ├── transport/    # Binary codec with message multiplexer
│   ├── ttlmap/       # TTL map with expiration
│   └── wal/          # Write-ahead log with CRC integrity
└── cmd/
    └── swarmsync/    # CLI demo tool
```

## Testing

```bash
go test ./...
```

Run with verbose output:

```bash
go test ./... -v -count=1
```

## Build

```bash
go build ./cmd/swarmsync/
./swarmsync demo
```

## Project Stats

- **25 packages** covering distributed systems, data structures, and resilience patterns
- **498 tests** covering behavior, edge cases, and concurrency
- **13,000+ lines** of production-quality Go code
- **Zero external dependencies** (stdlib only)

## License

MIT