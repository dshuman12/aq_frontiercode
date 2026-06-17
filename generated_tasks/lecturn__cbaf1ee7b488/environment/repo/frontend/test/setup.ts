import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// jsdom doesn't provide matchMedia; next-themes uses it during init.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// jsdom doesn't implement IntersectionObserver / ResizeObserver — Vidstack
// and Radix touch them at module load time.
class MockObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = () => [];
}
// Cast through unknown so we can stamp these onto globalThis without
// fighting the lib.d.ts shapes.
(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  MockObserver;
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockObserver;

// Stable env for components that read NEXT_PUBLIC_API_URL.
process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
