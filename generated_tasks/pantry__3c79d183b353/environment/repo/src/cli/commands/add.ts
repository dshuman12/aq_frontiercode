// `pantry add` - register a new item with optional initial lot.
//
// Examples:
//   pantry add olive-oil
//   pantry add "Olive Oil" --qty 500ml --where pantry --best-by 2026-09-30
//   pantry add flour --qty 2kg --notes "King Arthur, costco run"

import { flagInt, flagStr, parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import { isValidLocation, type Lot, toSlug } from "../../core/item.js";
import { isISODate, today } from "../../core/date.js";
import { parseQuantity } from "../../core/units.js";

register({
  name: "add",
  short: "register a new pantry item",
  run: async (args) => {
    const { flags, positional } = parseFlags(args);
    if (positional.length === 0) {
      throw new Error("add: name or slug required");
    }
    const nameArg = positional.join(" ").trim();
    const slug = toSlug(nameArg);
    const display = nameArg;
    const qtyRaw = flagStr(flags, "qty");
    const where = flagStr(flags, "where", "pantry");
    const bestBy = flagStr(flags, "best-by");
    const notes = flagStr(flags, "notes");
    const category = flagStr(flags, "category");
    const barcode = flagStr(flags, "barcode");

    if (!isValidLocation(where)) {
      throw new Error(`add: unknown location "${where}"`);
    }
    if (bestBy !== "" && !isISODate(bestBy)) {
      throw new Error(`add: --best-by must be YYYY-MM-DD`);
    }

    const lots: Lot[] = [];
    if (qtyRaw !== "") {
      const q = parseQuantity(qtyRaw);
      const lot: Lot = {
        id: 1,
        qty: q,
        addedAt: today(),
        where,
        source: "manual",
      };
      if (bestBy !== "") lot.bestBy = bestBy;
      if (notes !== "") lot.notes = notes;
      lots.push(lot);
    }

    const item = await store.insert({
      slug,
      name: display,
      category: category === "" ? undefined : category,
      barcode: barcode === "" ? undefined : barcode,
      lots,
    });
    process.stdout.write(`added item ${item.id}: ${item.slug}\n`);
    if (lots.length === 1) {
      process.stdout.write(`  lot 1: ${qtyRaw} in ${where}`);
      if (bestBy !== "") process.stdout.write(`, best by ${bestBy}`);
      process.stdout.write("\n");
    }
    void flagInt;
    return 0;
  },
});
