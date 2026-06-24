// `pantry profile show|set` - household profile.

import { flagInt, flagStr, parseFlags, register } from "../dispatch.js";
import * as profile from "../../core/profile.js";

register({
  name: "profile",
  short: "view or change household profile",
  run: async (args) => {
    const { flags, positional } = parseFlags(args);
    if (positional[0] === "set-size") {
      const n = flagInt(flags, "size", 0);
      if (n <= 0) throw new Error("set-size: --size required");
      await profile.setHouseholdSize(n);
      return 0;
    }
    if (positional[0] === "stock") {
      const slug = flagStr(flags, "slug");
      const min = flagInt(flags, "min", 0);
      const kind = flagStr(flags, "kind", "mass") as
        "mass" | "volume" | "count";
      if (!slug || min <= 0) throw new Error("stock: --slug and --min required");
      await profile.addAlwaysStock({ slug, minQty: min, unitKind: kind });
      return 0;
    }
    const p = await profile.load();
    process.stdout.write(JSON.stringify(p, null, 2) + "\n");
    return 0;
  },
});
