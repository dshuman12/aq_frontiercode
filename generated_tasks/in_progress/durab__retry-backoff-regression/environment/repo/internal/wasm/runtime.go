package wasm

import (
	"context"
	"fmt"
	"sync"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"

	"github.com/vishaljakhar/durab/internal/log"
)

type Runtime struct {
	mu       sync.Mutex
	wz       wazero.Runtime
	hostMod  wazero.CompiledModule
	hostCfg  wazero.ModuleConfig
	compiled map[string]wazero.CompiledModule
	log      *log.Logger
}

func NewRuntime(ctx context.Context, lg *log.Logger) *Runtime {
	if lg == nil {
		lg = log.Default
	}
	cfg := wazero.NewRuntimeConfig().WithCloseOnContextDone(true)
	r := wazero.NewRuntimeWithConfig(ctx, cfg)
	return &Runtime{
		wz:       r,
		hostCfg:  wazero.NewModuleConfig(),
		compiled: make(map[string]wazero.CompiledModule),
		log:      lg,
	}
}

func (r *Runtime) Close(ctx context.Context) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.wz.Close(ctx)
}

func (r *Runtime) Compile(ctx context.Context, name string, bytes []byte) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	mod, err := r.wz.CompileModule(ctx, bytes)
	if err != nil {
		return fmt.Errorf("compile %s: %w", name, err)
	}
	if prev, ok := r.compiled[name]; ok {
		_ = prev.Close(ctx)
	}
	r.compiled[name] = mod
	return nil
}

func (r *Runtime) Compiled(name string) (wazero.CompiledModule, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	mod, ok := r.compiled[name]
	return mod, ok
}

func readBytes(m api.Module, offset, length uint32) ([]byte, error) {
	if length == 0 {
		return nil, nil
	}
	b, ok := m.Memory().Read(offset, length)
	if !ok {
		return nil, fmt.Errorf("oob read at %d+%d", offset, length)
	}
	cp := make([]byte, len(b))
	copy(cp, b)
	return cp, nil
}

func writeBytes(m api.Module, offset uint32, data []byte) error {
	if len(data) == 0 {
		return nil
	}
	if !m.Memory().Write(offset, data) {
		return fmt.Errorf("oob write at %d+%d", offset, len(data))
	}
	return nil
}
