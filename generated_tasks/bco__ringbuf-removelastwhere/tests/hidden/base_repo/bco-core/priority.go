package main

import (
	"fmt"
	"sort"
	"strings"
)

// ManualConnectBonus is added when ManualConnectOverride is true on a device.
const ManualConnectBonus = 500

// PriorityCandidateRow is one device in the resolution table (for logs and inspection).
type PriorityCandidateRow struct {
	DeviceID           string
	DeviceName         string
	IsLocal            bool
	AudioPriority      AudioPriority
	HasBluetooth       bool
	StickinessBonus    int
	BaseBias           int
	ManualConnectBonus int
	EffectiveScore     int
	SkippedPaused      bool
	HeadsetAddr        string
	HeadsetName        string
	SkippedHeadset     bool // excluded because headset doesn't match the filter
}

// PriorityResolution is the outcome of one priority pass plus rows for logging.
type PriorityResolution struct {
	WinnerID   string
	Ok         bool
	Candidates []PriorityCandidateRow
}

func audioTierName(p AudioPriority) string {
	switch p {
	case AudioPriorityIdle:
		return "Idle"
	case AudioPriorityMedia:
		return "Media"
	case AudioPriorityIncomingCall:
		return "IncomingCall"
	case AudioPriorityActiveCall:
		return "ActiveCall"
	default:
		return fmt.Sprintf("Tier(%d)", p)
	}
}

func stickinessForBT(hasBT bool, bonus int) int {
	if hasBT {
		return bonus
	}
	return 0
}

func manualBonus(override bool) int {
	if override {
		return ManualConnectBonus
	}
	return 0
}

// ComputePriorityResolution builds candidate scores and picks the BT orchestration winner.
// Paused devices are excluded from contention. Candidates are sorted by score DESC, deviceId ASC.
// The winner is the first eligible candidate with audioPriority >= Media (100), if any.
// When headsetAddr is non-empty, only devices targeting the same headset (case-insensitive)
// are eligible; others appear in Candidates with SkippedHeadset=true.
func ComputePriorityResolution(localID string, local DeviceState, peers map[string]DeviceState, settings NetworkSettings, headsetAddr string) PriorityResolution {
	stickinessVal := settings.StickinessBonus.Value
	var rows []PriorityCandidateRow
	addRow := func(id string, st DeviceState, isLocal bool) {
		hsMatch := headsetAddr == "" || strings.EqualFold(st.TargetHeadsetAddr, headsetAddr)
		if !hsMatch {
			rows = append(rows, PriorityCandidateRow{
				DeviceID:       id,
				DeviceName:     st.DeviceName,
				IsLocal:        isLocal,
				AudioPriority:  st.AudioPriority,
				HasBluetooth:   st.HasBluetoothConnection,
				HeadsetAddr:    st.TargetHeadsetAddr,
				HeadsetName:    st.TargetHeadsetName,
				SkippedHeadset: true,
			})
			return
		}
		if st.Paused {
			rows = append(rows, PriorityCandidateRow{
				DeviceID:      id,
				DeviceName:    st.DeviceName,
				IsLocal:       isLocal,
				AudioPriority: st.AudioPriority,
				HasBluetooth:  st.HasBluetoothConnection,
				SkippedPaused: true,
				HeadsetAddr:   st.TargetHeadsetAddr,
				HeadsetName:   st.TargetHeadsetName,
			})
			return
		}
		sb := stickinessForBT(st.HasBluetoothConnection, stickinessVal)
		bb := st.BaseBias
		mb := manualBonus(st.ManualConnectOverride)
		ap := int(st.AudioPriority)
		score := ap + sb + bb + mb
		rows = append(rows, PriorityCandidateRow{
			DeviceID:           id,
			DeviceName:         st.DeviceName,
			IsLocal:            isLocal,
			AudioPriority:      st.AudioPriority,
			HasBluetooth:       st.HasBluetoothConnection,
			StickinessBonus:    sb,
			BaseBias:           bb,
			ManualConnectBonus: mb,
			EffectiveScore:     score,
			HeadsetAddr:        st.TargetHeadsetAddr,
			HeadsetName:        st.TargetHeadsetName,
		})
	}
	addRow(localID, local, true)
	for id, st := range peers {
		addRow(id, st, false)
	}

	eligible := make([]PriorityCandidateRow, 0, len(rows))
	for _, r := range rows {
		if !r.SkippedPaused && !r.SkippedHeadset {
			eligible = append(eligible, r)
		}
	}
	if len(eligible) == 0 {
		return PriorityResolution{Candidates: rows}
	}
	sort.Slice(eligible, func(i, j int) bool {
		if eligible[i].EffectiveScore != eligible[j].EffectiveScore {
			return eligible[i].EffectiveScore > eligible[j].EffectiveScore
		}
		return eligible[i].DeviceID < eligible[j].DeviceID
	})
	top := eligible[0]
	if top.AudioPriority < AudioPriorityMedia {
		return PriorityResolution{Candidates: rows}
	}
	return PriorityResolution{
		WinnerID:   top.DeviceID,
		Ok:         true,
		Candidates: rows,
	}
}

