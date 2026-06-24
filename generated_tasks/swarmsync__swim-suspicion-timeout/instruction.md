# Task description

The SWIM failure detector in `pkg/membership/swim.go` never promotes suspected members to dead when the suspicion timeout elapses. The routine that checks suspect age computes the elapsed duration with its time operands reversed, producing a negative duration that can never exceed `SuspicionTimeout`. As a result, members that should transition `StateSuspect → StateDead` linger as suspect indefinitely.

Fix the suspicion-age calculation so elapsed time is measured forward from when a member entered the suspect state (its `LastUpdated` timestamp) to now. Once a suspect has been in that state longer than the configured `SuspicionTimeout`, it must be marked dead via the existing `MemberList.Dead` path, carrying the member's current incarnation.

Other failure-detector paths already behave correctly — suspect-on-nack and indirect-ack promotion must keep working unchanged. Do not alter the `MemberList` API in `member.go`, the scaling logic in `scaling.go`, or the meaning of `SuspicionTimeout`. Only the direction of the elapsed-time comparison and its consequence (eventual death) should change in observable behavior.

# Test guidelines

Run `go test ./pkg/membership/...` and ensure it passes.

Add or extend tests in `pkg/membership` covering the timeout path: a member placed in suspect state must remain suspect before `SuspicionTimeout` elapses and must be promoted to dead once it has been suspect longer than the timeout. Keep existing coverage for suspect-on-nack and indirect-ack green to confirm those paths are untouched. Success is observable as suspect members eventually appearing in the dead set rather than remaining suspect forever.

# Lint guidelines

Run `go vet ./pkg/membership/...` and `gofmt -l pkg/membership` (expect no listed files) before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
