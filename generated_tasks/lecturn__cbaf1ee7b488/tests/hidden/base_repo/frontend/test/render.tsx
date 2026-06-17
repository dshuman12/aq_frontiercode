import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

// Render helper that wires up QueryClientProvider so components using
// useQuery / useMutation work in isolation. Each call gets its own client
// to keep tests independent.
function makeQc() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithQuery(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const qc = makeQc();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { ...render(ui, { wrapper: Wrapper, ...options }), qc };
}
