"use client";

import "./globals.css";
import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import OnlineGuard from "@/components/layout/OnlineGuard";
import { useFcmToken } from "@/hooks/useFcmToken";

const HEAD = (
  <>
    <title>MG Control</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
    <meta name="description" content="System Logistyki Salonu MG Plaza Warszawa" />
    <meta name="theme-color" content="#4361ee" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="MG Control" />
    <link rel="manifest" href="/mg-control/manifest.json" />
    <link rel="apple-touch-icon" href="/mg-control/icons/apple-touch-icon.png" />
    <link rel="icon" href="/mg-control/icons/favicon-32.png" type="image/png" sizes="32x32" />
    <link rel="icon" href="/mg-control/icons/favicon-16.png" type="image/png" sizes="16x16" />
  </>
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = useAuthStore((s) => s.theme);
  const [mounted, setMounted] = useState(false);
  useFcmToken();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.add("light");
    } else {
      // system
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq.matches) root.classList.add("dark");
      const handler = (e: MediaQueryListEvent) => {
        root.classList.remove("dark", "light");
        if (e.matches) root.classList.add("dark");
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  if (!mounted) {
    return (
      <html lang="pl" suppressHydrationWarning>
        <head>{HEAD}</head>
        <body />
      </html>
    );
  }

  return (
    <html lang="pl" suppressHydrationWarning>
      <head>{HEAD}</head>
      <body className="min-h-dvh">
        <OnlineGuard>
          {children}
        </OnlineGuard>
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </body>
    </html>
  );
}
