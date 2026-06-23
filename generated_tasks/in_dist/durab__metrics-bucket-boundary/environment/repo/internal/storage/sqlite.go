package storage

import (
	"context"
	"database/sql"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	_ "modernc.org/sqlite"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)


//go:embed sqlite_schema.sql
var sqliteSchema string

type SQLite struct {
	db    *sql.DB
	clock clock.Clock
}

func OpenSQLite(path string) (*SQLite, error) {
	dsn := path
	if path != ":memory:" {
		dsn = "file:" + path + "?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(ON)"
	}
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(8)
	db.SetMaxIdleConns(4)
	if _, err := db.Exec(sqliteSchema); err != nil {
		db.Close()
		return nil, fmt.Errorf("apply schema: %w", err)
	}
	return &SQLite{db: db, clock: clock.System{}}, nil
}

func (s *SQLite) WithClock(c clock.Clock) *SQLite {
	s.clock = c
	return s
}

func (s *SQLite) Close() error { return s.db.Close() }

const timeFmt = time.RFC3339Nano

func ts(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(timeFmt)
}

func parseTime(s string) time.Time {
	if s == "" {
		return time.Time{}
	}
	t, err := time.Parse(timeFmt, s)
	if err != nil {
		return time.Time{}
	}
	return t.UTC()
}

func mustJSON(v any) []byte {
	if v == nil {
		return nil
	}
	b, _ := json.Marshal(v)
	return b
}

func fromJSON(b []byte, out any) {
	if len(b) == 0 {
		return
	}
	_ = json.Unmarshal(b, out)
}

func (s *SQLite) CreateWorkflow(ctx context.Context, w WorkflowRecord) error {
	if w.Status == "" {
		w.Status = types.WorkflowRunning
	}
	if w.StartTime.IsZero() {
		w.StartTime = s.clock.Now()
	}
	if w.Attempt == 0 {
		w.Attempt = 1
	}
	var pWF, pRun any
	if w.Parent != nil {
		pWF = string(w.Parent.WorkflowID)
		pRun = string(w.Parent.RunID)
	}
	_, err := s.db.ExecContext(ctx, `
INSERT INTO workflow_runs(namespace, workflow_id, run_id, workflow_type, task_queue, status,
    start_time, attempt, parent_wf_id, parent_run_id, search_attrs, memo)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
		string(w.Namespace), string(w.Execution.WorkflowID), string(w.Execution.RunID),
		w.WorkflowType, string(w.TaskQueue), string(w.Status),
		ts(w.StartTime), w.Attempt, pWF, pRun, mustJSON(w.SearchAttrs), mustJSON(w.Memo))
	if isPKError(err) {
		return fmt.Errorf("%w: %s", errs.AlreadyExists, w.Execution)
	}
	return err
}

func (s *SQLite) GetWorkflow(ctx context.Context, ns types.Namespace, exec types.Execution) (WorkflowRecord, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT workflow_type, task_queue, status, start_time, close_time, attempt,
       parent_wf_id, parent_run_id, search_attrs, memo
FROM workflow_runs WHERE namespace=? AND workflow_id=? AND run_id=?`,
		string(ns), string(exec.WorkflowID), string(exec.RunID))
	var (
		r         WorkflowRecord
		startStr  string
		closeStr  sql.NullString
		pwf, prun sql.NullString
		sa, memo  []byte
	)
	r.Namespace = ns
	r.Execution = exec
	err := row.Scan(&r.WorkflowType, &r.TaskQueue, &r.Status, &startStr, &closeStr,
		&r.Attempt, &pwf, &prun, &sa, &memo)
	if errors.Is(err, sql.ErrNoRows) {
		return WorkflowRecord{}, fmt.Errorf("%w: %s", errs.NotFound, exec)
	}
	if err != nil {
		return WorkflowRecord{}, err
	}
	r.StartTime = parseTime(startStr)
	if closeStr.Valid {
		r.CloseTime = parseTime(closeStr.String)
	}
	if pwf.Valid && prun.Valid {
		r.Parent = &types.Execution{WorkflowID: types.WorkflowID(pwf.String), RunID: types.RunID(prun.String)}
	}
	r.SearchAttrs = map[string]any{}
	r.Memo = map[string]any{}
	fromJSON(sa, &r.SearchAttrs)
	fromJSON(memo, &r.Memo)
	if len(r.SearchAttrs) == 0 {
		r.SearchAttrs = nil
	}
	if len(r.Memo) == 0 {
		r.Memo = nil
	}
	return r, nil
}

