"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import {
  Droplets,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Search,
  Check,
  Trash2,
  Loader2,
} from "lucide-react";
import { useVehiclesStore } from "@/store/vehiclesStore";
import type { WashWeekEntry, Vehicle } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"] as const;
const DAY_NAMES_SHORT = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob"] as const;
const MAX_SLOTS: Record<number, number> = { 0: 5, 1: 5, 2: 5, 3: 5, 4: 5, 5: 3 }; // Mon(0)–Sat(5)

/** Get Monday of the week containing `d`. */
function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Sunday → previous Monday
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateRange(monday: Date): string {
  const sat = addDays(monday, 5);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
  return `${fmt(monday)} – ${fmt(sat)}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === toISO(new Date());
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-primary)",
  border: "1px solid var(--bg-border2)",
  borderRadius: "0.75rem",
  color: "var(--color-text)",
  fontSize: "0.875rem",
  padding: "0.5rem 0.75rem",
  outline: "none",
  width: "100%",
};

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_CFG = {
  scheduled:   { label: "Zaplanowane", color: "#64748b", bg: "#64748b20" },
  in_progress: { label: "W trakcie",  color: "#eab308", bg: "#eab30820" },
  done:        { label: "Gotowe",     color: "#22c55e", bg: "#22c55e20" },
} as const;

// ─── Slot Card ───────────────────────────────────────────────────────────────

function SlotCard({
  entry,
  slotNum,
  onAdd,
  onStatusChange,
  onDelete,
}: {
  entry: WashWeekEntry | null;
  slotNum: number;
  onAdd: () => void;
  onStatusChange: (id: string, status: WashWeekEntry["status"]) => void;
  onDelete: (id: string) => void;
}) {
  if (!entry) {
    return (
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs transition-colors hover:opacity-80"
        style={{
          background: "var(--bg-primary)",
          border: "1px dashed var(--bg-border2)",
          color: "var(--color-muted)",
          minHeight: 44,
        }}
      >
        <Plus size={12} />
        <span>Slot {slotNum}</span>
      </button>
    );
  }

  const cfg = STATUS_CFG[entry.status];

  return (
    <div
      className="w-full rounded-xl px-3 py-2 flex flex-col gap-1 group relative"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.color}40`,
        minHeight: 44,
      }}
    >
      {/* Top row: model + actions */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
            {entry.vehicleModel}
          </p>
          <p className="text-[10px] font-mono truncate" style={{ color: "var(--color-muted)" }}>
            {entry.vehicleVin}
          </p>
        </div>
        {/* Action buttons – visible on hover */}
        <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {entry.status === "scheduled" && (
            <button
              onClick={() => onStatusChange(entry.id, "in_progress")}
              title="Rozpocznij"
              className="p-1 rounded-md hover:opacity-70"
              style={{ color: "#eab308" }}
            >
              <Droplets size={12} />
            </button>
          )}
          {entry.status === "in_progress" && (
            <button
              onClick={() => onStatusChange(entry.id, "done")}
              title="Gotowe"
              className="p-1 rounded-md hover:opacity-70"
              style={{ color: "#22c55e" }}
            >
              <Check size={12} />
            </button>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            title="Usuń"
            className="p-1 rounded-md hover:opacity-70"
            style={{ color: "#ef4444" }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Bottom row: color + owner + note */}
      <div className="flex items-center gap-1 flex-wrap">
        {entry.vehicleColor && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
            style={{ background: "var(--bg-primary)", color: "var(--color-muted)" }}
          >
            {entry.vehicleColor}
          </span>
        )}
        {entry.owner && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
            style={{ background: "var(--color-accent)20", color: "var(--color-accent)" }}
          >
            {entry.owner}
          </span>
        )}
      </div>
      {entry.note && (
        <p className="text-[10px] italic truncate" style={{ color: "var(--color-muted)" }}>
          {entry.note}
        </p>
      )}
    </div>
  );
}

// ─── Add Entry Modal ─────────────────────────────────────────────────────────

