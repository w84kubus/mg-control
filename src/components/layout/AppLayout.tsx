"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import BottomBar from "./BottomBar";
import Topbar from "./Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-dvh flex">
      {/* Sidebar – always shown on lg+, toggled on mobile */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-dvh transition-all"
           style={{
             marginLeft: "var(--sidebar-w)",
             paddingTop: "var(--topbar-h)",
             paddingBottom: "var(--bottombar-h)",
           }}>

        {/* Topbar */}
        <Topbar onMenuToggle={() => setSidebarOpen((o) => !o)} />

        {/* Hamburger (mobile) – shown in topbar on small screens */}
        <div className="fixed top-0 left-0 z-50 flex items-center h-14 px-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ color: "var(--color-muted)" }}>
            <Menu size={20} />
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
