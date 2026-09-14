import { describe, it, expect } from "vitest";

describe("Milestone 1 Smoke Test", () => {
  it("should verify basic test environment is operational", () => {
    expect(1 + 1).toBe(2);
  });

  it("should verify environment configuration", () => {
    expect(typeof window !== "undefined" || typeof global !== "undefined").toBe(
      true,
    );
  });
});
