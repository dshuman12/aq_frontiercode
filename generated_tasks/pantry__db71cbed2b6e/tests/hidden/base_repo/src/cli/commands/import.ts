// `pantry import-receipt <file>` - import a receipt-style CSV.

import { parseFlags, register } from "../dispatch.js";
import fs from "node:fs/promises";
import * as store from "../../core/store.js";
import { readReceiptCSV } from "../../importers/receipt.js";

register({
  name: "import-receipt",
  short: "import a receipt-style CSV file",
  run: async (args) => {
    const { positional } = parseFlags(args);
    if (positional.length !== 1) {
      throw new Error("import-receipt: expected one file path");
    }
    const text = await fs.readFile(positional[0]!, "utf8");
    const r = readReceiptCSV(text);
    for (const it of r.added) {
      const existing = await store.findBySlug(it.slug);
      if (existing) {
        const lotId = (existing.lots.at(-1)?.id ?? 0) + 1;
        existing.lots.push({ ...it.lot, id: lotId });
        await store.update(existing);
      } else {
        await store.insert({
          slug: it.slug, name: it.name,
          ...(it.category ? { category: it.category } : {}),
          lots: [it.lot],
        });
      }
    }
    process.stdout.write(`imported ${r.added.length} entries (${r.skipped} skipped)\n`);
    for (const w of r.warnings) process.stderr.write("warning: " + w + "\n");
    return 0;
  },
});
