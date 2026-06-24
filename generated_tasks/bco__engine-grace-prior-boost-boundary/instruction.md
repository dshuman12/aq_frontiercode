# Task description

`localBroadcastStateLocked` in `bco-core/engine.go` implements the media-pause grace hold: when local audio recently dropped below `AudioPriorityMedia` but the pre-drop tier was at least Media, the broadcast state must keep advertising the held pre-drop priority for the duration of the grace window so peers do not immediately treat the device as idle and race to steal the headset.

The grace hold currently only triggers when the pre-drop tier was strictly above Media. A device whose pre-drop tier was exactly Media falls through and broadcasts its real, dropped priority, so peers see it go idle right away and a handover storm can start. Higher tiers (incoming/active call) still hold correctly, which masks the defect.

Fix the threshold so the grace hold applies whenever the held pre-drop priority is at least Media (`>= AudioPriorityMedia`), matching the arming condition in `BCOSendStateUpdate`. The broadcast state should advertise the held priority and set `AudioPriorityHeldUntilMs` while the window is open; once the window expires, the real priority must be broadcast again. Do not change the grace window duration, the arming logic, event emission, or any unrelated tier handling. Keep the `localBroadcastStateLocked` signature and return type unchanged.

# Test guidelines

Run `cd bco-core && go test ./...` and confirm the package passes.

Add or extend tests in the `bco-core` package (alongside existing engine and priority tests) covering the boundary case: a pre-drop tier of exactly Media must broadcast the held Media priority with a non-zero `AudioPriorityHeldUntilMs` during the grace window, then revert to the dropped priority after it expires. Keep existing coverage for higher tiers and for tiers that should never hold (drops from below Media).

# Lint guidelines

Run `gofmt`/`go vet` over the changed files and ensure the code is properly formatted with no remaining diffs. The repository builds with CGO enabled (`CGO_ENABLED=1`); do not break the C export surface in `capi.go`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
