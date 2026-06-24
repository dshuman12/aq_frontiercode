// `pantry config show|set` - thin wrapper over core/config.

import { parseFlags, register } from "../dispatch.js";
import * as config from "../../core/config.js";

register({
  name: "config",
  short: "view or change config (show/set)",
  run: async (args) => {
    const { positional } = parseFlags(args);
    if (positional.length === 0 || positional[0] === "show") {
      const c = await config.load();
      process.stdout.write(JSON.stringify(c, null, 2) + "\n");
      return 0;
    }
    if (positional[0] === "set") {
      if (positional.length !== 3) {
        throw new Error("config set: expected <field> <value>");
      }
      await config.set(positional[1]!, positional[2]!);
      return 0;
    }
    throw new Error(`config: unknown subcommand ${positional[0]}`);
  },
});
