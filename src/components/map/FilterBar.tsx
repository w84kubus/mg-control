"use client";

import { Search, X, Map, List } from "lucide-react";
import { useFiltersStore, type AreaFilter } from "@/store/filtersStore";
import type { VehicleStatus } from "@/types";
import { STATUS_COLORS, STATUS_LABELS } from "./VehicleTile";

const STATUSES: (VehicleStatus | "all")[] = [
  "all", "new", "ordered", "damaged", "ready", "ready_wash", "delivered",
];
const STATUS_ALL_LABEL = "Wszystkie";

const AREAS: { val: AreaFilter; label: string }[] = [
  { val: "all",        label: "Cały plac" },
  { val: "plac",       label: "Plac" },
  { val: "salon",      label: "Salon" },
  { val: "serwis",     label: "Serwis" },
  { val: "blacharnia", label: "Blacharnia" },
];

export default function FilterBar() {
  const {
    search, status, area, view,
    setSearch, setStatus, setArea, setView, reset,
  } = useFiltersStore();

  const hasFilters = search || status !== "all" || area !== "all";

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: search + view toggle */}
      <div className="flex items-center gap-2">
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border2)" }}
        >
          <Search size={14} style={{ color: "var(--color-muted)" }} />
          <input
            type="text"
            placeholder="Szukaj VIN, model, kolor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--color-text)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ color: "var(--color-muted)" }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div
          className="flex p-0.5 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          {([["map", Map, "Mapa"], ["list", List, "Lista"]] as const).map(([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              title={label}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{
                background: view === v ? "var(--color-accent)" : "transparent",
                color: view === v ? "#fff" : "var(--color-muted)",
              }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={reset}
            title="Wyczyść filtry"
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border2)", color: "var(--color-muted)" }}
          >
            <X size={11} /> Wyczyść
          </button>
        )}
      </div>

      {/* Row 2: status chips + area chips */}
      <div className="flex gap-1.5 flex-wrap">
        {/* Status chips */}
        {STATUSES.map((s) => {
          const active = status === s;
          const color = s === "all" ? "var(--color-accent)" : STATUS_COLORS[s] ?? "#64748b";
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
              style={{
                background: active ? color : "var(--bg-surface)",
                color: active ? "#fff" : "var(--color-muted)",
                border: `1px solid ${active ? color : "var(--bg-border2)"}`,
              }}
            >
              {s === "all" ? STATUS_ALL_LABEL : STATUS_LABELS[s]}
            </button>
          );
        })}

        <div className="w-px mx-0.5" style={{ background: "var(--bg-border2)" }} />

        {/* Area chips */}
        {AREAS.map(({ val, label }) => {
          const active = area === val;
          return (
            <button
              key={val}
              onClick={() => setArea(val)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
              style={{
                background: active ? "var(--bg-surface2)" : "var(--bg-surface)",
                color: active ? "var(--color-text)" : "var(--color-muted)",
                border: `1px solid ${active ? "var(--color-accent)" : "var(--bg-border2)"}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
