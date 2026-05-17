"use client";

import { useState, useEffect, Fragment } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { toast } from "react-toastify";
import { Wrench, Plus, X, Search, Trash2, ChevronDown, ChevronUp, User, Calendar } from "lucide-react";
import type {
  ServiceOrder,
  ServiceOrderType,
  ServiceOrderStatus,
  ServiceOrderChannel,
  Vehicle,
} from "@/types";

// ─── Legacy compat ──────────────────────────────────────────────────────────

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

function cycleStatus(current: ServiceOrderStatus): ServiceOrderStatus {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}

/** Get display summary for channels (new) or legacy type field */
function getChannelsSummary(order: ServiceOrder): string {
  if (order.channels && order.channels.length > 0) {
    return order.channels.map((c) => c.name).join(", ");
  }
  // Legacy fallback
  if (order.type) return TYPE_LABELS[order.type] ?? order.type;
  return "—";
}

// ─── Suggested channel names ────────────────────────────────────────────────

// ─── Styles ─────────────────────────────────────────────────────────────────

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

const inputSmStyle: React.CSSProperties = {
  ...inputStyle,
  fontSize: "0.8rem",
  padding: "0.4rem 0.6rem",
  borderRadius: "0.5rem",
};

// ─── Channel Form (inline) ──────────────────────────────────────────────────

function ChannelForm({
  onAdd,
  onCancel,
}: {
  onAdd: (ch: ServiceOrderChannel) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [chargedTo, setChargedTo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Podaj nazwę kanału.");
      return;
    }
    onAdd({
      name: name.trim(),
      price: price.trim(),
      chargedTo: chargedTo.trim(),
      customerName: customerName.trim(),
      customerCode: customerCode.trim(),
    });
    // Reset
    setName("");
    setPrice("");
    setChargedTo("");
    setCustomerName("");
    setCustomerCode("");
  }

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2.5"
      style={{ background: "var(--bg-primary)", border: "1px solid var(--color-accent)" }}
    >
      <p className="text-xs font-bold" style={{ color: "var(--color-accent)" }}>
        Nowy kanał zlecenia
      </p>

      <input
        type="text"
        placeholder="Nazwa kanału"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputSmStyle}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Cena"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={inputSmStyle}
        />
        <input
          type="text"
          placeholder="Na kogo obciążenie"
          value={chargedTo}
          onChange={(e) => setChargedTo(e.target.value)}
          style={inputSmStyle}
        />
        <input
          type="text"
          placeholder="Nazwa klienta"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          style={inputSmStyle}
        />
        <input
          type="text"
          placeholder="Kod klienta"
          value={customerCode}
          onChange={(e) => setCustomerCode(e.target.value)}
          style={inputSmStyle}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium"
          style={{ color: "var(--color-muted)" }}
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          Dodaj kanał
        </button>
      </div>
    </div>
  );
}

// ─── Order Detail (expanded row) ────────────────────────────────────────────

