package queue

import (
	"fmt"
	"sync"
	"testing"
)

// --- PriorityQueue ---

func TestPQ_Empty(t *testing.T) {
	pq := NewPriorityQueue()
	if pq.Len() != 0 {
		t.Fatal("expected empty")
	}
	if pq.Pop() != nil {
		t.Fatal("pop empty should return nil")
	}
}

func TestPQ_PushPop(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Push("a", 3)
	pq.Push("b", 1)
	pq.Push("c", 2)
	item := pq.Pop()
	if item.Value != "b" || item.Priority != 1 {
		t.Fatalf("expected b/1, got %v/%d", item.Value, item.Priority)
	}
}

func TestPQ_MinHeapOrder(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Push("e", 5)
	pq.Push("a", 1)
	pq.Push("d", 4)
	pq.Push("b", 2)
	pq.Push("c", 3)

	expected := []int64{1, 2, 3, 4, 5}
	for i, exp := range expected {
		item := pq.Pop()
		if item.Priority != exp {
			t.Fatalf("index %d: expected priority %d, got %d", i, exp, item.Priority)
		}
	}
}

func TestPQ_Peek(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Push("a", 10)
	pq.Push("b", 5)
	item := pq.Peek()
	if item.Priority != 5 {
		t.Fatalf("expected 5, got %d", item.Priority)
	}
	if pq.Len() != 2 {
		t.Fatal("peek should not remove")
	}
}

func TestPQ_PeekEmpty(t *testing.T) {
	pq := NewPriorityQueue()
	if pq.Peek() != nil {
		t.Fatal("peek empty should return nil")
	}
}

func TestPQ_Drain(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Push("c", 3)
	pq.Push("a", 1)
	pq.Push("b", 2)
	items := pq.Drain()
	if len(items) != 3 {
		t.Fatalf("expected 3, got %d", len(items))
	}
	if items[0].Priority != 1 || items[1].Priority != 2 || items[2].Priority != 3 {
		t.Fatal("drain should return in priority order")
	}
	if pq.Len() != 0 {
		t.Fatal("queue should be empty after drain")
	}
}

func TestPQ_DuplicatePriority(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Push("a", 1)
	pq.Push("b", 1)
	pq.Push("c", 1)
	count := 0
	for pq.Pop() != nil {
		count++
	}
	if count != 3 {
		t.Fatal("should pop all duplicates")
	}
}

func TestPQ_ThreadSafety(t *testing.T) {
	pq := NewPriorityQueue()
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		i := i
		go func() {
			defer wg.Done()
			pq.Push(i, int64(i))
		}()
	}
	wg.Wait()
	if pq.Len() != 100 {
		t.Fatalf("expected 100, got %d", pq.Len())
	}
}

// --- BoundedQueue ---

func TestBQ_Empty(t *testing.T) {
	q := NewBoundedQueue(10)
	if q.Len() != 0 {
		t.Fatal("expected empty")
	}
	_, ok := q.Dequeue()
	if ok {
		t.Fatal("dequeue empty should return false")
	}
}

func TestBQ_EnqueueDequeue(t *testing.T) {
	q := NewBoundedQueue(10)
	q.Enqueue("hello")
	item, ok := q.Dequeue()
	if !ok || item != "hello" {
		t.Fatal("expected hello")
	}
}

func TestBQ_FIFO(t *testing.T) {
	q := NewBoundedQueue(10)
	q.Enqueue("a")
	q.Enqueue("b")
	q.Enqueue("c")
	v1, _ := q.Dequeue()
	v2, _ := q.Dequeue()
	v3, _ := q.Dequeue()
	if v1 != "a" || v2 != "b" || v3 != "c" {
		t.Fatal("not FIFO order")
	}
}

func TestBQ_Full(t *testing.T) {
	q := NewBoundedQueue(2)
	q.Enqueue("a")
	q.Enqueue("b")
	if q.Enqueue("c") {
		t.Fatal("full queue should reject")
	}
	if q.Dropped() != 1 {
		t.Fatal("should count dropped")
	}
}

func TestBQ_EnqueueForce(t *testing.T) {
	q := NewBoundedQueue(2)
	q.Enqueue("a")
	q.Enqueue("b")
	q.EnqueueForce("c") // overwrites "a"
	v, _ := q.Dequeue()
	if v != "b" {
		t.Fatalf("expected b (oldest after overwrite), got %v", v)
	}
}

func TestBQ_PeekFront(t *testing.T) {
	q := NewBoundedQueue(10)
	q.Enqueue("first")
	q.Enqueue("second")
	v, ok := q.PeekFront()
	if !ok || v != "first" {
		t.Fatal("expected first")
	}
	if q.Len() != 2 {
		t.Fatal("peek should not remove")
	}
}

func TestBQ_IsFull(t *testing.T) {
	q := NewBoundedQueue(2)
	if q.IsFull() {
		t.Fatal("empty should not be full")
	}
	q.Enqueue("a")
	q.Enqueue("b")
	if !q.IsFull() {
		t.Fatal("should be full")
	}
}

