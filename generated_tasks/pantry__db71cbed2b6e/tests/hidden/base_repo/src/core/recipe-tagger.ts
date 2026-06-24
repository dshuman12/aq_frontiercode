// Auto-tag recipes from their ingredient profile. Useful for filling
// in tags for the dozens of recipes you imported in one go.

import type { Recipe } from "../core/recipe.js";

interface Rule {
  tag: string;
  test: (r: Recipe) => boolean;
}

const RULES: Rule[] = [
  {
    tag: "vegetarian",
    test: (r) => !r.ingredients.some((i) =>
      ["ground-beef", "chicken-thighs", "chicken-breast", "italian-sausage",
       "pancetta", "bacon", "anchovy", "salmon-fillet"].includes(i.slug)
    ),
  },
  {
    tag: "vegan",
    test: (r) => !r.ingredients.some((i) =>
      ["ground-beef", "chicken-thighs", "chicken-breast", "italian-sausage",
       "pancetta", "bacon", "anchovy", "salmon-fillet",
       "milk", "yogurt", "butter", "cream", "sour-cream", "creme-fraiche", "egg",
       "parmesan", "pecorino-romano", "mozzarella", "ricotta", "feta", "cheddar"].includes(i.slug)
    ),
  },
  {
    tag: "pasta",
    test: (r) => r.ingredients.some((i) =>
      ["spaghetti", "tagliatelle", "fusilli", "pasta-tube", "lasagne-sheets", "penne"].includes(i.slug)
    ),
  },
  {
    tag: "soup",
    test: (r) => r.ingredients.some((i) =>
      ["vegetable-broth", "chicken-broth", "beef-broth"].includes(i.slug)
    ) && r.name.toLowerCase().includes("soup"),
  },
  {
    tag: "baking",
    test: (r) => r.ingredients.some((i) =>
      ["all-purpose-flour", "bread-flour", "sugar-white", "sugar-brown",
       "baking-powder", "baking-soda", "yeast-instant"].includes(i.slug)
    ),
  },
  {
    tag: "spicy",
    test: (r) => r.ingredients.some((i) =>
      ["chili-flakes", "cayenne", "harissa", "sambal"].includes(i.slug)
    ),
  },
  {
    tag: "weeknight",
    test: (r) => (r.totalMinutes ?? 0) > 0 && (r.totalMinutes ?? 9999) <= 35,
  },
  {
    tag: "weekend",
    test: (r) => (r.totalMinutes ?? 0) >= 90,
  },
  {
    tag: "fresh",
    test: (r) => r.ingredients.some((i) =>
      ["basil-leaves", "parsley-flat", "cilantro", "thyme-fresh", "rosemary-fresh"].includes(i.slug)
    ),
  },
];

export function suggestTags(r: Recipe): string[] {
  const out = new Set<string>();
  for (const rule of RULES) {
    if (rule.test(r)) out.add(rule.tag);
  }
  return [...out].sort();
}

export function applyTags(r: Recipe): Recipe {
  const suggested = suggestTags(r);
  const have = new Set(r.tags ?? []);
  for (const t of suggested) have.add(t);
  return { ...r, tags: [...have].sort() };
}

export function ruleNames(): string[] {
  return RULES.map((r) => r.tag).sort();
}

export function applyAll(recipes: Recipe[]): Recipe[] {
  return recipes.map((r) => applyTags(r));
}