function OrderDetail({ order }: { order: ServiceOrder }) {
  const channels = order.channels ?? [];
  const hasLegacy = !channels.length && order.type;
  const deliveryDate = order.plannedDeliveryDate;

  return (
    <div className="flex flex-col gap-3 px-4 py-3" style={{ background: "var(--bg-primary)" }}>
      {/* Creator info */}
      <div className="flex items-center gap-2">
        <User size={12} style={{ color: "var(--color-muted)" }} />
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          Utworzone przez:{" "}
          <strong style={{ color: "var(--color-text)" }}>{order.orderedByName}</strong>
        </span>
      </div>

      {/* Planned delivery date */}
      {deliveryDate && (
        <div className="flex items-center gap-2">
          <Calendar size={12} style={{ color: "var(--color-muted)" }} />
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            Planowane wydanie:{" "}
            <strong style={{ color: "var(--color-text)" }}>
              {(deliveryDate as unknown as { toDate: () => Date }).toDate
                ? (deliveryDate as unknown as { toDate: () => Date }).toDate().toLocaleDateString("pl-PL")
                : "—"}
            </strong>
          </span>
        </div>
      )}

      {/* Legacy description */}
      {hasLegacy && order.description && (
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          Opis: {order.description}
        </p>
      )}

      {/* Channels table */}
      {channels.length > 0 && (
        <div
          className="rounded-lg overflow-x-auto"
          style={{ border: "1px solid var(--bg-border2)" }}
        >
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
                {["Kanał", "Cena", "Obciążenie", "Klient", "Kod"].map((h) => (
                  <th
                    key={h}
                    className="px-2.5 py-1.5 text-left font-semibold"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((ch, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                  <td className="px-2.5 py-1.5 font-medium" style={{ color: "var(--color-text)" }}>
                    {ch.name}
                  </td>
                  <td className="px-2.5 py-1.5" style={{ color: "var(--color-muted)" }}>
                    {ch.price || "—"}
                  </td>
                  <td className="px-2.5 py-1.5" style={{ color: "var(--color-muted)" }}>
                    {ch.chargedTo || "—"}
                  </td>
                  <td className="px-2.5 py-1.5" style={{ color: "var(--color-muted)" }}>
                    {ch.customerName || "—"}
                  </td>
                  <td className="px-2.5 py-1.5" style={{ color: "var(--color-muted)" }}>
                    {ch.customerCode || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ServiceOrdersPage() {
  const { user } = useAuthStore();
  const { vehicles, subscribe } = useVehiclesStore();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ServiceOrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create modal state
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [channels, setChannels] = useState<ServiceOrderChannel[]>([]);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [plannedDate, setPlannedDate] = useState("");
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

  const openModal = () => {
    setVehicleSearch("");
    setSelectedVehicle(null);
    setChannels([]);
    setShowChannelForm(false);
    setPlannedDate("");
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
    if (channels.length === 0) {
      toast.error("Dodaj przynajmniej jeden kanał zlecenia.");
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "serviceOrders"), {
        vehicleId: selectedVehicle.id,
        vehicleVin: selectedVehicle.vin,
        vehicleModel: selectedVehicle.model,
        channels,
        status: "ordered" as ServiceOrderStatus,
        orderedBy: user.uid,
        orderedByName: user.displayName,
        plannedDeliveryDate: plannedDate
          ? Timestamp.fromDate(new Date(plannedDate + "T00:00:00"))
          : null,
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

  function removeChannel(idx: number) {
    setChannels((prev) => prev.filter((_, i) => i !== idx));
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
    if (search.trim()) {
      const s = search.toLowerCase();
      if (
        !o.vehicleModel.toLowerCase().includes(s) &&
        !o.vehicleVin.toLowerCase().includes(s) &&
        !getChannelsSummary(o).toLowerCase().includes(s)
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
        {user?.role === "logistics" && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            <Plus size={14} /> Nowe zlecenie
          </button>
        )}
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

        {/* Search */}
        <div className="relative w-full max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-muted)" }}
          />
          <input
            type="text"
            placeholder="Szukaj modelu / VIN / kanał…"
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Pojazd</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Kanały</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Status</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Utworzone przez</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Data</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const isExpanded = expandedId === order.id;
                  return (
                    <Fragment key={order.id}>
                      <tr className="group" style={{ borderBottom: isExpanded ? "none" : "1px solid var(--bg-border)" }}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                            {order.vehicleModel}
                          </p>
                          <p className="text-xs font-mono" style={{ color: "var(--color-muted)" }}>
                            {order.vehicleVin.slice(-7)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(order.channels ?? []).length > 0 ? (
                              order.channels.map((ch, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  style={{
                                    background: "var(--bg-primary)",
                                    border: "1px solid var(--bg-border2)",
                                    color: "var(--color-text)",
                                  }}
                                >
                                  {ch.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                                {order.type ? (TYPE_LABELS[order.type] ?? order.type) : "—"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {user?.role === "logistics" ? (
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
                          ) : (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{
                                background: STATUS_COLORS[order.status] + "26",
                                color: STATUS_COLORS[order.status],
                                border: `1px solid ${STATUS_COLORS[order.status]}40`,
                              }}
                            >
                              {STATUS_LABELS[order.status]}
                            </span>
                          )}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                          {order.orderedByName ?? "—"}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                          {order.createdAt?.toDate
                            ? order.createdAt.toDate().toLocaleDateString("pl-PL")
                            : "—"}
                        </td>
                        <td className="px-2 py-3">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : order.id)}
                            className="p-1 rounded-lg hover:opacity-70"
                            style={{ color: "var(--color-muted)" }}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${order.id}-detail`} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                          <td colSpan={6} style={{ padding: 0 }}>
                            <OrderDetail order={order} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto"
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
              {/* ── Vehicle search ── */}
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
                      <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
                        {selectedVehicle.vin.slice(-7)}
                      </span>
                    </span>
                    <button type="button" onClick={() => setSelectedVehicle(null)} style={{ color: "var(--color-muted)" }}>
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
                          maxHeight: "10rem",
                          overflowY: "auto",
                        }}
                      >
                        {modalVehicles.length === 0 ? (
                          <p className="px-3 py-2 text-xs" style={{ color: "var(--color-muted)" }}>
                            Brak wyników
                          </p>
                        ) : (
                          modalVehicles.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => { setSelectedVehicle(v); setVehicleSearch(""); }}
                              className="w-full text-left px-3 py-2 text-xs hover:opacity-70"
                              style={{ borderBottom: "1px solid var(--bg-border)", color: "var(--color-text)" }}
                            >
                              {v.model}{" "}
                              <span className="font-mono" style={{ color: "var(--color-muted)" }}>
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

              {/* ── Channels ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Kanały zlecenia
                </label>

                {/* Added channels list */}
                {channels.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {channels.map((ch, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 rounded-xl"
                        style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                            {ch.name}
                            {ch.price && (
                              <span className="font-normal ml-2" style={{ color: "var(--color-muted)" }}>
                                {ch.price} zł
                              </span>
                            )}
                          </p>
                          <div className="flex gap-2 flex-wrap mt-0.5">
                            {ch.chargedTo && (
                              <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                                Obciążenie: {ch.chargedTo}
                              </span>
                            )}
                            {ch.customerName && (
                              <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                                Klient: {ch.customerName}
                              </span>
                            )}
                            {ch.customerCode && (
                              <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                                Kod: {ch.customerCode}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeChannel(i)}
                          className="p-1 rounded-lg hover:opacity-70 shrink-0 ml-2"
                          style={{ color: "var(--color-danger)" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Channel form or add button */}
                {showChannelForm ? (
                  <ChannelForm
                    onAdd={(ch) => { setChannels((p) => [...p, ch]); setShowChannelForm(false); }}
                    onCancel={() => setShowChannelForm(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowChannelForm(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px dashed var(--bg-border2)",
                      color: "var(--color-accent)",
                    }}
                  >
                    <Plus size={12} /> Dodaj kanał do zlecenia
                  </button>
                )}
              </div>

              {/* ── Planned delivery date ── */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Data planowanego wydania
                </label>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* ── Creator info (auto) ── */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)" }}
              >
                <User size={13} style={{ color: "var(--color-accent)" }} />
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                  Zlecenie utworzy:{" "}
                  <strong style={{ color: "var(--color-text)" }}>{user?.displayName ?? "—"}</strong>
                </span>
              </div>

              {/* ── Buttons ── */}
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
                  disabled={saving || !selectedVehicle || channels.length === 0}
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
