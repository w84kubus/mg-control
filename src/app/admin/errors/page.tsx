"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, CheckCircle, RefreshCw, Bug } from "lucide-react";
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, writeBatch, getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";

interface AppError {
  id: string;
  message: string;
  context: string | null;
  severity: "low" | "medium" | "high" | "critical";
  uid: string | null;
  displayName: string | null;
  stack: string | null;
  resolved: boolean;
  createdAt: { seconds: number } | null;
}

const SEVERITY_COLOR: Record<string, string> = {
  low: "#64748b", medium: "#eab308", high: "#f97316", critical: "#ef4444",
};
const SEVERITY_LABEL: Record<string, string> = {
  low: "Niski", medium: "Średni", high: "Wysoki", critical: "Krytyczny",
};

function fmtTs(ts: { seconds: number } | null) {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminErrorsPage() {
  const { user } = useAuthStore();
  const [errors, setErrors] = useState<AppError[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "appErrors"), orderBy("createdAt", "desc")),
      (snap) => {
        setErrors(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppError)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const filtered = errors.filter((e) => {
    if (filter === "open") return !e.resolved;
    if (filter === "resolved") return e.resolved;
    return true;
  });

  async function resolve(id: string) {
    try {
      await updateDoc(doc(db, "appErrors", id), {
        resolved: true,
        resolvedAt: serverTimestamp(),
        resolvedBy: user?.uid ?? null,
      });
    } catch { toast.error("Błąd zapisu."); }
  }

  async function remove(id: string) {
    try {
      await deleteDoc(doc(db, "appErrors", id));
    } catch { toast.error("Błąd usuwania."); }
  }

  async function clearResolved() {
    const resolved = errors.filter((e) => e.resolved);
    if (resolved.length === 0) return;
    try {
      const batch = writeBatch(db);
      const snap = await getDocs(collection(db, "appErrors"));
      snap.forEach((d) => { if ((d.data() as AppError).resolved) batch.delete(d.ref); });
      await batch.commit();
      toast.success(`Usunięto ${resolved.length} rozwiązanych błędów.`);
    } catch { toast.error("Błąd czyszczenia."); }
  }

  const openCount = errors.filter((e) => !e.resolved).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Bug size={22} style={{ color: "var(--color-danger)" }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
              Dziennik błędów
            </h1>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              {loading ? "…" : `${openCount} nierozwiązanych`}
            </p>
          </div>
        </div>
        <button
          onClick={clearResolved}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border2)", color: "var(--color-muted)" }}
        >
          <Trash2 size={12} /> Wyczyść rozwiązane
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        {(["open", "all", "resolved"] as const).map((f) => {
          const labels = { open: "Otwarte", all: "Wszystkie", resolved: "Rozwiązane" };
          return (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: filter === f ? "var(--color-accent)" : "transparent",
                color: filter === f ? "#fff" : "var(--color-muted)",
              }}>
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <RefreshCw size={20} className="animate-spin" style={{ color: "var(--color-accent)" }} />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 rounded-2xl"
             style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
          <CheckCircle size={36} style={{ color: "var(--color-success)", opacity: 0.5 }} />
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            {filter === "open" ? "Brak nierozwiązanych błędów" : "Brak wpisów"}
          </p>
        </div>
      )}

      {/* Error list */}
      <div className="flex flex-col gap-2">
        {filtered.map((e) => {
          const sc = SEVERITY_COLOR[e.severity] ?? "#64748b";
          const isExpanded = expanded === e.id;
          return (
            <div key={e.id} className="rounded-2xl overflow-hidden"
                 style={{
                   background: "var(--bg-surface)",
                   border: `1px solid ${e.resolved ? "var(--bg-border)" : `${sc}40`}`,
                   opacity: e.resolved ? 0.55 : 1,
                 }}>
              {/* Row */}
              <div className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                   onClick={() => setExpanded(isExpanded ? null : e.id)}>
                <AlertTriangle size={15} style={{ color: sc, flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: `${sc}20`, color: sc }}>
                      {SEVERITY_LABEL[e.severity]}
                    </span>
                    {e.context && (
                      <span className="text-xs font-mono" style={{ color: "var(--color-muted)" }}>
                        {e.context}
                      </span>
                    )}
                    <span className="text-xs ml-auto shrink-0" style={{ color: "var(--color-muted2)" }}>
                      {fmtTs(e.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm mt-1 font-medium" style={{ color: "var(--color-text)" }}>
                    {e.message}
                  </p>
                  {e.displayName && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                      Użytkownik: {e.displayName}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                  {!e.resolved && (
                    <button onClick={() => resolve(e.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg"
                      style={{ background: "rgba(34,197,94,0.1)", color: "var(--color-success)" }}
                      title="Oznacz jako rozwiązany">
                      <CheckCircle size={13} />
                    </button>
                  )}
                  <button onClick={() => remove(e.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-danger)" }}
                    title="Usuń">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Stack trace */}
              {isExpanded && e.stack && (
                <pre className="px-4 pb-4 text-xs overflow-x-auto leading-relaxed"
                     style={{ color: "var(--color-muted)", borderTop: "1px solid var(--bg-border)" }}>
                  {e.stack}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
