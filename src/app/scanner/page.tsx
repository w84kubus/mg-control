"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, X, Search, CheckCircle, AlertCircle } from "lucide-react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { useVehicleModalStore } from "@/store/vehicleModalStore";
import { validateVin } from "@/lib/business/vinValidator";

type ScanState = "idle" | "scanning" | "found" | "not_found" | "invalid";

export default function ScannerPage() {
  const router = useRouter();
  const { vehicles, subscribe } = useVehiclesStore();
  const { open: openModal } = useVehicleModalStore();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [scannedValue, setScannedValue] = useState("");
  const [manualVin, setManualVin] = useState("");
  const [cameraError, setCameraError] = useState("");

  // Make sure vehicles are loaded
  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    try {
      scanner = new Html5QrcodeScanner(
        "vin-scanner-container",
        {
          fps: 10,
          qrbox: { width: 280, height: 100 },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          rememberLastUsedCamera: true,
          aspectRatio: 1.5,
        },
        false
      );

      scanner.render(
        (decoded) => {
          const raw = decoded.trim().toUpperCase();
          setScannedValue(raw);
          handleVin(raw);
        },
        (err) => {
          if (err.includes("No MultiFormat")) return; // normal "no code found"
          setCameraError(err);
        }
      );

      scannerRef.current = scanner;
      setState("scanning");
    } catch (e) {
      setCameraError(String(e));
    }

    return () => {
      scanner?.clear().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleVin(vin: string) {
    const validation = validateVin(vin);
    if (!validation.valid) {
      // Try extracting 17-char VIN from longer string (barcodes often have prefix)
      const match = vin.match(/[A-HJ-NPR-Z0-9]{17}/);
      if (match) {
        handleVin(match[0]);
        return;
      }
      setState("invalid");
      return;
    }

    const found = vehicles.find(
      (v) => v.vin === vin || v.vinShort === vin.slice(-7)
    );

    if (found) {
      setState("found");
      setTimeout(() => {
        router.push("/dashboard");
        openModal(found.id);
      }, 1200);
    } else {
      setState("not_found");
    }
  }

  function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!manualVin.trim()) return;
    setScannedValue(manualVin.trim().toUpperCase());
    handleVin(manualVin.trim().toUpperCase());
  }

  function reset() {
    setState("scanning");
    setScannedValue("");
    setManualVin("");
  }

  const stateConfig = {
    found: { color: "var(--color-success)", icon: <CheckCircle size={48} />, text: "Pojazd znaleziony! Otwieranie…" },
    not_found: { color: "var(--color-warning)", icon: <AlertCircle size={48} />, text: "Nie ma pojazdu z tym VIN w systemie." },
    invalid: { color: "var(--color-danger)", icon: <AlertCircle size={48} />, text: "Zeskanowany kod nie jest poprawnym VIN." },
  };

  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto">
      <div className="flex items-center gap-3">
        <ScanLine size={22} style={{ color: "var(--color-accent)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          Skaner VIN
        </h1>
      </div>

      {/* Camera viewport */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
      >
        {(state === "found" || state === "not_found" || state === "invalid") && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 rounded-2xl">
            <div style={{ color: stateConfig[state].color }}>
              {stateConfig[state].icon}
            </div>
            <p className="text-sm font-semibold text-white text-center px-4">
              {stateConfig[state].text}
            </p>
            <p className="text-xs font-mono text-white/70">{scannedValue}</p>
            {state !== "found" && (
              <button
                onClick={reset}
                className="mt-2 flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >
                <X size={14} /> Spróbuj ponownie
              </button>
            )}
          </div>
        )}

        {cameraError ? (
          <div className="p-6 text-center">
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              Brak dostępu do kamery lub błąd skanera.
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
              {cameraError}
            </p>
          </div>
        ) : (
          <div id="vin-scanner-container" />
        )}
      </div>

      {/* Manual entry */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-muted)" }}>
          Wpisz VIN ręcznie
        </p>
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none font-mono"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--bg-border2)",
              color: "var(--color-text)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
            value={manualVin}
            onChange={(e) => setManualVin(e.target.value)}
            placeholder="LSJXXXXXXXXXX…"
            maxLength={20}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            <Search size={13} />
          </button>
        </form>
      </div>

      <p className="text-xs text-center px-4" style={{ color: "var(--color-muted2)" }}>
        Skieruj kamerę na kod kreskowy lub QR z numerem VIN.
        Aplikacja wymaga zgody na dostęp do kamery.
      </p>
    </div>
  );
}
