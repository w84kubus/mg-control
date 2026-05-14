"use client";

import "./globals.css";
import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import OnlineGuard from "@/components/layout/OnlineGuard";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = useAuthStore((s) => s.theme);
  const [mounted, setMounted] = useState(false);

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

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <html lang="pl" suppressHydrationWarning>
        <head>
          <title>MG Control</title>
          <meta name="description" content="System Logistyki Salonu MG Plaza Warszawa" />
          <meta name="theme-color" content="#0d0d14" />
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body />
      </html>
    );
  }

  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <title>MG Control</title>
        <meta name="description" content="System Logistyki Salonu MG Plaza Warszawa" />
        <meta name="theme-color" content="#0d0d14" />
        <link rel="icon" href="/favicon.ico" />
      </head>
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
