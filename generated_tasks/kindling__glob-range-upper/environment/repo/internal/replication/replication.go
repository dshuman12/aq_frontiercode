// Package replication holds the replication-adapter abstraction.
package replication

import (
	"errors"
	"fmt"
	"strings"
)

// Replicator pushes / pulls a manifest archive.
type Replicator interface {
	Name() string
	Push(local, remote string) error
	Pull(remote, local string) error
}

// Build returns the named adapter.
func Build(name string) (Replicator, error) {
	switch name {
	case "rsync":
		return &Rsync{}, nil
	case "scp":
		return &Scp{}, nil
	case "http":
		return &HTTP{}, nil
	}
	return nil, fmt.Errorf("replication: unknown adapter %q", name)
}

// Rsync is the rsync-over-ssh adapter.
type Rsync struct{}

// Name returns "rsync".
func (Rsync) Name() string { return "rsync" }

// Push validates inputs and reports the would-run plan.
func (Rsync) Push(local, remote string) error {
	if local == "" {
		return errors.New("rsync: local is empty")
	}
	if !strings.Contains(remote, ":") {
		return fmt.Errorf("rsync: remote must be host:path, got %q", remote)
	}
	return nil
}

// Pull validates the remote.
func (Rsync) Pull(remote, local string) error {
	if !strings.Contains(remote, ":") {
		return fmt.Errorf("rsync: remote must be host:path, got %q", remote)
	}
	if local == "" {
		return errors.New("rsync: local is empty")
	}
	return nil
}

// Scp is the SCP adapter.
type Scp struct{}

// Name returns "scp".
func (Scp) Name() string { return "scp" }

// Push validates inputs.
func (Scp) Push(local, remote string) error {
	if local == "" {
		return errors.New("scp: local is empty")
	}
	if !strings.Contains(remote, ":") {
		return fmt.Errorf("scp: remote must be host:path, got %q", remote)
	}
	return nil
}

// Pull validates the remote.
func (Scp) Pull(remote, local string) error {
	if !strings.Contains(remote, ":") {
		return fmt.Errorf("scp: remote must be host:path, got %q", remote)
	}
	if local == "" {
		return errors.New("scp: local is empty")
	}
	return nil
}

// HTTP is the HTTPS POST adapter.
type HTTP struct{}

// Name returns "http".
func (HTTP) Name() string { return "http" }

// Push validates inputs.
func (HTTP) Push(local, remote string) error {
	if local == "" {
		return errors.New("http: local is empty")
	}
	if !strings.HasPrefix(remote, "https://") {
		return errors.New("http: remote must use https://")
	}
	return nil
}

// Pull validates the remote.
func (HTTP) Pull(remote, local string) error {
	if !strings.HasPrefix(remote, "https://") {
		return errors.New("http: remote must use https://")
	}
	if local == "" {
		return errors.New("http: local is empty")
	}
	return nil
}
