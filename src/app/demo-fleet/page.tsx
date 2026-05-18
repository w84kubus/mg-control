"use client";

import { useState, useEffect } from "react";
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import {
  Car, Plus, X, Pencil, Trash2, ChevronDown, ChevronUp, ScanLine, Building2,
} from "lucide-react";
import dynamic from "next/dynamic";

const BarcodeScannerInline = dynamic(
  () => import("@/components/scanner/BarcodeScannerInline"),
  { ssr: false }
);

const MG_MODELS = [
  "HS HEV", "HS", "HS PHEV", "ZS HEV", "ZS",
  "MG3", "MG4 EV", "MG S5 EV", "MG S6 EV", "MG S9 PHEV", "CYBERSTER",
];

const COLORS = [
  "BLACK", "GRAY", "SILVER", "WHITE", "BLUE", "GREEN", "RED", "YELLOW", "ORANGE",
];

type VehicleCategory = "demo" | "company";

interface CompanyVehicle {
  id: string;
  category: VehicleCategory;
  model: string;
  color: string;
  licensePlate: string;
  vin: string;
  mileageDate: string | null;
  mileage: number | null;
  assignedTo: string;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function normalizeModel(raw: string): string {
  const t = raw.trim();
  // Exact match
  if (MG_MODELS.includes(t)) return t;
  // Strip legacy "MG " prefix (old records stored e.g. "MG MG4 EV")
  const stripped = t.startsWith("MG ") ? t.slice(3) : t;
  if (MG_MODELS.includes(stripped)) return stripped;
  // Case-insensitive fallback (handles "Cyberster", "cyberster", etc.)
  const tUp = t.toUpperCase();
  const strUp = stripped.toUpperCase();
  const ciMatch = MG_MODELS.find(
    (m) => m.toUpperCase() === tUp || m.toUpperCase() === strUp
  );
  return ciMatch ?? MG_MODELS[0];
}

const COLOR_LEGACY: Record<string, string> = {
  BIAŁY: "WHITE", BIALY: "WHITE",
  CZARNY: "BLACK",
  SZARY: "GRAY",
  SREBRNY: "SILVER",
  NIEBIESKI: "BLUE",
  CZERWONY: "RED",
  ZIELONY: "GREEN",
  ŻÓŁTY: "YELLOW", ZOLTY: "YELLOW",
  "POMARAŃCZOWY": "ORANGE", POMARANCZOWY: "ORANGE",
};

function normalizeColor(raw: string): string {
  const upper = raw.toUpperCase();
  if (COLORS.includes(upper)) return upper;
  return COLOR_LEGACY[upper] ?? COLORS[0];
}

const inputCls = "w-full px-3 py-2 rounded-xl text-sm outline-none";
const inputStyle: React.CSSProperties = {
  background: "var(--bg-primary)",
  border: "1px solid var(--bg-border2)",
  color: "var(--color-text)",
};

// ─── Shared table/card component ─────────────────────────────────────────────

function VehicleTable({
  vehicles,
  onEdit,
  onDelete,
}: {
  vehicles: CompanyVehicle[];
  onEdit: (v: CompanyVehicle) => void;
  onDelete: (id: string) => void;
}) {
  const [sortField, setSortField] = useState<"model" | "mileageDate">("model");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleSort(field: "model" | "mileageDate") {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  }

  const sorted = [...vehicles].sort((a, b) => {
    const cmp = sortField === "model"
      ? a.model.localeCompare(b.model)
      : (a.mileageDate ?? "").localeCompare(b.mileageDate ?? "");
    return sortAsc ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: "model" | "mileageDate" }) =>
    sortField !== field ? null : sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;

  if (vehicles.length === 0) return null;

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block rounded-2xl overflow-hidden"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bg-border)" }}>
                {[
                  { key: "model", label: "Model", sortable: true },
                  { key: "color", label: "Kolor" },
                  { key: "plate", label: "Nr rej." },
                  { key: "vin", label: "VIN" },
                  { key: "assignedTo", label: "Przypisane do" },
                  { key: "mileageDate", label: "Data przebiegu", sortable: true },
                  { key: "mileage", label: "Przebieg" },
                  { key: "notes", label: "Adnotacje" },
                  { key: "actions", label: "" },
                ].map((h) => (
                  <th key={h.key}
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${h.sortable ? "cursor-pointer select-none hover:opacity-70" : ""}`}
                      style={{ color: "var(--color-muted)" }}
                      onClick={() => h.sortable && toggleSort(h.key as "model" | "mileageDate")}>
                    <span className="flex items-center gap-1">
                      {h.label}
                      {h.sortable && <SortIcon field={h.key as "model" | "mileageDate"} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((v) => (
                <tr key={v.id} className="hover:opacity-90 transition-opacity"
                    style={{ borderBottom: "1px solid var(--bg-border)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text)" }}>
                    {v.model}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                    {v.color || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-medium" style={{ color: "var(--color-text)" }}>
                    {v.licensePlate || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
                      {v.vin ? v.vin.slice(-7) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                    {v.assignedTo || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                    {v.mileageDate ? new Date(v.mileageDate).toLocaleDateString("pl-PL") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium" style={{ color: "var(--color-text)" }}>
                    {v.mileage != null ? `${v.mileage.toLocaleString("pl-PL")} km` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[160px] truncate" style={{ color: "var(--color-muted)" }}
                      title={v.notes}>
                    {v.notes || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEdit(v)} title="Edytuj"
                              className="p-1.5 rounded-lg hover:opacity-70"
                              style={{ color: "var(--color-accent)" }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(v.id)} title="Usuń"
                              className="p-1.5 rounded-lg hover:opacity-70"
                              style={{ color: "var(--color-danger)" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {sorted.map((v) => (
          <div key={v.id} className="rounded-2xl p-4"
               style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                  {v.model}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                  {v.color} · {v.licensePlate || "brak nr rej."}
                </p>
                {v.assignedTo && (
                  <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--color-accent)" }}>
                    {v.assignedTo}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(v)} className="p-1.5 rounded-lg"
                        style={{ color: "var(--color-accent)" }}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(v.id)} className="p-1.5 rounded-lg"
                        style={{ color: "var(--color-danger)" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <button onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                    className="w-full mt-2 pt-2 flex items-center justify-between text-xs"
                    style={{ borderTop: "1px solid var(--bg-border)", color: "var(--color-muted)" }}>
              <span>Szczegóły</span>
              {expandedId === v.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {expandedId === v.id && (
              <div className="mt-2 flex flex-col gap-1.5 text-xs" style={{ color: "var(--color-muted)" }}>
                <div className="flex justify-between">
                  <span>VIN</span>
                  <span className="font-mono" style={{ color: "var(--color-text)" }}>{v.vin || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data przebiegu</span>
                  <span style={{ color: "var(--color-text)" }}>
                    {v.mileageDate ? new Date(v.mileageDate).toLocaleDateString("pl-PL") : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Przebieg</span>
                  <span style={{ color: "var(--color-text)" }}>
                    {v.mileage != null ? `${v.mileage.toLocaleString("pl-PL")} km` : "—"}
                  </span>
                </div>
                {v.notes && (
                  <div className="mt-1 p-2 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                    {v.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
  accent,
  onAdd,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: accent + "20" }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>{title}</h2>
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            {count} {count === 1 ? "pojazd" : "pojazdów"}
          </p>
        </div>
      </div>
      <button onClick={onAdd}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: accent, color: "#fff" }}>
        <Plus size={13} /> Dodaj
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompanyVehiclesPage() {
  const { user } = useAuthStore();
  const [vehicles, setVehicles] = useState<CompanyVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Form state
  const [category, setCategory] = useState<VehicleCategory>("demo");
  const [model, setModel] = useState(MG_MODELS[0]);
  const [modelFree, setModelFree] = useState(""); // for company category
  const [color, setColor] = useState(COLORS[0]);
  const [licensePlate, setLicensePlate] = useState("");
  const [vin, setVin] = useState("");
  const [mileageDate, setMileageDate] = useState("");
  const [mileage, setMileage] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "companyVehicles"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q,
      (snap) => {
        setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompanyVehicle)));
        setLoading(false);
      },
      () => { toast.error("Błąd ładowania aut."); setLoading(false); }
    );
    return unsub;
  }, []);

  function resetForm() {
    setModel(MG_MODELS[0]);
    setModelFree("");
    setColor(COLORS[0]);
    setLicensePlate("");
    setVin("");
    setMileageDate("");
    setMileage("");
    setAssignedTo("");
    setNotes("");
    setEditingId(null);
    setShowScanner(false);
  }

  function openAdd(cat: VehicleCategory) {
    resetForm();
    setCategory(cat);
    setShowModal(true);
  }

  function openEdit(v: CompanyVehicle) {
    const cat = v.category ?? "demo";
    setCategory(cat);
    if (cat === "demo") {
      const resolvedDemoModel = normalizeModel(v.model ?? "");
      if (resolvedDemoModel === MG_MODELS[0] && v.model && v.model !== MG_MODELS[0]) {
        console.warn("[openEdit] model nie rozpoznany, fallback do HS HEV. Oryginał:", JSON.stringify(v.model));
      }
      setModel(resolvedDemoModel);
      setModelFree("");
    } else {
      setModel(MG_MODELS[0]);
      setModelFree(v.model);
    }
    setColor(normalizeColor(v.color));
    setLicensePlate(v.licensePlate);
    setVin(v.vin);
    setMileageDate(v.mileageDate ?? "");
    setMileage(v.mileage != null ? String(v.mileage) : "");
    setAssignedTo(v.assignedTo ?? "");
    setNotes(v.notes);
    setEditingId(v.id);
    setShowScanner(false);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const resolvedModel = category === "demo"
      ? model
      : modelFree.trim() || "—";

    const data = {
      category,
      model: resolvedModel,
      color,
      licensePlate: licensePlate.trim().toUpperCase(),
      vin: vin.trim().toUpperCase(),
      mileageDate: mileageDate || null,
      mileage: mileage ? parseInt(mileage) : null,
      assignedTo: assignedTo.trim(),
      notes: notes.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "companyVehicles", editingId), data);
        toast.success("Zaktualizowano.");
      } else {
        await addDoc(collection(db, "companyVehicles"), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
        toast.success("Dodano.");
      }
      setShowModal(false);
      resetForm();
    } catch {
      toast.error("Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Na pewno usunąć to auto?")) return;
    try {
      await deleteDoc(doc(db, "companyVehicles", id));
      toast.success("Usunięto.");
    } catch {
      toast.error("Nie udało się usunąć.");
    }
  }

  const demoVehicles = vehicles.filter((v) => (v.category ?? "demo") === "demo");
  const companyVehicles = vehicles.filter((v) => v.category === "company");

  const modalTitle = editingId
    ? "Edytuj pojazd"
    : category === "demo" ? "Dodaj auto demo" : "Dodaj auto firmowe";

  return (
    <div className="flex flex-col gap-8 max-w-5xl">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <Car size={22} style={{ color: "var(--color-accent)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          Auta firmowe
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 rounded-full animate-spin"
               style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <>
          {/* ── SEKCJA DEMO ── */}
          <div className="flex flex-col gap-4">
            <SectionHeader
              icon={<Car size={16} />}
              title="Auta demonstracyjne"
              count={demoVehicles.length}
              accent="var(--color-accent)"
              onAdd={() => openAdd("demo")}
            />

            {demoVehicles.length === 0 ? (
              <div className="rounded-2xl flex flex-col items-center justify-center py-10 gap-2"
                   style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
                <Car size={28} style={{ color: "var(--color-muted)" }} />
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  Brak aut demonstracyjnych.
                </p>
              </div>
            ) : (
              <VehicleTable
                vehicles={demoVehicles}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )}
          </div>

          {/* separator */}
          <div style={{ height: 1, background: "var(--bg-border)" }} />

          {/* ── SEKCJA FIRMOWE ── */}
          <div className="flex flex-col gap-4">
            <SectionHeader
              icon={<Building2 size={16} />}
              title="Auta firmowe (zastępcze / kierownicze)"
              count={companyVehicles.length}
              accent="#a78bfa"
              onAdd={() => openAdd("company")}
            />

            {companyVehicles.length === 0 ? (
              <div className="rounded-2xl flex flex-col items-center justify-center py-10 gap-2"
                   style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
                <Building2 size={28} style={{ color: "var(--color-muted)" }} />
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  Brak aut firmowych.
                </p>
              </div>
            ) : (
              <VehicleTable
                vehicles={companyVehicles}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        </>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="relative w-full max-w-md rounded-2xl flex flex-col max-h-[90vh] overflow-y-auto"
               style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4"
                 style={{ borderBottom: "1px solid var(--bg-border)" }}>
              <div className="flex items-center gap-2">
                {category === "demo"
                  ? <Car size={16} style={{ color: "var(--color-accent)" }} />
                  : <Building2 size={16} style={{ color: "#a78bfa" }} />}
                <h2 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                  {modalTitle}
                </h2>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }}
                      style={{ color: "var(--color-muted)" }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

              {/* Model */}
              {category === "demo" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Model *</label>
                    <select className={inputCls} style={inputStyle} value={model}
                            onChange={(e) => setModel(e.target.value)}>
                      {MG_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Kolor</label>
                    <select className={inputCls} style={inputStyle} value={color}
                            onChange={(e) => setColor(e.target.value)}>
                      {COLORS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Marka i model *</label>
                    <input className={inputCls} style={inputStyle}
                           value={modelFree} onChange={(e) => setModelFree(e.target.value)}
                           placeholder="np. MG ZS" required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Kolor</label>
                    <select className={inputCls} style={inputStyle} value={color}
                            onChange={(e) => setColor(e.target.value)}>
                      {COLORS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Przypisane do — tylko dla firmowych */}
              {category === "company" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Przypisane do</label>
                  <input className={inputCls} style={inputStyle}
                         value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
                         placeholder="np. Dyrektor, Serwis zastępczy…" />
                </div>
              )}

              {/* Nr rej */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Nr rejestracyjny</label>
                <input className={inputCls} style={{ ...inputStyle, textTransform: "uppercase" }}
                       value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)}
                       placeholder="WA 12345" maxLength={10} />
              </div>

              {/* VIN */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>VIN</label>
                <div className="flex gap-2">
                  <input className={inputCls + " flex-1"} value={vin}
                         onChange={(e) => setVin(e.target.value)}
                         placeholder="LSJXXXXXXXXXXXXX" maxLength={17}
                         style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }} />
                  <button type="button" onClick={() => setShowScanner(!showScanner)}
                          className="px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold shrink-0"
                          style={{
                            background: showScanner ? "var(--color-accent)" : "var(--bg-primary)",
                            color: showScanner ? "#fff" : "var(--color-accent)",
                            border: `1px solid ${showScanner ? "var(--color-accent)" : "var(--bg-border2)"}`,
                          }}>
                    <ScanLine size={14} />
                    <span className="hidden sm:inline">Skanuj</span>
                  </button>
                </div>
                {showScanner && (
                  <BarcodeScannerInline
                    onScan={(scanned) => { setVin(scanned); setShowScanner(false); }}
                    onClose={() => setShowScanner(false)}
                  />
                )}
              </div>

              {/* Przebieg */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Data przebiegu</label>
                  <input type="date" className={inputCls}
                         style={{ ...inputStyle, width: "auto", maxWidth: "12rem" }}
                         value={mileageDate} onChange={(e) => setMileageDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Przebieg (km)</label>
                  <input type="number" className={inputCls} style={inputStyle}
                         value={mileage} onChange={(e) => setMileage(e.target.value)}
                         placeholder="np. 12500" min={0} />
                </div>
              </div>

              {/* Adnotacje */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Adnotacje</label>
                <textarea className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)}
                          rows={3} placeholder="np. ubezpieczenie do 03.2026, serwis planowany…"
                          style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                        className="flex-1 py-2 rounded-xl text-sm font-medium"
                        style={{ background: "var(--bg-primary)", color: "var(--color-muted)", border: "1px solid var(--bg-border2)" }}>
                  Anuluj
                </button>
                <button type="submit" disabled={saving}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                        style={{
                          background: category === "demo" ? "var(--color-accent)" : "#a78bfa",
                          color: "#fff",
                        }}>
                  {saving ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
