"use client";

/* eslint-disable @next/next/no-img-element */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { CheckCircle, XCircle, Loader2, KeyRound } from "lucide-react";

const B = process.env.NEXT_PUBLIC_BASE_PATH || "";
const MG_ICON = `${B}/logo-mg-icon.png`;

type Status = "loading" | "success" | "error" | "reset-form" | "reset-success";

export default function AuthActionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "#0d0d14" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "#3b82f6" }} />
      </div>
    }>
      <AuthActionContent />
    </Suspense>
  );
}

function AuthActionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");

  // Password reset form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setStatus("error");
      setErrorMsg("Nieprawidłowy link — brak kodu weryfikacyjnego.");
      return;
    }

    if (mode === "verifyEmail") {
      applyActionCode(auth, oobCode)
        .then(() => setStatus("success"))
        .catch((err) => {
          setStatus("error");
          if (err.code === "auth/expired-action-code") {
            setErrorMsg("Link weryfikacyjny wygasł. Zaloguj się i wyślij nowy.");
          } else if (err.code === "auth/invalid-action-code") {
            setErrorMsg("Link został już użyty lub jest nieprawidłowy.");
          } else {
            setErrorMsg("Nie udało się zweryfikować adresu e-mail.");
          }
        });
    } else if (mode === "resetPassword") {
      verifyPasswordResetCode(auth, oobCode)
        .then((userEmail) => {
          setEmail(userEmail);
          setStatus("reset-form");
        })
        .catch(() => {
          setStatus("error");
          setErrorMsg("Link do resetu hasła wygasł lub jest nieprawidłowy.");
        });
    } else {
      setStatus("error");
      setErrorMsg("Nieznana akcja.");
    }
  }, [mode, oobCode]);

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg("Hasło musi mieć minimum 6 znaków.");
      return;
    }
    if (newPassword !== confirmPwd) {
      setErrorMsg("Hasła się nie zgadzają.");
      return;
    }
    if (!oobCode) return;

    setResetting(true);
    setErrorMsg("");
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus("reset-success");
    } catch {
      setErrorMsg("Nie udało się zmienić hasła. Spróbuj ponownie.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-4"
      style={{ background: "#0d0d14" }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "#111120", border: "1px solid #1a1d2e" }}
      >
        {/* Header with logo */}
        <div
          className="flex flex-col items-center gap-3 px-6 pt-8 pb-5"
          style={{ borderBottom: "1px solid #1a1d2e" }}
        >
          <img
            src={MG_ICON}
            alt="MG"
            style={{ width: 44, height: 44, objectFit: "contain", filter: "invert(1)" }}
          />
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black tracking-[2px] text-white">MG</span>
            <span className="text-base font-bold tracking-[3px]" style={{ color: "#3b82f6" }}>CONTROL</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8 flex flex-col items-center gap-4">
          {status === "loading" && (
            <>
              <Loader2 size={36} className="animate-spin" style={{ color: "#3b82f6" }} />
              <p className="text-sm text-center" style={{ color: "#94a3b8" }}>
                {mode === "verifyEmail" ? "Weryfikacja adresu e-mail…" : "Sprawdzanie linku…"}
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "#22c55e20" }}
              >
                <CheckCircle size={32} style={{ color: "#22c55e" }} />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">E-mail zweryfikowany!</h2>
                <p className="text-sm mt-2" style={{ color: "#94a3b8" }}>
                  Twój adres e-mail został pomyślnie potwierdzony.
                  Możesz się teraz zalogować do aplikacji.
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                Przejdź do logowania
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "#ef444420" }}
              >
                <XCircle size={32} style={{ color: "#ef4444" }} />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">Coś poszło nie tak</h2>
                <p className="text-sm mt-2" style={{ color: "#94a3b8" }}>
                  {errorMsg}
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "#1a1d2e", color: "#94a3b8", border: "1px solid #2d3149" }}
              >
                Wróć do logowania
              </button>
            </>
          )}

          {status === "reset-form" && (
            <>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "#3b82f620" }}
              >
                <KeyRound size={28} style={{ color: "#3b82f6" }} />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">Nowe hasło</h2>
                <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
                  Ustaw nowe hasło dla <strong className="text-white">{email}</strong>
                </p>
              </div>

              <form onSubmit={handlePasswordReset} className="w-full flex flex-col gap-3 mt-1">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nowe hasło (min. 6 znaków)"
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "#0d0d14", border: "1px solid #2d3149", color: "#f1f5f9" }}
                />
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Powtórz hasło"
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "#0d0d14", border: "1px solid #2d3149", color: "#f1f5f9" }}
                />
                {errorMsg && (
                  <p className="text-xs text-center" style={{ color: "#ef4444" }}>{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={resetting}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "#3b82f6", color: "#fff" }}
                >
                  {resetting ? "Zapisywanie…" : "Zmień hasło"}
                </button>
              </form>
            </>
          )}

          {status === "reset-success" && (
            <>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "#22c55e20" }}
              >
                <CheckCircle size={32} style={{ color: "#22c55e" }} />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">Hasło zmienione!</h2>
                <p className="text-sm mt-2" style={{ color: "#94a3b8" }}>
                  Twoje hasło zostało pomyślnie zmienione.
                  Możesz się teraz zalogować.
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                Przejdź do logowania
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-[10px] text-center" style={{ color: "#334155" }}>
            MG Control · Grupa Plaza · Warszawa
          </p>
        </div>
      </div>
    </div>
  );
}
