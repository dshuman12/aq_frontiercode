// `pantry rm <id-or-slug>` - remove an item entirely.

import { parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";

register({
  name: "rm",
  short: "remove an item",
  run: async (args) => {
    const { positional } = parseFlags(args);
    if (positional.length !== 1) {
      throw new Error("rm: expected one argument (id or slug)");
    }
    const arg = positional[0]!;
    let id: number | null = null;
    const maybeID = Number.parseInt(arg, 10);
    if (Number.isFinite(maybeID)) {
      id = maybeID;
    } else {
      const item = await store.findBySlug(arg);
      if (item) id = item.id;
    }
    if (id === null) {
      throw new Error(`rm: not found: ${arg}`);
    }
    await store.remove(id);
    process.stdout.write(`removed item ${id}\n`);
    return 0;
  },
});
