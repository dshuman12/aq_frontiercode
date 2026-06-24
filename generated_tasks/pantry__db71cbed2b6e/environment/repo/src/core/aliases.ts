// Synonym map for ingredient slugs. Keeps the importers from creating
// duplicate items when receipts use different names.

const PAIRS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["egg", ["eggs", "brown-eggs", "free-range-eggs", "white-eggs"]],
  ["all-purpose-flour", ["plain-flour", "ap-flour"]],
  ["tomato-passata", ["passata", "strained-tomatoes"]],
  ["tomato-paste", ["tomato-puree", "tomato-concentrate"]],
  ["bell-pepper", ["sweet-pepper", "capsicum", "red-pepper", "green-pepper"]],
  ["cilantro", ["coriander-fresh", "coriander-leaves"]],
  ["scallion", ["green-onion", "spring-onion"]],
  ["pancetta", ["italian-bacon"]],
  ["chickpeas-canned", ["garbanzo-beans", "garbanzo-canned"]],
  ["zucchini", ["courgette"]],
  ["eggplant", ["aubergine"]],
  ["red-onion", ["red-onions"]],
  ["onion", ["onions", "yellow-onion"]],
  ["potato", ["potatoes"]],
  ["carrot", ["carrots"]],
  ["sweet-potato", ["sweet-potatoes", "yam"]],
  ["coconut-milk", ["coconut-milk-canned"]],
  ["vegetable-broth", ["veg-broth", "vegetable-stock"]],
  ["chicken-broth", ["chicken-stock"]],
  ["white-beans", ["cannellini-beans", "great-northern-beans"]],
  ["black-beans", ["turtle-beans"]],
  ["red-wine", ["red-wine-cooking"]],
  ["white-wine", ["white-wine-cooking", "dry-white-wine"]],
  ["yogurt", ["greek-yogurt", "yoghurt"]],
  ["smoked-paprika", ["pimenton"]],
  ["cinnamon-ground", ["ground-cinnamon"]],
  ["cumin-ground", ["ground-cumin"]],
  ["coriander-ground", ["ground-coriander"]],
];

const REVERSE = new Map<string, string>();
for (const [canonical, syns] of PAIRS) {
  for (const s of syns) REVERSE.set(s, canonical);
}

export function canonical(slug: string): string {
  return REVERSE.get(slug) ?? slug;
}

export function isAlias(slug: string): boolean {
  return REVERSE.has(slug);
}

export function aliasesOf(slug: string): readonly string[] {
  for (const [canon, syns] of PAIRS) {
    if (canon === slug) return syns;
  }
  return [];
}

export function knownCanonical(): string[] {
  return PAIRS.map(([c]) => c).sort();
}

export function knownAliases(): string[] {
  return [...REVERSE.keys()].sort();
}
