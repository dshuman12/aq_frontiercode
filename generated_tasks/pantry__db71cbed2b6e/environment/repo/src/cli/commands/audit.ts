// `pantry audit` - combined consistency report.

import { register } from "../dispatch.js";
import * as store from "../../core/store.js";
import * as recipes from "../../core/recipe-store.js";
import * as profile from "../../core/profile.js";
import { format, runFullAudit } from "../../reports/audit.js";

register({
  name: "audit",
  short: "full consistency audit (health + duplicates + staples)",
  run: async () => {
    const items = await store.list();
    const allRecipes = await recipes.list();
    const p = await profile.load();
    process.stdout.write(format(runFullAudit({ items, recipes: allRecipes, profile: p })));
    return 0;
  },
});
