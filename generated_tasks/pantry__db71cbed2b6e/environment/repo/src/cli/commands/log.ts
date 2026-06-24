// `pantry log [--last N]` - recent change-log events.

import { flagInt, parseFlags, register } from "../dispatch.js";
import * as event from "../../core/event.js";

register({
  name: "log",
  short: "tail of the change log",
  run: async (args) => {
    const { flags } = parseFlags(args);
    const last = flagInt(flags, "last", 25);
    const events = await event.lastN(last);
    for (const e of events) {
      process.stdout.write(event.pretty(e) + "\n");
    }
    return 0;
  },
});
