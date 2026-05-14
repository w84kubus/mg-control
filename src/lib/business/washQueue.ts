import type { WashQueueItem } from "@/types";

export function reorderQueue(
  items: WashQueueItem[],
  fromIndex: number,
  toIndex: number
): WashQueueItem[] {
  if (fromIndex === toIndex) return items;
  const sorted = [...items].sort((a, b) => a.queueOrder - b.queueOrder);
  const [moved] = sorted.splice(fromIndex, 1);
  sorted.splice(toIndex, 0, moved);
  return sorted.map((item, i) => ({ ...item, queueOrder: i + 1 }));
}

export function addToQueue(
  items: WashQueueItem[],
  newItem: Omit<WashQueueItem, "queueOrder">
): WashQueueItem[] {
  const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.queueOrder)) : 0;
  return [...items, { ...newItem, queueOrder: maxOrder + 1 }];
}

export function removeFromQueue(
  items: WashQueueItem[],
  itemId: string
): WashQueueItem[] {
  const filtered = items.filter((i) => i.id !== itemId);
  return filtered.map((item, idx) => ({ ...item, queueOrder: idx + 1 }));
}

export function getFirstInQueue(items: WashQueueItem[]): WashQueueItem | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => a.queueOrder - b.queueOrder)[0];
}
