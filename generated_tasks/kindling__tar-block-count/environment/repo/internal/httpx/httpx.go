// Package httpx hosts a tiny HTTP server for the optional metrics
// endpoint. Stdlib only; no external dependencies.
package httpx

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net"
	"strings"
	"sync"
	"time"
)

// Method enumerates supported HTTP verbs.
type Method int

const (
	MethodGet Method = iota
	MethodHead
	MethodOther
)

// ParseMethod returns the matching Method.
func ParseMethod(token string) Method {
	switch token {
	case "GET":
		return MethodGet
	case "HEAD":
		return MethodHead
	default:
		return MethodOther
	}
}

// Request is a parsed HTTP/1.1 request.
type Request struct {
	Method  Method
	Path    string
	Version string
	Headers map[string]string
}

// Status codes used by the responder.
type Status int

const (
	StatusOK               Status = 200
	StatusNoContent        Status = 204
	StatusBadRequest       Status = 400
	StatusNotFound         Status = 404
	StatusMethodNotAllowed Status = 405
	StatusInternal         Status = 500
)

// Reason returns the canonical reason phrase.
func (s Status) Reason() string {
	switch s {
	case StatusOK:
		return "OK"
	case StatusNoContent:
		return "No Content"
	case StatusBadRequest:
		return "Bad Request"
	case StatusNotFound:
		return "Not Found"
	case StatusMethodNotAllowed:
		return "Method Not Allowed"
	case StatusInternal:
		return "Internal Server Error"
	default:
		return ""
	}
}

// Response is a built HTTP/1.1 response.
type Response struct {
	Status  Status
	Headers map[string]string
	Body    []byte
}

// OKText builds a 200 OK plain-text response.
func OKText(body string) Response {
	return Response{
		Status: StatusOK,
		Headers: map[string]string{
			"Content-Type":   "text/plain; charset=utf-8",
			"Content-Length": fmt.Sprint(len(body)),
		},
		Body: []byte(body),
	}
}

// OKProm builds a 200 OK Prometheus-format response.
func OKProm(body string) Response {
	return Response{
		Status: StatusOK,
		Headers: map[string]string{
			"Content-Type":   "text/plain; version=0.0.4; charset=utf-8",
			"Content-Length": fmt.Sprint(len(body)),
		},
		Body: []byte(body),
	}
}

// NotFound builds a 404 response.
func NotFound() Response {
	body := "not found\n"
	return Response{
		Status: StatusNotFound,
		Headers: map[string]string{
			"Content-Type":   "text/plain; charset=utf-8",
			"Content-Length": fmt.Sprint(len(body)),
		},
		Body: []byte(body),
	}
}

// MethodNotAllowed builds a 405 with `Allow:` header.
func MethodNotAllowed(allowed []string) Response {
	body := "method not allowed\n"
	return Response{
		Status: StatusMethodNotAllowed,
		Headers: map[string]string{
			"Allow":          strings.Join(allowed, ", "),
			"Content-Type":   "text/plain; charset=utf-8",
			"Content-Length": fmt.Sprint(len(body)),
		},
		Body: []byte(body),
	}
}

// Write serializes resp onto w.
func (resp Response) Write(w io.Writer) error {
	fmt.Fprintf(w, "HTTP/1.1 %d %s\r\n", resp.Status, resp.Status.Reason())
	for k, v := range resp.Headers {
		fmt.Fprintf(w, "%s: %s\r\n", k, v)
	}
	fmt.Fprintf(w, "\r\n")
	if _, err := w.Write(resp.Body); err != nil {
		return err
	}
	return nil
}

// Handler is a request handler.
type Handler func(*Request) Response

// Router is a path -> handler dispatcher.
type Router struct {
	mu     sync.RWMutex
	routes map[string]Handler
}

// NewRouter returns an empty router.
func NewRouter() *Router {
	return &Router{routes: map[string]Handler{}}
}

// Get registers a GET handler.
func (r *Router) Get(path string, h Handler) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.routes[path] = h
}

// Dispatch returns the handler's response.
func (r *Router) Dispatch(req *Request) Response {
	r.mu.RLock()
	defer r.mu.RUnlock()
	target := req.Path
	if i := strings.IndexByte(target, '?'); i >= 0 {
		target = target[:i]
	}
	h, ok := r.routes[target]
	if !ok {
		return NotFound()
	}
	if req.Method == MethodGet || req.Method == MethodHead {
		return h(req)
	}
	return MethodNotAllowed([]string{"GET", "HEAD"})
}

// Parse reads a request from a buffered reader.
func Parse(br *bufio.Reader) (*Request, error) {
	line, err := br.ReadString('\n')
	if err != nil {
		return nil, err
	}
	line = strings.TrimRight(line, "\r\n")
	parts := strings.SplitN(line, " ", 3)
	if len(parts) != 3 {
		return nil, fmt.Errorf("http: bad request line %q", line)
	}
	req := &Request{
		Method:  ParseMethod(parts[0]),
		Path:    parts[1],
		Version: parts[2],
		Headers: map[string]string{},
	}
	for {
		line, err := br.ReadString('\n')
		if err != nil {
			return nil, err
		}
		line = strings.TrimRight(line, "\r\n")
		if line == "" {
			break
		}
		i := strings.IndexByte(line, ':')
		if i < 0 {
			return nil, fmt.Errorf("http: bad header %q", line)
		}
		req.Headers[strings.ToLower(strings.TrimSpace(line[:i]))] = strings.TrimSpace(line[i+1:])
	}
	return req, nil
}

// ListenConfig is the server's listener configuration.
type ListenConfig struct {
	Bind         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

// DefaultListen returns a localhost-bound default config.
func DefaultListen() ListenConfig {
	return ListenConfig{
		Bind:         "127.0.0.1:9120",
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
	}
}

// Listen serves r on cfg.Bind until ctx is canceled.
func Listen(ctx context.Context, cfg ListenConfig, r *Router) error {
	ln, err := net.Listen("tcp", cfg.Bind)
	if err != nil {
		return fmt.Errorf("httpx: listen %s: %w", cfg.Bind, err)
	}
	defer ln.Close()
	go func() {
		<-ctx.Done()
		_ = ln.Close()
	}()
	for {
		conn, err := ln.Accept()
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return err
		}
		go handleConn(conn, cfg, r)
	}
}

func handleConn(conn net.Conn, cfg ListenConfig, r *Router) {
	defer conn.Close()
	if cfg.ReadTimeout > 0 {
		_ = conn.SetReadDeadline(time.Now().Add(cfg.ReadTimeout))
	}
	if cfg.WriteTimeout > 0 {
		_ = conn.SetWriteDeadline(time.Now().Add(cfg.WriteTimeout))
	}
	br := bufio.NewReader(conn)
	req, err := Parse(br)
	if err != nil {
		return
	}
	resp := r.Dispatch(req)
	_ = resp.Write(conn)
}
