// `pantry dash` alias for the dashboard report.

import { register } from "../dispatch.js";
import * as store from "../../core/store.js";
import { render } from "../../reports/dashboard.js";
import { today } from "../../core/date.js";

register({
  name: "dash",
  short: "alias for `report dashboard`",
  run: async () => {
    const items = await store.list();
    process.stdout.write(render(items, today()));
    return 0;
  },
});
