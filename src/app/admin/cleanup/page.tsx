"use client";

import { useState } from "react";
import { collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import { Trash2, AlertTriangle, CheckCircle } from "lucide-react";

export default function CleanupPage() {
  const { user } = useAuthStore();
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString("pl-PL")}] ${msg}`]);
  }

  async function deleteCollection(name: string) {
    const snap = await getDocs(collection(db, name));
    addLog(`${name}: znaleziono ${snap.size} dokumentów`);

    if (snap.size === 0) return 0;

    // Delete in batches of 500 (Firestore limit)
    let deleted = 0;
    const batchSize = 500;
    for (let i = 0; i < snap.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = snap.docs.slice(i, i + batchSize);
      chunk.forEach((d) => batch.delete(doc(db, name, d.id)));
      await batch.commit();
      deleted += chunk.length;
    }

    addLog(`${name}: usunięto ${deleted} dokumentów ✓`);
    return deleted;
  }

  async function handleCleanup() {
    if (!user || user.role !== "logistics") {
      toast.error("Brak uprawnień.");
      return;
    }

    setRunning(true);
    setLog([]);
    addLog("Rozpoczynam czyszczenie bazy...");

    try {
      const v = await deleteCollection("vehicles");
      const d = await deleteCollection("deliveries");
      addLog(`\nGotowe! Usunięto łącznie ${v + d} dokumentów.`);
      toast.success(`Wyczyszczono: ${v} pojazdów, ${d} dostaw.`);
    } catch (err) {
      addLog(`BŁĄD: ${err}`);
      toast.error("Błąd podczas czyszczenia.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Trash2 size={22} style={{ color: "var(--color-danger)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          Czyszczenie bazy danych
        </h1>
      </div>

      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
      >
        <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "#ef444420", border: "1px solid #ef444440" }}>
          <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>Uwaga!</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
              Ta operacja usunie <strong>wszystkie pojazdy</strong> i <strong>wszystkie dostawy</strong> z bazy danych.
              Operacja jest nieodwracalna.
            </p>
          </div>
        </div>

        <button
          onClick={handleCleanup}
          disabled={running}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
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

        {log.length > 0 && (
          <div
            className="rounded-xl p-3 font-mono text-xs leading-relaxed"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-muted)" }}
          >
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
