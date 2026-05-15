"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import * as XLSX from "xlsx";
import {
  collection, doc, serverTimestamp, getDocs, query, where, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import type { VehicleStatus, VehicleType } from "@/types";

// ─── Mappings ─────────────────────────────────────────────────────────────────

const MODEL_MAP: Record<string, string> = {
  "ZS (NEW)": "ZS", "ZS": "ZS", "ZS CLASSIC": "ZS",
  "HS (NEW)": "HS", "HS": "HS", "HS+": "HS+", "HS +": "HS+",
  "HS PHEV": "HS PHEV", "EHS": "EH5",
  "MG3": "MG3", "MG4": "MG4", "MG5": "MG5", "MG7": "MG7",
  "MG S5": "MG S5", "MG S9": "MG S9", "S9 PHEV": "MG S9",
  "CYBERSTER": "Cyberster",
};

const COLOR_MAP: Record<string, string> = {
  "WHITE": "Biały", "BLACK": "Czarny",
  "GRAY": "Szary", "GREY": "Szary",
  "SILVER": "Srebrny", "RED": "Czerwony",
  "BLUE": "Niebieski", "GREEN": "Zielony",
  "YELLOW": "Żółty", "ORANGE": "Inny",
};

const ZONE_LABELS: Record<string, string> = {
  strefa_1: "Strefa 1", strefa_2: "Strefa 2", strefa_3: "Strefa 3",
  strefa_4: "Strefa 4", strefa_5: "Strefa 5", strefa_6: "Strefa 6", strefa_7: "Strefa 7",
  salon: "Salon", garaz: "Garaż", tunel: "Tunel",
  blacharnia_hala: "Blacharnia",
  dach_rzad_1: "Dach R1", dach_rzad_2: "Dach R2", dach_rzad_3: "Dach R3",
  dach_rzad_4: "Dach R4", dach_rzad_5: "Dach R5", dach_rzad_6: "Dach R6",
};

const STATUS_LABELS: Record<VehicleStatus, string> = {
  new: "Nowy", ordered: "Zamówiony", damaged: "Uszkodzony",
  ready: "Gotowy", ready_wash: "Do myjni", delivered: "Wydany",
};
const STATUS_COLORS: Record<VehicleStatus, string> = {
  new: "#64748b", ordered: "#3b82f6", damaged: "#ef4444",
  ready: "#22c55e", ready_wash: "#eab308", delivered: "#a78bfa",
};

// ─── Parsed vehicle ───────────────────────────────────────────────────────────

interface ParsedVehicle {
  vin: string;
  vinShort: string;
  model: string;
  color: string;
  arrivalDate: string | null;
  notes: string;
  zone: string;
  status: VehicleStatus;
  vehicleType: VehicleType;
  salesperson: string;
  exists?: boolean;
}

// ─── Parser helpers ───────────────────────────────────────────────────────────

function normalizeModel(raw: unknown): string {
  const s = raw ? String(raw).trim() : "";
  return (MODEL_MAP[s] ?? s) || "HS";
}

function normalizeColor(raw: unknown): string {
  const s = raw ? String(raw).trim().toUpperCase() : "";
  return COLOR_MAP[s] ?? "Inny";
}

function detectStatus(info: string, inMyjnia: boolean): VehicleStatus {
  const u = info.toUpperCase();
  if (u.includes("SZKODA")) return "damaged";
  if (inMyjnia || u.includes("NA MYJNIE")) return "ready_wash";
  if (u.includes("PDI") || u.includes("ZLECENIE")) return "ordered";
  return "new";
}

function detectType(info: string, salesperson: string): VehicleType {
  const u = (info + " " + salesperson).toUpperCase();
  if (u.includes("DEMO")) return "demo";
  if (u.includes("FLOTA")) return "fleet";
  return "stock";
}

function detectZone(info: string, section: "plac" | "dach", dachIdx: number): string {
  if (section === "dach") {
    const row = Math.min(Math.floor(dachIdx / 4) + 1, 6);
    return `dach_rzad_${row}`;
  }
  const u = info.toUpperCase();
  if (u.includes("TUNEL")) return "tunel";
  if (u.includes("BLACHARNI")) return "blacharnia_hala";
  if (u.includes("SALON")) return "salon";
  if (u.includes("GARAŻ") || u.includes("GARAZ")) return "garaz";
  return "strefa_1";
}

function parseExcel(buf: ArrayBuffer): ParsedVehicle[] {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets["AKTUALNIE NA PLACU"];
  if (!ws) throw new Error('Nie znaleziono arkusza "AKTUALNIE NA PLACU".');

  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: "yyyy-mm-dd" });

  // Collect MYJNIA VINs (cols 21-25)
  const myjniaVins = new Set<string>();
  const myjniaSalesperson: Record<string, string> = {};
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const vin = row[24] ? String(row[24]).trim().toUpperCase() : "";
    if (vin.startsWith("LSJ") && vin.length === 17) {
      myjniaVins.add(vin);
      myjniaSalesperson[vin] = row[25] ? String(row[25]).trim() : "";
    }
  }

  const result: ParsedVehicle[] = [];
  let dachIdx = 0;

  function push(
    rawVin: unknown, rawModel: unknown, rawColor: unknown,
    rawDate: unknown, rawInfo: unknown, section: "plac" | "dach",
  ) {
    const vin = rawVin ? String(rawVin).trim().toUpperCase() : "";
    if (!vin.startsWith("LSJ") || vin.length !== 17) return;

    const info = rawInfo ? String(rawInfo).trim() : "";
    const salesperson = myjniaSalesperson[vin] ?? "";
    const inMyjnia = myjniaVins.has(vin);

    let arrivalDate: string | null = null;
    if (rawDate) {
      const s = String(rawDate).trim();
      if (s && s !== "N/A" && s !== "?" && !isNaN(Date.parse(s))) arrivalDate = s;
    }

    const idx = section === "dach" ? dachIdx++ : 0;

    result.push({
      vin, vinShort: vin.slice(-7),
      model: normalizeModel(rawModel),
      color: normalizeColor(rawColor),
      arrivalDate,
      notes: info,
      zone: detectZone(info, section, idx),
      status: detectStatus(info, inMyjnia),
      vehicleType: detectType(info, salesperson),
      salesperson,
    });
  }

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    push(row[3],  row[1],  row[2],  row[4],  row[5],  "plac");  // PLAC
    push(row[9],  row[7],  row[8],  row[10], row[11], "dach");  // DACH
    push(row[15], row[13], row[14], row[16], row[17], "plac");  // GARAŻ
  }

  return result;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ImportState = "idle" | "checking" | "ready" | "importing" | "done";

