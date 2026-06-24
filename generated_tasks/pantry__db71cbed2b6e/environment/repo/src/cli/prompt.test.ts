import { test } from "node:test";
import assert from "node:assert/strict";
import { isInteractive } from "./prompt.js";

test("isInteractive returns boolean", () => {
  assert.equal(typeof isInteractive(), "boolean");
});

// We don't call ask/confirm/pickOne directly in tests because they
// would hang waiting for stdin. Their internals use readline which
// is well-tested upstream.
