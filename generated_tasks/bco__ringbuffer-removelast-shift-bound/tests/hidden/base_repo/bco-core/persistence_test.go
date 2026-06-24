package main

import (
	"encoding/pem"
	"os"
	"path/filepath"
	"strings"
	"testing"

	libp2pcrypto "github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
)

func TestEnsureStorageDir(t *testing.T) {
	tests := []struct {
		name          string
		setup         func(t *testing.T) string
		wantErr       bool
		checkPerm0700 bool
	}{
		{
			name: "creates missing dir",
			setup: func(t *testing.T) string {
				return filepath.Join(t.TempDir(), "nested", "store")
			},
			wantErr:       false,
			checkPerm0700: true,
		},
		{
			name: "existing dir ok",
			setup: func(t *testing.T) string {
				return t.TempDir()
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := tt.setup(t)
			err := EnsureStorageDir(p)
			if (err != nil) != tt.wantErr {
				t.Fatalf("EnsureStorageDir() err = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil {
				return
			}
			st, err := os.Stat(p)
			if err != nil || !st.IsDir() {
				t.Fatalf("expected directory at %q", p)
			}
			if tt.checkPerm0700 {
				if got := st.Mode().Perm(); got != 0o700 {
					t.Fatalf("newly created storage dir: want perm 0700, got %o", got)
				}
			}
		})
	}
}

func TestLoadOrCreateIdentityKey(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(t *testing.T, dir string) error
		wantErr   bool
		errSubstr string
		check     func(t *testing.T, dir string, priv libp2pcrypto.PrivKey)
	}{
		{
			name: "missing file creates key and persists",
			setup: func(t *testing.T, dir string) error {
				return nil
			},
			check: func(t *testing.T, dir string, priv libp2pcrypto.PrivKey) {
				if priv == nil {
					t.Fatal("expected non-nil key")
				}
				data, err := os.ReadFile(filepath.Join(dir, fileIdentity))
				if err != nil {
					t.Fatal(err)
				}
				if len(data) == 0 || !strings.Contains(string(data), "BEGIN") {
					t.Fatalf("expected PEM file, got %q", string(data))
				}
			},
		},
		{
			name: "round trip loads same key",
			setup: func(t *testing.T, dir string) error {
				_, err := LoadOrCreateIdentityKey(dir)
				return err
			},
			check: func(t *testing.T, dir string, priv libp2pcrypto.PrivKey) {
				priv2, err := LoadOrCreateIdentityKey(dir)
				if err != nil {
					t.Fatal(err)
				}
				if !libp2pcrypto.KeyEqual(priv, priv2) {
					t.Fatal("second load should return same key")
				}
			},
		},
		{
			name: "invalid PEM bytes",
			setup: func(t *testing.T, dir string) error {
				return os.WriteFile(filepath.Join(dir, fileIdentity), []byte("not pem at all"), 0o600)
			},
			wantErr:   true,
			errSubstr: "invalid PEM",
		},
		{
			name: "valid PEM block wrong key payload",
			setup: func(t *testing.T, dir string) error {
				b := &pem.Block{Type: "BCO LIBP2P PRIVATE KEY", Bytes: []byte{1, 2, 3}}
				return os.WriteFile(filepath.Join(dir, fileIdentity), pem.EncodeToMemory(b), 0o600)
			},
			wantErr: true,
		},
		{
			name: "read error not IsNotExist",
			setup: func(t *testing.T, dir string) error {
				if err := os.Mkdir(filepath.Join(dir, fileIdentity), 0o700); err != nil {
					return err
				}
				return nil
			},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := t.TempDir()
			if err := tt.setup(t, dir); err != nil {
				t.Fatal(err)
			}
			priv, err := LoadOrCreateIdentityKey(dir)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				if tt.errSubstr != "" && !strings.Contains(err.Error(), tt.errSubstr) {
					t.Fatalf("error %q should contain %q", err.Error(), tt.errSubstr)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if tt.check != nil {
				tt.check(t, dir, priv)
			}
		})
	}
}

