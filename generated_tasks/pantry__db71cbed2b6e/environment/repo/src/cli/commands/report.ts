// `pantry report` - dispatcher into per-report subcommands.

import { flagInt, flagStr, parseFlags, register } from "../dispatch.js";
import * as store from "../../core/store.js";
import * as waste from "../../reports/waste.js";
import * as freq from "../../reports/frequent.js";
import * as weekly from "../../reports/weekly.js";
import * as dash from "../../reports/dashboard.js";
import { newTable } from "../../format/table.js";
import { today as todayDate } from "../../core/date.js";

register({
  name: "report",
  short: "view reports (waste/frequent/weekly/dashboard)",
  run: async (args) => {
    const { positional } = parseFlags(args);
    if (positional.length === 0) {
      throw new Error(
        "report: pick one of: waste / frequent / weekly / dashboard",
      );
    }
    const sub = positional[0];
    switch (sub) {
      case "waste":
        return runWaste(args.slice(1));
      case "frequent":
        return runFrequent(args.slice(1));
      case "weekly":
        return runWeekly(args.slice(1));
      case "dashboard":
        return runDashboard();
      default:
        throw new Error(`report: unknown report "${sub}"`);
    }
  },
});

async function runWaste(args: string[]): Promise<number> {
  const { flags } = parseFlags(args);
  const all = await waste.readAll();
  const month = flagStr(flags, "month");
  const filtered = month ? waste.inMonth(all, month) : all;
  const sum = waste.summarise(filtered);
  process.stdout.write(`waste entries: ${sum.totalEntries}\n`);
  process.stdout.write(`by reason:\n`);
  for (const [reason, n] of Object.entries(sum.byReason)) {
    process.stdout.write(`  ${reason.padEnd(10)} ${n}\n`);
  }
  process.stdout.write("top wasted slugs:\n");
  for (const t of waste.topWastedSlugs(filtered, 5)) {
    process.stdout.write(`  ${t.slug.padEnd(20)} ${t.count}\n`);
  }
  return 0;
}

async function runFrequent(args: string[]): Promise<number> {
  const { flags } = parseFlags(args);
  const from = flagStr(flags, "from", "2025-01-01");
  const to = flagStr(flags, "to", todayDate());
  const limit = flagInt(flags, "limit", 20);
  const items = await store.list();
  const r = freq.buildFrequencyReport(items, from, to);
  const top = freq.topN(r, limit);
  const tbl = newTable().setHeader(["slug", "lots", "per30d"]);
  for (const e of top) {
    tbl.addRow(e.slug, String(e.lotCount), String(e.per30Days));
  }
  process.stdout.write(tbl.toString());
  return 0;
}

async function runWeekly(args: string[]): Promise<number> {
  const { flags } = parseFlags(args);
  const from = flagStr(flags, "from", "2025-01-01");
  const to = flagStr(flags, "to", todayDate());
  const items = await store.list();
  const w = await waste.readAll();
  const rows = weekly.build(items, w, from, to);
  const tbl = newTable().setHeader(["week", "items", "lots", "waste"]);
  for (const r of rows) {
    tbl.addRow(r.weekStart, String(r.itemsAdded), String(r.lotsAdded), String(r.wasteEntries));
  }
  process.stdout.write(tbl.toString());
  return 0;
}

async function runDashboard(): Promise<number> {
  const items = await store.list();
  process.stdout.write(dash.render(items, todayDate()));
  return 0;
}
