#!/usr/bin/env sh
set -eu

bin=${1:-build/jsonschema-demo}
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT HUP INT TERM

expect_empty() {
    file=$1
    label=$2
    if test -s "$file"; then
        echo "Expected empty $label, got:" >&2
        cat "$file" >&2
        exit 1
    fi
}

expect_line() {
    file=$1
    expected=$2
    if ! grep -Fx "$expected" "$file" >/dev/null; then
        echo "Expected line missing from $file:" >&2
        echo "$expected" >&2
        echo "Actual output:" >&2
        cat "$file" >&2
        exit 1
    fi
}

"$bin" --warn-unknown patternProperties >"$tmp_dir/stdout" 2>"$tmp_dir/stderr"
expect_empty "$tmp_dir/stdout" stdout
expect_line "$tmp_dir/stderr" "warning: unknown keyword 'patternProperties' ignored"

"$bin" --warn-dialect >"$tmp_dir/stdout" 2>"$tmp_dir/stderr"
expect_empty "$tmp_dir/stdout" stdout
expect_line "$tmp_dir/stderr" 'warning: falling back to draft-07 because no $schema was declared'

"$bin" --warn-remove-ids >"$tmp_dir/stdout" 2>"$tmp_dir/stderr"
expect_empty "$tmp_dir/stdout" stdout
expect_line "$tmp_dir/stderr" "warning: You are opting in to remove schema identifiers from the bundled schemas."
expect_line "$tmp_dir/stderr" "The only legit use case is preparing a test fixture for legacy clients."
expect_line "$tmp_dir/stderr" "Do not use this for production schemas because the output may be non-compliant."

"$bin" --debug-scan >"$tmp_dir/stdout" 2>"$tmp_dir/stderr"
expect_empty "$tmp_dir/stderr" stderr

"$bin" --verbose --debug-scan >"$tmp_dir/stdout" 2>"$tmp_dir/stderr"
expect_line "$tmp_dir/stderr" "scanned schema bundle"
