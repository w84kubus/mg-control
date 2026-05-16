"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ScanLine, Search, CheckCircle, AlertCircle, Camera, CameraOff,
  Keyboard, X,
} from "lucide-react";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { useVehicleModalStore } from "@/store/vehicleModalStore";
import type { Vehicle } from "@/types";

type Mode = "camera" | "manual";
type ScanResult = null | { type: "found"; vehicle: Vehicle } | { type: "not_found"; query: string };

export default function ScannerPage() {
  const router = useRouter();
  const { vehicles, subscribe } = useVehiclesStore();
  const { open: openModal } = useVehicleModalStore();

  const [mode, setMode] = useState<Mode>("manual");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ScanResult>(null);
  const [cameraError, setCameraError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  // Search vehicles by VIN, vinShort, licensePlate, model
  function findVehicle(input: string): Vehicle | undefined {
    const q = input.trim().toUpperCase();
    if (!q) return undefined;
    return vehicles.find(
      (v) =>
        v.vin.toUpperCase() === q ||
        v.vinShort.toUpperCase() === q ||
        v.vin.toUpperCase().endsWith(q) ||
        v.vin.toUpperCase().includes(q) ||
        (v.licensePlate && v.licensePlate.toUpperCase().replace(/\s/g, "") === q.replace(/\s/g, ""))
    );
  }

  // Live search results for manual mode
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return vehicles
      .filter(
        (v) =>
          v.vin.toLowerCase().includes(q) ||
          v.vinShort.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          (v.licensePlate?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 8);
  }, [vehicles, query]);

  function handleSearch(input?: string) {
    const q = (input ?? query).trim().toUpperCase();
    if (!q) return;
    const found = findVehicle(q);
    if (found) {
      setResult({ type: "found", vehicle: found });
    } else {
      setResult({ type: "not_found", query: q });
    }
  }

  function openVehicle(vehicle: Vehicle) {
    router.push("/dashboard");
    openModal(vehicle.id);
  }

  function reset() {
    setResult(null);
    setQuery("");
  }

  // ── Camera barcode scanner ──────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "camera") {
      // Cleanup scanner when leaving camera mode
      scannerRef.current?.clear().catch(() => {});
      scannerRef.current = null;
      return;
    }

    let scanner: InstanceType<typeof import("html5-qrcode").Html5QrcodeScanner> | null = null;

    (async () => {
      try {
        const { Html5QrcodeScanner, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

        scanner = new Html5QrcodeScanner(
          "vin-scanner-region",
          {
            fps: 15,
            qrbox: { width: 320, height: 120 },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.PDF_417,
            ],
            rememberLastUsedCamera: true,
            aspectRatio: 1.7778,
            showTorchButtonIfSupported: true,
          },
          false
        );

        scanner.render(
          (decoded) => {
            const raw = decoded.trim().toUpperCase();
            // Try to extract a 17-char VIN from barcode data
            const vinMatch = raw.match(/[A-HJ-NPR-Z0-9]{17}/);
            const vin = vinMatch ? vinMatch[0] : raw;

            setQuery(vin);
            const found = findVehicle(vin);
            if (found) {
              setResult({ type: "found", vehicle: found });
              // Stop scanning after finding
              scanner?.clear().catch(() => {});
            } else {
              setResult({ type: "not_found", query: vin });
            }
          },
          () => {
            // Ignore "no code found" errors — they're normal during scanning
          }
        );

        scannerRef.current = scanner;
      } catch (e) {
        setCameraError(String(e));
      }
    })();

    return () => {
      scanner?.clear().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ScanLine size={22} style={{ color: "var(--color-accent)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          Skaner VIN
        </h1>
      </div>

      {/* Mode toggle */}
      <div
        className="flex p-1 rounded-xl gap-1"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
      >
        {([
          { id: "manual" as Mode, icon: <Keyboard size={14} />, label: "Wyszukaj ręcznie" },
          { id: "camera" as Mode, icon: <Camera size={14} />, label: "Skanuj kamerą" },
        ]).map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => { setMode(id); reset(); setCameraError(""); }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: mode === id ? "var(--color-accent)" : "transparent",
              color: mode === id ? "#fff" : "var(--color-muted)",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Result overlay */}
      {result && (
        <div
          className="rounded-2xl p-6 flex flex-col items-center gap-3 text-center"
          style={{
            background: "var(--bg-surface)",
            border: `2px solid ${result.type === "found" ? "var(--color-success)" : "var(--color-warning)"}`,
          }}
        >
          {result.type === "found" ? (
            <>
              <CheckCircle size={40} style={{ color: "var(--color-success)" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  Znaleziono pojazd
                </p>
                <p className="text-base font-semibold mt-1" style={{ color: "var(--color-text)" }}>
                  {result.vehicle.brand} {result.vehicle.model}
                </p>
                <p className="text-xs font-mono mt-0.5" style={{ color: "var(--color-muted)" }}>
                  {result.vehicle.vinShort} · {result.vehicle.color}
                </p>
                {result.vehicle.licensePlate && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                    {result.vehicle.licensePlate}
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => openVehicle(result.vehicle)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                  Otwórz szczegóły
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-muted)" }}
                >
                  Szukaj dalej
                </button>
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={40} style={{ color: "var(--color-warning)" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  Nie znaleziono pojazdu
                </p>
                <p className="text-xs font-mono mt-1" style={{ color: "var(--color-muted)" }}>
                  {result.query}
                </p>
              </div>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-xl text-sm font-semibold mt-1"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >
                Spróbuj ponownie
              </button>
            </>
          )}
        </div>
      )}

      {/* Manual search */}
      {mode === "manual" && !result && (
        <div
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
            Wpisz VIN, ostatnie znaki, nr rejestracyjny lub model
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="flex gap-2"
          >
            <input
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--bg-border2)",
                color: "var(--color-text)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setResult(null); }}
              placeholder="np. Z529028, WE1234X…"
              autoFocus
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1 disabled:opacity-40"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              <Search size={14} />
            </button>
          </form>

          {/* Live suggestions */}
          {suggestions.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)" }}
            >
              {suggestions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setResult({ type: "found", vehicle: v });
                    setQuery(v.vinShort);
                  }}
                  className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:opacity-80 transition-opacity"
                  style={{ borderBottom: "1px solid var(--bg-border)" }}
                >
                  <div>
                    <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                      {v.brand} {v.model}
                    </span>
                    <span className="text-xs ml-1.5" style={{ color: "var(--color-muted)" }}>
                      · {v.color}
                    </span>
                    <p className="text-xs font-mono" style={{ color: "var(--color-accent)" }}>
                      {v.vinShort}
                      {v.licensePlate && (
                        <span style={{ color: "var(--color-muted)" }}> · {v.licensePlate}</span>
                      )}
                    </p>
                  </div>
                  <CheckCircle size={14} style={{ color: "var(--color-success)" }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Camera scanner */}
      {mode === "camera" && !result && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          {cameraError ? (
            <div className="p-8 flex flex-col items-center gap-3 text-center">
              <CameraOff size={32} style={{ color: "var(--color-danger)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                Brak dostępu do kamery
              </p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                Zezwól na dostęp do kamery w ustawieniach przeglądarki lub użyj wyszukiwania ręcznego.
              </p>
              <button
                onClick={() => { setMode("manual"); setCameraError(""); }}
                className="mt-1 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >
                Wyszukaj ręcznie
              </button>
            </div>
          ) : (
            <>
              <div id="vin-scanner-region" />
              <p className="text-xs text-center px-4 py-3" style={{ color: "var(--color-muted)" }}>
                Skieruj kamerę na kod kreskowy lub QR z numerem VIN
              </p>
            </>
          )}
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-center px-4" style={{ color: "var(--color-muted2)" }}>
        Wyszukuj pojazdy po pełnym lub częściowym VIN, numerze rejestracyjnym albo modelu.
        Skaner kodów wymaga zgody na kamerę.
      </p>
    </div>
  );
}
