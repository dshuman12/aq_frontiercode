import { test } from "node:test";
import assert from "node:assert/strict";
import { add, compare, format, isZero, parseQuantity, scale, sub } from "./units.js";

test("parseQuantity mass", () => {
  assert.equal(parseQuantity("500g").value, 500);
  assert.equal(parseQuantity("1kg").value, 1000);
  assert.equal(parseQuantity("2.5 kg").value, 2500);
  assert.equal(Math.round(parseQuantity("1lb").value), 454);
});

test("parseQuantity volume", () => {
  assert.equal(parseQuantity("250ml").value, 250);
  assert.equal(parseQuantity("1L").value, 1000);
  assert.equal(Math.round(parseQuantity("1cup").value), 237);
});

test("parseQuantity count", () => {
  assert.equal(parseQuantity("3").value, 3);
  assert.equal(parseQuantity("1 dozen").value, 12);
  assert.equal(parseQuantity("4 each").value, 4);
});

test("parseQuantity rejects bad input", () => {
  assert.throws(() => parseQuantity(""));
  assert.throws(() => parseQuantity("abc"));
  assert.throws(() => parseQuantity("5xyz"));
  assert.throws(() => parseQuantity("-3kg"));
});

test("format renders mass / volume / count", () => {
  assert.equal(format({ value: 500, kind: "mass" }), "500g");
  assert.equal(format({ value: 1500, kind: "mass" }), "1.50kg");
  assert.equal(format({ value: 250, kind: "volume" }), "250ml");
  assert.equal(format({ value: 1500, kind: "volume" }), "1.50L");
  assert.equal(format({ value: 3, kind: "count" }), "3");
});

test("add same kind", () => {
  const r = add({ value: 100, kind: "mass" }, { value: 50, kind: "mass" });
  assert.equal(r.value, 150);
});

test("add cross kind throws", () => {
  assert.throws(() =>
    add({ value: 1, kind: "mass" }, { value: 1, kind: "volume" })
  );
});

test("sub clamps at zero", () => {
  const r = sub({ value: 50, kind: "mass" }, { value: 100, kind: "mass" });
  assert.equal(r.value, 0);
});

test("scale rejects bad factor", () => {
  assert.throws(() => scale({ value: 100, kind: "mass" }, -1));
  assert.throws(() => scale({ value: 100, kind: "mass" }, NaN));
});

test("isZero", () => {
  assert.equal(isZero({ value: 0, kind: "count" }), true);
  assert.equal(isZero({ value: 0.0001, kind: "mass" }), true);
  assert.equal(isZero({ value: 1, kind: "mass" }), false);
});

test("compare", () => {
  const a = { value: 100, kind: "mass" } as const;
  const b = { value: 200, kind: "mass" } as const;
  assert.equal(compare(a, b), -1);
  assert.equal(compare(b, a), 1);
  assert.equal(compare(a, { value: 100, kind: "mass" }), 0);
  assert.throws(() => compare(a, { value: 100, kind: "volume" }));
});
