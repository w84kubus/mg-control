"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import { signInWithEmail, resendVerificationEmail, getAuthErrorMessage } from "@/lib/auth";

interface Props {
  onForgotPassword: () => void;
  onRegister: () => void;
}

export default function LoginForm({ onForgotPassword, onRegister }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notVerified, setNotVerified] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotVerified(false);
    try {
      await signInWithEmail(email.trim(), password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-not-verified") {
        setNotVerified(true);
        toast.error("Najpierw potwierdź swój adres e-mail. Sprawdź skrzynkę odbiorczą.");
      } else {
        const message =
          err instanceof Error && !code
            ? err.message
            : getAuthErrorMessage(code ?? "");
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await resendVerificationEmail();
      toast.success("Link weryfikacyjny wysłany ponownie.");
    } catch {
      toast.error("Nie udało się wysłać linku. Zaloguj się najpierw.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="Adres e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}
      />

      <div className="relative">
        <input
          type={showPass ? "text" : "password"}
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}
        />
        <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-muted)" }}>
          {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      {notVerified && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
             style={{ background: "#2d1a00", border: "1px solid #78350f", color: "#fbbf24" }}>
          <span>E-mail niezweryfikowany</span>
          <button type="button" onClick={handleResend} className="underline font-semibold">
            Wyślij ponownie
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onForgotPassword}
        className="text-xs text-right"
        style={{ color: "var(--color-accent)" }}
      >
        Zapomniałem hasła?
      </button>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
        style={{ background: "var(--color-accent)", color: "#fff" }}
      >
        {loading ? "Logowanie..." : "Zaloguj się"}
      </button>

      <p className="text-xs text-center" style={{ color: "var(--color-muted)" }}>
        Nie masz jeszcze konta?{" "}
        <button type="button" onClick={onRegister}
                className="font-semibold" style={{ color: "var(--color-accent)" }}>
          Zarejestruj się
        </button>
      </p>
    </form>
  );
}
