"use client";

import { useState, useEffect } from "react";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { useVehicleModalStore } from "@/store/vehicleModalStore";
import { useZonesStore } from "@/store/zonesStore";
import { STATUS_COLORS, STATUS_LABELS } from "@/components/map/VehicleTile";
import VehicleModal from "@/components/map/VehicleModal";
import { Car, Star, Briefcase, ExternalLink } from "lucide-react";

export default function DemoFleetPage() {
  const { vehicles, subscribe } = useVehiclesStore();
  const { isOpen, isAdding, vehicleId: modalVehicleId, open, close } = useVehicleModalStore();
  const { getZoneById } = useZonesStore();
  const [activeTab, setActiveTab] = useState<"demo" | "fleet">("demo");

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  const demoVehicles = vehicles.filter((v) => v.vehicleType === "demo");
  const fleetVehicles = vehicles.filter((v) => v.vehicleType === "fleet");
  const displayed = activeTab === "demo" ? demoVehicles : fleetVehicles;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Car size={22} style={{ color: "var(--color-accent)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          Demo i Flota
        </h1>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          <Star size={18} style={{ color: "#eab308" }} />
          <div>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              Demo
            </p>
            <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              {demoVehicles.length}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          <Briefcase size={18} style={{ color: "var(--color-accent)" }} />
          <div>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              Flota
            </p>
            <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              {fleetVehicles.length}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["demo", "fleet"] as const).map((tab) => {
          const count = tab === "demo" ? demoVehicles.length : fleetVehicles.length;
          const label = tab === "demo" ? "Demo" : "Flota";
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

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
      >
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            {activeTab === "demo" ? (
              <Star size={32} style={{ color: "var(--color-muted)" }} />
            ) : (
              <Briefcase size={32} style={{ color: "var(--color-muted)" }} />
            )}
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              {activeTab === "demo"
                ? "Brak pojazdów demo."
                : "Brak pojazdów floty."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--bg-border)" }}>
                  {["Model", "Kolor", "VIN", "Status", "Strefa", "Handlowiec", "Akcja"].map((h) => (
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
                {displayed.map((vehicle) => {
                  const zone = vehicle.zoneId ? getZoneById(vehicle.zoneId) : null;
                  const statusColor = STATUS_COLORS[vehicle.status] ?? "#64748b";
                  const statusLabel = STATUS_LABELS[vehicle.status] ?? vehicle.status;
                  return (
                    <tr key={vehicle.id} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      <td className="px-4 py-3">
                        <p
                          className="font-medium text-sm"
                          style={{ color: "var(--color-text)" }}
                        >
                          {vehicle.brand} {vehicle.model}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                        {vehicle.color || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="font-mono text-xs"
                          style={{ color: "var(--color-muted)" }}
                        >
                          {vehicle.vin.slice(-7)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background: statusColor + "26",
                            color: statusColor,
                            border: `1px solid ${statusColor}40`,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                        {zone ? zone.name : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                        {vehicle.assignedSalespersonName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => open(vehicle.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-70 transition-opacity"
                          style={{
                            background: "var(--bg-border2)",
                            color: "var(--color-text)",
                          }}
                        >
                          <ExternalLink size={11} />
                          Otwórz
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vehicle Modal */}
      {isOpen && !isAdding && modalVehicleId && <VehicleModal vehicleId={modalVehicleId} onClose={close} />}
    </div>
  );
}
