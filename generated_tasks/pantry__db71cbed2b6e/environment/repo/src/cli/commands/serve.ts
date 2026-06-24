// `pantry serve [--addr 127.0.0.1:8088]` - tiny HTTP UI.

import { flagStr, parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import { listen } from "../../web/server.js";
import { today } from "../../core/date.js";

register({
  name: "serve",
  short: "run a tiny HTTP UI on the LAN",
  run: async (args) => {
    const { flags } = parseFlags(args);
    const addr = flagStr(flags, "addr", "127.0.0.1:8088");
    listen(addr, { items: store.list, today });
    process.stdout.write(`listening on http://${addr}\n`);
    // Hold the process open. The server itself is owned by Node's
    // active-handle accounting.
    return new Promise<number>(() => undefined);
  },
});