function AddModal({
  date,
  slot,
  dayName,
  onClose,
  onSave,
}: {
  date: string;
  slot: number;
  dayName: string;
  onClose: () => void;
  onSave: (data: {
    vehicleModel: string;
    vehicleColor: string;
    vehicleVin: string;
    owner: string;
    note: string;
  }) => Promise<void>;
}) {
  const { vehicles, subscribe } = useVehiclesStore();
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [manualModel, setManualModel] = useState("");
  const [manualColor, setManualColor] = useState("");
  const [manualVin, setManualVin] = useState("");
  const [owner, setOwner] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [useManual, setUseManual] = useState(false);

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  const filtered = useMemo(
    () =>
      vehicles
        .filter((v) =>
          vehicleSearch.trim()
            ? v.vin.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
              v.model.toLowerCase().includes(vehicleSearch.toLowerCase())
            : false
        )
        .slice(0, 6),
    [vehicles, vehicleSearch]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const model = selectedVehicle ? selectedVehicle.model : manualModel.trim();
    if (!model) {
      toast.error("Wpisz model pojazdu.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        vehicleModel: model,
        vehicleColor: selectedVehicle ? selectedVehicle.color : manualColor.trim(),
        vehicleVin: selectedVehicle ? selectedVehicle.vin : manualVin.trim(),
        owner: owner.trim(),
        note: note.trim(),
      });
      onClose();
    } catch {
      toast.error("Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  }

  const dateFormatted = new Date(date + "T00:00:00").toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              {dayName}, {dateFormatted}
            </h2>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              Slot {slot}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-70"
            style={{ color: "var(--color-muted)" }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Toggle: from system or manual */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setUseManual(false); setManualModel(""); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: !useManual ? "var(--color-accent)" : "var(--bg-primary)",
                color: !useManual ? "#fff" : "var(--color-muted)",
                border: `1px solid ${!useManual ? "var(--color-accent)" : "var(--bg-border2)"}`,
              }}
            >
              Z systemu
            </button>
            <button
              type="button"
              onClick={() => { setUseManual(true); setSelectedVehicle(null); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: useManual ? "var(--color-accent)" : "var(--bg-primary)",
                color: useManual ? "#fff" : "var(--color-muted)",
                border: `1px solid ${useManual ? "var(--color-accent)" : "var(--bg-border2)"}`,
              }}
            >
              Ręcznie
            </button>
          </div>

          {!useManual ? (
            /* Vehicle search from system */
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                Pojazd (VIN / model)
              </label>
              {selectedVehicle ? (
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--color-accent)",
                    color: "var(--color-text)",
                  }}
                >
                  <span>
                    {selectedVehicle.model}{" "}
                    <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
                      {selectedVehicle.vinShort}
                    </span>
                    {selectedVehicle.color && (
                      <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                        {" "}· {selectedVehicle.color}
                      </span>
                    )}
                  </span>
                  <button type="button" onClick={() => setSelectedVehicle(null)} style={{ color: "var(--color-muted)" }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--color-muted)" }}
                    />
                    <input
                      type="text"
                      placeholder="Wpisz VIN lub model…"
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: "2rem" }}
                    />
                  </div>
                  {vehicleSearch.trim() && (
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--bg-border2)",
                        maxHeight: "10rem",
                        overflowY: "auto",
                      }}
                    >
                      {filtered.length === 0 ? (
                        <p className="px-3 py-2 text-xs" style={{ color: "var(--color-muted)" }}>
                          Brak wyników
                        </p>
                      ) : (
                        filtered.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => { setSelectedVehicle(v); setVehicleSearch(""); }}
                            className="w-full text-left px-3 py-2 text-xs hover:opacity-70"
                            style={{ borderBottom: "1px solid var(--bg-border)", color: "var(--color-text)" }}
                          >
                            {v.model}{" "}
                            <span className="font-mono" style={{ color: "var(--color-muted)" }}>
                              {v.vinShort}
                            </span>
                            {v.color && <span style={{ color: "var(--color-muted)" }}> · {v.color}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Manual entry */
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Model (np. HS+, ZS NEW)"
                value={manualModel}
                onChange={(e) => setManualModel(e.target.value)}
                style={inputStyle}
                required
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Kolor"
                  value={manualColor}
                  onChange={(e) => setManualColor(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="VIN / nr rej."
                  value={manualVin}
                  onChange={(e) => setManualVin(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* Owner */}
          <input
            type="text"
            placeholder="Czyje auto (np. DEMO, SALON, imię)"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            style={inputStyle}
          />

          {/* Note */}
          <input
            type="text"
            placeholder="Notatka (opcjonalnie)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={inputStyle}
          />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--bg-border2)",
                color: "var(--color-muted)",
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving || (!selectedVehicle && !manualModel.trim())}
              className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              {saving ? "Zapisywanie…" : "Zapisz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function WashQueuePage() {
  const { user } = useAuthStore();
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [entries, setEntries] = useState<WashWeekEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTarget, setAddTarget] = useState<{ date: string; slot: number; dayIdx: number } | null>(null);

  // Week dates (Mon–Sat = 6 days)
  const weekDates = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekLabel = useMemo(() => formatDateRange(weekStart), [weekStart]);

  // Navigate weeks
  const prevWeek = useCallback(() => setWeekStart((d) => addDays(d, -7)), []);
  const nextWeek = useCallback(() => setWeekStart((d) => addDays(d, 7)), []);
  const goToday = useCallback(() => setWeekStart(getMonday(new Date())), []);

  // Subscribe to entries for current week
  useEffect(() => {
    const startISO = toISO(weekDates[0]);
    const endISO = toISO(weekDates[5]);

    const q = query(
      collection(db, "washWeek"),
      where("date", ">=", startISO),
      where("date", "<=", endISO)
    );

    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WashWeekEntry));
        setEntries(data);
        setLoading(false);
      },
      () => {
        toast.error("Błąd ładowania planu myjni.");
        setLoading(false);
      }
    );
    return unsub;
  }, [weekDates]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map: Record<string, WashWeekEntry[]> = {};
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    // Sort each day by slot
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.slot - b.slot);
    }
    return map;
  }, [entries]);

  // Save new entry
  async function handleSave(
    date: string,
    slot: number,
    data: { vehicleModel: string; vehicleColor: string; vehicleVin: string; owner: string; note: string }
  ) {
    if (!user) return;
    const docId = `${date}_slot${slot}`;
    await setDoc(doc(db, "washWeek", docId), {
      date,
      slot,
      vehicleModel: data.vehicleModel,
      vehicleColor: data.vehicleColor,
      vehicleVin: data.vehicleVin,
      owner: data.owner,
      note: data.note,
      status: "scheduled",
      createdBy: user.uid,
      createdByName: user.displayName ?? "Nieznany",
      createdAt: serverTimestamp(),
      updatedAt: null,
    });
    toast.success("Zapisano w planie myjni.");
  }

  // Update status
  async function handleStatusChange(id: string, status: WashWeekEntry["status"]) {
    await updateDoc(doc(db, "washWeek", id), { status, updatedAt: serverTimestamp() });
  }

  // Delete entry
  async function handleDelete(id: string) {
    try {
      await deleteDoc(doc(db, "washWeek", id));
      toast.success("Usunięto z planu.");
    } catch {
      toast.error("Nie udało się usunąć.");
    }
  }

  // Find first free slot for a given day
  function findFreeSlot(date: string, dayIdx: number): number | null {
    const max = MAX_SLOTS[dayIdx] ?? 5;
    const taken = new Set((entriesByDate[date] ?? []).map((e) => e.slot));
    for (let s = 1; s <= max; s++) {
      if (!taken.has(s)) return s;
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Droplets size={22} style={{ color: "var(--color-accent)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            Myjnia – plan tygodnia
          </h1>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--bg-border2)",
              color: "var(--color-accent)",
            }}
          >
            Dziś
          </button>
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg hover:opacity-70"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-muted)" }}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="text-sm font-semibold min-w-[140px] text-center"
            style={{ color: "var(--color-text)" }}
          >
            {weekLabel}
          </span>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg hover:opacity-70"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-muted)" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Week grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin" size={24} style={{ color: "var(--color-accent)" }} />
        </div>
      ) : (
        <div
          className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        >
          {weekDates.map((date, dayIdx) => {
            const iso = toISO(date);
            const dayEntries = entriesByDate[iso] ?? [];
            const maxSlots = MAX_SLOTS[dayIdx] ?? 5;
            const today = isToday(iso);
            const dayNum = date.getDate();
            const takenSlots = new Set(dayEntries.map((e) => e.slot));

            return (
              <div
                key={iso}
                className="rounded-2xl flex flex-col overflow-hidden"
                style={{
                  background: "var(--bg-surface)",
                  border: today ? "2px solid var(--color-accent)" : "1px solid var(--bg-border)",
                }}
              >
                {/* Day header */}
                <div
                  className="px-3 py-2.5 flex items-center justify-between"
                  style={{
                    background: today ? "var(--color-accent)15" : "var(--bg-primary)",
                    borderBottom: "1px solid var(--bg-border)",
                  }}
                >
                  <div>
                    <p
                      className="text-xs font-bold"
                      style={{ color: today ? "var(--color-accent)" : "var(--color-text)" }}
                    >
                      <span className="hidden lg:inline">{DAY_NAMES[dayIdx]}</span>
                      <span className="lg:hidden">{DAY_NAMES_SHORT[dayIdx]}</span>
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                      {date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{
                      background: dayEntries.length >= maxSlots ? "#ef444420" : "var(--bg-primary)",
                      color: dayEntries.length >= maxSlots ? "#ef4444" : "var(--color-muted)",
                      border: "1px solid var(--bg-border2)",
                    }}
                  >
                    {dayEntries.length}/{maxSlots}
                  </span>
                </div>

                {/* Slots */}
                <div className="flex flex-col gap-1.5 p-2">
                  {Array.from({ length: maxSlots }, (_, slotIdx) => {
                    const slotNum = slotIdx + 1;
                    const entry = dayEntries.find((e) => e.slot === slotNum) ?? null;

                    return (
                      <SlotCard
                        key={slotNum}
                        entry={entry}
                        slotNum={slotNum}
                        onAdd={() => setAddTarget({ date: iso, slot: slotNum, dayIdx })}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {addTarget && (
        <AddModal
          date={addTarget.date}
          slot={addTarget.slot}
          dayName={DAY_NAMES[addTarget.dayIdx]}
          onClose={() => setAddTarget(null)}
          onSave={(data) => handleSave(addTarget.date, addTarget.slot, data)}
        />
      )}
    </div>
  );
}
