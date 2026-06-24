// `pantry show <id-or-slug>` - print all known fields, including lots.

import { parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import { format as fmtQ } from "../../core/units.js";
import { lotsByExpiry } from "../../core/item.js";

register({
  name: "show",
  short: "show one pantry item with its lots",
  run: async (args) => {
    const { positional } = parseFlags(args);
    if (positional.length !== 1) {
      throw new Error("show: expected one argument (id or slug)");
    }
    const arg = positional[0]!;
    const item = await resolve(arg);
    if (!item) {
      throw new Error(`show: not found: ${arg}`);
    }
    const out = process.stdout;
    out.write(`id:        ${item.id}\n`);
    out.write(`slug:      ${item.slug}\n`);
    out.write(`name:      ${item.name}\n`);
    if (item.category) out.write(`category:  ${item.category}\n`);
    if (item.barcode) out.write(`barcode:   ${item.barcode}\n`);
    out.write(`created:   ${item.createdAt}\n`);
    out.write(`updated:   ${item.updatedAt}\n`);
    if (item.notes) out.write(`notes:     ${item.notes}\n`);
    out.write(`lots:      ${item.lots.length}\n`);
    for (const lot of lotsByExpiry(item)) {
      out.write(`  ${lot.id}. ${fmtQ(lot.qty)} in ${lot.where}`);
      if (lot.bestBy) out.write(`, best by ${lot.bestBy}`);
      if (lot.notes) out.write(`  // ${lot.notes}`);
      out.write("\n");
    }
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
