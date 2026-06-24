// `pantry expiring [--within DAYS]` - list lots expiring inside a window.

import { flagInt, parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import { newTable } from "../../format/table.js";
import { format as fmtQ } from "../../core/units.js";
import { expiringSoon, isExpired } from "../../core/item.js";
import { today } from "../../core/date.js";

register({
  name: "expiring",
  short: "list lots expiring within a window of days",
  run: async (args) => {
    const { flags } = parseFlags(args);
    const within = flagInt(flags, "within", 7);
    const now = today();
    const items = await store.list();

    const tbl = newTable()
      .setHeader(["item", "lot", "qty", "where", "best by", "status"]);
    for (const item of items) {
      for (const lot of expiringSoon(item, now, within)) {
        tbl.addRow(
          item.slug,
          String(lot.id),
          fmtQ(lot.qty),
          lot.where,
          lot.bestBy ?? "",
          isExpired(lot, now) ? "expired" : "soon",
        );
      }
    }
    process.stdout.write(tbl.toString());
    return 0;
  },
});
