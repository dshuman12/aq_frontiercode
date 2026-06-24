// Track consecutive-day "did the household cook?" streaks.
//
// Built from a meal-history log. We expose:
// - currentStreak: how many days ending today contain at least one entry
// - longestStreak: longest run anywhere in history

import type { MealLogEntry } from "./meal-history.js";
import { plusDays } from "../core/date.js";

export function distinctDays(entries: MealLogEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) set.add(e.date);
  return [...set].sort();
}

export function currentStreak(entries: MealLogEntry[], today: string): number {
  const days = new Set(distinctDays(entries));
  let cur = today;
  // If we haven't cooked today, allow the streak to count from yesterday.
  if (!days.has(cur)) cur = plusDays(cur, -1);
  let n = 0;
  while (days.has(cur)) {
    n++;
    cur = plusDays(cur, -1);
  }
  return n;
}

export function longestStreak(entries: MealLogEntry[]): number {
  const days = distinctDays(entries);
  if (days.length === 0) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < days.length; i++) {
    if (plusDays(days[i - 1]!, 1) === days[i]) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }
  return best;
}

export interface StreakStats {
  current: number;
  longest: number;
  daysRecorded: number;
}

export function stats(entries: MealLogEntry[], today: string): StreakStats {
  return {
    current: currentStreak(entries, today),
    longest: longestStreak(entries),
    daysRecorded: distinctDays(entries).length,
  };
}

export function format(s: StreakStats): string {
  return `current: ${s.current}  longest: ${s.longest}  days recorded: ${s.daysRecorded}`;
}
