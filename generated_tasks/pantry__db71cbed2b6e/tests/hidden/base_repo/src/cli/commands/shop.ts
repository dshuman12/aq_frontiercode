// `pantry shop` - print shopping list from a recipe slug or current menu.

import { flagInt, flagStr, parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import * as recipes from "../../core/recipe-store.js";
import * as menu from "../../core/menu.js";
import { build, format, shortfallOnly } from "../../core/shopping.js";
import { today } from "../../core/date.js";

register({
  name: "shop",
  short: "build a shopping list from recipes / menu",
  run: async (args) => {
    const { flags, positional } = parseFlags(args);
    const recipeSlugs = positional.length > 0
      ? positional
      : await menuSlugsForRange(flags);
    const wantRecipes = [];
    for (const slug of recipeSlugs) {
      const r = await recipes.findBySlug(slug);
      if (r) wantRecipes.push(r);
    }
    const items = await store.list();
    const list = build({
      recipes: wantRecipes, pantry: items, today: today(),
    });
    const visible = shortfallOnly(list);
    if (visible.length === 0) {
      process.stdout.write("# nothing to buy\n");
      return 0;
    }
    process.stdout.write(format({ entries: visible, generatedAt: list.generatedAt }));
    void flagInt;
    return 0;
  },
});

async function menuSlugsForRange(flags: Map<string, string | true>): Promise<string[]> {
  const from = flagStr(flags, "from", today());
  const to = flagStr(flags, "to", from);
  const plan = await menu.load();
  return menu.recipeSlugs(plan, from, to);
}
