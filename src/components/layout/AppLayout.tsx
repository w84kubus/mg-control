"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import BottomBar from "./BottomBar";
import Topbar from "./Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // On desktop (≥1024px) the sidebar is always open.
  // On mobile/tablet it starts closed and is toggled by the hamburger button.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync sidebar state with viewport width
  useEffect(() => {
    function sync() {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    }
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const isDesktop = sidebarOpen && typeof window !== "undefined" && window.innerWidth >= 1024;

  return (
    <div className="min-h-dvh flex">
      {/* Sidebar – always shown on lg+, toggled on mobile */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content — shifts right only when sidebar is pinned (lg+) */}
      <div
        className="flex flex-col min-h-dvh transition-all duration-200"
        style={{
          marginLeft: isDesktop ? "var(--sidebar-w)" : 0,
          width: isDesktop ? "calc(100% - var(--sidebar-w))" : "100%",
          paddingTop: "var(--topbar-h)",
          paddingBottom: "var(--bottombar-h)",
        }}
      >
        {/* Topbar */}
        <Topbar onMenuToggle={() => setSidebarOpen((o) => !o)} />

        {/* Hamburger — visible only on mobile/tablet (< lg) */}
        <div className="fixed top-0 left-0 z-50 flex items-center h-14 px-2 lg:hidden">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="w-10 h-10 flex items-center justify-center rounded-lg active:opacity-70"
            style={{ color: "var(--color-muted)" }}
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomBar />
    </div>
  );
}
