"use client";

import { useState } from "react";
import { X, Plus, AlertCircle, CheckCircle, ScanLine } from "lucide-react";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useZonesStore } from "@/store/zonesStore";
import { validateVin } from "@/lib/business/vinValidator";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import type { VehicleType, VehicleStatus } from "@/types";

const BarcodeScannerInline = dynamic(
  () => import("@/components/scanner/BarcodeScannerInline"),
  { ssr: false }
);

const MG_MODELS = [
  "HS HEV", "HS", "HS PHEV", "ZS HEV", "ZS",
  "MG3", "MG4 EV", "MG S5 EV", "MG S6 EV", "MG S9 PHEV", "CYBERSTER",
];

const COLORS = [
  "BLACK", "GRAY", "SILVER", "WHITE", "BLUE", "GREEN", "RED", "YELLOW", "ORANGE",
];

interface Props {
  onClose: () => void;
}

export default function AddVehicleModal({ onClose }: Props) {
  const { user } = useAuthStore();
  const { zones } = useZonesStore();

  const [vin, setVin] = useState("");
  const [model, setModel] = useState(MG_MODELS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [vehicleType, setVehicleType] = useState<VehicleType>("stock");
  const [zoneId, setZoneId] = useState<string>("");
  const [licensePlate, setLicensePlate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const vinResult = vin.length > 0 ? validateVin(vin) : null;
  const availableZones = zones.filter((z) => z.type !== "blocked");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vinResult?.valid) return;
    if (!user) return;

    setSaving(true);
    try {
      const upperVin = vin.trim().toUpperCase();
      const ref = doc(collection(db, "vehicles"));
      await setDoc(ref, {
        id: ref.id,
        vin: upperVin,
        vinShort: upperVin.slice(-7),
        brand: "MG",
        model,
        color,
        licensePlate: licensePlate.trim().toUpperCase() || null,
        vehicleType,
        status: "new" as VehicleStatus,
        zoneId: zoneId || null,
        slotIndex: null,
        assignedSalespersonUid: null,
        assignedSalespersonName: null,
        deliveryId: null,
        arrivalDate: serverTimestamp(),
        plannedDeliveryDate: null,
        activeDamageReportIds: [],
        activeServiceOrderIds: [],
        hasDocument: false,
        documentCount: 0,
        notes: notes.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      toast.success(`Dodano pojazd ${upperVin.slice(-7)}`);
      onClose();
    } catch {
      toast.error("Nie udało się dodać pojazdu.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-3 py-2 rounded-xl text-sm outline-none";
  const inputStyle = {
    background: "var(--bg-primary)",
    border: "1px solid var(--bg-border2)",
    color: "var(--color-text)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl flex flex-col"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--bg-border)" }}
        >
          <div className="flex items-center gap-2">
            <Plus size={18} style={{ color: "var(--color-accent)" }} />
            <h2 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
              Dodaj pojazd
            </h2>
          </div>
          <button onClick={onClose} style={{ color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* VIN */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
              Numer VIN *
            </label>
            <div className="flex gap-2">
              <input
                className={inputCls + " flex-1"}
                style={{
                  ...inputStyle,
                  borderColor: vinResult
                    ? vinResult.valid ? "#22c55e" : "#ef4444"
                    : "var(--bg-border2)",
                  fontFamily: "monospace",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="LSJXXXXXXXXXXXXX"
                maxLength={17}
                required
              />
              <button
                type="button"
                onClick={() => setShowScanner((v) => !v)}
                className="px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold shrink-0"
                style={{
                  background: showScanner ? "var(--color-accent)" : "var(--bg-primary)",
                  color: showScanner ? "#fff" : "var(--color-accent)",
                  border: `1px solid ${showScanner ? "var(--color-accent)" : "var(--bg-border2)"}`,
                }}
              >
                <ScanLine size={14} />
                <span className="hidden sm:inline">Skanuj</span>
              </button>
            </div>
            {vinResult && (
              <p
                className="text-xs flex items-center gap-1"
                style={{ color: vinResult.valid ? "#22c55e" : "#ef4444" }}
              >
                {vinResult.valid ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                {vinResult.valid ? `OK · ostatnie 7: ${vin.toUpperCase().slice(-7)}` : vinResult.error}
              </p>
            )}

            {/* Inline barcode scanner */}
            {showScanner && (
              <BarcodeScannerInline
                onScan={(scanned) => {
                  setVin(scanned);
                  setShowScanner(false);
                }}
                onClose={() => setShowScanner(false)}
              />
            )}
          </div>

          {/* Model + Kolor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Model</label>
              <select className={inputCls} style={inputStyle} value={model} onChange={(e) => setModel(e.target.value)}>
                {MG_MODELS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Kolor</label>
              <select className={inputCls} style={inputStyle} value={color} onChange={(e) => setColor(e.target.value)}>
                {COLORS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Typ + Strefa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Typ</label>
              <select
                className={inputCls}
                style={inputStyle}
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              >
                <option value="stock">Stock</option>
                <option value="demo">Demo</option>
                <option value="fleet">Flota</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Strefa (opcja)</label>
              <select className={inputCls} style={inputStyle} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                <option value="">— Bez strefy —</option>
                {availableZones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Nr rej. */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Nr rejestracyjny (opcja)</label>
            <input
              className={inputCls}
              style={{ ...inputStyle, textTransform: "uppercase" }}
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="WA 12345"
              maxLength={10}
            />
          </div>

          {/* Notatka */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Notatka (opcja)</label>
            <textarea
              className={inputCls}
              style={{ ...inputStyle, resize: "none", height: 64 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodatkowe informacje…"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--bg-primary)", color: "var(--color-muted)", border: "1px solid var(--bg-border2)" }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving || !vinResult?.valid}
              className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              {saving ? "Dodawanie…" : "Dodaj pojazd"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
