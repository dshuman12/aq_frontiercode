// Look for problems in the recipe corpus: orphaned ingredient slugs,
// duplicate slugs across recipes, recipes with zero ingredients,
// recipes whose totalMinutes is suspiciously high or low.

import type { Recipe } from "../core/recipe.js";

export interface RecipeFinding {
  recipeSlug: string;
  code: string;
  detail: string;
}

const KNOWN_VEGAN: ReadonlySet<string> = new Set([
  "milk", "yogurt", "butter", "cream", "egg", "parmesan",
]);

export function audit(recipes: Recipe[]): RecipeFinding[] {
  const findings: RecipeFinding[] = [];
  const seenSlugs = new Map<string, string>();
  for (const r of recipes) {
    if (r.ingredients.length === 0) {
      findings.push({
        recipeSlug: r.slug, code: "no-ingredients",
        detail: "recipe has zero ingredients",
      });
    }
    if (r.servings <= 0) {
      findings.push({
        recipeSlug: r.slug, code: "bad-servings",
        detail: `servings = ${r.servings}`,
      });
    }
    if (r.totalMinutes !== undefined) {
      if (r.totalMinutes < 0) {
        findings.push({
          recipeSlug: r.slug, code: "negative-time",
          detail: `totalMinutes = ${r.totalMinutes}`,
        });
      }
      if (r.totalMinutes > 600) {
        findings.push({
          recipeSlug: r.slug, code: "implausible-time",
          detail: `totalMinutes = ${r.totalMinutes} (>10 hours)`,
        });
      }
    }
    if (seenSlugs.has(r.slug)) {
      findings.push({
        recipeSlug: r.slug, code: "duplicate-slug",
        detail: `slug also used by recipe id ${seenSlugs.get(r.slug)}`,
      });
    } else {
      seenSlugs.set(r.slug, String(r.id));
    }
    const ingSlugs = new Set<string>();
    for (const ing of r.ingredients) {
      if (ingSlugs.has(ing.slug)) {
        findings.push({
          recipeSlug: r.slug, code: "duplicate-ingredient",
          detail: `${ing.slug} appears more than once`,
        });
      }
      ingSlugs.add(ing.slug);
      if (ing.qty.value <= 0) {
        findings.push({
          recipeSlug: r.slug, code: "zero-qty",
          detail: `${ing.slug} has zero qty`,
        });
      }
    }
    if (r.tags?.includes("vegan")) {
      for (const ing of r.ingredients) {
        if (KNOWN_VEGAN.has(ing.slug)) {
          findings.push({
            recipeSlug: r.slug, code: "vegan-mismatch",
            detail: `tagged vegan but uses ${ing.slug}`,
          });
        }
      }
    }
  }
  return findings;
}

export function format(findings: RecipeFinding[]): string {
  if (findings.length === 0) return "(no recipe findings)\n";
  return findings.map((f) =>
    `[${f.recipeSlug}] ${f.code}: ${f.detail}`
  ).join("\n") + "\n";
}

export function countByCode(findings: RecipeFinding[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of findings) out[f.code] = (out[f.code] ?? 0) + 1;
  return out;
}
