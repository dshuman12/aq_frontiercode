package dnsx

import "testing"

func TestParseA(t *testing.T) {
	r, err := Parse("example.com. 300 IN A 93.184.216.34")
	if err != nil {
		t.Fatal(err)
	}
	if r.Type != "A" || r.Data.String() != "93.184.216.34" {
		t.Fatalf("got %+v", r)
	}
}

func TestParseMX(t *testing.T) {
	r, err := Parse("example.com. 300 IN MX 10 mail.example.com.")
	if err != nil {
		t.Fatal(err)
	}
	mx := r.Data.(RDataMX)
	if mx.Pref != 10 || mx.Host != "mail.example.com." {
		t.Fatalf("got %+v", mx)
	}
}

func TestParseTXT(t *testing.T) {
	r, err := Parse(`example.com. 300 IN TXT "v=spf1 -all"`)
	if err != nil {
		t.Fatal(err)
	}
	if r.Data.(RDataTXT).Body != "v=spf1 -all" {
		t.Fatalf("got %+v", r.Data)
	}
}

func TestParseSOA(t *testing.T) {
	r, err := Parse("example.com. 300 IN SOA ns1.example.com. hostmaster.example.com. 2025040201 7200 3600 1209600 3600")
	if err != nil {
		t.Fatal(err)
	}
	soa := r.Data.(RDataSOA)
	if soa.Serial != 2025040201 {
		t.Fatalf("got %+v", soa)
	}
}

func TestParseSRV(t *testing.T) {
	r, err := Parse("_sip._tcp.example.com. 300 IN SRV 10 60 5060 sipserver.example.com.")
	if err != nil {
		t.Fatal(err)
	}
	if r.Data.(RDataSRV).Port != 5060 {
		t.Fatalf("got %+v", r.Data)
	}
}

func TestParseFailure(t *testing.T) {
	if _, err := Parse(""); err == nil {
		t.Fatal("expected err")
	}
	if _, err := Parse("only one"); err == nil {
		t.Fatal("expected err")
	}
}

func TestComment(t *testing.T) {
	r, err := Parse("a. 1 IN A 1.2.3.4 ; trailing comment")
	if err != nil {
		t.Fatal(err)
	}
	if r.Data.String() != "1.2.3.4" {
		t.Fatalf("got %+v", r)
	}
}
