// `pantry which <slug>` - look up a substitution.

import { parseFlags, register } from "../dispatch.js";
import { describe, suggest } from "../../core/substitute.js";

register({
  name: "which",
  short: "show substitutions for a slug",
  run: async (args) => {
    const { positional } = parseFlags(args);
    if (positional.length !== 1) {
      throw new Error("which: expected one slug");
    }
    const got = suggest(positional[0]!);
    if (got.length === 0) {
      process.stdout.write("(no built-in substitutions)\n");
      return 0;
    }
    for (const s of got) {
      process.stdout.write(`- ${describe(s)}\n`);
    }
    return 0;
  },
});
