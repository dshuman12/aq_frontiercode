// Tiny stdin Q&A wrapper. Used by `pantry add --interactive` to ask a
// few questions when invoked without flags.

import readline from "node:readline/promises";

export interface AskOptions {
  /** Default value if user just presses enter. */
  default?: string;
  /** Validation; thrown errors are caught and re-prompted (in interactive mode). */
  validate?: (v: string) => void;
  /** Allow blank values (no default). */
  allowBlank?: boolean;
}

export async function ask(question: string, opts: AskOptions = {}): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const suffix = opts.default !== undefined ? ` [${opts.default}]` : "";
    while (true) {
      const raw = (await rl.question(`${question}${suffix}: `)).trim();
      const v = raw === "" ? (opts.default ?? "") : raw;
      if (v === "" && !opts.allowBlank) continue;
      if (opts.validate) {
        try {
          opts.validate(v);
        } catch (err) {
          process.stdout.write(`  ! ${(err as Error).message}\n`);
          continue;
        }
      }
      return v;
    }
  } finally {
    rl.close();
  }
}

export async function confirm(question: string, def: boolean = false): Promise<boolean> {
  const suffix = def ? "[Y/n]" : "[y/N]";
  const v = await ask(question + " " + suffix, {
    default: def ? "y" : "n",
    allowBlank: true,
  });
  return /^y/i.test(v.trim());
}

export async function pickOne(
  question: string,
  options: string[],
): Promise<string> {
  if (options.length === 0) throw new Error("prompt: no options");
  const list = options
    .map((o, i) => `  ${i + 1}. ${o}`)
    .join("\n");
  process.stdout.write(question + "\n" + list + "\n");
  const raw = await ask("pick", {
    validate: (v) => {
      const n = Number.parseInt(v, 10);
      if (!Number.isFinite(n) || n < 1 || n > options.length) {
        throw new Error("pick: out of range");
      }
    },
  });
  const idx = Number.parseInt(raw, 10) - 1;
  return options[idx]!;
}

export function isInteractive(): boolean {
  return process.stdin.isTTY === true;
}
