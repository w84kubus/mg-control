"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map, ClipboardList, Truck, Bell, Users, Archive,
  BarChart2, AlertTriangle, Upload, Car, Droplets,
  Wrench, X,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useNotificationsStore } from "@/store/notificationsStore";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: number;
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    { href: "/demo-fleet",     label: "Demo / Flota",     icon: <Car size={17} /> },
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

  return (
    <>
      {/* Overlay (mobile) */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} />
      )}

      <aside
        className="fixed top-0 left-0 bottom-0 z-40 flex flex-col transition-transform duration-200"
        style={{
          width: "var(--sidebar-w)",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--bg-border)",
          // On desktop (lg+) always visible regardless of `open` prop
          transform: open ? "translateX(0)" : "translateX(calc(-1 * var(--sidebar-w)))",
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: "1px solid var(--bg-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
                 style={{ background: "var(--color-accent)" }}>MG</div>
            <span className="font-black tracking-wider text-sm" style={{ color: "var(--color-text)" }}>
              MG CONTROL
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg"
                  style={{ color: "var(--color-muted)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-0.5 px-2">
          {visible.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                    onClick={() => window.innerWidth < 1024 && onClose()}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors relative"
                    style={{
                      background: active ? "var(--bg-border)" : "transparent",
                      color: active ? "var(--color-accent)" : "var(--color-muted)",
                    }}>
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                        style={{ background: "var(--color-danger)" }}>
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* User info bottom */}
        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--bg-border)" }}>
          <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
            {user?.displayName}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--color-muted)" }}>
            {user?.role}
          </p>
        </div>
      </aside>
    </>
  );
}
