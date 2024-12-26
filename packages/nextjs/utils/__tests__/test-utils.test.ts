import { sum } from "../test-utils";
import { describe, expect, it } from "vitest";

describe("sum", () => {
  it("adds two numbers correctly", () => {
    expect(sum(1, 2)).toBe(3);
    expect(sum(-1, 1)).toBe(0);
    expect(sum(0, 0)).toBe(0);
  });
});
