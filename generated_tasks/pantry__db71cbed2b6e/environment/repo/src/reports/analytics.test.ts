import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeDays,
  churn,
  eventTotals,
  meanPerActiveDay,
  seasonHeatmap,
} from "./analytics.js";
import type { Event } from "../core/event.js";

test("empty input returns empty churn", () => {
  assert.deepEqual(churn([]), []);
});

test("counts empty->stocked transitions on lot.add", () => {
  const events: Event[] = [
    { at: "2026-04-01T10:00:00Z", kind: "lot.add", itemSlug: "milk" },
    { at: "2026-04-15T10:00:00Z", kind: "lot.use", itemSlug: "milk", detail: "empty" },
    { at: "2026-04-16T10:00:00Z", kind: "lot.add", itemSlug: "milk" },
  ];
  const c = churn(events);
  const milk = c.find((x) => x.slug === "milk");
  assert.equal(milk?.emptyToStockedTransitions, 2);
  assert.equal(milk?.stockedToEmptyTransitions, 1);
});

test("seasonHeatmap returns 12 months even if empty", () => {
  const h = seasonHeatmap([]);
  assert.equal(Object.keys(h).length, 12);
  for (const v of Object.values(h)) assert.equal(v, 0);
});

test("seasonHeatmap counts lot.add events per month", () => {
  const events: Event[] = [
    { at: "2026-01-15T10:00:00Z", kind: "lot.add", itemSlug: "x" },
    { at: "2026-04-15T10:00:00Z", kind: "lot.add", itemSlug: "x" },
    { at: "2026-04-20T10:00:00Z", kind: "lot.add", itemSlug: "y" },
  ];
  const h = seasonHeatmap(events);
  assert.equal(h[1], 1);
  assert.equal(h[4], 2);
});

test("eventTotals aggregates", () => {
  const events: Event[] = [
    { at: "x", kind: "item.add" },
    { at: "x", kind: "item.add" },
    { at: "x", kind: "lot.use" },
  ];
  const t = eventTotals(events);
  assert.equal(t["item.add"], 2);
  assert.equal(t["lot.use"], 1);
});

test("activeDays counts distinct dates", () => {
  const events: Event[] = [
    { at: "2026-04-01T10:00:00Z", kind: "item.add" },
    { at: "2026-04-01T11:00:00Z", kind: "item.add" },
    { at: "2026-04-02T10:00:00Z", kind: "item.add" },
  ];
  assert.equal(activeDays(events), 2);
});

test("meanPerActiveDay zero on empty", () => {
  assert.equal(meanPerActiveDay([]), 0);
});

test("meanPerActiveDay basic", () => {
  const events: Event[] = [
    { at: "2026-04-01T10:00:00Z", kind: "item.add" },
    { at: "2026-04-01T11:00:00Z", kind: "item.add" },
    { at: "2026-04-02T10:00:00Z", kind: "item.add" },
  ];
  assert.equal(meanPerActiveDay(events), 1.5);
});
