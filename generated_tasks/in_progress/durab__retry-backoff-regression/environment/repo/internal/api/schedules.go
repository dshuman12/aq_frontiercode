package api

import (
	"net/http"

	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/pkg/types"
)

type scheduleReq struct {
	ID           string           `json:"id"`
	Spec         string           `json:"spec"`
	WorkflowID   types.WorkflowID `json:"workflow_id"`
	WorkflowType string           `json:"workflow_type"`
	TaskQueue    types.TaskQueue  `json:"task_queue"`
	Input        types.Payload    `json:"input,omitempty"`
	Memo         map[string]any   `json:"memo,omitempty"`
}

func (s *Server) handleCreateSchedule(w http.ResponseWriter, r *http.Request) {
	ns := types.Namespace(r.URL.Query().Get("namespace"))
	var req scheduleReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, err)
		return
	}
	if err := s.eng.CreateSchedule(r.Context(), engine.CreateScheduleRequest{
		ID:           req.ID,
		Namespace:    ns,
		Spec:         req.Spec,
		WorkflowID:   req.WorkflowID,
		WorkflowType: req.WorkflowType,
		TaskQueue:    req.TaskQueue,
		Input:        req.Input,
		Memo:         req.Memo,
	}); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": req.ID})
}

func (s *Server) handleDeleteSchedule(w http.ResponseWriter, r *http.Request) {
	ns := types.Namespace(r.URL.Query().Get("namespace"))
	id := r.PathValue("id")
	if err := s.eng.DeleteSchedule(r.Context(), ns, id); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusNoContent, nil)
}

func (s *Server) handlePauseSchedule(w http.ResponseWriter, r *http.Request) {
	ns := types.Namespace(r.URL.Query().Get("namespace"))
	id := r.PathValue("id")
	pause := r.URL.Query().Get("paused") != "false"
	if err := s.eng.PauseSchedule(r.Context(), ns, id, pause); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, nil)
}

func (s *Server) handleListSchedules(w http.ResponseWriter, r *http.Request) {
	ns := types.Namespace(r.URL.Query().Get("namespace"))
	out, err := s.eng.ListSchedules(r.Context(), ns)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"schedules": out})
}
