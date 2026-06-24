package schemastore

import "testing"

func base() *Schema {
	return &Schema{
		Subject: "events",
		Version: 1,
		Fields: []Field{
			{Name: "id", Type: TString},
			{Name: "ts", Type: TTime},
		},
	}
}

func TestRegisterFirst(t *testing.T) {
	s := New()
	if err := s.Register(base()); err != nil {
		t.Fatal(err)
	}
}

func TestRegisterCompatible(t *testing.T) {
	s := New()
	_ = s.Register(base())
	v2 := &Schema{
		Subject: "events",
		Version: 2,
		Fields:  append(append([]Field{}, base().Fields...), Field{Name: "level", Type: TString}),
	}
	if err := s.Register(v2); err != nil {
		t.Fatal(err)
	}
	added := Diff(base(), v2)
	if len(added) != 1 || added[0].Name != "level" {
		t.Fatalf("diff %v", added)
	}
}

func TestRegisterRejectsDrop(t *testing.T) {
	s := New()
	_ = s.Register(base())
	v2 := &Schema{
		Subject: "events",
		Version: 2,
		Fields:  []Field{{Name: "id", Type: TString}},
	}
	if err := s.Register(v2); err == nil {
		t.Fatal("expected err")
	}
}

func TestRegisterRejectsTypeChange(t *testing.T) {
	s := New()
	_ = s.Register(base())
	v2 := &Schema{
		Subject: "events",
		Version: 2,
		Fields: []Field{
			{Name: "id", Type: TInt},
			{Name: "ts", Type: TTime},
		},
	}
	if err := s.Register(v2); err == nil {
		t.Fatal("expected err")
	}
}

func TestRegisterRejectsBadVersion(t *testing.T) {
	s := New()
	_ = s.Register(base())
	v3 := &Schema{Subject: "events", Version: 3}
	if err := s.Register(v3); err == nil {
		t.Fatal("expected err")
	}
}

func TestLatest(t *testing.T) {
	s := New()
	_ = s.Register(base())
	got, _ := s.Latest("events")
	if got.Version != 1 {
		t.Fatal("expected v1")
	}
	if _, err := s.Latest("nope"); err == nil {
		t.Fatal("expected err")
	}
}

func TestSubjects(t *testing.T) {
	s := New()
	_ = s.Register(base())
	if got := s.Subjects(); len(got) != 1 || got[0] != "events" {
		t.Fatalf("got %v", got)
	}
}
