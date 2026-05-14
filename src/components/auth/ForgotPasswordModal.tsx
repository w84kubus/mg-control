"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { resetPassword } from "@/lib/auth";

interface Props {
  onClose: () => void;
}

export default function ForgotPasswordModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch {
      toast.error("Nie udało się wysłać linku. Sprawdź adres e-mail.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,0.7)" }}
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: "var(--color-text)" }}>Resetuj hasło</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70"
                  style={{ color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-4 flex flex-col gap-3">
            <div className="text-3xl">📬</div>
            <p className="text-sm" style={{ color: "var(--color-text)" }}>
              Link do resetowania hasła został wysłany na podany adres e-mail.
            </p>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              Sprawdź skrzynkę odbiorczą i folder spam.
            </p>
            <button onClick={onClose}
                    className="mt-2 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "var(--color-accent)", color: "#fff" }}>
              Zamknij
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Podaj adres e-mail, a wyślemy Ci link do resetowania hasła.
            </p>
            <input
              type="email"
              placeholder="Adres e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--bg-border2)",
                color: "var(--color-text)",
              }}
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              {loading ? "Wysyłanie..." : "Wyślij link resetujący"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