func (s *SQLite) UpdateWorkflowStatus(ctx context.Context, ns types.Namespace, exec types.Execution, status types.WorkflowStatus, closeAt time.Time) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var current types.WorkflowStatus
	err = tx.QueryRowContext(ctx, `SELECT status FROM workflow_runs WHERE namespace=? AND workflow_id=? AND run_id=?`,
		string(ns), string(exec.WorkflowID), string(exec.RunID)).Scan(&current)
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("%w: %s", errs.NotFound, exec)
	}
	if err != nil {
		return err
	}
	if current.IsTerminal() && current != status {
		return fmt.Errorf("%w: %s -> %s", errs.Conflict, current, status)
	}
	if status.IsTerminal() && closeAt.IsZero() {
		closeAt = s.clock.Now()
	}
	var closeStr any
	if !closeAt.IsZero() {
		closeStr = ts(closeAt)
	}
	if _, err := tx.ExecContext(ctx, `UPDATE workflow_runs SET status=?, close_time=? WHERE namespace=? AND workflow_id=? AND run_id=?`,
		string(status), closeStr, string(ns), string(exec.WorkflowID), string(exec.RunID)); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *SQLite) ListWorkflows(ctx context.Context, f WorkflowFilter) ([]WorkflowRecord, error) {
	q := `SELECT namespace, workflow_id, run_id, workflow_type, task_queue, status,
                 start_time, close_time, attempt, search_attrs, memo
          FROM workflow_runs WHERE 1=1`
	var args []any
	if f.Namespace != "" {
		q += " AND namespace=?"
		args = append(args, string(f.Namespace))
	}
	if f.TaskQueue != "" {
		q += " AND task_queue=?"
		args = append(args, string(f.TaskQueue))
	}
	if f.Status != "" {
		q += " AND status=?"
		args = append(args, string(f.Status))
	}
	if !f.After.IsZero() {
		q += " AND start_time >= ?"
		args = append(args, ts(f.After))
	}
	if !f.Before.IsZero() {
		q += " AND start_time < ?"
		args = append(args, ts(f.Before))
	}
	if f.SearchAttrKey != "" {
		q += " AND json_extract(search_attrs, ?) = ?"
		args = append(args, "$."+f.SearchAttrKey, attrAsScalar(f.SearchAttrValue))
	}
	q += " ORDER BY start_time DESC"
	if f.Limit > 0 {
		q += fmt.Sprintf(" LIMIT %d", f.Limit)
	}
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []WorkflowRecord
	for rows.Next() {
		var (
			r        WorkflowRecord
			ns       string
			wf, run  string
			startStr string
			closeStr sql.NullString
			sa, memo []byte
		)
		if err := rows.Scan(&ns, &wf, &run, &r.WorkflowType, &r.TaskQueue, &r.Status,
			&startStr, &closeStr, &r.Attempt, &sa, &memo); err != nil {
			return nil, err
		}
		r.Namespace = types.Namespace(ns)
		r.Execution = types.Execution{WorkflowID: types.WorkflowID(wf), RunID: types.RunID(run)}
		r.StartTime = parseTime(startStr)
		if closeStr.Valid {
			r.CloseTime = parseTime(closeStr.String)
		}
		r.SearchAttrs = map[string]any{}
		r.Memo = map[string]any{}
		fromJSON(sa, &r.SearchAttrs)
		fromJSON(memo, &r.Memo)
		if len(r.SearchAttrs) == 0 {
			r.SearchAttrs = nil
		}
		if len(r.Memo) == 0 {
			r.Memo = nil
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *SQLite) AppendEvents(ctx context.Context, exec types.Execution, events []history.Event) ([]history.Event, error) {
	if len(events) == 0 {
		return nil, nil
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var ns string
	if err := tx.QueryRowContext(ctx, `SELECT namespace FROM workflow_runs WHERE workflow_id=? AND run_id=?`,
		string(exec.WorkflowID), string(exec.RunID)).Scan(&ns); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			ns = string(types.DefaultNamespace)
		} else {
			return nil, err
		}
	}

	var lastID int64
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(MAX(event_id),0) FROM history_events WHERE namespace=? AND workflow_id=? AND run_id=?`,
		ns, string(exec.WorkflowID), string(exec.RunID)).Scan(&lastID); err != nil {
		return nil, err
	}

	stmt, err := tx.PrepareContext(ctx, `
INSERT INTO history_events(namespace, workflow_id, run_id, event_id, kind, time, attempt, attrs)
VALUES (?,?,?,?,?,?,?,?)`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()
	now := s.clock.Now()
	out := make([]history.Event, len(events))
	for i, e := range events {
		lastID++
		e.ID = history.EventID(lastID)
		if e.Time.IsZero() {
			e.Time = now
		}
		e.Workflow = exec
		e.Namespace = types.Namespace(ns)
		if _, err := stmt.ExecContext(ctx, ns, string(exec.WorkflowID), string(exec.RunID),
			int64(e.ID), string(e.Kind), ts(e.Time), e.Attempt, []byte(e.Attrs)); err != nil {
			return nil, err
		}
		out[i] = e
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *SQLite) GetHistory(ctx context.Context, exec types.Execution, fromID, toID history.EventID) ([]history.Event, error) {
	q := `SELECT namespace, event_id, kind, time, attempt, attrs
          FROM history_events WHERE workflow_id=? AND run_id=?`
	args := []any{string(exec.WorkflowID), string(exec.RunID)}
	if fromID > 0 {
		q += " AND event_id >= ?"
		args = append(args, int64(fromID))
	}
	if toID > 0 {
		q += " AND event_id <= ?"
		args = append(args, int64(toID))
	}
	q += " ORDER BY event_id ASC"
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []history.Event
	for rows.Next() {
		var (
			ns      string
			id      int64
			kind    string
			timeStr string
			attempt int
			attrs   []byte
		)
		if err := rows.Scan(&ns, &id, &kind, &timeStr, &attempt, &attrs); err != nil {
			return nil, err
		}
		out = append(out, history.Event{
			ID:        history.EventID(id),
			Kind:      history.Kind(kind),
			Time:      parseTime(timeStr),
			Namespace: types.Namespace(ns),
			Workflow:  exec,
			Attempt:   attempt,
			Attrs:     attrs,
		})
	}
	return out, rows.Err()
}

func (s *SQLite) LastEventID(ctx context.Context, exec types.Execution) (history.EventID, error) {
	var id sql.NullInt64
	if err := s.db.QueryRowContext(ctx,
		`SELECT MAX(event_id) FROM history_events WHERE workflow_id=? AND run_id=?`,
		string(exec.WorkflowID), string(exec.RunID)).Scan(&id); err != nil {
		return 0, err
	}
	if !id.Valid {
		return 0, nil
	}
	return history.EventID(id.Int64), nil
}

func (s *SQLite) EnqueueTask(ctx context.Context, t Task) (int64, error) {
	if t.VisibleAt.IsZero() {
		t.VisibleAt = s.clock.Now()
	}
	if t.Namespace == "" {
		t.Namespace = types.DefaultNamespace
	}
	res, err := s.db.ExecContext(ctx, `
INSERT INTO tasks(kind, namespace, task_queue, workflow_id, run_id, activity_id, event_id, visible_at)
VALUES (?,?,?,?,?,?,?,?)`,
		string(t.Kind), string(t.Namespace), string(t.TaskQueue),
		string(t.Execution.WorkflowID), string(t.Execution.RunID),
		int64(t.ActivityID), int64(t.EventID), ts(t.VisibleAt))
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *SQLite) DequeueTask(ctx context.Context, kind TaskKind, queue types.TaskQueue, workerID string, lease time.Duration) (Task, bool, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Task{}, false, err
	}
	defer tx.Rollback()
	now := s.clock.Now()
	row := tx.QueryRowContext(ctx, `
SELECT id, kind, namespace, task_queue, workflow_id, run_id, activity_id, event_id,
       visible_at, attempts
FROM tasks
WHERE kind=? AND task_queue=? AND completed=0
  AND visible_at <= ?
  AND (leased_until IS NULL OR leased_until < ?)
ORDER BY visible_at ASC
LIMIT 1`,
		string(kind), string(queue), ts(now), ts(now))
	var (
		t           Task
		visStr      string
		ns, wf, run string
	)
	err = row.Scan(&t.ID, &t.Kind, &ns, &t.TaskQueue, &wf, &run, &t.ActivityID, &t.EventID, &visStr, &t.Attempts)
	if errors.Is(err, sql.ErrNoRows) {
		return Task{}, false, nil
	}
	if err != nil {
		return Task{}, false, err
	}
	t.Namespace = types.Namespace(ns)
	t.Execution = types.Execution{WorkflowID: types.WorkflowID(wf), RunID: types.RunID(run)}
	t.VisibleAt = parseTime(visStr)
	leaseEnd := now.Add(lease)
	if _, err := tx.ExecContext(ctx, `UPDATE tasks SET leased_until=?, worker_id=?, attempts=attempts+1 WHERE id=?`,
		ts(leaseEnd), workerID, t.ID); err != nil {
		return Task{}, false, err
	}
	t.Attempts++
	if err := tx.Commit(); err != nil {
		return Task{}, false, err
	}
	return t, true, nil
}

func (s *SQLite) CompleteTask(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `UPDATE tasks SET completed=1, leased_until=NULL WHERE id=?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("%w: task %d", errs.NotFound, id)
	}
	return nil
}

