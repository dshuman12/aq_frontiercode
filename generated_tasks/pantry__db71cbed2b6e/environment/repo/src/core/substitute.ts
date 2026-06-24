// Substitution suggestions. We keep a small built-in table of common
// kitchen swaps and let the user extend via config.

export interface Substitution {
  for: string;
  use: string;
  notes?: string;
}

export const BUILT_IN: readonly Substitution[] = [
  { for: "buttermilk", use: "milk + lemon juice", notes: "let stand 5 min" },
  { for: "self-raising-flour", use: "plain flour + 2 tsp baking powder per 150 g" },
  { for: "white-wine", use: "white grape juice + a dash of vinegar" },
  { for: "shallot", use: "small red onion" },
  { for: "creme-fraiche", use: "sour cream + a splash of cream" },
  { for: "honey", use: "maple syrup", notes: "1:1 swap, slightly thinner" },
  { for: "vanilla-extract", use: "vanilla bean paste", notes: "half the volume" },
  { for: "fresh-thyme", use: "dried thyme", notes: "third the volume" },
  { for: "panko", use: "finely toasted breadcrumbs" },
  { for: "anchovy", use: "miso paste", notes: "scant amount, dissolve" },
];

export function suggest(slug: string, extra: Substitution[] = []): Substitution[] {
  return [...BUILT_IN, ...extra].filter((s) => s.for === slug);
}

export function describe(s: Substitution): string {
  if (s.notes) return `use ${s.use} (${s.notes})`;
  return `use ${s.use}`;
}

export function knownTargets(extra: Substitution[] = []): string[] {
  const set = new Set<string>();
  for (const s of [...BUILT_IN, ...extra]) set.add(s.for);
  return [...set].sort();
}
