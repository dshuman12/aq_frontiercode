// pantry - personal kitchen pantry tracker.
import { run } from "./cli/dispatch.js";

import "./cli/commands/add.js";
import "./cli/commands/list.js";
import "./cli/commands/show.js";
import "./cli/commands/rm.js";
import "./cli/commands/use.js";
import "./cli/commands/expiring.js";
import "./cli/commands/shop.js";
import "./cli/commands/export.js";
import "./cli/commands/import.js";
import "./cli/commands/report.js";
import "./cli/commands/config.js";
import "./cli/commands/search.js";
import "./cli/commands/dash.js";
import "./cli/commands/whereis.js";
import "./cli/commands/log.js";
import "./cli/commands/waste.js";
import "./cli/commands/serve.js";
import "./cli/commands/backup.js";
import "./cli/commands/health.js";
import "./cli/commands/which.js";
import "./cli/commands/alerts.js";
import "./cli/commands/predict.js";
import "./cli/commands/plan.js";
import "./cli/commands/suggest.js";
import "./cli/commands/audit.js";
import "./cli/commands/profile.js";
import "./cli/commands/complete.js";

const argv = process.argv.slice(2);
run(argv).catch((err) => {
  process.stderr.write(`pantry: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
