//go:build android

package main

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"net"
	"strings"
	"sync"

	"github.com/ipfs/go-log/v2"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/p2p/discovery/mdns"
	"github.com/libp2p/zeroconf/v2"
	ma "github.com/multiformats/go-multiaddr"
	manet "github.com/multiformats/go-multiaddr/net"
	"github.com/wlynxg/anet"
)

func init() {
	// bco-shell (Android) minSdk 31; anet uses this to pick netlink-without-bind path (Android 11+).
	anet.SetAndroidVersion(31)
}

var mdnsAndroidLog = log.Logger("bco-mdns-android")

const (
	mdnsDomain    = "local"
	dnsaddrPrefix = "dnsaddr="
)

// newBCOMDNSService returns mDNS like libp2p's mdns package but resolves interface
// addresses via github.com/wlynxg/anet. Stock Go net.InterfaceAddrs uses
// syscall.NetlinkRIB+Bind, which fails on Android 11+ with permission denied.
func newBCOMDNSService(h host.Host, notifee mdns.Notifee) mdns.Service {
	s := &androidMDNSService{
		host:        h,
		serviceName: mdnsServiceTag,
		peerName:    randomMdnsPeerName(32 + rand.Intn(32)),
		notifee:     notifee,
	}
	s.ctx, s.ctxCancel = context.WithCancel(context.Background())
	return s
}

type androidMDNSService struct {
	host        host.Host
	serviceName string
	peerName    string

	ctx       context.Context
	ctxCancel context.CancelFunc

	resolverWG sync.WaitGroup
	server     *zeroconf.Server

	notifee mdns.Notifee
}

func (s *androidMDNSService) Start() error {
	// Zeroconf defaults to net.Interfaces() when ifaces is nil/empty; that breaks on Android
	// (netlink). Use the same anet-based list for RegisterProxy and Browse.
	ifaces, err := anetMulticastIfaces()
	if err != nil {
		return err
	}
	if len(ifaces) == 0 {
		return fmt.Errorf("mDNS: no eligible network interfaces (anet)")
	}
	if err := s.startServer(ifaces); err != nil {
		return err
	}
	s.startResolver(s.ctx, ifaces)
	return nil
}

func (s *androidMDNSService) Close() error {
	s.ctxCancel()
	if s.server != nil {
		s.server.Shutdown()
	}
	s.resolverWG.Wait()
	return nil
}

func (s *androidMDNSService) getIPs(addrs []ma.Multiaddr) ([]string, error) {
	var ip4, ip6 string
	for _, addr := range addrs {
		first, _ := ma.SplitFirst(addr)
		if first == nil {
			continue
		}
		if ip4 == "" && first.Protocol().Code == ma.P_IP4 {
			ip4 = first.Value()
		} else if ip6 == "" && first.Protocol().Code == ma.P_IP6 {
			ip6 = first.Value()
		}
	}
	ips := make([]string, 0, 2)
	if ip4 != "" {
		ips = append(ips, ip4)
	}
	if ip6 != "" {
		ips = append(ips, ip6)
	}
	if len(ips) == 0 {
		return nil, errors.New("didn't find any IP addresses")
	}
	return ips, nil
}

func (s *androidMDNSService) startServer(mdnsIfaces []net.Interface) error {
	listenAddrs := s.host.Network().ListenAddresses()
	netAddrs, err := anet.InterfaceAddrs()
	if err != nil {
		return err
	}
	ifaceMaddrs := make([]ma.Multiaddr, 0, len(netAddrs))
	for _, a := range netAddrs {
		m, convErr := manet.FromNetAddr(a)
		if convErr != nil {
			continue
		}
		if manet.IsIP6LinkLocal(m) {
			continue
		}
		ifaceMaddrs = append(ifaceMaddrs, m)
	}
	interfaceAddrs, err := manet.ResolveUnspecifiedAddresses(listenAddrs, ifaceMaddrs)
	if err != nil {
		return err
	}
	addrs, err := peer.AddrInfoToP2pAddrs(&peer.AddrInfo{
		ID:    s.host.ID(),
		Addrs: interfaceAddrs,
	})
	if err != nil {
		return err
	}
	var txts []string
	for _, addr := range addrs {
		if manet.IsThinWaist(addr) {
			txts = append(txts, dnsaddrPrefix+addr.String())
		}
	}

	ips, err := s.getIPs(addrs)
	if err != nil {
		return err
	}

	server, err := zeroconf.RegisterProxy(
		s.peerName,
		s.serviceName,
		mdnsDomain,
		4001,
		s.peerName,
		ips,
		txts,
		mdnsIfaces,
	)
	if err != nil {
		return err
	}
	s.server = server
	return nil
}

func (s *androidMDNSService) startResolver(ctx context.Context, mdnsIfaces []net.Interface) {
	s.resolverWG.Add(2)
	entryChan := make(chan *zeroconf.ServiceEntry, 1000)
	go func() {
		defer s.resolverWG.Done()
		for entry := range entryChan {
			addrs := make([]ma.Multiaddr, 0, len(entry.Text))
			for _, t := range entry.Text {
				if !strings.HasPrefix(t, dnsaddrPrefix) {
					mdnsAndroidLog.Debug("missing dnsaddr prefix")
					continue
				}
				addr, err := ma.NewMultiaddr(t[len(dnsaddrPrefix):])
				if err != nil {
					mdnsAndroidLog.Debugf("failed to parse multiaddr: %s", err)
					continue
				}
				addrs = append(addrs, addr)
			}
			infos, err := peer.AddrInfosFromP2pAddrs(addrs...)
			if err != nil {
				mdnsAndroidLog.Debugf("failed to get peer info: %s", err)
				continue
			}
			for _, info := range infos {
				if info.ID == s.host.ID() {
					continue
				}
				go s.notifee.HandlePeerFound(info)
			}
		}
	}()
	go func() {
		defer s.resolverWG.Done()
		if err := zeroconf.Browse(ctx, s.serviceName, mdnsDomain, entryChan, zeroconf.SelectIfaces(mdnsIfaces)); err != nil {
			mdnsAndroidLog.Debugf("zeroconf browsing failed: %s", err)
		}
	}()
}

// anetMulticastIfaces matches zeroconf.listMulticastInterfaces but uses anet.Interfaces.
func anetMulticastIfaces() ([]net.Interface, error) {
	ifaces, err := anet.Interfaces()
	if err != nil {
		return nil, err
	}
	var withMulticast []net.Interface
	var upOnly []net.Interface
	for _, ifi := range ifaces {
		if ifi.Flags&net.FlagUp == 0 {
			continue
		}
		upOnly = append(upOnly, ifi)
		if ifi.Flags&net.FlagMulticast != 0 {
			withMulticast = append(withMulticast, ifi)
		}
	}
	if len(withMulticast) > 0 {
		return withMulticast, nil
	}
	return upOnly, nil
}

func randomMdnsPeerName(l int) string {
	const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
	s := make([]byte, 0, l)
	for i := 0; i < l; i++ {
		s = append(s, alphabet[rand.Intn(len(alphabet))])
	}
	return string(s)
}

var _ mdns.Service = (*androidMDNSService)(nil)
