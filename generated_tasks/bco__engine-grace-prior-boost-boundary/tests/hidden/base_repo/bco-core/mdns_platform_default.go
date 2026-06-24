//go:build !android

package main

import (
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/p2p/discovery/mdns"
)

func newBCOMDNSService(h host.Host, notifee mdns.Notifee) mdns.Service {
	return mdns.NewMdnsService(h, mdnsServiceTag, notifee)
}
