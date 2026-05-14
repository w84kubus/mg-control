"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function OnlineGuard({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) return;
    const interval = setInterval(() => {
      setChecking(true);
      setTimeout(() => setChecking(false), 500);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6"
           style={{ background: "var(--bg-primary)" }}>
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="rounded-full p-4" style={{ background: "var(--bg-surface)" }}>
            <WifiOff size={40} style={{ color: "var(--color-danger)" }} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            Brak połączenia z internetem
          </h2>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Aplikacja MG Control wymaga aktywnego połączenia z internetem.
          </p>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-muted2)" }}>
            {checking ? (
              <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Wifi size={12} />
            )}
            Sprawdzanie połączenia co 3 sekundy...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
