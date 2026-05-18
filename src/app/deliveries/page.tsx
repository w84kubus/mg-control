"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import {
  Truck,
  Plus,
  X,
  Phone,
  Package,
  CheckCircle,
  ScanLine,
  Trash2,
  Car,
} from "lucide-react";
import dynamic from "next/dynamic";

const BarcodeScannerInline = dynamic(
  () => import("@/components/scanner/BarcodeScannerInline"),
  { ssr: false }
);

const MG_MODELS = [
  "HS HEV", "HS", "HS PHEV", "ZS HEV", "ZS",
  "MG3", "MG4 EV", "MG S5 EV", "MG S6 EV", "MG S9 PHEV", "CYBERSTER",
];

interface PlannedVehicle {
  vin: string;
  model: string;
}

interface Delivery {
  id: string;
  plannedArrivalDate: Timestamp;
  actualArrivalDate: Timestamp | null;
  vehicleCount: number;
  driverName: string;
  driverPhone: string;
  notes: string;
  status: "in_transit" | "received";
  plannedVehicles?: PlannedVehicle[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

function formatDate(ts: Timestamp | null): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function DeliveriesPage() {
  const { user } = useAuthStore();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"in_transit" | "received">("in_transit");
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [vehicleCount, setVehicleCount] = useState(1);
  const [plannedArrivalDate, setPlannedArrivalDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [plannedVehicles, setPlannedVehicles] = useState<PlannedVehicle[]>([]);
  const [scanningIndex, setScanningIndex] = useState<number | null>(null);

  useEffect(() => {
    const q = query(collection(db, "deliveries"), orderBy("plannedArrivalDate", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDeliveries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery)));
        setLoading(false);
      },
      () => {
        toast.error("Błąd ładowania dostaw.");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const inTransit = deliveries.filter((d) => d.status === "in_transit");
  const received = deliveries.filter((d) => d.status === "received");
  const displayed = activeTab === "in_transit" ? inTransit : received;

  function openModal() {
    setDriverName("");
    setDriverPhone("");
    setVehicleCount(1);
    setPlannedArrivalDate("");
    setNotes("");
    setPlannedVehicles([]);
    setScanningIndex(null);
    setShowModal(true);
  }

  function addPlannedVehicle() {
    setPlannedVehicles((prev) => [...prev, { vin: "", model: MG_MODELS[0] }]);
  }

  function updatePlannedVehicle(index: number, field: keyof PlannedVehicle, value: string) {
    setPlannedVehicles((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  function removePlannedVehicle(index: number) {
    setPlannedVehicles((prev) => prev.filter((_, i) => i !== index));
    if (scanningIndex === index) setScanningIndex(null);
  }

  async function handleAccept(delivery: Delivery) {
    try {
      await updateDoc(doc(db, "deliveries", delivery.id), {
        status: "received",
        actualArrivalDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Dostawa przyjęta.");
    } catch {
      toast.error("Nie udało się przyjąć dostawy.");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const dateTs = new Date(plannedArrivalDate);
      const cleanVehicles = plannedVehicles
        .filter((v) => v.vin.trim().length > 0)
        .map((v) => ({ vin: v.vin.trim().toUpperCase(), model: v.model }));
      const finalCount = cleanVehicles.length > 0 ? cleanVehicles.length : vehicleCount;

      await addDoc(collection(db, "deliveries"), {
        plannedArrivalDate: dateTs,
        actualArrivalDate: null,
        vehicleCount: finalCount,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        notes: notes.trim(),
        plannedVehicles: cleanVehicles,
        status: "in_transit",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Dostawa dodana.");
      setShowModal(false);
    } catch {
      toast.error("Nie udało się dodać dostawy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Truck size={22} style={{ color: "var(--color-accent)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            Dostawy
          </h1>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Plus size={14} /> Nowa dostawa
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["in_transit", "received"] as const).map((tab) => {
          const count = tab === "in_transit" ? inTransit.length : received.length;
          const label = tab === "in_transit" ? "W drodze" : "Odebrane";
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity"
              style={{
                background: isActive ? "var(--color-accent)" : "var(--bg-surface)",
                color: isActive ? "#fff" : "var(--color-muted)",
                border: "1px solid var(--bg-border)",
              }}
            >
              {label}
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: isActive ? "rgba(255,255,255,0.2)" : "var(--bg-border2)",
                  color: isActive ? "#fff" : "var(--color-text)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : displayed.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 gap-3"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          <Truck size={32} style={{ color: "var(--color-muted)" }} />
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            {activeTab === "in_transit" ? "Brak dostaw w drodze." : "Brak odebranych dostaw."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map((delivery) => (
            <div
              key={delivery.id}
              className="rounded-2xl p-4"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Left info */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                      {delivery.driverName}
                    </span>
                    {delivery.driverPhone && (
                      <a
                        href={`tel:${delivery.driverPhone}`}
                        className="flex items-center gap-1 text-xs hover:opacity-70"
                        style={{ color: "var(--color-muted)" }}
                      >
                        <Phone size={11} />
                        {delivery.driverPhone}
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--color-muted)" }}>
                    <span className="flex items-center gap-1">
                      <Package size={11} />
                      <span
                        className="px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          background: "var(--bg-border2)",
                          color: "var(--color-text)",
                        }}
                      >
                        {delivery.vehicleCount} poj.
                      </span>
                    </span>
                    <span>
                      Planowana:{" "}
                      <span style={{ color: "var(--color-text)" }}>
                        {formatDate(delivery.plannedArrivalDate)}
                      </span>
                    </span>
                    {delivery.actualArrivalDate && (
                      <span>
                        Odebrana:{" "}
                        <span style={{ color: "var(--color-success)" }}>
                          {formatDate(delivery.actualArrivalDate)}
                        </span>
                      </span>
                    )}
                  </div>

                  {delivery.notes && (
                    <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                      {delivery.notes}
                    </p>
                  )}
                </div>

                {/* Right: status + action */}
                <div className="flex items-center gap-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background:
                        delivery.status === "in_transit"
                          ? "#3b82f626"
                          : "#22c55e26",
                      color:
                        delivery.status === "in_transit"
                          ? "var(--color-accent)"
                          : "var(--color-success)",
                      border: `1px solid ${delivery.status === "in_transit" ? "#3b82f640" : "#22c55e40"}`,
                    }}
                  >
                    {delivery.status === "in_transit" ? "W drodze" : "Odebrana"}
                  </span>

                  {delivery.status === "in_transit" && (
                    <button
                      onClick={() => handleAccept(delivery)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
                      style={{ background: "var(--color-success)", color: "#fff" }}
                    >
                      <CheckCircle size={12} />
                      Przyjmij dostawę
                    </button>
                  )}
                </div>
              </div>

              {/* Planned vehicles from notification */}
              {delivery.plannedVehicles && delivery.plannedVehicles.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--bg-border)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--color-muted)" }}>
                    Pojazdy z awizacji
                  </p>
                  <div className="flex flex-col gap-1">
                    {delivery.plannedVehicles.map((pv, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: "var(--bg-primary)", color: "var(--color-text)" }}
                      >
                        <span className="font-medium">{pv.model}</span>
                        <span className="font-mono" style={{ color: "var(--color-muted)" }}>
                          {pv.vin.length >= 7 ? pv.vin.slice(-7) : pv.vin}
                        </span>
                        <span className="text-[10px] font-mono ml-auto hidden sm:block" style={{ color: "var(--color-muted)" }}>
                          {pv.vin}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
                Nowa dostawa
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
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Imię kierowcy *
                </label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Jan Kowalski"
                  style={inputStyle}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Telefon kierowcy
                </label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+48 000 000 000"
                  style={inputStyle}
                />
              </div>

              {/* Planned vehicles section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                    Pojazdy w dostawie
                  </label>
                  <button
                    type="button"
                    onClick={addPlannedVehicle}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                    style={{ background: "var(--color-accent)", color: "#fff" }}
                  >
                    <Plus size={11} /> Dodaj pojazd
                  </button>
                </div>

                {plannedVehicles.length === 0 ? (
                  <div
                    className="rounded-xl px-4 py-3 flex flex-col items-center gap-1.5"
                    style={{ background: "var(--bg-primary)", border: "1px dashed var(--bg-border2)" }}
                  >
                    <Car size={16} style={{ color: "var(--color-muted)" }} />
                    <p className="text-[11px] text-center" style={{ color: "var(--color-muted)" }}>
                      Dodaj pojazdy z awizacji — VIN + model.
                      <br />Możesz też skanować kody kreskowe.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {plannedVehicles.map((pv, idx) => (
                      <div key={idx} className="flex flex-col gap-1.5">
                        <div
                          className="flex items-center gap-1.5 rounded-xl p-2"
                          style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)" }}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: "var(--bg-border2)", color: "var(--color-muted)" }}
                          >
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={pv.vin}
                            onChange={(e) => updatePlannedVehicle(idx, "vin", e.target.value)}
                            placeholder="VIN"
                            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs outline-none font-mono"
                            style={{
                              background: "var(--bg-surface)",
                              border: "1px solid var(--bg-border)",
                              color: "var(--color-text)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          />
                          <select
                            value={pv.model}
                            onChange={(e) => updatePlannedVehicle(idx, "model", e.target.value)}
                            className="px-2 py-1.5 rounded-lg text-xs outline-none shrink-0"
                            style={{
                              background: "var(--bg-surface)",
                              border: "1px solid var(--bg-border)",
                              color: "var(--color-text)",
                              maxWidth: 90,
                            }}
                          >
                            {MG_MODELS.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setScanningIndex(scanningIndex === idx ? null : idx)}
                            className="p-1.5 rounded-lg shrink-0"
                            style={{
                              background: scanningIndex === idx ? "var(--color-accent)" : "var(--bg-surface)",
                              color: scanningIndex === idx ? "#fff" : "var(--color-accent)",
                              border: "1px solid var(--bg-border)",
                            }}
                          >
                            <ScanLine size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removePlannedVehicle(idx)}
                            className="p-1.5 rounded-lg shrink-0 hover:opacity-70"
                            style={{ color: "var(--color-danger)" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Inline scanner for this vehicle */}
                        {scanningIndex === idx && (
                          <BarcodeScannerInline
                            onScan={(scanned) => {
                              updatePlannedVehicle(idx, "vin", scanned);
                              setScanningIndex(null);
                            }}
                            onClose={() => setScanningIndex(null)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {plannedVehicles.length > 0 && (
                  <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                    {plannedVehicles.filter((v) => v.vin.trim()).length} pojazd(ów) z VIN
                  </p>
                )}
              </div>

              {/* Vehicle count — only show if no planned vehicles */}
              {plannedVehicles.length === 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                    Liczba pojazdów *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={vehicleCount}
                    onChange={(e) => setVehicleCount(parseInt(e.target.value) || 1)}
                    style={inputStyle}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Planowana data przyjazdu *
                </label>
                <input
                  type="date"
                  required
                  value={plannedArrivalDate}
                  onChange={(e) => setPlannedArrivalDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Uwagi
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Dodatkowe informacje o dostawie…"
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
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                  {saving ? "Zapisywanie…" : "Dodaj dostawę"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
