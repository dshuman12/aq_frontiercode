import { afterEach, describe, expect, it } from "vitest";
import { useActiveLibrary } from "./active-library";

afterEach(() => {
  useActiveLibrary.setState({ activeLibraryId: null });
});

describe("useActiveLibrary store", () => {
  it("starts with activeLibraryId=null", () => {
    expect(useActiveLibrary.getState().activeLibraryId).toBeNull();
  });

  it("setActiveLibrary updates the value", () => {
    useActiveLibrary.getState().setActiveLibrary("lib-7");
    expect(useActiveLibrary.getState().activeLibraryId).toBe("lib-7");
  });

  it("setActiveLibrary(null) clears the value", () => {
    useActiveLibrary.getState().setActiveLibrary("lib-7");
    useActiveLibrary.getState().setActiveLibrary(null);
    expect(useActiveLibrary.getState().activeLibraryId).toBeNull();
  });
});
