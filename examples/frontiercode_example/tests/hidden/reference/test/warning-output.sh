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

"$bin" --resolver >"$tmp_dir/stdout" 2>"$tmp_dir/stderr"
expect_empty "$tmp_dir/stdout" stdout
expect_line "$tmp_dir/stderr" "warning: custom resolver support is experimental."
expect_line "$tmp_dir/stderr" "Only use this hook for schemas you fully control."
expect_line "$tmp_dir/stderr" "Unexpected remote references may resolve differently in production."

"$bin" --bundle-without-id >"$tmp_dir/stdout" 2>"$tmp_dir/stderr"
expect_empty "$tmp_dir/stdout" stdout
expect_line "$tmp_dir/stderr" "warning: You are opting in to remove schema identifiers from the bundle."
expect_line "$tmp_dir/stderr" "The only legit use case is preparing a test fixture for legacy clients."
expect_line "$tmp_dir/stderr" "Do not use this for production schemas because the output may be non-compliant."

"$bin" --disable-lint-rules >"$tmp_dir/stdout" 2>"$tmp_dir/stderr"
expect_empty "$tmp_dir/stdout" stdout
expect_line "$tmp_dir/stderr" "warning: lint rules disabled by jsonschema.toml"

"$bin" --schema-template >"$tmp_dir/stdout" 2>"$tmp_dir/stderr"
expect_empty "$tmp_dir/stdout" stdout
expect_line "$tmp_dir/stderr" "warning: using built-in template for schema 'draft-07'"

"$bin" --empty-jsonl >"$tmp_dir/stdout" 2>"$tmp_dir/stderr"
expect_empty "$tmp_dir/stdout" stdout
expect_line "$tmp_dir/stderr" "warning: The JSONL file is empty: schemas.jsonl"
