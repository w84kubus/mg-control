"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search, Bell, Sun, Moon, Monitor, LogOut, ChevronDown,
  Map, List, SlidersHorizontal, X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import { useNotificationsStore } from "@/store/notificationsStore";
import { useFiltersStore, type AreaFilter } from "@/store/filtersStore";
import { signOut } from "@/lib/auth";
import GlobalSearch from "@/components/layout/GlobalSearch";
import { STATUS_COLORS, STATUS_LABELS } from "@/components/map/VehicleTile";
import type { ThemeMode, VehicleStatus } from "@/types";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: "light",  label: "Jasny",   icon: <Sun size={14} /> },
  { value: "dark",   label: "Ciemny",  icon: <Moon size={14} /> },
  { value: "system", label: "System",  icon: <Monitor size={14} /> },
];

const STATUSES: (VehicleStatus | "all")[] = [
  "all", "new", "ordered", "damaged", "ready", "ready_wash", "delivered",
];

const AREAS: { val: AreaFilter; label: string }[] = [
  { val: "all",        label: "Cały plac" },
  { val: "plac",       label: "Plac" },
  { val: "salon",      label: "Salon" },
  { val: "serwis",     label: "Serwis" },
  { val: "blacharnia", label: "Blacharnia" },
];

export default function Topbar({ onMenuToggle, sidebarWidth }: { onMenuToggle?: () => void; sidebarWidth?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, theme, setTheme } = useAuthStore();
  const { unreadCount } = useNotificationsStore();
  const { status, area, view, setStatus, setArea, setView, reset } = useFiltersStore();

  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const isDashboard = pathname.replace(/\/$/, "") === "/dashboard" || pathname.replace(/\/$/, "") === "/mg-control/dashboard";
  const activeFilterCount = (status !== "all" ? 1 : 0) + (area !== "all" ? 1 : 0);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
      if (e.key === "Escape") {
        setShowTheme(false);
        setShowProfile(false);
        setShowFilters(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close filter panel on outside click
  useEffect(() => {
    if (!showFilters) return;
    function onDown(e: MouseEvent) {
      if (
        filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node) &&
        filterBtnRef.current && !filterBtnRef.current.contains(e.target as Node)
      ) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showFilters]);

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
      <GlobalSearch isOpen={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />

      <header
        className="fixed top-0 right-0 z-40 flex items-center gap-2 px-2 sm:px-4 h-14"
        style={{
          left: sidebarWidth ?? "var(--topbar-left, 0px)",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--bg-border)",
          transition: "left 200ms ease",
        }}
      >
        {/* Search trigger */}
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
            <kbd
              className="text-[10px] px-1.5 py-0.5 rounded hidden sm:block"
              style={{ background: "var(--bg-border)", color: "var(--color-muted)" }}
            >
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Dashboard-only: filter toggle + view toggle */}
        {isDashboard && (
          <>
            {/* Filter button */}
            <div className="relative">
              <button
                ref={filterBtnRef}
                onClick={() => { setShowFilters((o) => !o); setShowTheme(false); setShowProfile(false); }}
                title="Filtry"
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: showFilters || activeFilterCount > 0 ? "var(--color-accent)" : "var(--bg-surface2)",
                  color: showFilters || activeFilterCount > 0 ? "#fff" : "var(--color-muted)",
                  border: `1px solid ${showFilters || activeFilterCount > 0 ? "var(--color-accent)" : "var(--bg-border2)"}`,
                }}
              >
                <SlidersHorizontal size={14} />
                <span className="hidden sm:inline">Filtry</span>
                {activeFilterCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: "#ef4444", color: "#fff" }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Filter dropdown */}
              {showFilters && (
                <div
                  ref={filterPanelRef}
                  className="absolute top-full mt-2 right-0 sm:left-0 sm:right-auto z-50 rounded-2xl p-4 flex flex-col gap-3"
                  style={{
                    width: "min(340px, calc(100vw - 2rem))",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--bg-border2)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Status */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                      Status pojazdu
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUSES.map((s) => {
                        const active = status === s;
                        const color = s === "all" ? "var(--color-accent)" : STATUS_COLORS[s] ?? "#64748b";
                        return (
                          <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
                            style={{
                              background: active ? color : "var(--bg-surface2)",
                              color: active ? "#fff" : "var(--color-muted)",
                              border: `1px solid ${active ? color : "var(--bg-border2)"}`,
                            }}
                          >
                            {s === "all" ? "Wszystkie" : STATUS_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ height: 1, background: "var(--bg-border2)" }} />

                  {/* Area */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                      Obszar
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {AREAS.map(({ val, label }) => {
                        const active = area === val;
                        return (
                          <button
                            key={val}
                            onClick={() => setArea(val)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
                            style={{
                              background: active ? "var(--bg-border)" : "var(--bg-surface2)",
                              color: active ? "var(--color-text)" : "var(--color-muted)",
                              border: `1px solid ${active ? "var(--color-accent)" : "var(--bg-border2)"}`,
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <>
                      <div style={{ height: 1, background: "var(--bg-border2)" }} />
                      <button
                        onClick={() => { reset(); setShowFilters(false); }}
                        className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                        style={{
                          background: "var(--bg-surface2)",
                          border: "1px solid var(--bg-border2)",
                          color: "var(--color-muted)",
                        }}
                      >
                        <X size={11} /> Wyczyść filtry
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* View toggle (Map / List) */}
            <div
              className="flex p-0.5 rounded-xl"
              style={{ background: "var(--bg-surface2)", border: "1px solid var(--bg-border)" }}
            >
              {([["map", Map, "Mapa"], ["list", List, "Lista"]] as const).map(([v, Icon, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  title={label}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                  style={{
                    background: view === v ? "var(--color-accent)" : "transparent",
                    color: view === v ? "#fff" : "var(--color-muted)",
                  }}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center gap-1 ml-auto">
          {/* Theme toggle */}
          <div className="relative">
            <button
              onClick={() => { setShowTheme(!showTheme); setShowProfile(false); setShowFilters(false); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
              style={{ color: "var(--color-muted)" }}
            >
              {theme === "light" ? <Sun size={16} /> : theme === "dark" ? <Moon size={16} /> : <Monitor size={16} />}
            </button>
            {showTheme && (
              <div
                className="absolute right-0 top-10 w-36 rounded-xl overflow-hidden z-50"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}
              >
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setTheme(opt.value); setShowTheme(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:opacity-80"
                    style={{ color: theme === opt.value ? "var(--color-accent)" : "var(--color-muted)" }}
                  >
                    {opt.icon}{opt.label}
                    {theme === opt.value && <span className="ml-auto">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <button
            onClick={() => router.push("/notifications")}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
            style={{ color: "var(--color-muted)" }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                style={{ background: "var(--color-danger)" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowTheme(false); setShowFilters(false); }}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:opacity-80"
              style={{ color: "var(--color-text)" }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "var(--color-accent)" }}
              >
                {user?.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span className="text-xs font-medium hidden sm:block">
                {user?.displayName?.split(" ")[0] ?? user?.email}
              </span>
              <ChevronDown size={12} />
            </button>

            {showProfile && (
              <div
                className="absolute right-0 top-10 w-48 rounded-xl overflow-hidden z-50"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: "var(--bg-border)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                    {user?.displayName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-muted)" }}>{user?.email}</p>
                  <p
                    className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block"
                    style={{ background: "var(--bg-border)", color: "var(--color-accent)", fontSize: "10px" }}
                  >
                    {user?.role}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:opacity-80"
                  style={{ color: "var(--color-danger)" }}
                >
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
