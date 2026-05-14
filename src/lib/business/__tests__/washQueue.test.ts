import { describe, it, expect } from "vitest";
import { reorderQueue, addToQueue, removeFromQueue, getFirstInQueue } from "../washQueue";
import type { WashQueueItem } from "@/types";
import { Timestamp } from "firebase/firestore";

function makeItem(id: string, order: number): WashQueueItem {
  return {
    id,
    vehicleId: `v-${id}`,
    vehicleVin: `VIN${id.toUpperCase()}1234567890`,
    vehicleVinShort: "123456",
    vehicleModel: "MG HS",
    vehicleColor: "Biały",
    queueOrder: order,
    orderedBy: "uid1",
    orderedByName: "Michał",
    plannedDeliveryDate: null,
    plannedDeliveryNote: "",
    status: "waiting",
    completedAt: null,
    createdAt: Timestamp.now(),
  };
}

describe("reorderQueue", () => {
  it("moves item from index 0 to index 2", () => {
    const items = [makeItem("a", 1), makeItem("b", 2), makeItem("c", 3)];
    const result = reorderQueue(items, 0, 2);
    expect(result.map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(result.map((i) => i.queueOrder)).toEqual([1, 2, 3]);
  });

  it("no-op when from === to", () => {
    const items = [makeItem("a", 1), makeItem("b", 2)];
    expect(reorderQueue(items, 1, 1)).toEqual(items);
  });

  it("renumbers queueOrder sequentially after reorder", () => {
    const items = [makeItem("a", 1), makeItem("b", 2), makeItem("c", 3)];
    const result = reorderQueue(items, 2, 0);
    expect(result.every((item, i) => item.queueOrder === i + 1)).toBe(true);
  });
});

describe("addToQueue", () => {
  it("appends item with next queueOrder", () => {
    const items = [makeItem("a", 1), makeItem("b", 2)];
    const newItem = makeItem("c", 0); // queueOrder will be overridden
    const { queueOrder: _, ...rest } = newItem;
    const result = addToQueue(items, rest);
    expect(result).toHaveLength(3);
    expect(result[2].queueOrder).toBe(3);
    expect(result[2].id).toBe("c");
  });

  it("assigns queueOrder 1 for empty queue", () => {
    const newItem = makeItem("a", 0);
    const { queueOrder: _, ...rest } = newItem;
    const result = addToQueue([], rest);
    expect(result[0].queueOrder).toBe(1);
  });
});

describe("removeFromQueue", () => {
  it("removes item and renumbers", () => {
    const items = [makeItem("a", 1), makeItem("b", 2), makeItem("c", 3)];
    const result = removeFromQueue(items, "b");
    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
    expect(result.map((i) => i.queueOrder)).toEqual([1, 2]);
  });

  it("returns same list if id not found", () => {
    const items = [makeItem("a", 1)];
    const result = removeFromQueue(items, "nonexistent");
    expect(result).toHaveLength(1);
  });
});

describe("getFirstInQueue", () => {
  it("returns item with lowest queueOrder", () => {
    const items = [makeItem("b", 2), makeItem("a", 1), makeItem("c", 3)];
    expect(getFirstInQueue(items)?.id).toBe("a");
  });

  it("returns null for empty queue", () => {
    expect(getFirstInQueue([])).toBeNull();
  });
});
