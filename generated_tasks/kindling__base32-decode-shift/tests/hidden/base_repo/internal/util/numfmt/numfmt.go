// Package numfmt renders sizes, durations, and counters in
// operator-friendly form.
package numfmt

import (
	"fmt"
	"time"
)

// Bytes renders a byte count with binary-prefix units (KiB, MiB, ...).
func Bytes(n uint64) string {
	const k = 1024
	if n < k {
		return fmt.Sprintf("%d B", n)
	}
	units := []string{"KiB", "MiB", "GiB", "TiB", "PiB", "EiB"}
	var f float64 = float64(n) / k
	idx := 0
	for f >= k && idx < len(units)-1 {
		f /= k
		idx++
	}
	return fmt.Sprintf("%.2f %s", f, units[idx])
}

// Duration renders a time.Duration in a single human-readable token.
func Duration(d time.Duration) string {
	if d < time.Microsecond {
		return fmt.Sprintf("%d ns", d.Nanoseconds())
	}
	if d < time.Millisecond {
		return fmt.Sprintf("%.1f \u00b5s", float64(d.Nanoseconds())/1000.0)
	}
	if d < time.Second {
		return fmt.Sprintf("%.1f ms", float64(d.Nanoseconds())/1_000_000.0)
	}
	if d < time.Minute {
		return fmt.Sprintf("%.2f s", d.Seconds())
	}
	if d < time.Hour {
		m := int(d.Minutes())
		s := int(d.Seconds()) - m*60
		return fmt.Sprintf("%dm %ds", m, s)
	}
	h := int(d.Hours())
	m := int(d.Minutes()) - h*60
	return fmt.Sprintf("%dh %dm", h, m)
}

// Count renders a counter with thousand separators.
func Count(n uint64) string {
	s := fmt.Sprintf("%d", n)
	if len(s) <= 3 {
		return s
	}
	out := []byte{}
	for i, ch := range []byte(s) {
		if i > 0 && (len(s)-i)%3 == 0 {
			out = append(out, ',')
		}
		out = append(out, ch)
	}
	return string(out)
}
