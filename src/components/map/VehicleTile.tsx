"use client";

import type { Vehicle } from "@/types";

export const STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  ordered: "#a78bfa",
  damaged: "#ef4444",
  ready: "#22c55e",
  ready_wash: "#eab308",
  delivered: "#64748b",
};

export const STATUS_LABELS: Record<string, string> = {
  new: "Nowy",
  ordered: "Zamówiony",
  damaged: "Szkoda",
  ready: "Gotowy",
  ready_wash: "Do myjni",
  delivered: "Wydany",
};

interface Props {
  vehicle: Vehicle;
  compact?: boolean;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export default function VehicleTile({ vehicle, compact, selected, onClick }: Props) {
  const color = STATUS_COLORS[vehicle.status] ?? "#64748b";

  if (compact) {
    return (
      <div
        onClick={onClick}
        title={`${vehicle.brand} ${vehicle.model} | ${vehicle.vinShort} | ${STATUS_LABELS[vehicle.status]}`}
        className="cursor-pointer rounded transition-transform hover:scale-110 shrink-0"
        style={{
          width: 26,
          height: 16,
          background: color,
          opacity: selected ? 1 : 0.8,
          outline: selected ? "2px solid #fff" : "none",
          outlineOffset: 1,
        }}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-opacity hover:opacity-80"
      style={{
        background: "var(--bg-primary)",
        border: `1px solid ${selected ? color : "var(--bg-border2)"}`,
      }}
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
          {vehicle.brand} {vehicle.model}
        </p>
        <p className="text-[10px] truncate" style={{ color: "var(--color-muted)" }}>
          {vehicle.vinShort} · {vehicle.color}
        </p>
      </div>
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
        style={{ background: `${color}22`, color }}
      >
        {STATUS_LABELS[vehicle.status]}
      </span>
    </div>
  );
}
