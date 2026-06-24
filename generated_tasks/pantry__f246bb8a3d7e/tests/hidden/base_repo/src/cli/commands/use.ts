// `pantry use <id-or-slug> --qty 30ml` - subtract from the oldest lot.

import { flagStr, parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import { isZero, parseQuantity, sub } from "../../core/units.js";
import { lotsByExpiry } from "../../core/item.js";

register({
  name: "use",
  short: "consume some quantity from the oldest lot",
  run: async (args) => {
    const { flags, positional } = parseFlags(args);
    if (positional.length !== 1) {
      throw new Error("use: expected one argument (id or slug)");
    }
    const qtyRaw = flagStr(flags, "qty");
    if (qtyRaw === "") {
      throw new Error("use: --qty required");
    }
    const used = parseQuantity(qtyRaw);
    const item = await resolve(positional[0]!);
    if (!item) throw new Error(`use: not found: ${positional[0]}`);
    const lots = lotsByExpiry(item);
    let remaining = used;
    const next = item.lots.map((l) => ({ ...l }));
    for (const lot of lots) {
      const idx = next.findIndex((l) => l.id === lot.id);
      if (idx < 0) continue;
      const cur = next[idx]!;
      if (cur.qty.kind !== remaining.kind) continue;
      if (isZero(remaining)) break;
      const after = sub(cur.qty, remaining);
      const took = sub(cur.qty, after);
      cur.qty = after;
      remaining = sub(remaining, took);
    }
    item.lots = next.filter((l) => !isZero(l.qty));
    await store.update(item);
    process.stdout.write(`used ${qtyRaw} of ${item.slug} (${item.lots.length} lots remain)\n`);
    return 0;
  },
});

async function resolve(arg: string) {
  const id = Number.parseInt(arg, 10);
  if (Number.isFinite(id)) {
    const item = await store.get(id);
    if (item) return item;
  }
  return store.findBySlug(arg);
}
