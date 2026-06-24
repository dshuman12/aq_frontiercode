// `pantry suggest` - rank recipes by what's already covered.

import { flagInt, parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import * as recipes from "../../core/recipe-store.js";
import { format, suggest, topN } from "../../core/meal-suggester.js";

register({
  name: "suggest",
  short: "rank recipes by what's already covered",
  run: async (args) => {
    const { flags } = parseFlags(args);
    const n = flagInt(flags, "limit", 10);
    const items = await store.list();
    const allRecipes = await recipes.list();
    const out = topN(suggest(allRecipes, items), n);
    for (const s of out) process.stdout.write(format(s) + "\n");
    return 0;
  },
});
