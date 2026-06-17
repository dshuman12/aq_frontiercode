import { Card, CardBody, CardMeta, CardTitle } from "~/components/ui/card";
import { ApiStatus } from "./api-status";

export default function ConnectionPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-2xl font-semibold">Connection</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          API endpoint and reachability status.
        </p>
      </header>

      <Card>
        <CardBody className="space-y-1">
          <CardTitle className="text-base">API endpoint</CardTitle>
          <CardMeta className="font-mono text-xs break-all">
            {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}
          </CardMeta>
        </CardBody>
      </Card>
      <ApiStatus />
    </div>
  );
}
