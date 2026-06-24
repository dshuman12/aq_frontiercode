package membership

import (
	"math"
	"time"
)

// ScaledConfig adjusts SWIM parameters based on cluster size.
// As cluster size grows, probe interval and timeouts scale logarithmically
// to maintain detection quality without excessive network traffic.
type ScaledConfig struct {
	Base      SWIMConfig
	ScaleFunc func(clusterSize int) SWIMConfig
}

// DefaultScaling returns a config that scales logarithmically with cluster size.
func DefaultScaling() *ScaledConfig {
	base := DefaultSWIMConfig()
	return &ScaledConfig{
		Base: base,
		ScaleFunc: func(n int) SWIMConfig {
			if n < 2 {
				n = 2
			}
			factor := math.Log2(float64(n))
			return SWIMConfig{
				ProbeInterval:    time.Duration(float64(base.ProbeInterval) * factor),
				ProbeTimeout:     time.Duration(float64(base.ProbeTimeout) * factor),
				IndirectChecks:   base.IndirectChecks + int(math.Log2(float64(n))),
				SuspicionTimeout: time.Duration(float64(base.SuspicionTimeout) * factor),
			}
		},
	}
}

// ConfigForSize returns the SWIM config scaled for the given cluster size.
func (sc *ScaledConfig) ConfigForSize(n int) SWIMConfig {
	if sc.ScaleFunc == nil {
		return sc.Base
	}
	return sc.ScaleFunc(n)
}

// ClusterSizeEstimator estimates cluster size from observed gossip state.
type ClusterSizeEstimator struct {
	observed map[string]bool
}

// NewClusterSizeEstimator creates an estimator.
func NewClusterSizeEstimator() *ClusterSizeEstimator {
	return &ClusterSizeEstimator{observed: make(map[string]bool)}
}

// Observe records a node seen during gossip.
func (e *ClusterSizeEstimator) Observe(nodeID string) {
	e.observed[nodeID] = true
}

// Estimate returns the current estimated cluster size.
func (e *ClusterSizeEstimator) Estimate() int {
	return len(e.observed)
}

// Reset clears observations.
func (e *ClusterSizeEstimator) Reset() {
	e.observed = make(map[string]bool)
}
