"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useAuthListener } from "@/hooks/useAuth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  useAuthListener();

  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!user.isActive) {
      router.replace("/login?reason=disabled");
      return;
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4"
           style={{ background: "var(--bg-primary)" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>Ładowanie...</p>
      </div>
    );
  }

  if (!user || !user.isActive) return null;

  return <>{children}</>;
}
