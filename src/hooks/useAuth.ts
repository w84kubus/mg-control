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
        // If this is a Google redirect, process it first (creates user doc, checks whitelist)
        // This must run before getUserDocument so the doc exists when we fetch it
        await handleGoogleRedirect().catch((err: Error) => {
          // Whitelist rejection — sign-out already handled inside handleGoogleRedirect
          toast.error(err.message);
          throw err;
        });

        // Retry fetching user document up to 5× with 600ms gaps
        // (handles race: redirect creates doc, but onAuthStateChanged fired first)
        let userData = null;
        for (let i = 0; i < 5; i++) {
          userData = await getUserDocument(firebaseUser.uid);
          if (userData) break;
          await new Promise((r) => setTimeout(r, 600));
        }

        setUser(userData);
      } catch {
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
