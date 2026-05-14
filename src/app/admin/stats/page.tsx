"use client";

import { useEffect, useMemo } from "react";
import { BarChart2, AlertTriangle, Car, CheckCircle, Clock, Users } from "lucide-react";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { STATUS_COLORS, STATUS_LABELS } from "@/components/map/VehicleTile";

const ZONE_NAMES: Record<string, string> = {
  strefa_1: "Strefa 1",
  strefa_2: "Strefa 2",
  strefa_3: "Strefa 3",
  strefa_4: "Strefa 4",
  strefa_5: "Strefa 5",
  salon: "Salon",
  garaz: "Garaż",
  dach_rzad_1: "Dach rząd 1",
  dach_rzad_2: "Dach rząd 2",
  dach_rzad_3: "Dach rząd 3",
  blacharnia: "Blacharnia",
  serwis: "Serwis",
};

const STATUS_ORDER: Array<"new" | "ordered" | "damaged" | "ready" | "ready_wash" | "delivered"> = [
  "new",
  "ordered",
  "damaged",
  "ready",
  "ready_wash",
  "delivered",
];

const TYPE_LABELS: Record<string, string> = {
  stock: "Stock",
  demo: "Demo",
  fleet: "Flota",
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: string;
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-2xl"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        borderRadius: 16,
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: accent ?? "var(--color-accent)" }}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
          {label}
        </span>
      </div>
      <span
        className="text-3xl font-bold tabular-nums"
        style={{ color: accent ?? "var(--color-text)" }}
      >
        {value}
      </span>
    </div>
  );
}

export default function AdminStatsPage() {
  const { vehicles, loading, subscribe } = useVehiclesStore();

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  const stats = useMemo(() => {
    const onLot = vehicles.filter((v) => v.status !== "delivered");
    const delivered = vehicles.filter((v) => v.status === "delivered");
    const activeDamages = vehicles.filter((v) => v.activeDamageReportIds.length > 0);
    const activeService = vehicles.filter((v) => v.activeServiceOrderIds.length > 0);

    // Status counts (all vehicles)
    const statusCounts: Record<string, number> = {};
    for (const s of STATUS_ORDER) statusCounts[s] = 0;
    for (const v of vehicles) {
      statusCounts[v.status] = (statusCounts[v.status] ?? 0) + 1;
    }
    const total = vehicles.length;

    // Type breakdown (all vehicles)
    const typeCounts: Record<string, number> = { stock: 0, demo: 0, fleet: 0 };
    for (const v of vehicles) {
      typeCounts[v.vehicleType] = (typeCounts[v.vehicleType] ?? 0) + 1;
    }

    // Without zone (on lot only)
    const withoutZone = onLot.filter((v) => v.zoneId === null);

    // Top zones (on lot only)
    const zoneCounts: Record<string, number> = {};
    for (const v of onLot) {
      if (v.zoneId) {
        zoneCounts[v.zoneId] = (zoneCounts[v.zoneId] ?? 0) + 1;
      }
    }
    const topZones = Object.entries(zoneCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      onLot: onLot.length,
      delivered: delivered.length,
      activeDamages: activeDamages.length,
      activeService: activeService.length,
      statusCounts,
      total,
      typeCounts,
      withoutZone: withoutZone.length,
      topZones,
    };
  }, [vehicles]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 size={22} style={{ color: "var(--color-accent)" }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            Statystyki
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Dane na żywo z bazy pojazdów
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
          />
        </div>
      )}

      {!loading && (
        <>
          {/* Summary cards */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
              Podsumowanie
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                icon={<Car size={18} />}
                label="Na placu"
                value={stats.onLot}
                accent="var(--color-accent)"
              />
              <StatCard
                icon={<CheckCircle size={18} />}
                label="Wydanych łącznie"
                value={stats.delivered}
                accent="var(--color-success)"
              />
              <StatCard
                icon={<AlertTriangle size={18} />}
                label="Aktywne szkody"
                value={stats.activeDamages}
                accent={stats.activeDamages > 0 ? "var(--color-danger)" : "var(--color-muted)"}
              />
              <StatCard
                icon={<Clock size={18} />}
                label="Zlecenia serwisowe"
                value={stats.activeService}
                accent={stats.activeService > 0 ? "var(--color-warning)" : "var(--color-muted)"}
              />
            </div>
          </section>

          {/* Status bar chart */}
          <section
            className="flex flex-col gap-4 p-4 rounded-2xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: 16,
            }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
              Podział wg statusu
            </h2>
            <div className="flex flex-col gap-4">
              {STATUS_ORDER.map((s) => {
                const count = stats.statusCounts[s] ?? 0;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                const color = STATUS_COLORS[s] ?? "#64748b";
                return (
                  <div key={s} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: color }}
                        />
                        <span className="text-sm" style={{ color: "var(--color-text)" }}>
                          {STATUS_LABELS[s]}
                        </span>
                      </div>
                      <span className="text-xs tabular-nums" style={{ color: "var(--color-muted)" }}>
                        {count} · {pct}%
                      </span>
                    </div>
                    <div
                      className="w-full overflow-hidden"
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: "var(--bg-border2)",
                      }}
                    >
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          width: `${pct}%`,
                          background: color,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Vehicle type breakdown */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
              Typ pojazdu
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {(["stock", "demo", "fleet"] as const).map((type) => {
                const count = stats.typeCounts[type] ?? 0;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div
                    key={type}
                    className="flex flex-col gap-2 p-4 rounded-2xl"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--bg-border)",
                      borderRadius: 16,
                    }}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                      {TYPE_LABELS[type]}
                    </span>
                    <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
                      {count}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-muted2)" }}>
                      {pct}% wszystkich
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Without zone warning */}
          {stats.withoutZone > 0 && (
            <div
              className="flex items-start gap-3 p-4 rounded-2xl"
              style={{
                background: "rgba(234,179,8,0.08)",
                border: "1px solid rgba(234,179,8,0.25)",
                borderRadius: 16,
              }}
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold" style={{ color: "var(--color-warning)" }}>
                  {stats.withoutZone} {stats.withoutZone === 1 ? "pojazd bez przypisanej strefy" : "pojazdy bez przypisanej strefy"}
                </span>
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                  Pojazdy na placu bez strefy — sprawdź w widoku mapy
                </span>
              </div>
            </div>
          )}

          {/* Top zones */}
          {stats.topZones.length > 0 && (
            <section
              className="flex flex-col gap-4 p-4 rounded-2xl"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: 16,
              }}
            >
              <div className="flex items-center gap-2">
                <Users size={16} style={{ color: "var(--color-muted)" }} />
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
                  Top strefy (pojazdy na placu)
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {stats.topZones.map(([zoneId, count], i) => {
                  const name = ZONE_NAMES[zoneId] ?? zoneId;
                  const maxCount = stats.topZones[0]?.[1] ?? 1;
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={zoneId} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold w-5 text-center tabular-nums"
                            style={{ color: "var(--color-muted2)" }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-sm" style={{ color: "var(--color-text)" }}>
                            {name}
                          </span>
                        </div>
                        <span className="text-xs tabular-nums font-semibold" style={{ color: "var(--color-accent)" }}>
                          {count} poj.
                        </span>
                      </div>
                      <div
                        style={{
                          height: 4,
                          borderRadius: 2,
                          background: "var(--bg-border2)",
                        }}
                      >
                        <div
                          style={{
                            height: 4,
                            borderRadius: 2,
                            width: `${pct}%`,
                            background: "var(--color-accent)",
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
