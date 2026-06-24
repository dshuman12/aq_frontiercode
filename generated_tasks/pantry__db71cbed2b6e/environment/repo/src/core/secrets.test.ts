import { test } from "node:test";
import assert from "node:assert/strict";
import { envName, find, fromConfig, fromEnv, has, mask, redact } from "./secrets.js";

test("envName uppercases and replaces dashes", () => {
  assert.equal(envName("foo-bar"), "PANTRY_FOO_BAR");
});

test("fromEnv returns trimmed value", () => {
  process.env.X_TEST = "  hi  ";
  assert.equal(fromEnv("X_TEST"), "hi");
  delete process.env.X_TEST;
});

test("fromEnv returns null on missing", () => {
  assert.equal(fromEnv("MISSING_VAR_42"), null);
});

test("fromConfig returns trimmed value", () => {
  assert.equal(fromConfig((f) => (f === "x" ? "  v  " : null), "x"), "v");
});

test("fromConfig returns null on empty", () => {
  assert.equal(fromConfig(() => "", "x"), null);
});

test("find prefers config over env", () => {
  process.env.PANTRY_X = "from-env";
  const got = find("x", [(f) => (f === "x" ? "from-config" : null)]);
  assert.equal(got?.value, "from-config");
  delete process.env.PANTRY_X;
});

test("find falls back to env", () => {
  process.env.PANTRY_X = "from-env";
  const got = find("x", []);
  assert.equal(got?.origin.startsWith("env:"), true);
  delete process.env.PANTRY_X;
});

test("find null when nothing", () => {
  assert.equal(find("nope", []), null);
});

test("mask short values", () => {
  assert.equal(mask("abc"), "***");
});

test("mask long values", () => {
  assert.equal(mask("abcdef12345"), "abcd...");
});

test("redact replaces every char with *", () => {
  assert.equal(redact("hello"), "*****");
});

test("has reports presence", () => {
  process.env.PANTRY_X = "yes";
  assert.equal(has("x", []), true);
  delete process.env.PANTRY_X;
});
