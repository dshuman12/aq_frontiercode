package wasm

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"math/rand/v2"
	"time"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"

	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/pkg/types"
)

// WorkflowState is the per-tick state passed to host functions. It is
// constructed by the engine before each tick and discarded after.
//
// Determinism: every read goes through this state, and every read is a
// pure function of fields the engine sets. RNG is seeded from the run ID +
// the history length so replays produce the same sequence.
type WorkflowState struct {
	Info       types.Info
	Input      types.Payload
	HistoryRaw []byte // pre-serialised history events as a JSON array
	Now        time.Time
	Seed       uint64

	// Filled in by the runtime as the tick runs.
	Decisions []decision.Decision
	Logger    *log.Logger

	// rng is created lazily on first random() call.
	rng *rand.Rand
}

// NewWorkflowState constructs the state for a single tick. evs are the
// events visible to the workflow at the start of this tick; they are
// marshalled once here and served to the guest verbatim.
func NewWorkflowState(info types.Info, input types.Payload, evs []history.Event, now time.Time) (*WorkflowState, error) {
	raw, err := json.Marshal(evs)
	if err != nil {
		return nil, fmt.Errorf("marshal history: %w", err)
	}
	h := fnv.New64a()
	h.Write([]byte(info.Execution.String()))
	seed := h.Sum64()
	seed ^= uint64(len(evs))
	return &WorkflowState{
		Info:       info,
		Input:      input,
		HistoryRaw: raw,
		Now:        now,
		Seed:       seed,
		Logger:     log.Default,
	}, nil
}

func (s *WorkflowState) random() uint64 {
	if s.rng == nil {
		s.rng = rand.New(rand.NewPCG(s.Seed, s.Seed^0x9E3779B97F4A7C15))
	}
	return s.rng.Uint64()
}

// RegisterWorkflow binds the workflow host functions on the runtime against
// state. The returned closer must be invoked after the tick to release the
// instantiated host module.
func (r *Runtime) RegisterWorkflow(ctx context.Context, state *WorkflowState) (api.Closer, error) {
	infoJSON, err := json.Marshal(state.Info)
	if err != nil {
		return nil, fmt.Errorf("marshal info: %w", err)
	}
	host := r.wz.NewHostModuleBuilder(HostModuleName)

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, _ api.Module) uint32 {
		return uint32(len(state.HistoryRaw))
	}).Export(HostReadHistory + "_size")

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, m api.Module, ptr, max uint32) uint32 {
		n := uint32(len(state.HistoryRaw))
		if n > max {
			return 0
		}
		if err := writeBytes(m, ptr, state.HistoryRaw); err != nil {
			return 0
		}
		return n
	}).Export(HostReadHistory)

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, _ api.Module) uint32 {
		return uint32(len(state.Input.Data))
	}).Export(HostGetInput + "_size")

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, m api.Module, ptr, max uint32) uint32 {
		if uint32(len(state.Input.Data)) > max {
			return 0
		}
		if err := writeBytes(m, ptr, state.Input.Data); err != nil {
			return 0
		}
		return uint32(len(state.Input.Data))
	}).Export(HostGetInput)

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
		var ds []decision.Decision
		if err := json.Unmarshal(b, &ds); err != nil {
			return -2
		}
		state.Decisions = append(state.Decisions, ds...)
		return 0
	}).Export(HostEmitDecisions)

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, _ api.Module) uint64 {
		return uint64(state.Now.UnixMilli())
	}).Export(HostNow)

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, _ api.Module) uint64 {
		return state.random()
	}).Export(HostRandom)

	host.NewFunctionBuilder().WithFunc(func(_ context.Context, m api.Module, ptr uint32) int32 {
		var b [16]byte
		v := state.random()
		binary.BigEndian.PutUint64(b[0:8], v)
		v = state.random()
		binary.BigEndian.PutUint64(b[8:16], v)
		b[6] = (b[6] & 0x0F) | 0x40 // version 4
		b[8] = (b[8] & 0x3F) | 0x80 // variant 1
		s := formatUUID(b)
		if err := writeBytes(m, ptr, []byte(s)); err != nil {
			return -1
		}
		return 0
	}).Export(HostNewUUID)

	host.NewFunctionBuilder().WithFunc(func(ctx context.Context, m api.Module, level int32, ptr, length uint32) {
		b, err := readBytes(m, ptr, length)
		if err != nil {
			return
		}
		msg := string(b)
		switch level {
		case LogDebug:
			state.Logger.Debug(ctx, msg, "wf", state.Info.Execution.String())
		case LogWarn:
			state.Logger.Warn(ctx, msg, "wf", state.Info.Execution.String())
		case LogError:
			state.Logger.Error(ctx, msg, "wf", state.Info.Execution.String())
		default:
			state.Logger.Info(ctx, msg, "wf", state.Info.Execution.String())
		}
	}).Export(HostLog)

	mod, err := host.Instantiate(ctx)
	if err != nil {
		return nil, fmt.Errorf("instantiate host module: %w", err)
	}
	return mod, nil
}

// formatUUID renders b as "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" lower case.
func formatUUID(b [16]byte) string {
	const hex = "0123456789abcdef"
	var out [36]byte
	idx := 0
	for i, by := range b {
		if i == 4 || i == 6 || i == 8 || i == 10 {
			out[idx] = '-'
			idx++
		}
		out[idx] = hex[by>>4]
		out[idx+1] = hex[by&0x0F]
		idx += 2
	}
	return string(out[:])
}

// _ ensures wazero.NewModuleConfig exists at compile time; some IDE
// integrations strip the import otherwise.
var _ = wazero.NewModuleConfig
