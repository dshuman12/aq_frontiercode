// Tiny built-in CLI dispatcher - no commander, no yargs, no surprises.

export type CommandHandler = (args: string[]) => Promise<number | void>;

export interface Command {
  name: string;
  short: string;
  run: CommandHandler;
}

const registry = new Map<string, Command>();

/** Register a subcommand. Re-registering the same name throws. */
export function register(c: Command): void {
  if (!c.name) throw new Error("dispatch: command name required");
  if (typeof c.run !== "function") {
    throw new Error("dispatch: command run must be a function");
  }
  if (registry.has(c.name)) {
    throw new Error(`dispatch: duplicate command ${c.name}`);
  }
  registry.set(c.name, c);
}

/** Clear the registry. For tests only. */
export function reset(): void {
  registry.clear();
}

/** Sorted command names. */
export function listCommands(): string[] {
  return [...registry.keys()].sort();
}

export const VERSION = "0.1.0";

export async function run(argv: string[]): Promise<number | void> {
  if (argv.length === 0) {
    printUsage();
    return 0;
  }
  const head = argv[0]!;
  if (head === "-h" || head === "--help" || head === "help") {
    printUsage();
    return 0;
  }
  if (head === "-v" || head === "--version" || head === "version") {
    process.stdout.write(`pantry ${VERSION}\n`);
    return 0;
  }
  const cmd = registry.get(head);
  if (!cmd) {
    throw new Error(`unknown subcommand "${head}" (try "pantry help")`);
  }
  const rc = await cmd.run(argv.slice(1));
  return rc ?? 0;
}

function printUsage(): void {
  const out = process.stdout;
  out.write(`pantry ${VERSION} - personal kitchen pantry tracker\n\n`);
  out.write(`usage: pantry <command> [options]\n\n`);
  out.write(`commands:\n`);
  for (const name of listCommands()) {
    const c = registry.get(name)!;
    out.write(`  ${name.padEnd(14)} ${c.short}\n`);
  }
  out.write(`\nrun 'pantry <command> --help' for command-specific options.\n`);
}

/** Parse a slice of argv into (flags, positionals). Trivially scoped. */
export function parseFlags(
  args: string[],
): { flags: Map<string, string | true>; positional: string[] } {
  const flags = new Map<string, string | true>();
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--") {
      positional.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) {
        flags.set(a.slice(2, eq), a.slice(eq + 1));
      } else if (i + 1 < args.length && !args[i + 1]!.startsWith("-")) {
        flags.set(a.slice(2), args[++i]!);
      } else {
        flags.set(a.slice(2), true);
      }
    } else if (a.startsWith("-") && a.length > 1) {
      flags.set(a.slice(1), true);
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

/** Read a flag's value as a string, or default. Always-true flags map to "". */
export function flagStr(
  flags: Map<string, string | true>,
  name: string,
  def = "",
): string {
  const v = flags.get(name);
  if (v === undefined) return def;
  if (v === true) return "";
  return v;
}

/** Read a flag's value as an int, with default. */
export function flagInt(
  flags: Map<string, string | true>,
  name: string,
  def: number,
): number {
  const v = flags.get(name);
  if (v === undefined || v === true) return def;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

/** Read a flag as a boolean (presence = true unless explicit false). */
export function flagBool(
  flags: Map<string, string | true>,
  name: string,
): boolean {
  const v = flags.get(name);
  if (v === undefined) return false;
  if (v === true) return true;
  return v !== "false" && v !== "0";
}