func (s *SQLite) PendingTasks(ctx context.Context, kind TaskKind, queue types.TaskQueue) (int, error) {
	q := `SELECT COUNT(*) FROM tasks WHERE completed=0`
	var args []any
	if kind != "" {
		q += " AND kind=?"
		args = append(args, string(kind))
	}
	if queue != "" {
		q += " AND task_queue=?"
		args = append(args, string(queue))
	}
	var n int
	if err := s.db.QueryRowContext(ctx, q, args...).Scan(&n); err != nil {
		return 0, err
	}
	return n, nil
}

func (s *SQLite) NackTask(ctx context.Context, id int64, retryAfter time.Duration) error {
	visAt := s.clock.Now().Add(retryAfter)
	res, err := s.db.ExecContext(ctx,
		`UPDATE tasks SET leased_until=NULL, visible_at=? WHERE id=? AND completed=0`,
		ts(visAt), id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("%w: task %d", errs.NotFound, id)
	}
	return nil
}

func (s *SQLite) ScheduleTimer(ctx context.Context, exec types.Execution, timerID string, fireAt time.Time) error {
	ns := types.DefaultNamespace
	if err := s.db.QueryRowContext(ctx, `SELECT namespace FROM workflow_runs WHERE workflow_id=? AND run_id=?`,
		string(exec.WorkflowID), string(exec.RunID)).Scan(&ns); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO timers(namespace, workflow_id, run_id, timer_id, fire_at) VALUES (?,?,?,?,?)`,
		string(ns), string(exec.WorkflowID), string(exec.RunID), timerID, ts(fireAt))
	if isPKError(err) {
		return fmt.Errorf("%w: timer %s/%s", errs.AlreadyExists, exec, timerID)
	}
	return err
}

func (s *SQLite) DueTimers(ctx context.Context, now time.Time, limit int) ([]DueTimer, error) {
	q := `SELECT namespace, workflow_id, run_id, timer_id, fire_at FROM timers WHERE fire_at <= ? ORDER BY fire_at ASC`
	if limit > 0 {
		q += fmt.Sprintf(" LIMIT %d", limit)
	}
	rows, err := s.db.QueryContext(ctx, q, ts(now))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DueTimer
	for rows.Next() {
		var ns, wf, run, tid, fa string
		if err := rows.Scan(&ns, &wf, &run, &tid, &fa); err != nil {
			return nil, err
		}
		out = append(out, DueTimer{
			Namespace: types.Namespace(ns),
			Execution: types.Execution{WorkflowID: types.WorkflowID(wf), RunID: types.RunID(run)},
			TimerID:   tid,
			FireAt:    parseTime(fa),
		})
	}
	return out, rows.Err()
}

func (s *SQLite) DeleteTimer(ctx context.Context, exec types.Execution, timerID string) error {
	res, err := s.db.ExecContext(ctx,
		`DELETE FROM timers WHERE workflow_id=? AND run_id=? AND timer_id=?`,
		string(exec.WorkflowID), string(exec.RunID), timerID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("%w: timer %s/%s", errs.NotFound, exec, timerID)
	}
	return nil
}

func isPKError(err error) bool {
	if err == nil {
		return false
	}
	s := err.Error()
	return strings.Contains(s, "UNIQUE") ||
		strings.Contains(s, "PRIMARY KEY") ||
		strings.Contains(s, "constraint")
}

func attrAsScalar(v any) any {
	switch x := v.(type) {
	case string, int, int64, float64, bool, nil:
		return x
	}
	b, _ := json.Marshal(v)
	return string(b)
}

var _ Store = (*SQLite)(nil)
