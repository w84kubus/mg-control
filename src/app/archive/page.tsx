"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Search } from "lucide-react";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { useVehicleModalStore } from "@/store/vehicleModalStore";
import VehicleModal from "@/components/map/VehicleModal";
import type { Vehicle } from "@/types";

function fmtTs(ts: Vehicle["updatedAt"] | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("pl-PL");
}

export default function ArchivePage() {
  const { vehicles, loading, subscribe } = useVehiclesStore();
  const { open, close, isOpen, isAdding, vehicleId: modalVehicleId } = useVehicleModalStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  const delivered = useMemo(
    () => vehicles.filter((v) => v.status === "delivered"),
    [vehicles]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return delivered;
    return delivered.filter((v) =>
      [
        v.vinShort,
        v.model,
        v.color,
        v.licensePlate ?? "",
        v.assignedSalespersonName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [delivered, search]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <Archive size={22} style={{ color: "var(--color-accent)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            Archiwum pojazdów
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Historia wydanych pojazdów — widok tylko do odczytu
        </p>
      </div>

      {/* Search + count */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div
          className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border2)",
          }}
        >
          <Search size={16} style={{ color: "var(--color-muted)" }} />
          <input
            type="text"
            placeholder="Szukaj po VIN, modelu, kolorze, rejestracji, handlowcu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--color-text)" }}
          />
        </div>

        <span
          className="shrink-0 text-sm font-semibold px-3 py-1.5 rounded-lg"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border2)",
            color: "var(--color-muted)",
          }}
        >
          {loading ? "…" : `${filtered.length} pojazdów wydanych`}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
          />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div
          className="flex flex-col items-center justify-center gap-4 py-24 rounded-2xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
          }}
        >
          <Archive size={40} style={{ color: "var(--color-muted2)" }} />
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            {search ? "Brak wyników dla podanego zapytania" : "Brak wydanych pojazdów"}
          </p>
        </div>
      )}

      {/* Table — desktop */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Desktop table */}
          <div
            className="hidden md:block rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
            }}
          >
            <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--bg-border2)" }}>
                  {["VIN short", "Model", "Kolor", "Rejestracja", "Handlowiec", "Data aktualizacji"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => open(v.id)}
                    className="cursor-pointer transition-colors hover:opacity-80"
                    style={{ borderBottom: "1px solid var(--bg-border)" }}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-accent)" }}>
                      {v.vinShort}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text)" }}>
                      MG {v.model}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-muted)" }}>
                      {v.color}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text)" }}>
                      {v.licensePlate ?? "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-muted)" }}>
                      {v.assignedSalespersonName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted2)" }}>
                      {fmtTs(v.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Mobile list */}
          <div className="flex md:hidden flex-col gap-2">
            {filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => open(v.id)}
                className="text-left w-full flex flex-col gap-1 px-4 py-3 rounded-xl transition-opacity hover:opacity-80"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs" style={{ color: "var(--color-accent)" }}>
                    {v.vinShort}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-muted2)" }}>
                    {fmtTs(v.updatedAt)}
                  </span>
                </div>
                <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                  MG {v.model} · {v.color}
                </span>
                <div className="flex gap-3 text-xs" style={{ color: "var(--color-muted)" }}>
                  <span>{v.licensePlate ?? "—"}</span>
                  {v.assignedSalespersonName && (
                    <span>· {v.assignedSalespersonName}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Vehicle Modal */}
      {isOpen && !isAdding && modalVehicleId && (
        <VehicleModal vehicleId={modalVehicleId} onClose={close} />
      )}
    </div>
  );
}
