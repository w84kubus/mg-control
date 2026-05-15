"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { useVehicleModalStore } from "@/store/vehicleModalStore";
import type { Vehicle, VehicleStatus } from "@/types";

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlobalSearch({ isOpen, onClose }: Props) {
  const { vehicles } = useVehiclesStore();
  const { open: openModal } = useVehicleModalStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Vehicle[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      // Small delay so the overlay is mounted first
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // Esc closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!value.trim()) {
        setResults([]);
        return;
      }
      const lower = value.toLowerCase();
      const found = vehicles
        .filter(
          (v) =>
            v.vinShort.toLowerCase().includes(lower) ||
            v.vin.toLowerCase().includes(lower) ||
            v.model.toLowerCase().includes(lower) ||
            v.brand.toLowerCase().includes(lower) ||
            v.color.toLowerCase().includes(lower) ||
            (v.licensePlate?.toLowerCase().includes(lower) ?? false)
        )
        .slice(0, 8);
      setResults(found);
    }, 250);
  }

  function handleSelect(vehicle: Vehicle) {
    openModal(vehicle.id);
    onClose();
  }

  if (!isOpen) return null;

  return (
    /* Full-screen overlay */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Search input row */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--bg-border)" }}
        >
          <Search size={16} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Szukaj po VIN, modelu, nr rej., kolorze…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--color-text)" }}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); }}
              className="shrink-0 hover:opacity-70"
              style={{ color: "var(--color-muted)" }}
            >
              <X size={14} />
            </button>
          )}
          <kbd
            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: "var(--bg-border)", color: "var(--color-muted)" }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul>
            {results.map((v) => (
              <li key={v.id}>
                <button
                  onClick={() => handleSelect(v)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity"
                  style={{ borderBottom: "1px solid var(--bg-border)" }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: STATUS_COLOR[v.status] }}
                  />
                  <span className="text-xs font-bold font-mono w-16 shrink-0" style={{ color: "var(--color-text)" }}>
                    {v.vinShort}
                  </span>
                  <span className="text-xs flex-1 truncate" style={{ color: "var(--color-muted)" }}>
                    {v.brand} {v.model} · {v.color}
                  </span>
                  <span
                    className="text-[11px] shrink-0 px-2 py-0.5 rounded-full"
                    style={{ background: "var(--bg-border)", color: STATUS_COLOR[v.status] }}
                  >
                    {STATUS_LABEL[v.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state */}
        {query.trim() && results.length === 0 && (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--color-muted)" }}>
            Nie znaleziono pojazdów pasujących do &quot;{query}&quot;
          </p>
        )}

        {/* Hint when no query yet */}
        {!query.trim() && (
          <p className="px-4 py-5 text-xs text-center" style={{ color: "var(--color-muted2)" }}>
            Zacznij pisać, aby wyszukać pojazd
          </p>
        )}
      </div>
    </div>
  );
}
