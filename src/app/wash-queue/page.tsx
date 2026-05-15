"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { reorderQueue } from "@/lib/business/washQueue";
import { toast } from "react-toastify";
import { GripVertical, Plus, X, Droplets, Search } from "lucide-react";
import type { WashQueueItem, Vehicle } from "@/types";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const inputStyle: React.CSSProperties = {
  background: "var(--bg-primary)",
  border: "1px solid var(--bg-border2)",
  borderRadius: "0.75rem",
  color: "var(--color-text)",
  fontSize: "0.875rem",
  padding: "0.5rem 0.75rem",
  outline: "none",
  width: "100%",
};

// ─── Sortable Item ────────────────────────────────────────────────────────────

interface SortableItemProps {
  item: WashQueueItem;
  index: number;
  onStart: (id: string) => void;
  onDone: (id: string) => void;
}

function SortableItem({ item, index, onStart, onDone }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: "var(--bg-surface)",
    border: "1px solid var(--bg-border)",
    borderRadius: "1rem",
    padding: "0.75rem 1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    cursor: isDragging ? "grabbing" : "default",
  };

  const statusColor =
    item.status === "in_progress" ? "#eab308" : item.status === "done" ? "#22c55e" : "#64748b";
  const statusLabel =
    item.status === "in_progress" ? "W trakcie" : item.status === "done" ? "Gotowe" : "Oczekuje";

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing hover:opacity-70"
        style={{ color: "var(--color-muted)", touchAction: "none" }}
        aria-label="Przeciągnij"
      >
        <GripVertical size={16} />
      </button>

      {/* Position badge */}
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: "var(--bg-primary)", color: "var(--color-muted)" }}
      >
        {index + 1}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate" style={{ color: "var(--color-text)" }}>
            {item.vehicleModel}
          </p>
          <span
            className="font-mono text-xs flex-shrink-0"
            style={{ color: "var(--color-muted)" }}
          >
            {item.vehicleVinShort}
          </span>
          {item.vehicleColor && (
            <span className="text-xs flex-shrink-0" style={{ color: "var(--color-muted)" }}>
              · {item.vehicleColor}
            </span>
          )}
        </div>
        {item.plannedDeliveryDate && (
          <p className="text-xs mt-0.5 font-semibold" style={{ color: "#f97316" }}>
            📅 {new Date((item.plannedDeliveryDate as unknown as { seconds: number }).seconds * 1000).toLocaleDateString("pl-PL")}
          </p>
        )}
        {item.plannedDeliveryNote && (
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-muted)" }}>
            {item.plannedDeliveryNote}
          </p>
        )}
      </div>

      {/* Status badge */}
      <span
        className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{
          background: statusColor + "26",
          color: statusColor,
          border: `1px solid ${statusColor}40`,
        }}
      >
        {statusLabel}
      </span>

      {/* Action button */}
      {item.status === "waiting" && (
        <button
          onClick={() => onStart(item.id)}
          className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold"
          style={{ background: "#3b82f626", color: "#3b82f6", border: "1px solid #3b82f640" }}
        >
          Zacznij
        </button>
      )}
      {item.status === "in_progress" && (
        <button
          onClick={() => onDone(item.id)}
          className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold"
          style={{ background: "#22c55e26", color: "#22c55e", border: "1px solid #22c55e40" }}
        >
          Gotowe
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WashQueuePage() {
  const { user } = useAuthStore();
  const { vehicles, subscribe } = useVehiclesStore();

  const [items, setItems] = useState<WashQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Modal state
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  useEffect(() => {
    const q = query(
      collection(db, "washQueue"),
      where("status", "!=", "done"),
      orderBy("status"),
      orderBy("queueOrder", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as WashQueueItem))
          .sort((a, b) => a.queueOrder - b.queueOrder);
        setItems(data);
        setLoading(false);
      },
      () => {
        toast.error("Błąd ładowania kolejki.");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      queueOrder: idx + 1,
    }));
    setItems(reordered);

    // Batch update Firestore
    try {
      const withNewOrder = reorderQueue(items, oldIndex, newIndex);
      await Promise.all(
        withNewOrder.map((item) =>
          updateDoc(doc(db, "washQueue", item.id), { queueOrder: item.queueOrder })
        )
      );
    } catch {
      toast.error("Nie udało się zapisać kolejności.");
    }
  }

  async function handleStart(id: string) {
    try {
      await updateDoc(doc(db, "washQueue", id), {
        status: "in_progress",
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error("Nie udało się zmienić statusu.");
    }
  }

  async function handleDone(id: string) {
    try {
      await updateDoc(doc(db, "washQueue", id), {
        status: "done",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error("Nie udało się zmienić statusu.");
    }
  }

  const openModal = () => {
    setVehicleSearch("");
    setSelectedVehicle(null);
    setDeliveryNote("");
    setPlannedDate("");
    setShowModal(true);
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicle) {
      toast.error("Wybierz pojazd.");
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.queueOrder)) : 0;
      await addDoc(collection(db, "washQueue"), {
        vehicleId: selectedVehicle.id,
        vehicleVin: selectedVehicle.vin,
        vehicleVinShort: selectedVehicle.vinShort,
        vehicleModel: selectedVehicle.model,
        vehicleColor: selectedVehicle.color,
        queueOrder: maxOrder + 1,
        orderedBy: user.uid,
        orderedByName: user.displayName,
        plannedDeliveryDate: plannedDate ? new Date(plannedDate) : null,
        plannedDeliveryNote: deliveryNote.trim(),
        status: "waiting",
        completedAt: null,
        createdAt: serverTimestamp(),
      });
      toast.success("Dodano do kolejki.");
      setShowModal(false);
    } catch {
      toast.error("Nie udało się dodać do kolejki.");
    } finally {
      setSaving(false);
    }
  }

  const modalVehicles = vehicles
    .filter((v) =>
      vehicleSearch.trim()
        ? v.vin.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
          v.model.toLowerCase().includes(vehicleSearch.toLowerCase())
        : true
    )
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Droplets size={22} style={{ color: "var(--color-accent)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            Kolejka myjni
          </h1>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Plus size={14} /> Dodaj do kolejki
        </button>
      </div>

      {/* Queue list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "var(--color-accent)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      ) : items.length === 0 ? (
        <div
          className="rounded-2xl flex items-center justify-center py-16"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Kolejka jest pusta. Dodaj pierwszy pojazd powyżej.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {items.map((item, index) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  index={index}
                  onStart={handleStart}
                  onDone={handleDone}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
                Dodaj do kolejki myjni
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:opacity-70"
                style={{ color: "var(--color-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              {/* Vehicle search */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Pojazd (VIN / model)
                </label>
                {selectedVehicle ? (
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-sm"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--color-accent)",
                      color: "var(--color-text)",
                    }}
                  >
                    <span>
                      {selectedVehicle.model}{" "}
                      <span
                        className="font-mono text-xs"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {selectedVehicle.vinShort}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedVehicle(null)}
                      style={{ color: "var(--color-muted)" }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--color-muted)" }}
                      />
                      <input
                        type="text"
                        placeholder="Wpisz VIN lub model…"
                        value={vehicleSearch}
                        onChange={(e) => setVehicleSearch(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: "2rem" }}
                      />
                    </div>
                    {vehicleSearch.trim() && (
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{
                          background: "var(--bg-primary)",
                          border: "1px solid var(--bg-border2)",
                          maxHeight: "12rem",
                          overflowY: "auto",
                        }}
                      >
                        {modalVehicles.length === 0 ? (
                          <p
                            className="px-3 py-2 text-xs"
                            style={{ color: "var(--color-muted)" }}
                          >
                            Brak wyników
                          </p>
                        ) : (
                          modalVehicles.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                setSelectedVehicle(v);
                                setVehicleSearch("");
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:opacity-70"
                              style={{
                                borderBottom: "1px solid var(--bg-border)",
                                color: "var(--color-text)",
                              }}
                            >
                              {v.model}{" "}
                              <span
                                className="font-mono"
                                style={{ color: "var(--color-muted)" }}
                              >
                                {v.vinShort}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Planned delivery date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Planowana data wydania (opcjonalnie)
                </label>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Delivery note */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Notatka (opcjonalnie)
                </label>
                <textarea
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  rows={2}
                  placeholder="np. Wydanie do 12:00…"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--bg-border2)",
                    color: "var(--color-muted)",
                  }}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedVehicle}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                  {saving ? "Dodawanie…" : "Dodaj do kolejki"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
