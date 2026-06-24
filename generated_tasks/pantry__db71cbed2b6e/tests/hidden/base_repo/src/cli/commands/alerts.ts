// `pantry alerts` - list current "you might want to look" warnings.

import { register } from "../dispatch.js";
import * as store from "../../core/store.js";
import { compute, format } from "../../reports/alerts.js";
import { today } from "../../core/date.js";

register({
  name: "alerts",
  short: "show 'you might want to look' warnings",
  run: async () => {
    const items = await store.list();
    const alerts = compute(items, { today: today() });
    if (alerts.length === 0) {
      process.stdout.write("(no alerts)\n");
      return 0;
    }
    for (const a of alerts) process.stdout.write(format(a) + "\n");
    return 0;
  },
});
