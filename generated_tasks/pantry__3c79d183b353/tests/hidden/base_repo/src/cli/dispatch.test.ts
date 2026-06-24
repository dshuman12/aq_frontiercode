import { test } from "node:test";
import assert from "node:assert/strict";
import {
  flagBool,
  flagInt,
  flagStr,
  listCommands,
  parseFlags,
  register,
  reset,
  run,
} from "./dispatch.js";

test("run with no args prints usage and exits cleanly", async () => {
  reset();
  const rc = await run([]);
  assert.equal(rc, 0);
});

test("run --help is a no-op exit 0", async () => {
  reset();
  for (const alias of ["-h", "--help", "help"]) {
    assert.equal(await run([alias]), 0);
  }
});

test("run --version is a no-op exit 0", async () => {
  reset();
  for (const alias of ["-v", "--version", "version"]) {
    assert.equal(await run([alias]), 0);
  }
});

test("unknown subcommand throws", async () => {
  reset();
  await assert.rejects(() => run(["bogus"]), /unknown subcommand/);
});

test("registered command runs and propagates rc", async () => {
  reset();
  let called = false;
  register({
    name: "x",
    short: "test",
    run: async (args) => {
      called = true;
      assert.deepEqual(args, ["a", "b"]);
      return 0;
    },
  });
  const rc = await run(["x", "a", "b"]);
  assert.equal(rc, 0);
  assert.equal(called, true);
});

test("undefined return becomes rc=0", async () => {
  reset();
  register({ name: "x", short: "", run: async () => undefined });
  assert.equal(await run(["x"]), 0);
});

test("duplicate registration throws", () => {
  reset();
  register({ name: "x", short: "", run: async () => 0 });
  assert.throws(() => register({ name: "x", short: "", run: async () => 0 }));
});

test("registration without name throws", () => {
  reset();
  assert.throws(() => register({ name: "", short: "", run: async () => 0 }));
});

test("listCommands is sorted", () => {
  reset();
  register({ name: "zeta", short: "", run: async () => 0 });
  register({ name: "alpha", short: "", run: async () => 0 });
  register({ name: "mu", short: "", run: async () => 0 });
  assert.deepEqual(listCommands(), ["alpha", "mu", "zeta"]);
});

test("parseFlags handles --foo=bar form", () => {
  const { flags, positional } = parseFlags(["--foo=bar", "rest"]);
  assert.equal(flags.get("foo"), "bar");
  assert.deepEqual(positional, ["rest"]);
});

test("parseFlags handles --foo bar form", () => {
  const { flags } = parseFlags(["--foo", "bar"]);
  assert.equal(flags.get("foo"), "bar");
});

test("parseFlags treats valueless --foo as boolean true", () => {
  const { flags } = parseFlags(["--foo", "--bar"]);
  assert.equal(flags.get("foo"), true);
  assert.equal(flags.get("bar"), true);
});

test("parseFlags collects positionals", () => {
  const { positional } = parseFlags(["a", "b", "c"]);
  assert.deepEqual(positional, ["a", "b", "c"]);
});

test("parseFlags respects -- terminator", () => {
  const { positional } = parseFlags(["--foo", "x", "--", "--bar"]);
  assert.deepEqual(positional, ["--bar"]);
});

test("flagStr returns default when missing", () => {
  const m = new Map<string, string | true>();
  assert.equal(flagStr(m, "x", "fallback"), "fallback");
});

test("flagInt parses or falls back", () => {
  const m = new Map<string, string | true>([["n", "42"], ["bad", "abc"]]);
  assert.equal(flagInt(m, "n", 0), 42);
  assert.equal(flagInt(m, "bad", 7), 7);
  assert.equal(flagInt(m, "missing", 9), 9);
});

test("flagBool", () => {
  const m = new Map<string, string | true>([
    ["a", true], ["b", "false"], ["c", "0"], ["d", "yes"],
  ]);
  assert.equal(flagBool(m, "a"), true);
  assert.equal(flagBool(m, "b"), false);
  assert.equal(flagBool(m, "c"), false);
  assert.equal(flagBool(m, "d"), true);
  assert.equal(flagBool(m, "missing"), false);
});
