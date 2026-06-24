package valueshape

import "testing"

func TestClassify(t *testing.T) {
	cases := map[string]Shape{
		"":                                     ShapeNull,
		"true":                                 ShapeBool,
		"42":                                   ShapeInt,
		"3.14":                                 ShapeFloat,
		"192.168.1.1":                          ShapeIPv4,
		"alice@example.com":                    ShapeEmail,
		"https://example.com/path":             ShapeURL,
		"550e8400-e29b-41d4-a716-446655440000": ShapeUUID,
		"01HZ8YPGZQNCYR0EXMPNE5RT8M":           ShapeULID,
		"2025-04-02":                           ShapeISODate,
		"2025-04-02T15:04:05Z":                 ShapeISODateTime,
		"deadbeef0123456789":                   ShapeHexToken,
		"+15551234567":                         ShapePhone,
		"/var/log/kindling.log":                ShapePath,
		"abcXYZ":                               ShapeGeneric,
	}
	for in, want := range cases {
		if got := Classify(in); got != want {
			t.Errorf("Classify(%q) = %s, want %s", in, got, want)
		}
	}
}

func TestHistogram(t *testing.T) {
	h := NewHistogram()
	for _, v := range []string{"42", "43", "foo", "true"} {
		h.Add(v)
	}
	c := h.Counts()
	if c[ShapeInt] != 2 || c[ShapeBool] != 1 || c[ShapeGeneric] != 1 {
		t.Fatalf("counts %v", c)
	}
	if h.Total() != 4 {
		t.Fatalf("total %d", h.Total())
	}
}

func TestIPv4Bounds(t *testing.T) {
	if Classify("999.0.0.1") == ShapeIPv4 {
		t.Fatal("999 should not match ipv4")
	}
}
