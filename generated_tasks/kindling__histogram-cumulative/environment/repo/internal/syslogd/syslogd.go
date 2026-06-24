// Package syslogd parses individual RFC 3164 / RFC 5424 syslog messages
// into a structured form suitable for kindling's log pipeline.
//
// Both formats are accepted on a best-effort basis. RFC 5424 is detected
// by the presence of the "1 " version token at the head of the message.
package syslogd

import (
	"errors"
	"strconv"
	"strings"
	"time"
)

// Message is one parsed syslog line.
type Message struct {
	Facility int
	Severity int
	Time     time.Time
	Host     string
	App      string
	ProcID   string
	MsgID    string
	Message  string
}

// Parse parses one line.
func Parse(line string) (Message, error) {
	if !strings.HasPrefix(line, "<") {
		return Message{}, errors.New("syslogd: missing PRI")
	}
	end := strings.IndexByte(line, '>')
	if end < 0 {
		return Message{}, errors.New("syslogd: unterminated PRI")
	}
	pri, err := strconv.Atoi(line[1:end])
	if err != nil {
		return Message{}, err
	}
	rest := line[end+1:]
	if strings.HasPrefix(rest, "1 ") {
		return parse5424(pri, rest[2:])
	}
	return parse3164(pri, rest)
}

func parse3164(pri int, rest string) (Message, error) {
	if len(rest) < 16 {
		return Message{}, errors.New("syslogd: rfc3164 line too short")
	}
	ts, err := time.Parse(time.Stamp, rest[:15])
	if err != nil {
		return Message{}, err
	}
	rest = rest[16:]
	sp := strings.IndexByte(rest, ' ')
	if sp < 0 {
		return Message{}, errors.New("syslogd: missing host")
	}
	host := rest[:sp]
	body := rest[sp+1:]
	app, msg := splitAppAndMsg(body)
	return Message{
		Facility: pri / 8,
		Severity: pri % 8,
		Time:     ts,
		Host:     host,
		App:      app,
		Message:  msg,
	}, nil
}

func splitAppAndMsg(body string) (string, string) {
	if colon := strings.IndexByte(body, ':'); colon > 0 && colon < 64 {
		appField := body[:colon]
		if br := strings.IndexByte(appField, '['); br >= 0 {
			appField = appField[:br]
		}
		return appField, strings.TrimSpace(body[colon+1:])
	}
	return "", body
}

func parse5424(pri int, rest string) (Message, error) {
	parts := strings.SplitN(rest, " ", 7)
	if len(parts) < 7 {
		return Message{}, errors.New("syslogd: rfc5424 expected 7 fields")
	}
	ts, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		ts, err = time.Parse(time.RFC3339, parts[0])
		if err != nil {
			return Message{}, err
		}
	}
	body := parts[6]
	if i := strings.IndexByte(body, ']'); strings.HasPrefix(body, "[") && i > 0 {
		body = strings.TrimSpace(body[i+1:])
	}
	return Message{
		Facility: pri / 8,
		Severity: pri % 8,
		Time:     ts,
		Host:     orDash(parts[1]),
		App:      orDash(parts[2]),
		ProcID:   orDash(parts[3]),
		MsgID:    orDash(parts[4]),
		Message:  body,
	}, nil
}

func orDash(s string) string {
	if s == "-" {
		return ""
	}
	return s
}
