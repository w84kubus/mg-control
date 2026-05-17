"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, ClipboardList, ScanLine, Truck, Bell } from "lucide-react";
import { useNotificationsStore } from "@/store/notificationsStore";

export default function BottomBar() {
  const pathname = usePathname();
  const { unreadCount } = useNotificationsStore();

  const tabs = [
    { href: "/dashboard",     label: "Mapa",      icon: Map },
    { href: "/service-orders",label: "Zlecenia",  icon: ClipboardList },
    { href: "/scanner",       label: "SKANUJ",    icon: ScanLine, highlight: true },
    { href: "/deliveries",    label: "Dostawy",   icon: Truck },
    { href: "/notifications", label: "Powiad.",   icon: Bell, badge: unreadCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-end md:hidden"
         style={{
           background: "var(--bg-surface)",
           borderTop: "1px solid var(--bg-border)",
           height: "var(--bottombar-h)",
           paddingBottom: "env(safe-area-inset-bottom)",
         }}>
      {tabs.map(({ href, label, icon: Icon, highlight, badge }) => {
        const active = pathname === href || pathname.startsWith(href + "/");

        if (highlight) {
          return (
            <Link key={href} href={href}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 pb-1">
              <div className="w-12 h-12 -mt-5 rounded-full flex items-center justify-center shadow-lg"
                   style={{ background: "var(--color-accent)" }}>
                <Icon size={22} color="#fff" />
              </div>
              <span className="text-[9px] font-bold tracking-wider mt-0.5"
                    style={{ color: "var(--color-accent)" }}>{label}</span>
            </Link>
          );
        }

        return (
          <Link key={href} href={href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative">
            <div className="relative">
              <Icon size={20} style={{ color: active ? "var(--color-accent)" : "var(--color-muted)" }} />
              {badge && badge > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                      style={{ background: "var(--color-danger)" }}>
                  {badge > 9 ? "9+" : badge}
                </span>
              ) : null}
            </div>
            <span className="text-[9px] font-medium"
                  style={{ color: active ? "var(--color-accent)" : "var(--color-muted)" }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
