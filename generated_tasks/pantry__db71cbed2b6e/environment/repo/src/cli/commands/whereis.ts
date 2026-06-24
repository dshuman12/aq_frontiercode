// `pantry whereis <slug>` - did-you-mean lookup with fuzzy fallback.

import { parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import { topMatches } from "../../core/fuzzy.js";

register({
  name: "whereis",
  short: "find an item by slug; suggests near matches if not found",
  run: async (args) => {
    const { positional } = parseFlags(args);
    if (positional.length !== 1) {
      throw new Error("whereis: expected one slug");
    }
    const needle = positional[0]!;
    const item = await store.findBySlug(needle);
    if (item) {
      for (const lot of item.lots) {
        process.stdout.write(`  lot ${lot.id} in ${lot.where}\n`);
      }
      if (item.lots.length === 0) {
        process.stdout.write("  (no lots - item exists but is empty)\n");
      }
      return 0;
    }
    const all = await store.list();
    const slugs = all.map((i) => i.slug);
    const matches = topMatches(needle, slugs, 3);
    process.stdout.write(`not found. did you mean:\n`);
    for (const m of matches) {
      process.stdout.write(`  ${m.candidate}  (distance ${m.distance})\n`);
    }
    return 1;
  },
});
