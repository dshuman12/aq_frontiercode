import { test } from "node:test";
import assert from "node:assert/strict";
import { bash, emit, knownCommands, knownShells, zsh } from "./completion.js";

test("bash output mentions every known command", () => {
  const out = bash();
  for (const cmd of knownCommands()) {
    assert.ok(out.includes(cmd));
  }
});

test("bash defines the completion function", () => {
  assert.match(bash(), /_pantry_completion/);
});

test("zsh output starts with #compdef", () => {
  assert.match(zsh(), /^#compdef pantry/);
});

test("emit('bash') === bash()", () => {
  assert.equal(emit("bash"), bash());
});

test("emit('zsh') === zsh()", () => {
  assert.equal(emit("zsh"), zsh());
});

test("emit unknown shell throws", () => {
  assert.throws(() => emit("fish"));
});

test("knownCommands non-empty", () => {
  assert.ok(knownCommands().length > 5);
});

test("knownShells contains bash + zsh", () => {
  const s = knownShells();
  assert.ok(s.includes("bash"));
  assert.ok(s.includes("zsh"));
});
