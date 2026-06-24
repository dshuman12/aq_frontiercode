package engine

import (
	"testing"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

func TestNextRetryZeroPolicyNeverRetries(t *testing.T) {
	d, ok := NextRetry(types.RetryPolicy{}, 1)
	if ok || d != 0 {
		t.Fatalf("zero policy should not retry, got ok=%v d=%v", ok, d)
	}
}

func TestNextRetryBackoff(t *testing.T) {
	p := types.RetryPolicy{
		InitialInterval:    time.Second,
		BackoffCoefficient: 2,
		MaxAttempts:        5,
	}
	cases := []time.Duration{time.Second, 2 * time.Second, 4 * time.Second, 8 * time.Second}
	for i, want := range cases {
		got, ok := NextRetry(p, i+1)
		if !ok {
			t.Fatalf("attempt %d: should retry", i+1)
		}
		if got != want {
			t.Errorf("attempt %d: got %v, want %v", i+1, got, want)
		}
	}
	if _, ok := NextRetry(p, 5); ok {
		t.Errorf("attempt 5 should be the last; further retries off")
	}
}

func TestNextRetryCap(t *testing.T) {
	p := types.RetryPolicy{
		InitialInterval:    time.Second,
		BackoffCoefficient: 10,
		MaxInterval:        5 * time.Second,
		MaxAttempts:        0,
	}
	d, _ := NextRetry(p, 4)
	if d != 5*time.Second {
		t.Fatalf("attempt 4 expected cap, got %v", d)
	}
}

func TestIsRetryableCanceledNever(t *testing.T) {
	p := types.DefaultRetry()
	if IsRetryable(p, types.FailureCanceled, "") {
		t.Fatal("canceled should not be retryable")
	}
	if IsRetryable(p, types.FailureTerminated, "") {
		t.Fatal("terminated should not be retryable")
	}
}

func TestIsRetryableNonRetryableList(t *testing.T) {
	p := types.DefaultRetry()
	p.NonRetryable = []string{"BadRequest"}
	if IsRetryable(p, types.FailureApplication, "BadRequest") {
		t.Fatal("BadRequest listed as non-retryable")
	}
	if !IsRetryable(p, types.FailureApplication, "OtherError") {
		t.Fatal("OtherError should be retryable")
	}
}
