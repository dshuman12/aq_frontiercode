// durabctl is the CLI for talking to a durab-server. Sub-commands are
// flat: `durabctl start ...`, `durabctl signal ...`, etc. Output is JSON
// when -json is set, human-readable otherwise.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/vishaljakhar/durab/pkg/client"
	"github.com/vishaljakhar/durab/pkg/types"
)

func main() {
	if err := run(os.Args[1:], os.Stdout, os.Stderr); err != nil {
		fmt.Fprintln(os.Stderr, "durabctl:", err)
		os.Exit(1)
	}
}

type globals struct {
	addr     string
	asJSON   bool
	ns       types.Namespace
}

func parseGlobals(args []string) (globals, []string, error) {
	g := globals{addr: getenv("DURAB_ADDR", "http://localhost:7233")}
	fs := flag.NewFlagSet("durabctl", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	fs.StringVar(&g.addr, "addr", g.addr, "server address")
	var ns string
	fs.StringVar(&ns, "namespace", "default", "namespace")
	fs.BoolVar(&g.asJSON, "json", false, "output JSON")
	if err := fs.Parse(args); err != nil {
		return g, nil, err
	}
	g.ns = types.Namespace(ns)
	return g, fs.Args(), nil
}

func run(args []string, out io.Writer, errw io.Writer) error {
	if len(args) == 0 {
		usage(errw)
		return errors.New("missing subcommand")
	}
	cmd := args[0]
	rest := args[1:]

	// Subcommands consume flags AFTER the command, but global flags can also
	// come before. Collect both halves.
	var pre []string
	for i, a := range rest {
		if !strings.HasPrefix(a, "-") {
			pre = rest[:i]
			rest = rest[i:]
			break
		}
		if i == len(rest)-1 {
			pre = rest
			rest = nil
		}
	}
	g, _, err := parseGlobals(pre)
	if err != nil {
		return err
	}
	c := client.New(g.addr)
	ctx := context.Background()

	switch cmd {
	case "start":
		return cmdStart(ctx, c, g, rest, out)
	case "describe":
		return cmdDescribe(ctx, c, g, rest, out)
	case "list":
		return cmdList(ctx, c, g, rest, out)
	case "signal":
		return cmdSignal(ctx, c, g, rest, out)
	case "cancel":
		return cmdCancel(ctx, c, g, rest, out)
	case "terminate":
		return cmdTerminate(ctx, c, g, rest, out)
	case "history":
		return cmdHistory(ctx, c, g, rest, out)
	case "replay":
		return cmdReplay(ctx, c, g, rest, out)
	case "help", "-h", "--help":
		usage(out)
		return nil
	}
	return fmt.Errorf("unknown subcommand: %s", cmd)
}

func usage(w io.Writer) {
	fmt.Fprintln(w, `durabctl - command-line client for durab

usage: durabctl [global-flags] <command> [flags] [args]

global flags:
  -addr URL        server address (default $DURAB_ADDR or http://localhost:7233)
  -namespace NAME  namespace (default "default")
  -json            print machine-readable JSON

commands:
  start       start a new workflow
  describe    show a single workflow
  list        list workflows (optionally filtered)
  signal      send a signal to a workflow
  cancel      send a cancel request to a workflow
  terminate   forcibly close a workflow
  history     dump a workflow's history
  replay      summarise a workflow's derived state from history`)
}

func cmdReplay(ctx context.Context, c *client.Client, g globals, args []string, out io.Writer) error {
	if len(args) < 2 {
		return errors.New("replay requires WORKFLOW_ID RUN_ID")
	}
	exec := types.Execution{
		WorkflowID: types.WorkflowID(args[0]),
		RunID:      types.RunID(args[1]),
	}
	hist, err := c.GetHistory(ctx, exec, 0, 0)
	if err != nil {
		return err
	}
	digest := map[string]any{
		"execution":   exec,
		"event_count": len(hist),
	}
	if len(hist) > 0 {
		digest["last_kind"] = hist[len(hist)-1].Kind
	}
	return print(g, out, digest)
}

func cmdStart(ctx context.Context, c *client.Client, g globals, args []string, out io.Writer) error {
	fs := flag.NewFlagSet("start", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	wfID := fs.String("id", "", "workflow id (required)")
	typeName := fs.String("type", "", "workflow type (required)")
	queue := fs.String("queue", "default", "task queue")
	inputFile := fs.String("input", "", "path to JSON input (- for stdin)")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *wfID == "" || *typeName == "" {
		return errors.New("start requires -id and -type")
	}
	var inputPayload types.Payload
	if *inputFile != "" {
		b, err := readMaybeStdin(*inputFile)
		if err != nil {
			return err
		}
		inputPayload = types.Payload{Encoding: "json/plain", Data: b}
	}
	exec, err := c.StartWorkflow(ctx, client.StartRequest{
		Namespace:    g.ns,
		WorkflowID:   types.WorkflowID(*wfID),
		WorkflowType: *typeName,
		TaskQueue:    types.TaskQueue(*queue),
		Input:        inputPayload,
	})
	if err != nil {
		return err
	}
	return print(g, out, exec)
}

func cmdDescribe(ctx context.Context, c *client.Client, g globals, args []string, out io.Writer) error {
	if len(args) < 2 {
		return errors.New("describe requires WORKFLOW_ID RUN_ID")
	}
	exec := types.Execution{
		WorkflowID: types.WorkflowID(args[0]),
		RunID:      types.RunID(args[1]),
	}
	info, err := c.DescribeWorkflow(ctx, g.ns, exec)
	if err != nil {
		return err
	}
	return print(g, out, info)
}

func cmdList(ctx context.Context, c *client.Client, g globals, args []string, out io.Writer) error {
	fs := flag.NewFlagSet("list", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	status := fs.String("status", "", "filter by status")
	queue := fs.String("queue", "", "filter by task queue")
	_ = fs.Parse(args)
	_ = status // currently passed via query string in v2; placeholder
	_ = queue
	return errors.New("list: not implemented in CLI; use the HTTP API directly for filters")
}

func cmdSignal(ctx context.Context, c *client.Client, g globals, args []string, out io.Writer) error {
	if len(args) < 3 {
		return errors.New("signal requires WORKFLOW_ID RUN_ID NAME [INPUT_FILE]")
	}
	exec := types.Execution{
		WorkflowID: types.WorkflowID(args[0]),
		RunID:      types.RunID(args[1]),
	}
	var p types.Payload
	if len(args) >= 4 && args[3] != "" {
		b, err := readMaybeStdin(args[3])
		if err != nil {
			return err
		}
		p = types.Payload{Encoding: "json/plain", Data: b}
	}
	return c.SignalWorkflow(ctx, g.ns, exec, args[2], p)
}

func cmdCancel(ctx context.Context, c *client.Client, g globals, args []string, out io.Writer) error {
	if len(args) < 2 {
		return errors.New("cancel requires WORKFLOW_ID RUN_ID")
	}
	exec := types.Execution{
		WorkflowID: types.WorkflowID(args[0]),
		RunID:      types.RunID(args[1]),
	}
	return c.CancelWorkflow(ctx, g.ns, exec)
}

func cmdTerminate(ctx context.Context, c *client.Client, g globals, args []string, out io.Writer) error {
	if len(args) < 2 {
		return errors.New("terminate requires WORKFLOW_ID RUN_ID [REASON]")
	}
	exec := types.Execution{
		WorkflowID: types.WorkflowID(args[0]),
		RunID:      types.RunID(args[1]),
	}
	reason := ""
	if len(args) >= 3 {
		reason = args[2]
	}
	return c.TerminateWorkflow(ctx, g.ns, exec, reason)
}

func cmdHistory(ctx context.Context, c *client.Client, g globals, args []string, out io.Writer) error {
	if len(args) < 2 {
		return errors.New("history requires WORKFLOW_ID RUN_ID")
	}
	hist, err := c.GetHistory(ctx, types.Execution{
		WorkflowID: types.WorkflowID(args[0]),
		RunID:      types.RunID(args[1]),
	}, 0, 0)
	if err != nil {
		return err
	}
	return print(g, out, hist)
}

func print(g globals, out io.Writer, v any) error {
	enc := json.NewEncoder(out)
	if !g.asJSON {
		enc.SetIndent("", "  ")
	}
	return enc.Encode(v)
}

func readMaybeStdin(path string) ([]byte, error) {
	if path == "-" {
		return io.ReadAll(os.Stdin)
	}
	return os.ReadFile(path)
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
