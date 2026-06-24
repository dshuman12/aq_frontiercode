export function StatusBadge({ status }: { status: "ok" | "warning" | "critical" }) {
  return <span data-status={status}>{status}</span>;
}
