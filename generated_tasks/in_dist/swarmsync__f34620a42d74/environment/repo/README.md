# SwarmSync

A gossip protocol and CRDT library for building eventually-consistent distributed systems in Go.

## Overview

SwarmSync provides production-ready primitives for distributed systems that need to converge state across multiple nodes without strong coordination. It implements:

- **CRDTs** (Conflict-free Replicated Data Types): G-Counter, PN-Counter, LWW-Register, MV-Register, G-Set, OR-Set, OR-Map
- **Gossip Protocol**: Push-pull epidemic protocol for state dissemination
- **SWIM Membership**: Scalable failure detection and membership management
- **Merkle Trees**: Hash-tree based anti-entropy synchronization
- **Consistent Hashing**: Virtual-node based partitioning with minimal disruption
- **Bloom Filters**: Space-efficient probabilistic set membership (standard, counting, scalable)
- **Transport Layer**: Custom binary codec with varint encoding and CRC checksums
- **Priority Queues**: Min/max heaps, bounded concurrent queues, work-stealing deques
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
│   ├── clock/       # Vector clocks, hybrid logical clocks
│   ├── crdt/        # Conflict-free replicated data types
│   ├── gossip/      # Push-pull gossip protocol
│   ├── membership/  # SWIM failure detection
│   ├── merkle/      # Merkle tree anti-entropy sync
│   ├── hash/        # Consistent hashing with virtual nodes
│   ├── transport/   # Binary message codec
│   ├── bloom/       # Bloom filter variants
│   ├── queue/       # Priority queues and work-stealing deque
│   └── sim/         # Network simulator for testing
└── cmd/
    └── swarmsync/   # CLI demo tool
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

- **10 packages** with deep cross-cutting concerns
- **274+ tests** covering behavior, edge cases, and concurrency
- **7,700+ lines** of production-quality Go code
- **Zero external dependencies** (stdlib only)

## License

MIT