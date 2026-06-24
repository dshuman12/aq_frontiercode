#!/usr/bin/env bash
# Enforce statement coverage for the primary bco-core package (not internal/*).
# Contract: specs/004-go-core-test-coverage/contracts/coverage-and-ci.md
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROFILE="${COVER_PROFILE:-coverage.covercheck.out}"
# Strictly greater than this percent (integer) for the aggregated total line.
THRESHOLD="${COVER_THRESHOLD:-90}"

rm -f "$PROFILE"

# Optional extra flags, e.g. COVER_CHECK_GO_TEST_FLAGS='-tags=ci' for CI parity.
# shellcheck disable=SC2086
CGO_ENABLED=1 go test -race \
	-coverprofile="$PROFILE" \
	-coverpkg=github.com/hvaghani221/bco/bco-core \
	${COVER_CHECK_GO_TEST_FLAGS:-} \
	./...

if [[ ! -s "$PROFILE" ]]; then
	echo "cover-check: empty or missing coverage profile: $PROFILE" >&2
	exit 1
fi

status=0
go tool cover -func="$PROFILE" | awk -v thresh="$THRESHOLD" '
/^total:/ {
	seen = 1
	gsub(/%/, "", $NF)
	pct = $NF + 0
	if (pct <= thresh) {
		printf("cover-check: FAIL: total statement coverage is %.1f%% (must be > %d%%)\n", pct, thresh) > "/dev/stderr"
		exit 1
	}
	printf("cover-check: OK: total statement coverage is %.1f%% (> %d%%)\n", pct, thresh)
	exit 0
}
END {
	if (!seen) {
		print "cover-check: FAIL: no total line in go tool cover output" > "/dev/stderr"
		exit 1
	}
}' || status=$?

exit "$status"
