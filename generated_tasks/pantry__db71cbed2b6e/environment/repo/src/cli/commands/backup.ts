// `pantry backup --out FILE` and `restore FILE [--into DIR]`.

import fs from "node:fs/promises";
import { flagStr, parseFlags, register } from "../dispatch.js";
import { build, parse, restore as restoreInto, serialize, totalBytes } from "../../core/archive.js";

register({
  name: "backup",
  short: "bundle the data dir into a JSON archive",
  run: async (args) => {
    const { flags } = parseFlags(args);
    const out = flagStr(flags, "out");
    if (!out) throw new Error("backup: --out required");
    const a = await build();
    await fs.writeFile(out, serialize(a), "utf8");
    process.stdout.write(`wrote ${a.entries.length} files (${totalBytes(a)} bytes) to ${out}\n`);
    return 0;
  },
});

register({
  name: "restore",
  short: "extract a JSON archive into a directory",
  run: async (args) => {
    const { flags, positional } = parseFlags(args);
    if (positional.length !== 1) {
      throw new Error("restore: expected one archive path");
    }
    const into = flagStr(flags, "into", ".");
    const text = await fs.readFile(positional[0]!, "utf8");
    const a = parse(text);
    const n = await restoreInto(a, into);
    process.stdout.write(`restored ${n} files into ${into}\n`);
    return 0;
  },
});
