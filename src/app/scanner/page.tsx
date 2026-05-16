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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5Qrcode = useRef<any>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

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
  }

  // ── Camera barcode scanner (raw Html5Qrcode API) ───────────────────────
  useEffect(() => {
    if (mode !== "camera") {
      // Stop camera when leaving camera mode
      if (html5Qrcode.current?.isScanning) {
        html5Qrcode.current.stop().catch(() => {});
      }
      setCameraReady(false);
      return;
    }

    let instance: InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        instance = new Html5Qrcode("vin-camera-feed", {
          verbose: false,
        });

        html5Qrcode.current = instance;

        await instance.start(
          { facingMode: "environment" },
          {
            fps: 20,
            qrbox: (vw: number, vh: number) => {
              const w = Math.min(Math.floor(vw * 0.85), 350);
              const h = Math.min(Math.floor(vh * 0.35), 160);
              return { width: w, height: h };
            },
            aspectRatio: 16 / 9,
            disableFlip: false,
          },
          (decoded) => {
            const raw = decoded.trim().toUpperCase();
            const vinMatch = raw.match(/[A-HJ-NPR-Z0-9]{17}/);
            const vin = vinMatch ? vinMatch[0] : raw;

            // Stop scanning first
            instance?.stop().catch(() => {});
            setCameraReady(false);

            setQuery(vin);
            // Dispatch event so the listener with latest vehicles state handles it
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("vin-scanned", { detail: vin }));
            }, 50);
          },
          () => {
            // Ignore "no code found" — normal during scanning
          }
        );

        setCameraReady(true);

        // Grab the video track for torch control
        setTimeout(() => {
          try {
            const videoEl = document.querySelector("#vin-camera-feed video") as HTMLVideoElement | null;
            const stream = videoEl?.srcObject as MediaStream | null;
            const track = stream?.getVideoTracks()?.[0];
            if (track) videoTrackRef.current = track;
          } catch { /* ignore */ }
        }, 500);
      } catch (e) {
        const msg = String(e);
        if (msg.includes("Permission") || msg.includes("NotAllowed")) {
          setCameraError("Brak dostępu do kamery. Zezwól w ustawieniach przeglądarki.");
        } else {
          setCameraError("Nie udało się uruchomić kamery.");
        }
      }
    })();

    return () => {
      if (instance?.isScanning) {
        instance.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Listen for scanned VIN events from the camera callback
  useEffect(() => {
    function onScanned(e: Event) {
      const vin = (e as CustomEvent).detail as string;
      const found = findVehicle(vin);
      setResult(found ? { type: "found", vehicle: found } : { type: "not_found", query: vin });
    }
    window.addEventListener("vin-scanned", onScanned);
    return () => window.removeEventListener("vin-scanned", onScanned);
  }, [findVehicle]);

  // Torch toggle via native MediaStream API
  async function toggleTorch() {
    try {
      const track = videoTrackRef.current;
      if (!track) return;
      const newVal = !torch;
      await track.applyConstraints({
        // @ts-expect-error — torch is a valid advanced constraint
        advanced: [{ torch: newVal }],
      });
      setTorch(newVal);
    } catch {
      // Torch not supported on this device — ignore silently
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
              {/* Camera feed — html5-qrcode renders video here */}
              <style>{`
                #vin-camera-feed video { width: 100% !important; border-radius: 0 !important; }
                #vin-camera-feed #qr-shaded-region { border: none !important; }
                #vin-camera-feed #qr-shaded-region > div { display: none !important; }
              `}</style>
              <div
                id="vin-camera-feed"
                style={{ width: "100%", minHeight: 300 }}
              />

              {/* Blue scan frame */}
              {cameraReady && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    style={{
                      width: "85%",
                      maxWidth: 350,
                      height: "35%",
                      maxHeight: 160,
                      border: "2.5px solid var(--color-accent)",
                      borderRadius: 12,
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
                <div className="absolute inset-0 flex items-center justify-center">
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
                Skieruj na kod kreskowy lub QR z VIN
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
