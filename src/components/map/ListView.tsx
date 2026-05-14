"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Zone, Vehicle } from "@/types";
import VehicleTile from "./VehicleTile";

const AREA_LABELS: Record<string, string> = {
  plac: "Plac główny",
  salon: "Salon",
  serwis: "Serwis",
  blacharnia: "Blacharnia",
};

interface Props {
  zones: Zone[];
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onZoneClick: (zoneId: string) => void;
  onVehicleClick: (v: Vehicle) => void;
  filteredVehicleIds: Set<string>;
}

export default function ListView({
  zones,
  vehicles,
  selectedVehicleId,
  onZoneClick,
  onVehicleClick,
  filteredVehicleIds,
}: Props) {
  const [openZones, setOpenZones] = useState<Set<string>>(new Set());
  const [openAreas, setOpenAreas] = useState<Set<string>>(
    new Set(["plac", "salon", "serwis", "blacharnia"])
  );

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  const byArea = zones.reduce<Record<string, typeof zones>>((acc, z) => {
    (acc[z.area] ??= []).push(z);
    return acc;
  }, {});
  const totalFiltered = filteredVehicleIds.size;

  return (
    <div className="flex flex-col gap-2">
      {/* Summary */}
      <p className="text-xs" style={{ color: "var(--color-muted)" }}>
        {totalFiltered} pojazd{totalFiltered === 1 ? "" : totalFiltered < 5 ? "y" : "ów"} · {zones.length} stref
      </p>

      {/* Area groups */}
      {(["plac", "salon", "serwis", "blacharnia"] as const).map((area) => {
        const areaZones = byArea[area] ?? [];
        const areaVehicleCount = areaZones.reduce(
          (sum, z) => sum + vehicles.filter((v) => v.zoneId === z.id && filteredVehicleIds.has(v.id)).length,
          0
        );
        const areaOpen = openAreas.has(area);

        return (
          <div
            key={area}
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
          >
            {/* Area header */}
            <button
              onClick={() => toggle(openAreas, area, setOpenAreas)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                {areaOpen ? (
                  <ChevronDown size={14} style={{ color: "var(--color-muted)" }} />
                ) : (
                  <ChevronRight size={14} style={{ color: "var(--color-muted)" }} />
                )}
                <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {AREA_LABELS[area]}
                </span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "var(--bg-primary)",
                  color: areaVehicleCount > 0 ? "var(--color-accent)" : "var(--color-muted)",
                }}
              >
                {areaVehicleCount} pojazd{areaVehicleCount === 1 ? "" : areaVehicleCount < 5 ? "y" : "ów"}
              </span>
            </button>

            {/* Zone rows */}
            {areaOpen && areaZones.map((zone) => {
              const zoneVehicles = vehicles.filter(
                (v) => v.zoneId === zone.id && filteredVehicleIds.has(v.id)
              );
              const zoneOpen = openZones.has(zone.id);
              const isFull = zone.capacity !== null && zoneVehicles.length >= zone.capacity;

              return (
                <div key={zone.id} style={{ borderTop: "1px solid var(--bg-border)" }}>
                  {/* Zone header */}
                  <button
                    onClick={() => {
                      toggle(openZones, zone.id, setOpenZones);
                      onZoneClick(zone.id);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {zoneOpen ? (
                        <ChevronDown size={12} style={{ color: "var(--color-muted)" }} />
                      ) : (
                        <ChevronRight size={12} style={{ color: "var(--color-muted)" }} />
                      )}
                      <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                        {zone.name}
                      </span>
                      {zone.type === "blocked" && (
                        <span className="text-[9px] px-1 rounded" style={{ background: "rgba(239,68,68,.15)", color: "#ef4444" }}>
                          blokada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: isFull ? "#ef4444" : "var(--color-muted)" }}
                      >
                        {zoneVehicles.length}
                        {zone.capacity ? `/${zone.capacity}` : ""}
                      </span>
                    </div>
                  </button>

                  {/* Vehicle list */}
                  {zoneOpen && zoneVehicles.length > 0 && (
                    <div className="flex flex-col gap-1 px-4 pb-2">
                      {zoneVehicles.map((v) => (
                        <VehicleTile
                          key={v.id}
                          vehicle={v}
                          selected={v.id === selectedVehicleId}
                          onClick={() => onVehicleClick(v)}
                        />
                      ))}
                    </div>
                  )}

                  {zoneOpen && zoneVehicles.length === 0 && (
                    <p className="px-8 pb-3 text-xs" style={{ color: "var(--color-muted2)" }}>
                      Brak pojazdów
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
