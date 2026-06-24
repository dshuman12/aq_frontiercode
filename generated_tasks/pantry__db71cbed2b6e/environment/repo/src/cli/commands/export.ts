// `pantry export-md|export-csv|export-html` - dump the pantry.

import { flagStr, parseFlags, register } from "../dispatch.js";
import fs from "node:fs/promises";
import * as store from "../../core/store.js";
import { render as md } from "../../exporters/markdown.js";
import { render as csv } from "../../exporters/csv.js";
import { render as html } from "../../exporters/html.js";
import { today } from "../../core/date.js";

function emitter(name: string, render: (items: any, today: string) => string) {
  return async (args: string[]) => {
    const { flags } = parseFlags(args);
    const out = flagStr(flags, "out");
    const items = await store.list();
    const text = render(items, today());
    if (out) {
      await fs.writeFile(out, text, "utf8");
    } else {
      process.stdout.write(text);
    }
    void name;
    return 0;
  };
}

register({ name: "export-md", short: "export pantry as markdown", run: emitter("md", md) });
register({ name: "export-csv", short: "export pantry as CSV", run: (args) =>
  emitter("csv", (items) => csv(items))(args) });
register({ name: "export-html", short: "export pantry as HTML", run: emitter("html", html) });
