"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import { registerWithEmail, getAuthErrorMessage } from "@/lib/auth";

interface Props {
  onBack: () => void;
  onPrivacyClick: () => void;
}

export default function RegisterForm({ onBack, onPrivacyClick }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Hasła nie są identyczne.");
      return;
    }
    if (password.length < 6) {
      toast.error("Hasło jest za słabe. Użyj co najmniej 6 znaków.");
      return;
    }
    if (!gdpr) {
      toast.error("Musisz zaakceptować Politykę Prywatności.");
      return;
    }
    setLoading(true);
    try {
      await registerWithEmail(email.trim(), password);
      setDone(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const message =
        err instanceof Error && !code
          ? err.message
          : getAuthErrorMessage(code ?? "");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-4">
        <div className="text-4xl">📧</div>
        <h3 className="font-bold" style={{ color: "var(--color-text)" }}>Sprawdź skrzynkę</h3>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Na adres <strong>{email}</strong> wysłaliśmy link weryfikacyjny.
          Potwierdź e-mail przed pierwszym logowaniem.
        </p>
        <button onClick={onBack}
                className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--color-accent)", color: "#fff" }}>
          Wróć do logowania
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>Utwórz konto</h3>

      <input
        type="email"
        placeholder="Adres e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}
      />

      <div className="relative">
        <input
          type={showPass ? "text" : "password"}
          placeholder="Hasło (min. 6 znaków)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}
        />
        <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-muted)" }}>
          {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      <input
        type="password"
        placeholder="Powtórz hasło"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}
      />

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={gdpr}
          onChange={(e) => setGdpr(e.target.checked)}
          className="mt-0.5 accent-blue-500"
        />
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          Akceptuję{" "}
          <button type="button" onClick={onPrivacyClick}
                  className="underline" style={{ color: "var(--color-accent)" }}>
            Politykę Prywatności
          </button>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !gdpr}
        className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
        style={{ background: "var(--color-accent)", color: "#fff" }}
      >
        {loading ? "Rejestrowanie..." : "Zarejestruj się"}
      </button>

      <button type="button" onClick={onBack}
              className="text-xs text-center"
              style={{ color: "var(--color-muted)" }}>
        ← Masz już konto? Zaloguj się
      </button>
    </form>
  );
}
