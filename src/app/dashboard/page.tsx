"use client";

import { useEffect, useState, useMemo } from "react";
import { Car, AlertTriangle, Truck, CheckCircle } from "lucide-react";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { useZonesStore } from "@/store/zonesStore";
import { useFiltersStore } from "@/store/filtersStore";
import FilterBar from "@/components/map/FilterBar";
import MapView from "@/components/map/MapView";
import ListView from "@/components/map/ListView";
import type { Vehicle } from "@/types";

export default function DashboardPage() {
  const { vehicles, loading, subscribe } = useVehiclesStore();
  const { zones } = useZonesStore();
  const { search, status, area, view } = useFiltersStore();

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Subscribe to Firestore real-time updates
  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  // Apply filters to compute visible vehicle set
  const filteredVehicleIds = useMemo(() => {
    const areaZoneIds = area !== "all"
      ? new Set(zones.filter((z) => z.area === area).map((z) => z.id))
      : null;

    const filtered = vehicles.filter((v) => {
      if (status !== "all" && v.status !== status) return false;
      if (areaZoneIds && (!v.zoneId || !areaZoneIds.has(v.zoneId))) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !v.vin.toLowerCase().includes(q) &&
          !v.vinShort.toLowerCase().includes(q) &&
          !v.model.toLowerCase().includes(q) &&
          !v.brand.toLowerCase().includes(q) &&
          !v.color.toLowerCase().includes(q) &&
          !(v.licensePlate?.toLowerCase().includes(q))
        ) return false;
      }
      return true;
    });

    return new Set(filtered.map((v) => v.id));
  }, [vehicles, status, area, search, zones]);

  // Live stats from all vehicles (no filter)
  const totalOnLot = vehicles.filter((v) => v.status !== "delivered").length;
  const activeDamage = vehicles.filter((v) => v.activeDamageReportIds?.length > 0).length;
  const readyCount = vehicles.filter((v) => v.status === "ready").length;
  const washCount = vehicles.filter((v) => v.status === "ready_wash").length;

  const handleZoneClick = (zoneId: string) => {
    setSelectedZoneId((prev) => (prev === zoneId ? null : zoneId));
    setSelectedVehicle(null);
  };

  const handleVehicleClick = (v: Vehicle) => {
    setSelectedVehicle((prev) => (prev?.id === v.id ? null : v));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Car,           label: "Na placu",        value: loading ? "…" : totalOnLot, color: "var(--color-accent)" },
          { icon: AlertTriangle, label: "Aktywne szkody",  value: loading ? "…" : activeDamage, color: "var(--color-danger)" },
          { icon: Truck,         label: "Do myjni",        value: loading ? "…" : washCount, color: "var(--color-warning)" },
          { icon: CheckCircle,   label: "Gotowe do wydania", value: loading ? "…" : readyCount, color: "var(--color-success)" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
          >
            <Icon size={18} style={{ color }} />
            <p className="text-2xl font-black" style={{ color: "var(--color-text)" }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <FilterBar />

      {/* Selected vehicle info bar */}
      {selectedVehicle && (
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--color-accent)" }}
        >
          <div>
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              {selectedVehicle.brand} {selectedVehicle.model}
            </span>
            <span className="text-xs ml-2" style={{ color: "var(--color-muted)" }}>
              {selectedVehicle.vin} · {selectedVehicle.color}
            </span>
          </div>
          <button
            onClick={() => setSelectedVehicle(null)}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ color: "var(--color-muted)", background: "var(--bg-primary)" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Map or List view */}
      {loading ? (
        <div
          className="rounded-2xl flex items-center justify-center py-24"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          <div
            className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : view === "map" ? (
        <MapView
          zones={zones}
          vehicles={vehicles}
          selectedZoneId={selectedZoneId}
          selectedVehicleId={selectedVehicle?.id ?? null}
          onZoneClick={handleZoneClick}
          onVehicleClick={handleVehicleClick}
          filteredVehicleIds={filteredVehicleIds}
        />
      ) : (
        <ListView
          zones={zones}
          vehicles={vehicles}
          selectedVehicleId={selectedVehicle?.id ?? null}
          onZoneClick={handleZoneClick}
          onVehicleClick={handleVehicleClick}
          filteredVehicleIds={filteredVehicleIds}
        />
      )}
    </div>
  );
}
