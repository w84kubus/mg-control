"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useVehiclesStore } from "@/store/vehiclesStore";
import {
  getNextStage,
  getStageLabelPL,
  canClose,
  getStageIndex,
} from "@/lib/business/damageWorkflow";
import { toast } from "react-toastify";
import {
  AlertTriangle, Plus, X, ChevronRight, Shield,
  Search, ImageIcon, FileText, Upload, ExternalLink, Trash2,
} from "lucide-react";
import type { DamageReport, DamageStage, Vehicle } from "@/types";

type NotifType = DamageReport["stage"];

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

// ─── File Upload Section ──────────────────────────────────────────────────────

interface FileUploadSectionProps {
  label: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  hint?: string;
}

function FileUploadSection({ label, accept, multiple = false, files, onChange, hint }: FileUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return;
    const arr = Array.from(incoming);
    onChange(multiple ? [...files, ...arr] : arr);
  }

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  const isImage = accept.includes("image");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          {label}
        </label>
        {hint && (
          <span className="text-[10px]" style={{ color: "var(--color-muted)", opacity: 0.6 }}>
            {hint}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs hover:opacity-70 transition-opacity"
        style={{
          background: "var(--bg-primary)",
          border: "1px dashed var(--bg-border2)",
          color: "var(--color-accent)",
        }}
      >
        <Upload size={12} />
        {files.length === 0
          ? `Wybierz ${isImage ? "zdjęcia" : "plik"}…`
          : multiple
          ? `Dodaj więcej…`
          : "Zmień plik…"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Selected files list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-1">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border)" }}
            >
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="rounded shrink-0"
                  style={{ width: 32, height: 32, objectFit: "cover" }}
                />
              ) : (
                <FileText size={14} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
              )}
              <span className="text-xs flex-1 truncate" style={{ color: "var(--color-text)" }}>
                {f.name}
              </span>
              <span className="text-[10px] shrink-0" style={{ color: "var(--color-muted)" }}>
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="shrink-0 hover:opacity-70"
                style={{ color: "var(--color-danger)" }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

// ─── Attachment Viewer ────────────────────────────────────────────────────────

interface AttachmentSection {
  label: string;
  urls: string[];
  isPhoto?: boolean;
}

function AttachmentViewer({ sections }: { sections: AttachmentSection[] }) {
  const all = sections.filter((s) => s.urls.length > 0);
  if (all.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {all.map((sec) => (
        <div key={sec.label} className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
            {sec.label}
          </p>
          {sec.isPhoto ? (
            <div className="flex flex-wrap gap-1.5">
              {sec.urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Zdjęcie ${i + 1}`}
                    className="rounded-lg object-cover hover:opacity-80 transition-opacity"
                    style={{ width: 64, height: 64 }}
                  />
                </a>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {sec.urls.map((url, i) => {
                const name = decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? `Plik ${i + 1}`);
                const short = name.replace(/^\d+_/, "");
                return (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--bg-border2)",
                      color: "var(--color-text)",
                      textDecoration: "none",
                    }}
                  >
                    <FileText size={12} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
                    <span className="text-xs flex-1 truncate">{short}</span>
                    <ExternalLink size={10} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Damage Card ─────────────────────────────────────────────────────────────

interface DamageCardProps {
  report: DamageReport;
  canAdvance: boolean;
  canDelete: boolean;
  onAdvance: (report: DamageReport) => void;
  onClose: (report: DamageReport) => void;
  onToggleRepaired: (report: DamageReport) => void;
  onToggleSettled: (report: DamageReport) => void;
  onDelete: (report: DamageReport) => void;
}

function DamageCard({
  report,
  canAdvance,
  canDelete,
  onAdvance,
  onClose,
  onToggleRepaired,
  onToggleSettled,
  onDelete,
}: DamageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const stageColor = STAGE_COLORS[report.stage];
  const isAccepted = report.stage === "accepted_pending";
  const closeable = canClose(report.stage, report.physicallyRepaired, report.financiallySettled);

  const hasAttachments =
    (report.photoUrls?.length ?? 0) > 0 ||
    (report.kosztorysUrls?.length ?? 0) > 0 ||
    (report.listPrzewozowyUrls?.length ?? 0) > 0 ||
    (report.wycenaUrls?.length ?? 0) > 0;

  return (
    <div
      className="rounded-2xl flex flex-col"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
    >
      {/* Main content */}
      <div className="p-4 flex flex-col gap-3">
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

        {/* Actions row */}
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

          {/* Delete */}
          {canDelete && (
            <button
              onClick={() => onDelete(report)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444",
              }}
              title="Usuń zgłoszenie"
            >
              <Trash2 size={11} />
            </button>
          )}

          {/* Attachments toggle */}
          {hasAttachments && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity ml-auto"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--bg-border2)",
                color: "var(--color-muted)",
              }}
            >
              <ImageIcon size={11} />
              Załączniki
              {(report.photoUrls?.length ?? 0) + (report.kosztorysUrls?.length ?? 0) +
               (report.listPrzewozowyUrls?.length ?? 0) + (report.wycenaUrls?.length ?? 0) > 0 && (
                <span
                  className="px-1 rounded text-[9px] font-bold"
                  style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                  {(report.photoUrls?.length ?? 0) + (report.kosztorysUrls?.length ?? 0) +
                   (report.listPrzewozowyUrls?.length ?? 0) + (report.wycenaUrls?.length ?? 0)}
                </span>
              )}
            </button>
          )}

          <p
            className="text-xs shrink-0"
            style={{ color: "var(--color-muted)", marginLeft: hasAttachments ? undefined : "auto" }}
          >
            {report.createdAt?.toDate
              ? report.createdAt.toDate().toLocaleDateString("pl-PL")
              : "—"}
          </p>
        </div>
      </div>

      {/* Attachments panel */}
      {expanded && hasAttachments && (
        <div
          className="px-4 pb-4 pt-0"
          style={{ borderTop: "1px solid var(--bg-border)" }}
        >
          <div className="pt-3">
            <AttachmentViewer
              sections={[
                { label: "Zdjęcia", urls: report.photoUrls ?? [], isPhoto: true },
                { label: "Kosztorys BL", urls: report.kosztorysUrls ?? [] },
                { label: "List przewozowy", urls: report.listPrzewozowyUrls ?? [] },
                { label: "Wycena", urls: report.wycenaUrls ?? [] },
              ]}
            />
          </div>
        </div>
      )}
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
  // Files
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [kosztorysFiles, setKosztorysFiles] = useState<File[]>([]);
  const [listPrzewozowyFiles, setListPrzewozowyFiles] = useState<File[]>([]);
  const [wycenaFiles, setWycenaFiles] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

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
            changedAt: Timestamp.now(),
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
            changedAt: Timestamp.now(),
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

  // ── Delete report ───────────────────────────────────────────────────────────

  async function handleDelete(report: DamageReport) {
    if (!confirm(`Na pewno usunąć zgłoszenie szkody dla pojazdu ${report.vehicleVin.slice(-7)}? Operacja jest nieodwracalna.`)) return;
    try {
      const allUrls = [
        ...(report.photoUrls ?? []),
        ...(report.kosztorysUrls ?? []),
        ...(report.listPrzewozowyUrls ?? []),
        ...(report.wycenaUrls ?? []),
      ];
      await Promise.allSettled(
        allUrls.map((url) => {
          const match = url.match(/\/o\/(.+?)\?/);
          if (!match) return Promise.resolve();
          return deleteObject(storageRef(storage, decodeURIComponent(match[1]))).catch(() => {});
        })
      );
      await deleteDoc(doc(db, "damageReports", report.id));
      toast.success("Zgłoszenie usunięte.");
    } catch {
      toast.error("Nie udało się usunąć zgłoszenia.");
    }
  }

  // ── Upload helpers ──────────────────────────────────────────────────────────

  async function uploadCategory(docId: string, category: string, files: File[]): Promise<string[]> {
    if (!files.length) return [];
    return Promise.all(
      files.map(async (file) => {
        const path = `damageReports/${docId}/${category}/${Date.now()}_${file.name}`;
        const sRef = storageRef(storage, path);
        await uploadBytes(sRef, file);
        return getDownloadURL(sRef);
      })
    );
  }

  const openModal = () => {
    setVehicleSearch("");
    setSelectedVehicle(null);
    setDamageLocation("");
    setDescription("");
    setPhotoFiles([]);
    setKosztorysFiles([]);
    setListPrzewozowyFiles([]);
    setWycenaFiles([]);
    setUploadProgress("");
    setShowModal(true);
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicle) { toast.error("Wybierz pojazd."); return; }
    if (!user) return;
    setSaving(true);

    // 1. Create Firestore document
    let docRef;
    try {
      setUploadProgress("Tworzenie zgłoszenia…");
      docRef = await addDoc(collection(db, "damageReports"), {
        vehicleId: selectedVehicle.id,
        vehicleVin: selectedVehicle.vin,
        vehicleModel: selectedVehicle.model,
        stage: "to_report" as DamageStage,
        stageHistory: [],
        damageLocation: damageLocation.trim(),
        description: description.trim(),
        photoUrls: [],
        kosztorysUrls: [],
        listPrzewozowyUrls: [],
        wycenaUrls: [],
        physicallyRepaired: false,
        financiallySettled: false,
        closedAt: null,
        reportedBy: user.uid,
        reportedByName: user.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      toast.error("Nie udało się dodać zgłoszenia.");
      setSaving(false);
      setUploadProgress("");
      return;
    }

    // 2. Upload files — separate try/catch so a failed upload doesn't hide the saved report
    const totalFiles = photoFiles.length + kosztorysFiles.length + listPrzewozowyFiles.length + wycenaFiles.length;
    if (totalFiles > 0) {
      try {
        setUploadProgress(`Przesyłanie ${totalFiles} pliku(-ów)…`);
        const [photoUrls, kosztorysUrls, listPrzewozowyUrls, wycenaUrls] = await Promise.all([
          uploadCategory(docRef.id, "photos", photoFiles),
          uploadCategory(docRef.id, "kosztorys", kosztorysFiles),
          uploadCategory(docRef.id, "list_przewozowy", listPrzewozowyFiles),
          uploadCategory(docRef.id, "wycena", wycenaFiles),
        ]);
        setUploadProgress("Zapisywanie linków…");
        await updateDoc(docRef, {
          photoUrls,
          kosztorysUrls,
          listPrzewozowyUrls,
          wycenaUrls,
          updatedAt: serverTimestamp(),
        });
        toast.success("Zgłoszenie szkody dodane.");
      } catch (err) {
        console.error(err);
        toast.warning("Zgłoszenie zapisane, ale nie udało się przesłać plików. Spróbuj ponownie później.");
      }
    } else {
      toast.success("Zgłoszenie szkody dodane.");
    }

    setShowModal(false);
    setSaving(false);
    setUploadProgress("");
  }

  const canAdvance = user?.role === "logistics";
  const canCreate = user?.role === "logistics" || user?.role === "advisor" || user?.role === "salesperson";

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
              background: stageFilter === s ? STAGE_COLORS[s] : "var(--bg-surface)",
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
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
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
              canDelete={canAdvance}
              onAdvance={handleAdvance}
              onClose={handleClose}
              onToggleRepaired={handleToggleRepaired}
              onToggleSettled={handleToggleSettled}
              onDelete={handleDelete}
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
            className="relative w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto"
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
                      <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
                        {selectedVehicle.vin.slice(-7)}
                      </span>
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
                        {modalVehicles.length === 0 ? (
                          <p className="px-3 py-2 text-xs" style={{ color: "var(--color-muted)" }}>
                            Brak wyników
                          </p>
                        ) : (
                          modalVehicles.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => { setSelectedVehicle(v); setVehicleSearch(""); }}
                              className="w-full text-left px-3 py-2 text-xs hover:opacity-70"
                              style={{ borderBottom: "1px solid var(--bg-border)", color: "var(--color-text)" }}
                            >
                              {v.model}{" "}
                              <span className="font-mono" style={{ color: "var(--color-muted)" }}>
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

              {/* ── Attachments ── */}
              <div
                className="flex flex-col gap-3 p-3 rounded-xl"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)" }}
              >
                <div className="flex items-center gap-2">
                  <ImageIcon size={13} style={{ color: "var(--color-accent)" }} />
                  <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                    Załączniki
                  </p>
                  <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>opcjonalne</span>
                </div>

                <FileUploadSection
                  label="Zdjęcia"
                  accept="image/*"
                  multiple
                  files={photoFiles}
                  onChange={setPhotoFiles}
                  hint="JPG, PNG, HEIC"
                />
                <FileUploadSection
                  label="Kosztorys BL"
                  accept="image/*,application/pdf"
                  multiple
                  files={kosztorysFiles}
                  onChange={setKosztorysFiles}
                  hint="PDF lub zdjęcie"
                />
                <FileUploadSection
                  label="List przewozowy"
                  accept="image/*,application/pdf"
                  multiple={false}
                  files={listPrzewozowyFiles}
                  onChange={setListPrzewozowyFiles}
                  hint="skan PDF lub zdjęcie"
                />
                <FileUploadSection
                  label="Wycena"
                  accept="image/*,application/pdf"
                  multiple
                  files={wycenaFiles}
                  onChange={setWycenaFiles}
                  hint="PDF lub zdjęcie"
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
                  className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                  {saving ? (
                    <>
                      <div
                        className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0"
                        style={{ borderColor: "#ffffff60", borderTopColor: "#fff" }}
                      />
                      {uploadProgress || "Zapisywanie…"}
                    </>
                  ) : (
                    "Dodaj zgłoszenie"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
