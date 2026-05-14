"use client";

import type { Zone, Vehicle } from "@/types";
import VehicleTile from "./VehicleTile";

export interface ZonePos {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ZONE_BG = {
  strict: "rgba(59,130,246,0.12)",
  flexible: "rgba(34,197,94,0.08)",
  blocked: "rgba(239,68,68,0.08)",
};

const ZONE_BORDER = {
  strict: "rgba(59,130,246,0.45)",
  flexible: "rgba(34,197,94,0.35)",
  blocked: "rgba(239,68,68,0.4)",
};

interface Props {
  zone: Zone;
  vehicles: Vehicle[];
  pos: ZonePos;
  selected: boolean;
  selectedVehicleId?: string | null;
  onClick: () => void;
  onVehicleClick?: (v: Vehicle) => void;
}

export default function ZoneOverlay({
  zone,
  vehicles,
  pos,
  selected,
  selectedVehicleId,
  onClick,
  onVehicleClick,
}: Props) {
  const bg = selected ? "rgba(59,130,246,0.22)" : ZONE_BG[zone.type];
  const border = selected ? "rgba(59,130,246,0.9)" : ZONE_BORDER[zone.type];
  const isFull = zone.capacity !== null && vehicles.length >= zone.capacity;

  return (
    <div
      onClick={onClick}
      className="absolute cursor-pointer overflow-hidden transition-all"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.w}%`,
        height: `${pos.h}%`,
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 5,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-1 py-0.5 select-none"
        style={{ background: "rgba(0,0,0,0.45)" }}
      >
        <span className="text-[7px] font-bold truncate leading-tight" style={{ color: "#f1f5f9" }}>
          {zone.name}
        </span>
        <span
          className="text-[7px] font-mono shrink-0 ml-1 leading-tight"
          style={{ color: isFull ? "#ef4444" : "#22c55e" }}
        >
          {vehicles.length}
          {zone.capacity ? `/${zone.capacity}` : ""}
        </span>
      </div>

      {/* Compact vehicle tiles */}
      {vehicles.length > 0 && (
        <div className="flex flex-wrap gap-0.5 p-0.5">
          {vehicles.map((v) => (
            <VehicleTile
              key={v.id}
              vehicle={v}
              compact
              selected={v.id === selectedVehicleId}
              onClick={(e) => {
                e.stopPropagation();
                onVehicleClick?.(v);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
