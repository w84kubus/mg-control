"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserDocument, handleGoogleRedirect } from "@/lib/auth";
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
        // Process Google redirect (creates user doc + checks whitelist).
        // getRedirectResult returns non-null only once after the redirect; subsequent
        // calls return null safely. Calling it here — not in the login page — ensures
        // exactly one call and no race condition with the auth state listener.
        const redirectResult = await handleGoogleRedirect();
        if (redirectResult?.isNew) {
          toast.info("Konto zostało utworzone.");
        }

        // Retry fetching user document up to 5× with 600 ms gaps.
        // Needed because ensureUserDocument (called inside handleGoogleRedirect)
        // and onAuthStateChanged can overlap in time.
        let userData = null;
        for (let i = 0; i < 5; i++) {
          userData = await getUserDocument(firebaseUser.uid);
          if (userData) break;
          await new Promise((r) => setTimeout(r, 600));
        }

        if (!userData) {
          toast.error("Nie znaleziono konta w bazie. Skontaktuj się z administratorem.");
          setUser(null);
        } else {
          setUser(userData);
        }
      } catch (err: unknown) {
        const message = (err as Error)?.message ?? "Błąd logowania.";
        toast.error(message);
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