func TestLoadAllowlistFile(t *testing.T) {
	tests := []struct {
		name    string
		setup   func(t *testing.T, dir string) error
		want    map[string]string
		wantErr bool
	}{
		{
			name: "missing file empty map",
			setup: func(t *testing.T, dir string) error {
				return nil
			},
			want: map[string]string{},
		},
		{
			name: "invalid json",
			setup: func(t *testing.T, dir string) error {
				return os.WriteFile(filepath.Join(dir, fileAllowlist), []byte(`{`), 0o600)
			},
			wantErr: true,
		},
		{
			name: "null json object",
			setup: func(t *testing.T, dir string) error {
				return os.WriteFile(filepath.Join(dir, fileAllowlist), []byte("null\n"), 0o600)
			},
			want: map[string]string{},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := t.TempDir()
			if err := tt.setup(t, dir); err != nil {
				t.Fatal(err)
			}
			got, err := LoadAllowlistFile(dir)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if len(got) != len(tt.want) {
				t.Fatalf("got %v want %v", got, tt.want)
			}
			for k, v := range tt.want {
				if got[k] != v {
					t.Fatalf("key %q: got %q want %q", k, got[k], v)
				}
			}
		})
	}
}

func TestAllowlistRoundTrip(t *testing.T) {
	dir := t.TempDir()
	want := map[string]string{"QmFoo": "Alice", "QmBar": "Bob"}
	if err := SaveAllowlistFile(dir, want); err != nil {
		t.Fatal(err)
	}
	got, err := LoadAllowlistFile(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != len(want) {
		t.Fatalf("got %v want %v", got, want)
	}
	for k, v := range want {
		if got[k] != v {
			t.Fatalf("key %q: got %q want %q", k, got[k], v)
		}
	}
}

func TestLoadManualPeersFile(t *testing.T) {
	tests := []struct {
		name    string
		setup   func(t *testing.T, dir string) error
		want    map[string]string
		wantErr bool
	}{
		{
			name: "missing file empty map",
			setup: func(t *testing.T, dir string) error {
				return nil
			},
			want: map[string]string{},
		},
		{
			name: "invalid json",
			setup: func(t *testing.T, dir string) error {
				return os.WriteFile(filepath.Join(dir, fileManualPeers), []byte(`not-json`), 0o600)
			},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := t.TempDir()
			if err := tt.setup(t, dir); err != nil {
				t.Fatal(err)
			}
			got, err := LoadManualPeersFile(dir)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if len(got) != len(tt.want) {
				t.Fatalf("got %v want %v", got, tt.want)
			}
		})
	}
}

