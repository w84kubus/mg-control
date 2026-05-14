"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, Car, Wrench, AlertTriangle, FileText, Clock,
  Save, CheckCircle, Edit3, Plus, Upload, Trash2, Download,
} from "lucide-react";
import {
  doc, updateDoc, serverTimestamp, collection,
  query, where, orderBy, getDocs, addDoc, onSnapshot, deleteDoc, increment,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useZonesStore } from "@/store/zonesStore";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { toast } from "react-toastify";
import type { Vehicle, ServiceOrder, DamageReport, VehicleLog, VehicleDocument, DocumentType, VehicleStatus, VehicleType, ServiceOrderType } from "@/types";
import { STATUS_COLORS, STATUS_LABELS } from "./VehicleTile";

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "dane" | "zlecenia" | "szkody" | "dokumenty" | "historia";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dane",      label: "Dane",       icon: <Car size={13} /> },
  { id: "zlecenia",  label: "Zlecenia",   icon: <Wrench size={13} /> },
  { id: "szkody",    label: "Szkody",     icon: <AlertTriangle size={13} /> },
  { id: "dokumenty", label: "Dokumenty",  icon: <FileText size={13} /> },
  { id: "historia",  label: "Historia",   icon: <Clock size={13} /> },
];

const MG_MODELS = [
  "MG3","MG4","MG5","MG7","HS","HS PHEV","ZS","ZS EV",
  "EH5","Cyberster","Marvel R","One",
];
const COLORS = [
  "Biały","Czarny","Szary","Srebrny","Czerwony","Niebieski",
  "Zielony","Brązowy","Beżowy","Inny",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTs(ts: { seconds: number } | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-xl text-sm outline-none";
const inputStyle: React.CSSProperties = {
  background: "var(--bg-primary)",
  border: "1px solid var(--bg-border2)",
  color: "var(--color-text)",
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function TabDane({ vehicle }: { vehicle: Vehicle }) {
  const { user } = useAuthStore();
  const { zones } = useZonesStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [status, setStatus] = useState<VehicleStatus>(vehicle.status);
  const [zoneId, setZoneId] = useState(vehicle.zoneId ?? "");
  const [model, setModel] = useState(vehicle.model);
  const [color, setColor] = useState(vehicle.color);
  const [licensePlate, setLicensePlate] = useState(vehicle.licensePlate ?? "");
  const [vehicleType, setVehicleType] = useState<VehicleType>(vehicle.vehicleType);
  const [notes, setNotes] = useState(vehicle.notes ?? "");

  const availableZones = zones.filter((z) => z.type !== "blocked");

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "vehicles", vehicle.id), {
        status,
        zoneId: zoneId || null,
        model,
        color,
        licensePlate: licensePlate.trim().toUpperCase() || null,
        vehicleType,
        notes: notes.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      // Log the change
      if (status !== vehicle.status) {
        await addDoc(collection(db, "vehicles", vehicle.id, "logs"), {
          vehicleId: vehicle.id,
          type: "status_change",
          action: "Zmiana statusu",
          details: `${STATUS_LABELS[vehicle.status]} → ${STATUS_LABELS[status]}`,
          performedBy: user.uid,
          performedByName: user.displayName ?? "Nieznany",
          performedAt: serverTimestamp(),
          metadata: null,
        });
      }
      if (zoneId !== (vehicle.zoneId ?? "")) {
        const fromZone = zones.find((z) => z.id === vehicle.zoneId)?.name ?? "Bez strefy";
        const toZone = zones.find((z) => z.id === zoneId)?.name ?? "Bez strefy";
        await addDoc(collection(db, "vehicles", vehicle.id, "logs"), {
          vehicleId: vehicle.id,
          type: "zone_change",
          action: "Zmiana strefy",
          details: `${fromZone} → ${toZone}`,
          performedBy: user.uid,
          performedByName: user.displayName ?? "Nieznany",
          performedAt: serverTimestamp(),
          metadata: null,
        });
      }
      toast.success("Dane pojazdu zaktualizowane.");
      setEditing(false);
    } catch {
      toast.error("Nie udało się zapisać zmian.");
    } finally {
      setSaving(false);
    }
  }

  const statusColor = STATUS_COLORS[status] ?? "#64748b";

  return (
    <div className="flex flex-col gap-4">
      {/* VIN badge */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)" }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
            Numer VIN
          </p>
          <p className="text-sm font-mono font-bold mt-0.5" style={{ color: "var(--color-text)" }}>
            {vehicle.vin}
          </p>
        </div>
        <span
          className="text-xs font-bold px-2 py-1 rounded-lg"
          style={{ background: `${statusColor}20`, color: statusColor }}
        >
          {STATUS_LABELS[vehicle.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Status */}
        <Field label="Status">
          {editing ? (
            <select className={inputCls} style={{ ...inputStyle, color: statusColor }} value={status} onChange={(e) => setStatus(e.target.value as VehicleStatus)}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm font-semibold" style={{ color: statusColor }}>{STATUS_LABELS[status]}</p>
          )}
        </Field>

        {/* Typ */}
        <Field label="Typ pojazdu">
          {editing ? (
            <select className={inputCls} style={inputStyle} value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
              <option value="stock">Stock</option>
              <option value="demo">Demo</option>
              <option value="fleet">Flota</option>
            </select>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text)" }}>
              {vehicleType === "stock" ? "Stock" : vehicleType === "demo" ? "Demo" : "Flota"}
            </p>
          )}
        </Field>

        {/* Model */}
        <Field label="Model">
          {editing ? (
            <select className={inputCls} style={inputStyle} value={model} onChange={(e) => setModel(e.target.value)}>
              {MG_MODELS.map((m) => <option key={m}>{m}</option>)}
            </select>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text)" }}>MG {model}</p>
          )}
        </Field>

        {/* Kolor */}
        <Field label="Kolor">
          {editing ? (
            <select className={inputCls} style={inputStyle} value={color} onChange={(e) => setColor(e.target.value)}>
              {COLORS.map((c) => <option key={c}>{c}</option>)}
            </select>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text)" }}>{color}</p>
          )}
        </Field>

        {/* Nr rej. */}
        <Field label="Nr rejestracyjny">
          {editing ? (
            <input className={inputCls} style={{ ...inputStyle, textTransform: "uppercase" }} value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)} placeholder="WA 12345" maxLength={10} />
          ) : (
            <p className="text-sm" style={{ color: licensePlate ? "var(--color-text)" : "var(--color-muted)" }}>
              {licensePlate || "—"}
            </p>
          )}
        </Field>

        {/* Strefa */}
        <Field label="Strefa">
          {editing ? (
            <select className={inputCls} style={inputStyle} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              <option value="">— Bez strefy —</option>
              {availableZones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          ) : (
            <p className="text-sm" style={{ color: zoneId ? "var(--color-text)" : "var(--color-muted)" }}>
              {zones.find((z) => z.id === zoneId)?.name ?? "Bez strefy"}
            </p>
          )}
        </Field>
      </div>

      {/* Notatka */}
      <Field label="Notatka">
        {editing ? (
          <textarea className={inputCls} style={{ ...inputStyle, resize: "none", height: 72 }}
            value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Brak notatek…" />
        ) : (
          <p className="text-sm" style={{ color: notes ? "var(--color-text)" : "var(--color-muted)" }}>
            {notes || "Brak notatek"}
          </p>
        )}
      </Field>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3 pt-1 pb-1"
           style={{ borderTop: "1px solid var(--bg-border)" }}>
        <div>
          <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>Przybycie</p>
          <p className="text-xs" style={{ color: "var(--color-text)" }}>{formatTs(vehicle.arrivalDate as never)}</p>
        </div>
        <div>
          <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>Ostatnia zmiana</p>
          <p className="text-xs" style={{ color: "var(--color-text)" }}>{formatTs(vehicle.updatedAt as never)}</p>
        </div>
      </div>

      {/* Edit / Save */}
      {user?.role === "logistics" || user?.role === "salesperson" ? (
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); }} disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm"
                style={{ background: "var(--bg-primary)", color: "var(--color-muted)", border: "1px solid var(--bg-border2)" }}>
                Anuluj
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "var(--color-accent)", color: "#fff" }}>
                <Save size={13} /> {saving ? "Zapisywanie…" : "Zapisz"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}>
              <Edit3 size={13} /> Edytuj
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

