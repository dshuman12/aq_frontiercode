// Package api is the HTTP transport for the engine. It is intentionally
// thin: every handler validates input, calls the engine, and renders the
// result as JSON. Anything resembling business logic belongs in the
// engine, not here.
//
// Path layout (versioned under /v1):
//
//	POST   /v1/workflows                start
//	GET    /v1/workflows                list
//	GET    /v1/workflows/{wid}/{rid}    describe
//	DELETE /v1/workflows/{wid}/{rid}    terminate
//	POST   /v1/workflows/{wid}/{rid}/signal/{name}   signal
//	POST   /v1/workflows/{wid}/{rid}/cancel          cancel
//	POST   /v1/workflows/{wid}/{rid}/history         fetch history (auth tail)
//	POST   /v1/tasks/decision/poll                   worker poll
//	POST   /v1/tasks/decision/complete               worker complete
//	POST   /v1/tasks/activity/poll                   worker poll
//	POST   /v1/tasks/activity/complete               worker complete
package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/vishaljakhar/durab/internal/auth"
	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/trace"
)

// Server is the HTTP surface around an Engine.
type Server struct {
	eng       *engine.Engine
	log       *log.Logger
	mux       *http.ServeMux
	authStore auth.Store
}

// Option configures Server.
type Option func(*Server)

// WithAuth installs token-based authentication on every endpoint except
// /healthz. Nil disables auth.
func WithAuth(s auth.Store) Option { return func(srv *Server) { srv.authStore = s } }

// New returns a Server with its mux pre-populated.
func New(eng *engine.Engine, lg *log.Logger, opts ...Option) *Server {
	if lg == nil {
		lg = log.Default
	}
	s := &Server{eng: eng, log: lg, mux: http.NewServeMux()}
	for _, opt := range opts {
		opt(s)
	}
	s.routes()
	return s
}

// Handler returns the HTTP handler. Trace-id middleware always wraps the
// mux; auth middleware wraps it as well when configured (with /healthz
// routed before auth).
func (s *Server) Handler() http.Handler {
	var inner http.Handler = s.mux
	if s.authStore != nil {
		outer := http.NewServeMux()
		outer.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("ok\n"))
		})
		outer.Handle("/", auth.Middleware(s.authStore)(s.mux))
		inner = outer
	}
	return trace.Middleware(inner)
}

func (s *Server) routes() {
	s.mux.HandleFunc("POST /v1/workflows", s.handleStart)
	s.mux.HandleFunc("GET /v1/workflows", s.handleList)
	s.mux.HandleFunc("GET /v1/workflows/{wid}/{rid}", s.handleDescribe)
	s.mux.HandleFunc("DELETE /v1/workflows/{wid}/{rid}", s.handleTerminate)
	s.mux.HandleFunc("POST /v1/workflows/{wid}/{rid}/signal/{name}", s.handleSignal)
	s.mux.HandleFunc("POST /v1/workflows/{wid}/{rid}/cancel", s.handleCancel)
	s.mux.HandleFunc("POST /v1/workflows/{wid}/{rid}/history", s.handleHistory)
	s.mux.HandleFunc("GET /v1/workflows/{wid}/{rid}/result", s.handleResult)

	s.mux.HandleFunc("POST /v1/schedules", s.handleCreateSchedule)
	s.mux.HandleFunc("GET /v1/schedules", s.handleListSchedules)
	s.mux.HandleFunc("DELETE /v1/schedules/{id}", s.handleDeleteSchedule)
	s.mux.HandleFunc("POST /v1/schedules/{id}/pause", s.handlePauseSchedule)

	s.mux.HandleFunc("POST /v1/tasks/decision/poll", s.handleDecisionPoll)
	s.mux.HandleFunc("POST /v1/tasks/decision/complete", s.handleDecisionComplete)
	s.mux.HandleFunc("POST /v1/tasks/activity/poll", s.handleActivityPoll)
	s.mux.HandleFunc("POST /v1/tasks/activity/complete", s.handleActivityComplete)

	s.mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok\n"))
	})
}

// writeJSON renders v as JSON with status. Errors are logged but not
// surfaced; the client already saw a status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	enc := json.NewEncoder(w)
	_ = enc.Encode(v)
}

// writeErr maps errors to HTTP status. Only errors from internal/errs are
// translated; everything else is 500.
func writeErr(w http.ResponseWriter, err error) {
	if err == nil {
		return
	}
	status := http.StatusInternalServerError
	switch {
	case errors.Is(err, errs.NotFound):
		status = http.StatusNotFound
	case errors.Is(err, errs.AlreadyExists):
		status = http.StatusConflict
	case errors.Is(err, errs.Invalid):
		status = http.StatusBadRequest
	case errors.Is(err, errs.Conflict):
		status = http.StatusConflict
	case errors.Is(err, errs.Unauthorized):
		status = http.StatusUnauthorized
	case errors.Is(err, errs.PermissionDenied):
		status = http.StatusForbidden
	}
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

// readJSON decodes the request body into v. The decoder rejects unknown
// fields so clients get fast feedback on shape errors.
func readJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return fmt.Errorf("%w: %s", errs.Invalid, err.Error())
	}
	return nil
}
