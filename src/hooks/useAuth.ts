"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserDocument } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";

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
        const userData = await getUserDocument(firebaseUser.uid);
        if (userData) {
          setUser(userData);
        } else {
          setUser(null);
        }
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
