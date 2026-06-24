import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILT_IN, describe, knownTargets, suggest } from "./substitute.js";

test("BUILT_IN is non-empty and well-formed", () => {
  assert.ok(BUILT_IN.length > 0);
  for (const s of BUILT_IN) {
    assert.ok(s.for.length > 0);
    assert.ok(s.use.length > 0);
  }
});

test("suggest returns matches", () => {
  const got = suggest("buttermilk");
  assert.ok(got.length >= 1);
  assert.equal(got[0]?.for, "buttermilk");
});

test("suggest empty for unknown", () => {
  assert.deepEqual(suggest("dragonfruit"), []);
});

test("suggest combines built-in + extra", () => {
  const got = suggest("milk", [{ for: "milk", use: "oat milk" }]);
  assert.equal(got.length, 1);
  assert.equal(got[0]?.use, "oat milk");
});

test("describe renders with notes", () => {
  const out = describe({ for: "x", use: "y", notes: "z" });
  assert.match(out, /use y/);
  assert.match(out, /\(z\)/);
});

test("describe renders without notes", () => {
  const out = describe({ for: "x", use: "y" });
  assert.equal(out, "use y");
});

test("knownTargets is sorted distinct", () => {
  const out = knownTargets();
  for (let i = 1; i < out.length; i++) {
    assert.ok(out[i - 1]! <= out[i]!);
  }
});

test("knownTargets includes extras", () => {
  const out = knownTargets([{ for: "zzzz-late-night-snack", use: "x" }]);
  assert.equal(out.includes("zzzz-late-night-snack"), true);
});
