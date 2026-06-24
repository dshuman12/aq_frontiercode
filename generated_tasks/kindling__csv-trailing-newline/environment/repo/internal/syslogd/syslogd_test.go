package syslogd

import "testing"

func TestParse3164(t *testing.T) {
	m, err := Parse("<13>Apr  2 15:04:05 host01 sshd[1234]: Accepted publickey")
	if err != nil {
		t.Fatal(err)
	}
	if m.Host != "host01" || m.App != "sshd" {
		t.Fatalf("got %+v", m)
	}
}

func TestParse5424(t *testing.T) {
	m, err := Parse("<165>1 2025-04-02T15:04:05Z host01 myapp 1234 ID47 - hello")
	if err != nil {
		t.Fatal(err)
	}
	if m.App != "myapp" || m.ProcID != "1234" {
		t.Fatalf("got %+v", m)
	}
}

func TestParseFailure(t *testing.T) {
	if _, err := Parse("not syslog"); err == nil {
		t.Fatal("expected err")
	}
	if _, err := Parse("<13>too short"); err == nil {
		t.Fatal("expected err")
	}
}
