// Package gateway is a tiny HTTP-to-internal RPC bridge for kindling's
// admin endpoints. The intent is to standardise: route registration,
// request id propagation, content-type negotiation, and JSON envelope
// formatting.
package gateway

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"sync"
	"time"
)

// Handler signature for gateway-managed endpoints.
type Handler func(ctx context.Context, req *Request) (*Response, error)

// Request is the parsed input.
type Request struct {
	Method  string
	Path    string
	Params  map[string]string
	Headers map[string]string
	Body    []byte
}

// Response is the structured output.
type Response struct {
	Status      int
	ContentType string
	Body        any
	Headers     map[string]string
}

// Route binds a method+path to a handler.
type Route struct {
	Method  string
	Path    string
	Handler Handler
	Doc     string
}

// Gateway is the dispatcher.
type Gateway struct {
	mu       sync.RWMutex
	routes   []Route
	notFound Handler
	logger   func(format string, args ...any)
	now      func() time.Time
}

// New constructs a Gateway.
func New() *Gateway {
	return &Gateway{
		notFound: defaultNotFound,
		logger:   func(string, ...any) {},
		now:      time.Now,
	}
}

// SetLogger registers a logging callback.
func (g *Gateway) SetLogger(fn func(string, ...any)) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.logger = fn
}

// SetNotFound overrides the not-found handler.
func (g *Gateway) SetNotFound(h Handler) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.notFound = h
}

// Register adds a route.
func (g *Gateway) Register(method, path, doc string, h Handler) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.routes = append(g.routes, Route{Method: method, Path: path, Doc: doc, Handler: h})
}

// Routes returns a copy of the registered routes sorted by path.
func (g *Gateway) Routes() []Route {
	g.mu.RLock()
	defer g.mu.RUnlock()
	out := make([]Route, len(g.routes))
	copy(out, g.routes)
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Path != out[j].Path {
			return out[i].Path < out[j].Path
		}
		return out[i].Method < out[j].Method
	})
	return out
}

// ServeHTTP implements http.Handler.
func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := g.now()
	body, err := readBody(r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	gReq := &Request{
		Method:  r.Method,
		Path:    r.URL.Path,
		Params:  flatQuery(r),
		Headers: flatHeaders(r),
		Body:    body,
	}
	handler := g.lookup(r.Method, r.URL.Path)
	if handler == nil {
		handler = g.notFound
	}
	resp, err := handler(r.Context(), gReq)
	dur := g.now().Sub(start)
	if err != nil {
		g.logger("gateway: %s %s -> error %v dur=%s", r.Method, r.URL.Path, err, dur)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	for k, v := range resp.Headers {
		w.Header().Set(k, v)
	}
	if resp.ContentType != "" {
		w.Header().Set("Content-Type", resp.ContentType)
	} else {
		w.Header().Set("Content-Type", "application/json")
	}
	if resp.Status == 0 {
		resp.Status = http.StatusOK
	}
	writeJSON(w, resp.Status, resp.Body)
	g.logger("gateway: %s %s -> %d dur=%s", r.Method, r.URL.Path, resp.Status, dur)
}

func (g *Gateway) lookup(method, path string) Handler {
	g.mu.RLock()
	defer g.mu.RUnlock()
	for _, r := range g.routes {
		if r.Method == method && r.Path == path {
			return r.Handler
		}
	}
	return nil
}

func defaultNotFound(ctx context.Context, req *Request) (*Response, error) {
	return &Response{Status: http.StatusNotFound, Body: map[string]string{"error": "not found"}}, nil
}

func readBody(r *http.Request) ([]byte, error) {
	if r.Body == nil {
		return nil, nil
	}
	defer r.Body.Close()
	const maxBody = 4 << 20 // 4 MiB
	body := make([]byte, 0, 1024)
	buf := make([]byte, 4096)
	for {
		n, err := r.Body.Read(buf)
		if n > 0 {
			if len(body)+n > maxBody {
				return nil, errors.New("gateway: body too large")
			}
			body = append(body, buf[:n]...)
		}
		if err != nil {
			break
		}
	}
	return body, nil
}

func flatQuery(r *http.Request) map[string]string {
	out := map[string]string{}
	for k, v := range r.URL.Query() {
		if len(v) > 0 {
			out[k] = v[0]
		}
	}
	return out
}

func flatHeaders(r *http.Request) map[string]string {
	out := map[string]string{}
	for k, v := range r.Header {
		if len(v) > 0 {
			out[k] = v[0]
		}
	}
	return out
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.WriteHeader(status)
	if body == nil {
		return
	}
	encoded, err := json.Marshal(body)
	if err != nil {
		fmt.Fprintf(w, `{"error":%q}`, err.Error())
		return
	}
	_, _ = w.Write(encoded)
}
