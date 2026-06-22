package main

import (
	"fmt"
	"os"

	"github.com/Mustafa4ngin/SwarmSync/pkg/bitmap"
	"github.com/Mustafa4ngin/SwarmSync/pkg/bloom"
	"github.com/Mustafa4ngin/SwarmSync/pkg/circuit"
	"github.com/Mustafa4ngin/SwarmSync/pkg/clock"
	"github.com/Mustafa4ngin/SwarmSync/pkg/crdt"
	"github.com/Mustafa4ngin/SwarmSync/pkg/dag"
	"github.com/Mustafa4ngin/SwarmSync/pkg/gossip"
	"github.com/Mustafa4ngin/SwarmSync/pkg/hash"
	"github.com/Mustafa4ngin/SwarmSync/pkg/idgen"
	"github.com/Mustafa4ngin/SwarmSync/pkg/lru"
	"github.com/Mustafa4ngin/SwarmSync/pkg/merkle"
	"github.com/Mustafa4ngin/SwarmSync/pkg/metrics"
	"github.com/Mustafa4ngin/SwarmSync/pkg/queue"
	"github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit"
	"github.com/Mustafa4ngin/SwarmSync/pkg/sim"
	"github.com/Mustafa4ngin/SwarmSync/pkg/skiplist"
	"github.com/Mustafa4ngin/SwarmSync/pkg/transport"
)

func main() {
	fmt.Println("SwarmSync - Distributed Systems Primitives Library")
	fmt.Println("==================================================")

	if len(os.Args) > 1 && os.Args[1] == "demo" {
		runDemo()
	} else {
		fmt.Println("\nUsage: swarmsync demo")
		fmt.Println("\nModules:")
		fmt.Println("  clock      - Vector clocks, hybrid logical clocks")
		fmt.Println("  crdt       - Conflict-free replicated data types")
		fmt.Println("  gossip     - Push-pull gossip protocol")
		fmt.Println("  membership - SWIM failure detection")
		fmt.Println("  merkle     - Merkle tree anti-entropy sync")
		fmt.Println("  hash       - Consistent hashing with virtual nodes")
		fmt.Println("  transport  - Binary message codec")
		fmt.Println("  bloom      - Bloom filter variants")
		fmt.Println("  queue      - Priority queues, work-stealing deque")
		fmt.Println("  sim        - Network simulator")
	}
}

