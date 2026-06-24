// `pantry waste --slug X --qty 200ml --reason expired` - log a discard.

import { flagStr, parseFlags, register } from "../dispatch.js";
import * as waste from "../../reports/waste.js";
import { parseQuantity } from "../../core/units.js";
import { today } from "../../core/date.js";

register({
  name: "waste",
  short: "log a discarded lot",
  run: async (args) => {
    const { flags } = parseFlags(args);
    const slug = flagStr(flags, "slug");
    const qty = flagStr(flags, "qty");
    const reason = (flagStr(flags, "reason", "expired")) as
      "expired" | "spoiled" | "burnt" | "other";
    const date = flagStr(flags, "date", today());
    const notes = flagStr(flags, "notes");
    if (!slug) throw new Error("waste: --slug required");
    if (!qty) throw new Error("waste: --qty required");
    await waste.append({
      date, slug, qty: parseQuantity(qty), reason,
      ...(notes ? { notes } : {}),
    });
    process.stdout.write("logged.\n");
    return 0;
  },
});
