package wasm

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/sys"
)

func (r *Runtime) InvokeWorkflow(ctx context.Context, moduleName string, state *WorkflowState, lim Limits) error {
	mod, ok := r.Compiled(moduleName)
	if !ok {
		return fmt.Errorf("workflow module %s not compiled", moduleName)
	}

	hostCloser, err := r.RegisterWorkflow(ctx, state)
	if err != nil {
		return err
	}
	defer hostCloser.Close(ctx)

	if lim.MaxWallTime > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, lim.MaxWallTime)
		defer cancel()
	}

	cfg := wazero.NewModuleConfig().WithName("").WithStartFunctions()
	instance, err := r.wz.InstantiateModule(ctx, mod, cfg)
	if err != nil {
		return fmt.Errorf("instantiate workflow: %w", err)
	}
	defer instance.Close(ctx)

	fn := instance.ExportedFunction(WorkflowEntry)
	if fn == nil {
		return fmt.Errorf("workflow module missing export %s", WorkflowEntry)
	}
	if _, err := fn.Call(ctx); err != nil {
		var ex *sys.ExitError
		if errors.As(err, &ex) {
			if ex.ExitCode() == 0 {
				return nil
			}
			return fmt.Errorf("workflow exited with code %d", ex.ExitCode())
		}
		if ctx.Err() != nil {
			return fmt.Errorf("workflow exceeded wall time (%s): %w", lim.MaxWallTime, ctx.Err())
		}
		return fmt.Errorf("workflow trap: %w", err)
	}
	return nil
}

func (r *Runtime) InvokeActivity(ctx context.Context, moduleName string, state *ActivityState, lim Limits) error {
	mod, ok := r.Compiled(moduleName)
	if !ok {
		return fmt.Errorf("activity module %s not compiled", moduleName)
	}
	hostCloser, err := r.RegisterActivity(ctx, state)
	if err != nil {
		return err
	}
	defer hostCloser.Close(ctx)

	if lim.MaxWallTime == 0 {
		lim.MaxWallTime = 30 * time.Second
	}
	ctx, cancel := context.WithTimeout(ctx, lim.MaxWallTime)
	defer cancel()

	cfg := wazero.NewModuleConfig().WithName("").WithStartFunctions()
	instance, err := r.wz.InstantiateModule(ctx, mod, cfg)
	if err != nil {
		return fmt.Errorf("instantiate activity: %w", err)
	}
	defer instance.Close(ctx)

	fn := instance.ExportedFunction(ActivityEntry)
	if fn == nil {
		return fmt.Errorf("activity module missing export %s", ActivityEntry)
	}
	if _, err := fn.Call(ctx); err != nil {
		var ex *sys.ExitError
		if errors.As(err, &ex) {
			if ex.ExitCode() == 0 {
				return nil
			}
			return fmt.Errorf("activity exited with code %d", ex.ExitCode())
		}
		if ctx.Err() != nil {
			return fmt.Errorf("activity exceeded wall time (%s): %w", lim.MaxWallTime, ctx.Err())
		}
		return fmt.Errorf("activity trap: %w", err)
	}
	return nil
}
