"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map, ClipboardList, Truck, Bell, Users, Archive,
  BarChart2, AlertTriangle, Upload, Car, Droplets,
  Wrench, X, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useNotificationsStore } from "@/store/notificationsStore";

const B = process.env.NEXT_PUBLIC_BASE_PATH || "";
const MG_ICON = `${B}/logo-mg-icon.png`;

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: number;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationsStore();
  const role = user?.role ?? "";

  const nav: NavItem[] = [
    { href: "/dashboard",      label: "Mapa / Plac",      icon: <Map size={17} /> },
    { href: "/service-orders", label: "Zlecenia serwis",  icon: <Wrench size={17} /> },
    { href: "/wash-queue",     label: "Kolejka myjni",    icon: <Droplets size={17} /> },
    { href: "/deliveries",     label: "Dostawy",          icon: <Truck size={17} />, roles: ["logistics"] },
    { href: "/damage-reports", label: "Szkody",           icon: <AlertTriangle size={17} /> },
    { href: "/demo-fleet",     label: "Auta firmowe",     icon: <Car size={17} /> },
    { href: "/notifications",  label: "Powiadomienia",    icon: <Bell size={17} />, badge: unreadCount },
    { href: "/archive",        label: "Archiwum",         icon: <Archive size={17} />, roles: ["logistics", "salesperson"] },
    // Admin section
    { href: "/admin/users",    label: "Użytkownicy",      icon: <Users size={17} />, roles: ["logistics"] },
    { href: "/admin/stats",    label: "Statystyki",       icon: <BarChart2 size={17} />, roles: ["logistics"] },
    { href: "/admin/import",   label: "Import Excel",     icon: <Upload size={17} />, roles: ["logistics"] },
    { href: "/admin/errors",   label: "Logi błędów",      icon: <ClipboardList size={17} />, roles: ["logistics"] },
  ];

  const visible = nav.filter((item) =>
    !item.roles || item.roles.includes(role)
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // On mobile the sidebar is always full-width (never collapsed)
  const isCollapsed = collapsed && typeof window !== "undefined" && window.innerWidth >= 768;

  return (
    <>
      {/* Overlay (mobile) */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={onClose} />
      )}

      <aside
        className="fixed top-0 left-0 bottom-0 z-40 flex flex-col transition-all duration-200"
        style={{
          width: isCollapsed ? "var(--sidebar-collapsed-w)" : "var(--sidebar-w)",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--bg-border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center px-4 py-4 shrink-0"
          style={{
            borderBottom: "1px solid var(--bg-border)",
            justifyContent: isCollapsed ? "center" : "space-between",
            minHeight: 56,
          }}
        >
          {isCollapsed ? (
            <img src={MG_ICON} alt="MG" className="shrink-0" style={{ width: 26, height: 26, objectFit: "contain", filter: "var(--logo-invert, invert(1))" }} />
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <img src={MG_ICON} alt="MG" className="shrink-0" style={{ width: 26, height: 26, objectFit: "contain", filter: "var(--logo-invert, invert(1))" }} />
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-[13px] tracking-[1px] whitespace-nowrap" style={{ color: "var(--color-text)" }}>MG</span>
                  <span className="font-bold text-[13px] tracking-[2px] whitespace-nowrap" style={{ color: "var(--color-accent)" }}>CONTROL</span>
                </div>
              </div>
              <button onClick={onClose} className="md:hidden p-1 rounded-lg" style={{ color: "var(--color-muted)" }}>
                <X size={16} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-0.5 px-2">
          {visible.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => window.innerWidth < 768 && onClose()}
                title={isCollapsed ? item.label : undefined}
                className="flex items-center gap-3 rounded-xl text-sm font-medium transition-colors relative"
                style={{
                  background: active ? "var(--bg-border)" : "transparent",
                  color: active ? "var(--color-accent)" : "var(--color-muted)",
                  padding: isCollapsed ? "8px 0" : "8px 12px",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                }}
              >
                <span className="shrink-0 flex items-center justify-center" style={{ width: 17 }}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
                {item.badge && item.badge > 0 ? (
                  <span
                    className="rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{
                      background: "var(--color-danger)",
                      width: isCollapsed ? 16 : 20,
                      height: isCollapsed ? 16 : 20,
                      fontSize: isCollapsed ? 8 : 10,
                      position: isCollapsed ? "absolute" : "static",
                      top: isCollapsed ? 2 : undefined,
                      right: isCollapsed ? 4 : undefined,
                    }}
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center gap-2 px-3 py-2.5 mx-2 mb-1 rounded-xl text-xs font-medium transition-colors hover:opacity-80"
          style={{
            background: "var(--bg-surface2)",
            border: "1px solid var(--bg-border2)",
            color: "var(--color-muted)",
            justifyContent: isCollapsed ? "center" : "flex-start",
          }}
        >
          {isCollapsed ? <ChevronsRight size={15} /> : (
            <>
              <ChevronsLeft size={15} />
              <span className="whitespace-nowrap">Zwiń panel</span>
            </>
          )}
        </button>

        {/* User info bottom */}
        <div
          className="px-3 py-3 shrink-0"
          style={{
            borderTop: "1px solid var(--bg-border)",
            textAlign: isCollapsed ? "center" : "left",
          }}
        >
          {isCollapsed ? (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white mx-auto"
              style={{ background: "var(--color-accent)" }}
              title={user?.displayName ?? ""}
            >
              {user?.displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
                {user?.displayName}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--color-muted)" }}>
                {user?.role}
              </p>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
