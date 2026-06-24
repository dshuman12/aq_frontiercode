// Built-in category tree. Used to validate user-supplied categories
// and to sort `pantry list` output in a sensible order.

export const TREE: Record<string, readonly string[]> = {
  oils: [
    "olive-oil", "sunflower-oil", "rapeseed-oil", "sesame-oil",
    "coconut-oil", "ghee", "lard",
  ],
  grains: [
    "rice", "rice-uncooked", "all-purpose-flour", "bread-flour",
    "rye-flour", "spelt-flour", "spaghetti", "tagliatelle",
    "penne", "fusilli", "lasagne-sheets", "couscous", "bulgur",
    "oats-rolled", "polenta", "quinoa",
  ],
  canned: [
    "tomato-passata", "tomato-paste", "chickpeas-canned",
    "white-beans", "black-beans", "kidney-beans", "borlotti-beans",
    "tuna-canned", "sardines", "coconut-milk", "vegetable-broth",
    "chicken-broth", "beef-broth",
  ],
  produce: [
    "onion", "red-onion", "garlic", "ginger-root", "shallot",
    "carrot", "celery", "potato", "sweet-potato", "tomato",
    "lemon", "lime", "orange", "apple", "banana-ripe",
    "scallion", "parsley-flat", "basil-leaves", "cilantro",
    "rosemary-fresh", "thyme-fresh", "bay-leaf",
    "zucchini", "eggplant", "bell-pepper", "cucumber",
    "spinach", "kale", "lettuce-romaine",
  ],
  dairy: [
    "milk", "yogurt", "butter", "cream", "sour-cream",
    "creme-fraiche", "egg", "parmesan", "pecorino-romano",
    "mozzarella", "ricotta", "feta", "cheddar",
  ],
  meat: [
    "ground-beef", "beef-stew-meat", "ground-pork", "pork-chops",
    "chicken-thighs", "chicken-breast", "bacon", "pancetta",
    "anchovy", "salmon-fillet",
  ],
  spices: [
    "salt", "salt-table", "black-pepper", "smoked-paprika",
    "paprika-sweet", "cumin-ground", "coriander-ground",
    "cinnamon-ground", "nutmeg-whole", "cloves-whole",
    "oregano-dried", "thyme-dried", "rosemary-dried",
    "bay-leaf", "curry-powder", "turmeric", "cayenne",
  ],
  baking: [
    "sugar-white", "sugar-brown", "powdered-sugar",
    "baking-powder", "baking-soda", "yeast-instant",
    "vanilla-extract", "almond-extract", "cocoa-powder",
  ],
  sweeteners: ["honey", "maple-syrup", "molasses", "agave-syrup"],
  sauces: [
    "soy-sauce", "fish-sauce", "worcestershire", "balsamic-vinegar",
    "white-vinegar", "rice-vinegar", "mustard-dijon",
    "ketchup", "mayonnaise", "tomato-sauce",
  ],
  alcohol: [
    "white-wine", "red-wine", "vermouth-dry", "marsala", "sherry",
  ],
  asian: ["nori", "miso-paste", "tahini", "rice-noodles"],
} as const;

export const CATEGORIES = Object.keys(TREE).sort();

export function isValidCategory(c: string): boolean {
  return c in TREE;
}

export function categoryFor(slug: string): string | null {
  for (const [cat, slugs] of Object.entries(TREE)) {
    if (slugs.includes(slug)) return cat;
  }
  return null;
}

export function suggestionsFor(category: string): readonly string[] {
  return TREE[category] ?? [];
}

export function knownSlugs(): string[] {
  const out = new Set<string>();
  for (const slugs of Object.values(TREE)) {
    for (const s of slugs) out.add(s);
  }
  return [...out].sort();
}
