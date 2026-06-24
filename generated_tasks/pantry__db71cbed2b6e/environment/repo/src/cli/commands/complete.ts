// `pantry complete bash|zsh` - emit shell completion script.

import { parseFlags, register } from "../dispatch.js";
import { emit } from "../completion.js";

register({
  name: "complete",
  short: "emit a shell completion script (bash/zsh)",
  run: async (args) => {
    const { positional } = parseFlags(args);
    const shell = positional[0] ?? "bash";
    process.stdout.write(emit(shell));
    return 0;
  },
});
