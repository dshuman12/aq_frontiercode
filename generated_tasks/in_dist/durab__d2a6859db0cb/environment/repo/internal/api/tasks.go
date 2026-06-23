package api

import (
	"net/http"
	"time"

	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/pkg/types"
)

type pollReq struct {
	TaskQueue types.TaskQueue `json:"task_queue"`
	WorkerID  string          `json:"worker_id"`
	LeaseSec  int             `json:"lease_seconds,omitempty"`
}

type decisionPollResp struct {
	Task   *engine.DecisionTask `json:"task,omitempty"`
	Idle   bool                 `json:"idle"`
}

type activityPollResp struct {
	Task *engine.ActivityTask `json:"task,omitempty"`
	Idle bool                 `json:"idle"`
}

func (s *Server) handleDecisionPoll(w http.ResponseWriter, r *http.Request) {
	var req pollReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, err)
		return
	}
	lease := time.Duration(req.LeaseSec) * time.Second
	if lease == 0 {
		lease = 30 * time.Second
	}
	t, ok, err := s.eng.PollDecisionTask(r.Context(), req.TaskQueue, req.WorkerID, lease)
	if err != nil {
		writeErr(w, err)
		return
	}
	if !ok {
		writeJSON(w, http.StatusOK, decisionPollResp{Idle: true})
		return
	}
	writeJSON(w, http.StatusOK, decisionPollResp{Task: &t})
}

type decisionCompleteReq struct {
	TaskID    int64                 `json:"task_id"`
	Execution types.Execution       `json:"execution"`
	Decisions []decision.Decision   `json:"decisions"`
}

func (s *Server) handleDecisionComplete(w http.ResponseWriter, r *http.Request) {
	var req decisionCompleteReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, err)
		return
	}
	if err := s.eng.CompleteDecisionTask(r.Context(), req.TaskID, req.Execution, req.Decisions); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusNoContent, nil)
}

func (s *Server) handleActivityPoll(w http.ResponseWriter, r *http.Request) {
	var req pollReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, err)
		return
	}
	lease := time.Duration(req.LeaseSec) * time.Second
	if lease == 0 {
		lease = 30 * time.Second
	}
	t, ok, err := s.eng.PollActivityTask(r.Context(), req.TaskQueue, req.WorkerID, lease)
	if err != nil {
		writeErr(w, err)
		return
	}
	if !ok {
		writeJSON(w, http.StatusOK, activityPollResp{Idle: true})
		return
	}
	writeJSON(w, http.StatusOK, activityPollResp{Task: &t})
}

type activityCompleteReq struct {
	TaskID     int64           `json:"task_id"`
	Execution  types.Execution `json:"execution"`
	ActivityID types.ActivityID `json:"activity_id"`
	Result     types.Payload   `json:"result,omitempty"`
	Failure    *types.Failure  `json:"failure,omitempty"`
}

func (s *Server) handleActivityComplete(w http.ResponseWriter, r *http.Request) {
	var req activityCompleteReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, err)
		return
	}
	if err := s.eng.CompleteActivityTask(r.Context(), req.TaskID, req.Execution, req.ActivityID, req.Result, req.Failure); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusNoContent, nil)
}
