import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { listen, makeHandler } from "./server.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

const sample: Item[] = [
  {
    id: 1, slug: "olive-oil", name: "Olive Oil",
    lots: [{
      id: 1, qty: { value: 500, kind: "volume" }, addedAt: today,
      where: "pantry", bestBy: "2026-04-20",
    }],
    createdAt: today, updatedAt: today,
  },
];

function fakeRes() {
  let body = "";
  let statusCode = 200;
  const headers = new Map<string, string>();
  return {
    res: {
      get statusCode() { return statusCode; },
      set statusCode(n: number) { statusCode = n; },
      setHeader(k: string, v: string) { headers.set(k.toLowerCase(), v); },
      end(b: string) { body += b; },
    } as unknown as http.ServerResponse,
    body: () => body,
    statusCode: () => statusCode,
    headers,
  };
}

test("GET / returns HTML", async () => {
  const handler = makeHandler({ items: async () => sample, today: () => today });
  const r = fakeRes();
  await handler(
    { url: "/", headers: { host: "x" } } as http.IncomingMessage,
    r.res,
  );
  assert.match(r.body(), /<!DOCTYPE html>/);
});

test("GET /api/items returns JSON", async () => {
  const handler = makeHandler({ items: async () => sample, today: () => today });
  const r = fakeRes();
  await handler(
    { url: "/api/items", headers: { host: "x" } } as http.IncomingMessage,
    r.res,
  );
  const data = JSON.parse(r.body());
  assert.equal(data.length, 1);
});

test("GET /api/expiring respects window", async () => {
  const handler = makeHandler({ items: async () => sample, today: () => today });
  const r = fakeRes();
  await handler(
    { url: "/api/expiring?within=7", headers: { host: "x" } } as http.IncomingMessage,
    r.res,
  );
  const data = JSON.parse(r.body());
  assert.equal(data.length, 1);
});

test("GET /api/expiring with default", async () => {
  const handler = makeHandler({ items: async () => sample, today: () => today });
  const r = fakeRes();
  await handler(
    { url: "/api/expiring", headers: { host: "x" } } as http.IncomingMessage,
    r.res,
  );
  assert.equal(r.statusCode(), 200);
});

test("GET /unknown is 404", async () => {
  const handler = makeHandler({ items: async () => sample, today: () => today });
  const r = fakeRes();
  await handler(
    { url: "/nope", headers: { host: "x" } } as http.IncomingMessage,
    r.res,
  );
  assert.equal(r.statusCode(), 404);
});

test("missing url is 400", async () => {
  const handler = makeHandler({ items: async () => sample, today: () => today });
  const r = fakeRes();
  await handler({ headers: { host: "x" } } as http.IncomingMessage, r.res);
  assert.equal(r.statusCode(), 400);
});

test("listen rejects empty addr", () => {
  assert.throws(() => listen("", { items: async () => [], today: () => today }));
});

test("listen rejects bad port", () => {
  assert.throws(() => listen("127.0.0.1:abc", { items: async () => [], today: () => today }));
});

test("listen returns a server we can close", async () => {
  const server = listen("127.0.0.1:0", { items: async () => sample, today: () => today });
  await new Promise<void>((r) => server.close(() => r()));
  assert.ok(true);
});
