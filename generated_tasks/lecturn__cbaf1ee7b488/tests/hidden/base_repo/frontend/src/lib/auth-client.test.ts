import { describe, expect, it, vi } from "vitest";

vi.mock("better-auth/react", () => ({
  createAuthClient: vi.fn(() => ({
    signIn: { email: vi.fn(), magicLink: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
    useSession: vi.fn(),
  })),
}));
vi.mock("better-auth/client/plugins", () => ({
  magicLinkClient: vi.fn(() => ({})),
}));

describe("auth-client module", () => {
  it("constructs an authClient and re-exports the standard surface", async () => {
    const mod = await import("./auth-client");
    expect(mod.authClient).toBeDefined();
    expect(typeof mod.signIn).toBeDefined();
    expect(typeof mod.signUp).toBeDefined();
    expect(typeof mod.signOut).toBeDefined();
    expect(typeof mod.useSession).toBeDefined();
  });

  it("calls createAuthClient with the API base URL", async () => {
    await import("./auth-client");
    const mod = await import("better-auth/react");
    expect(mod.createAuthClient).toHaveBeenCalled();
    const config = (mod.createAuthClient as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]?.[0];
    expect(config).toMatchObject({ baseURL: expect.stringContaining(":4000") });
  });
});
