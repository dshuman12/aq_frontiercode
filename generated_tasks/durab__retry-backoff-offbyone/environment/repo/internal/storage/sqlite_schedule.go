package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/pkg/types"
)

const schedulesDDL = `
CREATE TABLE IF NOT EXISTS schedules (
    namespace      TEXT NOT NULL,
    id             TEXT NOT NULL,
    spec           TEXT NOT NULL,
    workflow_id    TEXT NOT NULL,
    workflow_type  TEXT NOT NULL,
    task_queue     TEXT NOT NULL,
    input          BLOB,
    memo           BLOB,
    created        TEXT NOT NULL,
    next_run       TEXT,
    last_run       TEXT,
    paused         INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (namespace, id)
);
CREATE INDEX IF NOT EXISTS idx_schedules_due ON schedules(paused, next_run);
`

func (s *SQLite) ensureSchedules(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, schedulesDDL)
	return err
}

func (s *SQLite) CreateSchedule(ctx context.Context, sc Schedule) error {
	if err := s.ensureSchedules(ctx); err != nil {
		return err
	}
	if sc.Namespace == "" {
		sc.Namespace = types.DefaultNamespace
	}
	if sc.Created.IsZero() {
		sc.Created = s.clock.Now()
	}
	_, err := s.db.ExecContext(ctx, `
INSERT INTO schedules(namespace, id, spec, workflow_id, workflow_type, task_queue,
    input, memo, created, next_run, last_run, paused)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
		string(sc.Namespace), sc.ID, sc.Spec, string(sc.WorkflowID), sc.WorkflowType,
		string(sc.TaskQueue), mustJSON(sc.Input), mustJSON(sc.Memo),
		ts(sc.Created), tsOrNil(sc.NextRun), tsOrNil(sc.LastRun), boolToInt(sc.Paused))
	if isPKError(err) {
		return fmt.Errorf("%w: schedule %s", errs.AlreadyExists, sc.ID)
	}
	return err
}

func tsOrNil(t time.Time) any {
	if t.IsZero() {
		return nil
	}
	return ts(t)
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func (s *SQLite) GetSchedule(ctx context.Context, ns types.Namespace, id string) (Schedule, error) {
	if err := s.ensureSchedules(ctx); err != nil {
		return Schedule{}, err
	}
	if ns == "" {
		ns = types.DefaultNamespace
	}
	row := s.db.QueryRowContext(ctx, `
SELECT spec, workflow_id, workflow_type, task_queue, input, memo,
       created, next_run, last_run, paused
FROM schedules WHERE namespace=? AND id=?`, string(ns), id)
	return scanSchedule(ns, id, row)
}

func scanSchedule(ns types.Namespace, id string, row interface {
	Scan(dest ...any) error
}) (Schedule, error) {
	var (
		sc      Schedule
		input   []byte
		memo    []byte
		created string
		nextRun sql.NullString
		lastRun sql.NullString
		paused  int
	)
	sc.Namespace = ns
	sc.ID = id
	err := row.Scan(&sc.Spec, &sc.WorkflowID, &sc.WorkflowType, &sc.TaskQueue,
		&input, &memo, &created, &nextRun, &lastRun, &paused)
	if errors.Is(err, sql.ErrNoRows) {
		return Schedule{}, fmt.Errorf("%w: schedule %s", errs.NotFound, id)
	}
	if err != nil {
		return Schedule{}, err
	}
	fromJSON(input, &sc.Input)
	sc.Memo = map[string]any{}
	fromJSON(memo, &sc.Memo)
	if len(sc.Memo) == 0 {
		sc.Memo = nil
	}
	sc.Created = parseTime(created)
	if nextRun.Valid {
		sc.NextRun = parseTime(nextRun.String)
	}
	if lastRun.Valid {
		sc.LastRun = parseTime(lastRun.String)
	}
	sc.Paused = paused != 0
	return sc, nil
}

func (s *SQLite) DeleteSchedule(ctx context.Context, ns types.Namespace, id string) error {
	if err := s.ensureSchedules(ctx); err != nil {
		return err
	}
	if ns == "" {
		ns = types.DefaultNamespace
	}
	res, err := s.db.ExecContext(ctx, `DELETE FROM schedules WHERE namespace=? AND id=?`, string(ns), id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("%w: schedule %s", errs.NotFound, id)
	}
	return nil
}

func (s *SQLite) UpdateScheduleRun(ctx context.Context, ns types.Namespace, id string, lastRun, nextRun time.Time) error {
	if err := s.ensureSchedules(ctx); err != nil {
		return err
	}
	if ns == "" {
		ns = types.DefaultNamespace
	}
	res, err := s.db.ExecContext(ctx,
		`UPDATE schedules SET last_run=?, next_run=? WHERE namespace=? AND id=?`,
		tsOrNil(lastRun), tsOrNil(nextRun), string(ns), id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("%w: schedule %s", errs.NotFound, id)
	}
	return nil
}

func (s *SQLite) PauseSchedule(ctx context.Context, ns types.Namespace, id string, paused bool) error {
	if err := s.ensureSchedules(ctx); err != nil {
		return err
	}
	if ns == "" {
		ns = types.DefaultNamespace
	}
	res, err := s.db.ExecContext(ctx, `UPDATE schedules SET paused=? WHERE namespace=? AND id=?`,
		boolToInt(paused), string(ns), id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("%w: schedule %s", errs.NotFound, id)
	}
	return nil
}

func (s *SQLite) ListSchedules(ctx context.Context, ns types.Namespace) ([]Schedule, error) {
	if err := s.ensureSchedules(ctx); err != nil {
		return nil, err
	}
	q := `SELECT namespace, id, spec, workflow_id, workflow_type, task_queue, input, memo,
                 created, next_run, last_run, paused FROM schedules`
	var args []any
	if ns != "" {
		q += " WHERE namespace=?"
		args = append(args, string(ns))
	}
	q += " ORDER BY id ASC"
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Schedule
	for rows.Next() {
		var (
			nsStr   string
			id      string
			created string
			nextRun sql.NullString
			lastRun sql.NullString
			paused  int
			input   []byte
			memo    []byte
			sc      Schedule
		)
		if err := rows.Scan(&nsStr, &id, &sc.Spec, &sc.WorkflowID, &sc.WorkflowType, &sc.TaskQueue,
			&input, &memo, &created, &nextRun, &lastRun, &paused); err != nil {
			return nil, err
		}
		sc.Namespace = types.Namespace(nsStr)
		sc.ID = id
		fromJSON(input, &sc.Input)
		sc.Memo = map[string]any{}
		fromJSON(memo, &sc.Memo)
		if len(sc.Memo) == 0 {
			sc.Memo = nil
		}
		sc.Created = parseTime(created)
		if nextRun.Valid {
			sc.NextRun = parseTime(nextRun.String)
		}
		if lastRun.Valid {
			sc.LastRun = parseTime(lastRun.String)
		}
		sc.Paused = paused != 0
		out = append(out, sc)
	}
	return out, rows.Err()
}

func (s *SQLite) DueSchedules(ctx context.Context, now time.Time, limit int) ([]Schedule, error) {
	if err := s.ensureSchedules(ctx); err != nil {
		return nil, err
	}
	q := `SELECT namespace, id, spec, workflow_id, workflow_type, task_queue, input, memo,
                 created, next_run, last_run, paused FROM schedules
          WHERE paused=0 AND next_run IS NOT NULL AND next_run <= ?
          ORDER BY next_run ASC`
	if limit > 0 {
		q += fmt.Sprintf(" LIMIT %d", limit)
	}
	rows, err := s.db.QueryContext(ctx, q, ts(now))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Schedule
	for rows.Next() {
		var (
			nsStr   string
			id      string
			created string
			nextRun sql.NullString
			lastRun sql.NullString
			paused  int
			input   []byte
			memo    []byte
			sc      Schedule
		)
		if err := rows.Scan(&nsStr, &id, &sc.Spec, &sc.WorkflowID, &sc.WorkflowType, &sc.TaskQueue,
			&input, &memo, &created, &nextRun, &lastRun, &paused); err != nil {
			return nil, err
		}
		sc.Namespace = types.Namespace(nsStr)
		sc.ID = id
		fromJSON(input, &sc.Input)
		sc.Memo = map[string]any{}
		fromJSON(memo, &sc.Memo)
		if len(sc.Memo) == 0 {
			sc.Memo = nil
		}
		sc.Created = parseTime(created)
		if nextRun.Valid {
			sc.NextRun = parseTime(nextRun.String)
		}
		if lastRun.Valid {
			sc.LastRun = parseTime(lastRun.String)
		}
		sc.Paused = paused != 0
		out = append(out, sc)
	}
	return out, rows.Err()
}
