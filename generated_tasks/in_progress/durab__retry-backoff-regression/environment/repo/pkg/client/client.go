package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/trace"
	"github.com/vishaljakhar/durab/pkg/types"
)

type Client struct {
	baseURL string
	http    *http.Client
}

func New(baseURL string) *Client {
	return &Client{baseURL: baseURL, http: &http.Client{Timeout: 30 * time.Second}}
}

func (c *Client) WithHTTPClient(h *http.Client) *Client { c.http = h; return c }

type StartRequest struct {
	Namespace      types.Namespace       `json:"namespace,omitempty"`
	WorkflowID     types.WorkflowID      `json:"workflow_id"`
	WorkflowType   string                `json:"workflow_type"`
	TaskQueue      types.TaskQueue       `json:"task_queue,omitempty"`
	Input          types.Payload         `json:"input,omitempty"`
	Options        types.WorkflowOptions `json:"options,omitempty"`
	IdempotencyKey string                `json:"idempotency_key,omitempty"`
}

type startResp struct {
	Execution types.Execution `json:"execution"`
}

func (c *Client) StartWorkflow(ctx context.Context, req StartRequest) (types.Execution, error) {
	var out startResp
	if err := c.do(ctx, "POST", "/v1/workflows", req, &out); err != nil {
		return types.Execution{}, err
	}
	return out.Execution, nil
}

func (c *Client) DescribeWorkflow(ctx context.Context, ns types.Namespace, exec types.Execution) (types.Info, error) {
	var out types.Info
	p := fmt.Sprintf("/v1/workflows/%s/%s?namespace=%s", exec.WorkflowID, exec.RunID, ns)
	if err := c.do(ctx, "GET", p, nil, &out); err != nil {
		return types.Info{}, err
	}
	return out, nil
}

func (c *Client) SignalWorkflow(ctx context.Context, ns types.Namespace, exec types.Execution, name string, input types.Payload) error {
	p := fmt.Sprintf("/v1/workflows/%s/%s/signal/%s?namespace=%s", exec.WorkflowID, exec.RunID, name, ns)
	return c.do(ctx, "POST", p, map[string]any{"input": input}, nil)
}

func (c *Client) CancelWorkflow(ctx context.Context, ns types.Namespace, exec types.Execution) error {
	p := fmt.Sprintf("/v1/workflows/%s/%s/cancel?namespace=%s", exec.WorkflowID, exec.RunID, ns)
	return c.do(ctx, "POST", p, nil, nil)
}

func (c *Client) TerminateWorkflow(ctx context.Context, ns types.Namespace, exec types.Execution, reason string) error {
	p := fmt.Sprintf("/v1/workflows/%s/%s?namespace=%s&reason=%s", exec.WorkflowID, exec.RunID, ns, reason)
	return c.do(ctx, "DELETE", p, nil, nil)
}

func (c *Client) GetHistory(ctx context.Context, exec types.Execution, from, to int64) ([]history.Event, error) {
	p := fmt.Sprintf("/v1/workflows/%s/%s/history?from=%s&to=%s",
		exec.WorkflowID, exec.RunID, strconv.FormatInt(from, 10), strconv.FormatInt(to, 10))
	var out struct {
		History []history.Event `json:"history"`
	}
	if err := c.do(ctx, "POST", p, nil, &out); err != nil {
		return nil, err
	}
	return out.History, nil
}

type PollDecisionRequest struct {
	TaskQueue    types.TaskQueue `json:"task_queue"`
	WorkerID     string          `json:"worker_id"`
	LeaseSeconds int             `json:"lease_seconds,omitempty"`
}

type DecisionTaskResponse struct {
	Idle bool `json:"idle"`
	Task *struct {
		TaskID       int64           `json:"TaskID"`
		Namespace    types.Namespace `json:"Namespace"`
		Execution    types.Execution `json:"Execution"`
		TaskQueue    types.TaskQueue `json:"TaskQueue"`
		WorkflowType string          `json:"WorkflowType"`
		History      []history.Event `json:"History"`
		Attempt      int             `json:"Attempt"`
	} `json:"task,omitempty"`
}

func (c *Client) PollDecisionTask(ctx context.Context, req PollDecisionRequest) (*DecisionTaskResponse, error) {
	out := &DecisionTaskResponse{}
	if err := c.do(ctx, "POST", "/v1/tasks/decision/poll", req, out); err != nil {
		return nil, err
	}
	return out, nil
}

type CompleteDecisionRequest struct {
	TaskID    int64               `json:"task_id"`
	Execution types.Execution     `json:"execution"`
	Decisions []decision.Decision `json:"decisions"`
}

func (c *Client) CompleteDecisionTask(ctx context.Context, req CompleteDecisionRequest) error {
	return c.do(ctx, "POST", "/v1/tasks/decision/complete", req, nil)
}

func (c *Client) do(ctx context.Context, method, path string, body any, out any) error {
	var buf io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		buf = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	trace.Wire(ctx, req)
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return mapStatus(resp.StatusCode, b)
	}
	if out == nil || resp.StatusCode == http.StatusNoContent {
		_, _ = io.Copy(io.Discard, resp.Body)
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func mapStatus(code int, body []byte) error {
	var e struct{ Error string }
	_ = json.Unmarshal(body, &e)
	msg := e.Error
	if msg == "" {
		msg = string(body)
	}
	switch code {
	case http.StatusNotFound:
		return fmt.Errorf("%w: %s", errs.NotFound, msg)
	case http.StatusConflict:
		return fmt.Errorf("%w: %s", errs.Conflict, msg)
	case http.StatusBadRequest:
		return fmt.Errorf("%w: %s", errs.Invalid, msg)
	case http.StatusUnauthorized:
		return fmt.Errorf("%w: %s", errs.Unauthorized, msg)
	case http.StatusForbidden:
		return fmt.Errorf("%w: %s", errs.PermissionDenied, msg)
	}
	return errors.New(msg)
}