func TestBQ_Clear(t *testing.T) {
	q := NewBoundedQueue(10)
	q.Enqueue("a")
	q.Enqueue("b")
	q.Clear()
	if q.Len() != 0 {
		t.Fatal("should be empty after clear")
	}
}

func TestBQ_Wraparound(t *testing.T) {
	q := NewBoundedQueue(3)
	q.Enqueue("a")
	q.Enqueue("b")
	q.Dequeue() // remove a
	q.Enqueue("c")
	q.Enqueue("d") // wraps around
	v, _ := q.Dequeue()
	if v != "b" {
		t.Fatalf("expected b, got %v", v)
	}
}

// --- Deque ---

func TestDeque_Empty(t *testing.T) {
	d := NewDeque()
	if !d.IsEmpty() {
		t.Fatal("expected empty")
	}
	_, ok := d.PopBottom()
	if ok {
		t.Fatal("popBottom empty should fail")
	}
}

func TestDeque_PushPopBottom(t *testing.T) {
	d := NewDeque()
	d.PushBottom("a")
	d.PushBottom("b")
	v, ok := d.PopBottom()
	if !ok || v != "b" {
		t.Fatal("popBottom should return last pushed (LIFO)")
	}
}

func TestDeque_StealTop(t *testing.T) {
	d := NewDeque()
	d.PushBottom("a")
	d.PushBottom("b")
	d.PushBottom("c")
	v, ok := d.StealTop()
	if !ok || v != "a" {
		t.Fatal("stealTop should return first pushed (FIFO)")
	}
}

func TestDeque_MixedOps(t *testing.T) {
	d := NewDeque()
	d.PushBottom("a")
	d.PushBottom("b")
	d.PushBottom("c")
	d.StealTop()  // removes a
	d.PopBottom() // removes c
	v, ok := d.PopBottom()
	if !ok || v != "b" {
		t.Fatalf("expected b, got %v", v)
	}
}

// --- WorkStealingPool ---

func TestWSP_SubmitTake(t *testing.T) {
	p := NewWorkStealingPool()
	p.Register("w1")
	p.Submit("w1", "task-1")
	item, ok := p.Take("w1")
	if !ok || item != "task-1" {
		t.Fatal("expected task-1")
	}
}

func TestWSP_Steal(t *testing.T) {
	p := NewWorkStealingPool()
	p.Register("w1")
	p.Register("w2")
	p.Submit("w1", "task-1")
	p.Submit("w1", "task-2")

	item, from, ok := p.Steal("w2")
	if !ok || from != "w1" {
		t.Fatal("steal should succeed from w1")
	}
	if item != "task-1" {
		t.Fatal("steal should take from top (FIFO)")
	}
}

func TestWSP_StealEmpty(t *testing.T) {
	p := NewWorkStealingPool()
	p.Register("w1")
	p.Register("w2")
	_, _, ok := p.Steal("w1")
	if ok {
		t.Fatal("steal from empty should fail")
	}
}

func TestWSP_TotalPending(t *testing.T) {
	p := NewWorkStealingPool()
	p.Register("w1")
	p.Register("w2")
	p.Submit("w1", "a")
	p.Submit("w1", "b")
	p.Submit("w2", "c")
	if p.TotalPending() != 3 {
		t.Fatalf("expected 3, got %d", p.TotalPending())
	}
}

func TestWSP_StolenCount(t *testing.T) {
	p := NewWorkStealingPool()
	p.Register("w1")
	p.Register("w2")
	p.Submit("w1", "task")
	p.Steal("w2")
	if p.StolenCount() != 1 {
		t.Fatal("expected 1 stolen")
	}
}

func TestWSP_WorkerCount(t *testing.T) {
	p := NewWorkStealingPool()
	p.Register("w1")
	p.Register("w2")
	p.Register("w3")
	if p.WorkerCount() != 3 {
		t.Fatalf("expected 3, got %d", p.WorkerCount())
	}
}

func TestWSP_SubmitUnregistered(t *testing.T) {
	p := NewWorkStealingPool()
	if p.Submit("ghost", "task") {
		t.Fatal("submit to unregistered should fail")
	}
}

func TestWSP_ConcurrentSteal(t *testing.T) {
	p := NewWorkStealingPool()
	p.Register("producer")
	for i := 0; i < 10; i++ {
		p.Register(fmt.Sprintf("stealer-%d", i))
	}
	for i := 0; i < 1000; i++ {
		p.Submit("producer", fmt.Sprintf("task-%d", i))
	}
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			thiefID := fmt.Sprintf("stealer-%d", id)
			for {
				_, _, ok := p.Steal(thiefID)
				if !ok {
					return
				}
			}
		}(i)
	}
	wg.Wait()
	if p.StolenCount() != 1000 {
		t.Fatalf("expected 1000 stolen, got %d", p.StolenCount())
	}
}
