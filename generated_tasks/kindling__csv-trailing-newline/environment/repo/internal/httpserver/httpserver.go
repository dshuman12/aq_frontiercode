// Package httpserver wraps net/http with kindling's standard middleware
// chain: request id assignment, panic recovery, structured logging,
// and graceful shutdown.
package httpserver

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"
	"sync"
	"sync/atomic"
	"time"
)

// Logger writes a single line per request.
type Logger func(format string, args ...any)

// Config configures the Server.
type Config struct {
	Addr            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
	Logger          Logger
	OnPanic         func(req *http.Request, value any, stack []byte)
}

// Server is the wrapped server.
type Server struct {
	cfg    Config
	mux    *http.ServeMux
	server *http.Server
	stats  ServerStats
}

// ServerStats reports request counters.
type ServerStats struct {
	Requests   uint64
	Panics     uint64
	StatusFails uint64
}

// New constructs a Server.
func New(cfg Config) *Server {
	if cfg.ReadTimeout == 0 {
		cfg.ReadTimeout = 30 * time.Second
	}
	if cfg.WriteTimeout == 0 {
		cfg.WriteTimeout = 30 * time.Second
	}
	if cfg.ShutdownTimeout == 0 {
		cfg.ShutdownTimeout = 5 * time.Second
	}
	if cfg.Logger == nil {
		cfg.Logger = func(format string, args ...any) {}
	}
	mux := http.NewServeMux()
	srv := &Server{cfg: cfg, mux: mux}
	srv.server = &http.Server{
		Addr:         cfg.Addr,
		Handler:      srv.middleware(mux),
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
	}
	return srv
}

// Handle registers a handler under pattern.
func (s *Server) Handle(pattern string, h http.HandlerFunc) {
	s.mux.HandleFunc(pattern, h)
}

// ListenAndServe blocks until the server stops.
func (s *Server) ListenAndServe() error {
	return s.server.ListenAndServe()
}

// Shutdown gracefully stops the server.
func (s *Server) Shutdown(ctx context.Context) error {
	c, cancel := context.WithTimeout(ctx, s.cfg.ShutdownTimeout)
	defer cancel()
	return s.server.Shutdown(c)
}

// Stats returns counters.
func (s *Server) Stats() ServerStats {
	return ServerStats{
		Requests:    atomic.LoadUint64(&s.stats.Requests),
		Panics:      atomic.LoadUint64(&s.stats.Panics),
		StatusFails: atomic.LoadUint64(&s.stats.StatusFails),
	}
}

// middleware wraps h with the standard chain.
func (s *Server) middleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&s.stats.Requests, 1)
		reqID := newRequestID()
		w.Header().Set("X-Request-ID", reqID)
		ctx := context.WithValue(r.Context(), reqIDKey{}, reqID)
		r = r.WithContext(ctx)
		start := time.Now()
		ww := &countingWriter{ResponseWriter: w, status: 200}
		defer func() {
			if v := recover(); v != nil {
				atomic.AddUint64(&s.stats.Panics, 1)
				if s.cfg.OnPanic != nil {
					s.cfg.OnPanic(r, v, debug.Stack())
				}
				http.Error(ww, "internal server error", http.StatusInternalServerError)
			}
			if ww.status >= 400 {
				atomic.AddUint64(&s.stats.StatusFails, 1)
			}
			s.cfg.Logger("req=%s method=%s path=%s status=%d bytes=%d dur=%s",
				reqID, r.Method, r.URL.Path, ww.status, ww.bytes, time.Since(start))
		}()
		h.ServeHTTP(ww, r)
	})
}

// reqIDKey is the context key for the request id.
type reqIDKey struct{}

// RequestID returns the id assigned to this request.
func RequestID(ctx context.Context) string {
	if v, ok := ctx.Value(reqIDKey{}).(string); ok {
		return v
	}
	return ""
}

// countingWriter records the status and bytes for the access log.
type countingWriter struct {
	http.ResponseWriter
	status     int
	bytes      int
	headerSent bool
	mu         sync.Mutex
}

func (w *countingWriter) WriteHeader(code int) {
	w.mu.Lock()
	if !w.headerSent {
		w.status = code
		w.headerSent = true
	}
	w.mu.Unlock()
	w.ResponseWriter.WriteHeader(code)
}

func (w *countingWriter) Write(b []byte) (int, error) {
	if !w.headerSent {
		w.WriteHeader(http.StatusOK)
	}
	n, err := w.ResponseWriter.Write(b)
	w.mu.Lock()
	w.bytes += n
	w.mu.Unlock()
	return n, err
}

func newRequestID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "no-id"
	}
	return hex.EncodeToString(b[:])
}

// HealthHandler returns a handler that responds 200 OK with the body "ok".
func HealthHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "ok")
	}
}

// ReadinessHandler returns a handler that consults the supplied probe.
func ReadinessHandler(probe func() error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := probe(); err != nil {
			http.Error(w, err.Error(), http.StatusServiceUnavailable)
			return
		}
		fmt.Fprintln(w, "ready")
	}
}

// JSONHandler is a tiny helper that wraps a func returning JSON.
type JSONHandler func(req *http.Request) (status int, body any, err error)

// ErrJSONUnsupported is returned when JSONHandler returns an unsupported body.
var ErrJSONUnsupported = errors.New("httpserver: unsupported JSON body type")

// MarshalJSON turns common bodies into bytes for ServeJSON.
func MarshalJSON(body any) ([]byte, error) {
	switch v := body.(type) {
	case nil:
		return []byte("null"), nil
	case []byte:
		return v, nil
	case string:
		return []byte(v), nil
	}
	return nil, ErrJSONUnsupported
}
