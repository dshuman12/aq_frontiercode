// `pantry list` - print every item, paged via --limit.

import { flagInt, flagStr, parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import { newTable } from "../../format/table.js";
import { format as fmtQ } from "../../core/units.js";
import { totalQuantity } from "../../core/item.js";

register({
  name: "list",
  short: "list all pantry items",
  run: async (args) => {
    const { flags } = parseFlags(args);
    const limit = flagInt(flags, "limit", 0);
    const where = flagStr(flags, "where");
    const category = flagStr(flags, "category");

    let items = await store.list();
    if (where !== "") {
      items = items.filter((i) => i.lots.some((l) => l.where === where));
    }
    if (category !== "") {
      items = items.filter((i) => i.category === category);
    }
    if (limit > 0 && items.length > limit) {
      items = items.slice(0, limit);
    }

    const tbl = newTable()
      .setHeader(["id", "slug", "name", "lots", "total", "category"]);
    for (const item of items) {
      const total = totalQuantity(item);
      tbl.addRow(
        String(item.id),
        item.slug,
        item.name,
        String(item.lots.length),
        total ? fmtQ(total) : "-",
        item.category ?? "",
      );
    }
    process.stdout.write(tbl.toString());
    return 0;
  },
});
