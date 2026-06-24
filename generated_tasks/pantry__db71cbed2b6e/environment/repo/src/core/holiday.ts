// Mark recipes for known holidays / seasonal events.

interface Rule {
  tag: string;
  monthRange: [number, number]; // inclusive (1-12)
  triggerSlugs: readonly string[];
  optional?: boolean;
}

const RULES: Rule[] = [
  {
    tag: "thanksgiving",
    monthRange: [11, 11],
    triggerSlugs: ["turkey-whole", "cranberry-fresh", "pumpkin-puree", "stuffing-bread"],
  },
  {
    tag: "christmas",
    monthRange: [12, 12],
    triggerSlugs: ["roast-beef", "yorkshire-pudding-batter", "mince-pie", "christmas-cake"],
  },
  {
    tag: "easter",
    monthRange: [3, 4],
    triggerSlugs: ["lamb-leg", "hot-cross-bun", "easter-egg-dye"],
  },
  {
    tag: "passover",
    monthRange: [3, 4],
    triggerSlugs: ["matzo", "haroset"],
  },
  {
    tag: "lunar-new-year",
    monthRange: [1, 2],
    triggerSlugs: ["dumpling-wrapper", "longevity-noodle"],
  },
  {
    tag: "summer-bbq",
    monthRange: [6, 8],
    triggerSlugs: ["sausages-bbq", "burger-patty", "corn-cobs"],
  },
  {
    tag: "halloween",
    monthRange: [10, 10],
    triggerSlugs: ["pumpkin-puree", "candy-corn"],
  },
];

export interface RecipeWithIngredients {
  ingredients: Array<{ slug: string }>;
  totalMinutes?: number;
}

export function suggestHoliday(r: RecipeWithIngredients): string[] {
  const ingredientSet = new Set(r.ingredients.map((i) => i.slug));
  const out: string[] = [];
  for (const rule of RULES) {
    for (const trigger of rule.triggerSlugs) {
      if (ingredientSet.has(trigger)) {
        out.push(rule.tag);
        break;
      }
    }
  }
  return [...new Set(out)].sort();
}

export function inSeason(date: string): string[] {
  const month = Number.parseInt(date.slice(5, 7), 10);
  const out: string[] = [];
  for (const rule of RULES) {
    const [lo, hi] = rule.monthRange;
    if (month >= lo && month <= hi) out.push(rule.tag);
  }
  return out;
}

export function knownTags(): string[] {
  return RULES.map((r) => r.tag).sort();
}

export function rulesForTag(tag: string): Rule | null {
  return RULES.find((r) => r.tag === tag) ?? null;
}