export default function AdminImportPage() {
  const { user } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>("idle");
  const [vehicles, setVehicles] = useState<ParsedVehicle[]>([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const toImport = vehicles.filter((v) => !v.exists);
  const existing = vehicles.length - toImport.length;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setVehicles([]);
    setState("checking");
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseExcel(buf);
      if (parsed.length === 0) throw new Error("Brak pojazdów w arkuszu.");

      // Check duplicates in chunks of 30 (Firestore `in` limit)
      const vinSet = new Set<string>();
      for (let i = 0; i < parsed.length; i += 30) {
        const chunk = parsed.slice(i, i + 30).map((v) => v.vin);
        const snap = await getDocs(query(collection(db, "vehicles"), where("vin", "in", chunk)));
        snap.forEach((d) => vinSet.add((d.data() as { vin: string }).vin));
      }

      setVehicles(parsed.map((v) => ({ ...v, exists: vinSet.has(v.vin) })));
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd parsowania.");
      setState("idle");
    }
  }

  async function runImport() {
    if (!user) return;
    setState("importing"); setProgress(0);
    const rows = vehicles.filter((v) => !v.exists);
    let done = 0;
    try {
      for (let i = 0; i < rows.length; i += 499) {
        const chunk = rows.slice(i, i + 499);
        const batch = writeBatch(db);
        for (const v of chunk) {
          const ref = doc(collection(db, "vehicles"));
          batch.set(ref, {
            id: ref.id,
            vin: v.vin, vinShort: v.vinShort,
            brand: "MG", model: v.model, color: v.color,
            licensePlate: null,
            vehicleType: v.vehicleType,
            status: v.status,
            zoneId: v.zone,
            slotIndex: null,
            assignedSalespersonUid: null,
            assignedSalespersonName: v.salesperson || null,
            deliveryId: null,
            arrivalDate: v.arrivalDate ? new Date(v.arrivalDate) : serverTimestamp(),
            plannedDeliveryDate: null,
            activeDamageReportIds: [],
            activeServiceOrderIds: [],
            hasDocument: false,
            documentCount: 0,
            notes: v.notes,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          });
        }
        await batch.commit();
        done += chunk.length;
        setProgress(Math.round((done / rows.length) * 100));
      }
      toast.success(`Zaimportowano ${done} pojazdów!`);
      setState("done");
    } catch {
      toast.error("Błąd zapisu do bazy.");
      setState("ready");
    }
  }

  function reset() {
    setVehicles([]); setError(""); setProgress(0); setState("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileSpreadsheet size={22} style={{ color: "var(--color-accent)" }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Import z Excel</h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Arkusz „AKTUALNIE NA PLACU" · PLAC / DACH / GARAŻ / MYJNIA
          </p>
        </div>
      </div>

      {/* Drop zone */}
      {state === "idle" && (
        <div onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-4 py-20 rounded-2xl cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: "var(--bg-surface)", border: "2px dashed var(--bg-border2)" }}>
          <Upload size={36} style={{ color: "var(--color-accent)", opacity: 0.7 }} />
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Kliknij, aby wybrać plik Excel
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
              MGPLAZA WARSZAWA-2.xlsx
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        </div>
      )}

      {/* Checking spinner */}
      {state === "checking" && (
        <div className="flex items-center justify-center gap-3 py-16">
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-accent)" }} />
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>Parsowanie i sprawdzanie duplikatów…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
             style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <AlertCircle size={15} style={{ color: "var(--color-danger)" }} />
          <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
        </div>
      )}

      {/* Results */}
      {(state === "ready" || state === "importing" || state === "done") && (
        <>
          {/* Summary + actions */}
          <div className="flex flex-wrap items-center gap-3">
            {[
              { val: vehicles.length, label: "wykrytych", color: "var(--color-text)" },
              { val: toImport.length, label: "do importu", color: "var(--color-success)" },
              { val: existing, label: "już istnieje", color: "var(--color-warning)", hide: existing === 0 },
            ].filter((x) => !x.hide).map(({ val, label, color }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-xl"
                   style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border2)" }}>
                <span className="text-sm font-bold" style={{ color }}>{val}</span>
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>{label}</span>
              </div>
            ))}

            <div className="flex-1" />

            {state === "done" ? (
              <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm"
                      style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-muted)" }}>
                <X size={13} /> Nowy import
              </button>
            ) : (
              <>
                <button onClick={reset} disabled={state === "importing"}
                  className="px-4 py-2 rounded-xl text-sm" style={{ color: "var(--color-muted)" }}>
                  Anuluj
                </button>
                <button onClick={runImport} disabled={state === "importing" || toImport.length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--color-accent)", color: "#fff" }}>
                  {state === "importing"
                    ? <><Loader2 size={14} className="animate-spin" /> {progress}%</>
                    : <><Upload size={14} /> Importuj {toImport.length} pojazdów</>
                  }
                </button>
              </>
            )}
          </div>

          {/* Progress bar */}
          {state === "importing" && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-border2)" }}>
              <div className="h-full rounded-full transition-all duration-300"
                   style={{ width: `${progress}%`, background: "var(--color-accent)" }} />
            </div>
          )}

          {/* Done banner */}
          {state === "done" && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                 style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <CheckCircle size={15} style={{ color: "var(--color-success)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>
                Import zakończony — {toImport.length} pojazdów dodanych do bazy.
              </p>
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl overflow-hidden"
               style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--bg-border2)" }}>
                    {["", "VIN", "Model", "Kolor", "Strefa", "Status", "Typ", "Notatka"].map((h) => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                          style={{ color: "var(--color-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => {
                    const sc = STATUS_COLORS[v.status];
                    return (
                      <tr key={v.vin} style={{ borderBottom: "1px solid var(--bg-border)", opacity: v.exists ? 0.38 : 1 }}>
                        <td className="pl-4 py-2.5">
                          {v.exists
                            ? <AlertCircle size={13} style={{ color: "var(--color-warning)" }} />
                            : <CheckCircle size={13} style={{ color: "var(--color-success)" }} />
                          }
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap"
                            style={{ color: "var(--color-accent)" }}>{v.vinShort}</td>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap"
                            style={{ color: "var(--color-text)" }}>MG {v.model}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap"
                            style={{ color: "var(--color-muted)" }}>{v.color}</td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap"
                            style={{ color: "var(--color-muted)" }}>{ZONE_LABELS[v.zone] ?? v.zone}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                style={{ background: `${sc}20`, color: sc }}>
                            {STATUS_LABELS[v.status]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap"
                            style={{ color: "var(--color-muted)" }}>
                          {v.vehicleType === "stock" ? "Stock" : v.vehicleType === "demo" ? "Demo" : "Flota"}
                        </td>
                        <td className="px-3 py-2.5 text-xs max-w-[180px] truncate"
                            style={{ color: "var(--color-muted2)" }} title={v.notes}>
                          {v.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
