package wasm

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/tetratelabs/wazero/api"

	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/pkg/types"
)

// ActivityState is the per-invocation state passed to activity host
// functions. Unlike WorkflowState it has output channels: the activity
// writes its result or failure via host calls, and the engine collects them
// here.
type ActivityState struct {
	Info  ActivityInfo
	Input types.Payload

	Result    types.Payload
	Failure   *types.Failure
	Heartbeats []HeartbeatPayload
	Logger    *log.Logger
}

// ActivityInfo is what the activity sees via get_info. Smaller than the
// workflow-side Info because activities do not need history-level metadata.
type ActivityInfo struct {
	Execution  types.Execution `json:"execution"`
	ActivityID types.ActivityID `json:"activity_id"`
	TaskQueue  types.TaskQueue  `json:"task_queue"`
	Attempt    int              `json:"attempt"`
	ScheduledAt time.Time       `json:"scheduled_at"`
	StartedAt   time.Time       `json:"started_at"`
}

// HeartbeatPayload is one heartbeat. Activities call heartbeat() with an
// optional details blob so long-running work can checkpoint and resume.
type HeartbeatPayload struct {
	At      time.Time `json:"at"`
	Details []byte    `json:"details,omitempty"`
}

// RegisterActivity registers the activity host functions against state.
func (r *Runtime) RegisterActivity(ctx context.Context, state *ActivityState) (api.Closer, error) {
	infoJSON, err := json.Marshal(state.Info)
	if err != nil {
		return nil, fmt.Errorf("marshal activity info: %w", err)
	}
	host := r.wz.NewHostModuleBuilder(HostModuleName)

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, _ api.Module) uint32 {
		return uint32(len(state.Input.Data))
	}).Export(HostReadInput + "_size")

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, m api.Module, ptr, max uint32) uint32 {
		if uint32(len(state.Input.Data)) > max {
			return 0
		}
		if err := writeBytes(m, ptr, state.Input.Data); err != nil {
			return 0
		}
		return uint32(len(state.Input.Data))
	}).Export(HostReadInput)

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, _ api.Module) uint32 {
		return uint32(len(infoJSON))
	}).Export(HostGetInfo + "_size")

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, m api.Module, ptr, max uint32) uint32 {
		if uint32(len(infoJSON)) > max {
			return 0
		}
		if err := writeBytes(m, ptr, infoJSON); err != nil {
			return 0
		}
		return uint32(len(infoJSON))
	}).Export(HostGetInfo)

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, m api.Module, ptr, length uint32) int32 {
		b, err := readBytes(m, ptr, length)
		if err != nil {
			return -1
		}
		state.Result = types.Payload{Encoding: "json/plain", Data: b}
		return 0
	}).Export(HostWriteResult)

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, m api.Module, ptr, length uint32) int32 {
		b, err := readBytes(m, ptr, length)
		if err != nil {
			return -1
		}
		var f types.Failure
		if err := json.Unmarshal(b, &f); err != nil {
			state.Failure = &types.Failure{Type: types.FailureApplication, Message: string(b)}
			return 0
		}
		state.Failure = &f
		return 0
	}).Export(HostWriteFailure)

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, m api.Module, ptr, length uint32) int32 {
		b, _ := readBytes(m, ptr, length)
		state.Heartbeats = append(state.Heartbeats, HeartbeatPayload{
			At:      time.Now().UTC(),
			Details: b,
		})
		return 0
	}).Export(HostHeartbeat)

	host.NewFunctionBuilder().WithFunc(func(ctx context.Context, m api.Module, level int32, ptr, length uint32) {
		b, err := readBytes(m, ptr, length)
		if err != nil {
			return
		}
		msg := string(b)
		switch level {
		case LogDebug:
			state.Logger.Debug(ctx, msg, "act", state.Info.ActivityID)
		case LogWarn:
			state.Logger.Warn(ctx, msg, "act", state.Info.ActivityID)
		case LogError:
			state.Logger.Error(ctx, msg, "act", state.Info.ActivityID)
		default:
			state.Logger.Info(ctx, msg, "act", state.Info.ActivityID)
		}
	}).Export(HostLog)

	mod, err := host.Instantiate(ctx)
	if err != nil {
		return nil, fmt.Errorf("instantiate activity host: %w", err)
	}
	return mod, nil
}
