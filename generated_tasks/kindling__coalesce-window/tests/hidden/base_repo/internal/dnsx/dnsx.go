// Package dnsx parses textual representations of DNS records as they
// appear in zone files and (more importantly) in logs from name servers.
//
// The intent is not to be a full DNS library; it covers the rdata types
// kindling has to interpret to enrich records (A, AAAA, CNAME, MX, NS,
// PTR, SOA, SRV, TXT). Anything else is returned as a generic "unknown"
// rdata blob.
package dnsx

import (
	"errors"
	"net"
	"strconv"
	"strings"
)

// Record is one parsed RR.
type Record struct {
	Name  string
	Class string
	TTL   uint32
	Type  string
	Data  RData
}

// RData is the parsed rdata payload.
type RData interface {
	Kind() string
	String() string
}

// Parse parses one RR line. Comments (after ';') are stripped.
func Parse(line string) (Record, error) {
	if i := strings.IndexByte(line, ';'); i >= 0 {
		line = line[:i]
	}
	line = strings.TrimSpace(line)
	if line == "" {
		return Record{}, errors.New("dnsx: empty line")
	}
	parts := strings.Fields(line)
	if len(parts) < 4 {
		return Record{}, errors.New("dnsx: too few fields")
	}
	rec := Record{Name: parts[0]}
	idx := 1
	ttl, err := strconv.ParseUint(parts[idx], 10, 32)
	if err == nil {
		rec.TTL = uint32(ttl)
		idx++
	}
	if idx < len(parts) && (parts[idx] == "IN" || parts[idx] == "CH" || parts[idx] == "HS") {
		rec.Class = parts[idx]
		idx++
	} else {
		rec.Class = "IN"
	}
	if idx >= len(parts) {
		return Record{}, errors.New("dnsx: missing type")
	}
	rec.Type = strings.ToUpper(parts[idx])
	idx++
	rdata := strings.Join(parts[idx:], " ")
	d, err := parseRData(rec.Type, rdata)
	if err != nil {
		return Record{}, err
	}
	rec.Data = d
	return rec, nil
}

func parseRData(kind, src string) (RData, error) {
	switch kind {
	case "A":
		ip := net.ParseIP(src)
		if ip == nil || ip.To4() == nil {
			return nil, errors.New("dnsx: bad A address")
		}
		return RDataIP{V: ip.To4(), kind: "A"}, nil
	case "AAAA":
		ip := net.ParseIP(src)
		if ip == nil || ip.To4() != nil {
			return nil, errors.New("dnsx: bad AAAA address")
		}
		return RDataIP{V: ip, kind: "AAAA"}, nil
	case "CNAME", "NS", "PTR":
		return RDataName{Type: kind, Name: src}, nil
	case "MX":
		fields := strings.Fields(src)
		if len(fields) != 2 {
			return nil, errors.New("dnsx: bad MX")
		}
		pref, err := strconv.ParseUint(fields[0], 10, 16)
		if err != nil {
			return nil, err
		}
		return RDataMX{Pref: uint16(pref), Host: fields[1]}, nil
	case "SOA":
		fields := strings.Fields(src)
		if len(fields) < 7 {
			return nil, errors.New("dnsx: bad SOA")
		}
		return RDataSOA{
			MName:   fields[0],
			RName:   fields[1],
			Serial:  parseUint(fields[2]),
			Refresh: parseUint(fields[3]),
			Retry:   parseUint(fields[4]),
			Expire:  parseUint(fields[5]),
			Minimum: parseUint(fields[6]),
		}, nil
	case "SRV":
		fields := strings.Fields(src)
		if len(fields) != 4 {
			return nil, errors.New("dnsx: bad SRV")
		}
		return RDataSRV{
			Priority: uint16(parseUint(fields[0])),
			Weight:   uint16(parseUint(fields[1])),
			Port:     uint16(parseUint(fields[2])),
			Target:   fields[3],
		}, nil
	case "TXT":
		return RDataTXT{Body: strings.Trim(src, "\"")}, nil
	}
	return RDataUnknown{Type: kind, Body: src}, nil
}

func parseUint(s string) uint32 {
	v, _ := strconv.ParseUint(s, 10, 32)
	return uint32(v)
}

// ----- typed rdata -----

type RDataIP struct {
	V    net.IP
	kind string
}

func (r RDataIP) Kind() string   { return r.kind }
func (r RDataIP) String() string { return r.V.String() }

type RDataName struct {
	Type string
	Name string
}

func (r RDataName) Kind() string   { return r.Type }
func (r RDataName) String() string { return r.Name }

type RDataMX struct {
	Pref uint16
	Host string
}

func (r RDataMX) Kind() string   { return "MX" }
func (r RDataMX) String() string { return strconv.Itoa(int(r.Pref)) + " " + r.Host }

type RDataSOA struct {
	MName, RName                            string
	Serial, Refresh, Retry, Expire, Minimum uint32
}

func (r RDataSOA) Kind() string { return "SOA" }
func (r RDataSOA) String() string {
	return strings.Join([]string{
		r.MName, r.RName,
		strconv.FormatUint(uint64(r.Serial), 10),
		strconv.FormatUint(uint64(r.Refresh), 10),
		strconv.FormatUint(uint64(r.Retry), 10),
		strconv.FormatUint(uint64(r.Expire), 10),
		strconv.FormatUint(uint64(r.Minimum), 10),
	}, " ")
}

type RDataSRV struct {
	Priority, Weight, Port uint16
	Target                 string
}

func (r RDataSRV) Kind() string { return "SRV" }
func (r RDataSRV) String() string {
	return strings.Join([]string{
		strconv.FormatUint(uint64(r.Priority), 10),
		strconv.FormatUint(uint64(r.Weight), 10),
		strconv.FormatUint(uint64(r.Port), 10),
		r.Target,
	}, " ")
}

type RDataTXT struct {
	Body string
}

func (r RDataTXT) Kind() string   { return "TXT" }
func (r RDataTXT) String() string { return "\"" + r.Body + "\"" }

type RDataUnknown struct {
	Type string
	Body string
}

func (r RDataUnknown) Kind() string   { return r.Type }
func (r RDataUnknown) String() string { return r.Body }
