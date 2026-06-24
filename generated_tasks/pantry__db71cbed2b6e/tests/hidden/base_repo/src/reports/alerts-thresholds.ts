// Threshold tuning per category. Each category can have its own
// alerts profile (eg. produce defaults to 5-day expiring window,
// pantry shelf items to 30 days).

import type { AlertOptions } from "./alerts.js";

export interface CategoryThreshold {
  expiringWindowDays: number;
  staleAfterDays: number;
}

const DEFAULTS: Record<string, CategoryThreshold> = {
  produce: { expiringWindowDays: 5, staleAfterDays: 14 },
  dairy:   { expiringWindowDays: 7, staleAfterDays: 30 },
  meat:    { expiringWindowDays: 7, staleAfterDays: 30 },
  grains:  { expiringWindowDays: 30, staleAfterDays: 365 },
  canned:  { expiringWindowDays: 30, staleAfterDays: 365 },
  spices:  { expiringWindowDays: 60, staleAfterDays: 365 },
  baking:  { expiringWindowDays: 30, staleAfterDays: 365 },
  oils:    { expiringWindowDays: 30, staleAfterDays: 180 },
  sauces:  { expiringWindowDays: 30, staleAfterDays: 180 },
  alcohol: { expiringWindowDays: 60, staleAfterDays: 730 },
  asian:   { expiringWindowDays: 30, staleAfterDays: 365 },
  sweeteners: { expiringWindowDays: 60, staleAfterDays: 730 },
};

export function thresholdFor(category: string): CategoryThreshold {
  return DEFAULTS[category] ?? { expiringWindowDays: 7, staleAfterDays: 90 };
}

export function buildOptionsFor(category: string, today: string): AlertOptions {
  const t = thresholdFor(category);
  return {
    today,
    expiringWindowDays: t.expiringWindowDays,
    staleAfterDays: t.staleAfterDays,
  };
}

export function knownCategories(): string[] {
  return Object.keys(DEFAULTS).sort();
}
