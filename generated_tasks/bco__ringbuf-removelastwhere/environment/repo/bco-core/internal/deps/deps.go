// Package deps holds blank imports so core networking libraries stay direct
// module dependencies (see specs/001-go-shared-core/tasks.md T001).
package deps

import (
	_ "github.com/libp2p/go-libp2p"
	_ "github.com/libp2p/go-libp2p/p2p/discovery/mdns"
	_ "github.com/libp2p/go-libp2p/p2p/protocol/ping"
	_ "github.com/libp2p/go-msgio"
)
