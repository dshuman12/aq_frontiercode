// `pantry search "<query>"`.

import { parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import { apply, parse } from "../../core/search.js";
import { newTable } from "../../format/table.js";
import { today } from "../../core/date.js";
import { format as fmtQ } from "../../core/units.js";
import { totalQuantity } from "../../core/item.js";

register({
  name: "search",
  short: "filter items with a small query language",
  run: async (args) => {
    const { positional } = parseFlags(args);
    const q = positional.join(" ");
    if (!q) throw new Error("search: empty query");
    const filter = parse(q);
    const items = await store.list();
    const got = apply(items, filter, today());
    const tbl = newTable().setHeader(["id", "slug", "lots", "total", "category"]);
    for (const item of got) {
      const total = totalQuantity(item);
      tbl.addRow(
        String(item.id),
        item.slug,
        String(item.lots.length),
        total ? fmtQ(total) : "-",
        item.category ?? "",
      );
    }
    process.stdout.write(tbl.toString());
    return 0;
  },
});
