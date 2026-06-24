import { test } from "node:test";
import assert from "node:assert/strict";
import { Query } from "./query-builder.js";

test("empty by default", () => {
  const q = Query.from();
  assert.equal(q.isEmpty(), true);
  assert.equal(q.build(), "");
});

test("bySlug", () => {
  assert.equal(Query.from().bySlug("olive-oil").build(), "slug:olive-oil");
});

test("byCategory + byLocation chain", () => {
  const out = Query.from()
    .byCategory("oils")
    .byLocation("pantry")
    .build();
  assert.match(out, /category:oils/);
  assert.match(out, /where:pantry/);
});

test("expiringWithin negative throws", () => {
  assert.throws(() => Query.from().expiringWithin(-1));
});

test("expiringWithin builds expiring:N", () => {
  assert.equal(Query.from().expiringWithin(7).build(), "expiring:7");
});

test("withNotes quotes spaces", () => {
  assert.equal(Query.from().withNotes("with spaces").build(), `notes:"with spaces"`);
});

test("bare adds plain word", () => {
  assert.equal(Query.from().bare("tempo").build(), "tempo");
});

test("bare with spaces gets quoted", () => {
  assert.equal(Query.from().bare("morning loop").build(), `"morning loop"`);
});

test("reset empties", () => {
  const q = Query.from().bySlug("x").reset();
  assert.equal(q.build(), "");
});

test("pop removes the last term", () => {
  const q = Query.from().bySlug("x").byCategory("y").pop();
  assert.equal(q.build(), "slug:x");
});
