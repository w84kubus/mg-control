import { describe, it, expect } from "vitest";
import {
  getNextStage,
  canAdvanceStage,
  isResolved,
  canClose,
  getStageIndex,
} from "../damageWorkflow";

describe("getNextStage", () => {
  it("to_report → reported", () => expect(getNextStage("to_report")).toBe("reported"));
  it("reported → accepted_pending", () => expect(getNextStage("reported")).toBe("accepted_pending"));
  it("accepted_pending → resolved", () => expect(getNextStage("accepted_pending")).toBe("resolved"));
  it("resolved → null (final stage)", () => expect(getNextStage("resolved")).toBeNull());
});

describe("canAdvanceStage", () => {
  it("allows advance from non-final stages", () => {
    expect(canAdvanceStage("to_report")).toBe(true);
    expect(canAdvanceStage("reported")).toBe(true);
    expect(canAdvanceStage("accepted_pending")).toBe(true);
  });

  it("blocks advance from resolved", () => {
    expect(canAdvanceStage("resolved")).toBe(false);
  });
});

describe("isResolved", () => {
  it("returns true only for resolved", () => {
    expect(isResolved("resolved")).toBe(true);
    expect(isResolved("to_report")).toBe(false);
    expect(isResolved("accepted_pending")).toBe(false);
  });
});

describe("canClose", () => {
  it("requires accepted_pending + both checkboxes", () => {
    expect(canClose("accepted_pending", true, true)).toBe(true);
  });

  it("rejects if not in accepted_pending", () => {
    expect(canClose("reported", true, true)).toBe(false);
  });

  it("rejects if physically not repaired", () => {
    expect(canClose("accepted_pending", false, true)).toBe(false);
  });

  it("rejects if financially not settled", () => {
    expect(canClose("accepted_pending", true, false)).toBe(false);
  });

  it("rejects if both false", () => {
    expect(canClose("accepted_pending", false, false)).toBe(false);
  });
});

describe("getStageIndex", () => {
  it("returns correct indexes", () => {
    expect(getStageIndex("to_report")).toBe(0);
    expect(getStageIndex("reported")).toBe(1);
    expect(getStageIndex("accepted_pending")).toBe(2);
    expect(getStageIndex("resolved")).toBe(3);
  });
});
