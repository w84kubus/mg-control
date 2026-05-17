"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useVehiclesStore } from "@/store/vehiclesStore";
import {
  getNextStage,
  getStageLabelPL,
  canClose,
  getStageIndex,
} from "@/lib/business/damageWorkflow";
import { toast } from "react-toastify";
import { AlertTriangle, Plus, X, ChevronRight, Shield } from "lucide-react";
import type { DamageReport, DamageStage, Vehicle } from "@/types";
import { Search } from "lucide-react";

const STAGE_COLORS: Record<DamageStage, string> = {
  to_report: "#64748b",
  reported: "#eab308",
  accepted_pending: "#a78bfa",
  resolved: "#22c55e",
};

const ALL_STAGES: DamageStage[] = ["to_report", "reported", "accepted_pending", "resolved"];

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

// ─── Stage Stepper ────────────────────────────────────────────────────────────

function StageStepper({ stage }: { stage: DamageStage }) {
  const currentIdx = getStageIndex(stage);
  return (
    <div className="flex items-center gap-0">
      {ALL_STAGES.map((s, idx) => {
        const isActive = idx === currentIdx;
        const isPast = idx < currentIdx;
        const color = isPast || isActive ? STAGE_COLORS[s] : "var(--bg-border2)";
        return (
          <div key={s} className="flex items-center">
            <div
              title={getStageLabelPL(s)}
              style={{
                width: "0.75rem",
                height: "0.75rem",
                borderRadius: "50%",
                background: color,
                border: isActive ? `2px solid ${STAGE_COLORS[s]}` : "2px solid transparent",
                boxShadow: isActive ? `0 0 0 2px ${STAGE_COLORS[s]}40` : "none",
                flexShrink: 0,
              }}
            />
            {idx < ALL_STAGES.length - 1 && (
              <div
                style={{
                  width: "1.5rem",
                  height: "2px",
                  background: idx < currentIdx ? STAGE_COLORS[ALL_STAGES[idx]] : "var(--bg-border2)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Damage Card ─────────────────────────────────────────────────────────────

interface DamageCardProps {
  report: DamageReport;
  canAdvance: boolean;
  onAdvance: (report: DamageReport) => void;
  onClose: (report: DamageReport) => void;
  onToggleRepaired: (report: DamageReport) => void;
  onToggleSettled: (report: DamageReport) => void;
}

function DamageCard({
  report,
  canAdvance,
  onAdvance,
  onClose,
  onToggleRepaired,
  onToggleSettled,
}: DamageCardProps) {
  const stageColor = STAGE_COLORS[report.stage];
  const isAccepted = report.stage === "accepted_pending";
  const closeable = canClose(report.stage, report.physicallyRepaired, report.financiallySettled);

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
            {report.vehicleModel}
          </p>
          <p className="text-xs font-mono" style={{ color: "var(--color-muted)" }}>
            {report.vehicleVin.slice(-7)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: stageColor + "26",
              color: stageColor,
              border: `1px solid ${stageColor}40`,
            }}
          >
            {getStageLabelPL(report.stage)}
          </span>
          <StageStepper stage={report.stage} />
        </div>
      </div>

      {/* Location & description */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          Lokalizacja:{" "}
          <span style={{ color: "var(--color-text)" }}>{report.damageLocation || "—"}</span>
        </p>
        {report.description && (
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            {report.description}
          </p>
        )}
      </div>

      {/* Checkboxes for accepted_pending */}
      {isAccepted && (
        <div
          className="flex flex-col gap-2 p-3 rounded-xl"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)" }}
        >
          <CheckboxRow
            checked={report.physicallyRepaired}
            label="Naprawa fizyczna wykonana"
            onChange={() => onToggleRepaired(report)}
          />
          <CheckboxRow
            checked={report.financiallySettled}
            label="Rozliczenie finansowe"
            onChange={() => onToggleSettled(report)}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {canAdvance && report.stage !== "accepted_pending" && (
          <button
            onClick={() => onAdvance(report)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--bg-border2)",
              color: "var(--color-text)",
            }}
          >
            Przesuń etap <ChevronRight size={12} />
          </button>
        )}
        {canAdvance && report.stage === "accepted_pending" && !closeable && (
          <button
            onClick={() => onAdvance(report)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--bg-border2)",
              color: "var(--color-text)",
            }}
          >
            Przesuń etap <ChevronRight size={12} />
          </button>
        )}
        {closeable && (
          <button
            onClick={() => onClose(report)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{
              background: "#22c55e26",
              border: "1px solid #22c55e40",
              color: "#22c55e",
            }}
          >
            <Shield size={12} /> Zamknij szkodę
          </button>
        )}
        <p className="text-xs ml-auto" style={{ color: "var(--color-muted)" }}>
          {report.createdAt?.toDate
            ? report.createdAt.toDate().toLocaleDateString("pl-PL")
            : "—"}
        </p>
      </div>
    </div>
  );
}

function CheckboxRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity w-fit"
      style={{ color: checked ? "var(--color-text)" : "var(--color-muted)" }}
    >
      {checked ? (
        <Shield size={14} style={{ color: "#22c55e" }} />
      ) : (
        <div
          style={{
            width: 14,
            height: 14,
            border: "1px solid var(--bg-border2)",
            borderRadius: 4,
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DamageReportsPage() {
  const { user } = useAuthStore();
  const { vehicles, subscribe } = useVehiclesStore();

  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<DamageStage | "all">("all");
  const [showModal, setShowModal] = useState(false);

  // Modal state
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [damageLocation, setDamageLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  useEffect(() => {
    const q = query(collection(db, "damageReports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DamageReport)));
        setLoading(false);
      },
      () => {
        toast.error("Błąd ładowania szkód.");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  async function handleAdvance(report: DamageReport) {
    const next = getNextStage(report.stage);
    if (!next) return;
    if (!user) return;
    try {
      await updateDoc(doc(db, "damageReports", report.id), {
        stage: next,
        stageHistory: [
          ...(report.stageHistory ?? []),
          {
            stage: next,
            changedAt: serverTimestamp(),
            changedBy: user.uid,
            changedByName: user.displayName,
            notes: "",
          },
        ],
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error("Nie udało się przesunąć etapu.");
    }
  }

  async function handleClose(report: DamageReport) {
    if (!user) return;
    try {
      await updateDoc(doc(db, "damageReports", report.id), {
        stage: "resolved" as DamageStage,
        closedAt: serverTimestamp(),
        stageHistory: [
          ...(report.stageHistory ?? []),
          {
            stage: "resolved",
            changedAt: serverTimestamp(),
            changedBy: user.uid,
            changedByName: user.displayName,
            notes: "Szkoda zamknięta",
          },
        ],
        updatedAt: serverTimestamp(),
      });
      toast.success("Szkoda zamknięta.");
    } catch {
      toast.error("Nie udało się zamknąć szkody.");
    }
  }

  async function handleToggleRepaired(report: DamageReport) {
    try {
      await updateDoc(doc(db, "damageReports", report.id), {
        physicallyRepaired: !report.physicallyRepaired,
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error("Nie udało się zaktualizować.");
    }
  }

  async function handleToggleSettled(report: DamageReport) {
    try {
      await updateDoc(doc(db, "damageReports", report.id), {
        financiallySettled: !report.financiallySettled,
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error("Nie udało się zaktualizować.");
    }
  }

  const openModal = () => {
    setVehicleSearch("");
    setSelectedVehicle(null);
    setDamageLocation("");
    setDescription("");
    setShowModal(true);
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicle) {
      toast.error("Wybierz pojazd.");
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "damageReports"), {
        vehicleId: selectedVehicle.id,
        vehicleVin: selectedVehicle.vin,
        vehicleModel: selectedVehicle.model,
        stage: "to_report" as DamageStage,
        stageHistory: [],
        damageLocation: damageLocation.trim(),
        description: description.trim(),
        photoUrls: [],
        documentUrls: [],
        physicallyRepaired: false,
        financiallySettled: false,
        closedAt: null,
        reportedBy: user.uid,
        reportedByName: user.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Zgłoszenie szkody dodane.");
      setShowModal(false);
    } catch {
      toast.error("Nie udało się dodać zgłoszenia.");
    } finally {
      setSaving(false);
    }
  }

  const canAdvance = user?.role === "logistics";
  const canCreate = user?.role === "logistics" || user?.role === "advisor";

  const stageCounts = ALL_STAGES.reduce<Record<DamageStage, number>>(
    (acc, s) => {
      acc[s] = reports.filter((r) => r.stage === s).length;
      return acc;
    },
    { to_report: 0, reported: 0, accepted_pending: 0, resolved: 0 }
  );

  const filtered =
    stageFilter === "all" ? reports : reports.filter((r) => r.stage === stageFilter);

  const modalVehicles = vehicles
    .filter((v) =>
      vehicleSearch.trim()
        ? v.vin.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
          v.model.toLowerCase().includes(vehicleSearch.toLowerCase())
        : true
    )
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <AlertTriangle size={22} style={{ color: "var(--color-accent)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            Szkody
          </h1>
        </div>
        {canCreate && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            <Plus size={14} /> Nowe zgłoszenie
          </button>
        )}
      </div>

      {/* Stage filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStageFilter("all")}
          className="px-3 py-1 rounded-full text-xs font-medium transition-opacity"
          style={{
            background: stageFilter === "all" ? "var(--color-accent)" : "var(--bg-surface)",
            color: stageFilter === "all" ? "#fff" : "var(--color-muted)",
            border: "1px solid var(--bg-border)",
          }}
        >
          Wszystkie ({reports.length})
        </button>
        {ALL_STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-opacity"
            style={{
              background:
                stageFilter === s ? STAGE_COLORS[s] : "var(--bg-surface)",
              color: stageFilter === s ? "#fff" : "var(--color-muted)",
              border: "1px solid var(--bg-border)",
            }}
          >
            {getStageLabelPL(s)} ({stageCounts[s]})
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "var(--color-accent)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl flex items-center justify-center py-16"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Brak zgłoszeń szkód.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((report) => (
            <DamageCard
              key={report.id}
              report={report}
              canAdvance={canAdvance}
              onAdvance={handleAdvance}
              onClose={handleClose}
              onToggleRepaired={handleToggleRepaired}
              onToggleSettled={handleToggleSettled}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
                Nowe zgłoszenie szkody
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:opacity-70"
                style={{ color: "var(--color-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {/* Vehicle search */}
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
                      <span
                        className="font-mono text-xs"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {selectedVehicle.vin.slice(-7)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedVehicle(null)}
                      style={{ color: "var(--color-muted)" }}
                    >
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
                          maxHeight: "12rem",
                          overflowY: "auto",
                        }}
                      >
                        {modalVehicles.length === 0 ? (
                          <p
                            className="px-3 py-2 text-xs"
                            style={{ color: "var(--color-muted)" }}
                          >
                            Brak wyników
                          </p>
                        ) : (
                          modalVehicles.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                setSelectedVehicle(v);
                                setVehicleSearch("");
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:opacity-70"
                              style={{
                                borderBottom: "1px solid var(--bg-border)",
                                color: "var(--color-text)",
                              }}
                            >
                              {v.model}{" "}
                              <span
                                className="font-mono"
                                style={{ color: "var(--color-muted)" }}
                              >
                                {v.vin.slice(-7)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Damage location */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Lokalizacja uszkodzenia
                </label>
                <input
                  type="text"
                  placeholder="np. Zderzak przedni, Drzwi lewe…"
                  value={damageLocation}
                  onChange={(e) => setDamageLocation(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Opis uszkodzenia
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Szczegółowy opis…"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  disabled={saving || !selectedVehicle || !damageLocation.trim()}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                  {saving ? "Zapisywanie…" : "Dodaj zgłoszenie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
