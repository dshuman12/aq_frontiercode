package cli

import (
	"fmt"
	"sort"
	"strings"

	"github.com/manojgowda/lattice/pkg/types"
	"github.com/spf13/cobra"
)

// listFlags are flags for `lattice list`.
type listFlags struct {
	long bool
	deps bool
}

func newListCommand(state *rootState) *cobra.Command {
	flags := &listFlags{}

	cmd := &cobra.Command{
		Use:   "list",
		Short: "Print all tasks defined in the project",
		Long: `List shows every task in the configuration. With --long, includes
descriptions, declared inputs/outputs, and timeout. With --deps, prints
each task's direct dependencies indented under its line.`,
		Aliases: []string{"ls"},
		RunE: func(cmd *cobra.Command, args []string) error {
			return runList(state, flags)
		},
	}
	cmd.Flags().BoolVar(&flags.long, "long", false, "long-form listing with descriptions and globs")
	cmd.Flags().BoolVar(&flags.deps, "deps", false, "show direct dependencies")
	return cmd
}

func runList(state *rootState, flags *listFlags) error {
	project, err := loadProject(state)
	if err != nil {
		return err
	}

	if state.jsonOutput {
		return emitJSON(state.stdout, listEntriesFromProject(project))
	}

	names := make([]string, 0, len(project.Tasks))
	for name := range project.Tasks {
		names = append(names, name)
	}
	sort.Strings(names)

	for _, name := range names {
		task := project.Tasks[name]
		printTaskLine(state, task, flags)
	}
	return nil
}

func printTaskLine(state *rootState, task *types.Task, flags *listFlags) {
	desc := task.Description
	if desc == "" && !flags.long {
		desc = task.Command
		if len(desc) > 60 {
			desc = desc[:60] + "…"
		}
	}
	fmt.Fprintf(state.stdout, "  %-22s %s\n", task.Name, strings.TrimSpace(strings.SplitN(desc, "\n", 2)[0]))

	if flags.long {
		if task.Description != "" && task.Command != "" {
			fmt.Fprintf(state.stdout, "    %s\n", strings.TrimSpace(task.Command))
		}
		if len(task.Inputs) > 0 {
			fmt.Fprintf(state.stdout, "    inputs:  %s\n", strings.Join(task.Inputs, ", "))
		}
		if len(task.Outputs) > 0 {
			fmt.Fprintf(state.stdout, "    outputs: %s\n", strings.Join(task.Outputs, ", "))
		}
		if task.Timeout > 0 {
			fmt.Fprintf(state.stdout, "    timeout: %s\n", task.Timeout)
		}
	}
	if flags.deps && len(task.Deps) > 0 {
		fmt.Fprintf(state.stdout, "    deps:    %s\n", strings.Join(task.Deps, ", "))
	}
}

// listEntry is the JSON-output shape for `lattice list --json`.
type listEntry struct {
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	Command     string   `json:"command,omitempty"`
	Deps        []string `json:"deps,omitempty"`
	Inputs      []string `json:"inputs,omitempty"`
	Outputs     []string `json:"outputs,omitempty"`
	TimeoutMS   int64    `json:"timeout_ms,omitempty"`
}

func listEntriesFromProject(project *types.Project) []listEntry {
	out := make([]listEntry, 0, len(project.Tasks))
	for _, t := range project.Tasks {
		out = append(out, listEntry{
			Name:        t.Name,
			Description: t.Description,
			Command:     t.Command,
			Deps:        t.Deps,
			Inputs:      t.Inputs,
			Outputs:     t.Outputs,
			TimeoutMS:   t.Timeout.Milliseconds(),
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}
