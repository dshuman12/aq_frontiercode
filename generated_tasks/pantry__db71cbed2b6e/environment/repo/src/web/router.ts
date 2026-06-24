// Tiny URL-pattern matcher used by the web server to dispatch requests.

export interface Route {
  method: "GET" | "POST" | "DELETE" | "PUT";
  pattern: string;
  handler: (params: Record<string, string>) => Promise<string> | string;
}

export class Router {
  private routes: Route[] = [];

  add(r: Route): this {
    this.routes.push(r);
    return this;
  }

  /** Find a matching route. Returns null if nothing matches. */
  match(method: string, path: string): { route: Route; params: Record<string, string> } | null {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const params = matchPath(r.pattern, path);
      if (params !== null) return { route: r, params };
    }
    return null;
  }

  list(): Route[] {
    return this.routes.slice();
  }
}

function matchPath(pattern: string, path: string): Record<string, string> | null {
  const pParts = pattern.split("/").filter(Boolean);
  const aParts = path.split("/").filter(Boolean);
  if (pParts.length !== aParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pParts.length; i++) {
    const p = pParts[i]!;
    const a = aParts[i]!;
    if (p.startsWith(":")) {
      params[p.slice(1)] = decodeURIComponent(a);
    } else if (p !== a) {
      return null;
    }
  }
  return params;
}

export function newRouter(): Router {
  return new Router();
}

export function patternToRegex(pattern: string): RegExp {
  const parts = pattern.split("/").filter(Boolean).map((p) =>
    p.startsWith(":") ? "([^/]+)" : p
  );
  return new RegExp(`^/${parts.join("/")}/?$`);
}
