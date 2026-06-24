// Package forecast implements simple-Holt-Winters and naive seasonal
// forecasters used to extrapolate per-bucket counters into the next
// horizon. The implementation is intentionally compact; it favours
// stable defaults over breadth and is not intended to compete with
// dedicated time-series libraries.
package forecast

import (
	"errors"
	"math"
)

// Method names a forecasting strategy.
type Method string

const (
	// MethodNaive returns the last observed value for every horizon.
	MethodNaive Method = "naive"
	// MethodMean returns the mean of the training window.
	MethodMean Method = "mean"
	// MethodSES uses simple exponential smoothing (Brown's method).
	MethodSES Method = "ses"
	// MethodHoltWinters uses additive Holt-Winters with optional seasonality.
	MethodHoltWinters Method = "hw"
)

// Config configures Forecast.
type Config struct {
	Method  Method
	Alpha   float64 // level smoothing
	Beta    float64 // trend smoothing
	Gamma   float64 // seasonal smoothing
	Period  int     // seasonality period; 0 disables
	Horizon int     // points to forecast
}

// Forecast returns the predicted continuation of series.
func Forecast(series []float64, cfg Config) ([]float64, error) {
	if cfg.Horizon <= 0 {
		return nil, errors.New("forecast: horizon must be > 0")
	}
	if len(series) == 0 {
		return nil, errors.New("forecast: empty series")
	}
	switch cfg.Method {
	case "", MethodNaive:
		return naive(series, cfg.Horizon), nil
	case MethodMean:
		return mean(series, cfg.Horizon), nil
	case MethodSES:
		alpha := cfg.Alpha
		if alpha <= 0 {
			alpha = 0.3
		}
		return ses(series, alpha, cfg.Horizon), nil
	case MethodHoltWinters:
		alpha, beta, gamma := cfg.Alpha, cfg.Beta, cfg.Gamma
		if alpha <= 0 {
			alpha = 0.3
		}
		if beta <= 0 {
			beta = 0.1
		}
		if gamma <= 0 {
			gamma = 0.1
		}
		return holtWinters(series, cfg.Period, alpha, beta, gamma, cfg.Horizon)
	}
	return nil, errors.New("forecast: unknown method")
}

func naive(series []float64, h int) []float64 {
	last := series[len(series)-1]
	out := make([]float64, h)
	for i := range out {
		out[i] = last
	}
	return out
}

func mean(series []float64, h int) []float64 {
	sum := 0.0
	for _, v := range series {
		sum += v
	}
	m := sum / float64(len(series))
	out := make([]float64, h)
	for i := range out {
		out[i] = m
	}
	return out
}

func ses(series []float64, alpha float64, h int) []float64 {
	level := series[0]
	for _, v := range series[1:] {
		level = alpha*v + (1-alpha)*level
	}
	out := make([]float64, h)
	for i := range out {
		out[i] = level
	}
	return out
}

func holtWinters(series []float64, period int, alpha, beta, gamma float64, h int) ([]float64, error) {
	if period <= 0 {
		return holt(series, alpha, beta, h), nil
	}
	if len(series) < 2*period {
		return nil, errors.New("forecast: need >= 2*period samples for HW")
	}
	level := mean64(series[:period])
	trend := (mean64(series[period:2*period]) - mean64(series[:period])) / float64(period)
	seasonal := make([]float64, period)
	for i := 0; i < period; i++ {
		seasonal[i] = series[i] - level
	}
	for t, v := range series {
		s := seasonal[t%period]
		newLevel := alpha*(v-s) + (1-alpha)*(level+trend)
		newTrend := beta*(newLevel-level) + (1-beta)*trend
		seasonal[t%period] = gamma*(v-newLevel) + (1-gamma)*s
		level = newLevel
		trend = newTrend
	}
	out := make([]float64, h)
	for i := 0; i < h; i++ {
		out[i] = level + float64(i+1)*trend + seasonal[(len(series)+i)%period]
	}
	return out, nil
}

func holt(series []float64, alpha, beta float64, h int) []float64 {
	if len(series) < 2 {
		return naive(series, h)
	}
	level := series[0]
	trend := series[1] - series[0]
	for _, v := range series[1:] {
		newLevel := alpha*v + (1-alpha)*(level+trend)
		newTrend := beta*(newLevel-level) + (1-beta)*trend
		level = newLevel
		trend = newTrend
	}
	out := make([]float64, h)
	for i := range out {
		out[i] = level + float64(i+1)*trend
	}
	return out
}

func mean64(v []float64) float64 {
	s := 0.0
	for _, x := range v {
		s += x
	}
	return s / float64(len(v))
}

// MAE computes the mean absolute error between predictions and actuals.
func MAE(predicted, actual []float64) float64 {
	if len(predicted) != len(actual) || len(predicted) == 0 {
		return math.NaN()
	}
	s := 0.0
	for i := range predicted {
		s += math.Abs(predicted[i] - actual[i])
	}
	return s / float64(len(predicted))
}

// MAPE computes mean absolute percentage error; zero actuals are skipped.
func MAPE(predicted, actual []float64) float64 {
	if len(predicted) != len(actual) {
		return math.NaN()
	}
	s, n := 0.0, 0
	for i := range predicted {
		if actual[i] == 0 {
			continue
		}
		s += math.Abs((predicted[i] - actual[i]) / actual[i])
		n++
	}
	if n == 0 {
		return math.NaN()
	}
	return 100 * s / float64(n)
}
