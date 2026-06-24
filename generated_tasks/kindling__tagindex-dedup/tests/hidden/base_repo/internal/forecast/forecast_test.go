package forecast

import (
	"math"
	"testing"
)

func TestNaive(t *testing.T) {
	out, err := Forecast([]float64{1, 2, 3}, Config{Method: MethodNaive, Horizon: 3})
	if err != nil {
		t.Fatal(err)
	}
	for _, v := range out {
		if v != 3 {
			t.Fatalf("got %v", v)
		}
	}
}

func TestMean(t *testing.T) {
	out, _ := Forecast([]float64{1, 3, 5}, Config{Method: MethodMean, Horizon: 1})
	if out[0] != 3 {
		t.Fatalf("got %v", out[0])
	}
}

func TestSESConverges(t *testing.T) {
	out, _ := Forecast([]float64{10, 10, 10, 10}, Config{Method: MethodSES, Alpha: 0.5, Horizon: 2})
	for _, v := range out {
		if math.Abs(v-10) > 0.001 {
			t.Fatalf("got %v", v)
		}
	}
}

func TestHoltWintersTrending(t *testing.T) {
	series := []float64{1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4}
	out, err := Forecast(series, Config{Method: MethodHoltWinters, Period: 4, Horizon: 4})
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 4 {
		t.Fatalf("len %d", len(out))
	}
}

func TestErrorsOnEmpty(t *testing.T) {
	if _, err := Forecast(nil, Config{Method: MethodNaive, Horizon: 1}); err == nil {
		t.Fatal("expected err")
	}
	if _, err := Forecast([]float64{1}, Config{Method: "bogus", Horizon: 1}); err == nil {
		t.Fatal("expected err")
	}
}

func TestMAE(t *testing.T) {
	if v := MAE([]float64{1, 2, 3}, []float64{1, 2, 3}); v != 0 {
		t.Fatalf("got %v", v)
	}
	if v := MAE([]float64{1, 2}, []float64{2, 2}); v != 0.5 {
		t.Fatalf("got %v", v)
	}
}

func TestMAPE(t *testing.T) {
	v := MAPE([]float64{110, 90}, []float64{100, 100})
	if math.Abs(v-10) > 0.0001 {
		t.Fatalf("got %v", v)
	}
}
