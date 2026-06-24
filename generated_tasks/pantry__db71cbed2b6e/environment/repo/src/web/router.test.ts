import { test } from "node:test";
import assert from "node:assert/strict";
import { newRouter, patternToRegex } from "./router.js";

test("static route matches exact path", () => {
  const r = newRouter().add({
    method: "GET", pattern: "/items", handler: () => "ok",
  });
  assert.ok(r.match("GET", "/items"));
});

test("missing path returns null", () => {
  const r = newRouter().add({ method: "GET", pattern: "/items", handler: () => "ok" });
  assert.equal(r.match("GET", "/nope"), null);
});

test("wrong method returns null", () => {
  const r = newRouter().add({ method: "GET", pattern: "/items", handler: () => "ok" });
  assert.equal(r.match("POST", "/items"), null);
});

test("named param captured", () => {
  const r = newRouter().add({
    method: "GET", pattern: "/items/:id", handler: () => "ok",
  });
  const m = r.match("GET", "/items/42");
  assert.equal(m?.params["id"], "42");
});

test("multi-param", () => {
  const r = newRouter().add({
    method: "GET", pattern: "/items/:slug/lots/:id", handler: () => "ok",
  });
  const m = r.match("GET", "/items/olive-oil/lots/3");
  assert.equal(m?.params["slug"], "olive-oil");
  assert.equal(m?.params["id"], "3");
});

test("URL-encoded params decoded", () => {
  const r = newRouter().add({
    method: "GET", pattern: "/items/:slug", handler: () => "ok",
  });
  const m = r.match("GET", "/items/olive%20oil");
  assert.equal(m?.params["slug"], "olive oil");
});

test("path-length mismatch returns null", () => {
  const r = newRouter().add({
    method: "GET", pattern: "/items/:id", handler: () => "ok",
  });
  assert.equal(r.match("GET", "/items"), null);
  assert.equal(r.match("GET", "/items/1/extra"), null);
});

test("list returns added routes", () => {
  const r = newRouter()
    .add({ method: "GET", pattern: "/a", handler: () => "" })
    .add({ method: "POST", pattern: "/b", handler: () => "" });
  assert.equal(r.list().length, 2);
});

test("patternToRegex matches similar paths", () => {
  const re = patternToRegex("/items/:id");
  assert.ok(re.test("/items/42"));
  assert.equal(re.test("/items"), false);
  assert.equal(re.test("/items/42/extra"), false);
});