const ORDER_TYPE_LABELS: Record<string, string> = { pdi: "PDI", wash: "Mycie", ceramic: "Ceramika", accessory: "Akcesoria", other: "Inne" };
const ORDER_STATUS_LABELS: Record<string, string> = { ordered: "Zlecone", in_progress: "W toku", partial: "Częściowo", ready: "Gotowe" };
const ORDER_STATUS_COLORS: Record<string, string> = { ordered: "#3b82f6", in_progress: "#eab308", partial: "#a78bfa", ready: "#22c55e" };

function TabZlecenia({ vehicleId, vehicle }: { vehicleId: string; vehicle: Vehicle }) {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ServiceOrderType>("pdi");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "serviceOrders"), where("vehicleId", "==", vehicleId), orderBy("createdAt", "desc")),
      (snap) => { setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceOrder))); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, [vehicleId]);

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !description.trim()) return;
    setSaving(true);
    try {
      const ref = doc(collection(db, "serviceOrders"));
      await addDoc(collection(db, "serviceOrders"), {
        id: ref.id,
        vehicleId,
        vehicleVin: vehicle.vin,
        vehicleModel: vehicle.model,
        type,
        status: "ordered",
        description: description.trim(),
        orderedBy: user.uid,
        orderedByName: user.displayName ?? "Nieznany",
        assignedMechanicUid: null,
        assignedMechanicName: null,
        plannedDeliveryDate: null,
        completionDate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "vehicles", vehicleId), {
        activeServiceOrderIds: [...(vehicle.activeServiceOrderIds ?? []), ref.id],
        updatedAt: serverTimestamp(), updatedBy: user.uid,
      });
      setDescription(""); setShowForm(false);
    } catch { /* toast shown by parent */ } finally { setSaving(false); }
  }

  if (loading) return <div className="py-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>Ładowanie…</div>;

  return (
    <div className="flex flex-col gap-3">
      {(user?.role === "logistics" || user?.role === "mechanic") && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold w-full justify-center"
          style={{ background: "var(--bg-primary)", border: "1px dashed var(--bg-border2)", color: "var(--color-accent)" }}>
          <Plus size={12} /> Nowe zlecenie
        </button>
      )}

      {showForm && (
        <form onSubmit={createOrder} className="flex flex-col gap-2 rounded-xl p-3"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--color-accent)" }}>
          <select value={type} onChange={(e) => setType(e.target.value as ServiceOrderType)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}>
            {Object.entries(ORDER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required
            placeholder="Opis zlecenia…" rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-1.5 rounded-lg text-xs" style={{ color: "var(--color-muted)" }}>Anuluj</button>
            <button type="submit" disabled={saving || !description.trim()}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "#fff" }}>
              {saving ? "…" : "Dodaj"}
            </button>
          </div>
        </form>
      )}

      {orders.length === 0 && !showForm && (
        <div className="py-8 flex flex-col items-center gap-2">
          <Wrench size={28} style={{ color: "var(--color-muted)", opacity: 0.4 }} />
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>Brak zleceń serwisowych</p>
        </div>
      )}

      {orders.map((o) => {
        const sc = ORDER_STATUS_COLORS[o.status] ?? "#64748b";
        return (
          <div key={o.id} className="rounded-xl px-3 py-2.5"
               style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                {ORDER_TYPE_LABELS[o.type] ?? o.type}
              </p>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: `${sc}20`, color: sc }}>
                {ORDER_STATUS_LABELS[o.status] ?? o.status}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{o.description}</p>
            {o.assignedMechanicName && (
              <p className="text-[10px] mt-1" style={{ color: "var(--color-muted2)" }}>
                Mechanik: {o.assignedMechanicName}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const DAMAGE_STAGE_LABELS: Record<string, string> = {
  to_report: "Do zgłoszenia", reported: "Zgłoszona",
  accepted_pending: "Do rozliczenia", resolved: "Zamknięta ✓",
};
const DAMAGE_STAGE_COLORS: Record<string, string> = {
  to_report: "#64748b", reported: "#eab308", accepted_pending: "#a78bfa", resolved: "#22c55e",
};

function TabSzkody({ vehicleId, vehicle }: { vehicleId: string; vehicle: Vehicle }) {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "damageReports"), where("vehicleId", "==", vehicleId), orderBy("createdAt", "desc")),
      (snap) => { setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DamageReport))); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, [vehicleId]);

  async function createReport(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !location.trim() || !description.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "damageReports"), {
        vehicleId,
        vehicleVin: vehicle.vin,
        vehicleModel: vehicle.model,
        stage: "reported",
        stageHistory: [{ stage: "reported", changedBy: user.uid, changedAt: serverTimestamp() }],
        damageLocation: location.trim(),
        description: description.trim(),
        photoUrls: [],
        documentUrls: [],
        physicallyRepaired: false,
        financiallySettled: false,
        closedAt: null,
        reportedBy: user.uid,
        reportedByName: user.displayName ?? "Nieznany",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "vehicles", vehicleId), {
        status: "damaged",
        updatedAt: serverTimestamp(), updatedBy: user.uid,
      });
      setLocation(""); setDescription(""); setShowForm(false);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  if (loading) return <div className="py-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>Ładowanie…</div>;

  return (
    <div className="flex flex-col gap-3">
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold w-full justify-center"
          style={{ background: "var(--bg-primary)", border: "1px dashed rgba(239,68,68,.4)", color: "#ef4444" }}>
          <AlertTriangle size={12} /> Zgłoś szkodę
        </button>
      )}

      {showForm && (
        <form onSubmit={createReport} className="flex flex-col gap-2 rounded-xl p-3"
              style={{ background: "var(--bg-primary)", border: "1px solid rgba(239,68,68,.4)" }}>
          <input value={location} onChange={(e) => setLocation(e.target.value)} required
            placeholder="Lokalizacja szkody (np. zderzak przód)" maxLength={80}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required
            placeholder="Opis uszkodzenia…" rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-1.5 rounded-lg text-xs" style={{ color: "var(--color-muted)" }}>Anuluj</button>
            <button type="submit" disabled={saving || !location.trim() || !description.trim()}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: "#ef4444", color: "#fff" }}>
              {saving ? "…" : "Zgłoś"}
            </button>
          </div>
        </form>
      )}

      {reports.length === 0 && !showForm && (
        <div className="py-8 flex flex-col items-center gap-2">
          <CheckCircle size={28} style={{ color: "var(--color-success)", opacity: 0.5 }} />
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>Brak zgłoszonych szkód</p>
        </div>
      )}

      {reports.map((r) => {
        const sc = DAMAGE_STAGE_COLORS[r.stage] ?? "#64748b";
        return (
          <div key={r.id} className="rounded-xl px-3 py-2.5"
               style={{ background: "var(--bg-primary)", border: `1px solid ${sc}40` }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>{r.damageLocation}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: `${sc}20`, color: sc }}>
                {DAMAGE_STAGE_LABELS[r.stage] ?? r.stage}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{r.description}</p>
          </div>
        );
      })}
    </div>
  );
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  list_przewozowy: "Lista przewozowa",
  protokol_odbioru: "Protokół odbioru",
  faktura: "Faktura",
  inne: "Inne",
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function TabDokumenty({ vehicleId, vehicle }: { vehicleId: string; vehicle: Vehicle }) {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("inne");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "documents"), where("vehicleId", "==", vehicleId), orderBy("uploadedAt", "desc")),
      (snap) => { setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VehicleDocument))); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, [vehicleId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Plik nie może być większy niż 20 MB."); return; }

    setUploading(true);
    try {
      const path = `documents/${vehicleId}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, file);
      const fileUrl = await getDownloadURL(sRef);

      const docRef = await addDoc(collection(db, "documents"), {
        vehicleId,
        vehicleVin: vehicle.vin,
        deliveryId: null,
        type: docType,
        displayName: file.name,
        fileName: file.name,
        fileUrl,
        filePath: path,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: user.uid,
        uploadedByName: user.displayName ?? "Nieznany",
        uploadedAt: serverTimestamp(),
        notes: "",
      });

      await updateDoc(doc(db, "vehicles", vehicleId), {
        documentCount: increment(1),
        hasDocument: true,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      await addDoc(collection(db, "vehicles", vehicleId, "logs"), {
        vehicleId,
        type: "document_upload",
        action: "Dodano dokument",
        details: `${DOC_TYPE_LABELS[docType]}: ${file.name}`,
        performedBy: user.uid,
        performedByName: user.displayName ?? "Nieznany",
        performedAt: serverTimestamp(),
        metadata: { documentId: docRef.id },
      });

      toast.success(`Wgrano: ${file.name}`);
    } catch {
      toast.error("Błąd podczas wgrywania pliku.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(document: VehicleDocument) {
    if (!user) return;
    try {
      await deleteObject(storageRef(storage, document.filePath));
      await deleteDoc(doc(db, "documents", document.id));
      const remaining = docs.length - 1;
      await updateDoc(doc(db, "vehicles", vehicleId), {
        documentCount: increment(-1),
        hasDocument: remaining > 0,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      toast.success("Dokument usunięty.");
    } catch {
      toast.error("Nie udało się usunąć dokumentu.");
    }
  }

  if (loading) return <div className="py-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>Ładowanie…</div>;

  const canUpload = user?.role === "logistics" || user?.role === "salesperson";

  return (
    <div className="flex flex-col gap-3">
      {/* Upload control */}
      {canUpload && (
        <div className="flex gap-2">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}
          >
            {(Object.entries(DOC_TYPE_LABELS) as [DocumentType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            <Upload size={12} /> {uploading ? "Wgrywanie…" : "Wgraj"}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" onChange={handleUpload} />
        </div>
      )}

      {docs.length === 0 && (
        <div className="py-12 flex flex-col items-center gap-2">
          <FileText size={32} style={{ color: "var(--color-muted)", opacity: 0.4 }} />
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>Brak dokumentów</p>
          {canUpload && <p className="text-xs" style={{ color: "var(--color-muted2)" }}>Wgraj plik używając formularza powyżej</p>}
        </div>
      )}

      {docs.map((d) => (
        <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
             style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)" }}>
          <FileText size={18} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>{d.displayName}</p>
            <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
              {DOC_TYPE_LABELS[d.type] ?? d.type} · {formatBytes(d.fileSize)}
            </p>
          </div>
          <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"
             className="w-7 h-7 flex items-center justify-center rounded-lg"
             style={{ background: "var(--bg-surface)", color: "var(--color-accent)" }}>
            <Download size={13} />
          </a>
          {canUpload && (
            <button onClick={() => handleDelete(d)}
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ background: "var(--bg-surface)", color: "var(--color-danger)" }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function TabHistoria({ vehicleId }: { vehicleId: string }) {
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(
      query(
        collection(db, "vehicles", vehicleId, "logs"),
        orderBy("performedAt", "desc")
      )
    ).then((snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VehicleLog)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [vehicleId]);

  if (loading) return <div className="py-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>Ładowanie…</div>;

  if (logs.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-2">
        <Clock size={32} style={{ color: "var(--color-muted)", opacity: 0.4 }} />
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>Brak wpisów w historii</p>
      </div>
    );
  }

  const TYPE_COLOR: Record<string, string> = {
    status_change: "var(--color-accent)",
    zone_change: "var(--color-warning)",
    damage_report: "var(--color-danger)",
    service_order: "#a78bfa",
    document_upload: "var(--color-success)",
  };

  return (
    <div className="flex flex-col gap-2 relative">
      <div
        className="absolute left-[11px] top-2 bottom-2 w-0.5"
        style={{ background: "var(--bg-border2)" }}
      />
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3 relative">
          <div
            className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center z-10"
            style={{ background: TYPE_COLOR[log.type] ?? "var(--color-muted)", marginTop: 2 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
          </div>
          <div className="flex-1 pb-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                {log.action}
              </p>
              <p className="text-[9px] shrink-0" style={{ color: "var(--color-muted)" }}>
                {formatTs(log.performedAt as never)}
              </p>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
              {log.details}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted2)" }}>
              {log.performedByName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  vehicleId: string;
  onClose: () => void;
}

export default function VehicleModal({ vehicleId, onClose }: Props) {
  const { vehicles } = useVehiclesStore();
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const [tab, setTab] = useState<Tab>("dane");

  if (!vehicle) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative rounded-2xl p-8" style={{ background: "var(--bg-surface)" }}>
          <p style={{ color: "var(--color-muted)" }}>Pojazd nie znaleziony.</p>
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[vehicle.status] ?? "#64748b";

  const tabBadge: Partial<Record<Tab, number>> = {
    zlecenia: vehicle.activeServiceOrderIds?.length || 0,
    szkody: vehicle.activeDamageReportIds?.length || 0,
    dokumenty: vehicle.documentCount || 0,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          maxHeight: "90dvh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--bg-border)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${statusColor}20` }}
            >
              <Car size={15} style={{ color: statusColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                MG {vehicle.model} · {vehicle.color}
              </p>
              <p className="text-xs font-mono" style={{ color: "var(--color-muted)" }}>
                {vehicle.vinShort}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 ml-2" style={{ color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex shrink-0 overflow-x-auto"
          style={{ borderBottom: "1px solid var(--bg-border)" }}
        >
          {TABS.map(({ id, label, icon }) => {
            const badge = tabBadge[id];
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors relative shrink-0"
                style={{
                  color: tab === id ? "var(--color-accent)" : "var(--color-muted)",
                  borderBottom: tab === id ? "2px solid var(--color-accent)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {icon}
                {label}
                {badge ? (
                  <span
                    className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: "var(--color-danger)", color: "#fff" }}
                  >
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "dane"      && <TabDane vehicle={vehicle} />}
          {tab === "zlecenia"  && <TabZlecenia vehicleId={vehicleId} vehicle={vehicle} />}
          {tab === "szkody"    && <TabSzkody vehicleId={vehicleId} vehicle={vehicle} />}
          {tab === "dokumenty" && <TabDokumenty vehicleId={vehicleId} vehicle={vehicle} />}
          {tab === "historia"  && <TabHistoria vehicleId={vehicleId} />}
        </div>
      </div>
    </div>
  );
}
