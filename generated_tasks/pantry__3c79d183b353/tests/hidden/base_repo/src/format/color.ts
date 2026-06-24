// Tiny ANSI color helpers. Honors NO_COLOR and TERM=dumb. No third-party deps.

const RESET = "\x1b[0m";
const CODES = {
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
} as const;

export type ColorName = keyof typeof CODES;

let disabled = computeDisabled();

function computeDisabled(): boolean {
  if (process.env.NO_COLOR) return true;
  if (!process.env.TERM || process.env.TERM === "dumb") return true;
  return false;
}

/** Force colors off; for tests / pipes. */
export function disable(): void {
  disabled = true;
}

/** Force colors on; for tests. */
export function enable(): void {
  disabled = false;
}

export function isEnabled(): boolean {
  return !disabled;
}

function wrap(code: string, s: string): string {
  if (disabled) return s;
  return `${code}${s}${RESET}`;
}

export function bold(s: string): string {
  return wrap(CODES.bold, s);
}

export function dim(s: string): string {
  return wrap(CODES.dim, s);
}

export function red(s: string): string {
  return wrap(CODES.red, s);
}

export function green(s: string): string {
  return wrap(CODES.green, s);
}

export function yellow(s: string): string {
  return wrap(CODES.yellow, s);
}

export function blue(s: string): string {
  return wrap(CODES.blue, s);
}

export function cyan(s: string): string {
  return wrap(CODES.cyan, s);
}

export function magenta(s: string): string {
  return wrap(CODES.magenta, s);
}

export function colorize(name: ColorName, s: string): string {
  return wrap(CODES[name], s);
}
