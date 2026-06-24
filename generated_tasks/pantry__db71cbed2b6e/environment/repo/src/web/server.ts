// Tiny HTTP server that exposes the pantry as JSON + a small HTML page.
// LAN-only by design: no auth, no TLS termination.

import http from "node:http";
import { URL } from "node:url";
import { render as renderHTML } from "../exporters/html.js";
import type { Item } from "../core/item.js";

export interface ServerDeps {
  items: () => Promise<Item[]>;
  today: () => string;
}

export function makeHandler(
  deps: ServerDeps,
): (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> {
  return async (req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end("missing url");
      return;
    }
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (url.pathname === "/") {
        const items = await deps.items();
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(renderHTML(items, deps.today()));
        return;
      }
      if (url.pathname === "/api/items") {
        const items = await deps.items();
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(items, null, 2));
        return;
      }
      if (url.pathname === "/api/expiring") {
        const within = Number.parseInt(
          url.searchParams.get("within") ?? "7", 10,
        );
        const items = await deps.items();
        const today = deps.today();
        const out: { itemId: number; lots: unknown[] }[] = [];
        for (const item of items) {
          const lots = (item.lots ?? []).filter((l) => {
            if (!l.bestBy) return false;
            const horizon = isoPlusDays(today, within);
            return l.bestBy >= today && l.bestBy <= horizon;
          });
          if (lots.length > 0) out.push({ itemId: item.id, lots });
        }
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(out, null, 2));
        return;
      }
      res.statusCode = 404;
      res.end("not found");
    } catch (err) {
      res.statusCode = 500;
      res.end((err as Error).message);
    }
  };
}

export function listen(addr: string, deps: ServerDeps): http.Server {
  if (!addr) throw new Error("server: empty addr");
  const [host, portStr] = addr.split(":");
  const port = Number.parseInt(portStr ?? "0", 10);
  if (!Number.isFinite(port)) throw new Error(`server: bad port "${portStr}"`);
  const server = http.createServer(makeHandler(deps));
  server.listen(port, host);
  return server;
}

function isoPlusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
