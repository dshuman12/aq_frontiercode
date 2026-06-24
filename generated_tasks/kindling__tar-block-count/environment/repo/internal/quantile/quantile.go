// Package quantile estimates quantiles over a stream using a
// simplified P-square algorithm. Suitable for percentile-style
// metrics over millions of records without keeping every sample.
package quantile

import "math"

// Estimator tracks a single quantile.
type Estimator struct {
	q     float64
	n     [5]float64
	npos  [5]float64
	dn    [5]float64
	hght  [5]float64
	count int
}

// New returns an estimator for q in [0, 1].
func New(q float64) *Estimator {
	if q < 0 {
		q = 0
	}
	if q > 1 {
		q = 1
	}
	return &Estimator{q: q}
}

// Observe records a sample.
func (e *Estimator) Observe(v float64) {
	if e.count < 5 {
		e.hght[e.count] = v
		e.count++
		if e.count == 5 {
			e.bootstrap()
		}
		return
	}
	e.count++
	k := e.findCell(v)
	for i := k + 1; i < 5; i++ {
		e.n[i]++
	}
	for i := 0; i < 5; i++ {
		e.npos[i] += e.dn[i]
	}
	for i := 1; i <= 3; i++ {
		d := e.npos[i] - e.n[i]
		if (d >= 1 && e.n[i+1]-e.n[i] > 1) || (d <= -1 && e.n[i-1]-e.n[i] < -1) {
			ds := sign(d)
			parabolic := e.parabolic(i, ds)
			if e.hght[i-1] < parabolic && parabolic < e.hght[i+1] {
				e.hght[i] = parabolic
			} else {
				e.hght[i] = e.linear(i, ds)
			}
			e.n[i] += ds
		}
	}
}

func (e *Estimator) bootstrap() {
	hh := [5]float64{}
	copy(hh[:], e.hght[:])
	insertionSort(hh[:])
	e.hght = hh
	for i := range e.n {
		e.n[i] = float64(i)
	}
	e.npos[0] = 0
	e.npos[1] = 2 * e.q
	e.npos[2] = 4 * e.q
	e.npos[3] = 2 + 2*e.q
	e.npos[4] = 4
	e.dn[0] = 0
	e.dn[1] = e.q / 2
	e.dn[2] = e.q
	e.dn[3] = (1 + e.q) / 2
	e.dn[4] = 1
}

func (e *Estimator) findCell(v float64) int {
	if v < e.hght[0] {
		e.hght[0] = v
		return 0
	}
	if v >= e.hght[4] {
		e.hght[4] = v
		return 3
	}
	for i := 0; i < 4; i++ {
		if v < e.hght[i+1] {
			return i
		}
	}
	return 3
}

func (e *Estimator) parabolic(i int, d float64) float64 {
	num := d / (e.n[i+1] - e.n[i-1])
	a := (e.n[i]-e.n[i-1]+d)*(e.hght[i+1]-e.hght[i])/(e.n[i+1]-e.n[i]) +
		(e.n[i+1]-e.n[i]-d)*(e.hght[i]-e.hght[i-1])/(e.n[i]-e.n[i-1])
	return e.hght[i] + num*a
}

func (e *Estimator) linear(i int, d float64) float64 {
	idx := int(d)
	return e.hght[i] + d*(e.hght[i+idx]-e.hght[i])/(e.n[i+idx]-e.n[i])
}

// Value returns the current quantile estimate.
func (e *Estimator) Value() float64 {
	if e.count == 0 {
		return math.NaN()
	}
	if e.count < 5 {
		idx := int(e.q * float64(e.count-1))
		hh := make([]float64, e.count)
		copy(hh, e.hght[:e.count])
		insertionSort(hh)
		return hh[idx]
	}
	return e.hght[2]
}

// Count returns the number of observations.
func (e *Estimator) Count() int { return e.count }

func sign(d float64) float64 {
	if d > 0 {
		return 1
	}
	if d < 0 {
		return -1
	}
	return 0
}

func insertionSort(v []float64) {
	for i := 1; i < len(v); i++ {
		for j := i; j > 0 && v[j-1] > v[j]; j-- {
			v[j-1], v[j] = v[j], v[j-1]
		}
	}
}
