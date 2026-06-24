package main

import (
	"encoding/json"
	"encoding/pem"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	libp2pcrypto "github.com/libp2p/go-libp2p/core/crypto"
)

const (
	fileIdentity        = "identity.key"
	fileAllowlist       = "allowlist.json"
	fileInstance        = "instance.id"
	fileManualPeers     = "manual_peers.json"
	fileNetworkSettings = "network_settings.json"
)

// EnsureStorageDir creates the Go-owned storage directory (0700).
func EnsureStorageDir(storagePath string) error {
	return os.MkdirAll(storagePath, 0o700)
}

// LoadOrCreateIdentityKey loads a libp2p Ed25519 private key from identity.key or creates one.
func LoadOrCreateIdentityKey(storagePath string) (libp2pcrypto.PrivKey, error) {
	if err := EnsureStorageDir(storagePath); err != nil {
		return nil, err
	}
	path := filepath.Join(storagePath, fileIdentity)
	data, err := os.ReadFile(path)
	if err == nil {
		return unmarshalIdentityPEM(data)
	}
	if !os.IsNotExist(err) {
		return nil, err
	}
	priv, _, err := libp2pcrypto.GenerateKeyPair(libp2pcrypto.Ed25519, 0)
	if err != nil {
		return nil, err
	}
	raw, err := libp2pcrypto.MarshalPrivateKey(priv)
	if err != nil {
		return nil, err
	}
	block := &pem.Block{Type: "BCO LIBP2P PRIVATE KEY", Bytes: raw}
	if err := atomicWriteFile(path, pem.EncodeToMemory(block), 0o600); err != nil {
		return nil, err
	}
	return priv, nil
}

func unmarshalIdentityPEM(pemData []byte) (libp2pcrypto.PrivKey, error) {
	block, _ := pem.Decode(pemData)
	if block == nil {
		return nil, fmt.Errorf("identity.key: invalid PEM")
	}
	return libp2pcrypto.UnmarshalPrivateKey(block.Bytes)
}

// LoadAllowlistFile reads legacy v1 allowlist.json as peer ID string -> friendly name.
func LoadAllowlistFile(storagePath string) (map[string]string, error) {
	path := filepath.Join(storagePath, fileAllowlist)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]string{}, nil
		}
		return nil, err
	}
	var m map[string]string
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, err
	}
	if m == nil {
		return map[string]string{}, nil
	}
	return m, nil
}

// LoadCRDTAllowlistFile reads allowlist.json in v2 (CRDT) or v1 (legacy) format.
// v1 files are auto-detected (no "version" key) and migrated with the file mtime.
func LoadCRDTAllowlistFile(storagePath string) (*CRDTAllowlistState, error) {
	path := filepath.Join(storagePath, fileAllowlist)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &CRDTAllowlistState{Version: 2, Entries: map[string]CRDTAllowlistEntry{}}, nil
		}
		return nil, err
	}

	// Try v2 first: has a "version" key.
	var probe struct {
		Version int `json:"version"`
	}
	if err := json.Unmarshal(data, &probe); err == nil && probe.Version >= 2 {
		var state CRDTAllowlistState
		if err := json.Unmarshal(data, &state); err != nil {
			return nil, err
		}
		if state.Entries == nil {
			state.Entries = map[string]CRDTAllowlistEntry{}
		}
		return &state, nil
	}

	// Fall back to v1: map[string]string. Migrate using file mtime as AddedAt.
	var v1 map[string]string
	if err := json.Unmarshal(data, &v1); err != nil {
		return nil, err
	}
	var ts int64
	if info, err := os.Stat(path); err == nil {
		ts = info.ModTime().UnixMilli()
	} else {
		ts = 1
	}
	entries := make(map[string]CRDTAllowlistEntry, len(v1))
	for pid, name := range v1 {
		entries[pid] = CRDTAllowlistEntry{Name: name, AddedAt: ts}
	}
	return &CRDTAllowlistState{Version: 2, Entries: entries}, nil
}

