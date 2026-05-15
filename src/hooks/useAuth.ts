"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  getUserDocument,
  checkEmailWhitelist,
  ensureUserDocument,
} from "@/lib/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";

export function useAuthListener() {
  const { setUser, setFirebaseUid, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setFirebaseUid(null);
        setLoading(false);
        return;
      }

      setFirebaseUid(firebaseUser.uid);

      try {
        // Check if the user document already exists
        let userData = await getUserDocument(firebaseUser.uid);

        if (!userData) {
          // New user — check whitelist and create the Firestore document.
          // We do this here (not in handleGoogleRedirect) because getRedirectResult
          // is unreliable when third-party storage is blocked (Safari, Firefox, Chrome
          // with strict cookie settings). onAuthStateChanged always fires reliably.
          const email = firebaseUser.email ?? "";
          const { allowed, role } = await checkEmailWhitelist(email);

          if (!allowed) {
            await import("@/lib/auth").then((m) => m.signOut());
            toast.error(
              "Twój adres e-mail nie został zaakceptowany przez administratora. Skontaktuj się z Logistykiem."
            );
            setUser(null);
            setLoading(false);
            return;
          }

          // Check if this is truly a new account (for the toast)
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          const isNew = !snap.exists();

          await ensureUserDocument(firebaseUser, role);

          if (isNew) toast.info("Konto zostało utworzone.");

          // Retry once to let Firestore propagate the write
          for (let i = 0; i < 3; i++) {
            userData = await getUserDocument(firebaseUser.uid);
            if (userData) break;
            await new Promise((r) => setTimeout(r, 500));
          }
        }

        if (!userData) {
          toast.error("Nie udało się załadować konta. Spróbuj ponownie za chwilę.");
          setUser(null);
        } else {
          setUser(userData);
        }
      } catch (err: unknown) {
        const msg = (err as Error)?.message ?? "Błąd logowania.";
        toast.error(msg);
        console.error("[Auth]", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [setUser, setFirebaseUid, setLoading]);
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}

export function useIsLogistics() {
  const user = useAuthStore((s) => s.user);
  return user?.role === "logistics";
}

export function useIsLoading() {
  return useAuthStore((s) => s.isLoading);
}
