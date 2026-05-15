"use client";

import { ChevronRight, ParkingCircle, X } from "lucide-react";
import type { Zone, Vehicle, VehicleStatus } from "@/types";
import { useVehicleModalStore } from "@/store/vehicleModalStore";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<VehicleStatus, string> = {
  new:        "Nowe",
  ordered:    "Zlecone",
  damaged:    "Szkoda",
  ready:      "Gotowe",
  ready_wash: "Gotowe – myjnia",
  delivered:  "Wydane",
};

const STATUS_COLOR: Record<VehicleStatus, string> = {
  new:        "#64748b",
  ordered:    "#fbbf24",
  damaged:    "#f87171",
  ready:      "#4ade80",
  ready_wash: "#4ade80",
  delivered:  "#94a3b8",
};

// ─── Days since updatedAt ─────────────────────────────────────────────────────

function daysInZone(vehicle: Vehicle): number {
  const ts = vehicle.updatedAt;
  if (!ts) return 0;
  const ms =
    typeof ts === "object" && "toDate" in ts
      ? (ts as { toDate: () => Date }).toDate().getTime()
      : new Date(ts as unknown as string).getTime();
  return Math.floor((Date.now() - ms) / 86_400_000);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  zone: Zone | null;
  vehicles: Vehicle[];
  onClose: () => void;
  onVehicleClick: (vehicleId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ZonePanel({ zone, vehicles, onClose, onVehicleClick }: Props) {
  const { open: openModal } = useVehicleModalStore();

  if (!zone) return null;

  function handleVehicleOpen(vehicleId: string) {
    openModal(vehicleId);
    onVehicleClick(vehicleId);
  }

  // ── Desktop panel (fixed right sidebar) ─────────────────────────────────
  const panelContent = (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-surface)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--bg-border)" }}
      >
        <div>
          <p className="text-sm font-black" style={{ color: "var(--color-text)" }}>
            {zone.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            {vehicles.length} {vehicles.length === 1 ? "pojazd" : vehicles.length < 5 ? "pojazdy" : "pojazdów"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-muted)", background: "var(--bg-border)" }}
          aria-label="Zamknij panel"
        >
          <X size={15} />
        </button>
      </div>

      {/* Vehicle list */}
      <div className="flex-1 overflow-y-auto">
        {vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <ParkingCircle size={36} style={{ color: "var(--color-muted2)" }} />
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Strefa jest pusta
            </p>
          </div>
        ) : (
          vehicles.map((v) => {
            const days = daysInZone(v);
            return (
              <button
                key={v.id}
                onClick={() => handleVehicleOpen(v.id)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:opacity-80 transition-opacity"
                style={{ borderBottom: "1px solid var(--bg-border)" }}
              >
                {/* Status dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: STATUS_COLOR[v.status] }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold font-mono truncate" style={{ color: "var(--color-text)" }}>
                    {v.vinShort}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--color-muted)" }}>
                    {v.brand} {v.model} · {v.color}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: STATUS_COLOR[v.status] }}>
                    {STATUS_LABEL[v.status]}
                    {days > 0 && (
                      <span style={{ color: "var(--color-muted)" }}>
                        {" "}· {days} {days === 1 ? "dzień" : "dni"}
                      </span>
                    )}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight size={14} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-30"
        style={{ background: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />

      {/* Desktop: right sidebar */}
      <aside
        className="animate-slide-right fixed top-0 right-0 bottom-0 z-40 w-80 hidden md:flex flex-col overflow-hidden"
        style={{
          top: "var(--topbar-h)",
          border: "1px solid var(--bg-border)",
          borderRight: "none",
          borderTop: "none",
        }}
      >
        {panelContent}
      </aside>

      {/* Mobile: bottom drawer */}
      <aside
        className="animate-slide-bottom fixed left-0 right-0 bottom-0 z-40 rounded-t-2xl overflow-hidden flex flex-col md:hidden"
        style={{
          height: "65vh",
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <span
            className="w-10 h-1 rounded-full"
            style={{ background: "var(--bg-border2)" }}
          />
        </div>
        {panelContent}
      </aside>
    </>
  );
}
