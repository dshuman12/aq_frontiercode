// Generate shell completion scripts for bash and zsh.

const COMMANDS = [
  "add", "list", "show", "rm", "use", "expiring", "shop",
  "export-md", "export-csv", "export-html", "import-receipt",
  "report", "config", "search", "dash", "whereis", "log",
  "waste", "serve", "backup", "restore", "health", "which",
  "help", "version",
];

const FLAGS_BY_CMD: Record<string, string[]> = {
  add: ["--qty", "--where", "--best-by", "--notes", "--category", "--barcode"],
  list: ["--limit", "--where", "--category"],
  expiring: ["--within"],
  use: ["--qty"],
  search: [],
  shop: ["--from", "--to"],
  report: [],
  "export-md": ["--out"],
  "export-csv": ["--out"],
  "export-html": ["--out"],
  serve: ["--addr"],
  backup: ["--out"],
  restore: ["--into"],
  log: ["--last"],
  waste: ["--slug", "--qty", "--reason", "--date", "--notes"],
};

export function bash(): string {
  const cmds = COMMANDS.join(" ");
  const cases = Object.entries(FLAGS_BY_CMD)
    .map(([cmd, flags]) =>
      `    ${cmd}) COMPREPLY=( $(compgen -W "${flags.join(" ")}" -- "$cur") ) ;;`
    )
    .join("\n");
  return [
    "# pantry bash completion",
    "_pantry_completion() {",
    "  local cur prev",
    "  COMPREPLY=()",
    '  cur="${COMP_WORDS[COMP_CWORD]}"',
    '  prev="${COMP_WORDS[COMP_CWORD-1]}"',
    `  local cmds="${cmds}"`,
    '  if [[ ${COMP_CWORD} -eq 1 ]]; then',
    '    COMPREPLY=( $(compgen -W "$cmds" -- "$cur") )',
    "    return 0",
    "  fi",
    '  case "${COMP_WORDS[1]}" in',
    cases,
    "    *) ;;",
    "  esac",
    "}",
    "complete -F _pantry_completion pantry",
    "",
  ].join("\n");
}

export function zsh(): string {
  return `#compdef pantry
_pantry() {
  local -a cmds
  cmds=(${COMMANDS.map((c) => `'${c}'`).join(" ")})
  _arguments '1: :->cmd' '*::arg:->args'
  case $state in
    cmd) _describe 'command' cmds ;;
    args)
      case $words[1] in
${
    Object.entries(FLAGS_BY_CMD)
      .map(([cmd, flags]) =>
        `        ${cmd}) _values 'flag' ${flags.map((f) => `'${f}'`).join(" ")} ;;`
      )
      .join("\n")
  }
      esac
    ;;
  esac
}
_pantry "$@"
`;
}

export function emit(shell: string): string {
  if (shell === "bash") return bash();
  if (shell === "zsh") return zsh();
  throw new Error(`completion: unsupported shell ${shell}`);
}

export function knownCommands(): readonly string[] {
  return COMMANDS;
}

export function knownShells(): readonly string[] {
  return ["bash", "zsh"];
}
