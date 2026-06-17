#!/usr/bin/env sh
set -eu

bin=${1:-build/jsonschema-demo}
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT HUP INT TERM

"$bin" >"$tmp_dir/stdout" 2>"$tmp_dir/stderr"

grep -Fx "jsonschema demo" "$tmp_dir/stdout" >/dev/null
test ! -s "$tmp_dir/stderr"
