import { describe, it, expect } from "vitest";
import { validateVin, normalizeVin, getVinShort } from "../vinValidator";

describe("validateVin", () => {
  it("accepts valid 17-char VIN", () => {
    expect(validateVin("LSVAA2180N2301234").valid).toBe(true);
  });

  it("rejects VIN shorter than 17", () => {
    const result = validateVin("ABC123");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("17 znaków");
  });

  it("rejects VIN longer than 17", () => {
    expect(validateVin("LSVAA2180N23012345678").valid).toBe(false);
  });

  it("rejects VIN with letter I", () => {
    expect(validateVin("LSVAI2180N2301234").valid).toBe(false);
  });

  it("rejects VIN with letter O", () => {
    expect(validateVin("LSVAO2180N2301234").valid).toBe(false);
  });

  it("rejects VIN with letter Q", () => {
    expect(validateVin("LSVAQ2180N2301234").valid).toBe(false);
  });

  it("is case insensitive (trims and uppercases)", () => {
    expect(validateVin("lsvaa2180n2301234").valid).toBe(true);
  });

  it("handles whitespace in input", () => {
    expect(validateVin("  LSVAA2180N2301234  ").valid).toBe(true);
  });
});

describe("getVinShort", () => {
  it("returns last 6 chars uppercase", () => {
    expect(getVinShort("LSVAA2180N2301234")).toBe("301234");
  });
});

describe("normalizeVin", () => {
  it("trims and uppercases", () => {
    expect(normalizeVin("  abc123  ")).toBe("ABC123");
  });
});
