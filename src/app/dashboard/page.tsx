"use client";

import { useAuthStore } from "@/store/authStore";
import { Map, Car, AlertTriangle, Truck } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          Witaj, {user?.displayName?.split(" ")[0] ?? ""}! 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          System MG Control · MG Plaza Warszawa
        </p>
      </div>

      {/* Placeholder – mapa będzie tutaj w Etapie 4 */}
      <div className="rounded-2xl flex flex-col items-center justify-center gap-4 py-24"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <Map size={48} style={{ color: "var(--color-accent)", opacity: 0.4 }} />
        <p className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
          Mapa placu — Etap 4
        </p>
        <p className="text-xs text-center max-w-xs" style={{ color: "var(--color-muted2)" }}>
          Interaktywna mapa z pojazdami, strefami i drag & drop zostanie dodana w następnym etapie.
        </p>
      </div>

      {/* Stats grid placeholder */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Car,           label: "Pojazdów na placu", value: "—", color: "var(--color-accent)" },
          { icon: AlertTriangle, label: "Aktywne szkody",    value: "—", color: "var(--color-danger)" },
          { icon: Truck,         label: "Oczekiwane dostawy",value: "—", color: "var(--color-warning)" },
          { icon: Map,           label: "Gotowe do wydania", value: "—", color: "var(--color-success)" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-2xl p-4 flex flex-col gap-2"
               style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            <Icon size={20} style={{ color }} />
            <p className="text-2xl font-black" style={{ color: "var(--color-text)" }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
