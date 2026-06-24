// pantry - personal kitchen pantry tracker.
//
// I started keeping this because every Sunday I'd re-buy paprika even
// though I already had two jars. So this is the small thing I reach for
// before the grocery run, and to log what came home from the market.
import { run } from "./cli/dispatch.js";

// Register subcommands by side-effect import.
import "./cli/commands/add.js";
import "./cli/commands/list.js";
import "./cli/commands/show.js";
import "./cli/commands/rm.js";
import "./cli/commands/use.js";

const argv = process.argv.slice(2);
run(argv).catch((err) => {
  process.stderr.write(`pantry: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