func TestManualPeersRoundTrip(t *testing.T) {
	dir := t.TempDir()
	want := map[string]string{"peerA": "/ip4/127.0.0.1/tcp/4001"}
	if err := SaveManualPeersFile(dir, want); err != nil {
		t.Fatal(err)
	}
	got, err := LoadManualPeersFile(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != len(want) {
		t.Fatalf("got %v want %v", got, want)
	}
	for k, v := range want {
		if got[k] != v {
			t.Fatalf("key %q: got %q want %q", k, got[k], v)
		}
	}
}

func TestSaveManualPeersFile_nilMap(t *testing.T) {
	dir := t.TempDir()
	if err := SaveManualPeersFile(dir, nil); err != nil {
		t.Fatal(err)
	}
	got, err := LoadManualPeersFile(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 0 {
		t.Fatalf("expected empty map, got %v", got)
	}
}

func TestLoadOrCreateInstanceID(t *testing.T) {
	tests := []struct {
		name  string
		setup func(t *testing.T, dir string) error
		check func(t *testing.T, dir string, id string)
	}{
		{
			name: "missing file writes new id",
			setup: func(t *testing.T, dir string) error {
				return nil
			},
			check: func(t *testing.T, dir string, id string) {
				if id == "" {
					t.Fatal("expected non-empty id")
				}
				data, err := os.ReadFile(filepath.Join(dir, fileInstance))
				if err != nil {
					t.Fatal(err)
				}
				if strings.TrimSpace(string(data)) != id {
					t.Fatalf("file content %q != id %q", strings.TrimSpace(string(data)), id)
				}
			},
		},
		{
			name: "empty file generates new id",
			setup: func(t *testing.T, dir string) error {
				return os.WriteFile(filepath.Join(dir, fileInstance), []byte("   \n"), 0o600)
			},
			check: func(t *testing.T, dir string, id string) {
				if id == "" {
					t.Fatal("expected non-empty id")
				}
			},
		},
		{
			name: "existing id returned",
			setup: func(t *testing.T, dir string) error {
				return os.WriteFile(filepath.Join(dir, fileInstance), []byte("fixed-uuid-123\n"), 0o600)
			},
			check: func(t *testing.T, dir string, id string) {
				if id != "fixed-uuid-123" {
					t.Fatalf("got %q", id)
				}
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := t.TempDir()
			if err := tt.setup(t, dir); err != nil {
				t.Fatal(err)
			}
			id, err := LoadOrCreateInstanceID(dir)
			if err != nil {
				t.Fatal(err)
			}
			tt.check(t, dir, id)
		})
	}
}

func TestLoadNetworkSettings_FillsDefaultsForLegacyFiles(t *testing.T) {
	dir := t.TempDir()
	if err := EnsureStorageDir(dir); err != nil {
		t.Fatal(err)
	}
	legacy := []byte(`{
  "stickinessBonus":{"value":50,"updatedAt":0},
  "btSafetyPolicy":{"value":"smart","updatedAt":0},
  "switchCooldownMs":{"value":2000,"updatedAt":0},
  "mediaPauseGraceMs":{"value":30000,"updatedAt":0},
  "manualConnectTimeoutMs":{"value":1800000,"updatedAt":0}
}`)
	if err := os.WriteFile(filepath.Join(dir, fileNetworkSettings), legacy, 0o600); err != nil {
		t.Fatal(err)
	}
	got, err := LoadNetworkSettings(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got.ForceConnectDisconnectTimeoutMs.Value != 5000 {
		t.Fatalf("disconnect timeout default: got %d", got.ForceConnectDisconnectTimeoutMs.Value)
	}
	if got.ForceConnectConnectTimeoutMs.Value != 5000 {
		t.Fatalf("connect timeout default: got %d", got.ForceConnectConnectTimeoutMs.Value)
	}
}

func TestWriteNewInstanceID(t *testing.T) {
	dir := t.TempDir()
	id1, err := WriteNewInstanceID(dir)
	if err != nil {
		t.Fatal(err)
	}
	if id1 == "" {
		t.Fatal("empty id")
	}
	id2, err := WriteNewInstanceID(dir)
	if err != nil {
		t.Fatal(err)
	}
	if id1 == id2 {
		t.Fatal("expected new id on second write")
	}
	data, err := os.ReadFile(filepath.Join(dir, fileInstance))
	if err != nil {
		t.Fatal(err)
	}
	if strings.TrimSpace(string(data)) != id2 {
		t.Fatalf("file has %q want %q", strings.TrimSpace(string(data)), id2)
	}
}

func TestAtomicWriteFile_renameBlocked(t *testing.T) {
	dir := t.TempDir()
	if err := os.Mkdir(filepath.Join(dir, fileAllowlist), 0o700); err != nil {
		t.Fatal(err)
	}
	err := SaveAllowlistFile(dir, map[string]string{"k": "v"})
	if err == nil {
		t.Fatal("expected rename error when target path is a directory")
	}
}

func TestSaveAllowlistFile_nilMap(t *testing.T) {
	dir := t.TempDir()
	if err := SaveAllowlistFile(dir, nil); err != nil {
		t.Fatal(err)
	}
	got, err := LoadAllowlistFile(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 0 {
		t.Fatalf("expected empty map after saving nil, got %v", got)
	}
}

func TestAtomicWriteFile_parentPathNotDirectory(t *testing.T) {
	dir := t.TempDir()
	blocked := filepath.Join(dir, "not-a-dir")
	if err := os.WriteFile(blocked, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	target := filepath.Join(blocked, "nested", "out.txt")
	err := atomicWriteFile(target, []byte("data"), 0o600)
	if err == nil {
		t.Fatal("expected error when parent path is not a directory")
	}
}

func TestIdentityKeyPeerIDStable(t *testing.T) {
	dir := t.TempDir()
	priv, err := LoadOrCreateIdentityKey(dir)
	if err != nil {
		t.Fatal(err)
	}
	id1, err := peer.IDFromPrivateKey(priv)
	if err != nil {
		t.Fatal(err)
	}
	priv2, err := LoadOrCreateIdentityKey(dir)
	if err != nil {
		t.Fatal(err)
	}
	id2, err := peer.IDFromPrivateKey(priv2)
	if err != nil {
		t.Fatal(err)
	}
	if id1 != id2 {
		t.Fatalf("peer IDs differ: %v vs %v", id1, id2)
	}
}
