"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import { useAuthListener } from "@/hooks/useAuth";
import { handleGoogleRedirect } from "@/lib/auth";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";
import PrivacyPolicyModal from "@/components/auth/PrivacyPolicyModal";

type View = "login" | "register";

export default function LoginPage() {
  useAuthListener();

  const [view, setView] = useState<View>("login");
  const [showForgot, setShowForgot] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const router = useRouter();
  const params = useSearchParams();
  const { user, isLoading } = useAuthStore();

  // Handle Google redirect result on page load
  useEffect(() => {
    handleGoogleRedirect()
      .then((result) => {
        if (result?.isNew) {
          toast.info("Konto zostało utworzone.");
        }
      })
      .catch((err: Error) => {
        toast.error(err.message);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (params.get("reason") === "disabled") {
      toast.error("Twoje konto zostało dezaktywowane. Skontaktuj się z administratorem.");
    }
  }, [params]);

  useEffect(() => {
    if (!isLoading && user && user.isActive) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4"
         style={{ background: "var(--bg-primary)" }}>

      {/* Card */}
      <div className="w-full max-w-sm flex flex-col gap-5 rounded-2xl p-7"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>

        {/* Logo */}
        <div className="flex flex-col items-center gap-1 mb-1">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white"
               style={{ background: "var(--color-accent)" }}>
            MG
          </div>
          <h1 className="text-lg font-black tracking-[3px] mt-2" style={{ color: "var(--color-text)" }}>
            MG CONTROL
          </h1>
          <p className="text-xs tracking-widest" style={{ color: "var(--color-muted)" }}>
            System Logistyki Salonu
          </p>
        </div>

        {view === "login" ? (
          <>
            {/* Google */}
            <GoogleLoginButton />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--bg-border2)" }} />
              <span className="text-xs" style={{ color: "var(--color-muted2)" }}>lub</span>
              <div className="flex-1 h-px" style={{ background: "var(--bg-border2)" }} />
            </div>

            {/* Email form */}
            <LoginForm
              onForgotPassword={() => setShowForgot(true)}
              onRegister={() => setView("register")}
            />
          </>
        ) : (
          <RegisterForm
            onBack={() => setView("login")}
            onPrivacyClick={() => setShowPrivacy(true)}
          />
        )}
      </div>

      {/* Footer */}
      <p className="mt-5 text-xs" style={{ color: "var(--color-muted2)" }}>
        <button onClick={() => setShowPrivacy(true)}
                className="hover:underline" style={{ color: "var(--color-muted)" }}>
          Polityka Prywatności
        </button>
        {" · "}MG Plaza Warszawa
      </p>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}
