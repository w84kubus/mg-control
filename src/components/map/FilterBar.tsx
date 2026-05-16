"use client";

import { useRef, useState, useEffect } from "react";
import { Search, X, Map, List, SlidersHorizontal } from "lucide-react";
import { useFiltersStore, type AreaFilter } from "@/store/filtersStore";
import type { VehicleStatus } from "@/types";
import { STATUS_COLORS, STATUS_LABELS } from "./VehicleTile";

const STATUSES: (VehicleStatus | "all")[] = [
  "all", "new", "ordered", "damaged", "ready", "ready_wash", "delivered",
];

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

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const activeFilterCount =
    (status !== "all" ? 1 : 0) + (area !== "all" ? 1 : 0);
  const hasFilters = !!search || activeFilterCount > 0;

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="flex flex-col gap-0 relative">
      {/* Single visible bar */}
      <div className="flex items-center gap-2">
        {/* Search input */}
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

        {/* Filter toggle button */}
        <button
          ref={btnRef}
          onClick={() => setOpen((o) => !o)}
          title="Filtry"
          className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: open || activeFilterCount > 0 ? "var(--color-accent)" : "var(--bg-surface)",
            color: open || activeFilterCount > 0 ? "#fff" : "var(--color-muted)",
            border: `1px solid ${open || activeFilterCount > 0 ? "var(--color-accent)" : "var(--bg-border2)"}`,
          }}
        >
          <SlidersHorizontal size={14} />
          <span className="hidden sm:inline">Filtry</span>
          {activeFilterCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: "#ef4444", color: "#fff" }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

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
      </div>

      {/* Dropdown filter panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute top-full mt-2 left-0 right-0 z-50 rounded-2xl p-4 flex flex-col gap-3"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border2)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              Status pojazdu
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {STATUSES.map((s) => {
                const active = status === s;
                const color = s === "all" ? "var(--color-accent)" : STATUS_COLORS[s] ?? "#64748b";
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
                    style={{
                      background: active ? color : "var(--bg-surface2)",
                      color: active ? "#fff" : "var(--color-muted)",
                      border: `1px solid ${active ? color : "var(--bg-border2)"}`,
                    }}
                  >
                    {s === "all" ? "Wszystkie" : STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--bg-border2)" }} />

          {/* Area */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              Obszar
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {AREAS.map(({ val, label }) => {
                const active = area === val;
                return (
                  <button
                    key={val}
                    onClick={() => setArea(val)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
                    style={{
                      background: active ? "var(--bg-border)" : "var(--bg-surface2)",
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

          {/* Clear + close */}
          {hasFilters && (
            <>
              <div style={{ height: 1, background: "var(--bg-border2)" }} />
              <button
                onClick={() => { reset(); setOpen(false); }}
                className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{
                  background: "var(--bg-surface2)",
                  border: "1px solid var(--bg-border2)",
                  color: "var(--color-muted)",
                }}
              >
                <X size={11} /> Wyczyść filtry
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
