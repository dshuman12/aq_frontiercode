package api

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

// startReq mirrors engine.StartRequest with JSON tags suitable for an API.
type startReq struct {
	Namespace    types.Namespace        `json:"namespace,omitempty"`
	WorkflowID   types.WorkflowID       `json:"workflow_id"`
	WorkflowType string                 `json:"workflow_type"`
	TaskQueue    types.TaskQueue        `json:"task_queue,omitempty"`
	Input        types.Payload          `json:"input,omitempty"`
	Options      types.WorkflowOptions  `json:"options,omitempty"`
}

type startResp struct {
	Execution types.Execution `json:"execution"`
}

func (s *Server) handleStart(w http.ResponseWriter, r *http.Request) {
	var req startReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, err)
		return
	}
	exec, err := s.eng.StartWorkflow(r.Context(), engine.StartRequest{
		Namespace:    req.Namespace,
		WorkflowID:   req.WorkflowID,
		WorkflowType: req.WorkflowType,
		TaskQueue:    req.TaskQueue,
		Input:        req.Input,
		Options:      req.Options,
	})
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, startResp{Execution: exec})
}

func (s *Server) handleList(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := storage.WorkflowFilter{
		Namespace: types.Namespace(q.Get("namespace")),
		TaskQueue: types.TaskQueue(q.Get("task_queue")),
		Status:    types.WorkflowStatus(q.Get("status")),
	}
	if v := q.Get("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			writeErr(w, fmt.Errorf("%w: limit must be a non-negative integer", errs.Invalid))
			return
		}
		f.Limit = n
	}
	if v := q.Get("after"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			writeErr(w, fmt.Errorf("%w: after must be RFC3339", errs.Invalid))
			return
		}
		f.After = t
	}
	out, err := s.eng.ListWorkflows(r.Context(), f)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workflows": out})
}

func (s *Server) handleDescribe(w http.ResponseWriter, r *http.Request) {
	wid, rid := r.PathValue("wid"), r.PathValue("rid")
	ns := types.Namespace(r.URL.Query().Get("namespace"))
	if ns == "" {
		ns = types.DefaultNamespace
	}
	info, err := s.eng.DescribeWorkflow(r.Context(), ns, types.Execution{
		WorkflowID: types.WorkflowID(wid),
		RunID:      types.RunID(rid),
	})
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, info)
}

func (s *Server) handleTerminate(w http.ResponseWriter, r *http.Request) {
	wid, rid := r.PathValue("wid"), r.PathValue("rid")
	ns := types.Namespace(r.URL.Query().Get("namespace"))
	if ns == "" {
		ns = types.DefaultNamespace
	}
	reason := r.URL.Query().Get("reason")
	err := s.eng.TerminateWorkflow(r.Context(), ns, types.Execution{
		WorkflowID: types.WorkflowID(wid),
		RunID:      types.RunID(rid),
	}, reason)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusNoContent, nil)
}

type signalReq struct {
	Input types.Payload `json:"input,omitempty"`
}

func (s *Server) handleSignal(w http.ResponseWriter, r *http.Request) {
	wid, rid, name := r.PathValue("wid"), r.PathValue("rid"), r.PathValue("name")
	ns := types.Namespace(r.URL.Query().Get("namespace"))
	if ns == "" {
		ns = types.DefaultNamespace
	}
	var req signalReq
	// Empty body is fine; signals often carry no payload.
	if r.ContentLength > 0 {
		if err := readJSON(r, &req); err != nil {
			writeErr(w, err)
			return
		}
	}
	err := s.eng.SignalWorkflow(r.Context(), ns, types.Execution{
		WorkflowID: types.WorkflowID(wid),
		RunID:      types.RunID(rid),
	}, name, req.Input)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, nil)
}

func (s *Server) handleCancel(w http.ResponseWriter, r *http.Request) {
	wid, rid := r.PathValue("wid"), r.PathValue("rid")
	ns := types.Namespace(r.URL.Query().Get("namespace"))
	if ns == "" {
		ns = types.DefaultNamespace
	}
	err := s.eng.CancelWorkflow(r.Context(), ns, types.Execution{
		WorkflowID: types.WorkflowID(wid),
		RunID:      types.RunID(rid),
	})
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, nil)
}

func (s *Server) handleHistory(w http.ResponseWriter, r *http.Request) {
	wid, rid := r.PathValue("wid"), r.PathValue("rid")
	from, _ := strconv.ParseInt(r.URL.Query().Get("from"), 10, 64)
	to, _ := strconv.ParseInt(r.URL.Query().Get("to"), 10, 64)
	hist, err := s.eng.GetHistory(r.Context(), types.Execution{
		WorkflowID: types.WorkflowID(wid),
		RunID:      types.RunID(rid),
	}, from, to)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"history": hist})
}

func (s *Server) handleResult(w http.ResponseWriter, r *http.Request) {
	wid, rid := r.PathValue("wid"), r.PathValue("rid")
	ns := types.Namespace(r.URL.Query().Get("namespace"))
	if ns == "" {
		ns = types.DefaultNamespace
	}
	exec := types.Execution{WorkflowID: types.WorkflowID(wid), RunID: types.RunID(rid)}
	info, err := s.eng.DescribeWorkflow(r.Context(), ns, exec)
	if err != nil {
		writeErr(w, err)
		return
	}
	if !info.Status.IsTerminal() {
		writeJSON(w, http.StatusAccepted, map[string]any{
			"status":     info.Status,
			"terminated": false,
		})
		return
	}
	hist, _ := s.eng.GetHistory(r.Context(), exec, 0, 0)
	resp := map[string]any{"status": info.Status, "terminated": true}
	for _, ev := range hist {
		switch ev.Kind {
		case history.WorkflowCompletedKind:
			out, _ := ev.Decode()
			resp["result"] = out
		case history.WorkflowFailedKind:
			out, _ := ev.Decode()
			resp["failure"] = out
		}
	}
	writeJSON(w, http.StatusOK, resp)
}
