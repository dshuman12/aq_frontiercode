// `pantry health` - run sanity checks.

import { register } from "../dispatch.js";
import * as store from "../../core/store.js";
import { check, pretty } from "../../reports/healthcheck.js";

register({
  name: "health",
  short: "sanity-check the store",
  run: async () => {
    const items = await store.list();
    process.stdout.write(pretty(check(items)));
    return 0;
  },
});
