// Package anomaly implements a small online anomaly detector for numeric
// log fields based on exponentially weighted moving statistics.
//
// The detector keeps a running mean and variance using Welford's online
// algorithm with exponential decay so that older samples lose weight over
// time. A sample is reported as an anomaly when its z-score exceeds a
// configured threshold and the detector has seen enough samples to have
// established a baseline.
package anomaly

import (
	"errors"
	"math"
)

// Detector watches a single numeric stream.
type Detector struct {
	alpha    float64
	thresh   float64
	warmup   int
	count    int
	mean     float64
	variance float64
}

// Config configures the detector.
type Config struct {
	Alpha     float64 // smoothing factor in (0, 1]; smaller = longer memory
	Threshold float64 // z-score threshold; values >= this are flagged
	Warmup    int     // number of initial samples to absorb without flagging
}

// New constructs a Detector. Defaults: Alpha=0.05, Threshold=4, Warmup=30.
func New(cfg Config) (*Detector, error) {
	if cfg.Alpha < 0 || cfg.Alpha > 1 {
		return nil, errors.New("anomaly: alpha must be in [0,1]")
	}
	if cfg.Alpha == 0 {
		cfg.Alpha = 0.05
	}
	if cfg.Threshold == 0 {
		cfg.Threshold = 4
	}
	if cfg.Warmup == 0 {
		cfg.Warmup = 30
	}
	return &Detector{
		alpha:  cfg.Alpha,
		thresh: cfg.Threshold,
		warmup: cfg.Warmup,
	}, nil
}

// Result is the outcome of one Observe call.
type Result struct {
	Value     float64
	Mean      float64
	Variance  float64
	StdDev    float64
	Z         float64
	IsAnomaly bool
}

// Observe records v and returns its score.
func (d *Detector) Observe(v float64) Result {
	d.count++
	if d.count == 1 {
		d.mean = v
		d.variance = 0
		return Result{Value: v, Mean: d.mean}
	}
	delta := v - d.mean
	d.mean += d.alpha * delta
	d.variance = (1-d.alpha)*(d.variance + d.alpha*delta*delta)
	std := math.Sqrt(d.variance)
	res := Result{Value: v, Mean: d.mean, Variance: d.variance, StdDev: std}
	if std > 0 {
		res.Z = (v - d.mean) / std
	}
	if d.count > d.warmup && math.Abs(res.Z) >= d.thresh {
		res.IsAnomaly = true
	}
	return res
}

// Reset discards accumulated state.
func (d *Detector) Reset() {
	d.count = 0
	d.mean = 0
	d.variance = 0
}

// Count reports the number of samples observed.
func (d *Detector) Count() int { return d.count }

// Mean returns the current mean estimate.
func (d *Detector) Mean() float64 { return d.mean }

// StdDev returns the current standard deviation estimate.
func (d *Detector) StdDev() float64 { return math.Sqrt(d.variance) }
