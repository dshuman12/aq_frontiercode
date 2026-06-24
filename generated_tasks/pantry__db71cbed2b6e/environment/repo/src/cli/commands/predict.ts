// `pantry predict` - forecast days-remaining per item from change-log usage.

import { flagInt, parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import * as event from "../../core/event.js";
import { forecast, fromEvents } from "../../reports/forecast.js";
import { newTable } from "../../format/table.js";
import { today } from "../../core/date.js";

register({
  name: "predict",
  short: "forecast 'days remaining' per item",
  run: async (args) => {
    const { flags } = parseFlags(args);
    const window = flagInt(flags, "window", 30);
    const items = await store.list();
    const events = await event.readAll();
    const usage = fromEvents(events);
    const out = forecast(items, usage, today(), window);
    const tbl = newTable().setHeader(["slug", "remaining", "burn/day", "days", "out by"]);
    for (const e of out) {
      tbl.addRow(
        e.slug,
        `${e.remaining} ${e.unit}`,
        e.burnPerDay === 0 ? "-" : String(e.burnPerDay),
        Number.isFinite(e.daysRemaining) ? String(e.daysRemaining) : "infinity",
        e.estimatedOutAt,
      );
    }
    process.stdout.write(tbl.toString());
    return 0;
  },
});
