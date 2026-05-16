"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, Zap, ZapOff, X } from "lucide-react";

interface Props {
  /** Called with the decoded barcode string (already trimmed + uppercased) */
  onScan: (value: string) => void;
  /** Called when user closes the scanner */
  onClose: () => void;
}

/**
 * Inline CODE_128 barcode scanner using native camera + barcode-detector polyfill.
 * Designed to be embedded inside modals/forms.
 */
export default function BarcodeScannerInline({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [torch, setTorch] = useState(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setReady(false);
    setTorch(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { BarcodeDetector } = await import("barcode-detector");
        const detector = new BarcodeDetector({ formats: ["code_128"] });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });

        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);

        let lastScan = 0;
        const INTERVAL = 150;

        function loop(ts: number) {
          if (cancelled) return;
          if (ts - lastScan >= INTERVAL && video!.readyState >= 2) {
            lastScan = ts;
            detector.detect(video!).then((barcodes: { rawValue: string }[]) => {
              if (cancelled || barcodes.length === 0) return;
              const raw = barcodes[0].rawValue.trim().toUpperCase();
              const vinMatch = raw.match(/[A-HJ-NPR-Z0-9]{17}/);
              cancelled = true;
              onScan(vinMatch ? vinMatch[0] : raw);
            }).catch(() => {});
          }
          animFrameRef.current = requestAnimationFrame(loop);
        }
        animFrameRef.current = requestAnimationFrame(loop);
      } catch (e) {
        if (cancelled) return;
        const msg = String(e);
        if (msg.includes("Permission") || msg.includes("NotAllowed")) {
          setError("Brak dostępu do kamery.");
        } else {
          setError("Nie udało się uruchomić kamery.");
        }
      }
    })();

    return () => { cancelled = true; stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleTorch() {
    try {
      const track = streamRef.current?.getVideoTracks()?.[0];
      if (!track) return;
      const next = !torch;
      // @ts-expect-error — torch is a valid advanced constraint
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorch(next);
    } catch { /* not supported */ }
  }

  return (
    <div className="rounded-xl overflow-hidden relative" style={{ background: "#000" }}>
      {error ? (
        <div className="p-6 flex flex-col items-center gap-2 text-center">
          <CameraOff size={24} style={{ color: "var(--color-danger)" }} />
          <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{error}</p>
          <button
            onClick={onClose}
            className="mt-1 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-primary)", color: "var(--color-muted)", border: "1px solid var(--bg-border2)" }}
          >
            Zamknij
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
          />

          {/* Blue scan frame */}
          {ready && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ bottom: 32 }}>
              <div
                style={{
                  width: "80%",
                  maxWidth: 300,
                  height: 70,
                  border: "2px solid var(--color-accent)",
                  borderRadius: 8,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                }}
              />
            </div>
          )}

          {/* Torch */}
          {ready && (
            <button
              onClick={toggleTorch}
              className="absolute top-2 right-10 p-1.5 rounded-full"
              style={{ background: torch ? "var(--color-warning)" : "rgba(0,0,0,0.5)", color: torch ? "#000" : "#fff" }}
            >
              {torch ? <ZapOff size={14} /> : <Zap size={14} />}
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="absolute top-2 right-2 p-1.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
          >
            <X size={14} />
          </button>

          {/* Hint */}
          <p
            className="text-center text-[10px] py-1.5"
            style={{ background: "rgba(0,0,0,0.7)", color: "var(--color-muted)" }}
          >
            Skieruj na kod kreskowy z VIN
          </p>

          {/* Loading */}
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
