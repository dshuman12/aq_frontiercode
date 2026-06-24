package main

import (
	"fmt"
	"io"
	"os"
	"sync/atomic"
	"time"
)

// Log levels for BCOSetLogLevel / filtering (contracts/c-api-surface.md).
const (
	LogLevelDebug = 0
	LogLevelInfo  = 1
	LogLevelWarn  = 2
	LogLevelError = 3
)

// LogSubsystem tags per Phase 2 task T006 (repository logging-spec.md uses a wider set;
// Go core emits these subsystem names on stderr).
type LogSubsystem string

const (
	LogEngine      LogSubsystem = "Engine"
	LogNetwork     LogSubsystem = "Network"
	LogPairing     LogSubsystem = "Pairing"
	LogPersistence LogSubsystem = "Persistence"
	LogCAPI        LogSubsystem = "CAPI"
	LogPriority    LogSubsystem = "Priority"
)

// BCOLogger writes [TIMESTAMP] [LEVEL] [SUBSYSTEM] MESSAGE lines to stderr by default
// (logging-spec.md).
type BCOLogger struct {
	out      io.Writer
	minLevel atomic.Int32
}

// NewBCOLogger builds a logger with INFO default minimum level.
func NewBCOLogger() *BCOLogger {
	l := &BCOLogger{out: os.Stderr}
	l.minLevel.Store(LogLevelInfo)
	return l
}

// SetMinLevel sets the minimum level (0=DEBUG … 3=ERROR).
func (l *BCOLogger) SetMinLevel(level int) {
	if level < LogLevelDebug {
		level = LogLevelDebug
	}
	if level > LogLevelError {
		level = LogLevelError
	}
	l.minLevel.Store(int32(level))
}

func (l *BCOLogger) enabled(min int) bool {
	return int(l.minLevel.Load()) <= min
}

func (l *BCOLogger) line(level string, sub LogSubsystem, msg string) string {
	ts := time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
	return fmt.Sprintf("[%s] [%s] [%s] %s\n", ts, level, sub, msg)
}

func (l *BCOLogger) Debug(sub LogSubsystem, msg string) {
	if !l.enabled(LogLevelDebug) {
		return
	}
	_, _ = l.out.Write([]byte(l.line("DEBUG", sub, msg)))
}

func (l *BCOLogger) Info(sub LogSubsystem, msg string) {
	if !l.enabled(LogLevelInfo) {
		return
	}
	_, _ = l.out.Write([]byte(l.line("INFO", sub, msg)))
}

func (l *BCOLogger) Warn(sub LogSubsystem, msg string) {
	if !l.enabled(LogLevelWarn) {
		return
	}
	_, _ = l.out.Write([]byte(l.line("WARN", sub, msg)))
}

func (l *BCOLogger) Error(sub LogSubsystem, msg string) {
	if !l.enabled(LogLevelError) {
		return
	}
	_, _ = l.out.Write([]byte(l.line("ERROR", sub, msg)))
}

// InfoPeer logs with a human-readable peer name when available (logging-spec.md).
func (l *BCOLogger) InfoPeer(sub LogSubsystem, peerName, peerID, msg string) {
	detail := msg
	switch {
	case peerName != "" && peerID != "":
		detail = fmt.Sprintf("peer %q (%s) %s", peerName, peerID, msg)
	case peerName != "":
		detail = fmt.Sprintf("peer %q %s", peerName, msg)
	case peerID != "":
		detail = fmt.Sprintf("peer %s %s", peerID, msg)
	}
	l.Info(sub, detail)
}

var defaultLogger = NewBCOLogger()

// SetGlobalMinLogLevel updates the process-wide default logger (wired from C API in capi.go).
func SetGlobalMinLogLevel(level int) {
	defaultLogger.SetMinLevel(level)
}
