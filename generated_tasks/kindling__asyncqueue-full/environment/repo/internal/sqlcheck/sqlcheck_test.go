package sqlcheck

import "testing"

func TestOK(t *testing.T) {
	cases := []string{
		"SELECT * FROM x",
		"SELECT * FROM x;",
		"SELECT 'foo''bar' FROM x;",
		"-- comment\nSELECT 1",
		"/* block */ SELECT 1",
	}
	for _, c := range cases {
		if err := Check(c); err != nil {
			t.Fatalf("%q: %v", c, err)
		}
	}
}

func TestRejects(t *testing.T) {
	cases := []struct {
		src string
		err error
	}{
		{"SELECT 1; SELECT 2", ErrMultipleStatements},
		{"SELECT 'oops", ErrUnterminatedString},
		{"/* never ends", ErrUnterminatedComment},
		{";", ErrStrayCharacters},
	}
	for _, c := range cases {
		if err := Check(c.src); err != c.err {
			t.Fatalf("%q: got %v want %v", c.src, err, c.err)
		}
	}
}

func TestStrip(t *testing.T) {
	got := Strip("-- header\nSELECT * FROM t /* note */ WHERE x = 1;")
	want := "SELECT * FROM t  WHERE x = 1"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}
