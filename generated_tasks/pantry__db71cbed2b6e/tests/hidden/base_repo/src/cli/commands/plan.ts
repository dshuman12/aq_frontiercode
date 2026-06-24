// `pantry plan add|rm|show` - meal plan management.

import { flagInt, flagStr, parseFlags, register } from "../dispatch.js";
import * as menu from "../../core/menu.js";

register({
  name: "plan",
  short: "manage the meal plan (add/rm/show)",
  run: async (args) => {
    const { flags, positional } = parseFlags(args);
    if (positional[0] === "add") {
      const date = flagStr(flags, "date");
      const meal = flagStr(flags, "meal", "dinner");
      const recipe = flagStr(flags, "recipe");
      const servings = flagInt(flags, "servings", 4);
      if (!date) throw new Error("plan add: --date required");
      if (!recipe) throw new Error("plan add: --recipe required");
      await menu.add({ date, meal, recipeSlug: recipe, servings });
      process.stdout.write("added.\n");
      return 0;
    }
    if (positional[0] === "rm") {
      const date = flagStr(flags, "date");
      if (!date) throw new Error("plan rm: --date required");
      const dropped = await menu.removeByDate(date);
      process.stdout.write(`removed ${dropped} entries\n`);
      return 0;
    }
    if (positional[0] === "show" || positional.length === 0) {
      const plan = await menu.load();
      for (const e of plan.entries) {
        process.stdout.write(
          `${e.date}  ${e.meal.padEnd(8)} ${e.recipeSlug}` +
            (e.servings ? `  (servings: ${e.servings})` : "") + "\n",
        );
      }
      return 0;
    }
    throw new Error(`plan: unknown subcommand ${positional[0]}`);
  },
});
