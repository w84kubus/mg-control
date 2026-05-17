import { describe, it, expect } from "vitest";
import { validateDrop, canUserMoveVehicle, canChangeQueueOrder } from "../validateDrop";
import type { Zone } from "@/types";

function makeZone(overrides: Partial<Zone>): Zone {
  return {
    id: "strefa_1",
    name: "Strefa 1",
    type: "strict",
    area: "plac",
    capacity: 9,
    currentCount: 0,
    svgElementId: null,
    ...overrides,
  };
}

describe("validateDrop", () => {
  describe("blocked zones", () => {
    it("rejects any role from blocked zone", () => {
      const zone = makeZone({ type: "blocked", capacity: 0 });
      expect(validateDrop(zone, "logistics").allowed).toBe(false);
      expect(validateDrop(zone, "advisor").allowed).toBe(false);
      expect(validateDrop(zone, "salesperson").allowed).toBe(false);
    });

    it("returns correct message for blocked zone", () => {
      const zone = makeZone({ type: "blocked" });
      expect(validateDrop(zone, "logistics").message).toBe(
        "Ta strefa nie jest przeznaczona do parkowania aut."
      );
    });
  });

  describe("advisor forbidden zones", () => {
    const forbiddenIds = ["salon", "wydawka", "myjnia_salon", "garaz"];

    forbiddenIds.forEach((id) => {
      it(`rejects advisor from ${id}`, () => {
        const zone = makeZone({ id, type: "strict", capacity: 10 });
        expect(validateDrop(zone, "advisor").allowed).toBe(false);
        expect(validateDrop(zone, "advisor").message).toBe(
          "Nie masz uprawnień do przemieszczania aut do tej strefy."
        );
      });

      it(`allows logistics to ${id}`, () => {
        const zone = makeZone({ id, type: "strict", capacity: 10, currentCount: 0 });
        expect(validateDrop(zone, "logistics").allowed).toBe(true);
      });
    });
  });

  describe("strict zone capacity", () => {
    it("rejects when zone is full", () => {
      const zone = makeZone({ type: "strict", capacity: 9, currentCount: 9 });
      expect(validateDrop(zone, "logistics").allowed).toBe(false);
      expect(validateDrop(zone, "logistics").message).toBe(
        "Strefa jest pełna – brak wolnych miejsc."
      );
    });

    it("allows when zone has space", () => {
      const zone = makeZone({ type: "strict", capacity: 9, currentCount: 8 });
      expect(validateDrop(zone, "logistics").allowed).toBe(true);
    });

    it("allows when zone is exactly at 0", () => {
      const zone = makeZone({ type: "strict", capacity: 4, currentCount: 0 });
      expect(validateDrop(zone, "logistics").allowed).toBe(true);
    });
  });

  describe("flexible zones", () => {
    it("always allows flexible zone regardless of count", () => {
      const zone = makeZone({ type: "flexible", capacity: null, currentCount: 999 });
      expect(validateDrop(zone, "logistics").allowed).toBe(true);
      expect(validateDrop(zone, "salesperson").allowed).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("allows advisor to flexible non-forbidden zone", () => {
      const zone = makeZone({ id: "strefa_2", type: "flexible", capacity: null });
      expect(validateDrop(zone, "advisor").allowed).toBe(true);
    });

    it("allows advisor to strict non-forbidden zone with space", () => {
      const zone = makeZone({ id: "hala_1", type: "strict", capacity: 4, currentCount: 2 });
      expect(validateDrop(zone, "advisor").allowed).toBe(true);
    });
  });
});

describe("canUserMoveVehicle", () => {
  it("allows logistics", () => expect(canUserMoveVehicle("logistics")).toBe(true));
  it("allows advisor", () => expect(canUserMoveVehicle("advisor")).toBe(true));
  it("denies salesperson", () => expect(canUserMoveVehicle("salesperson")).toBe(false));
  it("denies detailer", () => expect(canUserMoveVehicle("detailer")).toBe(false));
});

describe("canChangeQueueOrder", () => {
  it("allows only logistics", () => {
    expect(canChangeQueueOrder("logistics")).toBe(true);
    expect(canChangeQueueOrder("salesperson")).toBe(false);
    expect(canChangeQueueOrder("advisor")).toBe(false);
    expect(canChangeQueueOrder("detailer")).toBe(false);
  });
});
