"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ScanLine, Search, CheckCircle, AlertCircle, Camera,
  CameraOff, Keyboard, Zap, ZapOff,
} from "lucide-react";
import { useVehiclesStore } from "@/store/vehiclesStore";
import { useVehicleModalStore } from "@/store/vehicleModalStore";
import type { Vehicle } from "@/types";

type Mode = "manual" | "camera";
type ScanResult =
  | null
  | { type: "found"; vehicle: Vehicle }
  | { type: "not_found"; query: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBarcodeDetector = any;

export default function ScannerPage() {
  const router = useRouter();
  const { vehicles, subscribe } = useVehiclesStore();
  const { open: openModal } = useVehicleModalStore();

  const [mode, setMode] = useState<Mode>("manual");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ScanResult>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [torch, setTorch] = useState(false);
  const [scanning, setScanning] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const detectorRef = useRef<AnyBarcodeDetector>(null);

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  // ── Vehicle search ──────────────────────────────────────────────────────
  const findVehicle = useCallback(
    (input: string): Vehicle | undefined => {
      const q = input.trim().toUpperCase();
      if (!q) return undefined;
      return vehicles.find(
        (v) =>
          v.vin.toUpperCase() === q ||
          v.vinShort.toUpperCase() === q ||
          v.vin.toUpperCase().endsWith(q) ||
          v.vin.toUpperCase().includes(q) ||
          (v.licensePlate &&
            v.licensePlate.toUpperCase().replace(/\s/g, "") ===
              q.replace(/\s/g, ""))
      );
    },
    [vehicles]
  );

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
    setResult(found ? { type: "found", vehicle: found } : { type: "not_found", query: q });
  }

  function openVehicle(vehicle: Vehicle) {
    router.push("/dashboard");
    openModal(vehicle.id);
  }

  function reset() {
    setResult(null);
    setQuery("");
    setScanning(true);
  }

  // ── Stop camera helper ────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setTorch(false);
  }, []);

  // ── Native BarcodeDetector camera scanner ─────────────────────────────
  useEffect(() => {
    if (mode !== "camera") {
      stopCamera();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Import polyfill — works on all browsers (uses ZXing WASM)
        const { BarcodeDetector } = await import("barcode-detector");
        const detector = new BarcodeDetector({ formats: ["code_128"] });
        detectorRef.current = detector;

        // Get camera stream with high resolution for better barcode reading
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();

        setCameraReady(true);

        // Scan loop — run detect() on each animation frame
        let lastScanTime = 0;
        const SCAN_INTERVAL = 150; // ms between scans (avoid overloading CPU)

        function scanLoop(timestamp: number) {
          if (cancelled) return;

          if (timestamp - lastScanTime >= SCAN_INTERVAL && video!.readyState >= 2) {
            lastScanTime = timestamp;

            detector
              .detect(video!)
              .then((barcodes) => {
                if (cancelled || barcodes.length === 0) return;

                const raw = barcodes[0].rawValue.trim().toUpperCase();
                const vinMatch = raw.match(/[A-HJ-NPR-Z0-9]{17}/);
                const vin = vinMatch ? vinMatch[0] : raw;

                // Found a barcode — process it
                setScanning(false);
                setQuery(vin);

                const found = vehicles.find(
                  (v) =>
                    v.vin.toUpperCase() === vin ||
                    v.vinShort.toUpperCase() === vin ||
                    v.vin.toUpperCase().endsWith(vin) ||
                    v.vin.toUpperCase().includes(vin)
                );

                setResult(
                  found
                    ? { type: "found", vehicle: found }
                    : { type: "not_found", query: vin }
                );

                // Stop the scan loop (camera stays on for visual continuity)
                cancelled = true;
              })
              .catch(() => {
                // detect() can fail on some frames — just keep going
              });
          }

          animFrameRef.current = requestAnimationFrame(scanLoop);
        }

        animFrameRef.current = requestAnimationFrame(scanLoop);
      } catch (e) {
        if (cancelled) return;
        const msg = String(e);
        if (msg.includes("Permission") || msg.includes("NotAllowed")) {
          setCameraError("Brak dostępu do kamery. Zezwól w ustawieniach przeglądarki.");
        } else {
          setCameraError("Nie udało się uruchomić kamery: " + msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, scanning]);

  // ── Torch toggle via native MediaStream API ───────────────────────────
  async function toggleTorch() {
    try {
      const track = streamRef.current?.getVideoTracks()?.[0];
      if (!track) return;
      const newVal = !torch;
      await track.applyConstraints({
        // @ts-expect-error — torch is a valid advanced constraint
        advanced: [{ torch: newVal }],
      });
      setTorch(newVal);
    } catch {
      // Torch not supported on this device
    }
  }

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

      {/* ── Result card ─────────────────────────────────────────────────── */}
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

      {/* ── Manual search ───────────────────────────────────────────────── */}
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

      {/* ── Camera scanner ──────────────────────────────────────────────── */}
      {mode === "camera" && !result && (
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{ background: "#000", border: "1px solid var(--bg-border)" }}
        >
          {cameraError ? (
            <div className="p-8 flex flex-col items-center gap-3 text-center">
              <CameraOff size={32} style={{ color: "var(--color-danger)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {cameraError}
              </p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                Sprawdź ustawienia przeglądarki lub użyj wyszukiwania ręcznego.
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
              {/* Native video element */}
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  width: "100%",
                  minHeight: 300,
                  objectFit: "cover",
                  display: "block",
                }}
              />

              {/* Blue scan frame */}
              {cameraReady && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    style={{
                      width: "85%",
                      maxWidth: 350,
                      height: 100,
                      border: "2.5px solid var(--color-accent)",
                      borderRadius: 12,
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
                    }}
                  />
                </div>
              )}

              {/* Torch button */}
              {cameraReady && (
                <button
                  onClick={toggleTorch}
                  className="absolute top-3 right-3 p-2 rounded-full"
                  style={{
                    background: torch ? "var(--color-warning)" : "rgba(0,0,0,0.5)",
                    color: torch ? "#000" : "#fff",
                  }}
                >
                  {torch ? <ZapOff size={16} /> : <Zap size={16} />}
                </button>
              )}

              {/* Loading state */}
              {!cameraReady && !cameraError && (
                <div
                  className="flex items-center justify-center"
                  style={{ minHeight: 300 }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
                    />
                    <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                      Uruchamianie kamery…
                    </p>
                  </div>
                </div>
              )}

              {/* Hint */}
              <p
                className="text-center text-xs py-2"
                style={{ background: "rgba(0,0,0,0.7)", color: "var(--color-muted)" }}
              >
                Skieruj na kod kreskowy z VIN
              </p>
            </>
          )}
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-center px-4" style={{ color: "var(--color-muted2)" }}>
        Wyszukuj pojazdy po VIN, rejestracji lub modelu.
        Skaner kodów wymaga zgody na kamerę.
      </p>
    </div>
  );
}