// SaveCRDTAllowlistFile atomically writes allowlist.json in v2 (CRDT) format.
func SaveCRDTAllowlistFile(storagePath string, state *CRDTAllowlistState) error {
	if err := EnsureStorageDir(storagePath); err != nil {
		return err
	}
	if state == nil {
		state = &CRDTAllowlistState{Version: 2, Entries: map[string]CRDTAllowlistEntry{}}
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	path := filepath.Join(storagePath, fileAllowlist)
	return atomicWriteFile(path, append(data, '\n'), 0o600)
}

// LoadManualPeersFile reads manual_peers.json as libp2p peer ID string → dial multiaddr
// (last successful BCOConnectPeer address per peer). Missing file yields an empty map.
func LoadManualPeersFile(storagePath string) (map[string]string, error) {
	path := filepath.Join(storagePath, fileManualPeers)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]string{}, nil
		}
		return nil, err
	}
	var m map[string]string
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, err
	}
	if m == nil {
		return map[string]string{}, nil
	}
	return m, nil
}

// SaveManualPeersFile atomically writes manual_peers.json.
func SaveManualPeersFile(storagePath string, addrs map[string]string) error {
	if err := EnsureStorageDir(storagePath); err != nil {
		return err
	}
	if addrs == nil {
		addrs = map[string]string{}
	}
	data, err := json.MarshalIndent(addrs, "", "  ")
	if err != nil {
		return err
	}
	path := filepath.Join(storagePath, fileManualPeers)
	return atomicWriteFile(path, append(data, '\n'), 0o600)
}

// SaveAllowlistFile atomically writes allowlist.json (legacy v1 format — kept for reference only).
func SaveAllowlistFile(storagePath string, names map[string]string) error {
	if err := EnsureStorageDir(storagePath); err != nil {
		return err
	}
	data, err := json.MarshalIndent(names, "", "  ")
	if err != nil {
		return err
	}
	path := filepath.Join(storagePath, fileAllowlist)
	return atomicWriteFile(path, append(data, '\n'), 0o600)
}

// LoadOrCreateInstanceID reads instance.id or creates it.
func LoadOrCreateInstanceID(storagePath string) (string, error) {
	if err := EnsureStorageDir(storagePath); err != nil {
		return "", err
	}
	path := filepath.Join(storagePath, fileInstance)
	data, err := os.ReadFile(path)
	if err == nil {
		s := strings.TrimSpace(string(data))
		if s != "" {
			return s, nil
		}
	} else if !os.IsNotExist(err) {
		return "", err
	}
	return WriteNewInstanceID(storagePath)
}

// WriteNewInstanceID writes a fresh UUID to instance.id (new session).
func WriteNewInstanceID(storagePath string) (string, error) {
	if err := EnsureStorageDir(storagePath); err != nil {
		return "", err
	}
	id := uuid.NewString()
	path := filepath.Join(storagePath, fileInstance)
	if err := atomicWriteFile(path, []byte(id+"\n"), 0o600); err != nil {
		return "", err
	}
	return id, nil
}

// LoadNetworkSettings reads network_settings.json or returns defaults.
func LoadNetworkSettings(storagePath string) (NetworkSettings, error) {
	path := filepath.Join(storagePath, fileNetworkSettings)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return DefaultNetworkSettings(), nil
		}
		return NetworkSettings{}, err
	}
	var ns NetworkSettings
	if err := json.Unmarshal(data, &ns); err != nil {
		return DefaultNetworkSettings(), nil
	}
	return ns.withDefaults(), nil
}

// SaveNetworkSettings atomically writes network_settings.json.
func SaveNetworkSettings(storagePath string, ns NetworkSettings) error {
	if err := EnsureStorageDir(storagePath); err != nil {
		return err
	}
	data, err := json.MarshalIndent(ns, "", "  ")
	if err != nil {
		return err
	}
	path := filepath.Join(storagePath, fileNetworkSettings)
	return atomicWriteFile(path, append(data, '\n'), 0o600)
}

func atomicWriteFile(path string, data []byte, perm os.FileMode) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	f, err := os.CreateTemp(dir, "."+filepath.Base(path)+".tmp-*")
	if err != nil {
		return err
	}
	tmpName := f.Name()
	cleanup := true
	defer func() {
		if cleanup {
			f.Close()
			_ = os.Remove(tmpName)
		}
	}()
	if _, err := f.Write(data); err != nil {
		return err
	}
	if err := f.Sync(); err != nil {
		return err
	}
	if err := f.Chmod(perm); err != nil {
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	cleanup = false
	return os.Rename(tmpName, path)
}
