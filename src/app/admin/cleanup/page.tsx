"use client";

import { useState } from "react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import { Trash2, AlertTriangle, CheckCircle } from "lucide-react";

export default function CleanupPage() {
  const { user } = useAuthStore();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString("pl-PL")}] ${msg}`]);
  }

  async function deleteCollection(name: string) {
    const snap = await getDocs(collection(db, name));
    addLog(`${name}: znaleziono ${snap.size} dokumentów`);
    if (snap.size === 0) return 0;

    let deleted = 0;
    const batchSize = 500;
    for (let i = 0; i < snap.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = snap.docs.slice(i, i + batchSize);
      chunk.forEach((d) => batch.delete(doc(db, name, d.id)));
      await batch.commit();
      deleted += chunk.length;
    }
    addLog(`${name}: usunięto ${deleted} dokumentów`);
    return deleted;
  }

  async function handleCleanup() {
    if (!user || user.role !== "logistics") {
      toast.error("Brak uprawnień — wymagana rola: logistics");
      return;
    }

    setRunning(true);
    setDone(false);
    setLog([]);
    addLog("Rozpoczynam czyszczenie...");

    try {
      const v = await deleteCollection("vehicles");
      const d = await deleteCollection("deliveries");
      const s = await deleteCollection("serviceOrders");
      const dr = await deleteCollection("damageReports");
      addLog(`Gotowe! Usunięto ${v} pojazdów, ${d} dostaw, ${s} zleceń, ${dr} szkód.`);
      toast.success(`Wyczyszczono: ${v} pojazdów, ${d} dostaw, ${s} zleceń, ${dr} szkód.`);
      setDone(true);
    } catch (err) {
      addLog(`BŁĄD: ${err}`);
      toast.error("Błąd podczas czyszczenia.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "#ef444420" }}
        >
          <Trash2 size={20} style={{ color: "#ef4444" }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
            Czyszczenie bazy danych
          </h1>
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            Zalogowano jako: {user?.email ?? "—"} ({user?.role ?? "—"})
          </p>
        </div>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
      >
        {/* Warning banner */}
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{ background: "#ef444410", borderBottom: "1px solid #ef444430" }}
        >
          <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>
              Operacja nieodwracalna
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-muted)" }}>
              Usunięte zostaną <strong style={{ color: "var(--color-text)" }}>wszystkie pojazdy</strong>,{" "}
              <strong style={{ color: "var(--color-text)" }}>dostawy</strong>,{" "}
              <strong style={{ color: "var(--color-text)" }}>zlecenia serwisowe</strong> oraz{" "}
              <strong style={{ color: "var(--color-text)" }}>szkody</strong> z bazy danych.
              Użytkownicy, strefy i inne dane nie zostaną naruszone.
            </p>
          </div>
        </div>

        {/* Action area */}
        <div className="p-5 flex flex-col gap-4">
          {done ? (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "#22c55e15", border: "1px solid #22c55e30" }}
            >
              <CheckCircle size={18} style={{ color: "#22c55e" }} />
              <p className="text-sm font-medium" style={{ color: "#22c55e" }}>
                Baza wyczyszczona pomyślnie
              </p>
            </div>
          ) : (
            <button
              onClick={handleCleanup}
              disabled={running}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: "#ef4444", color: "#fff" }}
            >
              {running ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Czyszczenie...
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Wyczyść pojazdy i dostawy
                </>
              )}
            </button>
          )}

          {/* Log */}
          {log.length > 0 && (
            <div
              className="rounded-xl p-4 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--bg-border2)",
                color: "var(--color-muted)",
              }}
            >
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
