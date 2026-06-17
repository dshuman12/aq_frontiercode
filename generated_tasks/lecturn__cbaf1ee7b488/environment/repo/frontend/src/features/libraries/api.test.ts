import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.fn();
vi.mock("~/lib/api-client", () => ({
  api: {
    get: (...a: unknown[]) => stub("get", ...a),
    post: (...a: unknown[]) => stub("post", ...a),
    put: (...a: unknown[]) => stub("put", ...a),
    patch: (...a: unknown[]) => stub("patch", ...a),
    del: (...a: unknown[]) => stub("del", ...a),
  },
}));

import { libraryApi, librariesApi } from "./api";

beforeEach(() => {
  stub.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("librariesApi", () => {
  it("list calls GET /libraries and unwraps items", async () => {
    stub.mockResolvedValue({ items: [{ id: "x" }] });
    const out = await librariesApi.list();
    expect(stub).toHaveBeenCalledWith("get", "/libraries");
    expect(out).toEqual([{ id: "x" }]);
  });

  it("create calls POST /libraries with the body", async () => {
    stub.mockResolvedValue({ id: "y" });
    await librariesApi.create({ name: "L", sourcePath: "/p" });
    expect(stub).toHaveBeenCalledWith("post", "/libraries", {
      name: "L",
      sourcePath: "/p",
    });
  });

  it("update calls PATCH /libraries/:id", async () => {
    stub.mockResolvedValue({ ok: true });
    await librariesApi.update("lib-1", { name: "renamed" });
    expect(stub).toHaveBeenCalledWith("patch", "/libraries/lib-1", { name: "renamed" });
  });

  it("remove calls DEL /libraries/:id", async () => {
    stub.mockResolvedValue(undefined);
    await librariesApi.remove("lib-1");
    expect(stub).toHaveBeenCalledWith("del", "/libraries/lib-1");
  });

  it("shares calls GET /libraries/:id/shares and unwraps items", async () => {
    stub.mockResolvedValue({ items: [{ id: "s" }] });
    const out = await librariesApi.shares("lib-1");
    expect(stub).toHaveBeenCalledWith("get", "/libraries/lib-1/shares");
    expect(out).toEqual([{ id: "s" }]);
  });

  it("invite calls POST /libraries/:id/shares with the body", async () => {
    stub.mockResolvedValue({ id: "s" });
    await librariesApi.invite("lib-1", { email: "x@y.test", role: "viewer" });
    expect(stub).toHaveBeenCalledWith("post", "/libraries/lib-1/shares", {
      email: "x@y.test",
      role: "viewer",
    });
  });

  it("updateShare calls PATCH /libraries/:id/shares/:shareId", async () => {
    stub.mockResolvedValue({ ok: true });
    await librariesApi.updateShare("lib-1", "s-1", "editor");
    expect(stub).toHaveBeenCalledWith(
      "patch",
      "/libraries/lib-1/shares/s-1",
      { role: "editor" },
    );
  });

  it("revokeShare calls DEL /libraries/:id/shares/:shareId", async () => {
    stub.mockResolvedValue(undefined);
    await librariesApi.revokeShare("lib-1", "s-1");
    expect(stub).toHaveBeenCalledWith("del", "/libraries/lib-1/shares/s-1");
  });

  it("leave calls POST /libraries/:id/leave", async () => {
    stub.mockResolvedValue({ ok: true });
    await librariesApi.leave("lib-1");
    expect(stub).toHaveBeenCalledWith("post", "/libraries/lib-1/leave");
  });
});

describe("libraryApi", () => {
  it("sync calls POST /library/sync with the libraryId", async () => {
    stub.mockResolvedValue({ scanned: 0, inserted: 0 });
    await libraryApi.sync("lib-99");
    expect(stub).toHaveBeenCalledWith("post", "/library/sync", { libraryId: "lib-99" });
  });
});
