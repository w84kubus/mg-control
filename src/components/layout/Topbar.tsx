"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Sun, Moon, Monitor, LogOut, ChevronDown } from "lucide-react";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import { useNotificationsStore } from "@/store/notificationsStore";
import { signOut } from "@/lib/auth";
import GlobalSearch from "@/components/layout/GlobalSearch";
import type { ThemeMode } from "@/types";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: "light",  label: "Jasny",   icon: <Sun size={14} /> },
  { value: "dark",   label: "Ciemny",  icon: <Moon size={14} /> },
  { value: "system", label: "System",  icon: <Monitor size={14} /> },
];

export default function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const router = useRouter();
  const { user, theme, setTheme } = useAuthStore();
  const { unreadCount } = useNotificationsStore();
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Ctrl+K / Cmd+K shortcut → open GlobalSearch
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
      if (e.key === "Escape") {
        setShowTheme(false);
        setShowProfile(false);
        // GlobalSearch handles its own Esc
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function handleLogout() {
    try {
      await signOut();
      router.replace("/login");
    } catch {
      toast.error("Błąd podczas wylogowywania.");
    }
  }

  return (
    <>
      {/* Global search overlay */}
      <GlobalSearch isOpen={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />

    <header className="fixed top-0 right-0 left-0 z-40 flex items-center gap-3 px-4 h-14"
            style={{
              background: "var(--bg-surface)",
              borderBottom: "1px solid var(--bg-border)",
              left: "var(--sidebar-w)",
            }}>

      {/* Search trigger button */}
      <div className="flex-1 max-w-lg">
        <button
          onClick={() => setGlobalSearchOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-left"
          style={{ background: "var(--bg-surface2)", border: "1px solid var(--bg-border2)" }}
        >
          <Search size={14} style={{ color: "var(--color-muted)" }} />
          <span className="flex-1 text-sm" style={{ color: "var(--color-muted)" }}>
            Szukaj po VIN, modelu, nr rej., kolorze…
          </span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded hidden sm:block"
               style={{ background: "var(--bg-border)", color: "var(--color-muted)" }}>
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Theme toggle */}
        <div className="relative">
          <button onClick={() => { setShowTheme(!showTheme); setShowProfile(false); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
                  style={{ color: "var(--color-muted)" }}>
            {theme === "light" ? <Sun size={16} /> : theme === "dark" ? <Moon size={16} /> : <Monitor size={16} />}
          </button>
          {showTheme && (
            <div className="absolute right-0 top-10 w-36 rounded-xl overflow-hidden z-50"
                 style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>
              {THEME_OPTIONS.map((opt) => (
                <button key={opt.value}
                        onClick={() => { setTheme(opt.value); setShowTheme(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:opacity-80"
                        style={{ color: theme === opt.value ? "var(--color-accent)" : "var(--color-muted)" }}>
                  {opt.icon}{opt.label}
                  {theme === opt.value && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button onClick={() => router.push("/notifications")}
                className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
                style={{ color: "var(--color-muted)" }}>
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: "var(--color-danger)" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <div className="relative">
          <button onClick={() => { setShowProfile(!showProfile); setShowTheme(false); }}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:opacity-80"
                  style={{ color: "var(--color-text)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                 style={{ background: "var(--color-accent)" }}>
              {user?.displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <span className="text-xs font-medium hidden sm:block">
              {user?.displayName?.split(" ")[0] ?? user?.email}
            </span>
            <ChevronDown size={12} />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-10 w-48 rounded-xl overflow-hidden z-50"
                 style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--bg-border)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                  {user?.displayName}
                </p>
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>{user?.email}</p>
                <p className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block"
                   style={{ background: "var(--bg-border)", color: "var(--color-accent)", fontSize: "10px" }}>
                  {user?.role}
                </p>
              </div>
              <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:opacity-80"
                      style={{ color: "var(--color-danger)" }}>
                <LogOut size={13} /> Wyloguj się
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
