"use client";

import { useEffect, useState, useMemo } from "react";
import { Car, AlertTriangle, Truck, CheckCircle, Plus } from "lucide-react";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { useZonesStore } from "@/store/zonesStore";
import { useFiltersStore } from "@/store/filtersStore";
import { useVehicleModalStore } from "@/store/vehicleModalStore";
import MapView from "@/components/map/MapView";
import ListView from "@/components/map/ListView";
import VehicleModal from "@/components/map/VehicleModal";
import AddVehicleModal from "@/components/map/AddVehicleModal";
import ZonePanel from "@/components/map/ZonePanel";
import type { Vehicle } from "@/types";

export default function DashboardPage() {
  const { vehicles, loading, subscribe } = useVehiclesStore();
  const { zones } = useZonesStore();
  const { search, status, area, view } = useFiltersStore();
  const { vehicleId: modalVehicleId, isOpen, isAdding, open: openModal, openAdd, close: closeModal } = useVehicleModalStore();

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zonePanelOpen, setZonePanelOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  // Apply filters
  const filteredVehicleIds = useMemo(() => {
    const areaZoneIds = area !== "all"
      ? new Set(zones.filter((z) => z.area === area).map((z) => z.id))
      : null;

    return new Set(
      vehicles.filter((v) => {
        if (status !== "all" && v.status !== status) return false;
        if (areaZoneIds && (!v.zoneId || !areaZoneIds.has(v.zoneId))) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            v.vin.toLowerCase().includes(q) ||
            v.vinShort.toLowerCase().includes(q) ||
            v.model.toLowerCase().includes(q) ||
            v.brand.toLowerCase().includes(q) ||
            v.color.toLowerCase().includes(q) ||
            (v.licensePlate?.toLowerCase().includes(q) ?? false)
          );
        }
        return true;
      }).map((v) => v.id)
    );
  }, [vehicles, status, area, search, zones]);

  // Stats
  const totalOnLot = vehicles.filter((v) => v.status !== "delivered").length;
  const activeDamage = vehicles.filter((v) => (v.activeDamageReportIds?.length ?? 0) > 0).length;
  const readyCount = vehicles.filter((v) => v.status === "ready").length;
  const washCount = vehicles.filter((v) => v.status === "ready_wash").length;

  const handleZoneClick = (zoneId: string) => {
    setSelectedZoneId((prev) => {
      if (prev === zoneId) {
        setZonePanelOpen(false);
        return null;
      }
      setZonePanelOpen(true);
      return zoneId;
    });
    setSelectedVehicle(null);
  };

  const handleVehicleClick = (v: Vehicle) => {
    setSelectedVehicle((prev) => (prev?.id === v.id ? null : v));
  };

  const handleVehicleOpen = (v: Vehicle) => {
    openModal(v.id);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stats + Add button row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 min-w-0">
          {[
            { icon: Car,           label: "Na placu",       value: loading ? "…" : totalOnLot,   color: "var(--color-accent)"  },
            { icon: AlertTriangle, label: "Aktywne szkody", value: loading ? "…" : activeDamage, color: "var(--color-danger)"  },
            { icon: Truck,         label: "Do myjni",       value: loading ? "…" : washCount,    color: "var(--color-warning)" },
            { icon: CheckCircle,   label: "Gotowe",         value: loading ? "…" : readyCount,   color: "var(--color-success)" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
            >
              <Icon size={15} style={{ color }} className="flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-base font-black leading-none" style={{ color: "var(--color-text)" }}>{value}</p>
                <p className="text-[10px] leading-none mt-0.5 truncate" style={{ color: "var(--color-muted)" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Dodaj pojazd</span>
          <span className="sm:hidden">Dodaj</span>
        </button>
      </div>

      {/* Selected vehicle info bar */}
      {selectedVehicle && (
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer hover:opacity-90"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--color-accent)" }}
          onClick={() => handleVehicleOpen(selectedVehicle)}
        >
          <div>
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              {selectedVehicle.brand} {selectedVehicle.model}
            </span>
            <span className="text-xs ml-2" style={{ color: "var(--color-muted)" }}>
              {selectedVehicle.vinShort} · {selectedVehicle.color}
            </span>
            <span className="text-xs ml-2 underline" style={{ color: "var(--color-accent)" }}>
              Otwórz szczegóły →
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedVehicle(null); }}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ color: "var(--color-muted)", background: "var(--bg-primary)" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Map or List */}
      {loading ? (
        <div className="rounded-2xl flex items-center justify-center py-24"
             style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
               style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
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
          onVehicleClick={(v) => { handleVehicleClick(v); handleVehicleOpen(v); }}
          filteredVehicleIds={filteredVehicleIds}
        />
      )}

      {/* Modals */}
      {isOpen && !isAdding && modalVehicleId && (
        <VehicleModal vehicleId={modalVehicleId} onClose={closeModal} />
      )}
      {isOpen && isAdding && (
        <AddVehicleModal onClose={closeModal} />
      )}

      {/* Zone panel */}
      {zonePanelOpen && selectedZoneId && (
        <ZonePanel
          zone={zones.find((z) => z.id === selectedZoneId) ?? null}
          vehicles={vehicles.filter((v) => v.zoneId === selectedZoneId)}
          onClose={() => { setZonePanelOpen(false); setSelectedZoneId(null); }}
          onVehicleClick={(vehicleId) => openModal(vehicleId)}
        />
      )}
    </div>
  );
}