// ResolveWinner picks the BT orchestration winner from local + peer states.
func ResolveWinner(localID string, local DeviceState, peers map[string]DeviceState, settings NetworkSettings) (winnerID string, ok bool) {
	r := ComputePriorityResolution(localID, local, peers, settings, local.TargetHeadsetAddr)
	return r.WinnerID, r.Ok
}

// StableLogKey changes only when resolution outcome or candidate scores change (order-independent).
func (r PriorityResolution) StableLogKey() string {
	var parts []string
	parts = append(parts, fmt.Sprintf("ok=%v", r.Ok))
	parts = append(parts, fmt.Sprintf("w=%s", r.WinnerID))
	type sig struct {
		id   string
		line string
	}
	var sigs []sig
	for _, c := range r.Candidates {
		if c.SkippedPaused {
			sigs = append(sigs, sig{c.DeviceID, fmt.Sprintf("%s|paused", c.DeviceID)})
			continue
		}
		if c.SkippedHeadset {
			sigs = append(sigs, sig{c.DeviceID, fmt.Sprintf("%s|headset", c.DeviceID)})
			continue
		}
		sigs = append(sigs, sig{c.DeviceID, fmt.Sprintf("%s|ap=%d|sb=%d|bb=%d|mb=%d|sc=%d", c.DeviceID, c.AudioPriority, c.StickinessBonus, c.BaseBias, c.ManualConnectBonus, c.EffectiveScore)})
	}
	sort.Slice(sigs, func(i, j int) bool { return sigs[i].id < sigs[j].id })
	for _, s := range sigs {
		parts = append(parts, s.line)
	}
	return strings.Join(parts, ";")
}

// LogLines returns human-readable lines for defaultLogger.Info (Priority subsystem).
func (r PriorityResolution) LogLines() []string {
	const rule = "Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; " +
		"Winner = among non-paused devices, highest effective_score with audio_priority >= %d (Media); tie-break lexicographic deviceId."
	lines := []string{
		fmt.Sprintf(rule, AudioPriorityMedia),
	}
	cands := append([]PriorityCandidateRow(nil), r.Candidates...)
	sort.Slice(cands, func(i, j int) bool { return cands[i].DeviceID < cands[j].DeviceID })
	for _, c := range cands {
		role := "peer"
		if c.IsLocal {
			role = "local"
		}
		hsSuffix := ""
		if c.HeadsetName != "" {
			hsSuffix = fmt.Sprintf(" headset=%q", c.HeadsetName)
		}
		if c.SkippedHeadset {
			lines = append(lines, fmt.Sprintf("  candidate %q (%s) %s: excluded (different headset%s)", c.DeviceName, shortID(c.DeviceID), role, hsSuffix))
			continue
		}
		if c.SkippedPaused {
			lines = append(lines, fmt.Sprintf("  candidate %q (%s) %s: excluded (paused%s)", c.DeviceName, shortID(c.DeviceID), role, hsSuffix))
			continue
		}
		lines = append(lines, fmt.Sprintf(
			"  candidate %q (%s) %s: audio_priority=%d (%s) has_bt=%v stickiness_bonus=%d base_bias=%d manual_bonus=%d effective_score=%d%s",
			c.DeviceName, shortID(c.DeviceID), role,
			c.AudioPriority, audioTierName(c.AudioPriority), c.HasBluetooth, c.StickinessBonus, c.BaseBias, c.ManualConnectBonus, c.EffectiveScore, hsSuffix,
		))
	}
	if !r.Ok {
		lines = append(lines, "  resolution: no headset holder (no eligible device at or above Media tier)")
		return lines
	}
	lines = append(lines, fmt.Sprintf("  resolution: winner=%q (%s) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device", winnerName(r), shortID(r.WinnerID)))
	return lines
}

func shortID(id string) string {
	if len(id) <= 16 {
		return id
	}
	return id[:12] + "…"
}

func winnerName(r PriorityResolution) string {
	for _, c := range r.Candidates {
		if c.DeviceID == r.WinnerID {
			return c.DeviceName
		}
	}
	return "?"
}

// LocalEffectiveScore returns the effective score for the local device row, or 0 if missing.
func (r PriorityResolution) LocalEffectiveScore(localDeviceID string) int {
	for _, c := range r.Candidates {
		if c.DeviceID == localDeviceID && !c.SkippedPaused {
			return c.EffectiveScore
		}
	}
	return 0
}
