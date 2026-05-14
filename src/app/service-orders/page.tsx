"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { toast } from "react-toastify";
import { Wrench, Plus, X, Search } from "lucide-react";
import type {
  ServiceOrder,
  ServiceOrderType,
  ServiceOrderStatus,
  AppUser,
  Vehicle,
} from "@/types";

const TYPE_LABELS: Record<ServiceOrderType, string> = {
  pdi: "PDI",
  wash: "Mycie",
  ceramic: "Ceramika",
  accessory: "Akcesoria",
  other: "Inne",
};

const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  ordered: "Zlecone",
  in_progress: "W toku",
  partial: "Częściowo",
  ready: "Gotowe",
};

const STATUS_COLORS: Record<ServiceOrderStatus, string> = {
  ordered: "#3b82f6",
  in_progress: "#eab308",
  partial: "#a78bfa",
  ready: "#22c55e",
};

const STATUS_ORDER: ServiceOrderStatus[] = ["ordered", "in_progress", "partial", "ready"];
const ALL_TYPES: ServiceOrderType[] = ["pdi", "wash", "ceramic", "accessory", "other"];

function cycleStatus(current: ServiceOrderStatus): ServiceOrderStatus {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}

interface Mechanic {
  uid: string;
  displayName: string;
}

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

export default function ServiceOrdersPage() {
  const { user } = useAuthStore();
  const { vehicles, subscribe } = useVehiclesStore();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ServiceOrderStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ServiceOrderType | "all">("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);

  // Create modal state
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [orderType, setOrderType] = useState<ServiceOrderType>("pdi");
  const [description, setDescription] = useState("");
  const [mechanicUid, setMechanicUid] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  useEffect(() => {
    const q = query(collection(db, "serviceOrders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceOrder)));
        setLoading(false);
      },
      () => {
        toast.error("Błąd ładowania zleceń.");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const loadMechanics = useCallback(async () => {
    if (mechanics.length > 0) return;
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "mechanic"))
      );
      setMechanics(
        snap.docs.map((d) => ({
          uid: d.id,
          displayName: (d.data() as AppUser).displayName,
        }))
      );
    } catch {
      // silently ignore
    }
  }, [mechanics.length]);

  const openModal = () => {
    loadMechanics();
    setVehicleSearch("");
    setSelectedVehicle(null);
    setOrderType("pdi");
    setDescription("");
    setMechanicUid("");
    setShowModal(true);
  };

  async function handleStatusClick(order: ServiceOrder) {
    const next = cycleStatus(order.status);
    try {
      await updateDoc(doc(db, "serviceOrders", order.id), {
        status: next,
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error("Nie udało się zmienić statusu.");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicle) {
      toast.error("Wybierz pojazd.");
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const mechanic = mechanics.find((m) => m.uid === mechanicUid) ?? null;
      await addDoc(collection(db, "serviceOrders"), {
        vehicleId: selectedVehicle.id,
        vehicleVin: selectedVehicle.vin,
        vehicleModel: selectedVehicle.model,
        type: orderType,
        status: "ordered" as ServiceOrderStatus,
        description: description.trim(),
        orderedBy: user.uid,
        orderedByName: user.displayName,
        assignedMechanicUid: mechanic?.uid ?? null,
        assignedMechanicName: mechanic?.displayName ?? null,
        plannedDeliveryDate: null,
        completionDate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Zlecenie utworzone.");
      setShowModal(false);
    } catch {
      toast.error("Nie udało się utworzyć zlecenia.");
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

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (typeFilter !== "all" && o.type !== typeFilter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (
        !o.vehicleModel.toLowerCase().includes(s) &&
        !o.vehicleVin.toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Wrench size={22} style={{ color: "var(--color-accent)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            Zlecenia serwisowe
          </h1>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Plus size={14} /> Nowe zlecenie
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          {(["all", ...STATUS_ORDER] as (ServiceOrderStatus | "all")[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-opacity"
              style={{
                background:
                  statusFilter === s
                    ? s === "all"
                      ? "var(--color-accent)"
                      : STATUS_COLORS[s as ServiceOrderStatus]
                    : "var(--bg-surface)",
                color: statusFilter === s ? "#fff" : "var(--color-muted)",
                border: "1px solid var(--bg-border)",
              }}
            >
              {s === "all" ? "Wszystkie" : STATUS_LABELS[s as ServiceOrderStatus]}
            </button>
          ))}
        </div>

        {/* Type chips */}
        <div className="flex flex-wrap gap-2">
          {(["all", ...ALL_TYPES] as (ServiceOrderType | "all")[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-opacity"
              style={{
                background: typeFilter === t ? "var(--bg-border2)" : "var(--bg-surface)",
                color: typeFilter === t ? "var(--color-text)" : "var(--color-muted)",
                border: "1px solid var(--bg-border)",
              }}
            >
              {t === "all" ? "Wszystkie typy" : TYPE_LABELS[t as ServiceOrderType]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-muted)" }}
          />
          <input
            type="text"
            placeholder="Szukaj modelu / VIN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: "2rem" }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
      >
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
        ) : filtered.length === 0 ? (
          <p
            className="px-6 py-10 text-sm text-center"
            style={{ color: "var(--color-muted)" }}
          >
            Brak zleceń spełniających kryteria.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--bg-border)" }}>
                  {["Pojazd", "Typ", "Status", "Mechanik", "Data"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                        {order.vehicleModel}
                      </p>
                      <p
                        className="text-xs font-mono"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {order.vehicleVin.slice(-7)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                      {TYPE_LABELS[order.type]}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleStatusClick(order)}
                        title="Kliknij aby zmienić status"
                        className="px-2 py-0.5 rounded-full text-xs font-semibold hover:opacity-75 transition-opacity"
                        style={{
                          background: STATUS_COLORS[order.status] + "26",
                          color: STATUS_COLORS[order.status],
                          border: `1px solid ${STATUS_COLORS[order.status]}40`,
                        }}
                      >
                        {STATUS_LABELS[order.status]}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                      {order.assignedMechanicName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                      {order.createdAt?.toDate
                        ? order.createdAt.toDate().toLocaleDateString("pl-PL")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
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
                Nowe zlecenie serwisowe
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:opacity-70"
                style={{ color: "var(--color-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {/* Vehicle search */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--color-muted)" }}
                >
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
                        {selectedVehicle.vin.slice(-7)}
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
                                {v.vin.slice(-7)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Type */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--color-muted)" }}
                >
                  Typ zlecenia
                </label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as ServiceOrderType)}
                  style={inputStyle}
                >
                  {ALL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--color-muted)" }}
                >
                  Opis
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Opis prac do wykonania…"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              {/* Mechanic */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--color-muted)" }}
                >
                  Mechanik (opcjonalnie)
                </label>
                <select
                  value={mechanicUid}
                  onChange={(e) => setMechanicUid(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— Brak przypisania —</option>
                  {mechanics.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
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
                  {saving ? "Zapisywanie…" : "Utwórz zlecenie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
