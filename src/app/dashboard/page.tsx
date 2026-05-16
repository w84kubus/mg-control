"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Car, AlertTriangle, Truck, CheckCircle, Plus, Move } from "lucide-react";
import { doc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "react-toastify";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { useZonesStore } from "@/store/zonesStore";
import { useFiltersStore } from "@/store/filtersStore";
import { useVehicleModalStore } from "@/store/vehicleModalStore";
import { useAuthStore } from "@/store/authStore";
import { validateDrop, canUserMoveVehicle } from "@/lib/validation/validateDrop";
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

  const { user } = useAuthStore();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zonePanelOpen, setZonePanelOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [movingVehicle, setMovingVehicle] = useState<Vehicle | null>(null);

  const canMove = user ? canUserMoveVehicle(user.role) : false;

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

  // Move a vehicle to a zone (used by tap-to-move on mobile and drag on desktop)
  const moveVehicleToZone = useCallback(async (vehicle: Vehicle, toZoneId: string) => {
    if (!user) return;
    if (vehicle.zoneId === toZoneId) return;
    const toZone = zones.find((z) => z.id === toZoneId);
    if (!toZone) return;

    const result = validateDrop(toZone, user.role);
    if (!result.allowed) { toast.warning(result.message); return; }

    try {
      const fromZoneName = zones.find((z) => z.id === vehicle.zoneId)?.name ?? "Bez strefy";
      await updateDoc(doc(db, "vehicles", vehicle.id), {
        zoneId: toZoneId,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      await addDoc(collection(db, "vehicles", vehicle.id, "logs"), {
        vehicleId: vehicle.id,
        type: "zone_change",
        action: "Przesunięcie na mapie",
        details: `${fromZoneName} → ${toZone.name}`,
        performedBy: user.uid,
        performedByName: user.displayName ?? "Nieznany",
        performedAt: serverTimestamp(),
        metadata: null,
      });
      toast.success(`Przeniesiono do: ${toZone.name}`);
    } catch {
      toast.error("Nie udało się przenieść pojazdu.");
    }
  }, [user, zones]);

  const handleZoneClick = useCallback((zoneId: string) => {
    // If a vehicle is in move mode, move it to the clicked zone
    if (movingVehicle) {
      moveVehicleToZone(movingVehicle, zoneId);
      setMovingVehicle(null);
      setSelectedVehicle(null);
      return;
    }

    setSelectedZoneId((prev) => {
      if (prev === zoneId) {
        setZonePanelOpen(false);
        return null;
      }
      setZonePanelOpen(true);
      return zoneId;
    });
    setSelectedVehicle(null);
  }, [movingVehicle, moveVehicleToZone]);

  const handleVehicleClick = (v: Vehicle) => {
    // If tapping the same vehicle that's in move mode, cancel move
    if (movingVehicle?.id === v.id) {
      setMovingVehicle(null);
      setSelectedVehicle(null);
      return;
    }
    setMovingVehicle(null);
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
                <p className="text-xs leading-none mt-0.5 truncate" style={{ color: "var(--color-muted)" }}>{label}</p>
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

      {/* Move mode banner */}
      {movingVehicle && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl animate-pulse"
          style={{ background: "rgba(59,130,246,0.15)", border: "2px solid var(--color-accent)" }}
        >
          <div className="flex items-center gap-2">
            <Move size={16} style={{ color: "var(--color-accent)" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                Przenieś: {movingVehicle.brand} {movingVehicle.model}
                <span className="font-mono text-xs ml-1.5" style={{ color: "var(--color-muted)" }}>
                  {movingVehicle.vinShort}
                </span>
              </p>
              <p className="text-xs" style={{ color: "var(--color-accent)" }}>
                Kliknij strefę docelową na mapie
              </p>
            </div>
          </div>
          <button
            onClick={() => { setMovingVehicle(null); setSelectedVehicle(null); }}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ color: "var(--color-muted)", background: "var(--bg-primary)", border: "1px solid var(--bg-border2)" }}
          >
            Anuluj
          </button>
        </div>
      )}

      {/* Selected vehicle info bar */}
      {selectedVehicle && !movingVehicle && (
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--color-accent)" }}
        >
          <div
            className="flex-1 cursor-pointer hover:opacity-90"
            onClick={() => handleVehicleOpen(selectedVehicle)}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              {selectedVehicle.brand} {selectedVehicle.model}
            </span>
            <span className="text-xs ml-2" style={{ color: "var(--color-muted)" }}>
              {selectedVehicle.vinShort} · {selectedVehicle.color}
            </span>
            <span className="text-xs ml-2 underline hidden sm:inline" style={{ color: "var(--color-accent)" }}>
              Szczegóły →
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {canMove && (
              <button
                onClick={(e) => { e.stopPropagation(); setMovingVehicle(selectedVehicle); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >
                <Move size={12} />
                Przenieś
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedVehicle(null); }}
              className="text-xs px-2 py-1.5 rounded-lg"
              style={{ color: "var(--color-muted)", background: "var(--bg-primary)" }}
            >
              ✕
            </button>
          </div>
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