func runDemo() {
	fmt.Println("\n--- Vector Clock Demo ---")
	vc1 := clock.NewVectorClock("node-A")
	vc2 := clock.NewVectorClock("node-B")
	a := vc1.Tick("node-A")
	b := vc2.Tick("node-B")
	fmt.Printf("Event A: %v\n", a.(*clock.VectorTimestamp).Entries)
	fmt.Printf("Event B: %v\n", b.(*clock.VectorTimestamp).Entries)
	fmt.Printf("A vs B: %v (concurrent)\n", a.Compare(b))

	fmt.Println("\n--- CRDT Counter Demo ---")
	c1 := crdt.NewPNCounter("node-1")
	c2 := crdt.NewPNCounter("node-2")
	c1.Increment("node-1", 10)
	c2.Increment("node-2", 5)
	c2.Decrement("node-2", 2)
	c1.Merge(c2)
	fmt.Printf("Merged PN-Counter value: %d\n", c1.Value())

	fmt.Println("\n--- Gossip Convergence Demo ---")
	cluster := gossip.NewCluster()
	for i := 0; i < 5; i++ {
		nodeID := fmt.Sprintf("g%d", i)
		store := gossip.NewStateStore(nodeID)
		store.Put(fmt.Sprintf("data-%s", nodeID), []byte(fmt.Sprintf("value-%d", i)))
		sel := gossip.NewRandomPeerSelector(int64(i))
		proto := gossip.NewProtocol(nodeID, store, sel, 2)
		cluster.AddNode(nodeID, proto)
	}
	for round := 0; round < 20; round++ {
		cluster.RunRound()
		if cluster.Converged() {
			fmt.Printf("Gossip cluster converged in %d rounds\n", round+1)
			break
		}
	}

	fmt.Println("\n--- Consistent Hash Ring Demo ---")
	ring := hash.NewRing(100)
	ring.Add("server-1")
	ring.Add("server-2")
	ring.Add("server-3")
	fmt.Printf("'user-123' -> %s\n", ring.Lookup("user-123"))
	fmt.Printf("'user-456' -> %s\n", ring.Lookup("user-456"))

	fmt.Println("\n--- Bloom Filter Demo ---")
	bf := bloom.NewFilter(1000, 0.01)
	bf.Add([]byte("apple"))
	bf.Add([]byte("banana"))
	fmt.Printf("Contains 'apple': %v\n", bf.Contains([]byte("apple")))
	fmt.Printf("Contains 'cherry': %v\n", bf.Contains([]byte("cherry")))

	fmt.Println("\n--- Transport Codec Demo ---")
	codec := transport.NewCodec()
	env := transport.MakeEnvelope(transport.MsgGossipPush, "sender-1", 42, []byte("payload"))
	data, _ := codec.Encode(env)
	fmt.Printf("Encoded %d bytes for gossip push message\n", len(data))

	fmt.Println("\n--- Merkle Tree Demo ---")
	t1 := merkle.NewTree()
	t1.Put("a", []byte("1"))
	t1.Put("b", []byte("2"))
	t2 := merkle.NewTree()
	t2.Put("a", []byte("1"))
	t2.Put("c", []byte("3"))
	diff := merkle.Diff(t1, t2)
	fmt.Printf("Only in local: %v, Only in remote: %v\n", diff.OnlyLocal, diff.OnlyRemote)

	fmt.Println("\n--- Priority Queue Demo ---")
	pq := queue.NewPriorityQueue()
	pq.Push("low-priority", 10)
	pq.Push("high-priority", 1)
	pq.Push("medium-priority", 5)
	item := pq.Pop()
	fmt.Printf("First dequeued: %s (priority %d)\n", item.Value, item.Priority)

	fmt.Println("\n--- Network Simulator Demo ---")
	ns := sim.NewNetworkSim(42)
	ns.AddNode("sim-1", 2)
	ns.AddNode("sim-2", 2)
	ns.AddNode("sim-3", 2)
	ns.GetStore("sim-1").Put("shared-key", []byte("shared-value"))
	for i := 0; i < 10; i++ {
		ns.RunGossipRound()
	}
	fmt.Printf("Simulator converged: %v\n", ns.Converged())

	fmt.Println("\n--- Rate Limiter Demo ---")
	rl := ratelimit.NewTokenBucket(100, 10)
	allowed := 0
	for i := 0; i < 15; i++ {
		if rl.Allow() { allowed++ }
	}
	fmt.Printf("Allowed %d of 15 requests (burst=10)\n", allowed)

	fmt.Println("\n--- Circuit Breaker Demo ---")
	cb := circuit.NewBreaker(circuit.WithFailThreshold(3))
	for i := 0; i < 3; i++ {
		cb.Execute(func() error { return fmt.Errorf("fail") })
	}
	fmt.Printf("Circuit state after 3 failures: %s\n", cb.CurrentState())

	fmt.Println("\n--- Snowflake ID Demo ---")
	gen := idgen.NewSnowflake(1)
	id1 := gen.Generate()
	id2 := gen.Generate()
	fmt.Printf("ID1: %d, ID2: %d (monotonic: %v)\n", id1, id2, id2 > id1)

	fmt.Println("\n--- LRU Cache Demo ---")
	cache := lru.NewCache(3)
	cache.Put("a", 1); cache.Put("b", 2); cache.Put("c", 3); cache.Put("d", 4)
	_, found := cache.Get("a")
	fmt.Printf("'a' in cache after eviction: %v (capacity=3)\n", found)

	fmt.Println("\n--- Skip List Demo ---")
	sl := skiplist.New(42)
	sl.Insert("charlie", 3); sl.Insert("alpha", 1); sl.Insert("bravo", 2)
	fmt.Printf("Skip list keys (sorted): %v\n", sl.Keys())

	fmt.Println("\n--- DAG Demo ---")
	g := dag.New()
	g.AddNode("compile", nil); g.AddNode("test", nil); g.AddNode("deploy", nil)
	g.AddEdge("compile", "test"); g.AddEdge("test", "deploy")
	order, _ := g.TopologicalSort()
	fmt.Printf("Build order: %v\n", order)

	fmt.Println("\n--- Bitmap Demo ---")
	bm := bitmap.New()
	bm.Set(1); bm.Set(3); bm.Set(5); bm.Set(7)
	fmt.Printf("Bitmap bits: %v (count: %d)\n", bm.Bits(), bm.Count())

	fmt.Println("\n--- Metrics Demo ---")
	reg := metrics.NewRegistry()
	reg.Counter("requests").Add(42)
	reg.Gauge("connections").Set(7)
	fmt.Printf("Metrics snapshot: %v\n", reg.Snapshot())

	fmt.Println("\nAll demos completed successfully!")
}